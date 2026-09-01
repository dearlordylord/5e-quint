import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
//
// The Sleet Storm Spell Procedure Profile: action-time Spell Slot casting
// creates a caster-owned Concentration Cylinder. The runtime owns Spell Slot
// spending, Concentration duration, caller-supplied Cylinder identity,
// Difficult Terrain and Heavily Obscured projections, a shared per-turn
// Dexterity Saving Throw ledger, failed-save Prone application, failed-save
// Concentration loss, and duration/concentration cleanup. Exposed-flame
// dousing, automatic table geometry, and pathfinding remain outside the battle
// runtime.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Sleet Storm":
//     Action; 150 feet; Concentration up to 1 minute; 40-foot-tall
//     20-foot-radius Cylinder; Heavily Obscured; exposed flames are doused;
//     ground is Difficult Terrain; first entry on a turn or turn start in the
//     Cylinder requires a Dexterity save or the creature has Prone and loses
//     Concentration.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cylinder, Difficult Terrain, Heavily Obscured,
//     Prone, and Saving Throw.

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
  UsageLimit,
} from "@dnd/surface/surface/types";
import { Match, Result, Schema } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolvePersistentAreaSaveCompositeSpellAct } from "../spells-resolve-area-effects.ts";
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
import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";
import type {
  SpellMechanicsAdmissionSource,
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

type PersistentAreaSaveCompositeSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaSaveComposite" }
>;
type PersistentAreaSaveCompositeResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaSaveCompositeSpellInvocation>;
type OngoingMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect = OngoingMechanics["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type PersistentAreaSaveCompositeSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "composite" }
  >;
};
type PersistentAreaSaveCompositeProfileShape = {
  readonly radiusFeet: MovementFeetType;
  readonly heightFeet: MovementFeetType;
};
type OngoingPersistentAreaSaveCompositeFacts = NonNullable<
  ReturnType<typeof ongoingAreaSpellFacts>
>;
type PersistentAreaSaveCompositeMechanicsFacts = SpellProcedureMechanicsFacts &
  PersistentAreaSaveCompositeProfileShape;
type PersistentAreaSaveCompositeAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "persistentAreaSaveComposite",
    PersistentAreaSaveCompositeMechanicsFacts,
    PersistentAreaSaveCompositeSpellInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

export const PERSISTENT_AREA_SAVE_COMPOSITE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialPhase",
  "passiveDifficultTerrainOperation",
  "passiveHeavilyObscuredOperation",
  "passiveDouseExposedFlamesOperation",
  "enterOperation",
  "startTurnOperation",
  "operationCount",
  "oncePerTurnLimitGroup",
] as const;
type PersistentAreaSaveCompositeFailedFact =
  (typeof PERSISTENT_AREA_SAVE_COMPOSITE_FAILED_FACTS)[number];

const PERSISTENT_AREA_SAVE_COMPOSITE_BASE_CONSUMED_PATHS = [
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

const PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_CONSUMED_PATHS = [
  spellOngoingOperationPath(PositiveInteger(1)),
  spellOngoingOperationPath(PositiveInteger(2)),
  spellOngoingOperationPath(PositiveInteger(3)),
  spellOngoingOperationPath(PositiveInteger(4)),
  spellOngoingOperationPath(PositiveInteger(5)),
  spellOngoingOperationEffectPath(PositiveInteger(1)),
  spellOngoingOperationEffectPath(PositiveInteger(2)),
  spellOngoingOperationEffectPath(PositiveInteger(3)),
  spellOngoingOperationEffectPath(PositiveInteger(4)),
  spellOngoingOperationEffectPath(PositiveInteger(5)),
] as const;

const PERSISTENT_AREA_SAVE_COMPOSITE_UNOWNED_PATHS = [] as const;

const PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL = 3;
const PERSISTENT_AREA_SAVE_COMPOSITE_RANGE_FEET = 150;
const PERSISTENT_AREA_SAVE_COMPOSITE_DURATION_MINUTES = 1;
const PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_COUNT = 5;
const PERSISTENT_AREA_SAVE_COMPOSITE_RADIUS_FEET = 20;
const PERSISTENT_AREA_SAVE_COMPOSITE_HEIGHT_FEET = 40;

function persistentAreaSaveCompositeDurationIsSupported(
  duration: OngoingPersistentAreaSaveCompositeFacts["mechanics"]["duration"],
): boolean {
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === PERSISTENT_AREA_SAVE_COMPOSITE_DURATION_MINUTES
  );
}

