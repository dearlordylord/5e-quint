import { spellInvocationResourceForCastOption } from "./profile.ts";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// TranslatingPersistentArea-shaped hazard: action-time Spell Slot casting creates a
// caster-owned Concentration Sphere. The runtime owns Spell Slot spending,
// Concentration duration, caller-supplied Sphere identity, Heavily Obscured
// projection, Constitution Saving Throw-gated Poison damage, once-per-turn save
// ledger, and strong-wind cleanup. The table owns spatial membership, cloud
// movement geometry away from the caster, and wind predicate facts.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Cloudkill":
//     Action; 120 feet; Concentration up to 10 minutes; 20-foot-radius Sphere;
//     Heavily Obscured; Constitution save for 5d8 Poison damage or half when
//     the cloud appears, moves into a creature's space, a creature enters it,
//     or a creature ends its turn there; once per turn; strong wind disperses;
//     +1d8 per slot level above 5; the Sphere moves 10 feet away from the
//     caster at the start of each of the caster's turns.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Area of Effect/Sphere, Obscurement, Saving Throw, Damage Type.

import {
  PositiveInteger,
  movementFeet,
  type MovementFeet as MovementFeetType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  spellDurationEndingPath,
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
  type BattleExecutableSpellInvocation,
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
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveTranslatingPersistentAreaAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import { invalidResult } from "../result-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
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
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
} from "./spell-mechanics-admission.ts";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

type TranslatingPersistentAreaAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
  }
>;
type TranslatingPersistentAreaAreaHazardResolveInput = Omit<
  SpellProcedureProfileResolveInput<TranslatingPersistentAreaAreaHazardSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
    }
  >;
};
type TranslatingPersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type TranslatingPersistentAreaSaveGate = Extract<
  NonNullable<TranslatingPersistentAreaMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type TranslatingPersistentAreaProfileShape = {
  readonly radiusFeet: MovementFeetType;
  readonly translationDistanceFeet: MovementFeetType;
  readonly damageAmount: Extract<
    TranslatingPersistentAreaSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"];
};
type OngoingTranslatingPersistentAreaFacts = NonNullable<
  ReturnType<typeof ongoingAreaSpellFacts>
>;
type TranslatingPersistentAreaMechanicsFacts = SpellProcedureMechanicsFacts &
  TranslatingPersistentAreaProfileShape;
type TranslatingPersistentAreaAdmissionIssue = Extract<
  SpellProcedureMechanicsInspection<
    "persistentAreaSaveDamage",
    TranslatingPersistentAreaMechanicsFacts,
    TranslatingPersistentAreaAreaHazardSpellInvocation
  >,
  { readonly tag: "unsupported" }
>["issues"][number];

export const TRANSLATING_PERSISTENT_AREA_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialSaveDamage",
  "passiveOperation",
  "moveOperation",
  "movedAreaOperation",
  "enterOperation",
  "endTurnOperation",
  "operationCount",
  "oncePerTurnLimitGroup",
] as const;
type TranslatingPersistentAreaFailedFact =
  (typeof TRANSLATING_PERSISTENT_AREA_FAILED_FACTS)[number];

const TRANSLATING_PERSISTENT_AREA_BASE_CONSUMED_PATHS = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
  spellDurationValuePath(),
  spellDurationEndingPath(PositiveInteger(1)),
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

const TRANSLATING_PERSISTENT_AREA_UNOWNED_PATHS = [] as const;

