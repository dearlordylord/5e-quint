import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  answerBattlePrompt,
  discoverAvailableBattlePrompt,
} from "#/battle-prompts.ts";
import { advanceBattleTurn, createInitiativeOrder } from "#/battle-init.ts";
import { reduceBattleState } from "#/battle-reducer.ts";
import { projectRosterToBattle } from "#/battle.ts";
import { CORE_BATTLE_ACTIONS } from "#/battle-types.ts";
import { effectFromEither } from "#/effect-helpers.ts";
import { reduceRosterState } from "#/roster.ts";
import { SurfaceUnitLibrary } from "#/services.ts";
import {
  initialRoster,
  projectPromptBattle,
  promptRoster,
  SurfaceRuntimeCorrectionTestLayer,
} from "#/test-support.ts";
import type {
  BattlePromptAnswer,
  BattleState,
  CreatureRosterState,
} from "#/index.ts";

describe("surface runtime correction", () => {
  it("exposes authored surface units without compiling a second execution ir", async () => {
    const program = Effect.gen(function* () {
      const surfaceLibrary = yield* SurfaceUnitLibrary;
      const cureWounds = surfaceLibrary.get("cure_wounds");
      const fireball = surfaceLibrary.get("fireball");
      const actionSurge = surfaceLibrary.get("fighter_action_surge_l2");

      expect(cureWounds).toEqual(
        expect.objectContaining({ id: "cure_wounds", kind: "spell" }),
      );
      expect(fireball).toEqual(
        expect.objectContaining({ id: "fireball", kind: "spell" }),
      );
      expect(actionSurge).toEqual(
        expect.objectContaining({
          id: "fighter_action_surge_l2",
          kind: "class_feature",
        }),
      );
    }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer));

    await Effect.runPromise(program);
  });

  it("projects initiative counts and stable turn ownership into battle state", async () => {
    const program = Effect.gen(function* () {
      const leveledRoster = yield* effectFromEither(
        Either.flatMap(
          reduceRosterState(initialRoster, {
            tag: "levelUpCharacter",
            creatureId: "fighter",
            newLevel: 2,
          }),
          (state) =>
            reduceRosterState(state, {
              tag: "grantUnitToCharacter",
              creatureId: "fighter",
              unitId: "fighter_action_surge_l2",
            }),
        ),
      );

      const battle: BattleState = yield* projectRosterToBattle(leveledRoster, {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
        ],
        tieResolutions: [],
      });
      const fighter = battle.combatants.find(
        (combatant) => combatant.id === "fighter",
      );
      const cleric = battle.combatants.find(
        (combatant) => combatant.id === "cleric",
      );

      expect(CORE_BATTLE_ACTIONS).toEqual(["attack", "endTurn"]);
      expect(battle.initiativeCounts).toEqual([
        { actorId: "fighter", count: 18 },
        { actorId: "cleric", count: 12 },
        { actorId: "ogre", count: 9 },
      ]);
      expect(battle.initiativeOrder).toEqual(["fighter", "cleric", "ogre"]);
      expect(battle.round).toBe(1);
      expect(battle.turnNumber).toBe(1);
      expect(battle.turnActorId).toBe("fighter");
      expect(battle.standardActionsRemaining).toBe(1);
      expect(battle.restrictedActionsRemaining).toBe(0);
      expect(fighter?.units).toEqual([
        {
          ownerId: "fighter",
          sourceKind: "characterSheet",
          unit: expect.objectContaining({ id: "fighter_action_surge_l2" }),
        },
      ]);
      expect(cleric?.units).toEqual([
        {
          ownerId: "cleric",
          sourceKind: "characterSheet",
          unit: expect.objectContaining({ id: "cure_wounds" }),
        },
      ]);
      expect(fighter?.unitResourceStates).toEqual([
        {
          unitId: "fighter_action_surge_l2",
          expendedUses: 0,
          usedThisTurn: false,
        },
      ]);
      expect(fighter?.units[0]).not.toHaveProperty("authoredUnitId");
    }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer));

    await Effect.runPromise(program);
  });

  it("uses table-supplied tie order when initiative counts tie", () => {
    const initiativeOrder = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 15 },
          { actorId: "cleric", count: 15 },
          { actorId: "ogre", count: 8 },
        ],
        tieResolutions: [{ actorIds: ["cleric", "fighter"] }],
      },
    );

    expect(initiativeOrder).toEqual(
      Either.right(["cleric", "fighter", "ogre"]),
    );
  });

  it("rejects initiative counts that omit a participating combatant", () => {
    const initiativeOrder = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "cleric", count: 12 },
        ],
        tieResolutions: [],
      },
    );

    expect(initiativeOrder).toEqual(
      Either.left(
        expect.objectContaining({
          message: "initiative counts are missing actor ids: ogre",
        }),
      ),
    );
  });

  it("rejects initiative counts that name actors outside the battle", () => {
    const initiativeOrder = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
          { actorId: "ghost", count: 7 },
        ],
        tieResolutions: [],
      },
    );

    expect(initiativeOrder).toEqual(
      Either.left(
        expect.objectContaining({
          message: "initiative counts contain unknown actor ids: ghost",
        }),
      ),
    );
  });

  it("rejects battle init for an empty battle that still names outside actors", () => {
    const initiativeOrder = createInitiativeOrder([], {
      initiativeCounts: [{ actorId: "ghost", count: 7 }],
      tieResolutions: [],
    });

    expect(initiativeOrder).toEqual(
      Either.left(
        expect.objectContaining({
          message: "initiative counts contain unknown actor ids: ghost",
        }),
      ),
    );
  });

  it("rejects tie resolution input that includes actors outside the tied cohort", () => {
    const initiativeOrder = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 15 },
          { actorId: "cleric", count: 15 },
          { actorId: "ogre", count: 8 },
        ],
        tieResolutions: [{ actorIds: ["cleric", "fighter", "ogre"] }],
      },
    );

    expect(initiativeOrder).toEqual(
      Either.left(
        expect.objectContaining({
          message: "missing tie resolution for tied actors: fighter, cleric",
        }),
      ),
    );
  });

  it("rejects initiative counts that repeat the same actor id", () => {
    const initiativeOrder = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
          { actorId: "fighter", count: 6 },
        ],
        tieResolutions: [],
      },
    );

    expect(initiativeOrder).toEqual(
      Either.left(
        expect.objectContaining({
          message: "initiative counts contain duplicate actor ids: fighter",
        }),
      ),
    );
  });

  it("advances turn ownership across a round boundary without changing initiative order", async () => {
    const program = Effect.gen(function* () {
      const battle = yield* projectRosterToBattle(initialRoster, {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
        ],
        tieResolutions: [],
      });

      const afterFighter = advanceBattleTurn(battle);
      const afterCleric = advanceBattleTurn(afterFighter);
      const afterOgre = advanceBattleTurn(afterCleric);

      expect(afterFighter.initiativeOrder).toEqual([
        "fighter",
        "cleric",
        "ogre",
      ]);
      expect(afterFighter.round).toBe(1);
      expect(afterFighter.turnNumber).toBe(2);
      expect(afterFighter.turnActorId).toBe("cleric");
      expect(afterFighter.openPrompt).toBeNull();
      expect(afterFighter.standardActionsRemaining).toBe(1);
      expect(afterFighter.restrictedActionsRemaining).toBe(0);

      expect(afterCleric.round).toBe(1);
      expect(afterCleric.turnNumber).toBe(3);
      expect(afterCleric.turnActorId).toBe("ogre");
      expect(afterCleric.openPrompt).toBeNull();

      expect(afterOgre.initiativeOrder).toEqual(["fighter", "cleric", "ogre"]);
      expect(afterOgre.round).toBe(2);
      expect(afterOgre.turnNumber).toBe(4);
      expect(afterOgre.turnActorId).toBe("fighter");
      expect(afterOgre.openPrompt).toBeNull();
    }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer));

    await Effect.runPromise(program);
  });

  it("derives the current choose-action prompt from battle state", async () => {
    const battle = await projectPromptBattle();

    // RAW/UL check: the current prompt belongs to the turn owner in initiative
    // order, matching Playing-the-Game.md ("The Order of Combat", "Your Turn")
    // and the Initiative / Turn / Action terms in UBIQUITOUS_LANGUAGE.md.
    expect(discoverAvailableBattlePrompt(battle)).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
        {
          tag: "unit",
          unitId: "fireball",
        },
      ],
    });
  });

  it("resolves a complete prompt answer directly when no follow-up input is needed", async () => {
    const battle = await projectPromptBattle();

    const resolution = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: { tag: "coreAction", action: "endTurn" },
    });

    expect(resolution).toEqual(
      Either.right({
        tag: "resolvedAction",
        state: { ...battle, openPrompt: null },
        action: {
          tag: "endTurn",
          actorId: "wizard",
        },
      }),
    );
  });

  it("can open a new prompt after a complete answer selects attack", async () => {
    const battle = await projectPromptBattle();

    const chooseAttack = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "coreAction",
        action: "attack",
      },
    });

    expect(chooseAttack).toEqual(
      Either.right({
        tag: "openedPrompt",
        state: {
          ...battle,
          openPrompt: {
            tag: "chooseAttackTarget",
          },
        },
        prompt: {
          tag: "chooseAttackTarget",
          actorId: "wizard",
          availableTargetIds: ["fighter", "cleric", "ogre"],
          damageLabel: "attack_damage",
        },
      }),
    );
  });

  it("runs the attack flow through prompt discovery and battle reduction", async () => {
    const battle = await projectPromptBattle();

    const chooseAttack = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "coreAction",
        action: "attack",
      },
    });
    expect(Either.isRight(chooseAttack)).toBe(true);
    if (Either.isLeft(chooseAttack) || chooseAttack.right.tag !== "openedPrompt") {
      return;
    }

    const resolvedAttack = answerBattlePrompt(chooseAttack.right.state, {
      tag: "chooseAttackTarget",
      targetId: "ogre",
      damage: 7,
    });
    expect(Either.isRight(resolvedAttack)).toBe(true);
    if (Either.isLeft(resolvedAttack) || resolvedAttack.right.tag !== "resolvedAction") {
      return;
    }

    const reduced = reduceBattleState(
      resolvedAttack.right.state,
      resolvedAttack.right.action,
    );
    expect(reduced).toEqual(
      Either.right({
        ...battle,
        openPrompt: null,
        standardActionsRemaining: 0,
        restrictedActionsRemaining: 0,
        combatants: expect.arrayContaining([
          expect.objectContaining({ id: "ogre", currentHp: 52 }),
        ]),
      }),
    );
  });

  it("keeps 0-hp combatants targetable for attack prompts in this slice", async () => {
    const zeroHpRoster: CreatureRosterState = {
      creatures: promptRoster.creatures.map((creature) =>
        creature.id === "ogre" ? { ...creature, currentHp: 0 } : creature,
      ),
    };
    const battle = await Effect.runPromise(
      projectRosterToBattle(zeroHpRoster, {
        initiativeCounts: [
          { actorId: "wizard", count: 18 },
          { actorId: "fighter", count: 16 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
        ],
        tieResolutions: [],
      }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer)),
    );

    const prompt = discoverAvailableBattlePrompt(battle);
    expect(prompt).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
        { tag: "unit", unitId: "fireball" },
      ],
    });

    const chooseAttack = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: { tag: "coreAction", action: "attack" },
    });
    expect(Either.isRight(chooseAttack)).toBe(true);
    if (Either.isLeft(chooseAttack) || chooseAttack.right.tag !== "openedPrompt") {
      return;
    }
    expect(chooseAttack.right.prompt.tag).toBe("chooseAttackTarget");
    if (chooseAttack.right.prompt.tag !== "chooseAttackTarget") {
      return;
    }

    expect(chooseAttack.right.prompt.availableTargetIds).toEqual([
      "fighter",
      "cleric",
      "ogre",
    ]);
  });

  it("clears any open prompt when turn ownership advances", async () => {
    const battle = await projectPromptBattle();

    const chooseAttack = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "coreAction",
        action: "attack",
      },
    });

    expect(Either.isRight(chooseAttack)).toBe(true);
    if (Either.isLeft(chooseAttack)) {
      return;
    }

    const nextTurn = advanceBattleTurn(chooseAttack.right.state);

    expect(nextTurn.turnActorId).toBe("fighter");
    expect(nextTurn.openPrompt).toBeNull();
    expect(discoverAvailableBattlePrompt(nextTurn)).toEqual({
      tag: "chooseAction",
      actorId: "fighter",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
        { tag: "unit", unitId: "fighter_action_surge_l2" },
      ],
    });
  });

  it("does not advertise attack when the current actor has no legal target", async () => {
    const soloRoster: CreatureRosterState = {
      creatures: [promptRoster.creatures[2]!],
    };
    const soloBattle = await Effect.runPromise(
      projectRosterToBattle(soloRoster, {
        initiativeCounts: [{ actorId: "wizard", count: 18 }],
        tieResolutions: [],
      }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer)),
    );

    expect(discoverAvailableBattlePrompt(soloBattle)).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [
        { tag: "coreAction", action: "endTurn" },
        { tag: "unit", unitId: "fireball" },
      ],
    });
  });

  it("runs the end-turn flow through reduction", async () => {
    const battle = await projectPromptBattle();

    const resolvedEndTurn = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: { tag: "coreAction", action: "endTurn" },
    });
    expect(Either.isRight(resolvedEndTurn)).toBe(true);
    if (
      Either.isLeft(resolvedEndTurn) ||
      resolvedEndTurn.right.tag !== "resolvedAction"
    ) {
      return;
    }

    const reduced = reduceBattleState(
      resolvedEndTurn.right.state,
      resolvedEndTurn.right.action,
    );
    expect(reduced).toEqual(
      Either.right(
        expect.objectContaining({
          turnActorId: "fighter",
          standardActionsRemaining: 1,
          restrictedActionsRemaining: 0,
          openPrompt: null,
        }),
      ),
    );
  });

  it("runs the cure wounds flow through structural single-target healing", async () => {
    const injuredRoster: CreatureRosterState = {
      creatures: promptRoster.creatures.map((creature) =>
        creature.id === "fighter"
          ? { ...creature, currentHp: 9 }
          : creature,
      ),
    };

    const battle = await Effect.runPromise(
      projectRosterToBattle(injuredRoster, {
        initiativeCounts: [
          { actorId: "cleric", count: 18 },
          { actorId: "wizard", count: 16 },
          { actorId: "fighter", count: 12 },
          { actorId: "ogre", count: 9 },
        ],
        tieResolutions: [],
      }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer)),
    );

    const chooseUnit = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitId: "cure_wounds",
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "openedPrompt") {
      return;
    }

    expect(chooseUnit.right.prompt).toEqual({
      tag: "chooseSingleTargetUnit",
      actorId: "cleric",
      unitId: "cure_wounds",
      targeting: {
        tag: "touchCreature",
      },
      effect: { tag: "healHp" },
    });

    const resolvedHeal = answerBattlePrompt(chooseUnit.right.state, {
      tag: "chooseSingleTargetUnit",
      targetId: "fighter",
      total: 8,
    });
    expect(Either.isRight(resolvedHeal)).toBe(true);
    if (Either.isLeft(resolvedHeal) || resolvedHeal.right.tag !== "resolvedAction") {
      return;
    }

    const reduced = reduceBattleState(
      resolvedHeal.right.state,
      resolvedHeal.right.action,
    );
    expect(reduced).toEqual(
      Either.right(
        expect.objectContaining({
          standardActionsRemaining: 0,
          combatants: expect.arrayContaining([
            expect.objectContaining({ id: "fighter", currentHp: 17 }),
          ]),
        }),
      ),
    );
  });

  it("runs the fireball flow through structural area save damage", async () => {
    const battle = await projectPromptBattle();

    const chooseUnit = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitId: "fireball",
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "openedPrompt") {
      return;
    }

    expect(chooseUnit.right.prompt).toEqual({
      tag: "chooseAreaEffect",
      actorId: "wizard",
      unitId: "fireball",
      targeting: {
        tag: "pointWithinRangeSphere",
        rangeFeet: 150,
        radiusFeet: 20,
      },
      save: { ability: "dex", dc: 15 },
      effect: {
        tag: "damage",
        damageType: "fire",
        onSuccess: "half",
      },
    });

    const resolvedFireball = answerBattlePrompt(chooseUnit.right.state, {
      tag: "chooseAreaEffect",
      targetResults: [
        { targetId: "fighter", saveOutcome: "failure" },
        { targetId: "cleric", saveOutcome: "success" },
        { targetId: "ogre", saveOutcome: "failure" },
      ],
      total: 10,
    });
    expect(Either.isRight(resolvedFireball)).toBe(true);
    if (
      Either.isLeft(resolvedFireball) ||
      resolvedFireball.right.tag !== "resolvedAction"
    ) {
      return;
    }

    const reduced = reduceBattleState(
      resolvedFireball.right.state,
      resolvedFireball.right.action,
    );
    expect(reduced).toEqual(
      Either.right(
        expect.objectContaining({
          standardActionsRemaining: 0,
          combatants: expect.arrayContaining([
            expect.objectContaining({ id: "fighter", currentHp: 10 }),
            expect.objectContaining({ id: "cleric", currentHp: 4 }),
            expect.objectContaining({ id: "ogre", currentHp: 49 }),
          ]),
        }),
      ),
    );
  });

  it("runs a full turn through prompt discovery, follow-up prompting, reduction, and next-turn discovery", async () => {
    const battle = await projectPromptBattle();

    expect(discoverAvailableBattlePrompt(battle)).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
        { tag: "unit", unitId: "fireball" },
      ],
    });

    const chooseFireball = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitId: "fireball",
      },
    });
    expect(chooseFireball).toEqual(
      Either.right({
        tag: "openedPrompt",
        state: {
          ...battle,
          openPrompt: {
            tag: "chooseAreaEffect",
            unitId: "fireball",
          },
        },
        prompt: {
          tag: "chooseAreaEffect",
          actorId: "wizard",
          unitId: "fireball",
          targeting: {
            tag: "pointWithinRangeSphere",
            rangeFeet: 150,
            radiusFeet: 20,
          },
          save: { ability: "dex", dc: 15 },
          effect: {
            tag: "damage",
            damageType: "fire",
            onSuccess: "half",
          },
        },
      }),
    );
    if (Either.isLeft(chooseFireball) || chooseFireball.right.tag !== "openedPrompt") {
      return;
    }

    const resolvedFireball = answerBattlePrompt(chooseFireball.right.state, {
      tag: "chooseAreaEffect",
      targetResults: [
        { targetId: "fighter", saveOutcome: "failure" },
        { targetId: "cleric", saveOutcome: "success" },
        { targetId: "ogre", saveOutcome: "failure" },
      ],
      total: 10,
    });
    expect(Either.isRight(resolvedFireball)).toBe(true);
    if (
      Either.isLeft(resolvedFireball) ||
      resolvedFireball.right.tag !== "resolvedAction"
    ) {
      return;
    }

    const afterFireball = reduceBattleState(
      resolvedFireball.right.state,
      resolvedFireball.right.action,
    );
    expect(afterFireball).toEqual(
      Either.right(
        expect.objectContaining({
          turnActorId: "wizard",
          openPrompt: null,
          standardActionsRemaining: 0,
          restrictedActionsRemaining: 0,
          combatants: expect.arrayContaining([
            expect.objectContaining({ id: "fighter", currentHp: 10 }),
            expect.objectContaining({ id: "cleric", currentHp: 4 }),
            expect.objectContaining({ id: "ogre", currentHp: 49 }),
          ]),
        }),
      ),
    );
    if (Either.isLeft(afterFireball)) {
      return;
    }

    expect(discoverAvailableBattlePrompt(afterFireball.right)).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [{ tag: "coreAction", action: "endTurn" }],
    });

    const resolvedEndTurn = answerBattlePrompt(afterFireball.right, {
      tag: "chooseAction",
      choice: { tag: "coreAction", action: "endTurn" },
    });
    expect(Either.isRight(resolvedEndTurn)).toBe(true);
    if (
      Either.isLeft(resolvedEndTurn) ||
      resolvedEndTurn.right.tag !== "resolvedAction"
    ) {
      return;
    }

    const nextTurn = reduceBattleState(
      resolvedEndTurn.right.state,
      resolvedEndTurn.right.action,
    );
    expect(nextTurn).toEqual(
      Either.right(
        expect.objectContaining({
          turnActorId: "fighter",
          round: 1,
          turnNumber: 2,
          openPrompt: null,
          standardActionsRemaining: 1,
          restrictedActionsRemaining: 0,
        }),
      ),
    );
    if (Either.isLeft(nextTurn)) {
      return;
    }

    expect(discoverAvailableBattlePrompt(nextTurn.right)).toEqual({
      tag: "chooseAction",
      actorId: "fighter",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
        { tag: "unit", unitId: "fighter_action_surge_l2" },
      ],
    });
  });

  it("runs the action surge flow through structural extra-action granting", async () => {
    const battle = await Effect.runPromise(
      projectRosterToBattle(promptRoster, {
        initiativeCounts: [
          { actorId: "fighter", count: 18 },
          { actorId: "wizard", count: 16 },
          { actorId: "cleric", count: 12 },
          { actorId: "ogre", count: 9 },
        ],
        tieResolutions: [],
      }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer)),
    );

    const chooseUnit = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitId: "fighter_action_surge_l2",
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "resolvedAction") {
      return;
    }
    expect(chooseUnit.right.action).toEqual({
      tag: "grantExtraAction",
      actorId: "fighter",
      unitId: "fighter_action_surge_l2",
    });

    const reduced = reduceBattleState(
      chooseUnit.right.state,
      chooseUnit.right.action,
    );
    expect(reduced).toEqual(
      Either.right(
        expect.objectContaining({
          standardActionsRemaining: 1,
          restrictedActionsRemaining: 1,
          combatants: expect.arrayContaining([
            expect.objectContaining({
              id: "fighter",
              unitResourceStates: [
                {
                  unitId: "fighter_action_surge_l2",
                  expendedUses: 1,
                  usedThisTurn: true,
                },
              ],
            }),
          ]),
        }),
      ),
    );
    if (Either.isLeft(reduced)) {
      return;
    }

    expect(discoverAvailableBattlePrompt(reduced.right)).toEqual({
      tag: "chooseAction",
      actorId: "fighter",
      options: [
        { tag: "coreAction", action: "attack" },
        { tag: "coreAction", action: "endTurn" },
      ],
    });
  });

  it("makes partial prompt answers unrepresentable at the type level", () => {
    // @ts-expect-error chooseAction answers must include a selected choice.
    const invalidPartialAnswer: BattlePromptAnswer = {
      tag: "chooseAction",
    };

    expect(invalidPartialAnswer).toBeDefined();
  });
});
