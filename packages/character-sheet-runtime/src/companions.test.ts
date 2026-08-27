import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import type { Hp as HpType } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";

import {
  characterSheetCompanion,
  characterSheetResources,
  characterSheetSpellSlots,
  createRetainedFamiliarLikeCompanion,
  parseCharacterSheetRetainedCompanionCurrentHitPoints,
  parseCharacterSheetRetainedCompanionId,
  replaceCharacterSheetCompanion,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRetainedCompanionCurrentHitPoints,
  type CharacterSheetRetainedCompanionProtocol,
} from "./index.ts";
import {
  companionAfterLongRest,
  companionFromInput,
  parseStoredCharacterSheetCompanion,
} from "./companions.ts";
import {
  armorClassBuild,
  build,
  characterSheetId,
  classUnitId,
  completeLongRest,
  druidCircleLandBuild,
  druidWildShapeFixtureKnownFormStatBlockIds,
  eldritchInvocationId,
  rebuildCharacterSheetFixture,
  resourceCount,
  Hp,
  parseCharacterSheet,
  requireRight,
  spellbookRitualSheet,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
  type UnitCatalog,
  warlockSpellcastingWithCantrips,
} from "./test-support.test-support.ts";

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet companion test Stat Block catalog must build.",
  );
}
const statBlockCatalog = statBlockCatalogResult.catalog;

function retainedCompanionId(value: string) {
  return requireRight(parseCharacterSheetRetainedCompanionId(value));
}

function retainedCompanionInput(
  input: {
    readonly companionId?: string;
    readonly currentHp?: HpType;
    readonly selectedForm?: CharacterSheetCompanionFormSelection;
    readonly creatureTypeOverride?: CharacterSheetCompanionCreatureTypeOverride;
    readonly protocolTag?: CharacterSheetRetainedCompanionProtocol["tag"];
  } = {},
): CharacterSheetCompanion {
  const protocol = retainedCompanionProtocolInput(input.protocolTag);
  return {
    tag: "retainedOneAtATime",
    companion: {
      companionId: retainedCompanionId(input.companionId ?? "companion:cat"),
      protocol,
      manifestation: {
        tag: "embodiedOutsideBattle",
        selectedForm: input.selectedForm ?? {
          tag: "normalNamedForm",
          formId: "cat",
        },
        creatureTypeOverride: input.creatureTypeOverride ?? "fey",
        resolvedStatBlockId: authoredStatBlockId("stat_block_cat"),
        hitPoints: {
          // Cast evidence: retainedCompanionInput is a test fixture helper; tests
          // pass zero explicitly only when asserting the constructor rejects it.
          currentHp: (input.currentHp ??
            Hp(2)) as CharacterSheetRetainedCompanionCurrentHitPoints,
          tempHp: Hp(1),
        },
      },
    },
  };
}

function retainedCompanionProtocolInput(
  protocolTag: CharacterSheetRetainedCompanionProtocol["tag"] | undefined,
): CharacterSheetRetainedCompanionProtocol {
  return { tag: protocolTag ?? "ordinaryFamiliarLikeOneAtATime" };
}

