import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BattleHoleSchema,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureAttackDamageRollHole,
} from "./battle-state-execution.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActCandidates,
  endTurn,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  testBattleCreatureStateWithConditions,
} from "./battle-runtime.test-support.ts";
import { resolvedAnimalFriendshipState } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "./unit-profile-admission-catalog.test-support.ts";
import { resolveCreatureAttack } from "./battle-reducer/creature-attack-procedures.ts";
import { creatureAttackRouteForDiscoveredAct } from "./battle-reducer/attack-routes.ts";

const INITIAL_HP = 20;
const ATTACKER_ID = combatantId("creature-attack-a");
const TARGET_ID = combatantId("creature-attack-b");

describe("creature attack public reducer", () => {
  test("the focused procedure owner requests the discovered Attack Roll", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject();
    const discovered = discoverCreatureAttackAct(state, subject);

    expect(resolveCreatureAttack({ state, subject, fills: [] })).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: discovered.initialHoles,
    });
    expect(creatureAttackRouteForDiscoveredAct(discovered)).toEqual([
      expect.objectContaining({
        subject: "creatureAttack",
        owner: "battleAttackRoll",
      }),
    ]);
  });

  test("requests the discovered Attack Roll before resolving", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject();
    const discovered = discoverCreatureAttackAct(state, subject);

    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: discovered.initialHoles,
    });
  });

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
    expect(
      resolveBattleSubject({
        state: result.state,
        subject,
        fills: [attackRoll],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Creature Attack requires an available Attack action.",
    });
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

  test("a zero-damage hit resolves without changing the target's hit points", () => {
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

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [attackRoll, damageRollFill(damageHole, 0)],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: ATTACKER_ID, hp: INITIAL_HP },
          { combatantId: TARGET_ID, hp: INITIAL_HP },
        ],
      },
    });
  });

  test("carries charm-ending damage relationships through resolution", () => {
    const charmed = resolvedAnimalFriendshipState(TARGET_ID, [
      {
        combatantId: ATTACKER_ID,
        statBlock: creatureAttackStatBlock("creature_attack_a"),
        initiative: 19,
      },
    ]);
    const attackerTurn = endTurn({
      state: charmed,
      actorId: spellCasterId,
    });
    if (attackerTurn.tag !== "resolved") {
      throw new Error("Expected Creature Attack pilot turn.");
    }
    const charmedState = attackerTurn.state;
    const targetHp = charmedState.combatants.get(TARGET_ID)?.hp;
    if (targetHp === undefined) {
      throw new Error("Expected Animal Friendship target.");
    }
    const subject = creatureAttackSubject();
    const attackRoll = attackRollFill(
      attackRollHole(discoverCreatureAttackAct(charmedState, subject)),
      true,
    );
    const awaitingDamage = resolveBattleSubject({
      state: charmedState,
      subject,
      fills: [attackRoll],
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected hit Creature Attack to request damage.");
    }
    const damageHole = creatureAttackDamageHole(awaitingDamage.holes[0]);
    const damageFill = damageRollFill(damageHole, 1);
    const awaitingRelationship = resolveBattleSubject({
      state: charmedState,
      subject,
      fills: [attackRoll, damageFill],
    });
    if (awaitingRelationship.tag !== "needsHoles") {
      throw new Error("Expected Creature Attack damage relationship decision.");
    }
    const relationshipHole = awaitingRelationship.holes.find(
      (hole) => hole.kind === "damageRelationshipDecisions",
    );
    if (relationshipHole?.kind !== "damageRelationshipDecisions") {
      throw new Error("Expected Creature Attack relationship hole.");
    }
    expect(
      Schema.encodeSync(BattleHoleSchema)(
        Schema.decodeUnknownSync(BattleHoleSchema)(relationshipHole),
      ),
    ).toEqual(relationshipHole);
    const [question, ...additionalQuestions] = relationshipHole.questions;
    const relationshipFill: Extract<
      BattleFill,
      { readonly kind: "damageRelationshipDecisions" }
    > = {
      kind: "damageRelationshipDecisions",
      holeId: relationshipHole.holeId,
      answers: [
        { questionId: question.questionId, answer: true },
        ...additionalQuestions.map((additionalQuestion) => ({
          questionId: additionalQuestion.questionId,
          answer: true,
        })),
      ],
    };
    expect(
      Schema.decodeUnknownSync(BattleFillSchema)(relationshipFill),
    ).toEqual(relationshipFill);

    const resolved = resolveBattleSubject({
      state: charmedState,
      subject,
      fills: [attackRoll, damageFill, relationshipFill],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Creature Attack damage to resolve.");
    }
    const resolvedTarget = resolved.state.combatants.get(TARGET_ID);
    expect(resolvedTarget).toMatchObject({
      hp: Number(targetHp) - 1,
      conditions: expect.not.objectContaining({ charmed: true }),
    });
    expect(resolvedTarget?.activeEffects).toEqual([]);
  });

  test("rejects an incapacitated pilot actor", () => {
    const state = startCreatureAttackBattle();
    const actor = state.combatants.get(ATTACKER_ID);
    if (actor === undefined) {
      throw new Error("Expected Creature Attack actor.");
    }
    const incapacitatedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        ATTACKER_ID,
        testBattleCreatureStateWithConditions(
          actor,
          applyCondition(actor.conditions, "incapacitated"),
        ),
      ),
    };

    expect(
      discoverBattleActCandidates(incapacitatedState).some(
        (candidate) => candidate.subject.tag === "creatureAttack",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: creatureAttackSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Creature Attack requires an actor that can take actions.",
    });
  });

  test("rejects subjects whose combatants are no longer in the battle", () => {
    const state = startCreatureAttackBattle();

    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...creatureAttackSubject(),
          targetId: combatantId("creature-attack-missing-target"),
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "missingCombatant",
      message: expect.stringContaining("creature-attack-missing-target"),
    });
  });

  test("rejects character actors outside the stat-block no-actions pilot", () => {
    const state = startBattleRight({
      battleId: battleId("battle:creature-attack-character-actor"),
      combatants: [
        characterSeed({
          combatantId: ATTACKER_ID,
          displayName: "Character A",
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

    expect(
      resolveBattleSubject({
        state,
        subject: creatureAttackSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message:
        "Creature Attack is available only for the narrow stat-block no-actions pilot.",
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
): Extract<
  BattleFill,
  { readonly kind: "creatureAttackZeroDamage" | "rolledDice" }
> {
  if (damage === 0) {
    const fill = {
      kind: "creatureAttackZeroDamage",
      holeId: hole.holeId,
      creatureAttack: hole.creatureAttack,
    } as const;
    expect(Schema.decodeUnknownSync(BattleFillSchema)(fill)).toEqual(fill);
    return fill;
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(damage)] }],
  };
}
