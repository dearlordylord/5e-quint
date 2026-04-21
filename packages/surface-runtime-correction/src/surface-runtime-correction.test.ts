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
import { runtimeUnitAccessId } from "#/types.ts";
import type {
  BattlePromptAnswer,
  BattleState,
  CreatureRosterState,
} from "#/index.ts";

const FIREBALL_ACCESS_ID = runtimeUnitAccessId("characterSheet:wizard:fireball");
const CURE_WOUNDS_ACCESS_ID = runtimeUnitAccessId(
  "characterSheet:cleric:cure_wounds",
);
const ACTION_SURGE_ACCESS_ID = runtimeUnitAccessId(
  "characterSheet:fighter:fighter_action_surge_l2",
);

function combatants(state: BattleState) {
  return [state.currentParticipant, ...state.waitingParticipants].map(
    (participant) => participant.combatant,
  );
}

function initiativeCounts(state: BattleState) {
  return canonicalTurnOrder(state).map((participant) => ({
    actorId: participant.combatant.id,
    count: participant.initiativeCount,
  }));
}

function initiativeOrder(state: BattleState) {
  return canonicalTurnOrder(state).map((participant) => participant.combatant.id);
}

function currentActorId(state: BattleState) {
  return state.currentParticipant.combatant.id;
}

