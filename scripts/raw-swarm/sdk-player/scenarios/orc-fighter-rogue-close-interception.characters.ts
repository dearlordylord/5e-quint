import type {
  CharacterBuild,
  CharacterDraft,
  CreationFill,
  CreationHole,
} from "@dnd/character-creation-runtime";
import type {
  ScenarioCharacterOutcome,
  ScenarioCharacters,
} from "@dnd/scenario-character-sdk";
import type { FreshCharacterSheet } from "@dnd/character-sheet-runtime";

type BuildPlan = {
  readonly draftId: string;
  readonly characterId: string;
  readonly abilityScores: Readonly<
    Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>
  >;
  readonly draftChoices: Readonly<Record<string, readonly string[]>>;
  readonly unitChoices: Readonly<Record<string, readonly string[]>>;
  readonly unitChoiceOptionIds: Readonly<Record<string, readonly string[]>>;
  readonly loadoutChoices: Readonly<Record<string, readonly string[]>>;
};

type CompositionFailure = {
  readonly obstruction: string;
  readonly observation: Extract<
    ScenarioCharacterOutcome,
    { readonly kind: "obstructed" }
  >["observation"];
};

const fighterPlan: BuildPlan = {
  draftId: "close-interception-fighter-draft",
  characterId: "close-interception-fighter",
  abilityScores: { str: 15, con: 14, dex: 13, int: 12, wis: 10, cha: 8 },
  draftChoices: {
    "draft.progression.initial": ["Fighter 1 (Level 1 Hit Point maximum)"],
    "draft.background": ["Sage"],
    "draft.species": ["Orc"],
    "draft.languages": ["Goblin", "Dwarvish"],
    "draft.alignment": ["Lawful Good"],
  },
  unitChoices: {
    class_skill_proficiency_choice: ["Perception", "Survival"],
    class_feature_feat_choice: ["Defense"],
    weapon_mastery_options: ["Longsword", "Spear", "Flail"],
    background_ability_score_increase: ["+2 CON, +1 INT"],
    background_tool_choice: ["calligraphers_supplies"],
    origin_feat_magic_initiate_cantrip_choice: ["Fire Bolt", "Ray of Frost"],
    origin_feat_magic_initiate_level_one_spell_choice: ["Magic Missile"],
    origin_feat_magic_initiate_spellcasting_ability_choice: ["int"],
    equipment_purchase: ["Chain Mail", "Longsword", "Shield"],
  },
  unitChoiceOptionIds: {
    class_equipment_choice: ["option_c"],
    background_equipment_choice: ["option_b"],
  },
  loadoutChoices: {
    armor: ["Worn"],
    shield: ["Wielded"],
    weapon: ["Wielded one-handed"],
  },
};

const roguePlan: BuildPlan = {
  draftId: "close-interception-rogue-draft",
  characterId: "close-interception-rogue",
  abilityScores: { dex: 15, wis: 14, con: 13, int: 12, cha: 10, str: 8 },
  draftChoices: {
    "draft.progression.initial": ["Rogue 1 (Level 1 Hit Point maximum)"],
    "draft.background": ["Acolyte"],
    "draft.species": ["Orc"],
    "draft.languages": ["Goblin", "Dwarvish"],
    "draft.alignment": ["Lawful Good"],
  },
  unitChoices: {
    class_skill_proficiency_choice: [
      "Acrobatics",
      "Investigation",
      "Perception",
      "Stealth",
    ],
    weapon_mastery_options: ["Shortsword", "Dagger"],
    background_ability_score_increase: ["+2 WIS, +1 INT"],
    background_tool_choice: ["calligraphers_supplies"],
    origin_feat_magic_initiate_cantrip_choice: ["Guidance", "Sacred Flame"],
    origin_feat_magic_initiate_level_one_spell_choice: ["Healing Word"],
    origin_feat_magic_initiate_spellcasting_ability_choice: ["wis"],
    class_feature_proficiency_choice: ["Perception", "Stealth"],
    class_feature_language_choice: ["Undercommon"],
    equipment_purchase: ["Leather Armor", "Shortsword", "Shortbow"],
  },
  unitChoiceOptionIds: {
    class_equipment_choice: ["option_a"],
    background_equipment_choice: ["option_b"],
  },
  loadoutChoices: {
    armor: ["Worn"],
    weapon: ["Wielded one-handed"],
  },
};

