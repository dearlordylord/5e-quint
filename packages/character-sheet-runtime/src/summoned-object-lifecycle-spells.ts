// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.summoned-object-lifecycle-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.summoned-object-lifecycle-control
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { Hp, spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { DamageType, SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  ANIMATE_OBJECTS_SIZE_VALUES,
  CONJURE_ELEMENTAL_ELEMENT_VALUES,
  PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES,
  SUMMON_DRAGON_DAMAGE_TYPE_VALUES,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetAnimatedObjectContract,
  type CharacterSheetAnimateObjectsInvocation,
  type CharacterSheetAnimateObjectsResult,
  type CharacterSheetAnimateObjectsSize,
  type CharacterSheetAnimateObjectsTarget,
  type CharacterSheetConjureElementalElement,
  type CharacterSheetConjureElementalInvocation,
  type CharacterSheetConjureElementalResult,
  type CharacterSheetConjureElementalSpirit,
  type CharacterSheetIssue,
  type CharacterSheetPlanarBindingInvocation,
  type CharacterSheetPlanarBindingResult,
  type CharacterSheetPlanarBindingTarget,
  type CharacterSheetSummonDragonInvocation,
  type CharacterSheetSummonDragonResult,
  type CharacterSheetSummonDragonSpirit,
} from "./sheet-types.ts";

const ANIMATE_OBJECTS_SPELL_ID = "animate_objects" as const;
const CONJURE_ELEMENTAL_SPELL_ID = "conjure_elemental" as const;
const SUMMON_DRAGON_SPELL_ID = "summon_dragon" as const;
const PLANAR_BINDING_SPELL_ID = "planar_binding" as const;
const LIFECYCLE_SPELL_LEVEL = spellSlotLevel(5);

const ANIMATE_OBJECTS_RANGE_FEET = 120;
const ANIMATE_OBJECTS_COMMAND_RANGE_FEET = 500;
const CONJURE_ELEMENTAL_RANGE_FEET = 60;
const SUMMON_DRAGON_RANGE_FEET = 60;
const PLANAR_BINDING_RANGE_FEET = 60;

export function castAnimateObjects(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly targets: readonly CharacterSheetAnimateObjectsTarget[];
  readonly spellcastingAbilityModifier: number;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetAnimateObjectsResult, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, ANIMATE_OBJECTS_SPELL_ID);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  const accessIssue = preparedAccessIssue(
    input.sheet,
    ANIMATE_OBJECTS_SPELL_ID,
  );
  if (accessIssue !== null) return characterSheetIssue(accessIssue);

  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  const targetIssue = animateObjectsTargetIssue({
    targets: input.targets,
    spellcastingAbilityModifier: input.spellcastingAbilityModifier,
    castLevel,
  });
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = animateObjectsInvocationFromSpell({
    spell: spell.right,
    targets: input.targets,
    spellcastingAbilityModifier: input.spellcastingAbilityModifier,
    castLevel,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: castLevel,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({ sheet: spent.right, invocation: invocation.right });
}

export function castConjureElemental(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spirit: CharacterSheetConjureElementalSpirit;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetConjureElementalResult, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, CONJURE_ELEMENTAL_SPELL_ID);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  const accessIssue = preparedAccessIssue(
    input.sheet,
    CONJURE_ELEMENTAL_SPELL_ID,
  );
  if (accessIssue !== null) return characterSheetIssue(accessIssue);

  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  if (castLevel < LIFECYCLE_SPELL_LEVEL) {
    return characterSheetIssue(
      "Conjure Elemental requires a level-5 or higher Spell Slot.",
    );
  }

  const invocation = conjureElementalInvocationFromSpell({
    spell: spell.right,
    spirit: input.spirit,
    castLevel,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: castLevel,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({ sheet: spent.right, invocation: invocation.right });
}

export function castSummonDragon(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spirit: CharacterSheetSummonDragonSpirit;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetSummonDragonResult, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, SUMMON_DRAGON_SPELL_ID);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  const accessIssue = preparedAccessIssue(input.sheet, SUMMON_DRAGON_SPELL_ID);
  if (accessIssue !== null) return characterSheetIssue(accessIssue);

  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  if (castLevel < LIFECYCLE_SPELL_LEVEL) {
    return characterSheetIssue(
      "Summon Dragon requires a level-5 or higher Spell Slot.",
    );
  }

  const invocation = summonDragonInvocationFromSpell({
    spell: spell.right,
    spirit: input.spirit,
    castLevel,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: castLevel,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({ sheet: spent.right, invocation: invocation.right });
}

export function castPlanarBinding(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetPlanarBindingTarget;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetPlanarBindingResult, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, PLANAR_BINDING_SPELL_ID);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  const accessIssue = preparedAccessIssue(input.sheet, PLANAR_BINDING_SPELL_ID);
  if (accessIssue !== null) return characterSheetIssue(accessIssue);

  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  if (castLevel < LIFECYCLE_SPELL_LEVEL) {
    return characterSheetIssue(
      "Planar Binding requires a level-5 or higher Spell Slot.",
    );
  }

  const invocation = planarBindingInvocationFromSpell({
    spell: spell.right,
    target: input.target,
    castLevel,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: castLevel,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({ sheet: spent.right, invocation: invocation.right });
}

function spellRecord(
  unitLibrary: UnitCatalog,
  spellId: string,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, spellId);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  return unit.right.kind === "spell"
    ? Either.right(unit.right)
    : characterSheetIssue(
        "Summoned/object lifecycle support requires a Spell record.",
      );
}

function preparedAccessIssue(
  sheet: CharacterSheet,
  spellId: string,
): string | null {
  const hasAccess =
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some(
        (preparedSpellId) => preparedSpellId === spellId,
      ),
    ) ?? false;
  return hasAccess
    ? null
    : "Summoned/object lifecycle spell requires prepared class Spell Access.";
}

function animateObjectsTargetIssue(input: {
  readonly targets: readonly CharacterSheetAnimateObjectsTarget[];
  readonly spellcastingAbilityModifier: number;
  readonly castLevel: SpellSlotLevel;
}): string | null {
  if (input.castLevel < LIFECYCLE_SPELL_LEVEL) {
    return "Animate Objects requires a level-5 or higher Spell Slot.";
  }
  if (input.spellcastingAbilityModifier <= 0) {
    return "Animate Objects requires a positive spellcasting ability modifier capacity.";
  }
  if (input.targets.length === 0) {
    return "Animate Objects requires at least one target object.";
  }
  const usedWeight = input.targets.reduce(
    (sum, target) => sum + animateObjectsSizeWeight(target.size),
    0,
  );
  if (usedWeight > input.spellcastingAbilityModifier) {
    return "Animate Objects target sizes exceed spellcasting ability modifier capacity.";
  }
  return null;
}

function animateObjectsInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly targets: readonly CharacterSheetAnimateObjectsTarget[];
  readonly spellcastingAbilityModifier: number;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<CharacterSheetAnimateObjectsInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "templated_multi_spawn" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== ANIMATE_OBJECTS_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.school !== "transmutation"
  ) {
    return characterSheetIssue(
      "Animate Objects requires the supported level-5 object animation profile.",
    );
  }
  if (
    spell.mechanics.control.commandCost.kind !== "bonus_action" ||
    spell.mechanics.control.commandRangeFeet !==
      ANIMATE_OBJECTS_COMMAND_RANGE_FEET
  ) {
    return characterSheetIssue(
      "Animate Objects requires the supported companion control profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Animate Objects requires a supported duration.",
    );
  }

  const animatedObjects = input.targets.map((target) =>
    animatedObjectContract(target, input.castLevel),
  );

  return Either.right({
    tag: "animateObjects",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: { kind: "ordinary", spellLevel: input.castLevel },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: ANIMATE_OBJECTS_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    selectedObjectCapacity: {
      maximumWeight: input.spellcastingAbilityModifier,
      usedWeight: animatedObjects.reduce(
        (sum, object) => sum + object.capacityWeight,
        0,
      ),
      source: "spellcasting_ability_modifier",
    },
    animatedObjects,
    companionControl: {
      allyToCasterAndAllies: true,
      initiative: "shared_with_caster",
      turnOrder: "immediately_after_caster",
      commandAction: "bonus_action",
      commandRangeFeet: ANIMATE_OBJECTS_COMMAND_RANGE_FEET,
      sameCommandToMultipleObjects: true,
      defaultBehavior: "dodge_and_avoid_harm",
      tableCommandOwner: "table",
      battleCreatureLifecycleOwner: "table",
    },
  });
}

function conjureElementalInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly spirit: CharacterSheetConjureElementalSpirit;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<
  CharacterSheetConjureElementalInvocation,
  CharacterSheetIssue
> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== CONJURE_ELEMENTAL_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.school !== "conjuration"
  ) {
    return characterSheetIssue(
      "Conjure Elemental requires the supported level-5 elemental spirit profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Conjure Elemental requires a supported duration.",
    );
  }
  const damageDiceCount = 8 + (input.castLevel - LIFECYCLE_SPELL_LEVEL);
  const repeatDamageDiceCount = 4 + (input.castLevel - LIFECYCLE_SPELL_LEVEL);

  return Either.right({
    tag: "conjureElemental",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: { kind: "ordinary", spellLevel: input.castLevel },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: CONJURE_ELEMENTAL_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    spirit: {
      spiritId: input.spirit.spiritId,
      size: "large",
      intangible: true,
      origin: "elemental_planes",
      element: input.spirit.element,
      damageType: conjureElementalDamageType(input.spirit.element),
      placementOwner: "table",
    },
    hazard: {
      trigger: "enters_space_or_starts_turn_within_5_feet",
      casterCanForceSave: true,
      onlyIfNoRestrainedCreature: true,
      savingThrowAbility: "dex",
      dc: "caster_spell_save_dc",
      firstFailedSaveDamageDice: { count: damageDiceCount, die: 8 },
      repeatFailedSaveDamageDice: { count: repeatDamageDiceCount, die: 8 },
      restrainedUntilSpellEnds: true,
      repeatSaveAtStartOfRestrainedTurns: true,
      tableTriggerOwner: "table",
    },
  });
}

function summonDragonInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly spirit: CharacterSheetSummonDragonSpirit;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<CharacterSheetSummonDragonInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "spawned_creature" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SUMMON_DRAGON_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.school !== "conjuration"
  ) {
    return characterSheetIssue(
      "Summon Dragon requires the supported level-5 spawned Dragon profile.",
    );
  }
  if (
    spell.mechanics.control?.commandCost.kind !== "no_action_required" ||
    spell.mechanics.control.initiative !== "shared_with_caster" ||
    spell.mechanics.control.turnOrder !== "immediately_after_caster"
  ) {
    return characterSheetIssue(
      "Summon Dragon requires the supported companion control profile.",
    );
  }
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Summon Dragon requires a supported duration.");
  }

  return Either.right({
    tag: "summonDragon",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: { kind: "ordinary", spellLevel: input.castLevel },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    rangeFeet: SUMMON_DRAGON_RANGE_FEET,
    duration: duration.right,
    concentrationRequired: true,
    spirit: {
      spiritId: input.spirit.spiritId,
      creatureType: "dragon",
      size: "large",
      armorClass: 14 + input.castLevel,
      hitPointMaximum: Hp(50 + 10 * (input.castLevel - LIFECYCLE_SPELL_LEVEL)),
      speedsFeet: { walk: 30, fly: 60, swim: 30 },
      sharedResistance: input.spirit.damageType,
      disappearsAtZeroHpOrSpellEnd: true,
      placementOwner: "table",
    },
    companionControl: {
      allyToCasterAndAllies: true,
      initiative: "shared_with_caster",
      turnOrder: "immediately_after_caster",
      commandAction: "no_action_required",
      defaultBehavior: "dodge_and_avoid_danger",
      tableCommandOwner: "table",
      battleCreatureLifecycleOwner: "table",
    },
    actions: {
      rend: {
        attackBonus: "caster_spell_attack_modifier",
        reachFeet: 10,
        damageType: "piercing",
        damageDice: { count: 1, die: 6 },
        flatDamage: 4 + input.castLevel,
      },
      breathWeapon: {
        savingThrowAbility: "dex",
        dc: "caster_spell_save_dc",
        area: { kind: "cone", lengthFeet: 30 },
        damageType: input.spirit.damageType,
        damageDice: { count: 2, die: 6 },
        success: "half_damage",
      },
      multiattack: {
        rendCount: Math.floor(input.castLevel / 2),
        breathWeaponCount: 1,
      },
    },
  });
}

function planarBindingInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly target: CharacterSheetPlanarBindingTarget;
  readonly castLevel: SpellSlotLevel;
}): Either.Either<CharacterSheetPlanarBindingInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== PLANAR_BINDING_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "hours" ||
    spell.mechanics.castingTime.amount !== 1 ||
    spell.mechanics.school !== "abjuration" ||
    !hasConsumedMaterialCost(spell.mechanics.components, 1000)
  ) {
    return characterSheetIssue(
      "Planar Binding requires the supported level-5 binding profile.",
    );
  }
  const duration = planarBindingDuration(input.castLevel);
  if (Either.isLeft(duration)) return Either.left(duration.left);

  return Either.right({
    tag: "planarBinding",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel: input.castLevel,
    spellSlotCost: { kind: "ordinary", spellLevel: input.castLevel },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "hours", amount: 1 },
    rangeFeet: PLANAR_BINDING_RANGE_FEET,
    duration: duration.right,
    materialComponentSpend: { consumedJewelCostGpMinimum: 1000 },
    target: input.target,
    savingThrow: { ability: "cha", dc: "caster_spell_save_dc" },
    outcome:
      input.target.savingThrowOutcome.tag === "succeeded"
        ? { tag: "saveSucceeded", bound: false }
        : {
            tag: "saveFailed",
            bound: true,
            commandFollowing: "best_of_ability",
            hostileTargetTwistsCommands: input.target.hostile,
            extendsSummoningOrCreationSpellDuration:
              input.target.summonedOrCreatedBySpell,
            reportingOrReturnOwner: "table",
            commandExecutionOwner: "table",
          },
  });
}

