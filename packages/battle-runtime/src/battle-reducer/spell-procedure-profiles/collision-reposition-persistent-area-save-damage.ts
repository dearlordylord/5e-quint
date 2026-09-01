import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
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
} from "@dnd/surface/surface/types";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
//
// The ramMovablePersistentArea Spell Procedure Profile: action-time Spell Slot casting
// creates a caster-owned Concentration sphere hazard. The runtime owns Spell
// Slot spending, Concentration duration, Dexterity Saving Throw-gated Fire
// damage, and Bonus Action ram/reposition command witnesses; the table owns
// spatial placement, movement path, object ignition, and light presentation.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Flaming Sphere":
//     Action; 60 feet; Concentration up to 1 minute; 5-foot-diameter sphere
//     in an unoccupied ground space; creatures ending turns within 5 feet make
//     Dexterity Saving Throws for Fire damage or half; Bonus Action movement
//     up to 30 feet can ram a creature; object ignition and Bright/Dim light
//     are table/presentation facts.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration,
//     Spell Slot, Spell Invocation, Saving Throw, Damage Type, and Movement.

import { Match, Result, Schema } from "effect";

import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveRamMovablePersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
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

type RamMovablePersistentAreaSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "bonusAction";
    };
  }
>;
type RamMovablePersistentAreaResolveInput = Omit<
  SpellProcedureProfileResolveInput<RamMovablePersistentAreaSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "bonusAction";
      };
    }
  >;
};

type OngoingMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect = OngoingMechanics["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type RamMovablePersistentAreaSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "damage" }
  >;
};
type RamMovablePersistentAreaProfileShape = {
  readonly diameterFeet: MovementFeetType;
  readonly ramMaxMoveFeet: MovementFeetType;
  readonly damageAmount: RamMovablePersistentAreaSaveEffect["onFail"]["amount"];
};
type OngoingAreaFacts = NonNullable<ReturnType<typeof ongoingAreaSpellFacts>>;
type RamMovablePersistentAreaMechanicsFacts = SpellProcedureMechanicsFacts &
  RamMovablePersistentAreaProfileShape;
type RamMovablePersistentAreaAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "persistentAreaSaveDamage",
    RamMovablePersistentAreaMechanicsFacts,
    RamMovablePersistentAreaSpellInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

export const RAM_MOVABLE_PERSISTENT_AREA_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialPhase",
  "endTurnOperation",
  "ramOperation",
  "repositionOperation",
  "igniteOperation",
  "lightOperation",
  "operationCount",
] as const;
type RamMovablePersistentAreaFailedFact =
  (typeof RAM_MOVABLE_PERSISTENT_AREA_FAILED_FACTS)[number];

