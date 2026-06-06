// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-effective-level-extra-target
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION

import {
  elapsedTimeTicks,
  elapsedTimeTicksFromTimeSpanDuration,
  ELAPSED_TIME_TICKS_PER_DAY,
  ELAPSED_TIME_TICKS_PER_MINUTE,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  movementFeet,
  resourceCount,
  spellSlotLevel,
  type MovementFeet,
  type ResourceCount,
} from "@dnd/shared/types";
import type { Attachment, TargetSelection } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  isTargetListSpellInvocation,
  type BattleCreatureState,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  BattleSubject,
  SpellMetamagicSelection,
} from "../battle-subjects.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "../character-battle-resources.ts";
import {
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_SPELL_DAMAGE_TYPES,
  type TransmutedSpellDamageType,
} from "./metamagic-transmuted-facts.ts";
import { targetCountBySlot } from "./spells-profile-shared.ts";

export const QUICKENED_METAMAGIC_EFFECT_KIND =
  "action_casting_time_to_bonus_action_with_spell_turn_limit" satisfies CharacterBattleMetamagicEffectKind;
export const CAREFUL_METAMAGIC_EFFECT_KIND =
  "saving_throw_protection" satisfies CharacterBattleMetamagicEffectKind;
export const HEIGHTENED_METAMAGIC_EFFECT_KIND =
  "saving_throw_disadvantage" satisfies CharacterBattleMetamagicEffectKind;
export const DISTANT_METAMAGIC_EFFECT_KIND =
  "spell_range_increase" satisfies CharacterBattleMetamagicEffectKind;
export const EXTENDED_METAMAGIC_EFFECT_KIND =
  "duration_extension_and_concentration_save_advantage" satisfies CharacterBattleMetamagicEffectKind;
export const SUBTLE_METAMAGIC_EFFECT_KIND =
  "component_suppression" satisfies CharacterBattleMetamagicEffectKind;
export const TWINNED_METAMAGIC_EFFECT_KIND =
  "effective_spell_level_increase_for_extra_target" satisfies CharacterBattleMetamagicEffectKind;
export const EMPOWERED_METAMAGIC_EFFECT_KIND =
  "damage_dice_reroll" satisfies CharacterBattleMetamagicEffectKind;
export const SEEKING_METAMAGIC_EFFECT_KIND =
  "missed_spell_attack_reroll" satisfies CharacterBattleMetamagicEffectKind;

