// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.summoned-object-lifecycle-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.summoned-object-lifecycle-control
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  timeSpanDuration,
  type TimeSpanDuration,
} from "@dnd/shared/elapsed-time";
import { Hp, spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { DamageType, SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { castPreparedSpell } from "./prepared-spell-cast.ts";
import {
  ANIMATE_OBJECTS_SIZE_VALUES,
  CONJURE_ELEMENTAL_ELEMENT_VALUES,
  PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES,
  SUMMON_DRAGON_DAMAGE_TYPE_VALUES,
  characterSheetIssue,
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
  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  return castLifecycleSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: ANIMATE_OBJECTS_SPELL_ID,
    castLevel,
    invocation: (spell) => {
      const targetIssue = animateObjectsTargetIssue({
        targets: input.targets,
        spellcastingAbilityModifier: input.spellcastingAbilityModifier,
        castLevel,
      });
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return animateObjectsInvocationFromSpell({
        spell,
        targets: input.targets,
        spellcastingAbilityModifier: input.spellcastingAbilityModifier,
        castLevel,
      });
    },
  });
}

export function castConjureElemental(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spirit: CharacterSheetConjureElementalSpirit;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetConjureElementalResult, CharacterSheetIssue> {
  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  return castLifecycleSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: CONJURE_ELEMENTAL_SPELL_ID,
    castLevel,
    invocation: (spell) => {
      /* v8 ignore start -- A Conjure Elemental request below level 5 is a malformed cast request rejected before invocation projection. */
      if (castLevel < LIFECYCLE_SPELL_LEVEL) {
        return characterSheetIssue(
          "Conjure Elemental requires a level-5 or higher Spell Slot.",
        );
      }
      /* v8 ignore stop */
      return conjureElementalInvocationFromSpell({
        spell,
        spirit: input.spirit,
        castLevel,
      });
    },
  });
}

export function castSummonDragon(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spirit: CharacterSheetSummonDragonSpirit;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetSummonDragonResult, CharacterSheetIssue> {
  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  return castLifecycleSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: SUMMON_DRAGON_SPELL_ID,
    castLevel,
    invocation: (spell) => {
      /* v8 ignore start -- A Summon Dragon request below level 5 is a malformed cast request rejected before invocation projection. */
      if (castLevel < LIFECYCLE_SPELL_LEVEL) {
        return characterSheetIssue(
          "Summon Dragon requires a level-5 or higher Spell Slot.",
        );
      }
      /* v8 ignore stop */
      return summonDragonInvocationFromSpell({
        spell,
        spirit: input.spirit,
        castLevel,
      });
    },
  });
}

export function castPlanarBinding(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly target: CharacterSheetPlanarBindingTarget;
  readonly castLevel?: SpellSlotLevel;
}): Either.Either<CharacterSheetPlanarBindingResult, CharacterSheetIssue> {
  const castLevel = input.castLevel ?? LIFECYCLE_SPELL_LEVEL;
  return castLifecycleSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: PLANAR_BINDING_SPELL_ID,
    castLevel,
    invocation: (spell) => {
      /* v8 ignore start -- A Planar Binding request below level 5 is a malformed cast request rejected before invocation projection. */
      if (castLevel < LIFECYCLE_SPELL_LEVEL) {
        return characterSheetIssue(
          "Planar Binding requires a level-5 or higher Spell Slot.",
        );
      }
      /* v8 ignore stop */
      return planarBindingInvocationFromSpell({
        spell,
        target: input.target,
        castLevel,
      });
    },
  });
}

function castLifecycleSpell<Invocation>(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: string;
  readonly castLevel: SpellSlotLevel;
  readonly invocation: (
    spell: SpellRecord,
  ) => Either.Either<Invocation, CharacterSheetIssue>;
}) {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(input.spellId),
    spellLevel: input.castLevel,
    spellName: "Summoned/object lifecycle spell",
    spellRecordIssue:
      "Summoned/object lifecycle support requires a Spell record.",
    spellAccessIssue:
      "Summoned/object lifecycle spell requires prepared class Spell Access.",
    invocation: input.invocation,
  });
}

