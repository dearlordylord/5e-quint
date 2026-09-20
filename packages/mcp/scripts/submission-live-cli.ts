import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Result, Schema } from "effect";

import { sha256 } from "../src/submission-candidate-evidence.ts";
import { evaluateLiveSubmission } from "../src/submission-live-gate.ts";

const options = parseOptions(process.argv.slice(2));
const execFileAsync = promisify(execFile);
const VersionResponseSchema = Schema.Struct({
  release: Schema.String,
  publisher: Schema.String,
});
const CandidateFingerprintSchema = Schema.Struct({
  fingerprint: Schema.String,
});
const origin = publicOrigin(required(options.origin, "--origin"));
const candidate = await readJson(required(options.candidate, "--candidate"));
const deploymentAttestation = await readJson(
  required(options.deploymentAttestation, "--deployment-attestation"),
);
const publicationAttestation = await readJson(
  required(options.publicationAttestation, "--publication-attestation"),
);
const packageDigest = await observedPackageDigest(
  required(options.package, "--package"),
);
const live = await observeLive(origin);
const issues = evaluateLiveSubmission({
  candidate,
  deploymentAttestation,
  publicationAttestation,
  live,
  packageDigest,
  now: new Date(),
});
if (issues.length > 0) {
  process.stderr.write(
    `${JSON.stringify({ tag: "submissionLiveGateFailed", issues }, null, 2)}\n`,
  );
  process.exitCode = 1;
} else {
  const packet = {
    schema: "dnd.srd-oracle.submission-evidence-packet.v1",
    candidateFingerprint: candidateFingerprint(candidate),
    release: live.release,
    origin: live.origin,
    checkedAt: new Date().toISOString(),
    observed: {
      publicMcpContract: sha256(live.publicMcpContract),
      privacy: sha256(live.privacy),
      terms: sha256(live.terms),
      package: packageDigest,
    },
  };
  const output = resolve(required(options.output, "--output"));
  await writeFile(output, `${JSON.stringify(packet, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  process.stdout.write(`${output}\n`);
}

async function observeLive(origin: URL) {
  const endpoint = new URL("/mcp", origin);
  const client = new Client({
    name: "submission-live-observer",
    version: "0.1.0",
  });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(endpoint) as Transport,
    );
    const tools = await client.listTools();
    const [versionResponse, privacyResponse, termsResponse] = await Promise.all(
      [
        fetch(new URL("/version", origin)),
        fetch(new URL("/privacy", origin)),
        fetch(new URL("/terms", origin)),
      ],
    );
    if (!versionResponse.ok || !privacyResponse.ok || !termsResponse.ok) {
      throw new Error("The live origin did not serve every required artifact.");
    }
    const version = decodeBoundary(
      VersionResponseSchema,
      await versionResponse.json(),
      "Live /version",
    );
    return {
      origin: origin.origin,
      release: version.release,
      publisherName: version.publisher,
      publicMcpContract: {
        serverVersion: client.getServerVersion(),
        instructions: client.getInstructions(),
        tools: tools.tools,
      },
      privacy: await privacyResponse.text(),
      terms: await termsResponse.text(),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

function parseOptions(args: readonly string[]): Record<string, string> {
  const names: Record<string, string> = {
    "--origin": "origin",
    "--candidate": "candidate",
    "--deployment-attestation": "deploymentAttestation",
    "--publication-attestation": "publicationAttestation",
    "--package": "package",
    "--output": "output",
  };
  const parsed: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (
      name === undefined ||
      value === undefined ||
      names[name] === undefined
    ) {
      throw new Error(
        "usage: submission-live-cli.ts --origin URL --candidate FILE --deployment-attestation FILE --publication-attestation FILE --package DIRECTORY --output FILE",
      );
    }
    parsed[names[name]] = value;
  }
  return parsed;
}

async function observedPackageDigest(directory: string): Promise<string> {
  const script = resolve(
    import.meta.dirname,
    "../../../plugins/dnd-srd-oracle/publication/package-digest.mjs",
  );
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    resolve(directory),
  ]);
  return stdout.trim();
}

function publicOrigin(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.pathname !== "/") {
    throw new Error("--origin must be an HTTPS origin without a path.");
  }
  return url;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value === "")
    throw new Error(`${name} is required.`);
  return value;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as unknown;
}

function candidateFingerprint(value: unknown): string {
  return decodeBoundary(CandidateFingerprintSchema, value, "Candidate evidence")
    .fingerprint;
}

function decodeBoundary<A, I>(
  schema: Schema.Codec<A, I, never>,
  value: unknown,
  name: string,
): A {
  const decoded = Schema.decodeUnknownResult(schema)(value);
  if (Result.isFailure(decoded)) {
    throw new Error(`${name} is invalid: ${decoded.failure.message}`);
  }
  return decoded.success;
}
