// KERNEL-COVERAGE: runtime-owner CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION
import type {
  ClassSpellcastingCreation,
  ListPreparedSpellcastingProgressionCreation,
  WizardSpellcastingCreation,
} from "@dnd/surface/surface/types";

export type ReadableClassSpellcasting = ClassSpellcastingCreation;

export type ListPreparedReadableSpellcasting = Extract<
  ReadableClassSpellcasting,
  {
    readonly kind:
      | "list_prepared_spellcasting_creation"
      | "list_prepared_spellcasting_progression_creation";
  }
>;

export function classSpellcastingCreationAtLevel(
  spellcasting: ReadableClassSpellcasting | undefined,
  classLevel: number,
): ReadableClassSpellcasting | undefined {
  if (spellcasting == null || spellcasting.featureLevel > classLevel) {
    return undefined;
  }
  if (isWizardSpellcastingCreation(spellcasting)) {
    return wizardSpellcastingCreationAtLevel(spellcasting, classLevel);
  }
  if (isProgressionListPreparedSpellcastingCreation(spellcasting)) {
    return listPreparedSpellcastingCreationAtLevel(spellcasting, classLevel);
  }

  return spellcasting;
}

export function isListPreparedSpellcastingCreation(
  spellcasting: ReadableClassSpellcasting,
): spellcasting is ListPreparedReadableSpellcasting {
  return (
    spellcasting.kind === "list_prepared_spellcasting_creation" ||
    spellcasting.kind === "list_prepared_spellcasting_progression_creation"
  );
}

export function isPactMagicSpellcastingCreation(
  spellcasting: ReadableClassSpellcasting,
): spellcasting is Extract<
  ClassSpellcastingCreation,
  { readonly kind: "pact_magic_spellcasting_creation" }
> {
  return spellcasting.kind === "pact_magic_spellcasting_creation";
}

export function isWizardSpellcastingCreation(
  spellcasting: ReadableClassSpellcasting,
): spellcasting is WizardSpellcastingCreation {
  return spellcasting.kind === "wizard_spellcasting_creation";
}

function isProgressionListPreparedSpellcastingCreation(
  spellcasting: ReadableClassSpellcasting,
): spellcasting is Extract<
  ReadableClassSpellcasting,
  { readonly kind: "list_prepared_spellcasting_progression_creation" }
> {
  return (
    spellcasting.kind === "list_prepared_spellcasting_progression_creation"
  );
}

export function wizardSpellcastingCreationAtLevel(
  spellcasting: WizardSpellcastingCreation,
  classLevel: number,
): WizardSpellcastingCreation | undefined {
  const progression = spellcastingProgressionAtLevel(
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

function listPreparedSpellcastingCreationAtLevel(
  spellcasting: ListPreparedSpellcastingProgressionCreation,
  classLevel: number,
): ListPreparedSpellcastingProgressionCreation | undefined {
  const progression = spellcastingProgressionAtLevel(
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

function spellcastingProgressionAtLevel<T extends { readonly atLevel: number }>(
  progression: readonly T[],
  classLevel: number,
): T | undefined {
  return progression.find((row) => row.atLevel === classLevel);
}
