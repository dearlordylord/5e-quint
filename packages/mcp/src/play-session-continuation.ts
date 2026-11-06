import {
  retainBattleRuntimeContinuation,
  retainInitialInitiativeSetup,
  type BattleRuntimeContinuation,
} from "@dnd/battle-runtime";
import type { GeneratorState } from "@drdice/prng";
import { Match, Result } from "effect";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { McpSessionStoreContinuation } from "./session-store.ts";
import type { BattleActionSelectionId } from "./battle-action-selection-id.ts";

type BattleCheckpoint = Omit<BattleRuntimeContinuation, "pending"> & {
  readonly pending: null;
};
type PendingBattleContinuation = Omit<BattleRuntimeContinuation, "pending"> & {
  readonly pending: NonNullable<BattleRuntimeContinuation["pending"]>;
};

type BattleContinuation =
  | { readonly tag: "none" }
  | ({ readonly tag: "activeBattle" } & (
      | { readonly battle: BattleCheckpoint; readonly selectionId: null }
      | {
          readonly battle: PendingBattleContinuation;
          readonly selectionId: BattleActionSelectionId;
        }
    ))
  | {
      readonly tag: "initialInitiativeSetup";
      readonly battle: BattleCheckpoint;
      readonly consumedSwapSources: ReturnType<
        typeof retainInitialInitiativeSetup
      >["consumedSwapSources"];
    };

export type PlaySessionContinuation = {
  readonly drafts: McpSessionStoreContinuation["drafts"];
  readonly characters: McpSessionStoreContinuation["characters"];
  readonly selectedStatBlockId: McpSessionStoreContinuation["selectedStatBlockId"];
  readonly selectionOrdinal: bigint;
  readonly battle: BattleContinuation;
  readonly dice: GeneratorState;
};

export function retainPlaySessionContinuation(
  root: McpPlaySessionRoot,
): Result.Result<PlaySessionContinuation, string> {
  const store = root.sessionStore.retainContinuation();
  const battle = Match.value(store.battleState).pipe(
    Match.when({ tag: "none" }, () => Result.succeed({ tag: "none" as const })),
    Match.when({ tag: "activeBattle" }, ({ session }) =>
      Result.flatMap(
        retainBattleRuntimeContinuation(
          session,
          store.actionSelection.selection?.transaction ?? null,
        ),
        (
          battle,
        ): Result.Result<
          Extract<BattleContinuation, { tag: "activeBattle" }>,
          string
        > => {
          const selection = store.actionSelection.selection;
          if (battle.pending === null) {
            if (selection !== null)
              return Result.fail(
                "The selected Battle action has no pending continuation.",
              );
            return Result.succeed({
              tag: "activeBattle" as const,
              battle: { ...battle, pending: null },
              selectionId: null,
            });
          }
          if (selection === null)
            return Result.fail(
              "The pending Battle action has no selection identity.",
            );
          return Result.succeed({
            tag: "activeBattle" as const,
            battle: { ...battle, pending: battle.pending },
            selectionId: selection.selectionId,
          });
        },
      ),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, ({ setup }) => {
      const retained = retainInitialInitiativeSetup(setup);
      if (!retained.open)
        return Result.fail(
          "A finished initiative workflow cannot be retained as an open setup.",
        );
      return Result.flatMap(
        retainBattleRuntimeContinuation(retained.session, null),
        (battle) =>
          battle.pending === null
            ? Result.succeed({
                tag: "initialInitiativeSetup" as const,
                battle: { ...battle, pending: null },
                consumedSwapSources: retained.consumedSwapSources,
              })
            : Result.fail(
                "An initiative setup cannot own a pending Battle action.",
              ),
      );
    }),
    Match.exhaustive,
  );
  return Result.map(battle, (battle) => ({
    drafts: store.drafts,
    characters: store.characters,
    selectedStatBlockId: store.selectedStatBlockId,
    selectionOrdinal: store.actionSelection.ordinal,
    battle,
    dice: root.diceSampling.retainContinuation(),
  }));
}
