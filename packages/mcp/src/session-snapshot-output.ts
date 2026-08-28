import { CombatantId } from "@dnd/battle-runtime";
import { Schema } from "effect";

import type { McpSessionSnapshot } from "./session-store.ts";

const McpInitialInitiativeCombatantSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  initiative: Schema.Number,
  rollMode: Schema.Literal("normal", "advantage", "disadvantage"),
});

export const McpBattleStateSnapshotSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("none"),
  }),
  Schema.Struct({
    tag: Schema.Literal("initialInitiativeSetup"),
    battleId: Schema.String,
    combatants: Schema.Array(McpInitialInitiativeCombatantSnapshotSchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("activeBattle"),
    battleId: Schema.String,
    currentActorId: CombatantId,
  }),
);

export const McpNoneBattleStateSnapshotSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});
export const McpInitialInitiativeSetupSnapshotSchema = Schema.Struct({
  tag: Schema.Literal("initialInitiativeSetup"),
  battleId: Schema.String,
  combatants: Schema.Array(McpInitialInitiativeCombatantSnapshotSchema),
});
export const McpActiveBattleStateSnapshotSchema = Schema.Struct({
  tag: Schema.Literal("activeBattle"),
  battleId: Schema.String,
  currentActorId: CombatantId,
});

const McpSessionSummaryFields = {
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  battleState: McpBattleStateSnapshotSchema,
};

export const McpSessionSummarySchema = Schema.Struct({
  ...McpSessionSummaryFields,
});

export const McpNoneSessionSnapshotSchema = Schema.Struct({
  ...McpSessionSummaryFields,
  battleState: McpNoneBattleStateSnapshotSchema,
});

export const McpSessionSnapshotSchema = Schema.Struct({
  ...McpSessionSummaryFields,
});

export const McpActiveSessionSnapshotSchema = Schema.Struct({
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  battleState: McpActiveBattleStateSnapshotSchema,
});

export const McpInitialInitiativeSetupSessionSnapshotSchema = Schema.Struct({
  ...McpSessionSummaryFields,
  battleState: McpInitialInitiativeSetupSnapshotSchema,
});

export type McpSessionSummary = typeof McpSessionSummarySchema.Type;
export type McpActiveSessionSnapshot =
  typeof McpActiveSessionSnapshotSchema.Type;

export function mcpSessionSummary(
  snapshot: McpSessionSnapshot,
): McpSessionSummary {
  return {
    draftIds: snapshot.draftIds,
    characterIds: snapshot.characterIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    battleState: snapshot.battleState,
  };
}
