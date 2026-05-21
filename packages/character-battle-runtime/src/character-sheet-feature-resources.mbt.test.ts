// KERNEL-COVERAGE: parity-witness SHEET.FEATURE_RESOURCES.TRANSITIONS
import * as path from "node:path";

import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  characterBattleResourceIsPointPool,
  combatantId,
  initiativeScore,
  spendCharacterPointPoolResource,
  startBattle,
  type BattleCreatureState,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  classUnitId,
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  applyLayOnHands,
  characterSheetCurrentHp,
  characterSheetId,
  characterSheetResources,
  characterSheetSpellSlotSourceState,
  characterSheetTempHp,
  completeLongRest,
  completeShortRest,
  convertFontOfMagicSpellSlotToSorceryPoints,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  finishLongRest,
  finishShortRest,
  startLongRest,
  startShortRest,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheet,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  applyBattleHandoffToCharacterSheet,
  characterSheetBattleInit,
} from "./index.ts";

const featureResourceScenarios = [
  "init",
  "lay-on-hands-restores-hp-and-removes-poisoned",
  "lay-on-hands-overspend-rejected",
  "long-rest-clears-lay-on-hands-pool",
  "short-rest-recovers-use-count-pools",
  "long-rest-clears-point-pool-and-use-state",
  "font-of-magic-slot-to-points",
  "font-of-magic-ambiguous-slot-source-rejected",
  "font-of-magic-points-to-slot",
  "font-of-magic-insufficient-points-rejected",
  "short-rest-preserves-uncanny-use-state",
  "long-rest-clears-uncanny-use-state",
  "uncanny-metabolism-recovers-focus-and-heals",
  "uncanny-metabolism-repeat-use-rejected",
  "metamagic-bridge-uses-shared-point-pool",
] as const;
type FeatureResourceScenario = (typeof featureResourceScenarios)[number];
const featureResourceReplayStepCount = featureResourceScenarios.length - 1;

type FeatureResourceProjection = {
  readonly lastResult: FeatureResourceScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly sourceCurrentHp: number;
  readonly targetCurrentHp: number;
  readonly temporaryHitPoints: number;
  readonly targetPoisoned: boolean;
  readonly layOnHandsCapacity: number;
  readonly layOnHandsExpended: number;
  readonly druidWildShapeExpended: number;
  readonly monkFocusExpended: number;
  readonly sorceryPointCapacity: number;
  readonly sorceryPointExpended: number;
  readonly ordinaryLevel2Expended: number;
  readonly createdLevel3Capacity: number;
  readonly createdLevel3Expended: number;
  readonly uncannyUsedSinceLongRest: boolean;
  readonly metamagicKnownOptions: number;
  readonly metamagicSharedResourceExpended: number;
  readonly replayIndex: number;
};

const driverSchema = {
  init: {},
  doLayOnHandsRestoresHpAndRemovesPoisoned: {},
  doRejectLayOnHandsOverspend: {},
  doLongRestClearsLayOnHandsPool: {},
  doShortRestRecoversUseCountPools: {},
  doLongRestClearsPointPoolAndUseState: {},
  doFontOfMagicSlotToPoints: {},
  doRejectFontOfMagicAmbiguousSlotSource: {},
  doFontOfMagicPointsToSlot: {},
  doRejectFontOfMagicInsufficientPoints: {},
  doShortRestPreservesUncannyUseState: {},
  doLongRestClearsUncannyUseState: {},
  doUncannyMetabolismRecoversFocusAndHeals: {},
  doRejectUncannyMetabolismRepeatUse: {},
  doMetamagicBridgeUsesSharedPointPool: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet feature-resource Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const featureResourceStateCheck = stateCheck(
  normalizeFeatureResourceQuintState,
  compareFeatureResourceState,
);

describe("Character Sheet feature-resource deterministic QNT replay", () => {
  it("replays non-slot feature-resource spend, recovery, reset, and bridge cases", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-feature-resources.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFeatureResourceDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: featureResourceReplayStepCount,
      stateCheck: featureResourceStateCheck,
    });
  }, 120_000);
});

function createFeatureResourceDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doLayOnHandsRestoresHpAndRemovesPoisoned: () => {
        projection = layOnHandsRestoresHpAndRemovesPoisonedProjection();
      },
      doRejectLayOnHandsOverspend: () => {
        projection = rejectLayOnHandsOverspendProjection();
      },
      doLongRestClearsLayOnHandsPool: () => {
        projection = longRestClearsLayOnHandsPoolProjection();
      },
      doShortRestRecoversUseCountPools: () => {
        projection = shortRestRecoversUseCountPoolsProjection();
      },
      doLongRestClearsPointPoolAndUseState: () => {
        projection = longRestClearsPointPoolAndUseStateProjection();
      },
      doFontOfMagicSlotToPoints: () => {
        projection = fontOfMagicSlotToPointsProjection();
      },
      doRejectFontOfMagicAmbiguousSlotSource: () => {
        projection = rejectFontOfMagicAmbiguousSlotSourceProjection();
      },
      doFontOfMagicPointsToSlot: () => {
        projection = fontOfMagicPointsToSlotProjection();
      },
      doRejectFontOfMagicInsufficientPoints: () => {
        projection = rejectFontOfMagicInsufficientPointsProjection();
      },
      doShortRestPreservesUncannyUseState: () => {
        projection = shortRestPreservesUncannyUseStateProjection();
      },
      doLongRestClearsUncannyUseState: () => {
        projection = longRestClearsUncannyUseStateProjection();
      },
      doUncannyMetabolismRecoversFocusAndHeals: () => {
        projection = uncannyMetabolismRecoversFocusAndHealsProjection();
      },
      doRejectUncannyMetabolismRepeatUse: () => {
        projection = rejectUncannyMetabolismRepeatUseProjection();
      },
      doMetamagicBridgeUsesSharedPointPool: () => {
        projection = metamagicBridgeUsesSharedPointPoolProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function layOnHandsRestoresHpAndRemovesPoisonedProjection(): FeatureResourceProjection {
  const source = sheetFixture({
    characterIdText: "character:lay-on-hands-source",
    build: baseBuild({
      startingClass: "class_paladin",
      advancements: ["class_paladin"],
    }),
    maximumHp: 12,
    currentHp: 12,
  });
  const target = sheetFixture({
    characterIdText: "character:lay-on-hands-target",
    build: baseBuild({ startingClass: "class_fighter" }),
    maximumHp: 10,
    currentHp: 3,
    conditions: ["poisoned"],
  });
  const result = requireRight(
    applyLayOnHands({
      source,
      target,
      unitLibrary,
      restoreHp: Hp(2),
      removePoisoned: true,
    }),
  );
  return projectFromParts({
    lastResult: "lay-on-hands-restores-hp-and-removes-poisoned",
    accepted: true,
    message: "none",
    sourceCurrentHp: characterSheetCurrentHp(result.source),
    targetCurrentHp: characterSheetCurrentHp(result.target),
    targetPoisoned: result.target.conditions.some(
      (condition) => condition === "poisoned",
    ),
    layOnHandsCapacity: resourceCapacity(
      result.source,
      "layOnHandsHealingPool",
    ),
    layOnHandsExpended: resourceExpended(
      result.source,
      "layOnHandsHealingPool",
    ),
    replayIndex: 1,
  });
}

function rejectLayOnHandsOverspendProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:lay-on-hands-overspend",
    build: baseBuild({ startingClass: "class_paladin" }),
    maximumHp: 12,
    currentHp: 6,
    conditions: ["poisoned"],
  });
  const result = applyLayOnHands({
    source: sheet,
    target: sheet,
    unitLibrary,
    restoreHp: Hp(1),
    removePoisoned: true,
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Lay On Hands over-spend rejection.");
  }
  return projectFromParts({
    lastResult: "lay-on-hands-overspend-rejected",
    accepted: false,
    message: result.left.message,
    sourceCurrentHp: characterSheetCurrentHp(sheet),
    targetCurrentHp: characterSheetCurrentHp(sheet),
    targetPoisoned: sheet.conditions.some(
      (condition) => condition === "poisoned",
    ),
    layOnHandsCapacity: resourceCapacity(sheet, "layOnHandsHealingPool"),
    layOnHandsExpended: resourceExpended(sheet, "layOnHandsHealingPool"),
    replayIndex: 2,
  });
}

