import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleSubjectSchema,
  CombatantId,
} from "@dnd/battle-runtime/protocol-codecs";
import { Schema } from "effect";

import type { McpSessionSnapshot } from "./session-store.ts";

const McpInitialInitiativeCombatantSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  initiative: Schema.Number,
  rollMode: Schema.Literals(["normal", "advantage", "disadvantage"]),
});

export const McpBattleStateSnapshotSchema = Schema.Union([
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
]);

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
  selectedStatBlockId: Schema.Union([Schema.String, Schema.Null]),
  battleState: McpBattleStateSnapshotSchema,
};

const McpTransientBattleFillsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fills: Schema.Array(BattleFillSchema),
  holes: Schema.NonEmptyArray(BattleHoleSchema),
  presentation: Schema.optionalKey(Schema.Never),
});

const McpPendingBattleHolesSchema = Schema.Union([
  Schema.NonEmptyArray(Schema.Unknown),
  Schema.Null,
]);

export const McpSessionSummarySchema = Schema.Struct({
  ...McpSessionSummaryFields,
  pendingBattleHoles: McpPendingBattleHolesSchema,
});

export const McpSessionSnapshotSchema = Schema.Struct({
  ...McpSessionSummaryFields,
  transientBattleFills: Schema.Union([
    McpTransientBattleFillsSchema,
    Schema.Null,
  ]),
});

export const McpActiveSessionSnapshotSchema = Schema.Struct({
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union([Schema.String, Schema.Null]),
  battleState: McpActiveBattleStateSnapshotSchema,
  transientBattleFills: Schema.Union([
    McpTransientBattleFillsSchema,
    Schema.Null,
  ]),
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
    pendingBattleHoles:
      snapshot.transientBattleFills === null
        ? null
        : snapshot.transientBattleFills.holes,
  };
}
