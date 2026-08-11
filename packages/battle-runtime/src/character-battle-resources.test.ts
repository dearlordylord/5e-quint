import { describe, expect, test } from "vitest";
import { Either } from "effect";

import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import {
  type CharacterBattleMetamagicInit,
  characterBattleMetamagicState,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  characterResourceState,
  characterSpellcastingState,
  effectiveCharacterBattleCantrips,
  parseCharacterBattleInvocationSpellAccesses,
  parseCharacterBattleClassLevels,
} from "./character-battle-resources.ts";
import {
  characterBattleResourceIsPointPool,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
} from "./character-battle-resource-execution.ts";
import {
  abilityModifier,
  NonNegativeInteger,
  resourceCount,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";
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
  characterSeed,
  decodeUnitRecordSync,
  findFamiliarInput,
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
  if (Either.isLeft(result)) {
    throw new Error(result.left.messages.join("; "));
  }
  return result.right;
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
  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(battleStateInitIssueMessage(result.left)).toBe(message);
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
        [{ resourcePoolRef, unit }],
      ),
    ).toEqual({
      sorceryPointResourcePoolRef: resourcePoolRef,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: metamagic.knownOptions,
    });
  });

  test("does not admit a spell as a character battle resource", () => {
    expect(
      characterBattleResourceSupportedForUnit(spellRecord("acid_splash")),
    ).toBe(false);
  });

  test("deduplicates admitted cantrips by their spell identity", () => {
    const admitted = {
      spell: spellRecord("acid_splash"),
      classFeatureFreeCastResourcePoolRefs: [],
    };

    expect(
      effectiveCharacterBattleCantrips({
        cantrips: [admitted, admitted],
        bookOfShadowsSpellAccesses: [],
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

    expect(characterSpellcastingState(base, levels, [], [])).toMatchObject({
      sourceClassName: "wizard",
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
    expect(Either.isLeft(missingExpenditures)).toBe(true);
    if (Either.isLeft(missingExpenditures)) {
      expect(battleStateInitIssueMessage(missingExpenditures.left)).toBe(
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
    expect(Either.isLeft(duplicateExpenditures)).toBe(true);
    if (Either.isLeft(duplicateExpenditures)) {
      expect(battleStateInitIssueMessage(duplicateExpenditures.left)).toBe(
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
    expect(Either.isLeft(untracedFeatureSpell)).toBe(true);
    if (Either.isLeft(untracedFeatureSpell)) {
      expect(battleStateInitIssueMessage(untracedFeatureSpell.left)).toBe(
        "Feature-prepared spells must trace to a character Unit grant.",
      );
    }

    expectBattleStartIssue(
      start(
        {
          ...wizardSpellcasting({
            invocationSpellAccesses: [
              {
                tag: "pactOfTheChainFindFamiliar",
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
          sourceClassName: "fighter",
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

  test("parses supported invocation access and reports unsupported spell forms", () => {
    expect(
      parseCharacterBattleInvocationSpellAccesses([
        {
          tag: "pactOfTheChainFindFamiliar",
          spell: spellRecord("fire_bolt"),
        },
      ]),
    ).toEqual({
      tag: "issue",
      message: "Pact of the Chain Spell Access must grant Find Familiar.",
    });

    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
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
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error("Expected malformed Find Familiar spell fixture.");
    }
    expect(
      parseCharacterBattleInvocationSpellAccesses([
        {
          tag: "pactOfTheChainFindFamiliar",
          spell: malformedFindFamiliar,
        },
      ]),
    ).toEqual({
      tag: "issue",
      message:
        "Pact of the Chain Find Familiar access requires familiar form catalog references.",
    });
  });
});
