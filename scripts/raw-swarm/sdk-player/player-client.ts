import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const SDK_SUPERVISOR_RESPONSE_TIMEOUT_MILLISECONDS = 10 * 60 * 1_000;

function fail(message: string): never {
  throw new Error(message);
}

const [attemptPath, ...unexpected] = process.argv.slice(2);
if (attemptPath === undefined || unexpected.length > 0) {
  fail("Usage: node player-client.mjs <attempt.ts>");
}

const requestId = randomUUID();
const requestPath = resolve(".requests", `${requestId}.request.json`);
const requestTemporaryPath = resolve(".requests", `${requestId}.request.next`);
const responsePath = resolve(".responses", `${requestId}.response.json`);
const observation = readFileSync(resolve("OBSERVATION.json"), "utf8");
writeFileSync(
  requestTemporaryPath,
  `${JSON.stringify({
    requestId,
    source: readFileSync(resolve(attemptPath), "utf8"),
    expectedObservationSha256: createHash("sha256")
      .update(observation)
      .digest("hex"),
  })}\n`,
  { flag: "wx" },
);
linkSync(requestTemporaryPath, requestPath);
unlinkSync(requestTemporaryPath);

const deadline = Date.now() + SDK_SUPERVISOR_RESPONSE_TIMEOUT_MILLISECONDS;
while (!existsSync(responsePath)) {
  if (Date.now() >= deadline) fail("Timed out waiting for the SDK supervisor.");
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
}
const response = readFileSync(responsePath, "utf8");
process.stdout.write(response);
const decoded: unknown = JSON.parse(response);
if (
  typeof decoded === "object" &&
  decoded !== null &&
  "observation" in decoded
) {
  writeFileSync(resolve("OBSERVATION.json"), response);
}
if (
  typeof decoded === "object" &&
  decoded !== null &&
  "tag" in decoded &&
  decoded.tag === "error"
) {
  process.exitCode = 1;
}
