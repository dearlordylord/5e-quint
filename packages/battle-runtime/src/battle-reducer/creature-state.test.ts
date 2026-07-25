import { describe, expect, it } from "vitest";
import { unitId } from "@dnd/shared/game-facts";

import {
  battleId,
  battleExecutionScopeOrdinal,
  battleObjectId,
} from "../identity.ts";
import { characterBattleCreatureInitWeaponAttack } from "../battle-init.ts";
import {
  characterSeed,
  testCharacterWeaponAttackForUnit,
} from "../battle-runtime-test-support.ts";
import { battleCreatureStateAdmissionFromInit } from "./creature-state.ts";

describe("battleCreatureStateAdmissionFromInit", () => {
  const baseInit = characterSeed({ initiative: 10 });
  const characterInit =
    baseInit.creatureInit.kind === "character" ? baseInit.creatureInit : null;

  it("requires a main-hand weapon attack to match the selected loadout", () => {
    expect(characterInit).not.toBeNull();
    if (characterInit === null) return;

    const init = {
      ...baseInit,
      creatureInit: {
        ...characterInit,
        attack: characterBattleCreatureInitWeaponAttack(
          testCharacterWeaponAttackForUnit(unitId("weapon_dagger")),
        ),
        selectedLoadout: {
          ...characterInit.selectedLoadout,
          weapon: {
            itemId: battleObjectId("main:weapon_longsword"),
            unitId: unitId("weapon_longsword"),
            grip: "one_handed" as const,
          },
        },
      },
    };

    const result = battleCreatureStateAdmissionFromInit(
      battleId("battle"),
      init,
      battleExecutionScopeOrdinal(0),
    );

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") return;
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      tag: "weaponLoadoutMismatch",
      slot: "main-hand",
      message:
        "Character battle init main-hand weapon attack must match the selected loadout weapon.",
    });
  });

  it("requires an off-hand weapon attack to match the selected loadout", () => {
    expect(characterInit).not.toBeNull();
    if (characterInit === null) return;

    const init = {
      ...baseInit,
      creatureInit: {
        ...characterInit,
        offHandAttack: characterBattleCreatureInitWeaponAttack(
          testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
        ),
        selectedLoadout: {
          ...characterInit.selectedLoadout,
          offHandWeapon: {
            itemId: battleObjectId("off:weapon_dagger"),
            unitId: unitId("weapon_dagger"),
          },
        },
      },
    };

    const result = battleCreatureStateAdmissionFromInit(
      battleId("battle"),
      init,
      battleExecutionScopeOrdinal(0),
    );

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") return;
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      tag: "weaponLoadoutMismatch",
      slot: "off-hand",
      message:
        "Character battle init off-hand weapon attack must match the selected loadout weapon.",
    });
  });

  it("returns two typed issues when both main-hand and off-hand attacks mismatch", () => {
    expect(characterInit).not.toBeNull();
    if (characterInit === null) return;

    const init = {
      ...baseInit,
      creatureInit: {
        ...characterInit,
        attack: characterBattleCreatureInitWeaponAttack(
          testCharacterWeaponAttackForUnit(unitId("weapon_dagger")),
        ),
        offHandAttack: characterBattleCreatureInitWeaponAttack(
          testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
        ),
        selectedLoadout: {
          ...characterInit.selectedLoadout,
          weapon: {
            itemId: battleObjectId("main:weapon_longsword"),
            unitId: unitId("weapon_longsword"),
            grip: "one_handed" as const,
          },
          offHandWeapon: {
            itemId: battleObjectId("off:weapon_dagger"),
            unitId: unitId("weapon_dagger"),
          },
        },
      },
    };

    const result = battleCreatureStateAdmissionFromInit(
      battleId("battle"),
      init,
      battleExecutionScopeOrdinal(0),
    );

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") return;
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toMatchObject({
      tag: "weaponLoadoutMismatch",
      slot: "main-hand",
      message:
        "Character battle init main-hand weapon attack must match the selected loadout weapon.",
    });
    expect(result.issues[1]).toMatchObject({
      tag: "weaponLoadoutMismatch",
      slot: "off-hand",
      message:
        "Character battle init off-hand weapon attack must match the selected loadout weapon.",
    });
  });
});