const TRANSLATING_PERSISTENT_AREA_LEVEL = 5;
const TRANSLATING_PERSISTENT_AREA_RANGE_FEET = 120;
const TRANSLATING_PERSISTENT_AREA_DURATION_MINUTES = 10;
const TRANSLATING_PERSISTENT_AREA_RADIUS_FEET = 20;
const TRANSLATING_PERSISTENT_AREA_OPERATION_COUNT = 5;
const TRANSLATING_PERSISTENT_AREA_BASE_DAMAGE_DICE = 5;
const TRANSLATING_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 8;
const TRANSLATING_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function translatingPersistentAreaOperations(
  mechanics: TranslatingPersistentAreaMechanics,
): TranslatingPersistentAreaOperations {
  const occurrences = mechanics.operations.map(
    (operation, index): TranslatingPersistentAreaOperationOccurrence => ({
      operation,
      ordinal: PositiveInteger(index + 1),
    }),
  );
  const selected = new Set<PositiveInteger>();
  const select = (
    role: Exclude<TranslatingPersistentAreaOperationRole, null>,
    effect: (
      operation: TranslatingPersistentAreaMechanics["operations"][number],
    ) => boolean,
  ): TranslatingPersistentAreaOperationOccurrence | undefined => {
    const expected = occurrences.find(
      (occurrence) =>
        !selected.has(occurrence.ordinal) &&
        translatingPersistentAreaOperationRole(occurrence.operation.trigger) ===
          role &&
        effect(occurrence.operation),
    );
    const occurrence =
      expected ??
      occurrences.find(
        (candidate) =>
          !selected.has(candidate.ordinal) &&
          translatingPersistentAreaOperationRole(
            candidate.operation.trigger,
          ) === role,
      );
    if (occurrence !== undefined) selected.add(occurrence.ordinal);
    return occurrence;
  };
  const passive = select(
    "passive",
    (operation) => operation.effect.kind === "area_is_heavily_obscured",
  );
  const move = select(
    "move",
    (operation) =>
      operation.effect.kind === "move_area" &&
      operation.effect.direction === "away_from_caster",
  );
  const movedArea = select(
    "movedArea",
    (operation) =>
      translatingPersistentAreaSaveGateDamageAmount(operation.effect) !== null,
  );
  const enter = select(
    "enter",
    (operation) =>
      translatingPersistentAreaSaveGateDamageAmount(operation.effect) !== null,
  );
  const endTurn = select(
    "endTurn",
    (operation) =>
      translatingPersistentAreaSaveGateDamageAmount(operation.effect) !== null,
  );
  return {
    passive,
    move,
    movedArea,
    enter,
    endTurn,
    extraOperations: occurrences.filter(
      (occurrence) => !selected.has(occurrence.ordinal),
    ),
  };
}

type TranslatingPersistentAreaOperationRole =
  | "passive"
  | "move"
  | "movedArea"
  | "enter"
  | "endTurn"
  | null;

type TranslatingPersistentAreaOperationOccurrence = {
  readonly operation: TranslatingPersistentAreaMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};

type TranslatingPersistentAreaOperations = {
  readonly passive: TranslatingPersistentAreaOperationOccurrence | undefined;
  readonly move: TranslatingPersistentAreaOperationOccurrence | undefined;
  readonly movedArea: TranslatingPersistentAreaOperationOccurrence | undefined;
  readonly enter: TranslatingPersistentAreaOperationOccurrence | undefined;
  readonly endTurn: TranslatingPersistentAreaOperationOccurrence | undefined;
  readonly extraOperations: readonly TranslatingPersistentAreaOperationOccurrence[];
};

function translatingPersistentAreaOperationRole(
  trigger: OngoingTrigger,
): TranslatingPersistentAreaOperationRole {
  return Match.value(trigger.kind).pipe(
    Match.when("passive", () => "passive" as const),
    Match.when("on_caster_turn_start", () => "move" as const),
    Match.when("on_area_moves_into_creature_space", () => "movedArea" as const),
    Match.when("on_creature_enters_area", () => "enter" as const),
    Match.when("on_creature_ends_turn_in_area", () => "endTurn" as const),
    Match.whenOr(
      "on_effect_starts",
      "on_caster_attack_hit",
      "on_caster_deals_damage_to_attachment",
      "on_attached_hit_by_attack_roll",
      "on_attached_turn_start",
      "on_attached_turn_end",
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
      "on_caster_spends_action",
      "on_attached_spends_action",
      "on_affected_creature_spends_action",
      "on_creature_studies",
      () => null,
    ),
    Match.exhaustive,
  );
}

function translatingPersistentAreaDurationUnsupportedPaths(
  duration: OngoingTranslatingPersistentAreaFacts["mechanics"]["duration"],
): readonly SpellMechanicsBranchPath[] {
  if (duration.kind === "concentration") {
    const earlyEnd = duration.earlyEnd ?? [];
    const paths: SpellMechanicsBranchPath[] = [];
    const firstEarlyEnd = earlyEnd[0];
    if (
      firstEarlyEnd === undefined ||
      firstEarlyEnd.kind !== "area_dispersed_by_strong_wind"
    ) {
      paths.push(spellDurationEndingPath(PositiveInteger(1)));
    }
    for (const [index] of earlyEnd.slice(1).entries()) {
      paths.push(spellDurationEndingPath(PositiveInteger(index + 2)));
    }
    if (duration.permanentIfMaintainedFull === true && earlyEnd.length > 0) {
      paths.push(spellDurationEndingPath(PositiveInteger(earlyEnd.length + 1)));
    }
    return paths;
  }
  return persistentAreaDurationChildPaths(duration);
}