function canonicalTurnOrder(state: BattleState) {
  const turnOrder = [state.currentParticipant, ...state.waitingParticipants];
  const offset = (state.turnNumber - 1) % turnOrder.length;
  if (offset === 0) {
    return [...turnOrder];
  }
  return [
    ...turnOrder.slice(turnOrder.length - offset),
    ...turnOrder.slice(0, turnOrder.length - offset),
  ];
}

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
      const fighter = combatants(battle).find(
        (combatant) => combatant.id === "fighter",
      );
      const cleric = combatants(battle).find(
        (combatant) => combatant.id === "cleric",
      );

      expect(CORE_BATTLE_ACTIONS).toEqual(["attack", "endTurn"]);
      expect(initiativeCounts(battle)).toEqual([
        { actorId: "fighter", count: 18 },
        { actorId: "cleric", count: 12 },
        { actorId: "ogre", count: 9 },
      ]);
      expect(initiativeOrder(battle)).toEqual(["fighter", "cleric", "ogre"]);
      expect(battle.round).toBe(1);
      expect(battle.turnNumber).toBe(1);
      expect(currentActorId(battle)).toBe("fighter");
      expect(battle.standardActionsRemaining).toBe(1);
      expect(battle.nonMagicActionsRemaining).toBe(0);
      expect(fighter?.units).toEqual([
        {
          accessId: ACTION_SURGE_ACCESS_ID,
          battleSourceRef: "characterSheet:fighter",
          unit: expect.objectContaining({ id: "fighter_action_surge_l2" }),
        },
      ]);
      expect(cleric?.units).toEqual([
        {
          accessId: CURE_WOUNDS_ACCESS_ID,
          battleSourceRef: "characterSheet:cleric",
          unit: expect.objectContaining({ id: "cure_wounds" }),
        },
      ]);
      expect(fighter?.unitResourceStates).toEqual([
        {
          unitAccessId: ACTION_SURGE_ACCESS_ID,
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

      expect(initiativeOrder(afterFighter)).toEqual([
        "fighter",
        "cleric",
        "ogre",
      ]);
      expect(afterFighter.round).toBe(1);
      expect(afterFighter.turnNumber).toBe(2);
      expect(currentActorId(afterFighter)).toBe("cleric");
      expect(afterFighter.openPrompt).toBeNull();
      expect(afterFighter.standardActionsRemaining).toBe(1);
      expect(afterFighter.nonMagicActionsRemaining).toBe(0);

      expect(afterCleric.round).toBe(1);
      expect(afterCleric.turnNumber).toBe(3);
      expect(currentActorId(afterCleric)).toBe("ogre");
      expect(afterCleric.openPrompt).toBeNull();

      expect(initiativeOrder(afterOgre)).toEqual(["fighter", "cleric", "ogre"]);
      expect(afterOgre.round).toBe(2);
      expect(afterOgre.turnNumber).toBe(4);
      expect(currentActorId(afterOgre)).toBe("fighter");
      expect(afterOgre.openPrompt).toBeNull();
    }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer));

    await Effect.runPromise(program);
  });

  it("derives the current choose-action prompt from battle state", async () => {
    const battle = await projectPromptBattle();

    // RAW/UL check: the current prompt belongs to the turn owner in initiative
    // order, matching Playing-the-Game.md ("The Order of Combat", "Your Turn")
    // and the Initiative / Turn / Action terms in UBIQUITOUS_LANGUAGE.md.
    expect(discoverAvailableBattlePrompt(battle)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "wizard",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
          {
            tag: "unit",
            unitAccessId: FIREBALL_ACCESS_ID,
          },
        ],
      }),
    );
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
      Either.right(
        expect.objectContaining({
          openPrompt: null,
          standardActionsRemaining: 0,
          nonMagicActionsRemaining: 0,
        }),
      ),
    );
    if (Either.isRight(reduced)) {
      expect(combatants(reduced.right)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "ogre", currentHp: 52 }),
        ]),
      );
    }
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
    expect(prompt).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "wizard",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
          { tag: "unit", unitAccessId: FIREBALL_ACCESS_ID },
        ],
      }),
    );

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

    expect(currentActorId(nextTurn)).toBe("fighter");
    expect(nextTurn.openPrompt).toBeNull();
    expect(discoverAvailableBattlePrompt(nextTurn)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "fighter",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
          { tag: "unit", unitAccessId: ACTION_SURGE_ACCESS_ID },
        ],
      }),
    );
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

    expect(discoverAvailableBattlePrompt(soloBattle)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "wizard",
        options: [
          { tag: "coreAction", action: "endTurn" },
          { tag: "unit", unitAccessId: FIREBALL_ACCESS_ID },
        ],
      }),
    );
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
          standardActionsRemaining: 1,
          nonMagicActionsRemaining: 0,
          openPrompt: null,
        }),
      ),
    );
    if (Either.isRight(reduced)) {
      expect(currentActorId(reduced.right)).toBe("fighter");
    }
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
        unitAccessId: CURE_WOUNDS_ACCESS_ID,
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "openedPrompt") {
      return;
    }

    expect(chooseUnit.right.prompt).toEqual({
      tag: "chooseSingleTargetUnit",
      actorId: "cleric",
      unitAccessId: CURE_WOUNDS_ACCESS_ID,
      targeting: {
        tag: "touchCreature",
      },
      effect: { tag: "healHp" },
    });

    const resolvedHeal = answerBattlePrompt(chooseUnit.right.state, {
      tag: "chooseSingleTargetUnit",
      targetId: "fighter",
      amount: 8,
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
        }),
      ),
    );
    if (Either.isRight(reduced)) {
      expect(combatants(reduced.right)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "fighter", currentHp: 17 }),
        ]),
      );
    }
  });

  it("runs the fireball flow through structural area save damage", async () => {
    const battle = await projectPromptBattle();

    const chooseUnit = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitAccessId: FIREBALL_ACCESS_ID,
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "openedPrompt") {
      return;
    }

    expect(chooseUnit.right.prompt).toEqual({
      tag: "chooseAreaEffect",
      actorId: "wizard",
      unitAccessId: FIREBALL_ACCESS_ID,
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
      amount: 10,
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
        }),
      ),
    );
    if (Either.isRight(reduced)) {
      expect(combatants(reduced.right)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "fighter", currentHp: 10 }),
          expect.objectContaining({ id: "cleric", currentHp: 4 }),
          expect.objectContaining({ id: "ogre", currentHp: 49 }),
        ]),
      );
    }
  });

  it("runs a full turn through prompt discovery, follow-up prompting, reduction, and next-turn discovery", async () => {
    const battle = await projectPromptBattle();

    expect(discoverAvailableBattlePrompt(battle)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "wizard",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
          { tag: "unit", unitAccessId: FIREBALL_ACCESS_ID },
        ],
      }),
    );

    const chooseFireball = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unitAccessId: FIREBALL_ACCESS_ID,
      },
    });
    expect(chooseFireball).toEqual(
      Either.right({
        tag: "openedPrompt",
        state: {
          ...battle,
          openPrompt: {
            tag: "chooseAreaEffect",
            unitAccessId: FIREBALL_ACCESS_ID,
          },
        },
        prompt: {
          tag: "chooseAreaEffect",
          actorId: "wizard",
          unitAccessId: FIREBALL_ACCESS_ID,
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
      amount: 10,
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
          openPrompt: null,
          standardActionsRemaining: 0,
          nonMagicActionsRemaining: 0,
        }),
      ),
    );
    if (Either.isLeft(afterFireball)) {
      return;
    }
    expect(combatants(afterFireball.right)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "fighter", currentHp: 10 }),
        expect.objectContaining({ id: "cleric", currentHp: 4 }),
        expect.objectContaining({ id: "ogre", currentHp: 49 }),
      ]),
    );
    expect(currentActorId(afterFireball.right)).toBe("wizard");

    expect(discoverAvailableBattlePrompt(afterFireball.right)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "wizard",
        options: [{ tag: "coreAction", action: "endTurn" }],
      }),
    );

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
          round: 1,
          turnNumber: 2,
          openPrompt: null,
          standardActionsRemaining: 1,
          nonMagicActionsRemaining: 0,
        }),
      ),
    );
    if (Either.isLeft(nextTurn)) {
      return;
    }
    expect(currentActorId(nextTurn.right)).toBe("fighter");

    expect(discoverAvailableBattlePrompt(nextTurn.right)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "fighter",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
          { tag: "unit", unitAccessId: ACTION_SURGE_ACCESS_ID },
        ],
      }),
    );
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
        unitAccessId: ACTION_SURGE_ACCESS_ID,
      },
    });
    expect(Either.isRight(chooseUnit)).toBe(true);
    if (Either.isLeft(chooseUnit) || chooseUnit.right.tag !== "resolvedAction") {
      return;
    }
    expect(chooseUnit.right.action).toEqual({
      tag: "grantExtraAction",
      actorId: "fighter",
      unitAccessId: ACTION_SURGE_ACCESS_ID,
    });

    const reduced = reduceBattleState(
      chooseUnit.right.state,
      chooseUnit.right.action,
    );
    expect(reduced).toEqual(
      Either.right(
        expect.objectContaining({
          standardActionsRemaining: 1,
          nonMagicActionsRemaining: 1,
        }),
      ),
    );
    if (Either.isRight(reduced)) {
      expect(combatants(reduced.right)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "fighter",
            unitResourceStates: [
              {
                unitAccessId: ACTION_SURGE_ACCESS_ID,
                expendedUses: 1,
                usedThisTurn: true,
              },
            ],
          }),
        ]),
      );
    }
    if (Either.isLeft(reduced)) {
      return;
    }

    expect(discoverAvailableBattlePrompt(reduced.right)).toEqual(
      Either.right({
        tag: "chooseAction",
        actorId: "fighter",
        options: [
          { tag: "coreAction", action: "attack" },
          { tag: "coreAction", action: "endTurn" },
        ],
      }),
    );
  });

  it("makes partial prompt answers unrepresentable at the type level", () => {
    // @ts-expect-error chooseAction answers must include a selected choice.
    const invalidPartialAnswer: BattlePromptAnswer = {
      tag: "chooseAction",
    };

    expect(invalidPartialAnswer).toBeDefined();
  });
});
