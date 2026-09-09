import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sanctuary-targeting-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
//
// The targetingSaveInterdiction Spell Procedure Profile: a prepared Bonus
// Action spell that wards one creature, asks for a Wisdom Saving Throw when a
// direct attack roll or damaging spell targets that creature, and removes the
// ward when the warded creature makes an attack roll, casts a spell, or deals
// damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Sanctuary": Bonus Action, 30 feet, 1 minute; ward one
//     creature; direct attack-roll and damaging-spell targeting require a
//     Wisdom Saving Throw; failure chooses a new target or loses the attack or
//     spell; areas of effect are excluded; the spell ends when the warded
//     creature makes an attack roll, casts a spell, or deals damage.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Saving Throw, Spell
//     Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
import { Result } from "effect";

import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleSpellExecutionSource,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  combatantWithTargetingSaveInterdiction,
} from "../targeting-save-interdiction.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetIsLegal,
  spellTargetListHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellMechanicsObjectHasOnlyKeys,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  spellOngoingAuthoredConditionalMechanicPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const TargetingSaveInterdictionTemplateSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("targetingSaveInterdiction"),
  save: Schema.Struct({
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
  }),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});

type TargetingSaveInterdictionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "targetingSaveInterdiction" }
>;
type TargetingSaveInterdictionResolveInput =
  SpellProcedureProfileResolveInput<TargetingSaveInterdictionInvocation>;

type TargetingSaveInterdictionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly saveDc: TargetingSaveInterdictionInvocation["activeEffect"]["save"]["dc"];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for TargetingSaveInterdictionFailedFact.
const TARGETING_SAVE_INTERDICTION_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operation",
  "trigger",
  "effect",
  "saveGate",
] as const;
type TargetingSaveInterdictionFailedFact =
  (typeof TARGETING_SAVE_INTERDICTION_FAILED_FACTS)[number];
type TargetingSaveInterdictionMechanicsIssue = SpellProcedureAdmissionIssue<
  "targetingSaveInterdiction",
  TargetingSaveInterdictionFailedFact,
  UnitMechanicsPath
>;
type TargetingSaveInterdictionMechanicsInspection =
  SpellProcedureMechanicsInspection<
    "targetingSaveInterdiction",
    TargetingSaveInterdictionMechanicsFacts,
    TargetingSaveInterdictionInvocation,
    TargetingSaveInterdictionMechanicsIssue
  >;

const TARGETING_SAVE_INTERDICTION_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
] as const;
const TARGETING_SAVE_INTERDICTION_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_casts_spell",
  "target_deals_damage",
] as const;
const TARGETING_SAVE_INTERDICTION_EARLY_END_FIELDS = ["kind"] as const;
const TARGETING_SAVE_INTERDICTION_ROOT_FIELDS = [
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
] as const;
const TARGETING_SAVE_INTERDICTION_RANGE_FIELDS = ["kind", "feet"] as const;
const TARGETING_SAVE_INTERDICTION_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const;
const TARGETING_SAVE_INTERDICTION_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
  "permanentAfter",
] as const;
const TARGETING_SAVE_INTERDICTION_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const;
const TARGETING_SAVE_INTERDICTION_CASTING_TIME_FIELDS = [
  "kind",
  "trigger",
] as const;
const TARGETING_SAVE_INTERDICTION_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const;
const TARGETING_SAVE_INTERDICTION_TRIGGER_FIELDS = [
  "kind",
  "targeting",
  "excludes",
] as const;
const TARGETING_SAVE_INTERDICTION_SAVE_GATE_FIELDS = [
  "kind",
  "ability",
  "dc",
  "onFail",
  "onSuccess",
] as const;
const TARGETING_SAVE_INTERDICTION_SAVE_GATE_DC_FIELDS = ["kind"] as const;
const TARGETING_SAVE_INTERDICTION_SAVE_GATE_FAIL_FIELDS = [
  "kind",
  "subject",
] as const;
const TARGETING_SAVE_INTERDICTION_SAVE_GATE_SUCCESS_FIELDS = ["kind"] as const;

