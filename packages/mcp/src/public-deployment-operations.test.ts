import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { describe, expect, test } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const operationsDirectory = join(repositoryRoot, "operations/public-mcp");

describe("public MCP deployment operations", () => {
  test("builds the production image off-host and prevents memory overlap", () => {
    const dockerfile = readFileSync(
      join(operationsDirectory, "Dockerfile"),
      "utf8",
    );
    const deployDokku = readFileSync(
      join(operationsDirectory, "deploy-dokku.sh"),
      "utf8",
    );
    const memorySafety = readFileSync(
      join(operationsDirectory, "configure-dokku-memory-safety.sh"),
      "utf8",
    );
    const imageWorkflow = readFileSync(
      join(repositoryRoot, ".github/workflows/public-mcp-image.yml"),
      "utf8",
    );

    expect(dockerfile).toContain("FROM node:22-bookworm-slim AS builder");
    expect(dockerfile).toContain("deploy --prod --legacy /srv/deploy");
    expect(dockerfile).toContain("COPY --from=builder");
    expect(deployDokku).toContain("public-mcp-image.yml");
    expect(deployDokku).toContain('artifact_name="dnd-oracle-image"');
    expect(deployDokku).toContain("--checks-disabled-list");
    expect(deployDokku).toContain("minimum_available_memory_kib");
    expect(deployDokku).toContain("minimum_available_swap_kib");
    expect(deployDokku).toContain("git:load-image");
    expect(deployDokku).toContain("rollback_image");
    expect(deployDokku).toContain("rollback_archive");
    expect(deployDokku).toContain("docker image tag");
    expect(deployDokku).toContain("docker image save");
    expect(deployDokku).toContain("docker image load");
    expect(deployDokku).toContain("dokku_not_deployed_report");
    expect(deployDokku).not.toContain("git push");
    expect(memorySafety).toContain("fallocate -l 2G");
    expect(memorySafety).toContain('checks:disable "$app" web');
    expect(memorySafety).toContain(
      'builder-dockerfile:set "$app" dockerfile-path',
    );
    expect(imageWorkflow).toContain("Build deployable image off-host");
    expect(imageWorkflow).toContain("name: dnd-oracle-image");
    expect(imageWorkflow).toContain("docker image save");
  });

  test("records and restores the preceding immutable image and release", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "dnd-public-deployment-"),
    );
    const stateDirectory = join(temporaryDirectory, "state/staging");
    const binaryDirectory = join(temporaryDirectory, "bin");
    const releaseDirectory = join(temporaryDirectory, "releases/staging");
    const caddyDirectory = join(temporaryDirectory, "caddy");
    const operationsInstallDirectory = join(temporaryDirectory, "operations");
    const systemdDirectory = join(temporaryDirectory, "systemd");
    const environmentFile = join(temporaryDirectory, "staging.env");
    const commandLog = join(temporaryDirectory, "commands.log");
    mkdirSync(stateDirectory, { recursive: true });
    mkdirSync(binaryDirectory);
    mkdirSync(caddyDirectory);
    try {
      installFakeCommand(binaryDirectory, "docker", commandLog);
      installFakeCommand(binaryDirectory, "curl", commandLog, "video/mp4");
      installFakeCommand(binaryDirectory, "jq", commandLog, "2", true);
      installFakeCommand(binaryDirectory, "pnpm", commandLog);
      installFakeCommand(binaryDirectory, "stat", commandLog, "1000");
      installFakeCommand(binaryDirectory, "systemctl", commandLog);
      installFakeCommand(
        binaryDirectory,
        "caddy",
        commandLog,
        "v2.10.2 staging.oracle.invalid",
      );

      writeEnvironment(
        environmentFile,
        stateDirectory,
        releaseDirectory,
        caddyDirectory,
        operationsInstallDirectory,
        systemdDirectory,
        {
          image: `registry.example.test/oracle@sha256:${"1".repeat(64)}`,
          release: "1".repeat(40),
        },
      );
      expect(
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toBe(0);
      const firstOperationsRelease = realpathSync(
        join(operationsInstallDirectory, "staging/current"),
      );
      expect(
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toBe(0);
      expect(
        realpathSync(join(operationsInstallDirectory, "staging/current")),
      ).not.toBe(firstOperationsRelease);
      expectReleaseHistory(releaseDirectory, ["1", "1"]);

      writeEnvironment(
        environmentFile,
        stateDirectory,
        releaseDirectory,
        caddyDirectory,
        operationsInstallDirectory,
        systemdDirectory,
        {
          image: `registry.example.test/oracle@sha256:${"2".repeat(64)}`,
          release: "2".repeat(40),
        },
      );
      expect(
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toBe(0);
      expect(existsSync(firstOperationsRelease)).toBe(false);

      writeEnvironment(
        environmentFile,
        stateDirectory,
        releaseDirectory,
        caddyDirectory,
        operationsInstallDirectory,
        systemdDirectory,
        {
          image: `registry.example.test/oracle@sha256:${"3".repeat(64)}`,
          release: "3".repeat(40),
        },
      );
      installFailForFragmentOnceCommand(
        binaryDirectory,
        "docker",
        " up ",
        commandLog,
      );
      expect(() =>
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toThrow("Candidate startup failed");
      installFakeCommand(binaryDirectory, "docker", commandLog);
      expectReleaseHistory(releaseDirectory, ["2", "1"]);

      installFailForArgumentOnceCommand(
        binaryDirectory,
        "systemctl",
        "enable",
        commandLog,
      );
      expect(() =>
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toThrow("Budget monitor installation failed");
      installFakeCommand(binaryDirectory, "systemctl", commandLog);
      expectReleaseHistory(releaseDirectory, ["2", "1"]);
      expect(
        readFileSync(
          join(operationsInstallDirectory, "staging/current/environment.env"),
          "utf8",
        ),
      ).toContain(`DND_MCP_RELEASE=${"2".repeat(40)}`);

      installFailOnceCommand(binaryDirectory, "pnpm", commandLog);
      expect(() =>
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toThrow("Deployment smoke failed");
      installFakeCommand(binaryDirectory, "pnpm", commandLog);
      expectReleaseHistory(releaseDirectory, ["2", "1"]);
      installFailOnceCommand(binaryDirectory, "pnpm", commandLog);
      expect(() =>
        runOperation(
          "rollback.sh",
          environmentFile,
          binaryDirectory,
          commandLog,
        ),
      ).toThrow("Rollback smoke failed");
      installFakeCommand(binaryDirectory, "pnpm", commandLog);
      expectReleaseHistory(releaseDirectory, ["2", "1"]);
      expect(
        readFileSync(
          join(operationsInstallDirectory, "staging/current/environment.env"),
          "utf8",
        ),
      ).toContain(`DND_MCP_RELEASE=${"2".repeat(40)}`);
      expect(
        runOperation(
          "rollback.sh",
          environmentFile,
          binaryDirectory,
          commandLog,
        ),
      ).toBe(0);

      expectReleaseHistory(releaseDirectory, ["1", "2"]);
      expect(
        readFileSync(
          join(operationsInstallDirectory, "staging/current/environment.env"),
          "utf8",
        ),
      ).toContain(`DND_MCP_RELEASE=${"1".repeat(40)}`);
      expect(readFileSync(commandLog, "utf8")).toContain("compose --env-file");
      expect(
        readFileSync(
          join(systemdDirectory, "dnd-oracle-budget-staging.service"),
          "utf8",
        ),
      ).toContain(`${operationsInstallDirectory}/staging/current`);

      const historyPath = join(releaseDirectory, "release-history");
      const validHistory = readFileSync(historyPath, "utf8");
      const currentHistoryRecord = validHistory.split("\n")[0];
      writeFileSync(
        historyPath,
        `${currentHistoryRecord}\n${currentHistoryRecord}\n`,
      );
      expect(() =>
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toThrow("different operations identities");
      expect(() =>
        runOperation(
          "rollback.sh",
          environmentFile,
          binaryDirectory,
          commandLog,
        ),
      ).toThrow("different operations identities");
      writeFileSync(historyPath, validHistory);

      installFailForArgumentOnceCommand(
        binaryDirectory,
        "rm",
        "-r",
        commandLog,
      );
      expect(
        runOperation("deploy.sh", environmentFile, binaryDirectory, commandLog),
      ).toBe(0);
      rmSync(join(binaryDirectory, "rm"), { force: true });
      expectReleaseHistory(releaseDirectory, ["3", "1"]);

      const disabledConfiguration = readFileSync(environmentFile, "utf8");
      writeFileSync(
        environmentFile,
        disabledConfiguration.replace(
          "synthetic-saved-session-authorization-secret",
          "replace-with-at-least-32-random-characters",
        ),
      );
      expect(
        runVerification(environmentFile, binaryDirectory, commandLog),
      ).toMatchObject({
        status: 65,
        stderr: expect.stringContaining("not a placeholder"),
      });
      writeFileSync(environmentFile, disabledConfiguration);
      const enabledConfiguration = disabledConfiguration.replace(
        "DND_MCP_PUBLICATION_MODE=disabled",
        "DND_MCP_PUBLICATION_MODE=enabled",
      );
      writeFileSync(environmentFile, enabledConfiguration);
      expect(
        runVerification(environmentFile, binaryDirectory, commandLog).status,
      ).toBe(65);
      writeFileSync(
        environmentFile,
        `${enabledConfiguration}DND_OPENAI_APPS_CHALLENGE=challenge\n`,
      );
      expect(
        runVerification(environmentFile, binaryDirectory, commandLog).status,
      ).toBe(0);
      writeFileSync(
        environmentFile,
        readFileSync(environmentFile, "utf8").replace(
          "DND_MCP_PUBLISHER_NAME='Synthetic Publisher'",
          "DND_MCP_PUBLISHER_NAME=' Synthetic Publisher '",
        ),
      );
      expect(
        runVerification(environmentFile, binaryDirectory, commandLog),
      ).toMatchObject({
        status: 65,
        stderr: expect.stringContaining("surrounding whitespace"),
      });
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("rejects invalid budget policy and identifies the alert recipient", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "dnd-public-budget-"),
    );
    const policyPath = join(temporaryDirectory, "policy.json");
    const measurementPath = join(temporaryDirectory, "measurement.json");
    try {
      writeFileSync(policyPath, "{}\n");
      writeFileSync(measurementPath, '{"requests":1}\n');
      expect(runBudgetCheck(policyPath, measurementPath).status).toBe(1);

      writeFileSync(
        policyPath,
        '{"window":"calendar-month","warningFraction":0.8,"limits":{"requests":10}}\n',
      );
      writeFileSync(measurementPath, '{"requests":8}\n');
      const alert = runBudgetCheck(policyPath, measurementPath);
      expect(alert.status).toBe(2);
      expect(alert.stdout).toContain('"recipient":"operator@example.invalid"');
      writeFileSync(measurementPath, '{"requests":-1}\n');
      expect(runBudgetCheck(policyPath, measurementPath).status).toBe(1);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("emits a credential-free attestation after live Dokku publication checks", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "dnd-dokku-publication-"),
    );
    const binaryDirectory = join(temporaryDirectory, "bin");
    const commandLog = join(temporaryDirectory, "commands.log");
    const attestationPath = join(
      temporaryDirectory,
      "deployment-attestation.json",
    );
    mkdirSync(binaryDirectory);
    try {
      installDokkuPublicationSsh(binaryDirectory, commandLog);
      installDokkuPublicationCurl(binaryDirectory, commandLog);
      installFakeCommand(binaryDirectory, "pnpm", commandLog);
      const result = spawnSync(
        join(operationsDirectory, "verify-dokku-publication.sh"),
        [attestationPath],
        {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            PATH: `${binaryDirectory}:${process.env.PATH ?? ""}`,
          },
          encoding: "utf8",
        },
      );
      expect(result).toMatchObject({ status: 0 });
      const serialized = readFileSync(attestationPath, "utf8");
      expect(JSON.parse(serialized)).toMatchObject({
        status: "verifiedLiveProduction",
        environment: "production",
        origin: "https://dnd-oracle.apps.loskutoff.com",
        publisherName: "Verified Publisher",
        release: "1".repeat(40),
        domainChallenge: "servedExact",
        oauthDiscovery: "verified",
        publicSmoke: "passed",
      });
      expect(serialized).not.toContain("synthetic-domain-challenge");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

function runBudgetCheck(policyPath: string, measurementPath: string) {
  return spawnSync(
    process.execPath,
    [
      join(operationsDirectory, "budget-check.mjs"),
      policyPath,
      measurementPath,
      "operator@example.invalid",
    ],
    { encoding: "utf8" },
  );
}

function expectReleaseHistory(
  releaseDirectory: string,
  expectedReleases: readonly string[],
): void {
  const records = readFileSync(
    join(releaseDirectory, "release-history"),
    "utf8",
  )
    .trimEnd()
    .split("\n");
  expect(records).toHaveLength(expectedReleases.length);
  records.forEach((record, index) => {
    const [image, release, storageFormat, operationsRelease, ...extra] =
      record.split("|");
    const expectedRelease = expectedReleases[index];
    expect(extra).toEqual([]);
    expect(image).toBe(
      `registry.example.test/oracle@sha256:${expectedRelease?.repeat(64)}`,
    );
    expect(release).toBe(expectedRelease?.repeat(40));
    expect(storageFormat).toBe("2");
    expect(operationsRelease).toMatch(
      new RegExp(`^${expectedRelease?.repeat(40)}[.][A-Za-z0-9]+$`, "u"),
    );
  });
}

function runVerification(
  environmentFile: string,
  binaryDirectory: string,
  commandLog: string,
) {
  return spawnSync(
    join(operationsDirectory, "verify-config.sh"),
    [environmentFile],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: `${binaryDirectory}:${process.env.PATH ?? ""}`,
        COMMAND_LOG: commandLog,
      },
      encoding: "utf8",
    },
  );
}

function writeEnvironment(
  path: string,
  stateDirectory: string,
  releaseDirectory: string,
  caddyDirectory: string,
  operationsInstallDirectory: string,
  systemdDirectory: string,
  release: { readonly image: string; readonly release: string },
): void {
  writeFileSync(
    path,
    [
      "COMPOSE_PROJECT_NAME=dnd-oracle-staging",
      "DND_MCP_ENVIRONMENT=staging",
      "DND_MCP_DOMAIN=staging.oracle.invalid",
      "DND_MCP_PUBLISHER_NAME='Synthetic Publisher'",
      "DND_MCP_LOOPBACK_PORT=18787",
      `DND_MCP_CADDY_CONFIG_DIRECTORY=${caddyDirectory}`,
      `DND_MCP_OPERATIONS_DIRECTORY=${operationsInstallDirectory}`,
      `DND_MCP_SYSTEMD_DIRECTORY=${systemdDirectory}`,
      `DND_MCP_IMAGE=${release.image}`,
      `DND_MCP_RELEASE=${release.release}`,
      `DND_MCP_STATE_DIRECTORY=${stateDirectory}`,
      `DND_MCP_RELEASE_DIRECTORY=${releaseDirectory}`,
      "DND_MCP_METRICS_TOKEN=synthetic-metrics-token",
      "DND_SAVED_SESSION_AUTHORIZATION_SECRET=synthetic-saved-session-authorization-secret",
      "DND_MCP_BUDGET_ALERT_RECIPIENT=operator@example.invalid",
      "DND_MCP_FIXED_HOST_MONTHLY_USD=5",
      "DND_MCP_PUBLICATION_MODE=disabled",
      "DND_OPENAI_APPS_CHALLENGE=",
      "",
    ].join("\n"),
  );
}

function installFakeCommand(
  binaryDirectory: string,
  name: string,
  commandLog: string,
  output = "",
  consumeInput = false,
  exitStatus = 0,
): void {
  const path = join(binaryDirectory, name);
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s %s\\n' '${name}' "$*" >>'${commandLog}'`,
      ...(consumeInput ? ["cat >/dev/null"] : []),
      ...(output === "" ? [] : [`printf '%s\\n' '${output}'`]),
      `exit ${exitStatus}`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function installDokkuPublicationSsh(
  binaryDirectory: string,
  commandLog: string,
): void {
  const path = join(binaryDirectory, "ssh");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s %s\\n' 'ssh' \"$*\" >>'" + commandLog + "'",
      'case "$*" in',
      "  *DND_MCP_ENVIRONMENT) value=production ;;",
      "  *DND_MCP_PUBLICATION_MODE) value=enabled ;;",
      "  *DND_MCP_PUBLISHER_NAME) value='Verified Publisher' ;;",
      "  *DND_MCP_RELEASE) value='1111111111111111111111111111111111111111' ;;",
      "  *DND_MCP_PUBLIC_ORIGIN) value='https://dnd-oracle.apps.loskutoff.com' ;;",
      "  *DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH) value='/var/lib/dnd-oracle/saved-session-authorization.sqlite' ;;",
      "  *DND_SAVED_SESSION_AUTHORIZATION_SECRET) value='synthetic-saved-session-authorization-secret' ;;",
      "  *DND_OPENAI_APPS_CHALLENGE) value='synthetic-domain-challenge' ;;",
      "  *) exit 1 ;;",
      "esac",
      "printf '%s\\n' \"$value\"",
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function installDokkuPublicationCurl(
  binaryDirectory: string,
  commandLog: string,
): void {
  const path = join(binaryDirectory, "curl");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "printf '%s %s\\n' 'curl' \"$*\" >>'" + commandLog + "'",
      'url="${!#}"',
      'case "$url" in',
      '  */health) value=\'{"status":"ok"}\' ;;',
      '  */version) value=\'{"environment":"production","release":"1111111111111111111111111111111111111111","publisher":"Verified Publisher"}\' ;;',
      '  */.well-known/oauth-protected-resource) value=\'{"resource":"https://dnd-oracle.apps.loskutoff.com/mcp","authorization_servers":["https://dnd-oracle.apps.loskutoff.com/api/auth"],"scopes_supported":["play-sessions"]}\' ;;',
      '  */api/auth/.well-known/oauth-authorization-server) value=\'{"issuer":"https://dnd-oracle.apps.loskutoff.com/api/auth","authorization_endpoint":"https://dnd-oracle.apps.loskutoff.com/api/auth/oauth2/authorize","token_endpoint":"https://dnd-oracle.apps.loskutoff.com/api/auth/oauth2/token","registration_endpoint":"https://dnd-oracle.apps.loskutoff.com/api/auth/oauth2/register","jwks_uri":"https://dnd-oracle.apps.loskutoff.com/api/auth/jwks","code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["none"],"scopes_supported":["play-sessions"],"client_id_metadata_document_supported":true}\' ;;',
      '  */api/auth/jwks) value=\'{"keys":[{"kty":"RSA"}]}\' ;;',
      "  */.well-known/openai-apps-challenge) value='synthetic-domain-challenge' ;;",
      "  */plugin-demo.mp4) value='video/mp4' ;;",
      "  */|*/support|*/privacy|*/terms) value='<html></html>' ;;",
      "  *) exit 22 ;;",
      "esac",
      "printf '%s\\n' \"$value\"",
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function installFailOnceCommand(
  binaryDirectory: string,
  name: string,
  commandLog: string,
): void {
  const path = join(binaryDirectory, name);
  const marker = join(binaryDirectory, `${name}-failed-once`);
  rmSync(marker, { force: true });
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s %s\\n' '${name}' "$*" >>'${commandLog}'`,
      `if [[ ! -e '${marker}' ]]; then touch '${marker}'; exit 1; fi`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function installFailForFragmentOnceCommand(
  binaryDirectory: string,
  name: string,
  fragment: string,
  commandLog: string,
): void {
  const path = join(binaryDirectory, name);
  const marker = join(binaryDirectory, `${name}-fragment-failed-once`);
  rmSync(marker, { force: true });
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s %s\\n' '${name}' "$*" >>'${commandLog}'`,
      `if [[ " $* " == *'${fragment}'* && ! -e '${marker}' ]]; then touch '${marker}'; exit 1; fi`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function installFailForArgumentOnceCommand(
  binaryDirectory: string,
  name: string,
  argument: string,
  commandLog: string,
): void {
  const path = join(binaryDirectory, name);
  const marker = join(binaryDirectory, `${name}-${argument}-failed-once`);
  rmSync(marker, { force: true });
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s %s\\n' '${name}' "$*" >>'${commandLog}'`,
      `if [[ "$1" == '${argument}' && ! -e '${marker}' ]]; then touch '${marker}'; exit 1; fi`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
}

function runOperation(
  script: "deploy.sh" | "rollback.sh",
  environmentFile: string,
  binaryDirectory: string,
  commandLog: string,
): number | null {
  const result = spawnSync(
    join(operationsDirectory, script),
    [environmentFile],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: `${binaryDirectory}:${process.env.PATH ?? ""}`,
        COMMAND_LOG: commandLog,
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${script} failed (${result.status}):\n${result.stdout}\n${result.stderr}\n${readFileSync(commandLog, "utf8")}`,
    );
  }
  return result.status;
}
