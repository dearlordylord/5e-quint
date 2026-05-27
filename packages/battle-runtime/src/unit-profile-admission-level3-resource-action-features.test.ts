// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A17 rogue_fast_hands
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bonus-action-delegated-standard-actions
import { describe, expect, test } from "vitest";
import {
  rogueFastHandsUnitId,
  subclassRogueThiefUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleBonusActionDelegatedStandardActionsSupportForUnit,
  battleUnitRefWithSupportProfiles,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  classLevel,
  Either,
  parseSupportedUnitFeatureProfile,
} from "./unit-profile-admission-test-support.ts";

describe("L13UG-A17 level-3 resource and action feature admission", () => {
  test("Rogue Thief grants Fast Hands at level 3", () => {
    const thief = unitLibrary.requireUnit(subclassRogueThiefUnitId);

    expect(thief).toMatchObject({
      kind: "subclass",
      className: "rogue",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: rogueFastHandsUnitId },
      ]),
    });
  });

  test("rogue_fast_hands is admitted as delegated Bonus Action action economy", () => {
    const unit = unitLibrary.requireUnit(rogueFastHandsUnitId);
    const supportProfile = {
      kind: BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
      activationCost: { kind: "bonusAction" },
      sleightOfHand: {
        abilityCheck: { ability: "dex", skill: "sleight_of_hand" },
        operations: [
          "pick_lock_with_thieves_tools",
          "disarm_trap_with_thieves_tools",
          "pick_pocket",
        ],
      },
      objectUse: {
        actions: [
          { action: "utilize" },
          {
            action: "magic",
            restrictedTo: "magicItemRequiresMagicAction",
          },
        ],
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueFastHandsUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleBonusActionDelegatedStandardActionsSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "rogue", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "bonusActionDelegatedStandardActions",
        unit,
        actionEconomy: supportProfile,
      }),
    );
  });

  test("rogue_fast_hands rejects an unrestricted Magic action shortcut", () => {
    const unit = unitLibrary.requireUnit(rogueFastHandsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "bonus_action_delegated_standard_actions"
    ) {
      throw new Error("Expected Fast Hands delegated action mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "rogue_fast_hands_unrestricted_magic",
      mechanics: {
        ...unit.mechanics,
        objectUse: {
          actions: [
            unit.mechanics.objectUse.actions[0],
            {
              action: "magic",
            },
          ],
        },
      },
    });

    expect(
      battleBonusActionDelegatedStandardActionsSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });
});
