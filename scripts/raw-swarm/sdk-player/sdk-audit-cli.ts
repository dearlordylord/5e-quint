import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  extractSdkTranscriptSequences,
  preflightSdkTranscript,
  readSdkAudit,
  writeSdkAudit,
} from "./sdk-audit.ts";

function fail(message: string): never {
  throw new Error(message);
}

function positiveSequence(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fail(`Invalid SDK transcript sequence ${value}.`);
}

function main(args: readonly string[]): void {
  const [command, ...rest] = args;
  if (command === "build") {
    const [transcriptPath, auditPath, ...unexpected] = rest;
    if (
      transcriptPath === undefined ||
      auditPath === undefined ||
      unexpected.length > 0
    ) {
      fail("Usage: sdk-audit-cli.ts build <transcript.jsonl> <audit.jsonl>");
    }
    const result = preflightSdkTranscript({ transcriptPath });
    if (result.tag === "invalid") fail(result.message);
    writeSdkAudit(resolve(auditPath), result.audit);
    console.log(
      JSON.stringify({
        transcriptPath: result.audit.header.transcriptPath,
        transcriptByteLength: result.audit.header.transcriptByteLength,
        transcriptSha256: result.audit.header.transcriptSha256,
        auditCallCount: result.audit.calls.length,
      }),
    );
    return;
  }
  if (command === "extract") {
    const [auditPath, recordsPath, provenancePath, ...inputs] = rest;
    const flag = (name: string): string | undefined => {
      const index = inputs.indexOf(name);
      return index < 0 ? undefined : inputs[index + 1];
    };
    const transcriptArtifactPath = flag("--transcript-artifact");
    const replaySupervisorArtifactPath = flag("--replay-supervisor-artifact");
    const optionIndexes = new Set(
      inputs.flatMap((value, index) =>
        value === "--transcript-artifact" ||
        value === "--replay-supervisor-artifact"
          ? [index, index + 1]
          : [],
      ),
    );
    const sequenceInputs = inputs.filter(
      (_, index) => !optionIndexes.has(index),
    );
    if (
      auditPath === undefined ||
      recordsPath === undefined ||
      provenancePath === undefined ||
      sequenceInputs.length === 0
    ) {
      fail(
        "Usage: sdk-audit-cli.ts extract <audit.jsonl> <records.jsonl> <provenance.json> [--transcript-artifact <path> --replay-supervisor-artifact <path>] <seq...>",
      );
    }
    if (
      (transcriptArtifactPath === undefined) !==
      (replaySupervisorArtifactPath === undefined)
    ) {
      fail(
        "Portable extraction requires both transcript and replay supervisor artifacts.",
      );
    }
    const audit = readSdkAudit(
      resolve(auditPath),
      transcriptArtifactPath === undefined
        ? undefined
        : replaySupervisorArtifactPath === undefined
          ? fail("Portable extraction requires a replay supervisor artifact.")
          : {
              transcriptPath: transcriptArtifactPath,
              replaySupervisorPath: replaySupervisorArtifactPath,
            },
    );
    if (audit.tag === "invalid") fail(audit.message);
    const extraction = extractSdkTranscriptSequences({
      audit: audit.audit,
      sequences: sequenceInputs.map(positiveSequence),
      ...(transcriptArtifactPath === undefined
        ? {}
        : replaySupervisorArtifactPath === undefined
          ? fail("Portable extraction requires a replay supervisor artifact.")
          : { transcriptArtifactPath, replaySupervisorArtifactPath }),
    });
    if (extraction.tag === "invalid") fail(extraction.message);
    writeFileSync(resolve(recordsPath), extraction.encodedRecords, {
      flag: "wx",
    });
    writeFileSync(
      resolve(provenancePath),
      `${JSON.stringify(extraction.provenance, null, 2)}\n`,
      { flag: "wx" },
    );
    return;
  }
  fail("Usage: sdk-audit-cli.ts <build|extract> ...");
}

main(process.argv.slice(2));
