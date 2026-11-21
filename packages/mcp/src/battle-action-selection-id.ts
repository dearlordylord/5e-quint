import { jsonSchemaPattern } from "@dnd/shared/json-schema";
import { Schema } from "effect";

export const BattleActionSelectionIdSchema = Schema.String.pipe(
  Schema.check(jsonSchemaPattern(/^battle-action-selection:[1-9][0-9]*$/u)),
  Schema.brand("BattleActionSelectionId"),
);

export type BattleActionSelectionId = typeof BattleActionSelectionIdSchema.Type;

export const CancelBattleActionArgsSchema = Schema.Struct({
  expectedSelectionId: BattleActionSelectionIdSchema,
});
