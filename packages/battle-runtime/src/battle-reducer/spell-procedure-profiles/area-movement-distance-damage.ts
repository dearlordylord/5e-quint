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
    Match.when({ kind: "camouflaged_area_recognition" }, (recognition) =>
      Boolean(
        recognition.camouflage === "looks_natural" &&
        recognition.eligibility.kind === "unable_to_see_area_when_spell_cast" &&
        recognition.attempt.action === "search" &&
        recognition.attempt.check.ability === "wis" &&
        recognition.attempt.check.skillOptions.length === 2 &&
        recognition.attempt.check.skillOptions.includes("perception") &&
        recognition.attempt.check.skillOptions.includes("survival") &&
        recognition.attempt.check.dc.kind === "caster_spell_save_dc" &&
        recognition.attempt.check.onSuccess.kind ===
          "recognize_hazardous_terrain" &&
        recognition.attempt.check.onSuccess.timing === "before_entering_area" &&
        spellMechanicsObjectHasOnlyKeys(recognition, RECOGNITION_FIELDS) &&
        spellMechanicsObjectHasOnlyKeys(
          recognition.eligibility,
          RECOGNITION_ELIGIBILITY_FIELDS,
        ) &&
        spellMechanicsObjectHasOnlyKeys(
          recognition.attempt,
          RECOGNITION_ATTEMPT_FIELDS,
        ) &&
        spellMechanicsObjectHasOnlyKeys(
          recognition.attempt.check,
          RECOGNITION_CHECK_FIELDS,
        ) &&
        spellMechanicsObjectHasOnlyKeys(
          recognition.attempt.check.dc,
          RECOGNITION_DC_FIELDS,
        ) &&
        spellMechanicsObjectHasOnlyKeys(
          recognition.attempt.check.onSuccess,
          RECOGNITION_SUCCESS_FIELDS,
        ),
      ),
    ),
    Match.exhaustive,
  );
}

function areaMovementDistanceDamageRepresentation(
  mechanics: SpellMechanics,
): mechanics is AreaMovementDistanceDamageMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const area =
        ongoing.attachment.kind === "hole" &&
        ongoing.attachment.value.kind === "area"
          ? ongoing.attachment.value
          : undefined;
      return spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              ongoing.level === AREA_MOVEMENT_DISTANCE_DAMAGE_LEVEL &&
              ongoing.school === "transmutation" &&
              ongoing.castingTime.kind === "action",
          },
          {
            name: "rangeAndComponents",
            present:
              ongoing.range.kind === "point" &&
              ongoing.range.feet === AREA_MOVEMENT_DISTANCE_DAMAGE_RANGE_FEET &&
              ongoing.components.v === true &&
              ongoing.components.s === true &&
              ongoing.components.m === AREA_MOVEMENT_DISTANCE_DAMAGE_MATERIAL,
          },
          {
            name: "duration",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.unit === "minute" &&
              ongoing.duration.upTo.amount ===
                AREA_MOVEMENT_DISTANCE_DAMAGE_DURATION_MINUTES,
          },
          {
            name: "area",
            present:
              area?.origin.kind === "point_within_range" &&
              area.shape.kind === "sphere" &&
              area.shape.radiusFeet ===
                AREA_MOVEMENT_DISTANCE_DAMAGE_RADIUS_FEET,
          },
          {
            name: "operations",
            present:
              ongoing.operations.some(
                ({ effect }) => effect.kind === "area_is_difficult_terrain",
              ) &&
              ongoing.operations.some(
                ({ trigger, effect }) =>
                  trigger.kind === "on_creature_moves" &&
                  effect.kind === "damage",
              ),
          },
        ],
      });
    }),
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
  if (
    attachment.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS) ||
    attachment.value.kind !== "area" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value, AREA_FIELDS) ||
    attachment.value.origin.kind !== "point_within_range" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.origin, ORIGIN_FIELDS) ||
    attachment.value.shape.kind !== "sphere" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.shape, SHAPE_FIELDS) ||
    typeof attachment.value.shape.radiusFeet !== "number" ||
    attachment.value.shape.radiusFeet !==
      AREA_MOVEMENT_DISTANCE_DAMAGE_RADIUS_FEET
  )
    return {
      tag: "unsupported",
      issue: {
        failedFact: "attachment",
        mechanicsPath: spellOngoingAttachmentPath(),
      },
    };
  return {
    tag: "parsed",
    fact: movementFeet(attachment.value.shape.radiusFeet),
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
  if (
    operation?.effect.kind !== "damage" ||
    operation.effect.damageType !== "piercing" ||
    !spellMechanicsObjectHasOnlyKeys(operation.effect, DAMAGE_EFFECT_FIELDS) ||
    operation.effect.amount.kind !== "fixed" ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.effect.amount,
      DAMAGE_AMOUNT_FIELDS,
    ) ||
    operation.effect.amount.expr.dice !== AREA_MOVEMENT_DISTANCE_DAMAGE_DICE ||
    operation.effect.amount.expr.dieSize !==
      AREA_MOVEMENT_DISTANCE_DAMAGE_DIE_SIZE ||
    operation.effect.amount.expr.flat !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.effect.amount.expr,
      DICE_EXPR_FIELDS,
    )
  )
    return {
      tag: "unsupported",
      issue: {
        failedFact: "movementDamageEffect",
        mechanicsPath: spellOngoingOperationEffectPath(ordinal),
      },
    };
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