function animateObjectsTargetIssue(input: {
  readonly targets: readonly CharacterSheetAnimateObjectsTarget[];
  readonly spellcastingAbilityModifier: number;
  readonly castLevel: SpellSlotLevel;
}): string | null {
  /* v8 ignore start -- These branches reject malformed Animate Objects request facts that cannot describe a supported cast. */
  if (input.castLevel < LIFECYCLE_SPELL_LEVEL) {
    return "Animate Objects requires a level-5 or higher Spell Slot.";
  }
  if (input.spellcastingAbilityModifier <= 0) {
    return "Animate Objects requires a positive spellcasting ability modifier capacity.";
  }
  if (input.targets.length === 0) {
    return "Animate Objects requires at least one target object.";
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- The catalog record failed the exact authored Animate Objects support profile required by this projector. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- The catalog record has Animate Objects spell facts but a contradictory companion-control profile. */
  if (
    spell.mechanics.control.commandCost.kind !== "bonus_action" ||
    spell.mechanics.control.commandRangeFeet !==
      ANIMATE_OBJECTS_COMMAND_RANGE_FEET
  ) {
    return characterSheetIssue(
      "Animate Objects requires the supported companion control profile.",
    );
  }
  /* v8 ignore stop */
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- The exact one-minute duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Animate Objects requires a supported duration.",
    );
  }
  /* v8 ignore stop */

  const animatedObjects = input.targets.map((target) =>
    animatedObjectContract(target, input.castLevel),
  );

  return Either.right({
    tag: "animateObjects",
    ...preparedLifecycleInvocation(spell, input.castLevel),
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
  /* v8 ignore start -- The catalog record failed the exact authored Conjure Elemental support profile required by this projector. */
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
  /* v8 ignore stop */
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- The exact ten-minute duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue(
      "Conjure Elemental requires a supported duration.",
    );
  }
  /* v8 ignore stop */
  const damageDiceCount = 8 + (input.castLevel - LIFECYCLE_SPELL_LEVEL);
  const repeatDamageDiceCount = 4 + (input.castLevel - LIFECYCLE_SPELL_LEVEL);

  return Either.right({
    tag: "conjureElemental",
    ...preparedLifecycleInvocation(spell, input.castLevel),
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
  /* v8 ignore start -- The catalog record failed the exact authored Summon Dragon support profile required by this projector. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- The catalog record has Summon Dragon spell facts but a contradictory companion-control profile. */
  if (
    spell.mechanics.control?.commandCost.kind !== "no_action_required" ||
    spell.mechanics.control.initiative !== "shared_with_caster" ||
    spell.mechanics.control.turnOrder !== "immediately_after_caster"
  ) {
    return characterSheetIssue(
      "Summon Dragon requires the supported companion control profile.",
    );
  }
  /* v8 ignore stop */
  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  /* v8 ignore start -- The exact one-hour duration admitted above is always accepted by the elapsed-time parser. */
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Summon Dragon requires a supported duration.");
  }
  /* v8 ignore stop */

  return Either.right({
    tag: "summonDragon",
    ...preparedLifecycleInvocation(spell, input.castLevel),
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
  /* v8 ignore start -- The catalog record failed the exact authored Planar Binding support profile required by this projector. */
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
  /* v8 ignore stop */
  const duration = planarBindingDuration(input.castLevel);
  /* v8 ignore next -- Internal invariant: every supported Planar Binding cast level maps to a positive parsed hour/day duration. */
  if (Either.isLeft(duration)) return Either.left(duration.left);

  return Either.right({
    tag: "planarBinding",
    ...preparedLifecycleInvocation(spell, input.castLevel),
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

function preparedLifecycleInvocation(
  spell: SpellRecord,
  castLevel: SpellSlotLevel,
) {
  return {
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    castLevel,
    spellSlotCost: { kind: "ordinary" as const, spellLevel: castLevel },
    preparationRequirement: "prepared" as const,
    requiredSpellAccess: "class_prepared" as const,
  };
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
  /* v8 ignore start -- Impossible parser failure: V8 maps the rejected-duration edge to this conditional, but every selected Planar Binding duration is a positive supported hour/day span. */
  if (Either.isRight(parsed)) return Either.right(parsed.right);
  return characterSheetIssue("Planar Binding requires a supported duration.");
  /* v8 ignore stop */
}

void ANIMATE_OBJECTS_SIZE_VALUES;
void CONJURE_ELEMENTAL_ELEMENT_VALUES;
void SUMMON_DRAGON_DAMAGE_TYPE_VALUES;
void PLANAR_BINDING_TARGET_CREATURE_TYPE_VALUES;
