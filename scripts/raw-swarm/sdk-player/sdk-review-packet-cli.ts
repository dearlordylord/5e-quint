import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

import { repoRoot } from "../transcript.ts";
import { readSdkAudit } from "./sdk-audit.ts";
import { isJsonValue } from "./json-value.ts";
import { reprojectSdkTranscriptTurns } from "./player-turn-projection.ts";
import {
  encodeSdkReviewPacket,
  SDK_REVIEW_PACKET_READY_SETUP_ARTIFACT_ROLES,
  SDK_REVIEW_PACKET_SCENARIO_ARTIFACT_ROLES,
  sdkReviewPacketHeaderEvidence,
  sdkReviewPacketSource,
} from "./sdk-review-packet.ts";
import { parseSdkTranscript } from "./sdk-transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function markdownFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): readonly string[] => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory()
        ? markdownFiles(path)
        : entry.isFile() && entry.name.endsWith(".md")
          ? [path]
          : [];
    })
    .sort();
}

function source(
  path: string,
  excerpt?: { readonly content: string; readonly firstLine: number },
) {
  const absolutePath = resolve(repoRoot, path);
  const result = sdkReviewPacketSource({
    path: relative(repoRoot, absolutePath),
    content: excerpt?.content ?? readFileSync(absolutePath, "utf8"),
    ...(excerpt === undefined ? {} : { firstLine: excerpt.firstLine }),
  });
  return result.tag === "valid" ? result.source : fail(result.message);
}

function catalogPath(path: string): boolean {
  return (
    path.endsWith("/Animals.md") ||
    path.includes("/Monsters/Monsters-") ||
    path.includes("/Spells/Descriptions-") ||
    path.includes("/Magic-Items/Items-")
  );
}

export function catalogSections(input: {
  readonly path: string;
  readonly content: string;
  readonly scenarioEvidence: string;
}) {
  const lines = input.content.split("\n");
  const headings = lines.flatMap((line, index) => {
    const match = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    return match === null
      ? []
      : [{ line: index, level: match[1]!.length, title: match[2]! }];
  });
  const evidence = input.scenarioEvidence.toLocaleLowerCase("en-US");
  const recordHeadingLevel = input.path.includes("/Monsters/Monsters-") ? 3 : 2;
  const escaped = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return headings.flatMap((heading, index) => {
    const title = heading.title.toLocaleLowerCase("en-US");
    if (
      heading.level !== recordHeadingLevel ||
      heading.title.length < 4 ||
      !new RegExp(`(^|[^a-z0-9])${escaped(title)}([^a-z0-9]|$)`).test(evidence)
    )
      return [];
    const end =
      headings
        .slice(index + 1)
        .find((candidate) => candidate.level <= heading.level)?.line ??
      lines.length;
    const content = lines.slice(heading.line, end).join("\n");
    return content.trim().length === 0
      ? []
      : [
          source(input.path, {
            content,
            firstLine: heading.line + 1,
          }),
        ];
  });
}

function main(args: readonly string[]): void {
  const [auditInput, transcriptInput, outputInput, ...unexpected] = args;
  if (
    auditInput === undefined ||
    transcriptInput === undefined ||
    outputInput === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: sdk-review-packet-cli.ts <audit.jsonl> <transcript.jsonl> <packet.json>",
    );
  }
  const auditPath = resolve(repoRoot, auditInput);
  const transcriptPath = resolve(repoRoot, transcriptInput);
  const outputPath = resolve(repoRoot, outputInput);
  const verifiedAudit = readSdkAudit(auditPath);
  if (verifiedAudit.tag === "invalid") fail(verifiedAudit.message);
  const records = readFileSync(transcriptPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
  const transcript = parseSdkTranscript(records);
  if (transcript.tag === "invalid") fail(transcript.message);
  if (transcript.value.header.characterOutcome !== "ready") {
    fail("SDK review packet requires ready character evidence.");
  }
  const header = transcript.value.header;
  const projections = reprojectSdkTranscriptTurns(transcript.value.calls);
  if (projections.tag === "invalid") fail(projections.message);
  const retainedHeaderEvidence = sdkReviewPacketHeaderEvidence(header);
  if (!isJsonValue(retainedHeaderEvidence)) {
    fail("SDK review packet header evidence is not JSON.");
  }
  const runDirectory = resolve(transcriptPath, "../..");
  const readyArtifacts: readonly string[] =
    header.setupOutcome === "ready"
      ? SDK_REVIEW_PACKET_READY_SETUP_ARTIFACT_ROLES
      : [];
  const runArtifacts = [
    ...SDK_REVIEW_PACKET_SCENARIO_ARTIFACT_ROLES,
    ...readyArtifacts,
  ].map((path) => source(relative(repoRoot, resolve(runDirectory, path))));
  const rawRoot = resolve(repoRoot, ".references/srd-5.2.1");
  const scenarioEvidence = runArtifacts
    .map(({ numberedContent }) => numberedContent)
    .join("\n");
  const rawFiles = markdownFiles(rawRoot);
  const basenameCounts = rawFiles.reduce((counts, path) => {
    const name = basename(path);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const rawAuthorities = rawFiles.flatMap((absolutePath) => {
    const path = relative(repoRoot, absolutePath);
    const content = readFileSync(absolutePath, "utf8");
    if (catalogPath(path)) {
      return catalogSections({ path, content, scenarioEvidence });
    }
    const cited =
      scenarioEvidence.includes(path) ||
      (basenameCounts.get(basename(path)) === 1 &&
        scenarioEvidence.includes(basename(path))) ||
      path.endsWith("/Playing-the-Game.md") ||
      path.endsWith("/Rules-Glossary.md");
    return cited ? [source(path)] : [];
  });
  const packet = encodeSdkReviewPacket({
    audit: verifiedAudit.audit,
    retainedHeaderEvidence,
    currentTurnProjections: projections.projections,
    runArtifacts,
    domainAuthorities: [
      source("ASSUMPTIONS.md"),
      source("UBIQUITOUS_LANGUAGE.md"),
    ],
    rawAuthorities,
  });
  if (packet.tag === "invalid") fail(packet.message);
  writeFileSync(outputPath, packet.encoded, { flag: "wx" });
  console.log(
    JSON.stringify({
      packetPath: relative(repoRoot, outputPath),
      packetByteLength: packet.byteLength,
      packetSha256: packet.sha256,
      auditCallCount: verifiedAudit.audit.calls.length,
      continuationCount: projections.projections.length,
      rawAuthorityCount: packet.packet.rawAuthorities.length,
    }),
  );
}

if (process.argv[1]?.endsWith("sdk-review-packet-cli.ts")) {
  main(process.argv.slice(2));
}
