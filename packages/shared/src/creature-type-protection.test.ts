import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { CreatureTypeProtectionPolicySchema } from "./creature-type-protection.ts";

const validPolicy = {
  creatureTypes: ["aberration", "fiend"],
  protections: [
    { kind: "attack_rolls_against_target", mode: "disadvantage" },
    {
      kind: "relevant_effect_protection",
      conditions: ["charmed", "frightened"],
      possession: "included",
      outcomes: [
        { kind: "new_applications", result: "prevented" },
        {
          kind: "new_saves_against_existing_effects",
          mode: "advantage",
        },
      ],
    },
  ],
} as const;

describe("CreatureTypeProtectionPolicySchema", () => {
  test("decodes and encodes the complete mechanical policy", () => {
    const decoded = Schema.decodeUnknownResult(
      CreatureTypeProtectionPolicySchema,
    )(validPolicy);

    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;

    expect(
      Schema.encodeSync(CreatureTypeProtectionPolicySchema)(decoded.success),
    ).toEqual(validPolicy);
  });

  test("admits exhaustion through the broad shared SurfaceCondition boundary", () => {
    const exhaustionPolicy = {
      ...validPolicy,
      protections: [
        {
          kind: "relevant_effect_protection",
          conditions: ["exhaustion"],
          possession: "included",
          outcomes: [{ kind: "new_applications", result: "prevented" }],
        },
      ],
    } as const;

    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(CreatureTypeProtectionPolicySchema)(
          exhaustionPolicy,
        ),
      ),
    ).toBe(true);
  });

  test.each([
    ["empty creatureTypes", { ...validPolicy, creatureTypes: [] }],
    [
      "duplicate creatureTypes",
      { ...validPolicy, creatureTypes: ["fiend", "fiend"] },
    ],
    ["empty protections", { ...validPolicy, protections: [] }],
    [
      "duplicate protections",
      {
        ...validPolicy,
        protections: [
          { kind: "attack_rolls_against_target", mode: "disadvantage" },
          { kind: "attack_rolls_against_target", mode: "disadvantage" },
        ],
      },
    ],
    [
      "empty relevant conditions",
      {
        ...validPolicy,
        protections: [
          {
            kind: "relevant_effect_protection",
            conditions: [],
            possession: "included",
            outcomes: [{ kind: "new_applications", result: "prevented" }],
          },
        ],
      },
    ],
    [
      "duplicate relevant conditions",
      {
        ...validPolicy,
        protections: [
          {
            kind: "relevant_effect_protection",
            conditions: ["charmed", "charmed"],
            possession: "included",
            outcomes: [{ kind: "new_applications", result: "prevented" }],
          },
        ],
      },
    ],
    [
      "empty outcomes",
      {
        ...validPolicy,
        protections: [
          {
            kind: "relevant_effect_protection",
            conditions: ["charmed"],
            possession: "included",
            outcomes: [],
          },
        ],
      },
    ],
    [
      "duplicate outcomes",
      {
        ...validPolicy,
        protections: [
          {
            kind: "relevant_effect_protection",
            conditions: ["charmed"],
            possession: "included",
            outcomes: [
              { kind: "new_applications", result: "prevented" },
              { kind: "new_applications", result: "prevented" },
            ],
          },
        ],
      },
    ],
  ] as const)("rejects $0", (_name, input) => {
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(CreatureTypeProtectionPolicySchema)(input),
      ),
    ).toBe(true);
  });
});