describe("Character Sheet runtime / companions", () => {
  test("replaces the companion slot as one typed sheet operation", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:replace-companion"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const companion = retainedCompanionInput();

    expect(
      requireRight(replaceCharacterSheetCompanion({ sheet, companion }))
        .companion,
    ).toEqual(companion);
  });

  test("retains the empty durable companion state", () => {
    expect(companionFromInput({ tag: "none" })).toEqual(
      expect.objectContaining({ _tag: "Success", value: { tag: "none" } }),
    );
    expect(companionAfterLongRest({ tag: "none" })).toEqual({ tag: "none" });
  });

  test("rejects incompatible stored companion protocol facts", () => {
    expect(
      companionFromInput(
        retainedCompanionInput({
          selectedForm: {
            tag: "pactOfTheChainSpecialForm",
            formId: "sprite",
          },
        }),
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Retained companion special forms require the attack-exception protocol.",
      },
    });
    expect(
      companionFromInput(
        requireRight(
          parseStoredCharacterSheetCompanion(
            storedCompanion({
              manifestation: storedManifestation({
                tag: "disappearedAtZeroHitPoints",
              }),
            }),
          ),
        ),
      ),
    ).toMatchObject({ _tag: "Success" });
  });

  test("creates and parses an empty durable companion slot", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:no-companion"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(characterSheetCompanion(sheet)).toEqual({ tag: "none" });
    expect(parseCharacterSheet(sheet, unitLibrary)).toMatchObject({
      _tag: "Success",
      value: { companion: { tag: "none" } },
    });
  });

  test("retains one familiar-like companion with resolved form proof", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:retained-companion"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput(),
      }),
    );

    expect(characterSheetCompanion(sheet)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:cat",
        manifestation: {
          tag: "embodiedOutsideBattle",
          resolvedStatBlockId: authoredStatBlockId("stat_block_cat"),
          hitPoints: { currentHp: 2, tempHp: 1 },
        },
      },
    });
  });

  test("creates retained companion Hit Points from literal Stat Block HP with zero Temporary Hit Points", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-creation-hp",
      spellbook: ["find_familiar"],
    });

    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:cat"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(retained)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        manifestation: {
          tag: "embodiedOutsideBattle",
          resolvedStatBlockId: authoredStatBlockId("stat_block_cat"),
          hitPoints: { currentHp: Hp(2), tempHp: Hp(0) },
        },
      },
    });
  });

  test("creates an ordinary retained companion by spending a prepared-spell slot", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-slot-cast",
      spellbook: ["find_familiar"],
      preparedSpells: ["find_familiar"],
    });

    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:slot-cat"),
        source: {
          tag: "spellSlotSpellCast",
          spellId: authoredUnitId("find_familiar"),
          spellLevel: spellSlotLevel(1),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetSpellSlots(retained)).toContainEqual({
      spellLevel: 1,
      count: 2,
      expended: 1,
    });
  });

  test("treats an on-person Book of Shadows Ritual spell as effective prepared access", () => {
    const bookBuild = {
      ...armorClassBuild({ startingClass: "class_warlock" }),
      features: [
        {
          kind: "selectedEldritchInvocation" as const,
          selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
          selection: {
            kind: "nonRepeatable" as const,
            invocationId: eldritchInvocationId("pact_of_the_tome"),
          },
        },
      ],
      spellcasting: {
        sources: [
          {
            sourceUnitId: authoredUnitId("class_warlock"),
            spellcastingAbility: "cha" as const,
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: ["arcane_focus" as const],
            bookOfShadows: {
              tag: "bookOfShadows" as const,
              cantrips: [
                authoredUnitId("fire_bolt"),
                authoredUnitId("minor_illusion"),
                authoredUnitId("spare_the_dying"),
              ] as const,
              ritualSpells: [
                authoredUnitId("find_familiar"),
                authoredUnitId("detect_magic"),
              ] as const,
              spellcastingFocus: "book_of_shadows" as const,
            },
          },
        ] as const,
        slotPools: {
          spellcasting: {
            kind: "spellcasting" as const,
            slots: [{ spellLevel: 1, count: 2 }],
          },
        },
      },
    };
    const bookSheet = requireRight(
      parseCharacterSheet(
        {
          ...storedAvailableSheetInput({
            characterId: "character:book-familiar-slot-cast",
            build: bookBuild,
          }),
          bookOfShadowsPresence: { tag: "onPerson" },
          spellSlotExpenditures: [],
        },
        unitLibrary,
      ),
    );

    expect(
      createRetainedFamiliarLikeCompanion({
        sheet: bookSheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:book-slot-cat"),
        source: {
          tag: "spellSlotSpellCast",
          spellId: authoredUnitId("find_familiar"),
          spellLevel: spellSlotLevel(1),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    ).toMatchObject({ _tag: "Success" });
  });

  test("creates a Pact of the Chain special-form companion from invocation access", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pact-chain-companion"),
        build: {
          ...build,
          progression: {
            startingClass: classUnitId(authoredUnitId("class_warlock")),
            advancements: [],
          },
          features: [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: authoredUnitId(
                "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "nonRepeatable",
                invocationId: eldritchInvocationId("pact_of_the_chain"),
              },
            },
          ],
          spellcasting: warlockSpellcastingWithCantrips([]),
        },
        currentHp: Hp(1),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:pact-sprite"),
        source: {
          tag: "invocationSpellAccess",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: {
          tag: "pactOfTheChainSpecialForm",
          formId: "sprite",
        },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(retained)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        protocol: { tag: "attackExceptionFamiliarLikeOneAtATime" },
        manifestation: {
          selectedForm: {
            tag: "pactOfTheChainSpecialForm",
            formId: "sprite",
          },
        },
      },
    });
  });

  test("creates a Wild Companion and spends one Wild Shape use", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:wild-companion-create"),
        build: druidCircleLandBuild({ druidLevel: 2 }),
        currentHp: Hp(1),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds:
          druidWildShapeFixtureKnownFormStatBlockIds,
        statBlockCatalog,
      }),
    );

    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:wild-cat"),
        source: {
          tag: "classFeatureSpellCast",
          featureUnitId: authoredUnitId("druid_wild_companion"),
          spend: {
            tag: "useCountResource",
            resourceUnitId: authoredUnitId("druid_wild_shape"),
          },
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      }),
    );

    expect(
      requireRight(characterSheetResources(retained, unitLibrary)),
    ).toContainEqual(
      expect.objectContaining({
        tag: "useCountResource",
        unitId: "druid_wild_shape",
        expended: 1,
      }),
    );
  });

  test("recasts an occupied retained companion without replacing its durable identity", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-recast",
      spellbook: ["find_familiar"],
    });
    const first = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:durable"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    const recast = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet: first,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:durable"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "bat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(recast)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:durable",
        manifestation: {
          selectedForm: { tag: "normalNamedForm", formId: "bat" },
          hitPoints: { currentHp: 1, tempHp: 0 },
        },
      },
    });
  });

  test("rejects recasting an occupied companion slot with a different durable identity", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-identity-replacement",
      spellbook: ["find_familiar"],
    });
    const occupied = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:occupied"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(
      createRetainedFamiliarLikeCompanion({
        sheet: occupied,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:replacement"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "bat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Retained companion recast cannot replace the durable identity of an occupied companion slot.",
      },
    });
  });

  test("recasting a disappeared companion mints fresh form HP", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-disappeared-recast",
      spellbook: ["find_familiar"],
    });
    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:disappeared"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    const companion = characterSheetCompanion(retained);
    if (companion.tag !== "retainedOneAtATime") {
      throw new Error("Expected a retained companion test fixture.");
    }
    const disappeared = requireRight(
      replaceCharacterSheetCompanion({
        sheet: retained,
        companion: {
          tag: "retainedOneAtATime",
          companion: {
            ...companion.companion,
            manifestation: {
              tag: "disappearedAtZeroHitPoints",
              selectedForm: companion.companion.manifestation.selectedForm,
              creatureTypeOverride:
                companion.companion.manifestation.creatureTypeOverride,
              resolvedStatBlockId:
                companion.companion.manifestation.resolvedStatBlockId,
            },
          },
        },
      }),
    );

    const recast = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet: disappeared,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:disappeared"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    expect(characterSheetCompanion(recast)).toMatchObject({
      companion: {
        manifestation: { hitPoints: { currentHp: 2, tempHp: 0 } },
      },
    });
  });

  test("rejects Wild Companion creation after every Wild Shape use is spent", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:spent-wild-companion"),
        build: druidCircleLandBuild({ druidLevel: 2 }),
        currentHp: Hp(1),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds:
          druidWildShapeFixtureKnownFormStatBlockIds,
        statBlockCatalog,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: authoredUnitId("druid_wild_shape"),
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:spent-wild-shape"),
        source: {
          tag: "classFeatureSpellCast",
          featureUnitId: authoredUnitId("druid_wild_companion"),
          spend: {
            tag: "useCountResource",
            resourceUnitId: authoredUnitId("druid_wild_shape"),
          },
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Retained companion class-feature spend requires an unexpended use-count resource.",
      },
    });
  });

  test.each([
    {
      name: "a spell-slot cast by a non-spellcaster",
      sheet: () =>
        requireRight(
          rebuildCharacterSheetFixture({
            characterId: characterSheetId(
              "character:non-spellcaster-companion",
            ),
            build,
            currentHp: Hp(1),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
      source: {
        tag: "spellSlotSpellCast",
        spellId: authoredUnitId("find_familiar"),
        spellLevel: spellSlotLevel(1),
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion spell-slot source requires the selected spell prepared or otherwise effective as prepared.",
    },
    {
      name: "an unprepared spell-slot spell",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:unprepared-companion",
          spellbook: ["find_familiar"],
        }),
      source: {
        tag: "spellSlotSpellCast",
        spellId: authoredUnitId("find_familiar"),
        spellLevel: spellSlotLevel(1),
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion spell-slot source requires the selected spell prepared or otherwise effective as prepared.",
    },
    {
      name: "a prepared spell without familiar eligibility",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:prepared-non-familiar-spell",
          spellbook: ["detect_magic"],
          preparedSpells: ["detect_magic"],
        }),
      source: {
        tag: "spellSlotSpellCast",
        spellId: authoredUnitId("detect_magic"),
        spellLevel: spellSlotLevel(1),
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion spell-slot source must provide familiar form eligibility.",
    },
    {
      name: "a ritual without familiar eligibility",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:non-familiar-ritual",
          spellbook: ["detect_magic"],
        }),
      source: {
        tag: "ritualSpell",
        spellId: authoredUnitId("detect_magic"),
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion ritual source must provide familiar form eligibility.",
    },
    {
      name: "invocation access without Pact of the Chain",
      sheet: () =>
        requireRight(
          rebuildCharacterSheetFixture({
            characterId: characterSheetId("character:no-pact-chain"),
            build,
            currentHp: Hp(1),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
      source: {
        tag: "invocationSpellAccess",
        spellId: authoredUnitId("find_familiar"),
      } as const,
      selectedForm: {
        tag: "pactOfTheChainSpecialForm",
        formId: "sprite",
      } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion invocation source must provide familiar form eligibility.",
    },
    {
      name: "an unowned class feature",
      sheet: () =>
        requireRight(
          rebuildCharacterSheetFixture({
            characterId: characterSheetId("character:no-wild-companion"),
            build,
            currentHp: Hp(1),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: authoredUnitId("druid_wild_companion"),
        spend: {
          tag: "useCountResource",
          resourceUnitId: authoredUnitId("druid_wild_shape"),
        },
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: undefined,
      message:
        "Retained companion class-feature spell source requires the selected feature on the Character Sheet.",
    },
    {
      name: "an owned but unsupported class feature",
      sheet: () =>
        requireRight(
          rebuildCharacterSheetFixture({
            characterId: characterSheetId(
              "character:unsupported-companion-feature",
            ),
            build: druidCircleLandBuild({ druidLevel: 2 }),
            currentHp: Hp(1),
            tempHp: Hp(0),
            unitLibrary,
            druidWildShapeKnownFormStatBlockIds:
              druidWildShapeFixtureKnownFormStatBlockIds,
            statBlockCatalog,
          }),
        ),
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: authoredUnitId("druid_druidic"),
        spend: {
          tag: "useCountResource",
          resourceUnitId: authoredUnitId("druid_wild_shape"),
        },
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: undefined,
      message:
        "Retained companion class-feature spell source must match the supported familiar-like spell-cast profile.",
    },
    {
      name: "a class-feature spend outside its options",
      sheet: () =>
        requireRight(
          rebuildCharacterSheetFixture({
            characterId: characterSheetId("character:bad-wild-companion-spend"),
            build: druidCircleLandBuild({ druidLevel: 2 }),
            currentHp: Hp(1),
            tempHp: Hp(0),
            unitLibrary,
            druidWildShapeKnownFormStatBlockIds:
              druidWildShapeFixtureKnownFormStatBlockIds,
            statBlockCatalog,
          }),
        ),
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: authoredUnitId("druid_wild_companion"),
        spend: {
          tag: "useCountResource",
          resourceUnitId: authoredUnitId("fighter_second_wind"),
        },
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: undefined,
      message:
        "Retained companion class-feature spend must match one of the feature spend options.",
    },
    {
      name: "an ordinary source without a creature-type choice",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:missing-creature-type-mode",
          spellbook: ["find_familiar"],
        }),
      source: {
        tag: "ritualSpell",
        spellId: authoredUnitId("find_familiar"),
      } as const,
      selectedForm: { tag: "normalNamedForm", formId: "cat" } as const,
      creatureTypeOverrideChoiceId: undefined,
      message:
        "Retained companion creation requires a creature type mode choice.",
    },
    {
      name: "a special form from an ordinary source",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:ordinary-special-form",
          spellbook: ["find_familiar"],
        }),
      source: {
        tag: "ritualSpell",
        spellId: authoredUnitId("find_familiar"),
      } as const,
      selectedForm: {
        tag: "pactOfTheChainSpecialForm",
        formId: "sprite",
      } as const,
      creatureTypeOverrideChoiceId: "fey" as const,
      message:
        "Retained companion source does not allow special familiar forms.",
    },
  ])(
    "rejects retained companion creation from $name",
    ({
      sheet,
      source,
      selectedForm,
      creatureTypeOverrideChoiceId,
      message,
    }) => {
      expect(
        createRetainedFamiliarLikeCompanion({
          sheet: sheet(),
          unitLibrary,
          statBlockCatalog,
          companionId: retainedCompanionId("companion:rejected"),
          source,
          selectedForm,
          ...(creatureTypeOverrideChoiceId === undefined
            ? {}
            : { creatureTypeOverrideChoiceId }),
        }),
      ).toMatchObject({ _tag: "Failure", failure: { message } });
    },
  );

  test("rejects a prepared familiar-like spell cast below its spell level", () => {
    const findFamiliar = requiredSpellFixture("find_familiar");
    const levelTwoFindFamiliar = {
      ...findFamiliar,
      mechanics: { ...findFamiliar.mechanics, level: 2 },
    } as const;
    const sheet = spellbookRitualSheet({
      characterIdText: "character:underleveled-familiar-slot",
      spellbook: ["find_familiar"],
      preparedSpells: ["find_familiar"],
    });

    expect(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary: unitLibraryReplacing(
          "find_familiar",
          levelTwoFindFamiliar,
        ),
        statBlockCatalog,
        companionId: retainedCompanionId("companion:underleveled-slot"),
        source: {
          tag: "spellSlotSpellCast",
          spellId: authoredUnitId("find_familiar"),
          spellLevel: spellSlotLevel(1),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Retained companion spell-slot source requires a slot at least as high as the selected spell level.",
      },
    });
  });

  test.each([
    {
      name: "spell-slot",
      sheet: () =>
        spellbookRitualSheet({
          characterIdText: "character:missing-familiar-spell-slot-shape",
          spellbook: ["find_familiar"],
          preparedSpells: ["find_familiar"],
        }),
      source: {
        tag: "spellSlotSpellCast",
        spellId: authoredUnitId("find_familiar"),
        spellLevel: spellSlotLevel(1),
      } as const,
      message:
        "Retained companion spell-slot source must provide familiar form eligibility.",
    },
    {
      name: "invocation",
      sheet: pactChainSheet,
      source: {
        tag: "invocationSpellAccess",
        spellId: authoredUnitId("find_familiar"),
      } as const,
      message:
        "Retained companion invocation source must provide familiar form catalog references.",
    },
    {
      name: "class-feature",
      sheet: druidWildCompanionSheet,
      source: {
        tag: "classFeatureSpellCast",
        featureUnitId: authoredUnitId("druid_wild_companion"),
        spend: { tag: "spellSlot", spellLevel: spellSlotLevel(1) },
      } as const,
      message:
        "Retained companion class-feature spell source must provide familiar form eligibility.",
    },
  ])(
    "rejects a $name source when the referenced Spell lacks familiar eligibility",
    ({ sheet, source, message }) => {
      const nonFamiliarSpell = {
        ...requiredSpellFixture("detect_magic"),
        id: authoredUnitId("find_familiar"),
      };
      expect(
        createRetainedFamiliarLikeCompanion({
          sheet: sheet(),
          unitLibrary: unitLibraryReplacing("find_familiar", nonFamiliarSpell),
          statBlockCatalog,
          companionId: retainedCompanionId(
            `companion:no-familiar-shape-${source.tag}`,
          ),
          source,
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        }),
      ).toMatchObject({ _tag: "Failure", failure: { message } });
    },
  );

  test("reports missing and non-Spell prepared Unit records as typed issues", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:bad-prepared-familiar-record",
      spellbook: ["find_familiar"],
      preparedSpells: ["find_familiar"],
    });
    const baseInput = {
      sheet,
      statBlockCatalog,
      companionId: retainedCompanionId("companion:bad-spell-record"),
      source: {
        tag: "spellSlotSpellCast" as const,
        spellId: authoredUnitId("find_familiar"),
        spellLevel: spellSlotLevel(1),
      },
      selectedForm: { tag: "normalNamedForm" as const, formId: "cat" },
      creatureTypeOverrideChoiceId: "fey" as const,
    };

    expect(
      createRetainedFamiliarLikeCompanion({
        ...baseInput,
        unitLibrary: unitLibraryReplacing("find_familiar", undefined),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Unknown Spell Unit id: find_familiar" },
    });
    expect(
      createRetainedFamiliarLikeCompanion({
        ...baseInput,
        unitLibrary: unitLibraryReplacing(
          "find_familiar",
          unitLibrary.requireUnit("class_wizard"),
        ),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Retained companion source must reference a Spell record.",
      },
    });
  });

  test("reports a catalog-missing owned companion feature as a typed issue", () => {
    expect(
      createRetainedFamiliarLikeCompanion({
        sheet: druidWildCompanionSheet(),
        unitLibrary: unitLibraryReplacing("druid_wild_companion", undefined),
        statBlockCatalog,
        companionId: retainedCompanionId("companion:missing-feature-record"),
        source: {
          tag: "classFeatureSpellCast",
          featureUnitId: authoredUnitId("druid_wild_companion"),
          spend: { tag: "spellSlot", spellLevel: spellSlotLevel(1) },
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Unknown retained companion feature Unit id: druid_wild_companion",
      },
    });
  });

  test("rejects literal-zero companion HP and nonliteral or zero recast HP", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-hp-boundaries",
      spellbook: ["find_familiar"],
    });
    const zeroHpCatalog = statBlockCatalogReplacingCatHp({
      kind: "literal",
      value: 0,
    });
    expect(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog: zeroHpCatalog,
        companionId: retainedCompanionId("companion:zero-hp"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Retained companion current HP must be positive." },
    });

    const retained = requireRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:recast-hp"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    for (const [catalog, message] of [
      [
        statBlockCatalogReplacingCatHp({
          kind: "caster_derived",
          source: "proficiency_bonus",
        }),
        "Retained companion recast requires literal Stat Block HP.",
      ],
      [zeroHpCatalog, "Retained companion current HP must be positive."],
    ] as const) {
      expect(
        createRetainedFamiliarLikeCompanion({
          sheet: retained,
          unitLibrary,
          statBlockCatalog: catalog,
          companionId: retainedCompanionId("companion:recast-hp"),
          source: {
            tag: "ritualSpell",
            spellId: authoredUnitId("find_familiar"),
          },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        }),
      ).toMatchObject({ _tag: "Failure", failure: { message } });
    }
  });

  test("rejects retained companion creation when resolved Stat Block HP is not literal", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:companion-nonliteral-hp",
      spellbook: ["find_familiar"],
    });
    const cat = statBlockCatalog.requireStatBlock("stat_block_cat");
    const nonliteralHpCat = {
      ...cat,
      statBlock: {
        ...cat.statBlock,
        hp: { kind: "caster_derived", source: "proficiency_bonus" },
      },
    } as const;
    const nonliteralHpCatalog: StatBlockCatalog = {
      getStatBlock: (id) =>
        id === "stat_block_cat"
          ? Option.some(nonliteralHpCat)
          : statBlockCatalog.getStatBlock(id),
      listStatBlocks: () => statBlockCatalog.listStatBlocks(),
      requireStatBlock: (id) =>
        id === "stat_block_cat"
          ? nonliteralHpCat
          : statBlockCatalog.requireStatBlock(id),
    };

    expect(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog: nonliteralHpCatalog,
        companionId: retainedCompanionId("companion:cat"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Retained companion creation requires literal Stat Block HP.",
      },
    });
  });

  test("rejects retained embodied companions with zero current HP", () => {
    expect(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:bad-companion-hp"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({ currentHp: Hp(0) }),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Retained companion current HP must be positive unless it disappeared at 0 HP.",
      },
    });
  });

  test.each(["", "   ", " companion "])(
    "rejects retained companions with an empty or untrimmed durable id",
    (value) => {
      expect(parseCharacterSheetRetainedCompanionId(value)).toMatchObject({
        _tag: "Failure",
        failure: {
          message: "Retained companion id must be non-empty and trimmed.",
        },
      });
    },
  );

  test("rejects a stored retained companion protocol with an unknown tag", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:unknown-companion-protocol"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({
          protocolTag: "attackExceptionFamiliarLikeOneAtATime",
        }),
      }),
    );
    const companion = characterSheetCompanion(sheet);
    expect(companion.tag).toBe("retainedOneAtATime");
    if (companion.tag !== "retainedOneAtATime") return;

    const storedSheet = {
      ...sheet,
      companion: {
        tag: "retainedOneAtATime",
        companion: {
          ...companion.companion,
          protocol: { tag: "somethingElseFamiliarLike" },
        },
      },
    };

    expect(parseCharacterSheet(storedSheet, unitLibrary)).toMatchObject({
      _tag: "Failure",
      failure: { message: "Expected retained companion protocol tag." },
    });
  });

  test("parses only positive retained companion current Hit Points", () => {
    expect(
      parseCharacterSheetRetainedCompanionCurrentHitPoints(Hp(2)),
    ).toMatchObject({
      _tag: "Success",
      value: Hp(2),
    });
    expect(
      parseCharacterSheetRetainedCompanionCurrentHitPoints(Hp(0)),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Retained companion current HP must be positive." },
    });
  });

  test.each([
    {
      name: "embodied normal form",
      manifestation: storedManifestation({
        tag: "embodiedOutsideBattle",
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      }),
      protocolTag: "ordinaryFamiliarLikeOneAtATime",
    },
    {
      name: "temporarily dismissed Beast form",
      manifestation: storedManifestation({
        tag: "temporarilyDismissed",
        selectedForm: {
          tag: "challengeRatingZeroBeast",
          statBlockId: "stat_block_cat",
        },
      }),
      protocolTag: "ordinaryFamiliarLikeOneAtATime",
    },
    {
      name: "disappeared special form",
      manifestation: storedManifestation({
        tag: "disappearedAtZeroHitPoints",
        selectedForm: { tag: "pactOfTheChainSpecialForm", formId: "sprite" },
      }),
      protocolTag: "attackExceptionFamiliarLikeOneAtATime",
    },
  ] as const)(
    "parses a stored retained companion with $name",
    ({ manifestation, protocolTag }) => {
      const result = parseStoredCharacterSheetCompanion(
        storedCompanion({ manifestation, protocolTag }),
      );

      expect(result).toMatchObject({
        _tag: "Success",
        value: {
          tag: "retainedOneAtATime",
          companion: { manifestation },
        },
      });
    },
  );

  test.each([
    {
      name: "an omitted companion",
      value: undefined,
      message: "Expected Character Sheet companion state.",
    },
    {
      name: "a null companion",
      value: null,
      message: "Expected Character Sheet companion state.",
    },
    {
      name: "a primitive companion",
      value: 1,
      message: "Expected Character Sheet companion state.",
    },
    {
      name: "an unknown companion tag",
      value: { tag: "unknown" },
      message: "Expected Character Sheet companion state.",
    },
    {
      name: "a retained tag without companion state",
      value: { tag: "retainedOneAtATime", companion: null },
      message: "Expected Character Sheet companion state.",
    },
    {
      name: "a non-string companion id",
      value: storedCompanion({ companionId: 1 }),
      message: "Retained companion requires companion id.",
    },
    {
      name: "an invalid companion id",
      value: storedCompanion({ companionId: " companion " }),
      message: "Retained companion id must be non-empty and trimmed.",
    },
    {
      name: "a primitive protocol",
      value: storedCompanion({ protocol: null }),
      message: "Expected retained companion protocol.",
    },
    {
      name: "an unknown protocol",
      value: storedCompanion({ protocol: { tag: "unknown" } }),
      message: "Expected retained companion protocol tag.",
    },
    {
      name: "a primitive manifestation",
      value: storedCompanion({ manifestation: null }),
      message: "Expected retained companion manifestation.",
    },
    {
      name: "an unknown manifestation tag",
      value: storedCompanion({ manifestation: { tag: "unknown" } }),
      message: "Expected retained companion manifestation.",
    },
    {
      name: "a primitive form",
      value: storedCompanion({
        manifestation: storedManifestation({ selectedForm: null }),
      }),
      message: "Expected retained companion form selection.",
    },
    {
      name: "an empty normal form",
      value: storedCompanion({
        manifestation: storedManifestation({
          selectedForm: { tag: "normalNamedForm", formId: "" },
        }),
      }),
      message: "Retained companion normal form requires form id.",
    },
    {
      name: "an empty Beast form",
      value: storedCompanion({
        manifestation: storedManifestation({
          selectedForm: { tag: "challengeRatingZeroBeast", statBlockId: "" },
        }),
      }),
      message: "Retained companion Beast form requires Stat Block id.",
    },
    {
      name: "an unknown special form",
      value: storedCompanion({
        manifestation: storedManifestation({
          selectedForm: {
            tag: "pactOfTheChainSpecialForm",
            formId: "synthetic_unknown",
          },
        }),
      }),
      message: "Retained companion special form requires form id.",
    },
    {
      name: "an unknown form tag",
      value: storedCompanion({
        manifestation: storedManifestation({
          selectedForm: { tag: "unknown" },
        }),
      }),
      message: "Expected retained companion form selection.",
    },
    {
      name: "an invalid creature type override",
      value: storedCompanion({
        manifestation: storedManifestation({
          creatureTypeOverride: "dragon",
        }),
      }),
      message: "Retained companion requires a creature type override.",
    },
    {
      name: "a non-string resolved Stat Block id",
      value: storedCompanion({
        manifestation: storedManifestation({ resolvedStatBlockId: 1 }),
      }),
      message: "Retained companion requires resolved Stat Block id.",
    },
    {
      name: "primitive retained companion HP",
      value: storedCompanion({
        manifestation: storedManifestation({ hitPoints: null }),
      }),
      message: "Expected retained companion hit points.",
    },
    {
      name: "zero retained companion HP",
      value: storedCompanion({
        manifestation: storedManifestation({
          hitPoints: { currentHp: 0, tempHp: 0 },
        }),
      }),
      message: "Retained companion current HP must be positive.",
    },
    {
      name: "invalid retained companion Temporary HP",
      value: storedCompanion({
        manifestation: storedManifestation({
          hitPoints: { currentHp: 1, tempHp: -1 },
        }),
      }),
      message: "Expected nonnegative HP.",
    },
  ])("rejects stored companion state with $name", ({ value, message }) => {
    expect(parseStoredCharacterSheetCompanion(value)).toMatchObject({
      _tag: "Failure",
      failure: { message },
    });
  });

  test.each([
    {
      title: "special form without attack exception",
      companion: retainedCompanionInput({
        selectedForm: { tag: "pactOfTheChainSpecialForm", formId: "sprite" },
      }),
      message:
        "Retained companion special forms require the attack-exception protocol.",
    },
  ])(
    "rejects retained companion protocol hybrids: $title",
    ({ companion, message }) => {
      expect(
        rebuildCharacterSheetFixture({
          characterId: characterSheetId("character:bad-companion-protocol"),
          build,
          currentHp: Hp(11),
          tempHp: Hp(0),
          unitLibrary,
          companion,
        }),
      ).toMatchObject({
        _tag: "Failure",
        failure: { message },
      });
    },
  );

  test("removes owner-long-rest retained companions on Long Rest", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:wild-companion"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({
          protocolTag: "ownerLongRestFamiliarLikeOneAtATime",
        }),
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

    expect(characterSheetCompanion(rested)).toEqual({ tag: "none" });
  });

  test("leaves a surviving retained companion's Hit Points and Temporary Hit Points unchanged on Long Rest (A46)", () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:familiar-rest-temp-hp"),
        build,
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
        // 1/2 HP with 1 Temporary Hit Point distinguishes no-participation
        // (1/1) from shared-rest healing (2/0) and clear-THP-only behavior (1/0).
        companion: retainedCompanionInput({
          protocolTag: "ordinaryFamiliarLikeOneAtATime",
          currentHp: Hp(1),
        }),
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));
    const companion = characterSheetCompanion(rested);

    expect(companion).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        manifestation: {
          tag: "embodiedOutsideBattle",
          hitPoints: { currentHp: Hp(1), tempHp: Hp(1) },
        },
      },
    });
  });
});

