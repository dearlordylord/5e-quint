import type { CharacterId } from "@dnd/battle-runtime";
import { Result, Match } from "effect";

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
): Result.Result<AvailableCharacterSession, HealingTargetIssue> {
  const session = root.sessionStore.characters.get(input.targetCharacterId);
  if (session === undefined) {
    return Result.fail({
      tag: "unknownCharacterSession",
      targetCharacterId: input.targetCharacterId,
      ...(input.recipientIndex === undefined
        ? {}
        : { recipientIndex: input.recipientIndex }),
      message: `Unknown target Character Session: ${input.targetCharacterId}.`,
    });
  }
  if (session.tag === "inBattle") {
    return Result.fail({
      tag: "characterSessionInBattle",
      targetCharacterId: input.targetCharacterId,
      ...(input.recipientIndex === undefined
        ? {}
        : { recipientIndex: input.recipientIndex }),
      message:
        "Healing operation requires every affected Character Session to be available.",
    });
  }
  return Result.succeed(session);
}

export function spellRestBenefitRecipientSessions(
  root: McpPlaySessionRoot,
  input: { readonly recipients: SpellRestBenefitOperation["recipients"] },
): Result.Result<
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
    Result.isFailure(session) ? [session.failure] : [],
  );
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  if (Result.isFailure(firstSession))
    return Result.fail([firstSession.failure]);
  return Result.succeed([
    firstSession.success,
    ...remainingSessions.flatMap((session) =>
      Result.isSuccess(session) ? [session.success] : [],
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
): Result.Result<SpellRestBenefitRecipientSession, HealingTargetIssue> {
  return Result.map(
    lookupAvailableHealingTargetSession(root, {
      targetCharacterId: input.recipient.characterId,
      recipientIndex: input.recipientIndex,
    }),
    (sheet) => ({ recipient: input.recipient, sheet }),
  );
}
