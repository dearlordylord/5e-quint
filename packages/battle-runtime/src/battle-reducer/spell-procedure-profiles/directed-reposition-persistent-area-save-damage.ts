import type {
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-moonbeam-movable-zone
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import {
  PositiveInteger,
  movementFeet,
  type MovementFeet as MovementFeetType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
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
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
//
// The Moonbeam Spell Procedure Profile: action-time Spell Slot casting creates
// a caster-owned Concentration Cylinder. The runtime owns Spell Slot spending,
// Concentration duration, Constitution Saving Throw-gated Radiant damage,
// once-per-creature-per-turn save limiting, shape-shift reversion/suppression
// hooks, and Magic Action reposition witnesses; the table owns spatial area
// membership, trigger emission, Dim Light presentation, and map geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-M-P.md "Moonbeam": Action;
//     120 feet; Concentration up to 1 minute; 5-foot-radius, 40-foot-high
//     Cylinder; Dim Light; later-turn Magic Action move up to 60 feet;
//     Constitution Saving Throw for Radiant damage or half; failed-save
//     shape-shift reversion/suppression; appears/moved-into/enters/ends-turn
//     triggers; once per turn; +1d10 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cylinder, Saving Throw, Damage Type, and
//     shape-shifting.

import { Match, Result, Schema } from "effect";

import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveMovablePersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
import { invalidResult } from "../result-helpers.ts";
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
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDefinitionPointRangeFeet,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
} from "./spell-mechanics-admission.ts";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";
import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";

type MovablePersistentAreaSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "magicAction";
    };
  }
>;
type MovablePersistentAreaResolveInput = Omit<
  SpellProcedureProfileResolveInput<MovablePersistentAreaSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "magicAction";
      };
    }
  >;
};

type MovablePersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect =
  MovablePersistentAreaMechanics["operations"][number]["effect"];
type MovablePersistentAreaInitialPhase =
  MovablePersistentAreaMechanics["initialPhase"];
type MovablePersistentAreaFailedSaveEffect = Extract<
  Extract<
    NonNullable<MovablePersistentAreaInitialPhase>,
    { readonly kind: "save_gate" }
  >["onFail"],
  { readonly kind: "composite" }
>["effects"][number];
type MovablePersistentAreaSaveGateDamage = Extract<
  MovablePersistentAreaFailedSaveEffect,
  { readonly kind: "damage" }
>;
type MovablePersistentAreaProfileShape = {
  readonly radiusFeet: MovementFeetType;
  readonly heightFeet: MovementFeetType;
  readonly repositionMaxMoveFeet: MovementFeetType;
  readonly damageAmount: MovablePersistentAreaSaveGateDamage["amount"];
};
type OngoingAreaFacts = NonNullable<ReturnType<typeof ongoingAreaSpellFacts>>;
type OngoingAreaAttachment = Extract<
  OngoingAreaFacts["mechanics"]["attachment"],
  { readonly kind: "hole" }
>;
type OngoingArea = Extract<
  OngoingAreaAttachment["value"],
  { readonly kind: "area" }
>;
type MovablePersistentAreaMechanicsFacts = SpellProcedureMechanicsFacts &
  MovablePersistentAreaProfileShape;
type MovablePersistentAreaAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "persistentAreaSaveDamage",
    MovablePersistentAreaMechanicsFacts,
    MovablePersistentAreaSpellInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

export const MOVABLE_PERSISTENT_AREA_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialSaveDamage",
  "passiveOperation",
  "repositionOperation",
  "endTurnOperation",
  "enterOperation",
  "movedAreaOperation",
  "operationCount",
  "oncePerTurnLimitGroup",
] as const;
type MovablePersistentAreaFailedFact =
  (typeof MOVABLE_PERSISTENT_AREA_FAILED_FACTS)[number];

const MOVABLE_PERSISTENT_AREA_BASE_CONSUMED_PATHS = [
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
  spellOngoingOperationPath(PositiveInteger(4)),
  spellOngoingOperationPath(PositiveInteger(5)),
  spellOngoingOperationEffectPath(PositiveInteger(1)),
  spellOngoingOperationEffectPath(PositiveInteger(2)),
  spellOngoingOperationEffectPath(PositiveInteger(3)),
  spellOngoingOperationEffectPath(PositiveInteger(4)),
  spellOngoingOperationEffectPath(PositiveInteger(5)),
] as const;