type GenericSpellComponents = Extract<
  Components,
  { readonly m: false | string }
>;

function isGenericSpellComponents(
  components: Components,
): components is GenericSpellComponents {
  return components.m === false || typeof components.m === "string";
}

function targetingSaveInterdictionMechanicsIssue(
  failedFact: TargetingSaveInterdictionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): TargetingSaveInterdictionMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "targetingSaveInterdiction",
    failedFact,
    mechanicsPath,
    message: `Unsupported targetingSaveInterdiction mechanics fact: ${failedFact}.`,
  };
}

function targetingSaveInterdictionMechanicsRepresentation(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "ongoing_effect" }> {
  if (mechanics.family !== "ongoing_effect") return false;
  return (
    targetingSaveInterdictionHasDistinctiveHeaders(mechanics) ||
    mechanics.operations.some(
      (operation) => operation.trigger.kind === "on_attached_targeted",
    )
  );
}

function targetingSaveInterdictionHasDistinctiveHeaders(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): boolean {
  if (mechanics.range.kind !== "point") return false;
  if (mechanics.castingTime.kind !== "bonus_action") return false;
  return [
    mechanics.level === 1,
    mechanics.school === "abjuration",
    mechanics.range.feet === 30,
    spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      TARGETING_SAVE_INTERDICTION_RANGE_FIELDS,
    ),
    targetingSaveInterdictionComponentsSupported(mechanics.components),
    targetingSaveInterdictionDurationEnvelopeIsCanonical(mechanics.duration),
    mechanics.castingTime.trigger === undefined,
    spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      TARGETING_SAVE_INTERDICTION_CASTING_TIME_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      mechanics,
      TARGETING_SAVE_INTERDICTION_ROOT_FIELDS,
    ),
  ].every(Boolean);
}

type TargetingSaveInterdictionSupportedDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "timed" }
> & {
  readonly value: Extract<
    Extract<SpellMechanics["duration"], { readonly kind: "timed" }>["value"],
    { readonly unit: "minute"; readonly amount: 1 }
  >;
};

function targetingSaveInterdictionDurationValueSupported(
  duration: SpellMechanics["duration"],
): duration is TargetingSaveInterdictionSupportedDuration {
  if (
    duration.kind !== "timed" ||
    !spellMechanicsObjectHasOnlyKeys(
      duration,
      TARGETING_SAVE_INTERDICTION_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      duration.value,
      TARGETING_SAVE_INTERDICTION_DURATION_VALUE_FIELDS,
    ) ||
    duration.value.unit !== "minute" ||
    duration.value.amount !== 1 ||
    !isSpellCanonicalDurationValue(duration.value)
  ) {
    return false;
  }
  return true;
}

function targetingSaveInterdictionComponentsSupported(
  components: Components,
): boolean {
  return (
    isGenericSpellComponents(components) &&
    typeof components.m === "string" &&
    components.v === true &&
    components.s === true &&
    spellMechanicsObjectHasOnlyKeys<GenericSpellComponents>(
      components,
      TARGETING_SAVE_INTERDICTION_COMPONENT_FIELDS,
    ) &&
    !("materialCostGp" in components) &&
    !("materialConsumed" in components)
  );
}

function targetingSaveInterdictionDurationEnvelopeIsCanonical(
  duration: SpellMechanics["duration"],
): boolean {
  if (!targetingSaveInterdictionDurationValueSupported(duration)) return false;
  const endingInspection =
    targetingSaveInterdictionDurationEndingInspection(duration);
  return (
    endingInspection.unsupportedOrdinals.length === 0 &&
    !endingInspection.missingRequiredKind &&
    (duration.earlyEnd ?? []).every((ending) =>
      spellMechanicsObjectHasOnlyKeys(
        ending,
        TARGETING_SAVE_INTERDICTION_EARLY_END_FIELDS,
      ),
    ) &&
    duration.permanentAfter === undefined
  );
}

type TargetingSaveInterdictionDurationEndingInspection = {
  readonly unsupportedOrdinals: readonly PositiveInteger[];
  readonly missingRequiredKind: boolean;
};

