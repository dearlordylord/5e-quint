import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import {
  ongoingSpellRepeatCastIsAvailable,
  ongoingSpellRepeatIsOnLaterTurn,
} from "../ongoing-spell-repeat-cast.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
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
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  DamageType,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
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
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
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
  readonly durationValue: SpellCanonicalDurationValue;
  readonly damageAmount: SupportedObjectContactDamageAmount;
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

function objectContactDamageMissingRootIssues(
  mechanics: SpellMechanics,
): ReadonlyNonEmptyArray<ObjectContactDamageMechanicsIssue> | undefined {
  if (mechanics.family !== "ongoing_effect") return undefined;
  const ongoing = mechanics;
  const issues: ObjectContactDamageMechanicsIssue[] = [];
  const push = (
    failedFact: ObjectContactDamageFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });
  if (ongoing.level === undefined)
    push("level", spellMechanicsHeaderPath("level"));
  if (ongoing.school === undefined)
    push("school", spellMechanicsHeaderPath("school"));
  if (ongoing.range === undefined)
    push("range", spellMechanicsHeaderPath("range"));
  if (ongoing.components === undefined)
    push("components", spellMechanicsHeaderPath("components"));
  if (ongoing.duration === undefined)
    push("duration", spellMechanicsHeaderPath("duration"));
  if (ongoing.castingTime === undefined)
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (ongoing.attachment === undefined)
    push("attachment", spellOngoingAttachmentPath());
  if (ongoing.operations === undefined)
    push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
  return spellProcedureNonEmpty(issues);
}

function objectContactDamageSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    (mechanics.operations?.some(
      (operation) => operation.effect.kind === "object_contact_damage",
    ) ||
      (mechanics.initialPhase?.kind === "direct" &&
        mechanics.initialPhase.effects?.some(
          (effect) => effect.kind === "object_contact_damage",
        ) === true) ||
      (mechanics.attachment?.kind === "hole" &&
        mechanics.attachment.value.kind === "object" &&
        mechanics.attachment.value.filter?.material === "metal"))
  );
}

function objectContactDamageDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.level === 2 &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 60 &&
    mechanics.duration.kind === "concentration"
  );
}

function isManufacturedMetalObjectAttachment(
  attachment: OngoingEffectSpellMechanics["attachment"] | undefined,
): attachment is ManufacturedMetalObjectAttachment {
  if (
    attachment?.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      OBJECT_CONTACT_DAMAGE_ATTACHMENT_FIELDS,
    ) ||
    attachment.value.kind !== "object" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      OBJECT_CONTACT_DAMAGE_OBJECT_VALUE_FIELDS,
    ) ||
    attachment.value.count !== 1 ||
    attachment.value.filter === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value.filter,
      OBJECT_CONTACT_DAMAGE_OBJECT_FILTER_FIELDS,
    )
  ) {
    return false;
  }
  return (
    attachment.value.filter.manufactured === true &&
    attachment.value.filter.material === "metal" &&
    attachment.value.filter.visibility === "caster_can_see"
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
  return (
    amount.kind === "linear_per_level" &&
    spellMechanicsObjectHasOnlyKeys(
      amount,
      OBJECT_CONTACT_DAMAGE_AMOUNT_FIELDS,
    ) &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 3 &&
    spellMechanicsObjectHasOnlyKeys(
      amount.base,
      OBJECT_CONTACT_DAMAGE_DICE_EXPR_FIELDS,
    ) &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    spellMechanicsObjectHasOnlyKeys(
      amount.perLevel,
      OBJECT_CONTACT_DAMAGE_DELTA_FIELDS,
    ) &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === undefined
  );
}

function isSupportedObjectContactHoldingOrWearingSave(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  const onFailure = save.onFailure;
  const fallback = onFailure.fallback;
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
    ) &&
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
      fallback,
      OBJECT_CONTACT_DAMAGE_FALLBACK_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      fallback.expiresOn,
      OBJECT_CONTACT_DAMAGE_EXPIRY_FIELDS,
    ) &&
    save.appliesIf.kind === "table_witnessed_holding_or_wearing_spell_object" &&
    save.ability === "con" &&
    save.dc.kind === "caster_spell_save_dc" &&
    save.onSuccess.kind === "none" &&
    onFailure.kind === "drop_if_possible_else_disadvantage" &&
    onFailure.dropCapabilityWitness.kind ===
      "table_witnessed_drop_capability" &&
    onFailure.dropCapabilityWitness.subject === "damaged_creature" &&
    onFailure.dropCapabilityWitness.object === "spell_object" &&
    onFailure.dropResultWitness.kind === "table_witnessed_drop_result" &&
    onFailure.dropResultWitness.subject === "damaged_creature" &&
    onFailure.dropResultWitness.object === "spell_object" &&
    onFailure.fallbackWhen === "object_not_dropped" &&
    fallback.kind === "modify_roll_advantage" &&
    fallback.mode === "disadvantage" &&
    sameStringSet(fallback.on, ["attack_roll", "ability_check"]) &&
    fallback.expiresOn.kind === "caster_turn_start"
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
    left.amount.axis === right.amount.axis &&
    left.amount.startingAtLevel === right.amount.startingAtLevel &&
    left.amount.base.dice === right.amount.base.dice &&
    left.amount.base.dieSize === right.amount.base.dieSize &&
    left.amount.base.flat === right.amount.base.flat &&
    left.amount.base.spellcastingMod === right.amount.base.spellcastingMod &&
    left.amount.base.abilityModifier === right.amount.base.abilityModifier &&
    left.amount.perLevel.dice === right.amount.perLevel.dice &&
    left.amount.perLevel.dieSize === right.amount.perLevel.dieSize &&
    left.amount.perLevel.flat === right.amount.perLevel.flat &&
    left.contact.kind === right.contact.kind
  );
}

