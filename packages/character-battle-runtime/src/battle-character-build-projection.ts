// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.martial-arts-attack-projection spell.invocation-marked-damage-rider
import {
  scoreModifier,
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
  martialArtsAttackProjectionProfileForUnit,
  passiveArmorClassBonusProfileForUnit,
  unitIsSupportedClassFeatureSpellFreeCastResource,
} from "@dnd/battle-runtime";
import {
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterBuildSpellcastingSlotCapacity,
  characterBuildUnitRefs,
  classUnitIdToClassName,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  eldritchInvocationId,
  type CharacterBuild,
  type CharacterEquipmentItemId,
  type CharacterBuildSpellcastingSource,
  type NonEmptyReadonlyArray,
} from "@dnd/character-creation-runtime";
import {
  characterSheetArmorClassState,
  characterSheetSpellbookRitualAccessesForBuild,
  type CharacterSheetArmorClassBaseChoice,
} from "@dnd/character-sheet-runtime";
import {
  armorClassDelta,
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
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { spellHasTopLevelRitualTag } from "@dnd/surface/surface/types";
import {
  allCantripsFromAnyClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
} from "@dnd/surface/surface/schema";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

export type BattleCreatureInitIssue = {
  readonly tag: "battleCreatureInitIssue";
  readonly message: string;
};

export function battleCreatureInitIssue(
  message: string,
): Either.Either<never, BattleCreatureInitIssue> {
  return Either.left({ tag: "battleCreatureInitIssue", message });
}

export function characterArmorClassState(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
}): Either.Either<ArmorClassState, BattleCreatureInitIssue> {
  const state = characterSheetArmorClassState(input);
  if (Either.isLeft(state)) return battleCreatureInitIssue(state.left.message);
  const bonuses = [...state.right.bonuses];
  for (const ref of characterBuildUnitRefs(input.build, input.unitLibrary)) {
    const unit = getRequiredUnit(input.unitLibrary, ref.unitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    bonuses.push(...armorDefenseBonus(unit.right));
  }
  return Either.right({ ...state.right, bonuses });
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
  CharacterWeaponAttackActionOption | null,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.weapon;
  if (loadoutWeapon === undefined) {
    return Either.right(null);
  }
  const selectedWeapon = characterBuildEquipmentItemUnitId(
    loadoutWeapon.itemId,
  );
  if (selectedWeapon == null) {
    return Either.right(null);
  }
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
  CharacterWeaponAttackActionOption | undefined,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.offHandWeapon;
  if (loadoutWeapon === undefined) {
    return Either.right(undefined);
  }
  const selectedWeapon = characterBuildEquipmentItemUnitId(
    loadoutWeapon.itemId,
  );
  if (selectedWeapon == null) {
    return Either.right(undefined);
  }
  const selectedWeaponItemId = loadoutWeapon.itemId;

  const option = characterWeaponAttackActionOption(
    selectedWeapon,
    selectedWeaponItemId,
    build,
    unitLibrary,
    classLevels,
    pactBladeBondedWeaponItemId,
  );
  return Either.isLeft(option)
    ? battleCreatureInitIssue(option.left.message)
    : Either.right(option.right ?? undefined);
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
      : { armor: { itemId: loadout.armor, unitId: armorUnitId } }),
    ...(loadout.shield == null || shieldUnitId == null
      ? {}
      : { shield: { itemId: loadout.shield, unitId: shieldUnitId } }),
    ...(loadout.weapon == null || weaponUnitId == null
      ? {}
      : {
          weapon: {
            itemId: loadout.weapon.itemId,
            unitId: weaponUnitId,
            grip: loadout.weapon.grip,
          },
        }),
    ...(loadout.offHandWeapon == null || offHandWeaponUnitId == null
      ? {}
      : {
          offHandWeapon: {
            itemId: loadout.offHandWeapon.itemId,
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
    !input.build.equipment.owned.some((item) => item.itemId === input.itemId)
  ) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference owned equipment.",
    );
  }
  const weaponUnitId = characterBuildEquipmentItemUnitId(input.itemId);
  if (weaponUnitId === undefined) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference a weapon item id.",
    );
  }
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
  CharacterWeaponAttackActionOption | null,
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
    kind: "weapon",
    weapon: unit.right,
    ability: "str",
    abilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores.str),
    ),
  } as const satisfies CharacterWeaponAttackActionOption;
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
const ARMOR_OF_SHADOWS_SPELL_ID = "mage_armor";
const PACT_OF_THE_CHAIN_SPELL_ID = "find_familiar";
const PACT_OF_THE_BLADE_ADDITIONAL_DAMAGE_TYPE_CHOICES = [
  "necrotic",
  "psychic",
  "radiant",
] as const satisfies ReadonlyArray<DamageType>;

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
  attack: CharacterWeaponAttackActionOption,
  build: CharacterBuild,
  itemId: CharacterEquipmentItemId,
  pactBladeBondedWeaponItemId: CharacterEquipmentItemId | undefined,
): CharacterWeaponAttackActionOption {
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
    ...(attack.ability === "cha"
      ? {}
      : { alternateAbilityChoices: [charismaAttack] }),
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
  for (const ref of characterBuildUnitRefs(input.build, input.unitLibrary)) {
    const unit = getRequiredUnit(input.unitLibrary, ref.unitId);
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
  attack: CharacterWeaponAttackActionOption,
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): CharacterWeaponAttackActionOption {
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
      kind: "authoredReplacement" as const,
      sourceUnitId: projection.unit.id,
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

function martialArtsChosenAbility(
  build: CharacterBuild,
  fallbackAbility: Ability,
  fallbackModifier: AbilityModifier,
): { readonly ability: Ability; readonly modifier: AbilityModifier } {
  const dexModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.dex),
  );
  return dexModifier >= fallbackModifier
    ? { ability: "dex", modifier: dexModifier }
    : { ability: fallbackAbility, modifier: fallbackModifier };
}