function targetingSaveInterdictionDurationEndingInspection(
  duration: Extract<SpellMechanics["duration"], { readonly kind: "timed" }>,
): TargetingSaveInterdictionDurationEndingInspection {
  const actualEndings = duration.earlyEnd ?? [];
  const seenKinds = new Set<string>();
  const unsupportedOrdinals: PositiveInteger[] = [];
  for (const [index, ending] of actualEndings.entries()) {
    if (
      !TARGETING_SAVE_INTERDICTION_EARLY_END_KINDS.some(
        (expectedKind) => expectedKind === ending.kind,
      ) ||
      seenKinds.has(ending.kind)
    ) {
      unsupportedOrdinals.push(PositiveInteger(index + 1));
    } else {
      seenKinds.add(ending.kind);
    }
  }
  return {
    unsupportedOrdinals,
    missingRequiredKind: TARGETING_SAVE_INTERDICTION_EARLY_END_KINDS.some(
      (expectedKind) => !seenKinds.has(expectedKind),
    ),
  };
}

type TargetingSaveInterdictionMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type TargetingSaveInterdictionOperation =
  TargetingSaveInterdictionMechanics["operations"][number];
type TargetingSaveInterdictionSaveGate = Extract<
  TargetingSaveInterdictionOperation["effect"],
  { readonly kind: "save_gate" }
>;
type TargetingSaveInterdictionIssuePush = (
  failedFact: TargetingSaveInterdictionFailedFact,
  mechanicsPath: UnitMechanicsPath,
) => void;

type TargetingSaveInterdictionAdmissionParts = Readonly<{
  operationIndex: number;
  operation: TargetingSaveInterdictionOperation | undefined;
  duration: TargetingSaveInterdictionSupportedDuration | undefined;
  attachmentSupported: boolean;
  saveGate: TargetingSaveInterdictionSaveGate | undefined;
}>;

type TargetingSaveInterdictionSupportedParts = Readonly<{
  operationIndex: number;
  operation: TargetingSaveInterdictionOperation;
  duration: TargetingSaveInterdictionSupportedDuration;
  attachmentSupported: true;
  saveGate: TargetingSaveInterdictionSaveGate;
}>;

function targetingSaveInterdictionOperationIndex(
  mechanics: TargetingSaveInterdictionMechanics,
): number {
  return mechanics.operations.findIndex(
    (operation) =>
      operation.trigger.kind === "on_attached_targeted" ||
      operation.effect.kind === "save_gate",
  );
}

function targetingSaveInterdictionAttachmentSupported(
  mechanics: TargetingSaveInterdictionMechanics,
): boolean {
  const attachment = admitSpellTargetAttachment(
    mechanics.attachment,
    TARGETING_SAVE_INTERDICTION_TARGET_SELECTION_FIELDS,
  );
  if (attachment.tag !== "admitted") return false;
  const selection = attachment.attachment.value.selection;
  return (
    selection.mode === "one" &&
    sameStringSet(selection.targetKinds ?? [], ["creature"])
  );
}

function targetingSaveInterdictionAdmissionParts(
  mechanics: TargetingSaveInterdictionMechanics,
): TargetingSaveInterdictionAdmissionParts {
  const operationIndex = targetingSaveInterdictionOperationIndex(mechanics);
  const operation = mechanics.operations[operationIndex];
  const duration = targetingSaveInterdictionDurationValueSupported(
    mechanics.duration,
  )
    ? mechanics.duration
    : undefined;
  const attachmentSupported =
    targetingSaveInterdictionAttachmentSupported(mechanics);
  const saveGate =
    operation?.effect.kind === "save_gate" ? operation.effect : undefined;
  return {
    operationIndex,
    operation,
    duration,
    attachmentSupported,
    saveGate,
  };
}

function targetingSaveInterdictionSupportedParts(
  parts: TargetingSaveInterdictionAdmissionParts,
): parts is TargetingSaveInterdictionSupportedParts {
  return [
    parts.operation !== undefined,
    parts.duration !== undefined,
    parts.attachmentSupported,
    parts.saveGate !== undefined,
  ].every(Boolean);
}

