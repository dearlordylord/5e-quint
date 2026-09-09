import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import {
  ongoingSpellRepeatCastIsAvailable,
  ongoingSpellRepeatIsOnLaterTurn,
} from "../ongoing-spell-repeat-cast.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
import {
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
//
// The objectContactDamage profile family: an action-time spell heats a
// selected manufactured metal object, damages table-witnessed physical-contact
// creatures at cast time, and lets the caster spend later-turn Bonus Actions
// to repeat that contact damage while Concentration persists.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Heat Metal":
//     Action; 60 feet; Concentration up to 1 minute; selected manufactured
//     metal object visible in range; physical-contact creatures take Fire
//     damage when cast; later-turn Bonus Action repeats the damage if the
//     object is within range; holding or wearing damaged creatures make a
//     Constitution save, dropping the object if possible on failure, otherwise
//     taking Disadvantage on attack rolls and ability checks until the start of
//     the caster's next turn; higher-level slots add 1d8 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration, Spell
//     Slot, Spell Invocation, Spell Effect, and Holding / Wielding.
//
// What stays in shared infrastructure: the object-contact resolver body remains
// in spells-resolve-object-contact-damage.ts because it owns object witnesses,
// damage rolls, holding/wearing saves, drop outcomes, damage reactions,
// Concentration saves, and active-effect cleanup.

import {
  movementFeet,
  PositiveInteger,
  MovementFeet,
  type DamageDieSize,
  type PositiveInteger as PositiveIntegerType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  DamageType,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
  ObjectFilter,
} from "@dnd/surface/surface/types";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SpellObjectContactDamageActiveEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import { magicSuppressionOngoingSpellEffectRefForActiveEffect } from "../magic-suppression-ongoing-effect.ts";
import {
  resolveObjectContactDamageRepeatSpellAct,
  resolveObjectContactDamageSpellAct,
} from "../spells-resolve-object-contact-damage.ts";
import {
  spellObjectContactTargetsHole,
  spellObjectTargetHole,
} from "../spells-targeting.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionBattleTurn,
  spellAdmissionOngoingSpellEffectSuppressed,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  isSpellCanonicalDurationValue,
  spellMechanicsObjectHasOnlyKeys,
  spellPositiveIntegerFromSurface,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";

type ObjectContactDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamage" }
>;
type ObjectContactDamageRepeatInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamageRepeat" }
>;
type ObjectContactDamageResolveInput =
  SpellProcedureProfileResolveInput<ObjectContactDamageInvocation>;
type ObjectContactDamageRepeatResolveInput =
  SpellProcedureProfileResolveInput<ObjectContactDamageRepeatInvocation>;

type OngoingEffectSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingOperation = OngoingEffectSpellMechanics["operations"][number];
type OngoingOperationEffect = OngoingOperation["effect"];
type OngoingInitialPhase = NonNullable<
  Extract<
    OngoingEffectSpellMechanics["initialPhase"],
    { readonly kind: "direct" }
  >
>;
type OngoingInitialEffect = NonNullable<
  Extract<OngoingInitialPhase, { readonly kind: "direct" }>["effects"]
>[number];
type ObjectContactDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "object_contact_damage" }
>;
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;
type SupportedObjectContactDamageAmount = LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly base: DiceExpr & {
    readonly dice: 2;
    readonly dieSize: 8;
    readonly flat?: undefined;
    readonly spellcastingMod?: undefined;
    readonly abilityModifier?: undefined;
  };
  readonly perLevel: DiceExprDelta & {
    readonly dice: 1;
    readonly dieSize?: undefined;
    readonly flat?: undefined;
  };
  readonly startingAtLevel: 3;
};
type SupportedObjectContactDamageEffect = ObjectContactDamageEffect & {
  readonly damageType: Extract<DamageType, "fire">;
  readonly amount: SupportedObjectContactDamageAmount;
};
type ObjectContactDamageDamageProjection = {
  readonly baseDice: PositiveIntegerType & 2;
  readonly dieSize: DamageDieSize & 8;
  readonly perSlotDice: PositiveIntegerType & 1;
  readonly startingAtLevel: PositiveIntegerType & 3;
};
type ManufacturedMetalObjectAttachment = Extract<
  OngoingEffectSpellMechanics["attachment"],
  { readonly kind: "hole" }
> & {
  readonly value: {
    readonly kind: "object";
    readonly count: 1;
    readonly filter: {
      readonly manufactured: true;
      readonly material: "metal";
      readonly visibility: "caster_can_see";
    };
  };
};
type ObjectContactDamageMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
  readonly damage: ObjectContactDamageDamageProjection;
  readonly damageType: Extract<DamageType, "fire">;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for ObjectContactDamageFailedFact.
const OBJECT_CONTACT_DAMAGE_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "initialAttachment",
  "initialEffect",
  "operationCount",
  "repeatOperation",
  "repeatTrigger",
  "repeatPredicate",
  "repeatEffect",
  "damageAmount",
] as const;
type ObjectContactDamageFailedFact =
  (typeof OBJECT_CONTACT_DAMAGE_FAILED_FACTS)[number];
type ObjectContactDamageMechanicsIssue = {
  readonly failedFact: ObjectContactDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};
type ObjectContactDamageAdmissionIssue = SpellProcedureAdmissionIssue<
  "objectContactDamage",
  ObjectContactDamageFailedFact,
  SpellMechanicsBranchPath
>;
type ObjectContactDamageRepeatAdmissionIssue = SpellProcedureAdmissionIssue<
  "objectContactDamageRepeat",
  ObjectContactDamageFailedFact,
  SpellMechanicsBranchPath
>;
type ObjectContactDamageMechanicsInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<ObjectContactDamageMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: ObjectContactDamageMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

