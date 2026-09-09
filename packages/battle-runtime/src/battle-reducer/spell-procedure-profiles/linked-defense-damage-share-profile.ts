import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
//
// The linkedDefenseResistanceDamageShare Spell Procedure Profile: an action spell that creates one
// paired caster-target bond from caller-supplied willing-target, paired-ring,
// and 60-foot connection witnesses. The active-effect lifecycle and damage
// sharing reducer helpers stay in linked-defense-damage-share.ts because damage application,
// cleanup, Saving Throw projections, and separation acts consume them outside
// cast resolution.

import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { PositiveInteger } from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

import { LinkedDefenseResistanceDamageShareTemplateSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type LinkedDefenseResistanceDamageShareSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  LINKED_DEFENSE_DAMAGE_SHARE_ARMOR_CLASS_BONUS as LINKED_DEFENSE_ARMOR_CLASS_BONUS,
  LINKED_DEFENSE_DAMAGE_SHARE_CAST_RANGE_FEET as LINKED_DEFENSE_CAST_RANGE_FEET,
  LINKED_DEFENSE_DAMAGE_SHARE_CONNECTION_RANGE_FEET as LINKED_DEFENSE_CONNECTION_RANGE_FEET,
  LINKED_DEFENSE_DAMAGE_SHARE_SAVING_THROW_BONUS as LINKED_DEFENSE_SAVING_THROW_BONUS,
} from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  applyLinkedDefenseResistanceDamageShareSpellEffect,
  linkedDefenseResistanceDamageShareCastFactsAreSatisfied,
} from "../linked-defense-damage-share.ts";
import {
  spellTargetHole,
  spellTargetIsKnownWilling,
  spellTargetIsLegal,
} from "../spells-holes-fills.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
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
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type LinkedDefenseResistanceDamageShareMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type LinkedDefenseOperation =
  LinkedDefenseResistanceDamageShareMechanics["operations"][number];
type LinkedDefenseArmorClassEffect = Extract<
  LinkedDefenseOperation["effect"],
  { readonly kind: "modify_ac" }
>;
type LinkedDefenseSavingThrowEffect = Extract<
  LinkedDefenseOperation["effect"],
  { readonly kind: "modify_roll_numeric" }
>;
type LinkedDefenseResistanceEffect = Extract<
  LinkedDefenseOperation["effect"],
  { readonly kind: "grant_resistance" }
>;
type LinkedDefenseBondAttachment = Extract<
  LinkedDefenseResistanceDamageShareMechanics["attachment"],
  { readonly kind: "caster_target_bond" }
>;
type LinkedDefenseTargetSelection = Extract<
  Extract<
    LinkedDefenseBondAttachment["target"],
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "target" }
>["selection"];
type LinkedDefenseResistanceDamageShareFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for LinkedDefenseResistanceDamageShareFailedFact.
const LINKED_DEFENSE_RESISTANCE_DAMAGE_SHARE_FAILED_FACTS = [
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
  "attachment",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "armorClassOperation",
  "savingThrowOperation",
  "resistanceOperation",
  "damageShareOperation",
] as const;
type LinkedDefenseResistanceDamageShareFailedFact =
  (typeof LINKED_DEFENSE_RESISTANCE_DAMAGE_SHARE_FAILED_FACTS)[number];
type LinkedDefenseResistanceDamageShareIssue = SpellProcedureAdmissionIssue<
  "linkedDefenseResistanceDamageShare",
  LinkedDefenseResistanceDamageShareFailedFact,
  UnitMechanicsPath
>;
type LinkedDefenseResistanceDamageShareMechanicsIssue = {
  readonly failedFact: LinkedDefenseResistanceDamageShareFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};
type LinkedDefenseResistanceDamageShareMechanicsIssueCandidate =
  LinkedDefenseResistanceDamageShareMechanicsIssue | null;

type LinkedDefenseDuration = Extract<
  LinkedDefenseResistanceDamageShareMechanics["duration"],
  { readonly kind: "timed" }
>;
type LinkedDefenseDurationEnding = NonNullable<
  LinkedDefenseDuration["earlyEnd"]
