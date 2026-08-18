import { describe, expect, test } from "vitest";

import {
  frontierFillKinds,
  frontierFillTypeHelp,
} from "./frontier-fill-type-help.ts";
import type { PublicSdkTypeHelpArtifact } from "./public-sdk-type-help.ts";
import { publicSdkTypeHelpEntriesSha256 } from "./public-sdk-type-help.ts";

const declaration = 'type Fill = { readonly kind: "targetChoice"; };\n';
const entries = [
  {
    fillKind: "targetChoice",
    declaration,
    byteLength: Buffer.byteLength(declaration),
  },
] as const;
const artifact: PublicSdkTypeHelpArtifact = {
  schemaVersion: 1,
  declarationGraphSha256: "a".repeat(64),
  entriesSha256: publicSdkTypeHelpEntriesSha256(entries),
  entries,
};

describe("frontier fill type help", () => {
  test("derives unique fill kinds from act and pending-subject frontiers", () => {
    expect(
      frontierFillKinds({
        projection: {
          frontier: {
            kind: "acts",
            acts: [
              {
                holes: [
                  { hole: { kind: "targetChoice" } },
                  { hole: { kind: "targetChoice" } },
                ],
              },
            ],
          },
        },
      }),
    ).toEqual({ tag: "valid", kinds: ["targetChoice"] });
    expect(
      frontierFillKinds({
        tag: "ok",
        observation: {
          projection: {
            frontier: {
              kind: "holes",
              holes: [{ hole: { kind: "targetChoice" } }],
            },
          },
        },
      }),
    ).toEqual({ tag: "valid", kinds: ["targetChoice"] });
  });

  test("renders exact declaration help for the current frontier", () => {
    expect(
      frontierFillTypeHelp({
        observation: {
          projection: {
            frontier: {
              kind: "holes",
              holes: [{ hole: { kind: "targetChoice" } }],
            },
          },
        },
        artifact,
        declarationGraphSha256: artifact.declarationGraphSha256,
      }),
    ).toMatchObject({
      tag: "valid",
      markdown: expect.stringContaining(declaration),
    });
  });

  test("rejects a malformed frontier instead of treating it as empty", () => {
    expect(
      frontierFillKinds({ projection: { frontier: { kind: "acts" } } }),
    ).toEqual({
      tag: "invalid",
      message: "Player observation has no valid frontier.",
    });
  });
});
