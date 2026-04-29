import { describe, expect, test } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  unitChoiceKey,
  type CharacterDraft,
  type CharacterChoiceSelection,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
} from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("character creation hole discovery", () => {
  test("discovers the initial manifest draft holes from Surface records", () => {
    const draft = createCharacterDraft({
      unitLibrary,
      draftId: characterDraftId("draft:initial"),
    });
    const holes = discoverCreationHoles({ draft, unitLibrary });

    expect(holeSummary(holes)).toEqual([
      ["singleChoice", "cc:draft:draft.primaryClass", ["class_fighter"]],
      ["singleChoice", "cc:draft:draft.background", ["background_soldier"]],
      ["singleChoice", "cc:draft:draft.species", ["species_orc"]],
      ["abilityScores", "cc:draft:draft.abilityScoreGeneration", []],
      [
        "multiChoice",
        "cc:draft:draft.languages",
        [
          "Common Sign Language",
          "Draconic",
          "Dwarvish",
          "Elvish",
          "Giant",
          "Gnomish",
          "Goblin",
          "Halfling",
          "Orc",
        ],
      ],
      [
        "singleChoice",
        "cc:draft:draft.alignment",
        [
          "lawful_good",
          "neutral_good",
          "chaotic_good",
          "lawful_neutral",
          "neutral_neutral",
          "chaotic_neutral",
          "lawful_evil",
          "neutral_evil",
          "chaotic_evil",
        ],
      ],
    ]);
  });

  test("opens Fighter holes after the class selection", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.primaryClass")).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:class_fighter:fighter_skill_choices"),
    ).toMatchObject({
      kind: "multiChoice",
      min: 2,
      max: 2,
      options: [
        { optionId: "acrobatics" },
        { optionId: "animal_handling" },
        { optionId: "athletics" },
        { optionId: "history" },
        { optionId: "insight" },
        { optionId: "intimidation" },
        { optionId: "persuasion" },
        { optionId: "perception" },
        { optionId: "survival" },
      ],
    });
    expect(
      holeById(
        holes,
        "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
      ),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "defense", unitRef: { unitId: "defense" } }],
    });
    const weaponMasteryHole = holeById(
      holes,
      "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
    );
    expect(weaponMasteryHole).toMatchObject({
      kind: "multiChoice",
      min: 3,
      max: 3,
    });
    expect(optionIds(weaponMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ]),
    );
    expect(
      holeById(holes, "cc:unit:class_fighter:class_equipment_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "option_c" }],
    });
  });

  test("opens Soldier holes after class and background selections", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.background")).toBeUndefined();
    const backgroundIncreaseHole = holeById(
      holes,
      "cc:unit:background_soldier:background_ability_score_increase",
    );
    expect(backgroundIncreaseHole).toMatchObject({ kind: "singleChoice" });
    expect(optionIds(backgroundIncreaseHole)).toEqual(
      expect.arrayContaining(["two_and_one:str:con", "one_each"]),
    );
    expect(
      holeById(holes, "cc:unit:background_soldier:background_tool_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "tool_dice_set" }],
    });
    expect(
      holeById(holes, "cc:unit:background_soldier:background_equipment_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "option_a" }, { optionId: "option_b" }],
    });
    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
  });

  test("opens purchase after the manifest coin equipment path is selected", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:class_equipment_choice"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:background_soldier:background_equipment_choice"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toMatchObject({
      kind: "multiChoice",
      min: 3,
      max: 3,
      options: [
        { optionId: "armor_chain_mail" },
        { optionId: "weapon_longsword" },
        { optionId: "equipment_shield" },
      ],
    });
    expect(
      holeById(holes, "cc:unit:armor_chain_mail:loadout_armor"),
    ).toBeUndefined();
  });

  test("does not open purchase for a non-manifest background equipment path", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_a",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
  });

  test("opens loadout only for purchased equipment and suppresses filled loadout choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
          selectedChoice("armor_chain_mail", "loadout_armor", "worn"),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:armor_chain_mail:loadout_armor"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:equipment_shield:loadout_shield"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "wielded" }],
    });
    expect(
      holeById(holes, "cc:unit:weapon_longsword:loadout_weapon"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("suppresses already-filled class and background unit-choice holes", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice(
            "class_fighter",
            "fighter_skill_choices",
            "perception",
            "survival",
          ),
          selectedChoice(
            "fighter_fighting_style_l1",
            "fighter_fighting_style",
            "defense",
          ),
          selectedChoice(
            "fighter_weapon_mastery_l1",
            "fighter_weapon_mastery_choices",
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          selectedChoice(
            "background_soldier",
            "background_ability_score_increase",
            "two_and_one:str:con",
          ),
          selectedChoice(
            "background_soldier",
            "background_tool_choice",
            "tool_dice_set",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:fighter_skill_choices"),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:background_soldier:background_ability_score_increase",
      ),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:background_soldier:background_tool_choice"),
    ).toBeUndefined();
  });

  test("suppresses Soldier ability-score increase from the typed draft field", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "str",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        "cc:unit:background_soldier:background_ability_score_increase",
      ),
    ).toBeUndefined();
  });

  test("removes selected species from draft holes without adding synthetic species choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_orc",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.species")).toBeUndefined();
    expect(holes.map((hole) => hole.holeId)).not.toContain(
      "cc:unit:species_orc:species-derived-traits",
    );
  });
});

