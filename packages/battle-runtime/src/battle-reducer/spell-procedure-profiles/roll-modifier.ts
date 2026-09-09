import { optionalProperty } from "../../optional-property.ts";
import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
import {
  movementFeet,
  PositiveInteger,
  type PositiveInteger as PositiveIntegerType,
  spellSlotLevel,
  type MovementFeet as MovementFeetType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Ability,
  Attachment,
  DcSource,
  EffectAtom,
  SpellMechanics,
  SpellLevel,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type {
  CantripSpellAccess,
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  NoSpellInvocationResource,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";

import { BattleProcedureExecutionRef, CombatantId } from "../../identity.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleD20RollModifierSkillFilter,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BattleActiveEffectExpiration,
  type RollModifierSpellTargeting,
  type SelectedRollModifierSpellEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  rollModifierUsesTargetAbilityChoices,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHole,
  spellRollModifierSkillChoiceHoleId,
  spellRollModifierTargetAbilityChoicesHole,
  spellRollModifierTargetAbilityChoicesHoleId,
} from "../spells-damage-fills.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import {
  rollModifierDelta,
  rollModifierKindsAreSupported,
  rollModifierSkillFilter,
  scalarBuffSpellRangeFeet,
} from "../spells-profiles-support.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
} from "../spells-resolve-target-selection.ts";
import {
  spellTargetHole,
  spellTargetListHole,
  spellTargetListHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Match, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  BATTLE_SURFACE_ABILITIES,
  BATTLE_SURFACE_SKILLS,
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  RollModifierSpellSaveGateSchema,
  RollModifierSpellTargetingSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  BATTLE_D20_ROLL_MODIFIER_KINDS,
  type BattleD20RollModifierKind,
} from "../domain-constants.ts";
import {
  admitSpellAreaAttachment,
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellDurationTicksFromCanonicalValue,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellPositiveIntegerFromSurface,
  spellSlotLevelFromSurface,
  spellTouchRangeFeet,
  type SpellAttachmentRejection,
  type SpellAreaAttachmentAdmissionResult,
  type SpellMechanicsAdmissionSource,
  type SpellCanonicalDurationValue,
  type SpellOngoingOperationOccurrence,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
  type SpellTargetAttachmentAdmissionResult,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

const D20RollModifierEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("d20RollModifier"),
  sourceCombatantId: CombatantId,
  on: Schema.Array(Schema.Literals(BATTLE_D20_ROLL_MODIFIER_KINDS)),
  delta: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("fixedNumber"),
      amount: Schema.Number,
      sign: Schema.Literals(["+", "-"]),
    }),
    Schema.Struct({
      dice: Schema.Number,
      dieSize: Schema.Literals(BATTLE_D20_ROLL_MODIFIER_DIE_SIZES),
      sign: Schema.Literals(["+", "-"]),
    }),
  ]),
  skillFilter: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("none") }),
    Schema.Struct({
      kind: Schema.Literal("fixed"),
      skill: Schema.Literals(BATTLE_SURFACE_SKILLS),
    }),
    Schema.Struct({
      kind: Schema.Literal("choice"),
      options: Schema.NonEmptyArray(Schema.Literals(BATTLE_SURFACE_SKILLS)),
    }),
  ]),
  expiresAt: BattleActiveEffectExpirationSchema,
});

const AbilityCheckRollModeEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("abilityCheckRollMode"),
  sourceCombatantId: CombatantId,
  mode: Schema.Literal("advantage"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

type RollModifierInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
>;
type RollModifierResolveInput =
  SpellProcedureProfileResolveInput<RollModifierInvocation>;
type RollModifierD20Effect = Extract<
  RollModifierInvocation["effect"],
  { readonly kind: "d20RollModifier" }
>;
type RollModifierAbilityCheckModeEffect = Extract<
  RollModifierInvocation["effect"],
  { readonly kind: "abilityCheckRollMode" }
>;
type RollModifierMechanics =
  | Extract<SpellMechanics, { readonly family: "ongoing_effect" }>
  | Extract<SpellMechanics, { readonly family: "activation" }>;

type RollModifierNumericEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_numeric" }
>;
type RollModifierAbilityCheckEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;
type RollModifierMovementTraceEffect = Extract<
  EffectAtom,
  { readonly kind: "suppress_movement_trace" }
>;
type RollModifierNumericDelta = Exclude<
  ReturnType<typeof rollModifierDelta>,
  null
>;
type RollModifierTargetCountProjection =
  | { readonly kind: "allLegalTargets" }
  | { readonly kind: "fixed"; readonly count: PositiveIntegerType }
  | {
      readonly kind: "linear";
      readonly base: PositiveIntegerType;
      readonly baseLevel: SpellSlotLevel;
      readonly perSlotAboveBase: PositiveIntegerType;
    };
type RollModifierTargetingProjection =
  | { readonly kind: "selfAndChosenLegalTargets" }
  | {
      readonly kind: "targetList";
      readonly count: RollModifierTargetCountProjection;
      readonly requiredTargetDisposition: "unrestricted" | "willing";
    };
type RollModifierTargetListTargetingProjection = Extract<
  RollModifierTargetingProjection,
  { readonly kind: "targetList" }
>;
type RollModifierSelfAndChosenLegalTargetsProjection = Extract<
  RollModifierTargetingProjection,
  { readonly kind: "selfAndChosenLegalTargets" }
>;
type RollModifierNumericEffectProjection = {
  readonly on: readonly BattleD20RollModifierKind[];
  readonly delta: RollModifierNumericDelta;
  readonly skillFilter: BattleD20RollModifierSkillFilter;
};
type RollModifierAbilityCheckEffectProjection = {
  readonly abilityChoices: readonly Ability[];
  readonly abilityChoiceApplication: "single" | "perTarget";
};
type RollModifierProfileShape =
  | {
      readonly kind: "numeric";
      readonly targeting: RollModifierTargetingProjection;
      readonly effect: RollModifierNumericEffectProjection;
      readonly saveGate: {
        readonly ability: Ability;
        readonly dc: DcSource;
      } | null;
      readonly rangeFeet: MovementFeetType;
    }
  | {
      readonly kind: "abilityCheck";
      readonly targeting: RollModifierTargetingProjection;
      readonly effect: RollModifierAbilityCheckEffectProjection;
      readonly saveGate: null;
      readonly rangeFeet: MovementFeetType;
    };
type RollModifierDuration =
  | (Extract<
      SpellProcedureMechanicsFacts["duration"],
      { readonly kind: "timed" }
    > & { readonly value: SpellCanonicalDurationValue })
  | (Extract<
      SpellProcedureMechanicsFacts["duration"],
      { readonly kind: "concentration" }
    > & { readonly upTo: SpellCanonicalDurationValue });
type RollModifierMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "duration"
> & {
  readonly range: SpellProcedureMechanicsFacts["range"];
  readonly duration: RollModifierDuration;
} & RollModifierProfileShape;
type RollModifierFailedFact =
  | "castingTime"
  | "range"
  | "duration"
  | "authoredConditionalMechanics"
  | "durationExtension"
  | "durationEnding"
  | "initialPhase"
  | "phaseCount"
  | "attachment"
  | "saveGate"
  | "operation"
  | "operationCount"
  | "effect"
  | "weaponFilter"
  | "abilityFilter"
  | "count"
  | "rangeOrigin"
  | "selection"
  | "typeFilter"
  | "stateFilter"
  | "visibility"
  | "creatureSizeFilter"
  | "relativePosition"
  | "objectFilter"
  | "creatureDisposition"
  | "castingRequirement"
  | "repeatsAllowed"
  | "occupantDispositionFilter"
  | "occupantPerceptionFilter"
  | "excludedAreas"
  | "predicate"
  | "targetLimit"
  | "usageLimit"
  | "repeatSaves"
  | "autoSuccessIfCasterSlotGte"
  | "autoSuccessIfTarget"
  | "saveAppliesIf"
  | "mode";
type RollModifierAdmissionIssue = SpellProcedureAdmissionIssue<
  "rollModifier",
  RollModifierFailedFact,
  UnitMechanicsPath
>;

const ROLL_MODIFIER_TARGET_SELECTION_FIELDS = [
  "mode",
  "count",
  "repeatsAllowed",
  "targetKinds",
  "disposition",
] as const;
const ROLL_MODIFIER_AREA_SELECTION_FIELDS = [] as const;
const ROLL_MODIFIER_AREA_OPTIONAL_FIELDS = [] as const;
const FIRST_ORDINAL = PositiveInteger(1);

type RollModifierAdmittedTargetAttachment = Extract<
  SpellTargetAttachmentAdmissionResult<
    (typeof ROLL_MODIFIER_TARGET_SELECTION_FIELDS)[number]
  >,
  { readonly tag: "admitted" }
>["attachment"];
type RollModifierAdmittedAreaAttachment = Extract<
  SpellAreaAttachmentAdmissionResult<
    (typeof ROLL_MODIFIER_AREA_SELECTION_FIELDS)[number],
    (typeof ROLL_MODIFIER_AREA_OPTIONAL_FIELDS)[number]
  >,
  { readonly tag: "admitted" }
>["attachment"];

type RollModifierActivationPhaseOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number];
  readonly ordinal: PositiveInteger;
};

type RollModifierSaveGateOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number] & { readonly kind: "save_gate" };
  readonly ordinal: PositiveInteger;
};
type RollModifierRepeatSaveOccurrence = {
  readonly phaseOrdinal: PositiveInteger;
  readonly repeatOrdinal: PositiveInteger;
};

function rollModifierActivationPhaseOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly RollModifierActivationPhaseOccurrence[] {
  return mechanics.phases.map((phase, index) => ({
    phase,
    ordinal: PositiveInteger(index + 1),
  }));
}

function rollModifierOperationEffectPath(
  occurrence: SpellOngoingOperationOccurrence | undefined,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? PositiveInteger(1),
  );
}

function rollModifierSaveGateOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly RollModifierSaveGateOccurrence[] {
  return rollModifierActivationPhaseOccurrences(mechanics).flatMap(
    ({ phase, ordinal }) =>
      phase.kind === "save_gate"
        ? [
            {
              phase,
              ordinal,
            },
          ]
        : [],
  );
}

function rollModifierSupportedSaveGateOccurrence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): RollModifierSaveGateOccurrence | undefined {
  return rollModifierSaveGateOccurrences(mechanics).find(
    ({ phase }) => phase.onFail.kind === "modify_roll_numeric",
  );
}

function rollModifierRepeatSaveOccurrences(
  phase: RollModifierSaveGateOccurrence["phase"],
  phaseOrdinal: PositiveInteger,
): readonly RollModifierRepeatSaveOccurrence[] {
  return (phase.repeatSaves ?? []).map((_repeat, index) => ({
    phaseOrdinal,
    repeatOrdinal: PositiveInteger(index + 1),
  }));
}

function isRollModifierDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): duration is RollModifierDuration {
  return (
    (duration.kind === "timed" &&
      isSpellCanonicalDurationValue(duration.value)) ||
    (duration.kind === "concentration" &&
      isSpellCanonicalDurationValue(duration.upTo))
  );
}

function rollModifierTargetCountProjection(
  selection: TargetSelection,
  spellLevel: SpellLevel,
): RollModifierTargetCountProjection | undefined {
  if (selection.mode === "one") {
    return { kind: "fixed", count: PositiveInteger(1) };
  }
  if (selection.mode === "any_number") {
    return { kind: "allLegalTargets" };
  }
  const count = selection.count;
  if (typeof count === "number") {
    const fixedCount = spellPositiveIntegerFromSurface(count);
    return fixedCount === undefined
      ? undefined
      : { kind: "fixed", count: fixedCount };
  }
  return count.kind === "linear"
    ? rollModifierLinearTargetCountProjection(count, spellLevel)
    : undefined;
}

function rollModifierLinearTargetCountProjection(
  count: Extract<
    Exclude<
      Extract<TargetSelection, { mode: "choose_up_to" }>["count"],
      number
    >,
    { kind: "linear" }
  >,
  spellLevel: SpellLevel,
): RollModifierTargetCountProjection | undefined {
  const base = spellPositiveIntegerFromSurface(count.base);
  const perSlotAboveBase = spellPositiveIntegerFromSurface(
    count.perSlotAboveBase,
  );
  const baseLevel = spellSlotLevelFromSurface(count.baseLevel ?? spellLevel);
  if (
    base === undefined ||
    perSlotAboveBase === undefined ||
    baseLevel === undefined
  ) {
    return undefined;
  }
  return {
    kind: "linear",
    base,
    baseLevel,
    perSlotAboveBase,
  };
}

function rollModifierTargetAttachmentTargetingProjection(
  attachment: RollModifierAdmittedTargetAttachment,
  spellLevel: SpellLevel,
): RollModifierTargetListTargetingProjection | undefined {
  const selection = attachment.value.selection;
  if (
    selection.targetKinds !== undefined &&
    !sameStringSet(selection.targetKinds, ["creature"])
  ) {
    return undefined;
  }
  const count = rollModifierTargetCountProjection(selection, spellLevel);
  return count === undefined
    ? undefined
    : {
        kind: "targetList",
        count,
        requiredTargetDisposition:
          "disposition" in selection && selection.disposition === "willing"
            ? "willing"
            : "unrestricted",
      };
}

type RollModifierAreaTargetingProjection = {
  readonly targeting: RollModifierSelfAndChosenLegalTargetsProjection;
  readonly rangeRadiusFeet: MovementFeetType;
};

function rollModifierAreaAttachmentTargetingProjection(
  attachment: RollModifierAdmittedAreaAttachment,
): RollModifierAreaTargetingProjection | undefined {
  const areaValue = attachment.kind === "area" ? attachment : attachment.value;
  if (
    areaValue.origin.kind !== "self" ||
    areaValue.shape.kind !== "emanation" ||
    typeof areaValue.shape.radiusFeet !== "number"
  ) {
    return undefined;
  }
  return {
    targeting: { kind: "selfAndChosenLegalTargets" },
    rangeRadiusFeet: movementFeet(areaValue.shape.radiusFeet),
  };
}

function rollModifierTargetingForSlot(
  targeting: RollModifierTargetingProjection,
  slotLevel: SpellSlotLevel,
): RollModifierSpellTargeting {
  if (targeting.kind === "selfAndChosenLegalTargets") {
    return { kind: "selfAndChosenLegalTargets", minTargets: 1 };
  }
  const maxTargets =
    targeting.count.kind === "allLegalTargets"
      ? "allLegalTargets"
      : targeting.count.kind === "fixed"
        ? targeting.count.count
        : targeting.count.base +
          Math.max(0, Number(slotLevel) - targeting.count.baseLevel) *
            targeting.count.perSlotAboveBase;
  return {
    kind: "targetList",
    minTargets: 1,
    maxTargets,
    requiredTargetDisposition: targeting.requiredTargetDisposition,
  };
}

type RollModifierAttachmentIssueFact = Extract<
  RollModifierFailedFact,
  | "attachment"
  | "rangeOrigin"
  | "selection"
  | "typeFilter"
  | "stateFilter"
  | "visibility"
  | "creatureSizeFilter"
  | "relativePosition"
  | "objectFilter"
  | "creatureDisposition"
  | "castingRequirement"
  | "repeatsAllowed"
  | "occupantDispositionFilter"
  | "occupantPerceptionFilter"
  | "excludedAreas"
>;

function rollModifierAttachmentFailedFact(
  rejection: SpellAttachmentRejection,
): RollModifierAttachmentIssueFact {
  return Match.value(rejection.failedFact).pipe(
    Match.whenOr(
      "attachment",
      "selection",
      "rangeOrigin",
      "typeFilter",
      "stateFilter",
      "visibility",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "castingRequirement",
      "repeatsAllowed",
      "occupantDispositionFilter",
      "occupantPerceptionFilter",
      "excludedAreas",
      (fact) => fact,
    ),
    Match.whenOr(
      "mode",
      "targetKinds",
      "objectOrLocationMaxDimensionFeet",
      "count",
      "disposition",
      "shape",
      "origin",
      () => "attachment" as const,
    ),
    Match.exhaustive,
  );
}

function hasCompleteNumericSavePenaltyFallbackSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  const phase = mechanics.phases[0];
  if (!hasCompleteNumericSavePenaltyRootSignature(mechanics)) return false;
  if (phase?.kind !== "save_gate") return false;
  if (!hasCompleteNumericSavePenaltyPhaseSignature(phase)) {
    return false;
  }
  const selection = phase.attachment.value.selection;
  const targetCount = rollModifierTargetCountProjection(
    selection,
    mechanics.level,
  );
  return hasCompleteNumericSavePenaltySelectionSignature(
    selection,
    targetCount,
  );
}

function hasCompleteNumericSavePenaltyRootSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return [
    hasExactFields(mechanics, [
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
      "phases",
    ]),
    mechanics.level === 1,
    mechanics.school === "enchantment",
    hasExactActionCastingTime(mechanics.castingTime),
    hasExactPointRange(mechanics.range, 30),
    hasExactFallbackComponentSignature(mechanics.components, "required"),
    hasExactOneUnitConcentrationDuration(mechanics.duration, "minute"),
    mechanics.phases.length === 1,
  ].every(Boolean);
}

function hasExactActionCastingTime(
  castingTime: RollModifierMechanics["castingTime"],
): boolean {
  return castingTime.kind === "action" && hasExactFields(castingTime, ["kind"]);
}

function hasExactPointRange(
  range: SpellMechanics["range"],
  feet: number,
): boolean {
  return (
    range.kind === "point" &&
    range.feet === feet &&
    hasExactFields(range, ["kind", "feet"])
  );
}

function hasExactOneUnitConcentrationDuration(
  duration: SpellMechanics["duration"],
  unit: "minute" | "hour",
): boolean {
  if (duration.kind !== "concentration") return false;
  return [
    duration.upTo.amount === 1,
    duration.upTo.unit === unit,
    hasExactFields(duration, ["kind", "upTo"]),
    hasExactFields(duration.upTo, ["amount", "unit"]),
  ].every(Boolean);
}

