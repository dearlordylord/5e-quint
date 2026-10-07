import { NonNegativeInteger } from "@dnd/shared/types";
import { Result, Schema } from "effect";
import { expect, it } from "vitest";
import {
  BattleProcedureExecutionRef,
  battleId,
  combatantId,
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
  battleEffectExecutionRef,
  statBlockSpellcastingGroupOrdinal,
  statBlockSpellcastingInvocationOrdinal,
  statBlockSpellInvocationProcedureRef,
  spellEffectProcedureRef,
  battleProcedureExecutionRefBelongsToScope,
  battleProcedureExecutionRefBelongsToCombatant,
} from "./identity.ts";

it("derives distinct stable effect procedures with the source's canonical ownership", () => {
  const actorId = combatantId("synthetic-effect-procedure-caster");
  const scope = battleStatBlockExecutionScopeRef(
    battleId("effect-procedure"),
    actorId,
    battleExecutionScopeOrdinal(0),
  );
  const source = statBlockSpellInvocationProcedureRef(
    {
      procedureRef: battleStatBlockProcedureExecutionRef(
        scope,
        NonNegativeInteger(0),
      ),
      groupOrdinal: statBlockSpellcastingGroupOrdinal(0),
      invocationOrdinal: statBlockSpellcastingInvocationOrdinal(0),
    },
    "spatialMeleeSpellAttackProxy",
  );
  const effect = (ownerScopeRef: typeof scope, ordinal: number) =>
    battleEffectExecutionRef(
      JSON.stringify({ kind: "effectOccurrence", ownerScopeRef, ordinal }),
    );
  const firstEffect = effect(scope, 0);
  const derived = spellEffectProcedureRef(source, firstEffect);
  if (Result.isFailure(derived))
    throw new Error("Expected same-source effect reference");
  expect(derived.success).not.toBe(source);
  expect(spellEffectProcedureRef(derived.success, firstEffect)).toEqual(
    Result.fail("invalidEffectProcedureSource"),
  );
  expect(
    Schema.is(BattleProcedureExecutionRef)(
      JSON.stringify({
        kind: "spellEffectProcedure",
        sourceProcedureRef: derived.success,
        activeEffectRef: firstEffect,
      }),
    ),
  ).toBe(false);
  const second = spellEffectProcedureRef(source, effect(scope, 1));
  if (Result.isFailure(second))
    throw new Error("Expected second effect reference");
  expect(second.success).not.toBe(derived.success);
  expect(
    battleProcedureExecutionRefBelongsToScope(derived.success, scope),
  ).toBe(true);
  expect(
    battleProcedureExecutionRefBelongsToCombatant(derived.success, actorId),
  ).toBe(true);
  expect(
    battleProcedureExecutionRefBelongsToCombatant(
      derived.success,
      combatantId("other-caster"),
    ),
  ).toBe(false);
  const restored = Schema.decodeUnknownSync(BattleProcedureExecutionRef)(
    JSON.parse(
      JSON.stringify(
        Schema.encodeSync(BattleProcedureExecutionRef)(derived.success),
      ),
    ),
  );
  expect(restored).toBe(derived.success);
  const otherScope = battleStatBlockExecutionScopeRef(
    battleId("effect-procedure"),
    actorId,
    battleExecutionScopeOrdinal(1),
  );
  const mismatch = spellEffectProcedureRef(source, effect(otherScope, 0));
  expect(mismatch).toEqual(Result.fail("effectSourceScopeMismatch"));
  expect(
    Schema.is(BattleProcedureExecutionRef)(
      JSON.stringify({
        kind: "spellEffectProcedure",
        sourceProcedureRef: source,
        activeEffectRef: effect(otherScope, 0),
      }),
    ),
  ).toBe(false);
  expect(
    battleProcedureExecutionRefBelongsToScope(derived.success, otherScope),
  ).toBe(false);
});
