// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
//
// The creatureSizeIncrease / creatureSizeDecrease Spell Procedure Profile:
// a prepared Magic Action spell that enlarges or reduces one creature,
// applying the corresponding size, Strength roll-mode, and attack damage
// effect for the spell's concentration duration.
//
// This implementation owns two procedure literals. Both are registered so
// registry-derived procedure tables remain total over supported invocations,
// while admit() and resolve() still share the same implementation.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type {
  EffectAtom,
  OngoingEffect,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type CreatureSizeChangeSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  activeEffectsWithCreatureSizeChangeReplaced,
  CREATURE_SIZE_CHANGE_DAMAGE_DICE,
  CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE,
  CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL,
  creatureSizeChangeProcedure,
} from "../creature-size-change-effects.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenReactionWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "../spell-condition-effects-helpers.ts";
import { spellSavingThrowOutcomeHole } from "../spells-damage-fills.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import {
  spellTargetHole,
  spellTargetIsKnownWilling,
  spellTargetIsLegal,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type CreatureSizeChangeInvocation = CreatureSizeChangeSpellInvocation;

function admitCreatureSizeChange(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly CreatureSizeChangeInvocation[] {
  const projections = creatureSizeChangeSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projections.length === 0) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly CreatureSizeChangeInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : projections.map((projection) => ({
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            spell,
            actionCost: "magicAction",
            ...projection,
          })),
  );
}

function creatureSizeChangeSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly Pick<
  CreatureSizeChangeInvocation,
  "procedure" | "ability" | "dc" | "targeting" | "activeEffect" | "rangeFeet"
>[] {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.saveAppliesIf !== "unwilling_creature_target" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return [];
  }
  const targetSelection = phase.attachment.value.selection;
  const objectFilter =
    "objectFilter" in targetSelection
      ? targetSelection.objectFilter
      : undefined;
  if (
    targetSelection?.mode !== "one" ||
    targetSelection.targetKinds === undefined ||
    !sameStringSet(targetSelection.targetKinds, ["creature", "object"]) ||
    objectFilter?.visibility !== "caster_can_see" ||
    objectFilter?.targetRelation !== "not_worn_or_carried" ||
    phase.onSuccess.kind !== "none" ||
    phase.onFail.kind !== "choose_effect_mode"
  ) {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return [];
  }
  return phase.onFail.options.flatMap(
    (
      option,
    ): readonly Pick<
      CreatureSizeChangeInvocation,
      | "procedure"
      | "ability"
      | "dc"
      | "targeting"
      | "activeEffect"
      | "rangeFeet"
    >[] => {
      const activeEffect = creatureSizeChangeActiveEffect(
        actorId,
        spell,
        option.effects,
        durationTicks.right,
      );
      if (activeEffect === null) {
        return [];
      }
      return [
        {
          procedure: creatureSizeChangeProcedure(activeEffect),
          ability: "con",
          dc: phase.dc,
          targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
          activeEffect,
          rangeFeet: movementFeet(30),
        },
      ];
    },
  );
}

function creatureSizeChangeActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
  effects: readonly OngoingEffect[],
  durationTicks: ElapsedTimeTicks,
): CreatureSizeChangeInvocation["activeEffect"] | null {
  const size = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_size_category" }
    > => effect.kind === "modify_size_category",
  );
  const abilityCheck = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["ability_check"]),
  );
  const savingThrow = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["saving_throw"]),
  );
  const damage = effects.find(
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_damage_numeric" }
    > => effect.kind === "modify_damage_numeric",
  );
  if (
    effects.length !== 4 ||
    size === undefined ||
    size.steps !== 1 ||
    abilityCheck === undefined ||
    savingThrow === undefined ||
    damage === undefined ||
    abilityCheck.mode !== savingThrow.mode ||
    !Array.isArray(abilityCheck.abilityFilter) ||
    !sameStringSet(abilityCheck.abilityFilter, ["str"]) ||
    abilityCheck.skillFilter !== undefined ||
    !Array.isArray(savingThrow.saveAbilityFilter) ||
    !sameStringSet(savingThrow.saveAbilityFilter, ["str"]) ||
    damage.delta.kind !== "fixed_dice" ||
    damage.delta.dice !== CREATURE_SIZE_CHANGE_DAMAGE_DICE ||
    damage.delta.dieSize !== CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE ||
    damage.damageSourceFilter?.kind !== "attack_hit" ||
    damage.damageSourceFilter.attackRollFilter !== "weapon_or_unarmed_strike"
  ) {
    return null;
  }
  if (
    (size.direction === "increase" &&
      (abilityCheck.mode !== "advantage" ||
        damage.delta.sign !== "+" ||
        damage.minimumDamageTotal !== undefined)) ||
    (size.direction === "decrease" &&
      (abilityCheck.mode !== "disadvantage" ||
        damage.delta.sign !== "-" ||
        damage.minimumDamageTotal !==
          CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL))
  ) {
    return null;
  }
  return {
    kind: "spellCreatureSizeChange",
    sourceSpellId: spell.id,
    sourceCombatantId: actorId,
    direction: size.direction,
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks,
    },
  };
}

function discoverCreatureSizeChangeCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: CreatureSizeChangeInvocation,
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
              invocation: creatureSizeChangeInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: `${invocation.spell.name} (${creatureSizeChangeLabel(invocation)})`,
            summary: creatureSizeChangeCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function creatureSizeChangeInvocationRef(
  invocation: CreatureSizeChangeInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: invocation.procedure,
  };
}

function creatureSizeChangeLabel(
  invocation: CreatureSizeChangeInvocation,
): string {
  return invocation.procedure === "creatureSizeIncrease"
    ? "increase size"
    : "decrease size";
}

function creatureSizeChangeCastSummary(
  invocation: CreatureSizeChangeInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot to ${creatureSizeChangeLabel(invocation)}.`;
}

function resolveCreatureSizeChange(
  input: SpellProcedureProfileResolveInput<
    CreatureSizeChangeInvocation,
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
      "Creature size-change spells use one target and, for unwilling targets, one Saving Throw fill.",
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
      "Creature size-change spell target must be a combatant within the selected spell's supported range.",
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
      "Willing creature size-change targets do not make a Saving Throw.",
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

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyCreatureSizeChangeEffect(
    concentrationBase,
    input.actorId,
    [target.combatantId],
    input.invocation,
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

function applyCreatureSizeChangeEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: CreatureSizeChangeInvocation,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const replacement = activeEffectsWithCreatureSizeChangeReplaced(
      target.activeEffects,
      nextEffect,
    );
    const withReplacement = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects: replacement.activeEffects,
      }),
    };
    const combatants = replacement.displacedEffects.reduce<
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

const CreatureSizeIncreaseInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    {
      readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease";
    }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("creatureSizeIncrease", "creatureSizeDecrease"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);
export const creatureSizeChangeProfile: SpellProcedureProfile<
  "creatureSizeIncrease",
  CreatureSizeChangeInvocation
> = {
  procedure: "creatureSizeIncrease",
  invocationSchema: CreatureSizeIncreaseInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitCreatureSizeChange,
  discoverCastAct: discoverCreatureSizeChangeCastAct,
  castSummary: creatureSizeChangeCastSummary,
  invocationRef: creatureSizeChangeInvocationRef,
  resolve: resolveCreatureSizeChange,
};

export const creatureSizeDecreaseProfile: SpellProcedureProfile<
  "creatureSizeDecrease",
  CreatureSizeChangeInvocation
> = {
  ...creatureSizeChangeProfile,
  procedure: "creatureSizeDecrease",
};
