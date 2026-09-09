import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
  type MovementFeet as MovementFeetType,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import type {
  AuthoredConditionalMechanic,
  Components,
  DamageType,
  DiceExpr,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type BattleResolutionResult,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  LeveledSpellInvocationResourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolveAreaMovementDistanceDamageSpellAct } from "../spells-resolve-area-effects.ts";
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
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
//
// This profile owns action-time Spell Slot casting, a caster-owned
// Concentration Sphere of Difficult Terrain, and Piercing damage scaled by
// movement distance through the area. Spatial path facts and camouflaged
// terrain recognition remain table-owned.
//
// RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Spike Growth".

type AreaMovementDistanceDamageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "areaMovementDistanceDamage" }
>;
type AreaMovementDistanceDamageResolveInput =
  SpellProcedureProfileResolveInput<AreaMovementDistanceDamageSpellInvocation>;
type AreaMovementDistanceDamageMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type AreaMovementDistanceDamageOperation =
  AreaMovementDistanceDamageMechanics["operations"][number];
type AreaMovementDistanceDamageDuration = Extract<
  AreaMovementDistanceDamageMechanics["duration"],
  { readonly kind: "concentration" }
>;
type AreaMovementDistanceDamageArea = Extract<
  Extract<
    AreaMovementDistanceDamageMechanics["attachment"],
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "area" }
>;
type AreaMovementDistanceDamageSupportedArea =
  AreaMovementDistanceDamageArea & {
    readonly shape: Extract<
      AreaMovementDistanceDamageArea["shape"],
      { readonly kind: "sphere" }
    > & { readonly radiusFeet: number };
  };

const AREA_MOVEMENT_DISTANCE_DAMAGE_LEVEL = 2 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_RANGE_FEET = 150 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_DURATION_MINUTES = 10 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_RADIUS_FEET = 20 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_INTERVAL_FEET = 5 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_DICE = 2 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_DIE_SIZE = 4 as const;
const AREA_MOVEMENT_DISTANCE_DAMAGE_MATERIAL = "seven thorns" as const;

type AreaMovementDistanceDamageMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radiusFeet: MovementFeetType;
  readonly rangeFeet: MovementFeetType;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: Extract<DamageType, "piercing">;
  };
  readonly damagePerFeet: MovementFeetType;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for AreaMovementDistanceDamageFailedFact.
const AREA_MOVEMENT_DISTANCE_DAMAGE_FAILED_FACTS = [
  "mechanics",
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
  "authoredConditionalMechanics",
  "operationCount",
  "difficultTerrainOperation",
  "difficultTerrainEffect",
  "movementDamageOperation",
  "movementDamageEffect",
] as const;
type AreaMovementDistanceDamageFailedFact =
  (typeof AREA_MOVEMENT_DISTANCE_DAMAGE_FAILED_FACTS)[number];
type AreaMovementDistanceDamageAdmissionIssue = SpellProcedureAdmissionIssue<
  "areaMovementDistanceDamage",
  AreaMovementDistanceDamageFailedFact,
  UnitMechanicsPath
>;
type AreaMovementDistanceDamageIssueFact = {
  readonly failedFact: AreaMovementDistanceDamageFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

const ROOT_FIELDS = [
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
] as const satisfies ReadonlyArray<keyof AreaMovementDistanceDamageMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
type AreaMovementDistanceDamageComponentKeySpace = Pick<
  Components,
  "v" | "s" | "m"
> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<
  keyof AreaMovementDistanceDamageComponentKeySpace
>;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const;
const DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof AreaMovementDistanceDamageDuration["upTo"]
>;
const ATTACHMENT_FIELDS = ["kind", "holeId", "label", "value"] as const;
const AREA_FIELDS = ["kind", "origin", "shape"] as const;
const ORIGIN_FIELDS = ["kind"] as const;
const SHAPE_FIELDS = ["kind", "radiusFeet"] as const;
const OPERATION_FIELDS = ["trigger", "effect"] as const;
const PASSIVE_TRIGGER_FIELDS = ["kind"] as const;
const MOVEMENT_TRIGGER_FIELDS = ["kind", "perFeet"] as const;
const DIFFICULT_TERRAIN_EFFECT_FIELDS = ["kind"] as const;
const DAMAGE_EFFECT_FIELDS = ["kind", "damageType", "amount"] as const;
const DAMAGE_AMOUNT_FIELDS = ["kind", "expr"] as const;
const DICE_EXPR_FIELDS = ["dice", "dieSize", "flat"] as const;
const RECOGNITION_FIELDS = [
  "kind",
  "camouflage",
  "eligibility",
  "attempt",
] as const;
const RECOGNITION_ELIGIBILITY_FIELDS = ["kind"] as const;
const RECOGNITION_ATTEMPT_FIELDS = ["action", "check"] as const;
const RECOGNITION_CHECK_FIELDS = [
  "ability",
  "skillOptions",
  "dc",
  "onSuccess",
] as const;
const RECOGNITION_DC_FIELDS = ["kind"] as const;
const RECOGNITION_SUCCESS_FIELDS = ["kind", "timing"] as const;

function areaMovementDistanceDamageIssue(
  failedFact: AreaMovementDistanceDamageFailedFact,
  mechanicsPath: UnitMechanicsPath,
): AreaMovementDistanceDamageAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "areaMovementDistanceDamage",
    failedFact,
    mechanicsPath,
    message: `Unsupported areaMovementDistanceDamage mechanics fact: ${failedFact}.`,
  };
}

