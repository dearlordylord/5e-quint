import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
//
// The selfTransformationMode Spell Procedure Profile: a prepared Magic Action
// spell that lets the caster choose and later replace one active self
// transformation mode.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Alter Self": Action, Self, Concentration up to 1 hour;
//     choose Aquatic Adaptation, Change Appearance, or Natural Weapons; replace
//     the chosen option with a Magic action during the duration.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Spell Invocation, Spell Effect, Speed, Damage Type, and Unarmed Strike.

import {
  attackBonus,
  AbilityModifier,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  DamageType,
  Duration,
  EffectAtom,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type SelfTransformationModeEffectPayload,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { type SelfTransformationModeKind } from "../domain-constants.ts";
import { CombatantId } from "../../identity.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { SELF_TRANSFORMATION_MODE_KINDS } from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { applySelfTransformationModeEffect } from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { selfTransformationModeChoiceHole } from "../spells-targeting.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AttackBonus,
  DamageDieSizeSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type SelfTransformationModeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "selfTransformationMode" }
>;
type SelfTransformationModeResolveInput =
  SpellProcedureProfileResolveInput<SelfTransformationModeInvocation>;

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type SpellActivationPhase = ActivationSpellMechanics["phases"][number];
type DirectActivationPhase = Extract<
  SpellActivationPhase,
  { readonly kind: "direct" }
>;
type CastTimeEffectModeChoice = NonNullable<DirectActivationPhase["mode"]>;
type CastTimeEffectModeOption = CastTimeEffectModeChoice["options"][number];
type SelfTransformationDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly amount: SelfTransformationDurationHours;
    readonly unit: "hour";
  };
};
type SelfTransformationFacts =
  SpellMechanicsAdmissionSource["spellDefinitionRuleFacts"] & {
    readonly level: 2;
    readonly duration: SelfTransformationDuration;
    readonly modeChoices: typeof SELF_TRANSFORMATION_MODE_KINDS;
    readonly naturalWeaponDamage: SelfTransformationNaturalWeaponDamage;
  };

const SELF_TRANSFORMATION_SPELL_LEVEL = 2 satisfies SpellLevel;
const SELF_TRANSFORMATION_DURATION_HOURS_VALUE = 1;
type SelfTransformationDurationHours = PositiveInteger &
  typeof SELF_TRANSFORMATION_DURATION_HOURS_VALUE;
const SELF_TRANSFORMATION_DURATION_HOURS = PositiveInteger(
  SELF_TRANSFORMATION_DURATION_HOURS_VALUE,
);
const SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DICE = 1;
const SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DIE_SIZE = 6;
const SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES = [
  "slashing",
  "piercing",
  "bludgeoning",
] as const satisfies ReadonlyNonEmptyArray<DamageType>;
const SELF_TRANSFORMATION_NATURAL_WEAPON_GROWTH_TYPE_COUNTS = {
  slashing: 1,
  piercing: 2,
  bludgeoning: 1,
} as const satisfies Record<
  (typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES)[number],
  number
>;
type SelfTransformationNaturalWeaponDamage = {
  readonly dice: typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DICE;
  readonly dieSize: typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DIE_SIZE;
  readonly damageTypeChoices: typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for SelfTransformationFailedFact.
const SELF_TRANSFORMATION_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "phaseCount",
  "phase",
  "attachment",
  "modeChoice",
  "modeSwitch",
  "modeCount",
  "aquaticAdaptation",
  "changeAppearance",
  "naturalWeapons",
  "naturalWeaponDamageTypes",
] as const;
type SelfTransformationFailedFact =
  (typeof SELF_TRANSFORMATION_FAILED_FACTS)[number];
type SelfTransformationIssue = SpellProcedureAdmissionIssue<
  "selfTransformationMode",
  SelfTransformationFailedFact,
  UnitMechanicsPath
>;
type SelfTransformationIssueCoordinate = Pick<
  SelfTransformationIssue,
  "failedFact" | "mechanicsPath"