const MOVABLE_PERSISTENT_AREA_UNOWNED_PATHS = [] as const;

const MOVABLE_PERSISTENT_AREA_LEVEL = 2;
const MOVABLE_PERSISTENT_AREA_RANGE_FEET = 120;
const MOVABLE_PERSISTENT_AREA_DURATION_MINUTES = 1;
const MOVABLE_PERSISTENT_AREA_OPERATION_COUNT = 5;
const MOVABLE_PERSISTENT_AREA_RADIUS_FEET = 5;
const MOVABLE_PERSISTENT_AREA_HEIGHT_FEET = 40;
const MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET = 60;
const MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;
const MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 10;
const MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

type MovablePersistentAreaOperationRole =
  | "passive"
  | "reposition"
  | "endTurn"
  | "enter"
  | "movedArea"
  | null;
type MovablePersistentAreaOperationOccurrence = {
  readonly operation: MovablePersistentAreaMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};
type MovablePersistentAreaOperations = {
  readonly passive: MovablePersistentAreaOperationOccurrence | undefined;
  readonly reposition: MovablePersistentAreaOperationOccurrence | undefined;
  readonly endTurn: MovablePersistentAreaOperationOccurrence | undefined;
  readonly enter: MovablePersistentAreaOperationOccurrence | undefined;
  readonly movedArea: MovablePersistentAreaOperationOccurrence | undefined;
  readonly extraOperations: readonly MovablePersistentAreaOperationOccurrence[];
};
type MovablePersistentAreaFailure = {
  readonly failedFact: MovablePersistentAreaFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function movablePersistentAreaOperationRole(
  trigger: OngoingTrigger,
): MovablePersistentAreaOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when("on_caster_spends_action", () => "reposition" as const),
    Match.when("on_creature_ends_turn_in_area", () => "endTurn" as const),
    Match.when("on_creature_enters_area", () => "enter" as const),
    Match.when("on_area_moves_into_creature_space", () => "movedArea" as const),
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
      "on_spatial_manifestation_moves_within_distance_of_creature",
      "on_creature_enters_distance_of_spatial_manifestation",
      "on_creature_ends_turn_within_distance_of_spatial_manifestation",
      "on_creature_exits_area",
      "on_caster_moves_on_turn",
      "on_structure_collapses",
      "on_attached_spends_action",
      "on_affected_creature_spends_action",
      "on_creature_studies",
      () => null,
    ),
    Match.exhaustive,
  );
}

