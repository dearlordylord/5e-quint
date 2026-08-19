import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { Match } from "effect";

import { type FindingPointer, type FindingsProjection } from "./findings.ts";
import { repoRoot } from "./transcript.ts";

function repositoryPath(path: string): string {
  const absolute = resolve(repoRoot, path);
  const relative = absolute.slice(`${repoRoot}${sep}`.length);
  if (
    relative.length === 0 ||
    relative === ".." ||
    relative.startsWith(`..${sep}`)
  ) {
    throw new Error(`Findings audit path escapes the repository root: ${path}`);
  }
  return relative;
}

function renderPointer(pointer: FindingPointer): string {
  const byPointerKind = Match.discriminator("kind");
  return Match.value(pointer).pipe(
    byPointerKind("artifact", ({ authorityRole, line }) =>
      line === undefined
        ? authorityRole
        : `${authorityRole}:line ${String(line)}`,
    ),
    byPointerKind(
      "sdkSequence",
      ({ authorityRole, sequence }) =>
        `${authorityRole}:SDK sequence ${String(sequence)}`,
    ),
    byPointerKind(
      "reviewVerdict",
      ({ authorityRole, verdictIndex }) =>
        `${authorityRole}:verdict ${String(verdictIndex)}`,
    ),
    byPointerKind(
      "issue",
      ({ authorityRole, fingerprint }) =>
        `${authorityRole}:issue ${fingerprint}`,
    ),
    Match.exhaustive,
  );
}

export function renderFindingsAudit(projection: FindingsProjection): string {
  const lines = [
    "# Raw Swarm run audit",
    "",
    `- Scenario: \`${projection.run.scenarioId}\``,
    `- Git revision: \`${projection.run.gitSha}\``,
    `- Started: ${projection.run.startedAt}`,
    `- Run identity: \`${projection.runIdentity}\``,
    `- SDK calls: ${String(projection.run.callCount)}`,
    `- Evidence authorities: ${String(projection.authorities.length)}`,
    `- Findings: ${String(projection.findings.length)}`,
    "",
    "## Findings",
    "",
  ];
  if (projection.findings.length === 0) {
    lines.push("No material findings were projected.", "");
  } else {
    for (const finding of projection.findings) {
      const issue =
        finding.githubIssueNumber === undefined
          ? ""
          : `; GitHub #${String(finding.githubIssueNumber)}`;
      lines.push(
        `- **${finding.category} / ${finding.kind}** — ${finding.summary}${issue}`,
        `  Evidence: \`${renderPointer(finding.pointer)}\`${finding.detail === undefined ? "" : ` — ${finding.detail}`}`,
      );
    }
    lines.push("");
  }
  lines.push("## Authorities", "");
  for (const authority of projection.authorities) {
    lines.push(
      `- \`${authority.role}\`: ${authority.path} (${String(authority.byteLength)} bytes, ${authority.sha256})`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function writeFindingsAudit(input: {
  readonly projection: FindingsProjection;
  readonly path: string;
}): void {
  const path = repositoryPath(input.path);
  const absolute = resolve(repoRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, renderFindingsAudit(input.projection), {
    flag: "wx",
  });
}