function isObjectContactDamageRepeatOperation(
  operation: OngoingOperation | undefined,
): operation is OngoingOperation & {
  readonly effect: ObjectContactDamageEffect;
} {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      OBJECT_CONTACT_DAMAGE_OPERATION_FIELDS,
    ) &&
    operation.predicate !== undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.trigger.kind === "on_caster_spends_action" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      OBJECT_CONTACT_DAMAGE_TRIGGER_FIELDS,
    ) &&
    operation.trigger.cost !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger.cost,
      OBJECT_CONTACT_DAMAGE_COST_FIELDS,
    ) &&
    operation.trigger.cost.kind === "bonus_action" &&
    operation.trigger.laterTurnsOnly === true &&
    spellMechanicsObjectHasOnlyKeys(
      operation.predicate,
      OBJECT_CONTACT_DAMAGE_PREDICATE_FIELDS,
    ) &&
    operation.predicate.kind ===
      "table_witnessed_attachment_within_spell_range" &&
    operation.effect.kind === "object_contact_damage" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      OBJECT_CONTACT_DAMAGE_EFFECT_FIELDS,
    )
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
    range:
      definition.range.kind === mechanics.range.kind &&
      definition.range.kind === "point" &&
      mechanics.range.kind === "point" &&
      definition.range.feet === mechanics.range.feet,
    duration:
      definition.duration.kind === mechanics.duration.kind &&
      definition.duration.kind === "concentration" &&
      mechanics.duration.kind === "concentration" &&
      definition.duration.upTo.unit === mechanics.duration.upTo.unit &&
      definition.duration.upTo.amount === mechanics.duration.upTo.amount,
    components:
      definition.components.verbal === mechanics.components.v &&
      definition.components.somatic === mechanics.components.s &&
      definition.components.hasMaterial === (mechanics.components.m !== false),
  };
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

function inspectObjectContactDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): ObjectContactDamageMechanicsInspection {
  const missingRootIssues = objectContactDamageMissingRootIssues(
    source.mechanics,
  );
  if (missingRootIssues !== undefined) {
    return { tag: "unsupported", issues: missingRootIssues };
  }
  if (
    !objectContactDamageSemanticCandidate(source.mechanics) &&
    !objectContactDamageDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const initialPhase = mechanics.initialPhase;
  const initialEffect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const repeatOperation = mechanics.operations[0];
  const repeatEffect = repeatOperation?.effect;
  const durationSupported =
    mechanics.duration.kind === "concentration" &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      OBJECT_CONTACT_DAMAGE_DURATION_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.duration.upTo,
      OBJECT_CONTACT_DAMAGE_DURATION_VALUE_FIELDS,
    ) &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(mechanics.duration.upTo) &&
    mechanics.duration.upTo.upcastTiers === undefined &&
    mechanics.duration.earlyEnd === undefined &&
    mechanics.duration.permanentIfMaintainedFull === undefined;
  const durationValue =
    mechanics.duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(mechanics.duration.upTo)
      ? mechanics.duration.upTo
      : undefined;
  const rangeFeet =
    mechanics.range.kind === "point" && mechanics.range.feet === 60
      ? movementFeet(mechanics.range.feet)
      : undefined;
  const attachment = isManufacturedMetalObjectAttachment(mechanics.attachment)
    ? mechanics.attachment
    : undefined;
  const initialAttachment =
    initialPhase?.kind === "direct" &&
    isManufacturedMetalObjectAttachment(initialPhase.attachment)
      ? initialPhase.attachment
      : undefined;
  const initialEffectSupported = isObjectContactDamageEffect(initialEffect)
    ? initialEffect
    : undefined;
  const repeatOperationSupported = isObjectContactDamageRepeatOperation(
    repeatOperation,
  )
    ? repeatOperation
    : undefined;
  const repeatEffectSupported = isObjectContactDamageEffect(repeatEffect)
    ? repeatEffect
    : undefined;
  const issues: ObjectContactDamageMechanicsIssue[] = [];
  const push = (
    failedFact: ObjectContactDamageFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (
    mechanics.level !== 2 ||
    source.spellDefinitionRuleFacts.level !== mechanics.level
  )
    push("level", spellMechanicsHeaderPath("level"));
  if (
    !spellMechanicsObjectHasOnlyKeys(
      mechanics,
      OBJECT_CONTACT_DAMAGE_ROOT_FIELDS,
    )
  )
    push("operationCount", spellMechanicsHeaderPath("family"));
  if (mechanics.school !== "transmutation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 60 ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      OBJECT_CONTACT_DAMAGE_RANGE_FIELDS,
    )
  )
    push("range", spellMechanicsHeaderPath("range"));
  const definitionFacts = objectContactDamageDefinitionFactsMatch(
    source,
    mechanics,
  );
  if (!definitionFacts.range) push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      OBJECT_CONTACT_DAMAGE_COMPONENT_FIELDS,
    )
  )
    push("components", spellMechanicsHeaderPath("components"));
  if (!definitionFacts.components)
    push("components", spellMechanicsHeaderPath("components"));
  if (!durationSupported || !definitionFacts.duration) {
    push("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      push("durationValue", path);
    for (const child of spellDurationChildCoordinates(mechanics.duration))
      push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    mechanics.castingTime.ritual !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      OBJECT_CONTACT_DAMAGE_CASTING_TIME_FIELDS,
    )
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (attachment === undefined)
    push("attachment", spellOngoingAttachmentPath());
  if (
    initialPhase?.kind !== "direct" ||
    !spellMechanicsObjectHasOnlyKeys(
      initialPhase,
      OBJECT_CONTACT_DAMAGE_INITIAL_FIELDS,
    ) ||
    initialPhase.mode !== undefined
  )
    push("initialPhase", spellOngoingInitialPhasePath());
  if (
    initialPhase?.kind === "direct" &&
    (initialAttachment === undefined ||
      attachment === undefined ||
      !sameManufacturedMetalObjectHole(attachment, initialAttachment))
  )
    push("initialAttachment", spellOngoingInitialPhasePath());
  if (
    initialPhase?.kind === "direct" &&
    (initialPhase.effects === undefined || initialPhase.effects.length !== 1)
  )
    push("initialEffect", spellOngoingInitialPhasePath());
  if (initialEffectSupported === undefined) {
    push("initialEffect", spellOngoingInitialPhasePath());
    if (
      initialEffect?.kind === "object_contact_damage" &&
      !isSupportedObjectContactDamageAmount(initialEffect.amount)
    )
      push("damageAmount", spellOngoingInitialPhasePath());
  }
  if (mechanics.operations.length !== 1) {
    for (const [index] of mechanics.operations.entries()) {
      if (index === 0) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.operations.length === 0)
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
  }
  if (repeatOperationSupported === undefined) {
    push("repeatOperation", spellOngoingOperationPath(PositiveInteger(1)));
    if (
      repeatOperation !== undefined &&
      (repeatOperation.trigger.kind !== "on_caster_spends_action" ||
        repeatOperation.trigger.cost?.kind !== "bonus_action" ||
        repeatOperation.trigger.laterTurnsOnly !== true)
    )
      push("repeatTrigger", spellOngoingOperationPath(PositiveInteger(1)));
    if (
      repeatOperation !== undefined &&
      repeatOperation.predicate?.kind !==
        "table_witnessed_attachment_within_spell_range"
    )
      push("repeatPredicate", spellOngoingOperationPath(PositiveInteger(1)));
    if (repeatOperation?.effect.kind !== "object_contact_damage")
      push("repeatEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
    else if (
      !isSupportedObjectContactDamageAmount(repeatOperation.effect.amount)
    )
      push("damageAmount", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else if (repeatEffectSupported === undefined) {
    push("repeatEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
    if (
      !isSupportedObjectContactDamageAmount(
        repeatOperationSupported.effect.amount,
      )
    )
      push("damageAmount", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    initialEffectSupported !== undefined &&
    repeatEffectSupported !== undefined &&
    !sameObjectContactDamageEffect(
      initialEffectSupported,
      repeatEffectSupported,
    )
  )
    push("repeatEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));

  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined)
    return {
      tag: "unsupported",
      issues: uniqueIssues,
    };
  if (
    attachment === undefined ||
    initialAttachment === undefined ||
    initialEffectSupported === undefined ||
    repeatOperationSupported === undefined ||
    repeatEffectSupported === undefined ||
    !durationSupported ||
    !definitionFacts.range ||
    !definitionFacts.duration ||
    rangeFeet === undefined ||
    durationValue === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact: "initialEffect",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    rangeFeet,
    durationValue,
    damageAmount: initialEffectSupported.amount,
    damageType: initialEffectSupported.damageType,
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
  const durationTicks = spellDurationTicksFromCanonicalValue(
    facts.durationValue,
  );
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ObjectContactDamageInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const damageExpr = supportedDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: facts.level,
        slotLevel: slot.spellLevel,
      });
      return damageExpr === null
        ? []
        : [
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
              durationTicks,
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
