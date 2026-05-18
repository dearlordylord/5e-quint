import type { ListPreparedSpellcastingProgressionCreation } from "@dnd/surface/surface/types";

type ListPreparedSpellcastingProgressionRow =
  ListPreparedSpellcastingProgressionCreation["spellcastingProgression"][number];

export function listPreparedSpellcastingCreationAtLevel(
  spellcasting: ListPreparedSpellcastingProgressionCreation,
  classLevel: number,
): ListPreparedSpellcastingProgressionCreation | undefined {
  const progression = listPreparedSpellcastingProgressionAtLevel(
    spellcasting.spellcastingProgression,
    classLevel,
  );
  if (progression === undefined) {
    return undefined;
  }

  const projected = {
    ...spellcasting,
    preparedAccess: {
      ...spellcasting.preparedAccess,
      choose: progression.preparedSpellCount,
    },
    spellSlotProjection: {
      ...spellcasting.spellSlotProjection,
      slots: progression.spellSlots,
    },
  };

  if (spellcasting.cantripAccess === undefined) {
    return projected;
  }

  return {
    ...projected,
    cantripAccess: {
      ...spellcasting.cantripAccess,
      choose: progression.cantripCount,
    },
  };
}

function listPreparedSpellcastingProgressionAtLevel(
  progression: readonly ListPreparedSpellcastingProgressionRow[],
  classLevel: number,
): ListPreparedSpellcastingProgressionRow | undefined {
  return progression.find((row) => row.atLevel === classLevel);
}
