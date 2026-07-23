import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
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
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { EffectAtom, OngoingEffect } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type CreatureSizeChangeSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../dispatcher.ts";
import { CombatantId } from "../../identity.ts";
import type {
  CreatureSizeDecreaseSpellProcedureExecution,
  CreatureSizeIncreaseSpellProcedureExecution,
} from "../../character-execution.ts";
import {
  activeEffectsWithCreatureSizeChangeReplaced,
  CREATURE_SIZE_CHANGE_DAMAGE_DICE,
  CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE,
  CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL,
  creatureSizeChangeProcedure,
} from "../creature-size-change-effects.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenInterruptWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "../spell-cast-interrupt-frame.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "../spell-condition-effects-helpers.ts";
import { spellSavingThrowOutcomeHole } from "../spells-damage-fills.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
import {
  spellCastingTimeResourceForSpellCast,
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
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  discoverExtendedSpellMetamagicSelections,
  extendedSpellDurationModifierForApplications,
} from "../metamagic-support.ts";

type CreatureSizeChangeInvocation = CreatureSizeChangeSpellInvocation;
type CreatureSizeIncreaseInvocation = CreatureSizeChangeInvocation & {
  readonly procedure: "creatureSizeIncrease";
};
type CreatureSizeDecreaseInvocation = CreatureSizeChangeInvocation & {
  readonly procedure: "creatureSizeDecrease";
};
type CreatureSizeChangeExecution =
  | CreatureSizeIncreaseSpellProcedureExecution
  | CreatureSizeDecreaseSpellProcedureExecution;

function admitCreatureSizeChange(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly CreatureSizeIncreaseInvocation[] {
  return admitCreatureSizeChangeForProcedure(
    spell,
    ctx,
    "creatureSizeIncrease",
  );
}

function admitCreatureSizeDecrease(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly CreatureSizeDecreaseInvocation[] {
  return admitCreatureSizeChangeForProcedure(
    spell,
    ctx,
    "creatureSizeDecrease",
  );
}

function admitCreatureSizeChangeForProcedure<
  Procedure extends CreatureSizeChangeInvocation["procedure"],
>(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
  procedure: Procedure,
): readonly (CreatureSizeChangeInvocation & {
  readonly procedure: Procedure;
})[] {
  const projections = creatureSizeChangeSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projections.length === 0) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap((slot) =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : projections
          .filter(
            (
              projection,
            ): projection is typeof projection & {
              readonly procedure: Procedure;
            } => projection.procedure === procedure,
          )
          .map((projection) => ({
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
  spell: BattleSpellAdmissionSource,
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
  _spell: BattleSpellAdmissionSource,
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
  invocation: BattleExecutableSpellInvocation<CreatureSizeChangeExecution>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  const castAct = {
    subject: {
      tag: "actionSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" as const },
    },
    initialHoles: [targetHole],
  };
  const metamagicCastActs = discoverExtendedSpellMetamagicSelections({
    actor: state.combatants.get(actorId),
    invocation,
  }).map((metamagic) => {
    return {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
        metamagic,
      },
      initialHoles: [targetHole],
    };
  });
  return [castAct, ...metamagicCastActs];
}

function resolveCreatureSizeChange(
  input: SpellProcedureProfileResolveInput<CreatureSizeChangeInvocation>,
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

  if (input.storedGlyphRelease === undefined) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: [target.combatantId],
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource: spellCastingTimeResourceForSpellCast({
          invocation: input.invocation,
          ...(input.actionCostOverride === undefined
            ? {}
            : { actionCostOverride: input.actionCostOverride }),
        }),
        ...spellCastMetamagicApplicationsInput(
          input.metamagicApplications ?? [],
        ),
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
        ...(input.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: input.actionCostOverride }),
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
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

  const concentrationBase =
    input.storedGlyphRelease !== undefined
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyCreatureSizeChangeEffect(
    concentrationBase,
    input.actorId,
    [target.combatantId],
    input.invocation,
    input.metamagicApplications,
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
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const state = creatureSizeChangeConcentrationWithMetamagic(
    resourced.state,
    input.actorId,
    input.metamagicApplications,
  );
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

function applyCreatureSizeChangeEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<CreatureSizeChangeExecution>,
  metamagicApplications:
    | readonly SpellMetamagicApplicationFact[]
    | undefined = undefined,
): BattleState {
  const activeEffect = creatureSizeChangeEffectWithMetamagic(
    invocation.activeEffect,
    metamagicApplications,
  );
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
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
            sourceProcedureRef: effect.sourceProcedureRef,
          },
        ),
      withReplacement.combatants,
    );
    return { ...withReplacement, combatants };
  }, state);
}

