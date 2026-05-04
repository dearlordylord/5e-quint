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
  type BattleState,
  type BattleCombatantSide,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type InitiativeScore,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  computeTotalLevel,
  orderedProgressionClasses,
  progressionClassLevels,
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
import { Match } from "effect";
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
}): BattleState {
  return startBattle({
    battleId: input.battleId,
    combatants: [
      battleCreatureInitFromCharacterBuild({
        ...input.character,
        unitLibrary: input.unitLibrary,
      }),
      battleCreatureInitFromStatBlock(input.statBlockBattleInput),
    ],
    combatantDistances: input.combatantDistances,
  });
}

export function battleCreatureInitFromCharacterBuild(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): BattleCreatureInit {
  const maxHp = Hp(input.build.hitPoints.maximum);
  const characterUnitRefs = characterUnitRefsWithBattleSupportProfiles(
    input.build,
    input.unitLibrary,
  );
  const currentHp = input.currentHp ?? maxHp;
  const offHandAttack = characterOffHandAttackActionOption(
    input.build,
    input.unitLibrary,
  );
  if (currentHp > maxHp) {
    throw new Error(
      "Character battle initialization current HP exceeds max HP.",
    );
  }

  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: input.characterId,
      characterUnitRefs,
      classLevels: characterBattleClassLevels(input.build, input.unitLibrary),
      armorClass: characterArmorClassState(input.build, input.unitLibrary),
      size: characterBattleSize(input.build, input.unitLibrary),
      speed: characterBattleWalkSpeed(input.build, input.unitLibrary),
      currentHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout: input.build.equipment,
      attack: characterAttackActionOption(input.build, input.unitLibrary),
      unarmedStrike: characterBaseUnarmedStrikeActionOption(input.build),
      ...(offHandAttack === undefined ? {} : { offHandAttack }),
      unitFeatures: characterBattleFeatures(input.build, input.unitLibrary),
      resources: characterBattleResources(input.build, input.unitLibrary),
      ...(input.build.spellcasting === undefined
        ? {}
        : {
            spellcasting: characterSpellcasting({
              build: input.build,
              unitLibrary: input.unitLibrary,
              spellSlots: input.spellSlots,
            }),
          }),
    },
  };
}

function characterBattleWalkSpeed(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
) {
  const species = unitLibrary.requireUnit(build.species);
  if (species.kind !== "species") {
    throw new Error(`Expected species Unit: ${build.species}`);
  }
  return { walkFeet: movementFeet(species.speed.walkFeet) };
}

function characterBattleSize(build: CharacterBuild, unitLibrary: UnitCatalog) {
  const species = unitLibrary.requireUnit(build.species);
  if (species.kind !== "species") {
    throw new Error(`Expected species Unit: ${build.species}`);
  }
  return species.size.size;
}

function characterBattleClassLevels(
  build: CharacterBuild,
  _unitLibrary: UnitCatalog,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["classLevels"] {
  const classLevels = progressionClassLevels(build.progression);
  return [...new Set(orderedProgressionClasses(build.progression))].flatMap(
    (className) => {
      const level = classLevels[className];
      return level === undefined ? [] : [{ className, level }];
    },
  );
}

function characterBattleResources(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): readonly CharacterBattleResourceInit[] {
  return build.resources.map((resource) => {
    const unit = unitLibrary.requireUnit(resource.unitId);
    if (unit.kind !== "class_feature") {
      throw new Error(`Expected class feature Unit for resource: ${unit.id}`);
    }

    return {
      unit,
    };
  });
}

function characterBattleFeatures(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): readonly CharacterBattleFeatureInit[] {
  return build.features
    .filter((feature) => feature.kind === "classFeature")
    .map((feature) => {
      const unit = unitLibrary.requireUnit(feature.unitId);
      if (unit.kind !== "class_feature") {
        throw new Error(`Expected class feature Unit for feature: ${unit.id}`);
      }
      return { unit };
    });
}

function characterArmorClassState(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ArmorClassState {
  const loadout = build.equipment;
  const defaultState = defaultArmorClassState();
  const armor = loadout.armor
    ? unitLibrary.requireUnit(loadout.armor)
    : undefined;
  const shield = loadout.shield
    ? unitLibrary.requireUnit(loadout.shield)
    : undefined;

  return {
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
      armor?.kind === "armor"
        ? { kind: "armor", formula: armor.acFormula, category: armor.category }
        : defaultState.base,
    bonuses: [
      ...(shield?.kind === "shield"
        ? [
            {
              kind: "shield" as const,
              bonus: armorClassDelta(shield.armorClassProjection.bonus),
              handUse: shield.armorClassProjection.handUse,
              trainingRequired: shield.armorClassProjection.trainingRequired,
              sourceUnitId: shield.id,
            },
          ]
        : []),
      ...characterBuildUnitRefs(build, unitLibrary).flatMap((ref) => {
        const unit = unitLibrary.requireUnit(ref.unitId);
        return armorDefenseBonus(unit);
      }),
    ],
    armorTraining: new Set(build.armorTraining),
    leftHandUse:
      shield?.kind === "shield"
        ? "shield"
        : loadout.offHandWeapon == null
          ? "free"
          : "offWeapon",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  };
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
): CharacterWeaponAttackActionOption | null {
  const selectedWeapon = build.equipment.weapon?.unitId;
  if (selectedWeapon == null) {
    return null;
  }

  return characterWeaponAttackActionOption(selectedWeapon, build, unitLibrary);
}

function characterOffHandAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): CharacterWeaponAttackActionOption | undefined {
  const selectedWeapon = build.equipment.offHandWeapon?.unitId;
  if (selectedWeapon == null) {
    return undefined;
  }

  return (
    characterWeaponAttackActionOption(selectedWeapon, build, unitLibrary) ??
    undefined
  );
}

function characterWeaponAttackActionOption(
  unitId: UnitRecord["id"],
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): CharacterWeaponAttackActionOption | null {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "weapon" || unit.damage.kind !== "dice") {
    return null;
  }

  return {
    kind: "weapon",
    weapon: unit,
    ability: "str",
    abilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores.str),
    ),
  };
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
): boolean {
  const armor = build.equipment.armor
    ? unitLibrary.requireUnit(build.equipment.armor)
    : undefined;
  return (
    armor?.kind !== "armor" || build.armorTraining.includes(armor.category)
  );
}

function characterSpellcasting(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  const { build, unitLibrary } = input;
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Character build does not have spellcasting.");
  }

  return {
    spellcastingAbilityModifier: battleAbilityModifier(
      scoreModifier(build.abilityScores[spellcasting.spellcastingAbility]),
    ),
    proficiencyBonus: proficiencyBonus(characterLevel(build)),
    canCastSpells: spellcastingAllowedByArmorTraining(build, unitLibrary),
    cantrips: spellRecordsForIds(unitLibrary, spellcasting.cantrips),
    preparedSpells: spellRecordsForIds(
      unitLibrary,
      spellcasting.preparedSpells,
    ),
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
  };
}

function characterLevel(build: CharacterBuild): number {
  return computeTotalLevel(build.progression);
}

function spellRecordsForIds(
  unitLibrary: UnitCatalog,
  unitIds: readonly UnitRecord["id"][],
): readonly SpellRecord[] {
  return unitIds.map((unitId) => {
    const unit = unitLibrary.requireUnit(unitId);
    if (unit.kind !== "spell") {
      throw new Error(`Expected spell Unit: ${unitId}`);
    }
    return unit;
  });
}