function areaMovementDistanceDamageHasTableOwnedRecognition(
  mechanic: AuthoredConditionalMechanic,
): boolean {
  return Match.value(mechanic).pipe(
    Match.when({ kind: "phantasm_damage" }, () => false),
    Match.when(
      { kind: "camouflaged_area_recognition" },
      areaMovementDistanceDamageRecognitionIsSupported,
    ),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageRecognitionIsSupported(
  recognition: Extract<
    AuthoredConditionalMechanic,
    { readonly kind: "camouflaged_area_recognition" }
  >,
): boolean {
  return [
    recognition.camouflage === "looks_natural",
    recognition.eligibility.kind === "unable_to_see_area_when_spell_cast",
    recognition.attempt.action === "search",
    recognition.attempt.check.ability === "wis",
    recognition.attempt.check.skillOptions.length === 2,
    recognition.attempt.check.skillOptions.includes("perception"),
    recognition.attempt.check.skillOptions.includes("survival"),
    recognition.attempt.check.dc.kind === "caster_spell_save_dc",
    recognition.attempt.check.onSuccess.kind === "recognize_hazardous_terrain",
    recognition.attempt.check.onSuccess.timing === "before_entering_area",
    spellMechanicsObjectHasOnlyKeys(recognition, RECOGNITION_FIELDS),
    spellMechanicsObjectHasOnlyKeys(
      recognition.eligibility,
      RECOGNITION_ELIGIBILITY_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      recognition.attempt,
      RECOGNITION_ATTEMPT_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      recognition.attempt.check,
      RECOGNITION_CHECK_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      recognition.attempt.check.dc,
      RECOGNITION_DC_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      recognition.attempt.check.onSuccess,
      RECOGNITION_SUCCESS_FIELDS,
    ),
  ].every(Boolean);
}

function areaMovementDistanceDamageRepresentation(
  mechanics: SpellMechanics,
): mechanics is AreaMovementDistanceDamageMechanics {
  return Match.value(mechanics).pipe(
    Match.when(
      { family: "ongoing_effect" },
      areaMovementDistanceDamageOngoingRepresentation,
    ),
    Match.whenOr(
      { family: "modal_ongoing_effect" },
      { family: "activation" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageOngoingRepresentation(
  ongoing: AreaMovementDistanceDamageMechanics,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present: [
          ongoing.level === AREA_MOVEMENT_DISTANCE_DAMAGE_LEVEL,
          ongoing.school === "transmutation",
          ongoing.castingTime.kind === "action",
        ].every(Boolean),
      },
      {
        name: "rangeAndComponents",
        present: [
          ongoing.range.kind === "point",
          ongoing.range.kind === "point" &&
            ongoing.range.feet === AREA_MOVEMENT_DISTANCE_DAMAGE_RANGE_FEET,
          ongoing.components.v === true,
          ongoing.components.s === true,
          ongoing.components.m === AREA_MOVEMENT_DISTANCE_DAMAGE_MATERIAL,
        ].every(Boolean),
      },
      {
        name: "duration",
        present: areaMovementDistanceDamageDurationWitness(ongoing.duration),
      },
      {
        name: "area",
        present: areaMovementDistanceDamageAreaWitness(ongoing.attachment),
      },
      {
        name: "operations",
        present: areaMovementDistanceDamageOperationsWitness(
          ongoing.operations,
        ),
      },
    ],
  });
}

function areaMovementDistanceDamageDurationWitness(
  duration: AreaMovementDistanceDamageMechanics["duration"],
): boolean {
  if (duration.kind !== "concentration") return false;
  return [
    duration.upTo.unit === "minute",
    duration.upTo.amount === AREA_MOVEMENT_DISTANCE_DAMAGE_DURATION_MINUTES,
  ].every(Boolean);
}

function areaMovementDistanceDamageAreaWitness(
  attachment: AreaMovementDistanceDamageMechanics["attachment"],
): boolean {
  if (attachment.kind !== "hole") return false;
  if (attachment.value.kind !== "area") return false;
  if (attachment.value.shape.kind !== "sphere") return false;
  return [
    attachment.value.origin.kind === "point_within_range",
    attachment.value.shape.radiusFeet ===
      AREA_MOVEMENT_DISTANCE_DAMAGE_RADIUS_FEET,
  ].every(Boolean);
}

function areaMovementDistanceDamageOperationsWitness(
  operations: AreaMovementDistanceDamageMechanics["operations"],
): boolean {
  return [
    operations.some(
      ({ effect }) => effect.kind === "area_is_difficult_terrain",
    ),
    operations.some(
      ({ trigger, effect }) =>
        trigger.kind === "on_creature_moves" && effect.kind === "damage",
    ),
  ].every(Boolean);
}

type AreaMovementDistanceDamageProjection<A> =
  | { readonly tag: "parsed"; readonly fact: A }
  | {
      readonly tag: "unsupported";
      readonly issue: AreaMovementDistanceDamageIssueFact;
    };

function areaMovementDistanceDamageRangeProjection(
  range: AreaMovementDistanceDamageMechanics["range"],
): AreaMovementDistanceDamageProjection<MovementFeetType> {
  return range.kind === "point" &&
    typeof range.feet === "number" &&
    range.feet === AREA_MOVEMENT_DISTANCE_DAMAGE_RANGE_FEET &&
    spellMechanicsObjectHasOnlyKeys(range, RANGE_FIELDS)
    ? { tag: "parsed", fact: movementFeet(range.feet) }
    : {
        tag: "unsupported",
        issue: {
          failedFact: "range",
          mechanicsPath: spellMechanicsHeaderPath("range"),
        },
      };
}

function areaMovementDistanceDamageDurationProjection(
  duration: AreaMovementDistanceDamageMechanics["duration"],
): AreaMovementDistanceDamageProjection<ElapsedTimeTicks> {
  if (duration.kind !== "concentration")
    return {
      tag: "unsupported",
      issue: {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    };
  const value = duration.upTo;
  return value.unit === "minute" &&
    value.amount === AREA_MOVEMENT_DISTANCE_DAMAGE_DURATION_MINUTES &&
    isSpellCanonicalDurationValue(value) &&
    spellMechanicsObjectHasOnlyKeys(value, DURATION_VALUE_FIELDS)
    ? { tag: "parsed", fact: spellDurationTicksFromCanonicalValue(value) }
    : {
        tag: "unsupported",
        issue: {
          failedFact: "durationValue",
          mechanicsPath: spellDurationValuePath(),
        },
      };
}

function areaMovementDistanceDamageAttachmentProjection(
  attachment: AreaMovementDistanceDamageMechanics["attachment"],
): AreaMovementDistanceDamageProjection<MovementFeetType> {
  if (attachment.kind !== "hole")
    return areaMovementDistanceDamageUnsupportedAttachment();
  if (attachment.value.kind !== "area")
    return areaMovementDistanceDamageUnsupportedAttachment();
  const area = attachment.value;
  if (!areaMovementDistanceDamageAreaShapeIsSupported(attachment, area))
    return areaMovementDistanceDamageUnsupportedAttachment();
  return {
    tag: "parsed",
    fact: movementFeet(area.shape.radiusFeet),
  };
}

function areaMovementDistanceDamageAreaShapeIsSupported(
  attachment: Extract<
    AreaMovementDistanceDamageMechanics["attachment"],
    { readonly kind: "hole" }
  >,
  area: AreaMovementDistanceDamageArea,
): area is AreaMovementDistanceDamageSupportedArea {
  if (area.shape.kind !== "sphere") return false;
  return [
    spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS),
    spellMechanicsObjectHasOnlyKeys(area, AREA_FIELDS),
    area.origin.kind === "point_within_range",
    spellMechanicsObjectHasOnlyKeys(area.origin, ORIGIN_FIELDS),
    spellMechanicsObjectHasOnlyKeys(area.shape, SHAPE_FIELDS),
    typeof area.shape.radiusFeet === "number",
    area.shape.radiusFeet === AREA_MOVEMENT_DISTANCE_DAMAGE_RADIUS_FEET,
  ].every(Boolean);
}

function areaMovementDistanceDamageUnsupportedAttachment(): AreaMovementDistanceDamageProjection<never> {
  return {
    tag: "unsupported",
    issue: {
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    },
  };
}

function areaMovementDistanceDamageOperationShellIsSupported(
  operation: AreaMovementDistanceDamageOperation | undefined,
): boolean {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(operation, OPERATION_FIELDS)
  );
}

function areaMovementDistanceDamageDifficultTerrainOperationIsSupported(
  operation: AreaMovementDistanceDamageOperation | undefined,
): boolean {
  return (
    areaMovementDistanceDamageOperationShellIsSupported(operation) &&
    operation?.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(operation.trigger, PASSIVE_TRIGGER_FIELDS)
  );
}

function areaMovementDistanceDamageDifficultTerrainEffectIsSupported(
  operation: AreaMovementDistanceDamageOperation | undefined,
): boolean {
  return (
    operation?.effect.kind === "area_is_difficult_terrain" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      DIFFICULT_TERRAIN_EFFECT_FIELDS,
    )
  );
}

