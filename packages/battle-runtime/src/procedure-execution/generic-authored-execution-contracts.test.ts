import { Result, Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import type { SupportedSpellInvocation } from "../battle-state-execution.ts";

import {
  StagedSaveConditionAutomaticSuccessPredicatesSchema,
  StagedSaveConditionEscapeActionSchema,
  TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
  TemporaryAbilityCheckRollModeSelectedModeSchema,
  type SpawnedCompanionLifecycleExecutionFacts,
  type SpellProcedureExecution,
  type StagedSaveConditionAutomaticSuccessPredicates,
  type StagedSaveConditionEscapeAction,
  type TemporaryAbilityCheckRollModeConcurrentDurationModeLimit,
  type TemporaryAbilityCheckRollModeSelectedMode,
} from "./spell-procedure-execution.ts";

type SupportedInvocationFor<
  Procedure extends SupportedSpellInvocation["procedure"],
> = Extract<SupportedSpellInvocation, { readonly procedure: Procedure }>;

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

  test("threads the facts through supported invocation and execution contracts", () => {
    expectTypeOf<
      SupportedInvocationFor<"stagedSaveCondition">["automaticSuccessPredicates"]
    >().toEqualTypeOf<StagedSaveConditionAutomaticSuccessPredicates>();
    expectTypeOf<
      SupportedInvocationFor<"stagedSaveCondition">["escapeAction"]
    >().toEqualTypeOf<StagedSaveConditionEscapeAction>();
    expectTypeOf<
      SupportedInvocationFor<"temporaryAbilityCheckRollMode">["selectedMode"]
    >().toEqualTypeOf<TemporaryAbilityCheckRollModeSelectedMode>();
    expectTypeOf<
      SupportedInvocationFor<"temporaryAbilityCheckRollMode">["concurrentDurationModeLimit"]
    >().toEqualTypeOf<TemporaryAbilityCheckRollModeConcurrentDurationModeLimit>();
    expectTypeOf<
      SpellProcedureExecution<
        SupportedInvocationFor<"spawnedCompanionLifecycle">
      >
    >().toEqualTypeOf<SpawnedCompanionLifecycleExecutionFacts>();
  });
});
