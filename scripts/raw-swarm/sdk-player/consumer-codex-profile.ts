import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { repoRoot } from "../transcript.ts";

export function createConsumerCodexHome(): string {
  const home = mkdtempSync(resolve(tmpdir(), "dnd-sdk-consumer-codex-"));
  writeFileSync(
    resolve(home, "config.toml"),
    [
      'default_permissions = "consumer"',
      "",
      "[permissions.consumer.filesystem]",
      '":minimal" = "read"',
      "",
      '[permissions.consumer.filesystem.":workspace_roots"]',
      '"." = "write"',
      "",
    ].join("\n"),
  );
  const configuredHome =
    process.env.CODEX_HOME ?? resolve(process.env.HOME ?? "", ".codex");
  symlinkSync(resolve(configuredHome, "auth.json"), resolve(home, "auth.json"));
  return home;
}

export function consumerPermissionProfileAvailable(
  codexHome: string,
  scratch: string,
): boolean {
  const writableProbe = resolve(scratch, ".isolation-write-probe");
  const result = spawnSync(
    "codex",
    [
      "sandbox",
      "-C",
      scratch,
      "-P",
      "consumer",
      "--",
      "sh",
      "-c",
      'printf isolated > "$1" && ! cat "$2" >/dev/null 2>&1',
      "--",
      writableProbe,
      resolve(repoRoot, "package.json"),
    ],
    {
      cwd: scratch,
      env: { ...process.env, CODEX_HOME: codexHome },
      stdio: "ignore",
    },
  );
  const available =
    result.status === 0 &&
    existsSync(writableProbe) &&
    readFileSync(writableProbe, "utf8") === "isolated";
  rmSync(writableProbe, { force: true });
  return available;
}
