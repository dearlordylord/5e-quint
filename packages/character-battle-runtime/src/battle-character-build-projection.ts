// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.martial-arts-attack-projection spell.invocation-marked-damage-rider
import {
  scoreModifier,
  type CharacterBattleSpellSlotState,
  type CharacterBattleClassLevelInit,
  type CharacterBattleFeaturePreparedSpellInit,
  type CharacterBattleInvocationSpellAccessInit,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type CharacterWeaponAttackDamageTypeChoices,
  type BattleCreatureInit,
  type CharacterBattleLoadoutRef,
  martialArtsAttackProjectionProfileForUnit,
  passiveArmorClassBonusProfileForUnit,
  unitIsFavoredEnemyHuntersMarkFreeCastResource,
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
  classLevel,
  type AbilityModifier,
  proficiencyBonus,
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
  const weaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.weapon?.itemId,
  );
  const offHandWeaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.offHandWeapon?.itemId,
  );
  const loadout = build.equipment.loadout;

  return {
    ...(loadout.armor == null ? {} : { armor: loadout.armor }),
    ...(loadout.shield == null ? {} : { shield: loadout.shield }),
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
  const buildProficiencyBonus = proficiencyBonus(characterLevel(build));
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
const ARMOR_OF_SHADOWS_SPELL_ID = "mage_armor";
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
  const characterProficiency = proficiencyBonus(characterLevel(build));
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

function hasSelectedEldritchInvocation(
  build: CharacterBuild,
  invocationId: ReturnType<typeof eldritchInvocationId>,
): boolean {
  return build.features.some(
    (feature) =>
      feature.kind === "selectedEldritchInvocation" &&
      feature.invocationId === invocationId,
  );
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
  attack: CharacterUnarmedStrikeActionOption,
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): CharacterUnarmedStrikeActionOption {
  const chosen = martialArtsChosenAbility(
    build,
    attack.attackAbility,
    attack.attackAbilityModifier,
  );
  const proficiency = proficiencyBonus(characterLevel(build));
  const damageReplacement = projection.martialArts.damageReplacement;
  const effect =
    damageReplacement === null
      ? attack.effect
      : {
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
    damageReplacement === null ||
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

  return Either.right({
    sourceClassName: sources.right.sourceClassName,
    spellcastingAbilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores[sources.right.spellcastingAbility]),
    ),
    proficiencyBonus: proficiencyBonus(characterLevel(build)),
    canCastSpells: canCastSpells.right,
    cantrips: cantrips.right,
    preparedSpells: preparedSpells.right,
    featurePreparedSpells: featurePreparedSpells.right,
    invocationSpellAccesses: invocationSpellAccesses.right,
    spellSlots: characterBuildSpellcastingSlotCapacity(build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
    })),
    ...(input.spellSlots === undefined
      ? {}
      : {
          spellSlotExpenditures: input.spellSlots.map((slot) => ({
            spellLevel: slot.spellLevel,
            expended: slot.expended,
          })),
        }),
  });
}

function invocationSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterBattleInvocationSpellAccessInit[],
  BattleCreatureInitIssue
> {
  if (
    !hasSelectedEldritchInvocation(input.build, ARMOR_OF_SHADOWS_INVOCATION_ID)
  ) {
    return Either.right([]);
  }
  const spell = getRequiredUnit(input.unitLibrary, ARMOR_OF_SHADOWS_SPELL_ID);
  if (Either.isLeft(spell)) {
    return battleCreatureInitIssue(spell.left.message);
  }
  if (spell.right.kind !== "spell") {
    return battleCreatureInitIssue(
      `Expected spell Unit: ${ARMOR_OF_SHADOWS_SPELL_ID}`,
    );
  }
  return Either.right([
    {
      tag: "armorOfShadowsMageArmor",
      spell: spell.right,
    },
  ]);
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
      !unitIsFavoredEnemyHuntersMarkFreeCastResource(unit.value)
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

function characterLevel(build: CharacterBuild): number {
  return computeTotalLevel(build.progression);
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