function movablePersistentAreaOperations(
  mechanics: MovablePersistentAreaMechanics,
): MovablePersistentAreaOperations {
  const occurrences = mechanics.operations.map(
    (operation, index): MovablePersistentAreaOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<MovablePersistentAreaOperationRole, null>,
    effect: (
      operation: MovablePersistentAreaMechanics["operations"][number],
    ) => boolean,
  ): MovablePersistentAreaOperationOccurrence | undefined => {
    const matching = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        movablePersistentAreaOperationRole(occurrence.operation.trigger) ===
          role &&
        effect(occurrence.operation),
    );
    const occurrence =
      matching ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          movablePersistentAreaOperationRole(candidate.operation.trigger) ===
            role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };
  const passive = select(
    "passive",
    (operation) => operation.effect.kind === "area_emits_dim_light",
  );
  const reposition = select(
    "reposition",
    (operation) =>
      operation.effect.kind === "reposition_attachment" &&
      operation.effect.maxMoveFeet ===
        MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET,
  );
  const endTurn = select(
    "endTurn",
    (operation) => isMovablePersistentAreaSaveGate(operation.effect) !== null,
  );
  const enter = select(
    "enter",
    (operation) => isMovablePersistentAreaSaveGate(operation.effect) !== null,
  );
  const movedArea = select(
    "movedArea",
    (operation) => isMovablePersistentAreaSaveGate(operation.effect) !== null,
  );
  return {
    passive,
    reposition,
    endTurn,
    enter,
    movedArea,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

function movablePersistentAreaOperationPath(
  occurrence: MovablePersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function movablePersistentAreaOperationEffectPath(
  occurrence: MovablePersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

function movablePersistentAreaCylinderDimensions(
  area: OngoingArea,
): { readonly radiusFeet: number; readonly heightFeet: number } | null {
  if (area.origin.kind !== "point_within_range") return null;
  if (area.shape.kind !== "cylinder") return null;
  if (area.shape.radiusFeet !== MOVABLE_PERSISTENT_AREA_RADIUS_FEET) {
    return null;
  }
  if (area.shape.heightFeet !== MOVABLE_PERSISTENT_AREA_HEIGHT_FEET) {
    return null;
  }
  return {
    radiusFeet: area.shape.radiusFeet,
    heightFeet: area.shape.heightFeet,
  };
}

function movablePersistentAreaCylinderAttachment(
  attachment: OngoingAreaAttachment,
): {
  readonly holeId: string;
  readonly radiusFeet: number;
  readonly heightFeet: number;
} | null {
  const dimensions = movablePersistentAreaCylinderDimensions(attachment.value);
  return dimensions !== null
    ? { holeId: attachment.holeId, ...dimensions }
    : null;
}

function movablePersistentAreaDamageEffect(
  effect: MovablePersistentAreaFailedSaveEffect,
): MovablePersistentAreaSaveGateDamage | null {
  if (
    effect.kind !== "damage" ||
    effect.damageType !== "radiant" ||
    effect.amount?.kind !== "linear_per_level"
  ) {
    return null;
  }
  return isMovablePersistentAreaDamageAmount(effect.amount) ? effect : null;
}

function isMovablePersistentAreaDamageAmount(
  amount: Extract<
    NonNullable<MovablePersistentAreaSaveGateDamage["amount"]>,
    { readonly kind: "linear_per_level" }
  >,
): boolean {
  return (
    amount.axis === "slot" &&
    amount.startingAtLevel === MOVABLE_PERSISTENT_AREA_LEVEL &&
    amount.base.dice === MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    amount.base.dieSize === MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    amount.perLevel.dice ===
      MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL &&
    (amount.perLevel.dieSize === undefined ||
      amount.perLevel.dieSize === MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE)
  );
}

function isMovablePersistentAreaSaveGate(
  effect:
    | OngoingOperationEffect
    | MovablePersistentAreaInitialPhase
    | undefined,
): MovablePersistentAreaSaveGateDamage | null {
  if (effect?.kind !== "save_gate") return null;
  if (
    effect.onFail.kind !== "composite" ||
    effect.onFail.effects.length !== 3
  ) {
    return null;
  }
  const damageEffects = effect.onFail.effects.flatMap(
    (candidate): readonly MovablePersistentAreaSaveGateDamage[] => {
      const damage = movablePersistentAreaDamageEffect(candidate);
      return damage === null ? [] : [damage];
    },
  );
  if (damageEffects.length !== 1) return null;
  if (
    !effect.onFail.effects.some(
      (candidate) => candidate.kind === "revert_shape_shift_to_true_form",
    ) ||
    !effect.onFail.effects.some(
      (candidate) => candidate.kind === "suppress_shape_shifting_while_in_area",
    )
  ) {
    return null;
  }
  if (
    effect.ability !== "con" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "half_damage"
  ) {
    return null;
  }
  return damageEffects[0] ?? null;
}

function movablePersistentAreaInitialSaveGate(
  effect: MovablePersistentAreaInitialPhase,
  areaHoleId: string,
): MovablePersistentAreaSaveGateDamage | null {
  if (effect?.kind !== "save_gate") return null;
  if (effect.attachment.kind !== "hole") return null;
  if (effect.attachment.holeId !== areaHoleId) return null;
  if (effect.attachment.value.kind !== "area") return null;
  if (
    movablePersistentAreaCylinderDimensions(effect.attachment.value) === null
  ) {
    return null;
  }
  return isMovablePersistentAreaSaveGate(effect);
}

function movablePersistentAreaUsageLimitFailures(
  mechanics: MovablePersistentAreaMechanics,
  operations: MovablePersistentAreaOperations,
): readonly MovablePersistentAreaFailure[] {
  const entries = [
    {
      limit:
        mechanics.initialPhase?.kind === "save_gate"
          ? mechanics.initialPhase.usageLimit
          : undefined,
      mechanicsPath: spellOngoingInitialPhasePath(),
    },
    {
      limit: operations.endTurn?.operation.usageLimit,
      mechanicsPath: movablePersistentAreaOperationPath(
        operations.endTurn,
        PositiveInteger(3),
      ),
    },
    {
      limit: operations.enter?.operation.usageLimit,
      mechanicsPath: movablePersistentAreaOperationPath(
        operations.enter,
        PositiveInteger(4),
      ),
    },
    {
      limit: operations.movedArea?.operation.usageLimit,
      mechanicsPath: movablePersistentAreaOperationPath(
        operations.movedArea,
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

function movablePersistentAreaProjection(ongoing: OngoingAreaFacts):
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<MovablePersistentAreaFailure>;
    }
  | {
      readonly tag: "supported";
      readonly shape: MovablePersistentAreaProfileShape;
    } {
  const { mechanics, durationTicks } = ongoing;
  const cylinder = movablePersistentAreaCylinderAttachment(
    mechanics.attachment,
  );
  const operations = movablePersistentAreaOperations(mechanics);
  const failures: MovablePersistentAreaFailure[] = [];
  if (mechanics.level !== MOVABLE_PERSISTENT_AREA_LEVEL) {
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
    mechanics.range.feet !== MOVABLE_PERSISTENT_AREA_RANGE_FEET
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== MOVABLE_PERSISTENT_AREA_DURATION_MINUTES
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
  if (cylinder === null) {
    failures.push({
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    });
  }
  const areaHoleId = mechanics.attachment.holeId;
  const initialSaveDamage = movablePersistentAreaInitialSaveGate(
    mechanics.initialPhase,
    areaHoleId,
  );
  if (initialSaveDamage === null) {
    failures.push({
      failedFact: "initialSaveDamage",
      mechanicsPath: spellOngoingInitialPhasePath(),
    });
  }
  if (
    operations.passive === undefined ||
    operations.passive.operation.trigger.kind !== "passive" ||
    operations.passive.operation.effect.kind !== "area_emits_dim_light"
  ) {
    failures.push({
      failedFact: "passiveOperation",
      mechanicsPath: movablePersistentAreaOperationEffectPath(
        operations.passive,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.reposition === undefined ||
    operations.reposition.operation.trigger.kind !==
      "on_caster_spends_action" ||
    operations.reposition.operation.trigger.cost.kind !== "standard_action" ||
    operations.reposition.operation.trigger.cost.action !== "magic" ||
    operations.reposition.operation.trigger.laterTurnsOnly !== true ||
    operations.reposition.operation.effect.kind !== "reposition_attachment" ||
    typeof operations.reposition.operation.effect.maxMoveFeet !== "number" ||
    operations.reposition.operation.effect.maxMoveFeet !==
      MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET
  ) {
    failures.push({
      failedFact: "repositionOperation",
      mechanicsPath: movablePersistentAreaOperationEffectPath(
        operations.reposition,
        PositiveInteger(2),
      ),
    });
  }
  if (
    operations.endTurn === undefined ||
    operations.endTurn.operation.trigger.kind !==
      "on_creature_ends_turn_in_area" ||
    isMovablePersistentAreaSaveGate(operations.endTurn.operation.effect) ===
      null
  ) {
    failures.push({
      failedFact: "endTurnOperation",
      mechanicsPath: movablePersistentAreaOperationEffectPath(
        operations.endTurn,
        PositiveInteger(3),
      ),
    });
  }
  if (
    operations.enter === undefined ||
    operations.enter.operation.trigger.kind !== "on_creature_enters_area" ||
    isMovablePersistentAreaSaveGate(operations.enter.operation.effect) === null
  ) {
    failures.push({
      failedFact: "enterOperation",
      mechanicsPath: movablePersistentAreaOperationEffectPath(
        operations.enter,
        PositiveInteger(4),
      ),
    });
  }
  if (
    operations.movedArea === undefined ||
    operations.movedArea.operation.trigger.kind !==
      "on_area_moves_into_creature_space" ||
    isMovablePersistentAreaSaveGate(operations.movedArea.operation.effect) ===
      null
  ) {
    failures.push({
      failedFact: "movedAreaOperation",
      mechanicsPath: movablePersistentAreaOperationEffectPath(
        operations.movedArea,
        PositiveInteger(5),
      ),
    });
  }
  if (
    mechanics.operations.length !== MOVABLE_PERSISTENT_AREA_OPERATION_COUNT &&
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
      mechanicsPath: movablePersistentAreaOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );
  failures.push(
    ...movablePersistentAreaUsageLimitFailures(mechanics, operations),
  );

  const unsupportedFailures = spellProcedureNonEmpty(failures);
  if (unsupportedFailures !== undefined) {
    return { tag: "unsupported", failures: unsupportedFailures };
  }
  if (
    cylinder === null ||
    initialSaveDamage === null ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks) ||
    operations.reposition?.operation.effect.kind !== "reposition_attachment"
  ) {
    return {
      tag: "unsupported",
      failures: [
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
      ],
    };
  }
  return {
    tag: "supported",
    shape: {
      radiusFeet: movementFeet(cylinder.radiusFeet),
      heightFeet: movementFeet(cylinder.heightFeet),
      repositionMaxMoveFeet: movementFeet(
        MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET,
      ),
      damageAmount: initialSaveDamage.amount,
    },
  };
}

function isMovablePersistentAreaRepresentation(
  mechanics: SpellMechanics,
): mechanics is MovablePersistentAreaMechanics {
  if (
    mechanics.family !== "ongoing_effect" ||
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "area" ||
    mechanics.attachment.value.shape.kind !== "cylinder"
  ) {
    return false;
  }
  // Reposition is the stable profile witness; independently validated Dim
  // Light omission must remain represented for an exact passive-operation
  // failure.
  return mechanics.operations.some(
    ({ effect }) => effect.kind === "reposition_attachment",
  );
}

function movablePersistentAreaAdmissionIssue(
  failure: MovablePersistentAreaFailure,
): MovablePersistentAreaAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveDamage",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported directed-reposition persistent-area mechanics fact: ${failure.failedFact}.`,
  };
}

function admitMovablePersistentArea(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MovablePersistentAreaMechanicsFacts,
): readonly MovablePersistentAreaSpellInvocation[] {
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
    (slot): readonly MovablePersistentAreaSpellInvocation[] => {
      if (Number(slot.spellLevel) < MOVABLE_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: MOVABLE_PERSISTENT_AREA_LEVEL,
        slotLevel: slot.spellLevel,
      });
      return damageExpr === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "persistentAreaSaveDamage",
              lifecycle: {
                kind: "casterActionReposition",
                actionCost: "magicAction",
                movedAreaOperation: "saveDamage",
                collisionDisposition: "ignoreObstacles",
              },
              spell,
              ability: "con",
              dc: { kind: "caster_spell_save_dc" },
              targeting: {
                kind: "pointOriginCylinder",
                radiusFeet: facts.radiusFeet,
                heightFeet: facts.heightFeet,
              },
              durationTicks: durationTicks.success,
              rangeFeet,
              repositionMaxMoveFeet: facts.repositionMaxMoveFeet,
              damage: { expr: damageExpr, damageType: "radiant" },
            },
          ];
    },
  );
}

function movablePersistentAreaMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveDamage",
  MovablePersistentAreaMechanicsFacts,
  MovablePersistentAreaSpellInvocation
> {
  if (!isMovablePersistentAreaRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) return { tag: "notRepresented" };
  const projection = movablePersistentAreaProjection(ongoing);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        projection.failures,
        movablePersistentAreaAdmissionIssue,
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.shape,
  } satisfies MovablePersistentAreaMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveDamage",
      facts,
      evidence: {
        consumed: [
          ...MOVABLE_PERSISTENT_AREA_BASE_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: MOVABLE_PERSISTENT_AREA_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitMovablePersistentArea(executionSource, ctx, facts),
    },
  };
}

function resolveNarrowedMovablePersistentArea(
  input: MovablePersistentAreaResolveInput,
): BattleResolutionResult {
  return resolveMovablePersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveMovablePersistentArea(
  input: SpellProcedureProfileResolveInput<MovablePersistentAreaSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when(
      {
        lifecycle: {
          kind: "casterActionReposition",
          collisionDisposition: "ignoreObstacles",
        },
      },
      (invocation) =>
        resolveNarrowedMovablePersistentArea({ ...input, invocation }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the directed-reposition persistent-area profile.",
      ),
    ),
  );
}

const MovablePersistentAreaInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("persistentAreaSaveDamage"),
    lifecycle: Schema.Struct({
      kind: Schema.Literal("casterActionReposition"),
      actionCost: Schema.Literal("magicAction"),
      movedAreaOperation: Schema.Literal("saveDamage"),
      collisionDisposition: Schema.Literal("ignoreObstacles"),
    }),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCylinder"),
      radiusFeet: MovementFeet,
      heightFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    repositionMaxMoveFeet: MovementFeet,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: Schema.Literal("radiant"),
    }),
  }),
);

export const directedRepositionPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: MovablePersistentAreaInvocationSchema,
  admitMechanics: movablePersistentAreaMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveMovablePersistentArea,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  MovablePersistentAreaSpellInvocation
>;
