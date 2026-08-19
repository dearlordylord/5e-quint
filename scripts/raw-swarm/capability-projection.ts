import { Either, ParseResult, Schema } from "effect";

import type { ScenarioCharacterSdk } from "./sdk-player/scenario-character-contract.ts";
import type { ScenarioSetupSdk } from "./sdk-player/scenario-setup-contract.ts";
import type { PlayerSdk } from "./sdk-player/continuation-contract.ts";

/**
 * The projection is harness context, not a second D&D model. Public operation
 * names are checked against the contracts while summaries describe only the
 * boundary at which a role may use them.
 */
export const CAPABILITY_PROJECTION_SCHEMA_VERSION = 1 as const;
/**
 * Maximum rendered context for one role. The current largest view is about
 * 2.3 KiB, so 4 KiB leaves measured headroom without allowing a declaration
 * bundle to grow silently into model context.
 */
export const CAPABILITY_CONTEXT_MAX_BYTES = 4 * 1024;

export const CAPABILITY_ROLES = [
  "generation",
  "characterAuthoring",
  "setupAuthoring",
  "player",
  "review",
] as const;
export type CapabilityRole = (typeof CAPABILITY_ROLES)[number];

type PublicCapabilityOperation =
  | keyof ScenarioCharacterSdk
  | keyof ScenarioSetupSdk
  | keyof PlayerSdk;

export const PUBLIC_CAPABILITY_OPERATIONS = [
  "createCharacterDraft",
  "discoverCreationHoles",
  "fillCreationHoles",
  "finalizeCharacterDraft",
  "createFreshCharacterSheet",
  "startBattle",
  "createScenarioSession",
  "battleCreatureInitFromStatBlock",
  "characterSheetBattleInit",
  "tableAuthoredSpatialDecision",
  "discoverBattleActs",
  "scenarioRelation",
  "resolveBattleRuntimeSubject",
  "resolveScenarioMovement",
  "resolveBattleRuntimeInterrupt",
  "endBattleRuntimeTurn",
] as const satisfies readonly PublicCapabilityOperation[];
export type PublicCapabilityOperationName =
  (typeof PUBLIC_CAPABILITY_OPERATIONS)[number];

function operationOwnedByRole(
  role: CapabilityRole,
  operation: PublicCapabilityOperationName,
): boolean {
  return CANONICAL_CAPABILITIES.some(
    (capability) =>
      "operation" in capability &&
      capability.operation === operation &&
      capability.roles.some((candidate) => candidate === role),
  );
}

const CapabilityRoleSchema = Schema.Literal(...CAPABILITY_ROLES);
const CapabilityDescriptorSchema = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  roles: Schema.Array(CapabilityRoleSchema).pipe(Schema.minItems(1)),
  operation: Schema.optional(Schema.Literal(...PUBLIC_CAPABILITY_OPERATIONS)),
  summary: Schema.NonEmptyTrimmedString,
  boundary: Schema.NonEmptyTrimmedString,
}).pipe(
  Schema.filter(
    ({ roles, operation }) =>
      operation === undefined ||
      roles.every((role) => operationOwnedByRole(role, operation)),
    {
      message: () =>
        "A capability operation must be owned by every projected role.",
    },
  ),
);
const CapabilityBoundarySchema = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  roles: Schema.Array(CapabilityRoleSchema).pipe(Schema.minItems(1)),
  statement: Schema.NonEmptyTrimmedString,
});

export const CapabilityProjectionSchema = Schema.Struct({
  schemaVersion: Schema.Literal(CAPABILITY_PROJECTION_SCHEMA_VERSION),
  capabilities: Schema.Array(CapabilityDescriptorSchema).pipe(
    Schema.minItems(1),
  ),
  boundaries: Schema.Array(CapabilityBoundarySchema).pipe(Schema.minItems(1)),
}).pipe(
  Schema.filter(
    ({ capabilities, boundaries }) =>
      new Set(capabilities.map(({ id }) => id)).size === capabilities.length &&
      new Set(boundaries.map(({ id }) => id)).size === boundaries.length,
    {
      message: () =>
        "Capability projection capability and boundary ids must be unique.",
    },
  ),
);
export type CapabilityProjection = Schema.Schema.Type<
  typeof CapabilityProjectionSchema