type MovementDamageEffectFacts = Pick<
  AreaMovementDistanceDamageMechanicsFacts,
  "damage"
>;
type AreaMovementDistanceDamageSupportedEffect = Extract<
  AreaMovementDistanceDamageOperation["effect"],
  { readonly kind: "damage" }
> & {
  readonly damageType: "piercing";
  readonly amount: Extract<
    Extract<
      AreaMovementDistanceDamageOperation["effect"],
      { readonly kind: "damage" }
    >["amount"],
    { readonly kind: "fixed" }
  >;
};

function areaMovementDistanceDamageMovementProjection(
  operation: AreaMovementDistanceDamageOperation | undefined,
  ordinal: PositiveInteger,
): AreaMovementDistanceDamageProjection<MovementFeetType> {
  if (
    !areaMovementDistanceDamageOperationShellIsSupported(operation) ||
    operation?.trigger.kind !== "on_creature_moves" ||
    operation.trigger.perFeet !== AREA_MOVEMENT_DISTANCE_DAMAGE_INTERVAL_FEET ||
    !spellMechanicsObjectHasOnlyKeys(operation.trigger, MOVEMENT_TRIGGER_FIELDS)
  )
    return {
      tag: "unsupported",
      issue: {
        failedFact: "movementDamageOperation",
        mechanicsPath: spellOngoingOperationPath(ordinal),
      },
    };
  return { tag: "parsed", fact: movementFeet(operation.trigger.perFeet) };
}