>[number];
const LINKED_DEFENSE_ROOT_FIELDS = [
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
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<
  keyof LinkedDefenseResistanceDamageShareMechanics
>;
const LINKED_DEFENSE_RANGE_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_CASTING_TIME_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_COMPONENT_FIELDS = ["v", "s", "m"] as const;
const LINKED_DEFENSE_MATERIAL_FIELDS = [
  "kind",
  "itemKind",
  "material",
  "minimumValueGpEach",
  "requiredFor",
  "wornBy",
] as const;
const LINKED_DEFENSE_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const satisfies ReadonlyArray<keyof LinkedDefenseDuration>;
const LINKED_DEFENSE_DURATION_VALUE_FIELDS = ["unit", "amount"] as const;
const LINKED_DEFENSE_ENDING_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_ENDING_KINDS = [
  "caster_drops_to_0_hp",
  "attached_bond_exceeds_range",
  "spell_cast_again_on_connected_creature",
] as const;
const LINKED_DEFENSE_ATTACHMENT_FIELDS = ["kind", "target", "range"] as const;
const LINKED_DEFENSE_BOND_RANGE_FIELDS = ["kind", "feet"] as const;
const LINKED_DEFENSE_TARGET_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const;
const LINKED_DEFENSE_TARGET_VALUE_FIELDS = ["kind", "selection"] as const;
const LINKED_DEFENSE_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
] as const;
const LINKED_DEFENSE_PASSIVE_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "effect",
] as const;
const LINKED_DEFENSE_DAMAGE_SHARE_OPERATION_FIELDS = [
  "trigger",
  "effect",
] as const;
const LINKED_DEFENSE_TRIGGER_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_PREDICATE_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_AC_EFFECT_FIELDS = ["kind", "delta"] as const;
const LINKED_DEFENSE_ROLL_EFFECT_FIELDS = ["kind", "on", "delta"] as const;
const LINKED_DEFENSE_DELTA_FIELDS = [
  "kind",
  "sign",
  "dice",
  "dieSize",
] as const;
const LINKED_DEFENSE_RESISTANCE_EFFECT_FIELDS = ["kind", "damageType"] as const;
const LINKED_DEFENSE_DAMAGE_TYPE_FIELDS = ["kind"] as const;
const LINKED_DEFENSE_DAMAGE_SHARE_EFFECT_FIELDS = ["kind", "amount"] as const;

function linkedDefenseResistanceDamageShareIssue(
  failedFact: LinkedDefenseResistanceDamageShareFailedFact,
  mechanicsPath: UnitMechanicsPath,
): LinkedDefenseResistanceDamageShareIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "linkedDefenseResistanceDamageShare",
    failedFact,
    mechanicsPath,
    message: `Unsupported linkedDefenseResistanceDamageShare mechanics fact: ${failedFact}.`,
  };
}

function linkedDefenseResistanceDamageShareMechanicsIssue(
  failedFact: LinkedDefenseResistanceDamageShareFailedFact,
  mechanicsPath: UnitMechanicsPath,
): LinkedDefenseResistanceDamageShareMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function linkedDefenseResistanceDamageSharePresentMechanicsIssues(
  candidates: readonly LinkedDefenseResistanceDamageShareMechanicsIssueCandidate[],
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return candidates.filter(
    (
      candidate,
    ): candidate is LinkedDefenseResistanceDamageShareMechanicsIssue =>
      candidate !== null,
  );
}

function linkedDefenseResistanceDamageShareStructuralCandidate(
  mechanics: SpellMechanics,
): mechanics is LinkedDefenseResistanceDamageShareMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasHeader =
    linkedDefenseResistanceDamageShareHeaderIsRepresented(mechanics);
  const hasMaterial =
    linkedDefenseResistanceDamageShareMaterialComponentIsSupported(
      mechanics.components.m,
    );
  const hasDuration =
    linkedDefenseResistanceDamageShareDurationValue(mechanics.duration) !==
      undefined &&
    mechanics.duration.kind === "timed" &&
    linkedDefenseResistanceDamageShareEarlyEndsAreSupported(
      mechanics.duration.earlyEnd,
    );
  const hasBondAttachment =
    linkedDefenseResistanceDamageShareAttachmentIsSupported(
      mechanics.attachment,
    );
  const hasOperations =
    linkedDefenseResistanceDamageShareOperationsAreRepresented(
      mechanics.operations,
    );
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      { name: "header", present: hasHeader },
      { name: "material", present: hasMaterial },
      { name: "duration", present: hasDuration },
      { name: "attachment", present: hasBondAttachment },
      { name: "operations", present: hasOperations },
    ],
  });
}

