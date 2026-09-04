import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  type MovementFeet as MovementFeetType,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleSpellExecutionSource,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { optionalProperty } from "../../optional-property.ts";
import {
  DcSourceSchema,
  LeveledSpellInvocationResourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
} from "../codec-building-blocks.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import { resolveDirectionalPersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
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
  admitSpellAreaAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
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

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
// RAW: .references/srd-5.2.1/Spells/Descriptions-E-L.md "Gust of Wind".
// The runtime owns casting, duration, saves, push, movement cost, and later-turn
// direction changes. Spatial membership and the gas/vapor/flame facts are
// table-owned.

type Invocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directionalPersistentArea" }
>;
type ResolveInput = SpellProcedureProfileResolveInput<Invocation>;
type Mechanics = Extract<SpellMechanics, { readonly family: "ongoing_effect" }>;
type Operation = Mechanics["operations"][number];
type Duration = Extract<
  Mechanics["duration"],
  { readonly kind: "concentration" }
>;

const LEVEL = 2 as const;
const MATERIAL = "a legume seed" as const;
const DURATION_MINUTES = 1 as const;
const LENGTH_FEET = 60 as const;
const WIDTH_FEET = 10 as const;
const PUSH_FEET = 15 as const;

type Facts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly lengthFeet: MovementFeetType;
  readonly widthFeet: MovementFeetType;
  readonly rangeFeet: MovementFeetType;
  readonly ability: "str";
  readonly dc: Invocation["dc"];
  readonly pushDistanceFeet: MovementFeetType;
  readonly movementCost: Invocation["movementCost"];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for FailedFact.
const FAILED_FACTS = [
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
  "initialSaveAttachment",
  "initialSaveAbility",
  "initialSaveDc",
  "initialSaveSuccess",
  "initialSaveFailure",
  "initialPushKind",
  "initialPushDirection",
  "initialPushDistance",
  "operationCount",
  "operation",
  "operationPredicate",
  "operationTargetLimit",
  "operationUsageLimit",
  "strongWindTrigger",
  "strongWindEffect",
  "movementCostTrigger",
  "movementCostEffect",
  "movementCostMultiplier",
  "movementCostDirection",
  "endTurnTrigger",
  "endTurnSaveAttachment",
  "endTurnSaveAbility",
  "endTurnSaveDc",
  "endTurnSaveSuccess",
  "endTurnSaveFailure",
  "endTurnPushKind",
  "endTurnPushDirection",
  "endTurnPushDistance",
  "initialRepeatSaves",
  "initialAutoSuccessIfCasterSlotGte",
  "initialAutoSuccessIfTarget",
  "initialSaveAppliesIf",
  "initialUsageLimit",
  "endTurnRepeatSaves",
  "endTurnAutoSuccessIfCasterSlotGte",
  "endTurnAutoSuccessIfTarget",
  "endTurnSaveAppliesIf",
  "endTurnUsageLimit",
  "directionTrigger",
  "directionActionCost",
  "directionLaterTurns",
  "directionEffect",
] as const;
type FailedFact = (typeof FAILED_FACTS)[number];
type AdmissionIssue = SpellProcedureAdmissionIssue<
  "directionalPersistentArea",
  FailedFact,
  UnitMechanicsPath
