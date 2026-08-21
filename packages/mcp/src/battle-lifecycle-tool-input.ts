import { combatantId, type CombatantId } from "@dnd/battle-runtime";
import { Either, Match, Schema } from "effect";

import {
  BattleCombatantArgsSchema,
  decodeBattleCombatant,
  type BattleCombatantToolInput,
} from "./start-battle-tool-input.ts";
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

const AddCombatantOperationSchema = Schema.Struct({
  kind: Schema.Literal("addCombatant"),
  combatant: BattleCombatantArgsSchema.annotations({
    description:
      "A finalized Character Session or installed SRD Stat Block projection admitted by the existing Battle owners.",
  }),
});

const RemoveCombatantOperationSchema = Schema.Struct({
  kind: Schema.Literal("removeCombatant"),
  combatantId: CombatantIdTextSchema,
});

const BattleLifecycleOperationSchema = Schema.Union(
  ApplyInitiativeSwapOperationSchema,
  FinalizeInitialInitiativeSetupOperationSchema,
  AddCombatantOperationSchema,
  RemoveCombatantOperationSchema,
);

const BattleLifecycleArgsSchema = Schema.Struct({
  operation: BattleLifecycleOperationSchema,
});

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
    | { readonly kind: "finalizeInitialInitiativeSetup" }
    | {
        readonly kind: "addCombatant";
        readonly combatant: BattleCombatantToolInput;
      }
    | {
        readonly kind: "removeCombatant";
        readonly combatantId: CombatantId;
      };
};

export function decodeBattleLifecycleArgs(
  args: unknown,
): ToolInputResult<BattleLifecycleToolInput> {
  const decoded = decodeToolArgs(
    BattleLifecycleArgsSchema,
    args,
    "battle_lifecycle",
  );
  if (Either.isLeft(decoded)) return Either.left(decoded.left);

  return Match.value(decoded.right.operation).pipe(
    Match.when({ kind: "applyInitiativeSwap" }, (operation) =>
      Either.right({
        operation: {
          kind: "applyInitiativeSwap" as const,
          sourceId: combatantId(operation.sourceId),
          candidateId: combatantId(operation.candidateId),
          candidateWitness: operation.candidateWitness,
        },
      }),
    ),
    Match.when({ kind: "finalizeInitialInitiativeSetup" }, () =>
      Either.right({
        operation: { kind: "finalizeInitialInitiativeSetup" as const },
      }),
    ),
    Match.when({ kind: "addCombatant" }, (operation) =>
      Either.right({
        operation: {
          kind: "addCombatant" as const,
          combatant: decodeBattleCombatant(operation.combatant),
        },
      }),
    ),
    Match.when({ kind: "removeCombatant" }, (operation) =>
      Either.right({
        operation: {
          kind: "removeCombatant" as const,
          combatantId: combatantId(operation.combatantId),
        },
      }),
    ),
    Match.exhaustive,
  );
}