const OBJECT_CONTACT_DAMAGE_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
] as const satisfies ReadonlyArray<keyof OngoingEffectSpellMechanics>;
const OBJECT_CONTACT_DAMAGE_RANGE_FIELDS = [
  "kind",
  "feet",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["range"], { readonly kind: "point" }>
>;
const OBJECT_CONTACT_DAMAGE_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const OBJECT_CONTACT_DAMAGE_DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const satisfies ReadonlyArray<
  keyof Extract<SpellMechanics["duration"], { readonly kind: "concentration" }>
>;
const OBJECT_CONTACT_DAMAGE_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >["upTo"]
>;
const OBJECT_CONTACT_DAMAGE_CASTING_TIME_FIELDS = [
  "kind",
  "ritual",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingEffectSpellMechanics["castingTime"],
    { readonly kind: "action" }
  >
>;
const OBJECT_CONTACT_DAMAGE_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingEffectSpellMechanics["attachment"],
    { readonly kind: "hole" }
  >
>;
const OBJECT_CONTACT_DAMAGE_OBJECT_VALUE_FIELDS = [
  "kind",
  "count",
  "filter",
] as const satisfies ReadonlyArray<
  keyof Extract<
    ManufacturedMetalObjectAttachment["value"],
    { readonly kind: "object" }
  >
>;
const OBJECT_CONTACT_DAMAGE_OBJECT_FILTER_FIELDS = [
  "material",
  "manufactured",
  "visibility",
] as const satisfies ReadonlyArray<
  keyof NonNullable<
    Extract<
      ManufacturedMetalObjectAttachment["value"],
      { readonly kind: "object" }
    >["filter"]
  >
>;
const OBJECT_CONTACT_DAMAGE_INITIAL_FIELDS = [
  "kind",
  "attachment",
  "effects",
  "mode",
] as const satisfies ReadonlyArray<keyof OngoingInitialPhase>;
const OBJECT_CONTACT_DAMAGE_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof OngoingOperation>;
const OBJECT_CONTACT_DAMAGE_TRIGGER_FIELDS = [
  "kind",
  "cost",
  "laterTurnsOnly",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingOperation["trigger"],
    { readonly kind: "on_caster_spends_action" }
  >
>;
const OBJECT_CONTACT_DAMAGE_COST_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<
    OngoingOperation["trigger"],
    { readonly kind: "on_caster_spends_action" }
  >["cost"]
>;
const OBJECT_CONTACT_DAMAGE_PREDICATE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<
    NonNullable<OngoingOperation["predicate"]>,
    { readonly kind: "table_witnessed_attachment_within_spell_range" }
  >
>;
const OBJECT_CONTACT_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "contact",
  "damageType",
  "amount",
  "holdingOrWearingSave",
] as const satisfies ReadonlyArray<keyof ObjectContactDamageEffect>;
const OBJECT_CONTACT_DAMAGE_CONTACT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof ObjectContactDamageEffect["contact"]>;
const OBJECT_CONTACT_DAMAGE_AMOUNT_FIELDS = [
  "kind",
  "axis",
  "base",
  "perLevel",
  "startingAtLevel",
] as const satisfies ReadonlyArray<keyof LinearPerLevelDiceAmount>;
const OBJECT_CONTACT_DAMAGE_DICE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const OBJECT_CONTACT_DAMAGE_DELTA_FIELDS = [
  "dice",
  "dieSize",
  "flat",
] as const satisfies ReadonlyArray<keyof DiceExprDelta>;
const OBJECT_CONTACT_DAMAGE_SAVE_FIELDS = [
  "appliesIf",
  "ability",
  "dc",
  "onSuccess",
  "onFailure",
] as const satisfies ReadonlyArray<
  keyof ObjectContactDamageEffect["holdingOrWearingSave"]
>;
const OBJECT_CONTACT_DAMAGE_SAVE_APPLIES_IF_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof ObjectContactDamageEffect["holdingOrWearingSave"]["appliesIf"]
>;
const OBJECT_CONTACT_DAMAGE_SAVE_DC_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof ObjectContactDamageEffect["holdingOrWearingSave"]["dc"]
>;
const OBJECT_CONTACT_DAMAGE_SAVE_SUCCESS_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof ObjectContactDamageEffect["holdingOrWearingSave"]["onSuccess"]
>;
const OBJECT_CONTACT_DAMAGE_SAVE_FAILURE_FIELDS = [
  "kind",
  "dropCapabilityWitness",
  "dropResultWitness",
  "fallbackWhen",
  "fallback",
] as const satisfies ReadonlyArray<
  keyof ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"]
>;
const OBJECT_CONTACT_DAMAGE_WITNESS_FIELDS = [
  "kind",
  "subject",
  "object",
] as const;
const OBJECT_CONTACT_DAMAGE_FALLBACK_FIELDS = [
  "kind",
  "mode",
  "on",
  "expiresOn",
] as const;
const OBJECT_CONTACT_DAMAGE_EXPIRY_FIELDS = ["kind"] as const;

function objectContactDamageIssueResult<
  Procedure extends "objectContactDamage" | "objectContactDamageRepeat",
>(
  issue: ObjectContactDamageMechanicsIssue,
  procedure: Procedure,
): SpellProcedureAdmissionIssue<
  Procedure,
  ObjectContactDamageFailedFact,
  SpellMechanicsBranchPath
> {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${issue.failedFact}.`,
  };
}

function objectContactDamageMechanicsIssue(
  failedFact: ObjectContactDamageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): ObjectContactDamageMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function objectContactDamageIssueWhen(
  unsupported: boolean,
  failedFact: ObjectContactDamageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly ObjectContactDamageMechanicsIssue[] {
  return unsupported
    ? [objectContactDamageMechanicsIssue(failedFact, mechanicsPath)]
    : [];
}

function objectContactDamageMissingRootIssues(
  mechanics: SpellMechanics,
): ReadonlyNonEmptyArray<ObjectContactDamageMechanicsIssue> | undefined {
  if (mechanics.family !== "ongoing_effect") return undefined;
  const ongoing = mechanics;
  return spellProcedureNonEmpty([
    ...objectContactDamageIssueWhen(
      ongoing.level === undefined,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.school === undefined,
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.range === undefined,
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.components === undefined,
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.duration === undefined,
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.castingTime === undefined,
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.attachment === undefined,
      "attachment",
      spellOngoingAttachmentPath(),
    ),
    ...objectContactDamageIssueWhen(
      ongoing.operations === undefined,
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(1)),
    ),
  ]);
}

function objectContactDamageRangeIsRepresented(
  range: SpellMechanics["range"] | undefined,
): boolean {
  return (
    range?.kind === "point" &&
    range.feet === 60 &&
    spellMechanicsObjectHasOnlyKeys(range, OBJECT_CONTACT_DAMAGE_RANGE_FIELDS)
  );
}

function objectContactDamageComponentsAreRepresented(
  components: SpellMechanics["components"] | undefined,
): boolean {
  return (
    components?.v === true &&
    components.s === true &&
    typeof components.m === "string" &&
    spellMechanicsObjectHasOnlyKeys(
      components,
      OBJECT_CONTACT_DAMAGE_COMPONENT_FIELDS,
    )
  );
}

function objectContactDamageCastingTimeIsRepresented(
  castingTime: OngoingEffectSpellMechanics["castingTime"] | undefined,
): boolean {
  return (
    castingTime?.kind === "action" &&
    castingTime.ritual === undefined &&
    spellMechanicsObjectHasOnlyKeys(
      castingTime,
      OBJECT_CONTACT_DAMAGE_CASTING_TIME_FIELDS,
    )
  );
}

function objectContactDamageHeaderIsRepresented(
  mechanics: OngoingEffectSpellMechanics,
): boolean {
  return (
    mechanics.level === 2 &&
    mechanics.school === "transmutation" &&
    objectContactDamageRangeIsRepresented(mechanics.range) &&
    objectContactDamageComponentsAreRepresented(mechanics.components) &&
    objectContactDamageCastingTimeIsRepresented(mechanics.castingTime)
  );
}

function objectContactDamageDurationIsRepresented(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  return (
    objectContactDamageDurationValue(duration) !== undefined &&
    objectContactDamageDurationExtensionsAreSupported(duration) &&
    objectContactDamageDurationEndingsAreSupported(duration)
  );
}

function objectContactDamageInitialEffectIsRepresented(
  initialPhase: OngoingEffectSpellMechanics["initialPhase"],
): boolean {
  if (initialPhase?.kind !== "direct") return false;
  return (
    initialPhase.effects?.length === 1 &&
    isObjectContactDamageEffect(initialPhase.effects[0])
  );
}

function objectContactDamageRepeatOperationIsRepresented(
  operations: OngoingEffectSpellMechanics["operations"] | undefined,
): boolean {
  const repeatOperation = operations?.[0];
  return (
    operations?.length === 1 &&
    isObjectContactDamageRepeatOperation(repeatOperation) &&
    isObjectContactDamageEffect(repeatOperation.effect)
  );
}

function objectContactDamageAttachmentsConflict(
  mechanics: OngoingEffectSpellMechanics,
): boolean {
  const attachment = objectContactDamageAttachment(mechanics.attachment);
  if (attachment === undefined || mechanics.initialPhase?.kind !== "direct") {
    return false;
  }
  const initialAttachment = objectContactDamageAttachment(
    mechanics.initialPhase.attachment,
  );
  return (
    initialAttachment !== undefined &&
    !sameManufacturedMetalObjectHole(attachment, initialAttachment)
  );
}

function objectContactDamageStructuralCandidate(
  mechanics: SpellMechanics,
): boolean {
  if (mechanics.family !== "ongoing_effect") return false;
  const initialEffectIsRepresented =
    objectContactDamageInitialEffectIsRepresented(mechanics.initialPhase);
  const repeatOperationIsRepresented =
    objectContactDamageRepeatOperationIsRepresented(mechanics.operations);
  if (!initialEffectIsRepresented && !repeatOperationIsRepresented) {
    return false;
  }
  if (objectContactDamageAttachmentsConflict(mechanics)) return false;
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present: objectContactDamageHeaderIsRepresented(mechanics),
      },
      {
        name: "duration",
        present: objectContactDamageDurationIsRepresented(mechanics.duration),
      },
      {
        name: "attachment",
        present: isManufacturedMetalObjectAttachment(mechanics.attachment),
      },
      {
        name: "initialEffect",
        present: initialEffectIsRepresented,
      },
      {
        name: "repeatOperation",
        present: repeatOperationIsRepresented,
      },
    ],
  });
}

function objectContactDamageDurationValue(
  duration: SpellMechanics["duration"] | undefined,
): SpellCanonicalDurationValue | undefined {
  if (
    duration?.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      OBJECT_CONTACT_DAMAGE_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      OBJECT_CONTACT_DAMAGE_DURATION_VALUE_FIELDS,
    ) ||
    duration.upTo.unit !== "minute" ||
    duration.upTo.amount !== 1 ||
    !isSpellCanonicalDurationValue(duration.upTo)
  ) {
    return undefined;
  }
  return duration.upTo;
}

function objectContactDamageDurationExtensionsAreSupported(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  return (
    duration?.kind === "concentration" &&
    duration.upTo.upcastTiers === undefined
  );
}

function objectContactDamageDurationEndingsAreSupported(
  duration: SpellMechanics["duration"] | undefined,
): boolean {
  return (
    duration?.kind === "concentration" &&
    duration.earlyEnd === undefined &&
    duration.permanentIfMaintainedFull === undefined
  );
}

function isManufacturedMetalObjectAttachment(
  attachment: OngoingEffectSpellMechanics["attachment"] | undefined,
): attachment is ManufacturedMetalObjectAttachment {
  if (attachment?.kind !== "hole") return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      OBJECT_CONTACT_DAMAGE_ATTACHMENT_FIELDS,
    )
  )
    return false;
  const value = attachment.value;
  if (value.kind !== "object") return false;
  return (
    spellMechanicsObjectHasOnlyKeys(
      value,
      OBJECT_CONTACT_DAMAGE_OBJECT_VALUE_FIELDS,
    ) &&
    value.count === 1 &&
    isManufacturedMetalObjectFilter(value.filter)
  );
}

function isManufacturedMetalObjectFilter(
  filter: ObjectFilter | undefined,
): filter is ObjectFilter & {
  readonly manufactured: true;
  readonly material: "metal";
  readonly visibility: "caster_can_see";
} {
  return (
    filter !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      filter,
      OBJECT_CONTACT_DAMAGE_OBJECT_FILTER_FIELDS,
    ) &&
    filter.manufactured === true &&
    filter.material === "metal" &&
    filter.visibility === "caster_can_see"
  );
}

function sameManufacturedMetalObjectHole(
  left: ManufacturedMetalObjectAttachment,
  right: ManufacturedMetalObjectAttachment,
): boolean {
  return left.holeId === right.holeId;
}

function isSupportedObjectContactDamageAmount(
  amount: DiceAmount,
): amount is SupportedObjectContactDamageAmount {
  if (!isSupportedObjectContactDamageAmountHeader(amount)) return false;
  return (
    isSupportedObjectContactDamageBase(amount.base) &&
    isSupportedObjectContactDamageDelta(amount.perLevel)
  );
}

function isSupportedObjectContactDamageAmountHeader(
  amount: DiceAmount,
): amount is LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly startingAtLevel: 3;
} {
  return (
    amount.kind === "linear_per_level" &&
    spellMechanicsObjectHasOnlyKeys(
      amount,
      OBJECT_CONTACT_DAMAGE_AMOUNT_FIELDS,
    ) &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 3
  );
}

function isSupportedObjectContactDamageBase(base: DiceExpr): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      base,
      OBJECT_CONTACT_DAMAGE_DICE_EXPR_FIELDS,
    ) &&
    base.dice === 2 &&
    base.dieSize === 8 &&
    base.flat === undefined &&
    base.spellcastingMod === undefined &&
    base.abilityModifier === undefined
  );
}

function isSupportedObjectContactDamageDelta(delta: DiceExprDelta): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      delta,
      OBJECT_CONTACT_DAMAGE_DELTA_FIELDS,
    ) &&
    delta.dice === 1 &&
    delta.dieSize === undefined &&
    delta.flat === undefined
  );
}

function objectContactDamagePositiveIntegerAt<const Expected extends number>(
  value: number,
  expected: Expected,
): (PositiveIntegerType & Expected) | undefined {
  const parsed = spellPositiveIntegerFromSurface(value);
  return parsed !== undefined &&
    objectContactDamagePositiveIntegerMatches(parsed, expected)
    ? parsed
    : undefined;
}

function objectContactDamagePositiveIntegerMatches<
  const Expected extends number,
>(
  value: PositiveIntegerType,
  expected: Expected,
): value is PositiveIntegerType & Expected {
  return Number(value) === expected;
}

function objectContactDamageDieSizeAt<const Expected extends DamageDieSize>(
  value: number,
  expected: Expected,
): (DamageDieSize & Expected) | undefined {
  return value === expected ? expected : undefined;
}

function objectContactDamageDamageProjection(
  amount: SupportedObjectContactDamageAmount,
): ObjectContactDamageDamageProjection | undefined {
  const baseDice = objectContactDamagePositiveIntegerAt(amount.base.dice, 2);
  const dieSize = objectContactDamageDieSizeAt(amount.base.dieSize, 8);
  const perSlotDice = objectContactDamagePositiveIntegerAt(
    amount.perLevel.dice,
    1,
  );
  const startingAtLevel = objectContactDamagePositiveIntegerAt(
    amount.startingAtLevel,
    3,
  );
  return baseDice === undefined ||
    dieSize === undefined ||
    perSlotDice === undefined ||
    startingAtLevel === undefined
    ? undefined
    : { baseDice, dieSize, perSlotDice, startingAtLevel };
}

function isSupportedObjectContactHoldingOrWearingSave(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  return (
    objectContactDamageSaveShapesAreSupported(save) &&
    objectContactDamageSaveOutcomeIsSupported(save) &&
    objectContactDamageSaveFailureIsSupported(save.onFailure)
  );
}

function objectContactDamageSaveShapesAreSupported(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(save, OBJECT_CONTACT_DAMAGE_SAVE_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      save.appliesIf,
      OBJECT_CONTACT_DAMAGE_SAVE_APPLIES_IF_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      save.dc,
      OBJECT_CONTACT_DAMAGE_SAVE_DC_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      save.onSuccess,
      OBJECT_CONTACT_DAMAGE_SAVE_SUCCESS_FIELDS,
    )
  );
}

function objectContactDamageSaveFailureShapesAreSupported(
  onFailure: ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"],
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      onFailure,
      OBJECT_CONTACT_DAMAGE_SAVE_FAILURE_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      onFailure.dropCapabilityWitness,
      OBJECT_CONTACT_DAMAGE_WITNESS_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      onFailure.dropResultWitness,
      OBJECT_CONTACT_DAMAGE_WITNESS_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      onFailure.fallback,
      OBJECT_CONTACT_DAMAGE_FALLBACK_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      onFailure.fallback.expiresOn,
      OBJECT_CONTACT_DAMAGE_EXPIRY_FIELDS,
    )
  );
}

function objectContactDamageSaveOutcomeIsSupported(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  return (
    save.appliesIf.kind === "table_witnessed_holding_or_wearing_spell_object" &&
    save.ability === "con" &&
    save.dc.kind === "caster_spell_save_dc" &&
    save.onSuccess.kind === "none"
  );
}

function objectContactDamageWitnessIsSupported(
  witness: ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"]["dropCapabilityWitness"],
): boolean {
  return (
    witness.kind === "table_witnessed_drop_capability" &&
    witness.subject === "damaged_creature" &&
    witness.object === "spell_object"
  );
}

function objectContactDamageDropResultWitnessIsSupported(
  witness: ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"]["dropResultWitness"],
): boolean {
  return (
    witness.kind === "table_witnessed_drop_result" &&
    witness.subject === "damaged_creature" &&
    witness.object === "spell_object"
  );
}

function objectContactDamageFallbackIsSupported(
  fallback: ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"]["fallback"],
): boolean {
  return (
    fallback.kind === "modify_roll_advantage" &&
    fallback.mode === "disadvantage" &&
    sameStringSet(fallback.on, ["attack_roll", "ability_check"]) &&
    fallback.expiresOn.kind === "caster_turn_start"
  );
}

function objectContactDamageSaveFailureIsSupported(
  onFailure: ObjectContactDamageEffect["holdingOrWearingSave"]["onFailure"],
): boolean {
  return (
    objectContactDamageSaveFailureShapesAreSupported(onFailure) &&
    onFailure.kind === "drop_if_possible_else_disadvantage" &&
    objectContactDamageWitnessIsSupported(onFailure.dropCapabilityWitness) &&
    objectContactDamageDropResultWitnessIsSupported(
      onFailure.dropResultWitness,
    ) &&
    onFailure.fallbackWhen === "object_not_dropped" &&
    objectContactDamageFallbackIsSupported(onFailure.fallback)
  );
}

function isObjectContactDamageEffect(
  effect: OngoingInitialEffect | OngoingOperationEffect | undefined,
): effect is SupportedObjectContactDamageEffect {
  if (
    effect?.kind !== "object_contact_damage" ||
    !spellMechanicsObjectHasOnlyKeys(
      effect,
      OBJECT_CONTACT_DAMAGE_EFFECT_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      effect.contact,
      OBJECT_CONTACT_DAMAGE_CONTACT_FIELDS,
    )
  ) {
    return false;
  }
  return (
    effect.contact.kind ===
      "table_witnessed_physical_contact_with_spell_object" &&
    effect.damageType === "fire" &&
    isSupportedObjectContactDamageAmount(effect.amount) &&
    isSupportedObjectContactHoldingOrWearingSave(effect.holdingOrWearingSave)
  );
}

function sameObjectContactDamageEffect(
  left: SupportedObjectContactDamageEffect,
  right: SupportedObjectContactDamageEffect,
): boolean {
  return (
    left.damageType === right.damageType &&
    sameObjectContactDamageAmount(left.amount, right.amount) &&
    left.contact.kind === right.contact.kind
  );
}

function sameObjectContactDamageAmount(
  left: SupportedObjectContactDamageAmount,
  right: SupportedObjectContactDamageAmount,
): boolean {
  return (
    left.axis === right.axis &&
    left.startingAtLevel === right.startingAtLevel &&
    sameObjectContactDamageBase(left.base, right.base) &&
    sameObjectContactDamageDelta(left.perLevel, right.perLevel)
  );
}

function sameObjectContactDamageBase(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat &&
    left.spellcastingMod === right.spellcastingMod &&
    left.abilityModifier === right.abilityModifier
  );
}

function sameObjectContactDamageDelta(
  left: DiceExprDelta,
  right: DiceExprDelta,
): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat
  );
}

type ObjectContactDamageRepeatOperation = OngoingOperation & {
  readonly effect: ObjectContactDamageEffect;
  readonly predicate: NonNullable<OngoingOperation["predicate"]>;
};

function isObjectContactDamageRepeatOperationShape(
  operation: OngoingOperation | undefined,
): operation is ObjectContactDamageRepeatOperation {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      OBJECT_CONTACT_DAMAGE_OPERATION_FIELDS,
    ) &&
    operation.predicate !== undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.effect.kind === "object_contact_damage" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      OBJECT_CONTACT_DAMAGE_EFFECT_FIELDS,
    )
  );
}

function objectContactDamageRepeatTriggerIsSupported(
  trigger: OngoingOperation["trigger"],
): boolean {
  return (
    trigger.kind === "on_caster_spends_action" &&
    spellMechanicsObjectHasOnlyKeys(
      trigger,
      OBJECT_CONTACT_DAMAGE_TRIGGER_FIELDS,
    ) &&
    trigger.cost !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      trigger.cost,
      OBJECT_CONTACT_DAMAGE_COST_FIELDS,
    ) &&
    trigger.cost.kind === "bonus_action" &&
    trigger.laterTurnsOnly === true
  );
}

function objectContactDamageRepeatPredicateIsSupported(
  predicate: NonNullable<OngoingOperation["predicate"]>,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      predicate,
      OBJECT_CONTACT_DAMAGE_PREDICATE_FIELDS,
    ) && predicate.kind === "table_witnessed_attachment_within_spell_range"
  );
}

function isObjectContactDamageRepeatOperation(
  operation: OngoingOperation | undefined,
): operation is ObjectContactDamageRepeatOperation {
  if (!isObjectContactDamageRepeatOperationShape(operation)) return false;
  return (
    objectContactDamageRepeatTriggerIsSupported(operation.trigger) &&
    objectContactDamageRepeatPredicateIsSupported(operation.predicate)
  );
}

function objectContactDamageDefinitionFactsMatch(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectSpellMechanics,
): {
  readonly range: boolean;
  readonly duration: boolean;
  readonly components: boolean;
} {
  const definition = source.spellDefinitionRuleFacts;
  return {
    range: objectContactDamageDefinitionRangeMatches(
      definition.range,
      mechanics.range,
    ),
    duration: objectContactDamageDefinitionDurationMatches(
      definition.duration,
      mechanics.duration,
    ),
    components: objectContactDamageDefinitionComponentsMatch(
      definition.components,
      mechanics.components,
    ),
  };
}

function objectContactDamageDefinitionRangeMatches(
  definition: SpellDefinitionRuleFacts["range"],
  mechanics: SpellMechanics["range"],
): boolean {
  return (
    definition.kind === mechanics.kind &&
    definition.kind === "point" &&
    mechanics.kind === "point" &&
    definition.feet === mechanics.feet
  );
}

function objectContactDamageDefinitionDurationMatches(
  definition: SpellDefinitionRuleFacts["duration"],
  mechanics: SpellMechanics["duration"],
): boolean {
  return (
    definition.kind === mechanics.kind &&
    definition.kind === "concentration" &&
    mechanics.kind === "concentration" &&
    definition.upTo.unit === mechanics.upTo.unit &&
    definition.upTo.amount === mechanics.upTo.amount
  );
}

function objectContactDamageDefinitionComponentsMatch(
  definition: SpellDefinitionRuleFacts["components"],
  mechanics: SpellMechanics["components"],
): boolean {
  return (
    definition.verbal === mechanics.v &&
    definition.somatic === mechanics.s &&
    definition.hasMaterial === (mechanics.m !== false)
  );
}

function objectContactDamageMechanicsEvidence(
  mechanics: OngoingEffectSpellMechanics,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellOngoingAttachmentPath(),
    spellOngoingInitialPhasePath(),
    ...mechanics.operations.flatMap((_operation, index) => [
      spellOngoingOperationPath(PositiveInteger(index + 1)),
      spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
    ]),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

type ObjectContactDamageProjection = {
  readonly mechanics: OngoingEffectSpellMechanics;
  readonly initialPhase: OngoingEffectSpellMechanics["initialPhase"];
  readonly initialEffect: OngoingInitialEffect | undefined;
  readonly repeatOperation: OngoingOperation | undefined;
  readonly repeatEffect: OngoingOperationEffect | undefined;
  readonly durationValue: SpellCanonicalDurationValue | undefined;
  readonly durationExtensionsSupported: boolean;
  readonly durationEndingsSupported: boolean;
  readonly durationSupported: boolean;
  readonly rangeFeet: MovementFeet | undefined;
  readonly attachment: ManufacturedMetalObjectAttachment | undefined;
  readonly initialAttachment: ManufacturedMetalObjectAttachment | undefined;
  readonly initialEffectSupported:
    | SupportedObjectContactDamageEffect
    | undefined;
  readonly damage: ObjectContactDamageDamageProjection | undefined;
  readonly repeatOperationSupported:
    | ObjectContactDamageRepeatOperation
    | undefined;
  readonly repeatEffectSupported:
    | SupportedObjectContactDamageEffect
    | undefined;
  readonly definitionFacts: ReturnType<
    typeof objectContactDamageDefinitionFactsMatch
  >;
};

function objectContactDamageInitialEffect(
  initialPhase: OngoingEffectSpellMechanics["initialPhase"],
): OngoingInitialEffect | undefined {
  return initialPhase?.kind === "direct"
    ? initialPhase.effects?.[0]
    : undefined;
}

function objectContactDamageRangeFeet(
  range: SpellMechanics["range"],
): MovementFeet | undefined {
  return range.kind === "point" && range.feet === 60
    ? movementFeet(range.feet)
    : undefined;
}

function objectContactDamageAttachment(
  attachment: OngoingEffectSpellMechanics["attachment"] | undefined,
): ManufacturedMetalObjectAttachment | undefined {
  return isManufacturedMetalObjectAttachment(attachment)
    ? attachment
    : undefined;
}

function objectContactDamageSupportedEffect(
  effect: OngoingInitialEffect | OngoingOperationEffect | undefined,
): SupportedObjectContactDamageEffect | undefined {
  return isObjectContactDamageEffect(effect) ? effect : undefined;
}

function objectContactDamageSupportedRepeatOperation(
  operation: OngoingOperation | undefined,
): ObjectContactDamageRepeatOperation | undefined {
  return isObjectContactDamageRepeatOperation(operation)
    ? operation
    : undefined;
}

function objectContactDamageProjection(
  source: SpellMechanicsAdmissionSource,
  mechanics: OngoingEffectSpellMechanics,
): ObjectContactDamageProjection {
  const initialPhase = mechanics.initialPhase;
  const initialEffect = objectContactDamageInitialEffect(initialPhase);
  const repeatOperation = mechanics.operations[0];
  const repeatEffect = repeatOperation?.effect;
  const durationValue = objectContactDamageDurationValue(mechanics.duration);
  const durationExtensionsSupported =
    objectContactDamageDurationExtensionsAreSupported(mechanics.duration);
  const durationEndingsSupported =
    objectContactDamageDurationEndingsAreSupported(mechanics.duration);
  const initialEffectSupported =
    objectContactDamageSupportedEffect(initialEffect);
  return {
    mechanics,
    initialPhase,
    initialEffect,
    repeatOperation,
    repeatEffect,
    durationValue,
    durationExtensionsSupported,
    durationEndingsSupported,
    durationSupported:
      durationValue !== undefined &&
      durationExtensionsSupported &&
      durationEndingsSupported,
    rangeFeet: objectContactDamageRangeFeet(mechanics.range),
    attachment: objectContactDamageAttachment(mechanics.attachment),
    initialAttachment:
      initialPhase?.kind === "direct"
        ? objectContactDamageAttachment(initialPhase.attachment)
        : undefined,
    initialEffectSupported,
    damage:
      initialEffectSupported === undefined
        ? undefined
        : objectContactDamageDamageProjection(initialEffectSupported.amount),
    repeatOperationSupported:
      objectContactDamageSupportedRepeatOperation(repeatOperation),
    repeatEffectSupported: objectContactDamageSupportedEffect(repeatEffect),
    definitionFacts: objectContactDamageDefinitionFactsMatch(source, mechanics),
  };
}

function objectContactDamageHeaderIssues(
  source: SpellMechanicsAdmissionSource,
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  const { mechanics, definitionFacts } = projection;
  return [
    ...objectContactDamageIssueWhen(
      mechanics.level !== 2 ||
        source.spellDefinitionRuleFacts.level !== mechanics.level,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...objectContactDamageIssueWhen(
      !spellMechanicsObjectHasOnlyKeys(
        mechanics,
        OBJECT_CONTACT_DAMAGE_ROOT_FIELDS,
      ),
      "operationCount",
      spellMechanicsHeaderPath("family"),
    ),
    ...objectContactDamageIssueWhen(
      mechanics.school !== "transmutation",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...objectContactDamageIssueWhen(
      !objectContactDamageRangeIsRepresented(mechanics.range),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...objectContactDamageIssueWhen(
      !definitionFacts.range,
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...objectContactDamageIssueWhen(
      !objectContactDamageComponentsAreRepresented(mechanics.components),
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...objectContactDamageIssueWhen(
      !definitionFacts.components,
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...objectContactDamageIssueWhen(
      !objectContactDamageCastingTimeIsRepresented(mechanics.castingTime),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
  ];
}

function objectContactDamageDurationBranchIssues(
  projection: ObjectContactDamageProjection,
  branch: "extension" | "ending",
): readonly ObjectContactDamageMechanicsIssue[] {
  return spellDurationChildCoordinates(projection.mechanics.duration)
    .filter((child) => child.branch === branch)
    .map((child) =>
      objectContactDamageMechanicsIssue(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      ),
    );
}

function objectContactDamageDurationIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  if (projection.durationSupported && projection.definitionFacts.duration) {
    return [];
  }
  return [
    objectContactDamageMechanicsIssue(
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...(projection.durationValue === undefined
      ? spellDurationValueEvidencePaths(projection.mechanics.duration).map(
          (path) => objectContactDamageMechanicsIssue("durationValue", path),
        )
      : []),
    ...(projection.durationExtensionsSupported
      ? []
      : objectContactDamageDurationBranchIssues(projection, "extension")),
    ...(projection.durationEndingsSupported
      ? []
      : objectContactDamageDurationBranchIssues(projection, "ending")),
  ];
}

function objectContactDamageInitialPhaseIsSupported(
  initialPhase: OngoingEffectSpellMechanics["initialPhase"],
): boolean {
  return (
    initialPhase?.kind === "direct" &&
    spellMechanicsObjectHasOnlyKeys(
      initialPhase,
      OBJECT_CONTACT_DAMAGE_INITIAL_FIELDS,
    ) &&
    initialPhase.mode === undefined
  );
}

function objectContactDamageInitialAttachmentIsUnsupported(
  projection: ObjectContactDamageProjection,
): boolean {
  if (projection.initialPhase?.kind !== "direct") return false;
  return (
    projection.initialAttachment === undefined ||
    projection.attachment === undefined ||
    !sameManufacturedMetalObjectHole(
      projection.attachment,
      projection.initialAttachment,
    )
  );
}

function objectContactDamageInitialEffectCountIsUnsupported(
  initialPhase: OngoingEffectSpellMechanics["initialPhase"],
): boolean {
  if (initialPhase?.kind !== "direct") return false;
  return (
    initialPhase.effects === undefined || initialPhase.effects.length !== 1
  );
}

function objectContactDamageInitialEffectIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  if (projection.initialEffectSupported !== undefined) {
    return objectContactDamageIssueWhen(
      projection.damage === undefined,
      "damageAmount",
      spellOngoingInitialPhasePath(),
    );
  }
  return [
    objectContactDamageMechanicsIssue(
      "initialEffect",
      spellOngoingInitialPhasePath(),
    ),
    ...(projection.initialEffect?.kind === "object_contact_damage" &&
    !isSupportedObjectContactDamageAmount(projection.initialEffect.amount)
      ? [
          objectContactDamageMechanicsIssue(
            "damageAmount",
            spellOngoingInitialPhasePath(),
          ),
        ]
      : []),
  ];
}

function objectContactDamageInitialIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  return [
    ...objectContactDamageIssueWhen(
      projection.attachment === undefined,
      "attachment",
      spellOngoingAttachmentPath(),
    ),
    ...objectContactDamageIssueWhen(
      !objectContactDamageInitialPhaseIsSupported(projection.initialPhase),
      "initialPhase",
      spellOngoingInitialPhasePath(),
    ),
    ...objectContactDamageIssueWhen(
      objectContactDamageInitialAttachmentIsUnsupported(projection),
      "initialAttachment",
      spellOngoingInitialPhasePath(),
    ),
    ...objectContactDamageIssueWhen(
      objectContactDamageInitialEffectCountIsUnsupported(
        projection.initialPhase,
      ),
      "initialEffect",
      spellOngoingInitialPhasePath(),
    ),
    ...objectContactDamageInitialEffectIssues(projection),
  ];
}

function objectContactDamageOperationCountIssues(
  operations: OngoingEffectSpellMechanics["operations"],
): readonly ObjectContactDamageMechanicsIssue[] {
  if (operations.length === 1) return [];
  if (operations.length === 0) {
    return [
      objectContactDamageMechanicsIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(1)),
      ),
    ];
  }
  return operations
    .slice(1)
    .map((_operation, index) =>
      objectContactDamageMechanicsIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 2)),
      ),
    );
}

function objectContactDamageRepeatTriggerIsUnsupported(
  operation: OngoingOperation | undefined,
): boolean {
  if (operation === undefined) return false;
  return (
    operation.trigger.kind !== "on_caster_spends_action" ||
    operation.trigger.cost?.kind !== "bonus_action" ||
    operation.trigger.laterTurnsOnly !== true
  );
}

function objectContactDamageRepeatPredicateIsUnsupported(
  operation: OngoingOperation | undefined,
): boolean {
  if (operation === undefined) return false;
  return (
    operation.predicate?.kind !==
    "table_witnessed_attachment_within_spell_range"
  );
}

function objectContactDamageMalformedRepeatEffectIssues(
  operation: OngoingOperation | undefined,
): readonly ObjectContactDamageMechanicsIssue[] {
  const path = spellOngoingOperationEffectPath(PositiveInteger(1));
  if (operation?.effect.kind !== "object_contact_damage") {
    return [objectContactDamageMechanicsIssue("repeatEffect", path)];
  }
  return objectContactDamageIssueWhen(
    !isSupportedObjectContactDamageAmount(operation.effect.amount),
    "damageAmount",
    path,
  );
}

function objectContactDamageMalformedRepeatOperationIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  if (projection.repeatOperationSupported !== undefined) return [];
  const path = spellOngoingOperationPath(PositiveInteger(1));
  return [
    objectContactDamageMechanicsIssue("repeatOperation", path),
    ...objectContactDamageIssueWhen(
      objectContactDamageRepeatTriggerIsUnsupported(projection.repeatOperation),
      "repeatTrigger",
      path,
    ),
    ...objectContactDamageIssueWhen(
      objectContactDamageRepeatPredicateIsUnsupported(
        projection.repeatOperation,
      ),
      "repeatPredicate",
      path,
    ),
    ...objectContactDamageMalformedRepeatEffectIssues(
      projection.repeatOperation,
    ),
  ];
}

function objectContactDamageSupportedRepeatEffectIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  if (
    projection.repeatOperationSupported === undefined ||
    projection.repeatEffectSupported !== undefined
  )
    return [];
  const path = spellOngoingOperationEffectPath(PositiveInteger(1));
  return [
    objectContactDamageMechanicsIssue("repeatEffect", path),
    ...objectContactDamageIssueWhen(
      !isSupportedObjectContactDamageAmount(
        projection.repeatOperationSupported.effect.amount,
      ),
      "damageAmount",
      path,
    ),
  ];
}

function objectContactDamageRepeatEffectEqualityIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  const { initialEffectSupported, repeatEffectSupported } = projection;
  const effectsDiffer =
    initialEffectSupported !== undefined &&
    repeatEffectSupported !== undefined &&
    !sameObjectContactDamageEffect(
      initialEffectSupported,
      repeatEffectSupported,
    );
  return objectContactDamageIssueWhen(
    effectsDiffer,
    "repeatEffect",
    spellOngoingOperationEffectPath(PositiveInteger(1)),
  );
}

function objectContactDamageRepeatIssues(
  projection: ObjectContactDamageProjection,
): readonly ObjectContactDamageMechanicsIssue[] {
  return [
    ...objectContactDamageOperationCountIssues(projection.mechanics.operations),
    ...objectContactDamageMalformedRepeatOperationIssues(projection),
    ...objectContactDamageSupportedRepeatEffectIssues(projection),
    ...objectContactDamageRepeatEffectEqualityIssues(projection),
  ];
}

type ObjectContactDamageEffectProjection = ObjectContactDamageProjection & {
  readonly attachment: ManufacturedMetalObjectAttachment;
  readonly initialAttachment: ManufacturedMetalObjectAttachment;
  readonly initialEffectSupported: SupportedObjectContactDamageEffect;
  readonly repeatOperationSupported: ObjectContactDamageRepeatOperation;
  readonly repeatEffectSupported: SupportedObjectContactDamageEffect;
  readonly damage: ObjectContactDamageDamageProjection;
};
type CompleteObjectContactDamageProjection =
  ObjectContactDamageEffectProjection & {
    readonly durationSupported: true;
    readonly durationValue: SpellCanonicalDurationValue;
    readonly rangeFeet: MovementFeet;
    readonly definitionFacts: ObjectContactDamageProjection["definitionFacts"] & {
      readonly range: true;
      readonly duration: true;
    };
  };

function objectContactDamageHasEffectProjection(
  projection: ObjectContactDamageProjection,
): projection is ObjectContactDamageEffectProjection {
  return (
    projection.attachment !== undefined &&
    projection.initialAttachment !== undefined &&
    projection.initialEffectSupported !== undefined &&
    projection.repeatOperationSupported !== undefined &&
    projection.repeatEffectSupported !== undefined &&
    projection.damage !== undefined
  );
}

function objectContactDamageHasDurationAndRangeProjection(
  projection: ObjectContactDamageProjection,
): projection is ObjectContactDamageProjection &
  Pick<
    CompleteObjectContactDamageProjection,
    "durationSupported" | "durationValue" | "rangeFeet" | "definitionFacts"
  > {
  return (
    projection.durationSupported &&
    projection.definitionFacts.range &&
    projection.definitionFacts.duration &&
    projection.rangeFeet !== undefined &&
    projection.durationValue !== undefined
  );
}

function objectContactDamageProjectionIsComplete(
  projection: ObjectContactDamageProjection,
): projection is CompleteObjectContactDamageProjection {
  return (
    objectContactDamageHasEffectProjection(projection) &&
    objectContactDamageHasDurationAndRangeProjection(projection)
  );
}

function inspectObjectContactDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): ObjectContactDamageMechanicsInspection {
  if (!objectContactDamageStructuralCandidate(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const missingRootIssues = objectContactDamageMissingRootIssues(
    source.mechanics,
  );
  if (missingRootIssues !== undefined) {
    return { tag: "unsupported", issues: missingRootIssues };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const projection = objectContactDamageProjection(source, mechanics);
  const issues = [
    ...objectContactDamageHeaderIssues(source, projection),
    ...objectContactDamageDurationIssues(projection),
    ...objectContactDamageInitialIssues(projection),
    ...objectContactDamageRepeatIssues(projection),
  ];
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined)
    return {
      tag: "unsupported",
      issues: uniqueIssues,
    };
  if (!objectContactDamageProjectionIsComplete(projection)) {
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact:
            projection.damage === undefined ? "damageAmount" : "initialEffect",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    rangeFeet: projection.rangeFeet,
    durationTicks: spellDurationTicksFromCanonicalValue(
      projection.durationValue,
    ),
    damage: projection.damage,
    damageType: projection.initialEffectSupported.damageType,
  } satisfies ObjectContactDamageMechanicsFacts;
  return {
    tag: "supported",
    facts,
    evidence: objectContactDamageMechanicsEvidence(mechanics),
  };
}

function admitObjectContactDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "objectContactDamage",
  ObjectContactDamageMechanicsFacts,
  ObjectContactDamageInvocation,
  ObjectContactDamageAdmissionIssue
> {
  const inspection = inspectObjectContactDamageMechanics(source);
  if (inspection.tag === "notRepresented") return inspection;
  if (inspection.tag === "unsupported") {
    const issues = spellProcedureNonEmpty(
      inspection.issues.map((issue) =>
        objectContactDamageIssueResult(issue, "objectContactDamage"),
      ),
    );
    if (issues === undefined) return { tag: "notRepresented" };
    return { tag: "unsupported", issues };
  }
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "objectContactDamage",
      facts: inspection.facts,
      evidence: inspection.evidence,
      admit: (executionSource, ctx) =>
        admitObjectContactDamage(executionSource, ctx, inspection.facts),
    },
  };
}

function admitObjectContactDamageRepeatMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "objectContactDamageRepeat",
  ObjectContactDamageMechanicsFacts,
  ObjectContactDamageRepeatInvocation,
  ObjectContactDamageRepeatAdmissionIssue
> {
  const inspection = inspectObjectContactDamageMechanics(source);
  if (inspection.tag === "notRepresented") return inspection;
  if (inspection.tag === "unsupported") {
    const issues = spellProcedureNonEmpty(
      inspection.issues.map((issue) =>
        objectContactDamageIssueResult(issue, "objectContactDamageRepeat"),
      ),
    );
    if (issues === undefined) return { tag: "notRepresented" };
    return { tag: "unsupported", issues };
  }
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "objectContactDamageRepeat",
      facts: inspection.facts,
      evidence: inspection.evidence,
      admit: (executionSource, ctx) =>
        admitObjectContactDamageRepeat(executionSource, ctx),
    },
  };
}

function admitObjectContactDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ObjectContactDamageMechanicsFacts,
): readonly ObjectContactDamageInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ObjectContactDamageInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const damageExpr: DiceExpr = {
        dice:
          Number(facts.damage.baseDice) +
          Math.max(
            0,
            Number(slot.spellLevel) - Number(facts.damage.startingAtLevel) + 1,
          ) *
            Number(facts.damage.perSlotDice),
        dieSize: facts.damage.dieSize,
      };
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "objectContactDamage",
          spell,
          actionCost: "magicAction",
          targeting: { kind: "singleManufacturedMetalObject" },
          damage: {
            expr: damageExpr,
            damageType: facts.damageType,
          },
          rangeFeet: facts.rangeFeet,
          durationTicks: facts.durationTicks,
        },
      ];
    },
  );
}

function admitObjectContactDamageRepeat(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
): readonly ObjectContactDamageRepeatInvocation[] {
  return ctx.actor.activeEffects.flatMap(
    (effect): readonly ObjectContactDamageRepeatInvocation[] => {
      if (
        effect.kind !== "spellObjectContactDamage" ||
        effect.sourceCombatantId !== ctx.actor.combatantId ||
        spellAdmissionOngoingSpellEffectSuppressed(
          ctx,
          magicSuppressionOngoingSpellEffectRefForActiveEffect(effect),
        ) ||
        !objectContactDamageRepeatIsDiscoverable(effect, ctx)
      ) {
        return [];
      }
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "objectContactDamageRepeat",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
        },
      ];
    },
  );
}

function objectContactDamageRepeatIsDiscoverable(
  effect: SpellObjectContactDamageActiveEffect,
  ctx: SpellAdmissionContext,
): boolean {
  const battleTurn = spellAdmissionBattleTurn(ctx);
  return (
    battleTurn !== undefined &&
    ongoingSpellRepeatIsOnLaterTurn(battleTurn, effect)
  );
}

function discoverObjectContactDamageCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ObjectContactDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [spellObjectTargetHole(invocation)],
    },
  ];
}

function discoverObjectContactDamageRepeatCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ObjectContactDamageRepeatInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!ongoingSpellRepeatCastIsAvailable(state, invocation.activeEffect)) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [
        spellObjectContactTargetsHole({
          state,
          sourceCombatantId: invocation.activeEffect.sourceCombatantId,
          objectId: invocation.activeEffect.objectId,
          invocation: {
            ...invocation,
            sourceProcedureRef: invocation.activeEffect.sourceProcedureRef,
          },
          requiresObjectWithinRange: true,
        }),
      ],
    },
  ];
}

function resolveObjectContactDamage(
  input: ObjectContactDamageResolveInput,
): BattleResolutionResult {
  return resolveObjectContactDamageSpellAct(input);
}

function resolveObjectContactDamageRepeat(
  input: ObjectContactDamageRepeatResolveInput,
): BattleResolutionResult {
  return resolveObjectContactDamageRepeatSpellAct(input);
}

const ObjectContactDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("objectContactDamage"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("singleManufacturedMetalObject"),
    }),
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
    durationTicks: ElapsedTimeTicksSchema,
  }),
);

const ObjectContactDamageRepeatInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    procedure: Schema.Literal("objectContactDamageRepeat"),
    spellRuleFacts: Schema.optionalKey(Schema.Never),
    activeEffectRef: BattleEffectExecutionRef,
    activeEffectSourceProcedureRef: BattleProcedureExecutionRef,
  }),
);
export const objectContactDamageProfile: SpellProcedureDeclaration<
  "objectContactDamage",
  ObjectContactDamageInvocation,
  ObjectContactDamageMechanicsFacts,
  ObjectContactDamageAdmissionIssue
> = {
  procedure: "objectContactDamage",
  executionSchema: ObjectContactDamageInvocationSchema,
  admitMechanics: admitObjectContactDamageMechanics,
  discoverCastAct: discoverObjectContactDamageCastAct,
  resolve: resolveObjectContactDamage,
};

export const objectContactDamageRepeatProfile: SpellProcedureDeclaration<
  "objectContactDamageRepeat",
  ObjectContactDamageRepeatInvocation,
  ObjectContactDamageMechanicsFacts,
  ObjectContactDamageRepeatAdmissionIssue
> = {
  procedure: "objectContactDamageRepeat",
  executionSchema: ObjectContactDamageRepeatInvocationSchema,
  admitMechanics: admitObjectContactDamageRepeatMechanics,
  discoverCastAct: discoverObjectContactDamageRepeatCastAct,
  resolve: resolveObjectContactDamageRepeat,
};
