import { NodeRuntime } from "@effect/platform-node";
import { parseUntypedTrace } from "@firfi/itf-trace-parser/effect";
import { Effect, Result, Schema } from "effect";

const Input = Schema.Struct({
  value: Schema.String,
});

const decoded = Schema.decodeUnknownResult(Input)({ value: "cohort" });
const result = Result.map(decoded, ({ value }) => value.length);
const trace = parseUntypedTrace({ vars: [], states: [] });
const program = Effect.succeed(result);

NodeRuntime.runMain(Effect.map(program, () => ({ decoded: result, trace })));
