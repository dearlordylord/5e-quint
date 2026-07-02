// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE
//
// The mistCloudForm Spell Procedure Profile: a prepared Magic Action spell
// that transforms willing touched creatures and their worn/carried objects into
// a Concentration-owned mist-cloud Spell Effect occurrence.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Gaseous Form": Action, Touch, Concentration up to
//     1 hour; a willing touched creature shape-shifts with worn and carried
//     objects into a misty cloud; the spell ends on that target at 0 Hit
//     Points, target Magic Action dismissal, or normal spell end.
//   - SRD 5.2.1 Spells "Duration": Concentration duration follows
//     Concentration rules.
//   - UBIQUITOUS_LANGUAGE.md: Spell Definition, Spell Invocation, Spell
//     Effect, Concentration, Duration, Magic Action, and Hit Points.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type SpellSlotLevel } from "@dnd/shared/types";
import type { EffectAtom, SpellRecord } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type BattleActiveEffect,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type MistCloudFormSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenInterruptWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "../spells-profile-shared.ts";
import {
  MIST_CLOUD_FORM_CAN_HOVER,
  MIST_CLOUD_FORM_CONDITION_IMMUNITIES,
  MIST_CLOUD_FORM_DAMAGE_RESISTANCES,
  MIST_CLOUD_FORM_FLY_SPEED_FEET,
  MIST_CLOUD_FORM_SAVING_THROW_ADVANTAGE,
} from "../mist-cloud-form-facts.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "../spell-condition-effects-helpers.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import {
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-targeting.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellProcedureInvocationSchema,
  type SpellAdmissionContext,
  type SpellProcedureProfile,
  type SpellProcedureProfileResolveInput,
  type SpellProcedureStoredGlyphReleaseOptions,
} from "./profile.ts";

type MistCloudFormInvocation = MistCloudFormSpellInvocation;
type MistCloudFormResolveInput = SpellProcedureProfileResolveInput<
  MistCloudFormInvocation,
  ActionSpellBattleResolutionInput
> &
  SpellProcedureStoredGlyphReleaseOptions;
type MistCloudFormEffect = MistCloudFormInvocation["activeEffect"];
type TransformTargetEffect = Extract<
  EffectAtom,
  { readonly kind: "transform_target" }
>;
type MistCloudFormShape = Extract<
  TransformTargetEffect["newForm"],
  { readonly kind: "spell_effect_mist_cloud" }
>;

function admitMistCloudForm(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly MistCloudFormInvocation[] {
  const projection = mistCloudFormSpellProjection(ctx.actor.combatantId, spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MistCloudFormInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const maxTargets = mistCloudFormTargetCount(spell, slot.spellLevel);
      return maxTargets === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "mistCloudForm",
              spell,
              actionCost: "magicAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets,
                requiredTargetDisposition: "willing",
              },
              ...projection,
            },
          ];
    },
  );
}

function mistCloudFormSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<MistCloudFormInvocation, "activeEffect" | "rangeFeet"> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const operation = spell.mechanics.operations[0];
  const effect = operation?.effect;
  if (
    attachment?.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    selection?.mode !== "choose_up_to" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    operation === undefined ||
    operation.trigger.kind !== "passive" ||
    effect === undefined ||
    effect.kind !== "transform_target" ||
    effect.newForm.kind !== "spell_effect_mist_cloud" ||
    !mistCloudFormMovementAndPassivesAreComplete(effect.newForm) ||
    effect.newForm.transformedObjects !== "worn_and_carried" ||
    !mistCloudFormRevertTriggersAreComplete(effect.revertTriggers)
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "spellMistCloudForm",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          transformedObjects: "wornAndCarried",
          earlyEnds: [
            { kind: "targetDropsToZeroHitPoints" },
            { kind: "targetMagicActionDismissal" },
            { kind: "spellEnds" },
          ],
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.right,
          },
        },
      };
}

function mistCloudFormMovementAndPassivesAreComplete(
  form: MistCloudFormShape,
): boolean {
  return (
    form.movement.kind === "replace_all_movement_methods" &&
    form.movement.speedKind === "fly" &&
    form.movement.feet === Number(MIST_CLOUD_FORM_FLY_SPEED_FEET) &&
    form.movement.hover === MIST_CLOUD_FORM_CAN_HOVER &&
    sameStringSet(
      form.passive.damageResistances,
      MIST_CLOUD_FORM_DAMAGE_RESISTANCES,
    ) &&
    sameStringSet(
      form.passive.conditionImmunities,
      MIST_CLOUD_FORM_CONDITION_IMMUNITIES,
    ) &&
    sameStringSet(
      form.passive.savingThrowAdvantage,
      MIST_CLOUD_FORM_SAVING_THROW_ADVANTAGE,
    )
  );
}

