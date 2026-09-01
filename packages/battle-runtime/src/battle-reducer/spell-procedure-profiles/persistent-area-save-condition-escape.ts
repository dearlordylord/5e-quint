import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
//
// The Web Spell Procedure Profile: action-time Spell Slot casting creates a
// caster-owned Concentration Cube of sticky webs. The runtime owns Spell Slot
// spending, Concentration duration, table-supplied Cube identity, Difficult
// Terrain and Lightly Obscured projections, the per-turn entry/start-turn
// Dexterity Saving Throw ledger, failed-save Restrained application, Strength
// (Athletics) escape, and cleanup when table/spatial/environment witnesses say
// the effect ends or a creature is no longer in the webs.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Web": Action; 60
//     feet; Concentration up to 1 hour; 20-foot Cube at a point within range;
//     webs are Difficult Terrain and Lightly Obscured; the first time a
//     creature enters the webs on a turn or starts its turn there, it makes a
//     Dexterity save or has Restrained while in the webs or until escape; an
//     affected creature can spend an action on a Strength (Athletics) check
//     against the caster's spell save DC to break free; anchoring/depth/fire
//     clauses remain table/environment facts.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cube, Difficult Terrain, Lightly Obscured,
//     Restrained, Saving Throw, Ability Check, Movement, and Condition.

import {
  PositiveInteger,
  movementFeet,
  type MovementFeet as MovementFeetType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  OngoingTrigger,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match, Result } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolvePersistentAreaSaveConditionEscapeSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureAdmissionIssue,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDefinitionPointRangeFeet,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
} from "./spell-mechanics-admission.ts";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

type PersistentAreaSaveConditionEscapeSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaSaveConditionEscape" }
>;
type PersistentAreaSaveConditionEscapeResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaSaveConditionEscapeSpellInvocation>;
type OngoingOperationEffect = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingOperation = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number];
type PersistentAreaSaveConditionEscapeMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type PersistentAreaSaveConditionEscapeSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "apply_condition_while_in_area_or_until_escape" }
  >;
};
type PersistentAreaSaveConditionEscapeProfileShape = {
  readonly sideFeet: MovementFeetType;
};
type OngoingEscapeFacts = NonNullable<ReturnType<typeof ongoingAreaSpellFacts>>;
type PersistentAreaSaveConditionEscapeMechanicsFacts =
  SpellProcedureMechanicsFacts & PersistentAreaSaveConditionEscapeProfileShape;
type PersistentAreaSaveConditionEscapeAdmissionIssue =
  SpellProcedureAdmissionIssue<
    "persistentAreaSaveConditionEscape",
    PersistentAreaSaveConditionEscapeFailedFact,
    SpellMechanicsBranchPath
  >;

export const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialPhase",
  "passiveDifficultTerrainOperation",
  "passiveLightlyObscuredOperation",
  "passiveAnchorOperation",
  "passiveBurnAwayOperation",
  "enterOperation",
  "startTurnOperation",
  "escapeOperation",
  "operationCount",
  "oncePerTurnLimitGroup",
] as const;
type PersistentAreaSaveConditionEscapeFailedFact =
  (typeof PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_FAILED_FACTS)[number];

const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_BASE_CONSUMED_PATHS = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
  spellDurationValuePath(),
  spellOngoingAttachmentPath(),
] as const;

const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_OPERATION_CONSUMED_PATHS = [
  spellOngoingOperationPath(PositiveInteger(1)),
  spellOngoingOperationPath(PositiveInteger(2)),
  spellOngoingOperationPath(PositiveInteger(3)),
  spellOngoingOperationPath(PositiveInteger(4)),
  spellOngoingOperationPath(PositiveInteger(5)),
  spellOngoingOperationPath(PositiveInteger(6)),
  spellOngoingOperationPath(PositiveInteger(7)),
  spellOngoingOperationEffectPath(PositiveInteger(1)),
  spellOngoingOperationEffectPath(PositiveInteger(2)),
  spellOngoingOperationEffectPath(PositiveInteger(3)),
  spellOngoingOperationEffectPath(PositiveInteger(4)),
  spellOngoingOperationEffectPath(PositiveInteger(5)),
  spellOngoingOperationEffectPath(PositiveInteger(6)),
  spellOngoingOperationEffectPath(PositiveInteger(7)),
] as const;

const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_UNOWNED_PATHS = [] as const;

const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_LEVEL = 2;
const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_RANGE_FEET = 60;
const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_DURATION_HOURS = 1;
const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_OPERATION_COUNT = 7;
const PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_CUBE_SIDE_FEET = 20;

type PersistentAreaSaveConditionEscapeOperationRole =
  | "passive"
  | "enter"
  | "startTurn"
  | "escape"
  | null;

