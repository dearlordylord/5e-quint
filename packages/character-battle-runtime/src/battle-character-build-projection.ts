// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.martial-arts-attack-projection spell.invocation-marked-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import {
  scoreModifier,
  type CharacterBattleSpellAccessInit,
  type CharacterBattleSpellListFact,
  type CharacterBattleSpellSlotState,
  type CharacterBattleSpellbookRitualSpellAccessInit,
  type CharacterBattleInvocationFeature,
  type CharacterBattleClassLevelInit,
  type CharacterBattleFeaturePreparedSpellInit,
  type CharacterBattleBookOfShadowsSpellAccessInit,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleInvocationSpellAccessInit,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type CharacterWeaponAttackDamageTypeChoices,
  type BattleCreatureInit,
  type CharacterBattleLoadoutRef,
  type CharacterBattleCreatureInitWeaponAttack,
  martialArtsAttackProjectionProfileForUnit,
  passiveArmorClassBonusProfileForUnit,
  unitIsSupportedClassFeatureSpellFreeCastResource,
  admitCharacterWeaponExecutionWeapon,
  battleObjectId,
  characterBattleCreatureInitWeaponAttack,
} from "@dnd/battle-runtime";

import {
  characterBuildArmorTraining,
  characterCreationIssueMessage,
  characterBuildFeatureUnitIds,
  characterBuildSpellcastingSlotCapacity,
  parseCharacterBuildMagicInitiateSpellAccesses,
  classUnitIdToClassName,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  eldritchInvocationId,
  type CharacterBuild,
  type CharacterBuildMagicInitiateSpellAccessIssue,
  type CharacterEquipmentItemId,
  type CharacterBuildSpellcastingSource,
  type NonEmptyReadonlyArray,
} from "@dnd/character-creation-runtime";
import {
  characterSheetArmorClassState,
  characterSheetUnarmoredArmorClassBase,
  characterSheetSpellbookRitualAccessesForBuild,
  characterSheetSpellAccessesForBuild,
  type CharacterSheetArmorClassBaseChoice,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import {
  armorClassDelta,
  type ArmorClassBaseSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { isMonkWeapon } from "@dnd/shared-algebras/martial-arts-algebra";
import {
  abilityModifier as battleAbilityModifier,
  attackBonus as battleAttackBonus,
  characterLevel,
  classLevel,
  type AbilityModifier,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type {
  Ability,
  ClassName,
  DamageType,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { spellHasTopLevelRitualTag } from "@dnd/surface/surface/types";
import {
  allCantripsFromAnyClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
  classSpellListForSpellcastingClassRecord,
  spellcastingClassRecordForClassName,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";
import {
  classSpellChoiceIsRuntimeDetached,
  omitRuntimeDetachedClassSpellChoices,
  type ClassSpellChoiceKind,
} from "./class-spell-choice-projection.ts";

export type BattleCreatureInitIssue = {
  readonly tag: "battleCreatureInitIssue";
  readonly message: string;
  readonly spellAccessIssues?: readonly CharacterBattleSpellAccessProjectionIssue[];
};

type CharacterBattleSpellAccessProjectionIssueBase = {
  readonly tag: "characterBattleSpellAccessProjectionIssue";
  readonly message: string;
};

export type CharacterBattleSpellAccessProjectionIssue =
  | (CharacterBattleSpellAccessProjectionIssueBase & {
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause:
        | "missingSourceUnit"
        | "unsupportedSourceUnit"
        | "missingSpellListSource"
        | "invalidSpellSelection";
    })
  | (CharacterBattleSpellAccessProjectionIssueBase & {
      readonly issueIndex: number;
      readonly cause: "invalidBuildSpellAccess";
    });

export function battleCreatureInitIssue(
  message: string,
  spellAccessIssues: readonly CharacterBattleSpellAccessProjectionIssue[] = [],
): Either.Either<never, BattleCreatureInitIssue> {
  return Either.left({
    tag: "battleCreatureInitIssue",
    message,
    ...(spellAccessIssues.length === 0 ? {} : { spellAccessIssues }),
  });
}

export function characterArmorClassState(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
}): Either.Either<ArmorClassState, BattleCreatureInitIssue> {
  const state = characterSheetArmorClassState(input);
  if (Either.isLeft(state)) return battleCreatureInitIssue(state.left.message);
  const bonuses = [...state.right.bonuses];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, featureUnitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    bonuses.push(...armorDefenseBonus(unit.right));
  }
  return Either.right({ ...state.right, bonuses });
}

export function characterUnarmoredArmorClassBases(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly shieldedBaseChoice?: CharacterSheetArmorClassBaseChoice;
  readonly unshieldedBaseChoice?: CharacterSheetArmorClassBaseChoice;
}): Either.Either<
  {
    readonly shielded: Extract<
      ArmorClassBaseSource,
      { readonly kind: "ability_sum" }
    >;
    readonly unshielded: Extract<
      ArmorClassBaseSource,
      { readonly kind: "ability_sum" }
    >;
  },
  BattleCreatureInitIssue
> {
  const shielded = characterSheetUnarmoredArmorClassBase({
    build: input.build,
    unitLibrary: input.unitLibrary,
    ...(input.shieldedBaseChoice === undefined
      ? {}
      : { baseChoice: input.shieldedBaseChoice }),
    wieldingShield: true,
  });
  if (Either.isLeft(shielded)) {
    return battleCreatureInitIssue(shielded.left.message);
  }
  const unshielded = characterSheetUnarmoredArmorClassBase({
    build: input.build,
    unitLibrary: input.unitLibrary,
    ...(input.unshieldedBaseChoice === undefined
      ? {}
      : { baseChoice: input.unshieldedBaseChoice }),
    wieldingShield: false,
  });
  return Either.isLeft(unshielded)
    ? battleCreatureInitIssue(unshielded.left.message)
    : Either.right({ shielded: shielded.right, unshielded: unshielded.right });
}

function armorDefenseBonus(
  unit: Parameters<typeof passiveArmorClassBonusProfileForUnit>[0],
): ArmorClassState["bonuses"] {
  const profile = passiveArmorClassBonusProfileForUnit(unit);
  return profile === null
    ? []
    : [
        {
          kind: "wearing_armor",
          bonus: armorClassDelta(profile.bonus),
          categories: profile.condition.categories,
          sourceUnitId: unit.id,
        },
      ];
}

export function characterAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
  pactBladeBondedWeaponItemId?: CharacterEquipmentItemId,
): Either.Either<
  CharacterBattleCreatureInitWeaponAttack | null,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.weapon;
  if (loadoutWeapon === undefined) {
    return Either.right(null);
  }
  const selectedWeapon = characterEquipmentItemSourceFromId(
    loadoutWeapon.itemId,
  ).unitId;
  const selectedWeaponItemId = loadoutWeapon.itemId;

  return characterWeaponAttackActionOption(
    selectedWeapon,
    selectedWeaponItemId,
    build,
    unitLibrary,
    classLevels,
    pactBladeBondedWeaponItemId,
  );
}

