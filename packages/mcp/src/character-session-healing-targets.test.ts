import { battleId, characterId } from "@dnd/battle-runtime";
import { armorClassBuild } from "../../character-sheet-runtime/src/test-support.test-support.ts";
import { unitId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { applySpellRestBenefitOperation } from "./character-session-healing-operation.ts";
import { spellRestBenefitRecipientSessions } from "./character-session-healing-targets.ts";
import { availableCharacterSession } from "./session-store.ts";
import { jsonContentPayload } from "./tool-content.ts";

describe("spell-rest benefit recipient validation", () => {
  test("reports every unavailable recipient with its stable input index", () => {
    const root = createMcpPlaySessionRoot();
    const inBattle = testSession(root, "character:in-battle-recipient");
    root.sessionStore.characters.set({
      tag: "inBattle",
      battleId: battleId("battle:recipient-validation"),
      sheet: inBattle,
    });

    expect(
      spellRestBenefitRecipientSessions(root, {
        recipients: [
          recipient("character:missing-recipient"),
          recipient("character:in-battle-recipient"),
        ],
      }),
    ).toEqual(
      Result.fail([
        {
          tag: "unknownCharacterSession",
          targetCharacterId: "character:missing-recipient",
          recipientIndex: 0,
          message:
            "Unknown target Character Session: character:missing-recipient.",
        },
        {
          tag: "characterSessionInBattle",
          targetCharacterId: "character:in-battle-recipient",
          recipientIndex: 1,
          message:
            "Healing operation requires every affected Character Session to be available.",
        },
      ]),
    );
  });

  test("carries each recipient together with its matching sheet", () => {
    const root = createMcpPlaySessionRoot();
    const first = testSession(root, "character:first-recipient");
    const second = testSession(root, "character:second-recipient");
    root.sessionStore.characters.set(first);
    root.sessionStore.characters.set(second);

    const validated = spellRestBenefitRecipientSessions(root, {
      recipients: [
        recipient("character:first-recipient"),
        recipient("character:second-recipient"),
      ],
    });

    expect(Result.isSuccess(validated)).toBe(true);
    if (Result.isFailure(validated)) return;
    expect(
      validated.success.map(({ recipient: input, sheet }) => ({
        inputCharacterId: input.characterId,
        sheetCharacterId: sheet.characterId,
      })),
    ).toEqual([
      {
        inputCharacterId: "character:first-recipient",
        sheetCharacterId: "character:first-recipient",
      },
      {
        inputCharacterId: "character:second-recipient",
        sheetCharacterId: "character:second-recipient",
      },
    ]);
  });

  test("returns every recipient issue in one atomic operation failure", () => {
    const root = createMcpPlaySessionRoot();
    const source = testSession(root, "character:healing-source");
    const inBattle = testSession(root, "character:in-battle-recipient");
    root.sessionStore.characters.set(source);
    root.sessionStore.characters.set({
      tag: "inBattle",
      battleId: battleId("battle:recipient-operation-validation"),
      sheet: inBattle,
    });

    const result = applySpellRestBenefitOperation(root, {
      characterId: source.characterId,
      session: source,
      operation: {
        kind: "applySpellRestBenefit",
        spellId: unitId("prayer_of_healing"),
        castLevel: 2,
        recipients: [
          recipient("character:missing-recipient"),
          recipient("character:in-battle-recipient"),
        ],
      },
    });

    expect(jsonContentPayload(result)).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_RECIPIENTS_INVALID",
        issues: [
          {
            tag: "unknownCharacterSession",
            targetCharacterId: "character:missing-recipient",
            recipientIndex: 0,
          },
          {
            tag: "characterSessionInBattle",
            targetCharacterId: "character:in-battle-recipient",
            recipientIndex: 1,
          },
        ],
        recovery: { tag: "characterSessionsUnchanged" },
      },
    });
    expect(root.sessionStore.characters.get(source.characterId)).toBe(source);
  });
});

function recipient(characterIdValue: string) {
  return {
    characterId: characterId(characterIdValue),
    eligibility: { remainedWithinRangeForEntireCasting: true } as const,
    healingRolls: [4],
  };
}

function testSession(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  characterIdValue: string,
) {
  const session = availableCharacterSession({
    characterId: characterId(characterIdValue),
    build: armorClassBuild({ startingClass: "class_fighter" }),
    currentHp: Hp(10),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    companion: { tag: "none" },
    unitLibrary: root.unitLibrary,
  });
  if (Result.isFailure(session)) throw new Error(session.failure.message);
  return session.success;
}