function longRestClearsLayOnHandsPoolProjection(): FeatureResourceProjection {
  const source = sheetFixture({
    characterIdText: "character:lay-on-hands-long-rest",
    build: baseBuild({ startingClass: "class_paladin" }),
    maximumHp: 12,
    currentHp: 6,
  });
  const spent = requireRight(
    applyLayOnHands({
      source,
      target: source,
      unitLibrary,
      restoreHp: Hp(4),
      removePoisoned: false,
    }),
  ).source;
  const rested = requireRight(completeLongRestForSheet(spent));
  return projectFromParts({
    lastResult: "long-rest-clears-lay-on-hands-pool",
    accepted: true,
    message: "none",
    sourceCurrentHp: characterSheetCurrentHp(rested),
    targetCurrentHp: characterSheetCurrentHp(rested),
    layOnHandsCapacity: resourceCapacity(rested, "layOnHandsHealingPool"),
    layOnHandsExpended: resourceExpended(rested, "layOnHandsHealingPool"),
    replayIndex: 3,
  });
}

function shortRestRecoversUseCountPoolsProjection(): FeatureResourceProjection {
  const druid = sheetFixture({
    characterIdText: "character:druid-use-count-short-rest",
    build: baseBuild({
      startingClass: "class_druid",
      advancements: ["class_druid"],
    }),
    maximumHp: 16,
    currentHp: 16,
    druidWildShapeKnownFormStatBlockIds: [
      "stat_block_rat",
      "stat_block_riding_horse",
      "stat_block_spider",
      "stat_block_wolf",
    ],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: DRUID_WILD_SHAPE_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const monk = sheetFixture({
    characterIdText: "character:monk-focus-short-rest",
    build: monkBuild(2),
    maximumHp: 15,
    currentHp: 15,
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const restedDruid = requireRight(completeShortRestForSheet(druid));
  const restedMonk = requireRight(completeShortRestForSheet(monk));
  return projectFromParts({
    lastResult: "short-rest-recovers-use-count-pools",
    accepted: true,
    message: "none",
    druidWildShapeExpended: resourceExpended(
      restedDruid,
      "useCountResource",
      DRUID_WILD_SHAPE_UNIT_ID,
    ),
    monkFocusExpended: resourceExpended(
      restedMonk,
      "useCountResource",
      MONK_MONKS_FOCUS_UNIT_ID,
    ),
    replayIndex: 4,
  });
}

function longRestClearsPointPoolAndUseStateProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:sorcerer-point-pool-long-rest",
    build: sorcererFontOfMagicBuild({ level: 2 }),
    maximumHp: 14,
    currentHp: 14,
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const rested = requireRight(completeLongRestForSheet(sheet));
  return projectFromParts({
    lastResult: "long-rest-clears-point-pool-and-use-state",
    accepted: true,
    message: "none",
    sorceryPointCapacity: resourceCapacity(
      rested,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: resourceExpended(
      rested,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    uncannyUsedSinceLongRest: hasUncannyUse(rested),
    replayIndex: 5,
  });
}

function fontOfMagicSlotToPointsProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:font-slot-to-points",
    build: sorcererFontOfMagicBuild({
      level: 3,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    }),
    maximumHp: 18,
    currentHp: 18,
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(4),
        expended: resourceCount(0),
      },
      {
        spellLevel: spellSlotLevel(2),
        count: resourceCount(2),
        expended: resourceCount(1),
      },
    ],
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(3),
      },
    ],
  });
  const converted = requireRight(
    convertFontOfMagicSpellSlotToSorceryPoints({
      sheet,
      unitLibrary,
      spellLevel: spellSlotLevel(2),
    }),
  );
  return projectFromParts({
    lastResult: "font-of-magic-slot-to-points",
    accepted: true,
    message: "none",
    sorceryPointCapacity: resourceCapacity(
      converted,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: resourceExpended(
      converted,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    ordinaryLevel2Expended: ordinarySpellSlotExpended(converted, 2),
    replayIndex: 6,
  });
}

function rejectFontOfMagicAmbiguousSlotSourceProjection(): FeatureResourceProjection {
  const created = fontOfMagicCreatedLevel3Sheet();
  const result = convertFontOfMagicSpellSlotToSorceryPoints({
    sheet: created,
    unitLibrary,
    spellLevel: spellSlotLevel(3),
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Font of Magic ambiguous slot-source rejection.");
  }
  return projectFromParts({
    lastResult: "font-of-magic-ambiguous-slot-source-rejected",
    accepted: false,
    message: result.left.message,
    sorceryPointCapacity: resourceCapacity(
      created,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: resourceExpended(
      created,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    createdLevel3Capacity: createdSpellSlotCapacity(created, 3),
    createdLevel3Expended: createdSpellSlotExpended(created, 3),
    replayIndex: 7,
  });
}

function fontOfMagicPointsToSlotProjection(): FeatureResourceProjection {
  const created = fontOfMagicCreatedLevel3Sheet();
  return projectFromParts({
    lastResult: "font-of-magic-points-to-slot",
    accepted: true,
    message: "none",
    sorceryPointCapacity: resourceCapacity(
      created,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: resourceExpended(
      created,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    createdLevel3Capacity: createdSpellSlotCapacity(created, 3),
    createdLevel3Expended: createdSpellSlotExpended(created, 3),
    replayIndex: 8,
  });
}

function rejectFontOfMagicInsufficientPointsProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:font-insufficient-points",
    build: sorcererFontOfMagicBuild({
      level: 3,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    }),
    maximumHp: 18,
    currentHp: 18,
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(4),
        expended: resourceCount(0),
      },
      {
        spellLevel: spellSlotLevel(2),
        count: resourceCount(2),
        expended: resourceCount(0),
      },
    ],
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(1),
      },
    ],
  });
  const result = convertFontOfMagicSorceryPointsToSpellSlot({
    sheet,
    unitLibrary,
    spellLevel: spellSlotLevel(2),
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Font of Magic insufficient-points rejection.");
  }
  return projectFromParts({
    lastResult: "font-of-magic-insufficient-points-rejected",
    accepted: false,
    message: result.left.message,
    sorceryPointCapacity: resourceCapacity(
      sheet,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: resourceExpended(
      sheet,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    replayIndex: 9,
  });
}

function shortRestPreservesUncannyUseStateProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:uncanny-short-rest",
    build: monkBuild(2),
    maximumHp: 15,
    currentHp: 15,
    restFeatureUses: [{ tag: "uncannyMetabolism", usedSinceLongRest: true }],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const rested = requireRight(completeShortRestForSheet(sheet));
  return projectFromParts({
    lastResult: "short-rest-preserves-uncanny-use-state",
    accepted: true,
    message: "none",
    monkFocusExpended: resourceExpended(
      rested,
      "useCountResource",
      MONK_MONKS_FOCUS_UNIT_ID,
    ),
    uncannyUsedSinceLongRest: hasUncannyUse(rested),
    replayIndex: 10,
  });
}

function longRestClearsUncannyUseStateProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:uncanny-long-rest",
    build: monkBuild(2),
    maximumHp: 15,
    currentHp: 15,
    restFeatureUses: [{ tag: "uncannyMetabolism", usedSinceLongRest: true }],
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const rested = requireRight(completeLongRestForSheet(sheet));
  return projectFromParts({
    lastResult: "long-rest-clears-uncanny-use-state",
    accepted: true,
    message: "none",
    monkFocusExpended: resourceExpended(
      rested,
      "useCountResource",
      MONK_MONKS_FOCUS_UNIT_ID,
    ),
    uncannyUsedSinceLongRest: hasUncannyUse(rested),
    replayIndex: 11,
  });
}

