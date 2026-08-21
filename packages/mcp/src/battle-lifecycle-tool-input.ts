import { combatantId, type CombatantId } from "@dnd/battle-runtime";
import { Either, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const CombatantIdTextSchema = Schema.NonEmptyTrimmedString.annotations({
  description: "Combatant id from the current Battle projection.",
});

const InitiativeSwapCandidateWitnessSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("notAlly") }),
  Schema.Struct({ tag: Schema.Literal("unwillingAlly") }),
  Schema.Struct({ tag: Schema.Literal("willingAlly") }),
);

const ApplyInitiativeSwapOperationSchema = Schema.Struct({
  kind: Schema.Literal("applyInitiativeSwap"),
  sourceId: CombatantIdTextSchema,
  candidateId: CombatantIdTextSchema,
  candidateWitness: InitiativeSwapCandidateWitnessSchema,
});

const FinalizeInitialInitiativeSetupOperationSchema = Schema.Struct({
  kind: Schema.Literal("finalizeInitialInitiativeSetup"),
});

const BattleLifecycleOperationSchema = Schema.Union(
  ApplyInitiativeSwapOperationSchema,
  FinalizeInitialInitiativeSetupOperationSchema,
);

const BattleLifecycleArgsSchema = Schema.Struct({
  operation: BattleLifecycleOperationSchema,
});

type BattleLifecycleArgs = Schema.Schema.Type<typeof BattleLifecycleArgsSchema>;

export const battleLifecycleInputSchema = mcpObjectJsonSchema(
  BattleLifecycleArgsSchema,
);

export type BattleLifecycleToolInput = {
  readonly operation:
    | {
        readonly kind: "applyInitiativeSwap";
        readonly sourceId: CombatantId;
        readonly candidateId: CombatantId;
        readonly candidateWitness:
          | { readonly tag: "notAlly" }
          | { readonly tag: "unwillingAlly" }
          | { readonly tag: "willingAlly" };
      }
    | { readonly kind: "finalizeInitialInitiativeSetup" };
};

export function decodeBattleLifecycleArgs(
  args: unknown,
): ToolInputResult<BattleLifecycleToolInput> {
  const decoded = decodeToolArgs(
    BattleLifecycleArgsSchema,
    args,
    "battle_lifecycle",
  );
  return Either.map(decoded, ({ operation }) => ({
    operation: decodeBattleLifecycleOperation(operation),
  }));
}

function decodeBattleLifecycleOperation(
  operation: BattleLifecycleArgs["operation"],
): BattleLifecycleToolInput["operation"] {
  if (operation.kind === "finalizeInitialInitiativeSetup") {
    return operation;
  }
  return {
    kind: operation.kind,
    sourceId: combatantId(operation.sourceId),
    candidateId: combatantId(operation.candidateId),
    candidateWitness: operation.candidateWitness,
  };
}
