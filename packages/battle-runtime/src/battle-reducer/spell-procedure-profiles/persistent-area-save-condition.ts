import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import { ongoingAreaSpellFacts } from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-grease-ground-hazard unit-feature.metamagic-heightened-save-disadvantage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The persistentAreaSaveCondition Spell Procedure Profile: action-time Spell Slot
// casting that creates a one-minute ground-area Difficult Terrain hazard and
// gates Prone application behind Dexterity Saving Throws when the profileShape
// appears, when a creature enters it, and when a creature ends its turn there.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Grease creates a 10-foot square of Difficult Terrain
//     for 1 minute; creatures standing there when it appears, entering it, or
//     ending their turn there make Dexterity Saving Throws or fall Prone.
//   - UBIQUITOUS_LANGUAGE.md: Difficult Terrain, Saving Throw, Condition,
//     Prone, Magic Action, and Spell Invocation.

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { PositiveInteger, movementFeet, MovementFeet } from "@dnd/shared/types";
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
import {
  type BattleSpellAdmissionSource,
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { resolvePersistentAreaSaveConditionSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { Match, Result, Schema } from "effect";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  persistentAreaDurationChildPaths,
  persistentAreaMaterialPaths,
} from "./persistent-area-save-evidence.ts";

type PersistentAreaSaveConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaSaveCondition" }
>;

type PersistentAreaSaveConditionMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type PersistentAreaSaveConditionPhase = Extract<
  NonNullable<PersistentAreaSaveConditionMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "dex";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "ground_square";
        readonly sideFeet: 10;
      };
    };
  };
};
type PersistentAreaSaveConditionProfileShape = {
  readonly ability: PersistentAreaSaveConditionPhase["ability"];
  readonly dc: PersistentAreaSaveConditionPhase["dc"];
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly sideFeet: number;
};
type OngoingPersistentAreaSaveConditionFacts = NonNullable<
  ReturnType<typeof ongoingAreaSpellFacts>
>;
type PersistentAreaSaveConditionMechanicsFacts = SpellProcedureMechanicsFacts &
  PersistentAreaSaveConditionProfileShape;
type PersistentAreaSaveConditionAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "persistentAreaSaveCondition",
    PersistentAreaSaveConditionMechanicsFacts,
    PersistentAreaSaveConditionSpellInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

export const PERSISTENT_AREA_SAVE_CONDITION_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialPhase",
  "passiveOperation",
  "enterOperation",
  "endTurnOperation",
  "operationCount",
] as const;
type PersistentAreaSaveConditionFailedFact =
  (typeof PERSISTENT_AREA_SAVE_CONDITION_FAILED_FACTS)[number];

const PERSISTENT_AREA_SAVE_CONDITION_BASE_CONSUMED_PATHS = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
  spellDurationValuePath(),
  spellOngoingAttachmentPath(),
  spellOngoingInitialPhasePath(),
  spellOngoingOperationPath(PositiveInteger(1)),
  spellOngoingOperationPath(PositiveInteger(2)),
  spellOngoingOperationPath(PositiveInteger(3)),
  spellOngoingOperationEffectPath(PositiveInteger(1)),
  spellOngoingOperationEffectPath(PositiveInteger(2)),
  spellOngoingOperationEffectPath(PositiveInteger(3)),
] as const;

const PERSISTENT_AREA_SAVE_CONDITION_UNOWNED_PATHS = [] as const;

type PersistentAreaSaveConditionResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaSaveConditionSpellInvocation>;

const PERSISTENT_AREA_SAVE_CONDITION_LEVEL = 1;
const PERSISTENT_AREA_SAVE_CONDITION_RANGE_FEET = 60;
const PERSISTENT_AREA_SAVE_CONDITION_DURATION_MINUTES = 1;
const PERSISTENT_AREA_SAVE_CONDITION_OPERATION_COUNT = 3;
const PERSISTENT_AREA_SAVE_CONDITION_SIDE_FEET = 10;

type PersistentAreaSaveConditionOperationRole =
  | "passive"
  | "enter"
  | "endTurn"
  | null;

type PersistentAreaSaveConditionOperationOccurrence = {
  readonly operation: PersistentAreaSaveConditionMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};

type PersistentAreaSaveConditionOperations = {
  readonly passive: PersistentAreaSaveConditionOperationOccurrence | undefined;
  readonly enter: PersistentAreaSaveConditionOperationOccurrence | undefined;
  readonly endTurn: PersistentAreaSaveConditionOperationOccurrence | undefined;
  readonly extraOperations: readonly PersistentAreaSaveConditionOperationOccurrence[];
};

function persistentAreaSaveConditionOperationRole(
  trigger: OngoingTrigger,
): PersistentAreaSaveConditionOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when("on_creature_enters_area", () => "enter" as const),
    Match.when("on_creature_ends_turn_in_area", () => "endTurn" as const),
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
      "on_creature_starts_turn_in_area",
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
      "on_affected_creature_spends_action",
      "on_creature_studies",
      () => null,
    ),
    Match.exhaustive,
  );
}