function areaMovementDistanceDamageEffectProjection(
  operation: AreaMovementDistanceDamageOperation | undefined,
  ordinal: PositiveInteger,
): AreaMovementDistanceDamageProjection<MovementDamageEffectFacts> {
  if (operation?.effect.kind !== "damage")
    return areaMovementDistanceDamageUnsupportedEffect(ordinal);
  if (!areaMovementDistanceDamageEffectIsSupported(operation.effect))
    return areaMovementDistanceDamageUnsupportedEffect(ordinal);
  return {
    tag: "parsed",
    fact: {
      damage: {
        expr: operation.effect.amount.expr,
        damageType: operation.effect.damageType,
      },
    },
  };
}

function areaMovementDistanceDamageEffectIsSupported(
  effect: Extract<
    AreaMovementDistanceDamageOperation["effect"],
    { readonly kind: "damage" }
  >,
): effect is AreaMovementDistanceDamageSupportedEffect {
  if (effect.amount.kind !== "fixed") return false;
  return [
    effect.damageType === "piercing",
    spellMechanicsObjectHasOnlyKeys(effect, DAMAGE_EFFECT_FIELDS),
    spellMechanicsObjectHasOnlyKeys(effect.amount, DAMAGE_AMOUNT_FIELDS),
    effect.amount.expr.dice === AREA_MOVEMENT_DISTANCE_DAMAGE_DICE,
    effect.amount.expr.dieSize === AREA_MOVEMENT_DISTANCE_DAMAGE_DIE_SIZE,
    effect.amount.expr.flat === undefined,
    spellMechanicsObjectHasOnlyKeys(effect.amount.expr, DICE_EXPR_FIELDS),
  ].every(Boolean);
}

