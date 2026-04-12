import { BACKGROUND_ABILITY_SCORE_OPTIONS } from "#/character-ability-scores.ts";
import { advancementToClassLevels } from "#/character-advancement.ts";
import {
  CHARACTER_LANGUAGES,
  type CharacterClassLevels,
  type CharacterDraft,
  type CharacterDraftClassLevels,
  ZERO_CLASS_LEVELS,
} from "#/character-domain-model.ts";
import {
  ownedCombatEquipment,
  type CharacterEquipmentChoicesDraft,
  type CharacterLoadout,
} from "#/character-equipment.ts";
import { CLASS_PACKAGE_DATA } from "#/character-equipment-data.ts";
import { validateCharacterEquipment } from "#/character-equipment-validation.ts";
import type {
  CharacterBuildChoices,
  CharacterGrantedLanguage,
} from "#/character-feature-types.ts";
import {
  ARTISAN_TOOLS,
  CHARACTER_RARE_LANGUAGES,
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
} from "#/character-feature-types.ts";
import {
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  speciesGrantsSkill,
  type Skill,
  validSpeciesSkillChoice,
} from "#/character-proficiencies.ts";
import { type ClassName } from "#/features/class-tables.ts";
import { sanitizeSpellcastingChoices } from "#/character-draft-spell-sanitizers.ts";

type MutableCharacterBuildChoices = {
  -readonly [K in keyof CharacterBuildChoices]: CharacterBuildChoices[K];
};

type MutableCharacterEquipmentChoicesDraft = {
  -readonly [K in keyof CharacterEquipmentChoicesDraft]: CharacterEquipmentChoicesDraft[K];
};

type MutableCharacterLoadout = {
  -readonly [K in keyof CharacterLoadout]: CharacterLoadout[K];
};

export function normalizeClassLevels(
  partial: CharacterDraftClassLevels,
): CharacterClassLevels {
  return {
    ...ZERO_CLASS_LEVELS,
    ...partial,
  };
}

function unique<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...new Set(values)];
}

function validPrimaryClassSkillChoices(
  primaryClass: ClassName,
  skills: ReadonlyArray<Skill> | undefined,
): CharacterBuildChoices["primaryClassSkills"] {
  if (skills == null) return undefined;
  const allowed = new Set<Skill>(
    PRIMARY_CLASS_PROFICIENCIES[primaryClass].availableSkills,
  );
  const filtered = unique(skills.filter((skill) => allowed.has(skill)));
  return filtered.length === 0 ? undefined : filtered;
}

function validMulticlassSkillChoices(
  className: Extract<ClassName, "bard" | "ranger" | "rogue">,
  skills: ReadonlyArray<Skill> | undefined,
): ReadonlyArray<Skill> | undefined {
  if (skills == null) return undefined;
  const allowed = new Set<Skill>(
    MULTICLASS_PROFICIENCIES[className].availableSkills,
  );
  const filtered = unique(skills.filter((skill) => allowed.has(skill)));
  return filtered.length === 0 ? undefined : filtered;
}

function validGrantedLanguages(
  languages: ReadonlyArray<CharacterGrantedLanguage> | undefined,
): ReadonlyArray<CharacterGrantedLanguage> | undefined {
  if (languages == null) return undefined;
  const allowed = new Set<CharacterGrantedLanguage>([
    ...CHARACTER_LANGUAGES,
    ...CHARACTER_RARE_LANGUAGES,
  ]);
  const filtered = unique(
    languages.filter((language) => allowed.has(language)),
  );
  return filtered.length === 0 ? undefined : filtered;
}

function classOptionIsAllowed(
  primaryClass: ClassName,
  option: CharacterEquipmentChoicesDraft["classOption"],
): boolean {
  if (option == null) return false;
  return option === "gold" || option === "packageA"
    ? true
    : CLASS_PACKAGE_DATA[primaryClass].packageB != null;
}

