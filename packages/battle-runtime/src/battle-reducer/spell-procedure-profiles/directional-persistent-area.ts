import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
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
import type {
  Attachment,
  Components,
  SpellMechanics,
} from "@dnd/surface/surface/types";
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
  "authoredConditionalMechanics",
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

function directionalPersistentAreaHeaderWitness(mechanics: Mechanics): boolean {
  return (
    mechanics.level === LEVEL &&
    mechanics.school === "evocation" &&
    mechanics.castingTime.kind === "action"
  );
}

function directionalPersistentAreaDurationWitness(
  mechanics: Mechanics,
): boolean {
  return (
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount === DURATION_MINUTES
  );
}

function directionalPersistentAreaLineWitness(mechanics: Mechanics): boolean {
  const attachment = mechanics.attachment;
  const area =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value
      : undefined;
  return (
    area?.origin.kind === "self" &&
    area.shape.kind === "line" &&
    area.shape.lengthFeet === LENGTH_FEET &&
    area.shape.widthFeet === WIDTH_FEET
  );
}

function directionalPersistentAreaOperationsWitness(
  mechanics: Mechanics,
): boolean {
  return (
    mechanics.operations.some(
      ({ effect }) => effect.kind === "area_movement_cost_multiplier",
    ) &&
    mechanics.operations.some(
      ({ effect }) => effect.kind === "reposition_attachment",
    )
  );
}

function directionalPersistentAreaOngoingRepresentation(
  ongoing: Mechanics,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present: directionalPersistentAreaHeaderWitness(ongoing),
      },
      {
        name: "selfMaterial",
        present:
          ongoing.range.kind === "self" && ongoing.components.m === MATERIAL,
      },
      {
        name: "duration",
        present: directionalPersistentAreaDurationWitness(ongoing),
      },
      {
        name: "line",
        present: directionalPersistentAreaLineWitness(ongoing),
      },
      {
        name: "operations",
        present: directionalPersistentAreaOperationsWitness(ongoing),
      },
    ],
  });
}

