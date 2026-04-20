import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ToySurfaceUnitLibraryLive } from "#/authored-library.ts";
import { projectToyRosterToBattle, reduceToyBattleState } from "#/battle.ts";
import { effectFromEither } from "#/effect-helpers.ts";
import { ToyRuntimeUnitLibraryLive } from "#/hydration.ts";
import { reduceToyRosterState } from "#/roster.ts";
import { ToyRuntimeUnitLibrary } from "#/services.ts";
import type { ToyBattleState, ToyCreatureRosterState } from "#/types.ts";

describe("toy surface hydration vertical", () => {
  it("hydrates real authored units and drives toy reducers end to end", async () => {
    const initialRoster: ToyCreatureRosterState = {
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
          id: "wizard",
          name: "Nox",
          sourceKind: "characterSheet",
          className: "wizard",
          level: 5,
          currentHp: 16,
          maxHp: 16,
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
          level: 4,
          currentHp: 30,
          maxHp: 30,
          armorClass: 11,
          spellSaveDc: null,
          spellcastingModifier: null,
          authoredUnitIds: [],
        },
      ],
    };

    const program = Effect.gen(function*() {
      const runtimeLibrary = yield* ToyRuntimeUnitLibrary;
      expect([...runtimeLibrary.keys()].sort()).toEqual([
        "cure_wounds",
        "fighter_action_surge_l2",
        "fireball",
      ]);

      const leveledRoster = yield* effectFromEither(
        Either.flatMap(
          reduceToyRosterState(initialRoster, {
            tag: "levelUpCharacter",
            creatureId: "fighter",
            newLevel: 2,
          }),
          (state) =>
            reduceToyRosterState(state, {
              tag: "grantUnitToCharacter",
              creatureId: "fighter",
              unitId: "fighter_action_surge_l2",
            }),
        ),
      );

      let battle: ToyBattleState = yield* projectToyRosterToBattle(leveledRoster);

      battle = yield* effectFromEither(
        reduceToyBattleState(battle, {
          tag: "activateGrantExtraAction",
          actorId: "fighter",
          unitId: "fighter_action_surge_l2",
        }),
      );

      expect(
        battle.combatants.find((combatant) => combatant.id === "fighter"),
      ).toMatchObject({
        actionsRemaining: 2,
        actionSurgeUsesRemaining: 0,
        actionSurgeUsedThisTurn: true,
        extraActionForbiddenKinds: ["magic"],
      });

      battle = yield* effectFromEither(
        reduceToyBattleState(battle, {
          tag: "activateAreaSaveDamage",
          actorId: "wizard",
          unitId: "fireball",
          slotLevel: 3,
          targetIds: ["fighter", "ogre"],
          failedTargetIds: ["ogre"],
          rolledDamage: 28,
        }),
      );

      expect(
        battle.combatants.find((combatant) => combatant.id === "fighter")
          ?.currentHp,
      ).toBe(6);
      expect(
        battle.combatants.find((combatant) => combatant.id === "ogre")
          ?.currentHp,
      ).toBe(2);

      battle = yield* effectFromEither(
        reduceToyBattleState(battle, {
          tag: "activateSingleTargetHeal",
          actorId: "cleric",
          unitId: "cure_wounds",
          targetId: "fighter",
          slotLevel: 1,
          rolledHealing: 9,
        }),
      );

      expect(
        battle.combatants.find((combatant) => combatant.id === "fighter")
          ?.currentHp,
      ).toBe(18);
    }).pipe(
      Effect.provide(
        ToyRuntimeUnitLibraryLive.pipe(Layer.provide(ToySurfaceUnitLibraryLive)),
      ),
    );

    await Effect.runPromise(program);
  });
});
