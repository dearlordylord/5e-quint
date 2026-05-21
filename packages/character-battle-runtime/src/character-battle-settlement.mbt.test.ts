// KERNEL-COVERAGE: parity-witness CHARACTER.BATTLE.HANDOFF.SETTLEMENT
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
  type CharacterBattleSpellcastingState,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  classUnitId,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCurrentHp,
  characterSheetId,
  characterSheetPactSlots,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetTempHp,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  type CharacterSheet,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
} from "@dnd/shared-algebras/conditions-algebra";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
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

const settlementScenarios = [
  "init",
  "settle-hit-points-conditions-slots-and-preserved-sheet-state",
  "settle-feature-resource-expenditure",
  "ambiguous-created-spell-slot-source-rejected",
] as const;
type SettlementScenario = (typeof settlementScenarios)[number];
const settlementReplayStepCount = settlementScenarios.length - 1;

type BattleSettlementProjection = {
  readonly lastResult: SettlementScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly currentHp: number;
  readonly temporaryHitPoints: number;
  readonly poisoned: boolean;
  readonly prone: boolean;
  readonly spellLevel1Expended: number;
  readonly createdLevel3Capacity: number;
  readonly createdLevel3Expended: number;
  readonly pactSlotsExpended: number;
  readonly featureResourceExpended: number;
  readonly spentHitDice: number;
  readonly restFeatureUsed: boolean;
  readonly buildUnchanged: boolean;
  readonly replayIndex: number;
};

type CharacterBattleCombatant = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

const driverSchema = {
  init: {},
  doSettleHitPointsConditionsSlotsAndPreservedSheetState: {},
  doSettleFeatureResourceExpenditure: {},
  doRejectAmbiguousCreatedSpellSlotSource: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle settlement catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const settlementStateCheck = stateCheck(
  normalizeSettlementQuintState,
  compareSettlementState,
);

describe("Character Battle settlement deterministic QNT replay", () => {
  it("replays Character Battle handoff settlement back to Character Sheet", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-battle-settlement.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSettlementDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: settlementReplayStepCount,
      stateCheck: settlementStateCheck,
    });
  }, 120_000);
});

function createSettlementDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSettleHitPointsConditionsSlotsAndPreservedSheetState: () => {
        projection = settleHitPointsConditionsSlotsAndPreservedSheetState();
      },
      doSettleFeatureResourceExpenditure: () => {
        projection = settleFeatureResourceExpenditure();
      },
      doRejectAmbiguousCreatedSpellSlotSource: () => {
        projection = rejectAmbiguousCreatedSpellSlotSource();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function settleHitPointsConditionsSlotsAndPreservedSheetState(): BattleSettlementProjection {
  const sheet = sheetFixture({
    characterIdText: "character:battle-settlement-sheet-state",
    build: wizardWarlockBuild(),
    maximumHp: 7,
    currentHp: 7,
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(1),
      },
    ],
    pactSlots: { expended: resourceCount(1) },
    spentHitDice: [{ classUnitId: "class_wizard", spent: resourceCount(1) }],
    restFeatureUses: [{ tag: "arcaneRecovery", usedSinceLongRest: true }],
  });
  const combatant = startCharacterBattle({
    battleIdText: "battle:settlement-sheet-state",
    combatantId: combatantId("combatant:battle-settlement-sheet-state"),
    sheet,
  });
  const spellcasting = requireCharacterSpellcasting(combatant);
  const settledCombatant: CharacterBattleCombatant = {
    ...combatant,
    hp: Hp(6),
    tempHp: Hp(3),
    conditions: applyCondition(
      applyCondition(EMPTY_CONDITION_STATE, "poisoned"),
      "prone",
    ),
    positiveHpUnconscious: null,
    origin: {
      ...combatant.origin,
      spellcasting: {
        ...spellcasting,
        spellSlots: spellcasting.spellSlots.map((slot) =>
          slot.spellLevel === 1
            ? { ...slot, expended: resourceCount(2) }
            : slot,
        ),
      },
    },
  };
  const settled = requireRight(
    applyBattleHandoffToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: settledCombatant,
    }),
  );
  return projectFromSheet({
    lastResult: "settle-hit-points-conditions-slots-and-preserved-sheet-state",
    accepted: true,
    message: "none",
    sheet: settled,
    originalBuild: sheet.build,
    replayIndex: 1,
  });
}