export const QUICKENED_SPELL_METAMAGIC_SELECTION = [
  { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
] as const satisfies readonly [SpellMetamagicSelection];
export const TWINNED_SPELL_METAMAGIC_SELECTION = [
  { effectKind: TWINNED_METAMAGIC_EFFECT_KIND },
] as const satisfies readonly [SpellMetamagicSelection];
export const EXTENDED_SPELL_METAMAGIC_SELECTION = [
  { effectKind: EXTENDED_METAMAGIC_EFFECT_KIND },
] as const satisfies readonly [SpellMetamagicSelection];

export { TRANSMUTED_METAMAGIC_EFFECT_KIND } from "./metamagic-transmuted-facts.ts";
export type { TransmutedSpellDamageType } from "./metamagic-transmuted-facts.ts";

export type TransmutedSpellApplicationFact = Omit<
  CharacterBattleMetamagicOptionFact,
  "effectKind"
> & {
  readonly effectKind: typeof TRANSMUTED_METAMAGIC_EFFECT_KIND;
  readonly targetDamageType: TransmutedSpellDamageType;
};

export type DistantSpellRangeModifierFact =
  | {
      readonly kind: "doubleDistanceRange";
      readonly rangeFeet: MovementFeet;
    }
  | {
      readonly kind: "touchToDistanceRange";
      readonly rangeFeet: MovementFeet;
    };

export type DistantSpellApplicationFact = Omit<
  CharacterBattleMetamagicOptionFact,
  "effectKind"
> & {
  readonly effectKind: typeof DISTANT_METAMAGIC_EFFECT_KIND;
  readonly rangeModifier: DistantSpellRangeModifierFact;
};

export type ExtendedConcentrationSavingThrowRollMode = Extract<
  AttackRollMode,
  "advantage"
>;

export type ExtendedSpellDurationModifierFact =
  | {
      readonly kind: "timedDurationDoubledToCap";
      readonly durationTicks: ElapsedTimeTicks;
    }
  | {
      readonly kind: "concentrationDurationDoubledToCap";
      readonly durationTicks: ElapsedTimeTicks;
      readonly concentrationMaintenanceSavingThrowRollMode: ExtendedConcentrationSavingThrowRollMode;
    };

export type ExtendedSpellApplicationFact = Omit<
  CharacterBattleMetamagicOptionFact,
  "effectKind"
> & {
  readonly effectKind: typeof EXTENDED_METAMAGIC_EFFECT_KIND;
  readonly durationModifier: ExtendedSpellDurationModifierFact;
};

export type SpellMetamagicApplicationFactWithoutSelectionPayload =
  CharacterBattleMetamagicOptionFact & {
    readonly effectKind: Exclude<
      CharacterBattleMetamagicEffectKind,
      | typeof TRANSMUTED_METAMAGIC_EFFECT_KIND
      | typeof DISTANT_METAMAGIC_EFFECT_KIND
      | typeof EXTENDED_METAMAGIC_EFFECT_KIND
    >;
  };

export type SpellMetamagicApplicationFact =
  | DistantSpellApplicationFact
  | ExtendedSpellApplicationFact
  | SpellMetamagicApplicationFactWithoutSelectionPayload
  | TransmutedSpellApplicationFact;

type SpellMetamagicSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
>;

export function metamagicApplicationsIncludeQuickened(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): boolean {
  return applications.some(
    (application) => application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
}

export function transmutedSpellDamageTypeChoices(
  invocation: SupportedSpellInvocation,
): readonly TransmutedSpellDamageType[] {
  const sourceDamageType = transmutableSpellInvocationDamageType(invocation);
  return sourceDamageType === null
    ? []
    : TRANSMUTED_SPELL_DAMAGE_TYPES.filter(
        (damageType) => damageType !== sourceDamageType,
      );
}

export function discoverTransmutedSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const transmuted = input.actor.origin.metamagic.knownOptions.find(
    (application) =>
      application.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
  );
  if (transmuted === undefined) {
    return [];
  }
  if (
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [transmuted],
    }) !== null
  ) {
    return [];
  }
  return transmutedSpellDamageTypeChoices(input.invocation).map(
    (targetDamageType) =>
      [
        {
          effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
          targetDamageType,
        },
      ] as const,
  );
}

export function discoverTwinnedSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const twinned = input.actor.origin.metamagic.knownOptions.find(
    (application) => application.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
  );
  if (twinned === undefined) {
    return [];
  }
  if (
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [twinned],
    }) !== null
  ) {
    return [];
  }
  return twinnedSpellTargetCountInvocation(input.invocation, [twinned]) ===
    input.invocation
    ? []
    : [TWINNED_SPELL_METAMAGIC_SELECTION];
}

export function discoverDistantSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor?.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const distant = input.actor.origin.metamagic.knownOptions.find(
    (application) => application.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
  );
  if (distant === undefined) {
    return [];
  }
  if (
    !distantSpellProcedureSupportsRangeProjection(input.invocation) ||
    distantSpellRangeModifierFact(input.invocation) === null ||
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [distant],
    }) !== null
  ) {
    return [];
  }
  return [[{ effectKind: DISTANT_METAMAGIC_EFFECT_KIND }]];
}

export function discoverExtendedSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor?.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const extended = input.actor.origin.metamagic.knownOptions.find(
    (application) => application.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
  );
  if (extended === undefined) {
    return [];
  }
  if (
    !extendedSpellProcedureSupportsDurationProjection(input.invocation) ||
    extendedSpellDurationModifierFact(input.invocation) === null ||
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [extended],
    }) !== null
  ) {
    return [];
  }
  return [EXTENDED_SPELL_METAMAGIC_SELECTION];
}

export function metamagicActionCostOverride(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): "bonusAction" | undefined {
  return metamagicApplicationsIncludeQuickened(applications)
    ? "bonusAction"
    : undefined;
}