export function characterOffHandAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
  pactBladeBondedWeaponItemId?: CharacterEquipmentItemId,
): Either.Either<
  CharacterBattleCreatureInitWeaponAttack | undefined,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.offHandWeapon;
  if (loadoutWeapon === undefined) {
    return Either.right(undefined);
  }
  const selectedWeapon = characterEquipmentItemSourceFromId(
    loadoutWeapon.itemId,
  ).unitId;
  const selectedWeaponItemId = loadoutWeapon.itemId;

  const option = characterWeaponAttackActionOption(
    selectedWeapon,
    selectedWeaponItemId,
    build,
    unitLibrary,
    classLevels,
    pactBladeBondedWeaponItemId,
  );
  if (Either.isLeft(option)) {
    return battleCreatureInitIssue(option.left.message);
  }
  return option.right === null
    ? battleCreatureInitIssue(
        "Off-hand weapon loadout must reference a Weapon Unit.",
      )
    : Either.right(option.right);
}

export function characterBattleLoadoutFromBuild(
  build: CharacterBuild,
): CharacterBattleLoadoutRef {
  const armorUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.armor,
  );
  const shieldUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.shield,
  );
  const weaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.weapon?.itemId,
  );
  const offHandWeaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.offHandWeapon?.itemId,
  );
  const loadout = build.equipment.loadout;

  return {
    ...(loadout.armor == null || armorUnitId == null
      ? {}
      : {
          armor: { itemId: battleObjectId(loadout.armor), unitId: armorUnitId },
        }),
    ...(loadout.shield == null || shieldUnitId == null
      ? {}
      : {
          shield: {
            itemId: battleObjectId(loadout.shield),
            unitId: shieldUnitId,
          },
        }),
    ...(loadout.weapon == null || weaponUnitId == null
      ? {}
      : {
          weapon: {
            itemId: battleObjectId(loadout.weapon.itemId),
            unitId: weaponUnitId,
            grip: loadout.weapon.grip,
          },
        }),
    ...(loadout.offHandWeapon == null || offHandWeaponUnitId == null
      ? {}
      : {
          offHandWeapon: {
            itemId: battleObjectId(loadout.offHandWeapon.itemId),
            unitId: offHandWeaponUnitId,
          },
        }),
  };
}

function characterBuildEquipmentItemUnitId(
  itemId:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["armor"]>
    | NonNullable<CharacterBuild["equipment"]["loadout"]["shield"]>
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"]
    | undefined,
): UnitRecord["id"] | undefined {
  if (itemId == null) {
    return undefined;
  }

  return characterEquipmentItemSourceFromId(itemId).unitId;
}

export function characterPactBladeBondedWeaponItemId(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly itemId:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"]
    | undefined;
}): Either.Either<
  | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
  | NonNullable<
      CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
    >["itemId"]
  | undefined,
  BattleCreatureInitIssue
> {
  if (input.itemId === undefined) {
    return Either.right(undefined);
  }
  if (!hasPactOfTheBlade(input.build)) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond requires selected pact_of_the_blade invocation ownership.",
    );
  }
  const loadoutItemIds = [
    input.build.equipment.loadout.weapon?.itemId,
    input.build.equipment.loadout.offHandWeapon?.itemId,
  ];
  if (!loadoutItemIds.some((itemId) => itemId === input.itemId)) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference a wielded loadout weapon.",
    );
  }
  if (
    !input.build.equipment.owned.some(
      (item) =>
        (item.kind === "catalogItem" || item.kind === "authoredCatalogItem") &&
        item.itemId === input.itemId,
    )
  ) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference owned equipment.",
    );
  }
  const weaponUnitId = characterEquipmentItemSourceFromId(input.itemId).unitId;
  const unit = getRequiredUnit(input.unitLibrary, weaponUnitId);
  if (Either.isLeft(unit)) {
    return battleCreatureInitIssue(unit.left.message);
  }
  if (
    unit.right.kind !== "weapon" ||
    unit.right.usage !== "melee" ||
    (unit.right.category !== "simple" && unit.right.category !== "martial") ||
    unit.right.damage.kind !== "dice"
  ) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference a Simple or Martial Melee weapon with dice damage.",
    );
  }
  return Either.right(input.itemId);
}

function characterWeaponAttackActionOption(
  unitId: UnitRecord["id"],
  itemId: CharacterEquipmentItemId,
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[],
  pactBladeBondedWeaponItemId: CharacterEquipmentItemId | undefined,
): Either.Either<
  CharacterBattleCreatureInitWeaponAttack | null,
  BattleCreatureInitIssue