function linkedDefenseResistanceDamageShareHeaderIsRepresented(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): boolean {
  return (
    mechanics.level === 2 &&
    mechanics.school === "abjuration" &&
    mechanics.range.kind === "touch" &&
    mechanics.castingTime.kind === "action" &&
    mechanics.components.v === true &&
    mechanics.components.s === true
  );
}

function linkedDefenseResistanceDamageShareOperationsAreRepresented(
  operations: LinkedDefenseResistanceDamageShareMechanics["operations"],
): boolean {
  return (
    operations.length === 4 &&
    operations.some(({ effect }) => effect.kind === "modify_ac") &&
    operations.some(({ effect }) => effect.kind === "modify_roll_numeric") &&
    operations.some(({ effect }) => effect.kind === "grant_resistance") &&
    operations.some(({ effect }) => effect.kind === "share_damage_to_caster")
  );
}

function linkedDefenseResistanceDamageShareDurationValue(
  duration: SpellMechanics["duration"],
): SpellCanonicalDurationValue | undefined {
  return duration.kind === "timed" &&
    spellMechanicsObjectHasOnlyKeys(duration, LINKED_DEFENSE_DURATION_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.value,
      LINKED_DEFENSE_DURATION_VALUE_FIELDS,
    ) &&
    duration.value.unit === "hour" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
    ? duration.value
    : undefined;
}

function linkedDefenseResistanceDamageShareAttachmentIsSupported(
  attachment: LinkedDefenseResistanceDamageShareMechanics["attachment"],
): boolean {
  if (
    attachment.kind !== "caster_target_bond" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      LINKED_DEFENSE_ATTACHMENT_FIELDS,
    )
  )
    return false;
  return (
    linkedDefenseResistanceDamageShareBondRangeIsSupported(attachment.range) &&
    linkedDefenseResistanceDamageShareTargetIsSupported(attachment.target)
  );
}

function linkedDefenseResistanceDamageShareBondRangeIsSupported(
  range: Extract<
    LinkedDefenseResistanceDamageShareMechanics["attachment"],
    { readonly kind: "caster_target_bond" }
  >["range"],
): boolean {
  return (
    range.kind === "within_feet" &&
    spellMechanicsObjectHasOnlyKeys(range, LINKED_DEFENSE_BOND_RANGE_FIELDS) &&
    range.feet === Number(LINKED_DEFENSE_CONNECTION_RANGE_FEET)
  );
}

function linkedDefenseResistanceDamageShareTargetIsSupported(
  target: Extract<
    LinkedDefenseResistanceDamageShareMechanics["attachment"],
    { readonly kind: "caster_target_bond" }
  >["target"],
): boolean {
  if (
    target.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(target, LINKED_DEFENSE_TARGET_FIELDS)
  )
    return false;
  if (
    target.value.kind !== "target" ||
    !spellMechanicsObjectHasOnlyKeys(
      target.value,
      LINKED_DEFENSE_TARGET_VALUE_FIELDS,
    )
  )
    return false;
  return linkedDefenseResistanceDamageShareTargetSelectionIsSupported(
    target.value.selection,
  );
}

function linkedDefenseResistanceDamageShareTargetSelectionIsSupported(
  selection: LinkedDefenseTargetSelection,
): boolean {
  if (selection.mode !== "one") return false;
  if (!("disposition" in selection)) return false;
  return (
    selection.disposition === "willing" &&
    spellMechanicsObjectHasOnlyKeys(
      selection,
      LINKED_DEFENSE_TARGET_SELECTION_FIELDS,
    ) &&
    sameStringSet(selection.targetKinds ?? [], ["creature"])
  );
}

function linkedDefenseResistanceDamageShareMaterialComponentIsSupported(
  material: LinkedDefenseResistanceDamageShareMechanics["components"]["m"],
): boolean {
  if (typeof material !== "object") return false;
  if (material === null) return false;
  if (material.kind !== "paired_worn_items") return false;
  return linkedDefenseResistanceDamageSharePairedMaterialIsSupported(material);
}