function uncannyMetabolismRecoversFocusAndHealsProjection(): FeatureResourceProjection {
  const sheet = sheetFixture({
    characterIdText: "character:uncanny-use",
    build: monkBuild(2),
    maximumHp: 15,
    currentHp: 8,
    tempHp: 3,
    resourceExpenditures: [
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: resourceCount(2),
      },
    ],
  });
  const recovered = requireRight(
    useMonkUncannyMetabolismWhenRollingInitiative({
      sheet,
      unitLibrary,
      martialArtsRoll: DieRollResult(4),
    }),
  );
  return projectFromParts({
    lastResult: "uncanny-metabolism-recovers-focus-and-heals",
    accepted: true,
    message: "none",
    sourceCurrentHp: characterSheetCurrentHp(recovered),
    temporaryHitPoints: characterSheetTempHp(recovered),
    monkFocusExpended: resourceExpended(
      recovered,
      "useCountResource",
      MONK_MONKS_FOCUS_UNIT_ID,
    ),
    uncannyUsedSinceLongRest: hasUncannyUse(recovered),
    replayIndex: 12,
  });
}

function rejectUncannyMetabolismRepeatUseProjection(): FeatureResourceProjection {
  const used = requireRight(
    useMonkUncannyMetabolismWhenRollingInitiative({
      sheet: sheetFixture({
        characterIdText: "character:uncanny-repeat",
        build: monkBuild(2),
        maximumHp: 15,
        currentHp: 8,
        tempHp: 3,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
      unitLibrary,
      martialArtsRoll: DieRollResult(4),
    }),
  );
  const result = useMonkUncannyMetabolismWhenRollingInitiative({
    sheet: used,
    unitLibrary,
    martialArtsRoll: DieRollResult(4),
  });
  if (Either.isRight(result)) {
    throw new Error("Expected repeated Uncanny Metabolism use rejection.");
  }
  return projectFromParts({
    lastResult: "uncanny-metabolism-repeat-use-rejected",
    accepted: false,
    message: result.left.message,
    sourceCurrentHp: characterSheetCurrentHp(used),
    temporaryHitPoints: characterSheetTempHp(used),
    monkFocusExpended: resourceExpended(
      used,
      "useCountResource",
      MONK_MONKS_FOCUS_UNIT_ID,
    ),
    uncannyUsedSinceLongRest: hasUncannyUse(used),
    replayIndex: 13,
  });
}

function metamagicBridgeUsesSharedPointPoolProjection(): FeatureResourceProjection {
  const characterSheetIdValue = characterSheetId(
    "character:metamagic-feature-resource-bridge",
  );
  const sorcererCombatantId = combatantId(
    "combatant:metamagic-feature-resource-bridge",
  );
  const sheet = sheetFixture({
    characterIdText: characterSheetIdValue,
    build: sorcererMetamagicBuild(),
    maximumHp: 24,
    currentHp: 24,
    resourceExpenditures: [
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(1),
      },
    ],
  });
  const characterInit = requireRight(
    characterSheetBattleInit({
      sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: sorcererCombatantId,
      displayName: "Sorcerer",
      initiative: initiativeScore(12),
      side: battleCombatantSide("party"),
    }),
  );
  if (characterInit.creatureInit.kind !== "character") {
    throw new Error("Expected character battle creature init.");
  }
  if (
    characterInit.creatureInit.resources?.some(
      (resource) => resource.unit.id === "sorcerer_metamagic",
    ) === true
  ) {
    throw new Error("Metamagic must not create a local battle resource.");
  }

  const battle = requireRight(
    startBattle({
      battleId: battleId("battle:metamagic-feature-resource-bridge"),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("combatant:metamagic-skeleton"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        }),
      ],
    }),
  );
  const sorcerer = battle.combatants.get(sorcererCombatantId);
  if (sorcerer?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer character combatant.");
  }
  const sorceryPoints = sorcerer.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (sorceryPoints === undefined) {
    throw new Error("Expected shared Sorcery Point resource.");
  }
  const spentSorceryPoints = requireRight(
    spendCharacterPointPoolResource({
      resource: sorceryPoints,
      points: resourceCount(2),
    }),
  );
  const spentSorcerer: BattleCreatureState = {
    ...sorcerer,
    hp: characterSheetCurrentHp(sheet),
    maxHp: sheet.maximumHp,
    tempHp: characterSheetTempHp(sheet),
    positiveHpUnconscious: null,
    origin: {
      ...sorcerer.origin,
      resources: sorcerer.origin.resources.map((resource) =>
        resource.unit.id === spentSorceryPoints.unit.id
          ? spentSorceryPoints
          : resource,
      ),
    },
  };
  const handoff = requireRight(
    applyBattleHandoffToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: spentSorcerer,
    }),
  );
  const expended = resourceExpended(
    handoff,
    "pointPoolResource",
    SORCERER_FONT_OF_MAGIC_UNIT_ID,
  );
  return projectFromParts({
    lastResult: "metamagic-bridge-uses-shared-point-pool",
    accepted: true,
    message: "none",
    sorceryPointCapacity: resourceCapacity(
      handoff,
      "pointPoolResource",
      SORCERER_FONT_OF_MAGIC_UNIT_ID,
    ),
    sorceryPointExpended: expended,
    metamagicKnownOptions:
      characterInit.creatureInit.metamagic?.knownOptions.length ?? 0,
    metamagicSharedResourceExpended: expended,
    replayIndex: 14,
  });
}