> {
  const unit = getRequiredUnit(unitLibrary, unitId);
  if (Either.isLeft(unit)) {
    return battleCreatureInitIssue(unit.left.message);
  }
  if (unit.right.kind !== "weapon" || unit.right.damage.kind !== "dice") {
    return Either.right(null);
  }

  const baseAttack = {
    ...characterBattleCreatureInitWeaponAttack({
      kind: "weapon",
      weapon: admitCharacterWeaponExecutionWeapon(unit.right),
      ability: "str",
      abilityModifier: battleAbilityModifier(
        scoreModifier(build.abilityScores.str),
      ),
    }),
    ability: "str",
  } as const satisfies PhysicalAbilityWeaponAttack;
  const martialArts = martialArtsAttackProjectionForBuild({
    build,
    unitLibrary,
    classLevels,
  });
  if (Either.isLeft(martialArts)) {
    return battleCreatureInitIssue(martialArts.left.message);
  }
  const projectedAttack =
    martialArts.right === null || !isMonkWeapon(unit.right)
      ? baseAttack
      : martialArtsWeaponAttack(baseAttack, build, martialArts.right);
  return Either.right(
    pactBladeWeaponAttack(
      projectedAttack,
      build,
      itemId,
      pactBladeBondedWeaponItemId,
    ),
  );
}

export function characterBaseUnarmedStrikeActionOption(
  build: CharacterBuild,
  unitLibrary?: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
): Either.Either<CharacterUnarmedStrikeActionOption, BattleCreatureInitIssue> {
  const strengthModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.str),
  );
  const buildProficiencyBonus = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const baseAttack = {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: strengthModifier,
    attackBonus: battleAttackBonus(
      Number(strengthModifier) + Number(buildProficiencyBonus),
    ),
    damageAbilityModifier: strengthModifier,
  } as const satisfies CharacterUnarmedStrikeActionOption;
  if (unitLibrary === undefined) return Either.right(baseAttack);
  const martialArts = martialArtsAttackProjectionForBuild({
    build,
    unitLibrary,
    classLevels,
  });
  if (Either.isLeft(martialArts)) {
    return battleCreatureInitIssue(martialArts.left.message);
  }
  return Either.right(
    martialArts.right === null
      ? baseAttack
      : martialArtsUnarmedStrike(baseAttack, build, martialArts.right),
  );
}

type MartialArtsAttackProjection = NonNullable<
  ReturnType<typeof martialArtsAttackProjectionProfileForUnit>
>;

const PACT_OF_THE_BLADE_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_blade");
const ARMOR_OF_SHADOWS_INVOCATION_ID = eldritchInvocationId("armor_of_shadows");
const PACT_OF_THE_CHAIN_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_chain");
const PACT_OF_THE_TOME_INVOCATION_ID = eldritchInvocationId("pact_of_the_tome");
const ELDRITCH_MIND_INVOCATION_ID = eldritchInvocationId("eldritch_mind");
// Armor of Shadows and Mage Armor are distinct authored records. The canonical
// invocation explicitly references that spell; this transitional constant
// preserves the authored cross-reference rather than equating their identities
// or selecting runtime mechanics. Move ownership to authored data in #219.
const ARMOR_OF_SHADOWS_SPELL_ID = "mage_armor";
const PACT_OF_THE_CHAIN_SPELL_ID = "find_familiar";
const PACT_OF_THE_BLADE_ADDITIONAL_DAMAGE_TYPE_CHOICES = [
  "necrotic",
  "psychic",
  "radiant",
] as const satisfies ReadonlyArray<DamageType>;

type PhysicalAbilityWeaponAttack = CharacterBattleCreatureInitWeaponAttack & {
  readonly ability: "str" | "dex";
};

function pactBladeDamageTypeChoices(
  weaponDamageType: DamageType,
): CharacterWeaponAttackDamageTypeChoices {
  if (weaponDamageType === "necrotic") {
    return [weaponDamageType, "psychic", "radiant"];
  }
  if (weaponDamageType === "psychic") {
    return [weaponDamageType, "necrotic", "radiant"];
  }
  if (weaponDamageType === "radiant") {
    return [weaponDamageType, "necrotic", "psychic"];
  }
  return [
    weaponDamageType,
    ...PACT_OF_THE_BLADE_ADDITIONAL_DAMAGE_TYPE_CHOICES,
  ];
}

function pactBladeWeaponAttack(
  attack: PhysicalAbilityWeaponAttack,
  build: CharacterBuild,
  itemId: CharacterEquipmentItemId,
  pactBladeBondedWeaponItemId: CharacterEquipmentItemId | undefined,
): CharacterBattleCreatureInitWeaponAttack {
  if (
    pactBladeBondedWeaponItemId !== itemId ||
    attack.weapon.usage !== "melee" ||
    attack.weapon.damage.kind !== "dice" ||
    (attack.weapon.category !== "simple" &&
      attack.weapon.category !== "martial") ||
    !hasPactOfTheBlade(build)
  ) {
    return attack;
  }

  const charismaModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.cha),
  );
  const characterProficiency = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const charismaAttack = {
    ability: "cha" as const,
    abilityModifier: charismaModifier,
    attackBonus: battleAttackBonus(
      Number(charismaModifier) + Number(characterProficiency),
    ),
    damageAbilityModifier: charismaModifier,
  };
  return {
    ...attack,
    attackBonus: battleAttackBonus(
      Number(attack.abilityModifier) + Number(characterProficiency),
    ),
    damageAbilityModifier: attack.abilityModifier,
    alternateAbilityChoices: [charismaAttack],
    damageTypeChoices: pactBladeDamageTypeChoices(
      attack.weapon.damage.damageType,
    ),
  };
}