describe("character creation batch fill", () => {
  test("accepts a legal batch atomically, increments revision, and rederives holes", () => {
    const draft = createTestDraft("draft:batch-accepted");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") {
      return;
    }

    expect(draft.revision).toBe(0);
    expect(result.draft.revision).toBe(1);
    expect(result.draft.selections).toMatchObject({
      primaryClass: "class_fighter",
      advancement: {
        entries: [{ classUnitId: "class_fighter", level: 1 }],
      },
      background: "background_soldier",
      species: "species_orc",
      abilityScoreGeneration: {
        method: "standardArray",
        assignedScores: {
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        },
      },
      languages: ["Common", "Dwarvish", "Goblin"],
      alignment: { order: "lawful", morality: "good" },
    });
    expect(
      holeById(result.holes, "cc:draft:draft.primaryClass"),
    ).toBeUndefined();
    expect(
      holeById(result.holes, "cc:unit:class_fighter:fighter_skill_choices"),
    ).toMatchObject({ kind: "multiChoice" });
    expect(result.finalization).toMatchObject({ tag: "incomplete" });
  });

  test("rejects invalid choices without changing the draft", () => {
    const draft = createTestDraft("draft:batch-invalid-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.primaryClass", "background_soldier")],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "invalidChoice", fillIndex: 0 }],
    });
  });

  test("rejects non-Standard Array ability score assignments", () => {
    const draft = createTestDraft("draft:batch-invalid-ability-scores");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          value: {
            str: 20,
            dex: 20,
            con: 20,
            int: 20,
            wis: 20,
            cha: 20,
          },
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "invalidChoice", fillIndex: 0 }],
    });
  });

  test("rejects duplicate fills for the same hole", () => {
    const draft = createTestDraft("draft:batch-duplicate");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
        choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "duplicateFill", fillIndex: 1 }],
    });
  });

  test("rejects stale revisions while still reporting diagnosable fill issues", () => {
    const draft = createTestDraft("draft:batch-stale");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision + 1,
      fills: [choiceFill("cc:draft:draft.primaryClass", "background_soldier")],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "staleRevision",
      "invalidChoice",
    ]);
  });

  test("rejects wrong fill kinds and unsupported but otherwise valid choices", () => {
    const draft = createTestDraft("draft:batch-wrong-kind");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "text",
          holeId: creationHoleId("cc:draft:draft.primaryClass"),
          value: "Fighter",
        },
        choiceFill("cc:draft:draft.alignment", "neutral_good"),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "wrongFillKind",
      "unsupportedChoice",
    ]);
  });

  test("reports the unsupported selected option for multi-choice fills", () => {
    const draft = createTestDraft("draft:batch-unsupported-multi-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "multiChoice",
          holeId: creationHoleId("cc:draft:draft.languages"),
          optionIds: [
            creationChoiceOptionId("Dwarvish"),
            creationChoiceOptionId("Elvish"),
          ],
        },
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.issues).toMatchObject([
      {
        tag: "illegalFill",
        code: "unsupportedChoice",
        fillIndex: 0,
        message:
          "Unsupported choice Elvish for character creation hole: cc:draft:draft.languages",
      },
    ]);
  });

  test("replaying the same accepted batch from the same prior draft is idempotent", () => {
    const draft = createTestDraft("draft:batch-replay");
    const fills = initialManifestFills();
    const first = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });
    const second = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });

    expect(second).toEqual(first);
  });
});

