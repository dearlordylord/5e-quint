import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { SurfaceUnitLibraryLive } from "#/authored-library.ts";
import {
  answerBattlePrompt,
  discoverAvailableBattlePrompt,
} from "#/battle-prompts.ts";
import { advanceBattleTurn, createInitiativeOrder } from "#/battle-init.ts";
import { projectRosterToBattle } from "#/battle.ts";
import { CORE_BATTLE_ACTIONS } from "#/battle-types.ts";
import { effectFromEither } from "#/effect-helpers.ts";
import { RuntimeUnitLibraryLive } from "#/hydration.ts";
import { reduceRosterState } from "#/roster.ts";
import { RuntimeUnitLibrary } from "#/services.ts";
import type {
  BattlePromptAnswer,
  BattleState,
  CreatureRosterState,
} from "#/index.ts";

const initialRoster: CreatureRosterState = {
  creatures: [
    {
      id: "fighter",
      name: "Brakka",
      sourceKind: "characterSheet",
      className: "fighter",
      level: 1,
      currentHp: 20,
      maxHp: 20,
      armorClass: 16,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
    {
      id: "cleric",
      name: "Mira",
      sourceKind: "characterSheet",
      className: "cleric",
      level: 3,
      currentHp: 18,
      maxHp: 18,
      armorClass: 15,
      spellSaveDc: 14,
      spellcastingModifier: 3,
      authoredUnitIds: ["cure_wounds"],
    },
    {
      id: "ogre",
      name: "Ogre",
      sourceKind: "statBlock",
      statBlockName: "ogre",
      level: 2,
      currentHp: 59,
      maxHp: 59,
      armorClass: 11,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
  ],
};

const promptRoster: CreatureRosterState = {
  creatures: [
    {
      id: "fighter",
      name: "Brakka",
      sourceKind: "characterSheet",
      className: "fighter",
      level: 2,
      currentHp: 20,
      maxHp: 20,
      armorClass: 16,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: ["fighter_action_surge_l2"],
    },
    {
      id: "cleric",
      name: "Mira",
      sourceKind: "characterSheet",
      className: "cleric",
      level: 3,
      currentHp: 18,
      maxHp: 18,
      armorClass: 15,
      spellSaveDc: 14,
      spellcastingModifier: 3,
      authoredUnitIds: ["cure_wounds"],
    },
    {
      id: "wizard",
      name: "Nyra",
      sourceKind: "characterSheet",
      className: "wizard",
      level: 5,
      currentHp: 22,
      maxHp: 22,
      armorClass: 12,
      spellSaveDc: 15,
      spellcastingModifier: 4,
      authoredUnitIds: ["fireball"],
    },
    {
      id: "ogre",
      name: "Ogre",
      sourceKind: "statBlock",
      statBlockName: "ogre",
      level: 2,
      currentHp: 59,
      maxHp: 59,
      armorClass: 11,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
  ],
};

async function projectPromptBattle(): Promise<BattleState> {
  const program = projectRosterToBattle(promptRoster, {
    initiativeCounts: [
      { actorId: "wizard", count: 18 },
      { actorId: "fighter", count: 16 },
      { actorId: "cleric", count: 12 },
      { actorId: "ogre", count: 9 },
    ],
    tieResolutions: [],
  }).pipe(
    Effect.provide(
      RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
    ),
  );

  return Effect.runPromise(program);
}

describe("surface runtime correction", () => {
  it("hydrates runtime units without compiling a second execution ir", async () => {
    const program = Effect.gen(function* () {
      const runtimeLibrary = yield* RuntimeUnitLibrary;
      const cureWounds = runtimeLibrary.get("cure_wounds");
      const fireball = runtimeLibrary.get("fireball");
      const actionSurge = runtimeLibrary.get("fighter_action_surge_l2");

      expect(cureWounds).toEqual({
        unit: expect.objectContaining({ id: "cure_wounds", kind: "spell" }),
      });
      expect(fireball).toEqual({
        unit: expect.objectContaining({ id: "fireball", kind: "spell" }),
      });
      expect(actionSurge).toEqual({
        unit: expect.objectContaining({
          id: "fighter_action_surge_l2",
          kind: "class_feature",
        }),
      });
    }).pipe(
      Effect.provide(
        RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
      ),
    );

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
      expect(fighter?.units[0]).not.toHaveProperty("authoredUnitId");
    }).pipe(
      Effect.provide(
        RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
      ),
    );

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

      expect(afterCleric.round).toBe(1);
      expect(afterCleric.turnNumber).toBe(3);
      expect(afterCleric.turnActorId).toBe("ogre");
      expect(afterCleric.openPrompt).toBeNull();

      expect(afterOgre.initiativeOrder).toEqual(["fighter", "cleric", "ogre"]);
      expect(afterOgre.round).toBe(2);
      expect(afterOgre.turnNumber).toBe(4);
      expect(afterOgre.turnActorId).toBe("fighter");
      expect(afterOgre.openPrompt).toBeNull();
    }).pipe(
      Effect.provide(
        RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
      ),
    );

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
          unit: {
            ownerId: "wizard",
            sourceKind: "characterSheet",
            unit: expect.objectContaining({ id: "fireball" }),
          },
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
        },
      }),
    );
  });

  it("resolves a selected unit without duplicating actor ownership", async () => {
    const battle = await projectPromptBattle();
    const wizard = battle.combatants.find(
      (combatant) => combatant.id === "wizard",
    )!;

    const resolution = answerBattlePrompt(battle, {
      tag: "chooseAction",
      choice: {
        tag: "unit",
        unit: wizard.units[0]!,
      },
    });

    expect(resolution).toEqual(
      Either.right({
        tag: "resolvedAction",
        state: {
          ...battle,
          openPrompt: null,
        },
        action: {
          tag: "useUnit",
          unit: {
            ownerId: "wizard",
            sourceKind: "characterSheet",
            unit: expect.objectContaining({ id: "fireball" }),
          },
        },
      }),
    );
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
        {
          tag: "unit",
          unit: {
            ownerId: "fighter",
            sourceKind: "characterSheet",
            unit: expect.objectContaining({ id: "fighter_action_surge_l2" }),
          },
        },
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
      }).pipe(
        Effect.provide(
          RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
        ),
      ),
    );

    expect(discoverAvailableBattlePrompt(soloBattle)).toEqual({
      tag: "chooseAction",
      actorId: "wizard",
      options: [
        { tag: "coreAction", action: "endTurn" },
        {
          tag: "unit",
          unit: {
            ownerId: "wizard",
            sourceKind: "characterSheet",
            unit: expect.objectContaining({ id: "fireball" }),
          },
        },
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