function hasCompleteNumericSavePenaltyPhaseSignature(
  phase: RollModifierSaveGateOccurrence["phase"],
): phase is RollModifierSaveGateOccurrence["phase"] & {
  readonly attachment: Extract<Attachment, { readonly kind: "hole" }> & {
    readonly value: Extract<
      Extract<Attachment, { readonly kind: "hole" }>["value"],
      { readonly kind: "target" }
    >;
  };
} {
  if (phase.attachment.kind !== "hole") return false;
  if (phase.attachment.value.kind !== "target") return false;
  return [
    hasExactFields(phase, [
      "kind",
      "ability",
      "dc",
      "attachment",
      "onSuccess",
      "onFail",
    ]),
    phase.ability === "cha",
    phase.dc.kind === "caster_spell_save_dc",
    hasExactFields(phase.dc, ["kind"]),
    phase.onSuccess.kind === "none",
    hasExactFields(phase.onSuccess, ["kind"]),
    phase.onFail.kind === "none",
    hasExactFields(phase.onFail, ["kind"]),
    hasExactFields(phase.attachment, ["kind", "holeId", "label", "value"]),
    hasExactFields(phase.attachment.value, ["kind", "selection"]),
  ].every(Boolean);
}

function hasCompleteNumericSavePenaltySelectionSignature(
  selection: TargetSelection,
  targetCount: RollModifierTargetCountProjection | undefined,
): boolean {
  if (selection.mode !== "choose_up_to") return false;
  if (typeof selection.count !== "object") return false;
  if (selection.count.kind !== "linear") return false;
  if (targetCount?.kind !== "linear") return false;
  const hasExactCountFields =
    hasExactFields(selection.count, [
      "kind",
      "base",
      "baseLevel",
      "perSlotAboveBase",
    ]) || hasExactFields(selection.count, ["kind", "base", "perSlotAboveBase"]);
  const hasExactSelectionFields =
    hasExactFields(selection, ["mode", "count"]) ||
    (hasExactFields(selection, ["mode", "count", "targetKinds"]) &&
      selection.targetKinds !== undefined &&
      sameStringSet(selection.targetKinds, ["creature"]));
  return [
    hasExactSelectionFields,
    hasExactCountFields,
    targetCount.base === 3,
    targetCount.baseLevel === 1,
    targetCount.perSlotAboveBase === 1,
  ].every(Boolean);
}

type OngoingRollModifierFallbackEnvelope =
  | {
      readonly kind: "targetList";
      readonly level: SpellLevel;
      readonly school: RollModifierMechanics["school"];
      readonly rangeKind: "point" | "touch";
      readonly rangeFeet: MovementFeetType;
      readonly durationUnit: "minute" | "hour";
      readonly material: "none" | "required";
      readonly targeting: RollModifierTargetListTargetingProjection;
    }
  | {
      readonly kind: "selfEmanation";
      readonly level: SpellLevel;
      readonly school: RollModifierMechanics["school"];
      readonly durationUnit: "hour";
      readonly material: "required";
      readonly radiusFeet: MovementFeetType;
    };
type OngoingRollModifierFallbackProjection = {
  readonly envelope: OngoingRollModifierFallbackEnvelope;
  readonly characteristicOperationOrdinal: PositiveIntegerType;
};

const ONGOING_ROLL_MODIFIER_FALLBACK_ENVELOPES = [
  {
    kind: "targetList",
    level: 1,
    school: "enchantment",
    rangeKind: "point",
    rangeFeet: movementFeet(30),
    durationUnit: "minute",
    material: "required",
    targeting: {
      kind: "targetList",
      count: {
        kind: "linear",
        base: PositiveInteger(3),
        baseLevel: spellSlotLevel(1),
        perSlotAboveBase: PositiveInteger(1),
      },
      requiredTargetDisposition: "unrestricted",
    },
  },
  {
    kind: "targetList",
    level: 0,
    school: "divination",
    rangeKind: "touch",
    rangeFeet: spellTouchRangeFeet(),
    durationUnit: "minute",
    material: "none",
    targeting: {
      kind: "targetList",
      count: { kind: "fixed", count: PositiveInteger(1) },
      requiredTargetDisposition: "willing",
    },
  },
  {
    kind: "targetList",
    level: 2,
    school: "transmutation",
    rangeKind: "touch",
    rangeFeet: spellTouchRangeFeet(),
    durationUnit: "hour",
    material: "required",
    targeting: {
      kind: "targetList",
      count: {
        kind: "linear",
        base: PositiveInteger(1),
        baseLevel: spellSlotLevel(2),
        perSlotAboveBase: PositiveInteger(1),
      },
      requiredTargetDisposition: "unrestricted",
    },
  },
  {
    kind: "selfEmanation",
    level: 2,
    school: "abjuration",
    durationUnit: "hour",
    material: "required",
    radiusFeet: movementFeet(30),
  },
] as const satisfies readonly OngoingRollModifierFallbackEnvelope[];

const ONGOING_ROLL_MODIFIER_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "operations",
] as const;

function hasExactFields(value: object, fields: readonly string[]): boolean {
  return sameStringSet(Object.keys(value), fields);
}

function hasExactPassiveOperationShell(
  operation: Extract<
    RollModifierMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number],
  effectKind: "none" | "suppress_movement_trace",
): boolean {
  return (
    hasExactFields(operation, ["trigger", "effect"]) &&
    operation.trigger.kind === "passive" &&
    hasExactFields(operation.trigger, ["kind"]) &&
    operation.effect.kind === effectKind &&
    hasExactFields(operation.effect, ["kind"])
  );
}

function hasSemanticRollModifierOperation(
  operation: Extract<
    RollModifierMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    operation.trigger.kind === "passive" &&
    (operation.effect.kind === "modify_roll_numeric" ||
      operation.effect.kind === "modify_roll_advantage")
  );
}

type RollModifierFallbackOperationOccurrence = {
  readonly operation: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number];
  readonly ordinal: PositiveIntegerType;
};

function isFallbackCharacteristicOccurrence({
  operation,
}: RollModifierFallbackOperationOccurrence): boolean {
  return (
    hasExactPassiveOperationShell(operation, "none") ||
    hasSemanticRollModifierOperation(operation)
  );
}

function targetListFallbackCharacteristicOrdinal(
  occurrences: readonly RollModifierFallbackOperationOccurrence[],
): PositiveIntegerType | undefined {
  if (occurrences.length === 0) return FIRST_ORDINAL;
  const characteristic = occurrences[0];
  return occurrences.length === 1 &&
    characteristic !== undefined &&
    isFallbackCharacteristicOccurrence(characteristic)
    ? characteristic.ordinal
    : undefined;
}

function selfEmanationFallbackCharacteristicOrdinal(
  occurrences: readonly RollModifierFallbackOperationOccurrence[],
): PositiveIntegerType | undefined {
  const characteristics = occurrences.filter(
    isFallbackCharacteristicOccurrence,
  );
  const movementTraces = occurrences.filter(({ operation }) =>
    hasExactPassiveOperationShell(operation, "suppress_movement_trace"),
  );
  if (
    [
      characteristics.length === 1,
      movementTraces.length === 1,
      occurrences.length === 2,
    ].every(Boolean)
  ) {
    return characteristics[0]?.ordinal;
  }
  if (
    [
      characteristics.length === 0,
      movementTraces.length === 1,
      occurrences.length === 1,
    ].every(Boolean)
  ) {
    const movementTrace = movementTraces[0];
    return movementTrace === undefined
      ? undefined
      : PositiveInteger(Number(movementTrace.ordinal) + 1);
  }
  return undefined;
}

function fallbackCharacteristicOperationOrdinal(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  envelope: OngoingRollModifierFallbackEnvelope,
): PositiveIntegerType | undefined {
  const occurrences = mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
  return Match.value(envelope).pipe(
    Match.when({ kind: "targetList" }, () =>
      targetListFallbackCharacteristicOrdinal(occurrences),
    ),
    Match.when({ kind: "selfEmanation" }, () =>
      selfEmanationFallbackCharacteristicOrdinal(occurrences),
    ),
    Match.exhaustive,
  );
}

function hasExactFallbackComponents(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  material: OngoingRollModifierFallbackEnvelope["material"],
): boolean {
  return hasExactFallbackComponentSignature(mechanics.components, material);
}

function hasExactFallbackComponentSignature(
  components: SpellMechanics["components"],
  material: OngoingRollModifierFallbackEnvelope["material"],
): boolean {
  return (
    hasExactFields(components, ["v", "s", "m"]) &&
    components.v === true &&
    components.s === true &&
    (material === "none"
      ? components.m === false
      : typeof components.m === "string")
  );
}

function hasExactOneConcentrationDuration(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: "concentration" }
> {
  return (
    duration.kind === "concentration" &&
    duration.upTo.amount === 1 &&
    hasExactFields(duration, ["kind", "upTo"]) &&
    hasExactFields(duration.upTo, ["amount", "unit"])
  );
}

