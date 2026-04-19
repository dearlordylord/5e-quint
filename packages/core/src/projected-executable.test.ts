import { describe, expect, it } from "vitest";

import {
  MAGE_ARMOR_ABILITY_MOD,
  MAGE_ARMOR_BASE_AC,
  MAGE_ARMOR_DURATION_HOURS,
  MAGE_ARMOR_EARLY_END,
  type ProjectedActivationCost,
  type ProjectedAttackKind,
  type ProjectedContinuation,
  type ProjectedExecutableAction,
  type ProjectedExecutableAttachment,
  type ProjectedExecutableNode,
  type ProjectedLevelAxis,
  type ProjectedPersistentRecord,
  type ProjectedResourceAxis,
  type ProjectedResourcePool,
  type ProjectedSaveDc,
  type ProjectedUnitKind,
  type ProjectedUsageLimit,
} from "#/projected-executable.ts";

const DONE: ProjectedContinuation = { tag: "PCDone" };
const toNode = (value: number): ProjectedContinuation => ({
  tag: "PCNode",
  value,
});

const SELF: ProjectedExecutableAttachment = { tag: "PEASelf" };
const ONE: ProjectedExecutableAttachment = { tag: "PEAOneTarget" };
const ACID_SPLASH_AREA: ProjectedExecutableAttachment = {
  tag: "PEAAreaSpherePointWithinRange",
  value: { rangeFeet: 60, radiusFeet: 5 },
};

describe("projected-executable TS mirror", () => {
  it("represents an attack_roll node with weapon-attack continuations", () => {
    const node: ProjectedExecutableNode = {
      tag: "PENAttackRoll",
      value: {
        nodeId: 0,
        attachment: ONE,
        attackKind: "PAKWeaponAttack",
        onHit: toNode(1),
        onMiss: DONE,
      },
    };

    expect(node.tag).toBe("PENAttackRoll");
  });

  it("preserves the frozen acid_splash projection facts", () => {
    const action: ProjectedExecutableAction = {
      source: { unitId: "acid_splash", unitKind: "PUKSpell" },
      activationCost: "PACAction",
      resourceGate: { tag: "PRGNone" },
      usageLimit: "PULNone",
      entryNode: 0,
      nodes: [
        {
          tag: "PENSaveGate",
          value: {
            nodeId: 0,
            ability: "dex",
            dc: "PDCSpellSaveDc",
            attachment: ACID_SPLASH_AREA,
            onFail: toNode(1),
            onSuccess: DONE,
          },
        },
        {
          tag: "PENDamage",
          value: {
            nodeId: 1,
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
            next: DONE,
          },
        },
      ],
    };

    expect(action.nodes).toEqual([
      {
        tag: "PENSaveGate",
        value: {
          nodeId: 0,
          ability: "dex",
          dc: "PDCSpellSaveDc",
          attachment: ACID_SPLASH_AREA,
          onFail: toNode(1),
          onSuccess: DONE,
        },
      },
      {
        tag: "PENDamage",
        value: {
          nodeId: 1,
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
          next: DONE,
        },
      },
    ]);
  });

  it("preserves the frozen fighter_second_wind projection facts", () => {
    const action: ProjectedExecutableAction = {
      source: { unitId: "fighter_second_wind", unitKind: "PUKClassFeature" },
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
      entryNode: 0,
      nodes: [
        {
          tag: "PENDirect",
          value: { nodeId: 0, attachment: SELF, next: toNode(1) },
        },
        {
          tag: "PENHealHp",
          value: {
            nodeId: 1,
            amount: {
              tag: "PALinearDicePlusLevel",
              value: {
                axis: "PLAFighterLevel",
                base: { dice: 1, dieSize: 10, flat: 1 },
                perLevelFlat: 1,
                startingAtLevel: 1,
              },
            },
            next: DONE,
          },
        },
      ],
    };

    expect(action.resourceGate).toEqual({
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
    });
  });

  it("preserves the frozen fighter_action_surge_l2 projection facts", () => {
    const action: ProjectedExecutableAction = {
      source: {
        unitId: "fighter_action_surge_l2",
        unitKind: "PUKClassFeature",
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
      entryNode: 0,
      nodes: [
        {
          tag: "PENDirect",
          value: { nodeId: 0, attachment: SELF, next: toNode(1) },
        },
        {
          tag: "PENGrantExtraAction",
          value: {
            nodeId: 1,
            restriction: "PGARExcludeMagicAction",
            next: DONE,
          },
        },
      ],
    };

    expect(action).toEqual({
      source: {
        unitId: "fighter_action_surge_l2",
        unitKind: "PUKClassFeature",
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
      entryNode: 0,
      nodes: [
        {
          tag: "PENDirect",
          value: { nodeId: 0, attachment: SELF, next: toNode(1) },
        },
        {
          tag: "PENGrantExtraAction",
          value: {
            nodeId: 1,
            restriction: "PGARExcludeMagicAction",
            next: DONE,
          },
        },
      ],
    });
  });

  it("preserves the mage_armor persistent projection and lifecycle constants", () => {
    const record: ProjectedPersistentRecord = {
      tag: "PPRSetBaseAc",
      value: {
        source: { unitId: "mage_armor", unitKind: "PUKSpell" },
        attachment: "PPAChosenTarget",
      },
    };

    expect(record).toEqual({
      tag: "PPRSetBaseAc",
      value: {
        source: { unitId: "mage_armor", unitKind: "PUKSpell" },
        attachment: "PPAChosenTarget",
      },
    });
    expect(MAGE_ARMOR_BASE_AC).toBe(13);
    expect(MAGE_ARMOR_ABILITY_MOD).toBe("dex");
    expect(MAGE_ARMOR_DURATION_HOURS).toBe(8);
    expect(MAGE_ARMOR_EARLY_END).toBe("PMEETargetDonsArmor");
  });

  it("keeps unsupported future mechanics unrepresentable without explicit widening", () => {
    // @ts-expect-error closed attack kind subset
    const _attackKind: ProjectedAttackKind = "PAKRangedSpellAttack";
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
    // @ts-expect-error PCNode continuation requires a numeric node id
    const _continuation: ProjectedContinuation = { tag: "PCNode", value: "n1" };
    // @ts-expect-error area attachment requires geometry payload
    const _attachment: ProjectedExecutableAttachment = {
      tag: "PEAAreaSpherePointWithinRange",
    };

    void [
      _attackKind,
      _saveDc,
      _activation,
      _usage,
      _levelAxis,
      _resourceAxis,
      _unitKind,
      _persistentTag,
      _continuation,
      _attachment,
    ];
    expect(true).toBe(true);
  });
});