function persistentAreaSaveCompositeCylinderFacts(
  area: OngoingPersistentAreaSaveCompositeFacts["mechanics"]["attachment"]["value"],
): Pick<
  PersistentAreaSaveCompositeProfileShape,
  "radiusFeet" | "heightFeet"
> | null {
  if (area.origin.kind !== "point_within_range") return null;
  if (area.shape.kind !== "cylinder") return null;
  if (area.shape.radiusFeet !== PERSISTENT_AREA_SAVE_COMPOSITE_RADIUS_FEET) {
    return null;
  }
  if (area.shape.heightFeet !== PERSISTENT_AREA_SAVE_COMPOSITE_HEIGHT_FEET) {
    return null;
  }
  return {
    radiusFeet: movementFeet(area.shape.radiusFeet),
    heightFeet: movementFeet(area.shape.heightFeet),
  };
}

type PersistentAreaSaveCompositeOperationRole =
  | "passive"
  | "enter"
  | "startTurn"
  | null;

type PersistentAreaSaveCompositeOperationOccurrence = {
  readonly operation: OngoingMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};

type PersistentAreaSaveCompositeOperations = {
  readonly enter: PersistentAreaSaveCompositeOperationOccurrence | undefined;
  readonly startTurn:
    | PersistentAreaSaveCompositeOperationOccurrence
    | undefined;
  readonly difficultTerrain:
    | PersistentAreaSaveCompositeOperationOccurrence
    | undefined;
  readonly heavilyObscured:
    | PersistentAreaSaveCompositeOperationOccurrence
    | undefined;
  readonly exposedFlames:
    | PersistentAreaSaveCompositeOperationOccurrence
    | undefined;
  readonly extraOperations: readonly PersistentAreaSaveCompositeOperationOccurrence[];
};

function persistentAreaSaveCompositeOperationRole(
  trigger: OngoingTrigger,
): PersistentAreaSaveCompositeOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when("on_creature_enters_area", () => "enter" as const),
    Match.when("on_creature_starts_turn_in_area", () => "startTurn" as const),
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
      "on_affected_creature_spends_action",
      "on_creature_studies",
      () => null,
    ),
    Match.exhaustive,
  );
}

