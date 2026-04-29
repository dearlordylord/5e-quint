import {
  battleCreatureInitFromStatBlock,
  initiativeScore,
  scoreModifier,
  startBattle,
  type BattleAttackProfile,
  type BattleId,
  type BattleState,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterSheetUnitRefs,
  type CharacterSheet,
} from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  armorClassDelta,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { Hp } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Match } from "effect";

// MCP owns cross-runtime wiring. Character creation finalizes a CharacterSheet;
// battle accepts battle-owned creature-init inputs. This mapper is where
// selected Unit refs are read into the creature combat view, so neither runtime
// has to import the other or grow an intermediate executable content model.

export type CharacterSheetCreatureInput = {
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly sheet: CharacterSheet;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
};

export function startBattleFromCharacterSheetAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterSheetCreatureInput;
  readonly statBlockBattleInput: StatBlockBattleInitInput;
  readonly unitLibrary: UnitCatalog;
}): BattleState {
  return startBattle({
    battleId: input.battleId,
    combatants: [
      battleCreatureInitFromCharacterSheet({
        ...input.character,
        unitLibrary: input.unitLibrary,
      }),
      battleCreatureInitFromStatBlock(input.statBlockBattleInput),
    ],
  });
}

export function battleCreatureInitFromCharacterSheet(
  input: CharacterSheetCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): BattleCreatureInit {
  const maxHp = Hp(input.sheet.hitPoints.maximum);
  const sheetUnitRefs = characterSheetUnitRefs(input.sheet);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(
      10 + scoreModifier(input.sheet.abilityScores.dex),
    ),
    creatureInit: {
      kind: "character",
      characterId: input.characterId,
      sheetUnitRefs,
      armorClass: characterArmorClassState(input.sheet, input.unitLibrary),
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: input.sheet.equipment,
      attack: characterAttackProfile(input.sheet, input.unitLibrary),
    },
  };
}

function characterArmorClassState(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): ArmorClassState {
  const loadout = sheet.equipment;
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
      str: abilityModifier(scoreModifier(sheet.abilityScores.str)),
      dex: abilityModifier(scoreModifier(sheet.abilityScores.dex)),
      con: abilityModifier(scoreModifier(sheet.abilityScores.con)),
      int: abilityModifier(scoreModifier(sheet.abilityScores.int)),
      wis: abilityModifier(scoreModifier(sheet.abilityScores.wis)),
      cha: abilityModifier(scoreModifier(sheet.abilityScores.cha)),
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
      ...characterSheetUnitRefs(sheet).flatMap((ref) =>
        armorDefenseBonus(unitLibrary.requireUnit(ref.unitId)),
      ),
    ],
    armorTraining: new Set(sheet.armorTraining),
    leftHandUse: shield?.kind === "shield" ? "shield" : "free",
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

function characterAttackProfile(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): BattleAttackProfile | null {
  const selectedWeapon = sheet.equipment.weapon;
  if (selectedWeapon == null) {
    return null;
  }

  const unit = unitLibrary.requireUnit(selectedWeapon.unitId);
  if (unit.kind !== "weapon" || unit.damage.kind !== "dice") {
    return null;
  }

  return {
    kind: "weapon",
    weapon: unit,
    ability: "str",
    abilityModifier: scoreModifier(sheet.abilityScores.str),
  };
}
