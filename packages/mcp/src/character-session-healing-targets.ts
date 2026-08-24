import type { CharacterId } from "@dnd/battle-runtime";
import { Either, Match } from "effect";

import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";

type SpellRestBenefitOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "applySpellRestBenefit" }
>;

export type HealingTargetIssue = {
  readonly tag: "unknownCharacterSession" | "characterSessionInBattle";
  readonly targetCharacterId: CharacterId;
  readonly recipientIndex?: number;
  readonly message: string;
};

export type SpellRestBenefitRecipientSession = {
  readonly recipient: SpellRestBenefitOperation["recipients"][number];
  readonly sheet: AvailableCharacterSession;
};

export function lookupAvailableHealingTargetSession(
  root: McpPlaySessionRoot,
  input: {
    readonly targetCharacterId: CharacterId;
    readonly recipientIndex?: number;
  },
): Either.Either<AvailableCharacterSession, HealingTargetIssue> {
  const session = root.sessionStore.characters.get(input.targetCharacterId);
  if (session === undefined) {
    return Either.left({
      tag: "unknownCharacterSession",
      targetCharacterId: input.targetCharacterId,
      ...(input.recipientIndex === undefined
        ? {}
        : { recipientIndex: input.recipientIndex }),
      message: `Unknown target Character Session: ${input.targetCharacterId}.`,
    });
  }
  if (session.tag === "inBattle") {
    return Either.left({
      tag: "characterSessionInBattle",
      targetCharacterId: input.targetCharacterId,
      ...(input.recipientIndex === undefined
        ? {}
        : { recipientIndex: input.recipientIndex }),
      message:
        "Healing operation requires every affected Character Session to be available.",
    });
  }
  return Either.right(session);
}

export function spellRestBenefitRecipientSessions(
  root: McpPlaySessionRoot,
  input: { readonly recipients: SpellRestBenefitOperation["recipients"] },
): Either.Either<
  readonly [
    SpellRestBenefitRecipientSession,
    ...SpellRestBenefitRecipientSession[],
  ],
  readonly [HealingTargetIssue, ...HealingTargetIssue[]]
> {
  const [firstRecipient, ...remainingRecipients] = input.recipients;
  const firstSession = lookupSpellRestBenefitRecipientSession(root, {
    recipient: firstRecipient,
    recipientIndex: 0,
  });
  const remainingSessions = remainingRecipients.map(
    (recipient, recipientIndex) =>
      lookupSpellRestBenefitRecipientSession(root, {
        recipient,
        recipientIndex: recipientIndex + 1,
      }),
  );
  const issues = [firstSession, ...remainingSessions].flatMap((session) =>
    Either.isLeft(session) ? [session.left] : [],
  );
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return Either.left([firstIssue, ...remainingIssues]);
  }
  if (Either.isLeft(firstSession)) return Either.left([firstSession.left]);
  return Either.right([
    firstSession.right,
    ...remainingSessions.flatMap((session) =>
      Either.isRight(session) ? [session.right] : [],
    ),
  ]);
}

export function healingTargetIssueCode(
  issue: HealingTargetIssue,
): "CHARACTER_SESSION_IN_BATTLE" | "UNKNOWN_CHARACTER_SESSION" {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "unknownCharacterSession" },
      () => "UNKNOWN_CHARACTER_SESSION" as const,
    ),
    Match.when(
      { tag: "characterSessionInBattle" },
      () => "CHARACTER_SESSION_IN_BATTLE" as const,
    ),
    Match.exhaustive,
  );
}

function lookupSpellRestBenefitRecipientSession(
  root: McpPlaySessionRoot,
  input: {
    readonly recipient: SpellRestBenefitOperation["recipients"][number];
    readonly recipientIndex: number;
  },
): Either.Either<SpellRestBenefitRecipientSession, HealingTargetIssue> {
  return Either.map(
    lookupAvailableHealingTargetSession(root, {
      targetCharacterId: input.recipient.characterId,
      recipientIndex: input.recipientIndex,
    }),
    (sheet) => ({ recipient: input.recipient, sheet }),
  );
}
