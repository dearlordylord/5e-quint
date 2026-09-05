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
  spellProcedureHasCompleteSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellPositiveIntegerFromSurface,
  spellSlotLevelFromSurface,
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
const ROLL_MODIFIER_SCHOOLS = [
  "divination",
  "enchantment",
  "transmutation",
] as const;
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
  if (count.kind !== "linear") return undefined;
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

function hasCompleteNumericSavePenaltySignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  const phase = mechanics.phases[0];
  if (
    mechanics.level !== 1 ||
    mechanics.school !== "enchantment" ||
    mechanics.castingTime.kind !== "action" ||
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.amount !== 1 ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "cha" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return false;
  }
  const selection = phase.attachment.value.selection;
  const count = selection.mode === "choose_up_to" ? selection.count : undefined;
  return (
    selection.mode === "choose_up_to" &&
    typeof count === "object" &&
    count.kind === "linear" &&
    count.base === 3 &&
    count.baseLevel === 1 &&
    count.perSlotAboveBase === 1 &&
    (selection.targetKinds === undefined ||
      sameStringSet(selection.targetKinds, ["creature"]))
  );
}

function isRollModifierRepresentation(
  mechanics: SpellMechanics,
): mechanics is RollModifierMechanics {
  if (
    mechanics.family !== "ongoing_effect" &&
    mechanics.family !== "activation"
  ) {
    return false;
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
        ({ effect }) =>
          effect.kind === "modify_roll_numeric" ||
          effect.kind === "modify_roll_advantage",
      );
      const hasRollModifierSchool = ROLL_MODIFIER_SCHOOLS.some(
        (school) => school === ongoing.school,
      );
      if (!hasRollEffectRole) {
        return spellProcedureHasCompleteSignature([
          {
            name: "castingTime",
            present: ongoing.castingTime.kind === "action",
          },
          { name: "range", present: hasSupportedRangeRole },
          { name: "attachment", present: hasAttachmentRole },
          {
            name: "duration",
            present: isRollModifierDuration(ongoing.duration),
          },
          { name: "rollModifierSchool", present: hasRollModifierSchool },
        ]);
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
      });
    }),
    Match.when({ family: "activation" }, (activation) => {
      const hasNumericFailureEffect = activation.phases.some(
        (phase) =>
          phase.kind === "save_gate" &&
          phase.onFail.kind === "modify_roll_numeric",
      );
      if (!hasNumericFailureEffect) {
        return hasCompleteNumericSavePenaltySignature(activation);
      }
      return true;
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
  const hasChoice = rollModifierAbilityChoiceFilter(effect) !== undefined;
  if (
    (effect.affects ?? "self_roll") === "self_roll" &&
    effect.mode === "advantage" &&
    sameStringSet(effect.on, ["ability_check"]) &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.saveAbilityFilter === undefined &&
    effect.saveSourceFilter === undefined &&
    effect.contextRangeFeet === undefined &&
    effect.spellSourceFilter === undefined &&
    effect.attackerTypeFilter === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined &&
    hasChoice
  ) {
    const abilityFilter = rollModifierAbilityChoiceFilter(effect);
    if (abilityFilter === undefined) return undefined;
    return {
      abilityChoices: abilityFilter.value.options,
      abilityChoiceApplication:
        abilityFilter.kind === "per_target_hole" ? "perTarget" : "single",
    };
  }
  return undefined;
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

function rollModifierOngoingBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalMechanics !== undefined) {
    pushIssue("authoredConditionalMechanics", spellMechanicsRootPath());
  }
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  for (const occurrence of occurrences) {
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }
  const expected = occurrences.find(
    ({ operation }) =>
      operation.trigger.kind === "passive" &&
      (operation.effect.kind === "modify_roll_numeric" ||
        operation.effect.kind === "modify_roll_advantage"),
  );
  const movementTraceOccurrences = occurrences.filter(
    isRollModifierMovementTraceOccurrence,
  );
  const movementTraceOccurrence =
    movementTraceOccurrences.length === 1
      ? movementTraceOccurrences[0]
      : undefined;
  const extras = occurrences.filter(
    ({ ordinal }) =>
      ordinal !== expected?.ordinal &&
      ordinal !== movementTraceOccurrence?.ordinal,
  );
  if (mechanics.operations.length === 0) {
    pushIssue("operationCount", spellOngoingOperationPath(FIRST_ORDINAL));
  }
  for (const occurrence of extras) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }
  const attachment = rollModifierAttachmentProjection(
    mechanics.attachment,
    mechanics.range,
    mechanics.level,
  );
  if (attachment.tag === "rejected") {
    for (const rejection of attachment.rejections) {
      pushIssue(
        rollModifierAttachmentFailedFact(rejection),
        spellOngoingAttachmentPath(),
      );
    }
  } else if (attachment.tag === "unsupported") {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  if (expected === undefined) {
    pushIssue("operation", rollModifierOperationEffectPath(expected));
    pushIssue("effect", rollModifierOperationEffectPath(expected));
    return { tag: "unsupported" };
  }
  const effect = expected.operation.effect;
  if (effect.kind === "modify_roll_numeric") {
    const effectProjection = rollModifierNumericEffectProjection(effect);
    for (const failedFact of rollModifierNumericEffectConstraintIssues(
      effect,
    )) {
      pushIssue(failedFact, rollModifierOperationEffectPath(expected));
    }
    if (
      effectProjection === undefined &&
      !rollModifierNumericEffectShapeProjection(effect)
    ) {
      pushIssue("effect", rollModifierOperationEffectPath(expected));
    }
    if (
      attachment.tag === "supported" &&
      attachment.rangeFeet !== null &&
      effectProjection !== undefined
    ) {
      return {
        tag: "supported",
        evidence: {
          kind: "ongoing",
          consumedOperationOrdinal: expected.ordinal,
          coverage:
            movementTraceOccurrence === undefined
              ? { kind: "complete" }
              : {
                  kind: "partial",
                  unowned: [
                    spellOngoingOperationPath(movementTraceOccurrence.ordinal),
                    spellOngoingOperationEffectPath(
                      movementTraceOccurrence.ordinal,
                    ),
                  ],
                },
        },
        shape: {
          kind: "numeric",
          targeting: attachment.targeting,
          effect: effectProjection,
          saveGate: null,
          rangeFeet: attachment.rangeFeet,
        },
      };
    }
  } else if (effect.kind === "modify_roll_advantage") {
    const effectProjection = rollModifierAbilityCheckEffectProjection(effect);
    if (effectProjection === undefined) {
      pushIssue("effect", rollModifierOperationEffectPath(expected));
    }
    if (
      attachment.tag === "supported" &&
      attachment.rangeFeet !== null &&
      effectProjection !== undefined
    ) {
      return {
        tag: "supported",
        evidence: {
          kind: "ongoing",
          consumedOperationOrdinal: expected.ordinal,
          coverage:
            movementTraceOccurrence === undefined
              ? { kind: "complete" }
              : {
                  kind: "partial",
                  unowned: [
                    spellOngoingOperationPath(movementTraceOccurrence.ordinal),
                    spellOngoingOperationEffectPath(
                      movementTraceOccurrence.ordinal,
                    ),
                  ],
                },
        },
        shape: {
          kind: "abilityCheck",
          targeting: attachment.targeting,
          effect: effectProjection,
          saveGate: null,
          rangeFeet: attachment.rangeFeet,
        },
      };
    }
  } else {
    pushIssue("effect", rollModifierOperationEffectPath(expected));
  }
  return { tag: "unsupported" };
}

function rollModifierActivationBranchProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  pushIssue: RollModifierIssuePush,
): RollModifierBranchProjection {
  const phases = rollModifierActivationPhaseOccurrences(mechanics);
  for (const occurrence of phases) {
    if (
      occurrence.phase.kind === "direct" &&
      occurrence.phase.mode !== undefined
    ) {
      pushIssue("mode", spellActivationPhasePath(occurrence.ordinal));
    }
    if (occurrence.phase.kind !== "save_gate") continue;
    for (const repeat of rollModifierRepeatSaveOccurrences(
      occurrence.phase,
      occurrence.ordinal,
    )) {
      pushIssue(
        "repeatSaves",
        spellActivationRepeatPath(repeat.phaseOrdinal, repeat.repeatOrdinal),
      );
    }
    if (occurrence.phase.autoSuccessIfCasterSlotGte !== undefined) {
      pushIssue(
        "autoSuccessIfCasterSlotGte",
        spellActivationPhasePath(occurrence.ordinal),
      );
    }
    if (occurrence.phase.autoSuccessIfTarget !== undefined) {
      pushIssue(
        "autoSuccessIfTarget",
        spellActivationPhasePath(occurrence.ordinal),
      );
    }
    if (occurrence.phase.saveAppliesIf !== undefined) {
      pushIssue("saveAppliesIf", spellActivationPhasePath(occurrence.ordinal));
    }
    if (occurrence.phase.usageLimit !== undefined) {
      pushIssue("usageLimit", spellActivationPhasePath(occurrence.ordinal));
    }
  }
  const saveGateOccurrences = rollModifierSaveGateOccurrences(mechanics);
  const expected = rollModifierSupportedSaveGateOccurrence(mechanics);
  const selectedOrdinal = expected?.ordinal ?? saveGateOccurrences[0]?.ordinal;
  if (mechanics.phases.length !== 1 || selectedOrdinal !== FIRST_ORDINAL) {
    for (const occurrence of phases) {
      if (occurrence.ordinal === selectedOrdinal) continue;
      pushIssue("phaseCount", spellActivationPhasePath(occurrence.ordinal));
    }
    if (phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(FIRST_ORDINAL));
    }
  }
  if (expected === undefined) {
    const candidate = saveGateOccurrences[0];
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
    return { tag: "unsupported" };
  }
  const phase = expected.phase;
  const attachment = rollModifierAttachmentProjection(
    phase.attachment,
    mechanics.range,
    mechanics.level,
  );
  if (attachment.tag === "rejected") {
    for (const rejection of attachment.rejections) {
      pushIssue(
        rollModifierAttachmentFailedFact(rejection),
        spellActivationAttachmentPath(expected.ordinal),
      );
    }
  } else if (attachment.tag === "unsupported") {
    pushIssue("attachment", spellActivationAttachmentPath(expected.ordinal));
  }
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
  for (const failedFact of rollModifierNumericEffectConstraintIssues(effect)) {
    pushIssue(
      failedFact,
      spellActivationEffectPath(expected.ordinal, FIRST_ORDINAL),
    );
  }
  const effectProjection = rollModifierNumericEffectProjection(effect);
  if (
    effectProjection === undefined &&
    !rollModifierNumericEffectShapeProjection(effect)
  ) {
    pushIssue(
      "effect",
      spellActivationEffectPath(expected.ordinal, FIRST_ORDINAL),
    );
  }
  const rangeFeet = scalarBuffSpellRangeFeet(mechanics.range);
  if (rangeFeet === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    attachment.tag !== "supported" ||
    attachment.rangeFeet === null ||
    effectProjection === undefined ||
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
      effect: effectProjection,
      saveGate: { ability: phase.ability, dc: phase.dc },
      rangeFeet,
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
  if (!isRollModifierRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: RollModifierFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue: RollModifierIssuePush = (failedFact, mechanicsPath) => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  const duration = isRollModifierDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
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
  const areaRangeFeet =
    mechanics.family === "ongoing_effect" &&
    mechanics.attachment.kind === "area" &&
    mechanics.attachment.origin.kind === "self" &&
    mechanics.attachment.shape.kind === "emanation" &&
    typeof mechanics.attachment.shape.radiusFeet === "number"
      ? movementFeet(mechanics.attachment.shape.radiusFeet)
      : null;
  if (rangeFeet === null && areaRangeFeet === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }

  const branch = Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) =>
      rollModifierOngoingBranchProjection(ongoing, pushIssue),
    ),
    Match.when({ family: "activation" }, (activation) =>
      rollModifierActivationBranchProjection(activation, pushIssue),
    ),
    Match.exhaustive,
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
  const facts = {
    ...source.spellDefinitionRuleFacts,
    duration,
    ...branch.shape,
  } satisfies RollModifierMechanicsFacts;
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
  const evidence: SpellProcedureMechanicsEvidence =
    branch.evidence.kind === "ongoing" &&
    branch.evidence.coverage.kind === "partial"
      ? { consumed, unowned: branch.evidence.coverage.unowned }
      : { consumed, unowned: [] };
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "rollModifier",
      facts,
      evidence,
      admit: (executionSource, ctx) =>
        admitRollModifier(executionSource, ctx, facts),
    },
  };
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
