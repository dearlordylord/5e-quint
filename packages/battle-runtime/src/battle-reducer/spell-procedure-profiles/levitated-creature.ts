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
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type LevitatedCreatureSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { allocateBattleActiveEffectRef } from "../../active-effect/execution-ref.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "../spell-condition-effects-helpers.ts";
import {
  LEVITATE_ALTITUDE_CONTROL_FEET,
  LEVITATE_INITIAL_RISE_FEET,
  levitateInitialRiseHole,
} from "../levitate-creature.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spellSavingThrowOutcomeHole } from "../spells-damage-fills.ts";
import {
  spellTargetHole,
  spellTargetIsKnownWilling,
  spellTargetIsLegal,
} from "../spells-targeting.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
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
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type LevitatedCreatureInvocation = LevitatedCreatureSpellInvocation;
type LevitatedCreatureResolveInput =
  SpellProcedureProfileResolveInput<LevitatedCreatureInvocation>;

function admitLevitatedCreature(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly LevitatedCreatureInvocation[] {
  const projection = levitatedCreatureSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly LevitatedCreatureInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function levitatedCreatureSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
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
  if (Either.isLeft(durationTicks)) {
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
        durationTicks: durationTicks.right,
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
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              procedureRef: invocation.sourceProcedureRef,
              mode: { tag: "cast" as const },
            },
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function resolveLevitatedCreature(
  input: LevitatedCreatureResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.objectContactTargets !== undefined ||
    input.fillSet.objectContactSavingThrowOutcome !== undefined ||
    input.fillSet.objectDropResolution !== undefined ||
    input.fillSet.magicWeaponTargetItem !== undefined ||
    input.fillSet.ongoingSpellTarget !== undefined ||
    input.fillSet.ongoingSpellAbilityChecks.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.selfTransformationModeChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Levitate's creature branch uses one target, one initial-rise fill, and, for unwilling targets, one Constitution Saving Throw fill.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.input.state.combatants.get(input.fillSet.targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Levitate creature target must be a combatant within 60 feet that the caster can see.",
    );
  }

  if (input.storedGlyphRelease === undefined) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: [target.combatantId],
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource: { kind: "magicAction" },
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      }),
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const targetIsWilling = spellTargetIsKnownWilling(
    input.actorId,
    target.combatantId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  );
  if (targetIsWilling && input.fillSet.savingThrowOutcomes !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Willing Levitate creature targets do not make a Saving Throw.",
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (!targetIsWilling && input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  if (input.fillSet.savingThrowOutcomes !== undefined) {
    const validation = validateSavingThrowOutcomes(
      input.fillSet.savingThrowOutcomes,
      input.invocation,
      input.input.state,
      input.actorId,
      undefined,
      [target.combatantId],
    );
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
    const outcome = input.fillSet.savingThrowOutcomes.outcomes[0];
    if (outcome?.succeeded === true) {
      if (input.fillSet.levitateInitialRiseFeet !== undefined) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Successful Levitate creature saves are unaffected and do not use an initial-rise fill.",
        );
      }
      if (input.storedGlyphRelease !== undefined) {
        return {
          tag: "resolved",
          state: input.input.state,
          snapshot: snapshotBattle(input.input.state),
        };
      }
      const resourced = spendSpellCastResources({
        state: input.input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: false,
      });
      return resourced.tag === "invalid"
        ? resourced
        : {
            tag: "resolved",
            state: resourced.state,
            snapshot: snapshotBattle(resourced.state),
          };
    }
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
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
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
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
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
    const allocation = allocateBattleActiveEffectRef({
      state: nextState,
      ownerId: targetId,
    });
    if (allocation.tag === "ownerNotFound") return nextState;
    const allocatedTarget = allocation.owner;
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
    const withReplacement = {
      ...allocation.state,
      combatants: new Map(allocation.state.combatants).set(targetId, {
        ...allocatedTarget,
        activeEffects,
      }),
    };
    const combatants = displacedEffects.reduce<
      ReadonlyMap<CombatantId, BattleCreatureState>
    >(
      (nextCombatants, effect) =>
        combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
          nextCombatants,
          {
            sourceCombatantId: effect.sourceCombatantId,
            sourceProcedureRef: effect.sourceProcedureRef,
          },
        ),
      withReplacement.combatants,
    );
    return { ...withReplacement, combatants };
  }, state);
}

const LevitatedCreatureInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
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
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitLevitatedCreature,
  discoverCastAct: discoverLevitatedCreatureCastAct,
  resolve: resolveLevitatedCreature,
};