function settleFeatureResourceExpenditure(): BattleSettlementProjection {
  const sheet = sheetFixture({
    characterIdText: "character:battle-settlement-feature-resource",
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
  const combatant = startCharacterBattle({
    battleIdText: "battle:settlement-feature-resource",
    combatantId: combatantId("combatant:battle-settlement-feature-resource"),
    sheet,
  });
  const sorceryPoints = combatant.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (sorceryPoints === undefined) {
    throw new Error("Expected battle Sorcery Point point-pool resource.");
  }
  const spentSorceryPoints = requireRight(
    spendCharacterPointPoolResource({
      resource: sorceryPoints,
      points: resourceCount(2),
    }),
  );
  const settledCombatant: CharacterBattleCombatant = {
    ...combatant,
    positiveHpUnconscious: null,
    origin: {
      ...combatant.origin,
      resources: combatant.origin.resources.map((resource) =>
        resource.unit.id === spentSorceryPoints.unit.id
          ? spentSorceryPoints
          : resource,
      ),
    },
  };
  const settled = requireRight(
    applyBattleHandoffToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: settledCombatant,
    }),
  );
  return projectFromSheet({
    lastResult: "settle-feature-resource-expenditure",
    accepted: true,
    message: "none",
    sheet: settled,
    originalBuild: sheet.build,
    replayIndex: 2,
  });
}

function rejectAmbiguousCreatedSpellSlotSource(): BattleSettlementProjection {
  const sheet = sheetFixture({
    characterIdText: "character:battle-settlement-ambiguous-slot",
    build: sorcererMetamagicBuild(),
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
  const withCreatedSlot = requireRight(
    convertFontOfMagicSorceryPointsToSpellSlot({
      sheet,
      unitLibrary,
      spellLevel: spellSlotLevel(3),
    }),
  );
  const combatant = startCharacterBattle({
    battleIdText: "battle:settlement-ambiguous-slot",
    combatantId: combatantId("combatant:battle-settlement-ambiguous-slot"),
    sheet: withCreatedSlot,
  });
  const spellcasting = requireCharacterSpellcasting(combatant);
  const ambiguousCombatant: CharacterBattleCombatant = {
    ...combatant,
    positiveHpUnconscious: null,
    origin: {
      ...combatant.origin,
      spellcasting: {
        ...spellcasting,
        spellSlots: spellcasting.spellSlots.map((slot) =>
          slot.spellLevel === 3
            ? { ...slot, expended: resourceCount(1) }
            : slot,
        ),
      },
    },
  };
  const result = applyBattleHandoffToCharacterSheet({
    sheet: withCreatedSlot,
    unitLibrary,
    combatant: ambiguousCombatant,
  });
  if (Either.isRight(result)) {
    throw new Error("Expected ambiguous created Spell Slot handoff rejection.");
  }
  return projectFromParts({
    lastResult: "ambiguous-created-spell-slot-source-rejected",
    accepted: false,
    message: result.left.message,
    createdLevel3Capacity: createdSpellSlotCapacity(withCreatedSlot, 3),
    createdLevel3Expended: createdSpellSlotExpended(withCreatedSlot, 3),
    replayIndex: 3,
  });
}

function startCharacterBattle(input: {
  readonly battleIdText: string;
  readonly combatantId: ReturnType<typeof combatantId>;
  readonly sheet: CharacterSheet;
}): CharacterBattleCombatant {
  const characterInit = requireRight(
    characterSheetBattleInit({
      sheet: input.sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: input.combatantId,
      displayName: "Character",
      initiative: initiativeScore(20),
      side: battleCombatantSide("party"),
    }),
  );
  const state = requireRight(
    startBattle({
      battleId: battleId(input.battleIdText),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: combatantId(`${input.battleIdText}:skeleton`),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        }),
      ],
    }),
  );
  const combatant = state.combatants.get(input.combatantId);
  if (!isCharacterBattleCombatant(combatant)) {
    throw new Error("Expected character-origin battle combatant.");
  }
  return combatant;
}

function isCharacterBattleCombatant(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCombatant {
  return combatant?.origin.kind === "character";
}

function requireCharacterSpellcasting(
  combatant: CharacterBattleCombatant,
): CharacterBattleSpellcastingState {
  const spellcasting = combatant.origin.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Expected character battle spellcasting state.");
  }
  return spellcasting;
}

function projectFromSheet(input: {
  readonly lastResult: SettlementScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly sheet: CharacterSheet;
  readonly originalBuild: CharacterBuild;
  readonly replayIndex: number;
}): BattleSettlementProjection {
  return projectFromParts({
    lastResult: input.lastResult,
    accepted: input.accepted,
    message: input.message,
    currentHp: characterSheetCurrentHp(input.sheet),
    temporaryHitPoints: characterSheetTempHp(input.sheet),
    poisoned: input.sheet.conditions.some(
      (condition) => condition === "poisoned",
    ),
    prone: input.sheet.conditions.some((condition) => condition === "prone"),
    spellLevel1Expended: spellSlotExpended(input.sheet, 1),
    createdLevel3Capacity: createdSpellSlotCapacity(input.sheet, 3),
    createdLevel3Expended: createdSpellSlotExpended(input.sheet, 3),
    pactSlotsExpended: characterSheetPactSlots(input.sheet)?.expended ?? 0,
    featureResourceExpended: featureResourceExpended(input.sheet),
    spentHitDice:
      input.sheet.spentHitDice.find(
        (pool) => pool.classUnitId === "class_wizard",
      )?.spent ?? 0,
    restFeatureUsed: input.sheet.restFeatureUses.some(
      (use) => use.tag === "arcaneRecovery" && use.usedSinceLongRest,
    ),
    buildUnchanged:
      JSON.stringify(input.sheet.build) === JSON.stringify(input.originalBuild),
    replayIndex: input.replayIndex,
  });
}

