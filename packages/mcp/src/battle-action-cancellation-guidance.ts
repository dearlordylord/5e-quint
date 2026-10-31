import {
  BATTLE_ACTION_CANCELLATION_UNAVAILABLE_REASONS,
  battlePendingActionCancellationForSession,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Match, Schema } from "effect";
import { CancelBattleActionArgsSchema } from "./battle-action-selection-id.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";

export const BattleActionCancellationGuidanceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("available"),
    tool: Schema.Literal("cancel_battle_action"),
    arguments: CancelBattleActionArgsSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("unavailable"),
    reason: Schema.Literals(BATTLE_ACTION_CANCELLATION_UNAVAILABLE_REASONS),
  }),
]);

export type BattleActionCancellationGuidance =
  typeof BattleActionCancellationGuidanceSchema.Type;

export function battleActionCancellationGuidance(
  root: McpPlaySessionRoot,
  session: BattleRuntimeSession,
): BattleActionCancellationGuidance {
  const selection = root.sessionStore.getPendingBattleSelection();
  if (selection === null)
    return { kind: "unavailable", reason: "noPendingTransaction" };
  const cancellation = battlePendingActionCancellationForSession(
    selection.transaction,
    session,
  );
  return Match.value(cancellation).pipe(
    Match.when({ kind: "available" }, () => ({
      kind: "available" as const,
      tool: "cancel_battle_action" as const,
      arguments: { expectedSelectionId: selection.selectionId },
    })),
    Match.when({ kind: "unavailable" }, (unavailable) => unavailable),
    Match.exhaustive,
  );
}