function hasPactOfTheBlade(build: CharacterBuild): boolean {
  return hasSelectedEldritchInvocation(build, PACT_OF_THE_BLADE_INVOCATION_ID);
}

export function characterInvocationFeatures(
  build: CharacterBuild,
): readonly CharacterBattleInvocationFeature[] {
  return hasSelectedEldritchInvocation(build, ELDRITCH_MIND_INVOCATION_ID)
    ? [{ tag: "eldritchMind" }]
    : [];
}

function hasSelectedEldritchInvocation(
  build: CharacterBuild,
  invocationId: ReturnType<typeof eldritchInvocationId>,
): boolean {
  return build.features.some(
    (feature) =>
      feature.kind === "selectedEldritchInvocation" &&
      feature.selection.invocationId === invocationId,
  );
}

function hasSelectedWarlockEldritchInvocation(
  build: CharacterBuild,
  input: {
    readonly unitLibrary: UnitCatalog;
    readonly invocationId: ReturnType<typeof eldritchInvocationId>;
  },
): boolean {
  return build.features.some((feature) => {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.invocationId !== input.invocationId
    ) {
      return false;
    }
    const source = input.unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source) || source.value.kind !== "class_feature") {
      return false;
    }
    const mechanics = source.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function martialArtsAttackProjectionForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classLevels: readonly CharacterBattleClassLevelInit[];
}): Either.Either<MartialArtsAttackProjection | null, BattleCreatureInitIssue> {
  if (!martialArtsLoadoutConditionHolds(input)) {
    return Either.right(null);
  }
  const classLevels = input.classLevels.map((entry) => ({
    className: entry.className,
    level: classLevel(entry.level),
  }));
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, featureUnitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    const profile = martialArtsAttackProjectionProfileForUnit(
      unit.right,
      classLevels,
    );
    if (profile !== null) {
      return Either.right(profile);
    }
  }
  return Either.right(null);
}

function martialArtsLoadoutConditionHolds(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): boolean {
  const loadout = input.build.equipment.loadout;
  if (loadout.armor !== undefined || loadout.shield !== undefined) {
    return false;
  }
  const weaponUnitIds = [
    characterBuildEquipmentItemUnitId(loadout.weapon?.itemId),
    characterBuildEquipmentItemUnitId(loadout.offHandWeapon?.itemId),
  ].filter((unitId): unitId is UnitRecord["id"] => unitId !== undefined);
  return weaponUnitIds.every((unitId) => {
    const unit = input.unitLibrary.getUnit(unitId);
    return Option.isSome(unit) && unit.value.kind === "weapon"
      ? isMonkWeapon(unit.value)
      : false;
  });
}

function martialArtsWeaponAttack(
  attack: PhysicalAbilityWeaponAttack,
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): PhysicalAbilityWeaponAttack {
  const chosen = martialArtsChosenAbility(
    build,
    attack.ability,
    attack.abilityModifier,
  );
  return {
    ...attack,
    weapon: weaponWithMartialArtsDamage(attack.weapon, projection),
    ability: chosen.ability,
    abilityModifier: chosen.modifier,
    damageAbilityModifier: chosen.modifier,
  };
}

function martialArtsUnarmedStrike(
  attack: CharacterUnarmedStrikeActionOption & {
    readonly attackAbility: Ability;
  },
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): CharacterUnarmedStrikeActionOption {
  const chosen = martialArtsChosenAbility(
    build,
    attack.attackAbility,
    attack.attackAbilityModifier,
  );
  const proficiency = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const damageReplacement = projection.martialArts.damageReplacement;
  const effect = {
    kind: "damage" as const,
    damage: {
      kind: "mechanicalReplacement" as const,
      dice: damageReplacement.dice,
      dieSize: damageReplacement.dieSize,
      damageType: "bludgeoning" as const,
    },
  };
  return {
    ...attack,
    effect,
    attackAbility: chosen.ability,
    attackAbilityModifier: chosen.modifier,
    attackBonus: battleAttackBonus(
      Number(chosen.modifier) + Number(proficiency),
    ),
    damageAbilityModifier: chosen.modifier,
  };
}

function martialArtsChosenAbility<FallbackAbility extends Ability>(
  build: CharacterBuild,
  fallbackAbility: FallbackAbility,
  fallbackModifier: AbilityModifier,
): {
  readonly ability: "dex" | FallbackAbility;
  readonly modifier: AbilityModifier;
} {
  const dexModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.dex),
  );
  return dexModifier >= fallbackModifier
    ? { ability: "dex", modifier: dexModifier }
    : { ability: fallbackAbility, modifier: fallbackModifier };
}

function weaponWithMartialArtsDamage(
  weapon: CharacterWeaponAttackActionOption["weapon"],
  projection: MartialArtsAttackProjection,
): CharacterWeaponAttackActionOption["weapon"] {
  const damageReplacement = projection.martialArts.damageReplacement;
  if (
    weapon.damage.kind !== "dice" ||
    weapon.damage.dice !== 1 ||
    weapon.damage.dieSize >= damageReplacement.dieSize
  ) {
    return weapon;
  }
  return {
    ...weapon,
    damage: {
      ...weapon.damage,
      dice: damageReplacement.dice,
      dieSize: damageReplacement.dieSize,
    },
  };
}

function spellcastingAllowedByArmorTraining(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<boolean, BattleCreatureInitIssue> {
  const armor =
    build.equipment.loadout.armor == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(build.equipment.loadout.armor)
            .unitId,
        );
  if (armor !== undefined && Either.isLeft(armor)) {
    return battleCreatureInitIssue(armor.left.message);
  }
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  if (Either.isLeft(armorTraining)) {
    return battleCreatureInitIssue(
      armorTraining.left.map(characterCreationIssueMessage).join("; "),
    );
  }
  return Either.right(
    armor?.right.kind !== "armor" ||
      armorTraining.right.includes(armor.right.category),
  );
}

