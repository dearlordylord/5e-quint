import type { WizardSpellcastingCreation } from "@dnd/surface/surface/types";

type WizardSpellcastingProgressionRow =
  WizardSpellcastingCreation["spellcastingProgression"][number];

export function wizardSpellcastingCreationAtLevel(
  spellcasting: WizardSpellcastingCreation,
  classLevel: number,
): WizardSpellcastingCreation | undefined {
  const progression = wizardSpellcastingProgressionAtLevel(
    spellcasting.spellcastingProgression,
    classLevel,
  );
  if (progression === undefined) {
    return undefined;
  }

  return {
    ...spellcasting,
    cantripAccess: {
      ...spellcasting.cantripAccess,
      choose: progression.cantripCount,
    },
    spellbookAccess: {
      ...spellcasting.spellbookAccess,
      choose: progression.spellbookSpellCount,
    },
    preparedAccess: {
      ...spellcasting.preparedAccess,
      choose: progression.preparedSpellCount,
    },
    spellSlotProjection: {
      ...spellcasting.spellSlotProjection,
      slots: progression.spellSlots,
    },
  };
}

function wizardSpellcastingProgressionAtLevel(
  progression: readonly WizardSpellcastingProgressionRow[],
  classLevel: number,
): WizardSpellcastingProgressionRow | undefined {
  return progression.find((row) => row.atLevel === classLevel);
}
