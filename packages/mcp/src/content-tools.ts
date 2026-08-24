import { Either, Match, Schema } from "effect";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";

import type { McpApplicationServices } from "./composition-root.ts";
import {
  handleInspectCatalogUnit,
  inspectCatalogUnitToolDefinition,
  inspectCatalogUnitToolName,
  InspectCatalogUnitInputSchema,
  type InspectCatalogUnitArgs,
} from "./catalog-unit-tool.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

const EmptyArgsSchema = Schema.Struct({});
const StringArraySchema = Schema.Array(Schema.String);
const WorkflowGuideOutputSchema = Schema.Struct({
  lifecycle: StringArraySchema,
  resultPaths: Schema.Record({ key: Schema.String, value: Schema.String }),
  acceptedInputs: Schema.Record({ key: Schema.String, value: Schema.String }),
  naturalLanguagePolicy: Schema.String,
  recovery: StringArraySchema,
  limits: StringArraySchema,
});
const UnitSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
const ListCatalogUnitsOutputSchema = Schema.Struct({
  unitsByKind: Schema.Record({
    key: Schema.String,
    value: Schema.Array(UnitSummarySchema),
  }),
  naturalLanguagePolicy: Schema.String,
  next: Schema.String,
});
const StatBlockAttackSummarySchema = Schema.Struct({
  attackName: Schema.String,
  attackType: Schema.String,
  attackBonus: Schema.Union(Schema.Number, Schema.Null),
  reachFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  normalRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  longRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  onHit: StringArraySchema,
});
const StatBlockSummarySchema = Schema.Struct({
  statBlockId: Schema.String,
  displayName: Schema.String,
  creatureType: Schema.String,
  armorClass: Schema.Union(Schema.Number, Schema.Null),
  hitPoints: Schema.Union(Schema.Number, Schema.Null),
  initiativeModifier: Schema.optionalWith(Schema.Number, { exact: true }),
  attacks: Schema.Array(StatBlockAttackSummarySchema),
  damageVulnerabilities: StringArraySchema,
  damageResistances: StringArraySchema,
  damageResistanceChoices: StringArraySchema,
  damageImmunities: StringArraySchema,
  conditionImmunities: StringArraySchema,
  provenanceKind: Schema.String,
  provenanceSection: Schema.String,
});
const ListStatBlocksOutputSchema = Schema.Struct({
  statBlocks: Schema.Array(StatBlockSummarySchema),
  next: Schema.String,
});

const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
const workflowGuideOutputSchema = mcpOutputJsonSchema(
  WorkflowGuideOutputSchema,
);
const listStatBlocksOutputSchema = mcpOutputJsonSchema(
  ListStatBlocksOutputSchema,
);
const listCatalogUnitsOutputSchema = mcpOutputJsonSchema(
  ListCatalogUnitsOutputSchema,
);

export const contentToolNames = {
  describeMcpWorkflow: "describe_mcp_workflow",
  listStatBlocks: "list_stat_blocks",
  listCatalogUnits: "list_catalog_units",
  inspectCatalogUnit: inspectCatalogUnitToolName,
} as const;
export const CONTENT_TOOL_NAMES = [
  contentToolNames.describeMcpWorkflow,
  contentToolNames.listStatBlocks,
  contentToolNames.listCatalogUnits,
  contentToolNames.inspectCatalogUnit,
] as const;
export type ContentToolName = (typeof CONTENT_TOOL_NAMES)[number];
type ContentToolCall =
  | {
      readonly name:
        | typeof contentToolNames.describeMcpWorkflow
        | typeof contentToolNames.listStatBlocks
        | typeof contentToolNames.listCatalogUnits;
      readonly args: Record<string, never>;
    }
  | {
      readonly name: typeof contentToolNames.inspectCatalogUnit;
      readonly args: InspectCatalogUnitArgs;
    };

export const contentToolDefinitions = [
  {
    name: contentToolNames.describeMcpWorkflow,
    title: "Describe MCP Workflow",
    description:
      "Return the agent-facing workflow guide, accepted fill shapes, result paths, supported intent aliases, and recovery rules for this MCP.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: workflowGuideOutputSchema,
  },
  {
    name: contentToolNames.listStatBlocks,
    title: "List Stat Blocks",
    description:
      "List every installed redistributable SRD Stat Block with ids, display names, attacks, defenses, and damage modifiers. Catalog presence does not imply that every source is executable in every workflow.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listStatBlocksOutputSchema,
  },
  {
    name: contentToolNames.listCatalogUnits,
    title: "List Catalog Units",
    description:
      "List every installed redistributable SRD Unit id grouped by kind. This reports catalog presence only; legal and executable sources still come from the consuming workflow's canonical discovery result.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: listCatalogUnitsOutputSchema,
  },
  inspectCatalogUnitToolDefinition,
] as const satisfies readonly ProtocolToolDefinition[];