function linkedDefenseResistanceDamageSharePairedMaterialIsSupported(
  material: Extract<
    NonNullable<
      Extract<
        BattleSpellAdmissionSource["mechanics"],
        { readonly components: unknown }
      >["components"]["m"]
    >,
    { readonly kind: "paired_worn_items" }
  >,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(material, LINKED_DEFENSE_MATERIAL_FIELDS) &&
    material.itemKind === "ring" &&
    material.material === "platinum" &&
    material.minimumValueGpEach === 50 &&
    material.requiredFor === "spell_duration" &&
    sameStringSet(material.wornBy, ["caster", "target"])
  );
}

function linkedDefenseResistanceDamageShareEarlyEndsAreSupported(
  earlyEnds: readonly LinkedDefenseDurationEnding[] | undefined,
): boolean {
  return (
    earlyEnds !== undefined &&
    earlyEnds.length === LINKED_DEFENSE_ENDING_KINDS.length &&
    earlyEnds.every((ending) =>
      spellMechanicsObjectHasOnlyKeys(ending, LINKED_DEFENSE_ENDING_FIELDS),
    ) &&
    LINKED_DEFENSE_ENDING_KINDS.every((kind) =>
      earlyEnds.some((ending) => ending.kind === kind),
    )
  );
}

function linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    operation.predicate?.kind === "attached_bond_within_range" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.predicate,
      LINKED_DEFENSE_PREDICATE_FIELDS,
    )
  );
}

function linkedDefenseResistanceDamageShareOperationShellIsSupported(
  operation: LinkedDefenseResistanceDamageShareMechanics["operations"][number],
): boolean {
  const requiresPredicate = operation.effect.kind !== "share_damage_to_caster";
  const expectedFields = requiresPredicate
    ? LINKED_DEFENSE_PASSIVE_OPERATION_FIELDS
    : LINKED_DEFENSE_DAMAGE_SHARE_OPERATION_FIELDS;
  const expectedTrigger = requiresPredicate ? "passive" : "on_attached_damaged";
  return (
    spellMechanicsObjectHasOnlyKeys(operation, expectedFields) &&
    operation.trigger.kind === expectedTrigger &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      LINKED_DEFENSE_TRIGGER_FIELDS,
    ) &&
    (!requiresPredicate ||
      linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
        operation,
      ))
  );
}

function linkedDefenseResistanceDamageShareArmorClassOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  if (effect.kind !== "modify_ac") return false;
  return (
    linkedDefenseResistanceDamageShareOperationShellIsSupported(operation) &&
    linkedDefenseResistanceDamageShareArmorClassEffectIsSupported(effect)
  );
}

function linkedDefenseResistanceDamageShareArmorClassEffectIsSupported(
  effect: LinkedDefenseArmorClassEffect,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(effect, LINKED_DEFENSE_AC_EFFECT_FIELDS) &&
    effect.delta.kind === "fixed_dice" &&
    spellMechanicsObjectHasOnlyKeys(
      effect.delta,
      LINKED_DEFENSE_DELTA_FIELDS,
    ) &&
    effect.delta.sign === "+" &&
    effect.delta.dice === LINKED_DEFENSE_ARMOR_CLASS_BONUS &&
    effect.delta.dieSize === 1
  );
}

function linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  if (effect.kind !== "modify_roll_numeric") return false;
  return (
    linkedDefenseResistanceDamageShareOperationShellIsSupported(operation) &&
    linkedDefenseResistanceDamageShareSavingThrowEffectIsSupported(effect)
  );
}

function linkedDefenseResistanceDamageShareSavingThrowEffectIsSupported(
  effect: LinkedDefenseSavingThrowEffect,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      effect,
      LINKED_DEFENSE_ROLL_EFFECT_FIELDS,
    ) &&
    sameStringSet(effect.on, ["saving_throw"]) &&
    effect.delta.kind === "fixed_dice" &&
    spellMechanicsObjectHasOnlyKeys(
      effect.delta,
      LINKED_DEFENSE_DELTA_FIELDS,
    ) &&
    effect.delta.sign === "+" &&
    effect.delta.dice === LINKED_DEFENSE_SAVING_THROW_BONUS &&
    effect.delta.dieSize === 1
  );
}

function linkedDefenseResistanceDamageShareResistanceOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  if (effect.kind !== "grant_resistance") return false;
  return (
    linkedDefenseResistanceDamageShareOperationShellIsSupported(operation) &&
    linkedDefenseResistanceDamageShareResistanceEffectIsSupported(effect)
  );
}

