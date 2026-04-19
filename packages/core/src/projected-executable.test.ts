import { describe, expect, it } from "vitest";

import type {
  ProjectedActivationCost,
  ProjectedExecutableAction,
  ProjectedExecutableAttachment,
  ProjectedLevelAxis,
  ProjectedPersistentRecord,
  ProjectedResourceAxis,
  ProjectedResourcePool,
  ProjectedSaveDc,
  ProjectedUnitKind,
  ProjectedUsageLimit,
} from "#/projected-executable.ts";

const SELF: ProjectedExecutableAttachment = { tag: "PEASelf" };
const ACID_SPLASH_AREA: ProjectedExecutableAttachment = {
  tag: "PEAAreaSpherePointWithinRange",
  value: { rangeFeet: 60, radiusFeet: 5 },
};

describe("projected executable contract", () => {
  it("represents a save-gate damage action without a node graph", () => {
    const action: ProjectedExecutableAction = {
      tag: "PEASaveGateDamage",
      source: {
        unitId: "acid_splash",
        unitKind: "PUKSpell",
        unitName: "Acid Splash",
      },
      activationCost: "PACAction",
      resourceGate: { tag: "PRGNone" },
      usageLimit: "PULNone",
      attachment: ACID_SPLASH_AREA,
      ability: "dex",
      dc: "PDCSpellSaveDc",
      damageType: "acid",
      amount: {
        tag: "PAThresholdDice",
        value: {
          axis: "PLACharacterLevel",
          base: { dice: 1, dieSize: 6, flat: 0 },
          tiers: [
            { atLevel: 5, diceOverride: 2 },
            { atLevel: 11, diceOverride: 3 },
            { atLevel: 17, diceOverride: 4 },
          ],
        },
      },
    };

    expect(action.tag).toBe("PEASaveGateDamage");
    expect(action.attachment).toEqual(ACID_SPLASH_AREA);
  });

  it("represents a direct self-heal action", () => {
    const action: ProjectedExecutableAction = {
      tag: "PEADirectHealHp",
      source: {
        unitId: "fighter_second_wind",
        unitKind: "PUKClassFeature",
        unitName: "Second Wind",
      },
      activationCost: "PACBonusAction",
      resourceGate: {
        tag: "PRGUseCount",
        value: {
          pool: "PRPSecondWind",
          cap: {
            tag: "PRCThresholdTiers",
            value: {
              axis: "PRAClass",
              base: 2,
              tiers: [
                { atLevel: 4, value: 3 },
                { atLevel: 10, value: 4 },
              ],
            },
          },
          resetCadence: {
            tag: "PRCPartialShortFullLong",
            value: { shortRestRefill: 1 },
          },
        },
      },
      usageLimit: "PULNone",
      attachment: SELF,
      amount: {
        tag: "PALinearDicePlusLevel",
        value: {
          axis: "PLAFighterLevel",
          base: { dice: 1, dieSize: 10, flat: 1 },
          perLevelFlat: 1,
          startingAtLevel: 1,
        },
      },
    };

    expect(action.tag).toBe("PEADirectHealHp");
    expect(action.attachment).toEqual(SELF);
  });

  it("represents a direct extra-action grant", () => {
    const action: ProjectedExecutableAction = {
      tag: "PEADirectGrantExtraAction",
      source: {
        unitId: "fighter_action_surge_l2",
        unitKind: "PUKClassFeature",
        unitName: "Action Surge",
      },
      activationCost: "PACFree",
      resourceGate: {
        tag: "PRGUseCount",
        value: {
          pool: "PRPActionSurge",
          cap: {
            tag: "PRCThresholdTiers",
            value: {
              axis: "PRAClass",
              base: 1,
              tiers: [{ atLevel: 17, value: 2 }],
            },
          },
          resetCadence: { tag: "PRCShortOrLongRest" },
        },
      },
      usageLimit: "PULOncePerTurn",
      attachment: SELF,
      restriction: "PGARExcludeMagicAction",
    };

    expect(action.tag).toBe("PEADirectGrantExtraAction");
    expect(action.restriction).toBe("PGARExcludeMagicAction");
  });

  it("represents a persistent base-AC override with authored payload", () => {
    const record: ProjectedPersistentRecord = {
      tag: "PPRSetBaseAc",
      value: {
        source: {
          unitId: "mage_armor",
          unitKind: "PUKSpell",
          unitName: "Mage Armor",
        },
        attachment: "PPAChosenTarget",
        baseArmorClass: 13,
        abilityModifier: "dex",
        earlyEnds: ["PPEETargetDonsArmor"],
      },
    };

    expect(record.value.baseArmorClass).toBe(13);
    expect(record.value.abilityModifier).toBe("dex");
    expect(record.value.earlyEnds).toEqual(["PPEETargetDonsArmor"]);
  });

  it("keeps unsupported future mechanics unrepresentable without explicit widening", () => {
    // @ts-expect-error closed save DC subset
    const _saveDc: ProjectedSaveDc = "PDCMonsterSaveDc";
    // @ts-expect-error closed activation-cost subset
    const _activation: ProjectedActivationCost = "PACReaction";
    // @ts-expect-error closed usage-limit subset
    const _usage: ProjectedUsageLimit = "PULOncePerRound";
    // @ts-expect-error closed level-axis subset
    const _levelAxis: ProjectedLevelAxis = "PLAWarlockLevel";
    // @ts-expect-error closed resource-axis subset
    const _resourceAxis: ProjectedResourceAxis = "PRASpellcasting";
    // @ts-expect-error closed resource-pool subset
    const _resourcePool: ProjectedResourcePool = "PRPSpellSlot";
    // @ts-expect-error closed unit-kind subset
    const _unitKind: ProjectedUnitKind = "PUKFeat";
    // @ts-expect-error closed persistent-record subset
    const _persistentTag: ProjectedPersistentRecord["tag"] = "PPRGrantImmunity";
    // @ts-expect-error area attachment requires geometry payload
    const _attachment: ProjectedExecutableAttachment = {
      tag: "PEAAreaSpherePointWithinRange",
    };

    void [
      _saveDc,
      _activation,
      _usage,
      _levelAxis,
      _resourceAxis,
      _resourcePool,
      _unitKind,
      _persistentTag,
      _attachment,
    ];
    expect(true).toBe(true);
  });
});
