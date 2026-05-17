import {
  startBattleRight,
  requireResolved,
  requireHole,
  findHole,
  findAct,
  targetFill,
  objectTargetFill,
  attackRollFill,
  damageRollFillWithGroups,
  characterSeed,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  fighterId,
  skeletonId,
  wizardId,
  battleId,
  battleObjectId,
  damageAmount,
  discoverBattleActs,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Poison Spray and Chill Touch", () => {
  test("Poison Spray uses creature target spell attack damage and cantrip scaling", () => {
    const state = startBattleRight({
      battleId: battleId("battle-poison-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("poison_spray")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const subject = magicSubject("poison_spray");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Poison Spray damage (2d12-poison)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 1 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Chill Touch uses melee spell attack damage and prevents Hit Point regain on hit", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({
      label: "Chill Touch spell attack roll",
      attackBonus: 5,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Chill Touch damage (2d10-necrotic)",
      spell: expect.objectContaining({
        attackKind: "melee_spell_attack",
        postDamageRiders: [
          {
            kind: "hitPointRegainPrevented",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual({
      kind: "hitPointRegainPrevented",
      sourceSpellId: "chill_touch",
      sourceCombatantId: wizardId,
      expiresAt: {
        kind: "endOfTurn",
        combatantId: wizardId,
        round: 2,
      },
    });

    const healingWordAct = discoverBattleActs(result.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const blockedHealing = requireResolved(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(blockedHealing.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 2 }),
      ]),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: result.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const afterWizardNextTurn = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    expect(
      afterWizardNextTurn.state.combatants
        .get(skeletonId)
        ?.activeEffects.some(
          (effect) => effect.kind === "hitPointRegainPrevented",
        ),
    ).toBe(false);
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Chill Touch miss applies no Hit Point regain prevention rider", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
    expect(result.state.combatants.get(skeletonId)?.activeEffects).toEqual([]);
  });

  test("Chill Touch expired rider allows later Hit Point regain", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-heal-after-expiry"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const wizardThirdTurn = requireResolved(
      endTurn({ state: expired.state, actorId: skeletonId }),
    );
    const healingWordAct = discoverBattleActs(wizardThirdTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healed = requireResolved(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(healed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
  });

  test("Chill Touch old damage path still spends no Spell Slot", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-slot"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Chill Touch admits caller-supplied object targets for melee spell attack damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const act = findAct(state, subject);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([skeletonId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const objectId = battleObjectId("chill-touch-training-object");
    const objectTarget = objectTargetFill({
      hole: findHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: "chill_touch",
      rangeFeet: movementFeet(5),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(12) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({
      label: "Chill Touch spell attack roll",
      spell: expect.objectContaining({
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "melee_spell_attack",
      }),
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectTarget,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Chill Touch damage (2d10-necrotic)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTarget,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "necrotic",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(12),
          nextHitPoints: Hp(3),
          destroyed: false,
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);
    expect(
      requireResolved(result).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);
  });

  test("Chill Touch object targeting rejects missing matching object facts", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-object-reject"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "chill_touch",
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    });
  });
});
