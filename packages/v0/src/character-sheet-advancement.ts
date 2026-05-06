import { cloneAdvancement } from "#/character-advancement.ts";
import {
  assessCharacterDraft,
  type CharacterDraftAssessment,
} from "#/character-draft-analysis.ts";
import type {
  CharacterDraft,
  CharacterFinalizationResult,
  CharacterFinalizationIssue,
  CharacterSheet,
} from "#/character-domain-model.ts";
import type { CharacterEquipmentChoices } from "#/character-equipment.ts";
import type {
  CharacterAdvancementEntry,
  CharacterBuildChoices,
} from "#/character-feature-types.ts";
import type { Skill } from "#/character-proficiencies.ts";
import type {
  CharacterSpellcastingChoices,
  CharacterSpellcastingEntry,
} from "#/character-spellcasting.ts";

export interface CharacterLevelUpTransition {
  readonly entry: CharacterAdvancementEntry;
  readonly choices?: Partial<CharacterBuildChoices>;
  readonly spellcasting?: CharacterSpellcastingChoices;
}

export interface CharacterSheetAdvancementPreview {
  readonly candidateDraft: CharacterDraft;
  readonly candidateAssessment: CharacterDraftAssessment;
}

function structuralEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a == null ||
    b == null
  ) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => structuralEqual(item, b[index]));
  }
  if (Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;
  return keysA.every(
    (key) =>
      Object.hasOwn(recordB, key) &&
      structuralEqual(recordA[key], recordB[key]),
  );
}

function cloneEquipmentChoices(
  equipment: CharacterEquipmentChoices,
): CharacterDraft["equipment"] {
  return {
    backgroundOption: equipment.backgroundOption,
    classOption: equipment.classOption,
    purchasedCombatEquipment: [...equipment.purchasedCombatEquipment],
    remainingGoldPieces: equipment.remainingGoldPieces,
    loadout: {
      ...(equipment.loadout.wornArmor == null
        ? {}
        : { wornArmor: equipment.loadout.wornArmor }),
      ...(equipment.loadout.wieldedWeapon == null
        ? {}
        : { wieldedWeapon: equipment.loadout.wieldedWeapon }),
      ...(equipment.loadout.secondaryWeapon == null
        ? {}
        : { secondaryWeapon: equipment.loadout.secondaryWeapon }),
      ...(equipment.loadout.shield ? { shield: true } : {}),
      ...(equipment.loadout.wieldedWeaponGrip == null
        ? {}
        : { wieldedWeaponGrip: equipment.loadout.wieldedWeaponGrip }),
    },
  };
}

function cloneSpellcastingEntry(
  entry: CharacterSpellcastingEntry | undefined,
): CharacterSpellcastingEntry | undefined {
  if (entry == null) return undefined;
  return {
    ...(entry.cantrips == null ? {} : { cantrips: [...entry.cantrips] }),
    ...(entry.preparedSpells == null
      ? {}
      : { preparedSpells: [...entry.preparedSpells] }),
    ...(entry.spellbook == null ? {} : { spellbook: [...entry.spellbook] }),
  };
}

function cloneDraftBuildChoices(
  choices: CharacterSheet["choices"],
): CharacterDraft["choices"] {
  const multiclassSkills: Partial<
    Record<"bard" | "ranger" | "rogue", ReadonlyArray<Skill>>
  > = {};
  if (choices.multiclassSkills.bard.length > 0) {
    multiclassSkills.bard = [...choices.multiclassSkills.bard];
  }
  if (choices.multiclassSkills.ranger.length > 0) {
    multiclassSkills.ranger = [...choices.multiclassSkills.ranger];
  }
  if (choices.multiclassSkills.rogue.length > 0) {
    multiclassSkills.rogue = [...choices.multiclassSkills.rogue];
  }

  const draftChoices = {
    ...(choices.primaryClassSkills.length > 0
      ? { primaryClassSkills: [...choices.primaryClassSkills] }
      : {}),
    ...(Object.keys(multiclassSkills).length > 0 ? { multiclassSkills } : {}),
    ...(choices.backgroundTool == null
      ? {}
      : { backgroundTool: choices.backgroundTool }),
    ...(choices.bardInstruments.length > 0
      ? { bardInstruments: [...choices.bardInstruments] }
      : {}),
    ...(choices.multiclassBardInstrument == null
      ? {}
      : { multiclassBardInstrument: choices.multiclassBardInstrument }),
    ...(choices.monkTool == null ? {} : { monkTool: choices.monkTool }),
    ...(choices.speciesSkill == null
      ? {}
      : { speciesSkill: choices.speciesSkill }),
    ...(choices.humanOriginFeat == null
      ? {}
      : { humanOriginFeat: choices.humanOriginFeat }),
    ...(choices.rogueLanguage == null
      ? {}
      : { rogueLanguage: choices.rogueLanguage }),
    ...(choices.rangerDeftExplorerLanguages.length > 0
      ? {
          rangerDeftExplorerLanguages: [...choices.rangerDeftExplorerLanguages],
        }
      : {}),
    ...(choices.clericDivineOrder == null
      ? {}
      : { clericDivineOrder: choices.clericDivineOrder }),
    ...(choices.druidPrimalOrder == null
      ? {}
      : { druidPrimalOrder: choices.druidPrimalOrder }),
    ...(choices.fighterFightingStyle == null
      ? {}
      : { fighterFightingStyle: choices.fighterFightingStyle }),
    ...(choices.championAdditionalFightingStyle == null
      ? {}
      : {
          championAdditionalFightingStyle:
            choices.championAdditionalFightingStyle,
        }),
    ...(choices.paladinFightingStyle == null
      ? {}
      : { paladinFightingStyle: choices.paladinFightingStyle }),
    ...(choices.rangerFightingStyle == null
      ? {}
      : { rangerFightingStyle: choices.rangerFightingStyle }),
    ...(choices.expertiseSkills.length > 0
      ? { expertiseSkills: [...choices.expertiseSkills] }
      : {}),
  } satisfies CharacterBuildChoices;

  return Object.keys(draftChoices).length > 0 ? draftChoices : undefined;
}

