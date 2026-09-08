import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  ongoingAreaSpellDurationTicks,
  ongoingAreaSpellFacts,
} from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
//
// Insect Plague: action-time Spell Slot casting creates a caster-owned
// Concentration Sphere. The runtime owns Spell Slot spending, Concentration
// duration, caller-supplied Sphere identity, Lightly Obscured and Difficult
// Terrain projections, Constitution Saving Throw-gated Piercing damage, and a
// once-per-turn save ledger. The table owns spatial membership and geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Insect Plague":
//     Action; 300 feet; Concentration up to 10 minutes; 20-foot-radius Sphere;
//     Lightly Obscured; Difficult Terrain; Constitution save for 4d10 Piercing
//     damage or half when the swarm appears, first entry on a turn, or end turn
//     in the area; once per turn; +1d10 per slot level above 5.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Area of Effect/Sphere, Difficult Terrain, Lightly Obscured, Saving
//     Throw, Damage Type.

import {
  PositiveInteger,
  movementFeet,
  type MovementFeet as MovementFeetType,
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
import {
  slotLinearDamageAmountExpr,
  type SlotLinearDamageAmount,
} from "../spells-execution-facts.ts";
import { resolveStationaryPersistentAreaAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
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
import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type StationaryPersistentAreaAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "stationary" };
  }
>;
type StationaryPersistentAreaAreaHazardResolveInput = Omit<
  SpellProcedureProfileResolveInput<StationaryPersistentAreaAreaHazardSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "stationary" };
    }
  >;
};
type StationaryPersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type StationaryPersistentAreaSaveGate = Extract<
  NonNullable<StationaryPersistentAreaMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type StationaryPersistentAreaDamageAmount = SlotLinearDamageAmount & {
  readonly startingAtLevel: typeof STATIONARY_PERSISTENT_AREA_LEVEL;
  readonly base: SlotLinearDamageAmount["base"] & {
    readonly dice: typeof STATIONARY_PERSISTENT_AREA_BASE_DAMAGE_DICE;
    readonly dieSize: typeof STATIONARY_PERSISTENT_AREA_DAMAGE_DIE_SIZE;
  };
  readonly perLevel: NonNullable<SlotLinearDamageAmount["perLevel"]> & {
    readonly dice: typeof STATIONARY_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL;
  };
};
type StationaryPersistentAreaProfileShape = {
  readonly radiusFeet: MovementFeetType;
  readonly damageAmount: StationaryPersistentAreaDamageAmount;
};
type StationaryPersistentAreaExecutionBoundary = Readonly<{
  durationTicks: StationaryPersistentAreaAreaHazardSpellInvocation["durationTicks"];
  rangeFeet: StationaryPersistentAreaAreaHazardSpellInvocation["rangeFeet"];
}>;
type StationaryPersistentAreaMechanicsFacts = SpellProcedureMechanicsFacts &
  StationaryPersistentAreaProfileShape;
type OngoingAreaFacts = NonNullable<ReturnType<typeof ongoingAreaSpellFacts>>;
type StationaryPersistentAreaAdmissionIssue = SpellProcedureAdmissionIssue<
  "persistentAreaSaveDamage",
  StationaryPersistentAreaFailedFact,
  SpellMechanicsBranchPath
>;

export const STATIONARY_PERSISTENT_AREA_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationTicks",
  "attachment",
  "initialSaveDamage",
  "passiveOperation",
  "enterOperation",
  "endTurnOperation",
  "operationCount",
  "oncePerTurnLimitGroup",
] as const;
type StationaryPersistentAreaFailedFact =
  (typeof STATIONARY_PERSISTENT_AREA_FAILED_FACTS)[number];

