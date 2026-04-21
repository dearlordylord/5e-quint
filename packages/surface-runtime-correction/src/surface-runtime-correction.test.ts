import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { SurfaceUnitLibraryLive } from "#/authored-library.ts";
import { projectRosterToBattle } from "#/battle.ts";
import { CORE_BATTLE_ACTIONS } from "#/battle-types.ts";
import { effectFromEither } from "#/effect-helpers.ts";
import { RuntimeUnitLibraryLive } from "#/hydration.ts";
import { reduceRosterState } from "#/roster.ts";
import { RuntimeUnitLibrary } from "#/services.ts";
import type { BattleState, CreatureRosterState } from "#/index.ts";

describe("surface runtime correction", () => {
  it("hydrates runtime units without compiling a second execution ir", async () => {
    const program = Effect.gen(function*() {
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

  it("projects owned runtime units into battle combatants without duplicate authored identity", async () => {
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
      ],
    };

    const program = Effect.gen(function*() {
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

      const battle: BattleState = yield* projectRosterToBattle(leveledRoster);
      const fighter = battle.combatants.find((combatant) => combatant.id === "fighter");
      const cleric = battle.combatants.find((combatant) => combatant.id === "cleric");

      expect(CORE_BATTLE_ACTIONS).toEqual(["attack", "endTurn"]);
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
});
