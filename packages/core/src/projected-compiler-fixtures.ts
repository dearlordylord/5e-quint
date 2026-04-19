import type {
  ProjectedExecutableAction,
  ProjectedPersistentRecord,
} from "#/projected-executable.ts";

export const ACID_SPLASH_PROJECTION: ProjectedExecutableAction = {
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
        attachment: {
          tag: "PEAAreaSpherePointWithinRange",
          value: { rangeFeet: 60, radiusFeet: 5 },
        },
        onFail: { tag: "PCNode", value: 1 },
        onSuccess: { tag: "PCDone" },
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
        next: { tag: "PCDone" },
      },
    },
  ],
};

export const FIGHTER_SECOND_WIND_PROJECTION: ProjectedExecutableAction = {
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
      value: {
        nodeId: 0,
        attachment: { tag: "PEASelf" },
        next: { tag: "PCNode", value: 1 },
      },
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
        next: { tag: "PCDone" },
      },
    },
  ],
};

export const FIGHTER_ACTION_SURGE_L2_PROJECTION: ProjectedExecutableAction = {
  source: { unitId: "fighter_action_surge_l2", unitKind: "PUKClassFeature" },
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
      value: {
        nodeId: 0,
        attachment: { tag: "PEASelf" },
        next: { tag: "PCNode", value: 1 },
      },
    },
    {
      tag: "PENGrantExtraAction",
      value: {
        nodeId: 1,
        restriction: "PGARExcludeMagicAction",
        next: { tag: "PCDone" },
      },
    },
  ],
};

export const MAGE_ARMOR_PROJECTION: ProjectedPersistentRecord = {
  tag: "PPRSetBaseAc",
  value: {
    source: { unitId: "mage_armor", unitKind: "PUKSpell" },
    attachment: "PPAChosenTarget",
  },
};
