import { describe, expect, test } from "vitest";
import { Option, Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import type { WeaponGrip } from "@dnd/shared/types";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import {
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  startBattle,
} from "@dnd/battle-runtime";
import {
  attackExecutionSelectionForOption,
  boundAttackExecutionSelectionMatchesOption,
} from "../../battle-runtime/src/battle-action-options.ts";
import { attackActionOptionsForActor } from "../../battle-runtime/src/battle-reducer/attack-damage-apply.ts";
import {
  battleCreatureInitFromCharacterBuild,
  characterBattleWeaponAttackInitProjection,
} from "./index.ts";
import {
  levelFiveMartialBuild,
  requireSuccess,
  unitLibrary,
  syntheticFinesseWeaponUnitId,
  syntheticFinesseWeaponUnitLibrary,
} from "./sdk-integration.test-support.ts";

function withGrip(build: CharacterBuild, grip: WeaponGrip): CharacterBuild {
  const weapon = build.equipment.loadout.weapon;
  if (weapon === undefined)
    throw new Error("Expected the fixture's selected weapon.");
  return {
    ...build,
    equipment: {
      ...build.equipment,
      loadout: { ...build.equipment.loadout, weapon: { ...weapon, grip } },
    },
  };
}

function startWeaponBuild(
  build: CharacterBuild,
  catalogue: UnitCatalog = unitLibrary,
) {
  const init = requireSuccess(
    battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("delivery-damage"),
      characterId: characterId("character:delivery-damage"),
      displayName: "Delivery damage",
      build,
      initiative: initiativeScore(20),
      ammunitionStocks: [],
      resourceExpenditures: [],
      unitLibrary: catalogue,
    }),
  );
  const state = requireSuccess(
    startBattle({ battleId: battleId("delivery-damage"), combatants: [init] }),
  ).state;
  const options = attackActionOptionsForActor(state, init.combatantId);
  const melee = options.find(
    (option) => option.kind === "weapon" && option.weaponDelivery === undefined,
  );
  const thrown = options.find(
    (option) =>
      option.kind === "weapon" && option.weaponDelivery?.kind === "thrown",
  );
  if (melee?.kind !== "weapon" || thrown?.kind !== "weapon")
    throw new Error("Expected both admitted weapon deliveries.");
  return { init, state, melee, thrown };
}

