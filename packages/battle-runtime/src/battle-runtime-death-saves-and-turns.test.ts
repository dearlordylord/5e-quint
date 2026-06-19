import {
  startBattleRight,
  requireResolved,
  subjectName,
  fighterVsGoblinBattle,
  criticalRange19UnitRefs,
  goblinTurnBattle,
  fighterAttackSubject,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  criticalAttackDamageResult,
  characterWithDeathSaveCounters,
  requireHole,
  findHole,
  findAct,
  targetFill,
  attackRollFill,
  deathSavingThrowFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionHoleAfterDamage,
  attackDamageDispositionHoleAfterFills,
  attackDamageDispositionFill,
  characterSeed,
  statBlockCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  fighterId,
  goblinId,
  wizardId,
  secondWizardId,
  battleId,
  combatantId,
  discoverBattleActs,
  Either,
  endTurn,
  holeId,
  KNOCKED_OUT_UNCONSCIOUS,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  supportedSpellActs,
} from "./battle-runtime-test-support.ts";
import type { BattleState } from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: death saves and turns", () => {
  test("character target at 0 HP enters the death-save lifecycle scaffold", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
        ],
      },
    });
  });

  test("Spare the Dying makes a zero-HP non-dead character Stable", () => {
    const targetCharacterId = combatantId("spare-the-dying-target");
    const state = startBattleRight({
      battleId: battleId("battle-spare-the-dying-stable"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("spare_the_dying")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Dying Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
          conditions: ["unconscious"],
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 2, failures: 1 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
          },
        }),
      ],
    });

    const act = findAct(state, magicSubject("spare_the_dying"));
    const targetHole = findHole(act.initialHoles, "targetChoice");
    if (targetHole.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }
    const cleric = state.combatants.get(wizardId);
    const invocation =
      cleric?.origin.kind === "character"
        ? supportedSpellActs(cleric).find(
            (candidate) => candidate.procedure === "makeStable",
          )
        : undefined;
    expect(targetHole.choices).toEqual([targetCharacterId]);
    expect(invocation?.rangeFeet).toBe(movementFeet(15));

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill(targetHole, targetCharacterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: targetCharacterId,
              spellId: "spare_the_dying",
            },
          ]),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: targetCharacterId,
          hp: 0,
          conditions: expect.arrayContaining(["unconscious"]),
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: { successes: 0, failures: 0 },
            stable: true,
            dead: false,
          },
        }),
      ]),
    );
    expect(result.state.currentTurnResources.actionResources).toHaveLength(0);
  });

  test("Spare the Dying rejects positive-HP, dead, and monster-dead targets", () => {
    const deadCharacterId = combatantId("spare-the-dying-dead-target");
    const state = startBattleRight({
      battleId: battleId("battle-spare-the-dying-target-gate"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("spare_the_dying")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Standing Fighter",
          initiative: 15,
          attack: null,
        }),
        characterSeed({
          combatantId: deadCharacterId,
          displayName: "Dead Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 0, failures: 3 },
              stable: false,
              dead: true,
              hpRegained: false,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 5, currentHp: 0 }),
      ],
    });

    const subject = magicSubject("spare_the_dying");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    if (targetHole.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(targetHole.choices).toEqual([]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, deadCharacterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: deadCharacterId,
              spellId: "spare_the_dying",
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("Spare the Dying range scales from character level", () => {
    const levelFiveCleric = characterSeed({
      combatantId: wizardId,
      displayName: "Cleric",
      initiative: 20,
      attack: null,
      classLevels: [{ className: "wizard", level: 5 }],
      spellcasting: wizardSpellcasting({
        cantrips: [spellRecord("spare_the_dying")],
        preparedSpells: [],
      }),
    });
    const state = startBattleRight({
      battleId: battleId("battle-spare-the-dying-range-scaling"),
      combatants: [
        levelFiveCleric,
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 0,
          conditions: ["unconscious"],
          attack: null,
        }),
      ],
    });

    findAct(state, magicSubject("spare_the_dying"));
    const cleric = state.combatants.get(wizardId);
    const invocation =
      cleric?.origin.kind === "character"
        ? supportedSpellActs(cleric).find(
            (candidate) => candidate.procedure === "makeStable",
          )
        : undefined;

    expect(invocation?.rangeFeet).toBe(movementFeet(30));
  });

  test("melee Knock Out leaves a Character target at 1 HP and Unconscious", () => {
    const targetCharacterId = combatantId("knocked-out-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-knock-out"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("healing a Knocked Out positive-HP creature ends Unconscious recovery", () => {
    const state = startBattleRight({
      battleId: battleId("battle-healing-knock-out-recovery"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 1,
          conditions: ["unconscious"],
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
        }),
      ],
    });
    const healingWordAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[1, 1]]),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 6,
          conditions: ["prone"],
        }),
      ]),
    );
  });

  test("positive-HP Unconscious without Knock Out state projects ordinary Unconscious", () => {
    const state = startBattleRight({
      battleId: battleId("battle-positive-unconscious-no-recovery"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Sleeping Wizard",
          initiative: 10,
          conditions: ["unconscious"],
        }),
      ],
    });

    expect(snapshotBattle(state).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: wizardId,
          hp: 12,
          conditions: expect.arrayContaining(["unconscious", "prone"]),
        }),
      ]),
    );
  });

  test("rejects authored Knocked Out state unless positive-HP Unconscious is present", () => {
    expect(
      startBattle({
        battleId: battleId(
          "battle-invalid-authored-knocked-out-without-unconscious",
        ),
        combatants: [
          characterSeed({ initiative: 20 }),
          characterSeed({
            combatantId: wizardId,
            displayName: "Recovered Wizard",
            initiative: 10,
            currentHp: 1,
            conditions: ["prone"],
            positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Knocked Out Unconscious initialization requires the Unconscious condition.",
      }),
    );

    for (const currentHp of [0, 6]) {
      expect(
        startBattle({
          battleId: battleId(
            `battle-invalid-authored-knocked-out-hp-${currentHp}`,
          ),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: secondWizardId,
              displayName: "Wrong HP Wizard",
              initiative: 5,
              currentHp,
              conditions: ["unconscious"],
              positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
            }),
          ],
        }),
      ).toEqual(
        Either.left({
          tag: "battleStateInitIssue",
          message:
            "Knocked Out Unconscious initialization requires exactly 1 current HP.",
        }),
      );
    }
  });

  test("melee Knock Out leaves a Stat Block target at 1 HP and Unconscious", () => {
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-knock-out"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      goblinId,
      8,
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: goblinId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: false },
          },
        ],
      },
    });
  });

  test("ranged attacks cannot carry Knock Out", () => {
    const state = goblinTurnBattle({ fighterHp: 3 });
    const subject = goblinAttackSubject("Shortbow");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(targetHole, fighterId)],
      }),
      "attackRoll",
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 6),
        {
          kind: "attackDamageDisposition",
          holeId: holeId("battle:attack:damage-disposition"),
          value: { kind: "knockOut" },
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Knock Out can only be chosen for melee attack damage.",
    });
  });

  test("melee Knock Out is exposed as an attack damage disposition hole", () => {
    const targetCharacterId = combatantId("knock-out-hole-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-knock-out-hole"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "attackDamageDisposition",
          holeId: "battle:attack:damage-disposition",
          attackerId: fighterId,
          targetId: targetCharacterId,
          choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
        },
      ],
    });
  });

  test("melee Knock Out can replace massive-damage instant death", () => {
    const targetCharacterId = combatantId("massive-knock-out-character");
    const state = startBattleRight({
      battleId: battleId("battle-massive-knock-out"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          maxHp: 8,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
    );

    const withoutDisposition = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });
    expect(withoutDisposition).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "attackDamageDisposition",
          choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
        },
      ],
    });

    const ordinaryDisposition = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });
    expect(ordinaryDisposition).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({ dead: true }),
          },
        ],
      },
    });

    const knockOutDisposition = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });
    expect(knockOutDisposition).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious"]),
            zeroHpLifecycle: expect.objectContaining({ dead: false }),
          },
        ],
      },
    });
  });

  test("massive damage kills a character when remaining damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      fighterAttackSubject(),
      targetCharacterId,
    );
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
      ],
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("damage at 0 HP kills when damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-zero-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[5, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("admitted authored critical-range natural 19 damage at 0 HP causes two death-save failures", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-zero-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
        }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 1,
      naturalD20: 19,
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[1, 1]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 2 },
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("later critical attack damage at 0 HP projects a dead death-save lifecycle", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-zero-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const firstDamageResult = criticalAttackDamageResult(
      state,
      targetCharacterId,
    );
    if (firstDamageResult.tag !== "resolved") {
      throw new Error(
        `Expected resolved first damage, got ${firstDamageResult.tag}.`,
      );
    }
    const secondDamageState = {
      ...firstDamageResult.state,
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    const result = criticalAttackDamageResult(
      secondDamageState,
      targetCharacterId,
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 3 },
              stable: false,
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("End Turn asks for a Death Saving Throw when the next actor starts at 0 HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-start-turn-death-save"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "needsHoles",
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      holes: [
        {
          kind: "deathSavingThrow",
          label: "Death Saving Throw",
          combatantId: targetCharacterId,
        },
      ],
    });
  });

  test("End Turn consumes a failed Death Saving Throw for the next actor", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-start-turn-death-save-fail"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 5)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 1 },
              stable: false,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("Death Saving Throw success three makes the next actor Stable", () => {
    const targetCharacterId = combatantId("target-character");
    const state = characterWithDeathSaveCounters({
      combatantId: targetCharacterId,
      successes: 2,
      failures: 1,
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 10)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: true,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("Death Saving Throw natural 20 restores 1 HP and ends Unconscious", () => {
    const targetCharacterId = combatantId("target-character");
    const state = characterWithDeathSaveCounters({
      combatantId: targetCharacterId,
      successes: 1,
      failures: 2,
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 20)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: ["prone"],
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("snapshotBattle projects current acts from the supplied state", () => {
    const state = {
      ...startBattleRight({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(
      snapshotBattle(state).acts.map((act) => subjectName(act.subject)),
    ).toEqual(["move", "endTurn"]);
  });

  test("endTurn advances to the next Initiative actor and refreshes turn resources", () => {
    const state = {
      ...startBattleRight({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: goblinId,
        round: 1,
        turnOrder: [fighterId, goblinId],
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
          bonusActionAvailable: true,
        },
      },
    });
  });

  test("endTurn rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = endTurn({ state, actorId: goblinId });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });
});