function areaMovementDistanceDamageUnsupportedEffect(
  ordinal: PositiveInteger,
): AreaMovementDistanceDamageProjection<never> {
  return {
    tag: "unsupported",
    issue: {
      failedFact: "movementDamageEffect",
      mechanicsPath: spellOngoingOperationEffectPath(ordinal),
    },
  };
}

function areaMovementDistanceDamageEvidence(
  terrainOrdinal: PositiveInteger,
  damageOrdinal: PositiveInteger,
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
      spellDurationValuePath(),
      spellOngoingAttachmentPath(),
      spellOngoingOperationPath(terrainOrdinal),
      spellOngoingOperationEffectPath(terrainOrdinal),
      spellOngoingOperationPath(damageOrdinal),
      spellOngoingOperationEffectPath(damageOrdinal),
    ],
    unowned: [spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1))],
  };
}

type AreaMovementDistanceDamageInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        AreaMovementDistanceDamageIssueFact,
        ...AreaMovementDistanceDamageIssueFact[],
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: AreaMovementDistanceDamageMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type AreaMovementDistanceDamageOperationOccurrence =
  | {
      readonly tag: "found";
      readonly index: number;
      readonly operation: AreaMovementDistanceDamageOperation;
    }
  | { readonly tag: "missing"; readonly ordinal: PositiveInteger };

type AreaMovementDistanceDamageAdmissionProjection = {
  readonly range: AreaMovementDistanceDamageProjection<MovementFeetType>;
  readonly duration: AreaMovementDistanceDamageProjection<ElapsedTimeTicks>;
  readonly area: AreaMovementDistanceDamageProjection<MovementFeetType>;
  readonly movement: AreaMovementDistanceDamageProjection<MovementFeetType>;
  readonly movementDamage: AreaMovementDistanceDamageProjection<MovementDamageEffectFacts>;
  readonly terrain: AreaMovementDistanceDamageOperationOccurrence;
  readonly damage: AreaMovementDistanceDamageOperationOccurrence;
};

function areaMovementDistanceDamageOperationOccurrence(
  operations: AreaMovementDistanceDamageMechanics["operations"],
  matches: (
    operation: AreaMovementDistanceDamageOperation,
    index: number,
  ) => boolean,
  missingOrdinal: PositiveInteger,
): AreaMovementDistanceDamageOperationOccurrence {
  const found = Array.from(operations.entries()).find(([index, operation]) =>
    matches(operation, index),
  );
  return found === undefined
    ? { tag: "missing", ordinal: missingOrdinal }
    : {
        tag: "found",
        index: found[0],
        operation: found[1],
      };
}

