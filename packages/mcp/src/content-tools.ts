import { Schema } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { isToolError } from "./tool-input-helpers.ts";

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
const ListSupportedUnitsOutputSchema = Schema.Struct({
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
  initiativeModifier: Schema.Number,
  attacks: Schema.Array(StatBlockAttackSummarySchema),
  damageVulnerabilities: StringArraySchema,
  damageResistances: StringArraySchema,
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
const listSupportedUnitsOutputSchema = mcpOutputJsonSchema(
  ListSupportedUnitsOutputSchema,
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
    name: "list_supported_units",
    description:
      "List currently installed Surface Unit ids grouped by kind. Use this to discover class, species, background, spell, weapon, armor, equipment, and feature ids that can appear in creation holes or battle acts.",
    inputSchema: emptyInputSchema,
    outputSchema: listSupportedUnitsOutputSchema,
  },
] as const;

const CONTENT_TOOL_NAMES = contentToolDefinitions.map((tool) => tool.name);
type ContentToolName = (typeof contentToolDefinitions)[number]["name"];

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
  if (isToolError(decoded)) return decoded;

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
  if (name === "list_supported_units") {
    return schemaJsonContent(ListSupportedUnitsOutputSchema, {
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
      "Call list_supported_units or create_character_draft to discover supported character ids.",
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

function groupUnitsByKind(units: readonly Readonly<Record<string, unknown>>[]) {
  const groups: Record<
    string,
    Array<{ readonly id: string; readonly name: string }>
  > = {};
  for (const unit of units) {
    const kind = typeof unit.kind === "string" ? unit.kind : "unknown";
    groups[kind] ??= [];
    groups[kind].push({ id: String(unit.id), name: String(unit.name) });
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

function statBlockSummary(record: Readonly<Record<string, unknown>>) {
  const statBlock = record.statBlock as Readonly<Record<string, unknown>>;
  return {
    statBlockId: String(record.id),
    displayName: String(statBlock.displayName),
    creatureType: String(statBlock.creatureType),
    armorClass: literalNumber(statBlock.ac),
    hitPoints: literalNumber(statBlock.hp),
    initiativeModifier: Number(statBlock.initiativeModifier),
    attacks: (
      (statBlock.actions as { readonly attacks?: readonly unknown[] })
        .attacks ?? []
    ).map((attack) => attackSummary(attack)),
    damageVulnerabilities: damageModifierTypes(statBlock.vulnerabilities),
    damageResistances: damageModifierTypes(statBlock.resistances),
    damageImmunities: damageModifierTypes(statBlock.immunities),
    conditionImmunities: conditionModifierTypes(statBlock.immunities),
    provenanceKind: provenanceField(record.provenance, "kind"),
    provenanceSection: provenanceField(record.provenance, "section"),
  };
}

function attackSummary(attack: unknown) {
  const record = attack as Readonly<Record<string, unknown>>;
  return {
    attackName: String(record.name),
    attackType: String(record.attackType),
    attackBonus: literalNumber(record.attackBonus),
    ...(typeof record.reachFeet === "number"
      ? { reachFeet: record.reachFeet }
      : {}),
    ...(isRecord(record.rangeFeet) &&
    typeof record.rangeFeet.normal === "number"
      ? { normalRangeFeet: record.rangeFeet.normal }
      : {}),
    ...(isRecord(record.rangeFeet) && typeof record.rangeFeet.long === "number"
      ? { longRangeFeet: record.rangeFeet.long }
      : {}),
    onHit: Array.isArray(record.onHit)
      ? record.onHit.map((effect) => JSON.stringify(effect))
      : [],
  };
}

function literalNumber(value: unknown): number {
  return isRecord(value) && typeof value.value === "number" ? value.value : 0;
}

function damageModifierTypes(value: unknown): string[] {
  return isRecord(value) && Array.isArray(value.damageTypes)
    ? value.damageTypes.map(String)
    : [];
}

function conditionModifierTypes(value: unknown): string[] {
  return isRecord(value) && Array.isArray(value.conditions)
    ? value.conditions.map(String)
    : [];
}

function provenanceField(value: unknown, key: "kind" | "section"): string {
  return isRecord(value) && typeof value[key] === "string" ? value[key] : "";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
