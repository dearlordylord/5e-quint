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
type LinkedDefenseResistanceDamageShareFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for LinkedDefenseResistanceDamageShareFailedFact.
const LINKED_DEFENSE_RESISTANCE_DAMAGE_SHARE_FAILED_FACTS = [
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
  "authoredConditionalEffects",
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
  "authoredConditionalEffects",
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

function linkedDefenseResistanceDamageShareStructuralCandidate(
  mechanics: SpellMechanics,
): mechanics is LinkedDefenseResistanceDamageShareMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasHeader =
    mechanics.level === 2 &&
    mechanics.school === "abjuration" &&
    mechanics.range.kind === "touch" &&
    mechanics.castingTime.kind === "action" &&
    mechanics.components.v === true &&
    mechanics.components.s === true;
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
    mechanics.operations.length === 4 &&
    mechanics.operations.some(({ effect }) => effect.kind === "modify_ac") &&
    mechanics.operations.some(
      ({ effect }) => effect.kind === "modify_roll_numeric",
    ) &&
    mechanics.operations.some(
      ({ effect }) => effect.kind === "grant_resistance",
    ) &&
    mechanics.operations.some(
      ({ effect }) => effect.kind === "share_damage_to_caster",
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
  const selection = target.value.selection;
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
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      LINKED_DEFENSE_PASSIVE_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      LINKED_DEFENSE_TRIGGER_FIELDS,
    ) &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "modify_ac" &&
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
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      LINKED_DEFENSE_PASSIVE_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      LINKED_DEFENSE_TRIGGER_FIELDS,
    ) &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "modify_roll_numeric" &&
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
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      LINKED_DEFENSE_PASSIVE_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      LINKED_DEFENSE_TRIGGER_FIELDS,
    ) &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "grant_resistance" &&
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
  const issues: Array<{
    readonly failedFact: LinkedDefenseResistanceDamageShareFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: LinkedDefenseResistanceDamageShareFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 2)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "touch" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      LINKED_DEFENSE_RANGE_FIELDS,
    )
  )
    pushIssue("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      LINKED_DEFENSE_CASTING_TIME_FIELDS,
    )
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      LINKED_DEFENSE_COMPONENT_FIELDS,
    )
  )
    pushIssue("components", spellMechanicsHeaderPath("components"));
  if (
    !linkedDefenseResistanceDamageShareMaterialComponentIsSupported(
      mechanics.components.m,
    )
  )
    pushIssue("components", spellMaterialComponentPath("cost"));

  const durationValue = linkedDefenseResistanceDamageShareDurationValue(
    mechanics.duration,
  );
  if (mechanics.duration.kind !== "timed") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  } else {
    if (durationValue === undefined)
      pushIssue("durationValue", spellDurationValuePath());
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      if (child.branch === "extension")
        pushIssue("durationExtension", spellDurationChildPath(child));
    }
    const earlyEnd = mechanics.duration.earlyEnd;
    if (earlyEnd !== undefined) {
      const seenEndingKinds = new Set<LinkedDefenseDurationEnding["kind"]>();
      for (const [index, ending] of earlyEnd.entries()) {
        const supportedKind = LINKED_DEFENSE_ENDING_KINDS.some(
          (kind) => kind === ending.kind,
        );
        if (
          !supportedKind ||
          seenEndingKinds.has(ending.kind) ||
          !spellMechanicsObjectHasOnlyKeys(ending, LINKED_DEFENSE_ENDING_FIELDS)
        ) {
          pushIssue(
            "durationEnding",
            spellDurationEndingPath(PositiveInteger(index + 1)),
          );
        }
        seenEndingKinds.add(ending.kind);
      }
    }
    const endingCount = earlyEnd?.length ?? 0;
    for (
      let missingOrdinal = endingCount + 1;
      missingOrdinal <= LINKED_DEFENSE_ENDING_KINDS.length;
      missingOrdinal += 1
    ) {
      pushIssue(
        "durationEnding",
        spellDurationEndingPath(PositiveInteger(missingOrdinal)),
      );
    }
    if (mechanics.duration.permanentAfter !== undefined) {
      pushIssue(
        "durationEnding",
        spellDurationEndingPath(
          PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
        ),
      );
    }
  }
  if (mechanics.initialPhase !== undefined)
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  if (mechanics.authoredConditionalEffects !== undefined)
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, LINKED_DEFENSE_ROOT_FIELDS))
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
  if (
    !linkedDefenseResistanceDamageShareAttachmentIsSupported(
      mechanics.attachment,
    )
  )
    pushIssue("attachment", spellOngoingAttachmentPath());

  const operationChecks = [
    {
      failedFact: "armorClassOperation" as const,
      represented: (
        operation: LinkedDefenseResistanceDamageShareMechanics["operations"][number],
      ) => operation.effect.kind === "modify_ac",
      supported:
        linkedDefenseResistanceDamageShareArmorClassOperationIsSupported,
    },
    {
      failedFact: "savingThrowOperation" as const,
      represented: (
        operation: LinkedDefenseResistanceDamageShareMechanics["operations"][number],
      ) => operation.effect.kind === "modify_roll_numeric",
      supported:
        linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported,
    },
    {
      failedFact: "resistanceOperation" as const,
      represented: (
        operation: LinkedDefenseResistanceDamageShareMechanics["operations"][number],
      ) => operation.effect.kind === "grant_resistance",
      supported:
        linkedDefenseResistanceDamageShareResistanceOperationIsSupported,
    },
    {
      failedFact: "damageShareOperation" as const,
      represented: (
        operation: LinkedDefenseResistanceDamageShareMechanics["operations"][number],
      ) => operation.effect.kind === "share_damage_to_caster",
      supported:
        linkedDefenseResistanceDamageShareDamageShareOperationIsSupported,
    },
  ] as const;
  const missingOperationChecks = operationChecks.filter(
    (check) => !mechanics.operations.some(check.represented),
  );
  for (const [missingIndex, check] of missingOperationChecks.entries()) {
    pushIssue(
      check.failedFact,
      spellOngoingOperationEffectPath(
        PositiveInteger(mechanics.operations.length + missingIndex + 1),
      ),
    );
  }
  for (const check of operationChecks) {
    const represented = mechanics.operations.flatMap((operation, index) =>
      check.represented(operation) ? [{ operation, index }] : [],
    );
    for (const { operation, index } of represented) {
      if (!check.supported(operation)) {
        pushIssue(
          check.failedFact,
          linkedDefenseResistanceDamageShareOperationShellIsSupported(operation)
            ? spellOngoingOperationEffectPath(PositiveInteger(index + 1))
            : spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
      }
    }
    for (const { index } of represented.slice(1)) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  for (const [index, operation] of mechanics.operations.entries()) {
    if (!operationChecks.some((check) => check.represented(operation))) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  if (mechanics.operations.length < operationChecks.length) {
    for (
      let missingOrdinal = mechanics.operations.length + 1;
      missingOrdinal <= operationChecks.length;
      missingOrdinal += 1
    ) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(missingOrdinal)),
      );
    }
  }

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