export function discoverSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  return input.actor.origin.metamagic.knownOptions.flatMap((application) => {
    if (
      application.effectKind !== CAREFUL_METAMAGIC_EFFECT_KIND &&
      application.effectKind !== HEIGHTENED_METAMAGIC_EFFECT_KIND
    ) {
      return [];
    }
    if (
      saveMetamagicSupportIssue({
        effectKinds: new Set([application.effectKind]),
        invocation: input.invocation,
        subject: {
          tag: "actionSpell",
          mode: { tag: "cast" },
        },
      }) !== null
    ) {
      return [];
    }
    return metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [application],
    }) === null
      ? [[{ effectKind: application.effectKind }]]
      : [];
  });
}

export function spellMetamagicApplications(
  actor: BattleCreatureState,
  metamagic: readonly Pick<SpellMetamagicSelection, "effectKind">[],
): readonly SpellMetamagicApplicationFactWithoutSelectionPayload[] {
  if (
    actor.origin.kind !== "character" ||
    actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const knownOptions = actor.origin.metamagic.knownOptions;
  return metamagic.flatMap((selection) =>
    knownOptions.filter(
      (
        option,
      ): option is SpellMetamagicApplicationFactWithoutSelectionPayload =>
        option.effectKind === selection.effectKind &&
        isSpellMetamagicApplicationFactWithoutSelectionPayload(option),
    ),
  );
}

export function spellMetamagicLabel(
  metamagic: readonly Pick<SpellMetamagicSelection, "effectKind">[],
): string {
  return metamagic[0]?.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND
    ? "Careful Spell"
    : metamagic[0]?.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND
      ? "Heightened Spell"
      : metamagic[0]?.effectKind === TWINNED_METAMAGIC_EFFECT_KIND
        ? "Twinned Spell"
        : metamagic[0]?.effectKind === DISTANT_METAMAGIC_EFFECT_KIND
          ? "Distant Spell"
          : metamagic[0]?.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND
            ? "Extended Spell"
            : "Quickened Spell";
}

export function transmutedSpellMetamagicLabel(
  metamagic: readonly SpellMetamagicSelection[],
): string {
  const targetDamageType = transmutedSpellSelectionTargetDamageType(metamagic);
  return targetDamageType === undefined
    ? "Transmuted Spell"
    : `Transmuted Spell (${targetDamageType})`;
}

export function transmutedSpellSelectionTargetDamageType(
  metamagic: readonly SpellMetamagicSelection[],
): TransmutedSpellDamageType | undefined {
  const selection = metamagic.find(
    (
      candidate,
    ): candidate is Extract<
      SpellMetamagicSelection,
      { readonly effectKind: typeof TRANSMUTED_METAMAGIC_EFFECT_KIND }
    > => candidate.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
  );
  return isTransmutedSpellDamageType(selection?.targetDamageType)
    ? selection.targetDamageType
    : undefined;
}

export function saveMetamagicSupportIssue(input: {
  readonly effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  const saveMetamagicOnly =
    input.effectKinds.size > 0 &&
    [...input.effectKinds].every(
      (effectKind) =>
        effectKind === CAREFUL_METAMAGIC_EFFECT_KIND ||
        effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    );
  if (!saveMetamagicOnly) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Save-affecting Metamagic is supported only for action-time spell casts.";
  }
  if (input.invocation.procedure === "sleepTargetAdmission") {
    return "Save-affecting Metamagic is not supported for Sleep target admission because Sleep uses a two-stage admission and repeat-save lifecycle.";
  }
  if (
    input.effectKinds.has(HEIGHTENED_METAMAGIC_EFFECT_KIND) &&
    spellInvocationHasRepeatSavingThrowLifecycle(input.invocation)
  ) {
    return "Heightened Spell is not supported for spell procedures with repeat Saving Throws until the selected target is carried through later save holes.";
  }
  if (!spellInvocationSupportsSaveMetamagic(input.invocation)) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  return null;
}

export function metamagicSorceryPointSpendIssue(input: {
  readonly actor: BattleCreatureState;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): string | null {
  if (input.actor.origin.kind !== "character") {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const resource = input.actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return "Metamagic requires its shared Sorcery Point resource.";
  }
  return Number(resource.pointsRemaining) >=
    Number(metamagicSorceryPointCost(input.applications))
    ? null
    : "Metamagic requires enough unexpended Sorcery Points.";
}

export function metamagicSorceryPointCost(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): ResourceCount {
  return resourceCount(
    applications.reduce(
      (total, application) => total + Number(application.sorceryPointCost),
      0,
    ),
  );
}

function spellInvocationSupportsSaveMetamagic(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedConditionImmunity" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine"
  );
}

function spellInvocationHasRepeatSavingThrowLifecycle(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine" ||
    (invocation.procedure === "saveGatedCondition" &&
      invocation.effect.repeatSave !== null)
  );
}

