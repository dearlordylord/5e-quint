import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Either, ParseResult, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  NonNegativeInteger,
  PositiveInteger,
  abilityScore,
} from "@dnd/shared/types";

import {
  boundedChoiceCardinality,
  characterBuildCatalogEquipmentItem,
  characterBuildFact,
  classUnitId,
  characterDraftId,
  characterDraconicAncestrySelection,
  characterCreationBatchFact,
  characterCreationIssueMessage,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  creationChoiceOptionId,
  creationFillFact,
  CreationFillFactSchema,
  creationFillIndex,
  creationFinalizationFact,
  creationFrontierFact,
  creationHoleFact,
  creationHoleId,
  decodeCharacterBuildFact,
  decodeCharacterCreationBatchFact,
  decodeCreationFillFact,
  decodeCreationFinalizationRejectionFact,
  decodeCreationFrontierFact,
  decodeCreationHoleFact,
  draftRevision,
  eldritchInvocationId,
  exactChoiceCardinality,
  copperPieceAmount,
  loadoutEquipmentUnitId,
  sorcererMetamagicOptionId,
  toolProficiencyId,
  unitChoiceKey,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterBuildProjectionCause,
  type CharacterCreationBatchFact,
  type CreationBatchFillResult,
  type CreationChoiceOptionDecodeCause,
  type CreationFinalizationIllegalCause,
  type CreationFinalizationUnsupportedCause,
  type CreationHole,
} from "./index.ts";

function projectedBatchFact(
  result: CreationBatchFillResult,
): CharacterCreationBatchFact {
  const projection = characterCreationBatchFact(result);
  if (Either.isLeft(projection)) {
    throw new Error("Expected the synthetic owner result to project.");
  }
  return projection.right;
}

function parseErrorMessage(
  result: Either.Either<unknown, ParseResult.ParseError>,
): string {
  if (Either.isRight(result)) {
    throw new Error("Expected the synthetic malformed fact to be rejected.");
  }
  return ParseResult.TreeFormatter.formatErrorSync(result.left);
}

type ExpandProperty<Value, Key extends PropertyKey> =
  Value extends Record<Key, infer Member>
    ? Member extends unknown
      ? Omit<Value, Key> & { readonly [Property in Key]: Member }
      : never
    : never;

type ExpandStructuredCause<Cause> = Cause extends {
  readonly tag: "invalidAbilityScoreIncreaseValue";
}
  ? ExpandProperty<Cause, "reason">
  : Cause extends { readonly tag: "missingStartingClassFacts" }
    ? ExpandProperty<Cause, "projection">
    : Cause extends {
          readonly tag: "classFeatureLanguageChoiceCountMismatch";
        }
      ? ExpandProperty<Cause, "mismatch">
      : Cause extends {
            readonly tag: "invalidChoiceOption";
            readonly reason: infer Reason;
          }
        ? Omit<Cause, "reason"> & {
            readonly reason: ExpandStructuredCause<Reason>;
          }
        : Cause extends {
              readonly tag:
                | "unsupportedToolProficiency"
                | "unreadableUnit"
                | "unknownUnit";
            }
          ? Cause extends { readonly source: string }
            ? ExpandProperty<Cause, "source">
            : ExpandProperty<Cause, "role">
          : Cause;

type StructuredCauseKey<Cause> = Cause extends {
  readonly tag: "invalidAbilityScoreIncreaseValue";
  readonly field: infer Field extends string;
  readonly reason: infer Reason extends string;
}
  ? `invalidAbilityScoreIncreaseValue:${Field}:${Reason}`
  : Cause extends {
        readonly tag: "missingStartingClassFacts";
        readonly projection: infer Projection extends string;
      }
    ? `missingStartingClassFacts:${Projection}`
    : Cause extends {
          readonly tag: "classFeatureLanguageChoiceCountMismatch";
          readonly mismatch: {
            readonly tag: infer Mismatch extends string;
          };
        }
      ? `classFeatureLanguageChoiceCountMismatch:${Mismatch}`
      : Cause extends {
            readonly tag: "abilityScoreCapExceeded";
            readonly source: infer Source extends string;
          }
        ? `abilityScoreCapExceeded:${Source}`
        : Cause extends {
              readonly tag: "invalidChoiceOption";
              readonly reason: infer Reason;
            }
          ? `invalidChoiceOption:${StructuredCauseKey<Reason>}`
          : Cause extends {
                readonly tag: "unsupportedToolProficiency";
                readonly source: infer Source extends string;
              }
            ? `unsupportedToolProficiency:${Source}`
            : Cause extends {
                  readonly tag: "unreadableUnit";
                  readonly role: infer Role extends string;
                  readonly issues: readonly {
                    readonly code: infer Code extends string;
                  }[];
                }
              ? `unreadableUnit:${Role}:${Code}`
              : Cause extends {
                    readonly tag: "unknownUnit";
                    readonly role: infer Role extends string;
                  }
                ? `unknownUnit:${Role}`
                : Cause extends { readonly tag: infer Tag extends string }
                  ? Tag
                  : never;

function exhaustiveStructuredCauseCases<
  Cause extends { readonly tag: string },
>() {
  type ExpandedCause = ExpandStructuredCause<Cause>;
  return <const Cases extends readonly ExpandedCause[]>(
    cases: Cases &
      ([StructuredCauseKey<ExpandedCause>] extends [
        StructuredCauseKey<Cases[number]>,
      ]
        ? unknown
        : never),
  ): Cases => cases;
}

