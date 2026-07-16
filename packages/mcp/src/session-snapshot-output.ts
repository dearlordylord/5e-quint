import { BattleFillSchema, BattleSubjectSchema } from "@dnd/battle-runtime";
import { Schema } from "effect";

import type { McpSessionSnapshot } from "./session-store.ts";

const CharacterToolSessionSnapshotFields = {
  draftIds: Schema.Array(Schema.String),
  characterIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  activeBattle: Schema.Union(
    Schema.Struct({
      battleId: Schema.String,
      currentActorId: Schema.String,
    }),
    Schema.Null,
  ),
};

export const CharacterToolSessionSnapshotSchema = Schema.Struct(
  CharacterToolSessionSnapshotFields,
);

export const McpSessionSnapshotSchema = Schema.Struct({
  ...CharacterToolSessionSnapshotFields,
  transientBattleFills: Schema.Union(
    Schema.Struct({
      subject: BattleSubjectSchema,
      fills: Schema.Array(BattleFillSchema),
    }),
    Schema.Null,
  ),
});

export type CharacterToolSessionSnapshot =
  typeof CharacterToolSessionSnapshotSchema.Type;

export function characterToolSessionSnapshot(
  snapshot: McpSessionSnapshot,
): CharacterToolSessionSnapshot {
  return {
    draftIds: snapshot.draftIds,
    characterIds: snapshot.characterIds,
    selectedStatBlockId: snapshot.selectedStatBlockId,
    activeBattle: snapshot.activeBattle,
  };
}
