/**
 * Query kinds that make up the externally meaningful Character Sheet derived
 * query obligation in #314. The protocol scenario and the evidence artifacts
 * both consume this one ordered source of truth.
 */
export const CHARACTER_SHEET_DERIVED_QUERY_KINDS = [
  "abilityCheckAbility",
  "abilityCheckProficiencyBonus",
  "jumpDistanceAbility",
  "linkedSpeedGrants",
  "armorClass",
  "spellAccess",
  "knownForms",
  "weaponMasterySelections",
  "spellbookRitualAccesses",
  "spellbookRitualAccess",
  "spellInvocation",
] as const;
