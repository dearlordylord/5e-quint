import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  let draft = sdk.createCharacterDraft({
    draftId: sdk.characterDraftId("raw-swarm:external-controller"),
    unitLibrary: unitCatalog,
  });
  for (let pass = 0; pass < 8; pass += 1) {
    const holes = sdk.discoverCreationHoles({
      draft,
      unitLibrary: unitCatalog,
    });
    if (holes.length === 0) break;
    const fills = holes.map((hole) => {
      if (hole.kind === "abilityScores") {
        const scores = sdk.abilityScoreAssignment({
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        });
        if (sdk.isFailure(scores))
          throw new Error("Standard Array was rejected.");
        return {
          kind: "abilityScores" as const,
          holeId: hole.holeId,
          method: "standardArray" as const,
          value: scores.success,
        };
      }
      const key =
        hole.source.tag === "draft"
          ? hole.source.path
          : hole.source.tag === "unitChoice"
            ? hole.source.choiceKey
            : hole.source.slot;
      const requested =
        key === "draft.progression.initial"
          ? [
              hole.options.find(({ optionId }) =>
                String(optionId).includes(":class_fighter:level_1:"),
              )?.optionId,
            ]
          : key === "draft.background"
            ? ["background_soldier"]
            : key === "draft.species"
              ? ["species_orc"]
              : key === "draft.languages"
                ? ["Dwarvish", "Goblin"]
                : key === "draft.alignment"
                  ? ["lawful_good"]
                  : key === "class_skill_proficiency_choice"
                    ? ["perception", "survival"]
                    : key === "class_feature_feat_choice"
                      ? ["defense"]
                      : key === "weapon_mastery_options"
                        ? [
                            "weapon_longsword",
                            "weapon_dagger",
                            "weapon_shortsword",
                          ]
                        : key === "class_equipment_choice"
                          ? ["option_c"]
                          : key === "background_ability_score_increase"
                            ? ["two_and_one:str:con"]
                            : key === "background_tool_choice"
                              ? ["tool_dice_set"]
                              : key === "background_equipment_choice"
                                ? ["option_b"]
                                : key === "equipment_purchase"
                                  ? [
                                      "armor_chain_mail",
                                      "weapon_longsword",
                                      "equipment_shield",
                                    ]
                                  : key === "armor"
                                    ? ["worn"]
                                    : key === "shield"
                                      ? ["wielded"]
                                      : key === "weapon"
                                        ? ["wielded_one_handed"]
                                        : [];
      const optionIds = requested.map((requestedId) => {
        const option = hole.options.find(
          ({ optionId }) => optionId === requestedId,
        );
        if (option === undefined) {
          throw new Error(
            `Required surfaced option was absent: ${String(requestedId)}`,
          );
        }
        return option.optionId;
      });
      return { kind: "choice" as const, holeId: hole.holeId, optionIds };
    });
    const filled = sdk.fillCreationHoles({
      draft,
      fills,
      expectedRevision: draft.revision,
      unitLibrary: unitCatalog,
    });
    if (filled.tag !== "accepted") {
      throw new Error("Canonical fill batch was rejected.");
    }
    draft = filled.draft;
  }
  const finalized = sdk.finalizeCharacterDraft({
    draft,
    unitLibrary: unitCatalog,
  });
  if (finalized.tag !== "ready") {
    return {
      kind: "obstructed",
      obstruction: "Canonical Fighter build did not finalize.",
      observation: { finalization: finalized.tag },
    };
  }
  const sheet = sdk.createFreshCharacterSheet({
    characterId: sdk.characterSheetId("raw-swarm:external-fighter"),
    build: finalized.build,
    tempHp: sdk.hp(0),
    hitPointMaximumReduction: sdk.hp(0),
    conditions: [],
    unitLibrary: unitCatalog,
  });
  if (sdk.isFailure(sheet)) {
    return {
      kind: "obstructed",
      obstruction: sdk.characterSheetConstructionIssuesSummary(sheet.failure),
      observation: { phase: "fresh-sheet" },
    };
  }
  return {
    kind: "ready",
    characterSheets: [sheet.success],
    observation: { characterIds: [sheet.success.characterId] },
  };
};
