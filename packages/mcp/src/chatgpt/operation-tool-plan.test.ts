import { describe, expect, it } from "vitest";
import {
  chatGptToolAcceptsSelection,
  type ChatGptToolInvocation,
  type ChatGptToolSelection,
} from "./operation-tool-plan.ts";

describe("ChatGPT operation routing plan", () => {
  it("covers attack lanes while separating casts and retained-effect follow-ups", () => {
    for (const operation of [
      "action.attack",
      "bonusAction.offHandAttack",
      "runtimeCommand.opportunityAttack",
    ] as const) {
      expect(
        chatGptToolAcceptsSelection("attack", {
          family: "battleSubjects",
          operation,
        }),
      ).toBe(true);
    }
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "spellOperations",
        operation: "spellCreatedHeldObjectAttack",
      }),
    ).toBe(true);
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "spellOperations",
        operation: "saveGatedDamage.action",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("cast_spell", {
        family: "spellOperations",
        operation: "markedDamageRider.transfer",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("transfer_spell_mark", {
        family: "spellOperations",
        operation: "markedDamageRider.transfer",
      }),
    ).toBe(true);
  });
  it("requires reference refinement before a named tool can execute", () => {
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "battleSubjects",
        operation: "runtimeCommand.releaseReadiedAction",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("dash", {
        family: "readiedActionSubjects",
        operation: "action.dash",
      }),
    ).toBe(true);
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "readiedActionSubjects",
        operation: "action.dash",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("cast_spell", {
        family: "battleSubjects",
        operation: "actionSpell.cast",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("cast_spell", {
        family: "spellProcedures",
        operation: "markedDamageRider",
      }),
    ).toBe(false);
  });
  it("does not treat continuation fills or internal bindings as fresh operations", () => {
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "battleContinuations",
        operation: "attackRoll",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("cast_spell", {
        family: "procedureBindings",
        operation: "effectOccurrenceSource",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("cast_spell", {
        family: "procedureBindings",
        operation: "unavailableSpellInvocation",
      }),
    ).toBe(false);
    expect(
      chatGptToolAcceptsSelection("attack", {
        family: "publicTools",
        operation: "resolve_battle_act",
      }),
    ).toBe(false);
  });
});

// Compile-time witnesses for the future adapter's correlated handler contract.
const attack: ChatGptToolInvocation = {
  tool: "attack",
  selection: { family: "battleSubjects", operation: "action.attack" },
};
const spell: ChatGptToolSelection<"cast_spell"> = {
  family: "spellOperations",
  operation: "saveGatedDamage.action",
};
const invalidAttack: ChatGptToolSelection<"attack"> = {
  family: "spellOperations",
  // @ts-expect-error A fresh cast does not belong to the attack handler.
  operation: "saveGatedDamage.action",
};
const invalidInvocation: ChatGptToolInvocation = {
  // @ts-expect-error The generic resolver is not a proposed ChatGPT tool.
  tool: "resolve_battle_act",
  selection: { family: "battleSubjects", operation: "action.attack" },
};
void [attack, spell, invalidAttack, invalidInvocation];