function translatingPersistentAreaRadiusFeet(
  area: OngoingTranslatingPersistentAreaFacts["mechanics"]["attachment"]["value"],
): MovementFeetType | null {
  return area.origin.kind === "point_within_range" &&
    area.shape.kind === "sphere" &&
    area.shape.radiusFeet === TRANSLATING_PERSISTENT_AREA_RADIUS_FEET
    ? movementFeet(area.shape.radiusFeet)
    : null;
}

function translatingPersistentAreaTranslationDistanceFeet(
  operation: TranslatingPersistentAreaOperations["move"],
): MovementFeetType | null {
  return operation?.operation.effect.kind === "move_area" &&
    operation.operation.effect.direction === "away_from_caster"
    ? movementFeet(operation.operation.effect.distanceFeet)
    : null;
}

function translatingPersistentAreaPassiveOperationIsSupported(
  operation: TranslatingPersistentAreaOperations["passive"],
): boolean {
  return operation?.operation.effect.kind === "area_is_heavily_obscured";
}

type TranslatingPersistentAreaDamageAmounts = {
  readonly initial:
    | TranslatingPersistentAreaProfileShape["damageAmount"]
    | null;
  readonly movedArea:
    | TranslatingPersistentAreaProfileShape["damageAmount"]
    | null;
  readonly enter: TranslatingPersistentAreaProfileShape["damageAmount"] | null;
  readonly endTurn:
    | TranslatingPersistentAreaProfileShape["damageAmount"]
    | null;
};

function translatingPersistentAreaDamageAmounts(
  mechanics: TranslatingPersistentAreaMechanics,
  operations: TranslatingPersistentAreaOperations,
): TranslatingPersistentAreaDamageAmounts {
  return {
    initial: translatingPersistentAreaSaveGateDamageAmount(
      mechanics.initialPhase,
    ),
    movedArea: translatingPersistentAreaSaveGateDamageAmount(
      operations.movedArea?.operation.effect,
    ),
    enter: translatingPersistentAreaSaveGateDamageAmount(
      operations.enter?.operation.effect,
    ),
    endTurn: translatingPersistentAreaSaveGateDamageAmount(
      operations.endTurn?.operation.effect,
    ),
  };
}

function translatingPersistentAreaSaveLimitIsSupported(
  mechanics: TranslatingPersistentAreaMechanics,
  operations: TranslatingPersistentAreaOperations,
): boolean {
  const initialUsageLimit =
    mechanics.initialPhase?.kind === "save_gate"
      ? mechanics.initialPhase.usageLimit
      : undefined;
  const saveLimitGroup = sharedOncePerTurnLimitGroup([
    initialUsageLimit,
    operations.movedArea?.operation.usageLimit,
    operations.enter?.operation.usageLimit,
    operations.endTurn?.operation.usageLimit,
  ]);
  return saveLimitGroup !== null && saveLimitGroup.length > 0;
}

function translatingPersistentAreaOperationPath(
  occurrence: TranslatingPersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(occurrence?.ordinal ?? fallbackOrdinal);
}

function translatingPersistentAreaOperationEffectPath(
  occurrence: TranslatingPersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(
    occurrence?.ordinal ?? fallbackOrdinal,
  );
}

type TranslatingPersistentAreaFailure = {
  readonly failedFact: TranslatingPersistentAreaFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type TranslatingPersistentAreaProjection =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<TranslatingPersistentAreaFailure>;
    }
  | {
      readonly tag: "supported";
      readonly profileShape: TranslatingPersistentAreaProfileShape;
    };