const STATIONARY_PERSISTENT_AREA_CONSUMED_PATHS = [
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

const STATIONARY_PERSISTENT_AREA_UNOWNED_PATHS = [] as const;

const STATIONARY_PERSISTENT_AREA_LEVEL = 5;
const STATIONARY_PERSISTENT_AREA_RANGE_FEET = 300;
const STATIONARY_PERSISTENT_AREA_DURATION_MINUTES = 10;
const STATIONARY_PERSISTENT_AREA_RADIUS_FEET = 20;
const STATIONARY_PERSISTENT_AREA_BASE_DAMAGE_DICE = 4;
const STATIONARY_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 10;
const STATIONARY_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitStationaryPersistentAreaAreaHazard(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: StationaryPersistentAreaMechanicsFacts,
  executionBoundary: StationaryPersistentAreaExecutionBoundary,
): readonly StationaryPersistentAreaAreaHazardSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly StationaryPersistentAreaAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < STATIONARY_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = slotLinearDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: STATIONARY_PERSISTENT_AREA_LEVEL,
        slotLevel: slot.spellLevel,
      });
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveDamage",
          lifecycle: { kind: "stationary" },
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: facts.radiusFeet,
          },
          durationTicks: executionBoundary.durationTicks,
          rangeFeet: executionBoundary.rangeFeet,
          damage: { expr: damageExpr, damageType: "piercing" },
        },
      ];
    },
  );
}

function stationaryPersistentAreaMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveDamage",
  StationaryPersistentAreaMechanicsFacts,
  StationaryPersistentAreaAreaHazardSpellInvocation,
  StationaryPersistentAreaAdmissionIssue
> {
  if (!isStationaryPersistentAreaRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }

  const ongoing = ongoingAreaSpellFacts(source.mechanics);
  if (ongoing === null) {
    return {
      tag: "unsupported",
      issues: [
        stationaryPersistentAreaAdmissionIssue({
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        }),
      ],
    };
  }

  const projections = stationaryPersistentAreaProjections(
    ongoing,
    source.spellDefinitionRuleFacts.duration,
  );
  const failures = stationaryPersistentAreaFailures(ongoing, projections);
  const [firstFailure, ...remainingFailures] = failures;
  if (firstFailure !== undefined) {
    return {
      tag: "unsupported",
      issues: [
        stationaryPersistentAreaAdmissionIssue(firstFailure),
        ...remainingFailures.map(stationaryPersistentAreaAdmissionIssue),
      ],
    };
  }

  const requiredFacts = stationaryPersistentAreaRequiredFacts(projections);
  if (requiredFacts.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [stationaryPersistentAreaAdmissionIssue(requiredFacts.failure)],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...requiredFacts.profileShape,
  } satisfies StationaryPersistentAreaMechanicsFacts;

  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaSaveDamage",
      facts,
      evidence: {
        consumed: [
          ...STATIONARY_PERSISTENT_AREA_CONSUMED_PATHS,
          ...spellConsumedMaterialEvidencePaths(ongoing.mechanics.components),
        ],
        unowned: STATIONARY_PERSISTENT_AREA_UNOWNED_PATHS,
      },
      admit: (executionSource, ctx) =>
        admitStationaryPersistentAreaAreaHazard(
          executionSource,
          ctx,
          facts,
          requiredFacts.executionBoundary,
        ),
    },
  };
}

type StationaryPersistentAreaRequiredFacts =
  | {
      readonly tag: "supported";
      readonly profileShape: StationaryPersistentAreaProfileShape;
      readonly executionBoundary: StationaryPersistentAreaExecutionBoundary;
    }
  | {
      readonly tag: "unsupported";
      readonly failure: StationaryPersistentAreaFailure;
    };

type StationaryPersistentAreaSupportedRange = Extract<
  StationaryPersistentAreaMechanics["range"],
  { readonly kind: "point" }
> & { readonly feet: typeof STATIONARY_PERSISTENT_AREA_RANGE_FEET };
type StationaryPersistentAreaSupportedGeometry =
  OngoingAreaFacts["mechanics"]["attachment"]["value"] & {
    readonly origin: { readonly kind: "point_within_range" };
    readonly shape: {
      readonly kind: "sphere";
      readonly radiusFeet: typeof STATIONARY_PERSISTENT_AREA_RADIUS_FEET;
    };
  };