function storedManifestation(
  input: {
    readonly tag?: string;
    readonly selectedForm?: unknown;
    readonly creatureTypeOverride?: unknown;
    readonly resolvedStatBlockId?: unknown;
    readonly hitPoints?: unknown;
  } = {},
) {
  return {
    tag: input.tag ?? "embodiedOutsideBattle",
    selectedForm: Object.hasOwn(input, "selectedForm")
      ? input.selectedForm
      : { tag: "normalNamedForm", formId: "cat" },
    creatureTypeOverride: Object.hasOwn(input, "creatureTypeOverride")
      ? input.creatureTypeOverride
      : "fey",
    resolvedStatBlockId: Object.hasOwn(input, "resolvedStatBlockId")
      ? input.resolvedStatBlockId
      : authoredStatBlockId("stat_block_cat"),
    ...(input.tag === "disappearedAtZeroHitPoints"
      ? {}
      : {
          hitPoints: Object.hasOwn(input, "hitPoints")
            ? input.hitPoints
            : { currentHp: 2, tempHp: 0 },
        }),
  };
}

function storedCompanion(
  input: {
    readonly companionId?: unknown;
    readonly protocolTag?: string;
    readonly protocol?: unknown;
    readonly manifestation?: unknown;
  } = {},
) {
  return {
    tag: "retainedOneAtATime",
    companion: {
      companionId: Object.hasOwn(input, "companionId")
        ? input.companionId
        : "companion:cat",
      protocol: Object.hasOwn(input, "protocol")
        ? input.protocol
        : {
            tag: input.protocolTag ?? "ordinaryFamiliarLikeOneAtATime",
          },
      manifestation: Object.hasOwn(input, "manifestation")
        ? input.manifestation
        : storedManifestation(),
    },
  };
}

