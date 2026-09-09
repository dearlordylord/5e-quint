import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-persistent-armor-effect
// The persistentArmorEffect Spell Procedure Profile: a touch spell that
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// creates a timed Spell Effect setting the willing unarmored target's base
// Armor Class to a fixed base plus Dexterity modifier.
//
// What lives here:
//   - admitMechanics()  - was supportedPreparedPersistentSpellProfile in
//                         spells-profiles.ts
//   - admitInvocationSpellAccess() - was
//                         supportedInvocationPersistentSpellProfile in
//                         spells-profiles.ts
//   - discoverCastAct() - was the generic target-bearing action-spell branch
//                         in spells-discovery.ts
//   - castSummary()     - was the persistentArmorEffect branch in
//                         spells-discovery.ts
//   - resolve()         - was the persistentArmorEffect branch in
//                         spells-resolve.ts
//   - applyEffect()     - was applyPersistentSpellActiveEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Known-willing target checks and unarmored target legality stay in
//     spells-targeting.ts until targeting classification migrates.
//   - The Armor of Shadows Spell Access parser stays in
//     character-battle-resources.ts.

import {
  ArmorClassSchema,
  type ArmorClass,
} from "@dnd/shared-algebras/armor-class-values";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { PersistentArmorEffectExecutionFacts } from "../../procedure-execution/persistent-armor-effect-facts.ts";
import { CombatantId } from "../../identity.ts";
import { combatantWearingArmor } from "../creature-state-leaves.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import { willingCreatureTargetSelection } from "../spells-profiles-support.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Result, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  ArmorOfShadowsSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellDurationValueEvidencePaths,
  isSpellCanonicalDurationValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type PersistentArmorInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentArmorEffect" }
>;

type PersistentArmorEffectMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type PersistentArmorEffectRange = Extract<
  SpellProcedureMechanicsFacts["range"],
  { readonly kind: "touch" }
>;
type PersistentArmorEffectTimedDuration = Extract<
  SpellProcedureMechanicsFacts["duration"],
  { readonly kind: "timed" }
>;
type PersistentArmorEffectDuration = PersistentArmorEffectTimedDuration & {
  readonly value: Omit<SpellCanonicalDurationValue, "unit" | "amount"> & {
    readonly unit: "hour";
    readonly amount: SpellCanonicalDurationValue["amount"] & 8;
  };
  readonly earlyEnd: readonly [{ readonly kind: "target_dons_armor" }];
};
type PersistentArmorEffectOperation =
  PersistentArmorEffectMechanics["operations"][number];
type PersistentArmorEffectPassiveTrigger = Extract<
  PersistentArmorEffectOperation["trigger"],
  { readonly kind: "passive" }
>;
type PersistentArmorEffectBaseOperationEffect = Extract<
  PersistentArmorEffectOperation["effect"],
  { readonly kind: "modify_ac_set_base" }
>;
type PersistentArmorEffectBaseDexFormula = Extract<
  PersistentArmorEffectBaseOperationEffect["formula"],
  { readonly kind: "base_plus_dex" }
>;
type PersistentArmorEffectDurationEnding =
  PersistentArmorEffectDuration["earlyEnd"][number];
type PersistentArmorEffectCastingTime = Extract<
  PersistentArmorEffectMechanics["castingTime"],
  { readonly kind: "action" }
>;
export type PersistentArmorEffectMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "range" | "duration"
> & {
  readonly range: PersistentArmorEffectRange;
  readonly duration: PersistentArmorEffectDuration;
  readonly baseArmorClass: ArmorClass;
  readonly ability: "dex";
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for PersistentArmorEffectFailedFact.
const PERSISTENT_ARMOR_EFFECT_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "initialPhase",
  "authoredConditionalMechanics",
  "attachment",
  "operationCount",
  "operation",
  "armorClassEffect",
] as const;
type PersistentArmorEffectFailedFact =
  (typeof PERSISTENT_ARMOR_EFFECT_FAILED_FACTS)[number];
type PersistentArmorEffectMechanicsIssue = SpellProcedureAdmissionIssue<
  "persistentArmorEffect",
  PersistentArmorEffectFailedFact,
  UnitMechanicsPath
>;

