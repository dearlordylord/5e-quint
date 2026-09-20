import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { buildSubmissionCandidateEvidence } from "../src/submission-candidate-evidence.ts";
import { decodePublicMcpOperatorDataHandling } from "../src/public-operator-data-handling.ts";
import { Result, Schema } from "effect";

const CandidateCliArgumentsSchema = Schema.Tuple([
  Schema.Literal("--output"),
  Schema.String,
]);

const execFileAsync = promisify(execFile);
const output = outputPath(process.argv.slice(2));
const { stdout: releaseOutput } = await execFileAsync("git", [
  "rev-parse",
  "HEAD",
]);
await execFileAsync("git", ["diff", "--quiet", "HEAD", "--"]);
const operatorDataHandling = decodePublicMcpOperatorDataHandling({
  hostingRecipients: process.env.DND_MCP_HOSTING_RECIPIENTS,
  stderrRetention: process.env.DND_MCP_STDERR_RETENTION,
  ingressAccessLogRetention: process.env.DND_MCP_INGRESS_ACCESS_LOG_RETENTION,
  budgetMonitoring: process.env.DND_MCP_BUDGET_MONITORING,
  alertRecipient: process.env.DND_MCP_BUDGET_ALERT_RECIPIENT,
});
if (Result.isFailure(operatorDataHandling)) {
  throw new Error(
    `Invalid operator data handling: ${operatorDataHandling.failure}`,
  );
}
const evidence = await buildSubmissionCandidateEvidence({
  release: releaseOutput.trim(),
  publisherName: requiredPublisherName(process.env.DND_MCP_PUBLISHER_NAME),
  generatedAt: new Date().toISOString(),
  operatorDataHandling: operatorDataHandling.success,
});
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
process.stdout.write(`${output}\n`);

function outputPath(args: readonly string[]): string {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  const decoded = Schema.decodeUnknownResult(CandidateCliArgumentsSchema)(
    normalizedArgs,
  );
  if (Result.isFailure(decoded)) {
    throw new Error("usage: submission-candidate-cli.ts --output FILE");
  }
  return resolve(decoded.success[1]);
}

function requiredPublisherName(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error("DND_MCP_PUBLISHER_NAME is required.");
  }
  return value;
}