function linkedDefenseResistanceDamageShareResistanceEffectIsSupported(
  effect: LinkedDefenseResistanceEffect,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      effect,
      LINKED_DEFENSE_RESISTANCE_EFFECT_FIELDS,
    ) &&
    typeof effect.damageType === "object" &&
    effect.damageType !== null &&
    effect.damageType.kind === "all_damage_types" &&
    spellMechanicsObjectHasOnlyKeys(
      effect.damageType,
      LINKED_DEFENSE_DAMAGE_TYPE_FIELDS,
    )
  );
}

function linkedDefenseResistanceDamageShareDamageShareOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      LINKED_DEFENSE_DAMAGE_SHARE_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "on_attached_damaged" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      LINKED_DEFENSE_TRIGGER_FIELDS,
    ) &&
    operation.effect.kind === "share_damage_to_caster" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      LINKED_DEFENSE_DAMAGE_SHARE_EFFECT_FIELDS,
    ) &&
    operation.effect.amount === "same_as_attached_damage_taken"
  );
}

type LinkedDefenseOperationCheck = {
  readonly failedFact: Extract<
    LinkedDefenseResistanceDamageShareFailedFact,
    | "armorClassOperation"
    | "savingThrowOperation"
    | "resistanceOperation"
    | "damageShareOperation"
  >;
  readonly represented: (operation: LinkedDefenseOperation) => boolean;
  readonly supported: (operation: LinkedDefenseOperation) => boolean;
};

const LINKED_DEFENSE_OPERATION_CHECKS = [
  {
    failedFact: "armorClassOperation",
    represented: (operation: LinkedDefenseOperation) =>
      operation.effect.kind === "modify_ac",
    supported: linkedDefenseResistanceDamageShareArmorClassOperationIsSupported,
  },
  {
    failedFact: "savingThrowOperation",
    represented: (operation: LinkedDefenseOperation) =>
      operation.effect.kind === "modify_roll_numeric",
    supported:
      linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported,
  },
  {
    failedFact: "resistanceOperation",
    represented: (operation: LinkedDefenseOperation) =>
      operation.effect.kind === "grant_resistance",
    supported: linkedDefenseResistanceDamageShareResistanceOperationIsSupported,
  },
  {
    failedFact: "damageShareOperation",
    represented: (operation: LinkedDefenseOperation) =>
      operation.effect.kind === "share_damage_to_caster",
    supported:
      linkedDefenseResistanceDamageShareDamageShareOperationIsSupported,
  },
] as const satisfies readonly LinkedDefenseOperationCheck[];

function linkedDefenseResistanceDamageShareLevelAndSchoolIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return linkedDefenseResistanceDamageSharePresentMechanicsIssues([
    mechanics.level !== 2
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "level",
          spellMechanicsHeaderPath("level"),
        )
      : null,
    mechanics.school !== "abjuration"
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "school",
          spellMechanicsHeaderPath("school"),
        )
      : null,
  ]);
}

function linkedDefenseResistanceDamageShareRangeAndCastingTimeIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return linkedDefenseResistanceDamageSharePresentMechanicsIssues([
    mechanics.range.kind !== "touch" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      LINKED_DEFENSE_RANGE_FIELDS,
    )
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "range",
          spellMechanicsHeaderPath("range"),
        )
      : null,
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      LINKED_DEFENSE_CASTING_TIME_FIELDS,
    )
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        )
      : null,
  ]);
}

function linkedDefenseResistanceDamageShareComponentIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return linkedDefenseResistanceDamageSharePresentMechanicsIssues([
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      LINKED_DEFENSE_COMPONENT_FIELDS,
    )
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "components",
          spellMechanicsHeaderPath("components"),
        )
      : null,
    !linkedDefenseResistanceDamageShareMaterialComponentIsSupported(
      mechanics.components.m,
    )
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "components",
          spellMaterialComponentPath("cost"),
        )
      : null,
  ]);
}

function linkedDefenseResistanceDamageShareHeaderIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return [
    ...linkedDefenseResistanceDamageShareLevelAndSchoolIssues(mechanics),
    ...linkedDefenseResistanceDamageShareRangeAndCastingTimeIssues(mechanics),
    ...linkedDefenseResistanceDamageShareComponentIssues(mechanics),
  ];
}