type SupportedRollModifierAttachmentProjection = Extract<
  RollModifierAttachmentProjection,
  { readonly tag: "supported" }
> & { readonly rangeFeet: MovementFeetType };

function fallbackTargetCountMatches(
  targeting: RollModifierTargetingProjection,
  count: RollModifierTargetListTargetingProjection["count"],
): boolean {
  return Match.value(count).pipe(
    Match.when(
      { kind: "fixed" },
      (fixed) =>
        targeting.kind === "targetList" &&
        targeting.count.kind === "fixed" &&
        targeting.count.count === fixed.count,
    ),
    Match.when(
      { kind: "linear" },
      (linear) =>
        targeting.kind === "targetList" &&
        targeting.count.kind === "linear" &&
        targeting.count.base === linear.base &&
        targeting.count.baseLevel === linear.baseLevel &&
        targeting.count.perSlotAboveBase === linear.perSlotAboveBase,
    ),
    Match.when({ kind: "allLegalTargets" }, () => false),
    Match.exhaustive,
  );
}

function exactFixedFallbackSelection(selection: TargetSelection): boolean {
  return [
    selection.mode === "one",
    hasExactFields(selection, ["mode", "targetKinds", "disposition"]),
    "disposition" in selection,
    "disposition" in selection && selection.disposition === "willing",
    selection.targetKinds !== undefined,
    selection.targetKinds !== undefined &&
      sameStringSet(selection.targetKinds, ["creature"]),
  ].every(Boolean);
}

function exactLinearFallbackSelection(selection: TargetSelection): boolean {
  if (selection.mode !== "choose_up_to") return false;
  if (typeof selection.count !== "object") return false;
  if (selection.count.kind !== "linear") return false;
  return [
    hasExactFields(selection, ["mode", "count", "targetKinds"]),
    hasExactFields(selection.count, [
      "kind",
      "base",
      "baseLevel",
      "perSlotAboveBase",
    ]),
    selection.targetKinds !== undefined,
    selection.targetKinds !== undefined &&
      sameStringSet(selection.targetKinds, ["creature"]),
  ].every(Boolean);
}

function exactFallbackTargetAttachmentMatches(
  attachment: Attachment,
  count: RollModifierTargetListTargetingProjection["count"],
): boolean {
  if (attachment.kind !== "hole") return false;
  if (attachment.value.kind !== "target") return false;
  if (
    !hasExactFields(attachment, ["kind", "holeId", "label", "value"]) ||
    !hasExactFields(attachment.value, ["kind", "selection"])
  ) {
    return false;
  }
  const selection = attachment.value.selection;
  return Match.value(count).pipe(
    Match.when({ kind: "fixed" }, () => exactFixedFallbackSelection(selection)),
    Match.when({ kind: "linear" }, () =>
      exactLinearFallbackSelection(selection),
    ),
    Match.when({ kind: "allLegalTargets" }, () => false),
    Match.exhaustive,
  );
}

function fallbackTargetRangeMatches(
  range: SpellMechanics["range"],
  envelope: Extract<
    OngoingRollModifierFallbackEnvelope,
    { kind: "targetList" }
  >,
): boolean {
  return envelope.rangeKind === "touch"
    ? range.kind === "touch" && hasExactFields(range, ["kind"])
    : hasExactPointRange(range, envelope.rangeFeet);
}

function targetListFallbackEnvelopeMatches(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  duration: Extract<SpellMechanics["duration"], { kind: "concentration" }>,
  attachment: SupportedRollModifierAttachmentProjection,
  envelope: Extract<
    OngoingRollModifierFallbackEnvelope,
    { kind: "targetList" }
  >,
): boolean {
  const targeting = attachment.targeting;
  return [
    mechanics.level === envelope.level,
    mechanics.school === envelope.school,
    duration.upTo.unit === envelope.durationUnit,
    attachment.rangeFeet === envelope.rangeFeet,
    targeting.kind === "targetList",
    targeting.kind === "targetList" &&
      targeting.requiredTargetDisposition ===
        envelope.targeting.requiredTargetDisposition,
    fallbackTargetCountMatches(targeting, envelope.targeting.count),
    exactFallbackTargetAttachmentMatches(
      mechanics.attachment,
      envelope.targeting.count,
    ),
    fallbackTargetRangeMatches(mechanics.range, envelope),
    hasExactFallbackComponents(mechanics, envelope.material),
  ].every(Boolean);
}

function selfEmanationFallbackEnvelopeMatches(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  duration: Extract<SpellMechanics["duration"], { kind: "concentration" }>,
  attachment: SupportedRollModifierAttachmentProjection,
  envelope: Extract<
    OngoingRollModifierFallbackEnvelope,
    { kind: "selfEmanation" }
  >,
): boolean {
  if (mechanics.attachment.kind !== "area") return false;
  if (mechanics.attachment.origin.kind !== "self") return false;
  if (mechanics.attachment.shape.kind !== "emanation") return false;
  if (typeof mechanics.attachment.shape.radiusFeet !== "number") return false;
  return [
    mechanics.level === envelope.level,
    mechanics.school === envelope.school,
    mechanics.range.kind === "self",
    hasExactFields(mechanics.range, ["kind"]),
    duration.upTo.unit === envelope.durationUnit,
    attachment.targeting.kind === "selfAndChosenLegalTargets",
    attachment.rangeFeet === envelope.radiusFeet,
    hasExactFields(mechanics.attachment, ["kind", "origin", "shape"]),
    hasExactFields(mechanics.attachment.origin, ["kind"]),
    mechanics.attachment.shape.radiusFeet === envelope.radiusFeet,
    hasExactFields(mechanics.attachment.shape, ["kind", "radiusFeet"]),
    hasExactFallbackComponents(mechanics, envelope.material),
  ].every(Boolean);
}

function ongoingRollModifierFallbackProjectionForEnvelope(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  duration: Extract<SpellMechanics["duration"], { kind: "concentration" }>,
  attachment: SupportedRollModifierAttachmentProjection,
  envelope: OngoingRollModifierFallbackEnvelope,
): OngoingRollModifierFallbackProjection | undefined {
  const characteristicOperationOrdinal = fallbackCharacteristicOperationOrdinal(
    mechanics,
    envelope,
  );
  if (characteristicOperationOrdinal === undefined) return undefined;
  const matches = Match.value(envelope).pipe(
    Match.when({ kind: "targetList" }, (targetList) =>
      targetListFallbackEnvelopeMatches(
        mechanics,
        duration,
        attachment,
        targetList,
      ),
    ),
    Match.when({ kind: "selfEmanation" }, (selfEmanation) =>
      selfEmanationFallbackEnvelopeMatches(
        mechanics,
        duration,
        attachment,
        selfEmanation,
      ),
    ),
    Match.exhaustive,
  );
  return matches ? { envelope, characteristicOperationOrdinal } : undefined;
}

function ongoingRollModifierFallbackProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): OngoingRollModifierFallbackProjection | undefined {
  const duration = mechanics.duration;
  if (!hasExactFields(mechanics, ONGOING_ROLL_MODIFIER_ROOT_FIELDS)) {
    return undefined;
  }
  if (!hasExactActionCastingTime(mechanics.castingTime)) return undefined;
  if (!hasExactOneConcentrationDuration(duration)) {
    return undefined;
  }
  const attachment = rollModifierAttachmentProjection(
    mechanics.attachment,
    mechanics.range,
    mechanics.level,
  );
  if (attachment.tag !== "supported") return undefined;
  const rangeFeet = attachment.rangeFeet;
  if (rangeFeet === null) return undefined;
  const supportedAttachment = { ...attachment, rangeFeet };

  return ONGOING_ROLL_MODIFIER_FALLBACK_ENVELOPES.map((envelope) =>
    ongoingRollModifierFallbackProjectionForEnvelope(
      mechanics,
      duration,
      supportedAttachment,
      envelope,
    ),
  ).find((projection) => projection !== undefined);
}

function rollModifierOngoingCharacteristicEffectIsProjectable(
  operation: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  if (operation.trigger.kind !== "passive") return false;
  if (operation.effect.kind === "modify_roll_numeric") {
    return rollModifierNumericEffectProjection(operation.effect) !== undefined;
  }
  return (
    operation.effect.kind === "modify_roll_advantage" &&
    rollModifierAbilityCheckEffectProjection(operation.effect) !== undefined
  );
}

function rollModifierOngoingCharacteristicOperationIsProjectable(
  operation: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    rollModifierOngoingCharacteristicEffectIsProjectable(operation) &&
    spellOngoingOperationUnsupportedFacts(operation).length === 0
  );
}

type RollModifierRepresentationProjection =
  | {
      readonly kind: "ongoing";
      readonly mechanics: Extract<
        RollModifierMechanics,
        { readonly family: "ongoing_effect" }
      >;
      readonly fallbackProjection:
        | OngoingRollModifierFallbackProjection
        | undefined;
    }
  | {
      readonly kind: "activation";
      readonly mechanics: Extract<
        RollModifierMechanics,
        { readonly family: "activation" }
      >;
    };