const PERSISTENT_ARMOR_EFFECT_RANGE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectRange>;
const PERSISTENT_ARMOR_EFFECT_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<
  keyof PersistentArmorEffectMechanics["components"]
>;
const PERSISTENT_ARMOR_EFFECT_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectDuration>;
const PERSISTENT_ARMOR_EFFECT_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
] as const satisfies ReadonlyArray<
  keyof PersistentArmorEffectDuration["value"]
>;
const PERSISTENT_ARMOR_EFFECT_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectCastingTime>;
const PERSISTENT_ARMOR_EFFECT_OPERATION_FIELDS = [
  "trigger",
  "effect",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectOperation>;
const PERSISTENT_ARMOR_EFFECT_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectPassiveTrigger>;
const PERSISTENT_ARMOR_EFFECT_BASE_EFFECT_FIELDS = [
  "kind",
  "formula",
] as const satisfies ReadonlyArray<
  keyof PersistentArmorEffectBaseOperationEffect
>;
const PERSISTENT_ARMOR_EFFECT_BASE_FORMULA_FIELDS = [
  "kind",
  "base",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectBaseDexFormula>;
const PERSISTENT_ARMOR_EFFECT_ENDING_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PersistentArmorEffectDurationEnding>;
const PERSISTENT_ARMOR_EFFECT_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
] as const;

function persistentArmorEffectIssue(
  failedFact: PersistentArmorEffectFailedFact,
  mechanicsPath: UnitMechanicsPath,
): PersistentArmorEffectMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentArmorEffect",
    failedFact,
    mechanicsPath,
    message: `Unsupported persistentArmorEffect mechanics fact: ${failedFact}.`,
  };
}

function persistentArmorEffectHasTargetDonsArmorEnding(
  mechanics: SpellMechanics,
): boolean {
  return spellDurationChildCoordinates(mechanics.duration).some(
    (child) =>
      child.branch === "ending" &&
      child.ending.kind === "earlyEnd" &&
      child.ending.trigger.kind === "target_dons_armor",
  );
}

function isPersistentArmorEffectDurationHourAmount(
  amount: PositiveInteger,
): amount is PositiveInteger & 8 {
  return amount === 8;
}

/**
 * Keep the owner candidate stable when one represented fact is malformed,
 * while requiring the AC replacement/armor-ending signature that separates
 * this profile from other ongoing target spells such as Barkskin.
 */
function persistentArmorEffectRepresentation(
  mechanics: SpellMechanics,
): mechanics is PersistentArmorEffectMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasBaseArmorOperation = mechanics.operations.some(
    ({ effect }) => effect.kind === "modify_ac_set_base",
  );
  const hasWillingCreatureTarget =
    persistentArmorEffectMechanicsHasWillingCreatureTarget(mechanics);
  const hasEightHourDuration = persistentArmorEffectHasEightHourDuration(
    mechanics.duration,
  );
  const hasActionCastingTime = mechanics.castingTime.kind === "action";
  const hasTargetDonsArmorEnding =
    persistentArmorEffectHasTargetDonsArmorEnding(mechanics);
  const hasPersistentArmorDuration =
    hasEightHourDuration && hasTargetDonsArmorEnding;
  const hasPersistentArmorHeader =
    persistentArmorEffectHasCharacteristicHeader(mechanics);
  return (
    (hasBaseArmorOperation || hasTargetDonsArmorEnding) &&
    spellProcedureHasRedundantSignature({
      kind: "oneOfFiveWitnessesMayBeMissing",
      witnesses: [
        { name: "baseArmorOperation", present: hasBaseArmorOperation },
        { name: "duration", present: hasPersistentArmorDuration },
        { name: "willingCreatureTarget", present: hasWillingCreatureTarget },
        { name: "actionCastingTime", present: hasActionCastingTime },
        { name: "header", present: hasPersistentArmorHeader },
      ],
    })
  );
}

function persistentArmorEffectMechanicsHasWillingCreatureTarget(
  mechanics: PersistentArmorEffectMechanics,
): boolean {
  const attachment = mechanics.attachment;
  if (attachment.kind !== "hole") return false;
  if (attachment.value.kind !== "target") return false;
  return willingCreatureTargetSelection(attachment.value.selection);
}

function persistentArmorEffectHasEightHourDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): boolean {
  if (duration.kind !== "timed") return false;
  return [duration.value.unit === "hour", duration.value.amount === 8].every(
    Boolean,
  );
}

function persistentArmorEffectHasCharacteristicHeader(
  mechanics: PersistentArmorEffectMechanics,
): boolean {
  return [
    mechanics.level === 1,
    mechanics.school === "abjuration",
    mechanics.components.v === true,
    mechanics.components.s === true,
    typeof mechanics.components.m === "string",
  ].every(Boolean);
}

function persistentArmorEffectRange(
  range: SpellProcedureMechanicsFacts["range"],
): PersistentArmorEffectRange | undefined {
  return range.kind === "touch" &&
    spellMechanicsObjectHasOnlyKeys(range, PERSISTENT_ARMOR_EFFECT_RANGE_FIELDS)
    ? range
    : undefined;
}

function persistentArmorEffectDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): PersistentArmorEffectDuration | undefined {
  if (duration.kind !== "timed") return undefined;
  if (!persistentArmorEffectDurationShellIsSupported(duration))
    return undefined;
  const earlyEnd = duration.earlyEnd;
  const durationValue = duration.value;
  if (!persistentArmorEffectDurationValueIsSupported(durationValue)) {
    return undefined;
  }
  const ending = earlyEnd[0];
  if (ending?.kind !== "target_dons_armor") return undefined;
  if (!persistentArmorEffectEndingIsSupported(ending)) return undefined;
  const value: PersistentArmorEffectDuration["value"] = {
    unit: durationValue.unit,
    amount: durationValue.amount,
  };
  return {
    ...duration,
    value,
    earlyEnd: [ending],
  };
}

function persistentArmorEffectDurationShellIsSupported(
  duration: PersistentArmorEffectTimedDuration,
): duration is PersistentArmorEffectTimedDuration & {
  readonly earlyEnd: readonly [PersistentArmorEffectDurationEnding];
} {
  return [
    spellMechanicsObjectHasOnlyKeys(
      duration,
      PERSISTENT_ARMOR_EFFECT_DURATION_FIELDS,
    ),
    duration.earlyEnd !== undefined,
    duration.earlyEnd?.length === 1,
  ].every(Boolean);
}

function persistentArmorEffectDurationValueIsSupported(
  value: PersistentArmorEffectTimedDuration["value"],
): value is PersistentArmorEffectDuration["value"] {
  if (!isSpellCanonicalDurationValue(value)) return false;
  if (value.unit !== "hour") return false;
  return (
    isPersistentArmorEffectDurationHourAmount(value.amount) &&
    spellMechanicsObjectHasOnlyKeys(value, [
      ...PERSISTENT_ARMOR_EFFECT_DURATION_VALUE_FIELDS,
    ])
  );
}

function persistentArmorEffectEndingIsSupported(
  ending: PersistentArmorEffectDurationEnding,
): boolean {
  return spellMechanicsObjectHasOnlyKeys(
    ending,
    PERSISTENT_ARMOR_EFFECT_ENDING_FIELDS,
  );
}

function persistentArmorEffectTargetAttachment(
  attachment: PersistentArmorEffectMechanics["attachment"],
) {
  const admitted = admitSpellTargetAttachment(
    attachment,
    PERSISTENT_ARMOR_EFFECT_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag !== "admitted") return undefined;
  const { selection } = admitted.attachment.value;
  return selection.mode === "one" &&
    willingCreatureTargetSelection(selection) &&
    selection.targetKinds?.length === 1 &&
    selection.targetKinds[0] === "creature"
    ? admitted.attachment
    : undefined;
}

function persistentArmorEffectMechanicsEvidence(
  mechanics: PersistentArmorEffectMechanics,
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
      spellOngoingAttachmentPath(),
      spellOngoingOperationPath(PositiveInteger(1)),
      spellOngoingOperationEffectPath(PositiveInteger(1)),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
    ],
    unowned: [],
  };
}