>;

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const;
const RANGE_FIELDS = ["kind"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const DURATION_FIELDS = ["kind", "upTo"] as const;
const DURATION_VALUE_FIELDS = ["amount", "unit"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const PHASE_FIELDS = ["kind", "attachment", "mode"] as const;
const ATTACHMENT_FIELDS = ["kind"] as const;
const MODE_CHOICE_FIELDS = [
  "allowsMidDurationSwitchAs",
  "label",
  "options",
] as const;
const MODE_OPTION_FIELDS = ["id", "displayName", "effects"] as const;

function selfTransformationIssue(
  failedFact: SelfTransformationFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SelfTransformationIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "selfTransformationMode",
    failedFact,
    mechanicsPath,
    message: `Unsupported selfTransformationMode mechanics fact: ${failedFact}.`,
  };
}

function selfTransformationIssueCoordinate(
  failedFact: SelfTransformationFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SelfTransformationIssueCoordinate {
  return { failedFact, mechanicsPath };
}

function selfTransformationIssueWhen(
  unsupported: boolean,
  failedFact: SelfTransformationFailedFact,
  mechanicsPath: UnitMechanicsPath,
): readonly SelfTransformationIssueCoordinate[] {
  return unsupported
    ? [selfTransformationIssueCoordinate(failedFact, mechanicsPath)]
    : [];
}

function selfTransformationPhaseSelection(
  mechanics: ActivationSpellMechanics,
): {
  readonly phase: DirectActivationPhase | undefined;
  readonly ordinal: PositiveInteger;
} {
  const strongestRecognizableModalIndex = mechanics.phases.reduce<{
    readonly index: number;
    readonly score: number;
  } | null>((strongest, phase, index) => {
    if (phase.kind !== "direct" || phase.mode === undefined) return strongest;
    const score = selfTransformationModalWitnessCount(phase, phase.mode);
    return strongest === null || score > strongest.score
      ? { index, score }
      : strongest;
  }, null);
  const recognizableModalIndex =
    strongestRecognizableModalIndex !== null &&
    strongestRecognizableModalIndex.score >= 2
      ? strongestRecognizableModalIndex.index
      : -1;
  const modalDirectIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "direct" && phase.mode !== undefined,
  );
  const directIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "direct",
  );
  const selectedIndex =
    recognizableModalIndex >= 0
      ? recognizableModalIndex
      : modalDirectIndex >= 0
        ? modalDirectIndex
        : directIndex >= 0
          ? directIndex
          : 0;
  const selected = mechanics.phases[selectedIndex];
  return {
    phase: selected?.kind === "direct" ? selected : undefined,
    ordinal: PositiveInteger(selectedIndex + 1),
  };
}

function selfTransformationModalWitnessCount(
  phase: DirectActivationPhase,
  mode: CastTimeEffectModeChoice,
): number {
  return [
    phase.attachment.kind === "self",
    mode.allowsMidDurationSwitchAs === "magic_action",
    mode.options.some(isAquaticAdaptationCandidate) ||
      mode.options.some(isNaturalWeaponsCandidate),
  ].filter(Boolean).length;
}

function selfTransformationRepresentation(
  mechanics: SpellMechanics,
): mechanics is ActivationSpellMechanics {
  return Match.value(mechanics).pipe(
    Match.when(
      { family: "activation" },
      selfTransformationActivationIsRepresented,
    ),
    Match.whenOr(
      { family: "ongoing_effect" },
      { family: "modal_ongoing_effect" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function selfTransformationActivationIsRepresented(
  activation: ActivationSpellMechanics,
): boolean {
  const { phase } = selfTransformationPhaseSelection(activation);
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "spellEnvelope",
        present: selfTransformationSpellEnvelopeIsRepresented(activation),
      },
      {
        name: "phaseEnvelope",
        present: selfTransformationPhaseEnvelopeIsRepresented(phase),
      },
      {
        name: "modeContract",
        present: selfTransformationModeContractIsRepresented(phase?.mode),
      },
    ],
  });
}

function selfTransformationSpellEnvelopeIsRepresented(
  activation: ActivationSpellMechanics,
): boolean {
  return (
    activation.level === SELF_TRANSFORMATION_SPELL_LEVEL &&
    activation.school === "transmutation" &&
    activation.castingTime.kind === "action" &&
    activation.range.kind === "self" &&
    activation.duration.kind === "concentration"
  );
}

function selfTransformationPhaseEnvelopeIsRepresented(
  phase: DirectActivationPhase | undefined,
): boolean {
  return phase?.kind === "direct" && phase.attachment.kind === "self";
}