>;
export type CapabilityDescriptor = Schema.Schema.Type<
  typeof CapabilityDescriptorSchema
>;
export type CapabilityBoundary = Schema.Schema.Type<
  typeof CapabilityBoundarySchema
>;

type CanonicalCapabilityDescriptor = {
  readonly id: string;
  readonly roles: readonly CapabilityRole[];
  readonly operation?: PublicCapabilityOperation;
  readonly summary: string;
  readonly boundary: string;
};

const CANONICAL_CAPABILITIES = [
  {
    id: "typed-stage-facts",
    roles: ["generation"],
    summary: "Emit typed planning facts alongside complete scenario prose.",
    boundary:
      "Facts select relevant harness stages; they are not prose parsing, a scenario DSL, or a D&D rules schema.",
  },
  {
    id: "scenario-admission-review",
    roles: ["generation", "review"],
    summary:
      "Retain separate RAW, content, SDK-capability, policy, and scenario-quality assessments.",
    boundary:
      "The assessments remain distinct fields in one review result; no assessment chooses tactics or rewrites the scenario.",
  },
  {
    id: "scenario-setup-review-surface",
    roles: ["generation", "review"],
    summary:
      "The public setup SDK initializes supplied canonical SRD Stat Blocks, starts Battle Runtime, and composes illumination, environment, objects, pairwise relationships, and one spatial source into ScenarioSession.",
    boundary:
      "Setup may use tactical-space inside its documented envelope or exact typed Table-authored decisions outside it; it does not invent combatants, rules, or an encounter side.",
  },
  {
    id: "battle-play-review-surface",
    roles: ["generation", "review"],
    summary:
      "The public player SDK discovers Battle acts and resolves their typed targets, rolls, damage, movement, interrupts, and End Turn continuations.",
    boundary:
      "A scenario is representable only when its required tactics can proceed through surfaced acts and holes; the controller cannot add a new action or override Table-owned facts.",
  },
  {
    id: "character-draft",
    roles: ["characterAuthoring"],
    operation: "createCharacterDraft",
    summary:
      "Create a canonical character draft from the supplied unit catalog.",
    boundary:
      "Use the catalog and public creation operations only; do not copy a build preset or invent a parallel build object.",
  },
  {
    id: "character-holes",
    roles: ["characterAuthoring"],
    operation: "discoverCreationHoles",
    summary: "Discover the current canonical character-creation choices.",
    boundary:
      "Select only options surfaced by the current holes and preserve the owner of battle-time choices.",
  },
  {
    id: "character-fill",
    roles: ["characterAuthoring"],
    operation: "fillCreationHoles",
    summary: "Fill canonical creation holes with controller-owned choices.",
    boundary:
      "Return a typed creation result and report a precise obstruction instead of fabricating unsupported content.",
  },
  {
    id: "character-finalize",
    roles: ["characterAuthoring"],
    operation: "finalizeCharacterDraft",
    summary: "Finalize the completed canonical character draft.",
    boundary:
      "Finalize only after all required creation holes are supplied; do not encode mutable adventuring state.",
  },
  {
    id: "fresh-character-sheet",
    roles: ["characterAuthoring"],
    operation: "createFreshCharacterSheet",
    summary:
      "Project a finalized build into a fresh canonical Character Sheet.",
    boundary:
      "The sheet is the runtime handoff; the projection does not define another character-sheet shape.",
  },
  {
    id: "battle-setup",
    roles: ["setupAuthoring"],
    operation: "startBattle",
    summary:
      "Start the canonical battle from supplied character and stat-block inputs.",
    boundary:
      "Project scenario-fixed setup facts only; leave Initiative, placement, and delegated Table choices to their owners.",
  },
  {
    id: "scenario-session",
    roles: ["setupAuthoring"],
    operation: "createScenarioSession",
    summary:
      "Compose the canonical battle session with the auxiliary scenario boundary.",
    boundary:
      "Keep geometry auxiliary and retain one source for each exact spatial question; do not add a map or spatial registry to battle state.",
  },
  {
    id: "stat-block-creature-init",
    roles: ["setupAuthoring"],
    operation: "battleCreatureInitFromStatBlock",
    summary:
      "Construct a battle creature from a supplied canonical stat block.",
    boundary:
      "Use the admitted catalog record; do not dispatch mechanics by authored name, id, slug, or provenance.",
  },
  {
    id: "character-battle-init",
    roles: ["setupAuthoring"],
    operation: "characterSheetBattleInit",
    summary: "Handoff a fresh Character Sheet to battle initialization.",
    boundary:
      "Consume the canonical sheet without changing its build, spells, equipment, or resources during setup.",
  },
  {
    id: "table-spatial-decision",
    roles: ["setupAuthoring"],
    operation: "tableAuthoredSpatialDecision",
    summary:
      "Record one typed Table-authored decision for an exact spatial question.",
    boundary:
      "The decision is lineage-bound, replayable, and independent of player Battle fills; it cannot restate an arbitrary fact.",
  },
  {
    id: "discover-battle-acts",
    roles: ["player"],
    operation: "discoverBattleActs",
    summary: "Discover the canonical acts at a subject-selection frontier.",
    boundary:
      "Choose only a surfaced act and do not rediscover acts while a subject is continuing through holes.",
  },
  {
    id: "scenario-relation",
    roles: ["player"],
    operation: "scenarioRelation",
    summary:
      "Read the current scenario relation for a supplied source and target.",
    boundary:
      "Use the relation as a Table-owned witness source; do not restate coordinates or derive a competing geometry fact in a fill.",
  },
  {
    id: "resolve-subject",
    roles: ["player"],
    operation: "resolveBattleRuntimeSubject",
    summary: "Resolve one surfaced battle subject with canonical fills.",
    boundary:
      "Carry the complete accepted fill prefix and latest session; preserve the public reducer protocol exactly.",
  },
  {
    id: "resolve-movement",
    roles: ["player"],
    operation: "resolveScenarioMovement",
    summary: "Resolve a supported movement route or its downstream holes.",
    boundary:
      "Submit ordinary public movement fills while the scenario session owns route consequences and spatial witnesses.",
  },
  {
    id: "resolve-interrupt",
    roles: ["player"],
    operation: "resolveBattleRuntimeInterrupt",
    summary: "Resolve a surfaced reaction or interrupt decision.",
    boundary:
      "Use only the surfaced interrupt fill and preserve the same linear session lineage.",
  },
  {
    id: "end-turn",
    roles: ["player"],
    operation: "endBattleRuntimeTurn",
    summary:
      "End the current battle turn through the canonical public operation.",
    boundary:
      "Ending a turn is a surfaced runtime operation, not a player-authored command vocabulary.",
  },
  {
    id: "post-play-evidence",
    roles: ["review"],
    summary: "Review bounded audit evidence against the immutable transcript.",
    boundary:
      "Use exact sequence pointers and retained artifacts; the projection never replaces the transcript or a RAW authority.",
  },
] as const satisfies readonly CanonicalCapabilityDescriptor[];