function areaMovementDistanceDamageOccurrenceOrElse(
  occurrence: AreaMovementDistanceDamageOperationOccurrence,
  fallback: () => AreaMovementDistanceDamageOperationOccurrence,
): AreaMovementDistanceDamageOperationOccurrence {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, (found) => found),
    Match.when({ tag: "missing" }, fallback),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageOperationFromOccurrence(
  occurrence: AreaMovementDistanceDamageOperationOccurrence,
): AreaMovementDistanceDamageOperation | undefined {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, ({ operation }) => operation),
    Match.when({ tag: "missing" }, () => undefined),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageOccurrenceOrdinal(
  occurrence: AreaMovementDistanceDamageOperationOccurrence,
): PositiveInteger {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, ({ index }) => PositiveInteger(index + 1)),
    Match.when({ tag: "missing" }, ({ ordinal }) => ordinal),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageAdmissionProjection(
  mechanics: AreaMovementDistanceDamageMechanics,
): AreaMovementDistanceDamageAdmissionProjection {
  const terrainEffect = areaMovementDistanceDamageOperationOccurrence(
    mechanics.operations,
    ({ effect }) => effect.kind === "area_is_difficult_terrain",
    PositiveInteger(1),
  );
  const terrain = areaMovementDistanceDamageOccurrenceOrElse(
    terrainEffect,
    () =>
      areaMovementDistanceDamageOperationOccurrence(
        mechanics.operations,
        ({ trigger }) => trigger.kind === "passive",
        PositiveInteger(1),
      ),
  );
  const movementTrigger = areaMovementDistanceDamageOperationOccurrence(
    mechanics.operations,
    ({ trigger }) => trigger.kind === "on_creature_moves",
    PositiveInteger(2),
  );
  const damage = areaMovementDistanceDamageOccurrenceOrElse(
    movementTrigger,
    () =>
      areaMovementDistanceDamageOperationOccurrence(
        mechanics.operations,
        ({ effect }, index) =>
          !areaMovementDistanceDamageOccurrenceOwnsIndex(terrain, index) &&
          effect.kind === "damage",
        PositiveInteger(2),
      ),
  );
  const damageOperation =
    areaMovementDistanceDamageOperationFromOccurrence(damage);
  const damageOrdinal = areaMovementDistanceDamageOccurrenceOrdinal(damage);
  return {
    range: areaMovementDistanceDamageRangeProjection(mechanics.range),
    duration: areaMovementDistanceDamageDurationProjection(mechanics.duration),
    area: areaMovementDistanceDamageAttachmentProjection(mechanics.attachment),
    movement: areaMovementDistanceDamageMovementProjection(
      damageOperation,
      damageOrdinal,
    ),
    movementDamage: areaMovementDistanceDamageEffectProjection(
      damageOperation,
      damageOrdinal,
    ),
    terrain,
    damage,
  };
}

function areaMovementDistanceDamageOccurrenceOwnsIndex(
  occurrence: AreaMovementDistanceDamageOperationOccurrence,
  index: number,
): boolean {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, (found) => found.index === index),
    Match.when({ tag: "missing" }, () => false),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageDefinitionIssues(
  mechanics: AreaMovementDistanceDamageMechanics,
): readonly AreaMovementDistanceDamageIssueFact[] {
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "mechanics",
        spellMechanicsRootPath(),
      ),
    );
  if (mechanics.level !== AREA_MOVEMENT_DISTANCE_DAMAGE_LEVEL)
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "level",
        spellMechanicsHeaderPath("level"),
      ),
    );
  if (mechanics.school !== "transmutation")
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "school",
        spellMechanicsHeaderPath("school"),
      ),
    );
  if (!areaMovementDistanceDamageComponentsAreSupported(mechanics.components))
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "components",
        spellMechanicsHeaderPath("components"),
      ),
    );
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    issues.push(areaMovementDistanceDamageIssueFact("components", path));
  if (!areaMovementDistanceDamageCastingTimeIsSupported(mechanics.castingTime))
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  issues.push(...areaMovementDistanceDamageDurationIssues(mechanics.duration));
  return issues;
}

function areaMovementDistanceDamageIssueFact(
  failedFact: AreaMovementDistanceDamageFailedFact,
  mechanicsPath: UnitMechanicsPath,
): AreaMovementDistanceDamageIssueFact {
  return { failedFact, mechanicsPath };
}

function areaMovementDistanceDamageComponentsAreSupported(
  components: Components,
): boolean {
  return [
    components.v === true,
    components.s === true,
    components.m === AREA_MOVEMENT_DISTANCE_DAMAGE_MATERIAL,
    spellMechanicsObjectHasOnlyKeys<AreaMovementDistanceDamageComponentKeySpace>(
      components,
      COMPONENT_FIELDS,
    ),
  ].every(Boolean);
}

function areaMovementDistanceDamageCastingTimeIsSupported(
  castingTime: AreaMovementDistanceDamageMechanics["castingTime"],
): boolean {
  return [
    castingTime.kind === "action",
    spellMechanicsObjectHasOnlyKeys(castingTime, CASTING_TIME_FIELDS),
  ].every(Boolean);
}

function areaMovementDistanceDamageDurationIssues(
  duration: AreaMovementDistanceDamageMechanics["duration"],
): readonly AreaMovementDistanceDamageIssueFact[] {
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  if (duration.kind !== "concentration") {
    for (const path of spellDurationValueEvidencePaths(duration))
      issues.push(areaMovementDistanceDamageIssueFact("durationValue", path));
  } else if (!spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)) {
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
  }
  for (const child of spellDurationChildCoordinates(duration))
    issues.push(
      areaMovementDistanceDamageIssueFact(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      ),
    );
  return issues;
}