function selfTransformationModeContractIsRepresented(
  mode: CastTimeEffectModeChoice | undefined,
): boolean {
  return (
    mode !== undefined &&
    (mode.allowsMidDurationSwitchAs === "magic_action" ||
      mode.options.some(isAquaticAdaptationCandidate) ||
      mode.options.some(isNaturalWeaponsCandidate))
  );
}

function selfTransformationDuration(
  duration: Duration,
): SelfTransformationDuration | undefined {
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    !isSelfTransformationDurationHours(duration.upTo.amount) ||
    duration.upTo.unit !== "hour"
  )
    return undefined;
  return {
    kind: "concentration",
    upTo: {
      amount: duration.upTo.amount,
      unit: "hour",
    },
  };
}

function isSelfTransformationDurationHours(
  amount: PositiveInteger,
): amount is SelfTransformationDurationHours {
  return amount === SELF_TRANSFORMATION_DURATION_HOURS;
}

function selfTransformationEvidence(
  mechanics: ActivationSpellMechanics,
  phaseOrdinal: PositiveInteger,
): SpellProcedureMechanicsEvidence {
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      ...spellDurationEvidencePaths(mechanics.duration),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
      spellActivationPhasePath(phaseOrdinal),
      spellActivationAttachmentPath(phaseOrdinal),
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ],
    unowned: [],
  };
}

function optionHasOnlyFields(option: CastTimeEffectModeOption): boolean {
  return spellMechanicsObjectHasOnlyKeys(option, MODE_OPTION_FIELDS);
}

function effectsAreAquaticAdaptation(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): boolean {
  if (effects?.length !== 2) return false;
  return (
    selfTransformationHasOneWaterBreathingEffect(effects) &&
    selfTransformationHasSupportedSwimSpeedEffect(effects)
  );
}

function selfTransformationHasOneWaterBreathingEffect(
  effects: NonNullable<CastTimeEffectModeOption["effects"]>,
): boolean {
  const breathing = effects.filter(
    (effect) => effect.kind === "water_breathing",
  );
  return (
    breathing.length === 1 &&
    spellMechanicsObjectHasOnlyKeys(breathing[0], ["kind"])
  );
}

function selfTransformationHasSupportedSwimSpeedEffect(
  effects: NonNullable<CastTimeEffectModeOption["effects"]>,
): boolean {
  const speeds = effects.filter((effect) => effect.kind === "grant_speed");
  const speed = speeds[0];
  if (speeds.length !== 1 || speed?.kind !== "grant_speed") return false;
  return (
    speed.speedKind === "swim" &&
    typeof speed.feet !== "number" &&
    speed.feet.kind === "walk_speed" &&
    spellMechanicsObjectHasOnlyKeys(speed, ["kind", "speedKind", "feet"]) &&
    spellMechanicsObjectHasOnlyKeys(speed.feet, ["kind"])
  );
}

function selfTransformationNaturalWeaponsEffect(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): Extract<EffectAtom, { readonly kind: "natural_weapons" }> | null {
  if (effects?.length !== 1) return null;
  const effect = effects[0];
  if (effect?.kind !== "natural_weapons") return null;
  return selfTransformationNaturalWeaponsEffectIsSupported(effect)
    ? effect
    : null;
}

function selfTransformationNaturalWeaponsEffectIsSupported(
  effect: Extract<EffectAtom, { readonly kind: "natural_weapons" }>,
): boolean {
  return (
    effect.damageDie === SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DIE_SIZE &&
    effect.replacesAbility === "str" &&
    effect.attackRollAbility === "spellcasting" &&
    effect.damageRollAbility === "spellcasting" &&
    spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "damageDie",
      "damageType",
      "replacesAbility",
      "attackRollAbility",
      "damageRollAbility",
    ])
  );
}