export function characterSpellcasting(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
}): Either.Either<
  NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >,
  BattleCreatureInitIssue
> {
  const { build, unitLibrary } = input;
  const parsedMagicInitiateSpellAccesses =
    parseCharacterBuildMagicInitiateSpellAccesses({
      value: build.magicInitiateSpellAccesses,
      build,
      unitLibrary,
    });
  if (Either.isLeft(parsedMagicInitiateSpellAccesses)) {
    const spellAccessIssues = characterBattleSpellAccessProjectionIssues(
      parsedMagicInitiateSpellAccesses.left,
      build,
    );
    return battleCreatureInitIssue(
      spellAccessIssues.map((issue) => issue.message).join("; "),
      spellAccessIssues,
    );
  }
  const spellcasting = build.spellcasting;
  const canCastSpells = characterBattleSpellcastingCanCast(input);
  if (Either.isLeft(canCastSpells)) {
    return battleCreatureInitIssue(canCastSpells.left.message);
  }
  const sources =
    spellcasting === undefined
      ? Either.right(null)
      : spellcastingSourcesWithOneAbilityAndClass({
          unitLibrary,
          sources: spellcasting.sources,
        });
  if (Either.isLeft(sources)) {
    return battleCreatureInitIssue(sources.left.message);
  }
  const spellRecords = characterBattleSpellRecordsForSources({
    sources: sources.right,
    unitLibrary,
  });
  if (Either.isLeft(spellRecords)) {
    return Either.left(spellRecords.left);
  }
  const projectedMagicInitiateSpellAccesses =
    projectCharacterBattleMagicInitiateSpellAccesses({
      build,
      accesses: parsedMagicInitiateSpellAccesses.right,
      unitLibrary,
    });
  if (Either.isLeft(projectedMagicInitiateSpellAccesses)) {
    const spellAccessIssues = projectedMagicInitiateSpellAccesses.left;
    return battleCreatureInitIssue(
      spellAccessIssues.map((issue) => issue.message).join("; "),
      spellAccessIssues,
    );
  }
  const projectedSpellAccesses = projectedMagicInitiateSpellAccesses.right;
  const additionalSpellAccesses = characterBattleAdditionalSpellAccesses({
    build,
    spellcastingSources: spellcasting?.sources ?? [],
    unitLibrary,
    bookOfShadowsPresence: input.bookOfShadowsPresence,
  });
  if (Either.isLeft(additionalSpellAccesses)) {
    return Either.left(additionalSpellAccesses.left);
  }

  const spellSlots =
    input.spellSlots ??
    characterBuildSpellcastingSlotCapacity(build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));

  return Either.right({
    spellcastingSource:
      sources.right === null
        ? { tag: "spellAccessOnly" }
        : {
            tag: "classSpellcasting",
            className: sources.right.sourceClassName,
            abilityModifier: battleAbilityModifier(
              scoreModifier(
                build.abilityScores[sources.right.spellcastingAbility],
              ),
            ),
          },
    proficiencyBonus: proficiencyBonusForCharacterLevel(
      characterBuildLevel(build),
    ),
    canCastSpells: canCastSpells.right,
    cantrips: spellRecords.right.cantrips,
    preparedSpells: spellRecords.right.preparedSpells,
    featurePreparedSpells: additionalSpellAccesses.right.featurePreparedSpells,
    spellAccesses: projectedSpellAccesses,
    spellbookRitualSpellAccesses:
      additionalSpellAccesses.right.spellbookRitualSpellAccesses,
    bookOfShadowsSpellAccesses:
      additionalSpellAccesses.right.bookOfShadowsSpellAccesses,
    invocationSpellAccesses:
      additionalSpellAccesses.right.invocationSpellAccesses,
    spellSlots: spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      count: slot.count,
    })),
    spellSlotExpenditures: spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      expended: slot.expended,
    })),
  });
}

