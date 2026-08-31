import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

type BuildPlan = {
  readonly id: string;
  readonly scores: Readonly<
    Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>
  >;
  readonly classSkills: readonly string[];
  readonly scholarSkill: string;
  readonly cantrips: readonly string[];
  readonly spellbook: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly magicInitiateCantrips: readonly [string, string];
  readonly magicInitiateLevelOneSpell: string;
  readonly magicInitiateAbility: "int" | "wis" | "cha";
  readonly backgroundIncrease: string;
  readonly evocationSavantSpells: readonly string[];
  readonly abilityScoreIncrease: string;
};

const plans: readonly BuildPlan[] = [
  {
    id: "arena-evoker-arden",
    scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    classSkills: ["Investigation", "Medicine"],
    scholarSkill: "Arcana",
    cantrips: ["fire_bolt", "mage_hand", "minor_illusion", "ray_of_frost"],
    spellbook: [
      "burning_hands",
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "thunderwave",
      "acid_arrow",
      "flaming_sphere",
      "mirror_image",
      "misty_step",
      "scorching_ray",
      "web",
    ],
    preparedSpells: [
      "mage_armor",
      "magic_missile",
      "shield",
      "flaming_sphere",
      "misty_step",
      "scorching_ray",
      "web",
    ],
    magicInitiateCantrips: ["Chill Touch", "Shocking Grasp"],
    magicInitiateLevelOneSpell: "Burning Hands",
    magicInitiateAbility: "int",
    backgroundIncrease: "+1 CON, +1 INT, +1 WIS",
    evocationSavantSpells: ["chromatic_orb", "shatter"],
    abilityScoreIncrease: "INT +2",
  },
  {
    id: "arena-evoker-bryn",
    scores: { str: 8, dex: 13, con: 14, int: 15, wis: 12, cha: 10 },
    classSkills: ["Insight", "Nature"],
    scholarSkill: "History",
    cantrips: ["chill_touch", "fire_bolt", "light", "shocking_grasp"],
    spellbook: [
      "burning_hands",
      "grease",
      "mage_armor",
      "magic_missile",
      "shield",
      "thunderwave",
      "blur",
      "dragons_breath",
      "gust_of_wind",
      "misty_step",
      "shatter",
      "web",
    ],
    preparedSpells: [
      "mage_armor",
      "magic_missile",
      "shield",
      "dragons_breath",
      "misty_step",
      "shatter",
      "web",
    ],
    magicInitiateCantrips: ["Ray of Frost", "Minor Illusion"],
    magicInitiateLevelOneSpell: "Shield",
    magicInitiateAbility: "int",
    backgroundIncrease: "+2 INT, +1 CON",
    evocationSavantSpells: ["acid_arrow", "scorching_ray"],
    abilityScoreIncrease: "CON +1, INT +1",
  },
];

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  const characterSheets = [];

  for (const plan of plans) {
    const draft = sdk.createCharacterDraft({
      unitLibrary: unitCatalog,
      draftId: sdk.characterDraftId(`${plan.id}-build`),
    });
    const abilityScores = sdk.abilityScoreAssignment(plan.scores);
    if (sdk.isFailure(abilityScores)) {
      return {
        kind: "obstructed",
        obstruction: `The public SDK rejected ${plan.id}'s surfaced standard-array assignment.`,
        observation: {
          characterId: plan.id,
          stage: "abilityScores",
          issues: abilityScores.failure,
        },
      };
    }

    const originLabels: Readonly<Record<string, readonly string[]>> = {
      "draft.progression.initial": ["Wizard 4 (Fixed higher-level HP gain)"],
      "draft.background": ["Sage"],
      "draft.species": ["Orc"],
      "draft.languages": ["Dwarvish", "Goblin"],
      "draft.alignment": ["Lawful Good"],
    };
    const originHoles = sdk.discoverCreationHoles({
      draft,
      unitLibrary: unitCatalog,
    });
    const originResult = sdk.fillCreationHoles({
      draft,
      expectedRevision: draft.revision,
      unitLibrary: unitCatalog,
      fills: originHoles.map((hole) => {
        if (hole.kind === "abilityScores") {
          return {
            kind: "abilityScores" as const,
            holeId: hole.holeId,
            method: "standardArray" as const,
            value: abilityScores.success,
          };
        }
        const labels =
          hole.source.tag === "draft"
            ? originLabels[hole.source.path]
            : undefined;
        return {
          kind: "choice" as const,
          holeId: hole.holeId,
          optionIds: hole.options
            .filter(({ label }) => labels?.includes(label))
            .map(({ optionId }) => optionId),
        };
      }),
    });
    if (originResult.tag === "rejected") {
      return {
        kind: "obstructed",
        obstruction: `The public SDK rejected ${plan.id}'s surfaced level, origin, or identity choices.`,
        observation: {
          characterId: plan.id,
          stage: "origin",
          issues: originResult.issues,
        },
      };
    }

    const buildLabels: Readonly<Record<string, readonly string[]>> = {
      class_skill_proficiency_choice: plan.classSkills,
      class_feature_proficiency_choice: [plan.scholarSkill],
      class_feature_feat_choice: ["Ability Score Improvement"],
      class_subclass_choice: ["Evoker"],
      wizard_cantrip_choices: plan.cantrips,
      wizard_spellbook_choices: plan.spellbook,
      wizard_prepared_spell_choices: plan.preparedSpells,
      origin_feat_magic_initiate_cantrip_choice: plan.magicInitiateCantrips,
      origin_feat_magic_initiate_level_one_spell_choice: [
        plan.magicInitiateLevelOneSpell,
      ],
      origin_feat_magic_initiate_spellcasting_ability_choice: [
        plan.magicInitiateAbility,
      ],
      background_ability_score_increase: [plan.backgroundIncrease],
      background_tool_choice: ["calligraphers_supplies"],
    };
    const buildResult = sdk.fillCreationHoles({
      draft: originResult.draft,
      expectedRevision: originResult.draft.revision,
      unitLibrary: unitCatalog,
      fills: originResult.holes.map((hole) => {
        if (hole.kind === "abilityScores") {
          return {
            kind: "abilityScores" as const,
            holeId: hole.holeId,
            method: "standardArray" as const,
            value: abilityScores.success,
          };
        }
        const optionIdsByChoiceKey: Readonly<
          Partial<Record<string, readonly string[]>>
        > = {
          class_equipment_choice: ["option_a"],
          background_equipment_choice: ["option_a"],
        };
        const requestedOptionIds =
          hole.source.tag === "unitChoice"
            ? optionIdsByChoiceKey[hole.source.choiceKey]
            : undefined;
        const labels =
          hole.source.tag === "unitChoice"
            ? buildLabels[hole.source.choiceKey]
            : undefined;
        return {
          kind: "choice" as const,
          holeId: hole.holeId,
          optionIds: hole.options
            .filter(({ optionId, label }) =>
              requestedOptionIds === undefined
                ? labels?.includes(label)
                : requestedOptionIds.some(
                    (requestedOptionId) =>
                      optionId ===
                      sdk.creationChoiceOptionId(requestedOptionId),
                  ),
            )
            .map(({ optionId }) => optionId),
        };
      }),
    });
    if (buildResult.tag === "rejected") {
      return {
        kind: "obstructed",
        obstruction: `The public SDK rejected ${plan.id}'s surfaced class, spell, or standard-equipment choices.`,
        observation: {
          characterId: plan.id,
          stage: "buildChoices",
          issues: buildResult.issues,
        },
      };
    }

    const completionLabels = [
      ...plan.evocationSavantSpells,
      plan.abilityScoreIncrease,
      "Wielded one-handed",
    ];
    const completionResult = sdk.fillCreationHoles({
      draft: buildResult.draft,
      expectedRevision: buildResult.draft.revision,
      unitLibrary: unitCatalog,
      fills: buildResult.holes.map((hole) => {
        if (hole.kind === "abilityScores") {
          return {
            kind: "abilityScores" as const,
            holeId: hole.holeId,
            method: "standardArray" as const,
            value: abilityScores.success,
          };
        }
        return {
          kind: "choice" as const,
          holeId: hole.holeId,
          optionIds: hole.options
            .filter(({ label }) => completionLabels.includes(label))
            .map(({ optionId }) => optionId),
        };
      }),
    });
    if (completionResult.tag === "rejected") {
      return {
        kind: "obstructed",
        obstruction: `The public SDK rejected ${plan.id}'s surfaced ASI, Savant, or initial-loadout choices.`,
        observation: {
          characterId: plan.id,
          stage: "completion",
          issues: completionResult.issues,
        },
      };
    }

    const finalization = sdk.finalizeCharacterDraft({
      draft: completionResult.draft,
      unitLibrary: unitCatalog,
    });
    if (finalization.tag !== "ready") {
      return {
        kind: "obstructed",
        obstruction:
          finalization.tag === "invalid"
            ? `The public SDK could not finalize ${plan.id}: ${finalization.issues.map(sdk.characterCreationIssueMessage).join("; ")}`
            : `The public SDK left ${plan.id} incomplete after every surfaced creation hole was filled.`,
        observation:
          finalization.tag === "invalid"
            ? {
                characterId: plan.id,
                stage: "finalization",
                issues: finalization.issues,
              }
            : {
                characterId: plan.id,
                stage: "finalization",
                remainingHoleIds: finalization.holes.map(
                  ({ holeId }) => holeId,
                ),
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
    if (sdk.isFailure(sheet)) {
      return {
        kind: "obstructed",
        obstruction: `The public SDK finalized ${plan.id}'s build but could not create its fresh Character Sheet: ${sdk.characterSheetConstructionIssuesSummary(sheet.failure)}`,
        observation: {
          characterId: plan.id,
          stage: "freshSheet",
          issues: sheet.failure,
        },
      };
    }
    characterSheets.push(sheet.success);
  }

  return {
    kind: "ready",
    characterSheets,
    observation: {
      controller:
        "Two level-4 Orc Wizard (Evoker) adventurers; fixed higher-level Hit Point gains.",
      shared: {
        background: "Sage",
        alignment: "Lawful Good",
        languages: ["Common", "Dwarvish", "Goblin"],
        equipment:
          "Standard Wizard and Sage equipment packages; quarterstaff wielded one-handed; no purchases or magic items.",
        initialState:
          "Fresh sheets: full Hit Points and unspent slots/resources, with no Temporary Hit Points or conditions.",
      },
      characters: plans.map((plan) => ({
        characterId: plan.id,
        standardArray: plan.scores,
        backgroundAbilityIncrease: plan.backgroundIncrease,
        level4AbilityScoreIncrease: plan.abilityScoreIncrease,
        classSkills: plan.classSkills,
        scholarSkill: plan.scholarSkill,
        cantrips: plan.cantrips,
        spellbook: [...plan.spellbook, ...plan.evocationSavantSpells],
        preparedSpells: plan.preparedSpells,
        magicInitiate: {
          cantrips: plan.magicInitiateCantrips,
          levelOneSpell: plan.magicInitiateLevelOneSpell,
          spellcastingAbility: plan.magicInitiateAbility,
        },
      })),
    },
  };
};