function naturalWeaponDamageTypeChoices(
  effect: Extract<EffectAtom, { readonly kind: "natural_weapons" }>,
): typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES | undefined {
  const choice = effect.damageType;
  if (
    choice.kind !== "choice_table" ||
    !spellMechanicsObjectHasOnlyKeys(choice, [
      "kind",
      "holeId",
      "label",
      "options",
    ]) ||
    choice.options.length !== 4 ||
    choice.options.some(
      (option) =>
        !spellMechanicsObjectHasOnlyKeys(option, [
          "id",
          "displayName",
          "damageType",
        ]),
    )
  )
    return undefined;
  const authoredDamageTypes = choice.options.map((option) => option.damageType);
  const expectedDamageTypes = new Set<DamageType>(
    SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES,
  );
  if (
    Object.entries(SELF_TRANSFORMATION_NATURAL_WEAPON_GROWTH_TYPE_COUNTS).some(
      ([damageType, expectedCount]) =>
        authoredDamageTypes.filter((authored) => authored === damageType)
          .length !== expectedCount,
    ) ||
    authoredDamageTypes.some(
      (damageType) => !expectedDamageTypes.has(damageType),
    )
  )
    return undefined;
  return SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES;
}

function modeOptionProjection(options: CastTimeEffectModeChoice["options"]): {
  readonly aquatic: CastTimeEffectModeOption | undefined;
  readonly appearance: CastTimeEffectModeOption | undefined;
  readonly natural: CastTimeEffectModeOption | undefined;
} {
  const exactlyOne = (
    predicate: (option: CastTimeEffectModeOption) => boolean,
  ): CastTimeEffectModeOption | undefined => {
    const matches = options.filter(predicate);
    return matches.length === 1 ? matches[0] : undefined;
  };
  return {
    aquatic: exactlyOne(isAquaticAdaptationCandidate),
    appearance: exactlyOne((option) => option.effects === undefined),
    natural: exactlyOne(isNaturalWeaponsCandidate),
  };
}

function isAquaticAdaptationCandidate(
  option: CastTimeEffectModeOption,
): boolean {
  return (
    option.effects?.some(
      (effect) =>
        effect.kind === "water_breathing" || effect.kind === "grant_speed",
    ) === true
  );
}

function isNaturalWeaponsCandidate(option: CastTimeEffectModeOption): boolean {
  return (
    option.effects?.some((effect) => effect.kind === "natural_weapons") === true
  );
}

type SelfTransformationModeInspection = {
  readonly damageTypeChoices:
    | typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES
    | undefined;
  readonly issues: readonly SelfTransformationIssueCoordinate[];
};

type SelfTransformationModeOptionProjection = ReturnType<
  typeof modeOptionProjection
>;

type SelfTransformationNaturalOptionInspection =
  | {
      readonly tag: "naturalWeaponsUnsupported";
    }
  | {
      readonly tag: "naturalWeaponDamageTypesUnsupported";
    }
  | {
      readonly tag: "supported";
      readonly damageTypeChoices: typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES;
    };

function selfTransformationModeCountIsUnsupported(
  mode: CastTimeEffectModeChoice,
  projection: SelfTransformationModeOptionProjection,
): boolean {
  return (
    mode.options.length !== 3 ||
    projection.aquatic === undefined ||
    projection.appearance === undefined ||
    projection.natural === undefined
  );
}

function selfTransformationAquaticOptionIsUnsupported(
  option: CastTimeEffectModeOption | undefined,
): boolean {
  return (
    option === undefined ||
    !optionHasOnlyFields(option) ||
    !effectsAreAquaticAdaptation(option.effects)
  );
}

function selfTransformationAppearanceOptionIsUnsupported(
  option: CastTimeEffectModeOption | undefined,
): boolean {
  return (
    option === undefined ||
    !spellMechanicsObjectHasOnlyKeys(option, ["id", "displayName"])
  );
}

function inspectSelfTransformationNaturalOption(
  option: CastTimeEffectModeOption | undefined,
): SelfTransformationNaturalOptionInspection {
  if (option === undefined || !optionHasOnlyFields(option)) {
    return { tag: "naturalWeaponsUnsupported" };
  }
  const naturalEffect = selfTransformationNaturalWeaponsEffect(option.effects);
  if (naturalEffect === null) {
    return { tag: "naturalWeaponsUnsupported" };
  }
  const damageTypeChoices = naturalWeaponDamageTypeChoices(naturalEffect);
  return damageTypeChoices === undefined
    ? { tag: "naturalWeaponDamageTypesUnsupported" }
    : { tag: "supported", damageTypeChoices };
}

