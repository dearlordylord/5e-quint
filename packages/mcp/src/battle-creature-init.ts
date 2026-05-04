import {
  battleCreatureInitFromStatBlock,
  scoreModifier,
  startBattle,
  type CharacterBattleFeatureInit,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterUnarmedStrikeActionOption,
  type CharacterZeroHpLifecycleInit,
  type CharacterWeaponAttackActionOption,
  type BattleId,
  type BattleCombatantSide,
  type BattleState,
  type BattleStateInitIssue,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type InitiativeScore,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  computeTotalLevel,
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
  Hp,
  abilityModifier as battleAbilityModifier,
  attackBonus as battleAttackBonus,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match, Option } from "effect";
import { characterUnitRefsWithBattleSupportProfiles } from "./battle-support-profiles.ts";

// MCP owns cross-runtime wiring. Character creation finalizes a CharacterBuild;
// battle accepts battle-owned creature-init inputs. This mapper is where
// selected Unit refs are read into the creature combat view, so neither runtime
// has to import the other or grow an intermediate executable content model.

export type CharacterBuildCreatureInput = {
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly build: CharacterBuild;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
};

export function startBattleFromCharacterBuildAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterBuildCreatureInput;
  readonly statBlockBattleInput: StatBlockBattleInitInput;
  readonly unitLibrary: UnitCatalog;
  readonly combatantDistances?: Parameters<
    typeof startBattle
  >[0]["combatantDistances"];
}): Either.Either<BattleState, BattleStateInitIssue | BattleCreatureInitIssue> {
  const characterInit = battleCreatureInitFromCharacterBuild({
    ...input.character,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(characterInit)) {
    return battleCreatureInitIssue(characterInit.left.message);
  }

  return startBattle({
    battleId: input.battleId,
    combatants: [
      characterInit.right,
      battleCreatureInitFromStatBlock(input.statBlockBattleInput),
    ],
    combatantDistances: input.combatantDistances,
  });
}

export type BattleCreatureInitIssue = {
  readonly tag: "battleCreatureInitIssue";
  readonly message: string;
};

function battleCreatureInitIssue(
  message: string,
): Either.Either<never, BattleCreatureInitIssue> {
  return Either.left({ tag: "battleCreatureInitIssue", message });
}

export function battleCreatureInitFromCharacterBuild(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): Either.Either<BattleCreatureInit, BattleCreatureInitIssue> {
  const maxHp = Hp(input.build.hitPoints.maximum);
  const characterUnitRefs = characterUnitRefsWithBattleSupportProfiles(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(characterUnitRefs)) {
    return battleCreatureInitIssue(characterUnitRefs.left.message);
  }
  const currentHp = input.currentHp ?? maxHp;
  if (currentHp > maxHp) {
    return battleCreatureInitIssue(
      "Character battle initialization current HP exceeds max HP.",
    );
  }

  const species = getRequiredUnit(input.unitLibrary, input.build.species);
  if (Either.isLeft(species)) {
    return battleCreatureInitIssue(species.left.message);
  }
  if (species.right.kind !== "species") {
    return battleCreatureInitIssue(
      `Expected species Unit: ${input.build.species}`,
    );
  }

  const armorClass = characterArmorClassState(input.build, input.unitLibrary);
  if (Either.isLeft(armorClass)) {
    return battleCreatureInitIssue(armorClass.left.message);
  }
  const attack = characterAttackActionOption(input.build, input.unitLibrary);
  if (Either.isLeft(attack))
    return battleCreatureInitIssue(attack.left.message);
  const offHandAttack = characterOffHandAttackActionOption(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(offHandAttack)) {
    return battleCreatureInitIssue(offHandAttack.left.message);
  }
  const unitFeatures = characterBattleFeatures(input.build, input.unitLibrary);
  if (Either.isLeft(unitFeatures)) {
    return battleCreatureInitIssue(unitFeatures.left.message);
  }
  const resources = characterBattleResources(input.build, input.unitLibrary);
  if (Either.isLeft(resources)) {
    return battleCreatureInitIssue(resources.left.message);
  }
  const classLevels = characterBattleClassLevels(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(classLevels)) {
    return battleCreatureInitIssue(classLevels.left.message);
  }
  const spellcasting =
    input.build.spellcasting === undefined
      ? undefined
      : characterSpellcasting({
          build: input.build,
          unitLibrary: input.unitLibrary,
          spellSlots: input.spellSlots,
        });
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return battleCreatureInitIssue(spellcasting.left.message);
  }

  return Either.right({
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: input.characterId,
      characterUnitRefs: characterUnitRefs.right,
      classLevels: classLevels.right,
      armorClass: armorClass.right,
      size: species.right.size.size,
      speed: { walkFeet: movementFeet(species.right.speed.walkFeet) },
      currentHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout: input.build.equipment,
      attack: attack.right,
      unarmedStrike: characterBaseUnarmedStrikeActionOption(input.build),
      ...(offHandAttack.right === undefined
        ? {}
        : { offHandAttack: offHandAttack.right }),
      unitFeatures: unitFeatures.right,
      resources: resources.right,
      ...(spellcasting === undefined
        ? {}
        : { spellcasting: spellcasting.right }),
    },
  });
}

function characterBattleClassLevels(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"],
  BattleCreatureInitIssue
> {
  const classUnit = getRequiredUnit(unitLibrary, build.progression.classUnitId);
  if (Either.isLeft(classUnit)) {
    return battleCreatureInitIssue(classUnit.left.message);
  }
  if (classUnit.right.kind !== "class") {
    return battleCreatureInitIssue(
      `Expected class Unit: ${build.progression.classUnitId}`,
    );
  }

  return Either.right([
    {
      className: classUnit.right.className,
      level: build.progression.classLevel,
    },
  ] satisfies Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"]);
}

function characterBattleResources(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const resources: CharacterBattleResourceInit[] = [];
  for (const resource of build.resources) {
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    if (unit.right.kind !== "class_feature") {
      return battleCreatureInitIssue(
        `Expected class feature Unit for resource: ${unit.right.id}`,
      );
    }

    resources.push({ unit: unit.right });
  }
  return Either.right(resources);
}

function characterBattleFeatures(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBattleFeatureInit[],
  BattleCreatureInitIssue
> {
  const features: CharacterBattleFeatureInit[] = [];
  for (const feature of build.features) {
    if (feature.kind !== "classFeature") continue;
    const unit = getRequiredUnit(unitLibrary, feature.unitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    if (unit.right.kind !== "class_feature") {
      return battleCreatureInitIssue(
        `Expected class feature Unit for feature: ${unit.right.id}`,
      );
    }
    features.push({ unit: unit.right });
  }
  return Either.right(features);
}

function characterArmorClassState(
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

function characterAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterWeaponAttackActionOption | null,
  BattleCreatureInitIssue
> {
  const selectedWeapon = build.equipment.weapon?.unitId;
  if (selectedWeapon == null) {
    return Either.right(null);
  }

  return characterWeaponAttackActionOption(selectedWeapon, build, unitLibrary);
}

function characterOffHandAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterWeaponAttackActionOption | undefined,
  BattleCreatureInitIssue
> {
  const selectedWeapon = build.equipment.offHandWeapon?.unitId;
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

function characterBaseUnarmedStrikeActionOption(
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

function characterSpellcasting(input: {
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

function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Either.Either<UnitRecord, BattleCreatureInitIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Either.right(unit.value)
    : battleCreatureInitIssue(`Unknown Unit id: ${unitId}`);
}