function sanitizeBuildChoices(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): CharacterBuildChoices | undefined {
  if (draft.choices == null) return undefined;

  const next: MutableCharacterBuildChoices = {};

  if (draft.primaryClass != null) {
    const primaryClassSkills = validPrimaryClassSkillChoices(
      draft.primaryClass,
      draft.choices.primaryClassSkills,
    );
    if (primaryClassSkills != null)
      next.primaryClassSkills = primaryClassSkills;

    if (draft.primaryClass === "bard") {
      const bardInstruments = unique(
        (draft.choices.bardInstruments ?? []).filter((instrument) =>
          MUSICAL_INSTRUMENTS.includes(instrument),
        ),
      );
      if (bardInstruments.length > 0) next.bardInstruments = bardInstruments;
    }

    if (
      draft.primaryClass === "monk" &&
      draft.choices.monkTool != null &&
      (
        [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS] as ReadonlyArray<string>
      ).includes(draft.choices.monkTool)
    ) {
      next.monkTool = draft.choices.monkTool;
    }
  }

  const multiclassSkills: Record<
    Extract<ClassName, "bard" | "ranger" | "rogue">,
    ReadonlyArray<Skill> | undefined
  > = {
    bard: undefined,
    ranger: undefined,
    rogue: undefined,
  };
  for (const className of ["bard", "ranger", "rogue"] as const) {
    if (className === draft.primaryClass || classLevels[className] <= 0)
      continue;
    const skills = validMulticlassSkillChoices(
      className,
      draft.choices.multiclassSkills?.[className],
    );
    if (skills != null) multiclassSkills[className] = skills;
  }
  if (Object.values(multiclassSkills).some((skills) => skills != null)) {
    next.multiclassSkills = Object.fromEntries(
      Object.entries(multiclassSkills).filter(([, skills]) => skills != null),
    ) as NonNullable<CharacterBuildChoices["multiclassSkills"]>;
  }

  if (
    draft.background === "soldier" &&
    draft.choices.backgroundTool != null &&
    GAMING_SETS.includes(draft.choices.backgroundTool)
  ) {
    next.backgroundTool = draft.choices.backgroundTool;
  }

  if (
    draft.species != null &&
    speciesGrantsSkill(draft.species) &&
    draft.choices.speciesSkill != null &&
    validSpeciesSkillChoice(draft.species, draft.choices.speciesSkill)
  ) {
    next.speciesSkill = draft.choices.speciesSkill;
  }

  if (draft.species === "human" && draft.choices.humanOriginFeat != null) {
    next.humanOriginFeat = draft.choices.humanOriginFeat;
  }

  if (
    draft.primaryClass !== "bard" &&
    classLevels.bard > 0 &&
    draft.choices.multiclassBardInstrument != null &&
    MUSICAL_INSTRUMENTS.includes(draft.choices.multiclassBardInstrument)
  ) {
    next.multiclassBardInstrument = draft.choices.multiclassBardInstrument;
  }

  if (classLevels.rogue > 0 && draft.choices.rogueLanguage != null) {
    const [rogueLanguage] =
      validGrantedLanguages([draft.choices.rogueLanguage]) ?? [];
    if (rogueLanguage != null) next.rogueLanguage = rogueLanguage;
  }

  if (classLevels.ranger >= 2) {
    const rangerLanguages = validGrantedLanguages(
      draft.choices.rangerDeftExplorerLanguages,
    );
    if (rangerLanguages != null) {
      next.rangerDeftExplorerLanguages = rangerLanguages;
    }
  }

  if (
    classLevels.cleric > 0 &&
    draft.choices.clericDivineOrder != null &&
    CLERIC_DIVINE_ORDERS.includes(draft.choices.clericDivineOrder)
  ) {
    next.clericDivineOrder = draft.choices.clericDivineOrder;
  }

  if (
    classLevels.druid > 0 &&
    draft.choices.druidPrimalOrder != null &&
    DRUID_PRIMAL_ORDERS.includes(draft.choices.druidPrimalOrder)
  ) {
    next.druidPrimalOrder = draft.choices.druidPrimalOrder;
  }

  return Object.keys(next).length === 0 ? undefined : next;
}