function selfTransformationNaturalOptionDamageTypeChoices(
  inspection: SelfTransformationNaturalOptionInspection,
): typeof SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_TYPE_CHOICES | undefined {
  return Match.value(inspection).pipe(
    Match.when({ tag: "naturalWeaponsUnsupported" }, () => undefined),
    Match.when({ tag: "naturalWeaponDamageTypesUnsupported" }, () => undefined),
    Match.when(
      { tag: "supported" },
      ({ damageTypeChoices }) => damageTypeChoices,
    ),
    Match.exhaustive,
  );
}

function selfTransformationNaturalOptionIssues(
  inspection: SelfTransformationNaturalOptionInspection,
  modePath: UnitMechanicsPath,
): readonly SelfTransformationIssueCoordinate[] {
  return Match.value(inspection).pipe(
    Match.when({ tag: "naturalWeaponsUnsupported" }, () => [
      selfTransformationIssueCoordinate("naturalWeapons", modePath),
    ]),
    Match.when({ tag: "naturalWeaponDamageTypesUnsupported" }, () => [
      selfTransformationIssueCoordinate("naturalWeaponDamageTypes", modePath),
    ]),
    Match.when({ tag: "supported" }, () => []),
    Match.exhaustive,
  );
}

function inspectSelfTransformationMode(
  phase: DirectActivationPhase,
  modePath: UnitMechanicsPath,
): SelfTransformationModeInspection {
  const mode = phase.mode;
  if (mode === undefined)
    return {
      damageTypeChoices: undefined,
      issues: [{ failedFact: "modeChoice", mechanicsPath: modePath }],
    };

  const projection = modeOptionProjection(mode.options);
  const naturalInspection = inspectSelfTransformationNaturalOption(
    projection.natural,
  );

  return {
    damageTypeChoices:
      selfTransformationNaturalOptionDamageTypeChoices(naturalInspection),
    issues: [
      ...selfTransformationIssueWhen(
        phase.effects !== undefined ||
          !spellMechanicsObjectHasOnlyKeys(mode, MODE_CHOICE_FIELDS),
        "modeChoice",
        modePath,
      ),
      ...selfTransformationIssueWhen(
        mode.allowsMidDurationSwitchAs !== "magic_action",
        "modeSwitch",
        modePath,
      ),
      ...selfTransformationIssueWhen(
        selfTransformationModeCountIsUnsupported(mode, projection),
        "modeCount",
        modePath,
      ),
      ...selfTransformationIssueWhen(
        selfTransformationAquaticOptionIsUnsupported(projection.aquatic),
        "aquaticAdaptation",
        modePath,
      ),
      ...selfTransformationIssueWhen(
        selfTransformationAppearanceOptionIsUnsupported(projection.appearance),
        "changeAppearance",
        modePath,
      ),
      ...selfTransformationNaturalOptionIssues(naturalInspection, modePath),
    ],
  };
}