function animateObjectsSizeWeight(
  size: CharacterSheetAnimateObjectsSize,
): number {
  if (size === "medium_or_smaller") return 1;
  if (size === "large") return 2;
  return 3;
}

function animatedObjectContract(
  target: CharacterSheetAnimateObjectsTarget,
  castLevel: SpellSlotLevel,
): CharacterSheetAnimatedObjectContract {
  const extraDice = castLevel - LIFECYCLE_SPELL_LEVEL;
  if (target.size === "medium_or_smaller") {
    return {
      objectId: target.objectId,
      creatureType: "construct",
      size: target.size,
      capacityWeight: 1,
      armorClass: 15,
      hitPointMaximum: Hp(10),
      slam: {
        attackBonus: "caster_spell_attack_modifier",
        reachFeet: 5,
        damageType: "force",
        dice: { count: 1 + extraDice, die: 4 },
        flat: 3,
        addsSpellcastingAbilityModifier: false,
      },
      zeroHp: {
        revertsToObjectForm: true,
        remainingDamageCarriesOverToObject: true,
      },
    };
  }
  if (target.size === "large") {
    return {
      objectId: target.objectId,
      creatureType: "construct",
      size: target.size,
      capacityWeight: 2,
      armorClass: 15,
      hitPointMaximum: Hp(20),
      slam: {
        attackBonus: "caster_spell_attack_modifier",
        reachFeet: 5,
        damageType: "force",
        dice: { count: 2 + extraDice, die: 6 },
        flat: 3,
        addsSpellcastingAbilityModifier: true,
      },
      zeroHp: {
        revertsToObjectForm: true,
        remainingDamageCarriesOverToObject: true,
      },
    };
  }
  return {
    objectId: target.objectId,
    creatureType: "construct",
    size: target.size,
    capacityWeight: 3,
    armorClass: 15,
    hitPointMaximum: Hp(40),
    slam: {
      attackBonus: "caster_spell_attack_modifier",
      reachFeet: 5,
      damageType: "force",
      dice: { count: 2 + extraDice, die: 12 },
      flat: 3,
      addsSpellcastingAbilityModifier: true,
    },
    zeroHp: {
      revertsToObjectForm: true,
      remainingDamageCarriesOverToObject: true,
    },
  };
}

function conjureElementalDamageType(
  element: CharacterSheetConjureElementalElement,
): DamageType {
  if (element === "air") return "lightning";
  if (element === "earth") return "thunder";
  if (element === "fire") return "fire";
  return "cold";
}

function hasConsumedMaterialCost(
  components: SpellRecord["mechanics"]["components"],
  costGp: number,
): boolean {
  return (
    "materialConsumed" in components &&
    components.materialConsumed === true &&
    "materialCostGp" in components &&
    components.materialCostGp === costGp
  );
}

function planarBindingDuration(
  castLevel: SpellSlotLevel,
): Either.Either<TimeSpanDuration, CharacterSheetIssue> {
  const duration =
    castLevel >= spellSlotLevel(9)
      ? { unit: "day", amount: 366 }
      : castLevel >= spellSlotLevel(8)
        ? { unit: "day", amount: 180 }
        : castLevel >= spellSlotLevel(7)
          ? { unit: "day", amount: 30 }
          : castLevel >= spellSlotLevel(6)
            ? { unit: "day", amount: 10 }
            : { unit: "hour", amount: 24 };
  const parsed = timeSpanDuration(duration);
  return Either.isRight(parsed)
    ? Either.right(parsed.right)
    : characterSheetIssue("Planar Binding requires a supported duration.");
}

void ANIMATE_OBJECTS_SIZE_VALUES;
void CONJURE_ELEMENTAL_ELEMENT_VALUES;
void SUMMON_DRAGON_DAMAGE_TYPE_VALUES;
void PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES;