function rollModifierRepresentationProjection(
  mechanics: SpellMechanics,
): RollModifierRepresentationProjection | undefined {
  if (
    mechanics.family !== "ongoing_effect" &&
    mechanics.family !== "activation"
  ) {
    return undefined;
  }
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const hasSupportedRangeRole =
        ongoing.range.kind === "self" ||
        ongoing.range.kind === "point" ||
        ongoing.range.kind === "touch";
      const hasAttachmentRole =
        ongoing.attachment.kind === "hole" ||
        ongoing.attachment.kind === "area";
      const hasPassiveTriggerRole = ongoing.operations.some(
        ({ trigger }) => trigger.kind === "passive",
      );
      const hasRollEffectRole = ongoing.operations.some(
        rollModifierOngoingCharacteristicOperationIsProjectable,
      );
      if (!hasRollEffectRole) {
        const fallbackProjection =
          ongoingRollModifierFallbackProjection(ongoing);
        return fallbackProjection === undefined
          ? undefined
          : {
              kind: "ongoing" as const,
              mechanics: ongoing,
              fallbackProjection,
            };
      }
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          {
            name: "castingTime",
            present: ongoing.castingTime.kind === "action",
          },
          { name: "range", present: hasSupportedRangeRole },
          { name: "attachment", present: hasAttachmentRole },
          { name: "passiveTrigger", present: hasPassiveTriggerRole },
          {
            name: "duration",
            present: isRollModifierDuration(ongoing.duration),
          },
        ],
      })
        ? {
            kind: "ongoing" as const,
            mechanics: ongoing,
            fallbackProjection: undefined,
          }
        : undefined;
    }),
    Match.when({ family: "activation" }, (activation) => {
      const hasNumericFailureEffect = activation.phases.some(
        (phase) =>
          phase.kind === "save_gate" &&
          phase.onFail.kind === "modify_roll_numeric",
      );
      if (!hasNumericFailureEffect) {
        return hasCompleteNumericSavePenaltyFallbackSignature(activation)
          ? { kind: "activation" as const, mechanics: activation }
          : undefined;
      }
      return { kind: "activation" as const, mechanics: activation };
    }),
    Match.exhaustive,
  );
}

function rollModifierIssue(
  failedFact: RollModifierFailedFact,
  mechanicsPath: UnitMechanicsPath,
): RollModifierAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "rollModifier",
    failedFact,
    mechanicsPath,
    message: `Unsupported rollModifier mechanics fact: ${failedFact}.`,
  };
}

function rollModifierNumericEffectProjection(
  effect: RollModifierNumericEffect,
): RollModifierNumericEffectProjection | undefined {
  if (
    !rollModifierNumericEffectShapeProjection(effect) ||
    effect.weaponFilter !== undefined ||
    effect.abilityFilter !== undefined ||
    effect.count !== undefined
  ) {
    return undefined;
  }
  if (!rollModifierKindsAreSupported(effect.on)) return undefined;
  const delta = rollModifierDelta(effect.delta);
  const skillFilter = rollModifierSkillFilter(effect.skillFilter);
  if (delta === null || skillFilter === null) return undefined;
  return {
    on: effect.on,
    delta,
    skillFilter,
  };
}

function rollModifierNumericEffectShapeProjection(
  effect: RollModifierNumericEffect,
): boolean {
  return (
    rollModifierDelta(effect.delta) !== null &&
    rollModifierKindsAreSupported(effect.on) &&
    rollModifierSkillFilter(effect.skillFilter) !== null
  );
}

function rollModifierNumericEffectConstraintIssues(
  effect: RollModifierNumericEffect,
): readonly RollModifierFailedFact[] {
  const issues: RollModifierFailedFact[] = [];
  if (effect.weaponFilter !== undefined) issues.push("weaponFilter");
  if (effect.abilityFilter !== undefined) issues.push("abilityFilter");
  if (effect.count !== undefined) issues.push("count");
  return issues;
}

function rollModifierAbilityCheckEffectProjection(
  effect: RollModifierAbilityCheckEffect,
): RollModifierAbilityCheckEffectProjection | undefined {
  const abilityFilter = rollModifierAbilityChoiceFilter(effect);
  if (
    abilityFilter === undefined ||
    !rollModifierAbilityCheckEffectShapeSupported(effect)
  )
    return undefined;
  return {
    abilityChoices: abilityFilter.value.options,
    abilityChoiceApplication:
      abilityFilter.kind === "per_target_hole" ? "perTarget" : "single",
  };
}

function rollModifierAbilityCheckEffectShapeSupported(
  effect: RollModifierAbilityCheckEffect,
): boolean {
  return [
    (effect.affects ?? "self_roll") === "self_roll",
    effect.mode === "advantage",
    sameStringSet(effect.on, ["ability_check"]),
    effect.skillFilter === undefined,
    effect.conditionFilter === undefined,
    effect.saveAbilityFilter === undefined,
    effect.saveSourceFilter === undefined,
    effect.contextRangeFeet === undefined,
    effect.spellSourceFilter === undefined,
    effect.attackerTypeFilter === undefined,
    effect.count === undefined,
    effect.expiresOn === undefined,
  ].every(Boolean);
}

function rollModifierAbilityChoiceFilter(
  effect: RollModifierAbilityCheckEffect,
) {
  const abilityFilter = effect.abilityFilter;
  if (
    typeof abilityFilter !== "object" ||
    abilityFilter === null ||
    !("kind" in abilityFilter) ||
    (abilityFilter.kind !== "hole" &&
      abilityFilter.kind !== "per_target_hole") ||
    !("value" in abilityFilter) ||
    abilityFilter.value.kind !== "choice"
  ) {
    return undefined;
  }
  return abilityFilter;
}

type RollModifierIssuePush = (
  failedFact: RollModifierFailedFact,
  mechanicsPath: UnitMechanicsPath,
) => void;

function rollModifierAttachmentProjection(
  attachment: Attachment,
  range: SpellMechanics["range"],
  spellLevel: SpellLevel,
): RollModifierAttachmentProjection {
  const targetAdmission = admitSpellTargetAttachment(
    attachment,
    ROLL_MODIFIER_TARGET_SELECTION_FIELDS,
  );
  if (targetAdmission.tag === "admitted") {
    const targeting = rollModifierTargetAttachmentTargetingProjection(
      targetAdmission.attachment,
      spellLevel,
    );
    const rangeFeet = scalarBuffSpellRangeFeet(range);
    return targeting === undefined
      ? { tag: "unsupported" }
      : { tag: "supported", targeting, rangeFeet };
  }
  if (targetAdmission.reason !== "targetAttachmentMissing") {
    return { tag: "rejected", rejections: [...targetAdmission.rejections] };
  }
  const areaAdmission = admitSpellAreaAttachment(
    attachment,
    ROLL_MODIFIER_AREA_SELECTION_FIELDS,
    ROLL_MODIFIER_AREA_OPTIONAL_FIELDS,
  );
  if (areaAdmission.tag === "rejected") {
    return { tag: "rejected", rejections: [...areaAdmission.rejections] };
  }
  const areaProjection = rollModifierAreaAttachmentTargetingProjection(
    areaAdmission.attachment,
  );
  if (areaProjection === undefined) return { tag: "unsupported" };
  return {
    tag: "supported",
    targeting: areaProjection.targeting,
    rangeFeet: areaProjection.rangeRadiusFeet,
  };
}

type RollModifierBranchProjection =
  | {
      readonly tag: "supported";
      readonly shape: RollModifierProfileShape;
      readonly evidence:
        | { readonly kind: "activation" }
        | {
            readonly kind: "ongoing";
            readonly consumedOperationOrdinal: PositiveIntegerType;
            readonly coverage:
              | { readonly kind: "complete" }
              | {
                  readonly kind: "partial";
                  readonly unowned: readonly [
                    SpellMechanicsBranchPath,
                    SpellMechanicsBranchPath,
                  ];
                };
          };
    }
  | { readonly tag: "unsupported" };

type RollModifierAttachmentProjection =
  | {
      readonly tag: "supported";
      readonly targeting: RollModifierTargetingProjection;
      readonly rangeFeet: MovementFeetType | null;
    }
  | {
      readonly tag: "rejected";
      readonly rejections: readonly SpellAttachmentRejection[];
    }
  | { readonly tag: "unsupported" };

type RollModifierMovementTraceOccurrence = SpellOngoingOperationOccurrence & {
  readonly operation: SpellOngoingOperationOccurrence["operation"] & {
    readonly trigger: { readonly kind: "passive" };
    readonly effect: RollModifierMovementTraceEffect;
  };
};

function isRollModifierMovementTraceOccurrence(
  occurrence: SpellOngoingOperationOccurrence,
): occurrence is RollModifierMovementTraceOccurrence {
  return (
    occurrence.operation.trigger.kind === "passive" &&
    occurrence.operation.effect.kind === "suppress_movement_trace"
  );
}