>;
type IssueFact = {
  readonly failedFact: FailedFact;
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
] as const satisfies ReadonlyArray<keyof Mechanics>;
type ComponentKeySpace = Pick<Components, "v" | "s" | "m"> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<keyof ComponentKeySpace>;
const RANGE_FIELDS = ["kind"] as const;
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
] as const satisfies ReadonlyArray<keyof Duration["upTo"]>;
const OPERATION_FIELDS = [
  "trigger",
  "effect",
  "predicate",
  "targetLimit",
  "usageLimit",
] as const;
const PASSIVE_TRIGGER_FIELDS = ["kind"] as const;
const STRONG_WIND_FIELDS = ["kind"] as const;
const MOVEMENT_COST_FIELDS = ["kind", "multiplier", "appliesTo"] as const;
const END_TURN_TRIGGER_FIELDS = ["kind"] as const;
const DIRECTION_TRIGGER_FIELDS = ["kind", "cost", "laterTurnsOnly"] as const;
const ACTION_COST_FIELDS = ["kind"] as const;
const REPOSITION_FIELDS = ["kind", "maxMoveFeet"] as const;
type SaveKeySpace = {
  readonly kind: unknown;
  readonly attachment?: unknown;
  readonly ability: unknown;
  readonly dc: unknown;
  readonly onFail: unknown;
  readonly onSuccess: unknown;
  readonly repeatSaves?: unknown;
  readonly autoSuccessIfCasterSlotGte?: unknown;
  readonly autoSuccessIfTarget?: unknown;
  readonly saveAppliesIf?: unknown;
  readonly usageLimit?: unknown;
};
const SAVE_FIELDS = [
  "kind",
  "attachment",
  "ability",
  "dc",
  "onFail",
  "onSuccess",
  "repeatSaves",
  "autoSuccessIfCasterSlotGte",
  "autoSuccessIfTarget",
  "saveAppliesIf",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof SaveKeySpace>;
const DC_FIELDS = ["kind"] as const;
const NONE_FIELDS = ["kind"] as const;
type ForceMoveKeySpace = {
  readonly kind: unknown;
  readonly movementKind: unknown;
  readonly originDirection?: unknown;
  readonly distanceFeet: unknown;
};
const FORCE_MOVE_FIELDS = [
  "kind",
  "movementKind",
  "originDirection",
  "distanceFeet",
] as const satisfies ReadonlyArray<keyof ForceMoveKeySpace>;

function admissionIssue(
  failedFact: FailedFact,
  mechanicsPath: UnitMechanicsPath,
): AdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "directionalPersistentArea",
    failedFact,
    mechanicsPath,
    message: `Unsupported directionalPersistentArea mechanics fact: ${failedFact}.`,
  };
}