type PersistentAreaSaveConditionEscapeOperationOccurrence = {
  readonly operation: OngoingOperation;
  readonly ordinal: PositiveInteger;
};

type PersistentAreaSaveConditionEscapeOperations = {
  readonly enter:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly startTurn:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly escape:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly difficultTerrain:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly lightlyObscured:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly anchor:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly burnAway:
    | PersistentAreaSaveConditionEscapeOperationOccurrence
    | undefined;
  readonly extraOperations: readonly PersistentAreaSaveConditionEscapeOperationOccurrence[];
};

function persistentAreaSaveConditionEscapeOperationRole(
  trigger: OngoingTrigger,
): PersistentAreaSaveConditionEscapeOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when("on_creature_enters_area", () => "enter" as const),
    Match.when("on_creature_starts_turn_in_area", () => "startTurn" as const),
    Match.when("on_affected_creature_spends_action", () => "escape" as const),
    Match.whenOr(
      "on_effect_starts",
      "on_caster_attack_hit",
      "on_caster_deals_damage_to_attachment",
      "on_attached_hit_by_attack_roll",
      "on_attached_turn_start",
      "on_attached_turn_end",
      "on_caster_turn_start",
      "on_caster_turn_end",
      "on_attached_damaged",
      "on_attached_targeted",
      "on_creature_moves",
      "on_creature_ends_turn_in_area",
      "on_creature_ends_turn_within_distance_of_area",
      "on_creature_moves_through_area",
      "on_creature_moves_within_area",
      "on_creature_starts_turn_within_area",
      "on_creature_attempts_magical_escape",
      "on_object_section_destroyed",
      "on_area_moves_into_creature_space",
      "on_spatial_manifestation_moves_within_distance_of_creature",
      "on_creature_enters_distance_of_spatial_manifestation",
      "on_creature_ends_turn_within_distance_of_spatial_manifestation",
      "on_creature_exits_area",
      "on_caster_moves_on_turn",
      "on_structure_collapses",
      "on_caster_spends_action",
      "on_attached_spends_action",
      "on_creature_studies",
      () => null,
    ),
    Match.exhaustive,
  );
}

