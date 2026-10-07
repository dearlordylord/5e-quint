import { Result, Schema } from "effect";
import { spellProcedureExecutionSchema } from "./battle-reducer/spell-procedure-profiles/execution-profile.ts";
import { SaveGatedDamageInvocationSchema } from "./battle-reducer/spell-procedure-profiles/save-gated-damage.ts";
import { spellProcedureExecutionFor } from "./battle-reducer/spell-procedure-profiles/execution-registry.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import {
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { thunderwaveUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { SpellRuleExecutionFactsSchema } from "./procedure-execution/spell-rule-facts.ts";
import {
  CharacterPreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "./battle-reducer/codec-building-blocks.ts";
import { describe, expect, test } from "vitest";

describe("spell procedure execution schema constraint", () => {
  test("preserves transformed encoded and decoded views", () => {
    const schema = spellProcedureExecutionSchema(
      Schema.Struct({
        spellRuleFacts: SpellRuleExecutionFactsSchema,
        access: CharacterPreparedSpellAccessSchema,
        resource: SpellSlotInvocationResourceSchema,
        actionCost: Schema.Literal("magicAction"),
        amount: Schema.NumberFromString,
      }),
    );
    const source = spellAdmissionSource(spellRecord(thunderwaveUnitId));
    const input = {
      spellRuleFacts: {
        ...source.spellDefinitionRuleFacts,
        castingSource: source.castingSource,
      },
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 2 },
      actionCost: "magicAction",
      amount: "42",
    };
    const decoded = Schema.decodeUnknownSync(schema)(input);
    const encoded = Schema.encodeSync(schema)(decoded);

    expect(decoded.amount).toBe(42);
    expect(encoded.amount).toBe("42");
    expect(encoded).toEqual(input);
  });

  test("round-trips save-gated spell optional execution facts", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(thunderwaveUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: thunderwaveUnitId,
      slotLevel: 2,
    });
    const savingThrow = act.initialHoles.find(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    if (savingThrow === undefined) {
      throw new Error("Expected Thunderwave Saving Throw hole.");
    }

    const selected = spellHoleInvocation(session, [savingThrow]);
    if (selected.procedure !== "saveGatedDamage") {
      throw new Error("Expected a save-gated damage execution.");
    }
    const { sourceProcedureRef: _sourceProcedureRef, ...execution } = selected;

    const decoded = Schema.decodeUnknownResult(SaveGatedDamageInvocationSchema)(
      execution,
    );
    if (Result.isFailure(decoded)) {
      throw new Error(String(decoded.failure));
    }
    expect(decoded.success.postSaveAreaEffect).toEqual({
      kind: "selfOriginCubePush",
      creaturePush: {
        distanceFeet: 10,
        originDirection: "away_from_caster",
      },
      unsecuredObjectPush: {
        distanceFeet: 10,
        originDirection: "away_from_caster",
        objectLocation: "entirely_within_area",
      },
      audibleBoom: {
        sound: "thunderous boom",
        audibleRadiusFeet: 300,
      },
    });
    expect(
      Schema.encodeSync(SaveGatedDamageInvocationSchema)(decoded.success),
    ).toEqual(execution);

    const registeredExecution = spellProcedureExecutionFor(
      spellProcedureExecutionRegistry(),
      "saveGatedDamage",
    );
    const registeredDecoded = Schema.decodeUnknownResult(
      registeredExecution.executionSchema,
    )(execution);
    if (Result.isFailure(registeredDecoded)) {
      throw new Error(String(registeredDecoded.failure));
    }
    expect(
      Schema.encodeSync(registeredExecution.executionSchema)(
        registeredDecoded.success,
      ),
    ).toEqual(execution);

    const { postSaveAreaEffect: _postSaveAreaEffect, ...withoutOptional } =
      execution;
    const decodedWithoutOptional = Schema.decodeUnknownResult(
      SaveGatedDamageInvocationSchema,
    )(withoutOptional);
    if (Result.isFailure(decodedWithoutOptional)) {
      throw new Error(String(decodedWithoutOptional.failure));
    }
    expect(decodedWithoutOptional.success.postSaveAreaEffect).toBeUndefined();
    expect(
      Schema.encodeSync(SaveGatedDamageInvocationSchema)(
        decodedWithoutOptional.success,
      ),
    ).toEqual(withoutOptional);
  });
});
