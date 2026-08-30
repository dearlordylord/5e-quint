import type { Schema } from "effect";
import type {
  SpellProcedureExecutionByProcedure,
  SpellProcedureKey,
} from "../../character-execution.ts";

// The registry is heterogeneous by procedure: each profile can have a
// different encoded wire shape, so its shared projection intentionally keeps
// Encoded as unknown while preserving the decoded execution and no-context
// service contract. Concrete profile schemas retain their own codec types at
// the profile boundary, and registry consumers encode through that codec.
export type SpellProcedureExecutionCodec<P extends SpellProcedureKey> =
  Schema.ConstraintCodec<
    SpellProcedureExecutionByProcedure[P],
    unknown,
    never,
    never
  >;