export function transmutedSpellDamageTypeSubstitutionIssue(input: {
  readonly applications: readonly SpellMetamagicApplicationFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  if (
    !input.applications.every(
      (application) =>
        application.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Transmuted Spell is supported only for action-time spell casts.";
  }
  const targetDamageType = transmutedSpellApplicationTargetDamageType(
    input.applications,
  );
  if (targetDamageType === undefined) {
    return "Transmuted Spell requires one selected replacement damage type.";
  }
  const sourceDamageType = transmutableSpellInvocationDamageType(
    input.invocation,
  );
  if (sourceDamageType === null) {
    return "Transmuted Spell is supported only for spell damage procedures with Acid, Cold, Fire, Lightning, Poison, or Thunder damage.";
  }
  return sourceDamageType === targetDamageType
    ? "Transmuted Spell must change the source damage type to one of the other listed damage types."
    : null;
}

export function distantSpellRangeProjectionIssue(input: {
  readonly applications: readonly SpellMetamagicApplicationFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  if (
    !input.applications.every(
      (application) => application.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Distant Spell is supported only for action-time spell casts.";
  }
  if (!distantSpellProcedureSupportsRangeProjection(input.invocation)) {
    return "Distant Spell is supported only for spell target procedures that consume a cast-local range fact.";
  }
  return distantSpellRangeModifierFact(input.invocation) === null
    ? "Distant Spell is supported only for spell procedures with a Touch range or a distance range of at least 5 feet."
    : null;
}

export function distantSpellRangeModifierFact(
  invocation: SupportedSpellInvocation,
): DistantSpellRangeModifierFact | null {
  const range = invocation.spell.mechanics.range;
  if (range.kind === "touch") {
    return {
      kind: "touchToDistanceRange",
      rangeFeet: movementFeet(30),
    };
  }
  if (
    range.kind !== "point" ||
    typeof range.feet !== "number" ||
    range.feet < 5
  ) {
    return null;
  }
  return {
    kind: "doubleDistanceRange",
    rangeFeet: movementFeet(range.feet * 2),
  };
}

export function distantSpellRangeModifierForApplications(
  applications: readonly SpellMetamagicApplicationFact[] | undefined,
): DistantSpellRangeModifierFact | null {
  return (
    applications?.find(
      (application): application is DistantSpellApplicationFact =>
        application.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
    )?.rangeModifier ?? null
  );
}

function distantSpellProcedureSupportsRangeProjection(
  invocation: SupportedSpellInvocation,
): boolean {
  return invocation.procedure === "objectLight";
}

export function extendedSpellDurationProjectionIssue(input: {
  readonly applications: readonly SpellMetamagicApplicationFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  if (
    !input.applications.every(
      (application) =>
        application.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Extended Spell is supported only for action-time spell casts.";
  }
  if (!extendedSpellProcedureSupportsDurationProjection(input.invocation)) {
    return "Extended Spell is supported only for promoted duration-bearing spell procedures that consume a cast-local duration fact.";
  }
  return extendedSpellDurationModifierFact(input.invocation) === null
    ? "Extended Spell is supported only for spells with a timed or Concentration duration of at least 1 minute."
    : null;
}

export function extendedSpellDurationModifierFact(
  invocation: SupportedSpellInvocation,
): ExtendedSpellDurationModifierFact | null {
  const duration = invocation.spell.mechanics.duration;
  const baseDuration =
    duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(duration.value)
      : duration.kind === "concentration"
        ? elapsedTimeTicksFromTimeSpanDuration(duration.upTo)
        : null;
  if (baseDuration === null || Either.isLeft(baseDuration)) {
    return null;
  }
  if (Number(baseDuration.right) < ELAPSED_TIME_TICKS_PER_MINUTE) {
    return null;
  }
  const durationTicks = elapsedTimeTicks(
    Math.min(Number(baseDuration.right) * 2, ELAPSED_TIME_TICKS_PER_DAY),
  );
  return duration.kind === "concentration"
    ? {
        kind: "concentrationDurationDoubledToCap",
        durationTicks,
        concentrationMaintenanceSavingThrowRollMode: "advantage",
      }
    : {
        kind: "timedDurationDoubledToCap",
        durationTicks,
      };
}

export function extendedSpellDurationModifierForApplications(
  applications: readonly SpellMetamagicApplicationFact[] | undefined,
): ExtendedSpellDurationModifierFact | null {
  return (
    applications?.find(
      (application): application is ExtendedSpellApplicationFact =>
        application.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
    )?.durationModifier ?? null
  );
}

function extendedSpellProcedureSupportsDurationProjection(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "creatureSizeIncrease" ||
    invocation.procedure === "creatureSizeDecrease"
  );
}

export function twinnedSpellTargetCountProjectionIssue(input: {
  readonly applications: readonly SpellMetamagicApplicationFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "mode">;
}): string | null {
  if (
    !input.applications.every(
      (application) => application.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (input.subject.mode.tag !== "cast") {
    return "Twinned Spell is supported only while casting a spell.";
  }
  return twinnedSpellTargetCountInvocation(
    input.invocation,
    input.applications,
  ) === input.invocation
    ? "Twinned Spell is supported only for Spell Slot casts whose target-count profile adds exactly one creature at the next effective spell level."
    : null;
}

export function twinnedSpellTargetCountInvocation(
  invocation: SupportedSpellInvocation,
  applications: readonly CharacterBattleMetamagicOptionFact[] | undefined,
): SupportedSpellInvocation {
  if (
    applications === undefined ||
    !applications.some(
      (application) => application.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return invocation;
  }
  if (!isTargetListSpellInvocation(invocation)) {
    return invocation;
  }
  const maxTargets = twinnedSpellEffectiveTargetCount(invocation);
  if (maxTargets === null) {
    return invocation;
  }
  // `isTargetListSpellInvocation` establishes that this invocation is one of
  // the target-list union members. Replacing only the numeric maxTargets keeps
  // the procedure/targeting pairing intact, but object spread loses that union
  // correlation, so the assertion restates the locally proven union member.
  return {
    ...invocation,
    targeting: {
      ...invocation.targeting,
      maxTargets,
    },
  } as SupportedSpellInvocation;
}

export function transmutedSpellDamageInvocation<
  I extends SupportedSpellInvocation,
>(
  invocation: I,
  applications: readonly SpellMetamagicApplicationFact[] | undefined,
): I {
  const targetDamageType =
    applications === undefined
      ? undefined
      : transmutedSpellApplicationTargetDamageType(applications);
  if (targetDamageType === undefined) {
    return invocation;
  }
  if (
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "spellAttackSequence"
  ) {
    // TypeScript cannot preserve the exact generic invocation subtype through
    // this nested spread. The procedure guard establishes the shape, and the
    // spread changes only the supported damage type field.
    return {
      ...invocation,
      damage: { ...invocation.damage, damageType: targetDamageType },
    } as I;
  }
  if (
    invocation.procedure === "spellAttackDamage" &&
    (invocation.damage.kind === "fixedSpellAttackDamage" ||
      invocation.damage.kind === "selectedSorcerousBurstDamage")
  ) {
    // TypeScript cannot preserve the exact generic invocation subtype through
    // this nested spread. The procedure and damage-kind guards establish the
    // shape, and the spread changes only the supported damage type field.
    return {
      ...invocation,
      damage: { ...invocation.damage, damageType: targetDamageType },
    } as I;
  }
  return invocation;
}

function transmutableSpellInvocationDamageType(
  invocation: SupportedSpellInvocation,
): TransmutedSpellDamageType | null {
  if (
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "spellAttackSequence"
  ) {
    return isTransmutedSpellDamageType(invocation.damage.damageType)
      ? invocation.damage.damageType
      : null;
  }
  if (
    invocation.procedure === "spellAttackDamage" &&
    (invocation.damage.kind === "fixedSpellAttackDamage" ||
      invocation.damage.kind === "selectedSorcerousBurstDamage") &&
    isTransmutedSpellDamageType(invocation.damage.damageType)
  ) {
    return invocation.damage.damageType;
  }
  return null;
}

function transmutedSpellApplicationTargetDamageType(
  applications: readonly SpellMetamagicApplicationFact[],
): TransmutedSpellDamageType | undefined {
  const application = applications.find(
    (candidate): candidate is TransmutedSpellApplicationFact =>
      candidate.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
  );
  return application?.targetDamageType;
}

export function isSpellMetamagicApplicationFactWithoutSelectionPayload(
  application: CharacterBattleMetamagicOptionFact,
): application is SpellMetamagicApplicationFactWithoutSelectionPayload {
  return (
    application.effectKind !== TRANSMUTED_METAMAGIC_EFFECT_KIND &&
    application.effectKind !== DISTANT_METAMAGIC_EFFECT_KIND &&
    application.effectKind !== EXTENDED_METAMAGIC_EFFECT_KIND
  );
}

function isTransmutedSpellDamageType(
  damageType: unknown,
): damageType is TransmutedSpellDamageType {
  if (typeof damageType !== "string") {
    return false;
  }
  return TRANSMUTED_SPELL_DAMAGE_TYPES.some(
    (candidate) => candidate === damageType,
  );
}

function twinnedSpellEffectiveTargetCount(
  invocation: SupportedSpellInvocation,
): number | null {
  if (
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) >= 9 ||
    !("targeting" in invocation) ||
    invocation.targeting.kind !== "targetList" ||
    typeof invocation.targeting.maxTargets !== "number"
  ) {
    return null;
  }
  const selection = spellTwinnedTargetSelection(invocation.spell);
  if (selection === null) {
    return null;
  }
  const countByEffectiveLevel = targetCountBySlot(
    selection,
    invocation.spell.mechanics.level,
  );
  if (countByEffectiveLevel === null) {
    return null;
  }
  const currentCount = countByEffectiveLevel(invocation.resource.slotLevel);
  const nextEffectiveLevel = spellSlotLevel(
    Number(invocation.resource.slotLevel) + 1,
  );
  const nextCount = countByEffectiveLevel(nextEffectiveLevel);
  return currentCount === invocation.targeting.maxTargets &&
    nextCount === currentCount + 1
    ? nextCount
    : null;
}

function spellTwinnedTargetSelection(
  spell: SupportedSpellInvocation["spell"],
): TargetSelection | null {
  const selections = spellTargetSelections(spell).filter((selection) => {
    if (!("count" in selection)) {
      return false;
    }
    const count = selection.count;
    const baseLevel =
      typeof count === "object" && count !== null && "baseLevel" in count
        ? (count.baseLevel ?? spell.mechanics.level)
        : undefined;
    return (
      selection.mode === "choose_up_to" &&
      !targetSelectionAllowsRepeatedTargets(selection) &&
      targetSelectionTargetsOnlyCreatures(selection) &&
      typeof count === "object" &&
      count !== null &&
      count.kind === "linear" &&
      count.perSlotAboveBase === 1 &&
      baseLevel === spell.mechanics.level
    );
  });
  return selections.length === 1 ? selections[0]! : null;
}

function spellTargetSelections(
  spell: SupportedSpellInvocation["spell"],
): readonly TargetSelection[] {
  if (spell.mechanics.family === "ongoing_effect") {
    const selection = targetSelectionFromAttachment(spell.mechanics.attachment);
    return selection === null ? [] : [selection];
  }
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  return spell.mechanics.phases.flatMap((phase) => {
    if (!("attachment" in phase)) {
      return [];
    }
    const selection = targetSelectionFromAttachment(phase.attachment);
    return selection === null ? [] : [selection];
  });
}

function targetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  return attachment.kind === "hole" && attachment.value.kind === "target"
    ? attachment.value.selection
    : null;
}

function targetSelectionAllowsRepeatedTargets(
  selection: TargetSelection,
): boolean {
  return "repeatsAllowed" in selection && selection.repeatsAllowed === true;
}

function targetSelectionTargetsOnlyCreatures(
  selection: TargetSelection,
): boolean {
  return (
    selection.targetKinds !== undefined &&
    selection.targetKinds.length === 1 &&
    selection.targetKinds[0] === "creature"
  );
}
