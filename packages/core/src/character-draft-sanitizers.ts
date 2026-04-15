import { BACKGROUND_ABILITY_SCORE_OPTIONS } from "#/character-ability-scores.ts";
import { advancementToClassLevels } from "#/character-advancement.ts";
import { sanitizeBuildChoices } from "#/character-build-choice-sanitizers.ts";
import {
  type CharacterClassLevels,
  type CharacterDraft,
  type CharacterDraftClassLevels,
  ZERO_CLASS_LEVELS,
} from "#/character-domain-model.ts";
import {
  ownedCombatEquipment,
  type CharacterEquipmentChoicesDraft,
  type CharacterLoadoutDraft,
} from "#/character-equipment.ts";
import { CLASS_PACKAGE_DATA } from "#/character-equipment-data.ts";
import { validateCharacterEquipment } from "#/character-equipment-validation.ts";
import { type ClassName } from "#/features/class-tables.ts";
import { sanitizeSpellcastingChoices } from "#/character-draft-spell-sanitizers.ts";

type MutableCharacterEquipmentChoicesDraft = {
  -readonly [K in keyof CharacterEquipmentChoicesDraft]: CharacterEquipmentChoicesDraft[K];
};

type MutableCharacterLoadout = {
  -readonly [K in keyof CharacterLoadoutDraft]: CharacterLoadoutDraft[K];
};

export function normalizeClassLevels(
  partial: CharacterDraftClassLevels,
): CharacterClassLevels {
  return {
    ...ZERO_CLASS_LEVELS,
    ...partial,
  };
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
      loadout: {
        wornArmor: next.loadout.wornArmor ?? null,
        wieldedWeapon: next.loadout.wieldedWeapon ?? null,
        secondaryWeapon: next.loadout.secondaryWeapon ?? null,
        shield: next.loadout.shield === true,
        wieldedWeaponGrip: next.loadout.wieldedWeaponGrip ?? null,
      },
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
