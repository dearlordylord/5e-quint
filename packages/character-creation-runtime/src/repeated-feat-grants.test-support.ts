import type { CharacterBuildClassLevelGain } from "./index.ts";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  creationChoiceOptionId,
  finalizeCharacterDraft,
  type CharacterBuild,
  type CharacterDraft,
} from "./index.ts";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "./supported-progression-fill.test-support.ts";

const composed = buildUnitCatalog({ collections: [srdUnitCollection] });
if (composed.tag !== "ok") throw new Error("SRD catalog must compose");
export const unitLibrary = composed.catalog;
export const classes = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
] as const;
export function draftFor(name: string, level: number): CharacterDraft {
  return completeSupportedProgressionDraft({
    draftId: `repeated-feat-${name}-${level}`,
    unitLibrary,
    progression: testProgression(unitLibrary, unitId(`class_${name}`), level),
    fixtureOptionIds: (source) => {
      if (source.choiceKey === "class_feature_ability_score_increase_choice")
        return [creationChoiceOptionId("ability_score:con:+2:max20")];
      if (source.choiceKey === "class_feature_feat_choice")
        return [
          creationChoiceOptionId(
            source.unitId === "fighter_additional_fighting_style"
              ? "feat_archery"
              : source.unitId.includes("fighting_style")
                ? "defense"
                : "feat_ability_score_improvement",
          ),
        ];
      if (source.choiceKey === "wizard_spellbook_choices") {
        const savant = [
          "magic_missile",
          "thunderwave",
          "continual_flame",
          "shatter",
        ];
        return source.unitId === "wizard_evocation_savant"
          ? savant.map(creationChoiceOptionId)
          : unitLibrary
              .listUnits()
              .filter(
                (unit) => unit.kind === "spell" && !savant.includes(unit.id),
              )
              .map((unit) => creationChoiceOptionId(unit.id));
      }
      if (source.choiceKey === "weapon_mastery_options")
        return [
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
          "weapon_quarterstaff",
          "weapon_greataxe",
          "weapon_shortsword",
          "weapon_dagger",
        ].map(creationChoiceOptionId);
      if (source.choiceKey === "equipment_purchase")
        return [creationChoiceOptionId("weapon_longsword")];
      return undefined;
    },
  });
}
export function buildFor(name: string, level: number): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: draftFor(name, level),
    unitLibrary,
  });
  if (result.tag !== "ready") throw new Error(JSON.stringify(result));
  return result.build;
}

export function wizardSpellcastingGainChoicesForBuild(
  build: CharacterBuild,
): NonNullable<CharacterBuildClassLevelGain["gainedChoices"]> {
  const source = build.spellcasting?.sources[0];
  const classUnit = unitLibrary.requireUnit("class_wizard");
  if (
    source === undefined ||
    classUnit.kind !== "class" ||
    !("spellcasting" in classUnit) ||
    classUnit.spellcasting?.kind !== "wizard_spellcasting_creation"
  )
    throw new Error("Wizard gain fixture needs canonical source facts.");
  const added = classUnit.spellcasting.spellbookAccess.spells
    .filter(
      (spell) =>
        spell.spellLevel <= 3 && !source.spellbook.includes(spell.spellId),
    )
    .slice(0, 2)
    .map((spell) => spell.spellId);
  const prepared = [...source.spellbook, ...added]
    .filter((spell) => !source.preparedSpells.includes(spell))
    .slice(0, 2);
  return [
    {
      kind: "unitChoice",
      featureUnitId: unitId("class_wizard"),
      choiceKey: "wizard_spellbook_choices",
      optionIds: added.map(creationChoiceOptionId),
    },
    {
      kind: "unitChoice",
      featureUnitId: unitId("class_wizard"),
      choiceKey: "wizard_prepared_spell_choices",
      optionIds: prepared.map(creationChoiceOptionId),
    },
  ];
}