const CANONICAL_BOUNDARIES = [
  {
    id: "geometry-auxiliary",
    roles: ["generation", "setupAuthoring", "player", "review"],
    statement:
      "Tactical-space is an optional Table adapter. Geometry expansion is not a Battle Runtime or Target SDK completeness requirement.",
  },
  {
    id: "table-witness-ownership",
    roles: ["generation", "setupAuthoring", "player", "review"],
    statement:
      "One exact spatial question has one source: geometry-derived or Table-authored. A Table decision supplies the exact typed mechanical answer, such as a specific Cover degree, rather than an unresolved whether-question; the player cannot override it.",
  },
  {
    id: "ordinary-typescript",
    roles: ["characterAuthoring", "setupAuthoring", "player"],
    statement:
      "Authored modules are ordinary TypeScript against public contracts; the projection does not introduce a command language or copied D&D schema.",
  },
  {
    id: "declarations-compile-support",
    roles: ["characterAuthoring", "setupAuthoring", "player"],
    statement:
      "Emitted declarations exist only for isolated compilation. They are not a model-facing documentation bundle and must not be read wholesale.",
  },
  {
    id: "review-independence",
    roles: ["review"],
    statement:
      "RAW, content availability, SDK capability, artifact policy, scenario quality, and post-play evidence remain independently named responsibilities.",
  },
] as const satisfies readonly {
  readonly id: string;
  readonly roles: readonly CapabilityRole[];
  readonly statement: string;
}[];