function syntheticChoiceHole(): Extract<CreationHole, { kind: "choice" }> {
  const cardinality = exactChoiceCardinality(1);
  if (cardinality === undefined) {
    throw new Error("Expected the literal positive cardinality to parse.");
  }
  return {
    kind: "choice",
    holeId: creationHoleId("cc:draft:draft.background"),
    source: { tag: "draft", path: "draft.background" },
    cardinality,
    options: [
      {
        optionId: creationChoiceOptionId("background_synthetic_guard"),
        label: "Synthetic Guard",
      },
    ],
  };
}

function syntheticBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_synthetic")),
      advancements: [],
    },
    background: authoredUnitId("background_synthetic_guard"),
    species: authoredUnitId("species_synthetic"),
    originLanguages: ["Common", "Dwarvish", "Elvish"],
    classFeatureLanguages: [],
    alignment: { order: "neutral", morality: "neutral" },
    abilityScores: {
      str: abilityScore(10),
      dex: abilityScore(10),
      con: abilityScore(10),
      int: abilityScore(10),
      wis: abilityScore(10),
      cha: abilityScore(10),
    },
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

describe("Character Creation owner facts", () => {
  test("projects the ordered Hole frontier without presentation fields", () => {
    const fact = creationFrontierFact([syntheticChoiceHole()]);

    expect(fact).toEqual({
      holes: [
        {
          kind: "choice",
          holeId: "cc:draft:draft.background",
          source: { tag: "draft", path: "draft.background" },
          cardinality: { tag: "exactly", count: 1 },
          options: [{ optionId: "background_synthetic_guard" }],
        },
      ],
    });
    expect(decodeCreationFrontierFact(fact)._tag).toBe("Right");
  });

  test("projects every durable Character Build fact shape", () => {
    const parsedEquipmentUnitIds = {
      armor: characterEquipmentItemUnitId("synthetic_armor"),
      shield: characterEquipmentItemUnitId("synthetic_shield"),
      main: characterEquipmentItemUnitId("synthetic_main_weapon"),
      off: characterEquipmentItemUnitId("synthetic_off_hand_weapon"),
    };
    const parsedMetamagicOptionId = sorcererMetamagicOptionId(
      "sorcerer_empowered_spell",
    );
    for (const parsedUnitId of Object.values(parsedEquipmentUnitIds)) {
      expect(Either.isRight(parsedUnitId)).toBe(true);
    }
    expect(Either.isRight(parsedMetamagicOptionId)).toBe(true);
    if (
      Either.isLeft(parsedEquipmentUnitIds.armor) ||
      Either.isLeft(parsedEquipmentUnitIds.shield) ||
      Either.isLeft(parsedEquipmentUnitIds.main) ||
      Either.isLeft(parsedEquipmentUnitIds.off) ||
      Either.isLeft(parsedMetamagicOptionId)
    ) {
      expect.fail("Expected synthetic Character Build ids to parse.");
    }

    const armorItemId = characterEquipmentItemId({
      slot: "armor",
      unitId: parsedEquipmentUnitIds.armor.right,
    });
    const shieldItemId = characterEquipmentItemId({
      slot: "shield",
      unitId: parsedEquipmentUnitIds.shield.right,
    });
    const mainWeaponItemId = characterEquipmentItemId({
      slot: "main",
      unitId: parsedEquipmentUnitIds.main.right,
    });
    const offHandWeaponItemId = characterEquipmentItemId({
      slot: "off",
      unitId: parsedEquipmentUnitIds.off.right,
    });
    const syntheticUnitId = authoredUnitId("synthetic_unit");
    const build = {
      ...syntheticBuild(),
      progression: {
        startingClass: classUnitId(authoredUnitId("class_synthetic")),
        advancements: [
          {
            classUnitId: classUnitId(authoredUnitId("class_synthetic")),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      },
      speciesSize: "small",
      speciesChoiceFacts: {
        draconicAncestry: {
          kind: "draconicAncestry",
          ancestorId: characterDraconicAncestrySelection("synthetic_ancestor"),
        },
      },
      classFeatureLanguages: [
        {
          kind: "classFeatureLanguageGrant",
          sourceUnitId: syntheticUnitId,
          language: "Giant",
        },
        {
          kind: "classFeatureLanguageChoice",
          sourceUnitId: syntheticUnitId,
          language: "Gnomish",
        },
      ],
      proficiencyChoices: [
        { kind: "skill", skill: "arcana" },
        { kind: "skill_expertise", skill: "history" },
        { kind: "weapon_category", category: "simple" },
        { kind: "armor_category", category: "light" },
        { kind: "tool", toolId: toolProficiencyId("thieves_tools") },
      ],
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: syntheticUnitId,
          unitId: authoredUnitId("synthetic_choice_without_option"),
        },
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: syntheticUnitId,
          unitId: authoredUnitId("synthetic_choice_with_option"),
          selectedOption: {
            kind: "huntersPrey",
            selection: "nearbyDifferentTargetSameWeaponAttack",
          },
        },
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: syntheticUnitId,
          selection: {
            kind: "nonRepeatable",
            invocationId: eldritchInvocationId("synthetic_non_repeatable"),
          },
        },
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: syntheticUnitId,
          selection: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("synthetic_known_cantrip"),
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: authoredUnitId("synthetic_cantrip"),
            },
          },
        },
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: syntheticUnitId,
          selection: {
            kind: "repeatable",
            invocationId: eldritchInvocationId("synthetic_origin_feat"),
            repeatableChoice: {
              kind: "originFeat",
              featUnitId: authoredUnitId("synthetic_feat"),
            },
          },
        },
        {
          kind: "selectedSorcererMetamagicOption",
          selectedFromUnitId: syntheticUnitId,
          optionId: parsedMetamagicOptionId.right,
        },
        {
          kind: "abilityCheckBonus",
          selectedFromUnitId: syntheticUnitId,
          ability: "int",
          skills: ["arcana", "history"],
          bonus: {
            kind: "abilityModifier",
            ability: "int",
            minimum: 1,
          },
        },
      ],
      spellcasting: {
        sources: [
          {
            sourceUnitId: syntheticUnitId,
            spellcastingAbility: "int",
            cantrips: [authoredUnitId("synthetic_cantrip")],
            spellbook: [authoredUnitId("synthetic_spellbook_spell")],
            preparedSpells: [authoredUnitId("synthetic_prepared_spell")],
            spellcastingFocuses: [],
          },
          {
            sourceUnitId: authoredUnitId("synthetic_book_source"),
            spellcastingAbility: "cha",
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: ["book_of_shadows"],
            bookOfShadows: {
              tag: "bookOfShadows",
              cantrips: [
                authoredUnitId("synthetic_book_cantrip_a"),
                authoredUnitId("synthetic_book_cantrip_b"),
                authoredUnitId("synthetic_book_cantrip_c"),
              ],
              ritualSpells: [
                authoredUnitId("synthetic_book_ritual_a"),
                authoredUnitId("synthetic_book_ritual_b"),
              ],
              spellcastingFocus: "book_of_shadows",
            },
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
      equipment: {
        startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
        owned: [
          {
            kind: "catalogItem",
            itemId: armorItemId,
            quantity: PositiveInteger(1),
          },
          {
            kind: "catalogItem",
            itemId: shieldItemId,
            quantity: PositiveInteger(1),
          },
          {
            kind: "catalogItem",
            itemId: mainWeaponItemId,
            quantity: PositiveInteger(1),
          },
          {
            kind: "catalogItem",
            itemId: offHandWeaponItemId,
            quantity: PositiveInteger(1),
          },
          {
            kind: "authoredStartingItem",
            itemName: "Synthetic adventuring pack",
            quantity: PositiveInteger(1),
          },
          {
            kind: "selectedToolItem",
            toolProficiencyId: toolProficiencyId("thieves_tools"),
            quantity: PositiveInteger(1),
          },
        ],
        loadout: {
          armor: armorItemId,
          shield: shieldItemId,
          weapon: { itemId: mainWeaponItemId, grip: "one_handed" },
        },
      },
    } as const satisfies CharacterBuild;

    const fact = characterBuildFact(build);
    expect(decodeCharacterBuildFact(fact)).toHaveProperty("_tag", "Right");
    expect(fact).not.toHaveProperty("equipment.owned.0.unitId");
    expect(fact.speciesChoiceFacts).toEqual({
      draconicAncestry: {
        kind: "draconicAncestry",
        ancestorId: "synthetic_ancestor",
      },
    });
    expect(
      characterBuildCatalogEquipmentItem({ itemId: mainWeaponItemId }),
    ).toEqual({
      kind: "catalogItem",
      itemId: mainWeaponItemId,
      quantity: PositiveInteger(1),
    });

    const offHandWeaponFact = characterBuildFact({
      ...build,
      equipment: {
        ...build.equipment,
        loadout: {
          armor: armorItemId,
          weapon: { itemId: mainWeaponItemId, grip: "one_handed" },
          offHandWeapon: { itemId: offHandWeaponItemId },
        },
      },
    });
    expect(offHandWeaponFact.equipment.loadout).toHaveProperty(
      "offHandWeapon.itemId",
      offHandWeaponItemId,
    );

    const focusFact = characterBuildFact({
      ...build,
      equipment: {
        ...build.equipment,
        owned: [
          ...build.equipment.owned,
          {
            kind: "authoredCatalogItem",
            itemId: mainWeaponItemId,
            authoredItemId: "synthetic_arcane_focus_staff",
            spellcastingFocusKind: "arcane",
            quantity: PositiveInteger(1),
          },
        ],
        loadout: {
          ...build.equipment.loadout,
          weapon: {
            itemId: mainWeaponItemId,
            grip: "one_handed",
          },
        },
      },
    });
    expect(focusFact.equipment.loadout.weapon).toMatchObject({
      itemId: mainWeaponItemId,
      grip: "one_handed",
    });
    expect(focusFact.equipment.owned).toContainEqual(
      expect.objectContaining({
        kind: "authoredCatalogItem",
        authoredItemId: "synthetic_arcane_focus_staff",
        spellcastingFocusKind: "arcane",
      }),
    );
    expect(decodeCharacterBuildFact(focusFact)).toHaveProperty("_tag", "Right");

    const gnomishFact = characterBuildFact({
      ...build,
      speciesChoiceFacts: {
        gnomishLineage: {
          kind: "gnomishLineage",
          lineageId: "rock_gnome",
          spellcastingAbility: "int",
        },
      },
    });
    expect(gnomishFact.speciesChoiceFacts).toEqual({
      gnomishLineage: {
        kind: "gnomishLineage",
        lineageId: "rock_gnome",
        spellcastingAbility: "int",
      },
    });
  });

  test("projects a build without spellcasting slot pools", () => {
    const fact = characterBuildFact(syntheticBuild());

    expect(fact.spellcasting).toBeUndefined();
    expect(decodeCharacterBuildFact(fact)._tag).toBe("Right");
  });

  test("round-trips exact Magic Initiate spell-access selections", () => {
    const fact = characterBuildFact({
      ...syntheticBuild(),
      magicInitiateSpellAccesses: [
        {
          featUnitId: authoredUnitId("synthetic_magic_initiate"),
          spellcastingAbility: "int",
          cantrips: [
            authoredUnitId("synthetic_cantrip_a"),
            authoredUnitId("synthetic_cantrip_b"),
          ],
          levelOneSpell: authoredUnitId("synthetic_level_one_spell"),
        },
      ],
    });

    expect(fact.magicInitiateSpellAccesses).toEqual([
      {
        featUnitId: "synthetic_magic_initiate",
        spellcastingAbility: "int",
        cantrips: ["synthetic_cantrip_a", "synthetic_cantrip_b"],
        levelOneSpell: "synthetic_level_one_spell",
      },
    ]);
    expect(decodeCharacterBuildFact(fact)).toHaveProperty("_tag", "Right");
    expect(
      decodeCharacterBuildFact({
        ...fact,
        magicInitiateSpellAccesses: [
          { ...fact.magicInitiateSpellAccesses[0], cantrips: ["only_one"] },
        ],
      }),
    ).toHaveProperty("_tag", "Left");
  });

  test("omits only the absent spellcasting slot-pool variant", () => {
    const ordinaryOnly = characterBuildFact({
      ...syntheticBuild(),
      spellcasting: {
        sources: [
          {
            sourceUnitId: authoredUnitId("synthetic_spellcasting_source"),
            spellcastingAbility: "int",
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: [],
          },
        ],
        slotPools: {
          spellcasting: {
            kind: "spellcasting",
            slots: [{ spellLevel: 1, count: 2 }],
          },
        },
      },
    });
    expect(ordinaryOnly.spellcasting?.slotPools).toEqual({
      spellcasting: {
        kind: "spellcasting",
        slots: [{ spellLevel: 1, count: 2 }],
      },
    });

    const pactOnly = characterBuildFact({
      ...syntheticBuild(),
      spellcasting: {
        sources: [
          {
            sourceUnitId: authoredUnitId("synthetic_pact_magic_source"),
            spellcastingAbility: "cha",
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: [],
          },
        ],
        slotPools: {
          pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
        },
      },
    });
    expect(pactOnly.spellcasting?.slotPools).toEqual({
      pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
    });
  });

  test("projects ready finalization and stale-batch rejection facts", () => {
    const build = syntheticBuild();
    expect(creationFinalizationFact({ tag: "ready", build })).toEqual({
      tag: "ready",
      build: characterBuildFact(build),
    });
    expect(
      projectedBatchFact({
        tag: "accepted",
        draft: {
          draftId: characterDraftId("draft-ready"),
          revision: draftRevision(1),
          selections: { choices: [] },
        },
        holes: [],
        finalization: { tag: "ready", build },
      }),
    ).toEqual({
      tag: "accepted",
      frontier: { holes: [] },
      finalization: { tag: "ready", build: characterBuildFact(build) },
    });

    const batchFact = projectedBatchFact({
      tag: "rejected",
      draft: {
        draftId: characterDraftId("draft-stale"),
        revision: draftRevision(1),
        selections: { choices: [] },
      },
      holes: [],
      issues: [
        {
          tag: "illegalBatch",
          code: "staleRevision",
          message: "presentation prose",
        },
      ],
      finalization: {
        tag: "invalid",
        issues: [
          {
            tag: "illegalFinalization",
            cause: { tag: "draftIncomplete" },
          },
        ],
      },
    });

    expect(batchFact).toEqual({
      tag: "rejected",
      frontier: { holes: [] },
      issues: [{ tag: "illegalBatch", code: "staleRevision" }],
      finalization: {
        tag: "invalid",
        issues: [
          {
            tag: "illegalFinalization",
            cause: { tag: "draftIncomplete" },
          },
        ],
      },
    });
    expect(decodeCharacterCreationBatchFact(batchFact)._tag).toBe("Right");
  });

  test("reports each cross-field fact invariant in decoder diagnostics", () => {
    const holeFact = creationHoleFact(syntheticChoiceHole());
    expect(
      parseErrorMessage(
        decodeCreationHoleFact({ ...holeFact, holeId: "not-a-hole-id" }),
      ),
    ).toContain("invalid Creation Hole id");
    expect(
      parseErrorMessage(
        decodeCreationHoleFact({
          ...holeFact,
          cardinality: { tag: "between", min: 2, max: 1 },
        }),
      ),
    ).toContain("cardinality maximum must be at least its minimum");
    expect(
      parseErrorMessage(
        decodeCreationHoleFact({
          ...holeFact,
          holeId: "cc:draft:draft.species",
        }),
      ),
    ).toContain("Creation Hole identity must match its owner source");

    const buildFact = characterBuildFact(syntheticBuild());
    expect(
      parseErrorMessage(
        decodeCharacterBuildFact({
          ...buildFact,
          equipment: {
            ...buildFact.equipment,
            startingEquipmentCurrencyRemainderCp: -1,
          },
        }),
      ),
    ).toContain("invalid copper-piece amount");
    expect(
      parseErrorMessage(
        decodeCharacterBuildFact({
          ...buildFact,
          originLanguages: ["Dwarvish", "Elvish", "Giant"],
        }),
      ),
    ).toContain("origin languages must contain Common and two others");
    expect(
      parseErrorMessage(
        decodeCharacterBuildFact({
          ...buildFact,
          equipment: {
            startingEquipmentCurrencyRemainderCp:
              buildFact.equipment.startingEquipmentCurrencyRemainderCp,
            owned: [
              {
                kind: "catalogItem",
                itemId: "not-an-equipment-item-id",
                quantity: 1,
              },
            ],
            loadout: {},
          },
        }),
      ),
    ).toContain("invalid Character Equipment Item id");
    expect(
      parseErrorMessage(
        decodeCharacterBuildFact({
          ...buildFact,
          equipment: {
            startingEquipmentCurrencyRemainderCp:
              buildFact.equipment.startingEquipmentCurrencyRemainderCp,
            owned: [
              {
                kind: "selectedToolItem",
                toolProficiencyId: "not-a-tool",
                quantity: 1,
              },
            ],
            loadout: {},
          },
        }),
      ),
    ).toContain("invalid Character Build tool proficiency id");

    const speciesHole: Extract<CreationHole, { kind: "choice" }> = {
      ...syntheticChoiceHole(),
      holeId: creationHoleId("cc:draft:draft.species"),
      source: { tag: "draft", path: "draft.species" },
    };
    expect(
      parseErrorMessage(
        decodeCharacterCreationBatchFact({
          tag: "accepted",
          frontier: creationFrontierFact([syntheticChoiceHole(), speciesHole]),
          finalization: {
            tag: "incomplete",
            blockingHoleIds: [
              "cc:draft:draft.species",
              "cc:draft:draft.background",
            ],
          },
        }),
      ),
    ).toContain(
      "finalization blocker ids must be an ordered subsequence of the frontier",
    );
  });

  test("projects every Hole source, cardinality, option, and Fill shape", () => {
    const unitId = unitChoiceSourceUnitId("synthetic_feature");
    const choiceKey = unitChoiceKey("class_feature_feat_choice");
    const equipmentUnitId = loadoutEquipmentUnitId("synthetic_equipment");
    const between = boundedChoiceCardinality({ min: 1, max: 2 });
    const exact = exactChoiceCardinality(1);
    expect(Either.isRight(unitId)).toBe(true);
    expect(Either.isRight(choiceKey)).toBe(true);
    expect(Either.isRight(equipmentUnitId)).toBe(true);
    expect(between).toBeDefined();
    expect(exact).toBeDefined();
    if (
      Either.isLeft(unitId) ||
      Either.isLeft(choiceKey) ||
      Either.isLeft(equipmentUnitId) ||
      between === undefined ||
      exact === undefined
    ) {
      expect.fail("Expected synthetic Hole source facts to parse.");
    }

    const unitChoiceHole = {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.background"),
      source: {
        tag: "unitChoice",
        unitId: unitId.right,
        choiceKey: choiceKey.right,
      },
      cardinality: between,
      options: [
        {
          optionId: creationChoiceOptionId("synthetic_without_ref"),
          label: "Synthetic without ref",
        },
        {
          optionId: creationChoiceOptionId("synthetic_with_ref"),
          label: "Synthetic with ref",
          unitRef: { unitId: authoredUnitId("synthetic_ref") },
        },
        {
          optionId: creationChoiceOptionId("synthetic_with_selected_option"),
          label: "Synthetic with selected option",
          unitRef: {
            unitId: authoredUnitId("synthetic_selected_ref"),
            selectedOption: {
              kind: "huntersPrey",
              selection: "nearbyDifferentTargetSameWeaponAttack",
            },
          },
        },
      ],
    } as const satisfies CreationHole;
    const loadoutHole = {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.background"),
      source: {
        tag: "loadout",
        equipmentUnitId: equipmentUnitId.right,
        slot: "weapon",
      },
      cardinality: exact,
      options: [
        {
          optionId: creationChoiceOptionId("synthetic_loadout"),
          label: "Synthetic loadout",
        },
      ],
    } as const satisfies CreationHole;
    const abilityScoresHole = {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.background"),
      source: { tag: "draft", path: "draft.abilityScoreGeneration" },
      methods: ["standardArray", "pointBuy"],
    } as const satisfies CreationHole;

    for (const hole of [unitChoiceHole, loadoutHole, abilityScoresHole]) {
      const fact = creationHoleFact(hole);
      expect(decodeCreationHoleFact(fact)).toHaveProperty("_tag", "Right");
    }
    expect(
      creationFillFact({
        kind: "abilityScores",
        holeId: abilityScoresHole.holeId,
        method: "standardArray",
        value: syntheticBuild().abilityScores,
      }),
    ).toEqual({
      kind: "abilityScores",
      holeId: abilityScoresHole.holeId,
      method: "standardArray",
      value: syntheticBuild().abilityScores,
    });
  });

  test("derives canonical Hole identity from the owner source", () => {
    const hole = {
      ...syntheticChoiceHole(),
      holeId: creationHoleId("cc:draft:draft.species"),
    };

    expect(creationFrontierFact([hole]).holes[0]?.holeId).toBe(
      "cc:draft:draft.background",
    );
  });

  test("retains ordered Fill identity while rejecting schema excess", () => {
    const fact = creationFillFact({
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.background"),
      optionIds: [
        creationChoiceOptionId("background_synthetic_guard"),
        creationChoiceOptionId("background_synthetic_sage"),
      ],
    });

    if (fact.kind !== "choice") {
      throw new Error("Expected a choice Fill fact.");
    }
    expect(fact.optionIds).toEqual([
      "background_synthetic_guard",
      "background_synthetic_sage",
    ]);
    expect(
      decodeCreationFillFact({ ...fact, label: "presentation" })._tag,
    ).toBe("Left");
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CreationFillFactSchema)({
          ...fact,
          optionIds: [fact.optionIds[0], fact.optionIds[0]],
        }),
      ),
    ).toBe(true);
  });

  test("projects owner rejections without draft protocol state or prose", () => {
    const hole = syntheticChoiceHole();
    const result: CreationBatchFillResult = {
      tag: "rejected",
      draft: {
        draftId: characterDraftId("draft-private"),
        revision: draftRevision(0),
        selections: { choices: [] },
      },
      holes: [hole],
      issues: [
        {
          tag: "illegalFill",
          holeId: hole.holeId,
          fillIndex: creationFillIndex(0),
          code: "unsupportedChoice",
          message: "presentation prose",
        },
      ],
      finalization: { tag: "incomplete", holes: [hole] },
    };

    const fact = projectedBatchFact(result);

    expect(fact).toEqual({
      tag: "rejected",
      frontier: creationFrontierFact([hole]),
      issues: [
        {
          tag: "illegalFill",
          holeId: "cc:draft:draft.background",
          fillIndex: 0,
          code: "unsupportedChoice",
        },
      ],
      finalization: {
        tag: "incomplete",
        blockingHoleIds: ["cc:draft:draft.background"],
      },
    });
    expect(fact).not.toHaveProperty("draft");
    expect(decodeCharacterCreationBatchFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: ["cc:draft:draft.species"],
        },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: [
            "cc:draft:draft.background",
            "cc:draft:draft.background",
          ],
        },
      })._tag,
    ).toBe("Left");
  });

  test("requires finalization blocker identity to follow frontier order", () => {
    const backgroundHole = syntheticChoiceHole();
    const speciesHoleTemplate = syntheticChoiceHole();
    const speciesHole: CreationHole = {
      ...speciesHoleTemplate,
      holeId: creationHoleId("cc:draft:draft.species"),
      source: { tag: "draft", path: "draft.species" },
    };
    const result: CreationBatchFillResult = {
      tag: "accepted",
      draft: {
        draftId: characterDraftId("draft-private"),
        revision: draftRevision(0),
        selections: { choices: [] },
      },
      holes: [backgroundHole, speciesHole],
      finalization: {
        tag: "incomplete",
        holes: [backgroundHole, speciesHole],
      },
    };
    const fact = projectedBatchFact(result);

    expect(decodeCharacterCreationBatchFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: [
            "cc:draft:draft.species",
            "cc:draft:draft.background",
          ],
        },
      })._tag,
    ).toBe("Left");
  });

  test("returns a typed projection failure for inconsistent owner results", () => {
    const frontierHole = syntheticChoiceHole();
    const absentBlockingHole: Extract<CreationHole, { kind: "choice" }> = {
      ...syntheticChoiceHole(),
      holeId: creationHoleId("cc:draft:draft.species"),
      source: { tag: "draft", path: "draft.species" },
    };

    expect(
      characterCreationBatchFact({
        tag: "accepted",
        draft: {
          draftId: characterDraftId("draft-private"),
          revision: draftRevision(0),
          selections: { choices: [] },
        },
        holes: [frontierHole],
        finalization: { tag: "incomplete", holes: [absentBlockingHole] },
      })._tag,
    ).toBe("Left");
  });

  test("distinguishes finalization blockers from the fillable frontier", () => {
    const hole = syntheticChoiceHole();

    expect(
      creationFinalizationFact({ tag: "incomplete", holes: [hole] }),
    ).toEqual({
      tag: "incomplete",
      blockingHoles: creationFrontierFact([hole]).holes,
    });
  });

  test("projects finalization rejections without duplicate codes or prose", () => {
    expect(
      creationFinalizationFact({
        tag: "invalid",
        issues: [
          {
            tag: "characterBuildProjection",
            cause: {
              tag: "invalidChoiceOption",
              optionId: "synthetic_option",
              reason: { tag: "invalidAbilityScoreIncreaseEncoding" },
            },
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          tag: "characterBuildProjection",
          cause: {
            tag: "invalidChoiceOption",
            optionId: "synthetic_option",
            reason: { tag: "invalidAbilityScoreIncreaseEncoding" },
          },
        },
      ],
    });
  });

  test("retains distinct structured finalization causes without prose", () => {
    expect(
      creationFinalizationFact({
        tag: "invalid",
        issues: [
          {
            tag: "illegalFinalization",
            cause: { tag: "multiplePactMagicSlotPools" },
          },
          {
            tag: "characterBuildProjection",
            cause: {
              tag: "abilityScoreCapExceeded",
              source: "classFeature",
              ability: "str",
              maximum: abilityScore(20),
              excess: PositiveInteger(1),
            },
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          cause: { tag: "multiplePactMagicSlotPools" },
        },
        {
          tag: "characterBuildProjection",
          cause: {
            tag: "abilityScoreCapExceeded",
            source: "classFeature",
            ability: "str",
            maximum: 20,
            excess: 1,
          },
        },
      ],
    });
  });

  test("projects and explains every structured finalization cause", () => {
    const syntheticUnitId = authoredUnitId("synthetic_unit");
    const syntheticFeatureUnitId = authoredUnitId("synthetic_feature");
    const syntheticOptionId = creationChoiceOptionId("synthetic_option");
    const illegalCauses =
      exhaustiveStructuredCauseCases<CreationFinalizationIllegalCause>()([
        { tag: "draftIncomplete" },
        {
          tag: "conflictingSpeciesChoiceSources",
          speciesUnitId: syntheticUnitId,
        },
        {
          tag: "missingDraconicAncestrySource",
          speciesUnitId: syntheticUnitId,
        },
        {
          tag: "invalidDraconicAncestrySelection",
          speciesUnitId: syntheticUnitId,
        },
        {
          tag: "multipleSpeciesLineageSources",
          speciesUnitId: syntheticUnitId,
        },
        {
          tag: "invalidGnomishLineageSelection",
          traitUnitId: syntheticUnitId,
        },
        { tag: "multipleSpellcastingSlotPools" },
        { tag: "multiplePactMagicSlotPools" },
      ]);
    const unsupportedCauses =
      exhaustiveStructuredCauseCases<CreationFinalizationUnsupportedCause>()([
        { tag: "unsupportedBackground" },
        { tag: "unsupportedSpecies" },
        { tag: "speciesSizeMismatch" },
        { tag: "draconicAncestryMismatch" },
        { tag: "unsupportedProgression" },
        { tag: "unsupportedAbilityScoreGeneration" },
        { tag: "unsupportedBackgroundAbilityScoreIncrease" },
        { tag: "manifestLanguagesMismatch" },
        { tag: "manifestAlignmentMismatch" },
        { tag: "unsupportedChoices" },
        { tag: "selectedFeatPrerequisitesNotMet" },
        { tag: "duplicateMagicInitiateSpellList" },
        { tag: "missingSpellcastingFacts" },
        { tag: "preparedSpellSelectionMismatch" },
        { tag: "duplicateWizardSpellbookSelection" },
        { tag: "unsupportedEquipmentSelection" },
      ]);
    const choiceOptionDecodeCauses =
      exhaustiveStructuredCauseCases<CreationChoiceOptionDecodeCause>()([
        { tag: "unsupportedAbility" },
        { tag: "duplicateAbilities" },
        {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "increase",
          reason: "nonPositive",
        },
        {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "increase",
          reason: "unsafeInteger",
        },
        {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "maximum",
          reason: "nonPositive",
        },
        {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "maximum",
          reason: "unsafeInteger",
        },
        {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "maximum",
          reason: "maximumOutOfRange",
        },
        { tag: "invalidAbilityScoreIncreaseEncoding" },
        { tag: "unsupportedWeaponCategory" },
        { tag: "unsupportedArmorCategory" },
        { tag: "unsupportedToolProficiencyId" },
        { tag: "invalidProficiencyEncoding" },
        { tag: "unsupportedCharacterBuildToolProficiencyId" },
      ]);
    const projectionCauses =
      exhaustiveStructuredCauseCases<CharacterBuildProjectionCause>()([
        {
          tag: "missingStartingClassFacts",
          projection: "characterBuild",
          classUnitId: syntheticUnitId,
        },
        {
          tag: "missingStartingClassFacts",
          projection: "hitPoints",
          classUnitId: syntheticUnitId,
        },
        {
          tag: "missingStartingClassFacts",
          projection: "proficiencies",
          classUnitId: syntheticUnitId,
        },
        {
          tag: "missingStartingClassFacts",
          projection: "armorTraining",
          classUnitId: syntheticUnitId,
        },
        {
          tag: "missingHitPointMaximumGrantSourceUnit",
          sourceUnitId: syntheticFeatureUnitId,
        },
        {
          tag: "unsupportedHitPointMaximumGrant",
          sourceUnitId: syntheticFeatureUnitId,
        },
        {
          tag: "unsupportedClassFeatureLanguage",
          featureUnitId: syntheticFeatureUnitId,
          languageId: "Synthetic",
        },
        {
          tag: "duplicateClassFeatureLanguage",
          featureUnitId: syntheticFeatureUnitId,
          language: "Common",
        },
        {
          tag: "missingClassFeatureLanguageChoice",
          featureUnitId: syntheticFeatureUnitId,
        },
        {
          tag: "classFeatureLanguageChoiceCountMismatch",
          featureUnitId: syntheticFeatureUnitId,
          mismatch: {
            tag: "missing",
            receivedCount: NonNegativeInteger(1),
            missingCount: PositiveInteger(2),
          },
        },
        {
          tag: "classFeatureLanguageChoiceCountMismatch",
          featureUnitId: syntheticFeatureUnitId,
          mismatch: {
            tag: "extra",
            expectedCount: PositiveInteger(1),
            extraCount: PositiveInteger(2),
          },
        },
        {
          tag: "unsupportedClassFeatureLanguageChoice",
          featureUnitId: syntheticFeatureUnitId,
          optionId: syntheticOptionId,
        },
        {
          tag: "duplicateClassFeatureLanguageChoice",
          featureUnitId: syntheticFeatureUnitId,
          language: "Common",
        },
        {
          tag: "unprojectableAbilityCheckBonus",
          featureUnitId: syntheticFeatureUnitId,
          optionId: syntheticOptionId,
        },
        {
          tag: "unsupportedEquipmentUnitId",
          equipmentUnitId: syntheticUnitId,
        },
        {
          tag: "unsupportedEquipmentCost",
          equipmentUnitId: syntheticUnitId,
          costGp: -1,
        },
        {
          tag: "unsupportedStartingCurrency",
          sourceUnitId: syntheticUnitId,
          coinsGp: -1,
        },
        {
          tag: "currencySumOutsideCopperPieceAmountRange",
          source: "selectedEquipmentPurchases",
          components: [copperPieceAmount(1), copperPieceAmount(2)],
        },
        {
          tag: "startingCurrencyInsufficientForEquipmentPurchases",
          availableCp: copperPieceAmount(1),
          purchaseCostCp: copperPieceAmount(2),
        },
        {
          tag: "unreadableUnit",
          role: "class",
          unitId: syntheticUnitId,
          issues: [{ code: "unsupportedUnitKind" }],
        },
        {
          tag: "unreadableUnit",
          role: "background",
          unitId: syntheticUnitId,
          issues: [{ code: "unsupportedUnitKind" }],
        },
        {
          tag: "unreadableUnit",
          role: "species",
          unitId: syntheticUnitId,
          issues: [{ code: "unsupportedUnitKind" }],
        },
        {
          tag: "unknownUnit",
          role: "class",
          unitId: syntheticUnitId,
        },
        {
          tag: "unknownUnit",
          role: "background",
          unitId: syntheticUnitId,
        },
        {
          tag: "unknownUnit",
          role: "species",
          unitId: syntheticUnitId,
        },
        {
          tag: "unknownUnit",
          role: "feat",
          unitId: syntheticUnitId,
        },
        {
          tag: "abilityScoreCapExceeded",
          source: "background",
          ability: "str",
          excess: PositiveInteger(1),
        },
        {
          tag: "abilityScoreCapExceeded",
          source: "classFeature",
          ability: "str",
          maximum: abilityScore(20),
          excess: PositiveInteger(1),
        },
        {
          tag: "unsupportedToolProficiency",
          source: "background",
          toolId: "synthetic_tool",
        },
        {
          tag: "unsupportedToolProficiency",
          source: "surfaceGrant",
          toolId: "synthetic_tool",
        },
        ...choiceOptionDecodeCauses.map(
          (reason) =>
            ({
              tag: "invalidChoiceOption",
              optionId: syntheticOptionId,
              reason,
            }) satisfies CharacterBuildProjectionCause,
        ),
      ]);

    const issues = [
      ...illegalCauses.map((cause) => ({
        tag: "illegalFinalization" as const,
        cause,
      })),
      ...unsupportedCauses.map((cause) => ({
        tag: "unsupportedFinalization" as const,
        cause,
      })),
      ...projectionCauses.map((cause) => ({
        tag: "characterBuildProjection" as const,
        cause,
      })),
    ];

    for (const issue of issues) {
      expect(characterCreationIssueMessage(issue)).not.toHaveLength(0);
      const projection = creationFinalizationFact({
        tag: "invalid",
        issues: [issue],
      });
      expect(projection).toEqual({
        tag: "invalid",
        issues: [issue],
      });
      if (projection.tag !== "invalid") {
        expect.fail("Expected an invalid finalization fact.");
      }
      expect(
        decodeCreationFinalizationRejectionFact(projection.issues[0]),
      ).toHaveProperty("_tag", "Right");
    }
  });

  test("rejects presentation prose and excess fields inside structured causes", () => {
    const rejection = {
      tag: "characterBuildProjection",
      cause: {
        tag: "abilityScoreCapExceeded",
        source: "background",
        ability: "str",
        excess: PositiveInteger(1),
      },
    } as const;

    expect(decodeCreationFinalizationRejectionFact(rejection)._tag).toBe(
      "Right",
    );
    expect(
      decodeCreationFinalizationRejectionFact({
        ...rejection,
        message: "presentation prose",
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        ...rejection,
        cause: { ...rejection.cause, excess: 0 },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        ...rejection,
        cause: { ...rejection.cause, maximum: 20 },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        tag: "characterBuildProjection",
        cause: {
          tag: "classFeatureLanguageChoiceCountMismatch",
          featureUnitId: "synthetic_feature",
          mismatch: {
            tag: "missing",
            receivedCount: 1,
            missingCount: 0,
          },
        },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        ...rejection,
        cause: { ...rejection.cause, detail: "untyped detail" },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        tag: "characterBuildProjection",
        cause: {
          tag: "invalidChoiceOption",
          optionId: "synthetic_option",
          reason: {
            tag: "invalidAbilityScoreIncreaseValue",
            field: "increase",
            reason: "maximumOutOfRange",
          },
        },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCreationFinalizationRejectionFact({
        tag: "characterBuildProjection",
        cause: {
          tag: "classFeatureLanguageChoiceCountMismatch",
          featureUnitId: "synthetic_feature",
          mismatch: {
            tag: "extra",
            expectedCount: 0,
            extraCount: 1,
          },
        },
      })._tag,
    ).toBe("Left");
  });

  test("exhaustively projects nested count mismatch causes", () => {
    const mismatchWithPresentation = {
      tag: "missing" as const,
      receivedCount: NonNegativeInteger(1),
      missingCount: PositiveInteger(1),
      label: "presentation",
    };

    expect(
      creationFinalizationFact({
        tag: "invalid",
        issues: [
          {
            tag: "characterBuildProjection",
            cause: {
              tag: "classFeatureLanguageChoiceCountMismatch",
              featureUnitId: authoredUnitId("synthetic_feature"),
              mismatch: mismatchWithPresentation,
            },
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          tag: "characterBuildProjection",
          cause: {
            tag: "classFeatureLanguageChoiceCountMismatch",
            featureUnitId: "synthetic_feature",
            mismatch: {
              tag: "missing",
              receivedCount: 1,
              missingCount: 1,
            },
          },
        },
      ],
    });
  });

  test("preserves ordered Surface reader issue details without prose", () => {
    expect(
      creationFinalizationFact({
        tag: "invalid",
        issues: [
          {
            tag: "characterBuildProjection",
            cause: {
              tag: "unreadableUnit",
              role: "class",
              unitId: authoredUnitId("synthetic_class"),
              issues: [
                { code: "unsupportedUnitKind" },
                { code: "unsupportedUnitKind" },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          tag: "characterBuildProjection",
          cause: {
            tag: "unreadableUnit",
            role: "class",
            unitId: "synthetic_class",
            issues: [
              { code: "unsupportedUnitKind" },
              { code: "unsupportedUnitKind" },
            ],
          },
        },
      ],
    });
  });

  test("projects finalized Character Build facts through the strict schema", () => {
    const fact = characterBuildFact(syntheticBuild());

    expect(fact).toEqual(syntheticBuild());
    expect(decodeCharacterBuildFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterBuildFact({ ...fact, displayName: "Nope" })._tag,
    ).toBe("Left");
  });

  test("projects owned equipment once through its canonical item identity", () => {
    const build = syntheticBuild();
    const equipmentUnitId = characterEquipmentItemUnitId(
      authoredUnitId("weapon_synthetic"),
    );
    if (equipmentUnitId._tag === "Left") {
      throw new Error("Expected the synthetic equipment Unit id to parse.");
    }
    const itemId = characterEquipmentItemId({
      slot: "main",
      unitId: equipmentUnitId.right,
    });
    const fact = characterBuildFact({
      ...build,
      equipment: {
        startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
        owned: [
          {
            kind: "catalogItem",
            itemId,
            quantity: PositiveInteger(1),
          },
        ],
        loadout: {
          weapon: { itemId, grip: "one_handed" },
        },
      },
    });

    expect(fact.equipment.owned).toEqual([
      { kind: "catalogItem", itemId, quantity: 1 },
    ]);
    expect(decodeCharacterBuildFact(fact)._tag).toBe("Right");
  });
});