function appendRollModifierAttachmentIssues(
  attachment: RollModifierAttachmentProjection,
  mechanicsPath: UnitMechanicsPath,
  pushIssue: RollModifierIssuePush,
): void {
  if (attachment.tag === "rejected") {
    for (const rejection of attachment.rejections) {
      pushIssue(rollModifierAttachmentFailedFact(rejection), mechanicsPath);
    }
  } else if (attachment.tag === "unsupported") {
    pushIssue("attachment", mechanicsPath);
  }
}

function appendRollModifierOngoingEnvelopeIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  pushIssue: RollModifierIssuePush,
): void {
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalMechanics !== undefined) {
    pushIssue("authoredConditionalMechanics", spellMechanicsRootPath());
  }
}

function appendRollModifierOngoingOperationIssues(
  occurrences: readonly SpellOngoingOperationOccurrence[],
  pushIssue: RollModifierIssuePush,
): void {
  for (const occurrence of occurrences) {
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }
}

function isRollModifierCharacteristicOccurrence({
  operation,
}: SpellOngoingOperationOccurrence): boolean {
  return hasSemanticRollModifierOperation(operation);
}

function appendRollModifierOngoingOperationCountIssues(
  occurrences: readonly SpellOngoingOperationOccurrence[],
  expected: SpellOngoingOperationOccurrence | undefined,
  movementTraceOccurrence: RollModifierMovementTraceOccurrence | undefined,
  pushIssue: RollModifierIssuePush,
): void {
  const extras = occurrences.filter(
    ({ ordinal }) =>
      ordinal !== expected?.ordinal &&
      ordinal !== movementTraceOccurrence?.ordinal,
  );
  if (occurrences.length === 0) {
    pushIssue("operationCount", spellOngoingOperationPath(FIRST_ORDINAL));
  }
  for (const occurrence of extras) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }
}

function rollModifierOngoingEvidence(
  consumedOperationOrdinal: PositiveIntegerType,
  movementTraceOccurrence: RollModifierMovementTraceOccurrence | undefined,
): Extract<
  Extract<RollModifierBranchProjection, { tag: "supported" }>["evidence"],
  { kind: "ongoing" }
> {
  return {
    kind: "ongoing",
    consumedOperationOrdinal,
    coverage:
      movementTraceOccurrence === undefined
        ? { kind: "complete" }
        : {
            kind: "partial",
            unowned: [
              spellOngoingOperationPath(movementTraceOccurrence.ordinal),
              spellOngoingOperationEffectPath(movementTraceOccurrence.ordinal),
            ],
          },
  };
}

function rollModifierNumericOngoingBranchProjection(
  effect: RollModifierNumericEffect,
  expected: SpellOngoingOperationOccurrence,
  attachment: RollModifierAttachmentProjection,
  movementTraceOccurrence: RollModifierMovementTraceOccurrence | undefined,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  const effectProjection = rollModifierNumericEffectProjection(effect);
  for (const failedFact of rollModifierNumericEffectConstraintIssues(effect)) {
    pushIssue(failedFact, rollModifierOperationEffectPath(expected));
  }
  if (
    effectProjection === undefined &&
    !rollModifierNumericEffectShapeProjection(effect)
  ) {
    pushIssue("effect", rollModifierOperationEffectPath(expected));
  }
  if (
    attachment.tag !== "supported" ||
    attachment.rangeFeet === null ||
    effectProjection === undefined
  ) {
    return { tag: "unsupported" };
  }
  return {
    tag: "supported",
    evidence: rollModifierOngoingEvidence(
      expected.ordinal,
      movementTraceOccurrence,
    ),
    shape: {
      kind: "numeric",
      targeting: attachment.targeting,
      effect: effectProjection,
      saveGate: null,
      rangeFeet: attachment.rangeFeet,
    },
  };
}

function rollModifierAbilityCheckOngoingBranchProjection(
  effect: RollModifierAbilityCheckEffect,
  expected: SpellOngoingOperationOccurrence,
  attachment: RollModifierAttachmentProjection,
  movementTraceOccurrence: RollModifierMovementTraceOccurrence | undefined,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  const effectProjection = rollModifierAbilityCheckEffectProjection(effect);
  if (effectProjection === undefined) {
    pushIssue("effect", rollModifierOperationEffectPath(expected));
  }
  if (
    attachment.tag !== "supported" ||
    attachment.rangeFeet === null ||
    effectProjection === undefined
  ) {
    return { tag: "unsupported" };
  }
  return {
    tag: "supported",
    evidence: rollModifierOngoingEvidence(
      expected.ordinal,
      movementTraceOccurrence,
    ),
    shape: {
      kind: "abilityCheck",
      targeting: attachment.targeting,
      effect: effectProjection,
      saveGate: null,
      rangeFeet: attachment.rangeFeet,
    },
  };
}

function rollModifierOngoingBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  pushIssue: RollModifierIssuePush,
  fallbackProjection: OngoingRollModifierFallbackProjection | undefined,
): RollModifierBranchProjection {
  appendRollModifierOngoingEnvelopeIssues(mechanics, pushIssue);
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  appendRollModifierOngoingOperationIssues(occurrences, pushIssue);
  const expected = occurrences.find(isRollModifierCharacteristicOccurrence);
  const movementTraceOccurrences = occurrences.filter(
    isRollModifierMovementTraceOccurrence,
  );
  const movementTraceOccurrence =
    movementTraceOccurrences.length === 1
      ? movementTraceOccurrences[0]
      : undefined;
  appendRollModifierOngoingOperationCountIssues(
    occurrences,
    expected,
    movementTraceOccurrence,
    pushIssue,
  );
  const attachment = rollModifierAttachmentProjection(
    mechanics.attachment,
    mechanics.range,
    mechanics.level,
  );
  appendRollModifierAttachmentIssues(
    attachment,
    spellOngoingAttachmentPath(),
    pushIssue,
  );
  if (expected === undefined) {
    const mechanicsPath =
      fallbackProjection === undefined
        ? rollModifierOperationEffectPath(expected)
        : spellOngoingOperationEffectPath(
            fallbackProjection.characteristicOperationOrdinal,
          );
    pushIssue("operation", mechanicsPath);
    pushIssue("effect", mechanicsPath);
    return { tag: "unsupported" };
  }
  const effect = expected.operation.effect;
  if (effect.kind === "modify_roll_numeric") {
    return rollModifierNumericOngoingBranchProjection(
      effect,
      expected,
      attachment,
      movementTraceOccurrence,
      pushIssue,
    );
  }
  if (effect.kind === "modify_roll_advantage") {
    return rollModifierAbilityCheckOngoingBranchProjection(
      effect,
      expected,
      attachment,
      movementTraceOccurrence,
      pushIssue,
    );
  }
  pushIssue("effect", rollModifierOperationEffectPath(expected));
  return { tag: "unsupported" };
}

function appendRollModifierSaveGateOptionalIssues(
  occurrence: RollModifierSaveGateOccurrence,
  pushIssue: RollModifierIssuePush,
): void {
  for (const repeat of rollModifierRepeatSaveOccurrences(
    occurrence.phase,
    occurrence.ordinal,
  )) {
    pushIssue(
      "repeatSaves",
      spellActivationRepeatPath(repeat.phaseOrdinal, repeat.repeatOrdinal),
    );
  }
  const phasePath = spellActivationPhasePath(occurrence.ordinal);
  if (occurrence.phase.autoSuccessIfCasterSlotGte !== undefined) {
    pushIssue("autoSuccessIfCasterSlotGte", phasePath);
  }
  if (occurrence.phase.autoSuccessIfTarget !== undefined) {
    pushIssue("autoSuccessIfTarget", phasePath);
  }
  if (occurrence.phase.saveAppliesIf !== undefined) {
    pushIssue("saveAppliesIf", phasePath);
  }
  if (occurrence.phase.usageLimit !== undefined) {
    pushIssue("usageLimit", phasePath);
  }
}

function appendRollModifierActivationPhaseIssues(
  occurrences: readonly RollModifierActivationPhaseOccurrence[],
  pushIssue: RollModifierIssuePush,
): void {
  for (const occurrence of occurrences) {
    if (
      occurrence.phase.kind === "direct" &&
      occurrence.phase.mode !== undefined
    ) {
      pushIssue("mode", spellActivationPhasePath(occurrence.ordinal));
    }
    if (occurrence.phase.kind !== "save_gate") continue;
    appendRollModifierSaveGateOptionalIssues(
      { phase: occurrence.phase, ordinal: occurrence.ordinal },
      pushIssue,
    );
  }
}

function appendRollModifierActivationPhaseCountIssues(
  phases: readonly RollModifierActivationPhaseOccurrence[],
  selectedOrdinal: PositiveIntegerType | undefined,
  pushIssue: RollModifierIssuePush,
): void {
  if (phases.length === 1 && selectedOrdinal === FIRST_ORDINAL) return;
  for (const occurrence of phases) {
    if (occurrence.ordinal === selectedOrdinal) continue;
    pushIssue("phaseCount", spellActivationPhasePath(occurrence.ordinal));
  }
  if (phases.length === 0) {
    pushIssue("phaseCount", spellActivationPhasePath(FIRST_ORDINAL));
  }
}

