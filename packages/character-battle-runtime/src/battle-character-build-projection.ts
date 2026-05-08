import {
  scoreModifier,
  type CharacterBattleSpellSlotState,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type BattleCreatureInit,
  type CharacterBattleLoadoutRef,
  passiveArmorClassBonusProfileForUnit,
} from "@dnd/battle-runtime";
import {
  characterBuildArmorTraining,
  characterBuildSpellcastingSlotCapacity,
  characterBuildUnitRefs,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  type CharacterBuild,
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
import {
  abilityModifier as battleAbilityModifier,
  attackBonus as battleAttackBonus,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
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
): Either.Either<
  CharacterWeaponAttackActionOption | null,
  BattleCreatureInitIssue
> {
  const selectedWeapon = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.weapon?.itemId,
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
    build.equipment.loadout.offHandWeapon?.itemId,
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
  const sources = spellcastingSourcesWithOneAbility(spellcasting.sources);
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

  return Either.right({
    spellcastingAbilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores[sources.right.spellcastingAbility]),
    ),
    proficiencyBonus: proficiencyBonus(characterLevel(build)),
    canCastSpells: canCastSpells.right,
    cantrips: cantrips.right,
    preparedSpells: preparedSpells.right,
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

function spellcastingSourcesWithOneAbility(
  sources: NonEmptyReadonlyArray<CharacterBuildSpellcastingSource>,
): Either.Either<
  {
    readonly spellcastingAbility: CharacterBuildSpellcastingSource["spellcastingAbility"];
    readonly sources: readonly CharacterBuildSpellcastingSource[];
  },
  BattleCreatureInitIssue
> {
  const firstSource = sources[0];
  return sources.every(
    (source) => source.spellcastingAbility === firstSource.spellcastingAbility,
  )
    ? Either.right({
        spellcastingAbility: firstSource.spellcastingAbility,
        sources,
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
