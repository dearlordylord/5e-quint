import {
  battleCreatureInitFromStatBlock,
  scoreModifier,
  startBattle,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterZeroHpLifecycleInit,
  type CharacterWeaponAttackActionOption,
  type BattleId,
  type BattleState,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type InitiativeScore,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  armorClassDelta,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { Hp, movementFeet, proficiencyBonus } from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Match } from "effect";

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
  const characterUnitRefs = characterBuildUnitRefs(input.build);
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
      ...(offHandAttack === undefined ? {} : { offHandAttack }),
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
  unitLibrary: UnitCatalog,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["classLevels"] {
  return build.advancement.entries.map((entry) => {
    const unit = unitLibrary.requireUnit(entry.classUnitId);
    if (unit.kind !== "class") {
      throw new Error(`Expected class Unit: ${entry.classUnitId}`);
    }
    return { className: unit.className, level: entry.level };
  });
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
      resource: resource.resource,
    };
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
      ...characterBuildUnitRefs(build).flatMap((ref) => {
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
    abilityModifier: scoreModifier(build.abilityScores.str),
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
    spellcastingAbilityModifier: scoreModifier(
      build.abilityScores[spellcasting.spellcastingAbility],
    ),
    proficiencyBonus: proficiencyBonus(characterLevel(build)),
    canCastSpells: spellcastingAllowedByArmorTraining(build, unitLibrary),
    cantrips: spellRecordsForIds(unitLibrary, spellcasting.cantrips),
    preparedSpells: spellRecordsForIds(
      unitLibrary,
      spellcasting.preparedSpells,
    ),
    spellSlots: spellcasting.spellSlots,
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
  return build.advancement.entries.reduce(
    (total, entry) => total + entry.level,
    0,
  );
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