function weaponWithMartialArtsDamage(
  weapon: WeaponRecord,
  projection: MartialArtsAttackProjection,
): WeaponRecord {
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
          characterEquipmentItemSourceFromId(
            build.equipment.loadout.armor,
          )
            .unitId,
        );
  if (armor !== undefined && Either.isLeft(armor)) {
    return battleCreatureInitIssue(armor.left.message);
  }
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  if (Either.isLeft(armorTraining)) {
    return battleCreatureInitIssue(
      armorTraining.left.map((issue) => issue.message).join("; "),
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
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    return battleCreatureInitIssue(
      "Character build does not have spellcasting.",
    );
  }
  const canCastSpells = spellcastingAllowedByArmorTraining(build, unitLibrary);
  if (Either.isLeft(canCastSpells)) {
    return battleCreatureInitIssue(canCastSpells.left.message);
  }
  const sources = spellcastingSourcesWithOneAbilityAndClass({
    unitLibrary,
    sources: spellcasting.sources,
  });
  if (Either.isLeft(sources)) {
    return battleCreatureInitIssue(sources.left.message);
  }
  const cantrips = spellRecordsForIds(
    unitLibrary,
    sources.right.sources.flatMap((source) => source.cantrips),
  );
  if (Either.isLeft(cantrips)) {
    return battleCreatureInitIssue(cantrips.left.message);
  }
  const preparedSpells = spellRecordsForIds(
    unitLibrary,
    sources.right.sources.flatMap((source) => source.preparedSpells),
  );
  if (Either.isLeft(preparedSpells)) {
    return battleCreatureInitIssue(preparedSpells.left.message);
  }
  const featurePreparedSpells = featurePreparedSpellAccess({
    build,
    unitLibrary,
  });
  if (Either.isLeft(featurePreparedSpells)) {
    return Either.left(featurePreparedSpells.left);
  }
  const invocationSpellAccesses = invocationSpellAccess({
    build,
    unitLibrary,
  });
  if (Either.isLeft(invocationSpellAccesses)) {
    return Either.left(invocationSpellAccesses.left);
  }
  const spellbookRitualSpellAccesses = spellbookRitualSpellAccess({
    build,
    unitLibrary,
  });
  if (Either.isLeft(spellbookRitualSpellAccesses)) {
    return Either.left(spellbookRitualSpellAccesses.left);
  }

  const bookOfShadowsSpellAccesses = bookOfShadowsSpellAccess({
    build,
    unitLibrary,
    featurePreparedSpells: featurePreparedSpells.right,
    ...(input.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: input.bookOfShadowsPresence }),
  });
  if (Either.isLeft(bookOfShadowsSpellAccesses)) {
    return Either.left(bookOfShadowsSpellAccesses.left);
  }

  const spellSlots =
    input.spellSlots ??
    characterBuildSpellcastingSlotCapacity(build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));

  return Either.right({
    sourceClassName: sources.right.sourceClassName,
    spellcastingAbilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores[sources.right.spellcastingAbility]),
    ),
    proficiencyBonus: proficiencyBonusForCharacterLevel(
      characterBuildLevel(build),
    ),
    canCastSpells: canCastSpells.right,
    cantrips: cantrips.right,
    preparedSpells: preparedSpells.right,
    featurePreparedSpells: featurePreparedSpells.right,
    spellbookRitualSpellAccesses: spellbookRitualSpellAccesses.right,
    bookOfShadowsSpellAccesses: bookOfShadowsSpellAccesses.right,
    invocationSpellAccesses: invocationSpellAccesses.right,
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

function spellbookRitualSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleSpellbookRitualSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses = characterSheetSpellbookRitualAccessesForBuild(input);
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
  readonly unitLibrary: UnitCatalog;
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
}): Either.Either<
  readonly CharacterBattleBookOfShadowsSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses =
    input.build.spellcasting?.sources.flatMap((source) =>
      source.bookOfShadows === undefined ? [] : [source],
    ) ?? [];
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
  const source = accesses[0];
  const sourceClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: source.sourceUnitId,
  });
  if (Either.isLeft(sourceClassName) || sourceClassName.right !== "warlock") {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access must be attached to the Warlock spellcasting source.",
    );
  }
  const access = source.bookOfShadows;
  if (access === undefined) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access source is missing its selection.",
    );
  }
  if (access.tag !== "bookOfShadows") {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access selection is invalid.",
    );
  }
  if (access.cantrips.length !== 3 || access.ritualSpells.length !== 2) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires exactly three cantrips and two Ritual spells.",
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
  if (!allCantripsFromAnyClassSpellList(access.cantrips)) {
    return battleCreatureInitIssue(
      "Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList(
      access.ritualSpells.map((spellId) => ({ spellId, spellLevel: 1 })),
    )
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
  const bookOfShadowsSpells = bookOfShadowsSpellRecordTuples({
    cantrips: cantrips.right,
    ritualSpells: ritualSpells.right,
  });
  if (Either.isLeft(bookOfShadowsSpells)) {
    return Either.left(bookOfShadowsSpells.left);
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
      cantrips: bookOfShadowsSpells.right.cantrips,
      ritualSpells: bookOfShadowsSpells.right.ritualSpells,
      spellcastingFocus: access.spellcastingFocus,
    },
  ]);
}

type BookOfShadowsSpellRecordTuples = Pick<
  CharacterBattleBookOfShadowsSpellAccessInit,
  "cantrips" | "ritualSpells"
>;

function bookOfShadowsSpellRecordTuples(input: {
  readonly cantrips: readonly SpellRecord[];
  readonly ritualSpells: readonly SpellRecord[];
}): Either.Either<BookOfShadowsSpellRecordTuples, BattleCreatureInitIssue> {
  const cantrips = bookOfShadowsCantripRecords(input.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = bookOfShadowsRitualSpellRecords(input.ritualSpells);
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  return Either.right({
    cantrips: cantrips.right,
    ritualSpells: ritualSpells.right,
  });
}

function bookOfShadowsCantripRecords(
  spells: readonly SpellRecord[],
): Either.Either<
  readonly [SpellRecord, SpellRecord, SpellRecord],
  BattleCreatureInitIssue
> {
  const [first, second, third, ...extra] = spells;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    extra.length !== 0
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires exactly three cantrips.",
    );
  }
  const tuple: readonly [SpellRecord, SpellRecord, SpellRecord] = [
    first,
    second,
    third,
  ];
  return Either.right(tuple);
}

function bookOfShadowsRitualSpellRecords(
  spells: readonly SpellRecord[],
): Either.Either<readonly [SpellRecord, SpellRecord], BattleCreatureInitIssue> {
  const [first, second, ...extra] = spells;
  if (first === undefined || second === undefined || extra.length !== 0) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires exactly two Ritual spells.",
    );
  }
  const tuple: readonly [SpellRecord, SpellRecord] = [first, second];
  return Either.right(tuple);
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
      spellId: ARMOR_OF_SHADOWS_SPELL_ID,
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
      spellId: PACT_OF_THE_CHAIN_SPELL_ID,
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
      const spell = getRequiredUnit(input.unitLibrary, grant.spellId);
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

function spellRecordsForIds(
  unitLibrary: UnitCatalog,
  unitIds: readonly UnitRecord["id"][],
): Either.Either<readonly SpellRecord[], BattleCreatureInitIssue> {
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
  return Either.right(spells);
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