function selfTransformationEnvelopeIssues(
  mechanics: ActivationSpellMechanics,
): readonly SelfTransformationIssueCoordinate[] {
  return [
    ...selfTransformationIssueWhen(
      !spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS),
      "mechanics",
      spellMechanicsRootPath(),
    ),
    ...selfTransformationIssueWhen(
      mechanics.level !== SELF_TRANSFORMATION_SPELL_LEVEL,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...selfTransformationIssueWhen(
      mechanics.school !== "transmutation",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...selfTransformationIssueWhen(
      mechanics.range.kind !== "self" ||
        !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...selfTransformationIssueWhen(
      mechanics.components.v !== true ||
        mechanics.components.s !== true ||
        mechanics.components.m !== false ||
        !spellMechanicsObjectHasOnlyKeys(
          mechanics.components,
          COMPONENT_FIELDS,
        ),
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components).map((path) =>
      selfTransformationIssueCoordinate("components", path),
    ),
  ];
}

function selfTransformationDurationValueIsUnsupported(
  duration: Extract<Duration, { readonly kind: "concentration" }>,
): boolean {
  return (
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    !isSelfTransformationDurationHours(duration.upTo.amount) ||
    duration.upTo.unit !== "hour"
  );
}

function selfTransformationDurationChildIssues(
  duration: Duration,
): readonly SelfTransformationIssueCoordinate[] {
  return spellDurationChildCoordinates(duration).map((child) =>
    selfTransformationIssueCoordinate(
      spellDurationChildFailedFact(child),
      spellDurationChildPath(child),
    ),
  );
}

function selfTransformationDurationIssues(
  duration: Duration,
): readonly SelfTransformationIssueCoordinate[] {
  if (duration.kind !== "concentration") {
    return [
      selfTransformationIssueCoordinate(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
      ...selfTransformationDurationChildIssues(duration),
    ];
  }
  return [
    ...selfTransformationIssueWhen(
      !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS),
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...selfTransformationIssueWhen(
      selfTransformationDurationValueIsUnsupported(duration),
      "durationValue",
      spellDurationValuePath(),
    ),
    ...selfTransformationDurationChildIssues(duration),
  ];
}

function selfTransformationCastingTimeIssues(
  mechanics: ActivationSpellMechanics,
): readonly SelfTransformationIssueCoordinate[] {
  return selfTransformationIssueWhen(
    mechanics.castingTime.kind !== "action" ||
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.castingTime,
        CASTING_TIME_FIELDS,
      ),
    "castingTime",
    spellMechanicsHeaderPath("castingTime"),
  );
}

function selfTransformationPhaseCountIssues(
  mechanics: ActivationSpellMechanics,
  phaseOrdinal: PositiveInteger,
  phasePath: UnitMechanicsPath,
): readonly SelfTransformationIssueCoordinate[] {
  return [
    ...selfTransformationIssueWhen(
      mechanics.phases.length === 0,
      "phaseCount",
      phasePath,
    ),
    ...mechanics.phases.flatMap((_phase, index) => {
      const ordinal = PositiveInteger(index + 1);
      return ordinal === phaseOrdinal
        ? []
        : [
            selfTransformationIssueCoordinate(
              "phaseCount",
              spellActivationPhasePath(ordinal),
            ),
          ];
    }),
  ];
}

function selfTransformationPhaseIssues(
  phase: DirectActivationPhase | undefined,
  phasePath: UnitMechanicsPath,
  attachmentPath: UnitMechanicsPath,
): readonly SelfTransformationIssueCoordinate[] {
  if (phase === undefined) {
    return [selfTransformationIssueCoordinate("phase", phasePath)];
  }
  return [
    ...selfTransformationIssueWhen(
      !spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS),
      "phase",
      phasePath,
    ),
    ...selfTransformationIssueWhen(
      phase.attachment.kind !== "self" ||
        !spellMechanicsObjectHasOnlyKeys(phase.attachment, ATTACHMENT_FIELDS),
      "attachment",
      attachmentPath,
    ),
  ];
}

function selfTransformationModeInspection(
  phase: DirectActivationPhase | undefined,
  modePath: UnitMechanicsPath,
): SelfTransformationModeInspection {
  return phase === undefined
    ? { damageTypeChoices: undefined, issues: [] }
    : inspectSelfTransformationMode(phase, modePath);
}

function selfTransformationIncompleteAdmissionIssue(
  duration: SelfTransformationDuration | undefined,
  phasePath: UnitMechanicsPath,
): SelfTransformationIssue {
  return duration === undefined
    ? selfTransformationIssue("duration", spellMechanicsHeaderPath("duration"))
    : selfTransformationIssue("phase", phasePath);
}

function admitSelfTransformationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "selfTransformationMode",
  SelfTransformationFacts,
  SelfTransformationModeInvocation,
  SelfTransformationIssue
> {
  if (!selfTransformationRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const { phase, ordinal: phaseOrdinal } =
    selfTransformationPhaseSelection(mechanics);
  const phasePath = spellActivationPhasePath(phaseOrdinal);
  const attachmentPath = spellActivationAttachmentPath(phaseOrdinal);
  const modePath = spellActivationEffectPath(phaseOrdinal, PositiveInteger(1));
  const duration = selfTransformationDuration(mechanics.duration);
  const modeInspection = selfTransformationModeInspection(phase, modePath);
  const issues = [
    ...selfTransformationEnvelopeIssues(mechanics),
    ...selfTransformationDurationIssues(mechanics.duration),
    ...selfTransformationCastingTimeIssues(mechanics),
    ...selfTransformationPhaseCountIssues(mechanics, phaseOrdinal, phasePath),
    ...selfTransformationPhaseIssues(phase, phasePath, attachmentPath),
    ...modeInspection.issues,
  ];

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        nonEmpty,
        ({ failedFact, mechanicsPath }) =>
          selfTransformationIssue(failedFact, mechanicsPath),
      ),
    };
  if (
    duration === undefined ||
    phase === undefined ||
    modeInspection.damageTypeChoices === undefined
  )
    return {
      tag: "unsupported",
      issues: [selfTransformationIncompleteAdmissionIssue(duration, phasePath)],
    };
  const facts = {
    ...source.spellDefinitionRuleFacts,
    level: SELF_TRANSFORMATION_SPELL_LEVEL,
    duration,
    modeChoices: SELF_TRANSFORMATION_MODE_KINDS,
    naturalWeaponDamage: {
      dice: SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DICE,
      dieSize: SELF_TRANSFORMATION_NATURAL_WEAPON_DAMAGE_DIE_SIZE,
      damageTypeChoices: modeInspection.damageTypeChoices,
    },
  } satisfies SelfTransformationFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "selfTransformationMode",
      facts,
      evidence: selfTransformationEvidence(mechanics, phaseOrdinal),
      admit: (executionSource, context) =>
        admitSelfTransformationMode(executionSource, context, facts),
    },
  };
}