function inspectTargetingSaveInterdictionDefinition(
  mechanics: TargetingSaveInterdictionMechanics,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    !spellMechanicsObjectHasOnlyKeys(
      mechanics,
      TARGETING_SAVE_INTERDICTION_ROOT_FIELDS,
    )
  )
    push("operation", spellMechanicsHeaderPath("family"));
}

function inspectTargetingSaveInterdictionRangeAndComponents(
  mechanics: TargetingSaveInterdictionMechanics,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      TARGETING_SAVE_INTERDICTION_RANGE_FIELDS,
    )
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (targetingSaveInterdictionComponentsSupported(mechanics.components))
    return;
  push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
}

function inspectTargetingSaveInterdictionDurationValue(
  mechanics: TargetingSaveInterdictionMechanics,
  duration: TargetingSaveInterdictionSupportedDuration | undefined,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (duration !== undefined) return;
  push("duration", spellMechanicsHeaderPath("duration"));
  if (mechanics.duration.kind !== "timed") {
    push("durationValue", spellDurationValuePath());
    return;
  }
  if (
    mechanics.duration.value.unit !== "minute" ||
    mechanics.duration.value.amount !== 1 ||
    !isSpellCanonicalDurationValue(mechanics.duration.value)
  )
    push("durationValue", spellDurationValuePath());
}

function inspectTargetingSaveInterdictionDurationEndings(
  mechanics: TargetingSaveInterdictionMechanics,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (mechanics.duration.kind !== "timed") return;
  const inspection = targetingSaveInterdictionDurationEndingInspection(
    mechanics.duration,
  );
  for (const ordinal of inspection.unsupportedOrdinals)
    push("durationEnding", spellDurationEndingPath(ordinal));
  if (inspection.missingRequiredKind)
    push("durationEnding", spellMechanicsHeaderPath("duration"));
  if (mechanics.duration.permanentAfter !== undefined)
    push(
      "durationEnding",
      spellDurationEndingPath(
        PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
      ),
    );
}

function inspectTargetingSaveInterdictionEnvelope(
  mechanics: TargetingSaveInterdictionMechanics,
  attachmentSupported: boolean,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.castingTime.trigger !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      TARGETING_SAVE_INTERDICTION_CASTING_TIME_FIELDS,
    )
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (mechanics.attachment.kind !== "hole" || !attachmentSupported)
    push("attachment", spellOngoingAttachmentPath());
  if (mechanics.initialPhase !== undefined)
    push("initialPhase", spellOngoingInitialPhasePath());
}

function inspectTargetingSaveInterdictionConditionals(
  mechanics: TargetingSaveInterdictionMechanics,
  push: TargetingSaveInterdictionIssuePush,
): void {
  for (const [index] of (
    mechanics.authoredConditionalMechanics ?? []
  ).entries())
    push(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    );
}

function inspectTargetingSaveInterdictionOperationCount(
  mechanics: TargetingSaveInterdictionMechanics,
  operationIndex: number,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (mechanics.operations.length === 1 && operationIndex === 0) return;
  if (mechanics.operations.length === 0)
    push("operationCount", spellMechanicsRootPath());
  for (const [index] of mechanics.operations.entries()) {
    if (index === operationIndex) continue;
    push(
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(index + 1)),
    );
  }
}

function targetingSaveInterdictionOperationPath(
  operationIndex: number,
): UnitMechanicsPath {
  return spellOngoingOperationPath(PositiveInteger(operationIndex + 1));
}

function targetingSaveInterdictionEffectPath(
  operationIndex: number,
): UnitMechanicsPath {
  return spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1));
}

function inspectTargetingSaveInterdictionTrigger(
  operation: TargetingSaveInterdictionOperation,
  operationIndex: number,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (
    operation.trigger.kind !== "on_attached_targeted" ||
    operation.trigger.excludes !== "area_of_effect" ||
    !sameStringSet(operation.trigger.targeting, [
      "attack_roll",
      "damaging_spell",
    ]) ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      TARGETING_SAVE_INTERDICTION_TRIGGER_FIELDS,
    )
  )
    push("trigger", targetingSaveInterdictionOperationPath(operationIndex));
}