type StationaryPersistentAreaProjections = Readonly<{
  levelSupported: boolean;
  castingTimeSupported: boolean;
  range: StationaryPersistentAreaSupportedRange | null;
  durationSupported: boolean;
  mechanicsDurationTicksSupported: boolean;
  definitionDurationTicks:
    | StationaryPersistentAreaExecutionBoundary["durationTicks"]
    | null;
  area: StationaryPersistentAreaSupportedGeometry | null;
  initialDamageAmount:
    | StationaryPersistentAreaProfileShape["damageAmount"]
    | null;
}>;

function stationaryPersistentAreaProjections(
  ongoing: OngoingAreaFacts,
  definitionDuration: SpellMechanicsAdmissionSource["spellDefinitionRuleFacts"]["duration"],
): StationaryPersistentAreaProjections {
  const { mechanics } = ongoing;
  const mechanicsDurationTicks = ongoingAreaSpellDurationTicks(
    mechanics.duration,
  );
  const definitionDurationTicks =
    ongoingAreaSpellDurationTicks(definitionDuration);
  const area = mechanics.attachment.value;
  return {
    levelSupported: mechanics.level === STATIONARY_PERSISTENT_AREA_LEVEL,
    castingTimeSupported: mechanics.castingTime.kind === "action",
    range: isStationaryPersistentAreaRange(mechanics.range)
      ? mechanics.range
      : null,
    durationSupported: isStationaryPersistentAreaDuration(mechanics.duration),
    mechanicsDurationTicksSupported:
      mechanicsDurationTicks !== undefined &&
      Result.isSuccess(mechanicsDurationTicks),
    definitionDurationTicks:
      definitionDurationTicks !== undefined &&
      Result.isSuccess(definitionDurationTicks)
        ? definitionDurationTicks.success
        : null,
    area: isStationaryPersistentAreaGeometry(area) ? area : null,
    initialDamageAmount: stationaryPersistentAreaSaveGateDamageAmount(
      mechanics.initialPhase,
    ),
  };
}