function linkedDefenseResistanceDamageShareAuthoredEndingIssues(
  duration: LinkedDefenseDuration,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  const earlyEnds = duration.earlyEnd;
  if (earlyEnds === undefined) return [];
  const seenEndingKinds = new Set<LinkedDefenseDurationEnding["kind"]>();
  return earlyEnds.flatMap((ending, index) => {
    const supportedKind = LINKED_DEFENSE_ENDING_KINDS.some(
      (kind) => kind === ending.kind,
    );
    const duplicateKind = seenEndingKinds.has(ending.kind);
    seenEndingKinds.add(ending.kind);
    return !supportedKind ||
      duplicateKind ||
      !spellMechanicsObjectHasOnlyKeys(ending, LINKED_DEFENSE_ENDING_FIELDS)
      ? [
          linkedDefenseResistanceDamageShareMechanicsIssue(
            "durationEnding",
            spellDurationEndingPath(PositiveInteger(index + 1)),
          ),
        ]
      : [];
  });
}

function linkedDefenseResistanceDamageShareMissingEndingIssues(
  duration: LinkedDefenseDuration,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  const endingCount = duration.earlyEnd?.length ?? 0;
  return Array.from(
    {
      length: Math.max(0, LINKED_DEFENSE_ENDING_KINDS.length - endingCount),
    },
    (_unused, index) =>
      linkedDefenseResistanceDamageShareMechanicsIssue(
        "durationEnding",
        spellDurationEndingPath(PositiveInteger(endingCount + index + 1)),
      ),
  );
}

function linkedDefenseResistanceDamageShareTimedDurationIssues(
  duration: LinkedDefenseDuration,
  durationValue: SpellCanonicalDurationValue | undefined,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  const durationValueIssues =
    linkedDefenseResistanceDamageSharePresentMechanicsIssues([
      durationValue === undefined
        ? linkedDefenseResistanceDamageShareMechanicsIssue(
            "durationValue",
            spellDurationValuePath(),
          )
        : null,
    ]);
  const permanentAfterIssues =
    linkedDefenseResistanceDamageSharePresentMechanicsIssues([
      duration.permanentAfter !== undefined
        ? linkedDefenseResistanceDamageShareMechanicsIssue(
            "durationEnding",
            spellDurationEndingPath(
              PositiveInteger((duration.earlyEnd?.length ?? 0) + 1),
            ),
          )
        : null,
    ]);
  return [
    ...durationValueIssues,
    ...spellDurationChildCoordinates(duration)
      .filter((child) => child.branch === "extension")
      .map((child) =>
        linkedDefenseResistanceDamageShareMechanicsIssue(
          "durationExtension",
          spellDurationChildPath(child),
        ),
      ),
    ...linkedDefenseResistanceDamageShareAuthoredEndingIssues(duration),
    ...linkedDefenseResistanceDamageShareMissingEndingIssues(duration),
    ...permanentAfterIssues,
  ];
}

function linkedDefenseResistanceDamageShareDurationIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
  durationValue: SpellCanonicalDurationValue | undefined,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  if (mechanics.duration.kind !== "timed") {
    return [
      linkedDefenseResistanceDamageShareMechanicsIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    ];
  }
  return linkedDefenseResistanceDamageShareTimedDurationIssues(
    mechanics.duration,
    durationValue,
  );
}

function linkedDefenseResistanceDamageShareRootIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return linkedDefenseResistanceDamageSharePresentMechanicsIssues([
    mechanics.initialPhase !== undefined
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "initialPhase",
          spellOngoingInitialPhasePath(),
        )
      : null,
    !spellMechanicsObjectHasOnlyKeys(mechanics, LINKED_DEFENSE_ROOT_FIELDS)
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "mechanics",
          spellMechanicsRootPath(),
        )
      : null,
    mechanics.authoredConditionalMechanics !== undefined
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "authoredConditionalMechanics",
          spellMechanicsRootPath(),
        )
      : null,
    !linkedDefenseResistanceDamageShareAttachmentIsSupported(
      mechanics.attachment,
    )
      ? linkedDefenseResistanceDamageShareMechanicsIssue(
          "attachment",
          spellOngoingAttachmentPath(),
        )
      : null,
  ]);
}

type LinkedDefenseRepresentedOperation = {
  readonly operation: LinkedDefenseOperation;
  readonly index: number;
};