export function persistentArmorEffectExecutionFactsFromMechanicsFacts(
  facts: PersistentArmorEffectMechanicsFacts,
): PersistentArmorEffectExecutionFacts {
  return {
    rangeFeet: spellTouchRangeFeet(),
    slotLevel: spellSlotLevel(facts.level),
    baseArmorClass: facts.baseArmorClass,
    ability: facts.ability,
    durationTicks: spellDurationTicksFromCanonicalValue(facts.duration.value),
    earlyEnds: [{ kind: "targetDonsArmor" }],
  };
}

type PersistentArmorIssuePush = (
  failedFact: PersistentArmorEffectFailedFact,
  mechanicsPath: UnitMechanicsPath,
) => void;

function inspectPersistentArmorDefinition(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): void {
  if (mechanics.level !== 1)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    pushIssue("school", spellMechanicsHeaderPath("school"));
}

function persistentArmorComponentsSupported(
  components: PersistentArmorEffectMechanics["components"],
): boolean {
  return (
    components.v === true &&
    components.s === true &&
    typeof components.m === "string" &&
    spellMechanicsObjectHasOnlyKeys(
      components,
      PERSISTENT_ARMOR_EFFECT_COMPONENT_FIELDS,
    )
  );
}

function inspectPersistentArmorComponents(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): void {
  if (persistentArmorComponentsSupported(mechanics.components)) return;
  pushIssue("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    pushIssue("components", path);
}

function inspectPersistentArmorNonTimedDuration(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): void {
  pushIssue("duration", spellMechanicsHeaderPath("duration"));
  for (const path of spellDurationValueEvidencePaths(mechanics.duration))
    pushIssue("durationValue", path);
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    pushIssue(
      spellDurationChildFailedFact(child),
      spellDurationChildPath(child),
    );
}

function inspectPersistentArmorTimedDurationShape(
  duration: PersistentArmorEffectTimedDuration,
  pushIssue: PersistentArmorIssuePush,
): void {
  const durationOwnKeysMatch = spellMechanicsObjectHasOnlyKeys(
    duration,
    PERSISTENT_ARMOR_EFFECT_DURATION_FIELDS,
  );
  if (!durationOwnKeysMatch && duration.permanentAfter === undefined)
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  if (!persistentArmorEffectDurationValueIsSupported(duration.value))
    pushIssue("durationValue", spellDurationValuePath());
  for (const child of spellDurationChildCoordinates(duration))
    if (child.branch === "extension")
      pushIssue("durationExtension", spellDurationChildPath(child));
}

function persistentArmorMissingEndingPath(): UnitMechanicsPath {
  return spellDurationChildPath({
    branch: "ending",
    ordinal: PositiveInteger(1),
    ending: { kind: "earlyEnd", trigger: { kind: "target_dons_armor" } },
  });
}

function inspectPersistentArmorEarlyEndings(
  earlyEnd: PersistentArmorEffectTimedDuration["earlyEnd"],
  pushIssue: PersistentArmorIssuePush,
): void {
  if (earlyEnd === undefined || earlyEnd.length === 0) {
    pushIssue("durationEnding", persistentArmorMissingEndingPath());
  } else {
    for (const [index, ending] of earlyEnd.entries())
      if (
        ending.kind !== "target_dons_armor" ||
        !spellMechanicsObjectHasOnlyKeys(
          ending,
          PERSISTENT_ARMOR_EFFECT_ENDING_FIELDS,
        ) ||
        index > 0
      )
        pushIssue(
          "durationEnding",
          spellDurationChildPath({
            branch: "ending",
            ordinal: PositiveInteger(index + 1),
            ending: { kind: "earlyEnd", trigger: ending },
          }),
        );
  }
}

function persistentArmorPermanentEndingPath(
  earlyEnd: PersistentArmorEffectTimedDuration["earlyEnd"],
  transition: NonNullable<PersistentArmorEffectTimedDuration["permanentAfter"]>,
): UnitMechanicsPath {
  const earlyEndCount = earlyEnd === undefined ? 0 : earlyEnd.length;
  return spellDurationChildPath({
    branch: "ending",
    ordinal: PositiveInteger(earlyEndCount + 1),
    ending: {
      kind: "permanentAfter",
      transition,
    },
  });
}

function inspectPersistentArmorDurationEndings(
  duration: PersistentArmorEffectTimedDuration,
  pushIssue: PersistentArmorIssuePush,
): void {
  inspectPersistentArmorEarlyEndings(duration.earlyEnd, pushIssue);
  if (duration.permanentAfter !== undefined)
    pushIssue(
      "durationEnding",
      persistentArmorPermanentEndingPath(
        duration.earlyEnd,
        duration.permanentAfter,
      ),
    );
}

function inspectPersistentArmorDuration(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): void {
  if (mechanics.duration.kind !== "timed") {
    inspectPersistentArmorNonTimedDuration(mechanics, pushIssue);
    return;
  }
  inspectPersistentArmorTimedDurationShape(mechanics.duration, pushIssue);
  inspectPersistentArmorDurationEndings(mechanics.duration, pushIssue);
}

function inspectPersistentArmorEnvelope(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): void {
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      PERSISTENT_ARMOR_EFFECT_CASTING_TIME_FIELDS,
    )
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (mechanics.initialPhase !== undefined)
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  if (mechanics.authoredConditionalMechanics !== undefined)
    pushIssue("authoredConditionalMechanics", spellMechanicsRootPath());
}