function appendMissingRollModifierSaveGateIssue(
  candidate: RollModifierSaveGateOccurrence | undefined,
  pushIssue: RollModifierIssuePush,
): void {
  if (candidate === undefined) {
    pushIssue("saveGate", spellActivationPhasePath(FIRST_ORDINAL));
  } else if (candidate.phase.onFail.kind !== "modify_roll_numeric") {
    pushIssue(
      "effect",
      spellActivationEffectPath(candidate.ordinal, FIRST_ORDINAL),
    );
  } else {
    pushIssue("saveGate", spellActivationPhasePath(candidate.ordinal));
  }
}

function rollModifierActivationNumericEffectProjection(
  effect: RollModifierNumericEffect,
  phaseOrdinal: PositiveIntegerType,
  pushIssue: RollModifierIssuePush,
): RollModifierNumericEffectProjection | undefined {
  const effectPath = spellActivationEffectPath(phaseOrdinal, FIRST_ORDINAL);
  for (const failedFact of rollModifierNumericEffectConstraintIssues(effect)) {
    pushIssue(failedFact, effectPath);
  }
  const effectProjection = rollModifierNumericEffectProjection(effect);
  if (
    effectProjection === undefined &&
    !rollModifierNumericEffectShapeProjection(effect)
  ) {
    pushIssue("effect", effectPath);
  }
  return effectProjection;
}

function rollModifierSupportedActivationBranch(
  phase: RollModifierSaveGateOccurrence["phase"],
  attachment: RollModifierAttachmentProjection,
  effect: RollModifierNumericEffectProjection | undefined,
  rangeFeet: MovementFeetType | null,
): RollModifierBranchProjection {
  if (
    attachment.tag !== "supported" ||
    attachment.rangeFeet === null ||
    effect === undefined ||
    rangeFeet === null
  ) {
    return { tag: "unsupported" };
  }
  return {
    tag: "supported",
    evidence: { kind: "activation" },
    shape: {
      kind: "numeric",
      targeting: attachment.targeting,
      effect,
      saveGate: { ability: phase.ability, dc: phase.dc },
      rangeFeet,
    },
  };
}

function rollModifierActivationBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  const phases = rollModifierActivationPhaseOccurrences(mechanics);
  appendRollModifierActivationPhaseIssues(phases, pushIssue);
  const saveGateOccurrences = rollModifierSaveGateOccurrences(mechanics);
  const expected = rollModifierSupportedSaveGateOccurrence(mechanics);
  const selectedOrdinal = expected?.ordinal ?? saveGateOccurrences[0]?.ordinal;
  appendRollModifierActivationPhaseCountIssues(
    phases,
    selectedOrdinal,
    pushIssue,
  );
  if (expected === undefined) {
    appendMissingRollModifierSaveGateIssue(saveGateOccurrences[0], pushIssue);
    return { tag: "unsupported" };
  }
  const phase = expected.phase;
  const attachment = rollModifierAttachmentProjection(
    phase.attachment,
    mechanics.range,
    mechanics.level,
  );
  appendRollModifierAttachmentIssues(
    attachment,
    spellActivationAttachmentPath(expected.ordinal),
    pushIssue,
  );
  if (phase.onSuccess.kind !== "none") {
    pushIssue(
      "saveGate",
      spellActivationEffectPath(expected.ordinal, FIRST_ORDINAL),
    );
  }
  const effect = phase.onFail;
  if (effect.kind !== "modify_roll_numeric") {
    pushIssue(
      "effect",
      spellActivationEffectPath(expected.ordinal, FIRST_ORDINAL),
    );
    return { tag: "unsupported" };
  }
  const effectProjection = rollModifierActivationNumericEffectProjection(
    effect,
    expected.ordinal,
    pushIssue,
  );
  const rangeFeet = scalarBuffSpellRangeFeet(mechanics.range);
  if (rangeFeet === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  return rollModifierSupportedActivationBranch(
    phase,
    attachment,
    effectProjection,
    rangeFeet,
  );
}

type RollModifierIssueCoordinates = {
  readonly failedFact: RollModifierFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

function rollModifierAreaRangeFeet(
  mechanics: RollModifierMechanics,
): MovementFeetType | null {
  if (mechanics.family !== "ongoing_effect") return null;
  if (mechanics.attachment.kind !== "area") return null;
  if (mechanics.attachment.origin.kind !== "self") return null;
  if (mechanics.attachment.shape.kind !== "emanation") return null;
  return typeof mechanics.attachment.shape.radiusFeet === "number"
    ? movementFeet(mechanics.attachment.shape.radiusFeet)
    : null;
}

function appendRollModifierAdmissionHeaderIssues(
  mechanics: RollModifierMechanics,
  duration: RollModifierDuration | undefined,
  pushIssue: RollModifierIssuePush,
): void {
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (duration === undefined) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const mechanicsPath of persistentAreaDurationChildPaths(
    mechanics.duration,
  )) {
    const branch = mechanicsPath.nodes.at(-1);
    pushIssue(
      branch?.role === "extension" ? "durationExtension" : "durationEnding",
      mechanicsPath,
    );
  }
  const rangeFeet = scalarBuffSpellRangeFeet(mechanics.range);
  if (rangeFeet === null && rollModifierAreaRangeFeet(mechanics) === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
}

function rollModifierBranchProjectionForRepresentation(
  representation: RollModifierRepresentationProjection,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  return Match.value(representation).pipe(
    Match.when({ kind: "ongoing" }, (ongoing) =>
      rollModifierOngoingBranchProjection(
        ongoing.mechanics,
        pushIssue,
        ongoing.fallbackProjection,
      ),
    ),
    Match.when({ kind: "activation" }, (activation) =>
      rollModifierActivationBranchProjection(activation.mechanics, pushIssue),
    ),
    Match.exhaustive,
  );
}

function rollModifierMechanicsEvidence(
  mechanics: RollModifierMechanics,
  branch: Extract<RollModifierBranchProjection, { tag: "supported" }>,
): SpellProcedureMechanicsEvidence {
  const consumed = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellDurationValuePath(),
    ...(branch.evidence.kind === "ongoing"
      ? [
          spellOngoingAttachmentPath(),
          spellOngoingOperationPath(branch.evidence.consumedOperationOrdinal),
          spellOngoingOperationEffectPath(
            branch.evidence.consumedOperationOrdinal,
          ),
        ]
      : [
          spellActivationPhasePath(FIRST_ORDINAL),
          spellActivationAttachmentPath(FIRST_ORDINAL),
          spellActivationEffectPath(FIRST_ORDINAL, FIRST_ORDINAL),
        ]),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ] as const;
  return branch.evidence.kind === "ongoing" &&
    branch.evidence.coverage.kind === "partial"
    ? { consumed, unowned: branch.evidence.coverage.unowned }
    : { consumed, unowned: [] };
}

function supportedRollModifierMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
  mechanics: RollModifierMechanics,
  duration: RollModifierDuration,
  branch: Extract<RollModifierBranchProjection, { tag: "supported" }>,
): Extract<
  SpellProcedureMechanicsInspection<
    "rollModifier",
    RollModifierMechanicsFacts,
    RollModifierInvocation,
    RollModifierAdmissionIssue
  >,
  { tag: "supported" }
> {
  const facts = {
    ...source.spellDefinitionRuleFacts,
    duration,
    ...branch.shape,
  } satisfies RollModifierMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "rollModifier",
      facts,
      evidence: rollModifierMechanicsEvidence(mechanics, branch),
      admit: (executionSource, ctx) =>
        admitRollModifier(executionSource, ctx, facts),
    },
  };
}

function rollModifierMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "rollModifier",
  RollModifierMechanicsFacts,
  RollModifierInvocation,
  RollModifierAdmissionIssue
> {
  const representation = rollModifierRepresentationProjection(source.mechanics);
  if (representation === undefined) {
    return { tag: "notRepresented" };
  }
  const mechanics = representation.mechanics;
  const issues: RollModifierIssueCoordinates[] = [];
  const pushIssue: RollModifierIssuePush = (failedFact, mechanicsPath) => {
    issues.push({ failedFact, mechanicsPath });
  };
  const duration = isRollModifierDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  appendRollModifierAdmissionHeaderIssues(mechanics, duration, pushIssue);
  const branch = rollModifierBranchProjectionForRepresentation(
    representation,
    pushIssue,
  );
  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          rollModifierIssue(failedFact, mechanicsPath),
      ),
    };
  }
  if (branch.tag !== "supported" || duration === undefined) {
    return {
      tag: "unsupported",
      issues: [rollModifierIssue("effect", spellMechanicsHeaderPath("family"))],
    };
  }
  return supportedRollModifierMechanicsAdmission(
    source,
    mechanics,
    duration,
    branch,
  );
}

function rollModifierActiveEffectExpiration(
  actorId: CombatantId,
  duration: RollModifierDuration,
): BattleActiveEffectExpiration {
  return duration.kind === "concentration"
    ? { kind: "concentration", combatantId: actorId }
    : {
        kind: "duration",
        durationTicks: spellDurationTicksFromCanonicalValue(duration.value),
      };
}