function creatureSizeChangeEffectWithMetamagic(
  activeEffect: CreatureSizeChangeInvocation["activeEffect"],
  metamagicApplications: readonly SpellMetamagicApplicationFact[] | undefined,
): CreatureSizeChangeInvocation["activeEffect"] {
  const durationModifier = extendedSpellDurationModifierForApplications(
    metamagicApplications,
  );
  if (durationModifier === null) {
    return activeEffect;
  }
  return durationModifier.kind === "concentrationDurationDoubledToCap"
    ? {
        ...activeEffect,
        expiresAt: {
          ...activeEffect.expiresAt,
          durationTicks: durationModifier.durationTicks,
        },
      }
    : {
        ...activeEffect,
        expiresAt: {
          ...activeEffect.expiresAt,
          durationTicks: durationModifier.durationTicks,
        },
      };
}

function creatureSizeChangeConcentrationWithMetamagic(
  state: BattleState,
  actorId: CombatantId,
  metamagicApplications: readonly SpellMetamagicApplicationFact[] | undefined,
): BattleState {
  const durationModifier = extendedSpellDurationModifierForApplications(
    metamagicApplications,
  );
  if (durationModifier?.kind !== "concentrationDurationDoubledToCap") {
    return state;
  }
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    actor.concentration === null ||
    actor.concentration.effectKind !== "spellEffect"
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      concentration: {
        ...actor.concentration,
        maintenanceSavingThrowRollMode:
          durationModifier.concentrationMaintenanceSavingThrowRollMode,
      },
    }),
  };
}

const CreatureSizeChangeExecutionSchemaFields = {
  access: PreparedSpellAccessSchema,
  resource: SpellSlotInvocationResourceSchema,
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
    kind: Schema.Literal("spellCreatureSizeChange"),
    sourceCombatantId: CombatantId,
    direction: Schema.Literal("increase", "decrease"),
    expiresAt: Schema.Struct({
      kind: Schema.Literal("concentration"),
      combatantId: CombatantId,
      durationTicks: ElapsedTimeTicksSchema,
    }),
  }),
  rangeFeet: MovementFeet,
} as const;
const CreatureSizeIncreaseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    ...CreatureSizeChangeExecutionSchemaFields,
    procedure: Schema.Literal("creatureSizeIncrease"),
  }),
);
const CreatureSizeDecreaseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    ...CreatureSizeChangeExecutionSchemaFields,
    procedure: Schema.Literal("creatureSizeDecrease"),
  }),
);
export const creatureSizeChangeProfile: SpellProcedureDeclaration<
  "creatureSizeIncrease",
  CreatureSizeIncreaseInvocation
> = {
  procedure: "creatureSizeIncrease",
  executionSchema: CreatureSizeIncreaseInvocationSchema,
  admit: admitCreatureSizeChange,
  discoverCastAct: discoverCreatureSizeChangeCastAct,
  resolve: resolveCreatureSizeChange,
};

export const creatureSizeDecreaseProfile: SpellProcedureDeclaration<
  "creatureSizeDecrease",
  CreatureSizeDecreaseInvocation
> = {
  procedure: "creatureSizeDecrease",
  executionSchema: CreatureSizeDecreaseInvocationSchema,
  admit: admitCreatureSizeDecrease,
  discoverCastAct: discoverCreatureSizeChangeCastAct,
  resolve: resolveCreatureSizeChange,
};
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
