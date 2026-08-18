import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

const normalized = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const composeScenarioCharacters: ScenarioCharacters = ({
  sdk,
  unitCatalog,
}) => {
  const abilityScores = sdk.abilityScoreAssignment({
    str: 15,
    dex: 13,
    con: 14,
    int: 10,
    wis: 12,
    cha: 8,
  });
  if (sdk.isLeft(abilityScores)) {
    return {
      kind: "obstructed",
      obstruction:
        "The public SDK rejected Taro's valid Standard Array assignment.",
      observation: { stage: "abilityScores", issues: abilityScores.left },
    };
  }

  let draft = sdk.createCharacterDraft({
    draftId: sdk.characterDraftId("generated-battle-005:taro"),
    unitLibrary: unitCatalog,
  });

  const selectedChoices: Array<{ hole: string; labels: string[] }> = [];
  const preferenceTerms = (source: {
    tag: string;
    path?: string;
    choiceKey?: string;
    slot?: string;
  }): readonly string[] => {
    if (source.tag === "draft") {
      switch (source.path) {
        case "draft.progression.initial":
          return ["fighter 2", "fighter level 2", "fighter"];
        case "draft.background":
          return ["acolyte"];
        case "draft.species":
          return ["orc"];
        case "draft.speciesSize":
          return ["medium"];
        case "draft.languages":
          return ["dwarvish", "goblin", "giant", "elvish"];
        case "draft.alignment":
          return ["lawful good", "neutral good", "good"];
      }
    }
    if (source.tag === "loadout") {
      switch (source.slot) {
        case "armor":
          return ["chain mail"];
        case "shield":
          return ["shield"];
        case "weapon":
          return ["longsword", "battleaxe", "warhammer", "javelin"];
      }
    }
    switch (source.choiceKey) {
      case "background_ability_score_increase":
        return ["2 wis 1 int", "1 int 1 wis 1 cha"];
      case "class_skill_proficiency_choice":
        return ["perception", "survival", "intimidation", "athletics"];
      case "class_feature_feat_choice":
        return ["defense", "dueling", "archery"];
      case "weapon_mastery_options":
        return ["flail", "spear", "longsword"];
      case "background_equipment_choice":
        return ["option a"];
      case "class_equipment_choice":
        return ["option a"];
      case "background_tool_choice":
        return ["calligrapher", "brewer", "carpenter"];
      case "origin_feat_magic_initiate_cantrip_choice":
        return ["guidance", "sacred flame"];
      case "origin_feat_magic_initiate_level_one_spell_choice":
        return ["bless", "healing word", "cure wounds"];
      case "origin_feat_magic_initiate_spellcasting_ability_choice":
        return ["wis"];
      default:
        return [
          "chain mail",
          "shield",
          "longsword",
          "longbow",
          "javelin",
          "defense",
          "athletics",
          "perception",
        ];
    }
  };

  for (let pass = 0; pass < 20; pass += 1) {
    const holes = sdk.discoverCreationHoles({
      draft,
      unitLibrary: unitCatalog,
    });
    if (holes.length === 0) break;

    const fills = holes.map((hole) => {
      if (hole.kind === "abilityScores") {
        return {
          kind: "abilityScores" as const,
          holeId: hole.holeId,
          method: "standardArray" as const,
          value: abilityScores.right,
        };
      }

      const count =
        hole.cardinality.tag === "exactly"
          ? hole.cardinality.count
          : hole.cardinality.min;
      const terms = preferenceTerms(hole.source);
      const ranked = hole.options
        .map((option, index) => {
          const label = normalized(option.label);
          const preference = terms.findIndex((term) => label.includes(term));
          return {
            option,
            index,
            preference: preference < 0 ? terms.length : preference,
          };
        })
        .sort(
          (left, right) =>
            left.preference - right.preference || left.index - right.index,
        )
        .slice(0, count);

      selectedChoices.push({
        hole: String(hole.holeId),
        labels: ranked.map(({ option }) => option.label),
      });
      return {
        kind: "choice" as const,
        holeId: hole.holeId,
        optionIds: ranked.map(({ option }) =>
          sdk.creationChoiceOptionId(option.optionId),
        ),
      };
    });

    const filled = sdk.fillCreationHoles({
      draft,
      fills,
      expectedRevision: draft.revision,
      unitLibrary: unitCatalog,
    });
    if (filled.tag === "rejected") {
      return {
        kind: "obstructed",
        obstruction:
          "The public SDK rejected choices selected from its current canonical creation holes.",
        observation: {
          stage: "fillCreationHoles",
          revision: draft.revision,
          issues: filled.issues,
          frontier: holes.map((hole) => ({
            holeId: String(hole.holeId),
            kind: hole.kind,
            options:
              hole.kind === "choice"
                ? hole.options.map((option) => option.label)
                : hole.methods,
          })),
        },
      };
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
      obstruction:
        finalized.tag === "incomplete"
          ? "The public SDK still reports creation holes after the canonical fill loop."
          : "The public SDK could not finalize the completed canonical character draft.",
      observation:
        finalized.tag === "incomplete"
          ? {
              stage: "finalizeCharacterDraft",
              status: finalized.tag,
              holes: finalized.holes.map((hole) => String(hole.holeId)),
            }
          : {
              stage: "finalizeCharacterDraft",
              status: finalized.tag,
              issues: finalized.issues.map((issue) =>
                sdk.characterCreationIssueMessage(issue),
              ),
            },
    };
  }

  const sheet = sdk.createFreshCharacterSheet({
    characterId: sdk.characterSheetId("taro"),
    build: finalized.build,
    tempHp: sdk.hp(0),
    hitPointMaximumReduction: sdk.hp(0),
    conditions: [],
    unitLibrary: unitCatalog,
  });
  if (sdk.isLeft(sheet)) {
    return {
      kind: "obstructed",
      obstruction:
        "The public SDK finalized Taro's build but could not create a fresh Character Sheet.",
      observation: {
        stage: "createFreshCharacterSheet",
        issues: sdk.characterSheetConstructionIssuesSummary(sheet.left),
      },
    };
  }

  return {
    kind: "ready",
    characterSheets: [sheet.right],
    observation: {
      characters: [
        {
          id: "taro",
          concept:
            "Level-2 Orc Fighter (Acolyte), durable mobile melee pursuit",
          abilityPlan: "Standard Array prioritizing Strength and Constitution",
          combatPlan:
            "Defense Fighting Style with the heavy-armor equipment package, melee weapons, and thrown javelins for a surfaced ranged attack",
          selections: selectedChoices,
        },
      ],
    },
  };
};