function areaMovementDistanceDamageOperationOrdinals(input: {
  readonly terrainIndex: number;
  readonly damageIndex: number;
}): readonly [PositiveInteger, PositiveInteger] {
  return [
    PositiveInteger(input.terrainIndex >= 0 ? input.terrainIndex + 1 : 1),
    PositiveInteger(input.damageIndex >= 0 ? input.damageIndex + 1 : 2),
  ];
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

function inspectAreaMovementDistanceDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): AreaMovementDistanceDamageInspection {
  if (!areaMovementDistanceDamageRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: AreaMovementDistanceDamageIssueFact[] = [];
  const push = (
    failedFact: AreaMovementDistanceDamageFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== AREA_MOVEMENT_DISTANCE_DAMAGE_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "transmutation")
    push("school", spellMechanicsHeaderPath("school"));
  const range = areaMovementDistanceDamageRangeProjection(mechanics.range);
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== AREA_MOVEMENT_DISTANCE_DAMAGE_MATERIAL ||
    !spellMechanicsObjectHasOnlyKeys<AreaMovementDistanceDamageComponentKeySpace>(
      mechanics.components,
      COMPONENT_FIELDS,
    )
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const duration = areaMovementDistanceDamageDurationProjection(
    mechanics.duration,
  );
  if (mechanics.duration.kind !== "concentration") {
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      push("durationValue", path);
  } else if (
    !spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS)
  ) {
    push("duration", spellMechanicsHeaderPath("duration"));
  }
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));

  const area = areaMovementDistanceDamageAttachmentProjection(
    mechanics.attachment,
  );
  if (mechanics.initialPhase !== undefined)
    push("initialPhase", spellOngoingInitialPhasePath());
  const authoredConditionalMechanics =
    mechanics.authoredConditionalMechanics ?? [];
  const recognitionIndex = authoredConditionalMechanics.findIndex(
    areaMovementDistanceDamageHasTableOwnedRecognition,
  );
  if (recognitionIndex !== 0)
    push(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(1)),
    );
  for (const [index] of authoredConditionalMechanics.entries())
    if (index !== recognitionIndex || index !== 0)
      push(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
      );

  const terrainEffectIndex = mechanics.operations.findIndex(
    ({ effect }) => effect.kind === "area_is_difficult_terrain",
  );
  const terrainIndex =
    terrainEffectIndex >= 0
      ? terrainEffectIndex
      : mechanics.operations.findIndex(
          ({ trigger }) => trigger.kind === "passive",
        );
  const movementTriggerIndex = mechanics.operations.findIndex(
    ({ trigger }) => trigger.kind === "on_creature_moves",
  );
  const damageIndex =
    movementTriggerIndex >= 0
      ? movementTriggerIndex
      : mechanics.operations.findIndex(
          ({ effect }, index) =>
            index !== terrainIndex && effect.kind === "damage",
        );
  const [terrainOrdinal, damageOrdinal] =
    areaMovementDistanceDamageOperationOrdinals({
      terrainIndex,
      damageIndex,
    });
  const terrainOperation =
    terrainIndex >= 0 ? mechanics.operations[terrainIndex] : undefined;
  const damageOperation =
    damageIndex >= 0 ? mechanics.operations[damageIndex] : undefined;
  for (const [index] of mechanics.operations.entries())
    if (index !== terrainIndex && index !== damageIndex)
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  for (const ordinal of [PositiveInteger(1), PositiveInteger(2)] as const)
    if (mechanics.operations[Number(ordinal) - 1] === undefined)
      push("operationCount", spellOngoingOperationPath(ordinal));
  if (
    !areaMovementDistanceDamageDifficultTerrainOperationIsSupported(
      terrainOperation,
    )
  )
    push(
      "difficultTerrainOperation",
      spellOngoingOperationPath(terrainOrdinal),
    );
  if (
    !areaMovementDistanceDamageDifficultTerrainEffectIsSupported(
      terrainOperation,
    )
  )
    push(
      "difficultTerrainEffect",
      spellOngoingOperationEffectPath(terrainOrdinal),
    );
  const movement = areaMovementDistanceDamageMovementProjection(
    damageOperation,
    damageOrdinal,
  );
  const movementDamage = areaMovementDistanceDamageEffectProjection(
    damageOperation,
    damageOrdinal,
  );

  const projections = [
    range,
    duration,
    area,
    movement,
    movementDamage,
  ] as const;
  const projectionIssues = projections.flatMap((projection) =>
    projection.tag === "unsupported" ? [projection.issue] : [],
  );
  const unsupportedIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues([...issues, ...projectionIssues]),
  );
  if (range.tag === "unsupported")
    return { tag: "unsupported", issues: unsupportedIssues ?? [range.issue] };
  if (duration.tag === "unsupported")
    return {
      tag: "unsupported",
      issues: unsupportedIssues ?? [duration.issue],
    };
  if (area.tag === "unsupported")
    return { tag: "unsupported", issues: unsupportedIssues ?? [area.issue] };
  if (movement.tag === "unsupported")
    return {
      tag: "unsupported",
      issues: unsupportedIssues ?? [movement.issue],
    };
  if (movementDamage.tag === "unsupported")
    return {
      tag: "unsupported",
      issues: unsupportedIssues ?? [movementDamage.issue],
    };
  if (unsupportedIssues !== undefined)
    return { tag: "unsupported", issues: unsupportedIssues };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      durationTicks: duration.fact,
      radiusFeet: area.fact,
      rangeFeet: range.fact,
      damage: movementDamage.fact.damage,
      damagePerFeet: movement.fact,
    },
    evidence: areaMovementDistanceDamageEvidence(terrainOrdinal, damageOrdinal),
  };
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
