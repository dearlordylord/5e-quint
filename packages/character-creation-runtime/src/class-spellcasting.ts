import type {
  ClassSpellcastingCreation,
  WizardSpellcastingCreation,
} from "@dnd/surface/surface/types";

import { listPreparedSpellcastingCreationAtLevel } from "./list-prepared-spellcasting.ts";
import { wizardSpellcastingCreationAtLevel } from "./wizard-spellcasting.ts";

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