type PersistentArmorOperationSelection = Readonly<{
  operation: PersistentArmorEffectOperation | undefined;
  ordinal: PositiveInteger;
}>;

function persistentArmorOperationSelection(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): PersistentArmorOperationSelection {
  const semanticIndex = mechanics.operations.findIndex(
    ({ effect }) => effect.kind === "modify_ac_set_base",
  );
  const inspectionIndex = semanticIndex >= 0 ? semanticIndex : 0;
  const ordinal = PositiveInteger(inspectionIndex + 1);
  if (mechanics.operations.length === 0)
    pushIssue("operationCount", spellOngoingOperationPath(ordinal));
  else
    for (const [index] of mechanics.operations.entries())
      if (index !== inspectionIndex)
        pushIssue(
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
  return { operation: mechanics.operations[inspectionIndex], ordinal };
}

function inspectPersistentArmorOperationShell(
  selection: PersistentArmorOperationSelection,
  pushIssue: PersistentArmorIssuePush,
): void {
  const operation = selection.operation;
  if (
    operation === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      operation,
      PERSISTENT_ARMOR_EFFECT_OPERATION_FIELDS,
    ) ||
    operation.trigger.kind !== "passive" ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      PERSISTENT_ARMOR_EFFECT_TRIGGER_FIELDS,
    )
  )
    pushIssue("operation", spellOngoingOperationPath(selection.ordinal));
}

function persistentArmorBaseEffect(
  operation: PersistentArmorEffectOperation | undefined,
): PersistentArmorEffectBaseOperationEffect | undefined {
  return operation?.effect.kind === "modify_ac_set_base"
    ? operation.effect
    : undefined;
}

function persistentArmorBaseArmorClass(
  effect: PersistentArmorEffectBaseOperationEffect | undefined,
): ArmorClass | undefined {
  if (effect === undefined) return undefined;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      effect,
      PERSISTENT_ARMOR_EFFECT_BASE_EFFECT_FIELDS,
    )
  )
    return undefined;
  if (effect.formula.kind !== "base_plus_dex") return undefined;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      effect.formula,
      PERSISTENT_ARMOR_EFFECT_BASE_FORMULA_FIELDS,
    )
  )
    return undefined;
  const decoded = Schema.decodeUnknownResult(ArmorClassSchema)(
    effect.formula.base,
  );
  return Result.isSuccess(decoded) && decoded.success === 13
    ? decoded.success
    : undefined;
}

type PersistentArmorOperationProjection = Readonly<{
  baseArmorClass: ArmorClass | undefined;
  effectPath: UnitMechanicsPath;
}>;

function inspectPersistentArmorOperation(
  mechanics: PersistentArmorEffectMechanics,
  pushIssue: PersistentArmorIssuePush,
): PersistentArmorOperationProjection {
  const selection = persistentArmorOperationSelection(mechanics, pushIssue);
  inspectPersistentArmorOperationShell(selection, pushIssue);
  const effect = persistentArmorBaseEffect(selection.operation);
  const baseArmorClass = persistentArmorBaseArmorClass(effect);
  const effectPath = spellOngoingOperationEffectPath(selection.ordinal);
  if (
    effect === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      effect,
      PERSISTENT_ARMOR_EFFECT_BASE_EFFECT_FIELDS,
    ) ||
    baseArmorClass === undefined
  )
    pushIssue("armorClassEffect", effectPath);
  return { baseArmorClass, effectPath };
}

