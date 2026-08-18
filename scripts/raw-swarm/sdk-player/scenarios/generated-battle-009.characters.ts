import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

const preferredLabels = (holeId: string): readonly string[] => {
  if (holeId.endsWith("draft.progression.initial")) {
    return ["Fighter 1 (Level 1 Hit Point maximum)"];
  }
  if (holeId.endsWith("draft.background")) return ["Soldier"];
  if (holeId.endsWith("draft.species")) return ["Orc"];
  if (holeId.endsWith("draft.languages")) return ["Goblin", "Dwarvish"];
  if (holeId.endsWith("draft.alignment")) return ["Lawful Good"];
  if (holeId.includes("class_skill_proficiency_choice")) {
    return ["Perception", "Survival"];
  }
  if (holeId.includes("class_feature_feat_choice")) return ["Defense"];
  if (holeId.includes("weapon_mastery_options")) {
    return ["Longsword", "Spear", "Flail"];
  }
  if (holeId.includes("class_equipment_choice")) return ["option_a (4 GP)"];
  if (holeId.includes("background_ability_score_increase"))
    return ["+2 STR, +1 CON"];
  if (holeId.includes("background_tool_choice")) return ["Dice Set"];
  if (holeId.includes("background_equipment_choice"))
    return ["option_a (14 GP)"];
  return [];
};

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  let draft = sdk.createCharacterDraft({
    draftId: sdk.characterDraftId("generated-battle-009-controller-build"),
    unitLibrary: unitCatalog,
  });
  const abilityScores = sdk.abilityScoreAssignment({
    str: 15,
    dex: 13,
    con: 14,
    int: 8,
    wis: 12,
    cha: 10,
  });
  if (sdk.isLeft(abilityScores)) {
    return {
      kind: "obstructed",
      obstruction:
        "The public SDK rejected the proposed Standard Array assignment.",
      observation: { stage: "ability-score-construction" },
    };
  }

  const selections: { holeId: string; labels: readonly string[] }[] = [];
  for (let frontier = 0; frontier < 20; frontier += 1) {
    const holes = sdk.discoverCreationHoles({
      draft,
      unitLibrary: unitCatalog,
    });
    if (holes.length === 0) break;

    const fills = [];
    for (const hole of holes) {
      if (hole.kind === "abilityScores") {
        fills.push({
          kind: "abilityScores" as const,
          holeId: hole.holeId,
          method: "standardArray" as const,
          value: abilityScores.right,
        });
        selections.push({
          holeId: hole.holeId,
          labels: ["Standard Array: 15/13/14/8/12/10"],
        });
        continue;
      }

      const count =
        hole.cardinality.tag === "exactly"
          ? hole.cardinality.count
          : hole.cardinality.min;
      const preferences = preferredLabels(hole.holeId);
      const selected = preferences
        .map((label) => hole.options.find((option) => option.label === label))
        .filter((option) => option !== undefined)
        .slice(0, count);
      if (selected.length !== count) {
        return {
          kind: "obstructed",
          obstruction:
            "The public SDK surfaced a required choice without a faithful controller selection.",
          observation: {
            holeId: hole.holeId,
            requiredCount: count,
            options: hole.options.map(({ label }) => label),
          },
        };
      }
      fills.push({
        kind: "choice" as const,
        holeId: hole.holeId,
        optionIds: selected.map(({ optionId }) => optionId),
      });
      selections.push({
        holeId: hole.holeId,
        labels: selected.map(({ label }) => label),
      });
    }

    const result = sdk.fillCreationHoles({
      draft,
      fills,
      expectedRevision: draft.revision,
      unitLibrary: unitCatalog,
    });
    if (result.tag === "rejected") {
      return {
        kind: "obstructed",
        obstruction:
          "The public SDK rejected choices selected from its current canonical frontier.",
        observation: {
          issues: result.issues.map(({ message }) => message),
          selections,
        },
      };
    }
    draft = result.draft;
  }

  const finalization = sdk.finalizeCharacterDraft({
    draft,
    unitLibrary: unitCatalog,
  });
  if (finalization.tag !== "ready") {
    return {
      kind: "obstructed",
      obstruction:
        finalization.tag === "incomplete"
          ? "Character creation still has required holes after the supported fill loop."
          : "The public SDK could not finalize the completed canonical draft.",
      observation:
        finalization.tag === "incomplete"
          ? {
              holes: finalization.holes.map(({ holeId }) => holeId),
              selections,
            }
          : {
              issues: finalization.issues.map((issue) =>
                sdk.characterCreationIssueMessage(issue),
              ),
              selections,
            },
    };
  }

  const sheet = sdk.createFreshCharacterSheet({
    characterId: sdk.characterSheetId("generated-battle-009-controller"),
    build: finalization.build,
    tempHp: sdk.hp(0),
    hitPointMaximumReduction: sdk.hp(0),
    conditions: [],
    unitLibrary: unitCatalog,
  });
  if (sdk.isLeft(sheet)) {
    return {
      kind: "obstructed",
      obstruction:
        "The public SDK finalized the build but could not create its fresh Character Sheet.",
      observation: {
        issues: sdk.characterSheetConstructionIssuesSummary(sheet.left),
        selections,
      },
    };
  }

  return {
    kind: "ready",
    characterSheets: [sheet.right],
    observation: {
      character: "Level 1 Orc Soldier Fighter",
      intent:
        "Durable defensive pursuer with alert Perception, fieldcraft, and flexible weapon mastery.",
      selections,
    },
  };
};
