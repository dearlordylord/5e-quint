import { Either } from "effect";

import type {
  AvailableCharacterSession,
  CharacterSessionRegistry,
  CharacterSessionRegistryIssue,
  InBattleCharacterSession,
} from "./session-store.ts";
import { projectCharacterSessionInBattle } from "./character-session-occupancy.ts";
import { errorContent } from "./tool-content.ts";

export type CharacterSessionBattleAdmissionIssue = {
  readonly battleId: string;
  readonly registryIssue: CharacterSessionRegistryIssue;
  readonly affectedCharacterIds: readonly string[];
};

export function admitCharacterSessionsToBattle(input: {
  readonly registry: CharacterSessionRegistry;
  readonly battleId: InBattleCharacterSession["battleId"];
  readonly sessions: readonly AvailableCharacterSession[];
}): Either.Either<void, CharacterSessionBattleAdmissionIssue> {
  const inBattleSessions = input.sessions.map((session) =>
    projectCharacterSessionInBattle({
      session,
      battleId: input.battleId,
    }),
  );
  const committed = input.registry.setAll(inBattleSessions);
  return Either.isLeft(committed)
    ? Either.left({
        battleId: input.battleId,
        registryIssue: committed.left,
        affectedCharacterIds: inBattleSessions.map(
          (session) => session.sheet.characterId,
        ),
      })
    : Either.right(undefined);
}

export function characterSessionBattleAdmissionErrorContent(
  issue: CharacterSessionBattleAdmissionIssue,
) {
  return errorContent("Battle character session admission commit failed.", {
    code: "CHARACTER_SESSION_COMMIT_INVALID",
    battleId: issue.battleId,
    message: `Character Session registry rejected battle admission: ${issue.registryIssue.tag}.`,
    registryIssue: issue.registryIssue,
    affectedCharacterIds: issue.affectedCharacterIds,
    recovery: {
      tag: "characterSessionsUnchanged",
      guidance:
        "No Character Session was committed; correct the session conflict and retry start_battle.",
    },
  });
}
