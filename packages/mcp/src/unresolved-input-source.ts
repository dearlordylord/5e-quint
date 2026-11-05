import { Schema } from "effect";

const OperationResultInputPathSchema = Schema.String.check(
  Schema.isPattern(/^\$\./u),
).pipe(Schema.brand("OperationResultInputPath"));

export const UnresolvedInputSourceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("operationResult"),
    path: OperationResultInputPathSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("pendingBattle") }),
]);
export type UnresolvedInputSource = typeof UnresolvedInputSourceSchema.Type;

export type OperationResultPath = `$.${string}`;

export function operationResultInputSource(path: OperationResultPath) {
  return {
    kind: "operationResult" as const,
    path: Schema.decodeSync(OperationResultInputPathSchema)(path),
  };
}