function mergeMulticlassSkills(
  base:
    | Partial<Record<"bard" | "ranger" | "rogue", ReadonlyArray<Skill>>>
    | undefined,
  patch: CharacterBuildChoices["multiclassSkills"] | undefined,
): CharacterBuildChoices["multiclassSkills"] | undefined {
  if (base == null && patch == null) return undefined;

  const merged: Partial<
    Record<"bard" | "ranger" | "rogue", ReadonlyArray<Skill>>
  > = {};

  for (const className of ["bard", "ranger", "rogue"] as const) {
    const value = patch?.[className] ?? base?.[className];
    if (value != null) {
      merged[className] = [...value];
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeBuildChoices(
  base: CharacterDraft["choices"],
  patch: Partial<CharacterBuildChoices> | undefined,
): CharacterDraft["choices"] {
  if (base == null && patch == null) return undefined;

  // Keep preview/advance candidate reconstruction aligned with
  // `character.qnt:pDraftFromSheetTransition`: partial level-up patches replace
  // only the fields they mention, rather than erasing sibling owned facts.
  const merged = {
    ...(base ?? {}),
    ...(patch ?? {}),
    multiclassSkills: mergeMulticlassSkills(
      base?.multiclassSkills,
      patch?.multiclassSkills,
    ),
  } satisfies Partial<CharacterBuildChoices>;

  const filtered = Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value != null),
  ) as CharacterDraft["choices"];

  return filtered != null && Object.keys(filtered).length > 0
    ? filtered
    : undefined;
}

function mergeSpellcastingEntry(
  base: CharacterSpellcastingEntry | undefined,
  patch: CharacterSpellcastingEntry | undefined,
): CharacterSpellcastingEntry | undefined {
  if (base == null && patch == null) return undefined;

  const merged = {
    ...(patch?.cantrips == null
      ? base?.cantrips == null
        ? {}
        : { cantrips: [...base.cantrips] }
      : { cantrips: [...patch.cantrips] }),
    ...(patch?.preparedSpells == null
      ? base?.preparedSpells == null
        ? {}
        : { preparedSpells: [...base.preparedSpells] }
      : { preparedSpells: [...patch.preparedSpells] }),
    ...(patch?.spellbook == null
      ? base?.spellbook == null
        ? {}
        : { spellbook: [...base.spellbook] }
      : { spellbook: [...patch.spellbook] }),
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeSpellcastingChoices(
  base: CharacterSpellcastingChoices | undefined,
  patch: CharacterSpellcastingChoices | undefined,
): CharacterSpellcastingChoices | undefined {
  if (base == null && patch == null) return undefined;

  const merged = new Map<string, CharacterSpellcastingEntry>();

  for (const [className, entry] of Object.entries(base ?? {})) {
    const cloned = cloneSpellcastingEntry(entry);
    if (cloned != null) merged.set(className, cloned);
  }

  for (const [className, entry] of Object.entries(patch ?? {})) {
    const cloned = mergeSpellcastingEntry(merged.get(className), entry);
    if (cloned != null) merged.set(className, cloned);
  }

  return Object.fromEntries(merged) as CharacterSpellcastingChoices;
}

function draftSpellcastingChoices(
  spellcasting: CharacterSheet["spellcasting"],
): CharacterSpellcastingChoices | undefined {
  const entries: Partial<
    Record<keyof CharacterSheet["spellcasting"], CharacterSpellcastingEntry>
  > = {};

  for (const [className, rawEntry] of Object.entries(spellcasting) as Array<
    readonly [
      keyof CharacterSheet["spellcasting"],
      CharacterSheet["spellcasting"][keyof CharacterSheet["spellcasting"]],
    ]
  >) {
    const entry = cloneSpellcastingEntry(rawEntry);
    if (
      entry != null &&
      ((entry.cantrips?.length ?? 0) > 0 ||
        (entry.preparedSpells?.length ?? 0) > 0 ||
        (entry.spellbook?.length ?? 0) > 0)
    ) {
      entries[className] = entry;
    }
  }

  return Object.keys(entries).length > 0
    ? (entries as CharacterSpellcastingChoices)
    : undefined;
}

export function characterDraftFromSheet(
  sheet: CharacterSheet,
  transition?: CharacterLevelUpTransition,
): CharacterDraft {
  return {
    primaryClass: sheet.primaryClass,
    advancement: [
      ...cloneAdvancement(sheet.advancement),
      ...(transition == null ? [] : cloneAdvancement([transition.entry])),
    ],
    background: sheet.background,
    abilityScoreGeneration: {
      ...sheet.abilityScoreGeneration,
      assignedScores: { ...sheet.abilityScoreGeneration.assignedScores },
    },
    backgroundAbilityScoreIncrease: sheet.backgroundAbilityScoreIncrease,
    species: sheet.species,
    languages: [...sheet.languages],
    alignment: sheet.alignment,
    choices: mergeBuildChoices(
      cloneDraftBuildChoices(sheet.choices),
      transition?.choices,
    ),
    equipment: cloneEquipmentChoices(sheet.equipment),
    spellcasting: mergeSpellcastingChoices(
      draftSpellcastingChoices(sheet.spellcasting),
      transition?.spellcasting,
    ),
  };
}

function contradictoryFinalizedSheetIssue(): CharacterFinalizationIssue {
  return {
    code: "contradictoryFinalizedSheet",
    message:
      "Finalized sheet facts must match the replayed result of their owned draft state before advancement.",
  };
}

function candidateAssessmentWithBaseSheetIssue(
  candidateAssessment: CharacterDraftAssessment,
): Extract<CharacterDraftAssessment, { status: "invalid" }> {
  const contradiction = contradictoryFinalizedSheetIssue();

  if (candidateAssessment.status === "invalid") {
    return {
      status: "invalid",
      openChoices: candidateAssessment.openChoices,
      issues: [...candidateAssessment.issues, contradiction],
    };
  }

  if (candidateAssessment.status === "incomplete") {
    return {
      status: "invalid",
      openChoices: candidateAssessment.openChoices,
      issues: [contradiction],
    };
  }

  return {
    status: "invalid",
    openChoices: [],
    issues: [contradiction],
  };
}

export function previewCharacterSheetAdvancement(
  sheet: CharacterSheet,
  transition: CharacterLevelUpTransition,
): CharacterSheetAdvancementPreview {
  const currentDraft = characterDraftFromSheet(sheet);
  const currentAssessment = assessCharacterDraft(currentDraft);
  const candidateDraft = characterDraftFromSheet(sheet, transition);
  const candidateAssessment = assessCharacterDraft(candidateDraft);

  if (currentAssessment.status !== "complete") {
    return {
      candidateDraft,
      candidateAssessment:
        candidateAssessmentWithBaseSheetIssue(candidateAssessment),
    };
  }

  if (!structuralEqual(currentAssessment.sheet, sheet)) {
    return {
      candidateDraft,
      candidateAssessment:
        candidateAssessmentWithBaseSheetIssue(candidateAssessment),
    };
  }

  return {
    candidateDraft,
    candidateAssessment,
  };
}

export function advanceCharacterSheet(
  sheet: CharacterSheet,
  transition: CharacterLevelUpTransition,
): CharacterFinalizationResult {
  const preview = previewCharacterSheetAdvancement(sheet, transition);

  if (preview.candidateAssessment.status === "complete") {
    return { ok: true, sheet: preview.candidateAssessment.sheet };
  }

  if (preview.candidateAssessment.status === "incomplete") {
    return {
      ok: false,
      status: "incomplete",
      openChoices: preview.candidateAssessment.openChoices,
      issues: [],
    };
  }

  return {
    ok: false,
    status: "invalid",
    openChoices: preview.candidateAssessment.openChoices,
    issues: preview.candidateAssessment.issues,
  };
}