function fontOfMagicCreatedLevel3Sheet(): CharacterSheet {
  const sheet = sheetFixture({
    characterIdText: "character:font-created-level-3",
    build: sorcererFontOfMagicBuild({
      level: 5,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    }),
    maximumHp: 24,
    currentHp: 24,
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(4),
        expended: resourceCount(0),
      },
      {
        spellLevel: spellSlotLevel(2),
        count: resourceCount(3),
        expended: resourceCount(0),
      },
      {
        spellLevel: spellSlotLevel(3),
        count: resourceCount(2),
        expended: resourceCount(0),
      },
    ],
  });
  return requireRight(
    convertFontOfMagicSorceryPointsToSpellSlot({
      sheet,
      unitLibrary,
      spellLevel: spellSlotLevel(3),
    }),
  );
}

function completeShortRestForSheet(sheet: CharacterSheet) {
  const rest = requireRight(startShortRest({ sheet }));
  const completion = requireRight(
    finishShortRest({
      rest,
      restedTicks: elapsedTimeTicks(600),
    }),
  );
  return completeShortRest({ completion, unitLibrary });
}

function completeLongRestForSheet(sheet: CharacterSheet) {
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const completion = requireRight(
    finishLongRest({
      rest,
      restedTicks: elapsedTimeTicks(4800),
    }),
  );
  return completeLongRest({ completion, unitLibrary });
}

