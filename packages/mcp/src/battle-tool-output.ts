import { Schema } from "effect";

export const SelectStatBlockOutputSchema = Schema.Struct({
  selectedStatBlock: Schema.Any,
  session: Schema.Any,
});

export const BattleSessionOutputSchema = Schema.Struct({
  battleState: Schema.Any,
  snapshot: Schema.Any,
  session: Schema.Any,
});

export const BattleResolutionOutputSchema = Schema.Struct({
  result: Schema.Any,
  battleState: Schema.Any,
  snapshot: Schema.Any,
  session: Schema.Any,
});

export const EndBattleOutputSchema = Schema.Struct({
  endedBattleId: Schema.String,
  characters: Schema.Array(Schema.Any),
  session: Schema.Any,
});