function linkedDefenseResistanceDamageShareRepresentedOperations(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
  check: LinkedDefenseOperationCheck,
): readonly LinkedDefenseRepresentedOperation[] {
  return mechanics.operations.flatMap((operation, index) =>
    check.represented(operation) ? [{ operation, index }] : [],
  );
}

function linkedDefenseResistanceDamageShareMissingOperationRoleIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return LINKED_DEFENSE_OPERATION_CHECKS.filter(
    (check) => !mechanics.operations.some(check.represented),
  ).map((check, missingIndex) =>
    linkedDefenseResistanceDamageShareMechanicsIssue(
      check.failedFact,
      spellOngoingOperationEffectPath(
        PositiveInteger(mechanics.operations.length + missingIndex + 1),
      ),
    ),
  );
}

function linkedDefenseResistanceDamageShareOperationCheckIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
  check: LinkedDefenseOperationCheck,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  const represented = linkedDefenseResistanceDamageShareRepresentedOperations(
    mechanics,
    check,
  );
  const unsupportedIssues = represented.flatMap(({ operation, index }) => {
    if (check.supported(operation)) return [];
    const mechanicsPath =
      linkedDefenseResistanceDamageShareOperationShellIsSupported(operation)
        ? spellOngoingOperationEffectPath(PositiveInteger(index + 1))
        : spellOngoingOperationPath(PositiveInteger(index + 1));
    return [
      linkedDefenseResistanceDamageShareMechanicsIssue(
        check.failedFact,
        mechanicsPath,
      ),
    ];
  });
  const duplicateIssues = represented
    .slice(1)
    .map(({ index }) =>
      linkedDefenseResistanceDamageShareMechanicsIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      ),
    );
  return [...unsupportedIssues, ...duplicateIssues];
}

function linkedDefenseResistanceDamageShareUnknownOperationIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return mechanics.operations.flatMap((operation, index) =>
    LINKED_DEFENSE_OPERATION_CHECKS.some((check) =>
      check.represented(operation),
    )
      ? []
      : [
          linkedDefenseResistanceDamageShareMechanicsIssue(
            "operationCount",
            spellOngoingOperationPath(PositiveInteger(index + 1)),
          ),
        ],
  );
}

function linkedDefenseResistanceDamageShareMissingOperationCountIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  const missingCount = Math.max(
    0,
    LINKED_DEFENSE_OPERATION_CHECKS.length - mechanics.operations.length,
  );
  return Array.from({ length: missingCount }, (_unused, index) =>
    linkedDefenseResistanceDamageShareMechanicsIssue(
      "operationCount",
      spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + index + 1),
      ),
    ),
  );
}

function linkedDefenseResistanceDamageShareOperationIssues(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
): readonly LinkedDefenseResistanceDamageShareMechanicsIssue[] {
  return [
    ...linkedDefenseResistanceDamageShareMissingOperationRoleIssues(mechanics),
    ...LINKED_DEFENSE_OPERATION_CHECKS.flatMap((check) =>
      linkedDefenseResistanceDamageShareOperationCheckIssues(mechanics, check),
    ),
    ...linkedDefenseResistanceDamageShareUnknownOperationIssues(mechanics),
    ...linkedDefenseResistanceDamageShareMissingOperationCountIssues(mechanics),
  ];
}

function linkedDefenseResistanceDamageShareMechanicsEvidence(
  mechanics: LinkedDefenseResistanceDamageShareMechanics,
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
      spellOngoingAttachmentPath(),
      ...mechanics.operations.flatMap((_operation, index) => [
        spellOngoingOperationPath(PositiveInteger(index + 1)),
        spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
      ]),
    ],
    unowned: [],
  };
}

function admitLinkedDefenseResistanceDamageShareMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "linkedDefenseResistanceDamageShare",
  LinkedDefenseResistanceDamageShareFacts,
  LinkedDefenseResistanceDamageShareSpellInvocation,
  LinkedDefenseResistanceDamageShareIssue