function areaMovementDistanceDamageConditionalMechanicsIssues(
  mechanics: AreaMovementDistanceDamageMechanics,
): readonly AreaMovementDistanceDamageIssueFact[] {
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  if (mechanics.initialPhase !== undefined)
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "initialPhase",
        spellOngoingInitialPhasePath(),
      ),
    );
  const authoredConditionalMechanics =
    mechanics.authoredConditionalMechanics ?? [];
  const recognitionIndex = authoredConditionalMechanics.findIndex(
    areaMovementDistanceDamageHasTableOwnedRecognition,
  );
  if (recognitionIndex !== 0)
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1)),
      ),
    );
  for (const [index] of authoredConditionalMechanics.entries()) {
    if (index === recognitionIndex && index === 0) continue;
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
      ),
    );
  }
  return issues;
}

function areaMovementDistanceDamageOperationIssues(
  mechanics: AreaMovementDistanceDamageMechanics,
  projection: AreaMovementDistanceDamageAdmissionProjection,
): readonly AreaMovementDistanceDamageIssueFact[] {
  return [
    ...areaMovementDistanceDamageOperationCountIssues(mechanics, projection),
    ...areaMovementDistanceDamageTerrainIssues(projection),
  ];
}

function areaMovementDistanceDamageOperationCountIssues(
  mechanics: AreaMovementDistanceDamageMechanics,
  projection: AreaMovementDistanceDamageAdmissionProjection,
): readonly AreaMovementDistanceDamageIssueFact[] {
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  for (const [index] of mechanics.operations.entries()) {
    if (
      areaMovementDistanceDamageOccurrenceOwnsIndex(
        projection.terrain,
        index,
      ) ||
      areaMovementDistanceDamageOccurrenceOwnsIndex(projection.damage, index)
    )
      continue;
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      ),
    );
  }
  for (const ordinal of [PositiveInteger(1), PositiveInteger(2)] as const) {
    if (mechanics.operations[Number(ordinal) - 1] !== undefined) continue;
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "operationCount",
        spellOngoingOperationPath(ordinal),
      ),
    );
  }
  return issues;
}

function areaMovementDistanceDamageTerrainIssues(
  projection: AreaMovementDistanceDamageAdmissionProjection,
): readonly AreaMovementDistanceDamageIssueFact[] {
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  if (
    !areaMovementDistanceDamageDifficultTerrainOperationIsSupported(
      areaMovementDistanceDamageOperationFromOccurrence(projection.terrain),
    )
  )
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "difficultTerrainOperation",
        spellOngoingOperationPath(
          areaMovementDistanceDamageOccurrenceOrdinal(projection.terrain),
        ),
      ),
    );
  if (
    !areaMovementDistanceDamageDifficultTerrainEffectIsSupported(
      areaMovementDistanceDamageOperationFromOccurrence(projection.terrain),
    )
  )
    issues.push(
      areaMovementDistanceDamageIssueFact(
        "difficultTerrainEffect",
        spellOngoingOperationEffectPath(
          areaMovementDistanceDamageOccurrenceOrdinal(projection.terrain),
        ),
      ),
    );
  return issues;
}

function areaMovementDistanceDamageProjectionIssues(
  projection: AreaMovementDistanceDamageAdmissionProjection,
): readonly AreaMovementDistanceDamageIssueFact[] {
  return [
    projection.range,
    projection.duration,
    projection.area,
    projection.movement,
    projection.movementDamage,
  ].flatMap((fact) => (fact.tag === "unsupported" ? [fact.issue] : []));
}

