import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { containerArguments, snapshotInput } from "./run.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "dnd-linux-input-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function git(args) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  git(["init", "--quiet"]);
  writeFileSync(join(root, ".gitignore"), ".scratch/\nnode_modules/\n");
  writeFileSync(join(root, "dirty.txt"), "committed");
  writeFileSync(join(root, "deleted.txt"), "committed");
  git(["add", "."]);
  git([
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  ]);
  return root;
}

test("snapshot keeps dirty/untracked source and deletions without host dependencies", (t) => {
  const root = fixture(t),
    snapshot = join(root, ".scratch/source");
  writeFileSync(join(root, "dirty.txt"), "dirty working tree");
  writeFileSync(join(root, "untracked.txt"), "new source");
  writeFileSync(join(root, "._dirty.txt"), "untracked macOS metadata");
  rmSync(join(root, "deleted.txt"));
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "node_modules/host-only.txt"), "must stay on host");
  const input = snapshotInput(
    root,
    root,
    ["node", join(root, "untracked.txt"), "literal $(not-a-shell)"],
    snapshot,
    true,
  );
  assert.equal(
    readFileSync(join(snapshot, "dirty.txt"), "utf8"),
    "dirty working tree",
  );
  assert(!existsSync(join(snapshot, "deleted.txt")));
  assert(!existsSync(join(snapshot, "node_modules")));
  assert(!existsSync(join(snapshot, "._dirty.txt")));
  assert(!existsSync(join(snapshot, ".git")));
  assert.equal(input.args[1], "/workspace/untracked.txt");
  assert.equal(input.args[2], "literal $(not-a-shell)");
  assert.equal(input.hasWrapper, true);
  assert.equal(
    readFileSync(join(root, "node_modules/host-only.txt"), "utf8"),
    "must stay on host",
  );
});

test("snapshot preserves executable source and refuses external symlinks", (t) => {
  const root = fixture(t),
    first = join(root, ".scratch/first");
  chmodSync(join(root, "dirty.txt"), 0o755);
  symlinkSync("./dirty.txt", join(root, "link.txt"));
  symlinkSync("missing.txt", join(root, "dangling.txt"));
  snapshotInput(root, root, ["node"], first);
  const execution = spawnSync("test", ["-x", join(first, "dirty.txt")]);
  assert.equal(execution.status, 0);
  assert.equal(readFileSync(join(first, "link.txt"), "utf8"), "committed");
  assert.equal(readlinkSync(join(first, "link.txt")), "./dirty.txt");
  assert.equal(readlinkSync(join(first, "dangling.txt")), "missing.txt");
  symlinkSync(import.meta.filename, join(root, "outside.txt"));
  assert.throws(
    () => snapshotInput(root, root, ["node"], join(root, ".scratch/second")),
    /leaves the repository/,
  );
});

test("container plan shares only coordination files and own outputs writable", (t) => {
  const priorNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = "--max-old-space-size=6144";
  t.after(() => {
    if (priorNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = priorNodeOptions;
  });
  const args = containerArguments({
    name: "dnd-verify-fixture",
    job: "fixture",
    image: "sha256:immutable",
    source: "/job/source",
    common: "/repo/.git",
    output: "/job/outputs",
    store: "dnd-verification-store-fixture",
  });
  const mounts = args.filter((_, index) => args[index - 1] === "--mount");
  const gitWrites = mounts.filter(
    (entry) =>
      entry.startsWith("type=bind,src=/repo/.git/") &&
      !entry.endsWith(",readonly"),
  );
  assert.equal(gitWrites.length, 5);
  const guard = readFileSync(
    join(import.meta.dirname, "../with-resource-lock.sh"),
    "utf8",
  );
  const protocolFiles = [
    ...guard.matchAll(/\$git_common_dir\/([^"\n]+)/gu),
  ].map((match) => match[1]);
  assert.deepEqual(
    gitWrites.map((entry) => entry.match(/src=\/repo\/\.git\/([^,]+)/u)[1]),
    protocolFiles,
    "The macOS adapter must retain the Linux guard's acquisition order and holder protocol",
  );
  assert(mounts.includes("type=bind,src=/repo/.git,dst=/source-git,readonly"));
  assert(mounts.includes("type=bind,src=/job/source,dst=/input,readonly"));
  assert(!args.includes("--privileged"));
  assert(
    !args.some(
      (arg) => arg.includes("docker.sock") || arg.includes("pid=host"),
    ),
  );
  assert(args.includes("NODE_OPTIONS=--max-old-space-size=6144"));
  assert.equal(
    args[args.indexOf("NODE_OPTIONS=--max-old-space-size=6144") - 1],
    "--env",
  );
  assert(args.includes("--memory"));
  assert(args.includes("--cpus"));
  assert.equal(args[args.indexOf("--entrypoint") + 1], "/usr/local/bin/node");
  assert(args.includes("--no-healthcheck"));
  assert.equal(args.at(-2), "sha256:immutable");
});

test("invalid resource bounds fail without a Docker operation", () => {
  assert.throws(
    () => containerArguments({ memory: "unlimited", cpus: "0" }),
    /limits/,
  );
});

test("macOS launchers pass the actual parent identity before Node starts", (t) => {
  const root = fixture(t),
    bin = join(root, ".scratch/bin"),
    record = join(root, ".scratch/launch.json");
  mkdirSync(bin, { recursive: true });
  const recorder = join(root, ".scratch/record.mjs");
  writeFileSync(
    recorder,
    "import{writeFileSync}from'node:fs';writeFileSync(process.env.DND_TEST_RECORD,JSON.stringify({args:process.argv.slice(2),parent:process.ppid}));\n",
  );
  const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";
  writeFileSync(
    join(bin, "node"),
    `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(recorder)} "$@"\n`,
  );
  writeFileSync(join(bin, "uname"), "#!/bin/sh\nprintf 'Darwin\\n'\n");
  chmodSync(join(bin, "node"), 0o755);
  chmodSync(join(bin, "uname"), 0o755);
  const scripts = join(import.meta.dirname, "..");
  for (const args of [
    [join(scripts, "verification-platform.sh"), "fixture-command"],
    [
      "-c",
      `. ${quote(join(scripts, "resource-lock-owner.sh"))}; with_resource_lock_owner fixture-command`,
    ],
  ]) {
    const result = spawnSync("sh", args, {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        DND_TEST_RECORD: record,
      },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const observed = JSON.parse(readFileSync(record, "utf8"));
    assert.equal(
      Number(observed.args[observed.args.indexOf("--owner-pid") + 1]),
      observed.parent,
    );
  }
});