function isRepresentation(mechanics: SpellMechanics): mechanics is Mechanics {
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
              ongoing.level === LEVEL &&
              ongoing.school === "evocation" &&
              ongoing.castingTime.kind === "action",
          },
          {
            name: "selfMaterial",
            present:
              ongoing.range.kind === "self" &&
              ongoing.components.m === MATERIAL,
          },
          {
            name: "duration",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.unit === "minute" &&
              ongoing.duration.upTo.amount === DURATION_MINUTES,
          },
          {
            name: "line",
            present:
              area?.origin.kind === "self" &&
              area.shape.kind === "line" &&
              area.shape.lengthFeet === LENGTH_FEET &&
              area.shape.widthFeet === WIDTH_FEET,
          },
          {
            name: "operations",
            present:
              ongoing.operations.some(
                ({ effect }) => effect.kind === "area_movement_cost_multiplier",
              ) &&
              ongoing.operations.some(
                ({ effect }) => effect.kind === "reposition_attachment",
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

type Occurrence = ReturnType<typeof spellOngoingOperationOccurrences>[number];
type Role = "strongWind" | "movementCost" | "endTurn" | "direction";

type RoleAssignment = Readonly<Record<Role, Occurrence>>;
type PartialRoleAssignment = Readonly<Partial<Record<Role, Occurrence>>>;

function operationRoleWitnessScore(role: Role, operation: Operation): number {
  return Match.value(role).pipe(
    Match.when(
      "strongWind",
      () =>
        (operation.trigger.kind === "passive" ? 1 : 0) +
        (operation.effect.kind === "area_has_strong_wind" ? 2 : 0),
    ),
    Match.when(
      "movementCost",
      () =>
        (operation.trigger.kind === "passive" ? 1 : 0) +
        (operation.effect.kind === "area_movement_cost_multiplier" ? 2 : 0),
    ),
    Match.when(
      "endTurn",
      () =>
        (operation.trigger.kind === "on_creature_ends_turn_in_area" ? 2 : 0) +
        (operation.effect.kind === "save_gate" ? 1 : 0),
    ),
    Match.when(
      "direction",
      () =>
        (operation.trigger.kind === "on_caster_spends_action" ? 2 : 0) +
        (operation.effect.kind === "reposition_attachment" ? 1 : 0),
    ),
    Match.exhaustive,
  );
}

const OPERATION_ROLES = [
  "strongWind",
  "movementCost",
  "endTurn",
  "direction",
] as const satisfies readonly Role[];

function operationRoleAssignments(
  roles: readonly Role[],
  occurrences: readonly Occurrence[],
): readonly PartialRoleAssignment[] {
  const [role, ...remainingRoles] = roles;
  if (role === undefined) return [{}];
  return occurrences.flatMap((occurrence, index) =>
    operationRoleWitnessScore(role, occurrence.operation) === 0
      ? []
      : operationRoleAssignments(
          remainingRoles,
          occurrences.filter((_, candidateIndex) => candidateIndex !== index),
        ).map(
          (assignment): PartialRoleAssignment => ({
            ...assignment,
            [role]: occurrence,
          }),
        ),
  );
}

function isCompleteRoleAssignment(
  assignment: PartialRoleAssignment,
): assignment is RoleAssignment {
  return OPERATION_ROLES.every((role) => assignment[role] !== undefined);
}

function operationAssignmentScore(assignment: RoleAssignment): number {
  return OPERATION_ROLES.reduce(
    (score, role) =>
      score + operationRoleWitnessScore(role, assignment[role].operation),
    0,
  );
}

function directionalOperationAssignment(
  occurrences: readonly Occurrence[],
): RoleAssignment | undefined {
  return operationRoleAssignments(OPERATION_ROLES, occurrences)
    .filter(isCompleteRoleAssignment)
    .reduce<RoleAssignment | undefined>(
      (best, candidate) =>
        best === undefined ||
        operationAssignmentScore(candidate) > operationAssignmentScore(best)
          ? candidate
          : best,
      undefined,
    );
}

type SaveFacts = {
  readonly ability: "str";
  readonly dc: Invocation["dc"];
  readonly distance: MovementFeetType;
};

type Inspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [IssueFact, ...IssueFact[]];
    }
  | {
      readonly tag: "parsed";
      readonly facts: Facts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

function inspectMechanics(source: SpellMechanicsAdmissionSource): Inspection {
  if (!isRepresentation(source.mechanics)) return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: IssueFact[] = [];
  const push = (
    failedFact: FailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "evocation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== MATERIAL ||
    !spellMechanicsObjectHasOnlyKeys<ComponentKeySpace>(
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

  const duration =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const durationValue = duration?.upTo;
  const durationTicks =
    durationValue !== undefined &&
    durationValue.unit === "minute" &&
    durationValue.amount === DURATION_MINUTES &&
    isSpellCanonicalDurationValue(durationValue) &&
    spellMechanicsObjectHasOnlyKeys(durationValue, DURATION_VALUE_FIELDS)
      ? spellDurationTicksFromCanonicalValue(durationValue)
      : undefined;
  if (
    duration === undefined ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)
  )
    push("duration", spellMechanicsHeaderPath("duration"));
  if (durationTicks === undefined)
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      push("durationValue", path);
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));

  const areaAdmission = admitSpellAreaAttachment(mechanics.attachment, [], []);
  const area =
    areaAdmission.tag === "admitted"
      ? areaAdmission.attachment.kind === "area"
        ? areaAdmission.attachment
        : areaAdmission.attachment.value
      : undefined;
  const line =
    area?.origin.kind === "self" &&
    area.shape.kind === "line" &&
    area.shape.lengthFeet === LENGTH_FEET &&
    area.shape.widthFeet === WIDTH_FEET
      ? area.shape
      : undefined;
  if (areaAdmission.tag === "rejected" || line === undefined)
    push("attachment", spellOngoingAttachmentPath());

  const inspectSave = (
    save: Mechanics["initialPhase"] | Operation["effect"] | undefined,
    path: UnitMechanicsPath,
    prefix: "initial" | "endTurn",
  ): SaveFacts | undefined => {
    const fact = (initial: FailedFact, repeated: FailedFact): FailedFact =>
      prefix === "initial" ? initial : repeated;
    if (save?.kind !== "save_gate") {
      push(fact("initialPhase", "endTurnSaveFailure"), path);
      return undefined;
    }
    if (!spellMechanicsObjectHasOnlyKeys<SaveKeySpace>(save, SAVE_FIELDS))
      push(fact("initialPhase", "endTurnSaveFailure"), path);
    const saveAreaAdmission =
      save.attachment === undefined
        ? undefined
        : admitSpellAreaAttachment(save.attachment, [], []);
    const saveArea =
      saveAreaAdmission?.tag === "admitted"
        ? saveAreaAdmission.attachment.kind === "area"
          ? saveAreaAdmission.attachment
          : saveAreaAdmission.attachment.value
        : undefined;
    if (
      saveArea?.origin.kind !== "self" ||
      saveArea.shape.kind !== "line" ||
      line === undefined ||
      saveArea.shape.lengthFeet !== line.lengthFeet ||
      saveArea.shape.widthFeet !== line.widthFeet
    )
      push(fact("initialSaveAttachment", "endTurnSaveAttachment"), path);
    const optionalSaveFacts = [
      {
        field: "repeatSaves",
        initial: "initialRepeatSaves",
        repeated: "endTurnRepeatSaves",
      },
      {
        field: "autoSuccessIfCasterSlotGte",
        initial: "initialAutoSuccessIfCasterSlotGte",
        repeated: "endTurnAutoSuccessIfCasterSlotGte",
      },
      {
        field: "autoSuccessIfTarget",
        initial: "initialAutoSuccessIfTarget",
        repeated: "endTurnAutoSuccessIfTarget",
      },
      {
        field: "saveAppliesIf",
        initial: "initialSaveAppliesIf",
        repeated: "endTurnSaveAppliesIf",
      },
      {
        field: "usageLimit",
        initial: "initialUsageLimit",
        repeated: "endTurnUsageLimit",
      },
    ] as const satisfies readonly {
      readonly field: keyof SaveKeySpace;
      readonly initial: FailedFact;
      readonly repeated: FailedFact;
    }[];
    for (const optionalFact of optionalSaveFacts)
      if (
        optionalFact.field in save &&
        save[optionalFact.field as keyof typeof save] !== undefined
      )
        push(fact(optionalFact.initial, optionalFact.repeated), path);
    if (save.ability !== "str")
      push(fact("initialSaveAbility", "endTurnSaveAbility"), path);
    if (
      save.dc.kind !== "caster_spell_save_dc" ||
      !spellMechanicsObjectHasOnlyKeys(save.dc, DC_FIELDS)
    )
      push(fact("initialSaveDc", "endTurnSaveDc"), path);
    if (
      save.onSuccess.kind !== "none" ||
      !spellMechanicsObjectHasOnlyKeys(save.onSuccess, NONE_FIELDS)
    )
      push(fact("initialSaveSuccess", "endTurnSaveSuccess"), path);
    if (save.onFail.kind !== "force_move") {
      push(fact("initialSaveFailure", "endTurnSaveFailure"), path);
      return undefined;
    }
    if (
      !spellMechanicsObjectHasOnlyKeys<ForceMoveKeySpace>(
        save.onFail,
        FORCE_MOVE_FIELDS,
      )
    )
      push(fact("initialSaveFailure", "endTurnSaveFailure"), path);
    if (save.onFail.movementKind !== "push")
      push(fact("initialPushKind", "endTurnPushKind"), path);
    if (
      save.onFail.movementKind !== "push" ||
      save.onFail.originDirection !== "away_from_caster"
    )
      push(fact("initialPushDirection", "endTurnPushDirection"), path);
    if (save.onFail.distanceFeet !== PUSH_FEET)
      push(fact("initialPushDistance", "endTurnPushDistance"), path);
    return save.ability === "str" &&
      save.dc.kind === "caster_spell_save_dc" &&
      save.onSuccess.kind === "none" &&
      save.onFail.movementKind === "push" &&
      save.onFail.originDirection === "away_from_caster" &&
      save.onFail.distanceFeet === PUSH_FEET
      ? {
          ability: save.ability,
          dc: save.dc,
          distance: movementFeet(save.onFail.distanceFeet),
        }
      : undefined;
  };

  const initialSave = inspectSave(
    mechanics.initialPhase,
    spellOngoingInitialPhasePath(),
    "initial",
  );
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const assignment = directionalOperationAssignment(occurrences);
  const strongWind = assignment?.strongWind;
  const movementCost = assignment?.movementCost;
  const endTurn = assignment?.endTurn;
  const direction = assignment?.direction;
  const selected = [strongWind, movementCost, endTurn, direction] as const;
  const selectedOrdinals = selected.flatMap((occurrence) =>
    occurrence === undefined ? [] : [occurrence.ordinal],
  );
  for (const occurrence of occurrences)
    if (!selectedOrdinals.includes(occurrence.ordinal))
      push("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  if (selected.some((occurrence) => occurrence === undefined))
    push("operationCount", spellMechanicsRootPath());

  const validateShell = (occurrence: Occurrence): void => {
    if (
      !spellMechanicsObjectHasOnlyKeys(occurrence.operation, OPERATION_FIELDS)
    )
      push("operation", spellOngoingOperationPath(occurrence.ordinal));
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    ))
      push(
        Match.value(failedFact).pipe(
          Match.when("predicate", () => "operationPredicate" as const),
          Match.when("targetLimit", () => "operationTargetLimit" as const),
          Match.when("usageLimit", () => "operationUsageLimit" as const),
          Match.exhaustive,
        ),
        spellOngoingOperationPath(occurrence.ordinal),
      );
  };
  occurrences.forEach(validateShell);

  if (strongWind !== undefined) {
    if (
      strongWind.operation.trigger.kind !== "passive" ||
      !spellMechanicsObjectHasOnlyKeys(
        strongWind.operation.trigger,
        PASSIVE_TRIGGER_FIELDS,
      )
    )
      push("strongWindTrigger", spellOngoingOperationPath(strongWind.ordinal));
    if (
      strongWind.operation.effect.kind !== "area_has_strong_wind" ||
      !spellMechanicsObjectHasOnlyKeys(
        strongWind.operation.effect,
        STRONG_WIND_FIELDS,
      )
    )
      push(
        "strongWindEffect",
        spellOngoingOperationEffectPath(strongWind.ordinal),
      );
  }
  if (movementCost !== undefined) {
    if (
      movementCost.operation.trigger.kind !== "passive" ||
      !spellMechanicsObjectHasOnlyKeys(
        movementCost.operation.trigger,
        PASSIVE_TRIGGER_FIELDS,
      )
    )
      push(
        "movementCostTrigger",
        spellOngoingOperationPath(movementCost.ordinal),
      );
    if (
      movementCost.operation.effect.kind !== "area_movement_cost_multiplier" ||
      !spellMechanicsObjectHasOnlyKeys(
        movementCost.operation.effect,
        MOVEMENT_COST_FIELDS,
      )
    )
      push(
        "movementCostEffect",
        spellOngoingOperationEffectPath(movementCost.ordinal),
      );
    else {
      if (movementCost.operation.effect.multiplier !== 2)
        push(
          "movementCostMultiplier",
          spellOngoingOperationEffectPath(movementCost.ordinal),
        );
      if (movementCost.operation.effect.appliesTo !== "toward_source")
        push(
          "movementCostDirection",
          spellOngoingOperationEffectPath(movementCost.ordinal),
        );
    }
  }
  const repeatedSave =
    endTurn === undefined
      ? undefined
      : inspectSave(
          endTurn.operation.effect,
          spellOngoingOperationEffectPath(endTurn.ordinal),
          "endTurn",
        );
  if (
    endTurn !== undefined &&
    (endTurn.operation.trigger.kind !== "on_creature_ends_turn_in_area" ||
      !spellMechanicsObjectHasOnlyKeys(
        endTurn.operation.trigger,
        END_TURN_TRIGGER_FIELDS,
      ))
  )
    push("endTurnTrigger", spellOngoingOperationPath(endTurn.ordinal));
  if (direction !== undefined) {
    const trigger = direction.operation.trigger;
    if (
      trigger.kind !== "on_caster_spends_action" ||
      !spellMechanicsObjectHasOnlyKeys(trigger, DIRECTION_TRIGGER_FIELDS)
    )
      push("directionTrigger", spellOngoingOperationPath(direction.ordinal));
    else {
      if (
        trigger.cost.kind !== "bonus_action" ||
        !spellMechanicsObjectHasOnlyKeys(trigger.cost, ACTION_COST_FIELDS)
      )
        push(
          "directionActionCost",
          spellOngoingOperationPath(direction.ordinal),
        );
    }
    if (
      direction.operation.effect.kind !== "reposition_attachment" ||
      direction.operation.effect.maxMoveFeet !== undefined ||
      !spellMechanicsObjectHasOnlyKeys(
        direction.operation.effect,
        REPOSITION_FIELDS,
      )
    )
      push(
        "directionEffect",
        spellOngoingOperationEffectPath(direction.ordinal),
      );
  }

  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  const movementCostMultiplier =
    movementCost?.operation.effect.kind === "area_movement_cost_multiplier"
      ? movementCost.operation.effect.multiplier
      : undefined;
  const movementCostAppliesTo =
    movementCost?.operation.effect.kind === "area_movement_cost_multiplier"
      ? movementCost.operation.effect.appliesTo
      : undefined;
  const movementCostFact: Invocation["movementCost"] | undefined =
    movementCostMultiplier === 2 && movementCostAppliesTo === "toward_source"
      ? {
          multiplier: movementCostMultiplier,
          appliesTo: "towardSource" as const,
        }
      : undefined;
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  if (
    durationTicks === undefined ||
    line === undefined ||
    initialSave === undefined ||
    repeatedSave === undefined ||
    strongWind === undefined ||
    movementCost === undefined ||
    movementCostFact === undefined ||
    endTurn === undefined ||
    direction === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      ],
    };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      durationTicks,
      lengthFeet: movementFeet(line.lengthFeet),
      widthFeet: movementFeet(line.widthFeet),
      rangeFeet: movementFeet(0),
      ability: initialSave.ability,
      dc: initialSave.dc,
      pushDistanceFeet: initialSave.distance,
      movementCost: movementCostFact,
    },
    evidence: {
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
        spellOngoingInitialPhasePath(),
        spellOngoingOperationPath(movementCost.ordinal),
        spellOngoingOperationEffectPath(movementCost.ordinal),
        spellOngoingOperationPath(endTurn.ordinal),
        spellOngoingOperationEffectPath(endTurn.ordinal),
        spellOngoingOperationPath(direction.ordinal),
        spellOngoingOperationEffectPath(direction.ordinal),
      ],
      unowned: [
        spellOngoingOperationPath(strongWind.ordinal),
        spellOngoingOperationEffectPath(strongWind.ordinal),
      ],
    },
  };
}

function admitMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "directionalPersistentArea",
  Facts,
  Invocation,
  AdmissionIssue
> {
  return Match.value(inspectMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          admissionIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "directionalPersistentArea" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitDirectionalPersistentArea(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitDirectionalPersistentArea(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: Facts,
): readonly Invocation[] {
  return ctx.spellCastOptions.flatMap((slot): readonly Invocation[] =>
    Number(slot.spellLevel) < facts.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: spellInvocationResourceForCastOption(slot),
            procedure: "directionalPersistentArea",
            spell,
            ability: facts.ability,
            dc: facts.dc,
            targeting: {
              kind: "selfOriginLine",
              lengthFeet: facts.lengthFeet,
              widthFeet: facts.widthFeet,
            },
            durationTicks: facts.durationTicks,
            rangeFeet: facts.rangeFeet,
            pushDistanceFeet: facts.pushDistanceFeet,
            movementCost: facts.movementCost,
          },
        ],
  );
}

function discoverCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<Invocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolve(input: ResolveInput): BattleResolutionResult {
  return resolveDirectionalPersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const InvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directionalPersistentArea"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("str"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("selfOriginLine"),
      lengthFeet: MovementFeet,
      widthFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    pushDistanceFeet: MovementFeet,
    movementCost: Schema.Struct({
      multiplier: Schema.Literal(2),
      appliesTo: Schema.Literal("towardSource"),
    }),
  }),
);

export const directionalPersistentAreaProfile = {
  procedure: "directionalPersistentArea",
  executionSchema: InvocationSchema,
  admitMechanics,
  discoverCastAct,
  resolve,
} satisfies SpellProcedureDeclaration<
  "directionalPersistentArea",
  Invocation,
  Facts,
  AdmissionIssue
>;
