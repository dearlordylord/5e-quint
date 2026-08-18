import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Match } from "effect";

import {
  publicSdkDeclarationGraphSha256,
  publicSdkTypeHelp,
} from "./public-sdk-type-help.ts";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [fillKind, ...unexpected] = process.argv.slice(2);
if (
  fillKind === undefined ||
  !/^[A-Za-z][A-Za-z0-9]*$/.test(fillKind) ||
  unexpected.length > 0
) {
  fail("Usage: node public-sdk-type-help.mjs <BattleFill kind>");
}
const artifact: unknown = JSON.parse(
  readFileSync(resolve("FILL_TYPES.json"), "utf8"),
);
const declarationGraphSha256 = publicSdkDeclarationGraphSha256(
  resolve("declarations"),
);
if (declarationGraphSha256 === undefined) {
  fail("Public SDK declaration graph is empty.");
}
const result = publicSdkTypeHelp(artifact, fillKind, declarationGraphSha256);
process.stdout.write(
  Match.value(result).pipe(
    Match.when({ tag: "found" }, ({ declaration }) => declaration),
    Match.when({ tag: "invalidArtifact" }, ({ message }) => fail(message)),
    Match.when({ tag: "unknownFillKind" }, ({ message }) => fail(message)),
    Match.exhaustive,
  ),
);
