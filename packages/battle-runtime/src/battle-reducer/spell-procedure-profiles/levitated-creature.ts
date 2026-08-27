import { openReactionThenResolveWillingTargetSave } from "../willing-target-save-gate.ts";
import { replaceTargetActiveEffectsEndingDisplacedConcentrations } from "../active-effect-replacement.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import { fillsBelongToDeclaredHoles } from "../fill-hole-protocol.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  LEVITATE_INITIAL_RISE_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "../battle-runtime-protocol.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
//
// The levitatedCreature Spell Procedure Profile: a prepared Magic Action spell
// that suspends one visible creature target, stores spell-owned altitude state,
// and gates initial rise, target movement, caster altitude control, and cleanup
// through caller/table-supplied witnesses.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import { Result } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type LevitatedCreatureSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { allocateBattleActiveEffectRefForCreature } from "../../active-effect/execution-ref.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import {
  invalidResult,
  resolvedResult,
  resolutionFromStateResult,
} from "../result-helpers.ts";
import {
  LEVITATE_ALTITUDE_CONTROL_FEET,
  LEVITATE_INITIAL_RISE_FEET,
  levitateInitialRiseHole,
} from "../levitate-creature.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type LevitatedCreatureInvocation = LevitatedCreatureSpellInvocation;
type LevitatedCreatureResolveInput =
  SpellProcedureProfileResolveInput<LevitatedCreatureInvocation>;

function admitLevitatedCreature(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly LevitatedCreatureInvocation[] {
  const projection = levitatedCreatureSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly LevitatedCreatureInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function levitatedCreatureSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Omit<
  LevitatedCreatureInvocation,
  "access" | "resource" | "spell" | "actionCost"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.saveAppliesIf !== "unwilling_creature_target" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.onSuccess.kind !== "none" ||
    phase.onFail.kind !== "levitate_target"
  ) {
    return null;
  }
  const selection = phase.attachment.value.selection;
  const objectFilter =
    "objectFilter" in selection ? selection.objectFilter : undefined;
  const effect = phase.onFail;
  if (
    selection.mode !== "one" ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature", "object"]) ||
    objectFilter?.targetRelation !== "loose" ||
    objectFilter?.maxWeightPounds !== 500 ||
    effect.initialRiseMaxFeet !== 20 ||
    effect.suspension !== "spell_duration" ||
    effect.targetMovement.allowedBy !==
      "push_or_pull_fixed_object_or_surface_within_reach" ||
    effect.targetMovement.movementMode !== "as_if_climbing" ||
    effect.casterAltitudeControl.maxDistanceFeet !== 20 ||
    effect.casterAltitudeControl.direction !== "up_or_down" ||
    effect.casterAltitudeControl.cost !== "magic_action_on_caster_turn" ||
    effect.casterAltitudeControl.targetMustRemainWithinSpellRange !== true ||
    effect.selfAltitudeControl.maxDistanceFeet !== 20 ||
    effect.selfAltitudeControl.direction !== "up_or_down" ||
    effect.selfAltitudeControl.cost !== "part_of_move" ||
    effect.ending !== "float_gently_to_ground_if_aloft"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  return {
    procedure: "levitatedCreature",
    ability: "con",
    dc: phase.dc,
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    rangeFeet: movementFeet(60),
    maxInitialRiseFeet: LEVITATE_INITIAL_RISE_FEET,
    activeEffect: {
      kind: "spellLevitatedCreature",
      sourceCombatantId: actorId,
      maxAltitudeChangeFeet: LEVITATE_ALTITUDE_CONTROL_FEET,
      rangeFeet: movementFeet(60),
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.success,
      },
    },
  };
}

function discoverLevitatedCreatureCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<LevitatedCreatureInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveLevitatedCreature(
  input: LevitatedCreatureResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToDeclaredHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spellSavingThrowOutcomeHoleId(input.invocation),
      LEVITATE_INITIAL_RISE_HOLE_ID,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Levitate's creature branch uses one target, one initial-rise fill, and, for unwilling targets, one Constitution Saving Throw fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelection = selectSingleSpellTarget({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    invalidTargetMessage:
      "Levitate creature target must be a combatant within 60 feet that the caster can see.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const target = targetSelection.target;

  const saveResolution = openReactionThenResolveWillingTargetSave({
    resolution: input,
    targetId: target.combatantId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
    willingTargetSaveMessage:
      "Willing Levitate creature targets do not make a Saving Throw.",
  });
  if (saveResolution.tag !== "saveGate") {
    return saveResolution;
  }
  const { saveGate } = saveResolution;
  if (saveGate.tag === "resolutionRequired") {
    return saveGate.resolution;
  }
  if (saveGate.tag === "unaffected") {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.levitateInitialRiseFeet !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Successful Levitate creature saves are unaffected and do not use an initial-rise fill.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (input.storedGlyphRelease !== undefined) {
      return resolvedResult(input.input.state);
    }
    const resourced = spendSpellCastResources({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      startConcentration: false,
    });
    return resolutionFromStateResult(resourced);
  }

  if (input.fillSet.levitateInitialRiseFeet === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      levitateInitialRiseHole({
        actorId: input.actorId,
        targetId: target.combatantId,
        maxDistanceFeet: input.invocation.maxInitialRiseFeet,
      }),
    ]);
  }

  const concentrationBase =
    input.storedGlyphRelease !== undefined
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyLevitatedCreatureSpellEffect(
    concentrationBase,
    input.actorId,
    [target.combatantId],
    input.invocation,
    input.fillSet.levitateInitialRiseFeet,
    input.input.subject.procedureRef,
  );
  if (input.storedGlyphRelease !== undefined) {
    return resolvedResult(effected);
  }
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.storedGlyphRelease !== undefined
      ? { startConcentration: false }
      : {}),
  });
  return resolutionFromStateResult(resourced);
}

function applyLevitatedCreatureSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: LevitatedCreatureResolveInput["invocation"],
  initialRiseFeet: MovementFeet,
  procedureRef: ActionSpellBattleResolutionInput["subject"]["procedureRef"],
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const allocation = allocateBattleActiveEffectRefForCreature({
      owner: target,
    });
    const allocatedTarget = allocation.owner;
    const allocatedState = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, allocatedTarget),
    };
    const nextEffect = {
      ...invocation.activeEffect,
      sourceProcedureRef: procedureRef,
      sourceCombatantId: actorId,
      effectRef: allocation.effectRef,
      altitudeFeet: initialRiseFeet,
    };
    const displacedEffects = allocatedTarget.activeEffects.filter(
      (effect) => effect.kind === "spellLevitatedCreature",
    );
    const activeEffects = [
      ...allocatedTarget.activeEffects.filter(
        (effect) => effect.kind !== "spellLevitatedCreature",
      ),
      nextEffect,
    ];
    return replaceTargetActiveEffectsEndingDisplacedConcentrations(
      allocatedState,
      targetId,
      activeEffects,
      displacedEffects,
    );
  }, state);
}

const LevitatedCreatureInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("levitatedCreature"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    activeEffect: Schema.Struct({
      kind: Schema.Literal("spellLevitatedCreature"),
      sourceCombatantId: CombatantId,
      maxAltitudeChangeFeet: MovementFeet,
      rangeFeet: MovementFeet,
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
    }),
    maxInitialRiseFeet: MovementFeet,
    rangeFeet: MovementFeet,
  }),
);
export const levitatedCreatureProfile: SpellProcedureDeclaration<
  "levitatedCreature",
  LevitatedCreatureInvocation
> = {
  procedure: "levitatedCreature",
  executionSchema: LevitatedCreatureInvocationSchema,
  admit: admitLevitatedCreature,
  discoverCastAct: discoverLevitatedCreatureCastAct,
  resolve: resolveLevitatedCreature,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
