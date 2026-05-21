// KERNEL-COVERAGE: parity-witness CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import * as path from "node:path";

import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  startBattle,
  type BattleCreatureState,
  type BattleUnitSupportProfile,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  type CharacterSheet,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
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
  battleCreatureInitFromCharacterBuild,
  characterSheetBattleInit,
} from "./index.ts";

const battleInitProjectionScenarios = [
  "init",
  "sheet-hit-points-armor-class-conditions-and-profiles",
  "sheet-spellcasting-and-metamagic",
  "build-maximum-above-build-maximum-rejected",
] as const;
type BattleInitProjectionScenario =
  (typeof battleInitProjectionScenarios)[number];
const battleInitReplayStepCount = battleInitProjectionScenarios.length - 1;

type BattleInitProjection = {
  readonly lastResult: BattleInitProjectionScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly characterIdentity: string;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly temporaryHitPoints: number;
  readonly armorClass: number;
  readonly poisoned: boolean;
  readonly spellLevel1Count: number;
  readonly spellLevel1Expended: number;
  readonly spellLevel2Count: number;
  readonly spellLevel2Expended: number;
  readonly spellLevel3Count: number;
  readonly spellLevel3Expended: number;
  readonly passiveArmorClassProfileCount: number;
  readonly metamagicKnownOptions: number;
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
  doProjectSheetHitPointsArmorClassConditionsAndProfiles: {},
  doProjectSheetSpellcastingAndMetamagic: {},
  doRejectBuildMaximumAboveBuildMaximum: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle init projection catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const battleInitProjectionStateCheck = stateCheck(
  normalizeBattleInitProjectionQuintState,
  compareBattleInitProjectionState,
);

describe("Character Battle initialization deterministic QNT replay", () => {
  it("replays Character Sheet and build facts projected into battle initialization", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-battle-init-projection.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBattleInitProjectionDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: battleInitReplayStepCount,
      stateCheck: battleInitProjectionStateCheck,
    });
  }, 120_000);
});

function createBattleInitProjectionDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectSheetHitPointsArmorClassConditionsAndProfiles: () => {
        projection = sheetHitPointsArmorClassConditionsAndProfilesProjection();
      },
      doProjectSheetSpellcastingAndMetamagic: () => {
        projection = sheetSpellcastingAndMetamagicProjection();
      },
      doRejectBuildMaximumAboveBuildMaximum: () => {
        projection = rejectBuildMaximumAboveBuildMaximumProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function sheetHitPointsArmorClassConditionsAndProfilesProjection(): BattleInitProjection {
  const combatantIdValue = combatantId("combatant:battle-init-fighter");
  const sheet = expectRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:battle-init-fighter"),
      build: defenseBuild({ wearingArmor: true }),
      maximumHp: Hp(10),
      hitPointMaximumReduction: Hp(2),
      currentHp: Hp(6),
      tempHp: Hp(4),
      conditions: ["poisoned"],
      unitLibrary,
    }),
  );
  const combatant = startCharacterBattle({
    battleIdText: "battle:init-fighter",
    combatantId: combatantIdValue,
    sheet,
  });
  return projectionFromCombatant({
    lastResult: "sheet-hit-points-armor-class-conditions-and-profiles",
    replayIndex: 1,
    combatant,
  });
}

function sheetSpellcastingAndMetamagicProjection(): BattleInitProjection {
  const sheet = expectRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:battle-init-sorcerer"),
      build: sorcererMetamagicBuild(),
      maximumHp: Hp(24),
      currentHp: Hp(24),
      tempHp: Hp(0),
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(4),
          expended: resourceCount(1),
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
      unitLibrary,
    }),
  );
  const withCreatedSlot = expectRight(
    convertFontOfMagicSorceryPointsToSpellSlot({
      sheet,
      unitLibrary,
      spellLevel: spellSlotLevel(3),
    }),
  );
  const combatant = startCharacterBattle({
    battleIdText: "battle:init-sorcerer",
    combatantId: combatantId("combatant:battle-init-sorcerer"),
    sheet: withCreatedSlot,
  });
  return projectionFromCombatant({
    lastResult: "sheet-spellcasting-and-metamagic",
    replayIndex: 2,
    combatant,
  });
}