function rollModifierNumericActiveEffect(
  actorId: CombatantId,
  effect: RollModifierNumericEffectProjection,
  expiresAt: BattleActiveEffectExpiration,
): RollModifierD20Effect {
  return {
    kind: "d20RollModifier",
    sourceCombatantId: actorId,
    on: effect.on,
    delta: effect.delta,
    skillFilter: effect.skillFilter,
    expiresAt,
  };
}

function rollModifierAbilityCheckActiveEffect(
  actorId: CombatantId,
  effect: RollModifierAbilityCheckEffectProjection,
  expiresAt: BattleActiveEffectExpiration,
): {
  readonly effect: RollModifierAbilityCheckModeEffect;
  readonly abilityChoices: readonly Ability[];
  readonly abilityChoiceApplication: "single" | "perTarget";
} {
  return {
    effect: {
      kind: "abilityCheckRollMode",
      sourceCombatantId: actorId,
      mode: "advantage",
      expiresAt,
    },
    abilityChoices: effect.abilityChoices,
    abilityChoiceApplication: effect.abilityChoiceApplication,
  };
}

function admitRollModifier(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: RollModifierMechanicsFacts,
): readonly RollModifierInvocation[] {
  const expiresAt = rollModifierActiveEffectExpiration(
    ctx.actor.combatantId,
    facts.duration,
  );
  type RollModifierCast =
    | {
        readonly kind: "cantrip";
        readonly access: CantripSpellAccess;
        readonly resource: NoSpellInvocationResource;
        readonly slotLevel: SpellSlotLevel;
      }
    | {
        readonly kind: "prepared";
        readonly access: PreparedSpellAccess;
        readonly resource: LeveledSpellInvocationResource;
        readonly slotLevel: SpellSlotLevel;
      };
  const complete = (cast: RollModifierCast): RollModifierInvocation => {
    const targeting = rollModifierTargetingForSlot(
      facts.targeting,
      cast.slotLevel,
    );
    if (facts.kind === "numeric") {
      const modifier = rollModifierNumericActiveEffect(
        ctx.actor.combatantId,
        facts.effect,
        expiresAt,
      );
      if (cast.kind === "cantrip") {
        return {
          access: cast.access,
          resource: cast.resource,
          procedure: "rollModifier",
          spell,
          actionCost: "magicAction",
          targeting,
          rangeFeet: facts.rangeFeet,
          saveGate: facts.saveGate,
          effect: modifier,
          abilityChoices: null,
        };
      }
      return {
        access: cast.access,
        resource: cast.resource,
        procedure: "rollModifier",
        spell,
        actionCost: "magicAction",
        targeting,
        rangeFeet: facts.rangeFeet,
        saveGate: facts.saveGate,
        effect: modifier,
        abilityChoices: null,
      };
    }
    const modifier = rollModifierAbilityCheckActiveEffect(
      ctx.actor.combatantId,
      facts.effect,
      expiresAt,
    );
    if (cast.kind === "cantrip") {
      return {
        access: cast.access,
        resource: cast.resource,
        procedure: "rollModifier",
        spell,
        actionCost: "magicAction",
        targeting,
        rangeFeet: facts.rangeFeet,
        saveGate: facts.saveGate,
        effect: modifier.effect,
        abilityChoices: modifier.abilityChoices,
        abilityChoiceApplication: modifier.abilityChoiceApplication,
      };
    }
    return {
      access: cast.access,
      resource: cast.resource,
      procedure: "rollModifier",
      spell,
      actionCost: "magicAction",
      targeting,
      rangeFeet: facts.rangeFeet,
      saveGate: facts.saveGate,
      effect: modifier.effect,
      abilityChoices: modifier.abilityChoices,
      abilityChoiceApplication: modifier.abilityChoiceApplication,
    };
  };
  const invocations: RollModifierInvocation[] = [];
  if (facts.level === 0) {
    invocations.push(
      complete({
        kind: "cantrip",
        access: cantripSpellAccessFor(spell.castingSource),
        resource: { tag: "none" },
        slotLevel: spellSlotLevel(0),
      }),
    );
  } else {
    for (const slot of ctx.spellCastOptions) {
      if (slot.spellLevel < facts.level) continue;
      invocations.push(
        complete({
          kind: "prepared",
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          slotLevel: slot.spellLevel,
        }),
      );
    }
  }
  return invocations;
}

function applyRollModifierEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return applyRollModifierEffectsByTarget(
    state,
    targetIds.map((targetId) => ({ targetId, effect: selectedEffect })),
    sourceProcedureRef,
  );
}

function applyRollModifierEffectsByTarget(
  state: BattleState,
  targetEffects: readonly {
    readonly targetId: CombatantId;
    readonly effect: SelectedRollModifierSpellEffect;
  }[],
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return targetEffects.reduce((nextState, targetEffect) => {
    const { targetId, effect: selectedEffect } = targetEffect;
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: { ...selectedEffect, sourceProcedureRef },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === selectedEffect.kind &&
            effect.sourceProcedureRef === sourceProcedureRef
          ),
      ),
      allocation.effect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...allocation.owner,
        activeEffects,
      }),
    };
  }, state);
}

function discoverRollModifierCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<RollModifierInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const skillChoiceHoles =
    invocation.effect.kind === "d20RollModifier"
      ? Match.value(invocation.effect.skillFilter).pipe(
          Match.when({ kind: "none" }, () => []),
          Match.when({ kind: "fixed" }, () => []),
          Match.when({ kind: "choice" }, (skillFilter) => [
            spellRollModifierSkillChoiceHole(invocation, skillFilter),
          ]),
          Match.exhaustive,
        )
      : [];
  const initialHoles =
    targetHole.choices.length === 0
      ? []
      : [
          targetHole,
          ...skillChoiceHoles,
          ...(invocation.abilityChoices === null
            ? []
            : rollModifierUsesTargetAbilityChoices(invocation)
              ? [spellRollModifierTargetAbilityChoicesHole(invocation)]
              : [spellRollModifierAbilityChoiceHole(invocation)]),
        ];
  if (initialHoles.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles,
    },
  ];
}

function resolveRollModifier(
  input: RollModifierResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellRollModifierSkillChoiceHoleId(input.invocation),
      spellRollModifierAbilityChoiceHoleId(input.invocation),
      spellRollModifierTargetAbilityChoicesHoleId(input.invocation),
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill or ability, and optional Saving Throw fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const effectSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellEffectSelection({
      ...input,
      targetIds: targetSelection.targetIds,
    }),
  );
  if (effectSelectionResolution.tag === "resolution")
    return effectSelectionResolution.result;
  const effectSelection = effectSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: targetSelection.targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const affectedTargetsResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellAffectedTargets(input),
  );
  if (affectedTargetsResolution.tag === "resolution")
    return affectedTargetsResolution.result;
  const affectedTargets = affectedTargetsResolution.selection;

  const affectedTargetIds = new Set(affectedTargets.targetIds);
  return completeSpellActiveEffectCast({
    resolution: input,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
    applyEffect: (state) =>
      effectSelection.selection.kind === "sameForTargets"
        ? applyRollModifierEffect(
            state,
            affectedTargets.targetIds,
            effectSelection.selection.effect,
            input.invocation.sourceProcedureRef,
          )
        : applyRollModifierEffectsByTarget(
            state,
            effectSelection.selection.targetEffects.filter((targetEffect) =>
              affectedTargetIds.has(targetEffect.targetId),
            ),
            input.invocation.sourceProcedureRef,
          ),
  });
}

const RollModifierInvocationCommonFields = {
  access: Schema.Union([PreparedSpellAccessSchema, CantripSpellAccessSchema]),
  resource: Schema.Union([
    LeveledSpellInvocationResourceSchema,
    NoSpellInvocationResourceSchema,
  ]),
  procedure: Schema.Literal("rollModifier"),
  spellRuleFacts: SpellRuleExecutionFactsSchema,
  actionCost: Schema.Literal("magicAction"),
  targeting: RollModifierSpellTargetingSchema,
  rangeFeet: MovementFeet,
  saveGate: RollModifierSpellSaveGateSchema,
} as const;

const RollModifierInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: D20RollModifierEffectSchema,
      abilityChoices: Schema.Null,
      abilityChoiceApplication: Schema.optionalKey(Schema.Never),
    }),
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: AbilityCheckRollModeEffectSchema,
      abilityChoices: Schema.Array(Schema.Literals(BATTLE_SURFACE_ABILITIES)),
      abilityChoiceApplication: Schema.Literals(["single", "perTarget"]),
    }),
  ]),
);
export const rollModifierProfile: SpellProcedureDeclaration<
  "rollModifier",
  RollModifierInvocation,
  RollModifierMechanicsFacts,
  RollModifierAdmissionIssue
> = {
  procedure: "rollModifier",
  admitMechanics: rollModifierMechanicsAdmission,

  discoverCastAct: discoverRollModifierCastAct,
  executionSchema: RollModifierInvocationSchema,
  resolve: resolveRollModifier,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
