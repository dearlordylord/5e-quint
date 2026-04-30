import { Either, Schema } from "effect";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

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
  attackBonus: Schema.Number,
  reachFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  normalRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  longRangeFeet: Schema.optionalWith(Schema.Number, { exact: true }),
  onHit: StringArraySchema,
});
const StatBlockSummarySchema = Schema.Struct({
  statBlockId: Schema.String,
  displayName: Schema.String,
  creatureType: Schema.String,
  armorClass: Schema.Number,
  hitPoints: Schema.Number,
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

export const contentToolDefinitions = [
  {
    name: "describe_mcp_workflow",
    description:
      "Return the agent-facing workflow guide, accepted fill shapes, result paths, supported intent aliases, and recovery rules for this MCP.",
    inputSchema: emptyInputSchema,
    outputSchema: workflowGuideOutputSchema,
  },
  {
    name: "list_stat_blocks",
    description:
      "List selectable SRD Stat Blocks with ids, display names, attacks, defenses, and damage modifiers for select_stat_block.",
    inputSchema: emptyInputSchema,
    outputSchema: listStatBlocksOutputSchema,
  },
  {
    name: "list_catalog_units",
    description:
      "List installed Surface Unit ids grouped by kind. This is catalog discovery only; legal choices still come from creation holes and battle acts.",
    inputSchema: emptyInputSchema,
    outputSchema: listCatalogUnitsOutputSchema,
  },
] as const;

const CONTENT_TOOL_NAMES = contentToolDefinitions.map((tool) => tool.name);
type ContentToolName = (typeof contentToolDefinitions)[number]["name"];
type StatBlockAttack = NonNullable<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
>[number];

export type ContentToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function isContentToolName(name: string): name is ContentToolName {
  return CONTENT_TOOL_NAMES.some((toolName) => toolName === name);
}

export function handleContentToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
): ContentToolResult {
  if (!isContentToolName(name)) {
    return errorContent(`Unknown Surface-runtime content tool: ${name}`);
  }
  const decoded = decodeToolArgs(EmptyArgsSchema, args, name);
  if (Either.isLeft(decoded)) return decoded.left;

  if (name === "describe_mcp_workflow") {
    return schemaJsonContent(WorkflowGuideOutputSchema, workflowGuide());
  }
  if (name === "list_stat_blocks") {
    return schemaJsonContent(ListStatBlocksOutputSchema, {
      statBlocks: root.statBlockCatalog
        .listStatBlocks()
        .map((record) => statBlockSummary(record)),
      next: "Call select_stat_block with one of these statBlockId values before start_battle.",
    });
  }
  if (name === "list_catalog_units") {
    return schemaJsonContent(ListCatalogUnitsOutputSchema, {
      unitsByKind: groupUnitsByKind(root.unitLibrary.listUnits()),
      naturalLanguagePolicy:
        "Map user wording to returned Unit names and ids only when the intent is unambiguous. If a user says 'warrior', ask whether they mean Fighter before filling class_fighter.",
      next: "Use create_character_draft and discover_creation_holes for the authoritative holeId, optionId, and cardinality values before filling a draft.",
    });
  }

  const unhandled: never = name;
  return errorContent(`Unhandled Surface-runtime content tool: ${unhandled}`);
}

function workflowGuide() {
  return {
    lifecycle: [
      "Call list_catalog_units for catalog ids or create_character_draft to discover currently legal character choices.",
      "Call create_character_draft, then fill only holeIds and optionIds returned in holes.",
      "After every accepted fill_creation_holes call, use the returned storedDraft.revision as the next expectedRevision.",
      "Call finalize_character only when finalization.tag is ready or after holes are complete.",
      "Call list_stat_blocks, then select_stat_block with a returned statBlockId.",
      "Call start_battle with non-empty characters. sourceDraftId comes from list_characters, combatantId is the battle actor id, and characterId is the durable character identity for handoff.",
      "Call discover_battle_acts and copy a returned subject exactly.",
      "If an act has initialHoles, call fill_battle_hole with one fill at a time, reusing the same subject until result.tag is resolved.",
      "If an act has no holes, call resolve_battle_act with the returned subject.",
      "Call end_turn only when no transientBattleFills are pending.",
      "Call end_battle only when no transientBattleFills are pending, then list_characters for durable HP and Spell Slot handoff.",
    ],
    resultPaths: {
      creationHoles: "holes",
      draftRevision: "draft.revision or storedDraft.revision",
      finalization: "finalization",
      characters: "characters",
      battleActs: "snapshot.acts",
      followUpBattleHoles: "result.holes",
      pendingBattleFills: "session.transientBattleFills",
      battleCombatants: "battleState.combatants",
    },
    acceptedInputs: {
      choiceFill:
        '{"kind":"choice","holeId":"copy from holes[].holeId","optionIds":["copy from holes[].options[].optionId"]}',
      abilityScoresFill:
        '{"kind":"abilityScores","holeId":"copy from holes[].holeId","method":"standardArray","value":{"str":15,"dex":14,"con":13,"int":8,"wis":10,"cha":12}}',
      targetChoiceFill:
        '{"kind":"targetChoice","holeId":"copy from result.holes[] or initialHoles[]","value":"target combatantId"}',
      attackRollFill:
        '{"kind":"attackRoll","holeId":"copy from result.holes[] or initialHoles[]","value":{"total":16,"naturalD20":14,"rollMode":"normal | advantage | disadvantage optional"}}',
      rolledDiceFill:
        '{"kind":"rolledDice","holeId":"copy exact damage-result hole id","value":[{"results":[5]}]}',
    },
    naturalLanguagePolicy:
      "MCP does not own synonym lists for character options. Use returned Unit names/ids and current creation holes as the source of truth; ask a clarification for terms such as 'warrior' before selecting class_fighter.",
    recovery: [
      "On UNKNOWN_* errors, rediscover current sessions, holes, Stat Blocks, or battle acts.",
      "On revision errors, read storedDraft.revision and retry against the current draft.",
      "On BATTLE_ACT_NOT_AVAILABLE, call discover_battle_acts and use a current subject.",
      "On BATTLE_ACT_REQUIRES_HOLES, use fill_battle_hole instead of resolve_battle_act.",
      "On pending-fill errors, continue filling session.transientBattleFills.subject until the result resolves.",
    ],
    limits: [
      "The current slice supports Orc Soldier Fighter 1, Orc Soldier Fighter 2, Orc Soldier Wizard 1, Goblin Warrior, and Skeleton workflows.",
      "MCP does not roll dice. Use user-provided or external dice results.",
      "Post-battle handoff for 0 HP characters is still outside this slice.",
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

function statBlockSummary(record: StatBlockRecord) {
  const statBlock = record.statBlock;
  return {
    statBlockId: record.id,
    displayName: statBlock.displayName,
    creatureType: stringCreatureType(record),
    armorClass: literalNumber(statBlock.ac, `${record.id}.statBlock.ac`),
    hitPoints: literalNumber(statBlock.hp, `${record.id}.statBlock.hp`),
    ...(statBlock.initiativeModifier === undefined
      ? {}
      : { initiativeModifier: statBlock.initiativeModifier }),
    attacks: (statBlock.actions?.attacks ?? []).map((attack) =>
      attackSummary(record, attack),
    ),
    damageVulnerabilities: damageModifierTypes(statBlock.vulnerabilities),
    damageResistances: damageModifierTypes(statBlock.resistances),
    damageResistanceChoices: damageResistanceChoices(statBlock.resistances),
    damageImmunities: damageModifierTypes(statBlock.immunities),
    conditionImmunities: conditionModifierTypes(statBlock.immunities),
    provenanceKind: record.provenance.kind,
    provenanceSection: record.provenance.section,
  };
}

function attackSummary(statBlock: StatBlockRecord, attack: StatBlockAttack) {
  return {
    attackName: attack.name,
    attackType: attack.attackType,
    attackBonus: literalNumber(
      attack.attackBonus,
      `${statBlock.id}.actions.${attack.name}.attackBonus`,
    ),
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
  throw new Error(
    `Stat Block discovery requires a concrete creatureType: ${record.id}`,
  );
}

function literalNumber(
  value:
    | StatBlockRecord["statBlock"]["ac"]
    | StatBlockRecord["statBlock"]["hp"]
    | NonNullable<
        NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
      >[number]["attackBonus"],
  field: string,
): number {
  if (value.kind === "literal") {
    return value.value;
  }
  throw new Error(`Stat Block discovery requires a literal number: ${field}`);
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