function persistentAreaSaveConditionEscapeOperations(
  mechanics: PersistentAreaSaveConditionEscapeMechanics,
): PersistentAreaSaveConditionEscapeOperations {
  const occurrences = mechanics.operations.map(
    (
      operation,
      index,
    ): PersistentAreaSaveConditionEscapeOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<PersistentAreaSaveConditionEscapeOperationRole, null>,
    effect: (operation: OngoingOperation) => boolean,
  ): PersistentAreaSaveConditionEscapeOperationOccurrence | undefined => {
    const expected = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        persistentAreaSaveConditionEscapeOperationRole(
          occurrence.operation.trigger,
        ) === role &&
        effect(occurrence.operation),
    );
    const occurrence =
      expected ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          persistentAreaSaveConditionEscapeOperationRole(
            candidate.operation.trigger,
          ) === role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };
  const enter = select("enter", (operation) =>
    isPersistentAreaSaveConditionEscapeSaveGate(operation.effect),
  );
  const startTurn = select("startTurn", (operation) =>
    isPersistentAreaSaveConditionEscapeSaveGate(operation.effect),
  );
  const escape = select("escape", (operation) =>
    isPersistentAreaSaveConditionEscapeEscapeOperation(operation),
  );
  const difficultTerrain = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_difficult_terrain",
  );
  const lightlyObscured = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_lightly_obscured",
  );
  const anchor = select(
    "passive",
    (operation) =>
      operation.effect.kind === "area_anchor_or_layering_requirement",
  );
  const burnAway = select(
    "passive",
    (operation) => operation.effect.kind === "area_section_burns_away",
  );
  return {
    enter,
    startTurn,
    escape,
    difficultTerrain,
    lightlyObscured,
    anchor,
    burnAway,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

function persistentAreaSaveConditionEscapeOperationPath(
  occurrence: PersistentAreaSaveConditionEscapeOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function persistentAreaSaveConditionEscapeOperationEffectPath(
  occurrence: PersistentAreaSaveConditionEscapeOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

type PersistentAreaSaveConditionEscapeFailure = {
  readonly failedFact: PersistentAreaSaveConditionEscapeFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type PersistentAreaSaveConditionEscapeProjection =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<PersistentAreaSaveConditionEscapeFailure>;
    }
  | {
      readonly tag: "supported";
      readonly profileShape: PersistentAreaSaveConditionEscapeProfileShape;
    };

function persistentAreaSaveConditionEscapeProjection(
  ongoing: OngoingEscapeFacts,
): PersistentAreaSaveConditionEscapeProjection {
  const { mechanics, durationTicks } = ongoing;
  const operations = persistentAreaSaveConditionEscapeOperations(mechanics);
  const area = mechanics.attachment.value;
  const areaShape =
    area.origin.kind === "point_within_range" &&
    area.shape.kind === "cube" &&
    area.shape.sideFeet === PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_CUBE_SIDE_FEET
      ? area.shape
      : null;
  const failures: PersistentAreaSaveConditionEscapeFailure[] = [];
  if (mechanics.level !== PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_LEVEL) {
    failures.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  }
  if (mechanics.castingTime.kind !== "action") {
    failures.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_RANGE_FEET
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "hour" ||
    mechanics.duration.upTo.amount !==
      PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_DURATION_HOURS
  ) {
    failures.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failures.push(
    ...persistentAreaDurationChildPaths(mechanics.duration).map(
      (mechanicsPath) => ({
        failedFact: "duration" as const,
        mechanicsPath,
      }),
    ),
  );
  if (durationTicks === undefined || Result.isFailure(durationTicks)) {
    failures.push({
      failedFact: "durationTicks",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  if (areaShape === null) {
    failures.push({
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    });
  }
  if (mechanics.initialPhase !== undefined) {
    failures.push({
      failedFact: "initialPhase",
      mechanicsPath: spellOngoingInitialPhasePath(),
    });
  }
  if (
    operations.difficultTerrain === undefined ||
    operations.difficultTerrain.operation.effect.kind !==
      "area_is_difficult_terrain"
  ) {
    failures.push({
      failedFact: "passiveDifficultTerrainOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.difficultTerrain,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.lightlyObscured === undefined ||
    operations.lightlyObscured.operation.effect.kind !==
      "area_is_lightly_obscured"
  ) {
    failures.push({
      failedFact: "passiveLightlyObscuredOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.lightlyObscured,
        PositiveInteger(2),
      ),
    });
  }
  if (
    operations.anchor === undefined ||
    operations.anchor.operation.effect.kind !==
      "area_anchor_or_layering_requirement"
  ) {
    failures.push({
      failedFact: "passiveAnchorOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.anchor,
        PositiveInteger(3),
      ),
    });
  }
  if (
    operations.burnAway === undefined ||
    operations.burnAway.operation.effect.kind !== "area_section_burns_away"
  ) {
    failures.push({
      failedFact: "passiveBurnAwayOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.burnAway,
        PositiveInteger(4),
      ),
    });
  }
  if (
    operations.enter === undefined ||
    !isPersistentAreaSaveConditionEscapeSaveGate(
      operations.enter.operation.effect,
    )
  ) {
    failures.push({
      failedFact: "enterOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.enter,
        PositiveInteger(5),
      ),
    });
  }
  if (
    mechanics.operations.length !==
      PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_OPERATION_COUNT &&
    operations.extraOperations.length === 0
  ) {
    failures.push({
      failedFact: "operationCount",
      mechanicsPath: spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    });
  }
  if (
    operations.startTurn === undefined ||
    !isPersistentAreaSaveConditionEscapeSaveGate(
      operations.startTurn.operation.effect,
    )
  ) {
    failures.push({
      failedFact: "startTurnOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.startTurn,
        PositiveInteger(6),
      ),
    });
  }
  if (
    operations.escape === undefined ||
    !isPersistentAreaSaveConditionEscapeEscapeOperation(
      operations.escape.operation,
    )
  ) {
    failures.push({
      failedFact: "escapeOperation",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationEffectPath(
        operations.escape,
        PositiveInteger(7),
      ),
    });
  }
  if (operations.enter?.operation.usageLimit?.kind !== "once_per_turn") {
    failures.push({
      failedFact: "oncePerTurnLimitGroup",
      mechanicsPath: persistentAreaSaveConditionEscapeOperationPath(
        operations.enter,
        PositiveInteger(5),
      ),
    });
  }
  failures.push(
    ...operations.extraOperations.map((occurrence) => ({
      failedFact: "operationCount" as const,
      mechanicsPath: persistentAreaSaveConditionEscapeOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );
  const unsupportedFailures = spellProcedureNonEmpty(failures);
  if (unsupportedFailures !== undefined) {
    return { tag: "unsupported", failures: unsupportedFailures };
  }
  if (
    areaShape === null ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks)
  ) {
    return {
      tag: "unsupported",
      failures: [
        areaShape === null
          ? {
              failedFact: "attachment",
              mechanicsPath: spellOngoingAttachmentPath(),
            }
          : {
              failedFact: "durationTicks",
              mechanicsPath: spellDurationValuePath(),
            },
      ],
    };
  }
  return {
    tag: "supported",
    profileShape: {
      sideFeet: movementFeet(areaShape.sideFeet),
    },
  };
}

function persistentAreaSaveConditionEscapeAdmissionIssue(
  failure: PersistentAreaSaveConditionEscapeFailure,
): PersistentAreaSaveConditionEscapeAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveConditionEscape",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported persistent-area save condition escape mechanics fact: ${failure.failedFact}.`,
  };
}

function isPersistentAreaSaveConditionEscapeRepresentation(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "ongoing_effect" }> {
  if (mechanics.family !== "ongoing_effect") return false;
  const attachment = mechanics.attachment;
  const shape =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value.shape
      : undefined;
  const geometryMatches =
    shape?.kind === "cube" &&
    shape.sideFeet === PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_CUBE_SIDE_FEET;
  const rangeMatches =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_RANGE_FEET;
  const burnAwayOperationMatches = mechanics.operations.some(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_section_burns_away",
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      { name: "geometry", present: geometryMatches },
      { name: "range", present: rangeMatches },
      { name: "burnAwayOperation", present: burnAwayOperationMatches },
    ],
  });
}

function admitPersistentAreaSaveConditionEscape(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: PersistentAreaSaveConditionEscapeMechanicsFacts,
): readonly PersistentAreaSaveConditionEscapeSpellInvocation[] {
  const durationTicks = ongoingAreaSpellDurationTicks(facts.duration);
  const rangeFeet = spellDefinitionPointRangeFeet(facts.range);
  if (
    durationTicks === undefined ||
    Result.isFailure(durationTicks) ||
    rangeFeet === undefined
  ) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly PersistentAreaSaveConditionEscapeSpellInvocation[] => {
      if (
        Number(slot.spellLevel) < PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_LEVEL
      ) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveConditionEscape",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCube",
            sideFeet: facts.sideFeet,
          },
          durationTicks: durationTicks.success,
          rangeFeet,
        },
      ];
    },
  );
}

function persistentAreaSaveConditionEscapeMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveConditionEscape",
  PersistentAreaSaveConditionEscapeMechanicsFacts,
  PersistentAreaSaveConditionEscapeSpellInvocation,
  PersistentAreaSaveConditionEscapeAdmissionIssue
> {
  if (!isPersistentAreaSaveConditionEscapeRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) {
    return {
      tag: "unsupported",
      issues: [
        persistentAreaSaveConditionEscapeAdmissionIssue({
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        }),
      ],
    };
  }
  const projection = persistentAreaSaveConditionEscapeProjection(ongoing);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        projection.failures,
        persistentAreaSaveConditionEscapeAdmissionIssue,
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.profileShape,
  } satisfies PersistentAreaSaveConditionEscapeMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveConditionEscape",
      facts,
      evidence: {
        consumed: [
          ...PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_BASE_CONSUMED_PATHS,
          ...(ongoing.mechanics.initialPhase === undefined
            ? []
            : [spellOngoingInitialPhasePath()]),
          ...PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_OPERATION_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: PERSISTENT_AREA_SAVE_CONDITION_ESCAPE_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitPersistentAreaSaveConditionEscape(executionSource, ctx, facts),
    },
  };
}

function isPersistentAreaSaveConditionEscapeSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is PersistentAreaSaveConditionEscapeSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "apply_condition_while_in_area_or_until_escape" &&
    effect.onFail.condition === "restrained"
  );
}

function isPersistentAreaSaveConditionEscapeEscapeOperation(
  operation: OngoingOperation | undefined,
): boolean {
  return (
    operation?.trigger.kind === "on_affected_creature_spends_action" &&
    operation.trigger.cost.kind === "action" &&
    operation.predicate?.kind === "has_condition" &&
    operation.predicate.condition === "restrained" &&
    operation.effect.kind === "ability_check_gate" &&
    operation.effect.ability === "str" &&
    operation.effect.skill === "athletics" &&
    operation.effect.dc.kind === "caster_spell_save_dc" &&
    operation.effect.onPass.kind === "remove_condition" &&
    operation.effect.onPass.condition === "restrained"
  );
}

function resolvePersistentAreaSaveConditionEscape(
  input: PersistentAreaSaveConditionEscapeResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaSaveConditionEscapeSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const PersistentAreaSaveConditionEscapeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveConditionEscape"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const persistentAreaSaveConditionEscapeProfile = {
  procedure: "persistentAreaSaveConditionEscape",
  executionSchema: PersistentAreaSaveConditionEscapeInvocationSchema,
  admitMechanics: persistentAreaSaveConditionEscapeMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolvePersistentAreaSaveConditionEscape,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveConditionEscape",
  PersistentAreaSaveConditionEscapeSpellInvocation,
  PersistentAreaSaveConditionEscapeMechanicsFacts,
  PersistentAreaSaveConditionEscapeAdmissionIssue
>;