function spellSlotExpended(sheet: CharacterSheet, spellLevel: 1): number {
  return (
    characterSheetSpellSlots(sheet)?.find(
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

function featureResourceExpended(sheet: CharacterSheet): number {
  return (
    sheet.resourceExpenditures.find(
      (expenditure) =>
        expenditure.tag === "pointPoolResource" &&
        expenditure.unitId === SORCERER_FONT_OF_MAGIC_UNIT_ID,
    )?.expended ?? 0
  );
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
      | "pactSlots"
      | "spentHitDice"
      | "restFeatureUses"
      | "resourceExpenditures"
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
      ...(input.pactSlots === undefined ? {} : { pactSlots: input.pactSlots }),
      ...(input.spentHitDice === undefined
        ? {}
        : { spentHitDice: input.spentHitDice }),
      ...(input.restFeatureUses === undefined
        ? {}
        : { restFeatureUses: input.restFeatureUses }),
      ...(input.resourceExpenditures === undefined
        ? {}
        : { resourceExpenditures: input.resourceExpenditures }),
    }),
  );
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    ...baseBuild({ startingClass: "class_wizard" }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function sorcererFontOfMagicBuild(input: {
  readonly level: number;
  readonly spellSlots: readonly {
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
          slots: input.spellSlots,
        },
      },
    },
  };
}

function sorcererMetamagicBuild(): CharacterBuild {
  return {
    ...sorcererFontOfMagicBuild({
      level: 5,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    }),
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
        int: 16,
        wis: 10,
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

function initialProjection(): BattleSettlementProjection {
  return projectFromParts({
    lastResult: "init",
    accepted: false,
    message: "none",
    replayIndex: 0,
  });
}

function projectFromParts(
  input: Pick<
    BattleSettlementProjection,
    "lastResult" | "accepted" | "message" | "replayIndex"
  > &
    Partial<
      Omit<
        BattleSettlementProjection,
        "lastResult" | "accepted" | "message" | "replayIndex"
      >
    >,
): BattleSettlementProjection {
  return {
    currentHp: 0,
    temporaryHitPoints: 0,
    poisoned: false,
    prone: false,
    spellLevel1Expended: 0,
    createdLevel3Capacity: 0,
    createdLevel3Expended: 0,
    pactSlotsExpended: 0,
    featureResourceExpended: 0,
    spentHitDice: 0,
    restFeatureUsed: false,
    buildUnchanged: true,
    ...input,
  };
}

function normalizeSettlementQuintState(
  raw: unknown,
): BattleSettlementProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint battle-settlement state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastResult: scenarioField(state["qLastResult"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
    message: stringField(state["qMessage"], "qMessage"),
    currentHp: numberFromQuintInt(state["qCurrentHp"], "qCurrentHp"),
    temporaryHitPoints: numberFromQuintInt(
      state["qTemporaryHitPoints"],
      "qTemporaryHitPoints",
    ),
    poisoned: booleanField(state["qPoisoned"], "qPoisoned"),
    prone: booleanField(state["qProne"], "qProne"),
    spellLevel1Expended: numberFromQuintInt(
      state["qSpellLevel1Expended"],
      "qSpellLevel1Expended",
    ),
    createdLevel3Capacity: numberFromQuintInt(
      state["qCreatedLevel3Capacity"],
      "qCreatedLevel3Capacity",
    ),
    createdLevel3Expended: numberFromQuintInt(
      state["qCreatedLevel3Expended"],
      "qCreatedLevel3Expended",
    ),
    pactSlotsExpended: numberFromQuintInt(
      state["qPactSlotsExpended"],
      "qPactSlotsExpended",
    ),
    featureResourceExpended: numberFromQuintInt(
      state["qFeatureResourceExpended"],
      "qFeatureResourceExpended",
    ),
    spentHitDice: numberFromQuintInt(state["qSpentHitDice"], "qSpentHitDice"),
    restFeatureUsed: booleanField(
      state["qRestFeatureUsed"],
      "qRestFeatureUsed",
    ),
    buildUnchanged: booleanField(state["qBuildUnchanged"], "qBuildUnchanged"),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareSettlementState(
  runtime: BattleSettlementProjection,
  quint: BattleSettlementProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): SettlementScenario {
  if (typeof raw === "string" && isSettlementScenario(raw)) {
    return raw;
  }
  throw new Error(`Unknown battle-settlement scenario ${String(raw)}.`);
}

function isSettlementScenario(raw: string): raw is SettlementScenario {
  return settlementScenarios.some((scenario) => scenario === raw);
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