function mistCloudFormRevertTriggersAreComplete(
  triggers: TransformTargetEffect["revertTriggers"],
): boolean {
  return (
    triggers.length === 3 &&
    triggers.some((trigger) => trigger.kind === "zero_hp") &&
    triggers.some(
      (trigger) =>
        trigger.kind === "dismissed_by_target" &&
        trigger.action === "magic_action",
    ) &&
    triggers.some((trigger) => trigger.kind === "spell_ends")
  );
}

function mistCloudFormTargetCount(
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): number | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  if (attachment?.kind !== "hole" || attachment.value.kind !== "target") {
    return null;
  }
  return scalarBuffSpellTargetCount(
    attachment.value.selection,
    spell.mechanics.level,
    slotLevel,
  );
}

function discoverMistCloudFormCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: MistCloudFormInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell" as const,
            actorId,
            invocation: mistCloudFormInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: mistCloudFormCastSummary(invocation),
          initialHoles: [targetHole],
        },
      ];
}

function mistCloudFormInvocationRef(
  invocation: MistCloudFormInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "mistCloudForm",
  };
}

function mistCloudFormCastSummary(invocation: MistCloudFormInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveMistCloudForm(
  input: MistCloudFormResolveInput,
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
    input.fillSet.targetId !== undefined ||
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
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mist-cloud form spells use a willing target-list fill only.",
    );
  }

  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: input.fillSet.targetList.targetIds,
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

  const concentrationBase =
    input.startsOrdinaryConcentration === false
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyMistCloudFormEffect(
    concentrationBase,
    input.actorId,
    input.fillSet.targetList.targetIds,
    input.invocation,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
  }
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.startsOrdinaryConcentration === false
      ? { startConcentration: false }
      : {}),
  });
}

function applyMistCloudFormEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: MistCloudFormInvocation,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect: MistCloudFormEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const replacement = activeEffectsWithMistCloudFormReplaced(
      target.activeEffects,
      nextEffect,
    );
    const replacedMistCloudEffects = [
      ...replacement.displacedEffects,
      nextEffect,
    ];
    const activeEffects = [
      ...replacement.activeEffects.filter(
        (effect) =>
          !isMistCloudFormConditionImmunityEffectForSource(
            effect,
            replacedMistCloudEffects,
          ),
      ),
      ...mistCloudFormConditionImmunityEffects(target, nextEffect),
    ];
    const nextTarget = battleCreatureWithSpellActiveEffects(
      target,
      activeEffects,
    );
    const withReplacement = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
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

function mistCloudFormConditionImmunityEffects(
  target: BattleCreatureState,
  effect: MistCloudFormEffect,
): readonly BattleActiveEffect[] {
  return MIST_CLOUD_FORM_CONDITION_IMMUNITIES.map((condition) => ({
    kind: "conditionImmunity",
    sourceSpellId: effect.sourceSpellId,
    sourceCombatantId: effect.sourceCombatantId,
    condition,
    conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
      target,
      condition,
    ),
    expiresAt: effect.expiresAt,
  }));
}

function isMistCloudFormConditionImmunityEffectForSource(
  effect: BattleActiveEffect,
  mistCloudFormEffects: readonly MistCloudFormEffect[],
): boolean {
  return (
    effect.kind === "conditionImmunity" &&
    MIST_CLOUD_FORM_CONDITION_IMMUNITIES.some(
      (condition) => condition === effect.condition,
    ) &&
    mistCloudFormEffects.some(
      (mistCloudFormEffect) =>
        effect.sourceSpellId === mistCloudFormEffect.sourceSpellId &&
        effect.sourceCombatantId === mistCloudFormEffect.sourceCombatantId,
    )
  );
}

function activeEffectsWithMistCloudFormReplaced(
  activeEffects: readonly BattleActiveEffect[],
  nextEffect: MistCloudFormEffect,
): {
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly displacedEffects: readonly MistCloudFormEffect[];
} {
  const displacedEffects = activeEffects.filter(isMistCloudFormEffect);
  return {
    activeEffects: [
      ...activeEffects.filter((effect) => !isMistCloudFormEffect(effect)),
      nextEffect,
    ],
    displacedEffects,
  };
}

function isMistCloudFormEffect(
  effect: BattleActiveEffect,
): effect is MistCloudFormEffect {
  return effect.kind === "spellMistCloudForm";
}

const MistCloudFormInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "mistCloudForm" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("mistCloudForm"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);

export const mistCloudFormProfile: SpellProcedureProfile<
  "mistCloudForm",
  MistCloudFormInvocation
> = {
  procedure: "mistCloudForm",
  invocationSchema: MistCloudFormInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMistCloudForm,
  discoverCastAct: discoverMistCloudFormCastAct,
  castSummary: mistCloudFormCastSummary,
  invocationRef: mistCloudFormInvocationRef,
  resolve: resolveMistCloudForm,
};
