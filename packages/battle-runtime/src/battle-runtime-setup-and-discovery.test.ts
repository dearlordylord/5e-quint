import {
  startBattleRight,
  addBattleCombatantRight,
  removeBattleCombatantsRight,
  fighterVsGoblinBattle,
  requireHole,
  findHole,
  findAct,
  targetFill,
  characterSeed,
  statBlockCreatureInit,
  resource,
  bardicInspirationUnit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  BattleHoleSchema,
  battleId,
  BattleSnapshotSchema,
  discoverBattleActs,
  Either,
  initiativeScore,
  movementFeet,
  resolveBattleSubject,
  Schema,
  snapshotBattle,
  startBattle,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: setup and discovery", () => {
  test("battle ids must be non-empty trimmed strings", () => {
    expect(() => battleId("")).toThrow();
    expect(() => battleId("   ")).toThrow();
    expect(() => battleId(" battle-1 ")).toThrow();
    expect(battleId("battle-1")).toBe("battle-1");
  });

  test("initiative scores must be integers", () => {
    expect(() => initiativeScore(12.5)).toThrow();
  });

  test("startBattle creates sorted Initiative state and the MCP snapshot contract", () => {
    const state = startBattleRight({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 12 }),
        statBlockCreatureInit({ initiative: 16, currentHp: 0 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
      combatants: [
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          hp: 0,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          conditions: [],
        },
        {
          combatantId: fighterId,
          displayName: "Fighter",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 10,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: { successes: 0, failures: 0 },
            stable: false,
            dead: false,
          },
          conditions: [],
        },
      ],
      acts: [
        {
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "endTurn",
          },
          label: "End Turn",
          initialHoles: [],
        },
      ],
      turn: {
        actionResources: [{ kind: "action", source: "turn" }],
        bonusActionAvailable: true,
        spellSlotUsesThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    });

    expect(
      Schema.encodeSync(BattleSnapshotSchema)(snapshotBattle(state)),
    ).toMatchObject({
      battleId: "battle-1",
      combatants: [
        {
          combatantId: "goblin",
          movement: { speedFeet: 30, spentFeet: 0, remainingFeet: 30 },
        },
        {
          combatantId: "fighter",
        },
      ],
      readiedResponses: { spells: [], movements: [] },
      obscurementZones: [],
      helpAttackMarkers: [],
      pendingReaction: null,
    });
  });

  test("prepared spell attack hole codec preserves discriminated spell damage payload", () => {
    const state = startBattleRight({
      battleId: battleId("battle-prepared-spell-attack-codec"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("guiding_bolt")],
            cantrips: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("guiding_bolt");
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    if (!("spell" in attackRoll)) {
      throw new Error("Expected prepared spell attack-roll hole.");
    }
    if (attackRoll.spell.procedure !== "spellAttackDamage") {
      throw new Error("Expected spellAttackDamage invocation.");
    }

    const encoded = Schema.encodeSync(BattleHoleSchema)(attackRoll);
    expect(encoded).toMatchObject({
      kind: "attackRoll",
      spell: {
        access: { tag: "prepared" },
        procedure: "spellAttackDamage",
        damage: {
          kind: "fixedSpellAttackDamage",
          damageType: "radiant",
        },
      },
    });

    const decoded = Schema.decodeUnknownSync(BattleHoleSchema)(encoded);
    if (!("spell" in decoded)) {
      throw new Error("Expected decoded prepared spell attack-roll hole.");
    }
    if (decoded.spell.procedure !== "spellAttackDamage") {
      throw new Error("Expected decoded spellAttackDamage invocation.");
    }
    expect(decoded.spell.damage).toMatchObject({
      kind: "fixedSpellAttackDamage",
      damageType: "radiant",
    });
  });

  test("startBattle preserves caller-supplied order among tied Initiative scores", () => {
    const state = startBattleRight({
      battleId: battleId("battle-tied-initiative"),
      combatants: [
        statBlockCreatureInit({ initiative: 12 }),
        characterSeed({ initiative: 12 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
    });
  });

  test("startBattle rejects current HP above max HP", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12, currentHp: 13 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");

    expect(() =>
      startBattleRight({
        battleId: battleId("battle-statblock-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12 }),
          statBlockCreatureInit({ initiative: 10, currentHp: 11 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");
  });

  test("startBattle rejects fractional expended Spell Slots", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-fractional-spell-slot"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlotExpenditures: [{ spellLevel: 1, expended: 0.5 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot expenditure must be an integer between zero and count.",
    );
  });

  test("startBattle rejects invalid Spell Slot level and count", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-fractional-spell-slot-count"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [{ spellLevel: 1, count: 1.5 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot level must be 1-9 and count must be a non-negative integer.",
    );

    expect(() =>
      startBattleRight({
        battleId: battleId("battle-invalid-spell-slot-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [{ spellLevel: 10, count: 1 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot level must be 1-9 and count must be a non-negative integer.",
    );
  });

  test("startBattle rejects duplicate Spell Slot levels", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-duplicate-spell-slot-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [
                { spellLevel: 1, count: 2 },
                { spellLevel: 1, count: 1 },
              ],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Spell Slot levels must be unique.");
  });

  test("startBattle rejects class levels outside the character class-level domain", () => {
    for (const [battle, classLevel] of [
      ["battle-zero-class-level", 0],
      ["battle-fractional-class-level", 1.5],
      ["battle-above-class-level-cap", 21],
    ] as const) {
      expect(() =>
        startBattleRight({
          battleId: battleId(battle),
          combatants: [
            characterSeed({ initiative: 12, classLevel }),
            statBlockCreatureInit({ initiative: 10 }),
          ],
        }),
      ).toThrow("Character class levels must be integers from 1 to 20.");
    }
  });

  test("startBattle rejects duplicate character class levels", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-duplicate-character-class-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [
              { className: "fighter", level: 1 },
              { className: "fighter", level: 2 },
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Character class levels must not duplicate classes.");
  });

  test("startBattle rejects class-feature resources without an owning class level", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-second-wind-without-fighter-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [],
            resources: [resource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a fighter class level.",
    );
  });

  test("startBattle returns typed issue when an ability-modifier resource lacks its projected modifier", () => {
    const result = startBattle({
      battleId: battleId("battle-bardic-resource-missing-ability-modifier"),
      combatants: [
        characterSeed({
          initiative: 12,
          classLevels: [{ className: "bard", level: 1 }],
          resources: [{ unit: bardicInspirationUnit() }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toEqual({
      tag: "battleStateInitIssue",
      message:
        "Ability-modifier resource cap requires the projected ability modifier.",
    });
  });

  test("discoverBattleActs exposes attack, movement, and endTurn for the current actor", () => {
    const acts = discoverBattleActs(
      startBattleRight({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        { tag: "action", actorId: fighterId, action: "grapple" },
        { tag: "action", actorId: fighterId, action: "shove" },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ]),
    );
    expect(acts[0]?.initialHoles).toMatchObject([
      {
        kind: "targetChoice",
        label: "Attack target",
        choices: [goblinId],
      },
    ]);
  });

  test("discoverBattleActs omits attack when there is no target", () => {
    const acts = discoverBattleActs(
      startBattleRight({
        battleId: battleId("battle-no-target"),
        combatants: [characterSeed({ initiative: 20 })],
      }),
    );

    expect(acts.map((act) => act.subject)).not.toContainEqual(
      expect.objectContaining({ tag: "action", action: "attack" }),
    );
    expect(acts.map((act) => act.subject)).toContainEqual({
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "endTurn",
    });
  });

  test("mid-battle roster mutation preserves Initiative and current turn state", () => {
    const state = fighterVsGoblinBattle();
    const added = addBattleCombatantRight({
      state,
      combatant: statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 15,
      }),
    });

    expect(snapshotBattle(added)).toMatchObject({
      currentActorId: fighterId,
      turnOrder: [fighterId, skeletonId, goblinId],
    });

    const removedCurrent = removeBattleCombatantsRight({
      state: added,
      combatantIds: [fighterId],
    });

    expect(snapshotBattle(removedCurrent)).toMatchObject({
      currentActorId: skeletonId,
      turnOrder: [skeletonId, goblinId],
    });
  });
});
