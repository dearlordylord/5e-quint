import {
  restoreBattleRuntimeContinuation,
  restoreInitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { Match, Option, Result } from "effect";
import type {
  McpApplicationServices,
  McpPlaySessionRoot,
} from "./composition-root.ts";
import { createMcpSessionStore } from "./session-store.ts";
import {
  createDiceSamplingService,
  type DiceSeed,
} from "./dice-sampling-service.ts";
import { disabledAdminMirrorPublication } from "./admin-mirror.ts";
import { rebuildCharacterSheetForOperation } from "./character-session-sheet-rebuild.ts";
import { selectionOrdinalOwnsId } from "./battle-action-selection-store.ts";
import type { PlaySessionContinuation } from "./play-session-continuation.ts";

export function restorePlaySessionContinuation(
  services: McpApplicationServices,
  seed: DiceSeed,
  continuation: PlaySessionContinuation,
): Result.Result<McpPlaySessionRoot, string> {
  if (continuation.selectionOrdinal < 0n)
    return Result.fail("Saved Battle selection ordinal must be nonnegative.");
  if (
    continuation.selectedStatBlockId !== null &&
    Option.isNone(
      services.statBlockCatalog.getStatBlock(continuation.selectedStatBlockId),
    )
  )
    return Result.fail("Saved selected Stat Block is unavailable.");
  for (const [draftId, draft] of continuation.drafts) {
    if (draftId !== draft.draftId)
      return Result.fail("Saved Character Draft ownership is contradictory.");
  }
  for (const retained of continuation.characters) {
    const sheet = retained.tag === "inBattle" ? retained.sheet : retained;
    const validated = rebuildCharacterSheetForOperation(services, {
      sheet,
      build: sheet.build,
    });
    if (Result.isFailure(validated))
      return Result.fail(
        `Saved Character Sheet is invalid: ${validated.failure}`,
      );
  }
  const characterIds = continuation.characters.map((character) =>
    character.tag === "inBattle"
      ? character.sheet.characterId
      : character.characterId,
  );
  if (new Set(characterIds).size !== characterIds.length)
    return Result.fail("Saved character ownership is duplicated.");
  const battle = Match.value(continuation.battle).pipe(
    Match.when({ tag: "none" }, () =>
      Result.succeed({
        battleState: { tag: "none" as const },
        selection: null,
      }),
    ),
    Match.when({ tag: "activeBattle" }, (retained) =>
      Result.flatMap(
        restoreBattleRuntimeContinuation(
          retained.battle,
          services.battleStatBlockExecutionCatalog,
        ),
        ({ session, transaction }) => {
          if ((transaction === null) !== (retained.selectionId === null))
            return Result.fail(
              "Saved Battle selection ownership is contradictory.",
            );
          if (
            retained.selectionId !== null &&
            !selectionOrdinalOwnsId(
              continuation.selectionOrdinal,
              retained.selectionId,
            )
          )
            return Result.fail(
              "Saved Battle selection allocator does not own its selection identity.",
            );
          return Result.succeed({
            battleState: { tag: "activeBattle" as const, session },
            selection:
              transaction === null || retained.selectionId === null
                ? null
                : { transaction, selectionId: retained.selectionId },
          });
        },
      ),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, (retained) =>
      Result.map(
        restoreBattleRuntimeContinuation(
          retained.battle,
          services.battleStatBlockExecutionCatalog,
        ),
        ({ session }) => ({
          battleState: {
            tag: "initialInitiativeSetup" as const,
            setup: restoreInitialInitiativeSetup({
              session,
              consumedSwapSources: retained.consumedSwapSources,
              open: true,
            }),
          },
          selection: null,
        }),
      ),
    ),
    Match.exhaustive,
  );
  return Result.map(battle, ({ battleState, selection }) => ({
    ...services,
    adminMirrorPublication: disabledAdminMirrorPublication(),
    sessionStore: createMcpSessionStore({
      statBlockCatalog: services.statBlockCatalog,
      unitLibrary: services.unitLibrary,
      continuation: {
        drafts: continuation.drafts,
        characters: continuation.characters,
        selectedStatBlockId: continuation.selectedStatBlockId,
        battleState,
        actionSelection: { selection, ordinal: continuation.selectionOrdinal },
      },
    }),
    diceSampling: createDiceSamplingService(seed, continuation.dice),
  }));
}
