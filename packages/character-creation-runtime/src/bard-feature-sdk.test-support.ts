import { Array as EffectArray, Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import { advanceCharacterBuildClassLevel } from "./character-build-advancement.ts";
import { classUnitIdFromUnitId as parseClassUnit } from "./character-progression-algebra.ts";
import {
  creationChoiceOptionId,
  type CharacterBuild,
  type UnitCatalog,
} from "./types.ts";
import type { CharacterBuildChoiceGain } from "./character-build-advancement.ts";
import { finalizeCharacterDraft } from "./finalization.ts";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "./supported-progression-fill.test-support.ts";

export function bardCreationAtLevel(level: number, unitLibrary: UnitCatalog) {
  const draft = completeSupportedProgressionDraft({
    draftId: `draft:lore-sdk:${level}`,
    unitLibrary,
    progression: testProgression(unitLibrary, unitId("class_bard"), level),
    fixtureOptionIds: (source) =>
      source.choiceKey === "equipment_purchase"
        ? [creationChoiceOptionId("weapon_longsword")]
        : undefined,
  });
  const final = finalizeCharacterDraft({ draft, unitLibrary });
  if (final.tag !== "ready") throw new Error(JSON.stringify(final));
  return { build: final.build, draft };
}
export function bardGainSpellcastingLevel(input: {
  readonly build: CharacterBuild;
  readonly nextLevel: number;
  readonly gainedChoices: readonly CharacterBuildChoiceGain[];
  readonly unitLibrary: UnitCatalog;
}) {
  const bard = parseClassUnit({
    unitLibrary: input.unitLibrary,
    classUnitId: unitId("class_bard"),
  });
  if (Result.isFailure(bard)) throw new Error(JSON.stringify(bard.failure));
  const next = bardCreationAtLevel(input.nextLevel, input.unitLibrary).build;
  const before =
    input.build.spellcasting?.sources.find(
      (source) => source.sourceUnitId === bard.success,
    )?.preparedSpells ?? [];
  const after =
    next.spellcasting?.sources.find(
      (source) => source.sourceUnitId === bard.success,
    )?.preparedSpells ?? [];
  return advanceCharacterBuildClassLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    levelGain: {
      tag: "classLevelGainWithListPreparedSpellcasting",
      classUnitId: bard.success,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      preparedSpellcasting: {
        gainedPreparedSpells: after.filter((id) => !before.includes(id)),
      },
      ...(EffectArray.isReadonlyArrayNonEmpty(input.gainedChoices)
        ? { gainedChoices: input.gainedChoices }
        : {}),
    },
  });
}