function targetingSaveInterdictionSaveGateSupported(
  saveGate: TargetingSaveInterdictionSaveGate,
): boolean {
  return [
    saveGate.ability === "wis",
    saveGate.dc.kind === "caster_spell_save_dc",
    saveGate.onSuccess.kind === "none",
    targetingSaveInterdictionSaveGateOnFailSupported(saveGate.onFail),
    spellMechanicsObjectHasOnlyKeys(
      saveGate,
      TARGETING_SAVE_INTERDICTION_SAVE_GATE_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      saveGate.dc,
      TARGETING_SAVE_INTERDICTION_SAVE_GATE_DC_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      saveGate.onSuccess,
      TARGETING_SAVE_INTERDICTION_SAVE_GATE_SUCCESS_FIELDS,
    ),
  ].every(Boolean);
}

function targetingSaveInterdictionSaveGateOnFailSupported(
  onFail: TargetingSaveInterdictionSaveGate["onFail"],
): boolean {
  if (onFail.kind !== "choose_new_target_or_lose") return false;
  return (
    onFail.subject === "triggering_attack_or_spell" &&
    spellMechanicsObjectHasOnlyKeys(
      onFail,
      TARGETING_SAVE_INTERDICTION_SAVE_GATE_FAIL_FIELDS,
    )
  );
}

function inspectTargetingSaveInterdictionOperation(
  operation: TargetingSaveInterdictionOperation | undefined,
  operationIndex: number,
  saveGate: TargetingSaveInterdictionSaveGate | undefined,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (operation === undefined) return;
  inspectTargetingSaveInterdictionOperationShape(
    operation,
    operationIndex,
    push,
  );
  inspectTargetingSaveInterdictionTrigger(operation, operationIndex, push);
  inspectTargetingSaveInterdictionEffect(operationIndex, saveGate, push);
  inspectTargetingSaveInterdictionOperationOptions(
    operation,
    operationIndex,
    push,
  );
}