> {
  if (!linkedDefenseResistanceDamageShareStructuralCandidate(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const durationValue = linkedDefenseResistanceDamageShareDurationValue(
    mechanics.duration,
  );
  const issues = [
    ...linkedDefenseResistanceDamageShareHeaderIssues(mechanics),
    ...linkedDefenseResistanceDamageShareDurationIssues(
      mechanics,
      durationValue,
    ),
    ...linkedDefenseResistanceDamageShareRootIssues(mechanics),
    ...linkedDefenseResistanceDamageShareOperationIssues(mechanics),
  ];
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(nonEmptyIssues, (issue) =>
        linkedDefenseResistanceDamageShareIssue(
          issue.failedFact,
          issue.mechanicsPath,
        ),
      ),
    };
  }
  if (durationValue === undefined) {
    return {
      tag: "unsupported",
      issues: [
        linkedDefenseResistanceDamageShareIssue(
          "durationValue",
          spellDurationValuePath(),
        ),
      ],
    };
  }
  const durationTicks = spellDurationTicksFromCanonicalValue(durationValue);
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks,
  } satisfies LinkedDefenseResistanceDamageShareFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "linkedDefenseResistanceDamageShare",
      facts,
      evidence: linkedDefenseResistanceDamageShareMechanicsEvidence(mechanics),
      admit: (spell, ctx) =>
        admitLinkedDefenseResistanceDamageShare(spell, ctx, facts),
    },
  };
}

function linkedDefenseResistanceDamageShareSpellProjection(
  actorId: CombatantId,
  facts: LinkedDefenseResistanceDamageShareFacts,
): Pick<
  LinkedDefenseResistanceDamageShareSpellInvocation,
  "activeEffect" | "rangeFeet" | "connectionRangeFeet"
> {
  return {
    rangeFeet: LINKED_DEFENSE_CAST_RANGE_FEET,
    connectionRangeFeet: LINKED_DEFENSE_CONNECTION_RANGE_FEET,
    activeEffect: {
      kind: "linkedDefenseResistanceDamageShare",
      sourceCombatantId: actorId,
      expiresAt: { kind: "duration", durationTicks: facts.durationTicks },
    },
  };
}

function admitLinkedDefenseResistanceDamageShare(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: LinkedDefenseResistanceDamageShareFacts,
): readonly LinkedDefenseResistanceDamageShareSpellInvocation[] {
  const projection = linkedDefenseResistanceDamageShareSpellProjection(
    ctx.actor.combatantId,
    facts,
  );
  return ctx.spellCastOptions.flatMap(
    (slot): readonly LinkedDefenseResistanceDamageShareSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "linkedDefenseResistanceDamageShare",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function discoverLinkedDefenseResistanceDamageShareCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<LinkedDefenseResistanceDamageShareSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveLinkedDefenseResistanceDamageShare(
  input: SpellProcedureProfileResolveInput<LinkedDefenseResistanceDamageShareSpellInvocation>,
): BattleResolutionResult {
  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills, [targetHole.holeId])) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "linked defense damage share uses one willing target with paired worn rings and connection range facts.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }

  const target = input.input.state.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    ) ||
    !spellTargetIsKnownWilling(
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    ) ||
    !linkedDefenseResistanceDamageShareCastFactsAreSatisfied({
      casterId: input.actorId,
      targetId: target.combatantId,
      invocation: input.invocation,
      facts: input.fillSet.targetSpatialFacts,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "linked defense damage share target must be another willing creature with paired worn platinum rings within 60 feet.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [target.combatantId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyLinkedDefenseResistanceDamageShareSpellEffect(
    input.input.state,
    input.actorId,
    target.combatantId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

const LinkedDefenseResistanceDamageShareInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("linkedDefenseResistanceDamageShare"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: LinkedDefenseResistanceDamageShareTemplateSchema,
      rangeFeet: MovementFeet,
      connectionRangeFeet: MovementFeet,
    }),
  );
export const linkedDefenseResistanceDamageShareProfile: SpellProcedureDeclaration<
  "linkedDefenseResistanceDamageShare",
  LinkedDefenseResistanceDamageShareSpellInvocation,
  LinkedDefenseResistanceDamageShareFacts,
  LinkedDefenseResistanceDamageShareIssue
> = {
  procedure: "linkedDefenseResistanceDamageShare",
  executionSchema: LinkedDefenseResistanceDamageShareInvocationSchema,
  admitMechanics: admitLinkedDefenseResistanceDamageShareMechanics,
  discoverCastAct: discoverLinkedDefenseResistanceDamageShareCastAct,
  resolve: resolveLinkedDefenseResistanceDamageShare,
};