function characterBattleSpellcastingCanCast(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<boolean, BattleCreatureInitIssue> {
  const sheetSpellAccesses = characterSheetSpellAccessesForBuild({
    build: input.build,
    unitLibrary: input.unitLibrary,
  }).filter((access) => access.source === "magicInitiate");
  if (
    input.build.spellcasting === undefined &&
    sheetSpellAccesses.length === 0
  ) {
    return battleCreatureInitIssue(
      "Character build does not have spellcasting.",
    );
  }
  return spellcastingAllowedByArmorTraining(input.build, input.unitLibrary);
}

type CharacterBattleSpellcastingSources = {
  readonly spellcastingAbility: CharacterBuildSpellcastingSource["spellcastingAbility"];
  readonly sourceClassName: ClassName;
  readonly sources: readonly CharacterBuildSpellcastingSource[];
};

function characterBattleSpellRecordsForSources(input: {
  readonly sources: CharacterBattleSpellcastingSources | null;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  {
    readonly cantrips: readonly SpellRecord[];
    readonly preparedSpells: readonly SpellRecord[];
  },
  BattleCreatureInitIssue
> {
  const cantrips =
    input.sources === null
      ? Either.right([] as readonly SpellRecord[])
      : battleProjectedSpellRecordsForIds({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sources.sourceClassName,
          spellIds: input.sources.sources.flatMap((source) => source.cantrips),
          selectionKind: "cantrip",
        });
  const preparedSpells =
    input.sources === null
      ? Either.right([] as readonly SpellRecord[])
      : battleProjectedSpellRecordsForIds({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sources.sourceClassName,
          spellIds: input.sources.sources.flatMap(
            (source) => source.preparedSpells,
          ),
          selectionKind: "leveledSpell",
        });
  const issues = [cantrips, preparedSpells].flatMap((projection) =>
    Either.isLeft(projection) ? [projection.left.message] : [],
  );
  return Either.isLeft(cantrips) || Either.isLeft(preparedSpells)
    ? battleCreatureInitIssue(issues.join("; "))
    : Either.right({
        cantrips: cantrips.right,
        preparedSpells: preparedSpells.right,
      });
}

function characterBattleAdditionalSpellAccesses(input: {
  readonly build: CharacterBuild;
  readonly spellcastingSources: ReadonlyArray<
    NonNullable<CharacterBuild["spellcasting"]>["sources"][number]
  >;
  readonly unitLibrary: UnitCatalog;
  readonly bookOfShadowsPresence?:
    | CharacterBattleBookOfShadowsPresence
    | undefined;
}): Either.Either<
  {
    readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
    readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[];
    readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
    readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  },
  BattleCreatureInitIssue
> {
  const featurePreparedSpells = featurePreparedSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(featurePreparedSpells)) {
    return Either.left(featurePreparedSpells.left);
  }
  const invocationSpellAccesses = invocationSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(invocationSpellAccesses)) {
    return Either.left(invocationSpellAccesses.left);
  }
  const spellbookRitualSpellAccesses = spellbookRitualSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(spellbookRitualSpellAccesses)) {
    return Either.left(spellbookRitualSpellAccesses.left);
  }
  const bookOfShadowsSpellAccesses = bookOfShadowsSpellAccess({
    build: input.build,
    spellcastingSources: input.spellcastingSources,
    unitLibrary: input.unitLibrary,
    featurePreparedSpells: featurePreparedSpells.right,
    ...(input.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: input.bookOfShadowsPresence }),
  });
  if (Either.isLeft(bookOfShadowsSpellAccesses)) {
    return Either.left(bookOfShadowsSpellAccesses.left);
  }
  return Either.right({
    featurePreparedSpells: featurePreparedSpells.right,
    invocationSpellAccesses: invocationSpellAccesses.right,
    spellbookRitualSpellAccesses: spellbookRitualSpellAccesses.right,
    bookOfShadowsSpellAccesses: bookOfShadowsSpellAccesses.right,
  });
}

function characterBattleSpellAccessProjectionIssues(
  issues: readonly CharacterBuildMagicInitiateSpellAccessIssue[],
  build: CharacterBuild,
): readonly CharacterBattleSpellAccessProjectionIssue[] {
  return issues.map((issue, issueIndex) => {
    const accessIndex = issue.index;
    const access =
      accessIndex === undefined
        ? undefined
        : build.magicInitiateSpellAccesses[accessIndex];
    return access === undefined || accessIndex === undefined
      ? {
          tag: "characterBattleSpellAccessProjectionIssue",
          issueIndex,
          cause: "invalidBuildSpellAccess",
          message: issue.message,
        }
      : {
          tag: "characterBattleSpellAccessProjectionIssue",
          accessIndex,
          featUnitId: access.featUnitId,
          cause: "invalidSpellSelection",
          message: issue.message,
        };
  });
}