function inspectTargetingSaveInterdictionMissingOperation(
  mechanics: TargetingSaveInterdictionMechanics,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (mechanics.operations.length === 0)
    push("operation", spellMechanicsRootPath());
  else {
    push("operation", spellOngoingOperationPath(PositiveInteger(1)));
    push("effect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
}

function inspectTargetingSaveInterdictionOperationShape(
  operation: TargetingSaveInterdictionOperation,
  operationIndex: number,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (
    !spellMechanicsObjectHasOnlyKeys(
      operation,
      TARGETING_SAVE_INTERDICTION_OPERATION_FIELDS,
    )
  )
    push("operation", targetingSaveInterdictionOperationPath(operationIndex));
}

function inspectTargetingSaveInterdictionEffect(
  operationIndex: number,
  saveGate: TargetingSaveInterdictionSaveGate | undefined,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (saveGate === undefined)
    push("effect", targetingSaveInterdictionEffectPath(operationIndex));
  else if (!targetingSaveInterdictionSaveGateSupported(saveGate))
    push("saveGate", targetingSaveInterdictionEffectPath(operationIndex));
}

function inspectTargetingSaveInterdictionOperationOptions(
  operation: TargetingSaveInterdictionOperation,
  operationIndex: number,
  push: TargetingSaveInterdictionIssuePush,
): void {
  if (
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined
  )
    push("operation", targetingSaveInterdictionOperationPath(operationIndex));
}

function admitTargetingSaveInterdictionMechanics(
  source: SpellMechanicsAdmissionSource,
): TargetingSaveInterdictionMechanicsInspection {
  if (!targetingSaveInterdictionMechanicsRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const parts = targetingSaveInterdictionAdmissionParts(mechanics);
  const issues: TargetingSaveInterdictionMechanicsIssue[] = [];
  const push = (
    failedFact: TargetingSaveInterdictionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push(
      targetingSaveInterdictionMechanicsIssue(failedFact, mechanicsPath),
    );
  };

  inspectTargetingSaveInterdictionDefinition(mechanics, push);
  inspectTargetingSaveInterdictionRangeAndComponents(mechanics, push);
  inspectTargetingSaveInterdictionDurationValue(
    mechanics,
    parts.duration,
    push,
  );
  inspectTargetingSaveInterdictionDurationEndings(mechanics, push);
  inspectTargetingSaveInterdictionEnvelope(
    mechanics,
    parts.attachmentSupported,
    push,
  );
  inspectTargetingSaveInterdictionConditionals(mechanics, push);
  inspectTargetingSaveInterdictionOperationCount(
    mechanics,
    parts.operationIndex,
    push,
  );
  if (parts.operation === undefined)
    inspectTargetingSaveInterdictionMissingOperation(mechanics, push);
  else
    inspectTargetingSaveInterdictionOperation(
      parts.operation,
      parts.operationIndex,
      parts.saveGate,
      push,
    );

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined) return { tag: "unsupported", issues: nonEmpty };
  if (!targetingSaveInterdictionSupportedParts(parts))
    return {
      tag: "unsupported",
      issues: [
        targetingSaveInterdictionMechanicsIssue(
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    };

  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    parts.duration.value,
  );
  if (Result.isFailure(durationTicks))
    return {
      tag: "unsupported",
      issues: [
        targetingSaveInterdictionMechanicsIssue(
          "durationValue",
          spellDurationValuePath(),
        ),
      ],
    };

  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: durationTicks.success,
    rangeFeet: movementFeet(30),
    saveDc: parts.saveGate.dc,
  } satisfies TargetingSaveInterdictionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "targetingSaveInterdiction",
      facts,
      evidence: {
        consumed: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          ...spellDurationChildCoordinates(parts.duration).map(
            spellDurationChildPath,
          ),
          spellOngoingAttachmentPath(),
          spellOngoingOperationPath(PositiveInteger(1)),
          spellOngoingOperationEffectPath(PositiveInteger(1)),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitTargetingSaveInterdiction(executionSource, ctx, facts),
    },
  };
}

function admitTargetingSaveInterdiction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: TargetingSaveInterdictionMechanicsFacts,
): readonly TargetingSaveInterdictionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly TargetingSaveInterdictionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "targetingSaveInterdiction",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              activeEffect: {
                kind: "targetingSaveInterdiction",
                sourceCombatantId: ctx.actor.combatantId,
                save: { ability: "wis", dc: facts.saveDc },
                expiresAt: {
                  kind: "duration",
                  durationTicks: facts.durationTicks,
                },
              },
              rangeFeet: facts.rangeFeet,
            },
          ],
  );
}

function discoverTargetingSaveInterdictionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TargetingSaveInterdictionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveTargetingSaveInterdiction(
  input: TargetingSaveInterdictionResolveInput,
): BattleResolutionResult {
  const targetList = input.fillSet.targetList;
  if (targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetList.targetIds.length !== 1) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-redirection ward must target exactly one creature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetId = targetList.targetIds[0]!;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.actorId,
  );
  const target = spellCastState.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      spellCastState,
      input.actorId,
      targetId,
      input.invocation,
      targetList.spatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-redirection ward target must be a combatant within range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const combatants = new Map(spellCastState.combatants).set(
    targetId,
    combatantWithTargetingSaveInterdiction(target, input.invocation),
  );
  return spendSpellCastResources({
    state: { ...spellCastState, combatants },
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    skipTargetActionSpellCastEarlyEnd: true,
  });
}

const TargetingSaveInterdictionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("targetingSaveInterdiction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    activeEffect: TargetingSaveInterdictionTemplateSchema,
    rangeFeet: MovementFeet,
  }),
);
export const targetingSaveInterdictionProfile = {
  procedure: "targetingSaveInterdiction",
  executionSchema: TargetingSaveInterdictionInvocationSchema,
  admitMechanics: admitTargetingSaveInterdictionMechanics,
  discoverCastAct: discoverTargetingSaveInterdictionCastAct,
  resolve: resolveTargetingSaveInterdiction,
} satisfies SpellProcedureDeclaration<
  "targetingSaveInterdiction",
  TargetingSaveInterdictionInvocation
>;