function isRepresentation(mechanics: SpellMechanics): mechanics is Mechanics {
  return Match.value(mechanics).pipe(
    Match.when(
      { family: "ongoing_effect" },
      directionalPersistentAreaOngoingRepresentation,
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

type Occurrence = ReturnType<typeof spellOngoingOperationOccurrences>[number];
type Role = "strongWind" | "movementCost" | "endTurn" | "direction";

type RoleAssignment = Readonly<Record<Role, Occurrence>>;
type PartialRoleAssignment = Readonly<Partial<Record<Role, Occurrence>>>;
type ResolvedRoleAssignment = Readonly<Record<Role, Occurrence | undefined>>;

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

type OperationRoleResolution = {
  readonly assignment: ResolvedRoleAssignment;
  readonly ambiguousOccurrences: readonly Occurrence[];
  readonly hasCompleteAssignment: boolean;
};

function directionalOperationAssignment(
  occurrences: readonly Occurrence[],
): OperationRoleResolution {
  const completeAssignments = operationRoleAssignments(
    OPERATION_ROLES,
    occurrences,
  ).filter(isCompleteRoleAssignment);
  const maximumScore = completeAssignments.reduce(
    (maximum, assignment) =>
      Math.max(maximum, operationAssignmentScore(assignment)),
    Number.NEGATIVE_INFINITY,
  );
  const bestAssignments = completeAssignments.filter(
    (assignment) => operationAssignmentScore(assignment) === maximumScore,
  );
  const commonOccurrence = (role: Role): Occurrence | undefined => {
    const candidate = bestAssignments[0]?.[role];
    return candidate !== undefined &&
      bestAssignments.every(
        (assignment) => assignment[role].ordinal === candidate.ordinal,
      )
      ? candidate
      : undefined;
  };
  const assignment: ResolvedRoleAssignment = {
    strongWind: commonOccurrence("strongWind"),
    movementCost: commonOccurrence("movementCost"),
    endTurn: commonOccurrence("endTurn"),
    direction: commonOccurrence("direction"),
  };
  const ambiguousOrdinals = OPERATION_ROLES.flatMap((role) =>
    assignment[role] === undefined
      ? bestAssignments.map((candidate) => candidate[role].ordinal)
      : [],
  );
  return {
    assignment,
    ambiguousOccurrences: occurrences.filter(({ ordinal }) =>
      ambiguousOrdinals.includes(ordinal),
    ),
    hasCompleteAssignment: completeAssignments.length > 0,
  };
}

type SaveFacts = {
  readonly ability: "str";
  readonly dc: Invocation["dc"];
  readonly distance: MovementFeetType;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for OptionalSaveField.
const OPTIONAL_SAVE_FIELDS = [
  "repeatSaves",
  "autoSuccessIfCasterSlotGte",
  "autoSuccessIfTarget",
  "saveAppliesIf",
  "usageLimit",
] as const;
type OptionalSaveField = (typeof OPTIONAL_SAVE_FIELDS)[number];

function hasOptionalSaveFact(
  save: Extract<
    Mechanics["initialPhase"] | Operation["effect"],
    { readonly kind: "save_gate" }
  >,
  field: OptionalSaveField,
): boolean {
  return Match.value(field).pipe(
    Match.when(
      "repeatSaves",
      () => "repeatSaves" in save && save.repeatSaves !== undefined,
    ),
    Match.when(
      "autoSuccessIfCasterSlotGte",
      () =>
        "autoSuccessIfCasterSlotGte" in save &&
        save.autoSuccessIfCasterSlotGte !== undefined,
    ),
    Match.when(
      "autoSuccessIfTarget",
      () =>
        "autoSuccessIfTarget" in save && save.autoSuccessIfTarget !== undefined,
    ),
    Match.when(
      "saveAppliesIf",
      () => "saveAppliesIf" in save && save.saveAppliesIf !== undefined,
    ),
    Match.when(
      "usageLimit",
      () => "usageLimit" in save && save.usageLimit !== undefined,
    ),
    Match.exhaustive,
  );
}

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

type DirectionalLine = Extract<
  Extract<Attachment, { readonly kind: "area" }>["shape"],
  { readonly kind: "line" }
>;

type DirectionalSave = Extract<
  Mechanics["initialPhase"] | Operation["effect"],
  { readonly kind: "save_gate" }
>;
type DirectionalForceMove = Extract<
  DirectionalSave["onFail"],
  { readonly kind: "force_move" }
>;

function issueFact(
  failedFact: FailedFact,
  mechanicsPath: UnitMechanicsPath,
): IssueFact {
  return { failedFact, mechanicsPath };
}

function directionalSaveFact(
  prefix: "initial" | "endTurn",
  initial: FailedFact,
  repeated: FailedFact,
): FailedFact {
  return prefix === "initial" ? initial : repeated;
}

function directionalSaveArea(
  save: DirectionalSave,
): Extract<Attachment, { readonly kind: "area" }> | undefined {
  if (save.attachment === undefined) return undefined;
  const admission = admitSpellAreaAttachment(save.attachment, [], []);
  if (admission.tag === "rejected") return undefined;
  return admission.attachment.kind === "area"
    ? admission.attachment
    : admission.attachment.value;
}

function directionalSaveAttachmentMatches(
  area: Extract<Attachment, { readonly kind: "area" }> | undefined,
  line: DirectionalLine | undefined,
): boolean {
  if (area === undefined || line === undefined) return false;
  if (area.origin.kind !== "self") return false;
  if (area.shape.kind !== "line") return false;
  return [
    area.shape.lengthFeet === line.lengthFeet,
    area.shape.widthFeet === line.widthFeet,
  ].every(Boolean);
}

function directionalSaveShellIssues(
  save: DirectionalSave,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
  line: DirectionalLine | undefined,
): IssueFact[] {
  const issues: IssueFact[] = [];
  const failureFact = directionalSaveFact(
    prefix,
    "initialPhase",
    "endTurnSaveFailure",
  );
  if (!spellMechanicsObjectHasOnlyKeys<SaveKeySpace>(save, SAVE_FIELDS))
    issues.push(issueFact(failureFact, path));
  if (!directionalSaveAttachmentMatches(directionalSaveArea(save), line))
    issues.push(
      issueFact(
        directionalSaveFact(
          prefix,
          "initialSaveAttachment",
          "endTurnSaveAttachment",
        ),
        path,
      ),
    );
  const optionalSaveFacts = [
    ["repeatSaves", "initialRepeatSaves", "endTurnRepeatSaves"],
    [
      "autoSuccessIfCasterSlotGte",
      "initialAutoSuccessIfCasterSlotGte",
      "endTurnAutoSuccessIfCasterSlotGte",
    ],
    [
      "autoSuccessIfTarget",
      "initialAutoSuccessIfTarget",
      "endTurnAutoSuccessIfTarget",
    ],
    ["saveAppliesIf", "initialSaveAppliesIf", "endTurnSaveAppliesIf"],
    ["usageLimit", "initialUsageLimit", "endTurnUsageLimit"],
  ] as const satisfies readonly (readonly [
    OptionalSaveField,
    FailedFact,
    FailedFact,
  ])[];
  issues.push(
    ...optionalSaveFacts.flatMap(([field, initial, repeated]) =>
      hasOptionalSaveFact(save, field)
        ? [issueFact(directionalSaveFact(prefix, initial, repeated), path)]
        : [],
    ),
  );
  return issues;
}

function directionalSaveCoreIssues(
  save: DirectionalSave,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  const issues: IssueFact[] = [];
  if (save.ability !== "str")
    issues.push(
      issueFact(
        directionalSaveFact(prefix, "initialSaveAbility", "endTurnSaveAbility"),
        path,
      ),
    );
  if (
    save.dc.kind !== "caster_spell_save_dc" ||
    !spellMechanicsObjectHasOnlyKeys(save.dc, DC_FIELDS)
  )
    issues.push(
      issueFact(
        directionalSaveFact(prefix, "initialSaveDc", "endTurnSaveDc"),
        path,
      ),
    );
  if (
    save.onSuccess.kind !== "none" ||
    !spellMechanicsObjectHasOnlyKeys(save.onSuccess, NONE_FIELDS)
  )
    issues.push(
      issueFact(
        directionalSaveFact(prefix, "initialSaveSuccess", "endTurnSaveSuccess"),
        path,
      ),
    );
  return issues;
}

type DirectionalSaveFailureInspection = Readonly<{
  facts: SaveFacts | undefined;
  issues: readonly IssueFact[];
}>;

function directionalSaveFailureShapeIssues(
  onFail: DirectionalSave["onFail"],
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  const failureFact = directionalSaveFact(
    prefix,
    "initialSaveFailure",
    "endTurnSaveFailure",
  );
  if (onFail.kind !== "force_move") return [issueFact(failureFact, path)];
  return spellMechanicsObjectHasOnlyKeys<ForceMoveKeySpace>(
    onFail,
    FORCE_MOVE_FIELDS,
  )
    ? []
    : [issueFact(failureFact, path)];
}

function directionalSavePushKindIssue(
  onFail: DirectionalForceMove,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  return onFail.movementKind === "push"
    ? []
    : [
        issueFact(
          directionalSaveFact(prefix, "initialPushKind", "endTurnPushKind"),
          path,
        ),
      ];
}

function directionalSavePushDirectionIssue(
  onFail: DirectionalForceMove,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  if (onFail.movementKind !== "push")
    return [
      issueFact(
        directionalSaveFact(
          prefix,
          "initialPushDirection",
          "endTurnPushDirection",
        ),
        path,
      ),
    ];
  return onFail.originDirection === "away_from_caster"
    ? []
    : [
        issueFact(
          directionalSaveFact(
            prefix,
            "initialPushDirection",
            "endTurnPushDirection",
          ),
          path,
        ),
      ];
}

function directionalSavePushDistanceIssue(
  onFail: DirectionalForceMove,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  return onFail.distanceFeet === PUSH_FEET
    ? []
    : [
        issueFact(
          directionalSaveFact(
            prefix,
            "initialPushDistance",
            "endTurnPushDistance",
          ),
          path,
        ),
      ];
}

function directionalSaveFailureIssues(
  save: DirectionalSave,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): IssueFact[] {
  return [
    ...directionalSaveFailureShapeIssues(save.onFail, path, prefix),
    ...(save.onFail.kind === "force_move"
      ? [
          ...directionalSavePushKindIssue(save.onFail, path, prefix),
          ...directionalSavePushDirectionIssue(save.onFail, path, prefix),
          ...directionalSavePushDistanceIssue(save.onFail, path, prefix),
        ]
      : []),
  ];
}

function directionalSaveSupported(save: DirectionalSave): boolean {
  if (save.ability !== "str") return false;
  if (save.dc.kind !== "caster_spell_save_dc") return false;
  if (save.onSuccess.kind !== "none") return false;
  if (save.onFail.kind !== "force_move") return false;
  if (save.onFail.movementKind !== "push") return false;
  if (save.onFail.originDirection !== "away_from_caster") return false;
  return save.onFail.distanceFeet === PUSH_FEET;
}

function directionalSaveFacts(save: DirectionalSave): SaveFacts | undefined {
  if (!directionalSaveSupported(save)) return undefined;
  if (save.dc.kind !== "caster_spell_save_dc") return undefined;
  if (save.onFail.kind !== "force_move") return undefined;
  return {
    ability: "str",
    dc: save.dc,
    distance: movementFeet(PUSH_FEET),
  };
}

function directionalSaveFailureInspection(
  save: DirectionalSave,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
): DirectionalSaveFailureInspection {
  return {
    facts: directionalSaveFacts(save),
    issues: directionalSaveFailureIssues(save, path, prefix),
  };
}

function inspectDirectionalSave(
  save: Mechanics["initialPhase"] | Operation["effect"] | undefined,
  path: UnitMechanicsPath,
  prefix: "initial" | "endTurn",
  line: DirectionalLine | undefined,
): Readonly<{ facts: SaveFacts | undefined; issues: readonly IssueFact[] }> {
  if (save?.kind !== "save_gate")
    return {
      facts: undefined,
      issues: [
        issueFact(
          directionalSaveFact(prefix, "initialPhase", "endTurnSaveFailure"),
          path,
        ),
      ],
    };
  const failure = directionalSaveFailureInspection(save, path, prefix);
  return {
    facts: failure.facts,
    issues: [
      ...directionalSaveShellIssues(save, path, prefix, line),
      ...directionalSaveCoreIssues(save, path, prefix),
      ...failure.issues,
    ],
  };
}

type DirectionalDurationInspection = Readonly<{
  durationTicks: ElapsedTimeTicks | undefined;
  issues: readonly IssueFact[];
}>;

function directionalDurationTicks(
  durationValue: Duration["upTo"] | undefined,
): ElapsedTimeTicks | undefined {
  if (durationValue === undefined) return undefined;
  if (durationValue.unit !== "minute") return undefined;
  if (durationValue.amount !== DURATION_MINUTES) return undefined;
  if (!isSpellCanonicalDurationValue(durationValue)) return undefined;
  if (!spellMechanicsObjectHasOnlyKeys(durationValue, DURATION_VALUE_FIELDS))
    return undefined;
  return spellDurationTicksFromCanonicalValue(durationValue);
}

function directionalRangeSupported(range: Mechanics["range"]): boolean {
  return (
    range.kind === "self" &&
    spellMechanicsObjectHasOnlyKeys(range, RANGE_FIELDS)
  );
}

function directionalComponentsSupported(
  components: Mechanics["components"],
): boolean {
  return [
    components.v === true,
    components.s === true,
    components.m === MATERIAL,
    spellMechanicsObjectHasOnlyKeys<ComponentKeySpace>(
      components,
      COMPONENT_FIELDS,
    ),
  ].every(Boolean);
}

function directionalCastingTimeSupported(
  castingTime: Mechanics["castingTime"],
): boolean {
  return (
    castingTime.kind === "action" &&
    spellMechanicsObjectHasOnlyKeys(castingTime, CASTING_TIME_FIELDS)
  );
}

function directionalHeaderBasicIssues(mechanics: Mechanics): IssueFact[] {
  const issues: IssueFact[] = [];
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    issues.push(issueFact("mechanics", spellMechanicsRootPath()));
  if (mechanics.level !== LEVEL)
    issues.push(issueFact("level", spellMechanicsHeaderPath("level")));
  if (mechanics.school !== "evocation")
    issues.push(issueFact("school", spellMechanicsHeaderPath("school")));
  if (!directionalRangeSupported(mechanics.range))
    issues.push(issueFact("range", spellMechanicsHeaderPath("range")));
  if (!directionalComponentsSupported(mechanics.components))
    issues.push(
      issueFact("components", spellMechanicsHeaderPath("components")),
    );
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    issues.push(issueFact("components", path));
  if (!directionalCastingTimeSupported(mechanics.castingTime))
    issues.push(
      issueFact("castingTime", spellMechanicsHeaderPath("castingTime")),
    );
  return issues;
}

function directionalDurationInspection(
  mechanics: Mechanics,
): DirectionalDurationInspection {
  const duration =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const durationTicks = directionalDurationTicks(duration?.upTo);
  const issues: IssueFact[] = [];
  if (
    duration === undefined ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)
  )
    issues.push(issueFact("duration", spellMechanicsHeaderPath("duration")));
  if (durationTicks === undefined)
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      issues.push(issueFact("durationValue", path));
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    issues.push(
      issueFact(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      ),
    );
  return { durationTicks, issues };
}

function directionalHeaderIssues(
  mechanics: Mechanics,
): DirectionalDurationInspection {
  const duration = directionalDurationInspection(mechanics);
  return {
    durationTicks: duration.durationTicks,
    issues: [...directionalHeaderBasicIssues(mechanics), ...duration.issues],
  };
}

type DirectionalAttachmentInspection = Readonly<{
  line: DirectionalLine | undefined;
  issues: readonly IssueFact[];
}>;

function directionalLineFromArea(
  area: Extract<Attachment, { readonly kind: "area" }> | undefined,
): DirectionalLine | undefined {
  if (area === undefined) return undefined;
  if (area.origin.kind !== "self") return undefined;
  if (area.shape.kind !== "line") return undefined;
  if (area.shape.lengthFeet !== LENGTH_FEET) return undefined;
  if (area.shape.widthFeet !== WIDTH_FEET) return undefined;
  return area.shape;
}

function directionalAttachmentInspection(
  mechanics: Mechanics,
): DirectionalAttachmentInspection {
  const areaAdmission = admitSpellAreaAttachment(mechanics.attachment, [], []);
  if (areaAdmission.tag === "rejected")
    return {
      line: undefined,
      issues: [issueFact("attachment", spellOngoingAttachmentPath())],
    };
  const area =
    areaAdmission.attachment.kind === "hole"
      ? areaAdmission.attachment.value
      : undefined;
  const line = directionalLineFromArea(area);
  return {
    line,
    issues:
      line === undefined
        ? [issueFact("attachment", spellOngoingAttachmentPath())]
        : [],
  };
}

function directionalAuthoredConditionalIssues(
  mechanics: Mechanics,
): IssueFact[] {
  return (mechanics.authoredConditionalMechanics ?? []).map((_entry, index) =>
    issueFact(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    ),
  );
}

function directionalOperationSelectionIssues(
  occurrences: readonly Occurrence[],
  roleResolution: OperationRoleResolution,
): IssueFact[] {
  const selected = [
    roleResolution.assignment.strongWind,
    roleResolution.assignment.movementCost,
    roleResolution.assignment.endTurn,
    roleResolution.assignment.direction,
  ] as const;
  const selectedOrdinals = selected.flatMap((occurrence) =>
    occurrence === undefined ? [] : [occurrence.ordinal],
  );
  const ambiguousOrdinals = roleResolution.ambiguousOccurrences.map(
    ({ ordinal }) => ordinal,
  );
  const issues: IssueFact[] = [];
  for (const occurrence of occurrences)
    if (
      !selectedOrdinals.includes(occurrence.ordinal) &&
      !ambiguousOrdinals.includes(occurrence.ordinal)
    )
      issues.push(
        issueFact(
          "operationCount",
          spellOngoingOperationPath(occurrence.ordinal),
        ),
      );
  for (const occurrence of roleResolution.ambiguousOccurrences)
    issues.push(
      issueFact("operation", spellOngoingOperationPath(occurrence.ordinal)),
    );
  if (!roleResolution.hasCompleteAssignment)
    issues.push(issueFact("operationCount", spellMechanicsRootPath()));
  return issues;
}

function directionalOperationShellIssues(occurrence: Occurrence): IssueFact[] {
  const issues: IssueFact[] = [];
  if (!spellMechanicsObjectHasOnlyKeys(occurrence.operation, OPERATION_FIELDS))
    issues.push(
      issueFact("operation", spellOngoingOperationPath(occurrence.ordinal)),
    );
  for (const failedFact of spellOngoingOperationUnsupportedFacts(
    occurrence.operation,
  ))
    issues.push(
      issueFact(
        Match.value(failedFact).pipe(
          Match.when("predicate", () => "operationPredicate" as const),
          Match.when("targetLimit", () => "operationTargetLimit" as const),
          Match.when("usageLimit", () => "operationUsageLimit" as const),
          Match.exhaustive,
        ),
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
  return issues;
}

function directionalOperationShellIssuesForAll(
  occurrences: readonly Occurrence[],
): IssueFact[] {
  return occurrences.flatMap(directionalOperationShellIssues);
}

function directionalStrongWindIssues(
  occurrence: Occurrence | undefined,
): IssueFact[] {
  if (occurrence === undefined) return [];
  const issues: IssueFact[] = [];
  if (
    occurrence.operation.trigger.kind !== "passive" ||
    !spellMechanicsObjectHasOnlyKeys(
      occurrence.operation.trigger,
      PASSIVE_TRIGGER_FIELDS,
    )
  )
    issues.push(
      issueFact(
        "strongWindTrigger",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
  if (
    occurrence.operation.effect.kind !== "area_has_strong_wind" ||
    !spellMechanicsObjectHasOnlyKeys(
      occurrence.operation.effect,
      STRONG_WIND_FIELDS,
    )
  )
    issues.push(
      issueFact(
        "strongWindEffect",
        spellOngoingOperationEffectPath(occurrence.ordinal),
      ),
    );
  return issues;
}

function directionalMovementCostIssues(
  occurrence: Occurrence | undefined,
): IssueFact[] {
  if (occurrence === undefined) return [];
  const issues: IssueFact[] = [];
  if (
    occurrence.operation.trigger.kind !== "passive" ||
    !spellMechanicsObjectHasOnlyKeys(
      occurrence.operation.trigger,
      PASSIVE_TRIGGER_FIELDS,
    )
  )
    issues.push(
      issueFact(
        "movementCostTrigger",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
  if (
    occurrence.operation.effect.kind !== "area_movement_cost_multiplier" ||
    !spellMechanicsObjectHasOnlyKeys(
      occurrence.operation.effect,
      MOVEMENT_COST_FIELDS,
    )
  )
    issues.push(
      issueFact(
        "movementCostEffect",
        spellOngoingOperationEffectPath(occurrence.ordinal),
      ),
    );
  else {
    if (occurrence.operation.effect.multiplier !== 2)
      issues.push(
        issueFact(
          "movementCostMultiplier",
          spellOngoingOperationEffectPath(occurrence.ordinal),
        ),
      );
    if (occurrence.operation.effect.appliesTo !== "toward_source")
      issues.push(
        issueFact(
          "movementCostDirection",
          spellOngoingOperationEffectPath(occurrence.ordinal),
        ),
      );
  }
  return issues;
}

function directionalMovementCostFact(
  occurrence: Occurrence | undefined,
): Invocation["movementCost"] | undefined {
  const effect = occurrence?.operation.effect;
  if (effect?.kind !== "area_movement_cost_multiplier") return undefined;
  if (effect.multiplier !== 2) return undefined;
  if (effect.appliesTo !== "toward_source") return undefined;
  return { multiplier: 2, appliesTo: "towardSource" as const };
}

function directionalEndTurnTriggerIssues(
  occurrence: Occurrence | undefined,
): IssueFact[] {
  if (occurrence === undefined) return [];
  return occurrence.operation.trigger.kind ===
    "on_creature_ends_turn_in_area" &&
    spellMechanicsObjectHasOnlyKeys(
      occurrence.operation.trigger,
      END_TURN_TRIGGER_FIELDS,
    )
    ? []
    : [
        issueFact(
          "endTurnTrigger",
          spellOngoingOperationPath(occurrence.ordinal),
        ),
      ];
}

function directionalDirectionTriggerIssues(
  occurrence: Occurrence,
): IssueFact[] {
  const trigger = occurrence.operation.trigger;
  if (
    trigger.kind !== "on_caster_spends_action" ||
    !spellMechanicsObjectHasOnlyKeys(trigger, DIRECTION_TRIGGER_FIELDS)
  )
    return [
      issueFact(
        "directionTrigger",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    ];
  const issues: IssueFact[] = [];
  if (
    trigger.cost.kind !== "bonus_action" ||
    !spellMechanicsObjectHasOnlyKeys(trigger.cost, ACTION_COST_FIELDS)
  )
    issues.push(
      issueFact(
        "directionActionCost",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
  if (trigger.laterTurnsOnly !== true)
    issues.push(
      issueFact(
        "directionLaterTurns",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
  return issues;
}

function directionalDirectionEffectIssues(occurrence: Occurrence): IssueFact[] {
  const effect = occurrence.operation.effect;
  return effect.kind === "reposition_attachment" &&
    effect.maxMoveFeet === undefined &&
    spellMechanicsObjectHasOnlyKeys(effect, REPOSITION_FIELDS)
    ? []
    : [
        issueFact(
          "directionEffect",
          spellOngoingOperationEffectPath(occurrence.ordinal),
        ),
      ];
}

function directionalDirectionIssues(
  occurrence: Occurrence | undefined,
): IssueFact[] {
  if (occurrence === undefined) return [];
  return [
    ...directionalDirectionTriggerIssues(occurrence),
    ...directionalDirectionEffectIssues(occurrence),
  ];
}

type DirectionalOperationInspection = Readonly<{
  roleResolution: OperationRoleResolution;
  repeatedSave: SaveFacts | undefined;
  issues: readonly IssueFact[];
}>;

function directionalOperationInspection(
  mechanics: Mechanics,
  line: DirectionalLine | undefined,
): DirectionalOperationInspection {
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const roleResolution = directionalOperationAssignment(occurrences);
  const strongWind = roleResolution.assignment.strongWind;
  const movementCost = roleResolution.assignment.movementCost;
  const endTurn = roleResolution.assignment.endTurn;
  const direction = roleResolution.assignment.direction;
  const repeatedSaveInspection =
    endTurn === undefined
      ? { facts: undefined, issues: [] as readonly IssueFact[] }
      : inspectDirectionalSave(
          endTurn.operation.effect,
          spellOngoingOperationEffectPath(endTurn.ordinal),
          "endTurn",
          line,
        );
  return {
    roleResolution,
    repeatedSave: repeatedSaveInspection.facts,
    issues: [
      ...directionalOperationSelectionIssues(occurrences, roleResolution),
      ...directionalOperationShellIssuesForAll(occurrences),
      ...directionalStrongWindIssues(strongWind),
      ...directionalMovementCostIssues(movementCost),
      ...repeatedSaveInspection.issues,
      ...directionalEndTurnTriggerIssues(endTurn),
      ...directionalDirectionIssues(direction),
    ],
  };
}

type DirectionalRequiredScalarValues = Readonly<{
  durationTicks: ElapsedTimeTicks;
  line: DirectionalLine;
  initialSave: SaveFacts;
  repeatedSave: SaveFacts;
}>;

function directionalRequiredScalarValues(
  durationTicks: ElapsedTimeTicks | undefined,
  line: DirectionalLine | undefined,
  initialSave: SaveFacts | undefined,
  repeatedSave: SaveFacts | undefined,
): DirectionalRequiredScalarValues | undefined {
  if (durationTicks === undefined) return undefined;
  if (line === undefined) return undefined;
  if (initialSave === undefined) return undefined;
  if (repeatedSave === undefined) return undefined;
  return { durationTicks, line, initialSave, repeatedSave };
}

type DirectionalRequiredRoleValues = Readonly<{
  strongWind: Occurrence;
  movementCost: Occurrence;
  endTurn: Occurrence;
  direction: Occurrence;
  movementCostFact: Invocation["movementCost"];
}>;

function directionalRequiredRoleValues(
  assignment: ResolvedRoleAssignment,
  movementCostFact: Invocation["movementCost"] | undefined,
): DirectionalRequiredRoleValues | undefined {
  if (assignment.strongWind === undefined) return undefined;
  if (assignment.movementCost === undefined) return undefined;
  if (assignment.endTurn === undefined) return undefined;
  if (assignment.direction === undefined) return undefined;
  if (movementCostFact === undefined) return undefined;
  return {
    strongWind: assignment.strongWind,
    movementCost: assignment.movementCost,
    endTurn: assignment.endTurn,
    direction: assignment.direction,
    movementCostFact,
  };
}

type DirectionalRequiredValues = DirectionalRequiredScalarValues &
  DirectionalRequiredRoleValues;

function directionalRequiredValues(
  durationTicks: ElapsedTimeTicks | undefined,
  line: DirectionalLine | undefined,
  initialSave: SaveFacts | undefined,
  repeatedSave: SaveFacts | undefined,
  assignment: ResolvedRoleAssignment,
  movementCostFact: Invocation["movementCost"] | undefined,
): DirectionalRequiredValues | undefined {
  const scalar = directionalRequiredScalarValues(
    durationTicks,
    line,
    initialSave,
    repeatedSave,
  );
  if (scalar === undefined) return undefined;
  const roles = directionalRequiredRoleValues(assignment, movementCostFact);
  if (roles === undefined) return undefined;
  return { ...scalar, ...roles };
}

function directionalParsedInspection(
  source: SpellMechanicsAdmissionSource,
  required: DirectionalRequiredValues,
): Inspection {
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      durationTicks: required.durationTicks,
      lengthFeet: movementFeet(required.line.lengthFeet),
      widthFeet: movementFeet(required.line.widthFeet),
      rangeFeet: movementFeet(0),
      ability: required.initialSave.ability,
      dc: required.initialSave.dc,
      pushDistanceFeet: required.initialSave.distance,
      movementCost: required.movementCostFact,
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
        spellOngoingOperationPath(required.movementCost.ordinal),
        spellOngoingOperationEffectPath(required.movementCost.ordinal),
        spellOngoingOperationPath(required.endTurn.ordinal),
        spellOngoingOperationEffectPath(required.endTurn.ordinal),
        spellOngoingOperationPath(required.direction.ordinal),
        spellOngoingOperationEffectPath(required.direction.ordinal),
      ],
      unowned: [
        spellOngoingOperationPath(required.strongWind.ordinal),
        spellOngoingOperationEffectPath(required.strongWind.ordinal),
      ],
    },
  };
}

function inspectMechanics(source: SpellMechanicsAdmissionSource): Inspection {
  if (!isRepresentation(source.mechanics)) return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const header = directionalHeaderIssues(mechanics);
  const attachment = directionalAttachmentInspection(mechanics);
  const initialSave = inspectDirectionalSave(
    mechanics.initialPhase,
    spellOngoingInitialPhasePath(),
    "initial",
    attachment.line,
  );
  const operations = directionalOperationInspection(mechanics, attachment.line);
  const issues = [
    ...header.issues,
    ...attachment.issues,
    ...initialSave.issues,
    ...directionalAuthoredConditionalIssues(mechanics),
    ...operations.issues,
  ];
  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  const movementCostFact = directionalMovementCostFact(
    operations.roleResolution.assignment.movementCost,
  );
  const required = directionalRequiredValues(
    header.durationTicks,
    attachment.line,
    initialSave.facts,
    operations.repeatedSave,
    operations.roleResolution.assignment,
    movementCostFact,
  );
  if (required === undefined)
    return {
      tag: "unsupported",
      issues: [issueFact("mechanics", spellMechanicsRootPath())],
    };
  return directionalParsedInspection(source, required);
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