function persistentAreaSaveCompositeOperations(
  mechanics: OngoingMechanics,
): PersistentAreaSaveCompositeOperations {
  const occurrences = mechanics.operations.map(
    (operation, index): PersistentAreaSaveCompositeOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<PersistentAreaSaveCompositeOperationRole, null>,
    effect: (operation: OngoingMechanics["operations"][number]) => boolean,
  ): PersistentAreaSaveCompositeOperationOccurrence | undefined => {
    const expected = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        persistentAreaSaveCompositeOperationRole(
          occurrence.operation.trigger,
        ) === role &&
        effect(occurrence.operation),
    );
    const occurrence =
      expected ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          persistentAreaSaveCompositeOperationRole(
            candidate.operation.trigger,
          ) === role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };

  const enter = select("enter", (operation) =>
    isPersistentAreaSaveCompositeSaveGate(operation.effect),
  );
  const startTurn = select("startTurn", (operation) =>
    isPersistentAreaSaveCompositeSaveGate(operation.effect),
  );
  const difficultTerrain = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_difficult_terrain",
  );
  const heavilyObscured = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_heavily_obscured",
  );
  const exposedFlames = select(
    "passive",
    (operation) => operation.effect.kind === "douse_exposed_flames",
  );

  return {
    enter,
    startTurn,
    difficultTerrain,
    heavilyObscured,
    exposedFlames,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

function persistentAreaSaveCompositeOperationPath(
  occurrence: PersistentAreaSaveCompositeOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function persistentAreaSaveCompositeOperationEffectPath(
  occurrence: PersistentAreaSaveCompositeOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

function persistentAreaSaveCompositeUsageLimitFailures(
  operations: PersistentAreaSaveCompositeOperations,
): readonly PersistentAreaSaveCompositeFailure[] {
  const entries = [
    {
      limit: operations.enter?.operation.usageLimit,
      mechanicsPath: persistentAreaSaveCompositeOperationPath(
        operations.enter,
        PositiveInteger(4),
      ),
    },
    {
      limit: operations.startTurn?.operation.usageLimit,
      mechanicsPath: persistentAreaSaveCompositeOperationPath(
        operations.startTurn,
        PositiveInteger(5),
      ),
    },
  ] satisfies readonly {
    readonly limit: UsageLimit | undefined;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }[];
  const sharedLimitGroup = sharedOncePerTurnLimitGroup(
    entries.map(({ limit }) => limit),
  );
  if (sharedLimitGroup !== null && sharedLimitGroup.length > 0) return [];
  return entries.map(({ mechanicsPath }) => ({
    failedFact: "oncePerTurnLimitGroup" as const,
    mechanicsPath,
  }));
}

type PersistentAreaSaveCompositeFailure = {
  readonly failedFact: PersistentAreaSaveCompositeFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type PersistentAreaSaveCompositeProjection =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<PersistentAreaSaveCompositeFailure>;
    }
  | {
      readonly tag: "supported";
      readonly profileShape: PersistentAreaSaveCompositeProfileShape;
    };

function persistentAreaSaveCompositeProjection(
  ongoing: OngoingPersistentAreaSaveCompositeFacts,
): PersistentAreaSaveCompositeProjection {
  const { mechanics, durationTicks } = ongoing;
  const cylinder = persistentAreaSaveCompositeCylinderFacts(
    mechanics.attachment.value,
  );
  const operations = persistentAreaSaveCompositeOperations(mechanics);
  const failures: PersistentAreaSaveCompositeFailure[] = [];
  if (mechanics.level !== PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL) {
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
    mechanics.range.feet !== PERSISTENT_AREA_SAVE_COMPOSITE_RANGE_FEET
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (!persistentAreaSaveCompositeDurationIsSupported(mechanics.duration)) {
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
  if (cylinder === null) {
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
      mechanicsPath: persistentAreaSaveCompositeOperationEffectPath(
        operations.difficultTerrain,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.heavilyObscured === undefined ||
    operations.heavilyObscured.operation.effect.kind !==
      "area_is_heavily_obscured"
  ) {
    failures.push({
      failedFact: "passiveHeavilyObscuredOperation",
      mechanicsPath: persistentAreaSaveCompositeOperationEffectPath(
        operations.heavilyObscured,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.exposedFlames === undefined ||
    operations.exposedFlames.operation.effect.kind !== "douse_exposed_flames"
  ) {
    failures.push({
      failedFact: "passiveDouseExposedFlamesOperation",
      mechanicsPath: persistentAreaSaveCompositeOperationEffectPath(
        operations.exposedFlames,
        PositiveInteger(2),
      ),
    });
  }
  if (
    operations.enter === undefined ||
    !isPersistentAreaSaveCompositeSaveGate(operations.enter.operation.effect)
  ) {
    failures.push({
      failedFact: "enterOperation",
      mechanicsPath: persistentAreaSaveCompositeOperationEffectPath(
        operations.enter,
        PositiveInteger(4),
      ),
    });
  }
  if (
    operations.startTurn === undefined ||
    !isPersistentAreaSaveCompositeSaveGate(
      operations.startTurn.operation.effect,
    )
  ) {
    failures.push({
      failedFact: "startTurnOperation",
      mechanicsPath: persistentAreaSaveCompositeOperationEffectPath(
        operations.startTurn,
        PositiveInteger(5),
      ),
    });
  }
  if (
    mechanics.operations.length !==
      PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_COUNT &&
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
      mechanicsPath: persistentAreaSaveCompositeOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );
  failures.push(...persistentAreaSaveCompositeUsageLimitFailures(operations));
  const unsupportedFailures = spellProcedureNonEmpty(failures);
  if (unsupportedFailures !== undefined) {
    return { tag: "unsupported", failures: unsupportedFailures };
  }
  if (
    cylinder === null ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks)
  ) {
    return {
      tag: "unsupported",
      failures: [
        cylinder === null
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
      ...cylinder,
    },
  };
}

function persistentAreaSaveCompositeAdmissionIssue(
  failure: PersistentAreaSaveCompositeFailure,
): PersistentAreaSaveCompositeAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveComposite",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported persistent-area save composite mechanics fact: ${failure.failedFact}.`,
  };
}

function isPersistentAreaSaveCompositeRepresentation(
  mechanics: SpellMechanics,
): mechanics is OngoingMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const attachment = mechanics.attachment;
  const shape =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value.shape
      : undefined;
  const geometryMatches =
    shape?.kind === "cylinder" &&
    shape.radiusFeet === PERSISTENT_AREA_SAVE_COMPOSITE_RADIUS_FEET &&
    shape.heightFeet === PERSISTENT_AREA_SAVE_COMPOSITE_HEIGHT_FEET;
  const rangeMatches =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === PERSISTENT_AREA_SAVE_COMPOSITE_RANGE_FEET;
  const douseOperationMatches = mechanics.operations.some(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "douse_exposed_flames",
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [geometryMatches, rangeMatches, douseOperationMatches],
  });
}

function persistentAreaSaveCompositeMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveComposite",
  PersistentAreaSaveCompositeMechanicsFacts,
  PersistentAreaSaveCompositeSpellInvocation
> {
  if (!isPersistentAreaSaveCompositeRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) {
    return {
      tag: "unsupported",
      issues: [
        persistentAreaSaveCompositeAdmissionIssue({
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        }),
      ],
    };
  }
  const projection = persistentAreaSaveCompositeProjection(ongoing);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        projection.failures,
        persistentAreaSaveCompositeAdmissionIssue,
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.profileShape,
  } satisfies PersistentAreaSaveCompositeMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveComposite",
      facts,
      evidence: {
        consumed: [
          ...PERSISTENT_AREA_SAVE_COMPOSITE_BASE_CONSUMED_PATHS,
          ...(ongoing.mechanics.initialPhase === undefined
            ? []
            : [spellOngoingInitialPhasePath()]),
          ...PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: PERSISTENT_AREA_SAVE_COMPOSITE_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitPersistentAreaSaveComposite(executionSource, ctx, facts),
    },
  };
}

function admitPersistentAreaSaveComposite(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: PersistentAreaSaveCompositeMechanicsFacts,
): readonly PersistentAreaSaveCompositeSpellInvocation[] {
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
    (slot): readonly PersistentAreaSaveCompositeSpellInvocation[] => {
      if (Number(slot.spellLevel) < PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveComposite",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCylinder",
            radiusFeet: facts.radiusFeet,
            heightFeet: facts.heightFeet,
          },
          durationTicks: durationTicks.success,
          rangeFeet,
        },
      ];
    },
  );
}

function isPersistentAreaSaveCompositeSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is PersistentAreaSaveCompositeSaveEffect {
  if (
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "none" ||
    effect.onFail.kind !== "composite" ||
    effect.onFail.effects.length !== 2
  ) {
    return false;
  }
  const appliesProne = effect.onFail.effects.some(
    (failedEffect) =>
      failedEffect.kind === "apply_condition" &&
      failedEffect.condition === "prone",
  );
  const breaksConcentration = effect.onFail.effects.some(
    (failedEffect) => failedEffect.kind === "break_concentration",
  );
  return appliesProne && breaksConcentration;
}

function resolvePersistentAreaSaveComposite(
  input: PersistentAreaSaveCompositeResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaSaveCompositeSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const PersistentAreaSaveCompositeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveComposite"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCylinder"),
        radiusFeet: MovementFeet,
        heightFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
    }),
  );

export const persistentAreaSaveCompositeProfile = {
  procedure: "persistentAreaSaveComposite",
  executionSchema: PersistentAreaSaveCompositeInvocationSchema,
  admitMechanics: persistentAreaSaveCompositeMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolvePersistentAreaSaveComposite,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveComposite",
  PersistentAreaSaveCompositeSpellInvocation
>;
