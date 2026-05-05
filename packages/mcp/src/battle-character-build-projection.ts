import {
  scoreModifier,
  type CharacterBattleSpellSlotState,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type BattleCreatureInit,
  type CharacterBattleLoadoutRef,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  armorClassDelta,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier as battleAbilityModifier,
  attackBonus as battleAttackBonus,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match, Option } from "effect";

export type BattleCreatureInitIssue = {
  readonly tag: "battleCreatureInitIssue";
  readonly message: string;
};

export function battleCreatureInitIssue(
  message: string,
): Either.Either<never, BattleCreatureInitIssue> {
  return Either.left({ tag: "battleCreatureInitIssue", message });
}

export function characterArmorClassState(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<ArmorClassState, BattleCreatureInitIssue> {
  const loadout = build.equipment;
  const defaultState = defaultArmorClassState();
  const armor =
    loadout.armor == null
      ? undefined
      : getRequiredUnit(unitLibrary, loadout.armor);
  if (armor !== undefined && Either.isLeft(armor)) {
    return battleCreatureInitIssue(armor.left.message);
  }
  const shield =
    loadout.shield == null
      ? undefined
      : getRequiredUnit(unitLibrary, loadout.shield);
  if (shield !== undefined && Either.isLeft(shield)) {
    return battleCreatureInitIssue(shield.left.message);
  }
  const bonuses: ArmorClassState["bonuses"][number][] = [];
  if (shield?.right.kind === "shield") {
    bonuses.push({
      kind: "shield",
      bonus: armorClassDelta(shield.right.armorClassProjection.bonus),
      handUse: shield.right.armorClassProjection.handUse,
      trainingRequired: shield.right.armorClassProjection.trainingRequired,
      sourceUnitId: shield.right.id,
    });
  }
  for (const ref of characterBuildUnitRefs(build)) {
    const unit = getRequiredUnit(unitLibrary, ref.unitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    bonuses.push(...armorDefenseBonus(unit.right));
  }

  return Either.right({
    ...defaultState,
    abilityModifiers: {
      ...zeroAbilityModifiers(),
      str: abilityModifier(scoreModifier(build.abilityScores.str)),
      dex: abilityModifier(scoreModifier(build.abilityScores.dex)),
      con: abilityModifier(scoreModifier(build.abilityScores.con)),
      int: abilityModifier(scoreModifier(build.abilityScores.int)),
      wis: abilityModifier(scoreModifier(build.abilityScores.wis)),
      cha: abilityModifier(scoreModifier(build.abilityScores.cha)),
    },
    base:
      armor?.right.kind === "armor"
        ? {
            kind: "armor",
            formula: armor.right.acFormula,
            category: armor.right.category,
          }
        : defaultState.base,
    bonuses,
    armorTraining: new Set(build.armorTraining),
    leftHandUse:
      shield?.right.kind === "shield"
        ? "shield"
        : loadout.offHandWeapon == null
          ? "free"
          : "offWeapon",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  });
}

function armorDefenseBonus(unit: UnitRecord): ArmorClassState["bonuses"] {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return [];
  }

  if (
    unit.mechanics.condition?.kind !== "wearing_armor" ||
    unit.mechanics.grants.length !== 1
  ) {
    return [];
  }

  const grant = unit.mechanics.grants[0];
  if (grant?.kind !== "modify_ac" || grant.delta.kind !== "fixed_dice") {
    return [];
  }
  const fixedDelta = grant.delta;

  return [
    {
      kind: "wearing_armor",
      bonus: armorClassDelta(
        Match.value(fixedDelta.sign).pipe(
          Match.when("+", () => fixedDelta.dice * fixedDelta.dieSize),
          Match.when("-", () => -(fixedDelta.dice * fixedDelta.dieSize)),
          Match.exhaustive,
        ),
      ),
      categories: unit.mechanics.condition.categories,
      sourceUnitId: unit.id,
    },
  ];
}

export function characterAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterWeaponAttackActionOption | null,
  BattleCreatureInitIssue
> {
  const selectedWeapon = characterBuildEquipmentItemUnitId(
    build.equipment.weapon?.itemId,
  );
  if (selectedWeapon == null) {
    return Either.right(null);
  }

  return characterWeaponAttackActionOption(selectedWeapon, build, unitLibrary);
}

export function characterOffHandAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterWeaponAttackActionOption | undefined,
  BattleCreatureInitIssue
> {
  const selectedWeapon = characterBuildEquipmentItemUnitId(
    build.equipment.offHandWeapon?.itemId,
  );
  if (selectedWeapon == null) {
    return Either.right(undefined);
  }

  const option = characterWeaponAttackActionOption(
    selectedWeapon,
    build,
    unitLibrary,
  );
  return Either.isLeft(option)
    ? battleCreatureInitIssue(option.left.message)
    : Either.right(option.right ?? undefined);
}

export function characterBattleLoadoutFromBuild(
  build: CharacterBuild,
): CharacterBattleLoadoutRef {
  const weaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.weapon?.itemId,
  );
  const offHandWeaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.offHandWeapon?.itemId,
  );

  return {
    ...(build.equipment.armor == null ? {} : { armor: build.equipment.armor }),
    ...(build.equipment.shield == null
      ? {}
      : { shield: build.equipment.shield }),
    ...(build.equipment.weapon == null || weaponUnitId == null
      ? {}
      : {
          weapon: {
            itemId: build.equipment.weapon.itemId,
            unitId: weaponUnitId,
            grip: build.equipment.weapon.grip,
          },
        }),
    ...(build.equipment.offHandWeapon == null || offHandWeaponUnitId == null
      ? {}
      : {
          offHandWeapon: {
            itemId: build.equipment.offHandWeapon.itemId,
            unitId: offHandWeaponUnitId,
          },
        }),
  };
}

