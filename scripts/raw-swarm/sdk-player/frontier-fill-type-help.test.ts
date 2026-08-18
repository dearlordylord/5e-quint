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
    ).toEqual({ tag: "valid", frontierKind: "acts", kinds: ["targetChoice"] });
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
    ).toEqual({ tag: "valid", frontierKind: "holes", kinds: ["targetChoice"] });
  });

  test("renders no declarations for a rejected frontier without hiding it", () => {
    const observation = {
      projection: {
        frontier: {
          kind: "rejected",
          rejection: {
            tag: "invalid",
            reason: "invalidFill",
            message: "The submitted relationship fact was not requested.",
          },
        },
      },
    };
    expect(frontierFillKinds(observation)).toEqual({
      tag: "valid",
      frontierKind: "rejected",
      kinds: [],
    });
    expect(
      frontierFillTypeHelp({
        observation,
        artifact,
        declarationGraphSha256: artifact.declarationGraphSha256,
      }),
    ).toEqual({
      tag: "valid",
      markdown:
        "# Frontier fill types\n\nThe previous resolution was rejected and requests no fills. Inspect `OBSERVATION.json` for the exact rejection before retrying.\n",
    });
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
    expect(
      frontierFillKinds({
        projection: {
          frontier: { kind: "rejected", rejection: {} },
        },
      }),
    ).toEqual({
      tag: "invalid",
      message: "Player rejected frontier has no rejection evidence.",
    });
  });
});