function requiredSpellFixture(unitId: string) {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} to be a Spell test fixture.`);
  }
  return unit;
}

function unitLibraryReplacing(
  unitId: string,
  replacement: UnitRecord | undefined,
): UnitCatalog {
  return {
    getUnit: (id) =>
      id === unitId
        ? replacement === undefined
          ? Option.none()
          : Option.some(replacement)
        : unitLibrary.getUnit(id),
    listUnits: () =>
      replacement === undefined
        ? unitLibrary.listUnits().filter((unit) => unit.id !== unitId)
        : unitLibrary
            .listUnits()
            .map((unit) => (unit.id === unitId ? replacement : unit)),
    requireUnit: (id) =>
      id === unitId && replacement !== undefined
        ? replacement
        : unitLibrary.requireUnit(id),
  };
}

function pactChainSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:pact-chain-helper"),
      build: {
        ...build,
        progression: {
          startingClass: classUnitId(authoredUnitId("class_warlock")),
          advancements: [],
        },
        features: [
          {
            kind: "selectedEldritchInvocation",
            selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
            selection: {
              kind: "nonRepeatable",
              invocationId: eldritchInvocationId("pact_of_the_chain"),
            },
          },
        ],
        spellcasting: warlockSpellcastingWithCantrips([]),
      },
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

function druidWildCompanionSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:wild-companion-helper"),
      build: druidCircleLandBuild({ druidLevel: 2 }),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds:
        druidWildShapeFixtureKnownFormStatBlockIds,
      statBlockCatalog,
    }),
  );
}

function statBlockCatalogReplacingCatHp(
  hp: StatBlockRecord["statBlock"]["hp"],
): StatBlockCatalog {
  const cat = statBlockCatalog.requireStatBlock("stat_block_cat");
  const replacement = {
    ...cat,
    statBlock: { ...cat.statBlock, hp },
  };
  return {
    getStatBlock: (id) =>
      id === "stat_block_cat"
        ? Option.some(replacement)
        : statBlockCatalog.getStatBlock(id),
    listStatBlocks: () =>
      statBlockCatalog
        .listStatBlocks()
        .map((statBlock) =>
          statBlock.id === "stat_block_cat" ? replacement : statBlock,
        ),
    requireStatBlock: (id) =>
      id === "stat_block_cat"
        ? replacement
        : statBlockCatalog.requireStatBlock(id),
  };
}
