import { describe, expect, test } from "vitest";
import { Either, Option, Schema } from "effect";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  battleActSpellPresentation,
  battleAmmunitionStock,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  snapshotBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type BattleCreatureState,
  type BattleSubject,
  type BattleRuntimeSession,
  type BattleState,
} from "@dnd/battle-runtime";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "@dnd/battle-runtime/test-support";
import {
  characterDraftId,
  characterBuildHitPoints,
  characterBuildCatalogEquipmentItem,
  abilityScoreAssignment,
  characterClassLevel,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  classUnitIdFromClassUnit,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  sorcererMetamagicOptionId,
  SORCERER_METAMAGIC_UNIT_ID,
  type CharacterDraft,
  type CharacterBuild,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
  type CharacterEquipmentItemSlot,
  type CharacterBuildSpellcasting,
} from "@dnd/character-creation-runtime";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  battleToolDefinitions,
  characterToolDefinitions,
  contentToolDefinitions,
  createMcpPlaySessionRoot,
  createMcpSessionStore,
  handleToolCall as handleWireToolCall,
  startBattleFromCharacterBuildAndStatBlock,
  toolDefinitions,
} from "./server.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";
import type { BattleToolResult } from "./battle-tools.ts";
import type { CharacterToolResult } from "./character-tools.ts";
import {
  CharacterSessionDetailOutputSchema,
  CharacterSessionQueryOutputSchema,
} from "./character-tool-output.ts";
import {
  characterBattleSupportProjection,
  characterBattleRuntimeIssueMessage,
} from "@dnd/character-battle-runtime";
import {
  availableCharacterSession,
  characterIdFromDraftId,
} from "./session-store.ts";
import { characterBuildDisplayName } from "./character-display.ts";
import {
  completeMagicalCunningRite,
  parseCharacterSheet,
  parseCharacterSheetRetainedCompanionId,
  replaceCharacterSheetCompanion,
  type CharacterSheetCompanion,
  type CharacterSheetRetainedCompanionCurrentHitPoints,
} from "@dnd/character-sheet-runtime";
import {
  GENERIC_COMBAT_ACTION_LABELS,
  GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
} from "../test-support/battle-act-labels.ts";
import {
  loadoutHoleId,
  unitHoleId,
} from "../test-support/creation-hole-ids.ts";

const CHATGPT_APP_VERSION_STORAGE_LIMIT_BYTES = 2_000_000;