function translatingPersistentAreaUsageLimitFailures(input: {
  readonly initialPhase: TranslatingPersistentAreaMechanics["initialPhase"];
  readonly operations: TranslatingPersistentAreaOperations;
}): readonly TranslatingPersistentAreaFailure[] {
  const entries = [
    {
      limit:
        input.initialPhase?.kind === "save_gate"
          ? input.initialPhase.usageLimit
          : undefined,
      mechanicsPath: spellOngoingInitialPhasePath(),
    },
    {
      limit: input.operations.movedArea?.operation.usageLimit,
      mechanicsPath: translatingPersistentAreaOperationPath(
        input.operations.movedArea,
        PositiveInteger(3),
      ),
    },
    {
      limit: input.operations.enter?.operation.usageLimit,
      mechanicsPath: translatingPersistentAreaOperationPath(
        input.operations.enter,
        PositiveInteger(4),
      ),
    },
    {
      limit: input.operations.endTurn?.operation.usageLimit,
      mechanicsPath: translatingPersistentAreaOperationPath(
        input.operations.endTurn,
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

function translatingPersistentAreaProjection(
  ongoing: OngoingTranslatingPersistentAreaFacts,
): TranslatingPersistentAreaProjection {
  const { mechanics, durationTicks } = ongoing;
  const area = mechanics.attachment.value;
  const operations = translatingPersistentAreaOperations(mechanics);
  const radiusFeet = translatingPersistentAreaRadiusFeet(area);
  const translationDistanceFeet =
    translatingPersistentAreaTranslationDistanceFeet(operations.move);
  const damageAmounts = translatingPersistentAreaDamageAmounts(
    mechanics,
    operations,
  );
  const saveLimitSupported = translatingPersistentAreaSaveLimitIsSupported(
    mechanics,
    operations,
  );
  const damageFacts =
    damageAmounts.initial !== null &&
    damageAmounts.movedArea !== null &&
    damageAmounts.enter !== null &&
    damageAmounts.endTurn !== null &&
    saveLimitSupported
      ? { damageAmount: damageAmounts.initial }
      : null;
  const failures: TranslatingPersistentAreaFailure[] = [];
  if (mechanics.level !== TRANSLATING_PERSISTENT_AREA_LEVEL) {
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
    mechanics.range.feet !== TRANSLATING_PERSISTENT_AREA_RANGE_FEET
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
      TRANSLATING_PERSISTENT_AREA_DURATION_MINUTES
  ) {
    failures.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failures.push(
    ...translatingPersistentAreaDurationUnsupportedPaths(
      mechanics.duration,
    ).map((mechanicsPath) => ({
      failedFact: "duration" as const,
      mechanicsPath,
    })),
  );
  if (durationTicks === undefined || Result.isFailure(durationTicks)) {
    failures.push({
      failedFact: "durationTicks",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  if (radiusFeet === null) {
    failures.push({
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    });
  }
  if (damageAmounts.initial === null) {
    failures.push({
      failedFact: "initialSaveDamage",
      mechanicsPath: spellOngoingInitialPhasePath(),
    });
  }
  if (
    !translatingPersistentAreaPassiveOperationIsSupported(operations.passive)
  ) {
    failures.push({
      failedFact: "passiveOperation",
      mechanicsPath: translatingPersistentAreaOperationEffectPath(
        operations.passive,
        PositiveInteger(1),
      ),
    });
  }
  if (translationDistanceFeet === null) {
    failures.push({
      failedFact: "moveOperation",
      mechanicsPath: translatingPersistentAreaOperationEffectPath(
        operations.move,
        PositiveInteger(2),
      ),
    });
  }
  if (damageAmounts.movedArea === null) {
    failures.push({
      failedFact: "movedAreaOperation",
      mechanicsPath: translatingPersistentAreaOperationEffectPath(
        operations.movedArea,
        PositiveInteger(3),
      ),
    });
  }
  if (damageAmounts.enter === null) {
    failures.push({
      failedFact: "enterOperation",
      mechanicsPath: translatingPersistentAreaOperationEffectPath(
        operations.enter,
        PositiveInteger(4),
      ),
    });
  }
  if (damageAmounts.endTurn === null) {
    failures.push({
      failedFact: "endTurnOperation",
      mechanicsPath: translatingPersistentAreaOperationEffectPath(
        operations.endTurn,
        PositiveInteger(5),
      ),
    });
  }
  if (
    mechanics.operations.length !==
      TRANSLATING_PERSISTENT_AREA_OPERATION_COUNT &&
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
      mechanicsPath: translatingPersistentAreaOperationPath(
        occurrence,
        occurrence.ordinal,
      ),
    })),
  );
  failures.push(
    ...translatingPersistentAreaUsageLimitFailures({
      initialPhase: mechanics.initialPhase,
      operations,
    }),
  );
  const unsupportedFailures = spellProcedureNonEmpty(failures);
  if (unsupportedFailures !== undefined) {
    return { tag: "unsupported", failures: unsupportedFailures };
  }
  if (
    durationTicks === undefined ||
    Result.isFailure(durationTicks) ||
    radiusFeet === null ||
    translationDistanceFeet === null ||
    damageFacts === null
  ) {
    return {
      tag: "unsupported",
      failures: [
        durationTicks === undefined || Result.isFailure(durationTicks)
          ? {
              failedFact: "durationTicks",
              mechanicsPath: spellDurationValuePath(),
            }
          : radiusFeet === null
            ? {
                failedFact: "attachment",
                mechanicsPath: spellOngoingAttachmentPath(),
              }
            : translationDistanceFeet === null
              ? {
                  failedFact: "moveOperation",
                  mechanicsPath: translatingPersistentAreaOperationEffectPath(
                    operations.move,
                    PositiveInteger(2),
                  ),
                }
              : {
                  failedFact: "initialSaveDamage",
                  mechanicsPath: spellOngoingInitialPhasePath(),
                },
      ],
    };
  }
  return {
    tag: "supported",
    profileShape: {
      radiusFeet,
      translationDistanceFeet,
      damageAmount: damageFacts.damageAmount,
    },
  };
}

function translatingPersistentAreaAdmissionIssue(
  failure: TranslatingPersistentAreaFailure,
): TranslatingPersistentAreaAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveDamage",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported translating persistent-area mechanics fact: ${failure.failedFact}.`,
  };
}

function isTranslatingPersistentAreaRepresentation(
  mechanics: SpellMechanics,
): mechanics is TranslatingPersistentAreaMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  if (
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "area" ||
    mechanics.attachment.value.shape.kind !== "sphere"
  ) {
    return false;
  }
  return mechanics.operations.some(
    ({ effect }) =>
      effect.kind === "move_area" && effect.direction === "away_from_caster",
  );
}

function admitTranslatingPersistentAreaAreaHazard(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: TranslatingPersistentAreaMechanicsFacts,
): readonly TranslatingPersistentAreaAreaHazardSpellInvocation[] {
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
    (slot): readonly TranslatingPersistentAreaAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < TRANSLATING_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: TRANSLATING_PERSISTENT_AREA_LEVEL,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveDamage",
          lifecycle: {
            kind: "sourceTurnTranslation",
            distanceFeet: facts.translationDistanceFeet,
            direction: "awayFromSource",
            movedAreaOperation: "saveDamage",
            environmentalEnd: "strongWind",
          },
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: facts.radiusFeet,
          },
          durationTicks: durationTicks.success,
          rangeFeet,
          damage: { expr: damageExpr, damageType: "poison" },
        },
      ];
    },
  );
}

function translatingPersistentAreaMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveDamage",
  TranslatingPersistentAreaMechanicsFacts,
  TranslatingPersistentAreaAreaHazardSpellInvocation
> {
  if (!isTranslatingPersistentAreaRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) {
    return { tag: "notRepresented" };
  }
  const projection = translatingPersistentAreaProjection(ongoing);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        projection.failures,
        translatingPersistentAreaAdmissionIssue,
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection.profileShape,
  } satisfies TranslatingPersistentAreaMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveDamage",
      facts,
      evidence: {
        consumed: [
          ...TRANSLATING_PERSISTENT_AREA_BASE_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: TRANSLATING_PERSISTENT_AREA_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitTranslatingPersistentAreaAreaHazard(executionSource, ctx, facts),
    },
  };
}

function translatingPersistentAreaSaveGateDamageAmount(
  effect:
    | TranslatingPersistentAreaMechanics["initialPhase"]
    | TranslatingPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
): TranslatingPersistentAreaProfileShape["damageAmount"] | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "poison" &&
    effect.onFail.amount.kind === "linear_per_level" &&
    effect.onFail.amount.axis === "slot" &&
    effect.onFail.amount.startingAtLevel ===
      TRANSLATING_PERSISTENT_AREA_LEVEL &&
    effect.onFail.amount.base.dice ===
      TRANSLATING_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    effect.onFail.amount.base.dieSize ===
      TRANSLATING_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    effect.onFail.amount.perLevel?.dice ===
      TRANSLATING_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function resolveNarrowedTranslatingPersistentAreaAreaHazard(
  input: TranslatingPersistentAreaAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveTranslatingPersistentAreaAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveTranslatingPersistentAreaAreaHazard(
  input: SpellProcedureProfileResolveInput<TranslatingPersistentAreaAreaHazardSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when({ lifecycle: { kind: "sourceTurnTranslation" } }, (invocation) =>
      resolveNarrowedTranslatingPersistentAreaAreaHazard({
        ...input,
        invocation,
      }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the translating persistent-area profile.",
      ),
    ),
  );
}

const TranslatingPersistentAreaAreaHazardInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveDamage"),
      lifecycle: Schema.Struct({
        kind: Schema.Literal("sourceTurnTranslation"),
        distanceFeet: MovementFeet,
        direction: Schema.Literal("awayFromSource"),
        movedAreaOperation: Schema.Literal("saveDamage"),
        environmentalEnd: Schema.Literal("strongWind"),
      }),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("con"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("poison"),
      }),
    }),
  );

export const sourceTurnTranslationPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: TranslatingPersistentAreaAreaHazardInvocationSchema,
  admitMechanics: translatingPersistentAreaMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveTranslatingPersistentAreaAreaHazard,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  TranslatingPersistentAreaAreaHazardSpellInvocation
>;