function labelsForHole(
  plan: BuildPlan,
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
): readonly string[] | undefined {
  switch (hole.source.tag) {
    case "draft":
      return plan.draftChoices[hole.source.path];
    case "unitChoice":
      return plan.unitChoices[hole.source.choiceKey];
    case "loadout":
      return plan.loadoutChoices[hole.source.slot];
  }
}

function choiceFill(
  plan: BuildPlan,
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
): CreationFill | CompositionFailure {
  const requestedOptionIds =
    hole.source.tag === "unitChoice"
      ? plan.unitChoiceOptionIds[hole.source.choiceKey]
      : undefined;
  if (requestedOptionIds !== undefined) {
    const optionIds = requestedOptionIds.map(
      (requestedOptionId) =>
        hole.options.find(
          ({ optionId }) => String(optionId) === requestedOptionId,
        )?.optionId,
    );
    const missingOptionIds = requestedOptionIds.filter(
      (_optionId, index) => optionIds[index] === undefined,
    );
    if (missingOptionIds.length > 0) {
      return {
        obstruction: `Requested choice option ids were not surfaced for hole ${hole.holeId}.`,
        observation: {
          characterId: plan.characterId,
          holeId: hole.holeId,
          missingOptionIds,
          options: hole.options.map(({ optionId, label }) => ({
            optionId,
            label,
          })),
        },
      };
    }
    return {
      kind: "choice",
      holeId: hole.holeId,
      optionIds: optionIds.filter(
        (optionId): optionId is NonNullable<typeof optionId> =>
          optionId !== undefined,
      ),
    };
  }
  const labels = labelsForHole(plan, hole);
  if (labels === undefined) {
    return {
      obstruction: `No controller choice was specified for surfaced hole ${hole.holeId}.`,
      observation: {
        characterId: plan.characterId,
        holeId: hole.holeId,
        source: hole.source,
        options: hole.options.map(({ optionId, label }) => ({
          optionId,
          label,
        })),
      },
    };
  }
  const optionIds = labels.map(
    (label) => hole.options.find((option) => option.label === label)?.optionId,
  );
  const missingLabels = labels.filter(
    (_label, index) => optionIds[index] === undefined,
  );
  if (missingLabels.length > 0) {
    return {
      obstruction: `Requested choices were not surfaced for hole ${hole.holeId}.`,
      observation: {
        characterId: plan.characterId,
        holeId: hole.holeId,
        missingLabels,
        options: hole.options.map(({ optionId, label }) => ({
          optionId,
          label,
        })),
      },
    };
  }
  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: optionIds.filter(
      (optionId): optionId is NonNullable<typeof optionId> =>
        optionId !== undefined,
    ),
  };
}

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  const composeBuild = (
    plan: BuildPlan,
  ): CharacterBuild | CompositionFailure => {
    const parsedScores = sdk.abilityScoreAssignment(plan.abilityScores);
    if (sdk.isLeft(parsedScores)) {
      return {
        obstruction: `The public SDK rejected ${plan.characterId}'s required ability assignment.`,
        observation: {
          characterId: plan.characterId,
          issues: parsedScores.failure,
        },
      };
    }

    let draft: CharacterDraft = sdk.createCharacterDraft({
      draftId: sdk.characterDraftId(plan.draftId),
      unitLibrary: unitCatalog,
    });

    for (let step = 0; step < 12; step += 1) {
      const holes = sdk.discoverCreationHoles({
        draft,
        unitLibrary: unitCatalog,
      });
      const fills: CreationFill[] = [];
      for (const hole of holes) {
        if (hole.kind === "abilityScores") {
          fills.push({
            kind: "abilityScores",
            holeId: hole.holeId,
            method: "standardArray",
            value: parsedScores.success,
          });
          continue;
        }
        const fill = choiceFill(plan, hole);
        if ("obstruction" in fill) return fill;
        fills.push(fill);
      }

      if (fills.length === 0) {
        const finalization = sdk.finalizeCharacterDraft({
          draft,
          unitLibrary: unitCatalog,
        });
        if (finalization.tag === "ready") return finalization.build;
        return {
          obstruction: `The public SDK could not finalize ${plan.characterId} after all surfaced holes were filled.`,
          observation:
            finalization.tag === "invalid"
              ? {
                  characterId: plan.characterId,
                  issues: finalization.issues.map((issue) =>
                    sdk.characterCreationIssueMessage(issue),
                  ),
                }
              : {
                  characterId: plan.characterId,
                  holes: finalization.holes.map((hole) => hole.holeId),
                },
        };
      }

      const result = sdk.fillCreationHoles({
        draft,
        expectedRevision: draft.revision,
        fills,
        unitLibrary: unitCatalog,
      });
      if (result.tag === "rejected") {
        return {
          obstruction: `The public SDK rejected surfaced choices for ${plan.characterId}.`,
          observation: { characterId: plan.characterId, issues: result.issues },
        };
      }
      if (result.finalization.tag === "invalid") {
        return {
          obstruction: `The public SDK rejected ${plan.characterId} at finalization.`,
          observation: {
            characterId: plan.characterId,
            issues: result.finalization.issues.map((issue) =>
              sdk.characterCreationIssueMessage(issue),
            ),
          },
        };
      }
      draft = result.draft;
    }

    return {
      obstruction: `The public SDK did not converge while creating ${plan.characterId}.`,
      observation: { characterId: plan.characterId, revision: draft.revision },
    };
  };

  const composeSheet = (
    plan: BuildPlan,
  ): FreshCharacterSheet | CompositionFailure => {
    const build = composeBuild(plan);
    if ("obstruction" in build) return build;
    const sheet = sdk.createFreshCharacterSheet({
      characterId: sdk.characterSheetId(plan.characterId),
      build,
      tempHp: sdk.hp(0),
      hitPointMaximumReduction: sdk.hp(0),
      conditions: [],
      unitLibrary: unitCatalog,
    });
    if (sdk.isLeft(sheet)) {
      return {
        obstruction: `The public SDK could not create a fresh Character Sheet for ${plan.characterId}.`,
        observation: {
          characterId: plan.characterId,
          issues: sdk.characterSheetConstructionIssuesSummary(sheet.failure),
        },
      };
    }
    return sheet.success;
  };

  const fighter = composeSheet(fighterPlan);
  if ("obstruction" in fighter) return { kind: "obstructed", ...fighter };
  const rogue = composeSheet(roguePlan);
  if ("obstruction" in rogue) return { kind: "obstructed", ...rogue };

  return {
    kind: "ready",
    characterSheets: [fighter, rogue],
    observation: {
      characters: [
        {
          characterId: fighterPlan.characterId,
          identity: "Level 1 Orc Sage Fighter",
          finalAbilityScores: {
            str: 15,
            con: 16,
            dex: 13,
            int: 13,
            wis: 10,
            cha: 8,
          },
          skills: ["Perception", "Survival"],
          fightingStyle: "Defense",
          weaponMasteries: ["Longsword", "Spear", "Flail"],
          equipped: [
            "Chain Mail (worn)",
            "Shield (wielded)",
            "Longsword (one-handed)",
          ],
          magicInitiateWizard: {
            ability: "Intelligence",
            cantrips: ["Fire Bolt", "Ray of Frost"],
            spell: "Magic Missile",
          },
          languages: ["Common", "Orc", "Goblin", "Dwarvish"],
        },
        {
          characterId: roguePlan.characterId,
          identity: "Level 1 Orc Acolyte Rogue",
          finalAbilityScores: {
            dex: 15,
            wis: 16,
            con: 13,
            int: 13,
            cha: 10,
            str: 8,
          },
          skills: ["Acrobatics", "Investigation", "Perception", "Stealth"],
          expertise: ["Perception", "Stealth"],
          weaponMasteries: ["Shortsword", "Dagger"],
          equipped: ["Leather Armor (worn)", "Shortsword (one-handed)"],
          carriedRangedWeapon: "Shortbow with starting ammunition",
          magicInitiateCleric: {
            ability: "Wisdom",
            cantrips: ["Guidance", "Sacred Flame"],
            spell: "Healing Word",
          },
          languages: [
            "Common",
            "Orc",
            "Goblin",
            "Dwarvish",
            "Undercommon (Thieves' Cant choice)",
          ],
        },
      ],
      state:
        "Both sheets are fresh at full Hit Points and resources, with no conditions or expenditures.",
    },
  };
};