type StatBlockAttack = NonNullable<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
>[number];

export type ContentToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isContentToolName(name: string): name is ContentToolName {
  return CONTENT_TOOL_NAMES.some((toolName) => toolName === name);
}

export function decodeContentToolCall(input: {
  readonly name: ContentToolName;
  readonly args: unknown;
}): Either.Either<ContentToolCall, ReturnType<typeof errorContent>> {
  return Match.value(input.name).pipe(
    Match.when(contentToolNames.describeMcpWorkflow, () =>
      Either.map(
        decodeToolArgs(
          EmptyArgsSchema,
          input.args,
          contentToolNames.describeMcpWorkflow,
        ),
        (args) => ({
          name: contentToolNames.describeMcpWorkflow,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.listStatBlocks, () =>
      Either.map(
        decodeToolArgs(
          EmptyArgsSchema,
          input.args,
          contentToolNames.listStatBlocks,
        ),
        (args) => ({
          name: contentToolNames.listStatBlocks,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.listCatalogUnits, () =>
      Either.map(
        decodeToolArgs(
          EmptyArgsSchema,
          input.args,
          contentToolNames.listCatalogUnits,
        ),
        (args) => ({
          name: contentToolNames.listCatalogUnits,
          args,
        }),
      ),
    ),
    Match.when(contentToolNames.inspectCatalogUnit, () =>
      Either.map(
        decodeToolArgs(
          InspectCatalogUnitInputSchema,
          input.args,
          contentToolNames.inspectCatalogUnit,
        ),
        (args) => ({
          name: contentToolNames.inspectCatalogUnit,
          args,
        }),
      ),
    ),
    Match.exhaustive,
  );
}

export function handleContentToolCall(
  services: McpApplicationServices,
  call: ContentToolCall,
): ContentToolResult {
  return Match.value(call).pipe(
    Match.when({ name: contentToolNames.describeMcpWorkflow }, () =>
      schemaJsonContent(WorkflowGuideOutputSchema, workflowGuide()),
    ),
    Match.when({ name: contentToolNames.listStatBlocks }, () =>
      schemaJsonContent(ListStatBlocksOutputSchema, {
        statBlocks: services.statBlockCatalog
          .listStatBlocks()
          .map((record) => statBlockSummary(record)),
        next: "Use these statBlockId values in start_battle statBlock combatants, or call select_stat_block to inspect one record.",
      }),
    ),
    Match.when({ name: contentToolNames.listCatalogUnits }, () =>
      schemaJsonContent(ListCatalogUnitsOutputSchema, {
        unitsByKind: groupUnitsByKind(services.unitLibrary.listUnits()),
        naturalLanguagePolicy:
          "Map user wording to returned Unit names and ids only when the intent is unambiguous. If a user says 'warrior', ask whether they mean Fighter before filling class_fighter.",
        next: "Use create_character_draft and discover_creation_holes for the authoritative holeId, optionId, and cardinality values before filling a draft.",
      }),
    ),
    Match.when({ name: contentToolNames.inspectCatalogUnit }, ({ args }) =>
      handleInspectCatalogUnit(services, args),
    ),
    Match.exhaustive,
  );
}

function workflowGuide() {
  return {
    lifecycle: [
      "Call list_catalog_units for catalog ids or create_character_draft to discover currently legal character choices.",
      "Call create_character_draft, then fill only holeIds and optionIds returned in holes. The draft.progression.initial choice is the whole Character Progression profile: starting class plus any post-start advancement entries.",
      "After every accepted fill_creation_holes call, use the returned storedDraft.revision as the next expectedRevision.",
      "Call finalize_character only when finalization.tag is ready or after holes are complete.",
      "Call list_stat_blocks for Stat Block ids. select_stat_block can store one id for inspection, but start_battle Stat Block combatants carry their own statBlockId.",
      "Call start_battle with a non-empty initialCombatants roster. Character-session combatants use characterId from list_characters; Stat Block combatants use statBlockId from list_stat_blocks.",
      "Use battle_lifecycle with applyInitiativeSwap or finalizeInitialInitiativeSetup during initial setup; while a Battle is active, use addCombatant or removeCombatant to change the roster. Add only an available Character Session or an installed Stat Block projection, and retry typed recovery with battleAndCharacterSessionsUnchanged when a transition is rejected.",
      "Call discover_battle_acts and copy a returned subject exactly.",
      "If an act has initialHoles, call fill_battle_hole with the typed subject and one typed fill at a time, reusing the same subject until result.tag is resolved.",
      "If an act has no holes, call resolve_battle_act with the typed subject.",
      "Call end_turn only when no transientBattleFills are pending.",
      "If end_turn asks for a Death Saving Throw hole, fill that pending subject before taking other battle actions.",
      "Call end_battle only when no transientBattleFills are pending, then list_characters for durable HP, zero-HP lifecycle, and Spell Slot handoff.",
      "Call query_character_session with one returned characterId and a discriminated query variant to inspect existing Character Sheet projections; it returns typed rejection while that character is in Battle and admits only ritual Spell Invocation inspection outside Battle.",
    ],
    resultPaths: {
      creationHoles: "holes",
      draftRevision: "draft.revision or storedDraft.revision",
      finalization: "finalization",
      characters: "characters",
      battleActs: "availableActs",
      followUpBattleHoles: "result.holes",
      pendingBattleFills: "session.transientBattleFills",
      battleCombatants: "snapshot.combatants",
      characterSessionOperation: "result",
      calendarTimeResult: "result",
      calendarTimeRecoveryHoles: "result.holes",
    },
    acceptedInputs: {
      choiceFill:
        '{"kind":"choice","holeId":"copy from holes[].holeId","optionIds":["copy from holes[].options[].optionId"]}',
      progressionFill:
        '{"kind":"choice","holeId":"cc:draft:draft.progression.initial","optionIds":["copy one progression profile optionId from holes[].options[]"]}',
      abilityScoresFill:
        '{"kind":"abilityScores","holeId":"copy from holes[].holeId","method":"standardArray","value":{"str":15,"dex":14,"con":13,"int":8,"wis":10,"cha":12}}',
      targetChoiceFill:
        '{"kind":"targetChoice","holeId":"copy from result.holes[] or initialHoles[]","value":"target combatantId","spatialFacts":[{"kind":"attackTargetInMeleeReach | attackTargetInRangedRange | spellTarget | grappleTargetWithinReach | attackerAllyWithin5FeetOfTarget","actorId":"table/caller combatantId when required","targetId":"table/caller combatantId when required","procedureRef":"copy from the target hole sourceProcedureRef or attack.selection procedureRef when required","attackAbility":"copy from attack.selection when present","attackDamageType":"copy from attack.selection when present","rangeBand":"normal | long when required"}]}',
      spellTargetAllocationFill:
        '{"kind":"spellTargetAllocation","holeId":"copy from result.holes[] or initialHoles[]","value":{"allocations":[{"targetId":"target combatantId","count":3}]},"spatialFacts":[{"kind":"spellTarget","casterId":"caster combatantId","targetId":"same target combatantId","sourceProcedureRef":"copy from the target hole sourceProcedureRef"}]}',
      attackRollFill:
        '{"kind":"attackRoll","holeId":"copy from result.holes[] or initialHoles[]","value":{"total":16,"naturalD20":14,"rollMode":"normal | advantage | disadvantage optional"}}',
      savingThrowOutcomeFill:
        '{"kind":"savingThrowOutcome","holeId":"copy from result.holes[] or initialHoles[]","value":{"area":{"originAnchorId":"table-supplied origin combatantId","affectedTargetIds":["table-supplied affected combatantId"]},"outcomes":[{"targetId":"same affected combatantId","succeeded":false}]}}',
      rolledDiceFill:
        '{"kind":"rolledDice","holeId":"copy exact damage-result hole id","value":[{"results":[5]}]}',
      characterSessionOperations:
        "apply_character_session_operation accepts atomic completeShortRest, interruptShortRest, completeLongRest, composed interruptLongRest histories with strictly increasing cumulativeRestedTicks boundaries and a final cumulative resumed segment, and passCalendarTime operations.",
    },
    naturalLanguagePolicy:
      "MCP does not own synonym lists for character options. Use returned Unit names/ids and current creation holes as the source of truth; ask a clarification for terms such as 'warrior' before selecting class_fighter.",
    recovery: [
      "On UNKNOWN_* errors, rediscover current sessions, holes, Stat Blocks, or battle acts.",
      "On revision errors, read storedDraft.revision and retry against the current draft.",
      "On BATTLE_ACT_NOT_AVAILABLE, call discover_battle_acts and use a current subject.",
      "On BATTLE_ACT_REQUIRES_HOLES, use fill_battle_hole instead of resolve_battle_act.",
      "On pending-fill errors, continue filling session.transientBattleFills.subject until the result resolves.",
      "Short Rest, composed Long Rest interruption/resumption, and calendar-time Stable recovery are supported through apply_character_session_operation; unresolved calendar recovery returns result.holes for a subsequent call, while a resumed Long Rest must supply strictly increasing cumulativeRestedTicks segments and its final cumulative segment in the same call.",
    ],
    limits: [
      "Use discover_creation_holes, list_characters, inspect_character_session, query_character_session, list_stat_blocks, and discover_battle_acts for the currently executable workflows, projections, and acts.",
      "Character creation exposes one draft.progression.initial fill for the selected progression profile; MCP does not expose a later level-1 class-entry fill.",
      "roll_dice is an optional independent raw-face roller: it returns bounded groups with server correlation only. It does not derive modifiers or outcomes, inspect or auto-fill Battle holes, retain history, or provide caller idempotency; calculations must use canonical returned facts.",
      "Character Session queries do not persist derived facts, expose generic out-of-Battle casting, maintain a spell ledger, or add search, pagination, indexing, or recommendation infrastructure.",
      "Revival workflows beyond the typed zero-HP character closeout remain unsupported.",
    ],
  };
}

function groupUnitsByKind(units: readonly UnitRecord[]) {
  const groups: Record<
    string,
    Array<{ readonly id: string; readonly name: string }>
  > = {};
  for (const unit of units) {
    const kind = unit.kind;
    groups[kind] ??= [];
    groups[kind].push({ id: unit.id, name: unit.name });
  }
  return Object.fromEntries(
    Object.entries(groups).map(([kind, values]) => [
      kind,
      values.sort((left, right) =>
        String(left.id).localeCompare(String(right.id)),
      ),
    ]),
  );
}

export function statBlockSummary(record: StatBlockRecord) {
  const statBlock = record.statBlock;
  return {
    statBlockId: record.id,
    displayName: statBlock.displayName,
    creatureType: stringCreatureType(record),
    armorClass: literalNumber(statBlock.ac),
    hitPoints: literalNumber(statBlock.hp),
    ...(statBlock.initiativeModifier === undefined
      ? {}
      : { initiativeModifier: statBlock.initiativeModifier }),
    attacks: (statBlock.actions?.attacks ?? []).map(attackSummary),
    damageVulnerabilities: damageModifierTypes(statBlock.vulnerabilities),
    damageResistances: damageModifierTypes(statBlock.resistances),
    damageResistanceChoices: damageResistanceChoices(statBlock.resistances),
    damageImmunities: damageModifierTypes(statBlock.immunities),
    conditionImmunities: conditionModifierTypes(statBlock.immunities),
    provenanceKind: record.provenance.kind,
    provenanceSection: record.provenance.section,
  };
}

function attackSummary(attack: StatBlockAttack) {
  return {
    attackName: attack.name,
    attackType: attack.attackType,
    attackBonus: literalNumber(attack.attackBonus),
    ...(typeof attack.reachFeet === "number"
      ? { reachFeet: attack.reachFeet }
      : {}),
    ...(attack.rangeFeet === undefined
      ? {}
      : { normalRangeFeet: attack.rangeFeet.normal }),
    ...(attack.rangeFeet === undefined
      ? {}
      : { longRangeFeet: attack.rangeFeet.long }),
    onHit: attack.onHit.map((effect) => JSON.stringify(effect)),
  };
}

function stringCreatureType(record: StatBlockRecord): string {
  const { creatureType } = record.statBlock;
  if (typeof creatureType === "string") {
    return creatureType;
  }
  return JSON.stringify(creatureType);
}

function literalNumber(
  value:
    | StatBlockRecord["statBlock"]["ac"]
    | StatBlockRecord["statBlock"]["hp"]
    | NonNullable<
        NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
      >[number]["attackBonus"],
): number | null {
  if (value.kind === "literal") {
    return value.value;
  }
  return null;
}

function damageModifierTypes(
  value:
    | StatBlockRecord["statBlock"]["vulnerabilities"]
    | StatBlockRecord["statBlock"]["resistances"]
    | Pick<
        NonNullable<StatBlockRecord["statBlock"]["immunities"]>,
        "damageTypes"
      >
    | undefined,
): string[] {
  if (value === undefined) {
    return [];
  }
  if ("kind" in value && value.kind === "choose_one_from") {
    return [];
  }
  return value.damageTypes === undefined ? [] : [...value.damageTypes];
}

function damageResistanceChoices(
  value: StatBlockRecord["statBlock"]["resistances"] | undefined,
): string[] {
  return value?.kind === "choose_one_from" ? [...value.options] : [];
}

function conditionModifierTypes(
  value: StatBlockRecord["statBlock"]["immunities"],
): string[] {
  return value?.conditions === undefined ? [] : [...value.conditions];
}
