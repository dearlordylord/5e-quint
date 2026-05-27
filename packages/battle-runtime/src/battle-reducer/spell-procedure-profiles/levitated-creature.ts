// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
//
// The levitatedCreature Spell Procedure Profile: a prepared Magic Action spell
// that suspends one visible creature target, stores spell-owned altitude state,
// and gates initial rise, target movement, caster altitude control, and cleanup
// through caller/table-supplied witnesses.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type LevitatedCreatureSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
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
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type LevitatedCreatureInvocation = LevitatedCreatureSpellInvocation;

function admitLevitatedCreature(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly LevitatedCreatureInvocation[] {
  const projection = levitatedCreatureSpellProjection(ctx.actorId, spell);
  if (projection === null) {
    return [];
  }
  return ctx.spellcasting.spellSlots.flatMap(
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
      sourceSpellId: spell.id,
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
  invocation: LevitatedCreatureInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: levitatedCreatureInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: levitatedCreatureCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function levitatedCreatureInvocationRef(
  invocation: LevitatedCreatureInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "levitatedCreature",
  };
}

function levitatedCreatureCastSummary(
  invocation: LevitatedCreatureInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveLevitatedCreature(
  input: SpellProcedureProfileResolveInput<
    LevitatedCreatureInvocation,
    ActionSpellBattleResolutionInput
  >,
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

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
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
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
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
      savingThrowHole,
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

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyLevitatedCreatureSpellEffect(
    concentrationBase,
    input.actorId,
    [target.combatantId],
    input.invocation,
    input.fillSet.levitateInitialRiseFeet,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
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
  invocation: LevitatedCreatureInvocation,
  initialRiseFeet: MovementFeet,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
      altitudeFeet: initialRiseFeet,
    };
    const displacedEffects = target.activeEffects.filter(
      (effect) => effect.kind === "spellLevitatedCreature",
    );
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) => effect.kind !== "spellLevitatedCreature",
      ),
      nextEffect,
    ];
    const withReplacement = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
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
            sourceSpellId: effect.sourceSpellId,
          },
        ),
      withReplacement.combatants,
    );
    return { ...withReplacement, combatants };
  }, state);
}

export const levitatedCreatureProfile: SpellProcedureProfile<
  "levitatedCreature",
  LevitatedCreatureInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "levitatedCreature",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitLevitatedCreature,
  discoverCastAct: discoverLevitatedCreatureCastAct,
  castSummary: levitatedCreatureCastSummary,
  invocationRef: levitatedCreatureInvocationRef,
  resolve: resolveLevitatedCreature,
};