function characterBuildEquipmentItemUnitId(
  itemId:
    | NonNullable<CharacterBuild["equipment"]["weapon"]>["itemId"]
    | NonNullable<CharacterBuild["equipment"]["offHandWeapon"]>["itemId"]
    | undefined,
): UnitRecord["id"] | undefined {
  if (itemId == null) {
    return undefined;
  }

  return characterEquipmentItemSourceFromId(itemId).unitId;
}

function characterWeaponAttackActionOption(
  unitId: UnitRecord["id"],
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
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

  return Either.right({
    kind: "weapon",
    weapon: unit.right,
    ability: "str",
    abilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores.str),
    ),
  });
}

export function characterBaseUnarmedStrikeActionOption(
  build: CharacterBuild,
): CharacterUnarmedStrikeActionOption {
  const strengthModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.str),
  );
  const buildProficiencyBonus = proficiencyBonus(characterLevel(build));
  return {
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
  };
}

function spellcastingAllowedByArmorTraining(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<boolean, BattleCreatureInitIssue> {
  const armor =
    build.equipment.armor == null
      ? undefined
      : getRequiredUnit(unitLibrary, build.equipment.armor);
  if (armor !== undefined && Either.isLeft(armor)) {
    return battleCreatureInitIssue(armor.left.message);
  }
  return Either.right(
    armor?.right.kind !== "armor" ||
      build.armorTraining.includes(armor.right.category),
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
  const cantrips = spellRecordsForIds(unitLibrary, spellcasting.cantrips);
  if (Either.isLeft(cantrips)) {
    return battleCreatureInitIssue(cantrips.left.message);
  }
  const preparedSpells = spellRecordsForIds(
    unitLibrary,
    spellcasting.preparedSpells,
  );
  if (Either.isLeft(preparedSpells)) {
    return battleCreatureInitIssue(preparedSpells.left.message);
  }

  return Either.right({
    spellcastingAbilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores[spellcasting.spellcastingAbility]),
    ),
    proficiencyBonus: proficiencyBonus(characterLevel(build)),
    canCastSpells: canCastSpells.right,
    cantrips: cantrips.right,
    preparedSpells: preparedSpells.right,
    spellSlots: spellcasting.spellSlots.map((slot) => ({
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
