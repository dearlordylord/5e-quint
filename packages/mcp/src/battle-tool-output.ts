import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleSubjectSchema,
} from "@dnd/battle-runtime";
import { Schema } from "effect";

const JsonObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const BattleCombatantProjectionSchema = Schema.Struct({
  combatantId: Schema.String,
  displayName: Schema.String,
  initiative: Schema.Number,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  originKind: Schema.String,
  origin: JsonObjectSchema,
  zeroHpLifecycle: JsonObjectSchema,
});
const InitiativeEntrySchema = Schema.Struct({
  creature: Schema.String,
  initiative: Schema.Number,
});
const InitiativeStackSchema = Schema.Struct({
  round: Schema.Number,
  alreadyActed: Schema.Array(InitiativeEntrySchema),
  stillToAct: Schema.NonEmptyArray(InitiativeEntrySchema),
});
const BattleStateProjectionSchema = Schema.Struct({
  battleId: Schema.String,
  initiative: InitiativeStackSchema,
  combatants: Schema.Array(BattleCombatantProjectionSchema),
  currentTurnResources: JsonObjectSchema,
});
const BattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: Schema.String,
  displayName: Schema.String,
  originKind: Schema.String,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  armorClass: Schema.Number,
  defeated: Schema.Boolean,
  zeroHpLifecycle: JsonObjectSchema,
  conditions: Schema.Array(Schema.String),
  activeEffects: Schema.Array(JsonObjectSchema),
});
const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  label: Schema.String,
  summary: Schema.String,
  initialHoles: Schema.Array(BattleHoleSchema),
});
const BattleSnapshotSchema = Schema.Struct({
  battleId: Schema.String,
  round: Schema.Number,
  currentActorId: Schema.String,
  turnOrder: Schema.Array(Schema.String),
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
  acts: Schema.Array(AvailableBattleActSchema),
  currentTurnResources: JsonObjectSchema,
});
const McpSessionSnapshotSchema = Schema.Struct({
  draftIds: Schema.Array(Schema.String),
  sourceDraftIds: Schema.Array(Schema.String),
  selectedStatBlockId: Schema.Union(Schema.String, Schema.Null),
  activeBattle: Schema.Union(
    Schema.Struct({
      battleId: Schema.String,
      currentActorId: Schema.String,
    }),
    Schema.Null,
  ),
  transientBattleFills: Schema.Union(
    Schema.Struct({
      subject: BattleSubjectSchema,
      fills: Schema.Array(BattleFillSchema),
    }),
    Schema.Null,
  ),
});
const BattleResolutionResultSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("resolved"),
    snapshot: BattleSnapshotSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("needsHoles"),
    subject: BattleSubjectSchema,
    holes: Schema.Array(BattleHoleSchema),
    snapshot: BattleSnapshotSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    reason: Schema.String,
    message: Schema.String,
    snapshot: BattleSnapshotSchema,
  }),
);

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: JsonObjectSchema,
  session: McpSessionSnapshotSchema,
});

export const BattleSessionOutputSchema = Schema.Struct({
  battleState: Schema.Union(BattleStateProjectionSchema, Schema.Null),
  snapshot: Schema.Union(BattleSnapshotSchema, Schema.Null),
  session: McpSessionSnapshotSchema,
});

export const StartBattleOutputSchema = Schema.Struct({
  battleState: BattleStateProjectionSchema,
  snapshot: BattleSnapshotSchema,
  session: McpSessionSnapshotSchema,
});

export const BattleResolutionOutputSchema = Schema.Struct({
  result: BattleResolutionResultSchema,
  battleState: Schema.Union(BattleStateProjectionSchema, Schema.Null),
  snapshot: BattleSnapshotSchema,
  session: McpSessionSnapshotSchema,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  characters: Schema.Array(JsonObjectSchema),
  session: McpSessionSnapshotSchema,
});