function handleToolCall(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  name: string,
  args: unknown,
) {
  return handleWireToolCall(root, name, battleToolWireArgs(name, args));
}
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import {
  assertSrd521StatBlock,
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
import {
  buildUnitCatalog,
  defineSrdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { adminProjection } from "./admin-mirror.ts";

function testAbilityScoreAssignment(scores: RawAbilityScoreAssignment) {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

function testCharacterId(draftId: string) {
  return characterIdFromDraftId(characterDraftId(draftId));
}

function testBattleCreatureStateWithoutKnockOut(
  combatant: BattleCreatureState,
  input: Pick<BattleCreatureState, "hp" | "conditions">,
): BattleCreatureState {
  return {
    ...combatant,
    hp: input.hp,
    conditions: input.conditions,
    positiveHpUnconscious: null,
  };
}

function startBattleFromCharacterBuildAndStatBlockRight(
  input: Omit<
    Parameters<typeof startBattleFromCharacterBuildAndStatBlock>[0],
    "character" | "statBlockBattleInput"
  > & {
    readonly character: Omit<
      Parameters<
        typeof startBattleFromCharacterBuildAndStatBlock
      >[0]["character"],
      "ammunitionStocks"
    >;
    readonly statBlockBattleInput: Omit<
      Parameters<
        typeof startBattleFromCharacterBuildAndStatBlock
      >[0]["statBlockBattleInput"],
      "ammunitionStocks"
    >;
  },
): BattleRuntimeSession {
  const result = startBattleFromCharacterBuildAndStatBlock({
    ...input,
    character: { ...input.character, ammunitionStocks: [] },
    statBlockBattleInput: {
      ...input.statBlockBattleInput,
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    },
  });
  if (Either.isLeft(result)) {
    throw new Error(characterBattleRuntimeIssueMessage(result.left));
  }
  return result.right;
}

function resolvedState(result: ReturnType<typeof endTurn>): BattleState {
  if (result.tag !== "resolved") {
    throw new Error("Expected battle runtime result to resolve.");
  }
  return result.state;
}

function characterEquipmentItemUnitIdRight(value: string) {
  const result = characterEquipmentItemUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid test CharacterBuild equipment item Unit id: ${value}`,
    );
  }
  return result.right;
}

function testWizardSpellcasting(input: {
  readonly cantrips: readonly string[];
  readonly spellbook?: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly spellSlots: readonly { readonly spellLevel: 1; readonly count: 2 }[];
  readonly sourceUnitId?: string;
  readonly spellcastingAbility?: CharacterBuildSpellcasting["sources"][number]["spellcastingAbility"];
}): CharacterBuildSpellcasting {
  return {
    sources: [
      {
        sourceUnitId: unitId(input.sourceUnitId ?? "class_wizard"),
        spellcastingAbility: input.spellcastingAbility ?? "int",
        cantrips: input.cantrips.map(unitId),
        spellbook: (input.spellbook ?? input.preparedSpells).map(unitId),
        preparedSpells: input.preparedSpells.map(unitId),
        spellcastingFocuses: ["spellbook"],
      },
    ],
    slotPools: {
      spellcasting: {
        kind: "spellcasting",
        slots: input.spellSlots,
      },
    },
  };
}

function characterBuildMaximumHp(
  build: CharacterBuild,
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
) {
  return expectRight(characterBuildHitPoints(build, unitLibrary)).maximum;
}

function wizardProgression(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  level = 1,
): CharacterBuild["progression"] {
  const wizard = root.unitLibrary.requireUnit("class_wizard");
  if (wizard.kind !== "class") {
    throw new Error("Expected Wizard class Unit.");
  }
  if (level !== 1) {
    return characterBuildForClassProgression({
      base: fighterCharacterBuild(root.unitLibrary),
      classUnit: wizard,
      level,
      keepClassChoices: false,
    }).progression;
  }
  return {
    startingClass: expectRight(classUnitIdFromClassUnit(wizard)),
    advancements: [],
  };
}

function testCharacterEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(slot: Slot, unitId: string) {
  return characterEquipmentItemId({
    slot,
    unitId: characterEquipmentItemUnitIdRight(unitId),
  });
}

function availableCharacterSessionRight(
  input: Omit<
    Parameters<typeof availableCharacterSession>[0],
    "companion" | "conditions"
  > &
    Partial<
      Pick<
        Parameters<typeof availableCharacterSession>[0],
        "companion" | "conditions"
      >
    >,
) {
  const result = availableCharacterSession({
    companion: { tag: "none" },
    conditions: [],
    ...input,
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

type JsonSchemaObject = {
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  readonly items?: unknown;
  readonly anyOf?: readonly unknown[];
};

function jsonSchemaObject(value: unknown): JsonSchemaObject | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  // Cast evidence: generated JSON Schema nodes are object records; this helper
  // only exposes optional schema metadata after the non-null object check.
  return value as JsonSchemaObject;
}

function findSchemaWithProperty(
  value: unknown,
  property: string,
): JsonSchemaObject | undefined {
  const schema = jsonSchemaObject(value);
  if (schema === undefined) return undefined;
  if (schema.properties?.[property] !== undefined) return schema;
  for (const child of [
    ...(schema.anyOf ?? []),
    ...(schema.properties === undefined
      ? []
      : Object.values(schema.properties)),
    ...(schema.items === undefined ? [] : [schema.items]),
  ]) {
    const found = findSchemaWithProperty(child, property);
    if (found !== undefined) return found;
  }
  return undefined;
}

function retainedCompanionId(value: string) {
  return expectRight(parseCharacterSheetRetainedCompanionId(value));
}

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");

describe("MCP server route", () => {
  test("falls back to canonical ids when optional authored display records are absent", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const syntheticClassId = classUnitId(unitId("class_synthetic_missing"));
    const displayName = characterBuildDisplayName(root.unitLibrary, {
      ...build,
      background: unitId("background_synthetic_missing"),
      species: unitId("species_synthetic_missing"),
      progression: {
        startingClass: syntheticClassId,
        advancements: build.progression.advancements.map((advancement) => ({
          ...advancement,
          classUnitId: syntheticClassId,
        })),
      },
    });

    expect(displayName).toContain("species_synthetic_missing");
    expect(displayName).toContain("background_synthetic_missing");
    expect(displayName).toContain("class_synthetic_missing");
  });

  test("lists projected resource rows and in-battle character ownership", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:list-resource-and-battle-status";
    const druid = root.unitLibrary.requireUnit("class_druid");
    if (druid.kind !== "class") {
      throw new Error("Expected the Druid class Unit.");
    }
    const build = {
      ...characterBuildForClassProgression({
        base: fighterCharacterBuild(root.unitLibrary),
        classUnit: druid,
        keepClassChoices: false,
        level: 2,
      }),
      background: unitId("background_sage"),
      magicInitiateSpellAccesses: [
        {
          featUnitId: unitId("feat_magic_initiate_wizard"),
          spellcastingAbility: "int" as const,
          cantrips: [unitId("fire_bolt"), unitId("light")] as const,
          levelOneSpell: unitId("burning_hands"),
        },
      ],
    };
    const characterId = testCharacterId(draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId,
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
        druidWildShapeKnownFormStatBlockIds: [
          statBlockId("stat_block_rat"),
          statBlockId("stat_block_riding_horse"),
          statBlockId("stat_block_spider"),
          statBlockId("stat_block_wolf"),
        ],
      }),
    );

    const available = readPayload(handleToolCall(root, "list_characters", {}));
    expect(available.characters).toEqual([
      expect.objectContaining({
        characterId,
        status: "available",
        resources: [
          {
            tag: "spellAccessFreeCast",
            sourceUnitId: "feat_magic_initiate_wizard",
            spellId: "burning_hands",
            count: 1,
            expended: 0,
          },
          {
            tag: "useCountResource",
            unitId: "druid_wild_shape",
            count: 2,
            expended: 0,
          },
        ],
      }),
    ]);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:list-in-battle",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId,
            combatantId: "fighter",
            initiative: 10,
          },
        ],
      }),
    );
    const inBattle = readPayload(handleToolCall(root, "list_characters", {}));
    expect(inBattle.characters).toEqual([
      expect.objectContaining({
        battleId: "battle:list-in-battle",
        characterId,
        status: "inBattle",
      }),
    ]);

    expect(
      readPayload(
        handleToolCall(root, "inspect_character_session", { characterId }),
      ),
    ).toMatchObject({
      detail: {
        tag: "inBattle",
        characterId,
        displayName: expect.any(String),
        battleId: "battle:list-in-battle",
        build: expect.any(Object),
      },
    });
    const inspected = readPayload(
      handleToolCall(root, "inspect_character_session", { characterId }),
    );
    expect(inspected.detail).not.toHaveProperty("sheet");
    expect(inspected.detail).not.toHaveProperty("sheetProjection");
  });

  test("publishes only the narrow canonical Character Sheet projection", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const characterId = testCharacterId("inspect-sheet-schema");
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId,
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    const output = readPayload(
      handleToolCall(root, "inspect_character_session", { characterId }),
    );
    expect(output.detail).toMatchObject({
      tag: "available",
      characterId,
      build: expect.any(Object),
      sheetProjection: {
        hitDice: expect.any(Array),
        resources: expect.any(Array),
      },
    });
    expect(output.detail).not.toHaveProperty("sheet");

    const malformedCurrentHp = {
      ...output,
      detail: {
        ...output.detail,
        sheetProjection: {
          ...output.detail.sheetProjection,
          currentHp: -1,
        },
      },
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CharacterSessionDetailOutputSchema)(
          malformedCurrentHp,
        ),
      ),
    ).toBe(true);

    const malformedManifestationTag = {
      ...output,
      detail: {
        ...output.detail,
        sheetProjection: {
          ...output.detail.sheetProjection,
          companion: {
            tag: "retainedOneAtATime",
            companion: {
              companionId: "synthetic-companion",
              manifestation: {
                tag: "pluginOnly",
                resolvedStatBlockId: "synthetic-stat-block",
              },
            },
          },
        },
      },
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CharacterSessionDetailOutputSchema)(
          malformedManifestationTag,
        ),
      ),
    ).toBe(true);
  });

  test("routes Character Session queries to canonical projections without storing them", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const characterId = testCharacterId("query-fighter");
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId,
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );
    const before = root.sessionStore.snapshot();

    const queries = [
      {
        kind: "abilityCheckAbility",
        skill: "athletics",
        defaultAbility: "str",
        activeFeatureUnitIds: [],
      },
      {
        kind: "abilityCheckProficiencyBonus",
        skill: "athletics",
        otherProficiencyBonus: { tag: "noOtherProficiencyBonus" },
      },
      { kind: "jumpDistanceAbility", defaultAbility: "str" },
      { kind: "linkedSpeedGrants" },
      { kind: "armorClass" },
      { kind: "spellAccess" },
      {
        kind: "weaponMasterySelections",
        featureUnitId: "fighter_weapon_mastery",
      },
      { kind: "spellbookRitualAccesses" },
      {
        kind: "spellInvocation",
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      },
    ] as const;

    for (const query of queries) {
      const payload = readPayload(
        handleToolCall(root, "query_character_session", {
          characterId,
          query,
        }),
      );
      expect(payload).toMatchObject({
        characterId,
        query: { kind: query.kind },
        session: { characterIds: [characterId] },
      });
    }

    const rejectedKnownForms = readPayload(
      handleToolCall(root, "query_character_session", {
        characterId,
        query: { kind: "knownForms" },
      }),
    );
    expect(rejectedKnownForms).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_QUERY_REJECTED",
        queryKind: "knownForms",
      },
    });

    const rejectedNonRitual = readPayload(
      handleToolCall(root, "query_character_session", {
        characterId,
        query: {
          kind: "spellInvocation",
          spellId: "detect_magic",
          invocation: { kind: "nonRitual" },
        } as unknown,
      }),
    );
    expect(rejectedNonRitual).toMatchObject({
      details: { code: "INVALID_ARGUMENTS" },
    });
    expect(root.sessionStore.snapshot()).toEqual(before);
  });

  test("returns the existing ritual access and invocation projections", () => {
    const root = createMcpPlaySessionRoot();
    const fighter = fighterCharacterBuild(root.unitLibrary);
    const build = {
      ...fighter,
      progression: wizardProgression(root),
      spellcasting: testWizardSpellcasting({
        cantrips: [],
        spellbook: ["detect_magic"],
        preparedSpells: ["detect_magic"],
        spellSlots: [{ spellLevel: 1, count: 2 }],
      }),
    };
    const characterId = testCharacterId("query-wizard-ritual");
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId,
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    const accesses = readPayload(
      handleToolCall(root, "query_character_session", {
        characterId,
        query: { kind: "spellbookRitualAccesses" },
      }),
    );
    expect(accesses).toMatchObject({
      query: {
        kind: "spellbookRitualAccesses",
        projection: [
          {
            tag: "spellbookRitual",
            spell: { id: "detect_magic" },
            spellcastingSourceUnitId: "class_wizard",
          },
        ],
      },
    });

    const invocation = readPayload(
      handleToolCall(root, "query_character_session", {
        characterId,
        query: {
          kind: "spellInvocation",
          spellId: "detect_magic",
          invocation: { kind: "ritual" },
        },
      }),
    );
    expect(invocation).toMatchObject({
      query: {
        kind: "spellInvocation",
        projection: {
          tag: "accepted",
          invocation: {
            tag: "spellbookRitual",
            spellId: "detect_magic",
            requiredSpellAccess: "spellbook",
          },
        },
      },
    });
  });

  test("rejects malformed nested Character Session query projections", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const characterId = testCharacterId("query-schema");
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId,
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );
    const queryOutput = (query: unknown) =>
      readPayload(
        handleToolCall(root, "query_character_session", {
          characterId,
          query,
        }),
      );
    const rejects = (value: unknown) =>
      expect(
        Either.isLeft(
          Schema.decodeUnknownEither(CharacterSessionQueryOutputSchema)(value),
        ),
      ).toBe(true);

    const proficiency = queryOutput({
      kind: "abilityCheckProficiencyBonus",
      skill: "athletics",
      otherProficiencyBonus: { tag: "noOtherProficiencyBonus" },
    });
    rejects({
      ...proficiency,
      query: {
        ...proficiency.query,
        projection: { ...proficiency.query.projection, qRoute: [{}] },
      },
    });

    const ability = queryOutput({
      kind: "abilityCheckAbility",
      skill: "athletics",
      defaultAbility: "str",
      activeFeatureUnitIds: [],
    });
    rejects({
      ...ability,
      query: {
        ...ability.query,
        projection: { ...ability.query.projection, defaultAbility: "bogus" },
      },
    });
    rejects({
      ...proficiency,
      query: {
        ...proficiency.query,
        projection: {
          ...proficiency.query.projection,
          proficiencyBonus: {
            ...proficiency.query.projection.proficiencyBonus,
            skill: "bogus",
          },
        },
      },
    });

    const linkedSpeeds = queryOutput({ kind: "linkedSpeedGrants" });
    rejects({
      ...linkedSpeeds,
      query: {
        ...linkedSpeeds.query,
        projection: [
          {
            sourceUnitId: "synthetic_speed_source",
            speedKind: "fly",
            feet: 2.5,
          },
        ],
      },
    });

    const spellAccess = queryOutput({ kind: "spellAccess" });
    rejects({
      ...spellAccess,
      query: {
        ...spellAccess.query,
        projection: [
          {
            source: "classFeature",
            sourceUnitId: "synthetic_spell_source",
            spellId: "synthetic_spell",
            spellcastingAbility: "bogus",
            preparation: "alwaysPrepared",
          },
        ],
      },
    });
    rejects({
      ...spellAccess,
      characterId: "",
    });
    rejects({
      ...spellAccess,
      query: {
        ...spellAccess.query,
        projection: [
          {
            source: "classFeature",
            sourceUnitId: "",
            spellId: "synthetic_spell",
            spellcastingAbility: "int",
            preparation: "alwaysPrepared",
          },
        ],
      },
    });

    const armor = queryOutput({ kind: "armorClass" });
    rejects({
      ...armor,
      query: {
        ...armor.query,
        projection: {
          ...armor.query.projection,
          state: { ...armor.query.projection.state, bonuses: [{}] },
          qRoute: [
            { ...armor.query.projection.qRoute[0], kind: "unexpected" },
            armor.query.projection.qRoute[1],
          ],
        },
      },
    });

    const mastery = queryOutput({
      kind: "weaponMasterySelections",
      featureUnitId: "fighter_weapon_mastery",
    });
    rejects({
      ...mastery,
      query: {
        ...mastery.query,
        projection: {
          ...mastery.query.projection,
          choiceCount: 1.5,
          longRestChangeCount: -1,
        },
      },
    });
    rejects({
      ...mastery,
      query: {
        ...mastery.query,
        projection: {
          ...mastery.query.projection,
          qRoute: [
            mastery.query.projection.qRoute[0],
            { ...mastery.query.projection.qRoute[1], subject: "unexpected" },
          ],
        },
      },
    });

    const ritual = queryOutput({ kind: "spellbookRitualAccesses" });
    rejects({
      ...ritual,
      query: {
        ...ritual.query,
        projection: [
          {
            tag: "spellbookRitual",
            spell: {
              id: "detect_magic",
              mechanics: { level: "not-a-level" },
            },
            spellcastingSourceUnitId: "class_wizard",
            featureUnitId: "wizard_ritual_adept",
          },
        ],
      },
    });
    rejects({
      ...ritual,
      query: {
        ...ritual.query,
        projection: [
          {
            tag: "spellbookRitual",
            spell: {
              id: "",
              mechanics: { level: 1 },
            },
            spellcastingSourceUnitId: "class_wizard",
            featureUnitId: "wizard_ritual_adept",
          },
        ],
      },
    });

    const druidRoot = createMcpPlaySessionRoot();
    const druidDraftId = "draft:query-schema-known-forms";
    createFinalizedDruidSheet(druidRoot, druidDraftId);
    const druidCharacterId = testCharacterId(druidDraftId);
    const knownForms = readPayload(
      handleToolCall(druidRoot, "query_character_session", {
        characterId: druidCharacterId,
        query: { kind: "knownForms" },
      }),
    );
    rejects({
      ...knownForms,
      query: {
        ...knownForms.query,
        projection: {
          ...knownForms.query.projection,
          statBlockIds: [""],
        },
      },
    });
  });

  test("reports an unknown selected Character Session without guessing an id", () => {
    const root = createMcpPlaySessionRoot();

    expect(
      readPayload(
        handleToolCall(root, "inspect_character_session", {
          characterId: "character:not-present",
        }),
      ),
    ).toMatchObject({
      details: {
        code: "UNKNOWN_CHARACTER_SESSION",
        characterId: "character:not-present",
      },
    });
  });

  test("reports character-list projection failures from the supplied catalog boundary", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:list-invalid-catalog";
    createFinalizedFighterSheet(root, draftId);
    const emptyCatalog = buildUnitCatalog({
      collections: [defineSrdUnitCollection({ units: [] })],
    });
    if (emptyCatalog.tag !== "ok") {
      throw new Error("Expected the empty SRD test catalog to build.");
    }
    const invalidCatalogRoot = {
      ...root,
      unitLibrary: emptyCatalog.catalog,
    };

    expect(Either.isLeft(adminProjection(invalidCatalogRoot))).toBe(true);
    expect(
      readPayload(handleToolCall(invalidCatalogRoot, "list_characters", {})),
    ).toMatchObject({
      details: { code: "CHARACTER_LIST_INVALID" },
    });
    expect(
      readPayload(
        handleToolCall(invalidCatalogRoot, "inspect_character_session", {
          characterId: testCharacterId(draftId),
        }),
      ),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_DETAIL_INVALID" },
    });
    expect(
      readPayload(
        handleToolCall(invalidCatalogRoot, "start_battle", {
          battleId: "battle:invalid-character-catalog",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: testCharacterId(draftId),
              combatantId: "fighter",
              initiative: 10,
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [{ details: { code: "CHARACTER_BATTLE_INIT_INVALID" } }],
      },
    });
  });

  test("reports a supplied catalog whose supported resource id has incompatible mechanics", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:list-incompatible-resource-catalog";
    const druid = root.unitLibrary.requireUnit("class_druid");
    if (druid.kind !== "class") {
      throw new Error("Expected the Druid class Unit.");
    }
    const build = characterBuildForClassProgression({
      base: fighterCharacterBuild(root.unitLibrary),
      classUnit: druid,
      keepClassChoices: false,
      level: 2,
    });
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId: testCharacterId(draftId),
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        druidWildShapeKnownFormStatBlockIds: [
          statBlockId("stat_block_rat"),
          statBlockId("stat_block_riding_horse"),
          statBlockId("stat_block_spider"),
          statBlockId("stat_block_wolf"),
        ],
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );
    const wildShape = root.unitLibrary.requireUnit("druid_wild_shape");
    const fontOfMagic = root.unitLibrary.requireUnit("sorcerer_font_of_magic");
    if (
      wildShape.kind !== "class_feature" ||
      fontOfMagic.kind !== "class_feature" ||
      fontOfMagic.mechanics.family !== "resource_pool"
    ) {
      throw new Error("Expected the resource projection test Units.");
    }
    const incompatibleCatalog = unitLibraryWithOverrides(root.unitLibrary, [
      {
        ...wildShape,
        mechanics: fontOfMagic.mechanics,
        name: "Synthetic incompatible use-count resource",
      },
    ]);

    expect(
      readPayload(
        handleToolCall(
          { ...root, unitLibrary: incompatibleCatalog },
          "list_characters",
          {},
        ),
      ),
    ).toMatchObject({
      details: {
        code: "CHARACTER_LIST_INVALID",
        message:
          "Class feature use-count resource requires an installed rest-reset class feature.",
      },
    });
  });

  test("lists Pact Magic slots for an available Warlock", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:list-warlock-pact-slots";
    const warlock = root.unitLibrary.requireUnit("class_warlock");
    if (warlock.kind !== "class") {
      throw new Error("Expected the Warlock class Unit.");
    }
    const build: CharacterBuild = {
      ...characterBuildForClassProgression({
        base: fighterCharacterBuild(root.unitLibrary),
        classUnit: warlock,
        keepClassChoices: false,
        level: 1,
      }),
      spellcasting: {
        slotPools: {
          pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
        },
        sources: [
          {
            cantrips: [unitId("eldritch_blast"), unitId("mage_hand")],
            preparedSpells: [unitId("charm_person"), unitId("hellish_rebuke")],
            sourceUnitId: unitId("class_warlock"),
            spellbook: [],
            spellcastingAbility: "cha",
            spellcastingFocuses: ["arcane_focus"],
          },
        ],
      },
    };
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        build,
        characterId: testCharacterId(draftId),
        currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        hitPointMaximumReduction: Hp(0),
        tempHp: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    expect(
      readPayload(handleToolCall(root, "list_characters", {})),
    ).toMatchObject({
      characters: [
        {
          characterId: testCharacterId(draftId),
          pactSlots: { count: 1, expended: 0, slotLevel: 1 },
          status: "available",
        },
      ],
    });
  });

  test("builds SRD catalogs and keeps selected Stat Block state identity-only", () => {
    const root = createMcpPlaySessionRoot();
    const selected = root.sessionStore.selectStatBlock(
      statBlockId("stat_block_goblin_warrior"),
    );

    expect(root.unitLibrary.listUnits().length).toBeGreaterThan(0);
    expect(
      root.statBlockCatalog.listStatBlocks().map((record) => record.id),
    ).toEqual(
      expect.arrayContaining([
        "stat_block_goblin_warrior",
        "stat_block_skeleton",
        "stat_block_owl",
      ]),
    );
    expect(Either.isRight(selected) ? selected.right.id : undefined).toBe(
      "stat_block_goblin_warrior",
    );
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      selectedStatBlockId: "stat_block_goblin_warrior",
      battleState: { tag: "none" },
      transientBattleFills: null,
    });
    expect(root.sessionStore.getSelectedStatBlock()?.id).toBe(
      "stat_block_goblin_warrior",
    );

    root.sessionStore.clearSelectedStatBlock();

    expect(root.sessionStore.snapshot().selectedStatBlockId).toBeNull();
    expect(root.sessionStore.getSelectedStatBlock()).toBeNull();
  });

  test("starts battle from Character Build at the MCP composition boundary", () => {
    const root = createMcpPlaySessionRoot();
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: fighterCharacterBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: root.unitLibrary,
    });

    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-root"),
      currentActorId: fighterId,
      turnOrder: [fighterId, goblinId],
      combatants: [
        {
          combatantId: fighterId,
          displayName: "Orc Soldier Fighter",
          hp: 12,
          armorClass: 19,
        },
        {
          combatantId: goblinId,
          hp: 10,
          armorClass: 15,
        },
      ],
    });
    expect(snapshotBattle(state).combatants[1]).not.toHaveProperty(
      "displayName",
    );
    expect(state.combatants.get(fighterId)?.initiative).toBe(12);
    expect(state.combatants.get(goblinId)?.initiative).toBe(11);
    expect(root.sessionStore.snapshot().battleState).toEqual({
      tag: "activeBattle",
      battleId: "battle-root",
      currentActorId: fighterId,
    });
    expect(root.sessionStore.snapshot().transientBattleFills).toBeNull();
    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })).map(
        (act) => act.summary,
      ),
    ).toEqual(
      expect.arrayContaining([
        "Take the Attack action with Longsword.",
        "Take the Attack action with Unarmed Strike.",
      ]),
    );
  });

  test("projects all progression class levels at the battle boundary", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const wizard = root.unitLibrary.requireUnit("class_wizard");
    if (wizard.kind !== "class") {
      throw new Error("Expected Wizard class Unit.");
    }
    const wizardClassUnitId = expectRight(classUnitIdFromClassUnit(wizard));
    const multiclassBuild: CharacterBuild = {
      ...build,
      progression: {
        startingClass: expectRight(
          classUnitIdFromClassUnit(
            root.unitLibrary.requireUnit("class_fighter"),
          ),
        ),
        advancements: [
          {
            classUnitId: wizardClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      },
    };

    const { state } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-multiclass"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-wizard-character"),
        displayName: "Orc Soldier Fighter / Wizard",
        build: multiclassBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(state.combatants.get(fighterId)?.origin).toMatchObject({
      kind: "character",
      classLevels: [
        { className: "fighter", level: 1 },
        { className: "wizard", level: 1 },
      ],
    });
  });

  test("derives base Unarmed Strike when no weapon is selected", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-unarmed"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: {
          ...build,
          equipment: {
            ...build.equipment,
            loadout: {
              ...(build.equipment.loadout.armor === undefined
                ? {}
                : { armor: build.equipment.loadout.armor }),
              ...(build.equipment.loadout.shield === undefined
                ? {}
                : { shield: build.equipment.loadout.shield }),
            },
          },
        },
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: root.unitLibrary,
    });
    const combatant = state.combatants.get(fighterId);

    expect(combatant?.origin).toMatchObject({
      kind: "character",
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: 3,
        attackBonus: 5,
        damageAbilityModifier: 3,
      },
    });
    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })).map(
        (act) => act.summary,
      ),
    ).toContain("Take the Attack action with Unarmed Strike.");
  });

  test("admits only supported authored critical-range Unit hooks at the battle support boundary", () => {
    const root = createMcpPlaySessionRoot();
    const improvedCriticalUnit = root.unitLibrary.requireUnit(
      "fighter_improved_critical",
    );
    if (improvedCriticalUnit.kind !== "class_feature") {
      throw new Error("Expected Improved Critical class-feature Unit.");
    }
    const supportedLibrary = fighterUnitLibraryWithClassFeatureGrant(
      root.unitLibrary,
      improvedCriticalUnit,
    );
    const supportedBuild = fighterCharacterBuildAtLevel(
      supportedLibrary,
      improvedCriticalUnit.acquiredAtLevel,
    );
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-critical-range"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Champion Fighter",
        build: supportedBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: supportedLibrary,
    });

    expect(
      characterUnitRef(context, fighterId, "fighter_improved_critical"),
    ).toMatchObject({
      supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
    });

    const unsupportedCriticalRangeUnit = decodeUnitRecordSync({
      ...improvedCriticalUnit,
      id: "fighter_unsupported_critical_range",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "modify_crit_range",
            threshold: 18,
            attackRollFilter: "weapon_or_unarmed_strike",
          },
        ],
      },
    });
    if (unsupportedCriticalRangeUnit.kind !== "class_feature") {
      throw new Error(
        "Expected unsupported critical-range class-feature Unit.",
      );
    }
    const unsupportedLibrary = fighterUnitLibraryWithClassFeatureGrant(
      root.unitLibrary,
      unsupportedCriticalRangeUnit,
    );
    const unsupportedBuild = fighterCharacterBuildAtLevel(
      unsupportedLibrary,
      unsupportedCriticalRangeUnit.acquiredAtLevel,
    );
    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-critical-range"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Unsupported Critical Range Fighter",
          build: unsupportedBuild,
          initiative: initiativeScore(12),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
        },
        unitLibrary: unsupportedLibrary,
      }),
    ).toThrow(
      `Unsupported battle critical-range Unit hook: ${unsupportedCriticalRangeUnit.id}.`,
    );
  });

  test("admits attack-damage rider Unit hooks through their owning class feature", () => {
    const root = createMcpPlaySessionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary);
    const supportedLibrary = rogueBattleUnitLibrary(root);
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-attack-damage-rider"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: supportedLibrary,
    });

    expect(
      characterUnitRef(context, fighterId, "rogue_sneak_attack"),
    ).toMatchObject({
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    });

    const sneakAttackUnit = root.unitLibrary.requireUnit("rogue_sneak_attack");
    expect(sneakAttackUnit).toMatchObject({
      kind: "class_feature",
      className: "rogue",
      mechanics: {
        effect: {
          dice: {
            kind: "class_level_table",
          },
        },
      },
    });
  });

  test("admits Cunning Action alternate action cost through the retained feature Unit", () => {
    const root = createMcpPlaySessionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 2,
    });
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-cunning-action"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(
      characterUnitRef(context, fighterId, "rogue_cunning_action"),
    ).toMatchObject({
      supportProfiles: [
        {
          kind: "alternateActionCost",
          from: {
            kind: "standardAction",
            actions: ["dash", "disengage", "hide"],
          },
          to: { kind: "bonusAction" },
        },
      ],
    });
    expect(characterUnitRef(context, fighterId, "class_rogue")).toMatchObject({
      supportProfiles: [],
    });
  });

  test("does not infer Cunning Action support from Rogue class name or level", () => {
    const root = createMcpPlaySessionRoot();
    const { context: rogueOneContext } =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-rogue-one-no-cunning-action"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Orc Soldier Rogue",
          build: rogueCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(12),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
        },
        unitLibrary: rogueBattleUnitLibrary(root),
      });
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 2,
    });
    const buildWithoutCunningAction: CharacterBuild = {
      ...rogueBuild,
      features: rogueBuild.features.filter(
        (feature) =>
          feature.kind !== "selectedClassChoice" ||
          feature.unitId !== "rogue_cunning_action",
      ),
    };
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-no-inferred-cunning-action"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: buildWithoutCunningAction,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(
      characterUnitRef(rogueOneContext, fighterId, "class_rogue"),
    ).toMatchObject({
      supportProfiles: [],
    });
    expect(characterUnitRef(context, fighterId, "class_rogue")).toMatchObject({
      supportProfiles: [],
    });
  });

  test("admits only save-damage replacement Unit hooks with Evasion-style mechanics", () => {
    const root = createMcpPlaySessionRoot();
    const evasionBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 7,
    });
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-save-damage-replacement"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: evasionBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(characterUnitRef(context, fighterId, "rogue_evasion")).toMatchObject(
      {
        supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
      },
    );

    const evasionUnit = root.unitLibrary.requireUnit("rogue_evasion");
    if (
      evasionUnit.kind !== "class_feature" ||
      evasionUnit.mechanics.family !== "save_damage_replacement"
    ) {
      throw new Error("Expected Evasion class-feature Unit.");
    }
    const unsupportedEvasionUnit: UnitRecord = {
      ...evasionUnit,
      mechanics: {
        ...evasionUnit.mechanics,
        trigger: {
          ...evasionUnit.mechanics.trigger,
          ability: "con",
        },
      },
    };

    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-save-damage-replacement"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Unsupported Evasion Rogue",
          build: evasionBuild,
          initiative: initiativeScore(12),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
        },
        unitLibrary: rogueBattleUnitLibrary(root, {
          evasionUnit: unsupportedEvasionUnit,
        }),
      }),
    ).toThrow("Unsupported battle save-damage replacement Unit hook");
  });

  test("admits reaction roll or damage reduction Unit hooks through support profiles", () => {
    const root = createMcpPlaySessionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 5,
    });
    const { context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-reaction-modifier"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueBuild,
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(
      characterUnitRef(context, fighterId, "rogue_uncanny_dodge"),
    ).toMatchObject({
      supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
    });

    const uncannyDodgeUnit = root.unitLibrary.requireUnit(
      "rogue_uncanny_dodge",
    );
    if (
      uncannyDodgeUnit.kind !== "class_feature" ||
      uncannyDodgeUnit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Uncanny Dodge reaction modifier Unit.");
    }
    const unsupportedUnit: UnitRecord = {
      ...uncannyDodgeUnit,
      provenance: {
        kind: "xphb",
        section: "structured-input-only",
      },
      mechanics: {
        family: "reaction_roll_or_damage_reduction",
        modifiers: [
          {
            kind: "ability_check_reduction",
            trigger: {
              kind: "creature_succeeds_ability_check",
              rangeFeet: 60,
              requiresVisibleCreature: true,
            },
            reduction: { kind: "bardic_inspiration_die" },
          },
        ],
      },
    };
    const unsupportedBuild = {
      ...rogueBuild,
      features: rogueBuild.features,
    };
    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-reaction-modifier"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Unsupported Rogue",
          build: unsupportedBuild,
          initiative: initiativeScore(12),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
        },
        unitLibrary: rogueBattleUnitLibrary(root, {
          uncannyDodgeUnit: unsupportedUnit,
        }),
      }),
    ).toThrow("Unsupported battle reaction roll or damage reduction Unit hook");
  });

  test("reports every missing Character Build Unit ref at the battle support boundary", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const result = characterBattleSupportProjection(
      {
        ...build,
        features: [
          ...build.features,
          {
            kind: "selectedClassChoice",
            unitId: unitId("missing_feature_one"),
            selectedFromUnitId: unitId("fighter_fighting_style"),
          },
          {
            kind: "selectedClassChoice",
            unitId: unitId("missing_feature_two"),
            selectedFromUnitId: unitId("fighter_fighting_style"),
          },
        ],
      },
      root.unitLibrary,
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.map((issue) => issue.message)).toEqual([
      "Unknown Character Build Unit for battle initialization: missing_feature_one.",
      "Unknown Character Build Unit for battle initialization: missing_feature_two.",
    ]);
  });

  test("carries finalized Fighter 2 Action Surge resources into battle discovery", () => {
    const root = createMcpPlaySessionRoot();
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-fighter-two"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter 2",
        build: fighterTwoCharacterBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          presentation: expect.objectContaining({
            kind: "unit",
            unitId: "fighter_action_surge",
          }),
          subject: expect.objectContaining({
            tag: "unitFeature",
            actorId: fighterId,
            procedureRef: expect.any(String),
          }),
        }),
      ]),
    );
  });

  test("discovers Stat Block Multiattack and Bonus Action subjects through battle runtime", () => {
    const root = createMcpPlaySessionRoot();
    const { state: fighterTurn, context } =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-root-stat-block-procedures"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(12),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: goblinWarriorMultiattackStatBlock(root),
          initiative: initiativeScore(11),
        },
        unitLibrary: root.unitLibrary,
      });
    const goblinTurn = resolvedState(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    );

    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({ state: goblinTurn, context }),
      ).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "multiattack",
          procedureRef: expect.any(String),
        },
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          procedureRef: expect.any(String),
          standardAction: "disengage",
        },
      ]),
    );
  });

  test("starts battle from a CharacterBuild with two Light weapons for the off-hand runtime path", () => {
    const root = createMcpPlaySessionRoot();
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-off-hand"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: fighterTwoLightWeaponBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        resourceExpenditures: [],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })).map(
        (act) => act.summary,
      ),
    ).not.toContain("Make the Light property Bonus Action attack with Dagger.");
  });

  test("registers agent-facing content discovery tool names", () => {
    expect(contentToolDefinitions.map((tool) => tool.name)).toEqual([
      "describe_mcp_workflow",
      "list_stat_blocks",
      "list_catalog_units",
      "inspect_catalog_unit",
    ]);
  });

  test("registers final user-facing character tool names", () => {
    expect(characterToolDefinitions.map((tool) => tool.name)).toEqual([
      "create_character_draft",
      "discover_creation_holes",
      "fill_creation_holes",
      "finalize_character",
      "apply_character_session_operation",
      "list_characters",
      "inspect_character_session",
      "query_character_session",
    ]);
  });

  test("declares capacity-bearing resource display rows in list_characters output schema", () => {
    const listCharactersTool = characterToolDefinitions.find(
      (tool) => tool.name === "list_characters",
    );
    const availableRowSchema = findSchemaWithProperty(
      listCharactersTool?.outputSchema,
      "resources",
    );
    const resourcesSchema = jsonSchemaObject(
      availableRowSchema?.properties?.resources,
    );
    const unitResourceRowSchema = findSchemaWithProperty(
      resourcesSchema?.items,
      "unitId",
    );
    const spellAccessResourceRowSchema = findSchemaWithProperty(
      resourcesSchema?.items,
      "sourceUnitId",
    );

    expect(availableRowSchema?.required).toContain("resources");
    expect(unitResourceRowSchema?.required).toEqual(
      expect.arrayContaining(["tag", "unitId", "count", "expended"]),
    );
    expect(unitResourceRowSchema?.properties).toMatchObject({
      tag: { type: "string" },
      unitId: { type: "string" },
      count: { type: "integer", minimum: 0 },
      expended: { type: "integer", minimum: 0 },
    });
    expect(spellAccessResourceRowSchema?.required).toEqual(
      expect.arrayContaining([
        "tag",
        "sourceUnitId",
        "spellId",
        "count",
        "expended",
      ]),
    );
    expect(spellAccessResourceRowSchema?.properties).toMatchObject({
      tag: { type: "string", enum: ["spellAccessFreeCast"] },
      sourceUnitId: { type: "string" },
      spellId: { type: "string" },
      count: { type: "integer", minimum: 0 },
      expended: { type: "integer", minimum: 0 },
    });
    expect(spellAccessResourceRowSchema?.properties).not.toHaveProperty(
      "unitId",
    );
  });

  test("does not expose retained companion creation HP inputs in the MCP schema", () => {
    const applyOperationTool = characterToolDefinitions.find(
      (tool) => tool.name === "apply_character_session_operation",
    );
    // Cast evidence: mcpObjectJsonSchema returns an object JSON schema for
    // tool input schemas; this test inspects that generated object shape.
    const inputSchema = applyOperationTool?.inputSchema as
      | {
          readonly properties?: {
            readonly operation?: {
              readonly properties?: Readonly<Record<string, unknown>>;
            };
          };
        }
      | undefined;
    const operationSchema = inputSchema?.properties?.operation;
    const operationSchemaText = JSON.stringify(operationSchema);
    for (const operationKind of [
      "retainOneAtATimeCompanion",
      "advanceClassLevel",
      "replaceDruidWildShapeKnownForm",
      "spendSpellAccessFreeCast",
      "useMonkUncannyMetabolismWhenRollingInitiative",
      "convertFontOfMagicSpellSlotToSorceryPoints",
      "convertFontOfMagicSorceryPointsToSpellSlot",
      "completeShortRest",
      "interruptShortRest",
      "completeLongRest",
      "interruptLongRest",
      "passCalendarTime",
    ]) {
      expect(operationSchemaText).toContain(operationKind);
    }
    expect(operationSchemaText).not.toContain('"currentHp"');
    expect(operationSchemaText).not.toContain('"tempHp"');
    expect(operationSchemaText).toContain('"interruptionSegments"');
    expect(operationSchemaText).toContain('"cumulativeRestedTicks"');
    expect(operationSchemaText).toContain('"completion"');
  });

  test("registers battle tool names", () => {
    expect(battleToolDefinitions.map((tool) => tool.name)).toEqual([
      "select_stat_block",
      "start_battle",
      "battle_lifecycle",
      "read_battle_state",
      "discover_battle_acts",
      "fill_battle_hole",
      "resolve_battle_act",
      "end_turn",
      "end_battle",
    ]);
  });

  test("publishes the typed fill_battle_hole contract", () => {
    const tool = battleToolDefinitions.find(
      (candidate) => candidate.name === "fill_battle_hole",
    );
    const inputSchema = jsonSchemaObject(tool?.inputSchema);

    expect(inputSchema?.properties?.subject).toBeDefined();
    expect(inputSchema?.properties?.fill).toBeDefined();
    expect(inputSchema?.properties?.subjectJson).toBeUndefined();
    expect(inputSchema?.properties?.fillJson).toBeUndefined();
    expect(inputSchema).not.toHaveProperty("$defs");
  });

  test("omits redundant impossible properties from registered tool schemas", () => {
    for (const tool of toolDefinitions) {
      expect(JSON.stringify(tool.inputSchema), tool.name).not.toContain(
        '"not":{}',
      );
      expect(JSON.stringify(tool.outputSchema), tool.name).not.toContain(
        '"not":{}',
      );
    }
  });

  test("keeps registered tool metadata within the ChatGPT app-version storage limit", () => {
    expect(
      Buffer.byteLength(JSON.stringify(toolDefinitions), "utf8"),
    ).toBeLessThan(CHATGPT_APP_VERSION_STORAGE_LIMIT_BYTES);
  });

  test("describes MCP workflow and lists discoverable catalogs through tools", () => {
    const root = createMcpPlaySessionRoot();
    const workflow = readPayload(
      handleToolCall(root, "describe_mcp_workflow", {}),
    );
    expect(workflow).toMatchObject({
      resultPaths: {
        creationHoles: "holes",
        battleActs: "availableActs",
        followUpBattleHoles: "result.holes",
        characterSessionOperation: "result",
        calendarTimeResult: "result",
        calendarTimeRecoveryHoles: "result.holes",
      },
      acceptedInputs: {
        progressionFill: expect.stringContaining("draft.progression.initial"),
        choiceFill: expect.stringContaining('"kind":"choice"'),
        attackRollFill: expect.stringContaining('"kind":"attackRoll"'),
        characterSessionOperations:
          expect.stringContaining("completeShortRest"),
      },
    });
    expect(workflow.lifecycle).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "draft.progression.initial choice is the whole Character Progression profile",
        ),
      ]),
    );
    expect(workflow.limits).toEqual(
      expect.arrayContaining([
        expect.stringContaining("does not expose a later level-1 class-entry"),
      ]),
    );
    expect(workflow.recovery).toEqual(
      expect.arrayContaining([
        expect.stringContaining("calendar-time Stable recovery"),
      ]),
    );
    expect(workflow.limits).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Revival workflows beyond"),
      ]),
    );

    const units = readPayload(handleToolCall(root, "list_catalog_units", {}));
    expect(units.unitsByKind.class).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "class_fighter", name: "Fighter" }),
        expect.objectContaining({ id: "class_wizard", name: "Wizard" }),
      ]),
    );
    expect(units.unitsByKind.spell).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "magic_missile", name: "Magic Missile" }),
      ]),
    );
    const unitDetail = readPayload(
      handleToolCall(root, "inspect_catalog_unit", {
        unitId: "magic_missile",
      }),
    );
    expect(JSON.parse(unitDetail.unitRecordJson)).toEqual(
      root.unitLibrary.requireUnit("magic_missile"),
    );

    const statBlocks = readPayload(
      handleToolCall(root, "list_stat_blocks", {}),
    );
    expect(statBlocks.statBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statBlockId: "stat_block_goblin_warrior",
          displayName: "Goblin Warrior",
          attacks: expect.arrayContaining([
            expect.objectContaining({ attackName: "Scimitar" }),
          ]),
        }),
        expect.objectContaining({
          statBlockId: "stat_block_skeleton",
          displayName: "Skeleton",
          damageVulnerabilities: ["bludgeoning"],
        }),
        expect.objectContaining({
          statBlockId: "stat_block_owl",
          displayName: "Owl",
        }),
      ]),
    );
  });

  test("accepts omitted arguments for no-arg and optional-arg tools", () => {
    const root = createMcpPlaySessionRoot();

    expect(
      readPayload(handleToolCall(root, "describe_mcp_workflow", undefined)),
    ).toMatchObject({
      resultPaths: { battleActs: "availableActs" },
    });

    expect(
      readPayload(handleToolCall(root, "create_character_draft", undefined)),
    ).toMatchObject({
      draft: { revision: 0 },
      holes: expect.arrayContaining([
        expect.objectContaining({
          holeId: "cc:draft:draft.progression.initial",
          options: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining("Fighter 1"),
              unitRef: { unitId: "class_fighter" },
            }),
            expect.objectContaining({
              label: expect.stringContaining("Fighter 2"),
              unitRef: { unitId: "class_fighter" },
            }),
            expect.objectContaining({
              label: expect.stringContaining("Wizard 1"),
              unitRef: { unitId: "class_wizard" },
            }),
          ]),
        }),
      ]),
    });
  });

  test("routes typed decode failures and no-battle operation failures", () => {
    const root = createMcpPlaySessionRoot();

    expect(
      readPayload(handleToolCall(root, "list_stat_blocks", null)),
    ).toMatchObject({ details: { code: "INVALID_ARGUMENTS" } });
    expect(
      readPayload(handleToolCall(root, "synthetic_unknown_tool", {})),
    ).toEqual({ error: "Unknown MCP tool: synthetic_unknown_tool" });
    expect(readPayload(handleToolCall(root, "start_battle", {}))).toMatchObject(
      {
        details: { code: "INVALID_ARGUMENTS" },
      },
    );

    for (const [name, args] of [
      ["fill_battle_hole", {}],
      ["resolve_battle_act", {}],
      ["resolve_battle_act", { subjectJson: "not-json" }],
    ] as const) {
      expect(readPayload(handleWireToolCall(root, name, args))).toMatchObject({
        details: { code: "INVALID_ARGUMENTS" },
      });
    }

    for (const [name, args] of [
      [
        "resolve_battle_act",
        {
          subject: {
            tag: "runtimeCommand",
            actorId: "missing",
            command: "endTurn",
          },
        },
      ],
      ["end_turn", { actorId: "missing" }],
      ["end_battle", {}],
    ] as const) {
      expect(readPayload(handleToolCall(root, name, args))).toMatchObject({
        details: { code: "NO_BATTLE_SESSION" },
      });
    }

    for (const name of ["read_battle_state", "discover_battle_acts"] as const) {
      expect(readPayload(handleToolCall(root, name, {}))).toMatchObject({
        snapshot: null,
        availableActs: [],
      });
    }

    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: {
            tag: "runtimeCommand",
            actorId: "missing",
            command: "endTurn",
          },
          fill: {
            kind: "targetChoice",
            holeId: "battle:missing",
            value: "missing",
          },
        }),
      ),
    ).toMatchObject({ details: { code: "NO_BATTLE_SESSION" } });
  });

  test("returns typed errors when an active Stat Block loses presentation context", () => {
    const root = createMcpPlaySessionRoot();
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:missing-presentation-context",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const session = root.sessionStore.battleSession;
    if (session === null) {
      throw new Error("Expected an active test battle.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state: session.state,
        context: battleRuntimeContextForTest(session.context.characters),
      }),
    );

    expect(
      readPayload(handleToolCall(root, "read_battle_state", {})),
    ).toMatchObject({
      details: { code: "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE" },
    });
    expect(
      readPayload(handleToolCall(root, "end_turn", { actorId: "goblin" })),
    ).toMatchObject({
      details: { code: "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE" },
    });
  });

  test("documents progression fills as atomic profiles in the MCP input schema", () => {
    const fillTool = characterToolDefinitions.find(
      (tool) => tool.name === "fill_creation_holes",
    );
    expect(fillTool).toBeDefined();
    const schemaText = JSON.stringify(fillTool?.inputSchema);

    expect(schemaText).toContain(
      "there is no separate level-1 class-entry hole",
    );
    expect(schemaText).toContain(
      "starting class plus any post-start advancement entries",
    );
  });

  test("selects Goblin Warrior and starts a stored partial battle shell through tools", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-battle-shell";
    createFinalizedFighterSheet(root, draftId);

    const selected = readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    expect(selected).toMatchObject({
      selectedStatBlock: {
        id: "stat_block_goblin_warrior",
        provenance: { kind: "srd-5.2.1" },
      },
      session: { selectedStatBlockId: "stat_block_goblin_warrior" },
    });

    const startResponse = handleToolCall(root, "start_battle", {
      battleId: "battle:mcp-shell",
      initialCombatants: [
        {
          kind: "characterSession",
          ammunitionStocks: [],
          characterId: testCharacterId(draftId),
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          admissionSource: { kind: "encounterParticipant" },
          currentHp: 0,
        },
      ],
    });
    const started = readPayload(startResponse);

    expect(root.sessionStore.battleSession).not.toBeNull();
    expect(
      root.sessionStore.battleSession?.state.combatants.get(goblinId),
    ).toMatchObject({
      initiative: 7,
      hp: 0,
    });
    expect(
      root.sessionStore.battleSession?.state.combatants.get(goblinId),
    ).not.toHaveProperty("displayName");
    expect(started).toMatchObject({
      snapshot: {
        battleId: "battle:mcp-shell",
        currentActorId: "fighter",
        turnOrder: ["fighter", "goblin"],
        combatants: [
          {
            combatantId: "fighter",
            origin: { kind: "character" },
            initiative: 18,
          },
          {
            combatantId: "goblin",
            origin: { kind: "statBlock" },
            initiative: 7,
          },
        ],
        readiedResponses: { spells: [], actionsOrMovements: [] },
        helpAttackMarkers: [],
        pendingInterrupt: null,
      },
      session: {
        selectedStatBlockId: "stat_block_goblin_warrior",
        battleState: {
          tag: "activeBattle",
          battleId: "battle:mcp-shell",
          currentActorId: "fighter",
        },
      },
    });
    expect(started.snapshot.combatants[0]).toMatchObject({
      combatantId: "fighter",
      movement: { speedFeet: 30, spentFeet: 0, remainingFeet: 30 },
    });
    expect(started.snapshot.combatants[0]).not.toHaveProperty("defeated");
    if ("isError" in startResponse) {
      throw new Error("Expected start_battle to return structured content.");
    }
    expect(startResponse.structuredContent).toMatchObject({
      snapshot: {
        combatants: [
          {
            combatantId: "fighter",
          },
          {
            combatantId: "goblin",
          },
        ],
      },
    });

    const read = readPayload(handleToolCall(root, "read_battle_state", {}));
    expect(read.snapshot).toMatchObject({
      battleId: "battle:mcp-shell",
      currentActorId: "fighter",
      combatants: [
        {
          combatantId: "fighter",
          displayName: "Orc Soldier Fighter",
        },
        {
          combatantId: "goblin",
          displayName: "Goblin Warrior",
        },
      ],
    });
    expect(
      read.availableActs.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush: Dash",
      "Second Wind",
      "Move",
      "Ready",
      "End Turn",
    ]);
    expect(
      read.availableActs
        .filter((act: { label: string }) => act.label === "Ready")
        .map((act: { initialHoles: readonly { kind: string }[] }) =>
          act.initialHoles.map((hole) => hole.kind),
        ),
    ).toEqual([["readyDeclaration"]]);
    expect(read.snapshot.combatants).toHaveLength(2);
  });

  test("discovers Stat Block Multiattack dispatch and Movement continuations through MCP tools", () => {
    const baseRoot = createMcpPlaySessionRoot();
    const multiattackStatBlock = goblinWarriorMultiattackStatBlock(baseRoot);
    const catalogResult = buildStatBlockCatalog({
      collections: [
        defineSrdStatBlockCollection({
          statBlocks: [assertSrd521StatBlock(multiattackStatBlock)],
        }),
      ],
    });
    if (catalogResult.tag !== "ok") {
      throw new Error("Expected MCP Multiattack test catalog to build.");
    }
    const root = {
      ...baseRoot,
      statBlockCatalog: catalogResult.catalog,
      sessionStore: createMcpSessionStore({
        statBlockCatalog: catalogResult.catalog,
        unitLibrary: baseRoot.unitLibrary,
      }),
    };
    const draftId = "draft:mcp-multiattack-continuation";
    createFinalizedFighterSheet(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-multiattack-continuation",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: multiattackStatBlock.id,
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));
    const multiattackSubject = battleActionSubject(
      root,
      "goblin",
      "multiattack",
    );
    const opened = readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: multiattackSubject,
      }),
    );
    expect(opened.result.tag).toBe("resolved");
    expect(opened.snapshot.currentActorId).toBe("goblin");
    expect(opened.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "statBlockMultiattack",
          sourceOwnerId: "goblin",
        }),
      ]),
    );
    expect(
      root.sessionStore.battleSession?.state.currentTurnResources
        .actionResources,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "statBlockMultiattack",
          sourceOwnerId: "goblin",
        }),
      ]),
    );

    const continuation = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(
      continuation.availableActs.map((act: { label: string }) => act.label),
    ).toEqual(["Attack", "Attack", "Move", "End Turn"]);
    expect(
      continuation.availableActs.map(
        (act: { subject: unknown }) => act.subject,
      ),
    ).toEqual([
      expect.objectContaining({
        tag: "action",
        actorId: "goblin",
        action: "attack",
        procedureRef: expect.any(String),
      }),
      expect.objectContaining({
        tag: "action",
        actorId: "goblin",
        action: "attack",
        procedureRef: expect.any(String),
        statBlockDamageNotation: "static",
      }),
      {
        tag: "runtimeCommand",
        actorId: "goblin",
        command: "move",
      },
      {
        tag: "runtimeCommand",
        actorId: "goblin",
        command: "endTurn",
      },
    ]);
  });

  test("fills a battle movement hole through MCP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-battle-movement";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-movement",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    const moved = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: { tag: "runtimeCommand", actorId: "fighter", command: "move" },
        fill: {
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          },
        },
      }),
    );
    expect(moved.result.tag).toBe("resolved");
    expect(moved.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: "fighter",
        movement: expect.objectContaining({ spentFeet: 10 }),
      }),
    );
  });

  test("starts battle from a character-only initial combatant roster", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:mcp-character-roster-first";
    const secondDraftId = "draft:mcp-character-roster-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-character-roster",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(firstDraftId),
            combatantId: "first-fighter",
            initiative: 11,
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(secondDraftId),
            combatantId: "second-fighter",
            initiative: 17,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "second-fighter",
      turnOrder: ["second-fighter", "first-fighter"],
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: null,
      battleState: {
        tag: "activeBattle",
        battleId: "battle:mcp-character-roster",
        currentActorId: "second-fighter",
      },
    });
    expect(
      root.sessionStore.characters.get(testCharacterId(firstDraftId)),
    ).toMatchObject({ tag: "inBattle" });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
    ).toMatchObject({ tag: "inBattle" });
  });

  test("start_battle rejects a second battle while the single battle slot is active", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:mcp-active-battle-first";
    const secondDraftId = "draft:mcp-active-battle-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-active-battle-first",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(firstDraftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const firstBattleState = root.sessionStore.battleSession;
    expect(firstBattleState).not.toBeNull();

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-active-battle-second",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(secondDraftId),
            combatantId: "second-fighter",
            initiative: 16,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "BATTLE_SESSION_ALREADY_ACTIVE",
        battleId: "battle:mcp-active-battle-first",
      },
    });
    expect(root.sessionStore.battleSession).toBe(firstBattleState);
    expect(
      root.sessionStore.characters.get(testCharacterId(firstDraftId)),
    ).toMatchObject({
      tag: "inBattle",
      battleId: "battle:mcp-active-battle-first",
      sheet: { characterId: testCharacterId(firstDraftId) },
    });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
    ).toMatchObject({
      tag: "available",
      hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
    });
  });

  test("initial Initiative setup reports retained companion exclusion", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:initial-initiative-companion-exclusion";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          battleId: "battle:initial-initiative-companion-exclusion",
          initiativeMode: "initialSetup",
          initialCombatants: [
            {
              kind: "characterSession",
              characterId,
              combatantId: "initial-initiative-owner",
              initiative: 10,
              ammunitionStocks: [],
            },
          ],
          companionAdmissions: [
            {
              ownerCharacterId: characterId,
              ammunitionStocks: [],
            },
          ],
        }),
      ),
    ).toMatchObject({
      error: "Initial Initiative setup does not support companion admissions.",
      details: {
        code: "INITIAL_INITIATIVE_SETUP_COMPANIONS_UNSUPPORTED",
      },
    });
    expect(root.sessionStore.snapshot().battleState).toEqual({
      tag: "none",
    });
    expect(root.sessionStore.characters.get(characterId)).toMatchObject({
      tag: "available",
    });
  });

  test("discovers and resolves Fighter Attack fills, then ends the Fighter turn", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-fighter-battle-flow";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-fighter-flow",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(discovered.snapshot).toMatchObject({ currentActorId: "fighter" });
    expect(discovered.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          summary: "Take the Attack action with Longsword.",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "fighter",
            action: "attack",
            procedureRef: expect.any(String),
          }),
          initialHoles: [
            expect.objectContaining({
              kind: "targetChoice",
              holeId: "battle:attack:target",
              choices: ["goblin"],
            }),
          ],
        }),
        expect.objectContaining({
          label: "Second Wind",
          presentation: expect.objectContaining({
            kind: "unit",
            unitId: "fighter_second_wind",
          }),
          subject: expect.objectContaining({
            tag: "unitFeature",
            actorId: "fighter",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({
          label: "Move",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "move",
          }),
        }),
        expect.objectContaining({
          label: "End Turn",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "endTurn",
          }),
        }),
      ]),
    );
    const fighterAttackSubject = battleAttackSubjectForName(
      root,
      "fighter",
      "Longsword",
    );
    const fighterAttackSelection = battleAttackSelection(
      fighterAttackSubject,
      "Longsword",
    );

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: fighterAttackSubject,
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "goblin",
          spatialFacts: [
            {
              kind: "attackTargetInMeleeReach",
              actorId: "fighter",
              targetId: "goblin",
              ...fighterAttackSelection,
            },
          ],
        },
      }),
    );
    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", holeId: "battle:attack:roll" }],
    });
    expect(afterTarget.availableActs).toEqual([]);
    expect(afterTarget.snapshot.acts).toEqual([]);
    expect(afterTarget.session.transientBattleFills).toMatchObject({
      subject: expect.objectContaining({
        procedureRef: fighterAttackSubject.procedureRef,
      }),
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });
    expect(
      readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" })),
    ).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
      },
    });
    expect(root.sessionStore.pendingBattleFills).not.toBeNull();

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: fighterAttackSubject,
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 16, naturalD20: 14 },
        },
      }),
    );
    expect(afterAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d8+3-slashing",
          critical: false,
        },
      ],
    });
    expect(afterAttackRoll.availableActs).toEqual([]);
    expect(afterAttackRoll.snapshot.acts).toEqual([]);
    expect(afterAttackRoll.session.transientBattleFills.fills).toHaveLength(2);

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: fighterAttackSubject,
        fill: {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d8+3-slashing",
          value: [{ results: [5] }],
        },
      }),
    );
    expect(afterDamage.result.tag).toBe("resolved");
    expect(afterDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(
      afterDamage.availableActs.map((act: { label: string }) => act.label),
    ).toEqual(["Adrenaline Rush: Dash", "Second Wind", "Move", "End Turn"]);
    expect(root.sessionStore.pendingBattleFills).toBeNull();

    const afterEndTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "fighter" }),
    );
    expect(afterEndTurn.result.tag).toBe("resolved");
    expect(afterEndTurn.snapshot).toMatchObject({
      currentActorId: "goblin",
      combatants: [
        { combatantId: "fighter", hp: 12 },
        { combatantId: "goblin", hp: 2 },
      ],
    });
    expect(
      root.sessionStore.battleSession?.state.combatants.get(goblinId)?.hp,
    ).toBe(2);

    const goblinActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(goblinActs.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({ label: "Move" }),
        expect.objectContaining({ label: "End Turn" }),
      ]),
    );
    expect(
      goblinActs.availableActs.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Unarmed Strike (Grapple)",
      "Unarmed Strike (Shove)",
      "Nimble Escape",
      "Move",
      "Ready",
      "End Turn",
    ]);

    const goblinScimitar = battleAttackSubjectForName(
      root,
      "goblin",
      "Scimitar",
    );
    const afterGoblinTarget = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
      },
      goblinScimitar,
    );
    const goblinAttackRoll = afterGoblinTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (goblinAttackRoll === undefined) {
      throw new Error("Expected Goblin attack roll hole.");
    }
    const afterGoblinAttackRoll = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "attackRoll",
        holeId: goblinAttackRoll.holeId,
        value: {
          total: 20,
          naturalD20: 18,
          ...("rollMode" in goblinAttackRoll
            ? { rollMode: goblinAttackRoll.rollMode }
            : {}),
        },
      },
      goblinScimitar,
    );
    expect(afterGoblinAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d6+2-slashing",
          attack: {
            kind: "statBlockAttack",
          },
        },
      ],
    });

    const afterGoblinDamage = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+2-slashing",
        value: [{ results: [5] }],
      },
      goblinScimitar,
    );
    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
  });

  test("replays long-range attack target facts into a Disadvantage attack-roll hole", () => {
    const root = createMcpPlaySessionRoot();
    root.sessionStore.storeActiveBattle(
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-long-range-attack"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(7),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(18),
        },
        unitLibrary: root.unitLibrary,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const shortbowSubject = battleAttackSubjectForName(
      root,
      "goblin",
      "Shortbow",
    );
    const shortbowSelection = battleAttackSelection(
      shortbowSubject,
      "Shortbow",
    );
    const afterTarget = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Shortbow",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
        spatialFacts: [
          {
            kind: "attackTargetInRangedRange",
            actorId: "goblin",
            targetId: "fighter",
            ...shortbowSelection,
            rangeBand: "long",
          },
        ],
      },
      shortbowSubject,
    );

    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", rollMode: "disadvantage" }],
    });
    expect(afterTarget.session.transientBattleFills).toMatchObject({
      fills: [
        {
          kind: "targetChoice",
          spatialFacts: [
            {
              kind: "attackTargetInRangedRange",
              rangeBand: "long",
            },
          ],
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).not.toBeNull();
  });

  test("rejects contradictory long-range and normal-range attack target facts", () => {
    const root = createMcpPlaySessionRoot();
    root.sessionStore.storeActiveBattle(
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-contradictory-range-attack"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(7),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(18),
        },
        unitLibrary: root.unitLibrary,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const shortbowSubject = battleAttackSubjectForName(
      root,
      "goblin",
      "Shortbow",
    );
    const shortbowSelection = battleAttackSelection(
      shortbowSubject,
      "Shortbow",
    );
    const afterTarget = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Shortbow",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
        spatialFacts: [
          {
            kind: "attackTargetInRangedRange",
            actorId: "goblin",
            targetId: "fighter",
            ...shortbowSelection,
            rangeBand: "normal",
          },
          {
            kind: "attackTargetInRangedRange",
            actorId: "goblin",
            targetId: "fighter",
            ...shortbowSelection,
            rangeBand: "long",
          },
        ],
      },
      shortbowSubject,
    );

    expect(afterTarget.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target range facts must contain at most one range band for each actor, target, and attack.",
    });
  });

  test("replays visible Sneak Attack rider hole and fill shape through MCP battle tools", () => {
    const root = createMcpPlaySessionRoot();
    root.sessionStore.storeActiveBattle(
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-sneak-attack-rider"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Orc Soldier Rogue",
          build: rogueCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(18),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(7),
        },
        unitLibrary: rogueBattleUnitLibrary(root),
      }),
    );
    const allyId = combatantId("sneak-attack-ally");
    const battleState = root.sessionStore.battleSession;
    if (battleState === null) {
      throw new Error("Expected active battle in Sneak Attack fixture.");
    }
    const rogue = battleState.state.combatants.get(fighterId);
    if (rogue === undefined || rogue.origin.kind !== "character") {
      throw new Error("Expected rogue combatant in MCP Sneak Attack fixture.");
    }
    const combatants = new Map(battleState.state.combatants).set(allyId, {
      ...rogue,
      combatantId: allyId,
      origin: { ...rogue.origin, displayName: "Sneak Attack Ally" },
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: { ...battleState.state, combatants },
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const afterTarget = fillBattleHoleThroughTool(root, "fighter", "Dagger", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
    });
    const afterAttackRoll = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Dagger",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
      afterTarget.result.subject,
    );

    expect(afterAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d4+3-piercing",
          attackDamageRiders: [
            {
              procedureRef: expect.any(String),
              damage: { dice: 1, dieSize: 6, damageType: "piercing" },
            },
          ],
        },
      ],
    });
    const sneakAttackProcedureRef = afterAttackRoll.result.holes.flatMap(
      (hole: {
        readonly attackDamageRiders?: readonly {
          readonly procedureRef: string;
        }[];
      }) => hole.attackDamageRiders ?? [],
    )[0]?.procedureRef;
    if (sneakAttackProcedureRef === undefined) {
      throw new Error("Expected the mechanical Sneak Attack procedure ref.");
    }

    const afterDamage = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Dagger",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d4+3-piercing",
        selectedAttackDamageRiderProcedureRefs: [sneakAttackProcedureRef],
        value: [{ results: [2] }, { results: [3] }],
      },
      afterAttackRoll.result.subject,
    );

    expect(afterDamage.result).toMatchObject({ tag: "resolved" });
    expect(afterDamage.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: "fighter", hp: 10 }),
        expect.objectContaining({ combatantId: "goblin", hp: 2 }),
      ]),
    );
    expect(afterDamage.snapshot.turn.attackDamageRidersUsedThisTurn).toEqual([
      { attackerId: "fighter", procedureRef: sneakAttackProcedureRef },
    ]);
    expect(afterDamage.session).toMatchObject({ transientBattleFills: null });
  });

  test("start_battle rejects missing caller-supplied Initiative scores", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-battle-shell-missing-initiative";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-shell-missing-initiative",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
  });

  test("start_battle rejects empty or over-wide character inputs", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-start-exact-character-input";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    const baseStart = {
      battleId: "battle:mcp-start-exact-character-input",
      initialCombatants: [
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    };

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: testCharacterId(draftId),
              combatantId: "fighter",
              initiative: 18,
              characterDisplayName: "Contradictory Caller Name",
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
  });

  test("start_battle reports missing finalized character sessions before runtime start", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-missing-additional-primary";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-missing-additional",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(
              "draft:mcp-missing-additional-secondary",
            ),
            combatantId: "second-fighter",
            initiative: 16,
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId("draft:mcp-missing-additional-third"),
            combatantId: "third-fighter",
            initiative: 14,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [
          {
            details: {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: testCharacterId(
                "draft:mcp-missing-additional-secondary",
              ),
            },
          },
          {
            details: {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: testCharacterId(
                "draft:mcp-missing-additional-third",
              ),
            },
          },
        ],
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
  });

  test("starts battle from multiple Stat Block combatants", () => {
    const root = createMcpPlaySessionRoot();

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stat-block-roster",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "first-goblin",
            initiative: 11,
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "first-goblin",
      turnOrder: ["first-goblin", "second-goblin"],
      combatants: [
        {
          combatantId: "first-goblin",
          displayName: "Goblin Warrior",
        },
        {
          combatantId: "second-goblin",
          displayName: "Goblin Warrior",
        },
      ],
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: null,
      battleState: {
        tag: "activeBattle",
        battleId: "battle:mcp-stat-block-roster",
        currentActorId: "first-goblin",
      },
    });
  });

  test("start_battle admits a retained companion from Character Sheet state", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-admission";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setStoredRetainedFamiliarCompanion(root, draftId, {
      formId: "cat",
      currentHp: Hp(1),
      tempHp: Hp(3),
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-admission",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 12,
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard-familiar",
      turnOrder: ["wizard-familiar", "wizard"],
      combatants: [
        {
          combatantId: "wizard-familiar",
          displayName: "Cat",
          initiative: 18,
          origin: { kind: "statBlock" },
        },
        { combatantId: "wizard", origin: { kind: "character" } },
      ],
      companions: [
        {
          ownerId: "wizard",
          companionId: "wizard-familiar",
          formAccess: "findFamiliar",
          resolvedStatBlockId: "stat_block_cat",
          creatureTypeOverride: "fey",
        },
      ],
    });
    expect(
      root.sessionStore.battleSession?.state.combatants.get(
        combatantId("wizard-familiar"),
      ),
    ).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
    });
    expect(
      root.sessionStore.battleSession === null
        ? []
        : snapshotBattle(root.sessionStore.battleSession.state).companions,
    ).toMatchObject([
      {
        companionId: combatantId("wizard-familiar"),
        status: "present",
      },
    ]);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: {
            tag: "retainedOneAtATime",
            companion: {
              // Settlement derives the protocol from the battle facts; an
              // ordinary familiar round-trips to the ordinary protocol.
              protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
              manifestation: {
                tag: "embodiedOutsideBattle",
                resolvedStatBlockId: "stat_block_cat",
                hitPoints: { currentHp: 1, tempHp: 3 },
              },
            },
          },
        },
      },
    ]);
  });

  test("fills companion reappearance holes one at a time through MCP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-reappearance-fills";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-reappearance-fills",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const dismissalAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).availableActs.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "temporarilyDismiss",
    );
    expect(dismissalAct).toBeDefined();
    if (dismissalAct === undefined) return;
    const heldObjectHole = dismissalAct.initialHoles.find(
      (hole: { readonly kind: string }) => hole.kind === "heldObjectFacts",
    );
    expect(heldObjectHole).toBeDefined();
    if (heldObjectHole === undefined) return;

    const dismissed = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: dismissalAct.subject,
        fill: {
          kind: "heldObjectFacts",
          holeId: heldObjectHole.holeId,
          value: { objectIds: [] },
        },
      }),
    );
    expect(dismissed.result.tag).toBe("resolved");
    expect(dismissed.snapshot.companions).toMatchObject([
      {
        ownerId: "wizard",
        identity: {
          tag: "retainedBetweenBattles",
          durableCompanionId: "durable-wizard-familiar",
        },
        status: "temporarilyDismissed",
      },
    ]);

    readPayload(handleToolCall(root, "end_turn", { actorId: "wizard" }));
    const reappearanceAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).availableActs.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct).toBeDefined();
    if (reappearanceAct === undefined) return;
    const placementHole = reappearanceAct.initialHoles.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "companionReappearancePlacement",
    );
    expect(placementHole).toBeDefined();
    if (placementHole === undefined) return;

    const afterPlacement = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: reappearanceAct.subject,
        fill: {
          kind: "companionReappearancePlacement",
          holeId: placementHole.holeId,
          value: { kind: "unoccupiedSpaceWithin30Feet" },
        },
      }),
    );
    expect(afterPlacement.result.tag).toBe("needsHoles");
    expect(afterPlacement.session.transientBattleFills).toMatchObject({
      subject: reappearanceAct.subject,
      fills: [
        expect.objectContaining({ kind: "companionReappearancePlacement" }),
      ],
    });
    const initiativeHole = afterPlacement.result.holes.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "companionReappearanceInitiative",
    );
    expect(initiativeHole).toBeDefined();
    if (initiativeHole === undefined) return;

    const afterInitiative = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: reappearanceAct.subject,
        fill: {
          kind: "companionReappearanceInitiative",
          holeId: initiativeHole.holeId,
          value: 14,
        },
      }),
    );
    expect(afterInitiative.result.tag).toBe("resolved");
    expect(afterInitiative.session.transientBattleFills).toBeNull();
    expect(afterInitiative.snapshot.companions).toMatchObject([
      {
        companionId: "wizard-familiar",
        status: "present",
        initiative: 14,
      },
    ]);
  });

  test("end_battle preserves the active battle when character handoff ownership is invalid", () => {
    const startCharacterBattle = (draftId: string) => {
      const root = createMcpPlaySessionRoot();
      createFinalizedFighterSheet(root, draftId);
      const characterId = testCharacterId(draftId);
      const available = root.sessionStore.characters.get(characterId);
      if (available?.tag !== "available") {
        throw new Error("Expected an available test character session.");
      }
      readPayload(
        handleToolCall(root, "start_battle", {
          battleId: `battle:${draftId}`,
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId,
              combatantId: `combatant:${draftId}`,
              initiative: 10,
            },
          ],
        }),
      );
      return { available, characterId, root };
    };

    const missing = startCharacterBattle("draft:handoff-missing-session");
    const missingRoot: typeof missing.root = {
      ...missing.root,
      sessionStore: {
        ...missing.root.sessionStore,
        characters: {
          size: 0,
          entries: function* () {},
          get: () => undefined,
          has: () => false,
          keys: function* () {},
          set: () => {},
          setAll: () => Either.right(undefined),
        },
      },
    };
    expect(
      readPayload(handleToolCall(missingRoot, "end_battle", {})),
    ).toMatchObject({
      details: { code: "UNKNOWN_BATTLE_CHARACTER_SESSION" },
    });
    expect(missingRoot.sessionStore.battleSession).not.toBeNull();

    const available = startCharacterBattle("draft:handoff-available-session");
    available.root.sessionStore.characters.set(available.available);
    expect(
      readPayload(handleToolCall(available.root, "end_battle", {})),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_NOT_IN_BATTLE" },
    });
    expect(available.root.sessionStore.battleSession).not.toBeNull();

    const wrongBattle = startCharacterBattle("draft:handoff-wrong-battle");
    const wrongSession = wrongBattle.root.sessionStore.characters.get(
      wrongBattle.characterId,
    );
    if (wrongSession?.tag !== "inBattle") {
      throw new Error("Expected an in-battle session for ownership test.");
    }
    wrongBattle.root.sessionStore.characters.set({
      ...wrongSession,
      battleId: battleId("battle:other-active-battle"),
    });
    expect(
      readPayload(handleToolCall(wrongBattle.root, "end_battle", {})),
    ).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
        characterId: wrongBattle.characterId,
        expectedBattleId: "battle:draft:handoff-wrong-battle",
        actualBattleId: "battle:other-active-battle",
      },
    });
    expect(wrongBattle.root.sessionStore.battleSession).not.toBeNull();

    const invalid = startCharacterBattle("draft:handoff-invalid-catalog");
    const emptyCatalog = buildUnitCatalog({
      collections: [defineSrdUnitCollection({ units: [] })],
    });
    if (emptyCatalog.tag !== "ok") {
      throw new Error("Expected the empty SRD test catalog to build.");
    }
    const invalidRoot = {
      ...invalid.root,
      unitLibrary: emptyCatalog.catalog,
    };
    expect(
      readPayload(handleToolCall(invalidRoot, "end_battle", {})),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_HANDOFF_INVALID" },
    });
    expect(invalidRoot.sessionStore.battleSession).not.toBeNull();
  });

  test("round-trips a mixed Character Session, retained companion, and Stat Block roster", () => {
    const root = createMcpPlaySessionRoot();
    const wizardDraftId = "draft:gh324-round-trip-wizard";
    const fighterDraftId = "draft:gh324-round-trip-fighter";
    createFinalizedWizardWithFindFamiliar(root, wizardDraftId);
    setRetainedFamiliarCompanion(root, wizardDraftId);
    createFinalizedFighterSheet(root, fighterDraftId);

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:gh324-round-trip",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(wizardDraftId),
            combatantId: "gh324-wizard",
            initiative: 18,
            ammunitionStocks: [],
          },
          {
            kind: "characterSession",
            characterId: testCharacterId(fighterDraftId),
            combatantId: "gh324-fighter",
            initiative: 14,
            ammunitionStocks: [],
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "gh324-goblin",
            initiative: 7,
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(wizardDraftId),
            companionCombatantId: "gh324-familiar",
            initiative: 12,
            ammunitionStocks: [],
          },
        ],
      }),
    );
    expect(started.snapshot).toMatchObject({
      battleId: "battle:gh324-round-trip",
      turnOrder: [
        "gh324-wizard",
        "gh324-fighter",
        "gh324-familiar",
        "gh324-goblin",
      ],
      combatants: [
        {
          combatantId: "gh324-wizard",
          origin: { kind: "character" },
          initiative: 18,
        },
        {
          combatantId: "gh324-fighter",
          origin: { kind: "character" },
          initiative: 14,
        },
        {
          combatantId: "gh324-familiar",
          origin: { kind: "statBlock" },
          initiative: 12,
        },
        {
          combatantId: "gh324-goblin",
          origin: { kind: "statBlock" },
          initiative: 7,
        },
      ],
    });
    expect(
      readPayload(handleToolCall(root, "read_battle_state", {})),
    ).toMatchObject({
      snapshot: {
        battleId: "battle:gh324-round-trip",
        currentActorId: "gh324-wizard",
      },
      session: {
        battleState: {
          tag: "activeBattle",
          battleId: "battle:gh324-round-trip",
        },
      },
    });
    expect(
      readPayload(handleToolCall(root, "list_characters", {})).characters,
    ).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(wizardDraftId),
        status: "inBattle",
        battleId: "battle:gh324-round-trip",
      }),
      expect.objectContaining({
        characterId: testCharacterId(fighterDraftId),
        status: "inBattle",
        battleId: "battle:gh324-round-trip",
      }),
    ]);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended).toMatchObject({
      endedBattleId: "battle:gh324-round-trip",
      session: {
        battleState: { tag: "none" },
        characterIds: [
          testCharacterId(wizardDraftId),
          testCharacterId(fighterDraftId),
        ],
      },
    });
    expect(ended.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          characterId: testCharacterId(wizardDraftId),
          session: expect.objectContaining({ tag: "available" }),
        }),
        expect.objectContaining({
          characterId: testCharacterId(fighterDraftId),
          session: expect.objectContaining({ tag: "available" }),
        }),
      ]),
    );
  });

  test("end_battle leaves every Character Session and Battle unchanged when its atomic commit fails", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:gh324-atomic-first";
    const secondDraftId = "draft:gh324-atomic-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    const firstCharacterId = testCharacterId(firstDraftId);
    const secondCharacterId = testCharacterId(secondDraftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:gh324-atomic",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: firstCharacterId,
            combatantId: "gh324-atomic-first",
            initiative: 18,
            ammunitionStocks: [],
          },
          {
            kind: "characterSession",
            characterId: secondCharacterId,
            combatantId: "gh324-atomic-second",
            initiative: 12,
            ammunitionStocks: [],
          },
        ],
      }),
    );

    const battleBefore = root.sessionStore.battleSession;
    const firstBefore = root.sessionStore.characters.get(firstCharacterId);
    const secondBefore = root.sessionStore.characters.get(secondCharacterId);
    if (battleBefore === null || firstBefore === undefined) {
      throw new Error("Expected an active battle and first Character Session.");
    }
    if (secondBefore === undefined) {
      throw new Error("Expected second Character Session.");
    }
    const failingRoot = {
      ...root,
      sessionStore: {
        ...root.sessionStore,
        characters: {
          ...root.sessionStore.characters,
          setAll: () =>
            Either.left({
              tag: "unknownCharacterSession" as const,
              characterId: firstCharacterId,
            }),
        },
      },
    };

    expect(
      readPayload(handleToolCall(failingRoot, "end_battle", {})),
    ).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        registryIssue: {
          tag: "unknownCharacterSession",
          characterId: firstCharacterId,
        },
        affectedCharacterIds: [firstCharacterId, secondCharacterId],
        recovery: { tag: "characterSessionsUnchanged" },
      },
    });
    expect(failingRoot.sessionStore.battleSession).toBe(battleBefore);
    expect(root.sessionStore.battleSession).toBe(battleBefore);
    expect(root.sessionStore.characters.get(firstCharacterId)).toBe(
      firstBefore,
    );
    expect(root.sessionStore.characters.get(secondCharacterId)).toBe(
      secondBefore,
    );

    expect(readPayload(handleToolCall(root, "end_battle", {}))).toMatchObject({
      session: { battleState: { tag: "none" } },
    });
  });

  test("start_battle leaves every session and projection unchanged when admission commit fails", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:gh324-start-atomic-first";
    const secondDraftId = "draft:gh324-start-atomic-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    const firstCharacterId = testCharacterId(firstDraftId);
    const secondCharacterId = testCharacterId(secondDraftId);
    const firstBefore = root.sessionStore.characters.get(firstCharacterId);
    const secondBefore = root.sessionStore.characters.get(secondCharacterId);
    if (firstBefore === undefined || secondBefore === undefined) {
      throw new Error("Expected both available Character Sessions.");
    }
    const projectionBefore = JSON.stringify(root.sessionStore.snapshot());
    const failingRoot = {
      ...root,
      sessionStore: {
        ...root.sessionStore,
        characters: {
          ...root.sessionStore.characters,
          setAll: () =>
            Either.left({
              tag: "unknownCharacterSession" as const,
              characterId: firstCharacterId,
            }),
        },
      },
    };
    expect(
      readPayload(
        handleToolCall(failingRoot, "start_battle", {
          battleId: "battle:gh324-start-atomic",
          initialCombatants: [
            {
              kind: "characterSession",
              characterId: firstCharacterId,
              combatantId: "start-atomic-first",
              initiative: 18,
              ammunitionStocks: [],
            },
            {
              kind: "characterSession",
              characterId: secondCharacterId,
              combatantId: "start-atomic-second",
              initiative: 12,
              ammunitionStocks: [],
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        registryIssue: {
          tag: "unknownCharacterSession",
          characterId: firstCharacterId,
        },
        recovery: { tag: "characterSessionsUnchanged" },
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
    expect(root.sessionStore.characters.get(firstCharacterId)).toBe(
      firstBefore,
    );
    expect(root.sessionStore.characters.get(secondCharacterId)).toBe(
      secondBefore,
    );
    expect(JSON.stringify(root.sessionStore.snapshot())).toBe(projectionBefore);

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          battleId: "battle:gh324-start-atomic",
          initialCombatants: [
            {
              kind: "characterSession",
              characterId: firstCharacterId,
              combatantId: "start-atomic-first",
              initiative: 18,
              ammunitionStocks: [],
            },
            {
              kind: "characterSession",
              characterId: secondCharacterId,
              combatantId: "start-atomic-second",
              initiative: 12,
              ammunitionStocks: [],
            },
          ],
        }),
      ),
    ).toMatchObject({
      session: {
        battleState: {
          tag: "activeBattle",
          battleId: "battle:gh324-start-atomic",
        },
      },
    });
  });

  test("start_battle reports duplicate companion owners and unavailable roster sources", () => {
    const duplicateOwnerRoot = createMcpPlaySessionRoot();
    expect(
      readPayload(
        handleToolCall(duplicateOwnerRoot, "start_battle", {
          battleId: "battle:duplicate-companion-owner",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "goblin",
              initiative: 10,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
          companionAdmissions: [
            {
              ownerCharacterId: "character:owner",
              ammunitionStocks: [],
              companionCombatantId: "companion:a",
            },
            {
              ownerCharacterId: "character:owner",
              ammunitionStocks: [],
              companionCombatantId: "companion:b",
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: { code: "DUPLICATE_BATTLE_COMPANION_OWNER" },
    });

    const unknownStatBlockRoot = createMcpPlaySessionRoot();
    expect(
      readPayload(
        handleToolCall(unknownStatBlockRoot, "start_battle", {
          battleId: "battle:unknown-stat-block",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_synthetic_missing",
              combatantId: "missing",
              initiative: 10,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [{ details: { code: "UNKNOWN_STAT_BLOCK_COMBATANT" } }],
      },
    });

    const inBattleRoot = createMcpPlaySessionRoot();
    const draftId = "draft:start-already-in-battle";
    createFinalizedFighterSheet(inBattleRoot, draftId);
    const id = testCharacterId(draftId);
    const session = inBattleRoot.sessionStore.characters.get(id);
    if (session?.tag !== "available") {
      throw new Error("Expected an available test character session.");
    }
    inBattleRoot.sessionStore.characters.set({
      tag: "inBattle",
      battleId: battleId("battle:existing"),
      sheet: session,
    });
    expect(
      readPayload(
        handleToolCall(inBattleRoot, "start_battle", {
          battleId: "battle:new",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: id,
              combatantId: "fighter",
              initiative: 10,
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [{ details: { code: "CHARACTER_ALREADY_IN_BATTLE" } }],
      },
    });
  });

  test("start_battle delegates companion admission and Stat Block HP initialization", () => {
    const companionRoot = createMcpPlaySessionRoot();
    const draftId = "draft:start-without-retained-companion";
    createFinalizedWizardWithFindFamiliar(companionRoot, draftId);
    expect(
      readPayload(
        handleToolCall(companionRoot, "start_battle", {
          battleId: "battle:missing-retained-companion",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: testCharacterId(draftId),
              combatantId: "wizard",
              initiative: 10,
            },
          ],
          companionAdmissions: [
            {
              ownerCharacterId: testCharacterId(draftId),
              ammunitionStocks: [],
              companionCombatantId: "missing-retained-companion",
              positionId: "table-position:synthetic",
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: { code: "COMPANION_ADMISSION_FAILED" },
    });

    const defaultCompanionIdRoot = createMcpPlaySessionRoot();
    createFinalizedWizardWithFindFamiliar(
      defaultCompanionIdRoot,
      "draft:start-without-retained-companion-default-id",
    );
    expect(
      readPayload(
        handleToolCall(defaultCompanionIdRoot, "start_battle", {
          battleId: "battle:missing-retained-companion-default-id",
          initialCombatants: [
            {
              kind: "characterSession",
              ammunitionStocks: [],
              characterId: testCharacterId(
                "draft:start-without-retained-companion-default-id",
              ),
              combatantId: "wizard",
              initiative: 10,
            },
          ],
          companionAdmissions: [
            {
              ownerCharacterId: testCharacterId(
                "draft:start-without-retained-companion-default-id",
              ),
              ammunitionStocks: [],
              positionId: "table-position:synthetic",
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "COMPANION_ADMISSION_FAILED",
        characterId: testCharacterId(
          "draft:start-without-retained-companion-default-id",
        ),
      },
    });

    const hpRoot = createMcpPlaySessionRoot();
    const started = readPayload(
      handleToolCall(hpRoot, "start_battle", {
        battleId: "battle:stat-block-temp-hp",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            currentHp: 3,
            tempHp: 4,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin", hp: 3, tempHp: 4 }),
    ]);

    const invalidHpRoot = createMcpPlaySessionRoot();
    expect(
      readPayload(
        handleToolCall(invalidHpRoot, "start_battle", {
          battleId: "battle:stat-block-invalid-hp",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "goblin",
              initiative: 10,
              currentHp: 999,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_START_FAILED",
      },
    });

    const base = invalidHpRoot.statBlockCatalog.requireStatBlock(
      "stat_block_goblin_warrior",
    );
    const invalidMechanicsRecord = {
      ...base,
      id: statBlockId("stat_block_synthetic_invalid_mechanics"),
      name: "Synthetic Invalid Mechanics",
      statBlock: {
        ...base.statBlock,
        displayName: "Synthetic Invalid Mechanics",
        hp: { kind: "literal", value: -1 },
      },
    } satisfies StatBlockRecord;
    const invalidMechanicsRoot = {
      ...createMcpPlaySessionRoot(),
      statBlockCatalog: {
        ...invalidHpRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalidMechanicsRecord),
      },
    };
    expect(
      readPayload(
        handleToolCall(invalidMechanicsRoot, "start_battle", {
          battleId: "battle:stat-block-invalid-mechanics",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: invalidMechanicsRecord.id,
              combatantId: "synthetic-invalid",
              initiative: 10,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [{ details: { code: "STAT_BLOCK_BATTLE_INIT_INVALID" } }],
      },
    });

    const invalidDisplayRecord = {
      ...base,
      id: statBlockId("stat_block_synthetic_invalid_display"),
      name: "Synthetic Invalid Display",
      statBlock: { ...base.statBlock, displayName: "" },
    } satisfies StatBlockRecord;
    const invalidDisplayRoot = {
      ...createMcpPlaySessionRoot(),
      statBlockCatalog: {
        ...invalidHpRoot.statBlockCatalog,
        getStatBlock: () => Option.some(invalidDisplayRecord),
      },
    };
    expect(
      readPayload(
        handleToolCall(invalidDisplayRoot, "start_battle", {
          battleId: "battle:stat-block-invalid-display",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: invalidDisplayRecord.id,
              combatantId: "synthetic-invalid-display",
              initiative: 10,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: { code: "BATTLE_SNAPSHOT_PRESENTATION_INCOMPLETE" },
    });
  });

  test("fills familiar touch spell delivery holes one at a time through MCP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-touch-delivery-fills";
    createFinalizedWizardWithFindFamiliar(root, draftId, {
      preparedSpells: ["find_familiar", "cure_wounds"],
      spellcastingSafeLoadout: true,
    });
    setRetainedFamiliarCompanion(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-touch-delivery-fills",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            currentHp: 1,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const deliveryAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).availableActs.find(
      (act: {
        readonly subject: {
          readonly tag: string;
          readonly procedureRef?: string;
        };
        readonly presentation: {
          readonly kind: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        act.subject.tag === "findFamiliarTouchSpell" &&
        act.presentation.kind === "spell" &&
        act.presentation.invocation?.spellId === "cure_wounds",
    );
    expect(deliveryAct).toBeDefined();
    if (deliveryAct === undefined) return;
    expect(deliveryAct.subject.procedureRef).toEqual(expect.any(String));
    if (deliveryAct.subject.procedureRef === undefined) return;
    const connectionHole = deliveryAct.initialHoles.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "findFamiliarConnection",
    );
    expect(connectionHole).toBeDefined();
    if (connectionHole === undefined) return;

    const afterConnection = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "findFamiliarConnection",
          holeId: connectionHole.holeId,
          value: { withinRange: true },
        },
      }),
    );
    expect(afterConnection.result.tag).toBe("needsHoles");
    expect(afterConnection.session.transientBattleFills).toMatchObject({
      subject: deliveryAct.subject,
      fills: [expect.objectContaining({ kind: "findFamiliarConnection" })],
    });
    expect(
      root.sessionStore.battleSession?.state.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(true);
    const targetHole = afterConnection.result.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "targetChoice",
    );
    expect(targetHole).toMatchObject({
      label: "Familiar touch delivery target",
      requiresTableSpatialFact: true,
    });
    if (targetHole === undefined) return;

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "findFamiliarTouchSpellTarget",
              ownerId: "wizard",
              familiarId: "wizard-familiar",
              targetId: "goblin",
              sourceProcedureRef: deliveryAct.subject.procedureRef,
            },
          ],
        },
      }),
    );
    expect(afterTarget.result.tag).toBe("needsHoles");
    expect(
      root.sessionStore.battleSession?.state.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(false);
    const healingRollHole = afterTarget.result.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "rolledDice",
    );
    expect(healingRollHole).toBeDefined();
    if (healingRollHole === undefined) return;

    const afterHealingRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "rolledDice",
          holeId: healingRollHole.holeId,
          value: [{ results: [4, 4] }],
        },
      }),
    );
    expect(afterHealingRoll.result.tag).toBe("resolved");
    expect(afterHealingRoll.session.transientBattleFills).toBeNull();
    expect(
      root.sessionStore.battleSession?.state.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(false);
    expect(
      afterHealingRoll.snapshot.combatants.find(
        (combatant: { readonly combatantId: string }) =>
          combatant.combatantId === "goblin",
      ),
    ).toMatchObject({ hp: 8 });
  });

  test("start_battle admits a retained companion without prepared Find Familiar", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-spellbook-ritual-admission";
    createFinalizedWizardWithFindFamiliar(root, draftId, {
      preparedSpells: [],
    });
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-spellbook-ritual-admission",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 12,
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard-familiar",
      turnOrder: ["wizard-familiar", "wizard"],
      companions: [
        {
          ownerId: "wizard",
          companionId: "wizard-familiar",
          formAccess: "findFamiliar",
          resolvedStatBlockId: "stat_block_owl",
        },
      ],
    });
  });

  test("apply_character_session_operation retains a companion from ordinary Spell Slot casting", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-spell-slot-retain";
    createFinalizedWizardWithFindFamiliar(root, draftId);

    const retained = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(draftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "durable-slot-familiar",
          source: {
            tag: "spellSlotSpellCast",
            spellId: "find_familiar",
            spellLevel: 1,
          },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );

    expect(retained.character).toMatchObject({
      companion: {
        tag: "retainedOneAtATime",
        companion: {
          companionId: "durable-slot-familiar",
          manifestation: {
            tag: "embodiedOutsideBattle",
            resolvedStatBlockId: "stat_block_cat",
            hitPoints: { currentHp: 2, tempHp: 0 },
          },
        },
      },
      spellSlotExpenditures: [{ spellLevel: 1, expended: 1 }],
    });
  });

  test("apply_character_session_operation advances a finalized class level", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-advance-class-level";
    const before = createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);

    const advanced = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "advanceClassLevel",
          levelGain: {
            tag: "classLevelGain",
            classUnitId: "class_fighter",
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        },
      }),
    );

    expect(advanced).toMatchObject({
      detail: {
        tag: "available",
        characterId,
        build: {
          progression: {
            advancements: [
              {
                classUnitId: "class_fighter",
                hitPointRule: { tag: "fixedHigherLevelGain" },
              },
            ],
          },
        },
      },
    });
    const stored = root.sessionStore.characters.get(characterId);
    if (stored?.tag !== "available") {
      throw new Error("Expected the advanced character session.");
    }
    expect(stored.build).not.toBe(before);
    expect(stored.build.progression.advancements).toHaveLength(1);
    expect(stored.hitPoints).toMatchObject({ tag: "positive" });
  });

  test("apply_character_session_operation rejects an unsupported class-level fact atomically", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-advance-class-level-rejected";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const beforeSession = root.sessionStore.characters.get(characterId);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "advanceClassLevel",
          levelGain: {
            tag: "classLevelGain",
            classUnitId: "class_synthetic_missing",
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(beforeSession);
  });

  test("routes existing specialized class-level gain shapes through runtime support facts", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-specialized-class-level-gains";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const beforeSession = root.sessionStore.characters.get(characterId);
    const levelGains = [
      {
        tag: "classLevelGainWithListPreparedSpellcasting",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        preparedSpellcasting: { gainedPreparedSpells: [] },
      },
      {
        tag: "fighterLevelGainWithFightingStyleReplacement",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        replacement: { selectedFeatUnitId: "synthetic_missing_feat" },
      },
      {
        tag: "classLevelGainWithFightingStyleCantripReplacement",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        replacement: {
          replaceCantripId: "synthetic_missing_cantrip",
          selectedCantripId: "synthetic_missing_cantrip",
        },
        preparedSpellcasting: { gainedPreparedSpells: [] },
      },
      {
        tag: "classLevelGainWithWeaponMasterySelection",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        weaponMastery: {
          featureUnitId: "synthetic_missing_weapon_mastery",
          selectedWeaponUnitIds: [],
        },
      },
      {
        tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        weaponMastery: {
          featureUnitId: "synthetic_missing_weapon_mastery",
          selectedWeaponUnitIds: [],
        },
        fightingStyleReplacement: {
          selectedFeatUnitId: "synthetic_missing_feat",
        },
      },
      {
        tag: "sorcererLevelGain",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        metamagic: { gainedOptions: [] },
      },
      {
        tag: "warlockLevelGain",
        classUnitId: "class_fighter",
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: {
          gainedCantrips: [],
          gainedPreparedSpells: [],
        },
        eldritchInvocations: { gainedInvocations: [] },
      },
    ] as const;

    for (const levelGain of levelGains) {
      expect(
        readPayload(
          handleToolCall(root, "apply_character_session_operation", {
            characterId,
            operation: { kind: "advanceClassLevel", levelGain },
          }),
        ),
      ).toMatchObject({
        details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
      });
    }
    expect(root.sessionStore.characters.get(characterId)).toBe(beforeSession);
  });

  test("rebuilds class advancement while preserving canonical HP lifecycle state", () => {
    for (const state of ["knockedOut", "zero"] as const) {
      const root = createMcpPlaySessionRoot();
      const draftId = `draft:mcp-advance-class-level-${state}`;
      const build = fighterCharacterBuild(root.unitLibrary);
      const characterId = testCharacterId(draftId);
      root.sessionStore.characters.set(
        availableCharacterSessionRight({
          build,
          characterId,
          currentHp: state === "knockedOut" ? Hp(1) : Hp(0),
          ...(state === "knockedOut"
            ? { positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS }
            : {
                zeroHpLifecycle: {
                  tag: "unstable" as const,
                  deathSaves: { successes: 0, failures: 0 },
                },
              }),
          hitPointMaximumReduction: Hp(0),
          tempHp: Hp(0),
          unitLibrary: root.unitLibrary,
        }),
      );

      expect(
        readPayload(
          handleToolCall(root, "apply_character_session_operation", {
            characterId,
            operation: {
              kind: "advanceClassLevel",
              levelGain: {
                tag: "classLevelGain",
                classUnitId: "class_fighter",
                hitPointRule: { tag: "fixedHigherLevelGain" },
              },
            },
          }),
        ),
      ).toMatchObject({ detail: { tag: "available", characterId } });
      const stored = root.sessionStore.characters.get(characterId);
      if (stored?.tag !== "available") {
        throw new Error("Expected the advanced character session.");
      }
      expect(stored.hitPoints.tag).toBe(state);
    }
  });

  test("apply_character_session_operation replaces one admitted Druid known form", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-replace-druid-known-form";
    createFinalizedDruidSheet(root, draftId);
    const characterId = testCharacterId(draftId);

    const replaced = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "replaceDruidWildShapeKnownForm",
          replacement: {
            replaceStatBlockId: "stat_block_rat",
            selectedStatBlockId: "stat_block_cat",
          },
        },
      }),
    );

    expect(replaced).toMatchObject({
      detail: { tag: "available", characterId },
    });
    const stored = root.sessionStore.characters.get(characterId);
    if (stored?.tag !== "available") {
      throw new Error("Expected the replaced Druid character session.");
    }
    expect(stored.druidWildShapeKnownForms?.statBlockIds).toEqual([
      "stat_block_cat",
      "stat_block_riding_horse",
      "stat_block_spider",
      "stat_block_wolf",
    ]);
  });

  test("apply_character_session_operation rejects an invalid Druid known-form replacement atomically", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-replace-druid-known-form-rejected";
    createFinalizedDruidSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterId);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "replaceDruidWildShapeKnownForm",
          replacement: {
            replaceStatBlockId: "stat_block_rat",
            selectedStatBlockId: "stat_block_rat",
          },
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(before);
  });

  test("apply_character_session_operation completes a Short Rest atomically", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-short-rest-complete";
    createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);

    const completed = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "completeShortRest",
          restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
        },
      }),
    );

    expect(completed.result).toEqual({
      tag: "shortRestCompleted",
      restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
    });
    expect(completed.character).toMatchObject({
      tag: "available",
      characterId: characterIdValue,
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toMatchObject({
      tag: "available",
      characterId: characterIdValue,
    });
  });

  test("rejects empty and zero Short Rest recovery selections at the tool boundary", () => {
    const root = createMcpPlaySessionRoot();
    const characterIdValue = testCharacterId("mcp-short-rest-input-validation");
    const invalidOperations = [
      {
        kind: "completeShortRest",
        restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
        spendHitDice: [],
      },
      {
        kind: "completeShortRest",
        restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
        arcaneRecovery: { refundSpellSlots: [] },
      },
      {
        kind: "completeShortRest",
        restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
        arcaneRecovery: {
          refundSpellSlots: [{ spellLevel: 1, count: 0 }],
        },
      },
      {
        kind: "completeShortRest",
        restedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
        sorcerousRestoration: { recoverSorceryPoints: 0 },
      },
    ] as const;

    for (const operation of invalidOperations) {
      expect(
        readPayload(
          handleToolCall(root, "apply_character_session_operation", {
            characterId: characterIdValue,
            operation,
          }),
        ),
      ).toMatchObject({
        error: "apply_character_session_operation expects valid arguments.",
        details: { code: "INVALID_ARGUMENTS" },
      });
    }
  });

  test("apply_character_session_operation exposes Short Rest interruption without retaining a rest intermediate", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-short-rest-interrupt";
    createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterIdValue);

    const interrupted = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "interruptShortRest",
          interruption: "takeDamage",
        },
      }),
    );

    expect(interrupted.result).toEqual({
      tag: "shortRestInterruptedNoBenefit",
      interruption: "takeDamage",
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toBe(before);
  });

  test("apply_character_session_operation returns Stable recovery holes without partial calendar mutation", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-calendar-time-needs-stable-roll";
    const build = createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);
    const stable = availableCharacterSessionRight({
      characterId: characterIdValue,
      build,
      currentHp: Hp(0),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.characters.set(stable);
    const before = root.sessionStore.characters.get(characterIdValue);

    const open = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "passCalendarTime",
          duration: { kind: "timeSpan", unit: "hour", amount: 1 },
          fills: [],
        },
      }),
    );

    expect(open.result).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: ELAPSED_TIME_TICKS_PER_HOUR,
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toBe(before);

    const invalid = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "passCalendarTime",
          duration: { kind: "timeSpan", unit: "hour", amount: 1 },
          fills: [
            {
              kind: "rolledDice",
              holeId: `character-sheet:${characterIdValue}:stable-recovery-roll`,
              value: [{ results: [1, 2] }],
            },
          ],
        },
      }),
    );

    expect(invalid.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toBe(before);
  });

  test("apply_character_session_operation returns a resolved calendar-time outcome", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-calendar-time-resolved";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);

    const resolved = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "passCalendarTime",
          duration: { kind: "timeSpan", unit: "hour", amount: 1 },
          fills: [],
        },
      }),
    );

    expect(resolved.result).toEqual({
      tag: "resolved",
      elapsedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
    });
    expect(root.sessionStore.characters.get(characterId)).toBeDefined();
  });

  test("apply_character_session_operation reports typed rest failure without partial mutation", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-short-rest-too-short";
    createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterIdValue);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "completeShortRest",
          restedTicks: ELAPSED_TIME_TICKS_PER_HOUR - 1,
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message: "Short Rest requires 1 hour before benefits can be received.",
      },
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toBe(before);
  });

  test("apply_character_session_operation composes Long Rest timing and completion", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-complete";
    createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);

    const completed = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "completeLongRest",
          timing: { tag: "noPriorLongRest" },
          restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 8,
        },
      }),
    );

    expect(completed.result).toEqual({
      tag: "longRestCompleted",
      restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 8,
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toMatchObject({
      tag: "available",
      characterId: characterIdValue,
    });
  });

  test("apply_character_session_operation resumes an interrupted Long Rest at cumulative hour 9 with Short Rest benefits", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-interruption-benefits";
    const build = createFinalizedFighterSheet(root, draftId);
    const characterIdValue = testCharacterId(draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: characterIdValue,
        build,
        currentHp: Hp(5),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    const interrupted = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: characterIdValue,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
              spendHitDice: [{ classUnitId: "class_fighter", roll: 4 }],
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 9,
          },
        },
      }),
    );

    expect(interrupted.result).toEqual({
      tag: "longRestCompleted",
      restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 9,
    });
    expect(root.sessionStore.characters.get(characterIdValue)).toMatchObject({
      hitPoints: {
        currentHp: characterBuildMaximumHp(build, root.unitLibrary),
      },
      spentHitDice: [],
    });
  });

  test("apply_character_session_operation rejects an under-rested resumed Long Rest atomically", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-resume-too-short";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterId);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 8,
          },
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message:
          "Long Rest requires the full required duration before benefits can be received.",
      },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(before);
  });

  test("apply_character_session_operation composes two Long Rest interruptions at cumulative hour 10", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-two-interruptions";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const completed = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
            },
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 2,
              interruption: "rollInitiative",
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 10,
          },
        },
      }),
    );
    expect(completed.result).toEqual({
      tag: "longRestCompleted",
      restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 10,
    });
  });

  test("applies interrupted Long Rest Short Rest benefits to the immediately preceding segment", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-segment-benefits";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterId);
    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
            },
            {
              cumulativeRestedTicks:
                ELAPSED_TIME_TICKS_PER_HOUR + ELAPSED_TIME_TICKS_PER_HOUR / 2,
              interruption: "rollInitiative",
              spendHitDice: [{ classUnitId: "class_fighter", roll: 4 }],
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 10,
          },
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message:
          "Interrupted Long Rest before 1 hour cannot receive Short Rest benefit inputs.",
      },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(before);
  });

  test("rejects an interruption after cumulative resumed rest reaches its required duration", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-late-second-interruption";
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterId);
    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
            },
            {
              cumulativeRestedTicks:
                ELAPSED_TIME_TICKS_PER_HOUR * 9 +
                ELAPSED_TIME_TICKS_PER_HOUR / 2,
              interruption: "rollInitiative",
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 10,
          },
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message:
          "Long Rest interruption requires rested time before the required Long Rest duration.",
      },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(before);
  });

  test.each([
    ["repeated", [1, 1]],
    ["decreasing", [2, 1]],
  ])("rejects %s cumulative Long Rest boundary atomically", (_label, hours) => {
    const root = createMcpPlaySessionRoot();
    const draftId = `draft:mcp-long-rest-invalid-${_label}`;
    createFinalizedFighterSheet(root, draftId);
    const characterId = testCharacterId(draftId);
    const before = root.sessionStore.characters.get(characterId);
    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: hours.map((hour) => ({
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * hour,
            interruption: "takeDamage" as const,
          })),
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 12,
          },
        },
      }),
    );
    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        boundary: "interruption",
        boundaryIndex: 1,
      },
    });
    expect(root.sessionStore.characters.get(characterId)).toBe(before);
  });

  test("apply_character_session_operation preserves Magical Cunning recovery through resumed Long Rest completion", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-long-rest-magical-cunning";
    const warlock = root.unitLibrary.requireUnit("class_warlock");
    if (warlock.kind !== "class") {
      throw new Error("Expected the Warlock class Unit.");
    }
    const build: CharacterBuild = {
      ...characterBuildForClassProgression({
        base: fighterCharacterBuild(root.unitLibrary),
        classUnit: warlock,
        keepClassChoices: false,
        level: 2,
      }),
      spellcasting: {
        slotPools: {
          pactMagic: { kind: "pactMagic", slotLevel: 1, count: 2 },
        },
        sources: [
          {
            cantrips: [unitId("eldritch_blast"), unitId("mage_hand")],
            preparedSpells: [unitId("charm_person"), unitId("hellish_rebuke")],
            sourceUnitId: unitId("class_warlock"),
            spellbook: [],
            spellcastingAbility: "cha",
            spellcastingFocuses: ["arcane_focus"],
          },
        ],
      },
    };
    const characterId = testCharacterId(draftId);
    const sheet = availableCharacterSessionRight({
      build,
      characterId,
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      hitPointMaximumReduction: Hp(0),
      tempHp: Hp(0),
      pactSlots: { expended: resourceCount(2) },
      unitLibrary: root.unitLibrary,
    });
    const magicalCunning = completeMagicalCunningRite({
      sheet,
      unitLibrary: root.unitLibrary,
    });
    if (Either.isLeft(magicalCunning)) {
      throw new Error(magicalCunning.left.message);
    }
    expect(magicalCunning.right.pactSlotExpenditure).toEqual({
      expended: resourceCount(1),
    });
    expect(magicalCunning.right.restFeatureUses).toEqual([
      { tag: "magicalCunning", usedSinceLongRest: true },
    ]);
    root.sessionStore.characters.set(magicalCunning.right);

    const completed = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId,
        operation: {
          kind: "interruptLongRest",
          timing: { tag: "noPriorLongRest" },
          interruptionSegments: [
            {
              cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR,
              interruption: "takeDamage",
            },
          ],
          completion: {
            cumulativeRestedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 9,
          },
        },
      }),
    );

    expect(completed.result).toEqual({
      tag: "longRestCompleted",
      restedTicks: ELAPSED_TIME_TICKS_PER_HOUR * 9,
    });
    const stored = root.sessionStore.characters.get(characterId);
    if (stored?.tag !== "available") {
      throw new Error("Expected the completed Warlock Character Sheet.");
    }
    expect(stored.pactSlotExpenditure).toBeUndefined();
    expect(stored.restFeatureUses).toEqual([]);
  });

  test("apply_character_session_operation rejects a durable companion id used by another character", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:mcp-duplicate-durable-familiar-first";
    const secondDraftId = "draft:mcp-duplicate-durable-familiar-second";
    createFinalizedWizardWithFindFamiliar(root, firstDraftId);
    createFinalizedWizardWithFindFamiliar(root, secondDraftId);

    readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(firstDraftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "shared-durable-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );
    const firstCharacterId = testCharacterId(firstDraftId);
    const firstSession = root.sessionStore.characters.get(firstCharacterId);
    if (firstSession?.tag !== "available") {
      throw new Error("Expected the first retained-companion session.");
    }
    root.sessionStore.characters.set({
      tag: "inBattle",
      battleId: battleId("battle:retained-companion-id-owner"),
      sheet: firstSession,
    });

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(secondDraftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "shared-durable-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "owl" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message:
          "Retained companion id is already used by another character session.",
      },
    });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
    ).toMatchObject({ companion: { tag: "none" } });
  });

  test("apply_character_session_operation rejects caller-minted companion HP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-hp-input-rejected";
    createFinalizedWizardWithFindFamiliar(root, draftId);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(draftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "durable-hp-forged-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
          currentHp: 999999,
          tempHp: 50,
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: { code: "INVALID_ARGUMENTS" },
    });
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({ companion: { tag: "none" } }),
    );
  });

  test("apply_character_session_operation rejects unknown and in-battle character sessions", () => {
    const root = createMcpPlaySessionRoot();
    const operation = {
      kind: "retainOneAtATimeCompanion",
      companionId: "unavailable-familiar",
      source: { tag: "ritualSpell", spellId: "find_familiar" },
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
    };

    expect(
      readPayload(
        handleToolCall(root, "apply_character_session_operation", {
          characterId: "character:missing",
          operation,
        }),
      ),
    ).toMatchObject({ details: { code: "UNKNOWN_CHARACTER_SESSION" } });

    const draftId = "draft:mcp-in-battle-operation";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    const id = testCharacterId(draftId);
    const session = root.sessionStore.characters.get(id);
    if (session?.tag !== "available") {
      throw new Error("Expected an available test character session.");
    }
    root.sessionStore.characters.set({
      tag: "inBattle",
      battleId: battleId("battle:operation"),
      sheet: session,
    });

    expect(
      readPayload(
        handleToolCall(root, "apply_character_session_operation", {
          characterId: id,
          operation,
        }),
      ),
    ).toMatchObject({ details: { code: "CHARACTER_SESSION_IN_BATTLE" } });
  });

  test("apply_character_session_operation rejects an unknown special form", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-unknown-special-form";
    createFinalizedWizardWithFindFamiliar(root, draftId);

    expect(
      readPayload(
        handleToolCall(root, "apply_character_session_operation", {
          characterId: testCharacterId(draftId),
          operation: {
            kind: "retainOneAtATimeCompanion",
            companionId: "unknown-special-form-familiar",
            source: { tag: "ritualSpell", spellId: "find_familiar" },
            selectedForm: {
              tag: "pactOfTheChainSpecialForm",
              formId: "synthetic-unknown-special-form",
            },
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message: "Unknown retained companion special form.",
      },
    });
  });

  test("delegates a catalogued special-form selection to runtime admission", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-catalogued-special-form";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS[0];
    if (specialForm === undefined) {
      throw new Error("Expected a catalogued special-form fixture.");
    }

    expect(
      readPayload(
        handleToolCall(root, "apply_character_session_operation", {
          characterId: testCharacterId(draftId),
          operation: {
            kind: "retainOneAtATimeCompanion",
            companionId: "catalogued-special-form-familiar",
            source: { tag: "ritualSpell", spellId: "find_familiar" },
            selectedForm: {
              tag: "pactOfTheChainSpecialForm",
              formId: specialForm.formId,
            },
          },
        }),
      ),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
    });
  });

  test.each([
    {
      label: "invocation spell access",
      source: {
        tag: "invocationSpellAccess",
        spellId: "find_familiar",
      },
    },
    {
      label: "class feature Spell Slot spending",
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: "feature_synthetic_companion",
        spend: { tag: "spellSlot", spellLevel: 1 },
      },
    },
    {
      label: "class feature use-count spending",
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: "feature_synthetic_companion",
        spend: {
          tag: "useCountResource",
          resourceUnitId: "resource_synthetic_companion",
        },
      },
    },
  ])("delegates $label companion-source admission", ({ source }) => {
    const root = createMcpPlaySessionRoot();
    const draftId = `draft:mcp-source-${source.tag}`;
    createFinalizedWizardWithFindFamiliar(root, draftId);

    expect(
      readPayload(
        handleToolCall(root, "apply_character_session_operation", {
          characterId: testCharacterId(draftId),
          operation: {
            kind: "retainOneAtATimeCompanion",
            companionId: `familiar-${source.tag}`,
            source,
            selectedForm: { tag: "normalNamedForm", formId: "cat" },
          },
        }),
      ),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_OPERATION_INVALID" },
    });
  });

  test("start_battle orders retained companion ties after the initial owner roster", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-tie-order";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-tie-order",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard",
      turnOrder: ["wizard", "wizard-familiar"],
    });
  });

  test("end_battle clears a retained companion permanently dismissed in battle", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-permanent-dismiss-handoff";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-permanent-dismiss-handoff",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            ammunitionStocks: [],
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const permanentDismissAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).availableActs.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "permanentlyDismiss",
    );
    expect(permanentDismissAct).toBeDefined();
    if (permanentDismissAct === undefined) return;

    const dismissed = readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: permanentDismissAct.subject,
      }),
    );
    expect(dismissed.result.tag).toBe("resolved");
    expect(dismissed.snapshot.companions).toEqual([]);
    expect(
      dismissed.snapshot.combatants.some(
        (combatant: { readonly combatantId: string }) =>
          combatant.combatantId === "wizard-familiar",
      ),
    ).toBe(false);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: { tag: "none" },
        },
      },
    ]);
  });

  test("end_battle leaves a retained companion untouched when it was never admitted", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-never-admitted-handoff";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, { formId: "owl" });

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-never-admitted-handoff",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
          },
        ],
        // No companionAdmissions: the retained companion stays out of battle, so
        // there is no battle companion entry to settle from. The Character Sheet
        // remains the source of truth and the durable slot survives end_battle.
      }),
    );

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: {
            tag: "retainedOneAtATime",
            companion: {
              companionId: "durable-wizard-familiar",
              manifestation: {
                selectedForm: { tag: "normalNamedForm", formId: "owl" },
              },
            },
          },
        },
      },
    ]);
  });

  test("start_battle rejects retained companion admission with a missing owner", () => {
    const root = createMcpPlaySessionRoot();
    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-missing-owner",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 18,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: "missing-wizard",
            ammunitionStocks: [],
            companionCombatantId: "orphan-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "COMPANION_OWNER_NOT_IN_ROSTER",
        companionCombatantId: "orphan-familiar",
        characterId: "missing-wizard",
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();

    const withoutExplicitCompanionId = createMcpPlaySessionRoot();
    expect(
      readPayload(
        handleToolCall(withoutExplicitCompanionId, "start_battle", {
          battleId: "battle:mcp-find-familiar-missing-owner-default-id",
          initialCombatants: [
            {
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
              combatantId: "goblin",
              initiative: 18,
              admissionSource: { kind: "encounterParticipant" },
            },
          ],
          companionAdmissions: [
            { ownerCharacterId: "missing-wizard", ammunitionStocks: [] },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "COMPANION_OWNER_NOT_IN_ROSTER",
        characterId: "missing-wizard",
      },
    });
  });

  test("Character Sheet rejects invalid retained companion HP before MCP admission", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-find-familiar-invalid-form";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    const session = root.sessionStore.characters.get(testCharacterId(draftId));
    if (session?.tag !== "available") {
      throw new Error("Expected test character session.");
    }

    const rejected = parseCharacterSheet(
      {
        ...session,
        companion: retainedFamiliarCompanionInput({
          currentHp: Hp(0),
        }),
      },
      root.unitLibrary,
    );

    expect(rejected).toMatchObject({
      _tag: "Left",
      left: {
        message: "Retained companion current HP must be positive.",
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
  });

  test("battle act tools reject contradictory subjects and no-hole misuse", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-battle-subject-boundary";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-battle-subject-boundary",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: {
            tag: "action",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
            spellId: "magic_missile",
          },
          fill: {
            kind: "targetChoice",
            holeId: "battle:attack:target",
            value: "goblin",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    const validAttackSubject = battleAttackSubjectForName(
      root,
      "fighter",
      "Longsword",
    );
    expect(
      readPayload(
        handleToolCall(root, "resolve_battle_act", {
          subject: validAttackSubject,
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_ACT_REQUIRES_HOLES",
      },
    });

    const unavailableSubject = {
      tag: "runtimeCommand",
      actorId: "goblin",
      command: "endTurn",
    } as const;
    expect(
      readPayload(
        handleToolCall(root, "resolve_battle_act", {
          subject: unavailableSubject,
        }),
      ),
    ).toMatchObject({ details: { code: "BATTLE_ACT_NOT_AVAILABLE" } });
    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: unavailableSubject,
          fill: {
            kind: "targetChoice",
            holeId: "battle:synthetic-unavailable-target",
            value: "fighter",
          },
        }),
      ),
    ).toMatchObject({ details: { code: "BATTLE_ACT_NOT_AVAILABLE" } });

    const pending = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "goblin",
      },
      validAttackSubject,
    );
    expect(pending.result.tag).toBe("needsHoles");
    expect(readPayload(handleToolCall(root, "end_battle", {}))).toMatchObject({
      details: { code: "BATTLE_FILLS_PENDING" },
    });
    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: unavailableSubject,
          fill: {
            kind: "targetChoice",
            holeId: "battle:synthetic-mismatched-target",
            value: "fighter",
          },
        }),
      ),
    ).toMatchObject({ details: { code: "BATTLE_FILL_SUBJECT_MISMATCH" } });
  });

  test("start_battle rejects duplicate character and combatant ids", () => {
    const root = createMcpPlaySessionRoot();
    const firstDraftId = "draft:mcp-duplicate-first";
    const secondDraftId = "draft:mcp-duplicate-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const baseStart = {
      battleId: "battle:mcp-duplicates",
      initialCombatants: [
        {
          kind: "characterSession",
          ammunitionStocks: [],
          characterId: testCharacterId(firstDraftId),
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    };
    const secondCharacter = {
      kind: "characterSession",
      ammunitionStocks: [],
      characterId: testCharacterId(secondDraftId),
      combatantId: "second-fighter",
      initiative: 16,
    } as const;

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            ...baseStart.initialCombatants,
            { ...secondCharacter, characterId: testCharacterId(firstDraftId) },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "DUPLICATE_BATTLE_CHARACTER_ID",
        characterId: testCharacterId(firstDraftId),
      },
    });
    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            ...baseStart.initialCombatants,
            { ...secondCharacter, combatantId: "goblin" },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "DUPLICATE_BATTLE_COMBATANT_ID",
        combatantId: "goblin",
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
  });

  test("creates and finalizes the supported Fighter through stored creation holes", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-tool-complete-fighter";

    const created = readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );

    expect(created.draft).toMatchObject({
      draftId,
      revision: 0,
    });
    expect(created.holes.map((hole: CreationHole) => hole.holeId)).toEqual([
      "cc:draft:draft.progression.initial",
      "cc:draft:draft.background",
      "cc:draft:draft.species",
      "cc:draft:draft.abilityScoreGeneration",
      "cc:draft:draft.languages",
      "cc:draft:draft.alignment",
    ]);
    expect(
      created.holes.find(
        (hole: CreationHole) => hole.holeId === "cc:draft:draft.languages",
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
      options: [
        { optionId: "Dwarvish", label: "Dwarvish" },
        { optionId: "Goblin", label: "Goblin" },
      ],
    });

    const afterInitial = fillThroughTool(
      root,
      draftId,
      0,
      initialManifestFills(),
    );
    expect(
      afterInitial.result.holes.find(
        (hole: CreationHole) =>
          hole.holeId ===
          unitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
      options: [
        { optionId: "perception", label: "Perception" },
        { optionId: "survival", label: "Survival" },
      ],
    });
    fillThroughTool(root, draftId, 1, manifestChoiceFills());
    fillThroughTool(root, draftId, 2, manifestPurchaseFills());
    const loadout = fillThroughTool(root, draftId, 3, manifestLoadoutFills());

    expect(loadout.result).toMatchObject({
      tag: "accepted",
      draft: { draftId, revision: 4 },
      holes: [],
      finalization: { tag: "ready" },
    });

    const finalized = readPayload(
      handleToolCall(root, "finalize_character", { draftId }),
    );

    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
      },
    });
    expect(finalized.build).toMatchObject({
      background: "background_soldier",
      species: "species_orc",
    });
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(false);
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual({
      tag: "available",
      characterId: testCharacterId(draftId),
      build: finalized.finalization.build,
      hitPointMaximumReduction: 0,
      hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
      conditions: [],
      exhaustionLevel: 0,
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      heroicInspiration: { tag: "none" },
      companion: { tag: "none" },
    });
    expect(finalized.session).toMatchObject({
      draftIds: [],
      characterIds: [testCharacterId(draftId)],
    });
  });

  test("runs the full Orc Soldier Fighter vs Goblin Warrior vertical through MCP tools only", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-full-vertical";

    const finalized = createAndFinalizeManifestFighterThroughTools(
      root,
      draftId,
    );

    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
      },
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      characterIds: [testCharacterId(draftId)],
      battleState: { tag: "none" },
      transientBattleFills: null,
    });

    const selected = readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    expect(selected.selectedStatBlock).toMatchObject({
      id: "stat_block_goblin_warrior",
      provenance: { kind: "srd-5.2.1" },
      statBlock: {
        displayName: "Goblin Warrior",
      },
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-full-vertical",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "fighter",
      turnOrder: ["fighter", "goblin"],
      combatants: [
        { combatantId: "fighter", hp: 12, armorClass: 19 },
        { combatantId: "goblin", hp: 10, armorClass: 15 },
      ],
    });
    const fighterActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(fighterActs.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          summary: "Take the Attack action with Longsword.",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "fighter",
            action: "attack",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({
          label: "Second Wind",
          presentation: expect.objectContaining({
            kind: "unit",
            unitId: "fighter_second_wind",
          }),
          subject: expect.objectContaining({
            tag: "unitFeature",
            actorId: "fighter",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({
          label: "Move",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "move",
          }),
        }),
        expect.objectContaining({
          label: "End Turn",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "endTurn",
          }),
        }),
      ]),
    );
    expect(
      fighterActs.availableActs.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush: Dash",
      "Second Wind",
      "Move",
      "Ready",
      "End Turn",
    ]);

    const afterFighterTarget = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "goblin",
      },
    );
    expect(
      root.sessionStore.battleSession?.state.combatants.get(goblinId)?.hp,
    ).toBe(10);
    expect(root.sessionStore.pendingBattleFills).toMatchObject({
      subject: {
        actorId: "fighter",
        procedureRef: expect.any(String),
      },
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });

    const afterFighterAttackRoll = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
      afterFighterTarget.result.subject,
    );
    const afterFighterDamage = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d8+3-slashing",
        value: [{ results: [5] }],
      },
      afterFighterAttackRoll.result.subject,
    );

    expect(afterFighterDamage.result.tag).toBe("resolved");
    expect(afterFighterDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(afterFighterDamage.session.transientBattleFills).toBeNull();

    const afterEndTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "fighter" }),
    );
    expect(afterEndTurn.result.tag).toBe("resolved");
    expect(afterEndTurn.snapshot.currentActorId).toBe("goblin");

    const goblinActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(goblinActs.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            procedureRef: expect.any(String),
          }),
        }),
        expect.objectContaining({ label: "Move" }),
        expect.objectContaining({ label: "End Turn" }),
      ]),
    );
    expect(
      goblinActs.availableActs.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Unarmed Strike (Grapple)",
      "Unarmed Strike (Shove)",
      "Nimble Escape",
      "Move",
      "Ready",
      "End Turn",
    ]);

    const afterGoblinTarget = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
      },
    );
    const goblinAttackRoll = afterGoblinTarget.result.holes.find(
      (hole: { kind: string }) => hole.kind === "attackRoll",
    );
    const afterGoblinAttackRoll = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: {
          total: 20,
          naturalD20: 18,
          ...(goblinAttackRoll?.rollMode === undefined
            ? {}
            : { rollMode: goblinAttackRoll.rollMode }),
        },
      },
      afterGoblinTarget.result.subject,
    );
    const afterGoblinDamage = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+2-slashing",
        value: [{ results: [5] }],
      },
      afterGoblinAttackRoll.result.subject,
    );

    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: "stat_block_goblin_warrior",
      transientBattleFills: null,
    });
    expect(
      root.sessionStore.battleSession?.state.combatants.get(fighterId)?.hp,
    ).toBe(5);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended).toMatchObject({
      endedBattleId: "battle:mcp-full-vertical",
      session: {
        battleState: { tag: "none" },
        characterIds: [testCharacterId(draftId)],
      },
    });
    expect(root.sessionStore.battleSession).toBeNull();
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: { tag: "positive", currentHp: 5, tempHp: 0 },
      }),
    );

    const characterList = readPayload(
      handleToolCall(root, "list_characters", {}),
    );
    expect(characterList.characters).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(draftId),
        status: "available",
        displayName: "Orc Soldier Fighter",
        hitPoints: expect.objectContaining({ current: 5, maximum: 12 }),
        build: expect.objectContaining({
          background: "background_soldier",
          species: "species_orc",
        }),
      }),
    ]);
    expect(
      characterList.characters.some(
        (character: { readonly displayName: string | null }) =>
          character.displayName === "Goblin Warrior",
      ),
    ).toBe(false);
  });

  test("lists effective Character Sheet Hit Point maximum after reduction", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-reduced-maximum-list";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        currentHp: Hp(7),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(5),
        unitLibrary: root.unitLibrary,
      }),
    );

    const characterList = readPayload(
      handleToolCall(root, "list_characters", {}),
    );

    expect(characterList.characters).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(draftId),
        hitPoints: expect.objectContaining({ current: 7, maximum: 7 }),
        hitDice: [
          { classUnitId: "class_fighter", dieSize: 10, total: 1, spent: 0 },
        ],
        resources: [],
      }),
    ]);
    expect(characterList.characters[0]).not.toHaveProperty("spellSlots");
    expect(characterList.characters[0]).not.toHaveProperty("pactSlots");
  });

  test("returns Shove push outcomes through MCP battle resolution output", () => {
    const root = createMcpPlaySessionRoot();
    root.sessionStore.storeActiveBattle(
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-shove-push-outcome"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(18),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(7),
        },
        unitLibrary: root.unitLibrary,
      }),
    );

    const acts = readPayload(handleToolCall(root, "discover_battle_acts", {}));
    const shove = acts.availableActs.find(
      (act: { label: string }) => act.label === "Unarmed Strike (Shove)",
    );
    expect(shove).toBeDefined();

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: shove.subject,
        fill: {
          kind: "targetChoice",
          holeId: "battle:shove:target",
          value: "goblin",
          spatialFacts: [
            {
              kind: "shoveTargetWithinReach",
              shoverId: "fighter",
              targetId: "goblin",
            },
          ],
        },
      }),
    );
    const shoveOutcome = afterTarget.result.holes.find(
      (hole: { kind: string }) => hole.kind === "shoveOutcome",
    );

    const afterShove = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: afterTarget.result.subject,
        fill: {
          kind: "shoveOutcome",
          holeId: shoveOutcome.holeId,
          value: {
            succeeded: false,
            failedEffect: {
              kind: "pushAway",
              disposition: {
                kind: "pushed",
                distanceFeet: 5,
                destinationId: "square:goblin:pushed",
                provokesOpportunityAttacks: false,
              },
            },
          },
        },
      }),
    );

    expect(afterShove.result).toMatchObject({
      tag: "resolved",
      shovePushes: [
        {
          targetId: "goblin",
          disposition: {
            kind: "pushed",
            distanceFeet: 5,
            destinationId: "square:goblin:pushed",
            provokesOpportunityAttacks: false,
          },
        },
      ],
    });
  });

  test("ends battle with a Stable zero-HP character session lifecycle", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-stable-zero-hp-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stable-zero-hp-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 12,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleSession;
    const fighter = battleState?.state.combatants.get(fighterId);
    if (
      battleState === null ||
      fighter === undefined ||
      fighter.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: {
          ...battleState.state,
          combatants: new Map(battleState.state.combatants).set(fighterId, {
            ...testBattleCreatureStateWithoutKnockOut(fighter, {
              hp: Hp(0),
              conditions: fighter.conditions,
            }),
            zeroHpLifecycle: {
              ...fighter.zeroHpLifecycle,
              deathSaves: {
                deathSaves: { successes: 0, failures: 0 },
                stable: true,
                dead: false,
                hpRegained: false,
              },
            },
          }),
        },
      }),
    );

    const ended = readPayload(handleToolCall(root, "end_battle", {}));

    expect(ended.session).toMatchObject({
      battleState: { tag: "none" },
    });
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          tempHp: 0,
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 0,
            },
          },
        },
      }),
    );
    expect(readPayload(handleToolCall(root, "list_characters", {}))).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            characterId: testCharacterId(draftId),
            hitPoints: expect.objectContaining({
              current: 0,
              maximum: 12,
              state: {
                tag: "zero",
                tempHp: 0,
                lifecycle: {
                  tag: "stable",
                  recovery: {
                    kind: "regains1HpAfter1d4Hours",
                    elapsedBeforeRecoveryRoll: 0,
                  },
                },
              },
            }),
          }),
        ],
      }),
    );
  });

  test("ends battle with a Knocked Out positive-HP character session state", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-knocked-out-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-knocked-out-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 12,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleSession;
    const fighter = battleState?.state.combatants.get(fighterId);
    if (battleState === null || fighter === undefined) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: {
          ...battleState.state,
          combatants: new Map(battleState.state.combatants).set(
            fighterId,
            testBattleCreatureStateWithoutKnockOut(fighter, {
              hp: Hp(3),
              conditions: fighter.conditions,
            }),
          ),
        },
      }),
    );

    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));
    const goblinScimitar = battleAttackSubjectForName(
      root,
      "goblin",
      "Scimitar",
    );
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinScimitar,
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "fighter",
          spatialFacts: [
            {
              kind: "attackTargetInMeleeReach",
              actorId: "goblin",
              targetId: "fighter",
              ...battleAttackSelection(goblinScimitar, "Scimitar"),
            },
          ],
        },
      }),
    );
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinScimitar,
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 20, naturalD20: 18 },
        },
      }),
    );
    const damagePendingDisposition = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinScimitar,
        fill: {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d6+2-slashing",
          value: [{ results: [5] }],
        },
      }),
    );
    expect(damagePendingDisposition).toMatchObject({
      result: {
        tag: "needsHoles",
        holes: [{ kind: "attackDamageDisposition" }],
      },
      snapshot: { turn: { attackRollMadeThisTurn: true } },
    });

    const duplicateDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinScimitar,
        fill: {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d6+2-slashing",
          value: [{ results: [5] }],
        },
      }),
    );
    expect(duplicateDamage).toMatchObject({
      result: {
        tag: "invalid",
        reason: "invalidFill",
        message: "Attack damage was filled twice.",
      },
      snapshot: { turn: { attackRollMadeThisTurn: false } },
      session: {
        transientBattleFills: {
          fills: expect.arrayContaining([
            expect.objectContaining({ kind: "attackRoll" }),
            expect.objectContaining({ kind: "rolledDice" }),
          ]),
        },
      },
    });
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinScimitar,
        fill: {
          kind: "attackDamageDisposition",
          holeId: "battle:attack:damage-disposition",
          value: { kind: "knockOut" },
        },
      }),
    );

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "knockedOut",
          tempHp: 0,
        },
      }),
    );
    expect(readPayload(handleToolCall(root, "list_characters", {}))).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            characterId: testCharacterId(draftId),
            hitPoints: expect.objectContaining({
              current: 1,
              maximum: 12,
              state: {
                tag: "knockedOut",
                tempHp: 0,
              },
            }),
          }),
        ],
      }),
    );
  });

  test("ends battle without inferring Knocked Out state from positive-HP Unconscious", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-positive-unconscious-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-positive-unconscious-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 12,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleSession;
    const fighter = battleState?.state.combatants.get(fighterId);
    if (battleState === null || fighter === undefined) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: {
          ...battleState.state,
          combatants: new Map(battleState.state.combatants).set(
            fighterId,
            testBattleCreatureStateWithoutKnockOut(fighter, {
              hp: Hp(1),
              conditions: applyCondition(fighter.conditions, "unconscious"),
            }),
          ),
        },
      }),
    );

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 },
      }),
    );
  });

  test("starts battle with Knocked Out state from positive-HP character session state", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-knocked-out-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        currentHp: Hp(1),
        tempHp: Hp(4),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-knocked-out-start",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 12,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
        hp: 1,
        tempHp: 4,
        conditions: expect.arrayContaining(["unconscious"]),
      }),
      expect.objectContaining({ combatantId: "goblin" }),
    ]);
    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
      }),
      expect.objectContaining({ combatantId: "goblin" }),
    ]);
  });

  test("rejects Knocked Out character session state above 1 HP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-invalid-knocked-out-hp";
    const build = createFinalizedFighterSheet(root, draftId);

    expect(
      availableCharacterSession({
        characterId: testCharacterId(draftId),
        build,
        currentHp: Hp(6),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary: root.unitLibrary,
        positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      }),
    ).toEqual(
      Either.left({
        tag: "characterSessionIssue",
        message:
          "Knocked Out character session must have exactly 1 current HP.",
      }),
    );
  });

  test("starts battle from a Stable zero-HP character session without resetting death saves", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-stable-zero-hp-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        currentHp: Hp(0),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        zeroHpLifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
          },
        },
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stable-zero-hp-start",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 12,
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 10,
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        conditions: expect.arrayContaining(["unconscious"]),
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: { successes: 0, failures: 0 },
          stable: true,
          dead: false,
        },
      }),
    ]);

    const afterGoblinTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "goblin" }),
    );
    expect(afterGoblinTurn.result.tag).toBe("resolved");
    expect(afterGoblinTurn.snapshot.currentActorId).toBe("fighter");
  });

  test("starts battle from a dead zero-HP character session without reviving it", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-dead-zero-hp-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        currentHp: Hp(0),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        zeroHpLifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 3 },
        },
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-dead-zero-hp-start",
        initialCombatants: [
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 12,
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 10,
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        conditions: expect.arrayContaining(["unconscious"]),
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: { successes: 0, failures: 3 },
          stable: false,
          dead: true,
        },
      }),
    ]);

    const afterGoblinTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "goblin" }),
    );
    expect(afterGoblinTurn.result.tag).toBe("resolved");
    expect(afterGoblinTurn.snapshot.currentActorId).toBe("fighter");
    expect(afterGoblinTurn.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        zeroHpLifecycle: expect.objectContaining({ dead: true }),
      }),
    ]);
  });

  test("rejects non-canonical zero-HP character session lifecycles", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const sessionInput = {
      characterId: characterId("character:zero-hp-boundary"),
      build,
      currentHp: Hp(0),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
    };

    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 3, failures: 0 },
        },
      }),
    ).toThrow(
      "Unstable character session cannot carry terminal death save counts.",
    );
    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 0, failures: 3 },
        },
      }),
    ).toThrow(
      "Unstable character session cannot carry terminal death save counts.",
    );
    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 2 },
        },
      }),
    ).toThrow(
      "Dead character session requires exactly three death save failures.",
    );
  });

  test("ends battle with a dead zero-HP character session lifecycle", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-dead-zero-hp-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-dead-zero-hp-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 12,
          },
          {
            kind: "statBlock",
            ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleSession;
    const fighter = battleState?.state.combatants.get(fighterId);
    if (
      battleState === null ||
      fighter === undefined ||
      fighter.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: {
          ...battleState.state,
          combatants: new Map(battleState.state.combatants).set(fighterId, {
            ...testBattleCreatureStateWithoutKnockOut(fighter, {
              hp: Hp(0),
              conditions: fighter.conditions,
            }),
            zeroHpLifecycle: {
              ...fighter.zeroHpLifecycle,
              deathSaves: {
                deathSaves: { successes: 0, failures: 3 },
                stable: false,
                dead: true,
                hpRegained: false,
              },
            },
          }),
        },
      }),
    );

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          tempHp: 0,
          lifecycle: {
            tag: "dead",
            deathSaves: { successes: 0, failures: 3 },
          },
        },
      }),
    );
  });

  test("discovers creation holes through the explicit tool path", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-tool-discover-holes";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    fillThroughTool(root, draftId, 0, initialManifestFills());

    const discovered = readPayload(
      handleToolCall(root, "discover_creation_holes", {
        draftId,
      }),
    );

    expect(discovered.draft).toMatchObject({ draftId, revision: 1 });
    expect(discovered.holes.map((hole: CreationHole) => hole.holeId)).toEqual(
      initialClassHoleIds(),
    );
    expect(discovered.finalization.tag).toBe("incomplete");
    expect(discovered.session).toMatchObject({
      draftIds: [draftId],
    });
    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      discovered.draft,
    );
  });

  test("character draft operations report unknown durable draft ids", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-missing-draft";

    for (const [name, args] of [
      ["discover_creation_holes", { draftId }],
      ["fill_creation_holes", { draftId, expectedRevision: 0, fills: [] }],
      ["finalize_character", { draftId }],
    ] as const) {
      expect(readPayload(handleToolCall(root, name, args))).toMatchObject({
        details: { code: "UNKNOWN_CHARACTER_DRAFT", draftId },
      });
    }
  });

  test("rejected creation fill leaves the stored draft unchanged", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-tool-rejected-fill";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    const before = root.sessionStore.drafts.get(characterDraftId(draftId));
    expect(before).toBeDefined();

    const rejected = readPayload(
      handleToolCall(root, "fill_creation_holes", {
        draftId,
        expectedRevision: 0,
        fills: [
          choiceFill("cc:draft:draft.progression.initial", "not_a_class"),
        ],
      }),
    );

    expect(rejected.result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "invalidChoice",
          holeId: "cc:draft:draft.progression.initial",
        },
      ],
    });
    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      before,
    );
    expect(rejected.storedDraft).toEqual(before);
    expect(root.sessionStore.characters.size).toBe(0);
  });

  test("fill_creation_holes reports every malformed fill input", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-tool-malformed-fills";
    readPayload(handleToolCall(root, "create_character_draft", { draftId }));
    const before = root.sessionStore.drafts.get(characterDraftId(draftId));

    const rejected = readPayload(
      handleToolCall(root, "fill_creation_holes", {
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: "not-a-hole",
            optionIds: ["class_fighter"],
          },
          {
            kind: "abilityScores",
            holeId: "also-not-a-hole",
            method: "standardArray",
            value: {
              str: 15,
              dex: 14,
              con: 13,
              int: 8,
              wis: 10,
              cha: 12,
            },
          },
        ],
      }),
    );

    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      before,
    );
    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_FILLS",
        issues: [
          {
            details: {
              code: "INVALID_FIELD",
              field: "fills[0].holeId",
            },
          },
          {
            details: {
              code: "INVALID_FIELD",
              field: "fills[1].holeId",
            },
          },
        ],
      },
    });
  });

  test("finalization stores no build until the draft is ready", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:mcp-tool-incomplete-finalize";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );

    const finalized = readPayload(
      handleToolCall(root, "finalize_character", { draftId }),
    );

    expect(finalized.finalization.tag).toBe("incomplete");
    expect(finalized.build).toBeNull();
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(true);
    expect(root.sessionStore.characters.has(testCharacterId(draftId))).toBe(
      false,
    );
  });

  test("finalization reports Character Sheet construction failures", () => {
    const root = createMcpPlaySessionRoot();
    const draft = completeManifestDraft(root.unitLibrary);
    root.sessionStore.drafts.set(draft.draftId, draft);

    expect(
      readPayload(
        handleToolCall(root, "finalize_character", {
          draftId: draft.draftId,
          druidWildShapeKnownFormStatBlockIds: ["stat_block_rat"],
        }),
      ),
    ).toMatchObject({
      details: { code: "CHARACTER_SESSION_INVALID" },
    });
    expect(root.sessionStore.drafts.has(draft.draftId)).toBe(true);
  });

  test("rejects reused draft ids for active drafts and finalized character sessions", () => {
    const root = createMcpPlaySessionRoot();
    const activeDraftId = "draft:mcp-tool-duplicate-active";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: activeDraftId,
      }),
    );

    const duplicateActive = handleToolCall(root, "create_character_draft", {
      draftId: activeDraftId,
    });

    expect(readPayload(duplicateActive)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: activeDraftId,
        existingOwner: "activeDraft",
      },
    });

    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: "draft:mcp-tool-encoded-draft",
      }),
    );
    const nonCollidingDraft = readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: "mcp-tool-encoded-draft",
      }),
    );
    expect(nonCollidingDraft.draft.draftId).toBe("mcp-tool-encoded-draft");

    const finalizedSessionDraftId = "draft:mcp-tool-duplicate-finalized";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: finalizedSessionDraftId,
      }),
    );
    fillThroughTool(root, finalizedSessionDraftId, 0, initialManifestFills());
    fillThroughTool(root, finalizedSessionDraftId, 1, manifestChoiceFills());
    fillThroughTool(root, finalizedSessionDraftId, 2, manifestPurchaseFills());
    fillThroughTool(root, finalizedSessionDraftId, 3, manifestLoadoutFills());
    readPayload(
      handleToolCall(root, "finalize_character", {
        draftId: finalizedSessionDraftId,
      }),
    );

    const duplicateFinalized = handleToolCall(root, "create_character_draft", {
      draftId: finalizedSessionDraftId,
    });

    expect(readPayload(duplicateFinalized)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: finalizedSessionDraftId,
        existingOwner: "finalizedSession",
      },
    });
    expect(
      root.sessionStore.drafts.has(characterDraftId(finalizedSessionDraftId)),
    ).toBe(false);
    expect(
      root.sessionStore.characters.has(
        testCharacterId(finalizedSessionDraftId),
      ),
    ).toBe(true);
  });

  test("does not apply Defense Fighting Style when no armor is worn", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-unarmored"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
              weapon: {
                itemId: testCharacterEquipmentItemId(
                  "main",
                  "weapon_longsword",
                ),
                grip: "one_handed",
              },
            },
          },
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(snapshotBattle(state).combatants[0]).toMatchObject({
      combatantId: fighterId,
      armorClass: 14,
    });
  });

  test("keeps spell slots but suppresses action-time spell acts when armor training blocks casting", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-armored-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Armored Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });

    const actor = state.combatants.get(fighterId);
    expect(actor?.origin.kind).toBe("character");
    if (actor?.origin.kind !== "character") return;
    expect(actor.origin.spellcasting).toMatchObject({
      canCastSpells: false,
      spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
    });
    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })).map(
        (act) => act.subject,
      ),
    ).not.toContainEqual(expect.objectContaining({ tag: "actionSpell" }));
  });

  test("keeps spell acts when only shield training is missing", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-shield-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Shield Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });

    const actor = state.combatants.get(fighterId);
    expect(actor?.origin.kind).toBe("character");
    if (actor?.origin.kind !== "character") return;
    expect(actor.origin.spellcasting).toMatchObject({
      canCastSpells: true,
    });
    expect(
      discoverBattleActs(battleRuntimeSessionForTest({ state, context })).map(
        (act) => act.subject,
      ),
    ).toContainEqual(expect.objectContaining({ tag: "actionSpell" }));
  });

  test("replays Acid Splash save-gate damage through MCP battle fills", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-acid-splash"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Acid Splash Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["acid_splash"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.availableActs.find(
      (candidate: {
        readonly presentation?: {
          readonly kind?: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        candidate.presentation?.kind === "spell" &&
        candidate.presentation.invocation?.spellId === "acid_splash",
    );
    if (act === undefined) {
      throw new Error("Expected Acid Splash battle act.");
    }
    expect(act).toMatchObject({
      initialHoles: [
        expect.objectContaining({
          kind: "savingThrowOutcome",
          areaChoices: [],
        }),
      ],
    });
    const savingThrowHole = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "savingThrowOutcome",
    );
    if (savingThrowHole === undefined) {
      throw new Error("Expected Acid Splash saving throw outcome hole.");
    }
    const subject = act.subject;

    const afterSavingThrow = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject,
        fill: {
          kind: "savingThrowOutcome",
          holeId: savingThrowHole.holeId,
          value: {
            area: {
              originAnchorId: "fighter",
              affectedTargetIds: ["goblin"],
            },
            outcomes: [{ targetId: "goblin", succeeded: false }],
          },
        },
      }),
    );
    expect(afterSavingThrow.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: expect.any(String),
        },
      ],
    });
    const acidDamageHole = afterSavingThrow.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (acidDamageHole === undefined) {
      throw new Error("Expected Acid Splash damage hole.");
    }

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject,
        fill: {
          kind: "rolledDice",
          holeId: acidDamageHole.holeId,
          value: [{ results: [4] }],
        },
      }),
    );
    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter", hp: 8 },
          { combatantId: "goblin", hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("returns Fire Bolt object damage and ignition through MCP battle fills", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-fire-bolt-object"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Fire Bolt Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["fire_bolt"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.availableActs.find(
      (candidate: {
        readonly presentation?: {
          readonly kind?: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        candidate.presentation?.kind === "spell" &&
        candidate.presentation.invocation?.spellId === "fire_bolt",
    );
    if (act === undefined) {
      throw new Error("Expected Fire Bolt battle act.");
    }
    const objectTarget = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "objectTargetChoice",
    );
    if (objectTarget === undefined) {
      throw new Error("Expected Fire Bolt object target hole.");
    }

    const afterObjectTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "objectTargetChoice",
          holeId: objectTarget.holeId,
          value: "dry-training-dummy",
          spatialFacts: [
            {
              kind: "spellObjectTarget",
              casterId: "fighter",
              objectId: "dry-training-dummy",
              sourceProcedureRef: act.subject.procedureRef,
              rangeFeet: 120,
              armorClass: 13,
              damageDisposition: { kind: "hitPoints", hitPoints: 8 },
            },
            {
              kind: "spellObjectIgnition",
              casterId: "fighter",
              objectId: "dry-training-dummy",
              sourceProcedureRef: act.subject.procedureRef,
              disposition: { kind: "flammableUnattended" },
            },
          ],
        },
      }),
    );
    const attackRoll = afterObjectTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Fire Bolt object attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Fire Bolt object damage hole.");
    }

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [4] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: "dry-training-dummy",
          components: [{ damageType: "fire", rolledDamage: 4 }],
          rolledDamage: 4,
          effectiveDamage: 4,
          priorHitPoints: 8,
          nextHitPoints: 4,
          destroyed: false,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: "dry-training-dummy",
          sourceCombatantId: "fighter",
          sourceProcedureRef: act.subject.procedureRef,
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("replays Sorcerous Burst damage-type and exploding damage through MCP battle fills", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const sorcerer = root.unitLibrary.requireUnit("class_sorcerer");
    if (sorcerer.kind !== "class") {
      throw new Error("Expected Sorcerer class Unit.");
    }
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-sorcerous-burst"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Sorcerous Burst Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: characterBuildForClassProgression({
            base: build,
            classUnit: sorcerer,
            level: 5,
            keepClassChoices: false,
          }).progression,
          // A level-5 Sorcerer knows two Metamagic options; the build is
          // invalid without them (Metamagic known option count must match the
          // Sorcerer level).
          features: [
            ...build.features,
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: expectRight(
                sorcererMetamagicOptionId("sorcerer_quickened_spell"),
              ),
            },
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: expectRight(
                sorcererMetamagicOptionId("sorcerer_careful_spell"),
              ),
            },
          ],
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            sourceUnitId: "class_sorcerer",
            spellcastingAbility: "cha",
            cantrips: ["sorcerous_burst"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.availableActs.find(
      (candidate: {
        readonly presentation?: {
          readonly kind?: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        candidate.presentation?.kind === "spell" &&
        candidate.presentation.invocation?.spellId === "sorcerous_burst",
    );
    if (act === undefined) {
      throw new Error("Expected Sorcerous Burst battle act.");
    }
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "damageTypeChoice",
          choices: [
            "acid",
            "cold",
            "fire",
            "lightning",
            "poison",
            "psychic",
            "thunder",
          ],
        }),
        expect.objectContaining({
          kind: "targetChoice",
          choices: expect.arrayContaining(["goblin"]),
        }),
        expect.objectContaining({ kind: "objectTargetChoice" }),
      ]),
    );
    const damageType = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "damageTypeChoice",
    );
    const target = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    if (damageType === undefined || target === undefined) {
      throw new Error("Expected Sorcerous Burst damage type and target holes.");
    }

    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "damageTypeChoice",
          holeId: damageType.holeId,
          value: "thunder",
        },
      }),
    );
    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "targetChoice",
          holeId: target.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "goblin",
              sourceProcedureRef: act.subject.procedureRef,
            },
          ],
        },
      }),
    );
    const attackRoll = afterTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Sorcerous Burst attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Sorcerous Burst damage hole.");
    }
    expect(damage).toMatchObject({
      label: "Spell damage (2d8-thunder)",
    });

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [8, 3, 5] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter" },
          { combatantId: "goblin", hp: 0 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("replays Spare the Dying stable lifecycle through MCP battle tools", () => {
    const root = createMcpPlaySessionRoot();
    const casterBuild = {
      ...fighterCharacterBuild(root.unitLibrary),
      progression: wizardProgression(root),
      equipment: {
        ...fighterCharacterBuild(root.unitLibrary).equipment,
        loadout: {
          shield: testCharacterEquipmentItemId("shield", "equipment_shield"),
        },
      },
      spellcasting: testWizardSpellcasting({
        cantrips: ["spare_the_dying"],
        preparedSpells: [],
        spellSlots: [{ spellLevel: 1, count: 2 }],
      }),
    };
    const targetBuild = fighterCharacterBuild(root.unitLibrary);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: characterId("spare-the-dying-caster-character"),
        build: casterBuild,
        currentHp: Hp(characterBuildMaximumHp(casterBuild, root.unitLibrary)),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: characterId("spare-the-dying-target-character"),
        build: targetBuild,
        currentHp: Hp(characterBuildMaximumHp(targetBuild, root.unitLibrary)),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:spare-the-dying-mcp",
        initialCombatants: [
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: "spare-the-dying-caster-character",
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "characterSession",
            ammunitionStocks: [],
            characterId: "spare-the-dying-target-character",
            combatantId: "dying-ally",
            initiative: 7,
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleSession;
    const targetCombatant = battleState?.state.combatants.get(
      combatantId("dying-ally"),
    );
    if (
      battleState === null ||
      targetCombatant === undefined ||
      targetCombatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle dying ally character combatant.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        ...battleState,
        state: {
          ...battleState.state,
          combatants: new Map(battleState.state.combatants).set(
            combatantId("dying-ally"),
            {
              ...testBattleCreatureStateWithoutKnockOut(targetCombatant, {
                hp: Hp(0),
                conditions: targetCombatant.conditions,
              }),
              zeroHpLifecycle: {
                ...targetCombatant.zeroHpLifecycle,
                deathSaves: {
                  deathSaves: { successes: 2, failures: 1 },
                  stable: false,
                  dead: false,
                  hpRegained: false,
                },
              },
            },
          ),
        },
      }),
    );
    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.availableActs.find(
      (candidate: {
        readonly presentation?: {
          readonly kind?: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        candidate.presentation?.kind === "spell" &&
        candidate.presentation.invocation?.spellId === "spare_the_dying",
    );
    if (act === undefined) {
      throw new Error("Expected Spare the Dying battle act.");
    }
    const target = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    if (target === undefined) {
      throw new Error("Expected Spare the Dying target hole.");
    }
    expect(target).toMatchObject({ choices: ["dying-ally"] });

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "targetChoice",
          holeId: target.holeId,
          value: "dying-ally",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "dying-ally",
              sourceProcedureRef: act.subject.procedureRef,
            },
          ],
        },
      }),
    );

    expect(afterTarget.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter" },
          {
            combatantId: "dying-ally",
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: true,
              dead: false,
            },
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("returns Starry Wisp object damage through MCP battle fills", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-starry-wisp-object"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Starry Wisp Spellcaster",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["starry_wisp"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.availableActs.find(
      (candidate: {
        readonly presentation?: {
          readonly kind?: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        candidate.presentation?.kind === "spell" &&
        candidate.presentation.invocation?.spellId === "starry_wisp",
    );
    if (act === undefined) {
      throw new Error("Expected Starry Wisp battle act.");
    }
    const objectTarget = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "objectTargetChoice",
    );
    if (objectTarget === undefined) {
      throw new Error("Expected Starry Wisp object target hole.");
    }

    const afterObjectTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "objectTargetChoice",
          holeId: objectTarget.holeId,
          value: "training-crystal",
          spatialFacts: [
            {
              kind: "spellObjectTarget",
              casterId: "fighter",
              objectId: "training-crystal",
              sourceProcedureRef: act.subject.procedureRef,
              rangeFeet: 60,
              armorClass: 13,
              damageDisposition: { kind: "hitPoints", hitPoints: 5 },
            },
          ],
        },
      }),
    );
    const attackRoll = afterObjectTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Starry Wisp object attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Starry Wisp object damage hole.");
    }

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [6] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: "training-crystal",
          components: [{ damageType: "radiant", rolledDamage: 6 }],
          rolledDamage: 6,
          effectiveDamage: 6,
          priorHitPoints: 5,
          nextHitPoints: 0,
          destroyed: true,
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("preserves pending reaction state while MCP replays a readied spell procedure", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const { state, context } = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-reaction-replay"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Readied Spell Fighter",
        initiative: initiativeScore(12),
        resourceExpenditures: [],
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
      },
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state,
        context,
      }),
    );
    root.sessionStore.pendingBattleFills = null;

    const rayOfFrostAct = discoverBattleActs(
      battleRuntimeSessionForTest({ state, context }),
    ).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.actorId === fighterId &&
        battleActSpellPresentation(act)?.invocation.spellId === "ray_of_frost",
    );
    if (rayOfFrostAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected Fighter Ray of Frost act.");
    }

    readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: {
          ...rayOfFrostAct.subject,
          mode: { tag: "ready", trigger: "attackHit" },
        },
      }),
    );
    const readiedState = root.sessionStore.battleSession;
    if (readiedState?.state.readiedSpells.get(fighterId) === undefined) {
      throw new Error("Expected Fighter to hold a readied spell.");
    }
    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));

    const goblinAttack = battleAttackSubjectForName(root, "goblin", "Shortbow");
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "fighter",
          spatialFacts: [
            {
              kind: "attackTargetInRangedRange",
              actorId: "goblin",
              targetId: "fighter",
              ...battleAttackSelection(goblinAttack, "Shortbow"),
              rangeBand: "normal",
            },
          ],
        },
      }),
    );
    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 20, naturalD20: 18 },
        },
      }),
    );
    expect(afterAttackRoll).toMatchObject({
      result: {
        tag: "needsHoles",
        holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
      },
      snapshot: {
        pendingInterrupt: { trigger: "attackHit" },
      },
    });
    expect(
      readPayload(handleToolCall(root, "read_battle_state", {})),
    ).toMatchObject({
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
      presentedInterruptChoices: [
        expect.objectContaining({
          choice: expect.objectContaining({ kind: "releaseReadiedSpell" }),
        }),
      ],
    });
    const releaseChoices =
      afterAttackRoll.snapshot.pendingInterrupt.choices.filter(
        (choice: {
          readonly kind?: string;
          readonly readiedSpellCasterId?: string;
        }) =>
          choice.kind === "releaseReadiedSpell" &&
          choice.readiedSpellCasterId === "fighter",
      );
    const [releaseChoice] = releaseChoices;
    if (releaseChoices.length !== 1 || releaseChoice === undefined) {
      throw new Error("Expected one Fighter readied-spell release choice.");
    }

    const afterReactionDecision = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "interruptDecision",
          holeId: "battle:interrupt:decision",
          value: {
            kind: "resolve",
            responderId: "fighter",
            choice: {
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: "fighter",
              procedureRef: releaseChoice.subject.procedureRef,
              fills: [],
            },
          },
        },
      }),
    );
    expect(afterReactionDecision).toMatchObject({
      result: {
        tag: "needsHoles",
        subject: {
          tag: "runtimeCommand",
          command: "releaseReadiedSpell",
          readiedSpellCasterId: "fighter",
        },
        holes: [{ kind: "targetChoice" }],
      },
      snapshot: {
        pendingInterrupt: { trigger: "attackHit" },
      },
    });
    expect(root.sessionStore.battleSession?.state.interruptStack).toHaveLength(
      1,
    );
    expect(afterReactionDecision.session.transientBattleFills).toMatchObject({
      subject: {
        command: "releaseReadiedSpell",
      },
    });

    const releaseSubject = afterReactionDecision.result.subject;
    const spellTarget = afterReactionDecision.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    const afterReadiedTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: releaseSubject,
        fill: {
          kind: "targetChoice",
          holeId: spellTarget.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "goblin",
              sourceProcedureRef: releaseChoice.subject.procedureRef,
            },
          ],
        },
      }),
    );
    expect(afterReadiedTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll" }],
    });
  });

  test("rejects available character sessions with non-canonical Spell Slot state", () => {
    const root = createMcpPlaySessionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const spellcastingBuild = {
      ...build,
      progression: wizardProgression(root),
      spellcasting: testWizardSpellcasting({
        cantrips: ["ray_of_frost"],
        preparedSpells: ["magic_missile"],
        spellSlots: [{ spellLevel: 1 as const, count: 2 as const }],
      }),
    };

    expect(() =>
      availableCharacterSessionRight({
        characterId: characterId("character:spell-slot-duplicate-levels"),
        build: spellcastingBuild,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        spellSlotExpenditures: [
          {
            spellLevel: spellSlotLevel(1),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(1),
            expended: resourceCount(0),
          },
        ],
      }),
    ).toThrow("Spell Slot state must not duplicate spell levels.");
    expect(() =>
      availableCharacterSessionRight({
        characterId: characterId("character:spell-slot-mismatched-capacity"),
        build: {
          ...spellcastingBuild,
          spellcasting: {
            ...spellcastingBuild.spellcasting,
            slotPools: {
              spellcasting: {
                kind: "spellcasting",
                slots: [
                  { spellLevel: 1, count: 2 },
                  { spellLevel: 2, count: 1 },
                ],
              },
            },
          },
        },
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        spellSlotExpenditures: [
          {
            spellLevel: spellSlotLevel(1),
            expended: resourceCount(3),
          },
        ],
      }),
    ).toThrow("Spell Slot state does not match build capacity for level 1.");
  });

  test("rejects character battle init when current HP exceeds build max HP", () => {
    const root = createMcpPlaySessionRoot();

    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-root-overmax-hp"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(12),
          currentHp: Hp(13),
          resourceExpenditures: [],
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
        },
        unitLibrary: root.unitLibrary,
      }),
    ).toThrow("Character battle initialization current HP exceeds max HP.");
  });
});

function fighterCharacterBuild(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeManifestDraft(unitLibrary),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error("Expected complete manifest draft to finalize.");
  }

  return result.build;
}

function goblinWarriorMultiattackStatBlock(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
): StatBlockRecord {
  const base = root.statBlockCatalog.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  // MCP-only upgraded Goblin Warrior fixture: the SRD Goblin Warrior has no
  // Multiattack, but this keeps the fixture small while exercising the tool path.
  return {
    ...base,
    id: statBlockId("stat_block_goblin_warrior_mcp_multiattack"),
    name: "Upgraded Goblin Warrior",
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              { name: "Scimitar", count: { kind: "literal", value: 1 } },
              { name: "Shortbow", count: { kind: "literal", value: 1 } },
            ],
          },
        ],
      },
    },
  };
}

function fighterTwoCharacterBuild(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
): CharacterBuild {
  const draft = createTestDraft("draft:mcp-complete-fighter-two");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(
        "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
      ),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: manifestChoiceFills(),
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: manifestPurchaseFills(),
    }),
  );
  const finalDraft = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: manifestLoadoutFills(),
    }),
  );
  const result = finalizeCharacterDraft({ draft: finalDraft, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error("Expected complete Fighter 2 manifest draft to finalize.");
  }

  return result.build;
}

function characterUnitRef(
  context: BattleRuntimeSession["context"],
  combatantId: typeof fighterId,
  unitId: string,
) {
  const characterContext = context.characters.get(combatantId);
  if (characterContext === undefined) {
    throw new Error(`Expected character battle context: ${combatantId}`);
  }
  return characterContext.unitPresentationSources.find(
    (ref) => ref.unit.id === unitId,
  );
}

function fighterTwoLightWeaponBuild(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
): CharacterBuild {
  const fighter = fighterCharacterBuild(unitLibrary);
  return {
    ...fighter,
    equipment: {
      ...fighter.equipment,
      owned: [
        ...fighter.equipment.owned,
        characterBuildCatalogEquipmentItem({
          itemId: testCharacterEquipmentItemId("main", "weapon_shortsword"),
        }),
        characterBuildCatalogEquipmentItem({
          itemId: testCharacterEquipmentItemId("off", "weapon_dagger"),
        }),
      ],
      loadout: {
        armor: testCharacterEquipmentItemId("armor", "armor_chain_mail"),
        weapon: {
          itemId: testCharacterEquipmentItemId("main", "weapon_shortsword"),
          grip: "one_handed",
        },
        offHandWeapon: {
          itemId: testCharacterEquipmentItemId("off", "weapon_dagger"),
        },
      },
    },
  };
}

function createFinalizedFighterSheet(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
): CharacterBuild {
  const build = fighterCharacterBuild(root.unitLibrary);
  root.sessionStore.characters.set(
    availableCharacterSessionRight({
      characterId: testCharacterId(draftId),
      build,
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
    }),
  );
  return build;
}

function createFinalizedDruidSheet(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
): CharacterBuild {
  const druid = root.unitLibrary.requireUnit("class_druid");
  if (druid.kind !== "class") {
    throw new Error("Expected the Druid class Unit.");
  }
  const build = {
    ...characterBuildForClassProgression({
      base: fighterCharacterBuild(root.unitLibrary),
      classUnit: druid,
      keepClassChoices: false,
      level: 2,
    }),
    background: unitId("background_sage"),
    magicInitiateSpellAccesses: [
      {
        featUnitId: unitId("feat_magic_initiate_wizard"),
        spellcastingAbility: "int" as const,
        cantrips: [unitId("fire_bolt"), unitId("light")] as const,
        levelOneSpell: unitId("burning_hands"),
      },
    ],
  };
  root.sessionStore.characters.set(
    availableCharacterSessionRight({
      characterId: testCharacterId(draftId),
      build,
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
      druidWildShapeKnownFormStatBlockIds: [
        statBlockId("stat_block_rat"),
        statBlockId("stat_block_riding_horse"),
        statBlockId("stat_block_spider"),
        statBlockId("stat_block_wolf"),
      ],
    }),
  );
  return build;
}

function createFinalizedWizardWithFindFamiliar(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
  input: {
    readonly preparedSpells?: readonly string[];
    readonly spellcastingSafeLoadout?: boolean;
  } = {},
): CharacterBuild {
  const fighter = fighterCharacterBuild(root.unitLibrary);
  const build = {
    ...fighter,
    progression: wizardProgression(root),
    ...(input.spellcastingSafeLoadout === true
      ? {
          equipment: {
            ...fighter.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
        }
      : {}),
    spellcasting: testWizardSpellcasting({
      cantrips: [],
      spellbook: ["find_familiar"],
      preparedSpells: input.preparedSpells ?? ["find_familiar"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    }),
  };
  root.sessionStore.characters.set(
    availableCharacterSessionRight({
      characterId: testCharacterId(draftId),
      build,
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
    }),
  );
  return build;
}

function setRetainedFamiliarCompanion(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
  input: {
    readonly formId?: string;
  } = {},
) {
  const formId = input.formId ?? "cat";
  const retained = readPayload(
    handleToolCall(root, "apply_character_session_operation", {
      characterId: testCharacterId(draftId),
      operation: {
        kind: "retainOneAtATimeCompanion",
        companionId: "durable-wizard-familiar",
        source: { tag: "ritualSpell", spellId: "find_familiar" },
        selectedForm: { tag: "normalNamedForm", formId },
        creatureTypeOverrideChoiceId: "fey",
      },
    }),
  );
  expect(retained.character).toMatchObject({
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId: "durable-wizard-familiar",
        manifestation: {
          selectedForm: { tag: "normalNamedForm", formId },
        },
      },
    },
  });
}

function setStoredRetainedFamiliarCompanion(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
  input: {
    readonly formId?: string;
    readonly currentHp?: Hp;
    readonly tempHp?: Hp;
  } = {},
) {
  const session = root.sessionStore.characters.get(testCharacterId(draftId));
  if (session?.tag !== "available") {
    throw new Error("Expected test character session.");
  }
  root.sessionStore.characters.set(
    expectRight(
      replaceCharacterSheetCompanion({
        sheet: session,
        companion: retainedFamiliarCompanionInput(input),
      }),
    ),
  );
}

function retainedFamiliarCompanionInput(
  input: {
    readonly formId?: string;
    readonly currentHp?: Hp;
    readonly tempHp?: Hp;
  } = {},
): CharacterSheetCompanion {
  const formId = input.formId ?? "cat";
  return {
    tag: "retainedOneAtATime",
    companion: {
      companionId: retainedCompanionId("durable-wizard-familiar"),
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      manifestation: {
        tag: "embodiedOutsideBattle",
        selectedForm: { tag: "normalNamedForm", formId },
        creatureTypeOverride: "fey",
        resolvedStatBlockId: statBlockId(`stat_block_${formId}`),
        hitPoints: {
          // Cast evidence: retainedFamiliarCompanionInput is a test fixture
          // helper; tests pass zero explicitly only when asserting rejection.
          currentHp: (input.currentHp ??
            Hp(1)) as CharacterSheetRetainedCompanionCurrentHitPoints,
          tempHp: input.tempHp ?? Hp(0),
        },
      },
    },
  };
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    draftId: characterDraftId(draftId),
  });
}

function completeManifestDraft(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
): CharacterDraft {
  const draft = createTestDraft("draft:mcp-complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: manifestChoiceFills(),
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: manifestPurchaseFills(),
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: manifestLoadoutFills(),
    }),
  );
}

function initialManifestFills(
  progressionOptionId = "13:class_fighter:level_1:maximum_hit_die",
): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.progression.initial", progressionOptionId),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    },
    {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function choiceFill(
  holeId: CreationHoleIdText,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error("Expected accepted character-creation fill batch.");
  }

  return result.draft;
}

function manifestChoiceFills(): readonly CreationFill[] {
  return [
    choiceFill(
      unitHoleId("class_fighter", "class_skill_proficiency_choice"),
      "perception",
      "survival",
    ),
    choiceFill(
      unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      "defense",
    ),
    choiceFill(
      unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
    ),
    choiceFill(
      unitHoleId("class_fighter", "class_equipment_choice"),
      "option_c",
    ),
    choiceFill(
      unitHoleId("background_soldier", "background_ability_score_increase"),
      "two_and_one:str:con",
    ),
    choiceFill(
      unitHoleId("background_soldier", "background_tool_choice"),
      "tool_dice_set",
    ),
    choiceFill(
      unitHoleId("background_soldier", "background_equipment_choice"),
      "option_b",
    ),
  ];
}

function manifestPurchaseFills(): readonly CreationFill[] {
  return [
    choiceFill(
      unitHoleId("class_fighter", "equipment_purchase"),
      "armor_chain_mail",
      "weapon_longsword",
      "equipment_shield",
    ),
  ];
}

function manifestLoadoutFills(): readonly CreationFill[] {
  return [
    choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
    choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
    choiceFill(
      loadoutHoleId("weapon_longsword", "weapon"),
      "wielded_one_handed",
    ),
  ];
}

function fillThroughTool(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
  expectedRevision: number,
  fills: readonly CreationFill[],
) {
  return readPayload(
    handleToolCall(root, "fill_creation_holes", {
      draftId,
      expectedRevision,
      fills,
    }),
  );
}

function createAndFinalizeManifestFighterThroughTools(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
) {
  const created = readPayload(
    handleToolCall(root, "create_character_draft", { draftId }),
  );
  expect(created.holes.map((hole: CreationHole) => hole.holeId)).toEqual([
    "cc:draft:draft.progression.initial",
    "cc:draft:draft.background",
    "cc:draft:draft.species",
    "cc:draft:draft.abilityScoreGeneration",
    "cc:draft:draft.languages",
    "cc:draft:draft.alignment",
  ]);

  fillThroughTool(root, draftId, 0, initialManifestFills());
  const discoveredChoices = readPayload(
    handleToolCall(root, "discover_creation_holes", { draftId }),
  );
  expect(
    discoveredChoices.holes.map((hole: CreationHole) => hole.holeId),
  ).toEqual(initialClassHoleIds());

  fillThroughTool(root, draftId, 1, manifestChoiceFills());
  fillThroughTool(root, draftId, 2, manifestPurchaseFills());
  fillThroughTool(root, draftId, 3, manifestLoadoutFills());

  return readPayload(handleToolCall(root, "finalize_character", { draftId }));
}

function fillBattleHoleThroughTool(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  attackName: string,
  fill: {
    readonly kind:
      | "targetChoice"
      | "attackRoll"
      | "rolledDice"
      | "attackDamageDisposition";
    readonly holeId: string;
    readonly spatialFacts?: readonly unknown[];
    readonly selectedAttackDamageRiderProcedureRefs?: readonly string[];
    readonly value: unknown;
  },
  subject?: BattleSubject,
) {
  const selectedSubject =
    subject ?? battleAttackSubjectForName(root, actorId, attackName);
  const attackSelection = battleAttackSelection(selectedSubject, attackName);
  const battleFill =
    fill.kind === "targetChoice" && fill.spatialFacts === undefined
      ? {
          ...fill,
          spatialFacts: [
            attackName === "Shortbow"
              ? {
                  kind: "attackTargetInRangedRange",
                  actorId,
                  targetId: String(fill.value),
                  ...attackSelection,
                  rangeBand: "normal",
                }
              : {
                  kind: "attackTargetInMeleeReach",
                  actorId,
                  targetId: String(fill.value),
                  ...attackSelection,
                },
            {
              kind: "attackerAllyWithin5FeetOfTarget",
              attackerId: actorId,
              targetId: String(fill.value),
              allyId: "ally",
            },
            {
              kind: "attackerAllyWithin5FeetOfTarget",
              attackerId: actorId,
              targetId: String(fill.value),
              allyId: "sneak-attack-ally",
            },
          ],
        }
      : fill;
  const payload = readPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject: selectedSubject,
      fill: battleFill,
    }),
  );
  if ("error" in payload) {
    throw new Error(JSON.stringify(payload));
  }
  return payload;
}

function battleAttackSubjectForName(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const matchingActs = readPayload(
    handleToolCall(root, "discover_battle_acts", {}),
  ).availableActs.filter(
    (candidate: {
      readonly presentation: {
        readonly kind: string;
        readonly procedureRef?: string;
        readonly name?: string;
      };
      readonly subject: BattleSubject;
    }) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.statBlockDamageNotation === undefined &&
      candidate.presentation.kind === "attack" &&
      candidate.presentation.procedureRef === candidate.subject.procedureRef &&
      candidate.presentation.name === attackName,
  );
  const [act] = matchingActs;
  if (matchingActs.length !== 1 || act === undefined) {
    throw new Error(
      `Expected one rolled ${actorId} ${attackName} Attack action.`,
    );
  }
  if (act.subject.tag !== "action" || act.subject.action !== "attack") {
    throw new Error(`Expected ${attackName} Attack subject.`);
  }
  return act.subject;
}

function battleAttackSelection(subject: BattleSubject, attackName: string) {
  if (subject.tag !== "action" || subject.action !== "attack") {
    throw new Error(`Expected ${attackName} Attack subject.`);
  }
  return {
    procedureRef: subject.procedureRef,
    ...(subject.attackAbility === undefined
      ? {}
      : { attackAbility: subject.attackAbility }),
    ...(subject.attackDamageType === undefined
      ? {}
      : { attackDamageType: subject.attackDamageType }),
  };
}

function battleActionSubject(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  action: Extract<BattleSubject, { readonly tag: "action" }>["action"],
): BattleSubject {
  const act = readPayload(
    handleToolCall(root, "discover_battle_acts", {}),
  ).availableActs.find(
    (candidate: { readonly subject: BattleSubject }) =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === action,
  );
  if (act === undefined) {
    throw new Error(`Expected ${actorId} ${action} action.`);
  }
  return act.subject;
}

function readPayload(response: CharacterToolResult | BattleToolResult) {
  return JSON.parse(response.content[0]?.text ?? "null");
}

function initialClassHoleIds(): readonly CreationHoleIdText[] {
  return manifestChoiceFills().map((fill) => fill.holeId);
}

function fighterUnitLibraryWithClassFeatureGrant(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
  featureUnit: Extract<UnitRecord, { readonly kind: "class_feature" }>,
): ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"] {
  const fighter = unitLibrary.requireUnit("class_fighter");
  if (fighter.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }

  return unitLibraryWithOverrides(unitLibrary, [
    {
      ...fighter,
      featureGrants: fighter.featureGrants.some(
        (grant) => grant.unitId === featureUnit.id,
      )
        ? fighter.featureGrants
        : [
            ...fighter.featureGrants,
            { level: featureUnit.acquiredAtLevel, unitId: featureUnit.id },
          ],
    },
    featureUnit,
  ]);
}

function fighterCharacterBuildAtLevel(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
  level: number,
): CharacterBuild {
  const classUnit = unitLibrary.requireUnit("class_fighter");
  if (classUnit.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }

  return characterBuildForClassProgression({
    base: fighterCharacterBuild(unitLibrary),
    classUnit,
    level,
    keepClassChoices: true,
  });
}

function rogueCharacterBuild(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
  input: {
    readonly level?: number;
  } = {},
): CharacterBuild {
  const classUnit = rogueClassUnit(unitLibrary);
  const fighter = fighterCharacterBuild(unitLibrary);
  return {
    ...characterBuildForClassProgression({
      base: fighter,
      classUnit,
      level: input.level ?? 1,
      keepClassChoices: false,
    }),
    equipment: {
      ...fighter.equipment,
      owned: [
        ...fighter.equipment.owned,
        characterBuildCatalogEquipmentItem({
          itemId: testCharacterEquipmentItemId("main", "weapon_dagger"),
        }),
      ],
      loadout: {
        weapon: {
          itemId: testCharacterEquipmentItemId("main", "weapon_dagger"),
          grip: "one_handed",
        },
      },
    },
  };
}

function rogueBattleUnitLibrary(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  overrides?: {
    readonly cunningActionUnit?: UnitRecord;
    readonly sneakAttackUnit?: UnitRecord;
    readonly evasionUnit?: UnitRecord;
    readonly uncannyDodgeUnit?: UnitRecord;
  },
): ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"] {
  const rogueClass = rogueClassUnit(root.unitLibrary);
  const overriddenUnits = [
    rogueClass,
    ...(overrides?.cunningActionUnit === undefined
      ? []
      : [overrides.cunningActionUnit]),
    ...(overrides?.sneakAttackUnit === undefined
      ? []
      : [overrides.sneakAttackUnit]),
    ...(overrides?.evasionUnit === undefined ? [] : [overrides.evasionUnit]),
    ...(overrides?.uncannyDodgeUnit === undefined
      ? []
      : [overrides.uncannyDodgeUnit]),
  ] as const;
  return unitLibraryWithOverrides(root.unitLibrary, overriddenUnits);
}

function rogueClassUnit(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
): Extract<UnitRecord, { readonly kind: "class" }> {
  const fighter = unitLibrary.requireUnit("class_fighter");
  if (fighter.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }
  const { spellcasting: _spellcasting, ...fighterWithoutSpellcasting } =
    fighter;
  return {
    ...fighterWithoutSpellcasting,
    id: unitId("class_rogue"),
    name: "Rogue",
    className: "rogue",
    hitPointDie: 8,
    featureGrants: [
      { level: 1, unitId: unitId("rogue_sneak_attack") },
      { level: 2, unitId: unitId("rogue_cunning_action") },
      { level: 5, unitId: unitId("rogue_uncanny_dodge") },
      { level: 7, unitId: unitId("rogue_evasion") },
    ],
  };
}

function characterBuildForClassProgression(input: {
  readonly base: CharacterBuild;
  readonly classUnit: Extract<UnitRecord, { readonly kind: "class" }>;
  readonly level: number;
  readonly keepClassChoices: boolean;
}): CharacterBuild {
  const classLevel = characterClassLevel(input.level);
  const classUnitId = expectRight(classUnitIdFromClassUnit(input.classUnit));
  const progression = {
    startingClass: classUnitId,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  };
  return {
    ...input.base,
    progression,
    features: [
      ...input.base.features.filter(
        (feature) =>
          input.keepClassChoices || feature.kind !== "selectedClassChoice",
      ),
    ],
  };
}

function unitLibraryWithOverrides(
  unitLibrary: ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"],
  overrides: readonly UnitRecord[],
): ReturnType<typeof createMcpPlaySessionRoot>["unitLibrary"] {
  const unitById = new Map(
    unitLibrary.listUnits().map((unit) => [unit.id, unit]),
  );
  for (const override of overrides) {
    unitById.set(override.id, override);
  }

  return {
    ...unitLibrary,
    getUnit: (requestedUnitId) => {
      const unit = unitById.get(unitId(requestedUnitId));
      return unit === undefined ? Option.none() : Option.some(unit);
    },
    listUnits: () => [...unitById.values()],
    requireUnit: (requestedUnitId) => {
      const unit = unitById.get(unitId(requestedUnitId));
      return unit === undefined
        ? unitLibrary.requireUnit(requestedUnitId)
        : unit;
    },
  };
}
