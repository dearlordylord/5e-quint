// KERNEL-COVERAGE: parity-witness CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
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
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
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
  "pure-pact-magic-slot-projection",
  "mixed-spell-and-pact-slot-init-rejected",
  "build-maximum-above-build-maximum-rejected",
  "stable-recovery-progress-during-init-rejected",
] as const;
type BattleInitProjectionScenario =
  (typeof battleInitProjectionScenarios)[number];
const battleInitReplayStepCount = battleInitProjectionScenarios.length - 1;
const battleInitProjectionScenarioByVariant = {
  BattleInitProjectionInit: "init",
  BattleInitProjectionSheetHitPointsArmorClassConditionsAndProfiles:
    "sheet-hit-points-armor-class-conditions-and-profiles",
  BattleInitProjectionSheetSpellcastingAndMetamagic:
    "sheet-spellcasting-and-metamagic",
  BattleInitProjectionPurePactMagicSlotProjection:
    "pure-pact-magic-slot-projection",
  BattleInitProjectionMixedSpellAndPactSlotInitRejected:
    "mixed-spell-and-pact-slot-init-rejected",
  BattleInitProjectionBuildMaximumAboveBuildMaximumRejected:
    "build-maximum-above-build-maximum-rejected",
  BattleInitProjectionStableRecoveryProgressDuringInitRejected:
    "stable-recovery-progress-during-init-rejected",
} as const satisfies Readonly<Record<string, BattleInitProjectionScenario>>;

type BattleInitProjection = {
  readonly outcome: BattleInitProjectionScenario;
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
  doProjectPurePactMagicSlot: {},
  doRejectMixedSpellAndPactSlotInit: {},
  doRejectBuildMaximumAboveBuildMaximum: {},
  doRejectStableRecoveryProgressDuringInit: {},
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
      doProjectPurePactMagicSlot: () => {
        projection = purePactMagicSlotProjection();
      },
      doRejectMixedSpellAndPactSlotInit: () => {
        projection = rejectMixedSpellAndPactSlotInitProjection();
      },
      doRejectBuildMaximumAboveBuildMaximum: () => {
        projection = rejectBuildMaximumAboveBuildMaximumProjection();
      },
      doRejectStableRecoveryProgressDuringInit: () => {
        projection = rejectStableRecoveryProgressDuringInitProjection();
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
    outcome: "sheet-hit-points-armor-class-conditions-and-profiles",
    replayIndex: 1,
    combatant,
  });
}

function sheetSpellcastingAndMetamagicProjection(): BattleInitProjection {
  const sheet = expectRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:battle-init-sorcerer"),
      build: sorcererMetamagicBuild(),
      currentHp: Hp(24),
      tempHp: Hp(0),
      spellSlotExpenditures: [
        { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
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
    outcome: "sheet-spellcasting-and-metamagic",
    replayIndex: 2,
    combatant,
  });
}

function purePactMagicSlotProjection(): BattleInitProjection {
  const sheet = expectRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:battle-init-warlock"),
      build: warlockPactMagicBuild(),
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
  const combatant = startCharacterBattle({
    battleIdText: "battle:init-warlock",
    combatantId: combatantId("combatant:battle-init-warlock"),
    sheet,
  });
  return projectionFromCombatant({
    outcome: "pure-pact-magic-slot-projection",
    replayIndex: 3,
    combatant,
  });
}

function rejectMixedSpellAndPactSlotInitProjection(): BattleInitProjection {
  const result = characterSheetBattleInit({
    sheet: expectRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:battle-init-mixed-slots"),
        build: mixedSpellAndPactSlotBuild(),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(0) },
      }),
    ),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:battle-init-mixed-slots"),
    displayName: "Character",
    initiative: initiativeScore(20),
    side: battleCombatantSide("party"),
  });

  return projectFromParts({
    outcome: "mixed-spell-and-pact-slot-init-rejected",
    accepted: Either.isRight(result),
    message: Either.isLeft(result) ? result.left.message : "none",
    replayIndex: 4,
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
    outcome: "build-maximum-above-build-maximum-rejected",
    accepted: Either.isRight(result),
    message: Either.isLeft(result) ? result.left.message : "none",
    replayIndex: 5,
  });
}