const RAM_MOVABLE_PERSISTENT_AREA_BASE_CONSUMED_PATHS = [
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

const RAM_MOVABLE_PERSISTENT_AREA_OPERATION_CONSUMED_PATHS = [
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

const RAM_MOVABLE_PERSISTENT_AREA_UNOWNED_PATHS = [] as const;

const RAM_MOVABLE_PERSISTENT_AREA_LEVEL = 2;
const RAM_MOVABLE_PERSISTENT_AREA_RANGE_FEET = 60;
const RAM_MOVABLE_PERSISTENT_AREA_DURATION_MINUTES = 1;
const RAM_MOVABLE_PERSISTENT_AREA_OPERATION_COUNT = 5;
const RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET = 5;
const RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET =
  RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET / 2;
const RAM_MOVABLE_PERSISTENT_AREA_END_DISTANCE_FEET = 5;
const RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET = 30;
const RAM_MOVABLE_PERSISTENT_AREA_LIGHT_BRIGHT_RADIUS_FEET = 20;
const RAM_MOVABLE_PERSISTENT_AREA_LIGHT_DIM_ADDITIONAL_FEET = 20;
const RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;
const RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 6;
const RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

type RamMovablePersistentAreaOperationRole =
  | "passive"
  | "endTurn"
  | "ram"
  | "reposition"
  | null;
type RamMovablePersistentAreaOperationOccurrence = {
  readonly operation: OngoingMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};
type RamMovablePersistentAreaOperations = {
  readonly endTurn: RamMovablePersistentAreaOperationOccurrence | undefined;
  readonly ram: RamMovablePersistentAreaOperationOccurrence | undefined;
  readonly reposition: RamMovablePersistentAreaOperationOccurrence | undefined;
  readonly ignite: RamMovablePersistentAreaOperationOccurrence | undefined;
  readonly light: RamMovablePersistentAreaOperationOccurrence | undefined;
  readonly extraOperations: readonly RamMovablePersistentAreaOperationOccurrence[];
};

type RamMovablePersistentAreaFailure = {
  readonly failedFact: RamMovablePersistentAreaFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function ramMovablePersistentAreaOperationRole(
  trigger: OngoingTrigger,
): RamMovablePersistentAreaOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when(
      "on_creature_ends_turn_within_distance_of_area",
      () => "endTurn" as const,
    ),
    Match.when("on_area_moves_into_creature_space", () => "ram" as const),
    Match.when("on_caster_spends_action", () => "reposition" as const),
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
      "on_creature_enters_area",
      "on_creature_starts_turn_in_area",
      "on_creature_ends_turn_in_area",
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

function ramMovablePersistentAreaOperations(
  mechanics: OngoingMechanics,
): RamMovablePersistentAreaOperations {
  const occurrences = mechanics.operations.map(
    (operation, index): RamMovablePersistentAreaOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<RamMovablePersistentAreaOperationRole, null>,
    effect: (operation: OngoingMechanics["operations"][number]) => boolean,
  ): RamMovablePersistentAreaOperationOccurrence | undefined => {
    const matching = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        ramMovablePersistentAreaOperationRole(occurrence.operation.trigger) ===
          role &&
        effect(occurrence.operation),
    );
    const occurrence =
      matching ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          ramMovablePersistentAreaOperationRole(candidate.operation.trigger) ===
            role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };

  const endTurn = select(
    "endTurn",
    (operation) =>
      operation.trigger.kind ===
        "on_creature_ends_turn_within_distance_of_area" &&
      operation.trigger.distanceFeet ===
        RAM_MOVABLE_PERSISTENT_AREA_END_DISTANCE_FEET,
  );
  const ram = select(
    "ram",
    (operation) => operation.effect.kind === "save_gate",
  );
  const reposition = select(
    "reposition",
    (operation) =>
      operation.effect.kind === "reposition_attachment" &&
      operation.effect.maxMoveFeet ===
        RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET,
  );
  const ignite = select(
    "passive",
    (operation) => operation.effect.kind === "ignite_objects",
  );
  const light = select(
    "passive",
    (operation) => operation.effect.kind === "emit_bright_and_dim_illumination",
  );

  return {
    endTurn,
    ram,
    reposition,
    ignite,
    light,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

function ramMovablePersistentAreaOperationPath(
  occurrence: RamMovablePersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function ramMovablePersistentAreaOperationEffectPath(
  occurrence: RamMovablePersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

function isRamMovablePersistentAreaSaveEffect(
  effect: OngoingOperationEffect | undefined,
  areaHoleId: string | undefined,
): effect is RamMovablePersistentAreaSaveEffect {
  if (effect?.kind !== "save_gate") return false;
  const amount = effect.onFail.kind === "damage" ? effect.onFail.amount : null;
  return (
    areaHoleId !== undefined &&
    effect.attachment?.kind === "hole" &&
    effect.attachment.holeId === areaHoleId &&
    effect.attachment.value.kind === "area" &&
    effect.attachment.value.origin.kind === "point_within_range" &&
    effect.attachment.value.shape.kind === "sphere" &&
    effect.attachment.value.shape.radiusFeet ===
      RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "fire" &&
    amount?.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === RAM_MOVABLE_PERSISTENT_AREA_LEVEL &&
    amount.base.dice === RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    amount.base.dieSize === RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    amount.perLevel.dice ===
      RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL &&
    amount.perLevel.dieSize === RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE
  );
}

function ramMovablePersistentAreaProjection(ongoing: OngoingAreaFacts):
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<RamMovablePersistentAreaFailure>;
    }
  | {
      readonly tag: "supported";
      readonly shape: RamMovablePersistentAreaProfileShape;
    } {
  const { mechanics, durationTicks } = ongoing;
  const area = mechanics.attachment.value;
  const operations = ramMovablePersistentAreaOperations(mechanics);
  const failures: RamMovablePersistentAreaFailure[] = [];

  if (mechanics.level !== RAM_MOVABLE_PERSISTENT_AREA_LEVEL) {
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
    mechanics.range.feet !== RAM_MOVABLE_PERSISTENT_AREA_RANGE_FEET
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !==
      RAM_MOVABLE_PERSISTENT_AREA_DURATION_MINUTES
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
  if (
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET
  ) {
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
    operations.endTurn === undefined ||
    operations.endTurn.operation.trigger.kind !==
      "on_creature_ends_turn_within_distance_of_area" ||
    operations.endTurn.operation.trigger.distanceFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_END_DISTANCE_FEET ||
    !isRamMovablePersistentAreaSaveEffect(
      operations.endTurn.operation.effect,
      mechanics.attachment.holeId,
    )
  ) {
    failures.push({
      failedFact: "endTurnOperation",
      mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
        operations.endTurn,
        PositiveInteger(1),
      ),
    });
  }
  if (
    operations.ram === undefined ||
    operations.ram.operation.trigger.kind !==
      "on_area_moves_into_creature_space" ||
    !isRamMovablePersistentAreaSaveEffect(
      operations.ram.operation.effect,
      mechanics.attachment.holeId,
    )
  ) {
    failures.push({
      failedFact: "ramOperation",
      mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
        operations.ram,
        PositiveInteger(2),
      ),
    });
  }
  if (
    operations.reposition === undefined ||
    operations.reposition.operation.trigger.kind !==
      "on_caster_spends_action" ||
    operations.reposition.operation.trigger.cost.kind !== "bonus_action" ||
    operations.reposition.operation.effect.kind !== "reposition_attachment" ||
    operations.reposition.operation.effect.maxMoveFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET
  ) {
    failures.push({
      failedFact: "repositionOperation",
      mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
        operations.reposition,
        PositiveInteger(3),
      ),
    });
  }
  if (
    operations.ignite === undefined ||
    operations.ignite.operation.trigger.kind !== "passive" ||
    operations.ignite.operation.effect.kind !== "ignite_objects" ||
    operations.ignite.operation.effect.filter.material !== "flammable" ||
    operations.ignite.operation.effect.filter.targetRelation !==
      "not_worn_or_carried"
  ) {
    failures.push({
      failedFact: "igniteOperation",
      mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
        operations.ignite,
        PositiveInteger(4),
      ),
    });
  }
  if (
    operations.light === undefined ||
    operations.light.operation.trigger.kind !== "passive" ||
    operations.light.operation.effect.kind !==
      "emit_bright_and_dim_illumination" ||
    operations.light.operation.effect.brightRadiusFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_LIGHT_BRIGHT_RADIUS_FEET ||
    operations.light.operation.effect.dimAdditionalFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_LIGHT_DIM_ADDITIONAL_FEET
  ) {
    failures.push({
      failedFact: "lightOperation",
      mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
        operations.light,
        PositiveInteger(5),
      ),
    });
  }
  if (
    mechanics.operations.length !==
      RAM_MOVABLE_PERSISTENT_AREA_OPERATION_COUNT &&
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
      mechanicsPath: ramMovablePersistentAreaOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );

  const unsupportedFailures = spellProcedureNonEmpty(failures);
  if (unsupportedFailures !== undefined) {
    return { tag: "unsupported", failures: unsupportedFailures };
  }
  const endTurnEffect = operations.endTurn?.operation.effect;
  if (
    !isRamMovablePersistentAreaSaveEffect(
      endTurnEffect,
      mechanics.attachment.holeId,
    )
  ) {
    return {
      tag: "unsupported",
      failures: [
        {
          failedFact: "endTurnOperation",
          mechanicsPath: ramMovablePersistentAreaOperationEffectPath(
            operations.endTurn,
            PositiveInteger(1),
          ),
        },
      ],
    };
  }
  if (durationTicks === undefined || Result.isFailure(durationTicks)) {
    return {
      tag: "unsupported",
      failures: [
        {
          failedFact: "durationTicks",
          mechanicsPath: spellDurationValuePath(),
        },
      ],
    };
  }
  return {
    tag: "supported",
    shape: {
      diameterFeet: movementFeet(RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET),
      ramMaxMoveFeet: movementFeet(
        RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET,
      ),
      damageAmount: endTurnEffect.onFail.amount,
    },
  };
}

function isRamMovablePersistentAreaRepresentation(
  mechanics: SpellMechanics,
): mechanics is OngoingMechanics {
  if (
    mechanics.family !== "ongoing_effect" ||
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "area" ||
    mechanics.attachment.value.shape.kind !== "sphere"
  ) {
    return false;
  }
  // Keep the gate stable when one of the required lifecycle triggers is
  // malformed: Flaming Sphere's authored ignition/light witnesses still
  // identify this sibling while the projection reports the exact bad branch.
  return mechanics.operations.some(
    ({ effect }) =>
      effect.kind === "ignite_objects" ||
      effect.kind === "emit_bright_and_dim_illumination",
  );
}

function ramMovablePersistentAreaAdmissionIssue(
  failure: RamMovablePersistentAreaFailure,
): RamMovablePersistentAreaAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveDamage",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported collision-reposition persistent-area mechanics fact: ${failure.failedFact}.`,
  };
}

