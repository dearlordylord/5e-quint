import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  StagedSaveConditionAutomaticSuccessPredicatesSchema,
  StagedSaveConditionEscapeActionSchema,
  TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
  TemporaryAbilityCheckRollModeSelectedModeSchema,
} from "./spell-procedure-execution.ts";

describe("generic authored-execution procedure facts", () => {
  test("constructs staged-save automatic-success and escape facts", () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(
          StagedSaveConditionAutomaticSuccessPredicatesSchema,
        )([
          { kind: "doesNotSleep" },
          { kind: "conditionImmunity", condition: "exhaustion" },
        ]),
      ),
    ).toBe(true);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(StagedSaveConditionEscapeActionSchema)({
          kind: "endCurrentEffect",
          actor: "anotherCreature",
          cost: "action",
          method: "shakeAwake",
        }),
      ),
    ).toBe(true);
  });

  test("constructs only the supported temporary ability-check mode", () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(
          TemporaryAbilityCheckRollModeSelectedModeSchema,
        )({
          kind: "abilityCheckRollMode",
          ability: "cha",
          skill: "intimidation",
          rollMode: "advantage",
          effectDuration: "spellDuration",
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(
          TemporaryAbilityCheckRollModeSelectedModeSchema,
        )({
          kind: "abilityCheckRollMode",
          ability: "cha",
          skill: "deception",
          rollMode: "advantage",
          effectDuration: "spellDuration",
        }),
      ),
    ).toBe(true);
  });

  test("constructs the Surface-projected concurrent duration-mode limit", () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(
          TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
        )({ maximumActive: 3 }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(
          TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
        )({ maximumActive: 4 }),
      ),
    ).toBe(true);
  });
});
