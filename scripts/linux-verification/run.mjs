import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  copyFileSync,
  cpSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  verificationInputs,
  verificationIndex,
  verificationRuntime,
  verificationSourceFiles,
} from "../verification-receipts.mjs";
import { readVerificationDeadlinePolicy } from "../verification-deadline-policy.mjs";

const OWN = import.meta.dirname;
const LOCK_FILES = [
  "dnd-heavy-verification.lock",
  "ralph-heavy-verification.lock",
  "ralph-broad-workspace-check.lock",
  "ralph-mbt.lock",
  "dnd-heavy-verification.holder",
];
const LABEL = "io.dnd.verification-job";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const save = (path, value) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
function sourceStat(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function capture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0)
    throw new Error(
      result.stderr ||
        `${command} failed: ${result.error?.message ?? result.status}`,
    );
  return result.stdout.trim();
}
function dockerJson(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
}

export function snapshotInput(root, cwd, args, directory, hasWrapper = false) {
  const location = relative(root, cwd);
  if (location === ".." || location.startsWith("../") || isAbsolute(location))
    throw new Error("Verification command must start inside its repository");
  const sourceSha256 = verificationInputs(root);
  const index = verificationIndex(root);
  mkdirSync(directory, { recursive: true });
  for (const file of verificationSourceFiles(root)) {
    const source = join(root, file),
      target = join(directory, file);
    const stat = sourceStat(source);
    if (stat === null) continue;
    mkdirSync(dirname(target), { recursive: true });
    if (stat.isSymbolicLink()) {
      const link = readlinkSync(source);
      const linked = resolve(dirname(source), link);
      const within = relative(root, linked);
      if (
        isAbsolute(link) ||
        within === ".." ||
        within.startsWith("../") ||
        isAbsolute(within)
      )
        throw new Error(
          `Unsupported source symlink (absolute or leaves the repository): ${file}`,
        );
      symlinkSync(link, target);
    } else {
      if (!stat.isFile()) throw new Error(`Unsupported source entry: ${file}`);
      copyFileSync(source, target);
      chmodSync(target, stat.mode & 0o777);
    }
  }
  writeFileSync(join(dirname(directory), "index-info"), index);
  if (
    verificationInputs(root) !== sourceSha256 ||
    verificationIndex(root) !== index
  )
    throw new Error(
      "Source changed while taking the verification snapshot; no container launched",
    );
  return {
    sourceSha256,
    sourceRuntime: verificationRuntime(),
    indexInfoSha256: hash(index),
    revision: capture("git", ["rev-parse", "HEAD"], root),
    cwd: join("/workspace", location),
    args: args.map((arg) =>
      arg === root || arg.startsWith(root + "/")
        ? "/workspace" + arg.slice(root.length)
        : arg,
    ),
    hasWrapper,
  };
}

function containerLimits(memory = "8g", cpus = "2") {
  if (
    !/^[1-9][0-9]*[mg]$/u.test(memory) ||
    !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(cpus) ||
    !Number.isFinite(Number(cpus)) ||
    Number(cpus) <= 0
  )
    throw new Error(
      "Container limits must be positive: memory such as 8g, cpus such as 2",
    );
  return { memory, cpus };
}

export function containerArguments({
  name,
  job,
  image,
  source,
  common,
  output,
  store,
  runner = OWN,
  memory,
  cpus,
}) {
  const limits = containerLimits(memory, cpus);
  const mount = (src, dst, readonly = true) => {
    if (src.includes(","))
      throw new Error("Docker bind paths containing commas are not supported");
    return [
      "--mount",
      `type=bind,src=${src},dst=${dst}${readonly ? ",readonly" : ""}`,
    ];
  };
  return [
    "run",
    "--interactive",
    "--init",
    "--entrypoint",
    "/usr/local/bin/node",
    "--user",
    "0:0",
    "--no-healthcheck",
    "--name",
    name,
    "--label",
    `${LABEL}=${job}`,
    "--cpus",
    limits.cpus,
    "--memory",
    limits.memory,
    "--memory-swap",
    limits.memory,
    "--pids-limit",
    "512",
    "--cap-drop",
    "NET_RAW",
    "--workdir",
    "/workspace",
    "--env",
    "CI=true",
    "--env",
    "COREPACK_ENABLE_AUTO_PIN=0",
    ...mount(source, "/input"),
    ...mount(common, "/source-git"),
    ...mount(runner, "/runner"),
    ...mount(dirname(source), "/job"),
    ...mount(output, "/output", false),
    ...LOCK_FILES.flatMap((file) =>
      mount(join(common, file), join("/verification-git", file), false),
    ),
    "--mount",
    `type=volume,src=${store},dst=/pnpm-store`,
    ...Object.entries(process.env)
      .filter(
        ([key]) =>
          /^DND_VERIFICATION_(LOCK_ACQUISITION|EXECUTION|STAGE)_TIMEOUT_MS$/u.test(
            key,
          ) || ["GOMEMLIMIT", "GOGC"].includes(key),
      )
      .flatMap(([key, value]) => ["--env", `${key}=${value}`]),
    image,
    "/runner/entry.mjs",
  ];
}

