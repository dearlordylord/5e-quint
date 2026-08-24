import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

type CharacterPlan = {
  readonly id: string;
  readonly buildFocus: string;
  readonly skills: readonly [string, string];
  readonly cantrips: readonly [string, string, string, string];
  readonly spellbook: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  readonly prepared: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  readonly evocationSavantSpells: readonly [string, string];
};

const plans: readonly CharacterPlan[] = [
  {
    id: "beacon-warden-ember",
    buildFocus: "direct damage and area-control spells",
    skills: ["Investigation", "Medicine"],
    cantrips: ["fire_bolt", "ray_of_frost", "mage_hand", "minor_illusion"],
    spellbook: [
      "burning_hands",
      "feather_fall",
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "thunderwave",
      "flaming_sphere",
      "mirror_image",
      "misty_step",
      "shatter",
      "web",
    ],
    prepared: [
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "flaming_sphere",
      "misty_step",
      "web",
    ],
    evocationSavantSpells: ["acid_arrow", "scorching_ray"],
  },
  {
    id: "beacon-warden-veil",
    buildFocus: "control spells and defensive reactions",
    skills: ["Insight", "Investigation"],
    cantrips: ["chill_touch", "fire_bolt", "message", "minor_illusion"],
    spellbook: [
      "feather_fall",
      "fog_cloud",
      "grease",
      "hideous_laughter",
      "mage_armor",
      "magic_missile",
      "shield",
      "hold_person",
      "mirror_image",
      "misty_step",
      "shatter",
      "web",
    ],
    prepared: [
      "grease",
      "hold_person",
      "mage_armor",
      "magic_missile",
      "misty_step",
      "shield",
      "web",
    ],
    evocationSavantSpells: ["burning_hands", "scorching_ray"],
  },
  {
    id: "beacon-warden-aegis",
    buildFocus: "personal durability and persistent hazards",
    skills: ["Medicine", "Nature"],
    cantrips: ["fire_bolt", "light", "mage_hand", "ray_of_frost"],
    spellbook: [
      "expeditious_retreat",
      "false_life",
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "thunderwave",
      "blur",
      "flaming_sphere",
      "mirror_image",
      "misty_step",
      "web",
    ],
    prepared: [
      "blur",
      "flaming_sphere",
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "web",
    ],
    evocationSavantSpells: ["acid_arrow", "shatter"],
  },
  {
    id: "beacon-warden-arc",
    buildFocus: "ranged burst damage and utility spells",
    skills: ["Investigation", "Religion"],
    cantrips: ["fire_bolt", "mage_hand", "ray_of_frost", "shocking_grasp"],
    spellbook: [
      "burning_hands",
      "chromatic_orb",
      "detect_magic",
      "feather_fall",
      "mage_armor",
      "magic_missile",
      "shield",
      "acid_arrow",
      "misty_step",
      "scorching_ray",
      "shatter",
      "web",
    ],
    prepared: [
      "burning_hands",
      "mage_armor",
      "magic_missile",
      "scorching_ray",
      "shield",
      "shatter",
      "web",
    ],
    evocationSavantSpells: ["darkness", "thunderwave"],
  },
];

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  type Hole = ReturnType<typeof sdk.discoverCreationHoles>[number];
  type Fill = Parameters<typeof sdk.fillCreationHoles>[0]["fills"][number];

  const abilityScores = sdk.abilityScoreAssignment({
    str: 8,
    dex: 13,
    con: 14,
    int: 15,
    wis: 12,
    cha: 10,
  });
  if (sdk.isLeft(abilityScores)) {
    return {
      kind: "obstructed",
      obstruction:
        "The public SDK rejected the standard array needed by the four Wizard builds.",
      observation: { stage: "abilityScores", issues: abilityScores.left },
    };
  }

  const wantedLabels = (
    hole: Hole,
    plan: CharacterPlan,
  ): readonly string[] | undefined => {
    if (hole.kind !== "choice") return undefined;
    if (hole.source.tag === "loadout") return ["Wielded one-handed"];
    if (hole.source.tag === "draft") {
      const draftChoices: Partial<
        Record<typeof hole.source.path, readonly string[]>
      > = {
        "draft.progression.initial": ["Wizard 4 (Fixed higher-level HP gain)"],
        "draft.background": ["Sage"],
        "draft.species": ["Dwarf"],
        "draft.languages": ["Dwarvish", "Goblin"],
        "draft.alignment": ["Lawful Good"],
      };
      return draftChoices[hole.source.path];
    }
    const choices: Partial<
      Record<typeof hole.source.choiceKey, readonly string[]>
    > = {
      class_skill_proficiency_choice: plan.skills,
      class_feature_proficiency_choice: ["Arcana"],
      class_feature_feat_choice: ["Ability Score Improvement"],
      class_feature_ability_score_increase_choice: ["DEX +1, INT +1"],
      class_subclass_choice: ["Evoker"],
      wizard_cantrip_choices: plan.cantrips,
      wizard_prepared_spell_choices: plan.prepared,
      background_ability_score_increase: ["+2 INT, +1 CON"],
      background_tool_choice: ["calligraphers_supplies"],
      origin_feat_magic_initiate_cantrip_choice: ["Fire Bolt", "Light"],
      origin_feat_magic_initiate_level_one_spell_choice: ["Shield"],
      origin_feat_magic_initiate_spellcasting_ability_choice: ["int"],
    };
    if (hole.source.choiceKey === "wizard_spellbook_choices") {
      return hole.source.unitId === "class_wizard"
        ? plan.spellbook
        : plan.evocationSavantSpells;
    }
    return choices[hole.source.choiceKey];
  };

  const wantedOptionIds = (hole: Hole): readonly string[] | undefined => {
    if (hole.kind !== "choice" || hole.source.tag !== "unitChoice")
      return undefined;
    const optionIdsByChoiceKey: Partial<
      Record<typeof hole.source.choiceKey, readonly string[]>
    > = {
      class_equipment_choice: ["option_a"],
      background_equipment_choice: ["option_b"],
    };
    return optionIdsByChoiceKey[hole.source.choiceKey];
  };

  const fillForHole = (hole: Hole, plan: CharacterPlan): Fill | string => {
    if (hole.kind === "abilityScores") {
      return {
        kind: "abilityScores",
        holeId: hole.holeId,
        method: "standardArray",
        value: abilityScores.right,
      };
    }
    const requestedOptionIds = wantedOptionIds(hole);
    if (requestedOptionIds !== undefined) {
      const optionIds = requestedOptionIds.map(
        (requestedOptionId) =>
          hole.options.find(
            ({ optionId }) =>
              optionId === sdk.creationChoiceOptionId(requestedOptionId),
          )?.optionId,
      );
      const missing = requestedOptionIds.filter(
        (_, index) => optionIds[index] === undefined,
      );
      if (missing.length > 0) {
        return `The public hole ${hole.holeId} did not surface the planned option id(s): ${missing.join(", ")}.`;
      }
      return {
        kind: "choice",
        holeId: hole.holeId,
        optionIds: optionIds.filter((id) => id !== undefined),
      };
    }
    const labels = wantedLabels(hole, plan);
    if (labels === undefined)
      return `No controller selection is defined for ${hole.holeId}.`;
    const optionIds = labels.map(
      (label) =>
        hole.options.find((option) => option.label === label)?.optionId,
    );
    const missing = labels.filter((_, index) => optionIds[index] === undefined);
    if (missing.length > 0) {
      return `The public hole ${hole.holeId} did not surface the planned option(s): ${missing.join(", ")}.`;
    }
    return {
      kind: "choice",
      holeId: hole.holeId,
      optionIds: optionIds.filter((id) => id !== undefined),
    };
  };

  const characterSheets = [];
  for (const plan of plans) {
    let draft = sdk.createCharacterDraft({
      unitLibrary: unitCatalog,
      draftId: sdk.characterDraftId(`${plan.id}-draft`),
    });

    for (let frontier = 0; frontier < 8; frontier += 1) {
      const holes = sdk.discoverCreationHoles({
        draft,
        unitLibrary: unitCatalog,
      });
      if (holes.length === 0) break;
      const selected = holes.map((hole) => fillForHole(hole, plan));
      const selectionGap = selected.find(
        (fill): fill is string => typeof fill === "string",
      );
      if (selectionGap !== undefined) {
        return {
          kind: "obstructed",
          obstruction: selectionGap,
          observation: {
            characterId: plan.id,
            frontier,
            holeCount: holes.length,
          },
        };
      }
      const selectedFills = selected.filter(
        (fill): fill is Fill => typeof fill !== "string",
      );
      const result = sdk.fillCreationHoles({
        draft,
        unitLibrary: unitCatalog,
        fills: selectedFills,
        expectedRevision: draft.revision,
      });
      if (result.tag === "rejected") {
        return {
          kind: "obstructed",
          obstruction: `The public SDK rejected canonical selections for ${plan.id}.`,
          observation: {
            characterId: plan.id,
            frontier,
            issues: result.issues.map((issue) => issue.message),
          },
        };
      }
      draft = result.draft;
    }

    const remainingHoles = sdk.discoverCreationHoles({
      draft,
      unitLibrary: unitCatalog,
    });
    if (remainingHoles.length > 0) {
      return {
        kind: "obstructed",
        obstruction: `Character creation for ${plan.id} did not converge through the public hole protocol.`,
        observation: {
          characterId: plan.id,
          holeIds: remainingHoles.map(({ holeId }) => holeId),
        },
      };
    }
    const finalization = sdk.finalizeCharacterDraft({
      draft,
      unitLibrary: unitCatalog,
    });
    if (finalization.tag !== "ready") {
      return {
        kind: "obstructed",
        obstruction: `The public SDK could not finalize the complete draft for ${plan.id}.`,
        observation: {
          characterId: plan.id,
          finalization: finalization.tag,
          evidence:
            finalization.tag === "invalid"
              ? finalization.issues.map(sdk.characterCreationIssueMessage)
              : finalization.holes.map(({ holeId }) => holeId),
        },
      };
    }

    const sheet = sdk.createFreshCharacterSheet({
      characterId: sdk.characterSheetId(plan.id),
      build: finalization.build,
      tempHp: sdk.hp(0),
      hitPointMaximumReduction: sdk.hp(0),
      conditions: [],
      unitLibrary: unitCatalog,
    });
    if (sdk.isLeft(sheet)) {
      return {
        kind: "obstructed",
        obstruction: `The public SDK finalized ${plan.id} but could not create its fresh Character Sheet.`,
        observation: {
          characterId: plan.id,
          issues: sdk.characterSheetConstructionIssuesSummary(sheet.left),
        },
      };
    }
    characterSheets.push(sheet.right);
  }

  return {
    kind: "ready",
    characterSheets,
    observation: {
      controller: "beacon defenders",
      sdkConstraint:
        "Wizard 4 was the only exact fourth-level progression surfaced by the canonical initial creation hole.",
      sharedBuild: {
        class: "Wizard 4 (Evoker)",
        background: "Sage",
        species: "Dwarf",
        abilities:
          "standard array; +2 INT/+1 CON background increase; +1 DEX/+1 INT level-4 ASI",
        equipment: [
          "2 Daggers",
          "Arcane Focus (Quarterstaff)",
          "Robe",
          "Spellbook",
          "Scholar's Pack",
        ],
        loadout:
          "The authored starting-item bundle surfaced no initial loadout hole; the Arcane Focus (Quarterstaff) is owned but not claimed as wielded.",
      },
      characters: plans.map(
        ({
          id,
          buildFocus,
          cantrips,
          spellbook,
          prepared,
          evocationSavantSpells,
        }) => ({
          id,
          buildFocus,
          cantrips,
          spellbook: [...spellbook, ...evocationSavantSpells],
          prepared,
        }),
      ),
    },
  };
};
