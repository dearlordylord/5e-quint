import {
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  type CharacterSheetIssue,
  type CharacterSheetSpellRestBenefitRecipient,
} from "@dnd/character-sheet-runtime";
import type { CharacterId } from "@dnd/battle-runtime";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import { CharacterSessionOperationOutputSchema } from "./character-tool-output.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

type LayOnHandsOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "applyLayOnHands" }
>;
type SpellRestBenefitOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "applySpellRestBenefit" }
>;

export function applyHealingCharacterSessionOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: ApplyCharacterSessionOperationToolInput["characterId"];
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "applyLayOnHands" | "applySpellRestBenefit" }
    >;
  },
) {
  const source = availableHealingSourceSession(root, {
    operationKind: input.operation.kind,
    sourceCharacterId: input.characterId,
    affectedCharacterIds:
      input.operation.kind === "applyLayOnHands"
        ? [input.characterId, input.operation.targetCharacterId]
        : [
            input.characterId,
            ...input.operation.recipients.map(
              (recipient) => recipient.characterId,
            ),
          ],
  });
  if (Either.isLeft(source)) return source.left;
  return Match.value(input.operation).pipe(
    Match.when({ kind: "applyLayOnHands" }, (operation) =>
      applyLayOnHandsOperation(root, {
        characterId: input.characterId,
        session: source.right,
        operation,
      }),
    ),
    Match.when({ kind: "applySpellRestBenefit" }, (operation) =>
      applySpellRestBenefitOperation(root, {
        characterId: input.characterId,
        session: source.right,
        operation,
      }),
    ),
    Match.exhaustive,
  );
}

export function availableHealingSourceSession(
  root: McpPlaySessionRoot,
  input: {
    readonly operationKind: "applyLayOnHands" | "applySpellRestBenefit";
    readonly sourceCharacterId: CharacterId;
    readonly affectedCharacterIds: readonly CharacterId[];
  },
): Either.Either<AvailableCharacterSession, ReturnType<typeof errorContent>> {
  const session = root.sessionStore.characters.get(input.sourceCharacterId);
  if (session === undefined) {
    return Either.left(
      healingOperationFailure({
        ...input,
        issue: `Unknown source Character Session: ${input.sourceCharacterId}.`,
        code: "UNKNOWN_CHARACTER_SESSION",
      }),
    );
  }
  if (session.tag === "inBattle") {
    return Either.left(
      healingOperationFailure({
        ...input,
        issue:
          "Healing operation requires every affected Character Session to be available.",
        code: "CHARACTER_SESSION_IN_BATTLE",
      }),
    );
  }
  return Either.right(session);
}

