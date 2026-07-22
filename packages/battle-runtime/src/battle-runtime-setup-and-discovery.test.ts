import {
  startBattleRight,
  startBattleSessionRight,
  addBattleCombatantRight,
  removeBattleCombatantsRight,
  fighterVsGoblinBattle,
  fighterAttackSubject,
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
import { battleCreaturePresentationDisplayName } from "./stat-block-presentation.ts";
import {
  battlePresentedSnapshot,
  BattlePresentedSnapshotSchema,
} from "./index.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import {
  characterBattleLevel,
  parseCharacterBattleClassLevels,
  type CharacterBattleClassLevelInit,
} from "./character-class-level.ts";

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
    const session = startBattleSessionRight({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 12 }),
        statBlockCreatureInit({ initiative: 16, currentHp: 0 }),
      ],
    });
    const state = session.state;

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
      combatants: [
        {
          combatantId: goblinId,
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
          initialHoles: [],
        },
      ],
      turn: {
        actionResources: [{ kind: "action", source: "turn" }],
        bonusActionAvailable: true,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    });
    expect(snapshotBattle(state).combatants[0]).not.toHaveProperty(
      "displayName",
    );
    const presented = battlePresentedSnapshot(session);
    expect(Either.isRight(presented)).toBe(true);
    if (Either.isLeft(presented)) return;
    expect(presented.right.combatants[0]?.displayName).toBe("Goblin Warrior");
    expect(Schema.is(BattlePresentedSnapshotSchema)(presented.right)).toBe(
      true,
    );
    const missingPresentedName = {
      ...presented.right,
      combatants: presented.right.combatants.map(
        ({ displayName: _displayName, ...combatant }) => combatant,
      ),
    };
    expect(Schema.is(BattlePresentedSnapshotSchema)(missingPresentedName)).toBe(
      false,
    );
    expect(
      Schema.is(BattlePresentedSnapshotSchema)({
        ...presented.right,
        combatants: [
          presented.right.combatants[0],
          ...presented.right.combatants,
        ],
      }),
    ).toBe(false);
    const missingContext = battlePresentedSnapshot(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForTest(session.context.characters),
      }),
    );
    expect(missingContext).toEqual(
      Either.left([
        {
          tag: "battleSnapshotPresentationIssue",
          reason: "missingStatBlockPresentation",
          combatantId: goblinId,
        },
      ]),
    );
    const goblinPresentation = session.context.statBlocks.get(goblinId);
    expect(goblinPresentation).toBeDefined();
    if (goblinPresentation === undefined) return;
    const invalidDisplayName = battlePresentedSnapshot(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForTest(
          session.context.characters,
          new Map([[goblinId, { ...goblinPresentation, displayName: "   " }]]),
        ),
      }),
    );
    expect(invalidDisplayName).toEqual(
      Either.left([
        {
          tag: "battleSnapshotPresentationIssue",
          reason: "invalidDisplayName",
          combatantId: goblinId,
        },
      ]),
    );

    expect(
      battleCreaturePresentationDisplayName(state, session.context, goblinId),
    ).toBe("Goblin Warrior");

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
      pendingInterrupt: null,
    });
  });

  test("presented snapshots collect every independent roster issue regardless of Initiative order", () => {
    for (const [index, initiatives] of [
      { goblin: 18, skeleton: 8 },
      { goblin: 8, skeleton: 18 },
    ].entries()) {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-presentation-issues-${index}`),
        combatants: [
          statBlockCreatureInit({ initiative: initiatives.goblin }),
          statBlockCreatureInit({
            combatantId: skeletonId,
            initiative: initiatives.skeleton,
          }),
        ],
      });
      const skeletonPresentation = session.context.statBlocks.get(skeletonId);
      expect(skeletonPresentation).toBeDefined();
      if (skeletonPresentation === undefined) return;

      const result = battlePresentedSnapshot(
        battleRuntimeSessionForTest({
          state: session.state,
          context: battleRuntimeContextForTest(
            session.context.characters,
            new Map([
              [skeletonId, { ...skeletonPresentation, displayName: "   " }],
            ]),
          ),
        }),
      );
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isRight(result)) return;
      expect(result.left).toHaveLength(2);
      expect(
        new Set(
          result.left.map((issue) => `${issue.combatantId}:${issue.reason}`),
        ),
      ).toEqual(
        new Set([
          `${goblinId}:missingStatBlockPresentation`,
          `${skeletonId}:invalidDisplayName`,
        ]),
      );
    }
  });

  test("prepared spell attack hole codec preserves discriminated spell damage payload", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = findAct(session, magicSubject("guiding_bolt")).subject;
    const target = findHole(
      findAct(session, subject).initialHoles,
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
    expect("spell" in attackRoll).toBe(false);

    const encoded = Schema.encodeSync(BattleHoleSchema)(attackRoll);
    expect(encoded).toMatchObject({
      kind: "attackRoll",
    });
    expect(encoded).not.toHaveProperty("spell");

    const decoded = Schema.decodeUnknownSync(BattleHoleSchema)(encoded);
    expect("spell" in decoded).toBe(false);
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
      const result = startBattle({
        battleId: battleId(battle),
        combatants: [
          characterSeed({ initiative: 12, classLevel }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
      expect(Either.isLeft(result) ? result.left.message : "admitted").toBe(
        "fighter class level must be an integer from 1 to 20.",
      );
    }
  });

  test("startBattle rejects duplicate character class levels", () => {
    const result = startBattle({
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
    });
    expect(Either.isLeft(result) ? result.left.message : "admitted").toBe(
      "Character class levels duplicate fighter.",
    );
  });

  test("startBattle rejects multiclass totals above level 20", () => {
    const result = startBattle({
      battleId: battleId("battle-above-total-character-level-cap"),
      combatants: [
        characterSeed({
          initiative: 12,
          classLevels: [
            { className: "fighter", level: 20 },
            { className: "wizard", level: 1 },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Either.isLeft(result) ? result.left.message : "admitted").toBe(
      "Total character level must not exceed 20.",
    );
  });

  test("startBattle reports independent class-level parse issues together", () => {
    const result = startBattle({
      battleId: battleId("battle-multiple-character-class-level-issues"),
      combatants: [
        characterSeed({
          initiative: 12,
          classLevels: [
            { className: "fighter", level: 0 },
            { className: "fighter", level: 2 },
            { className: "wizard", level: 21 },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Either.isLeft(result) ? result.left.message : "admitted").toBe(
      "fighter class level must be an integer from 1 to 20.; Character class levels duplicate fighter.; wizard class level must be an integer from 1 to 20.",
    );
  });

  test("class-level parsing preserves exactly the valid multiclass aggregate", () => {
    const classLevelEntry: fc.Arbitrary<CharacterBattleClassLevelInit> =
      fc.record({
        className: fc.constantFrom("fighter", "wizard", "druid", "rogue"),
        level: fc.integer({ min: 1, max: 20 }),
      });
    const nonemptyClassLevels = fc
      .tuple(classLevelEntry, fc.array(classLevelEntry, { maxLength: 5 }))
      .map(([first, rest]) => [first, ...rest] as const);

    fc.assert(
      fc.property(nonemptyClassLevels, (classLevels) => {
        const result = parseCharacterBattleClassLevels(classLevels);
        const uniqueClassCount = new Set(
          classLevels.map((classLevel) => classLevel.className),
        ).size;
        const totalLevel = classLevels.reduce(
          (total, classLevel) => total + classLevel.level,
          0,
        );
        const validAggregate =
          uniqueClassCount === classLevels.length && totalLevel <= 20;

        expect(Either.isRight(result)).toBe(validAggregate);
        if (Either.isRight(result)) {
          expect(
            result.right.map(({ className, level }) => ({
              className,
              level: Number(level),
            })),
          ).toEqual(classLevels);
          expect(Number(characterBattleLevel(result.right))).toBe(totalLevel);
        }
      }),
      { numRuns: 100 },
    );
  });

  test("startBattle rejects class-feature resources without an owning class level", () => {
    expect(() =>
      startBattleRight({
        battleId: battleId("battle-second-wind-without-fighter-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [{ className: "wizard", level: 1 }],
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
    const session = startBattleSessionRight({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const acts = discoverBattleActs(session);

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        fighterAttackSubject(state, "Longsword"),
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
    const session = startBattleSessionRight({
      battleId: battleId("battle-no-target"),
      combatants: [characterSeed({ initiative: 20 })],
    });
    const acts = discoverBattleActs(session);

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
