import type { RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import { Match, Result } from "effect";
import { spellEffectProcedureRef } from "./identity.ts";
import type { CreateSpatialMeleeSpellAttackProxySpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import type {
  BattleCreatureState,
  BattleExecutableSpellInvocation,
} from "./battle-state-execution.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import {
  characterRetainedSpellProcedureExecution,
  characterSpellProcedure,
} from "./character-execution-queries.ts";
import { statBlockSpellProcedure } from "./stat-block-spell-invocation-selection.ts";
export function creatureSpellProcedure(
  actor: BattleCreatureState,
  procedureRef: BattleProcedureExecutionRef,
): BattleExecutableSpellInvocation | undefined {
  return Match.value(actor.origin).pipe(
    Match.discriminatorsExhaustive("kind")({
      character: (origin) =>
        characterSpellProcedure(origin.execution, procedureRef, actor),
      statBlock: (origin) =>
        statBlockSpellProcedure(origin.execution, procedureRef) ??
        creatureSpellEffectProcedures(actor).find(
          (invocation) => invocation.sourceProcedureRef === procedureRef,
        ),
    }),
  );
}

/** Retained initial facts remain available to effects after casting resources expire. */
export function creatureRetainedSpellProcedureExecution(
  actor: BattleCreatureState,
  procedureRef: BattleProcedureExecutionRef,
) {
  return Match.value(actor.origin).pipe(
    Match.discriminatorsExhaustive("kind")({
      character: (origin) =>
        characterRetainedSpellProcedureExecution(
          origin.execution,
          procedureRef,
        ),
      statBlock: (origin) =>
        statBlockSpellProcedure(origin.execution, procedureRef),
    }),
  );
}

/** Initial casting facts remain in the canonical execution owner after payment. */
export function creatureSpatialMeleeSpellAttackProxySource(
  actor: BattleCreatureState,
  procedureRef: BattleProcedureExecutionRef,
): CreateSpatialMeleeSpellAttackProxySpellProcedureExecution | undefined {
  const source = creatureRetainedSpellProcedureExecution(actor, procedureRef);
  return source?.procedure === "spatialMeleeSpellAttackProxy" &&
    source.operation === "createAndAttack"
    ? source
    : undefined;
}

/** Live Stat Block repeats derive from their effect and retained initial cast. */
export function creatureSpellEffectProcedures(
  actor: BattleCreatureState,
): readonly (RepeatSpatialMeleeSpellAttackProxyLiveSpellProcedureExecution & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
})[] {
  if (actor.origin.kind !== "statBlock") return [];
  return actor.activeEffects.flatMap((effect) => {
    if (
      effect.kind !== "spatialMeleeSpellAttackProxy" ||
      effect.sourceCombatantId !== actor.combatantId
    )
      return [];
    const source = creatureSpatialMeleeSpellAttackProxySource(
      actor,
      effect.sourceProcedureRef,
    );
    if (
      source?.procedure !== "spatialMeleeSpellAttackProxy" ||
      source.operation !== "createAndAttack"
    )
      return [];
    const ref = spellEffectProcedureRef(
      effect.sourceProcedureRef,
      effect.effectRef,
    );
    if (Result.isFailure(ref)) return [];
    return [
      {
        spellRuleFacts: source.spellRuleFacts,
        access: { tag: "spellEffect", sourceCombatantId: actor.combatantId },
        resource: { tag: "none" },
        procedure: "spatialMeleeSpellAttackProxy",
        operation: "repositionAndAttack",
        actionCost: "bonusAction",
        activeEffect: effect,
        repeatTargeting: effect.repeatTargeting,
        targeting: { kind: "singleCombatant" },
        damage: source.damage,
        attackKind: source.attackKind,
        attackBonus: source.attackBonus,
        forceReachFeet: source.forceReachFeet,
        repeatMoveMaxFeet: source.repeatMoveMaxFeet,
        sourceProcedureRef: ref.success,
      },
    ];
  });
}