function persistentAreaSaveConditionOperations(
  mechanics: PersistentAreaSaveConditionMechanics,
): PersistentAreaSaveConditionOperations {
  const occurrences = mechanics.operations.map(
    (operation, index): PersistentAreaSaveConditionOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<PersistentAreaSaveConditionOperationRole, null>,
    effect: (
      operation: PersistentAreaSaveConditionMechanics["operations"][number],
    ) => boolean,
  ): PersistentAreaSaveConditionOperationOccurrence | undefined => {
    const expected = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        persistentAreaSaveConditionOperationRole(
          occurrence.operation.trigger,
        ) === role &&
        effect(occurrence.operation),
    );
    const occurrence =
      expected ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          persistentAreaSaveConditionOperationRole(
            candidate.operation.trigger,
          ) === role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };
  const passive = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_difficult_terrain",
  );
  const enter = select("enter", (operation) =>
    isPersistentAreaSaveConditionEffect(operation.effect),
  );
  const endTurn = select("endTurn", (operation) =>
    isPersistentAreaSaveConditionEffect(operation.effect),
  );
  return {
    passive,
    enter,
    endTurn,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

function persistentAreaSaveConditionOperationPath(
  occurrence: PersistentAreaSaveConditionOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function persistentAreaSaveConditionOperationEffectPath(
  occurrence: PersistentAreaSaveConditionOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

type PersistentAreaSaveConditionFailure = {
  readonly failedFact: PersistentAreaSaveConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type PersistentAreaSaveConditionProjection =
  | {
      readonly tag: "unsupported";
      readonly failures: readonly PersistentAreaSaveConditionFailure[];
    }
  | {
      readonly tag: "supported";
      readonly profileShape: PersistentAreaSaveConditionProfileShape;
    };

function persistentAreaSaveConditionProjection(
  ongoing: OngoingPersistentAreaSaveConditionFacts,
): PersistentAreaSaveConditionProjection {
  const { mechanics, durationTicks } = ongoing;
  const operations = persistentAreaSaveConditionOperations(mechanics);
  const phase = isPersistentAreaSaveConditionPhase(mechanics.initialPhase)
    ? mechanics.initialPhase
    : null;
  const area = mechanics.attachment.value;
  const areaShape =
    area.origin.kind === "point_within_range" &&
    area.shape.kind === "ground_square" &&
    area.shape.sideFeet === PERSISTENT_AREA_SAVE_CONDITION_SIDE_FEET
      ? area.shape
      : null;
  const failures: PersistentAreaSaveConditionFailure[] = [];
  if (mechanics.level !== PERSISTENT_AREA_SAVE_CONDITION_LEVEL) {
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
    mechanics.range.feet !== PERSISTENT_AREA_SAVE_CONDITION_RANGE_FEET
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (
    mechanics.duration.kind !== "timed" ||
    mechanics.duration.value.unit !== "minute" ||
    mechanics.duration.value.amount !==
      PERSISTENT_AREA_SAVE_CONDITION_DURATION_MINUTES
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
  if (phase === null) {
    failures.push({
      failedFact: "initialPhase",
      mechanicsPath: spellOngoingInitialPhasePath(),
    });
  }
  if (
    operations.passive === undefined ||
    operations.passive.operation.effect.kind !== "area_is_difficult_terrain"
  ) {
    failures.push({
      failedFact: "passiveOperation",
      mechanicsPath: persistentAreaSaveConditionOperationEffectPath(
        operations.passive,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.enter === undefined ||
    !isPersistentAreaSaveConditionEffect(operations.enter.operation.effect)
  ) {
    failures.push({
      failedFact: "enterOperation",
      mechanicsPath: persistentAreaSaveConditionOperationEffectPath(
        operations.enter,
        PositiveInteger(2),
      ),
    });
  }
  if (
    operations.endTurn === undefined ||
    !isPersistentAreaSaveConditionEffect(operations.endTurn.operation.effect)
  ) {
    failures.push({
      failedFact: "endTurnOperation",
      mechanicsPath: persistentAreaSaveConditionOperationEffectPath(
        operations.endTurn,
        PositiveInteger(3),
      ),
    });
  }
  if (
    mechanics.operations.length !==
      PERSISTENT_AREA_SAVE_CONDITION_OPERATION_COUNT &&
    operations.extraOperations.length === 0
  ) {
    failures.push({
      failedFact: "operationCount",
      mechanicsPath: spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    });
  }
  failures.push(
    ...operations.extraOperations.map((occurrence) => ({
      failedFact: "operationCount" as const,
      mechanicsPath: persistentAreaSaveConditionOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );
  if (failures.length > 0) return { tag: "unsupported", failures };
  if (
    phase === null ||
    areaShape === null ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks)
  ) {
    return { tag: "unsupported", failures };
  }
  return {
    tag: "supported",
    profileShape: {
      ability: phase.ability,
      dc: phase.dc,
      durationTicks: durationTicks.success,
      rangeFeet: PERSISTENT_AREA_SAVE_CONDITION_RANGE_FEET,
      sideFeet: areaShape.sideFeet,
    },
  };
}

function persistentAreaSaveConditionAdmissionIssue(
  failure: PersistentAreaSaveConditionFailure,
): PersistentAreaSaveConditionAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveCondition",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported persistent-area save condition mechanics fact: ${failure.failedFact}.`,
  };
}

function isPersistentAreaSaveConditionRepresentation(
  mechanics: SpellMechanics,
): mechanics is PersistentAreaSaveConditionMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  if (
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "area" ||
    mechanics.attachment.value.shape.kind !== "ground_square"
  ) {
    return false;
  }
  return mechanics.operations.some(
    ({ effect }) => effect.kind === "area_is_difficult_terrain",
  );
}

function admitPersistentAreaSaveCondition(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: PersistentAreaSaveConditionMechanicsFacts,
): readonly PersistentAreaSaveConditionSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly PersistentAreaSaveConditionSpellInvocation[] => {
      if (Number(slot.spellLevel) < PERSISTENT_AREA_SAVE_CONDITION_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveCondition",
          spell,
          ability: facts.ability,
          dc: facts.dc,
          targeting: {
            kind: "pointOriginGroundSquare",
            sideFeet: movementFeet(facts.sideFeet),
          },
          durationTicks: facts.durationTicks,
          rangeFeet: movementFeet(facts.rangeFeet),
        },
      ];
    },
  );
}

function persistentAreaSaveConditionMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveCondition",
  PersistentAreaSaveConditionMechanicsFacts,
  PersistentAreaSaveConditionSpellInvocation
> {
  if (!isPersistentAreaSaveConditionRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) {
    return { tag: "notRepresented" };
  }
  const projection = persistentAreaSaveConditionProjection(ongoing);
  if (projection.tag === "unsupported") {
    const [firstFailure, ...remainingFailures] = projection.failures;
    if (firstFailure === undefined) return { tag: "notRepresented" };
    return {
      tag: "unsupported",
      issues: [
        persistentAreaSaveConditionAdmissionIssue(firstFailure),
        ...remainingFailures.map(persistentAreaSaveConditionAdmissionIssue),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.profileShape,
  } satisfies PersistentAreaSaveConditionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveCondition",
      facts,
      evidence: {
        consumed: [
          ...PERSISTENT_AREA_SAVE_CONDITION_BASE_CONSUMED_PATHS,
          ...persistentAreaMaterialPaths(ongoing.mechanics.components),
        ],
        unowned: PERSISTENT_AREA_SAVE_CONDITION_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitPersistentAreaSaveCondition(executionSource, ctx, facts),
    },
  };
}

function isPersistentAreaSaveConditionPhase(
  phase: PersistentAreaSaveConditionMechanics["initialPhase"],
): phase is PersistentAreaSaveConditionPhase {
  return (
    isPersistentAreaSaveConditionEffect(phase) &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "ground_square" &&
    phase.attachment.value.shape.sideFeet ===
      PERSISTENT_AREA_SAVE_CONDITION_SIDE_FEET
  );
}

function isPersistentAreaSaveConditionEffect(
  effect:
    | PersistentAreaSaveConditionMechanics["initialPhase"]
    | PersistentAreaSaveConditionMechanics["operations"][number]["effect"]
    | undefined,
): effect is Extract<
  NonNullable<typeof effect>,
  { readonly kind: "save_gate" }
> {
  if (effect?.kind !== "save_gate") return false;
  if (!hasNoPersistentAreaSaveConditionRepeatSaves(effect)) return false;
  if (effect.ability !== "dex") return false;
  if (effect.dc.kind !== "caster_spell_save_dc") return false;
  if (effect.onSuccess.kind !== "none") return false;
  return (
    effect.onFail.kind === "apply_condition" &&
    effect.onFail.condition === "prone"
  );
}

function hasNoPersistentAreaSaveConditionRepeatSaves(
  effect: Extract<
    NonNullable<
      | PersistentAreaSaveConditionMechanics["initialPhase"]
      | PersistentAreaSaveConditionMechanics["operations"][number]["effect"]
    >,
    { readonly kind: "save_gate" }
  >,
): boolean {
  return !("repeatSaves" in effect) || effect.repeatSaves === undefined;
}

function discoverPersistentAreaSaveConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentAreaSaveConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolvePersistentAreaSaveCondition(
  input: PersistentAreaSaveConditionResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaSaveConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const PersistentAreaSaveConditionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveCondition"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginGroundSquare"),
        sideFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const persistentAreaSaveConditionProfile = {
  procedure: "persistentAreaSaveCondition",
  executionSchema: PersistentAreaSaveConditionInvocationSchema,
  admitMechanics: persistentAreaSaveConditionMechanicsAdmission,
  discoverCastAct: discoverPersistentAreaSaveConditionCastAct,
  resolve: resolvePersistentAreaSaveCondition,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveCondition",
  PersistentAreaSaveConditionSpellInvocation
>;