describe("character creation finalization", () => {
  test("finalizes the complete Orc Soldier Fighter manifest into a legal CharacterSheet", () => {
    const draft = completeManifestDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") {
      return;
    }

    expect(result.sheet.selections.advancement).toEqual({
      entries: [{ classUnitId: "class_fighter", level: 1 }],
    });
    expect(result.sheet.abilityScores).toEqual({
      base: {
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      },
      backgroundIncrease: {
        kind: "twoAndOne",
        plusTwo: "str",
        plusOne: "con",
      },
      final: {
        str: 17,
        dex: 14,
        con: 14,
        int: 8,
        wis: 10,
        cha: 12,
      },
    });
    expect(result.sheet.hitPoints).toEqual({
      maximum: 12,
      hitDice: [{ classUnitId: "class_fighter", dieSize: 10, total: 1 }],
    });
    expect(result.sheet.proficiencies).toEqual({
      savingThrows: ["str", "con"],
      skills: ["perception", "survival", "athletics", "intimidation"],
      weaponCategories: ["simple", "martial"],
      armorTraining: ["light", "medium", "heavy", "shield"],
      tools: ["tool_dice_set"],
    });
    expect(result.sheet.equipment).toEqual({
      ownedUnitIds: [
        "armor_chain_mail",
        "weapon_longsword",
        "equipment_shield",
      ],
      loadout: {
        armor: "armor_chain_mail",
        shield: "equipment_shield",
        weapon: { unitId: "weapon_longsword", grip: "one_handed" },
      },
    });
    expect(result.sheet.resources).toEqual([
      {
        unitId: "fighter_second_wind",
        resource: {
          cap: {
            axis: "class",
            base: 2,
            kind: "threshold_tiers",
            tiers: [
              { atLevel: 4, value: 3 },
              { atLevel: 10, value: 4 },
            ],
          },
          kind: "use_count",
        },
      },
    ]);
    expect(result.sheet.unitRefs.map((ref) => ref.unitId)).toEqual([
      "class_fighter",
      "fighter_fighting_style_l1",
      "fighter_second_wind",
      "fighter_weapon_mastery_l1",
      "background_soldier",
      "feat_savage_attacker",
      "species_orc",
      "orc_adrenaline_rush",
      "orc_darkvision",
      "orc_relentless_endurance",
      "defense",
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      "armor_chain_mail",
      "equipment_shield",
    ]);
  });

  test("does not finalize incomplete or illegal drafts", () => {
    const incomplete = finalizeCharacterDraft({
      draft: createTestDraft("draft:finalize-incomplete"),
      unitLibrary,
    });
    expect(incomplete).toMatchObject({ tag: "incomplete" });

    const complete = completeManifestDraft();
    const illegalDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        advancement: {
          entries: [{ classUnitId: "class_fighter", level: 2 }],
        },
      },
    };
    const illegal = finalizeCharacterDraft({
      draft: illegalDraft,
      unitLibrary,
    });

    expect(illegal).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Finalized sheet advancement must be exactly one Fighter level.",
        },
      ],
    });
  });

  test("rejects completed drafts with non-manifest ability-score increases", () => {
    const complete = completeManifestDraft();
    const oneEachDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        backgroundAbilityScoreIncrease: { kind: "oneEach" },
      },
    };

    expect(
      finalizeCharacterDraft({ draft: oneEachDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Finalized sheet must use the phase-1 Soldier ability-score increase.",
        },
      ],
    });
  });

  test("rejects completed drafts with extra or contradictory choices", () => {
    const complete = completeManifestDraft();
    const extraChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style_l1",
            "fighter_fighting_style",
            "weapon_longsword",
          ),
        ],
      },
    };
    const duplicateChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style_l1",
            "fighter_fighting_style",
            "defense",
          ),
        ],
      },
    };

    expect(
      finalizeCharacterDraft({ draft: extraChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Finalized sheet must carry exactly the phase-1 manifest choices.",
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: duplicateChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Finalized sheet must carry exactly the phase-1 manifest choices.",
        },
      ],
    });
  });

  test("rejects duplicate or missing finalized equipment ownership", () => {
    const complete = completeManifestDraft();
    const duplicateEquipmentDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
            "equipment_shield",
          ],
        },
      },
    };
    const missingShieldDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "weapon_longsword",
          ],
        },
      },
    };

    expect(
      finalizeCharacterDraft({ draft: duplicateEquipmentDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Finalized sheet must own exactly the phase-1 purchased equipment.",
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: missingShieldDraft, unitLibrary }).tag,
    ).not.toBe("ready");
  });
});

