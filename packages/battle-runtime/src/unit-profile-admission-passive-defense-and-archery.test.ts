import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { DiceDelta } from "@dnd/surface/surface/types";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT18 defense
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT27 feat_archery
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  archerySupportProfile,
  archeryUnitId,
  defenseUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  weaponAttackRollHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  archeryBattle,
  archeryBattleUnitRef,
  archeryFeatureUnit,
} from "./unit-profile-admission-feature-fixture.test-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  parseSupportedUnitFeatureProfile,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
} from "./unit-profile-admission.test-support.ts";
import {
  battlePassiveArmorClassBonusSupportForUnit,
  battlePassiveRangedAttackRollBonusSupportForUnit,
} from "./unit-feature-support.ts";
import type { UnitRecord } from "./unit-profile-admission.test-support.ts";

describe("QMBT18 deterministic unsupported feature profile slice", () => {
  test("defense is admitted and projected as a passive Armor Class bonus while wearing armor", () => {
    const unit = unitLibrary.requireUnit(defenseUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(defenseUnitId),
        supportProfiles: [PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveArmorClassBonus",
        unit,
        armorClass: {
          bonus: 1,
          condition: {
            kind: "wearingArmor",
            categories: ["light", "medium", "heavy"],
          },
        },
      }),
    );
  });

  test("archery is admitted and projected as a passive ranged weapon attack-roll bonus", () => {
    const unit = unitLibrary.requireUnit(archeryUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(archeryUnitId),
        supportProfiles: [archerySupportProfile],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveRangedAttackRollBonus",
        unit,
        attackRoll: {
          bonus: 2,
          weaponFilter: {
            kind: "weaponCategory",
            category: "ranged",
          },
        },
      }),
    );
  });

  test("archery support projection adds +2 to ranged weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const attackRollHole = weaponAttackRollHole({
      session: state,
      attackName: "Shortbow",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "weapon_shortbow attack roll",
      attackBonus: 2,
      attack: {
        kind: "weapon",
        weapon: { weaponUnitId: "weapon_shortbow", usage: "ranged" },
      },
    });
  });

  test("archery support projection applies once with duplicate support refs", () => {
    const archeryUnitRef = archeryBattleUnitRef();
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      characterUnitRefs: [archeryUnitRef, archeryUnitRef],
    });
    const attackRollHole = weaponAttackRollHole({
      session: state,
      attackName: "Shortbow",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "weapon_shortbow attack roll",
      attackBonus: 2,
      attack: {
        kind: "weapon",
        weapon: { weaponUnitId: "weapon_shortbow", usage: "ranged" },
      },
    });
  });

  test("archery support projection does not add +2 to melee weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const attackRollHole = weaponAttackRollHole({
      session: state,
      attackName: "Longsword",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "weapon_longsword attack roll",
      attackBonus: 0,
      attack: {
        kind: "weapon",
        weapon: { weaponUnitId: "weapon_longsword", usage: "melee" },
      },
    });
  });

  test("archery support gate rejects adjacent passive roll bonus shapes", () => {
    const unit = archeryFeatureUnit();
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_roll_numeric") {
      throw new Error("Expected Archery numeric roll modifier.");
    }
    const adjacentPassiveRollUnits = [
      {
        ...unit,
        id: parseSharedUnitId("test_archery_saving_throw_bonus"),
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...effect, on: ["saving_throw"] }],
        },
      },
      {
        ...unit,
        id: parseSharedUnitId("test_archery_melee_attack_bonus"),
        mechanics: {
          ...unit.mechanics,
          grants: [
            {
              ...effect,
              weaponFilter: { kind: "weapon_category", category: "melee" },
            },
          ],
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentPassiveRollUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: parseSharedUnitId(adjacentUnit.id) },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Result.fail({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive ranged attack-roll bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });

  test("passive numeric support rejects alternate encodings, penalties, and larger bonuses", () => {
    const defense = unitLibrary.requireUnit(defenseUnitId);
    const archery = archeryFeatureUnit();
    if (
      defense.kind !== "feat" ||
      defense.mechanics.family !== "passive" ||
      !("grants" in defense.mechanics)
    ) {
      throw new Error("Expected Defense passive Armor Class mechanics.");
    }
    const defenseEffect = defense.mechanics.grants.find(
      (grant) => grant.kind === "modify_ac",
    );
    const archeryEffect = archery.mechanics.grants.find(
      (grant) => grant.kind === "modify_roll_numeric",
    );
    if (
      defenseEffect?.kind !== "modify_ac" ||
      defenseEffect.delta.kind !== "fixed_dice" ||
      archeryEffect?.kind !== "modify_roll_numeric" ||
      archeryEffect.delta.kind !== "fixed_dice"
    ) {
      throw new Error("Expected fixed-dice Defense and Archery modifiers.");
    }
    const passiveDefense = defense;
    const defenseDelta = defenseEffect.delta;
    const archeryDelta = archeryEffect.delta;
    const decodedSyntheticDefenseWithDelta = (
      id: string,
      name: string,
      delta: DiceDelta,
    ) =>
      decodeUnitRecordSync({
        ...passiveDefense,
        id,
        name,
        provenance: { kind: "synthetic-test", section: name },
        mechanics: {
          ...passiveDefense.mechanics,
          grants: [{ ...defenseEffect, delta }],
        },
      });
    const negativeDefense = decodedSyntheticDefenseWithDelta(
      "synthetic_defense_minus_1",
      "Synthetic Defense -1",
      { ...defenseDelta, sign: "-" },
    );
    const fixedNumberDefense = decodedSyntheticDefenseWithDelta(
      "synthetic_defense_fixed_number",
      "Synthetic Defense Fixed Number",
      { kind: "fixed_number", amount: 1, sign: "+" },
    );

    expect(battlePassiveArmorClassBonusSupportForUnit(negativeDefense)).toBe(
      "unsupported",
    );
    expect(battlePassiveArmorClassBonusSupportForUnit(fixedNumberDefense)).toBe(
      "unsupported",
    );

    for (let defenseMagnitude = 2; defenseMagnitude <= 20; defenseMagnitude++) {
      const adjacentDefense = {
        ...passiveDefense,
        id: parseSharedUnitId(`synthetic_defense_plus_${defenseMagnitude}`),
        name: `Synthetic Defense +${defenseMagnitude}`,
        provenance: {
          kind: "synthetic-test",
          section: "Synthetic passive Armor Class bonus",
        },
        mechanics: {
          ...passiveDefense.mechanics,
          grants: [
            {
              ...defenseEffect,
              delta: { ...defenseDelta, dice: defenseMagnitude },
            },
          ],
        },
      } as const;
      expect(battlePassiveArmorClassBonusSupportForUnit(adjacentDefense)).toBe(
        "unsupported",
      );
    }

    for (let archeryMagnitude = 3; archeryMagnitude <= 20; archeryMagnitude++) {
      const adjacentArchery = {
        ...archery,
        id: parseSharedUnitId(`synthetic_archery_plus_${archeryMagnitude}`),
        name: `Synthetic Archery +${archeryMagnitude}`,
        provenance: {
          kind: "synthetic-test",
          section: "Synthetic passive ranged attack-roll bonus",
        },
        mechanics: {
          ...archery.mechanics,
          grants: [
            {
              ...archeryEffect,
              delta: { ...archeryDelta, dice: archeryMagnitude },
            },
          ],
        },
      } as const;
      expect(
        battlePassiveRangedAttackRollBonusSupportForUnit(adjacentArchery),
      ).toBe("unsupported");
    }
  });
});
