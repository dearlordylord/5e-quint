import { combatantId, type CombatantId } from "@dnd/battle-runtime";
import { Either, Match, Schema } from "effect";

import {
  BattleCombatantArgsSchema,
  decodeBattleCombatantArgs,
  type BattleCombatantToolInput,
} from "./start-battle-tool-input.ts";
import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const RemoveCombatantOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("removeCombatant"),
  combatantId: Schema.NonEmptyTrimmedString.annotations({
    description: "Combatant id from the current Battle snapshot.",
  }),
});

const AddCombatantOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("addCombatant"),
  combatant: BattleCombatantArgsSchema.annotations({
    description:
      "A finalized Character Session or installed SRD Stat Block projection admitted by the existing Battle owners.",
  }),
});

export const BattleLifecycleOperationArgsSchema = Schema.Union(
  AddCombatantOperationArgsSchema,
  RemoveCombatantOperationArgsSchema,
);

const BattleLifecycleArgsSchema = Schema.Struct({
  operation: BattleLifecycleOperationArgsSchema,
});

export const applyBattleLifecycleOperationInputSchema = mcpObjectJsonSchema(
  BattleLifecycleArgsSchema,
);

export type BattleLifecycleOperation =
  | {
      readonly kind: "addCombatant";
      readonly combatant: BattleCombatantToolInput;
    }
  | {
      readonly kind: "removeCombatant";
      readonly combatantId: CombatantId;
    };

export type ApplyBattleLifecycleOperationToolInput = {
  readonly operation: BattleLifecycleOperation;
};

export function decodeApplyBattleLifecycleOperationArgs(
  args: unknown,
): ToolInputResult<ApplyBattleLifecycleOperationToolInput> {
  const decoded = decodeToolArgs(
    BattleLifecycleArgsSchema,
    args,
    "apply_battle_lifecycle_operation",
  );
  if (Either.isLeft(decoded)) return Either.left(decoded.left);

  return Match.value(decoded.right.operation).pipe(
    Match.when({ kind: "addCombatant" }, (operation) =>
      Either.map(
        decodeBattleCombatantArgs(
          operation.combatant,
          "apply_battle_lifecycle_operation",
        ),
        (combatant) => ({
          operation: { kind: "addCombatant" as const, combatant },
        }),
      ),
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