export function applyLayOnHandsOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterId;
    readonly session: AvailableCharacterSession;
    readonly operation: LayOnHandsOperation;
  },
) {
  const target = availableTargetSession(root, {
    operationKind: input.operation.kind,
    sourceCharacterId: input.characterId,
    targetCharacterId: input.operation.targetCharacterId,
  });
  if (Either.isLeft(target)) return target.left;

  const result = applyLayOnHands({
    source: input.session,
    target: target.right,
    unitLibrary: root.unitLibrary,
    restoreHp: Hp(input.operation.restoreHp),
    removePoisoned: input.operation.removePoisoned,
  });
  if (Either.isLeft(result)) {
    return healingOperationFailure({
      operationKind: input.operation.kind,
      sourceCharacterId: input.characterId,
      affectedCharacterIds: [
        input.characterId,
        input.operation.targetCharacterId,
      ],
      issue: result.left,
    });
  }

  const changedSessions =
    result.right.source.characterId === result.right.target.characterId
      ? [result.right.source]
      : [result.right.source, result.right.target];
  const committed = commitCharacterSessions(root, changedSessions, {
    operationKind: input.operation.kind,
    sourceCharacterId: input.characterId,
    affectedCharacterIds: [
      input.characterId,
      input.operation.targetCharacterId,
    ],
  });
  if (Either.isLeft(committed)) return committed.left;
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: result.right.source,
    result: {
      tag: "layOnHandsApplied",
      sourceCharacterId: input.characterId,
      targetCharacterId: input.operation.targetCharacterId,
    },
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

export function applySpellRestBenefitOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterId;
    readonly session: AvailableCharacterSession;
    readonly operation: SpellRestBenefitOperation;
  },
) {
  const recipientIds = mapNonEmpty(
    input.operation.recipients,
    (recipient) => recipient.characterId,
  );
  const affectedCharacterIds = uniqueCharacterIds([
    input.characterId,
    ...recipientIds,
  ]);
  const recipientSheets: AvailableCharacterSession[] = [];
  for (const [index, recipient] of input.operation.recipients.entries()) {
    const session = availableTargetSession(root, {
      operationKind: input.operation.kind,
      sourceCharacterId: input.characterId,
      targetCharacterId: recipient.characterId,
      recipientIndex: index,
      affectedCharacterIds,
    });
    if (Either.isLeft(session)) return session.left;
    recipientSheets.push(session.right);
  }
  const recipientInputs = mapNonEmpty(
    input.operation.recipients,
    (recipient, index) =>
      spellRestBenefitRecipientFromTool({
        recipient,
        sheet: recipientSheets[index],
      }),
  );

  const result = applyCharacterSheetSpellRestBenefit({
    caster: input.session,
    spellId: input.operation.spellId,
    unitLibrary: root.unitLibrary,
    castLevel: spellSlotLevel(input.operation.castLevel),
    ...(input.operation.spellSlotSource === undefined
      ? {}
      : { spellSlotSource: input.operation.spellSlotSource }),
    recipients: recipientInputs,
  });
  if (Either.isLeft(result)) {
    return healingOperationFailure({
      operationKind: input.operation.kind,
      sourceCharacterId: input.characterId,
      affectedCharacterIds,
      issue: result.left,
    });
  }

  const committed = commitCharacterSessions(
    root,
    uniqueSpellRestBenefitSessions(result.right),
    {
      operationKind: input.operation.kind,
      sourceCharacterId: input.characterId,
      affectedCharacterIds,
    },
  );
  if (Either.isLeft(committed)) return committed.left;
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: result.right.caster,
    result: {
      tag: "spellRestBenefitApplied",
      casterCharacterId: input.characterId,
      spellId: input.operation.spellId,
      castLevel: input.operation.castLevel,
      recipientCharacterIds: recipientIds,
    },
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function spellRestBenefitRecipientFromTool(input: {
  readonly recipient: SpellRestBenefitOperation["recipients"][number];
  readonly sheet: AvailableCharacterSession;
}): CharacterSheetSpellRestBenefitRecipient {
  return {
    sheet: input.sheet,
    eligibility: input.recipient.eligibility,
    healingRolls: input.recipient.healingRolls.map((roll) =>
      DieRollResult(roll),
    ),
    ...(input.recipient.spendHitDice === undefined
      ? {}
      : {
          spendHitDice: input.recipient.spendHitDice.map((spend) => ({
            classUnitId: spend.classUnitId,
            roll: DieRollResult(spend.roll),
          })),
        }),
    ...(input.recipient.arcaneRecovery === undefined
      ? {}
      : {
          arcaneRecovery: {
            refundSpellSlots:
              input.recipient.arcaneRecovery.refundSpellSlots.map((refund) => ({
                spellLevel: spellSlotLevel(refund.spellLevel),
                count: resourceCount(refund.count),
              })),
          },
        }),
    ...(input.recipient.sorcerousRestoration === undefined
      ? {}
      : {
          sorcerousRestoration: {
            recoverSorceryPoints: resourceCount(
              input.recipient.sorcerousRestoration.recoverSorceryPoints,
            ),
          },
        }),
  };
}

function availableTargetSession(
  root: McpPlaySessionRoot,
  input: {
    readonly operationKind: "applyLayOnHands" | "applySpellRestBenefit";
    readonly sourceCharacterId: CharacterId;
    readonly targetCharacterId: CharacterId;
    readonly recipientIndex?: number;
    readonly affectedCharacterIds?: readonly CharacterId[];
  },
): Either.Either<AvailableCharacterSession, ReturnType<typeof errorContent>> {
  const session = root.sessionStore.characters.get(input.targetCharacterId);
  const affectedCharacterIds = input.affectedCharacterIds ?? [
    input.sourceCharacterId,
    input.targetCharacterId,
  ];
  if (session === undefined) {
    return Either.left(
      healingOperationFailure({
        operationKind: input.operationKind,
        sourceCharacterId: input.sourceCharacterId,
        affectedCharacterIds,
        targetCharacterId: input.targetCharacterId,
        ...(input.recipientIndex === undefined
          ? {}
          : { recipientIndex: input.recipientIndex }),
        issue: `Unknown target Character Session: ${input.targetCharacterId}.`,
        code: "UNKNOWN_CHARACTER_SESSION",
      }),
    );
  }
  if (session.tag === "inBattle") {
    return Either.left(
      healingOperationFailure({
        operationKind: input.operationKind,
        sourceCharacterId: input.sourceCharacterId,
        affectedCharacterIds,
        targetCharacterId: input.targetCharacterId,
        ...(input.recipientIndex === undefined
          ? {}
          : { recipientIndex: input.recipientIndex }),
        issue:
          "Healing operation requires every affected Character Session to be available.",
        code: "CHARACTER_SESSION_IN_BATTLE",
      }),
    );
  }
  return Either.right(session);
}

function healingOperationFailure(input: {
  readonly operationKind: "applyLayOnHands" | "applySpellRestBenefit";
  readonly sourceCharacterId: CharacterId;
  readonly affectedCharacterIds: readonly CharacterId[];
  readonly targetCharacterId?: CharacterId;
  readonly recipientIndex?: number;
  readonly issue: CharacterSheetIssue | string;
  readonly code?:
    | "UNKNOWN_CHARACTER_SESSION"
    | "CHARACTER_SESSION_IN_BATTLE"
    | "CHARACTER_SESSION_COMMIT_INVALID";
}) {
  const message =
    typeof input.issue === "string" ? input.issue : input.issue.message;
  return errorContent("Character session operation failed.", {
    code: input.code ?? "CHARACTER_SESSION_OPERATION_INVALID",
    characterId: input.sourceCharacterId,
    operationKind: input.operationKind,
    ...(input.targetCharacterId === undefined
      ? {}
      : { targetCharacterId: input.targetCharacterId }),
    ...(input.recipientIndex === undefined
      ? {}
      : { recipientIndex: input.recipientIndex }),
    message,
    recovery: {
      tag: "characterSessionsUnchanged",
      affectedCharacterIds: input.affectedCharacterIds,
      guidance:
        "No affected Character Session was committed; correct the operation and retry from the returned session state.",
    },
  });
}

function uniqueSpellRestBenefitSessions(result: {
  readonly caster: AvailableCharacterSession;
  readonly recipients: readonly AvailableCharacterSession[];
}): readonly AvailableCharacterSession[] {
  const sessions = [result.caster, ...result.recipients];
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.characterId)) return false;
    seen.add(session.characterId);
    return true;
  });
}

function commitCharacterSessions(
  root: McpPlaySessionRoot,
  sessions: readonly AvailableCharacterSession[],
  context: {
    readonly operationKind: "applyLayOnHands" | "applySpellRestBenefit";
    readonly sourceCharacterId: CharacterId;
    readonly affectedCharacterIds: readonly CharacterId[];
  },
) {
  const committed = root.sessionStore.characters.setAll(sessions);
  return Either.isLeft(committed)
    ? Either.left(
        healingOperationFailure({
          ...context,
          issue: `Character Session commit rejected: ${committed.left.tag}.`,
          code: "CHARACTER_SESSION_COMMIT_INVALID",
        }),
      )
    : Either.right(undefined);
}

function mapNonEmpty<A, B>(
  values: readonly [A, ...A[]],
  map: (value: A, index: number) => B,
): readonly [B, ...B[]] {
  const [first, ...rest] = values;
  return [map(first, 0), ...rest.map((value, index) => map(value, index + 1))];
}

function uniqueCharacterIds(
  ids: readonly CharacterId[],
): readonly CharacterId[] {
  return Array.from(new Set(ids));
}