function sanitizeEquipmentChoices(
  draft: CharacterDraft,
): CharacterEquipmentChoicesDraft | undefined {
  if (draft.equipment == null) return undefined;

  const next: MutableCharacterEquipmentChoicesDraft & {
    loadout?: MutableCharacterLoadout;
  } = {
    ...(draft.equipment.backgroundOption == null
      ? {}
      : { backgroundOption: draft.equipment.backgroundOption }),
    ...(draft.equipment.classOption == null
      ? {}
      : { classOption: draft.equipment.classOption }),
    ...(draft.equipment.purchasedCombatEquipment == null
      ? {}
      : {
          purchasedCombatEquipment: [
            ...draft.equipment.purchasedCombatEquipment,
          ],
        }),
    ...(draft.equipment.remainingGoldPieces == null
      ? {}
      : { remainingGoldPieces: draft.equipment.remainingGoldPieces }),
    ...(draft.equipment.loadout == null
      ? {}
      : { loadout: { ...draft.equipment.loadout } }),
  };

  if (
    draft.primaryClass != null &&
    next.classOption != null &&
    !classOptionIsAllowed(draft.primaryClass, next.classOption)
  ) {
    delete next.classOption;
  }

  const canValidateOwnership =
    draft.primaryClass != null &&
    draft.background != null &&
    next.backgroundOption != null &&
    next.classOption != null;
  if (!canValidateOwnership || next.loadout == null) {
    return Object.keys(next).length === 0 ? undefined : next;
  }

  const spendIssues = validateCharacterEquipment({
    primaryClass: draft.primaryClass,
    background: draft.background,
    equipment: {
      backgroundOption: next.backgroundOption,
      classOption: next.classOption,
      purchasedCombatEquipment: next.purchasedCombatEquipment ?? [],
      remainingGoldPieces: next.remainingGoldPieces,
      loadout: next.loadout,
    },
  }).map((issue) => issue.code);
  if (spendIssues.includes("overspentStartingGold")) {
    delete next.purchasedCombatEquipment;
    delete next.remainingGoldPieces;
  }

  const owned = ownedCombatEquipment({
    primaryClass: draft.primaryClass!,
    background: draft.background!,
    equipment: {
      backgroundOption: next.backgroundOption!,
      classOption: next.classOption!,
      purchasedCombatEquipment: next.purchasedCombatEquipment ?? [],
      remainingGoldPieces: next.remainingGoldPieces ?? 0,
      loadout: next.loadout,
    },
  });
  const loadout: MutableCharacterLoadout = { ...next.loadout };

  if (loadout.wornArmor != null && !owned.armor.includes(loadout.wornArmor)) {
    delete loadout.wornArmor;
  }
  if (
    loadout.wieldedWeapon != null &&
    !owned.weapons.includes(loadout.wieldedWeapon)
  ) {
    delete loadout.wieldedWeapon;
  }
  if (loadout.secondaryWeapon != null) {
    const wieldedCount =
      loadout.wieldedWeapon == null
        ? 0
        : owned.weapons.filter((weapon) => weapon === loadout.wieldedWeapon)
            .length;
    const secondaryCount = owned.weapons.filter(
      (weapon) => weapon === loadout.secondaryWeapon,
    ).length;
    const requiredCount =
      loadout.secondaryWeapon === loadout.wieldedWeapon ? 2 : 1;
    if (
      secondaryCount < requiredCount ||
      (loadout.secondaryWeapon === loadout.wieldedWeapon && wieldedCount < 2)
    ) {
      delete loadout.secondaryWeapon;
    }
  }
  if (loadout.shield === true && owned.shields < 1) {
    delete loadout.shield;
  }
  if (loadout.wieldedWeapon == null) {
    delete loadout.secondaryWeapon;
    delete loadout.wieldedWeaponGrip;
  }

  next.loadout = loadout;
  return Object.keys(next).length === 0 ? undefined : next;
}

export function applyCharacterDraftUpdate(
  current: CharacterDraft,
  patch: Partial<CharacterDraft>,
): CharacterDraft {
  const primaryClassChanged =
    Object.prototype.hasOwnProperty.call(patch, "primaryClass") &&
    patch.primaryClass !== current.primaryClass;

  let next: CharacterDraft = {
    ...current,
    ...patch,
  };

  if (primaryClassChanged && next.primaryClass != null) {
    if (
      next.advancement == null ||
      next.advancement[0]?.className !== next.primaryClass
    ) {
      next = {
        ...next,
        advancement: [{ className: next.primaryClass }],
      };
    }
  }

  if (
    next.background != null &&
    next.backgroundAbilityScoreIncrease?.kind === "plusTwoPlusOne"
  ) {
    const increase = next.backgroundAbilityScoreIncrease;
    const allowed = BACKGROUND_ABILITY_SCORE_OPTIONS[next.background];
    if (
      !(allowed as ReadonlyArray<typeof increase.plusTwo>).includes(
        increase.plusTwo,
      ) ||
      !(allowed as ReadonlyArray<typeof increase.plusOne>).includes(
        increase.plusOne,
      )
    ) {
      next = {
        ...next,
        backgroundAbilityScoreIncrease: undefined,
      };
    }
  }

  const classLevels =
    next.advancement != null
      ? advancementToClassLevels(next.advancement)
      : next.classLevels == null
        ? ZERO_CLASS_LEVELS
        : normalizeClassLevels(next.classLevels);

  return {
    ...next,
    choices: sanitizeBuildChoices(next, classLevels),
    equipment: sanitizeEquipmentChoices(next),
    spellcasting: sanitizeSpellcastingChoices(next, classLevels),
  };
}