export async function runContainerVerification(
  args,
  { cwd = process.cwd(), hasWrapper = false, ownerPid } = {},
) {
  if (args.length === 0) throw new Error("Supply a verification command");
  if (!Number.isSafeInteger(ownerPid) || ownerPid < 1)
    throw new Error(
      "Use sh scripts/verification-platform.sh <command>; the launch owner PID must be captured before spawning",
    );
  const limits = containerLimits(
    process.env.DND_LINUX_VERIFICATION_MEMORY,
    process.env.DND_LINUX_VERIFICATION_CPUS,
  );
  const policy = readVerificationDeadlinePolicy();
  const root = capture("git", ["rev-parse", "--show-toplevel"], cwd);
  const common = capture(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    cwd,
  );
  const job = randomUUID(),
    name = `dnd-verify-${job}`;
  const directory = join(root, ".audit/linux-verification", job);
  const scratch = join(root, ".scratch/linux-verification", job);
  const source = join(scratch, "source"),
    output = join(directory, "outputs");
  mkdirSync(directory, { recursive: true });
  mkdirSync(output);
  console.error(`Linux verification job: ${directory}`);
  const stdout = join(directory, "stdout.log"),
    stderr = join(directory, "stderr.log");
  writeFileSync(stdout, "");
  writeFileSync(stderr, "");
  let active,
    canceled = 0,
    stopPromise,
    transportStop,
    containerAttempted = false;
  const ownedContainer = () => {
    if (!containerAttempted) return null;
    const value = dockerJson([
      "inspect",
      "--format",
      '{"Config":{"Labels":{{json .Config.Labels}}},"State":{{json .State}}}',
      name,
    ]);
    return value?.Config?.Labels?.[LABEL] === job ? value : null;
  };
  function cancel(code) {
    if (canceled) return;
    canceled = code;
    if (ownedContainer()) {
      stopPromise = new Promise((done) => {
        const stopper = spawn("docker", ["stop", "--time", "25", name], {
          stdio: "ignore",
        });
        const timer = setTimeout(() => stopper.kill("SIGKILL"), 35_000);
        stopper.on("close", () => clearTimeout(timer));
        stopper.on("error", () => clearTimeout(timer));
        stopper.on("error", done);
        stopper.on("close", done);
      });
    } else active?.kill("SIGTERM");
    transportStop = setTimeout(() => active?.kill("SIGKILL"), 35_000);
    transportStop.unref();
  }
  const onTerm = () => cancel(143),
    onInt = () => cancel(130);
  process.on("SIGTERM", onTerm);
  process.on("SIGINT", onInt);
  // Query our own live parent relationship, not an arbitrary PID's existence.
  // Reparenting after owner death cannot be confused with reuse of that PID.
  const originalParent = String(ownerPid);
  const ownerAlive = () => {
    const result = spawnSync(
      process.platform === "darwin" ? "/bin/ps" : "/usr/bin/ps",
      ["-o", "ppid=", "-p", String(process.pid)],
      {
        encoding: "utf8",
        timeout: 3_000,
      },
    );
    return result.status === 0 && result.stdout.trim() === originalParent;
  };
  const ownerWatch = setInterval(() => {
    if (!ownerAlive()) cancel(125);
  }, 1_000);
  ownerWatch.unref();
  const deadline = setTimeout(
    () => cancel(124),
    policy.acquisitionMs + policy.executionMs + policy.stageMs,
  );
  deadline.unref();
  const execute = (argv, interactive = false) =>
    new Promise((done) => {
      if (canceled) {
        done({ code: canceled });
        return;
      }
      active = spawn("docker", argv, {
        stdio: [interactive ? "pipe" : "ignore", "pipe", "pipe"],
      });
      active.stdin?.on("error", () => {});
      active.stdout.on("data", (data) => {
        appendFileSync(stdout, data);
        process.stdout.write(data);
      });
      active.stderr.on("data", (data) => {
        appendFileSync(stderr, data);
        process.stderr.write(data);
      });
      active.on("error", (error) => done({ code: 1, error: error.message }));
      active.on("close", (code, signal) => {
        active = undefined;
        done({ code: code ?? (signal === "SIGKILL" ? 137 : 143), signal });
      });
    });
  try {
    if (!ownerAlive()) {
      save(join(directory, "result.json"), {
        exitCode: 125,
        failure: "ownerLostBeforeStartup",
      });
      return 125;
    }
    capture("docker", ["info", "--format", "{{.ServerVersion}}"]);
    const input = snapshotInput(root, cwd, args, source, hasWrapper);
    save(join(scratch, "input.json"), input);
    const runner = join(scratch, "runner");
    cpSync(OWN, runner, { recursive: true });
    const toolchain = readFileSync(
      join(source, "packages/surface/dhall-json-toolchain.json"),
    );
    writeFileSync(join(runner, "dhall-json-toolchain.json"), toolchain);
    const recipe = readFileSync(join(runner, "Dockerfile"));
    const tag =
      process.env.DND_LINUX_VERIFICATION_IMAGE ??
      `dnd-verification:${hash(Buffer.concat([recipe, toolchain])).slice(0, 16)}`;
    if (!dockerJson(["image", "inspect", "--format", "{{json .Id}}", tag])) {
      if (process.env.DND_LINUX_VERIFICATION_IMAGE)
        throw new Error(
          `Configured verification image is not installed: ${tag}`,
        );
      const build = await execute([
        "build",
        "--tag",
        tag,
        "--file",
        join(runner, "Dockerfile"),
        runner,
      ]);
      if (build.code !== 0)
        throw new Error(
          `Verification image build failed (${build.code}); see ${stderr}`,
        );
    }
    const image = dockerJson([
      "image",
      "inspect",
      "--format",
      "{{json .Id}}",
      tag,
    ]);
    if (!image)
      throw new Error("Cannot resolve immutable verification image ID");
    const repositoryKey = hash(common + image).slice(0, 20),
      store = `dnd-verification-store-${repositoryKey}`;
    const volume = dockerJson([
      "volume",
      "inspect",
      "--format",
      "{{json .}}",
      store,
    ]);
    if (
      volume &&
      volume.Labels?.["io.dnd.verification-repository"] !== repositoryKey
    )
      throw new Error(
        "Refusing an existing store volume without this runner's ownership label",
      );
    if (!volume)
      capture("docker", [
        "volume",
        "create",
        "--label",
        `io.dnd.verification-repository=${repositoryKey}`,
        store,
      ]);
    for (const file of LOCK_FILES) closeSync(openSync(join(common, file), "a"));
    save(join(directory, "input.json"), {
      ...input,
      image,
      name,
      store,
      limits,
      owner: { pid: process.pid, parentPid: ownerPid },
    });
    if (!ownerAlive()) cancel(125);
    containerAttempted = true;
    const result = await execute(
      containerArguments({
        name,
        job,
        image,
        source,
        common,
        output,
        store,
        runner,
        ...limits,
      }),
      true,
    );
    await stopPromise;
    const state = ownedContainer()?.State ?? null;
    const sourceUnchanged =
      result.code === 0
        ? verificationInputs(root) === input.sourceSha256
        : null;
    const exitCode =
      result.code === 137
        ? 137
        : canceled ||
          (result.code === 0 && sourceUnchanged === false ? 1 : result.code);
    save(join(directory, "result.json"), {
      exitCode,
      docker: result,
      state,
      sourceUnchanged,
      inputSha256: input.sourceSha256,
    });
    const receipts = join(output, ".scratch/verification");
    if (result.code !== 137 && sourceStat(receipts)?.isDirectory())
      for (const file of readdirSync(receipts))
        console.error(`Host verification receipt: ${join(receipts, file)}`);
    return exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendFileSync(stderr, message + "\n");
    const exitCode = canceled || (error?.exitCode === 137 ? 137 : 1);
    save(join(directory, "result.json"), {
      exitCode,
      bootstrapError: message,
      state: ownedContainer()?.State ?? null,
    });
    console.error(message);
    return exitCode;
  } finally {
    clearInterval(ownerWatch);
    clearTimeout(deadline);
    clearTimeout(transportStop);
    process.off("SIGTERM", onTerm);
    process.off("SIGINT", onInt);
    await stopPromise;
    if (ownedContainer())
      capture("docker", ["rm", "--volumes", "--force", name]);
    rmSync(scratch, { recursive: true, force: true });
    console.error(`Linux verification evidence: ${directory}`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const options = { hasWrapper: false };
    const argv = process.argv.slice(2);
    for (;;) {
      if (argv[0] === "--owner-wrapper" && !options.hasWrapper) {
        options.hasWrapper = true;
        argv.shift();
      } else if (argv[0] === "--owner-pid" && options.ownerPid === undefined) {
        argv.shift();
        options.ownerPid = Number(argv.shift());
      } else {
        if (argv[0]?.startsWith("--"))
          throw new Error(`Unknown or duplicated runner control: ${argv[0]}`);
        break;
      }
    }
    process.exitCode = await runContainerVerification(argv, options);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
