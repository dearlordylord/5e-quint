import { combatantId, type CombatantId } from "@dnd/battle-runtime";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  correlateBattleCombatantInitializations,
  type BattleCombatantCorrelationInitialization,
  type BattleCombatantCorrelationParticipant,
} from "./battle-combatant-correlation.ts";

function statBlockInitialization(
  id: CombatantId,
  displayName: string,
): BattleCombatantCorrelationInitialization & { readonly displayName: string } {
  return {
    combatantId: id,
    displayName,
    creatureInit: { kind: "statBlock" },
  };
}

function participant(
  origin: BattleCombatantCorrelationParticipant["origin"],
  id: string,
): BattleCombatantCorrelationParticipant {
  return { origin, combatantId: combatantId(id) };
}

describe("battle combatant initialization correlation", () => {
  test("keys same-origin reordered initializations by combatant id and restores input order", () => {
    const firstId = combatantId("correlation-first");
    const secondId = combatantId("correlation-second");
    const first = statBlockInitialization(firstId, "First initialization");
    const second = statBlockInitialization(secondId, "Second initialization");
    const participants = [
      participant("statBlock", "correlation-first"),
      participant("statBlock", "correlation-second"),
    ];

    const correlated = correlateBattleCombatantInitializations({
      participants,
      creatureInits: [second, first],
    });

    expect(Either.isRight(correlated)).toBe(true);
    if (Either.isLeft(correlated)) return;
    expect(correlated.right).toEqual([
      { participant: participants[0], initialization: first },
      { participant: participants[1], initialization: second },
    ]);
  });

  test("rejects an initialization whose id is not in the participant roster", () => {
    const unexpectedId = combatantId("correlation-unexpected");

    const correlated = correlateBattleCombatantInitializations({
      participants: [participant("statBlock", "correlation-expected")],
      creatureInits: [statBlockInitialization(unexpectedId, "Unexpected")],
    });

    expect(Either.isLeft(correlated)).toBe(true);
    if (Either.isRight(correlated)) return;
    expect(correlated.left).toEqual({
      tag: "unexpectedInitializationCombatantId",
      combatantId: unexpectedId,
    });
  });

  test("rejects a participant with no matching initialization id", () => {
    const expectedId = combatantId("correlation-missing");

    const correlated = correlateBattleCombatantInitializations({
      participants: [participant("statBlock", "correlation-missing")],
      creatureInits: [],
    });

    expect(Either.isLeft(correlated)).toBe(true);
    if (Either.isRight(correlated)) return;
    expect(correlated.left).toEqual({
      tag: "missingInitializationCombatantId",
      combatantId: expectedId,
    });
  });

  test("rejects duplicate participant and initialization ids", () => {
    const duplicateParticipantId = combatantId(
      "correlation-duplicate-participant",
    );
    const duplicateInitializationId = combatantId(
      "correlation-duplicate-initialization",
    );

    const duplicateParticipant = correlateBattleCombatantInitializations({
      participants: [
        { origin: "statBlock", combatantId: duplicateParticipantId },
        { origin: "statBlock", combatantId: duplicateParticipantId },
      ],
      creatureInits: [
        statBlockInitialization(
          duplicateParticipantId,
          "Duplicate participant",
        ),
      ],
    });
    expect(Either.isLeft(duplicateParticipant)).toBe(true);
    if (Either.isRight(duplicateParticipant)) return;
    expect(duplicateParticipant.left).toEqual({
      tag: "duplicateParticipantCombatantId",
      combatantId: duplicateParticipantId,
    });

    const duplicateInitialization = correlateBattleCombatantInitializations({
      participants: [
        { origin: "statBlock", combatantId: duplicateInitializationId },
      ],
      creatureInits: [
        statBlockInitialization(duplicateInitializationId, "First"),
        statBlockInitialization(duplicateInitializationId, "Second"),
      ],
    });
    expect(Either.isLeft(duplicateInitialization)).toBe(true);
    if (Either.isRight(duplicateInitialization)) return;
    expect(duplicateInitialization.left).toEqual({
      tag: "duplicateInitializationCombatantId",
      combatantId: duplicateInitializationId,
    });
  });

  test("rejects same-id initializations whose origin kind disagrees with the participant", () => {
    const id = combatantId("correlation-origin-mismatch");

    const correlated = correlateBattleCombatantInitializations({
      participants: [{ origin: "characterSheet", combatantId: id }],
      creatureInits: [statBlockInitialization(id, "Stat Block")],
    });

    expect(Either.isLeft(correlated)).toBe(true);
    if (Either.isRight(correlated)) return;
    expect(correlated.left).toEqual({
      tag: "initializationOriginMismatch",
      combatantId: id,
      expectedOrigin: "characterSheet",
      actualOrigin: "statBlock",
    });
  });
});