function admitSelfTransformationMode(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SelfTransformationFacts,
): readonly SelfTransformationModeInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SelfTransformationModeInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "selfTransformationMode",
              spell,
              actionCost: "magicAction",
              modeChoices: facts.modeChoices,
              naturalWeaponFacts: {
                damage: facts.naturalWeaponDamage,
                spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
                attackBonus: attackBonus(
                  Number(ctx.castingSource.abilityModifier) +
                    Number(ctx.actor.origin.spellcasting.proficiencyBonus),
                ),
              },
              expiresAt: {
                kind: "concentration",
                combatantId: ctx.actor.combatantId,
                durationTicks: spellDurationTicksFromCanonicalValue(
                  facts.duration.upTo,
                ),
              },
            },
          ],
  );
}

function discoverSelfTransformationModeCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SelfTransformationModeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [selfTransformationModeChoiceHole(invocation)],
    },
  ];
}

function resolveSelfTransformationMode(
  input: SelfTransformationModeResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !selfTransformationModeFillsAreAllowed(input.input.fills, input.invocation)
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Self-transformation mode spells use one mode choice fill and Natural Weapons damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const modeEffect = selfTransformationModeEffectPayloadFromFillSet(
    input.invocation,
    input.fillSet,
  );
  if (modeEffect.tag === "needsModeChoice") {
    return needsHolesResult(input.input.state, input.input.subject, [
      selfTransformationModeChoiceHole(input.invocation),
    ]);
  }
  if (modeEffect.tag === "needsDamageType") {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (modeEffect.tag === "invalid") {
    return invalidResult(input.input.state, "invalidFill", modeEffect.message);
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [input.actorId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effectOwner = concentrationBase.combatants.get(input.actorId);
  if (effectOwner === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Self-transformation effect owner is no longer in the battle.",
    );
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: effectOwner,
  });
  const allocatedState = {
    ...concentrationBase,
    combatants: new Map(concentrationBase.combatants).set(
      input.actorId,
      allocation.owner,
    ),
  };
  const effected = applySelfTransformationModeEffect({
    state: allocatedState,
    actorId: input.actorId,
    sourceCombatantId: input.actorId,
    sourceProcedureRef: input.input.subject.procedureRef,
    modeEffect: modeEffect.modeEffect,
    expiresAt: input.invocation.expiresAt,
    effectRef: allocation.effectRef,
  });
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

export function resolveStoredGlyphSelfTransformationModeSpellRelease(input: {
  readonly state: BattleState;
  readonly subject: ActionSpellBattleResolutionInput["subject"];
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly invocation: SelfTransformationModeResolveInput["invocation"];
  readonly fills: readonly BattleFill[];
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!selfTransformationModeFillsAreAllowed(input.fills, input.invocation)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Self-transformation mode spells use one mode choice fill and Natural Weapons damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const modeEffect = selfTransformationModeEffectPayloadFromFillSet(
    input.invocation,
    input.fillSet,
  );
  if (modeEffect.tag === "needsModeChoice") {
    return needsHolesResult(input.state, input.subject, [
      selfTransformationModeChoiceHole({
        ...input.invocation,
        sourceProcedureRef: input.subject.procedureRef,
      }),
    ]);
  }
  if (modeEffect.tag === "needsDamageType") {
    return needsHolesResult(input.state, input.subject, [
      spellDamageTypeChoiceHole({
        ...input.invocation,
        sourceProcedureRef: input.subject.procedureRef,
      }),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (modeEffect.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", modeEffect.message);
  }
  /* v8 ignore stop -- @preserve */
  const effectOwner = input.state.combatants.get(input.targetId);
  if (effectOwner === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation effect owner is no longer in the battle.",
    );
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: effectOwner,
  });
  const allocatedState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.targetId,
      allocation.owner,
    ),
  };
  const effected = applySelfTransformationModeEffect({
    state: allocatedState,
    actorId: input.targetId,
    sourceCombatantId: input.sourceCombatantId,
    sourceProcedureRef: input.subject.procedureRef,
    modeEffect: modeEffect.modeEffect,
    expiresAt: {
      kind: "duration",
      durationTicks: input.invocation.expiresAt.durationTicks,
    },
    effectRef: allocation.effectRef,
  });
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function selfTransformationModeFillsAreAllowed(
  fills: readonly BattleFill[],
  invocation: SelfTransformationModeResolveInput["invocation"],
): boolean {
  return fillsBelongToSpellCastHoles(fills, [
    selfTransformationModeChoiceHole(invocation).holeId,
    spellDamageTypeChoiceHole(invocation).holeId,
  ]);
}

function selfTransformationModeEffectPayloadFromFillSet(
  invocation: SelfTransformationModeResolveInput["invocation"],
  fillSet: OkSpellFillSet,
):
  | {
      readonly tag: "ok";
      readonly modeEffect: SelfTransformationModeEffectPayload;
    }
  | { readonly tag: "needsModeChoice" }
  | { readonly tag: "needsDamageType" }
  | { readonly tag: "invalid"; readonly message: string } {
  return fillSet.selfTransformationModeChoice === undefined
    ? { tag: "needsModeChoice" }
    : selfTransformationModeEffectPayload(
        invocation,
        fillSet.selfTransformationModeChoice,
        fillSet.damageTypeChoice,
      );
}

function selfTransformationModeEffectPayload(
  invocation: SelfTransformationModeResolveInput["invocation"],
  mode: SelfTransformationModeKind,
  damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined,
):
  | {
      readonly tag: "ok";
      readonly modeEffect: SelfTransformationModeEffectPayload;
    }
  | { readonly tag: "needsDamageType" }
  | { readonly tag: "invalid"; readonly message: string } {
  if (mode !== "naturalWeapons") {
    return damageTypeChoice === undefined
      ? {
          tag: "ok",
          modeEffect: {
            mode,
            naturalWeaponFacts: invocation.naturalWeaponFacts,
          },
        }
      : {
          tag: "invalid",
          message:
            "Self-transformation damage type choice is only valid for Natural Weapons.",
        };
  }
  if (damageTypeChoice === undefined) {
    return { tag: "needsDamageType" };
  }
  const selectedDamageType = damageTypeChoice.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !invocation.naturalWeaponFacts.damage.damageTypeChoices.includes(
      selectedDamageType,
    )
  ) {
    return {
      tag: "invalid",
      message: "Natural Weapons damage type choice is not available.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    modeEffect: {
      mode,
      naturalWeaponFacts: invocation.naturalWeaponFacts,
      naturalWeaponDamageType: selectedDamageType,
    },
  };
}

export const SelfTransformationModeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("selfTransformationMode"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      modeChoices: Schema.NonEmptyArray(
        Schema.Literals(SELF_TRANSFORMATION_MODE_KINDS),
      ),
      naturalWeaponFacts: Schema.Struct({
        damage: Schema.Struct({
          dice: Schema.Literal(1),
          dieSize: DamageDieSizeSchema,
          damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
        }),
        spellcastingAbilityModifier: AbilityModifier,
        attackBonus: AttackBonus,
      }),
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
    }),
  );
export const selfTransformationModeProfile: SpellProcedureDeclaration<
  "selfTransformationMode",
  SelfTransformationModeInvocation,
  SelfTransformationFacts,
  SelfTransformationIssue
> = {
  procedure: "selfTransformationMode",
  executionSchema: SelfTransformationModeInvocationSchema,
  admitMechanics: admitSelfTransformationMechanics,
  discoverCastAct: discoverSelfTransformationModeCastAct,
  resolve: resolveSelfTransformationMode,
};