function rejectStableRecoveryProgressDuringInitProjection(): BattleInitProjection {
  const result = characterSheetBattleInit({
    sheet: expectRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:stable-recovery-init"),
        build: defenseBuild({ wearingArmor: true }),
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
        zeroHpLifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: elapsedTimeTicks(1),
          },
        },
      }),
    ),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:stable-recovery-init"),
    displayName: "Character",
    initiative: initiativeScore(20),
    side: battleCombatantSide("party"),
  });

  return projectFromParts({
    outcome: "stable-recovery-progress-during-init-rejected",
    accepted: Either.isRight(result),
    message: Either.isLeft(result) ? result.left.message : "none",
    replayIndex: 6,
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
  readonly outcome: BattleInitProjectionScenario;
  readonly replayIndex: number;
  readonly combatant: CharacterBattleCombatant;
}): BattleInitProjection {
  const spellSlot1 = spellSlotProjection(input.combatant, 1);
  const spellSlot2 = spellSlotProjection(input.combatant, 2);
  const spellSlot3 = spellSlotProjection(input.combatant, 3);
  return projectFromParts({
    outcome: input.outcome,
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

type CharacterSheetTestInput = Omit<
  CharacterSheetInput,
  "conditions" | "hitPointMaximumReduction" | "spellSlotExpenditures"
> &
  Partial<
    Pick<
      CharacterSheetInput,
      | "conditions"
      | "hitPointMaximumReduction"
      | "spellSlotExpenditures"
      | "zeroHpLifecycle"
    >
  >;

function createFreshCharacterSheet(input: CharacterSheetTestInput) {
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

function warlockPactMagicBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_warlock"),
      advancements: [],
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
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function mixedSpellAndPactSlotBuild(): CharacterBuild {
  const build = warlockPactMagicBuild();
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Expected Warlock fixture spellcasting.");
  }
  const pactMagic = spellcasting.slotPools.pactMagic;
  if (pactMagic === undefined) {
    throw new Error("Expected Warlock fixture Pact Magic.");
  }
  return {
    ...build,
    spellcasting: {
      ...spellcasting,
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic,
      },
    },
  };
}

function initialProjection(): BattleInitProjection {
  return projectFromParts({
    outcome: "init",
    accepted: false,
    message: "none",
    replayIndex: 0,
  });
}

function projectFromParts(
  input: Pick<
    BattleInitProjection,
    "outcome" | "accepted" | "message" | "replayIndex"
  > &
    Partial<
      Omit<
        BattleInitProjection,
        "outcome" | "accepted" | "message" | "replayIndex"
      >
    >,
): BattleInitProjection {
  return {
    outcome: input.outcome,
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
  const state = recordField(quintStateRecord(raw), "qState");
  const facts = recordField(state, "facts");
  return {
    outcome: scenarioVariantField(state["outcome"]),
    accepted: booleanField(state["accepted"], "qState.accepted"),
    message: stringField(state["message"], "qState.message"),
    characterIdentity: stringField(
      facts["characterIdentity"],
      "facts.characterIdentity",
    ),
    currentHp: numberFromQuintInt(facts["currentHp"], "facts.currentHp"),
    maxHp: numberFromQuintInt(facts["maxHp"], "facts.maxHp"),
    temporaryHitPoints: numberFromQuintInt(
      facts["temporaryHitPoints"],
      "facts.temporaryHitPoints",
    ),
    armorClass: numberFromQuintInt(facts["armorClass"], "facts.armorClass"),
    poisoned: booleanField(facts["poisoned"], "facts.poisoned"),
    spellLevel1Count: numberFromQuintInt(
      facts["spellLevel1Count"],
      "facts.spellLevel1Count",
    ),
    spellLevel1Expended: numberFromQuintInt(
      facts["spellLevel1Expended"],
      "facts.spellLevel1Expended",
    ),
    spellLevel2Count: numberFromQuintInt(
      facts["spellLevel2Count"],
      "facts.spellLevel2Count",
    ),
    spellLevel2Expended: numberFromQuintInt(
      facts["spellLevel2Expended"],
      "facts.spellLevel2Expended",
    ),
    spellLevel3Count: numberFromQuintInt(
      facts["spellLevel3Count"],
      "facts.spellLevel3Count",
    ),
    spellLevel3Expended: numberFromQuintInt(
      facts["spellLevel3Expended"],
      "facts.spellLevel3Expended",
    ),
    passiveArmorClassProfileCount: numberFromQuintInt(
      facts["passiveArmorClassProfileCount"],
      "facts.passiveArmorClassProfileCount",
    ),
    metamagicKnownOptions: numberFromQuintInt(
      facts["metamagicKnownOptions"],
      "facts.metamagicKnownOptions",
    ),
    replayIndex: numberFromQuintInt(state["replayIndex"], "qState.replayIndex"),
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

function scenarioVariantField(raw: unknown): BattleInitProjectionScenario {
  const tag = nullaryVariantTag(raw, "qState.outcome");
  const scenario = Object.entries(battleInitProjectionScenarioByVariant).find(
    ([variant]) => variant === tag,
  )?.[1];
  if (scenario !== undefined) return scenario;
  throw new Error(`Unknown battle-init projection outcome variant ${tag}.`);
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

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint battle-init projection state object.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function nullaryVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const record = Object.fromEntries(Object.entries(raw));
    const tag = record["tag"];
    if (typeof tag !== "string") {
      throw new Error(`Expected string tag for Quint variant field ${field}.`);
    }
    return tag;
  }
  throw new Error(`Expected Quint variant field ${field}.`);
}

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
