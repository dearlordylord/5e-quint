import { describe, expect, test } from "vitest";
import { Result } from "effect";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";

import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import {
  type CharacterBattleSpellListFact,
  type CharacterBattleMetamagicInit,
  characterBattleMetamagicState,
  characterBattleResourceForUnit,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  characterResourceState,
  characterSpellcastingState,
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
  parseCharacterBattleInvocationSpellAccesses,
  parseCharacterBattleClassLevels,
  projectCharacterBattleResourceFeature,
} from "./character-battle-resources.ts";
import { admitResourceFeature } from "./procedure-admission/resource-feature-admission.ts";
import {
  characterBattleResourceIsPointPool,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
} from "./character-battle-resource-execution.ts";
import {
  abilityModifier,
  NonNegativeInteger,
  proficiencyBonus,
  resourceCount,
} from "@dnd/shared/types";
import type {
  ClassName,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { classSpellListForSpellcastingClassRecord } from "@dnd/surface/surface/unit-catalog";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "./identity.ts";
import {
  bardBardicInspirationUnitId,
  bardCuttingWordsUnitId,
  fighterIndomitableUnitId,
  monkMonksFocusUnitId,
  orcAdrenalineRushUnitId,
  paladinChannelDivinityUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  bardicInspirationUnit,
  characterSeed,
  decodeUnitRecordSync,
  spawnedCompanionInput,
  spellRecord,
  startBattle,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { DISTANT_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

function classLevelsFor(
  className: ClassName,
  level: number,
): CharacterBattleClassLevels {
  const result = parseCharacterBattleClassLevels([{ className, level }]);
  if (Result.isFailure(result)) {
    throw new Error(result.failure.messages.join("; "));
  }
  return result.success;
}

function resourcePoolRefFor(resourceId: string) {
  return battleResourcePoolExecutionRef(
    battleCharacterExecutionScopeRef(
      battleId("character-battle-resources-test"),
      combatantId(resourceId),
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  );
}

function expectBattleStartIssue(
  result: ReturnType<typeof startBattle>,
  message: string,
) {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(battleStateInitIssueMessage(result.failure)).toBe(message);
  }
}

function expectBattleStartIssueContaining(
  result: ReturnType<typeof startBattle>,
  message: string,
) {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(battleStateInitIssueMessage(result.failure)).toContain(message);
  }
}

describe("character battle resource projections", () => {
  test.each([
    {
      unitId: paladinChannelDivinityUnitId,
      className: "paladin",
      level: 3,
      expected: 2,
    },
    {
      unitId: orcAdrenalineRushUnitId,
      className: "wizard",
      level: 5,
      expected: 3,
    },
    {
      unitId: monkMonksFocusUnitId,
      className: "monk",
      level: 5,
      expected: 5,
    },
    {
      unitId: fighterIndomitableUnitId,
      className: "fighter",
      level: 17,
      expected: 3,
    },
  ] as const)(
    "$unitId projects its supported resource cap",
    ({ unitId, className, level, expected }) => {
      const unit = unitLibrary.requireUnit(unitId);

      expect(
        characterBattleResourceMaxUses({
          unit,
          classLevels: classLevelsFor(className, level),
        }),
      ).toBe(expected);
    },
  );

  test("rejects a projected resource feature paired with another source Unit", () => {
    const monkFocus = unitLibrary.requireUnit(monkMonksFocusUnitId);
    const indomitable = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const admission = admitResourceFeature(monkFocus);
    if (admission.tag !== "admitted") {
      throw new Error("Expected admitted Monk Focus resource feature.");
    }

    expect(
      projectCharacterBattleResourceFeature({ unit: indomitable }, admission),
    ).toEqual({
      tag: "sourceMismatch",
      message:
        "Character battle resource feature source does not match its resource Unit: monk_monks_focus != fighter_indomitable.",
    });
  });

  test("ability-modifier caps honor a minimum and an omitted minimum", () => {
    const bardicInspiration = unitLibrary.requireUnit(
      bardBardicInspirationUnitId,
    );
    const cuttingWords = unitLibrary.requireUnit(bardCuttingWordsUnitId);

    expect(
      characterBattleResourceMaxUses({
        unit: bardicInspiration,
        classLevels: classLevelsFor("bard", 1),
        capAbilityModifier: abilityModifier(-2),
      }),
    ).toBe(1);
    expect(
      characterBattleResourceMaxUses({
        unit: cuttingWords,
        classLevels: classLevelsFor("bard", 5),
        capAbilityModifier: abilityModifier(4),
      }),
    ).toBe(4);
  });

  test("unlimited and point-pool resources keep their distinct state shapes", () => {
    const unlimitedUnit = unitLibrary.requireUnit("barbarian_retaliation");
    const pointPoolUnit = unitLibrary.requireUnit("sorcerer_font_of_magic");
    const levels = classLevelsFor("barbarian", 10);
    const sorcererLevels = classLevelsFor("sorcerer", 5);

    expect(
      characterBattleResourceMaxUses({
        unit: unlimitedUnit,
        classLevels: levels,
      }),
    ).toBeUndefined();
    expect(
      characterBattleResourceMaxPoints({
        unit: unlimitedUnit,
        classLevels: levels,
      }),
    ).toBeUndefined();
    const unlimited = characterResourceState(
      { unit: unlimitedUnit },
      levels,
      resourcePoolRefFor("unlimited"),
    );
    expect(characterBattleResourceIsUnlimited(unlimited)).toBe(true);
    expect(characterBattleResourceIsUseCount(unlimited)).toBe(true);

    expect(
      characterBattleResourceMaxPoints({
        unit: pointPoolUnit,
        classLevels: sorcererLevels,
      }),
    ).toBe(5);
    expect(
      characterBattleResourceMaxUses({
        unit: pointPoolUnit,
        classLevels: sorcererLevels,
      }),
    ).toBeUndefined();
    const points = characterResourceState(
      { unit: pointPoolUnit },
      sorcererLevels,
      resourcePoolRefFor("point-pool"),
    );
    const explicitlySpent = characterResourceState(
      { unit: pointPoolUnit, pointsRemaining: 2 },
      sorcererLevels,
      resourcePoolRefFor("point-pool-explicit"),
    );
    expect(characterBattleResourceIsPointPool(points)).toBe(true);
    expect(characterBattleResourceIsPointPool(explicitlySpent)).toBe(true);
    if (
      !characterBattleResourceIsPointPool(points) ||
      !characterBattleResourceIsPointPool(explicitlySpent)
    ) {
      throw new Error("Expected point-pool resource states.");
    }
    expect(points.pointsRemaining).toBe(resourceCount(5));
    expect(explicitlySpent.pointsRemaining).toBe(resourceCount(2));
  });

  test("projects metamagic state from its owned point-pool resource", () => {
    const unit = unitLibrary.requireUnit("sorcerer_font_of_magic");
    const classLevels = classLevelsFor("sorcerer", 5);
    const resourcePoolRef = resourcePoolRefFor("sorcery-points");
    const metamagic: CharacterBattleMetamagicInit = {
      sorceryPointResourceUnitId: unit.id,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [
        {
          effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
          stackingMode: "one_per_spell",
          sorceryPointCost: resourceCount(1),
        },
      ],
    };

    const resource = characterResourceState(
      { unit },
      classLevels,
      resourcePoolRef,
    );
    expect(
      characterBattleMetamagicState(
        metamagic,
        [resource],
        [
          {
            resourcePoolRef,
            unit,
            purpose: { tag: "unitResource" },
          },
        ],
      ),
    ).toEqual({
      sorceryPointResourcePoolRef: resourcePoolRef,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: metamagic.knownOptions,
    });
  });

  test("does not admit a spell as a character battle resource", () => {
    const spell = spellRecord("acid_splash");
    expect(characterBattleResourceSupportedForUnit(spell)).toBe(false);
    expect(() => characterBattleResourceForUnit(spell)).toThrow(
      "Character battle resources must be supported resource Units.",
    );
  });

  test("requires the projected ability modifier for an ability-scaled resource cap", () => {
    expect(() =>
      characterBattleResourceMaxUses({
        unit: bardicInspirationUnit(),
        classLevels: classLevelsFor("bard", 1),
      }),
    ).toThrow(
      "Ability-modifier resource cap requires the projected ability modifier.",
    );
  });

  test("does not project class-bound Book of Shadows spells for a Spell-Access-only caster", () => {
    const bookOfShadowsSpellAccesses = [
      {
        tag: "bookOfShadows" as const,
        bookPresence: { tag: "onPerson" as const },
        cantrips: [
          spellRecord("poison_spray"),
          spellRecord("chill_touch"),
          spellRecord("starry_wisp"),
        ] as const,
        ritualSpells: [
          spellRecord("detect_magic"),
          spellRecord("detect_poison_and_disease"),
        ] as const,
        spellcastingFocus: "book_of_shadows" as const,
      },
    ];
    const spellcastingSource = { tag: "spellAccessOnly" as const };

    expect(
      effectiveCharacterBattleCantrips({
        cantrips: [],
        bookOfShadowsSpellAccesses,
        spellcastingSource,
      }),
    ).toEqual([]);
    expect(
      effectiveCharacterBattlePreparedSpells({
        preparedSpells: [],
        bookOfShadowsSpellAccesses,
        spellcastingSource,
      }),
    ).toEqual([]);
  });

  test("deduplicates admitted cantrips by their spell identity", () => {
    const admitted = {
      spell: spellRecord("acid_splash"),
      castingSource: {
        tag: "classSpellcasting" as const,
        className: "wizard" as const,
        abilityModifier: abilityModifier(3),
      },
      spellAccessFreeCastResourcePoolRefs: [],
    };

    expect(
      effectiveCharacterBattleCantrips({
        cantrips: [admitted, admitted],
        bookOfShadowsSpellAccesses: [],
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
      }),
    ).toEqual([admitted]);
  });

  test("rejects unsupported Surface resource cap shapes", () => {
    const pointPool = unitLibrary.requireUnit("sorcerer_font_of_magic");
    if (
      pointPool.kind !== "class_feature" ||
      pointPool.mechanics.family !== "resource_pool"
    ) {
      throw new Error("Expected Sorcerer Font of Magic point-pool fixture.");
    }
    const abilityModifierPointPool = {
      ...pointPool,
      mechanics: {
        ...pointPool.mechanics,
        resource: {
          kind: "point_pool" as const,
          poolId: pointPool.mechanics.resource.poolId,
          cap: { kind: "ability_modifier" as const, ability: "cha" as const },
        },
      },
    };
    expect(
      characterBattleResourceSupportedForUnit(abilityModifierPointPool),
    ).toBe(false);

    const chargePool = {
      kind: "charge_pool" as const,
      cap: { kind: "fixed" as const, uses: 1 },
    };
    const activation = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
    if (
      activation.kind !== "species_trait" ||
      activation.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Orc Adrenaline Rush activation fixture.");
    }
    expect(
      characterBattleResourceSupportedForUnit(
        decodeUnitRecordSync({
          ...activation,
          mechanics: { ...activation.mechanics, resource: chargePool },
        }),
      ),
    ).toBe(false);

    const resourceContainer = unitLibrary.requireUnit("monk_monks_focus");
    if (
      resourceContainer.kind !== "class_feature" ||
      resourceContainer.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected Monk Focus resource-container fixture.");
    }
    expect(
      characterBattleResourceSupportedForUnit({
        ...resourceContainer,
        mechanics: {
          ...resourceContainer.mechanics,
          resource: chargePool,
        },
      }),
    ).toBe(false);

    expect(
      characterBattleResourceSupportedForUnit(
        unitLibrary.requireUnit("paladin_lay_on_hands"),
      ),
    ).toBe(false);
    expect(
      characterBattleResourceSupportedForUnit(
        unitLibrary.requireUnit("ranger_tireless"),
      ),
    ).toBe(false);
  });

  test("keeps metamagic state absent until its owned resource is admitted", () => {
    const metamagic: CharacterBattleMetamagicInit = {
      sorceryPointResourceUnitId: unitLibrary.requireUnit(
        "sorcerer_font_of_magic",
      ).id,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [],
    };

    expect(characterBattleMetamagicState(metamagic, [], [])).toBeUndefined();
  });

  test("projects valid spell-slot expenditure state", () => {
    const base = {
      ...wizardSpellcasting(),
      bookOfShadowsSpellAccesses: [],
      invocationSpellAccesses: [],
    };
    const levels = classLevelsFor("wizard", 1);

    expect(
      characterSpellcastingState(
        base,
        levels,
        [],
        [],
        battleCharacterExecutionScopeRef(
          battleId("spellcasting-state"),
          combatantId("wizard"),
          battleExecutionScopeOrdinal(0),
        ),
      ),
    ).toMatchObject({
      spellcastingSource: {
        tag: "classSpellcasting",
        className: "wizard",
        abilityModifier: 3,
      },
      bookOfShadowsSpellAccesses: [],
      spellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("validates malformed spellcasting through battle admission", () => {
    const start = (
      spellcasting: ReturnType<typeof wizardSpellcasting>,
      id: string,
      classLevels?: Parameters<typeof characterSeed>[0]["classLevels"],
    ) =>
      startBattle({
        battleId: battleId(`character-battle-resource-guard-${id}`),
        combatants: [
          characterSeed({
            initiative: 20,
            attack: null,
            ...(classLevels === undefined ? {} : { classLevels }),
            spellcasting,
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });

    const missingExpenditures = start(
      {
        ...wizardSpellcasting(),
        spellSlotExpenditures: [],
      },
      "missing-expenditures",
    );
    expect(Result.isFailure(missingExpenditures)).toBe(true);
    if (Result.isFailure(missingExpenditures)) {
      expect(battleStateInitIssueMessage(missingExpenditures.failure)).toBe(
        "Spell Slot expenditure state must match slot capacity.",
      );
    }

    const duplicateExpenditures = start(
      {
        ...wizardSpellcasting({
          spellSlots: [
            { spellLevel: 1, count: 2 },
            { spellLevel: 2, count: 1 },
          ],
        }),
        spellSlotExpenditures: [
          { spellLevel: 1, expended: 0 },
          { spellLevel: 1, expended: 0 },
        ],
      },
      "duplicate-expenditures",
    );
    expect(Result.isFailure(duplicateExpenditures)).toBe(true);
    if (Result.isFailure(duplicateExpenditures)) {
      expect(battleStateInitIssueMessage(duplicateExpenditures.failure)).toBe(
        "Spell Slot expenditure state must match slot capacity.",
      );
    }

    const untracedFeatureSpell = start(
      {
        ...wizardSpellcasting(),
        featurePreparedSpells: [
          {
            sourceUnitId: unitLibrary.requireUnit(bardBardicInspirationUnitId)
              .id,
            spell: spellRecord("magic_missile"),
          },
        ],
      },
      "untraced-feature-spell",
    );
    expect(Result.isFailure(untracedFeatureSpell)).toBe(true);
    if (Result.isFailure(untracedFeatureSpell)) {
      expect(battleStateInitIssueMessage(untracedFeatureSpell.failure)).toBe(
        "Feature-prepared spells must trace to a character Unit grant.",
      );
    }

    expectBattleStartIssue(
      start(
        {
          ...wizardSpellcasting({
            invocationSpellAccesses: [
              {
                tag: "pactOfTheChainSpawnedCompanion",
                spell: spellRecord("fire_bolt"),
              },
            ],
          }),
        },
        "unsupported-invocation",
      ),
      "Pact of the Chain Spell Access must grant Find Familiar.",
    );
    expectBattleStartIssue(
      start(
        {
          ...wizardSpellcasting(),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "fighter",
            abilityModifier: 3,
          },
          spellbookRitualSpellAccesses: [
            {
              tag: "spellbookRitual",
              spell: spellRecord("detect_magic"),
              featureUnitId: unitLibrary.requireUnit(
                bardBardicInspirationUnitId,
              ).id,
            },
          ],
        },
        "ritual-wrong-class",
      ),
      "Spellbook Ritual Spell Access requires Wizard spellcasting.",
    );
    expectBattleStartIssue(
      start(
        {
          ...wizardSpellcasting(),
          spellbookRitualSpellAccesses: [
            {
              tag: "spellbookRitual",
              spell: spellRecord("detect_magic"),
              featureUnitId: unitLibrary.requireUnit(
                bardBardicInspirationUnitId,
              ).id,
            },
          ],
        },
        "ritual-missing-owner",
      ),
      "Spellbook Ritual Spell Access must trace to an owner feature.",
    );
    expectBattleStartIssue(
      start(
        {
          ...wizardSpellcasting(),
        },
        "source-class-mismatch",
        [{ className: "fighter", level: 1 }],
      ),
      "Battle spellcasting source class must match a character class level.",
    );
  });

  test("admits direct Magic Initiate access for a noncaster only with canonical evidence", () => {
    const startDirectAccess = (
      access: ReturnType<typeof directMagicInitiateSpellAccess>,
      characterUnitRefs: Parameters<
        typeof characterSeed
      >[0]["characterUnitRefs"] = [],
    ) =>
      startBattle({
        battleId: battleId("character-battle-resource-direct-magic-initiate"),
        combatants: [
          characterSeed({
            initiative: 20,
            attack: null,
            classLevels: [{ className: "fighter", level: 1 }],
            resources: access.resources,
            characterUnitRefs,
            spellcasting: access.spellcasting,
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });

    const validAccess = directMagicInitiateSpellAccess();
    const [baseSpellAccess] = validAccess.spellcasting.spellAccesses;
    if (baseSpellAccess === undefined) {
      throw new Error("Expected Magic Initiate spell access fixture.");
    }
    const valid = startDirectAccess(validAccess);
    expect(Result.isSuccess(valid)).toBe(true);

    expectBattleStartIssue(
      startDirectAccess(
        directMagicInitiateSpellAccess({
          classCantrips: [spellRecord("fire_bolt")],
        }),
      ),
      "Spell-Access-only casting must not contain class Spell Access.",
    );

    expectBattleStartIssue(
      startDirectAccess({
        ...validAccess,
        spellcasting: {
          ...validAccess.spellcasting,
          spellAccesses: [baseSpellAccess, baseSpellAccess],
        },
      }),
      "Spell Access source-and-spell keys must be unique.",
    );

    const nonzeroLearnedCantrip = {
      ...spellRecord("ray_of_frost"),
      mechanics: {
        ...spellRecord("ray_of_frost").mechanics,
        level: 1 as const,
      },
    };
    expectBattleStartIssue(
      startDirectAccess(
        directMagicInitiateSpellAccess({
          cantrips: [nonzeroLearnedCantrip, spellRecord("acid_splash")],
        }),
      ),
      "Spell Access preparation must match the Spell Definition level.",
    );

    const alwaysPreparedLevelMismatch = startDirectAccess(
      directMagicInitiateSpellAccess({
        levelOneSpell: spellRecord("ray_of_frost"),
      }),
    );
    expectBattleStartIssueContaining(
      alwaysPreparedLevelMismatch,
      "Magic Initiate Spell Access must contain exactly one level-1 spell.",
    );

    const unownedSourceUnit = {
      ...baseSpellAccess.source.sourceUnit,
      id: authoredUnitId("synthetic_unowned_magic_initiate"),
    };
    const unownedSourceResult = startDirectAccess({
      ...validAccess,
      spellcasting: {
        ...validAccess.spellcasting,
        spellAccesses: [
          {
            ...baseSpellAccess,
            source: {
              ...baseSpellAccess.source,
              sourceUnit: unownedSourceUnit,
            },
          },
        ],
      },
    });
    expectBattleStartIssueContaining(
      unownedSourceResult,
      "Feat Spell Access must reference a character source Unit.",
    );

    const duplicateCantrips = startDirectAccess(
      directMagicInitiateSpellAccess({
        cantrips: [spellRecord("ray_of_frost"), spellRecord("ray_of_frost")],
      }),
    );
    expectBattleStartIssueContaining(
      duplicateCantrips,
      "Magic Initiate Spell Access must contain exactly two distinct cantrips.",
    );

    const missingResourceResult = startDirectAccess(
      { ...validAccess, resources: [] },
      [{ unit: baseSpellAccess.source.sourceUnit, supportProfiles: [] }],
    );
    expectBattleStartIssueContaining(
      missingResourceResult,
      "Magic Initiate Spell Access must have exactly one one-use free-cast resource for its level-1 spell.",
    );

    const fabricatedCantrip = {
      ...spellRecord("ray_of_frost"),
      id: authoredUnitId("synthetic_fabricated_cantrip"),
    };
    const fabricated = startDirectAccess(
      directMagicInitiateSpellAccess({
        cantrips: [fabricatedCantrip, spellRecord("acid_splash")],
      }),
    );
    expectBattleStartIssue(
      fabricated,
      "Magic Initiate Spell Access must reference a spell on its canonical spell list.",
    );

    const wrongList = startDirectAccess(
      directMagicInitiateSpellAccess({
        spellList: clericSpellListSource(),
      }),
    );
    expect(Result.isFailure(wrongList)).toBe(true);
    if (Result.isFailure(wrongList)) {
      expect(battleStateInitIssueMessage(wrongList.failure)).toContain(
        "Magic Initiate Spell Access list source must match its parsed source mechanics.",
      );
    }

    const mismatchedResource = startDirectAccess(
      directMagicInitiateSpellAccess({
        resourceSpellId: spellRecord("magic_missile").id,
      }),
    );
    expect(Result.isFailure(mismatchedResource)).toBe(true);
    if (Result.isFailure(mismatchedResource)) {
      expect(battleStateInitIssueMessage(mismatchedResource.failure)).toContain(
        "Magic Initiate Spell Access must have exactly one one-use free-cast resource for its level-1 spell.",
      );
    }

    const cantripFreeCast = startDirectAccess(
      directMagicInitiateSpellAccess({
        resourceSpellId: spellRecord("ray_of_frost").id,
      }),
    );
    expectBattleStartIssueContaining(
      cantripFreeCast,
      "Magic Initiate cantrip Spell Access must not have a free-cast resource.",
    );

    const malformedSourceUnit = unitLibrary.requireUnit("feat_grappler");
    if (malformedSourceUnit.kind !== "feat") {
      throw new Error("Expected malformed feat source fixture.");
    }
    expectBattleStartIssue(
      startDirectAccess(
        directMagicInitiateSpellAccess({ sourceUnit: malformedSourceUnit }),
      ),
      "Feat Spell Access source must carry supported Magic Initiate mechanics.",
    );

    expectBattleStartIssue(
      startDirectAccess(
        directMagicInitiateSpellAccess({
          spellList: {
            className: "wizard",
            cantrips: [],
            leveled: [],
          },
        }),
      ),
      "Magic Initiate Spell Access must reference a spell on its canonical spell list.",
    );
  });

  test("parses supported invocation access and reports unsupported spell forms", () => {
    expect(
      parseCharacterBattleInvocationSpellAccesses([
        {
          tag: "pactOfTheChainSpawnedCompanion",
          spell: spellRecord("fire_bolt"),
        },
      ]),
    ).toEqual({
      tag: "issue",
      message: "Pact of the Chain Spell Access must grant Find Familiar.",
    });

    const malformedSpawnedCompanion = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            {
              displayName: "Celestial",
              id: "celestial",
              overrides: {},
            },
          ],
        },
      },
    });
    if (malformedSpawnedCompanion.kind !== "spell") {
      throw new Error("Expected malformed Find Familiar spell fixture.");
    }
    expect(
      parseCharacterBattleInvocationSpellAccesses([
        {
          tag: "pactOfTheChainSpawnedCompanion",
          spell: malformedSpawnedCompanion,
        },
      ]),
    ).toEqual({
      tag: "issue",
      message:
        "Pact of the Chain Find Familiar access requires familiar form catalog references.",
    });
  });
});

function directMagicInitiateSpellAccess(
  input: {
    readonly sourceUnit?: Extract<UnitRecord, { readonly kind: "feat" }>;
    readonly cantrips?: readonly [SpellRecord, SpellRecord];
    readonly levelOneSpell?: SpellRecord;
    readonly spellList?: CharacterBattleSpellListFact;
    readonly resourceSpellId?: SpellRecord["id"];
    readonly classCantrips?: readonly SpellRecord[];
  } = {},
) {
  const defaultSource = unitLibrary.requireUnit("feat_magic_initiate_wizard");
  if (
    defaultSource.kind !== "feat" ||
    defaultSource.mechanics.family !== "magic_initiate"
  ) {
    throw new Error("Expected Magic Initiate source fixture.");
  }
  const source = input.sourceUnit ?? defaultSource;
  const cantrips = input.cantrips ?? [
    spellRecord("ray_of_frost"),
    spellRecord("acid_splash"),
  ];
  const levelOneSpell = input.levelOneSpell ?? spellRecord("burning_hands");
  const resource = {
    unit: source,
    spellAccessFreeCast: {
      spellId: input.resourceSpellId ?? levelOneSpell.id,
      count: 1,
    },
    usesRemaining: 1,
  } as const;
  return {
    resources: [resource],
    spellcasting: {
      spellcastingSource: { tag: "spellAccessOnly" as const },
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: input.classCantrips ?? [],
      preparedSpells: [],
      featurePreparedSpells: [],
      spellAccesses: [
        {
          source: {
            tag: "feat" as const,
            sourceUnit: source,
            spellList: input.spellList ?? wizardSpellListSource(),
          },
          spellcastingAbilityModifier: 3,
          cantrips,
          levelOneSpell,
        },
      ],
      spellbookRitualSpellAccesses: [],
      invocationSpellAccesses: [],
      spellSlots: [],
    },
  };
}

function wizardSpellListSource(): CharacterBattleSpellListFact {
  const wizard = unitLibrary.requireUnit("class_wizard");
  if (
    wizard.kind !== "class" ||
    wizard.className !== "wizard" ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    throw new Error("Expected Wizard spell-list source.");
  }
  return {
    className: wizard.className,
    ...classSpellListForSpellcastingClassRecord(wizard),
  };
}

function clericSpellListSource(): CharacterBattleSpellListFact {
  const cleric = unitLibrary.requireUnit("class_cleric");
  if (
    cleric.kind !== "class" ||
    cleric.className !== "cleric" ||
    cleric.spellcasting === undefined
  ) {
    throw new Error("Expected Cleric spell-list source.");
  }
  return {
    className: cleric.className,
    ...classSpellListForSpellcastingClassRecord(cleric),
  };
}