function rejectBuildMaximumAboveBuildMaximumProjection(): BattleInitProjection {
  const result = battleCreatureInitFromCharacterBuild({
    combatantId: combatantId("combatant:contradictory-maximum-init"),
    characterId: characterId("character:contradictory-maximum-init"),
    displayName: "Fighter",
    build: defenseBuild({ wearingArmor: false }),
    initiative: initiativeScore(20),
    side: battleCombatantSide("party"),
    unitLibrary,
    hitPointMaximum: Hp(13),
  });

  return projectFromParts({
    lastResult: "build-maximum-above-build-maximum-rejected",
    accepted: Either.isRight(result),
    message: Either.isLeft(result) ? result.left.message : "none",
    replayIndex: 3,
  });
}

function startCharacterBattle(input: {
  readonly battleIdText: string;
  readonly combatantId: ReturnType<typeof combatantId>;
  readonly sheet: CharacterSheet;
}): CharacterBattleCombatant {
  const characterInit = expectRight(
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
  const state = expectRight(
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

function projectionFromCombatant(input: {
  readonly lastResult: BattleInitProjectionScenario;
  readonly replayIndex: number;
  readonly combatant: CharacterBattleCombatant;
}): BattleInitProjection {
  const spellSlot1 = spellSlotProjection(input.combatant, 1);
  const spellSlot2 = spellSlotProjection(input.combatant, 2);
  const spellSlot3 = spellSlotProjection(input.combatant, 3);
  return projectFromParts({
    lastResult: input.lastResult,
    accepted: true,
    message: "none",
    characterIdentity: input.combatant.origin.characterId,
    currentHp: input.combatant.hp,
    maxHp: input.combatant.maxHp,
    temporaryHitPoints: input.combatant.tempHp,
    armorClass: currentArmorClass(input.combatant.armorClass),
    poisoned: hasCondition(input.combatant.conditions, "poisoned"),
    spellLevel1Count: spellSlot1.count,
    spellLevel1Expended: spellSlot1.expended,
    spellLevel2Count: spellSlot2.count,
    spellLevel2Expended: spellSlot2.expended,
    spellLevel3Count: spellSlot3.count,
    spellLevel3Expended: spellSlot3.expended,
    passiveArmorClassProfileCount: supportProfileKindCount(
      input.combatant,
      "passiveArmorClassBonus",
    ),
    metamagicKnownOptions:
      input.combatant.origin.metamagic?.knownOptions.length ?? 0,
    replayIndex: input.replayIndex,
  });
}

function spellSlotProjection(
  combatant: CharacterBattleCombatant,
  level: number,
): { readonly count: number; readonly expended: number } {
  const slot = combatant.origin.spellcasting?.spellSlots.find(
    (candidate) => candidate.spellLevel === level,
  );
  return {
    count: slot?.count ?? 0,
    expended: slot?.expended ?? 0,
  };
}

function supportProfileKindCount(
  combatant: CharacterBattleCombatant,
  kind: string,
): number {
  return combatant.origin.characterUnitRefs
    .flatMap((ref) => ref.supportProfiles)
    .filter((profile) => supportProfileKind(profile) === kind).length;
}

function supportProfileKind(profile: BattleUnitSupportProfile): string {
  return typeof profile === "string" ? profile : profile.kind;
}

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions" | "hitPointMaximumReduction"> &
    Partial<
      Pick<CharacterSheetInput, "conditions" | "hitPointMaximumReduction">
    >,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    hitPointMaximumReduction: Hp(0),
    ...input,
  });
}

function defenseBuild(input: {
  readonly wearingArmor: boolean;
}): CharacterBuild {
  const armorItemId = characterEquipmentItemId({
    slot: "armor",
    unitId: expectRight(characterEquipmentItemUnitId("armor_chain_mail")),
  });

  return {
    progression: {
      startingClass: classUnitId("class_fighter"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        selectedFromUnitId: "fighter_fighting_style",
        kind: "selectedClassChoice",
        unitId: "defense",
      },
    ],
    equipment: {
      owned: [{ itemId: armorItemId, unitId: "armor_chain_mail" }],
      loadout: input.wearingArmor ? { armor: armorItemId } : {},
    },
  };
}

function sorcererMetamagicBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_sorcerer"),
      advancements: Array.from({ length: 4 }, () => ({
        classUnitId: classUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 16,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: expectRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: expectRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
    equipment: {
      owned: [],
      loadout: {},
    },
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
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  };
}

function initialProjection(): BattleInitProjection {
  return projectFromParts({
    lastResult: "init",
    accepted: false,
    message: "none",
    replayIndex: 0,
  });
}

function projectFromParts(
  input: Pick<
    BattleInitProjection,
    "lastResult" | "accepted" | "message" | "replayIndex"
  > &
    Partial<
      Omit<
        BattleInitProjection,
        "lastResult" | "accepted" | "message" | "replayIndex"
      >
    >,
): BattleInitProjection {
  return {
    lastResult: input.lastResult,
    accepted: input.accepted,
    message: input.message,
    characterIdentity: input.characterIdentity ?? "none",
    currentHp: input.currentHp ?? 0,
    maxHp: input.maxHp ?? 0,
    temporaryHitPoints: input.temporaryHitPoints ?? 0,
    armorClass: input.armorClass ?? 0,
    poisoned: input.poisoned ?? false,
    spellLevel1Count: input.spellLevel1Count ?? 0,
    spellLevel1Expended: input.spellLevel1Expended ?? 0,
    spellLevel2Count: input.spellLevel2Count ?? 0,
    spellLevel2Expended: input.spellLevel2Expended ?? 0,
    spellLevel3Count: input.spellLevel3Count ?? 0,
    spellLevel3Expended: input.spellLevel3Expended ?? 0,
    passiveArmorClassProfileCount: input.passiveArmorClassProfileCount ?? 0,
    metamagicKnownOptions: input.metamagicKnownOptions ?? 0,
    replayIndex: input.replayIndex,
  };
}

function normalizeBattleInitProjectionQuintState(
  raw: unknown,
): BattleInitProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint battle-init projection state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastResult: scenarioField(state["qLastResult"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
    message: stringField(state["qMessage"], "qMessage"),
    characterIdentity: stringField(
      state["qCharacterIdentity"],
      "qCharacterIdentity",
    ),
    currentHp: numberFromQuintInt(state["qCurrentHp"], "qCurrentHp"),
    maxHp: numberFromQuintInt(state["qMaxHp"], "qMaxHp"),
    temporaryHitPoints: numberFromQuintInt(
      state["qTemporaryHitPoints"],
      "qTemporaryHitPoints",
    ),
    armorClass: numberFromQuintInt(state["qArmorClass"], "qArmorClass"),
    poisoned: booleanField(state["qPoisoned"], "qPoisoned"),
    spellLevel1Count: numberFromQuintInt(
      state["qSpellLevel1Count"],
      "qSpellLevel1Count",
    ),
    spellLevel1Expended: numberFromQuintInt(
      state["qSpellLevel1Expended"],
      "qSpellLevel1Expended",
    ),
    spellLevel2Count: numberFromQuintInt(
      state["qSpellLevel2Count"],
      "qSpellLevel2Count",
    ),
    spellLevel2Expended: numberFromQuintInt(
      state["qSpellLevel2Expended"],
      "qSpellLevel2Expended",
    ),
    spellLevel3Count: numberFromQuintInt(
      state["qSpellLevel3Count"],
      "qSpellLevel3Count",
    ),
    spellLevel3Expended: numberFromQuintInt(
      state["qSpellLevel3Expended"],
      "qSpellLevel3Expended",
    ),
    passiveArmorClassProfileCount: numberFromQuintInt(
      state["qPassiveArmorClassProfileCount"],
      "qPassiveArmorClassProfileCount",
    ),
    metamagicKnownOptions: numberFromQuintInt(
      state["qMetamagicKnownOptions"],
      "qMetamagicKnownOptions",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareBattleInitProjectionState(
  runtime: BattleInitProjection,
  quint: BattleInitProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): BattleInitProjectionScenario {
  if (typeof raw === "string" && isBattleInitProjectionScenario(raw)) {
    return raw;
  }
  throw new Error(`Unknown battle-init projection scenario ${String(raw)}.`);
}

function isBattleInitProjectionScenario(
  raw: string,
): raw is BattleInitProjectionScenario {
  return battleInitProjectionScenarios.some((scenario) => scenario === raw);
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

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
