import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import type {
  BattleFill,
  BattleHole,
  BattleState,
  BattleSubject,
} from "./index.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureAttackDamageRollHole,
} from "./battle-state-execution.ts";
import {
  battleId,
  combatantId,
  discoverBattleActCandidates,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";

const INITIAL_HP = 20;
const ATTACKER_ID = combatantId("creature-attack-a");
const TARGET_ID = combatantId("creature-attack-b");

describe("creature attack public reducer", () => {
  test("a missed attack resolves without requesting damage and spends the Attack action", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject();
    const attackRoll = attackRollFill(
      attackRollHole(discoverCreatureAttackAct(state, subject)),
      false,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [attackRoll],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: ATTACKER_ID, hp: INITIAL_HP },
          { combatantId: TARGET_ID, hp: INITIAL_HP },
        ],
      },
    });
    if (result.tag !== "resolved") {
      throw new Error("Expected missed Creature Attack to resolve.");
    }
    expect(
      discoverBattleActCandidates(result.state).some(
        (candidate) => candidate.subject.tag === "creatureAttack",
      ),
    ).toBe(false);
  });

  test("a hit requests damage and applies the supplied damage roll", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject();
    const attackRoll = attackRollFill(
      attackRollHole(discoverCreatureAttackAct(state, subject)),
      true,
    );
    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [attackRoll],
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected hit Creature Attack to request damage.");
    }
    const damageHole = creatureAttackDamageHole(awaitingDamage.holes[0]);

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [attackRoll, damageRollFill(damageHole, 7)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: ATTACKER_ID, hp: INITIAL_HP },
          { combatantId: TARGET_ID, hp: 13 },
        ],
      },
    });
  });
});

function startCreatureAttackBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle:creature-attack-unit-test"),
    combatants: [
      statBlockCreatureInit({
        combatantId: ATTACKER_ID,
        displayName: "Creature A",
        statBlock: creatureAttackStatBlock("creature_attack_a"),
        initiative: 20,
      }),
      statBlockCreatureInit({
        combatantId: TARGET_ID,
        displayName: "Creature B",
        statBlock: creatureAttackStatBlock("creature_attack_b"),
        initiative: 10,
      }),
    ],
  });
}

function creatureAttackStatBlock(id: string): StatBlockRecord {
  return {
    id: parseSharedStatBlockId(id),
    kind: "statBlock",
    name: id,
    challengeRating: 0,
    provenance: {
      kind: "synthetic-test",
      section: "Minimal creature attack unit-test fixture",
    },
    statBlock: {
      abilityScores: {
        cha: 10,
        con: 10,
        dex: 10,
        int: 10,
        str: 10,
        wis: 10,
      },
      ac: { kind: "literal", value: 10 },
      creatureType: "humanoid",
      displayName: id,
      hp: { kind: "literal", value: INITIAL_HP },
      initiativeModifier: 0,
      languages: ["Common"],
      size: "medium",
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
    },
  };
}

function creatureAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "creatureAttack" }
> {
  return {
    tag: "creatureAttack",
    actorId: ATTACKER_ID,
    targetId: TARGET_ID,
  };
}

function discoverCreatureAttackAct(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "creatureAttack" }>,
): BattleActDiscoveryCandidate {
  const discovered = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "creatureAttack" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.targetId === subject.targetId,
  );
  if (discovered === undefined) {
    throw new Error("Expected Creature Attack act discovery.");
  }
  return discovered;
}

function attackRollHole(
  discovered: BattleActDiscoveryCandidate,
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const [hole] = discovered.initialHoles;
  if (hole?.kind !== "attackRoll") {
    throw new Error("Expected Creature Attack Attack Roll hole.");
  }
  return hole;
}

function creatureAttackDamageHole(
  hole: BattleHole | undefined,
): BattleCreatureAttackDamageRollHole {
  if (
    hole === undefined ||
    hole.kind !== "rolledDice" ||
    !("creatureAttack" in hole)
  ) {
    throw new Error("Expected Creature Attack damage hole.");
  }
  return hole;
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  hit: boolean,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: hit ? 99 : 0,
      naturalD20: DieRollResult(hit ? 20 : 1),
    },
  };
}

function damageRollFill(
  hole: BattleCreatureAttackDamageRollHole,
  damage: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(damage)] }],
  };
}