function projectCharacterBattleMagicInitiateSpellAccesses(input: {
  readonly build: CharacterBuild;
  readonly accesses: readonly CharacterBuild["magicInitiateSpellAccesses"][number][];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleSpellAccessInit[],
  readonly CharacterBattleSpellAccessProjectionIssue[]
> {
  const projected: CharacterBattleSpellAccessInit[] = [];
  const issues: CharacterBattleSpellAccessProjectionIssue[] = [];
  for (const [accessIndex, access] of input.accesses.entries()) {
    const projection = projectCharacterBattleMagicInitiateSpellAccess({
      build: input.build,
      access,
      accessIndex,
      unitLibrary: input.unitLibrary,
    });
    if (Either.isLeft(projection)) issues.push(projection.left);
    else projected.push(projection.right);
  }
  return issues.length > 0 ? Either.left(issues) : Either.right(projected);
}

function projectCharacterBattleMagicInitiateSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly access: CharacterBuild["magicInitiateSpellAccesses"][number];
  readonly accessIndex: number;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBattleSpellAccessInit,
  CharacterBattleSpellAccessProjectionIssue
> {
  const sourceUnit = input.unitLibrary.getUnit(input.access.featUnitId);
  if (Option.isNone(sourceUnit)) {
    return Either.left({
      tag: "characterBattleSpellAccessProjectionIssue",
      accessIndex: input.accessIndex,
      featUnitId: input.access.featUnitId,
      cause: "missingSourceUnit",
      message: `Magic Initiate Spell Access source Unit is missing: ${input.access.featUnitId}.`,
    });
  }
  if (
    sourceUnit.value.kind !== "feat" ||
    sourceUnit.value.mechanics.family !== "magic_initiate"
  ) {
    return Either.left({
      tag: "characterBattleSpellAccessProjectionIssue",
      accessIndex: input.accessIndex,
      featUnitId: input.access.featUnitId,
      cause: "unsupportedSourceUnit",
      message: `Magic Initiate Spell Access source Unit must be a magic_initiate feat: ${input.access.featUnitId}.`,
    });
  }
  const spellListClassRecord = spellcastingClassRecordForClassName({
    className: sourceUnit.value.mechanics.spellList,
    unitLibrary: input.unitLibrary,
  });
  if (spellListClassRecord === undefined) {
    return Either.left({
      tag: "characterBattleSpellAccessProjectionIssue",
      accessIndex: input.accessIndex,
      featUnitId: input.access.featUnitId,
      cause: "missingSpellListSource",
      message: `Magic Initiate Spell Access canonical spell list source is missing: ${sourceUnit.value.mechanics.spellList}.`,
    });
  }
  const spells = spellRecordsForIds(input.unitLibrary, [
    input.access.cantrips[0],
    input.access.cantrips[1],
    input.access.levelOneSpell,
  ] as const);
  if (Either.isLeft(spells)) {
    return Either.left({
      tag: "characterBattleSpellAccessProjectionIssue",
      accessIndex: input.accessIndex,
      featUnitId: input.access.featUnitId,
      cause: "invalidSpellSelection",
      message: spells.left.message,
    });
  }
  const spellList: CharacterBattleSpellListFact = {
    className: spellListClassRecord.className,
    ...classSpellListForSpellcastingClassRecord(spellListClassRecord),
  };
  return Either.right({
    source: {
      tag: "feat",
      sourceUnit: sourceUnit.value,
      spellList,
    },
    spellcastingAbilityModifier: Number(
      battleAbilityModifier(
        scoreModifier(
          input.build.abilityScores[input.access.spellcastingAbility],
        ),
      ),
    ),
    cantrips: [spells.right[0], spells.right[1]],
    levelOneSpell: spells.right[2],
  });
}

function spellbookRitualSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleSpellbookRitualSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const projectSource = (
    source: CharacterBuildSpellcastingSource,
  ): CharacterBuildSpellcastingSource => {
    const sourceClassName = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    return Either.isLeft(sourceClassName)
      ? source
      : {
          ...source,
          spellbook: omitRuntimeDetachedClassSpellChoices({
            unitLibrary: input.unitLibrary,
            sourceClassName: sourceClassName.right,
            spellIds: source.spellbook,
            choiceKind: "leveledSpell",
          }),
        };
  };
  const spellcasting = input.build.spellcasting;
  const ritualProjectionBuild =
    spellcasting === undefined
      ? input.build
      : {
          ...input.build,
          spellcasting: {
            ...spellcasting,
            sources: [
              projectSource(spellcasting.sources[0]),
              ...spellcasting.sources.slice(1).map(projectSource),
            ] as const,
          },
        };
  const accesses = characterSheetSpellbookRitualAccessesForBuild({
    ...input,
    build: ritualProjectionBuild,
  });
  return Either.isLeft(accesses)
    ? battleCreatureInitIssue(accesses.left.message)
    : Either.right(
        accesses.right.map((access) => ({
          tag: "spellbookRitual",
          spell: access.spell,
          featureUnitId: access.featureUnitId,
        })),
      );
}

function bookOfShadowsSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly spellcastingSources: ReadonlyArray<
    NonNullable<CharacterBuild["spellcasting"]>["sources"][number]
  >;
  readonly unitLibrary: UnitCatalog;
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
}): Either.Either<
  readonly CharacterBattleBookOfShadowsSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses = input.spellcastingSources.flatMap((source) => {
    const access = source.bookOfShadows;
    return access === undefined ? [] : [{ source, access }];
  });
  if (accesses.length === 0) {
    return Either.right([]);
  }
  if (input.bookOfShadowsPresence === undefined) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires Book of Shadows presence state.",
    );
  }
  if (
    !hasSelectedWarlockEldritchInvocation(input.build, {
      unitLibrary: input.unitLibrary,
      invocationId: PACT_OF_THE_TOME_INVOCATION_ID,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires Pact of the Tome.",
    );
  }
  if (accesses.length !== 1) {
    return battleCreatureInitIssue(
      "Character Battle supports one Book of Shadows Spell Access source.",
    );
  }
  const { source, access } = accesses[0];
  const sourceClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: source.sourceUnitId,
  });
  if (Either.isLeft(sourceClassName) || sourceClassName.right !== "warlock") {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access must be attached to the Warlock spellcasting source.",
    );
  }
  const selectedSpellIds = [...access.cantrips, ...access.ritualSpells];
  if (new Set(selectedSpellIds).size !== selectedSpellIds.length) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access selections must be distinct.",
    );
  }
  const alreadyPrepared = new Set([
    ...source.cantrips,
    ...source.preparedSpells,
    ...input.featurePreparedSpells.map((featureSpell) => featureSpell.spell.id),
  ]);
  if (selectedSpellIds.some((spellId) => alreadyPrepared.has(spellId))) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
    );
  }
  if (
    !allCantripsFromAnyClassSpellList({
      spellIds: access.cantrips,
      unitLibrary: input.unitLibrary,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList({
      spells: access.ritualSpells.map((spellId) => ({
        spellId,
        spellLevel: 1,
      })),
      unitLibrary: input.unitLibrary,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Ritual spells must be level-1 spells from class spell lists.",
    );
  }
  const cantrips = spellRecordsForIds(input.unitLibrary, access.cantrips);
  if (Either.isLeft(cantrips)) {
    return battleCreatureInitIssue(cantrips.left.message);
  }
  const ritualSpells = spellRecordsForIds(
    input.unitLibrary,
    access.ritualSpells,
  );
  if (Either.isLeft(ritualSpells)) {
    return battleCreatureInitIssue(ritualSpells.left.message);
  }
  if (cantrips.right.some((spell) => spell.mechanics.level !== 0)) {
    return battleCreatureInitIssue(
      "Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.right.some(
      (spell) =>
        spell.mechanics.level !== 1 || !spellHasTopLevelRitualTag(spell),
    )
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  return Either.right([
    {
      tag: access.tag,
      bookPresence: input.bookOfShadowsPresence,
      cantrips: cantrips.right,
      ritualSpells: ritualSpells.right,
      spellcastingFocus: access.spellcastingFocus,
    },
  ]);
}

function invocationSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleInvocationSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses: CharacterBattleInvocationSpellAccessInit[] = [];
  if (
    hasSelectedEldritchInvocation(input.build, ARMOR_OF_SHADOWS_INVOCATION_ID)
  ) {
    const access = invocationSpellAccessForSpell({
      unitLibrary: input.unitLibrary,
      spellId: authoredUnitId(ARMOR_OF_SHADOWS_SPELL_ID),
      tag: "armorOfShadowsMageArmor",
    });
    if (Either.isLeft(access)) {
      return Either.left(access.left);
    }
    accesses.push(access.right);
  }
  if (
    hasSelectedEldritchInvocation(input.build, PACT_OF_THE_CHAIN_INVOCATION_ID)
  ) {
    const access = invocationSpellAccessForSpell({
      unitLibrary: input.unitLibrary,
      spellId: authoredUnitId(PACT_OF_THE_CHAIN_SPELL_ID),
      tag: "pactOfTheChainFindFamiliar",
    });
    if (Either.isLeft(access)) {
      return Either.left(access.left);
    }
    accesses.push(access.right);
  }
  return Either.right(accesses);
}

function invocationSpellAccessForSpell(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly tag: CharacterBattleInvocationSpellAccessInit["tag"];
}): Either.Either<
  CharacterBattleInvocationSpellAccessInit,
  BattleCreatureInitIssue
> {
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) {
    return battleCreatureInitIssue(spell.left.message);
  }
  if (spell.right.kind !== "spell") {
    return battleCreatureInitIssue(`Expected spell Unit: ${input.spellId}`);
  }
  return Either.right({ tag: input.tag, spell: spell.right });
}

function featurePreparedSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleFeaturePreparedSpellInit[],
  BattleCreatureInitIssue
> {
  const featurePreparedSpells: CharacterBattleFeaturePreparedSpellInit[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) {
      continue;
    }
    if (
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive" ||
      !unitIsSupportedClassFeatureSpellFreeCastResource(unit.value)
    ) {
      continue;
    }
    for (const grant of unit.value.mechanics.grants) {
      if (grant.kind !== "grant_spell_access" || grant.mode !== "prepared") {
        continue;
      }
      const spell = getRequiredUnit(
        input.unitLibrary,
        authoredUnitId(grant.spellId),
      );
      if (Either.isLeft(spell)) {
        return battleCreatureInitIssue(spell.left.message);
      }
      if (spell.right.kind !== "spell") {
        return battleCreatureInitIssue(`Expected spell Unit: ${grant.spellId}`);
      }
      featurePreparedSpells.push({
        sourceUnitId: unit.value.id,
        spell: spell.right,
      });
    }
  }
  return Either.right(featurePreparedSpells);
}

function spellcastingSourcesWithOneAbilityAndClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sources: NonEmptyReadonlyArray<CharacterBuildSpellcastingSource>;
}): Either.Either<
  {
    readonly spellcastingAbility: CharacterBuildSpellcastingSource["spellcastingAbility"];
    readonly sourceClassName: ClassName;
    readonly sources: readonly CharacterBuildSpellcastingSource[];
  },
  BattleCreatureInitIssue
> {
  const firstSource = input.sources[0];
  const firstClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: firstSource.sourceUnitId,
  });
  if (Either.isLeft(firstClassName)) {
    return battleCreatureInitIssue(
      "Battle spellcasting projection requires a class spellcasting source.",
    );
  }
  if (
    !input.sources.every((source) => {
      const className = classUnitIdToClassName({
        unitLibrary: input.unitLibrary,
        classUnitId: source.sourceUnitId,
      });
      return (
        Either.isRight(className) && className.right === firstClassName.right
      );
    })
  ) {
    return battleCreatureInitIssue(
      "Battle spellcasting projection requires one source class.",
    );
  }
  return input.sources.every(
    (source) => source.spellcastingAbility === firstSource.spellcastingAbility,
  )
    ? Either.right({
        spellcastingAbility: firstSource.spellcastingAbility,
        sourceClassName: firstClassName.right,
        sources: input.sources,
      })
    : battleCreatureInitIssue(
        "Battle spellcasting projection requires one spellcasting ability.",
      );
}

function characterBuildLevel(build: CharacterBuild) {
  return characterLevel(computeTotalLevel(build.progression));
}

function spellRecordsForIds<const UnitIds extends readonly UnitRecord["id"][]>(
  unitLibrary: UnitCatalog,
  unitIds: UnitIds,
): Either.Either<
  { readonly [Index in keyof UnitIds]: SpellRecord },
  BattleCreatureInitIssue
> {
  const spells: SpellRecord[] = [];
  for (const unitId of unitIds) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    if (unit.right.kind !== "spell") {
      return battleCreatureInitIssue(`Expected spell Unit: ${unitId}`);
    }
    spells.push(unit.right);
  }
  // Every input id contributes exactly one record unless the function returns
  // a typed lookup/kind issue, so this projection preserves tuple length.
  return Either.right(
    spells as { readonly [Index in keyof UnitIds]: SpellRecord },
  );
}

function battleProjectedSpellRecordsForIds(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sourceClassName: ClassName;
  readonly spellIds: readonly UnitRecord["id"][];
  readonly selectionKind: ClassSpellChoiceKind;
}): Either.Either<readonly SpellRecord[], BattleCreatureInitIssue> {
  const spells: SpellRecord[] = [];
  const issues: string[] = [];
  for (const spellId of input.spellIds) {
    const unit = input.unitLibrary.getUnit(spellId);
    if (Option.isNone(unit)) {
      if (
        classSpellChoiceIsRuntimeDetached({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sourceClassName,
          spellId,
          choiceKind: input.selectionKind,
        })
      ) {
        continue;
      }
      issues.push(`Unknown Unit id: ${spellId}`);
      continue;
    }
    if (unit.value.kind !== "spell") {
      issues.push(`Expected spell Unit: ${spellId}`);
      continue;
    }
    spells.push(unit.value);
  }
  return issues.length === 0
    ? Either.right(spells)
    : battleCreatureInitIssue(issues.join("; "));
}

export function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Either.Either<UnitRecord, BattleCreatureInitIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : battleCreatureInitIssue(`Unknown Unit id: ${unitId}`);
}
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