function admitRamMovablePersistentArea(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: RamMovablePersistentAreaMechanicsFacts,
): readonly RamMovablePersistentAreaSpellInvocation[] {
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
    (slot): readonly RamMovablePersistentAreaSpellInvocation[] => {
      if (Number(slot.spellLevel) < RAM_MOVABLE_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: RAM_MOVABLE_PERSISTENT_AREA_LEVEL,
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
                actionCost: "bonusAction",
                movedAreaOperation: "saveDamage",
                collisionDisposition: "stopAndAffectAdjacent",
              },
              spell,
              ability: "dex",
              dc: { kind: "caster_spell_save_dc" },
              targeting: {
                kind: "pointOriginSphereDiameter",
                diameterFeet: facts.diameterFeet,
              },
              durationTicks: durationTicks.success,
              rangeFeet,
              ramMaxMoveFeet: facts.ramMaxMoveFeet,
              damage: { expr: damageExpr, damageType: "fire" },
            },
          ];
    },
  );
}

function ramMovablePersistentAreaMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveDamage",
  RamMovablePersistentAreaMechanicsFacts,
  RamMovablePersistentAreaSpellInvocation
> {
  if (!isRamMovablePersistentAreaRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) return { tag: "notRepresented" };
  const projection = ramMovablePersistentAreaProjection(ongoing);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        projection.failures,
        ramMovablePersistentAreaAdmissionIssue,
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.shape,
  } satisfies RamMovablePersistentAreaMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveDamage",
      facts,
      evidence: {
        consumed: [
          ...RAM_MOVABLE_PERSISTENT_AREA_BASE_CONSUMED_PATHS,
          ...(ongoing.mechanics.initialPhase === undefined
            ? []
            : [spellOngoingInitialPhasePath()]),
          ...RAM_MOVABLE_PERSISTENT_AREA_OPERATION_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: RAM_MOVABLE_PERSISTENT_AREA_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitRamMovablePersistentArea(executionSource, ctx, facts),
    },
  };
}