export const CANONICAL_CAPABILITY_PROJECTION = {
  schemaVersion: CAPABILITY_PROJECTION_SCHEMA_VERSION,
  capabilities: CANONICAL_CAPABILITIES,
  boundaries: CANONICAL_BOUNDARIES,
} as const satisfies CapabilityProjection;

export type CapabilityProjectionView = {
  readonly schemaVersion: typeof CAPABILITY_PROJECTION_SCHEMA_VERSION;
  readonly role: CapabilityRole;
  readonly capabilities: readonly CapabilityDescriptor[];
  readonly boundaries: readonly CapabilityBoundary[];
};

export function capabilityProjectionFor(
  role: CapabilityRole,
): CapabilityProjectionView {
  return {
    schemaVersion: CAPABILITY_PROJECTION_SCHEMA_VERSION,
    role,
    capabilities: CANONICAL_CAPABILITY_PROJECTION.capabilities.filter((entry) =>
      entry.roles.some((candidate) => candidate === role),
    ),
    boundaries: CANONICAL_CAPABILITY_PROJECTION.boundaries.filter((entry) =>
      entry.roles.some((candidate) => candidate === role),
    ),
  };
}

function requireCapabilityContextWithinBudget(
  role: CapabilityRole,
  context: string,
): string {
  const bytes = Buffer.byteLength(context, "utf8");
  if (bytes > CAPABILITY_CONTEXT_MAX_BYTES) {
    throw new Error(
      `Capability context for ${role} exceeds the ${String(CAPABILITY_CONTEXT_MAX_BYTES)}-byte budget.`,
    );
  }
  return context;
}

export function capabilityContextForRole(role: CapabilityRole): string {
  const projection = capabilityProjectionFor(role);
  const capabilities = projection.capabilities
    .map(
      ({ id, operation, summary, boundary }) =>
        `- ${id}${operation === undefined ? "" : ` (${operation})`}: ${summary} Boundary: ${boundary}`,
    )
    .join("\n");
  const boundaries = projection.boundaries
    .map(({ id, statement }) => `- ${id}: ${statement}`)
    .join("\n");
  const context = [
    `Raw Swarm capability projection v${String(projection.schemaVersion)}`,
    `Role: ${role}`,
    "",
    "Supported public operations and role boundaries:",
    capabilities,
    "",
    "Experiment and evidence boundaries:",
    boundaries,
    "",
    "This bounded projection is the capability context. Do not replace it with a whole repository README, declaration tree, or copied D&D schema.",
  ].join("\n");
  return requireCapabilityContextWithinBudget(role, context);
}

export function parseCapabilityRole(
  value: unknown,
): Either.Either<CapabilityRole, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(CapabilityRoleSchema, {
    onExcessProperty: "error",
  })(value);
}