function stationaryPersistentAreaRequiredFacts(
  projections: StationaryPersistentAreaProjections,
): StationaryPersistentAreaRequiredFacts {
  if (projections.range === null) {
    return {
      tag: "unsupported",
      failure: {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
    };
  }
  if (projections.area === null) {
    return {
      tag: "unsupported",
      failure: {
        failedFact: "attachment",
        mechanicsPath: spellOngoingAttachmentPath(),
      },
    };
  }
  if (projections.definitionDurationTicks === null) {
    return {
      tag: "unsupported",
      failure: {
        failedFact: "durationTicks",
        mechanicsPath: spellDurationValuePath(),
      },
    };
  }
  if (projections.initialDamageAmount === null) {
    return {
      tag: "unsupported",
      failure: {
        failedFact: "initialSaveDamage",
        mechanicsPath: spellOngoingInitialPhasePath(),
      },
    };
  }
  return {
    tag: "supported",
    profileShape: {
      radiusFeet: movementFeet(projections.area.shape.radiusFeet),
      damageAmount: projections.initialDamageAmount,
    },
    executionBoundary: {
      durationTicks: projections.definitionDurationTicks,
      rangeFeet: movementFeet(projections.range.feet),
    },
  };
}

type StationaryPersistentAreaFailure = {
  readonly failedFact: StationaryPersistentAreaFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function isStationaryPersistentAreaRepresentation(
  mechanics: SpellMechanics,
): mechanics is StationaryPersistentAreaMechanics {
  if (mechanics.family !== "ongoing_effect") {
    return false;
  }
  const attachment = mechanics.attachment;
  const shape =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value.shape
      : undefined;
  const geometryMatches =
    shape?.kind === "sphere" &&
    shape.radiusFeet === STATIONARY_PERSISTENT_AREA_RADIUS_FEET;
  const rangeMatches =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === STATIONARY_PERSISTENT_AREA_RANGE_FEET;
  const initialSaveMatches =
    stationaryPersistentAreaSaveGateDamageAmount(mechanics.initialPhase) !==
    null;
  const hasEnterTrigger = mechanics.operations.some(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const hasEndTurnTrigger = mechanics.operations.some(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const hasTranslatingAreaLifecycle = mechanics.operations.some(
    (operation) =>
      operation.trigger.kind === "on_caster_turn_start" ||
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  return (
    !hasTranslatingAreaLifecycle &&
    spellProcedureHasRedundantSignature({
      kind: "twoWitnessesMayBeMissing",
      witnesses: [
        { name: "geometry", present: geometryMatches },
        { name: "range", present: rangeMatches },
        { name: "initialSave", present: initialSaveMatches },
        { name: "enterTrigger", present: hasEnterTrigger },
        { name: "endTurnTrigger", present: hasEndTurnTrigger },
      ],
    })
  );
}

function stationaryPersistentAreaFailures(
  ongoing: NonNullable<ReturnType<typeof ongoingAreaSpellFacts>>,
  projections: StationaryPersistentAreaProjections,
): readonly StationaryPersistentAreaFailure[] {
  const { mechanics } = ongoing;
  const operationFacts = stationaryPersistentAreaOperations(mechanics);
  const { enterOperation, endTurnOperation } = operationFacts;
  return [
    ...stationaryPersistentAreaHeaderFailures(projections),
    ...stationaryPersistentAreaShapeFailures(projections),
    ...stationaryPersistentAreaOperationFailures(operationFacts),
    ...stationaryPersistentAreaUsageLimitFailures({
      initialPhase: mechanics.initialPhase,
      enterOperation,
      endTurnOperation,
    }),
  ];
}

function stationaryPersistentAreaFailureIf(
  supported: boolean,
  failedFact: StationaryPersistentAreaFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly StationaryPersistentAreaFailure[] {
  return supported ? [] : [{ failedFact, mechanicsPath }];
}

function stationaryPersistentAreaHeaderFailures(
  projections: StationaryPersistentAreaProjections,
): readonly StationaryPersistentAreaFailure[] {
  return [
    ...stationaryPersistentAreaFailureIf(
      projections.levelSupported,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...stationaryPersistentAreaFailureIf(
      projections.castingTimeSupported,
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...stationaryPersistentAreaFailureIf(
      projections.range !== null,
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...stationaryPersistentAreaFailureIf(
      projections.durationSupported,
      "duration",
      spellDurationValuePath(),
    ),
    ...stationaryPersistentAreaFailureIf(
      projections.mechanicsDurationTicksSupported,
      "durationTicks",
      spellDurationValuePath(),
    ),
  ];
}

function stationaryPersistentAreaShapeFailures(
  projections: StationaryPersistentAreaProjections,
): readonly StationaryPersistentAreaFailure[] {
  return [
    ...stationaryPersistentAreaFailureIf(
      projections.area !== null,
      "attachment",
      spellOngoingAttachmentPath(),
    ),
    ...stationaryPersistentAreaFailureIf(
      projections.initialDamageAmount !== null,
      "initialSaveDamage",
      spellOngoingInitialPhasePath(),
    ),
  ];
}

type StationaryPersistentAreaOperations = ReturnType<
  typeof stationaryPersistentAreaOperations
>;

function stationaryPersistentAreaOperationFailures({
  passiveOperation,
  enterOperation,
  endTurnOperation,
  extraOperations,
}: StationaryPersistentAreaOperations): readonly StationaryPersistentAreaFailure[] {
  return [
    ...stationaryPersistentAreaFailureIf(
      isStationaryPersistentAreaPassiveOperation(
        passiveOperation?.operation.effect,
      ),
      "passiveOperation",
      stationaryPersistentAreaOperationEffectPath(
        passiveOperation,
        PositiveInteger(1),
      ),
    ),
    ...stationaryPersistentAreaFailureIf(
      stationaryPersistentAreaSaveGateDamageAmount(
        enterOperation?.operation.effect,
      ) !== null,
      "enterOperation",
      stationaryPersistentAreaOperationEffectPath(
        enterOperation,
        PositiveInteger(2),
      ),
    ),
    ...stationaryPersistentAreaFailureIf(
      stationaryPersistentAreaSaveGateDamageAmount(
        endTurnOperation?.operation.effect,
      ) !== null,
      "endTurnOperation",
      stationaryPersistentAreaOperationEffectPath(
        endTurnOperation,
        PositiveInteger(3),
      ),
    ),
    ...extraOperations.map(
      (extraOperation): StationaryPersistentAreaFailure => ({
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(extraOperation.ordinal),
      }),
    ),
  ];
}

function stationaryPersistentAreaAdmissionIssue(
  failure: StationaryPersistentAreaFailure,
): StationaryPersistentAreaAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaSaveDamage",
    failedFact: failure.failedFact,
    mechanicsPath: failure.mechanicsPath,
    message: `Unsupported stationary persistent-area mechanics fact: ${failure.failedFact}.`,
  };
}

function stationaryPersistentAreaInitialUsageLimit(
  initialPhase: StationaryPersistentAreaMechanics["initialPhase"],
) {
  return initialPhase?.kind === "save_gate"
    ? initialPhase.usageLimit
    : undefined;
}

type StationaryPersistentAreaOperationRole = "passive" | "enter" | "endTurn";

type StationaryPersistentAreaOperationOccurrence = {
  readonly operation: StationaryPersistentAreaMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
  readonly role: StationaryPersistentAreaOperationRole | null;
};

function stationaryPersistentAreaOperationPath(
  operation: StationaryPersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationPath(operation?.ordinal ?? fallbackOrdinal);
}

function stationaryPersistentAreaOperationEffectPath(
  operation: StationaryPersistentAreaOperationOccurrence | undefined,
  fallbackOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellOngoingOperationEffectPath(operation?.ordinal ?? fallbackOrdinal);
}

function stationaryPersistentAreaUsageLimitFailures(input: {
  readonly initialPhase: StationaryPersistentAreaMechanics["initialPhase"];
  readonly enterOperation:
    | StationaryPersistentAreaOperationOccurrence
    | undefined;
  readonly endTurnOperation:
    | StationaryPersistentAreaOperationOccurrence
    | undefined;
}): readonly StationaryPersistentAreaFailure[] {
  const entries = [
    {
      limit: stationaryPersistentAreaInitialUsageLimit(input.initialPhase),
      mechanicsPath: spellOngoingInitialPhasePath(),
    },
    {
      limit: input.enterOperation?.operation.usageLimit,
      mechanicsPath: stationaryPersistentAreaOperationPath(
        input.enterOperation,
        PositiveInteger(2),
      ),
    },
    {
      limit: input.endTurnOperation?.operation.usageLimit,
      mechanicsPath: stationaryPersistentAreaOperationPath(
        input.endTurnOperation,
        PositiveInteger(3),
      ),
    },
  ] satisfies readonly {
    readonly limit: UsageLimit | undefined;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }[];
  const sharedLimitGroup = sharedOncePerTurnLimitGroup(
    entries.map(({ limit }) => limit),
  );
  if (sharedLimitGroup !== null && sharedLimitGroup.length > 0) {
    return [];
  }
  return entries.map(({ mechanicsPath }) => ({
    failedFact: "oncePerTurnLimitGroup" as const,
    mechanicsPath,
  }));
}

function stationaryPersistentAreaOperations(
  mechanics: StationaryPersistentAreaMechanics,
) {
  const operations = mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
    role: stationaryPersistentAreaOperationRole(operation.trigger),
  }));
  return {
    operations,
    passiveOperation: operations.find(({ role }) => role === "passive"),
    enterOperation: operations.find(({ role }) => role === "enter"),
    endTurnOperation: operations.find(({ role }) => role === "endTurn"),
    extraOperations: operations.filter(
      (occurrence, index) =>
        occurrence.role === null ||
        operations.findIndex(({ role }) => role === occurrence.role) !== index,
    ),
  };
}

function stationaryPersistentAreaOperationRole(
  trigger: OngoingTrigger,
): StationaryPersistentAreaOperationRole | null {
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

function isStationaryPersistentAreaRange(
  range: StationaryPersistentAreaMechanics["range"],
): range is StationaryPersistentAreaSupportedRange {
  return (
    range.kind === "point" &&
    range.feet === STATIONARY_PERSISTENT_AREA_RANGE_FEET
  );
}

function isStationaryPersistentAreaDuration(
  duration: OngoingAreaFacts["mechanics"]["duration"],
): boolean {
  if (duration.kind !== "concentration") {
    return false;
  }
  return (
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === STATIONARY_PERSISTENT_AREA_DURATION_MINUTES
  );
}

function isStationaryPersistentAreaGeometry(
  area: OngoingAreaFacts["mechanics"]["attachment"]["value"],
): area is OngoingAreaFacts["mechanics"]["attachment"]["value"] & {
  readonly origin: { readonly kind: "point_within_range" };
  readonly shape: {
    readonly kind: "sphere";
    readonly radiusFeet: typeof STATIONARY_PERSISTENT_AREA_RADIUS_FEET;
  };
} {
  return (
    area.origin.kind === "point_within_range" &&
    area.shape.kind === "sphere" &&
    area.shape.radiusFeet === STATIONARY_PERSISTENT_AREA_RADIUS_FEET
  );
}

function isStationaryPersistentAreaPassiveOperation(
  effect:
    | StationaryPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
): boolean {
  if (effect?.kind !== "composite" || effect.effects.length !== 2) {
    return false;
  }
  return (
    effect.effects.some(
      (candidate) => candidate.kind === "area_is_difficult_terrain",
    ) &&
    effect.effects.some(
      (candidate) => candidate.kind === "area_is_lightly_obscured",
    )
  );
}

function isStationaryPersistentAreaDamageAmount(
  amount: Extract<
    StationaryPersistentAreaSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"],
): amount is StationaryPersistentAreaDamageAmount {
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === STATIONARY_PERSISTENT_AREA_LEVEL &&
    amount.base.dice === STATIONARY_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    amount.base.dieSize === STATIONARY_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    amount.perLevel?.dice ===
      STATIONARY_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL
  );
}

function stationaryPersistentAreaSaveGateDamageAmount(
  effect:
    | StationaryPersistentAreaMechanics["initialPhase"]
    | StationaryPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
): StationaryPersistentAreaDamageAmount | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "piercing" &&
    isStationaryPersistentAreaDamageAmount(effect.onFail.amount)
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function resolveNarrowedStationaryPersistentAreaAreaHazard(
  input: StationaryPersistentAreaAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveStationaryPersistentAreaAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveStationaryPersistentAreaAreaHazard(
  input: SpellProcedureProfileResolveInput<StationaryPersistentAreaAreaHazardSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when({ lifecycle: { kind: "stationary" } }, (invocation) =>
      resolveNarrowedStationaryPersistentAreaAreaHazard({
        ...input,
        invocation,
      }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the stationary persistent-area profile.",
      ),
    ),
  );
}

const StationaryPersistentAreaAreaHazardInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveDamage"),
      lifecycle: Schema.Struct({ kind: Schema.Literal("stationary") }),
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
        damageType: Schema.Literal("piercing"),
      }),
    }),
  );

export const stationaryPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: StationaryPersistentAreaAreaHazardInvocationSchema,
  admitMechanics: stationaryPersistentAreaMechanicsAdmission,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveStationaryPersistentAreaAreaHazard,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  StationaryPersistentAreaAreaHazardSpellInvocation,
  StationaryPersistentAreaMechanicsFacts,
  StationaryPersistentAreaAdmissionIssue
>;