function sheetFixture(
  input: {
    readonly characterIdText: string;
    readonly build: CharacterBuild;
    readonly maximumHp: number;
    readonly currentHp: number;
    readonly tempHp?: number;
  } & Partial<
    Pick<
      CharacterSheetInput,
      | "conditions"
      | "spellSlots"
      | "resourceExpenditures"
      | "restFeatureUses"
      | "druidWildShapeKnownFormStatBlockIds"
    >
  >,
): CharacterSheet {
  return requireRight(
    createFreshCharacterSheetCore({
      characterId: characterSheetId(input.characterIdText),
      build: input.build,
      maximumHp: Hp(input.maximumHp),
      currentHp: Hp(input.currentHp),
      tempHp: Hp(input.tempHp ?? 0),
      hitPointMaximumReduction: Hp(0),
      conditions: input.conditions ?? [],
      unitLibrary,
      ...(input.spellSlots === undefined
        ? {}
        : { spellSlots: input.spellSlots }),
      ...(input.resourceExpenditures === undefined
        ? {}
        : { resourceExpenditures: input.resourceExpenditures }),
      ...(input.restFeatureUses === undefined
        ? {}
        : { restFeatureUses: input.restFeatureUses }),
      ...(input.druidWildShapeKnownFormStatBlockIds === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              input.druidWildShapeKnownFormStatBlockIds,
          }),
    }),
  );
}

function baseBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 10,
        wis: 16,
        cha: 16,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function monkBuild(level: number): CharacterBuild {
  return baseBuild({
    startingClass: "class_monk",
    advancements: Array.from({ length: level - 1 }, () => "class_monk"),
  });
}

function sorcererFontOfMagicBuild(input: {
  readonly level: number;
  readonly spellSlots?: readonly {
    readonly spellLevel: number;
    readonly count: number;
  }[];
}): CharacterBuild {
  return {
    ...baseBuild({
      startingClass: "class_sorcerer",
      advancements: Array.from(
        { length: input.level - 1 },
        () => "class_sorcerer",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: input.spellSlots ?? [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function sorcererMetamagicBuild(): CharacterBuild {
  const build = sorcererFontOfMagicBuild({
    level: 5,
    spellSlots: [
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 2 },
    ],
  });
  return {
    ...build,
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
  };
}

function resourceCapacity(
  sheet: CharacterSheet,
  tag: "layOnHandsHealingPool",
): number;
function resourceCapacity(
  sheet: CharacterSheet,
  tag: "useCountResource" | "pointPoolResource",
  unitId: string,
): number;
function resourceCapacity(
  sheet: CharacterSheet,
  tag: "layOnHandsHealingPool" | "useCountResource" | "pointPoolResource",
  unitId?: string,
): number {
  const resource = requireRight(
    characterSheetResources(sheet, unitLibrary),
  ).find(
    (candidate) =>
      candidate.tag === tag &&
      (unitId === undefined ||
        ("unitId" in candidate && candidate.unitId === unitId)),
  );
  return resource?.count ?? 0;
}

function resourceExpended(
  sheet: CharacterSheet,
  tag: "layOnHandsHealingPool",
): number;
function resourceExpended(
  sheet: CharacterSheet,
  tag: "useCountResource" | "pointPoolResource",
  unitId: string,
): number;
function resourceExpended(
  sheet: CharacterSheet,
  tag: "layOnHandsHealingPool" | "useCountResource" | "pointPoolResource",
  unitId?: string,
): number {
  const resource = requireRight(
    characterSheetResources(sheet, unitLibrary),
  ).find(
    (candidate) =>
      candidate.tag === tag &&
      (unitId === undefined ||
        ("unitId" in candidate && candidate.unitId === unitId)),
  );
  return resource?.expended ?? 0;
}

function ordinarySpellSlotExpended(
  sheet: CharacterSheet,
  spellLevel: 2,
): number {
  return (
    characterSheetSpellSlotSourceState(
      sheet,
    )?.ordinarySpellSlotExpenditures.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function createdSpellSlotCapacity(
  sheet: CharacterSheet,
  spellLevel: 3,
): number {
  return (
    characterSheetSpellSlotSourceState(sheet)?.createdSpellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.count ?? 0
  );
}

function createdSpellSlotExpended(
  sheet: CharacterSheet,
  spellLevel: 3,
): number {
  return (
    characterSheetSpellSlotSourceState(sheet)?.createdSpellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function hasUncannyUse(sheet: CharacterSheet): boolean {
  return sheet.restFeatureUses.some(
    (use) => use.tag === "uncannyMetabolism" && use.usedSinceLongRest,
  );
}

function initialProjection(): FeatureResourceProjection {
  return projectFromParts({
    lastResult: "init",
    accepted: false,
    message: "none",
    replayIndex: 0,
  });
}

function projectFromParts(
  input: Pick<
    FeatureResourceProjection,
    "lastResult" | "accepted" | "message" | "replayIndex"
  > &
    Partial<
      Omit<
        FeatureResourceProjection,
        "lastResult" | "accepted" | "message" | "replayIndex"
      >
    >,
): FeatureResourceProjection {
  return {
    lastResult: input.lastResult,
    accepted: input.accepted,
    message: input.message,
    sourceCurrentHp: input.sourceCurrentHp ?? 0,
    targetCurrentHp: input.targetCurrentHp ?? 0,
    temporaryHitPoints: input.temporaryHitPoints ?? 0,
    targetPoisoned: input.targetPoisoned ?? false,
    layOnHandsCapacity: input.layOnHandsCapacity ?? 0,
    layOnHandsExpended: input.layOnHandsExpended ?? 0,
    druidWildShapeExpended: input.druidWildShapeExpended ?? 0,
    monkFocusExpended: input.monkFocusExpended ?? 0,
    sorceryPointCapacity: input.sorceryPointCapacity ?? 0,
    sorceryPointExpended: input.sorceryPointExpended ?? 0,
    ordinaryLevel2Expended: input.ordinaryLevel2Expended ?? 0,
    createdLevel3Capacity: input.createdLevel3Capacity ?? 0,
    createdLevel3Expended: input.createdLevel3Expended ?? 0,
    uncannyUsedSinceLongRest: input.uncannyUsedSinceLongRest ?? false,
    metamagicKnownOptions: input.metamagicKnownOptions ?? 0,
    metamagicSharedResourceExpended: input.metamagicSharedResourceExpended ?? 0,
    replayIndex: input.replayIndex,
  };
}

function normalizeFeatureResourceQuintState(
  raw: unknown,
): FeatureResourceProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint feature-resource state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastResult: scenarioField(state["qLastResult"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
    message: stringField(state["qMessage"], "qMessage"),
    sourceCurrentHp: numberFromQuintInt(
      state["qSourceCurrentHp"],
      "qSourceCurrentHp",
    ),
    targetCurrentHp: numberFromQuintInt(
      state["qTargetCurrentHp"],
      "qTargetCurrentHp",
    ),
    temporaryHitPoints: numberFromQuintInt(
      state["qTemporaryHitPoints"],
      "qTemporaryHitPoints",
    ),
    targetPoisoned: booleanField(state["qTargetPoisoned"], "qTargetPoisoned"),
    layOnHandsCapacity: numberFromQuintInt(
      state["qLayOnHandsCapacity"],
      "qLayOnHandsCapacity",
    ),
    layOnHandsExpended: numberFromQuintInt(
      state["qLayOnHandsExpended"],
      "qLayOnHandsExpended",
    ),
    druidWildShapeExpended: numberFromQuintInt(
      state["qDruidWildShapeExpended"],
      "qDruidWildShapeExpended",
    ),
    monkFocusExpended: numberFromQuintInt(
      state["qMonkFocusExpended"],
      "qMonkFocusExpended",
    ),
    sorceryPointCapacity: numberFromQuintInt(
      state["qSorceryPointCapacity"],
      "qSorceryPointCapacity",
    ),
    sorceryPointExpended: numberFromQuintInt(
      state["qSorceryPointExpended"],
      "qSorceryPointExpended",
    ),
    ordinaryLevel2Expended: numberFromQuintInt(
      state["qOrdinaryLevel2Expended"],
      "qOrdinaryLevel2Expended",
    ),
    createdLevel3Capacity: numberFromQuintInt(
      state["qCreatedLevel3Capacity"],
      "qCreatedLevel3Capacity",
    ),
    createdLevel3Expended: numberFromQuintInt(
      state["qCreatedLevel3Expended"],
      "qCreatedLevel3Expended",
    ),
    uncannyUsedSinceLongRest: booleanField(
      state["qUncannyUsedSinceLongRest"],
      "qUncannyUsedSinceLongRest",
    ),
    metamagicKnownOptions: numberFromQuintInt(
      state["qMetamagicKnownOptions"],
      "qMetamagicKnownOptions",
    ),
    metamagicSharedResourceExpended: numberFromQuintInt(
      state["qMetamagicSharedResourceExpended"],
      "qMetamagicSharedResourceExpended",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareFeatureResourceState(
  runtime: FeatureResourceProjection,
  quint: FeatureResourceProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): FeatureResourceScenario {
  if (typeof raw === "string" && isFeatureResourceScenario(raw)) return raw;
  throw new Error(`Unknown feature-resource scenario ${String(raw)}.`);
}

function isFeatureResourceScenario(
  raw: string,
): raw is FeatureResourceScenario {
  return featureResourceScenarios.some((scenario) => scenario === raw);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Expected Quint string field ${field}.`);
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