type PersistentArmorRequiredFacts =
  | {
      readonly tag: "supported";
      readonly range: PersistentArmorEffectRange;
      readonly duration: PersistentArmorEffectDuration;
      readonly baseArmorClass: ArmorClass;
    }
  | {
      readonly tag: "unsupported";
      readonly issue: PersistentArmorEffectMechanicsIssue;
    };

function persistentArmorRequiredFacts(input: {
  readonly range: PersistentArmorEffectRange | undefined;
  readonly duration: PersistentArmorEffectDuration | undefined;
  readonly operation: PersistentArmorOperationProjection;
}): PersistentArmorRequiredFacts {
  if (input.range === undefined)
    return {
      tag: "unsupported",
      issue: persistentArmorEffectIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    };
  if (input.duration === undefined)
    return {
      tag: "unsupported",
      issue: persistentArmorEffectIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    };
  if (input.operation.baseArmorClass === undefined)
    return {
      tag: "unsupported",
      issue: persistentArmorEffectIssue(
        "armorClassEffect",
        input.operation.effectPath,
      ),
    };
  return {
    tag: "supported",
    range: input.range,
    duration: input.duration,
    baseArmorClass: input.operation.baseArmorClass,
  };
}

function admitPersistentArmorEffectMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentArmorEffect",
  PersistentArmorEffectMechanicsFacts,
  PersistentArmorInvocation,
  PersistentArmorEffectMechanicsIssue
> {
  if (!persistentArmorEffectRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: PersistentArmorEffectFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: PersistentArmorEffectFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  inspectPersistentArmorDefinition(mechanics, pushIssue);
  const rangeFacts = persistentArmorEffectRange(mechanics.range);
  if (rangeFacts === undefined)
    pushIssue("range", spellMechanicsHeaderPath("range"));
  inspectPersistentArmorComponents(mechanics, pushIssue);
  const durationFacts = persistentArmorEffectDuration(mechanics.duration);
  inspectPersistentArmorDuration(mechanics, pushIssue);
  inspectPersistentArmorEnvelope(mechanics, pushIssue);
  if (persistentArmorEffectTargetAttachment(mechanics.attachment) === undefined)
    pushIssue("attachment", spellOngoingAttachmentPath());
  const operation = inspectPersistentArmorOperation(mechanics, pushIssue);

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(nonEmptyIssues, (issue) =>
        persistentArmorEffectIssue(issue.failedFact, issue.mechanicsPath),
      ),
    };
  }
  const required = persistentArmorRequiredFacts({
    range: rangeFacts,
    duration: durationFacts,
    operation,
  });
  if (required.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [required.issue],
    };
  }

  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: required.range,
    duration: required.duration,
    baseArmorClass: required.baseArmorClass,
    ability: "dex",
  } satisfies PersistentArmorEffectMechanicsFacts;
  const executionFacts =
    persistentArmorEffectExecutionFactsFromMechanicsFacts(facts);
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentArmorEffect",
      facts,
      evidence: persistentArmorEffectMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitPersistentArmorEffect(executionSource, ctx, executionFacts),
    },
  };
}

const PersistentArmorEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("spellBaseArmorClass"),
  sourceCombatantId: CombatantId,
  base: ArmorClassSchema,
  ability: Schema.Literal("dex"),
  earlyEnds: Schema.Tuple([
    Schema.Struct({ kind: Schema.Literal("targetDonsArmor") }),
  ]),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});
type PersistentArmorSpellSource =
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "prepared" } }
      >,
      "access" | "resource"
    >
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "armorOfShadows" } }
      >,
      "access" | "resource"
    >;