function areaMovementDistanceDamageInspectionFromProjection(
  source: SpellMechanicsAdmissionSource,
  projection: AreaMovementDistanceDamageAdmissionProjection,
  unsupportedIssues:
    | readonly [
        AreaMovementDistanceDamageIssueFact,
        ...AreaMovementDistanceDamageIssueFact[],
      ]
    | undefined,
): AreaMovementDistanceDamageInspection {
  if (projection.range.tag === "unsupported")
    return areaMovementDistanceDamageUnsupportedInspection(
      unsupportedIssues,
      projection.range.issue,
    );
  if (projection.duration.tag === "unsupported")
    return areaMovementDistanceDamageUnsupportedInspection(
      unsupportedIssues,
      projection.duration.issue,
    );
  if (projection.area.tag === "unsupported")
    return areaMovementDistanceDamageUnsupportedInspection(
      unsupportedIssues,
      projection.area.issue,
    );
  if (projection.movement.tag === "unsupported")
    return areaMovementDistanceDamageUnsupportedInspection(
      unsupportedIssues,
      projection.movement.issue,
    );
  if (projection.movementDamage.tag === "unsupported")
    return areaMovementDistanceDamageUnsupportedInspection(
      unsupportedIssues,
      projection.movementDamage.issue,
    );
  if (unsupportedIssues !== undefined)
    return { tag: "unsupported", issues: unsupportedIssues };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      durationTicks: projection.duration.fact,
      radiusFeet: projection.area.fact,
      rangeFeet: projection.range.fact,
      damage: projection.movementDamage.fact.damage,
      damagePerFeet: projection.movement.fact,
    },
    evidence: areaMovementDistanceDamageEvidence(
      areaMovementDistanceDamageOccurrenceOrdinal(projection.terrain),
      areaMovementDistanceDamageOccurrenceOrdinal(projection.damage),
    ),
  };
}

function areaMovementDistanceDamageUnsupportedInspection(
  issues:
    | readonly [
        AreaMovementDistanceDamageIssueFact,
        ...AreaMovementDistanceDamageIssueFact[],
      ]
    | undefined,
  fallback: AreaMovementDistanceDamageIssueFact,
): Extract<
  AreaMovementDistanceDamageInspection,
  { readonly tag: "unsupported" }
> {
  return { tag: "unsupported", issues: issues ?? [fallback] };
}

function inspectAreaMovementDistanceDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): AreaMovementDistanceDamageInspection {
  if (!areaMovementDistanceDamageRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const projection = areaMovementDistanceDamageAdmissionProjection(mechanics);
  const issues = [
    ...areaMovementDistanceDamageDefinitionIssues(mechanics),
    ...areaMovementDistanceDamageConditionalMechanicsIssues(mechanics),
    ...areaMovementDistanceDamageOperationIssues(mechanics, projection),
  ];
  const projectionIssues =
    areaMovementDistanceDamageProjectionIssues(projection);
  const unsupportedIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues([...issues, ...projectionIssues]),
  );
  return areaMovementDistanceDamageInspectionFromProjection(
    source,
    projection,
    unsupportedIssues,
  );
}

function admitAreaMovementDistanceDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "areaMovementDistanceDamage",
  AreaMovementDistanceDamageMechanicsFacts,
  AreaMovementDistanceDamageSpellInvocation,
  AreaMovementDistanceDamageAdmissionIssue
> {
  return Match.value(inspectAreaMovementDistanceDamageMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          areaMovementDistanceDamageIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "areaMovementDistanceDamage" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitAreaMovementDistanceDamage(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitAreaMovementDistanceDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: AreaMovementDistanceDamageMechanicsFacts,
): readonly AreaMovementDistanceDamageSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly AreaMovementDistanceDamageSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "areaMovementDistanceDamage",
              spell,
              targeting: {
                kind: "pointOriginSphere",
                radiusFeet: facts.radiusFeet,
              },
              durationTicks: facts.durationTicks,
              rangeFeet: facts.rangeFeet,
              damage: facts.damage,
              damagePerFeet: facts.damagePerFeet,
            },
          ],
  );
}

function resolveAreaMovementDistanceDamage(
  input: AreaMovementDistanceDamageResolveInput,
): BattleResolutionResult {
  return resolveAreaMovementDistanceDamageSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const AreaMovementDistanceDamageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("areaMovementDistanceDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
      damagePerFeet: MovementFeet,
    }),
  );

export const areaMovementDistanceDamageProfile = {
  procedure: "areaMovementDistanceDamage",
  executionSchema: AreaMovementDistanceDamageInvocationSchema,
  admitMechanics: admitAreaMovementDistanceDamageMechanics,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveAreaMovementDistanceDamage,
} satisfies SpellProcedureDeclaration<
  "areaMovementDistanceDamage",
  AreaMovementDistanceDamageSpellInvocation,
  AreaMovementDistanceDamageMechanicsFacts,
  AreaMovementDistanceDamageAdmissionIssue
>;