describe("weapon damage after grip and delivery", () => {
  test.each(["one_handed", "two_handed"] as const)(
    "a %s Spear keeps base damage for its throw",
    (grip) => {
      const fixture = startWeaponBuild(
        withGrip(
          levelFiveMartialBuild({
            classUnitId: unitId("class_fighter"),
            weaponUnitId: unitId("weapon_spear"),
          }),
          grip,
        ),
      );
      expect(fixture.melee.weapon.damage).toMatchObject({
        dice: 1,
        dieSize: grip === "two_handed" ? 8 : 6,
      });
      expect(fixture.thrown.weapon.damage).toMatchObject({
        dice: 1,
        dieSize: 6,
      });
      expect(fixture.init.creatureInit.attack?.weapon.damage).toMatchObject({
        dieSize: 6,
      });
      const actor = fixture.state.combatants.get(fixture.init.combatantId);
      if (actor?.origin.kind !== "character")
        throw new Error("Expected the character origin.");
      expect(actor.origin.attack?.weapon.damage).toMatchObject({ dieSize: 6 });
      expect(fixture.thrown).toMatchObject({
        ability: fixture.melee.ability,
        abilityModifier: fixture.melee.abilityModifier,
        attackBonus: fixture.melee.attackBonus,
      });
      expect(fixture.thrown.damageAbilityModifier).toBe(
        fixture.melee.damageAbilityModifier,
      );
      const selection = attackExecutionSelectionForOption(fixture.thrown);
      expect(selection.weaponDelivery).toBe("thrown");
      const reconstructed = attackActionOptionsForActor(
        fixture.state,
        fixture.init.combatantId,
      ).find(
        (option) =>
          option.kind === "weapon" && option.weaponDelivery !== undefined,
      );
      if (reconstructed === undefined)
        throw new Error("Expected the reconstructed thrown option.");
      expect(
        boundAttackExecutionSelectionMatchesOption(selection, reconstructed),
      ).toBe(true);
    },
  );

  test.each([
    { level: 1, melee: 8, thrown: 6 },
    { level: 11, melee: 10, thrown: 10 },
  ] as const)(
    "level $level Martial Arts compares against each delivery's own damage",
    ({ level, melee, thrown }) => {
      const base = levelFiveMartialBuild({
        classUnitId: unitId("class_monk"),
        weaponUnitId: unitId("weapon_spear"),
        abilityScores: { str: 12, dex: 16, con: 14, int: 8, wis: 14, cha: 8 },
      });
      const build = withGrip(
        {
          ...base,
          progression: {
            ...base.progression,
            advancements: Array.from({ length: level - 1 }, () => ({
              classUnitId: base.progression.startingClass,
              hitPointRule: { tag: "fixedHigherLevelGain" as const },
              constitutionModifierAtGain: 2,
            })),
          },
        },
        "two_handed",
      );
      const fixture = startWeaponBuild(build);
      expect(fixture.melee.weapon.damage).toMatchObject({
        dice: 1,
        dieSize: melee,
      });
      expect(fixture.thrown.weapon.damage).toMatchObject({
        dice: 1,
        dieSize: thrown,
      });
      expect(fixture.melee.ability).toBe("dex");
      expect(fixture.thrown.ability).toBe("dex");
      expect(fixture.init.creatureInit.attack?.weapon.damage).toMatchObject({
        dieSize: 6,
      });
    },
  );

  test("unused non-dice Versatile stays legal one-handed and fails only when selected two-handed", () => {
    const syntheticId = unitId("synthetic_flat_versatile_weapon");
    const original = syntheticFinesseWeaponUnitLibrary.requireUnit(
      syntheticFinesseWeaponUnitId,
    );
    if (original.kind !== "weapon")
      throw new Error("Expected the synthetic weapon fixture.");
    const unit = decodeUnitRecordSync({
      ...original,
      id: syntheticId,
      name: "Synthetic Flat Brace",
      properties: [
        ...(original.properties ?? []),
        {
          kind: "versatile",
          damage: { kind: "flat", amount: 7, damageType: "piercing" },
        },
      ],
    });
    const catalogue: UnitCatalog = {
      getUnit: (id) =>
        id === unit.id
          ? Option.some(unit)
          : syntheticFinesseWeaponUnitLibrary.getUnit(id),
      requireUnit: (id) =>
        id === unit.id
          ? unit
          : syntheticFinesseWeaponUnitLibrary.requireUnit(id),
      listUnits: () => [...syntheticFinesseWeaponUnitLibrary.listUnits(), unit],
    };
    const base = levelFiveMartialBuild({
      classUnitId: unitId("class_fighter"),
      weaponUnitId: syntheticId,
    });
    const fixture = startWeaponBuild(base, catalogue);
    expect(fixture.melee.weapon.damage).toMatchObject({
      kind: "dice",
      dieSize: 4,
    });
    const projected = characterBattleWeaponAttackInitProjection({
      build: withGrip(base, "two_handed"),
      unitLibrary: catalogue,
      weaponMasteries: [],
      classLevels: [{ className: "fighter", level: 5 }],
    });
    expect(Result.isFailure(projected)).toBe(true);
    const weapon = fixture.init.creatureInit.selectedLoadout.weapon;
    if (weapon === undefined)
      throw new Error("Expected the selected fixture weapon.");
    const invalid = startBattle({
      battleId: battleId("invalid-melee-grip"),
      combatants: [
        {
          ...fixture.init,
          creatureInit: {
            ...fixture.init.creatureInit,
            selectedLoadout: { weapon: { ...weapon, grip: "two_handed" } },
          },
        },
      ],
    });
    expect(Result.isFailure(invalid)).toBe(true);
  });
});