function draftWithSelections(
  selections: Partial<CharacterDraft["selections"]>,
): CharacterDraft {
  const base = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:with-selections"),
  });

  return {
    ...base,
    selections: {
      ...base.selections,
      ...selections,
    },
  };
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
}

function initialManifestFills(): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      value: {
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      },
    },
    {
      kind: "multiChoice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function completeManifestDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-manifest");
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
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:fighter_skill_choices",
          "perception",
          "survival",
        ),
        choiceFill(
          "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
          "defense",
        ),
        multiChoiceFill(
          "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_ability_score_increase",
          "two_and_one:str:con",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_tool_choice",
          "tool_dice_set",
        ),
        choiceFill("cc:unit:class_fighter:class_equipment_choice", "option_c"),
        choiceFill(
          "cc:unit:background_soldier:background_equipment_choice",
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:equipment_purchase",
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
        choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
        choiceFill(
          "cc:unit:weapon_longsword:loadout_weapon",
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error("Expected accepted character-creation fill batch.");
  }

  return result.draft;
}

function multiChoiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "multiChoice",
    // Test fixtures pass discovered hole ids as text. Unit-backed hole ids
    // include a branded UnitChoiceKey segment, which string literals cannot
    // prove to TypeScript even when they match the runtime protocol.
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function choiceFill(holeId: string, optionId: string): CreationFill {
  return {
    kind: "choice",
    // Test fixtures pass discovered hole ids as text. Unit-backed hole ids
    // include a branded UnitChoiceKey segment, which string literals cannot
    // prove to TypeScript even when they match the runtime protocol.
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionId: creationChoiceOptionId(optionId),
  };
}

function holeSummary(
  holes: readonly CreationHole[],
): readonly (readonly [CreationHole["kind"], string, readonly string[]])[] {
  return holes.map((hole) => [
    hole.kind,
    hole.holeId,
    "options" in hole ? hole.options.map((option) => option.optionId) : [],
  ]);
}

function holeById(
  holes: readonly CreationHole[],
  holeId: string,
): CreationHole | undefined {
  return holes.find((hole) => hole.holeId === holeId);
}

function optionIds(hole: CreationHole | undefined): readonly string[] {
  return hole != null && "options" in hole
    ? hole.options.map((option) => option.optionId)
    : [];
}

function selectedChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    source: {
      tag: "unit",
      unitId,
      choiceKey: unitChoiceKey(choiceKey),
    },
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}
