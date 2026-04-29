import {
  combatantSeedFromStatBlock,
  initiativeScore,
  scoreModifier,
  startBattle,
  type BattleAttackProfile,
  type BattleId,
  type BattleState,
  type CharacterId,
  type CombatantId,
  type CombatantSeedInput,
  type MonsterId,
  type StatBlockCombatantInput,
} from "@dnd/battle-runtime";
import type { CharacterSheet } from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  armorClassDelta,
  defaultArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { Hp } from "@dnd/shared/types";
import type { UnitRecord, WeaponRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Match } from "effect";

export type CharacterSheetCombatantInput = {
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly sheet: CharacterSheet;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
};

export function startBattleFromCharacterSheetAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterSheetCombatantInput;
  readonly monster: StatBlockCombatantInput;
  readonly unitLibrary: UnitCatalog;
}): BattleState {
  return startBattle({
    battleId: input.battleId,
    combatants: [
      combatantSeedFromCharacterSheet({
        ...input.character,
        unitLibrary: input.unitLibrary,
      }),
      combatantSeedFromStatBlock(input.monster),
    ],
  });
}

export function combatantSeedFromCharacterSheet(
  input: CharacterSheetCombatantInput & {
    readonly unitLibrary: UnitCatalog;
  },
): CombatantSeedInput {
  const maxHp = Hp(input.sheet.hitPoints.maximum);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(
      10 + scoreModifier(input.sheet.abilityScores.final.dex),
    ),
    seed: {
      kind: "character",
      characterId: input.characterId,
      sheetUnitRefs: input.sheet.unitRefs,
      armorClass: characterArmorClassState(input.sheet, input.unitLibrary),
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: input.sheet.equipment.loadout,
      attack: characterAttackProfile(input.sheet, input.unitLibrary),
    },
  };
}

function characterArmorClassState(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): ArmorClassState {
  const loadout = sheet.equipment.loadout;
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
      str: abilityModifier(scoreModifier(sheet.abilityScores.final.str)),
      dex: abilityModifier(scoreModifier(sheet.abilityScores.final.dex)),
      con: abilityModifier(scoreModifier(sheet.abilityScores.final.con)),
      int: abilityModifier(scoreModifier(sheet.abilityScores.final.int)),
      wis: abilityModifier(scoreModifier(sheet.abilityScores.final.wis)),
      cha: abilityModifier(scoreModifier(sheet.abilityScores.final.cha)),
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
      ...sheet.unitRefs.flatMap((ref) =>
        armorDefenseBonus(unitLibrary.requireUnit(ref.unitId)),
      ),
    ],
    armorTraining: new Set(sheet.proficiencies.armorTraining),
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
  const selectedWeapon = sheet.equipment.loadout.weapon;
  if (selectedWeapon == null) {
    return null;
  }

  const unit = unitLibrary.requireUnit(selectedWeapon.unitId);
  if (unit.kind !== "weapon" || unit.damage.kind !== "dice") {
    return null;
  }

  return {
    kind: "weapon",
    weapon: unit as WeaponRecord,
    ability: "str",
    abilityModifier: scoreModifier(sheet.abilityScores.final.str),
  };
}