function persistentArmorEffectShape(
  actorId: CombatantId,
  executionFacts: PersistentArmorEffectExecutionFacts,
): Pick<PersistentArmorInvocation, "rangeFeet" | "activeEffect"> {
  return {
    rangeFeet: executionFacts.rangeFeet,
    activeEffect: {
      kind: "spellBaseArmorClass",
      sourceCombatantId: actorId,
      base: executionFacts.baseArmorClass,
      ability: executionFacts.ability,
      expiresAt: {
        kind: "duration",
        durationTicks: executionFacts.durationTicks,
      },
      earlyEnds: executionFacts.earlyEnds,
    },
  };
}

function buildPersistentArmorEffectInvocation(
  actorId: CombatantId,
  spell: BattleSpellExecutionSource,
  executionFacts: PersistentArmorEffectExecutionFacts,
  source: PersistentArmorSpellSource,
): PersistentArmorInvocation {
  return {
    ...source,
    procedure: "persistentArmorEffect",
    spell,
    ...persistentArmorEffectShape(actorId, executionFacts),
  };
}

function persistentArmorEffectHasWillingCreatureTarget(
  spell: Pick<BattleSpellAdmissionSource, "mechanics">,
): boolean {
  if (spell.mechanics.family !== "ongoing_effect") {
    return false;
  }
  const attachment = spell.mechanics.attachment;
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    willingCreatureTargetSelection(attachment.value.selection)
  );
}

function admitPersistentArmorEffect(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  executionFacts: PersistentArmorEffectExecutionFacts,
): readonly PersistentArmorInvocation[] {
  return ctx.spellCastOptions.flatMap((option) =>
    option.spellLevel < executionFacts.slotLevel
      ? []
      : [
          buildPersistentArmorEffectInvocation(
            ctx.actor.combatantId,
            spell,
            executionFacts,
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(option),
            },
          ),
        ],
  );
}

export function admitPersistentArmorEffectInvocationSpellAccess(
  actorId: CombatantId,
  access: {
    readonly spell: BattleSpellAdmissionSource;
    readonly executionFacts: PersistentArmorEffectExecutionFacts;
  },
): readonly PersistentArmorInvocation[] {
  if (!persistentArmorEffectHasWillingCreatureTarget(access.spell)) {
    return [];
  }
  return [
    buildPersistentArmorEffectInvocation(
      actorId,
      access.spell,
      access.executionFacts,
      {
        access: { tag: "armorOfShadows" },
        resource: { tag: "none" },
      },
    ),
  ];
}

function discoverPersistentArmorEffectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function applyPersistentArmorEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || combatantWearingArmor(state, target)) {
    return state;
  }

  return replaceTargetSpellActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === invocation.activeEffect.kind &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolvePersistentArmorEffect(
  input: SpellProcedureProfileResolveInput<PersistentArmorInvocation>,
): BattleResolutionResult {
  const originalState = input.input.state;
  const castingState = input.input.castingState;

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined &&
    input.fillSet.objectTarget !== undefined
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    input.fillSet.targetId === undefined &&
    input.fillSet.objectTarget === undefined
  ) {
    return needsHolesResult(originalState, input.input.subject, [
      spellTargetHole(originalState, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.objectTarget !== undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Object target fill does not match this spell act.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId === undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = originalState.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      originalState,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll != null ||
    input.fillSet.damageRoll != null ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Persistent spell effects do not use attack or damage fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const effected = applyPersistentArmorEffect(
    castingState,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: originalState,
    startConcentration: false,
  });
}

const PersistentArmorEffectInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentArmorEffect"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      rangeFeet: MovementFeet,
      activeEffect: PersistentArmorEffectSchema,
    }),
    Schema.Struct({
      access: ArmorOfShadowsSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentArmorEffect"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      rangeFeet: MovementFeet,
      activeEffect: PersistentArmorEffectSchema,
    }),
  ]),
);
export const persistentArmorEffectProfile: SpellProcedureDeclaration<
  "persistentArmorEffect",
  PersistentArmorInvocation,
  PersistentArmorEffectMechanicsFacts,
  PersistentArmorEffectMechanicsIssue
> = {
  procedure: "persistentArmorEffect",
  executionSchema: PersistentArmorEffectInvocationSchema,
  admitMechanics: admitPersistentArmorEffectMechanics,
  discoverCastAct: discoverPersistentArmorEffectCastAct,
  resolve: resolvePersistentArmorEffect,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
