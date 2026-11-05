import { Schema } from "effect";

export const CreationInputGuidanceSchema = Schema.Struct({
  holeId: Schema.String,
  fillSchema: Schema.Record(Schema.String, Schema.Unknown),
  instructions: Schema.String,
});
