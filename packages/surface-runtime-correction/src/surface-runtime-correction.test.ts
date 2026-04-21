import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { SurfaceUnitLibraryLive } from "#/authored-library.ts";
import { advanceBattleTurn, createInitiativeOrder } from "#/battle-init.ts";
import { projectRosterToBattle } from "#/battle.ts";
import { CORE_BATTLE_ACTIONS } from "#/battle-types.ts";
import { effectFromEither } from "#/effect-helpers.ts";
import { RuntimeUnitLibraryLive } from "#/hydration.ts";
import { reduceRosterState } from "#/roster.ts";
import { RuntimeUnitLibrary } from "#/services.ts";
import type { BattleState, CreatureRosterState } from "#/index.ts";

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

      expect(afterCleric.round).toBe(1);
      expect(afterCleric.turnNumber).toBe(3);
      expect(afterCleric.turnActorId).toBe("ogre");

      expect(afterOgre.initiativeOrder).toEqual(["fighter", "cleric", "ogre"]);
      expect(afterOgre.round).toBe(2);
      expect(afterOgre.turnNumber).toBe(4);
      expect(afterOgre.turnActorId).toBe("fighter");
    }).pipe(
      Effect.provide(
        RuntimeUnitLibraryLive.pipe(Layer.provide(SurfaceUnitLibraryLive)),
      ),
    );

    await Effect.runPromise(program);
  });
});