function resolveNarrowedRamMovablePersistentArea(
  input: RamMovablePersistentAreaResolveInput,
): BattleResolutionResult {
  return resolveRamMovablePersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveRamMovablePersistentArea(
  input: SpellProcedureProfileResolveInput<RamMovablePersistentAreaSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when(
      {
        lifecycle: {
          kind: "casterActionReposition",
          collisionDisposition: "stopAndAffectAdjacent",
        },
      },
      (invocation) =>
        resolveNarrowedRamMovablePersistentArea({ ...input, invocation }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the collision-reposition persistent-area profile.",
      ),
    ),
  );
}

const RamMovablePersistentAreaInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("persistentAreaSaveDamage"),
    lifecycle: Schema.Struct({
      kind: Schema.Literal("casterActionReposition"),
      actionCost: Schema.Literal("bonusAction"),
      movedAreaOperation: Schema.Literal("saveDamage"),
      collisionDisposition: Schema.Literal("stopAndAffectAdjacent"),
    }),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphereDiameter"),
      diameterFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    ramMaxMoveFeet: MovementFeet,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: Schema.Literal("fire"),
    }),
  }),
);
export const collisionRepositionPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: RamMovablePersistentAreaInvocationSchema,
  admitMechanics: ramMovablePersistentAreaMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveRamMovablePersistentArea,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  RamMovablePersistentAreaSpellInvocation
>;
