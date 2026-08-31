// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT59 monk_deflect_attacks
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-03A-MONK-SLOW-FALL-RUNTIME monk_slow_fall
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A12-MONK-STUNNING-STRIKE-BATTLE-RUNTIME monk_stunning_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-BARBARIAN-FRENZY barbarian_frenzy
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MSPEC-02-DRAGONBORN-BREATH-WEAPON-SURFACE species_dragonborn_breath_weapon
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MSPEC-04-DRAGONBORN-DAMAGE-RESISTANCE species_dragonborn_damage_resistance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE dwarf_dwarven_resilience
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MSPEC-07-GOLIATH-POWERFUL-BUILD-GRAPPLE species_goliath_powerful_build
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME species_halfling_brave
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV73A monk_martial_arts
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-05-FIGHTER-TACTICAL-MASTER fighter_tactical_master mastery_push mastery_slow
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.creature-space-movement-permission unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.passive-ability-check-roll-mode unit-feature.passive-damage-resistance unit-feature.passive-saving-throw-roll-mode unit-feature.reaction-roll-or-damage-reduction unit-feature.stunning-strike
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.fighter-tactical-master unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  decodeSpeciesRecordSync,
  decodeUnitRecordSync,
} from "@dnd/surface/surface/schema";
import { CONDITIONS } from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import speciesDragonbornInput from "../../surface/content/species_dragonborn.json";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import {
  passiveProjectionRouteForDiscoveredAct,
  passiveProjectionRouteForResolution,
  passiveSavingThrowRollModeRouteEvents,
} from "./battle-reducer/passive-projection-routes.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  barbarianFrenzyUnitId,
  barbarianRageUnitId,
  fighterActionSurgeUnitId,
  fighterImprovedCriticalUnitId,
  fighterTacticalMasterUnitId,
  monkDeflectAttacksUnitId,
  monkMartialArtsUnitId,
  monkMonksFocusUnitId,
  monkSlowFallUnitId,
  monkStunningStrikeUnitId,
  rogueCunningActionUnitId,
  rogueSneakAttackUnitId,
  rogueUncannyDodgeUnitId,
  speciesDragonbornBreathWeaponUnitId,
  speciesDragonbornDamageResistanceUnitId,
  speciesHalflingBraveUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleAttackActionAreaSaveDamageReplacementSupportForUnit,
  battleCreatureSpaceMovementPermissionSupportForUnit,
  battleId,
  battleMartialArtsAttackProjectionSupportForUnit,
  battleStunningStrikeSupportForUnit,
  battlePassiveAbilityCheckRollModeSupportForUnit,
  battlePassiveDamageResistanceSupportForUnit,
  battleMonkFocusBattleOptionsSupportForUnit,
  battlePassiveSavingThrowRollModeSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE,
  creatureSpaceMovementPermissionProfileForUnit,
  dwarfDwarvenResilienceUnitId,
  discoverBattleActs,
  endTurn,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  movementFeet,
  PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE,
  PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  passiveAbilityCheckRollModeProfileForUnit,
  passiveDamageResistanceProfileForUnit,
  parseSupportedUnitFeatureProfile,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBattleSubject,
  startBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  STUNNING_STRIKE_SUPPORT_PROFILE,
} from "./unit-profile-admission.test-support.ts";
import {
  battleAttackDamageRiderSupportForUnit,
  battleTacticalMasterReplacementSupportForUnit,
  battleWeaponOrUnarmedCriticalRange19SupportForUnit,
  battleWeaponMasteryPushSupportForUnit,
  battleWeaponMasterySlowSupportForUnit,
  battleD20TestNaturalOneRerollSupportForUnit,
  magicActionSaveGatedConditionProfileForUnit,
  passiveSpeedKindGrantsProfileForUnit,
  hideActionObscurementPermissionProfileForUnit,
  passiveSavingThrowRollModeProfileForUnit,
  TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  attackRollFill,
  characterBattleFeatureInitForTest,
  damageRollFillWithGroups,
  findHole,
  grappleOutcomeFill,
  requireHole,
  requireResolved,
  targetFill,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type { UnitRecord } from "./unit-profile-admission.test-support.ts";
import { battleInitializationIssueMessage } from "./battle-reducer/api-lifecycle.ts";

function d20RerollMechanics(unit: UnitRecord) {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "d20_test_natural_one_reroll"
  )
    throw new Error("Expected d20 reroll mechanics.");
  return unit.mechanics;
}

function abjureFoesMechanics(unit: UnitRecord) {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "abjure_foes")
    throw new Error("Expected Abjure Foes mechanics.");
  return unit.mechanics;
}

function rovingMechanics(unit: UnitRecord) {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "composite")
    throw new Error("Expected composite mechanics.");
  return unit.mechanics;
}

function naturallyStealthyMechanics(unit: UnitRecord) {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "hide_action_obscurement_permission"
  )
    throw new Error("Expected Naturally Stealthy mechanics.");
  return unit.mechanics;
}

function dangerSenseMechanics(unit: UnitRecord) {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive")
    throw new Error("Expected Danger Sense mechanics.");
  return unit.mechanics;
}

const UNSUPPORTED_PASSIVE_SAVE_CONDITIONS = CONDITIONS.filter(
  (condition) => condition !== "poisoned" && condition !== "frightened",
);
const speciesGoliathPowerfulBuildUnitId = "species_goliath_powerful_build";
const speciesHalflingNimblenessUnitId = "species_halfling_nimbleness";

function reactionTriggerFieldOmissionVariant(
  unit: UnitRecord,
  id: string,
  field: "requiresVisibleAttacker" | "damageIncludes",
): UnitRecord {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    throw new Error("Expected reaction roll or damage reduction mechanics.");
  }
  let matchedModifiers = 0;
  const modifiers = unit.mechanics.modifiers.map((modifier) => {
    if (modifier.kind !== "attack_damage_reduction") return modifier;
    if (
      field === "requiresVisibleAttacker" &&
      modifier.trigger.requiresVisibleAttacker === true
    ) {
      matchedModifiers += 1;
      const { requiresVisibleAttacker: _omitted, ...trigger } =
        modifier.trigger;
      return { ...modifier, trigger };
    }
    if (
      field === "damageIncludes" &&
      "damageIncludes" in modifier.trigger &&
      modifier.trigger.damageIncludes !== undefined
    ) {
      matchedModifiers += 1;
      const { damageIncludes: _omitted, ...trigger } = modifier.trigger;
      return { ...modifier, trigger };
    }
    return modifier;
  });
  if (matchedModifiers !== 1) {
    throw new Error(
      `Expected exactly one ${field} trigger, got ${matchedModifiers}.`,
    );
  }
  return decodeUnitRecordSync({
    ...unit,
    id,
    mechanics: { ...unit.mechanics, modifiers },
  });
}

describe("L3MSPEC species battle support", () => {
  const dragonbornSpeciesRecord = decodeSpeciesRecordSync(
    speciesDragonbornInput,
  );
  if (dragonbornSpeciesRecord.species !== "dragonborn") {
    throw new Error("Expected Dragonborn species source record.");
  }
  const selectedDraconicAncestry =
    dragonbornSpeciesRecord.draconicAncestry.damageType.options.find(
      (option) => option.id === "red",
    );
  if (selectedDraconicAncestry === undefined) {
    throw new Error("Expected Red Draconic Ancestry source option.");
  }
  const draconicAncestryDamageType = selectedDraconicAncestry.damageType;
  const draconicAncestrySourceFacts = {
    draconicAncestryDamageType,
  } as const;
  const expectedPowerfulBuildSupport = {
    kind: PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE,
    abilityCheck: {
      mode: "advantage",
      scope: {
        kind: "endingCondition",
        condition: "grappled",
      },
    },
  } as const;
  const expectedBreathWeaponSupport = {
    kind: ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
    breath: {
      activationCost: { kind: "replaceAttack" },
      resource: {
        cap: { kind: "proficiencyBonus" },
        resetCadence: "longRest",
      },
      area: {
        origin: { kind: "self" },
        shapeChoice: [
          { kind: "cone", lengthFeet: movementFeet(15) },
          {
            kind: "line",
            lengthFeet: movementFeet(30),
            widthFeet: movementFeet(5),
          },
        ],
      },
      save: {
        ability: "dex",
        dc: { kind: "innate", base: 8, ability: "con" },
      },
      damage: {
        damageType: {
          kind: "draconicAncestry",
          holeId: "species_dragonborn_draconic_ancestry_damage_type",
          value: "fire",
        },
        amount: {
          kind: "characterLevelDice",
          base: { dice: 1, dieSize: 10 },
          tiers: [
            { atLevel: 5, dice: 2 },
            { atLevel: 11, dice: 3 },
            { atLevel: 17, dice: 4 },
          ],
        },
        onSuccess: "halfDamage",
      },
    },
  } as const;
  const expectedDamageResistanceSupport = {
    kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
    resistance: {
      damageType: {
        kind: "draconicAncestry",
        holeId: "species_dragonborn_draconic_ancestry_damage_type",
        value: "fire",
      },
    },
  } as const;
  const expectedPoisonResistanceSupport = {
    kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
    resistance: {
      damageType: {
        kind: "fixed",
        value: "poison",
      },
    },
  } as const;
  const expectedPoisonedSaveAdvantageSupport = {
    kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
    savingThrow: {
      mode: "advantage",
      scope: {
        kind: "condition",
        condition: "poisoned",
      },
    },
  } as const;
  const expectedFrightenedSaveAdvantageSupport = {
    kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
    savingThrow: {
      mode: "advantage",
      scope: {
        kind: "condition",
        condition: "frightened",
      },
    },
  } as const;
  const expectedCreatureSpaceMovementPermissionSupport = {
    kind: CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE,
    permission: {
      moveThrough: {
        kind: "occupiedCreatureSpace",
        creatureSizeRelationToSelf: "larger",
      },
      canStopInOccupiedSpace: false,
    },
  } as const;

  test("species_dragonborn_breath_weapon is admitted from typed attack-replacement facts", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
        sourceFacts: draconicAncestrySourceFacts,
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId),
        supportProfiles: [expectedBreathWeaponSupport],
      }),
    );
    expect(
      battleAttackActionAreaSaveDamageReplacementSupportForUnit({
        unit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedBreathWeaponSupport);
    expect(
      parseSupportedUnitFeatureProfile(unit, [], draconicAncestrySourceFacts),
    ).toEqual(
      expect.objectContaining({
        kind: "attackActionAreaSaveDamageReplacement",
        unit,
        breath: expectedBreathWeaponSupport.breath,
      }),
    );
  });

  test("Breath Weapon admission requires selected Draconic Ancestry damage type", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);

    expect(
      battleAttackActionAreaSaveDamageReplacementSupportForUnit({
        unit,
        draconicAncestryDamageType: undefined,
      }),
    ).toBe("unsupported");
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.fail({
        tag: "battleUnitSupportProfileIssue",
        message: `Unsupported battle Attack-action area save-damage replacement Unit hook: ${unit.id}.`,
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
  });

  test("Breath Weapon admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Breath Weapon activation species trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_breath_weapon_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battleAttackActionAreaSaveDamageReplacementSupportForUnit({
        unit: syntheticUnit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedBreathWeaponSupport);
  });

  test("Breath Weapon shape choice admission is order-independent", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Breath Weapon activation species trait.");
    }
    const [phase] = unit.mechanics.phases;
    if (
      phase?.kind !== "save_gate" ||
      phase.attachment.kind !== "area" ||
      phase.attachment.shape.kind !== "choice" ||
      phase.onFail.kind !== "damage"
    ) {
      throw new Error("Expected Breath Weapon area save-gate damage phase.");
    }
    const [cone, line] = phase.attachment.shape.options;
    if (cone === undefined || line?.kind !== "line") {
      throw new Error("Expected Breath Weapon Cone/Line shape choice.");
    }
    const reversedShapeUnit = unitMechanicsVariant(unit, {
      id: "synthetic_breath_weapon_reversed_shape_order",
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            attachment: {
              ...phase.attachment,
              shape: {
                ...phase.attachment.shape,
                options: [line, cone],
              },
            },
          },
        ],
      },
    });

    expect(
      battleAttackActionAreaSaveDamageReplacementSupportForUnit({
        unit: reversedShapeUnit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedBreathWeaponSupport);
  });

  test("Breath Weapon shape, scaling, and ancestry source admission rejects one-fact near misses", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Breath Weapon activation species trait.");
    }
    const [phase] = unit.mechanics.phases;
    if (
      phase?.kind !== "save_gate" ||
      phase.attachment.kind !== "area" ||
      phase.attachment.shape.kind !== "choice" ||
      phase.onFail.kind !== "damage"
    ) {
      throw new Error("Expected Breath Weapon area save-gate damage phase.");
    }
    const [cone, line] = phase.attachment.shape.options;
    if (cone === undefined || line?.kind !== "line") {
      throw new Error("Expected Breath Weapon Cone/Line shape choice.");
    }
    const [level5, level11, level17] =
      "tiers" in phase.onFail.amount ? phase.onFail.amount.tiers : [];
    if (level5 === undefined || level11 === undefined || level17 === undefined)
      throw new Error("Expected Breath Weapon character-level dice tiers.");

    const nearMisses = [
      {
        id: "synthetic_breath_weapon_non_choice_shape",
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              attachment: { ...phase.attachment, shape: cone },
            },
          ],
        },
      },
      {
        id: "synthetic_breath_weapon_wrong_damage_amount_kind",
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              onFail: {
                ...phase.onFail,
                amount: { kind: "fixed", expr: { dice: 1, dieSize: 10 } },
              },
            },
          ],
        },
      },
      {
        id: "synthetic_breath_weapon_wrong_damage_tier",
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              onFail: {
                ...phase.onFail,
                amount: {
                  ...phase.onFail.amount,
                  tiers: [
                    level5,
                    { ...level11, override: { dice: 4 } },
                    level17,
                  ],
                },
              },
            },
          ],
        },
      },
    ] as const satisfies readonly {
      readonly id: string;
      readonly mechanics: unknown;
    }[];

    for (const nearMiss of nearMisses) {
      const nearMissUnit = decodeUnitRecordSync({
        ...unit,
        id: nearMiss.id,
        mechanics: nearMiss.mechanics,
      });
      expect(
        battleAttackActionAreaSaveDamageReplacementSupportForUnit({
          unit: nearMissUnit,
          draconicAncestryDamageType,
        }),
      ).toBe("unsupported");
      expect(
        parseSupportedUnitFeatureProfile(
          nearMissUnit,
          [],
          draconicAncestrySourceFacts,
        ),
        nearMiss.id,
      ).toBeNull();
    }

    const resistanceUnit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );
    if (
      resistanceUnit.kind !== "species_trait" ||
      resistanceUnit.mechanics.family !== "passive"
    ) {
      throw new Error("Expected Dragonborn Damage Resistance passive trait.");
    }
    const [resistanceGrant] = resistanceUnit.mechanics.grants;
    if (
      resistanceGrant?.kind !== "grant_resistance" ||
      typeof resistanceGrant.damageType !== "object" ||
      resistanceGrant.damageType === null
    ) {
      throw new Error("Expected Draconic Ancestry resistance source choice.");
    }
    const wrongResistanceSource = decodeUnitRecordSync({
      ...resistanceUnit,
      id: "synthetic_draconic_resistance_wrong_hole",
      mechanics: {
        ...resistanceUnit.mechanics,
        grants: [
          {
            ...resistanceGrant,
            damageType: { ...resistanceGrant.damageType, holeId: "wrong_hole" },
          },
        ],
      },
    });
    expect(
      passiveDamageResistanceProfileForUnit({
        unit: wrongResistanceSource,
        draconicAncestryDamageType,
      }),
    ).toBeNull();
  });

  test("Breath Weapon admission rejects malformed shape, source, and rest facts", () => {
    const unit = unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Breath Weapon activation species trait.");
    }
    const [phase] = unit.mechanics.phases;
    if (
      phase?.kind !== "save_gate" ||
      phase.attachment.kind !== "area" ||
      phase.attachment.shape.kind !== "choice" ||
      phase.onFail.kind !== "damage"
    ) {
      throw new Error("Expected Breath Weapon area save-gate damage phase.");
    }
    const [cone, line] = phase.attachment.shape.options;
    if (cone === undefined || line?.kind !== "line") {
      throw new Error("Expected Breath Weapon Cone/Line shape choice.");
    }

    const malformedUnits = [
      unitMechanicsVariant(unit, {
        id: "synthetic_breath_weapon_wrong_width",
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              attachment: {
                ...phase.attachment,
                shape: {
                  ...phase.attachment.shape,
                  options: [cone, { ...line, widthFeet: 10 }],
                },
              },
            },
          ],
        },
      }),
      unitMechanicsVariant(unit, {
        id: "synthetic_breath_weapon_local_damage_type",
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              onFail: {
                ...phase.onFail,
                damageType: {
                  kind: "same_choice_as",
                  holeId: "synthetic_local_breath_damage_type",
                },
              },
            },
          ],
        },
      }),
      unitMechanicsVariant(unit, {
        id: "synthetic_breath_weapon_wrong_reset",
        mechanics: {
          ...unit.mechanics,
          resetCadence: { kind: "short_rest" },
        },
      }),
    ] as const satisfies readonly UnitRecord[];

    for (const malformedUnit of malformedUnits) {
      expect(
        battleAttackActionAreaSaveDamageReplacementSupportForUnit({
          unit: malformedUnit,
          draconicAncestryDamageType,
        }),
      ).toBe("unsupported");
      expect(
        parseSupportedUnitFeatureProfile(
          malformedUnit,
          [],
          draconicAncestrySourceFacts,
        ),
      ).toBeNull();
    }
  });

  test("species_dragonborn_damage_resistance is admitted from the shared Draconic Ancestry fact", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
        sourceFacts: draconicAncestrySourceFacts,
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(speciesDragonbornDamageResistanceUnitId),
        supportProfiles: [expectedDamageResistanceSupport],
      }),
    );
    expect(
      battlePassiveDamageResistanceSupportForUnit({
        unit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedDamageResistanceSupport);
    expect(
      passiveDamageResistanceProfileForUnit({
        unit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedDamageResistanceSupport.resistance);
  });

  test("Damage Resistance admission requires selected Draconic Ancestry damage type", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );

    expect(
      battlePassiveDamageResistanceSupportForUnit({
        unit,
        draconicAncestryDamageType: undefined,
      }),
    ).toBe("unsupported");
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.fail({
        tag: "battleUnitSupportProfileIssue",
        message: `Unsupported battle passive damage Resistance Unit hook: ${unit.id}.`,
      }),
    );
  });

  test("Damage Resistance admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Dragonborn Damage Resistance passive trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_draconic_resistance_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battlePassiveDamageResistanceSupportForUnit({
        unit: syntheticUnit,
        draconicAncestryDamageType,
      }),
    ).toEqual(expectedDamageResistanceSupport);
  });

  test("Damage Resistance profile rejects other Unit shapes, ambiguous grants, and attack-filtered Resistance", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Dragonborn Damage Resistance passive trait.");
    }
    const [grant] = unit.mechanics.grants;
    if (grant?.kind !== "grant_resistance") {
      throw new Error("Expected Dragonborn Resistance grant.");
    }
    const profileFor = (candidate: UnitRecord) =>
      passiveDamageResistanceProfileForUnit({
        unit: candidate,
        draconicAncestryDamageType,
      });
    const rejectedUnits = [
      unitLibrary.requireUnit(fighterActionSurgeUnitId),
      unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId),
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_resistance_without_grant",
        provenance: {
          kind: "synthetic-test",
          section: "Damage Resistance admission",
        },
        mechanics: { ...unit.mechanics, grants: [] },
      }),
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_resistance_with_ambiguous_grants",
        provenance: {
          kind: "synthetic-test",
          section: "Damage Resistance admission",
        },
        mechanics: { ...unit.mechanics, grants: [grant, grant] },
      }),
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_attack_filtered_resistance",
        provenance: {
          kind: "synthetic-test",
          section: "Damage Resistance admission",
        },
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...grant, sourceFilter: { kind: "attack" } }],
        },
      }),
    ];

    for (const rejectedUnit of rejectedUnits) {
      expect(profileFor(rejectedUnit), rejectedUnit.id).toBeNull();
    }
  });

  test("Damage Resistance halves matching spell damage through its reducer route", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
      sourceFacts: draconicAncestrySourceFacts,
    });
    expect(Result.isSuccess(unitRef)).toBe(true);
    if (Result.isFailure(unitRef)) {
      throw new Error(unitRef.failure.message);
    }
    const targetId = combatantId("dragonborn-damage-resistance-target");
    const result = startBattle({
      battleId: battleId("dragonborn-damage-resistance"),
      combatants: [
        characterCreature({
          combatantId: targetId,
          displayName: "Dragonborn Target",
          initiative: 10,
          characterUnitRefs: [unitRef.success],
        }),
        characterCreature({
          combatantId: combatantId("dragonborn-damage-resistance-attacker"),
          displayName: "Attacker",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("fire_bolt")],
          }),
        }),
      ],
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) {
      throw new Error(battleInitializationIssueMessage(result.failure));
    }
    const target = result.success.state.combatants.get(targetId);
    if (target === undefined) {
      throw new Error("Expected Dragonborn target combatant.");
    }

    expect(
      damageAmountAfterTargetAdjustments(
        result.success.state,
        target,
        9,
        "fire",
      ),
    ).toBe(4);
    expect(
      damageAmountAfterTargetAdjustments(
        result.success.state,
        target,
        9,
        "cold",
      ),
    ).toBe(9);
    const fireBoltAct = discoverBattleActs(result.success).find(
      (candidate) => candidate.subject.tag === "actionSpell",
    );
    expect(fireBoltAct?.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "discoverBattleActs",
          subject: "passiveDamageAdjustment",
          holes: [],
          owner: "battleDamageAdjustment",
        },
      ]),
    );
    if (fireBoltAct === undefined) {
      throw new Error("Expected Fire Bolt act against the Dragonborn target.");
    }
    const spellTarget = findHole(fireBoltAct.initialHoles, "targetChoice");
    const spellAttack = requireHole(
      resolveBattleSubject({
        state: result.success.state,
        subject: fireBoltAct.subject,
        fills: [targetFill(spellTarget, targetId)],
      }),
      "attackRoll",
    );
    const spellDamage = requireHole(
      resolveBattleSubject({
        state: result.success.state,
        subject: fireBoltAct.subject,
        fills: [
          targetFill(spellTarget, targetId),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const spellResolved = requireResolved(
      resolveBattleSubject({
        state: result.success.state,
        subject: fireBoltAct.subject,
        fills: [
          targetFill(spellTarget, targetId),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(spellDamage, [[9]]),
        ],
      }),
    );
    expect(spellResolved.state.combatants.get(targetId)?.hp).toBe(8);
    expect(spellResolved.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "passiveDamageAdjustment",
          holes: [],
          owner: "battleDamageAdjustment",
        },
      ]),
    );
  });

  test("dwarf_dwarven_resilience admits separate Poison Resistance and Poisoned save Advantage facts", () => {
    const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId),
        supportProfiles: [
          expectedPoisonedSaveAdvantageSupport,
          expectedPoisonResistanceSupport,
        ],
      }),
    );
    expect(battlePassiveSavingThrowRollModeSupportForUnit(unit)).toEqual(
      expectedPoisonedSaveAdvantageSupport,
    );
    expect(
      battlePassiveDamageResistanceSupportForUnit({
        unit,
        draconicAncestryDamageType: undefined,
      }),
    ).toEqual(expectedPoisonResistanceSupport);
    expect(
      passiveDamageResistanceProfileForUnit({
        unit,
        draconicAncestryDamageType: undefined,
      }),
    ).toEqual(expectedPoisonResistanceSupport.resistance);
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual(
      expect.objectContaining({
        kind: "passiveSavingThrowRollMode",
        unit,
        savingThrow: expectedPoisonedSaveAdvantageSupport.savingThrow,
      }),
    );
  });

  test("Dwarven Resilience fixed Resistance admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Dwarven Resilience passive trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_fixed_poison_resistance_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battlePassiveDamageResistanceSupportForUnit({
        unit: syntheticUnit,
        draconicAncestryDamageType: undefined,
      }),
    ).toEqual(expectedPoisonResistanceSupport);
  });

  test("Dwarven Resilience Poisoned save Advantage admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Dwarven Resilience passive trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_poisoned_save_advantage_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battlePassiveSavingThrowRollModeSupportForUnit(syntheticUnit),
    ).toEqual(expectedPoisonedSaveAdvantageSupport);
  });

  test("condition-specific saving throw admission rejects unsupported conditions independently of authored identity", () => {
    const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "passive" ||
      !("grants" in unit.mechanics)
    ) {
      throw new Error("Expected Dwarven Resilience passive trait.");
    }
    const mechanics = unit.mechanics;
    const savingThrowGrant = mechanics.grants.find(
      (grant) => grant.kind === "modify_roll_advantage",
    );
    if (savingThrowGrant?.kind !== "modify_roll_advantage") {
      throw new Error("Expected a saving throw Advantage grant.");
    }

    for (const condition of UNSUPPORTED_PASSIVE_SAVE_CONDITIONS) {
      const syntheticUnit = {
        ...unitMechanicsVariant(unit, {
          id: `synthetic_${condition}_save_advantage`,
          mechanics: {
            ...mechanics,
            grants: [
              ...mechanics.grants.filter((grant) => grant !== savingThrowGrant),
              { ...savingThrowGrant, conditionFilter: [condition] },
            ],
          },
        }),
        provenance: {
          kind: "synthetic-test",
          section: "Synthetic condition-specific saving throw Advantage",
        },
      } as const satisfies UnitRecord;

      expect(
        passiveSavingThrowRollModeProfileForUnit(syntheticUnit),
      ).toBeNull();
      expect(
        battlePassiveSavingThrowRollModeSupportForUnit(syntheticUnit),
      ).toBe("unsupported");
    }
  });

  test("Dwarven Resilience projects Advantage only for Saving Throws against Poisoned", () => {
    const state = dwarvenResilienceBattle();
    const targetId = combatantId("dwarven-resilience-target");

    expect(
      savingThrowRollModeProjections(state, "con", { condition: "poisoned" }),
    ).toEqual([{ targetId, rollMode: "advantage" }]);
    expect(savingThrowRollModeProjections(state, "con")).toEqual([]);
    expect(
      savingThrowRollModeProjections(state, "con", { condition: "charmed" }),
    ).toEqual([]);
    expect(
      savingThrowRollModeProjections(state, "wis", { condition: "poisoned" }),
    ).toEqual([{ targetId, rollMode: "advantage" }]);
    expect(
      passiveSavingThrowRollModeRouteEvents({
        state,
        ability: "con",
        condition: "poisoned",
      }),
    ).toEqual([
      { kind: "startBattle", owner: "battleSavingThrowRollMode" },
      {
        kind: "discoverBattleActs",
        subject: "passiveSavingThrowRollMode",
        holes: ["savingThrowOutcome"],
        owner: "battleSavingThrowRollMode",
      },
      {
        kind: "resolveBattleSubject",
        subject: "passiveSavingThrowRollMode",
        fill: "savingThrowOutcome",
        holes: [],
        owner: "battleSavingThrowRollMode",
      },
    ]);
    expect(
      passiveSavingThrowRollModeRouteEvents({
        state,
        ability: "con",
        condition: "charmed",
      }),
    ).toBeUndefined();
  });

  test("species_halfling_brave admits Frightened save Advantage facts", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingBraveUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(speciesHalflingBraveUnitId),
        supportProfiles: [expectedFrightenedSaveAdvantageSupport],
      }),
    );
    expect(battlePassiveSavingThrowRollModeSupportForUnit(unit)).toEqual(
      expectedFrightenedSaveAdvantageSupport,
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual(
      expect.objectContaining({
        kind: "passiveSavingThrowRollMode",
        unit,
        savingThrow: expectedFrightenedSaveAdvantageSupport.savingThrow,
      }),
    );
  });

  test("Brave Frightened save Advantage admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingBraveUnitId);
    if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Brave passive trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_frightened_save_advantage_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battlePassiveSavingThrowRollModeSupportForUnit(syntheticUnit),
    ).toEqual(expectedFrightenedSaveAdvantageSupport);
  });

  test("species_halfling_nimbleness admits larger creature-space Movement permission facts", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingNimblenessUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(speciesHalflingNimblenessUnitId),
        supportProfiles: [expectedCreatureSpaceMovementPermissionSupport],
      }),
    );
    expect(battleCreatureSpaceMovementPermissionSupportForUnit(unit)).toEqual(
      expectedCreatureSpaceMovementPermissionSupport,
    );
    expect(creatureSpaceMovementPermissionProfileForUnit(unit)).toEqual(
      expectedCreatureSpaceMovementPermissionSupport.permission,
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual(
      expect.objectContaining({
        kind: "creatureSpaceMovementPermission",
        unit,
        permission: expectedCreatureSpaceMovementPermissionSupport.permission,
      }),
    );
  });

  test("Nimbleness creature-space Movement admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingNimblenessUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "creature_space_movement_permission"
    ) {
      throw new Error("Expected Nimbleness movement-permission trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_creature_space_movement_permission_fixture",
      mechanics: unit.mechanics,
    });

    expect(
      battleCreatureSpaceMovementPermissionSupportForUnit(syntheticUnit),
    ).toEqual(expectedCreatureSpaceMovementPermissionSupport);
  });

  test("Nimbleness creature-space Movement support rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingNimblenessUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "creature_space_movement_permission"
    ) {
      throw new Error("Expected Nimbleness movement-permission mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_nimbleness_occupied_stop",
      mechanics: { ...unit.mechanics, canStopInOccupiedSpace: true },
    });

    expect(battleCreatureSpaceMovementPermissionSupportForUnit(nearMiss)).toBe(
      "unsupported",
    );
  });

  test("Brave projects Advantage for Frightened avoiding Saving Throws", () => {
    const state = halflingBraveBattle();
    const targetId = combatantId("halfling-brave-target");

    expect(
      savingThrowRollModeProjections(state, "wis", {
        condition: "frightened",
      }),
    ).toEqual([{ targetId, rollMode: "advantage" }]);
    expect(savingThrowRollModeProjections(state, "wis")).toEqual([]);
  });

  test("Brave projects Advantage for Frightened ending Saving Throws without broadening to unrelated conditions", () => {
    const state = halflingBraveBattle();
    const targetId = combatantId("halfling-brave-target");

    expect(
      savingThrowRollModeProjections(state, "con", {
        condition: "frightened",
      }),
    ).toEqual([{ targetId, rollMode: "advantage" }]);
    expect(
      savingThrowRollModeProjections(state, "con", { condition: "poisoned" }),
    ).toEqual([]);
  });

  test("Dwarven Resilience halves only Poison damage on the target", () => {
    const result = dwarvenResilienceBattle();
    const target = result.combatants.get(
      combatantId("dwarven-resilience-target"),
    );
    if (target === undefined) {
      throw new Error("Expected Dwarven Resilience target combatant.");
    }

    expect(
      damageAmountAfterTargetAdjustments(result, target, 9, "poison"),
    ).toBe(4);
    expect(damageAmountAfterTargetAdjustments(result, target, 9, "fire")).toBe(
      9,
    );
  });

  test("Goliath Powerful Build admits only Grappled escape ability-check Advantage", () => {
    const unit = unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId);

    expect(battlePassiveSavingThrowRollModeSupportForUnit(unit)).toBeNull();
    expect(battlePassiveAbilityCheckRollModeSupportForUnit(unit)).toEqual(
      expectedPowerfulBuildSupport,
    );
    expect(passiveAbilityCheckRollModeProfileForUnit(unit)).toEqual(
      expectedPowerfulBuildSupport.abilityCheck,
    );
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId),
        supportProfiles: [expectedPowerfulBuildSupport],
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual({
      kind: "passiveAbilityCheckRollMode",
      unit,
      abilityCheck: expectedPowerfulBuildSupport.abilityCheck,
    });

    const genericGrappledFilterUnit = unitMechanicsVariant(unit, {
      id: "synthetic_grappled_scoped_ability_check_fixture",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "modify_roll_advantage",
            mode: "advantage",
            on: ["ability_check"],
            conditionFilter: ["grappled"],
          },
        ],
      },
    });
    expect(
      passiveAbilityCheckRollModeProfileForUnit(genericGrappledFilterUnit),
    ).toBeNull();
    expect(
      battlePassiveAbilityCheckRollModeSupportForUnit(
        genericGrappledFilterUnit,
      ),
    ).toBe("unsupported");
    expect(
      parseSupportedUnitFeatureProfile(genericGrappledFilterUnit, []),
    ).toBeNull();

    const selectedScenario = powerfulBuildEscapeGrappleScenario({
      selected: true,
    });
    expect(selectedScenario.discoveryRouteEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "passiveAbilityCheckRollMode",
        holes: ["grappleOutcome"],
        owner: "battleAbilityCheckRollMode",
      },
    ]);
    expect(
      passiveProjectionRouteForDiscoveredAct(
        selectedScenario.state,
        selectedScenario.discoveredAct,
      ),
    ).toEqual(selectedScenario.discoveryRouteEvents);
    const selected = requireHole(selectedScenario.result, "grappleOutcome");
    expect(selected.kind).toBe("grappleOutcome");
    if (selected.kind !== "grappleOutcome") {
      throw new Error("Expected Powerful Build selected escape Grapple hole.");
    }
    expect(selected.rollMode).toBe("advantage");
    const resolutionInput = {
      state: selectedScenario.state,
      subject: selectedScenario.subject,
      fills: [grappleOutcomeFill(selected, true)],
    } as const;
    const resolution = resolveBattleSubject(resolutionInput);
    expect(resolution.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "passiveAbilityCheckRollMode",
        fill: "grappleOutcome",
        holes: [],
        owner: "battleAbilityCheckRollMode",
      },
    ]);
    const admission = admitBattleResolutionInput(resolutionInput);
    expect(admission.tag).toBe("admitted");
    if (admission.tag !== "admitted") {
      throw new Error("Expected admitted Powerful Build resolution input.");
    }
    expect(
      passiveProjectionRouteForResolution(admission.input, resolution),
    ).toEqual(resolution.routeEvents);
    const poisoned = requireHole(
      powerfulBuildEscapeGrappleScenario({
        selected: true,
        poisoned: true,
      }).result,
      "grappleOutcome",
    );
    expect(poisoned.kind).toBe("grappleOutcome");
    if (poisoned.kind !== "grappleOutcome") {
      throw new Error("Expected Powerful Build poisoned escape Grapple hole.");
    }
    expect(poisoned).toHaveProperty("rollMode", "normal");
    const unselected = requireHole(
      powerfulBuildEscapeGrappleScenario({ selected: false }).result,
      "grappleOutcome",
    );
    expect(unselected.kind).toBe("grappleOutcome");
    if (unselected.kind !== "grappleOutcome") {
      throw new Error(
        "Expected Powerful Build unselected escape Grapple hole.",
      );
    }
    expect(unselected).not.toHaveProperty("rollMode");
  });
});

function powerfulBuildEscapeGrappleScenario(input: {
  readonly selected: boolean;
  readonly poisoned?: boolean;
}) {
  const unit = unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Result.isSuccess(unitRef)).toBe(true);
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const scenarioId = input.selected
    ? input.poisoned === true
      ? "powerful-build-poisoned"
      : "powerful-build"
    : "powerful-build-unselected";
  const goliathId = combatantId(
    input.selected ? `${scenarioId}-goliath` : scenarioId,
  );
  const grapplerId = combatantId(`${scenarioId}-grappler`);
  const state = startBattle({
    battleId: battleId(`${scenarioId}-grapple-escape`),
    combatants: [
      characterCreature({
        combatantId: grapplerId,
        displayName: "Powerful Build Grappler",
        initiative: 12,
      }),
      characterCreature({
        combatantId: goliathId,
        displayName: "Powerful Build Goliath",
        initiative: 10,
        characterUnitRefs: input.selected ? [unitRef.success] : [],
        unitFeatures: input.selected
          ? [characterBattleFeatureInitForTest(unit)]
          : [],
        conditions: input.poisoned === true ? ["poisoned"] : [],
      }),
    ],
  });
  expect(Result.isSuccess(state)).toBe(true);
  if (Result.isFailure(state)) {
    throw new Error(battleInitializationIssueMessage(state.failure));
  }
  const grappleSubject = {
    tag: "action",
    actorId: grapplerId,
    action: "grapple",
  } as const;
  const target = requireHole(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetChoice = targetFill(target, goliathId, [
    { kind: "grappleTargetWithinReach", grapplerId, targetId: goliathId },
  ]);
  const outcome = requireHole(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [targetChoice],
    }),
    "grappleOutcome",
  );
  const grappled = requireResolved(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [targetChoice, grappleOutcomeFill(outcome, false)],
    }),
  );
  const escapeSubject = {
    tag: "action",
    actorId: goliathId,
    action: "escapeGrapple",
  } as const;
  const goliathTurn = requireResolved(
    endTurn({ state: grappled.state, actorId: grapplerId }),
  ).state;
  const discoveredEscape = discoverBattleActs(
    battleRuntimeSessionForTest({
      ...state.success,
      state: goliathTurn,
    }),
  ).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "escapeGrapple" &&
      act.subject.actorId === goliathId,
  );
  if (discoveredEscape === undefined) {
    throw new Error("Expected Powerful Build escape Grapple act.");
  }
  return {
    discoveredAct: discoveredEscape,
    discoveryRouteEvents: discoveredEscape.routeEvents,
    state: goliathTurn,
    subject: escapeSubject,
    result: resolveBattleSubject({
      state: goliathTurn,
      subject: escapeSubject,
      fills: [],
    }),
  };
}

function dwarvenResilienceBattle() {
  const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Result.isSuccess(unitRef)).toBe(true);
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const targetId = combatantId("dwarven-resilience-target");
  const result = startBattle({
    battleId: battleId("dwarven-resilience"),
    combatants: [
      characterCreature({
        combatantId: targetId,
        displayName: "Dwarf Target",
        initiative: 10,
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: [unitRef.success],
      }),
      characterCreature({
        combatantId: combatantId("dwarven-resilience-attacker"),
        displayName: "Attacker",
        initiative: 5,
      }),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function halflingBraveBattle() {
  const unit = unitLibrary.requireUnit(speciesHalflingBraveUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Result.isSuccess(unitRef)).toBe(true);
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const targetId = combatantId("halfling-brave-target");
  const result = startBattle({
    battleId: battleId("species-halfling-brave"),
    combatants: [
      characterCreature({
        combatantId: targetId,
        displayName: "Halfling Target",
        initiative: 10,
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: [unitRef.success],
      }),
      characterCreature({
        combatantId: combatantId("halfling-brave-attacker"),
        displayName: "Attacker",
        initiative: 5,
      }),
    ],
  });
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

describe("QMBT68 Monk Deflect Attacks deterministic Unit profile admission", () => {
  test("monk_martial_arts is admitted as an attack projection profile", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(monkMartialArtsUnitId),
        supportProfiles: [MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE],
      }),
    );
    expect(battleMartialArtsAttackProjectionSupportForUnit(unit)).toBe(
      MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(1) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "martialArtsAttackProjection",
        unit,
        classLevel: classLevel(1),
        martialArts: {
          condition: { kind: "unarmoredUnshieldedOnlyMonkWeapons" },
          bonusActionAttack: { kind: "unarmedStrike" },
          damageReplacement: {
            scope: "unarmedOrMonkWeapon",
            dice: 1,
            dieSize: 6,
          },
          abilitySubstitution: {
            use: "dex",
            replaces: "str",
            on: ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"],
          },
        },
      }),
    );
  });

  test("monk_martial_arts admission requires its Bonus Action Unarmed Strike grant", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
    expect(unit.kind).toBe("class_feature");
    if (unit.kind !== "class_feature") {
      throw new Error("Expected Monk Martial Arts to be a class feature.");
    }
    expect(unit.mechanics.family).toBe("passive");
    if (unit.mechanics.family !== "passive") {
      throw new Error("Expected Monk Martial Arts to use passive mechanics.");
    }
    const attackProjectionUnit: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        grants: unit.mechanics.grants.filter(
          (grant) => grant.kind !== "grant_bonus_action_attack",
        ),
      },
    };

    expect(
      battleMartialArtsAttackProjectionSupportForUnit(attackProjectionUnit),
    ).toBe("unsupported");
    expect(
      parseSupportedUnitFeatureProfile(attackProjectionUnit, [
        { className: "monk", level: classLevel(1) },
      ]),
    ).toBeNull();
  });

  test.each([
    { level: 1, dieSize: 6 },
    { level: 5, dieSize: 8 },
    { level: 11, dieSize: 10 },
    { level: 17, dieSize: 12 },
  ] as const)(
    "monk_martial_arts attack projection uses the Martial Arts die at Monk level $level",
    ({ level, dieSize }) => {
      const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);

      expect(
        parseSupportedUnitFeatureProfile(unit, [
          { className: "monk", level: classLevel(level) },
        ]),
      ).toEqual(
        expect.objectContaining({
          kind: "martialArtsAttackProjection",
          classLevel: classLevel(level),
          martialArts: expect.objectContaining({
            damageReplacement: {
              scope: "unarmedOrMonkWeapon",
              dice: 1,
              dieSize,
            },
            abilitySubstitution: {
              use: "dex",
              replaces: "str",
              on: ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"],
            },
          }),
        }),
      );
    },
  );

  test("monk_martial_arts rejects non-SRD Martial Arts die tier tables", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Monk Martial Arts passive mechanics.");
    }
    const effect = unit.mechanics.grants.find(
      (grant) => grant.kind === "replace_damage_die",
    );
    if (effect?.kind !== "replace_damage_die") {
      throw new Error("Expected Monk Martial Arts damage replacement.");
    }
    if (effect.die.kind !== "threshold_tiers") {
      throw new Error("Expected Monk Martial Arts threshold tiers.");
    }
    const die = effect.die;
    const malformedDice = [
      {
        name: "wrong_base_die",
        die: { ...die, base: { ...die.base, dieSize: 4 } },
      },
      {
        name: "wrong_threshold",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 11 ? { ...tier, atLevel: 10 } : tier,
          ),
        },
      },
      {
        name: "wrong_tier_die",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 17
              ? { ...tier, override: { ...tier.override, dieSize: 10 } }
              : tier,
          ),
        },
      },
      {
        name: "missing_tier",
        die: {
          ...die,
          tiers: die.tiers.filter((tier) => tier.atLevel !== 17),
        },
      },
      {
        name: "extra_tier",
        die: {
          ...die,
          tiers: [...die.tiers, { atLevel: 20, override: { dieSize: 12 } }],
        },
      },
    ];

    for (const malformed of malformedDice) {
      const malformedUnit = unitMechanicsVariant(unit, {
        id: `monk_martial_arts_${malformed.name}`,
        mechanics: {
          ...unit.mechanics,
          grants: unit.mechanics.grants.map((grant) =>
            grant.kind === "replace_damage_die"
              ? { ...grant, die: malformed.die }
              : grant,
          ),
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(malformedUnit, [
          { className: "monk", level: classLevel(17) },
        ]),
      ).toBeNull();
      expect(
        battleMartialArtsAttackProjectionSupportForUnit(malformedUnit),
      ).toBe("unsupported");
    }
  });

  test("monk_monks_focus admits executable battle options against the shared Focus Point resource", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    const supportProfile = {
      kind: MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
      effectSaveDc: {
        kind: "classFeatureAbilitySaveDc",
        base: 8,
        ability: "wis",
      },
      flurryOfBlows: {
        displayName: "Flurry of Blows",
        focusPointCost: 1,
        strikeCount: 2,
      },
      patientDefense: {
        displayName: "Patient Defense",
        freeAction: "disengage",
        focusPointCost: 1,
        focusActions: ["disengage", "dodge"],
      },
      stepOfTheWind: {
        displayName: "Step of the Wind",
        freeAction: "dash",
        focusPointCost: 1,
        focusActions: ["disengage", "dash"],
        jumpDistanceMultiplier: { multiplier: 2 },
      },
    } as const;

    expect(battleMonkFocusBattleOptionsSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(monkMonksFocusUnitId),
        supportProfiles: [supportProfile],
      }),
    );
  });

  test("monk_monks_focus admission requires exact battle execution coverage for initial options", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected Monk's Focus resource container mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "monk_monks_focus_extra_initial_option",
      mechanics: {
        ...unit.mechanics,
        optionSet: {
          ...unit.mechanics.optionSet,
          initialOptions: [
            ...unit.mechanics.optionSet.initialOptions,
            {
              id: "synthetic_focus_option",
              displayName: "Synthetic Focus Option",
            },
          ],
        },
      },
    });

    expect(battleMonkFocusBattleOptionsSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
    expect(
      parseSupportedUnitFeatureProfile(malformedUnit, [
        { className: "monk", level: classLevel(2) },
      ]),
    ).toBeNull();
  });

  test("monk_monks_focus never partially admits an incomplete executable option set", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected Monk's Focus resource container mechanics.");
    }
    const mechanics = unit.mechanics;
    const optionIndexes = mechanics.optionSet.initialOptions.map(
      (_, index) => index,
    );

    fc.assert(
      fc.property(
        fc.shuffledSubarray(optionIndexes, {
          minLength: 1,
          maxLength: optionIndexes.length,
        }),
        (omittedIndexes) => {
          const omitted = new Set(omittedIndexes);
          const incompleteUnit = unitMechanicsVariant(unit, {
            id: "monk_monks_focus_incomplete_battle_options",
            mechanics: {
              ...mechanics,
              optionSet: {
                ...mechanics.optionSet,
                initialOptions: mechanics.optionSet.initialOptions.map(
                  (option, index) => {
                    if (!omitted.has(index)) return option;
                    const { battleExecution: _omitted, ...withoutExecution } =
                      option;
                    return withoutExecution;
                  },
                ),
              },
            },
          });

          expect(
            battleMonkFocusBattleOptionsSupportForUnit(incompleteUnit),
          ).toBe(omitted.size === optionIndexes.length ? null : "unsupported");
        },
      ),
      { numRuns: 30 },
    );
  });

  test("monk_monks_focus rejects a wholly malformed authored execution set", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected Monk's Focus resource container mechanics.");
    }
    const whollyMalformedUnit = unitMechanicsVariant(unit, {
      id: "synthetic_monks_focus_malformed_executions",
      mechanics: {
        ...unit.mechanics,
        optionSet: {
          ...unit.mechanics.optionSet,
          initialOptions: unit.mechanics.optionSet.initialOptions.map(
            (option) => ({
              ...option,
              battleExecution: { kind: "unsupported_focus_execution" },
            }),
          ),
        },
      },
    });
    expect(
      battleMonkFocusBattleOptionsSupportForUnit(whollyMalformedUnit),
    ).toBe("unsupported");
  });

  test("monk_stunning_strike admits attack-hit Focus rider executable facts", () => {
    const unit = unitLibrary.requireUnit(monkStunningStrikeUnitId);
    const supportProfile = {
      kind: STUNNING_STRIKE_SUPPORT_PROFILE,
      stunningStrike: {
        trigger: {
          kind: "hitCreatureWithMonkWeaponOrUnarmedStrike",
          usageLimit: "oncePerTurn",
        },
        optional: true,
        spends: { resourceUnitId: "monk_monks_focus", amount: 1 },
        savingThrow: { ability: "con" },
        onFail: {
          kind: "applyCondition",
          condition: "stunned",
          expires: "startOfSourceNextTurn",
        },
        onSuccess: {
          speed: { kind: "halve", expires: "startOfSourceNextTurn" },
          attackRoll: {
            mode: "advantage",
            appliesTo: "nextAttackRollAgainstTargetBeforeExpiration",
          },
        },
      },
    } as const;

    expect(battleStunningStrikeSupportForUnit(unit)).toEqual(supportProfile);
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(5) },
      ]),
    ).toEqual({
      kind: "stunningStrike",
      unit,
      stunningStrike: supportProfile.stunningStrike,
    });
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(monkStunningStrikeUnitId),
        supportProfiles: [supportProfile],
      }),
    );
  });

  test("Surface rejects malformed Stunning Strike attack-hit rider facts", () => {
    const unit = unitLibrary.requireUnit(monkStunningStrikeUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "stunning_strike"
    ) {
      throw new Error("Expected Stunning Strike mechanics.");
    }
    const stunningStrikeMechanics = unit.mechanics;
    expect(() =>
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_stunning_strike_wrong_success_attack_roll_mode",
        mechanics: {
          ...stunningStrikeMechanics,
          onSuccess: {
            ...stunningStrikeMechanics.onSuccess,
            attackRoll: {
              ...stunningStrikeMechanics.onSuccess.attackRoll,
              mode: "disadvantage",
            },
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_stunning_strike_wrong_focus_resource",
        mechanics: {
          ...stunningStrikeMechanics,
          spends: {
            ...stunningStrikeMechanics.spends,
            resourceUnitId: unit.id,
          },
        },
      }),
    ).toThrow();
  }, 30_000);

  test("monk_deflect_attacks projects zero-damage redirect executable facts", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    const supportProfile =
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(monkDeflectAttacksUnitId),
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(5),
        modifiers: [
          {
            kind: "attackDamageReduction",
            damageIncludes: ["bludgeoning", "piercing", "slashing"],
            reduction: {
              kind: "dicePlusAbilityModifierPlusClassLevel",
              dieSize: 10,
              ability: "dex",
            },
            zeroDamageRedirect: {
              spends: { resourceUnitId: "monk_monks_focus", amount: 1 },
              save: {
                ability: "dex",
                dc: {
                  kind: "abilityPlusProficiency",
                  base: 8,
                  ability: "wis",
                },
              },
              damage: {
                dice: { dice: 2, dieSize: 8 },
                ability: "dex",
                damageType: "sameTypeDealtByAttack",
              },
              targetGate: {
                melee: "visibleWithin5Feet",
                ranged: "visibleWithin60FeetWithoutTotalCover",
              },
            },
          },
        ],
      }),
    );
  });

  test("monk_slow_fall projects fall-damage reduction executable facts", () => {
    const unit = unitLibrary.requireUnit(monkSlowFallUnitId);
    const supportProfile = REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(monkSlowFallUnitId),
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(4) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(4),
        modifiers: [
          {
            kind: "fallDamageReduction",
            reduction: {
              kind: "classLevelMultiplier",
              multiplier: 5,
            },
          },
        ],
      }),
    );
  });

  test("monk_deflect_attacks rejects redirect resource costs for a different Unit", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Deflect Attacks reaction modifier mechanics.");
    }
    const malformedModifier = unit.mechanics.modifiers.map((modifier) =>
      modifier.kind === "attack_damage_reduction" &&
      "zeroDamageRedirect" in modifier
        ? {
            ...modifier,
            zeroDamageRedirect: {
              ...modifier.zeroDamageRedirect,
              spends: {
                ...modifier.zeroDamageRedirect.spends,
                resourceUnitId: "wrong_deflect_attacks_resource",
              },
            },
          }
        : modifier,
    );
    const malformedUnit = decodeUnitRecordSync({
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedModifier,
      },
    });

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("rogue_uncanny_dodge admits an optional-trigger omission parser shape", () => {
    const unit = unitLibrary.requireUnit(rogueUncannyDodgeUnitId);
    const syntheticUnit = reactionTriggerFieldOmissionVariant(
      unit,
      "synthetic_uncanny_dodge_without_visible_attacker",
      "requiresVisibleAttacker",
    );
    expect(
      battleReactionRollOrDamageReductionSupportForUnit(syntheticUnit),
    ).toBe(REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE);
    expect(
      parseSupportedUnitFeatureProfile(syntheticUnit, [
        { className: "rogue", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        modifiers: [
          expect.objectContaining({
            kind: "attackDamageReduction",
            reduction: { kind: "halfDamage" },
          }),
        ],
      }),
    );
  });

  test("monk_deflect_attacks admits an optional-trigger omission parser shape", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    const syntheticUnit = reactionTriggerFieldOmissionVariant(
      unit,
      "synthetic_deflect_attacks_without_damage_type_filter",
      "damageIncludes",
    );
    expect(
      battleReactionRollOrDamageReductionSupportForUnit(syntheticUnit),
    ).toBe(ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE);
    expect(
      parseSupportedUnitFeatureProfile(syntheticUnit, [
        { className: "monk", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        modifiers: [
          expect.objectContaining({
            kind: "attackDamageReduction",
            reduction: {
              kind: "dicePlusAbilityModifierPlusClassLevel",
              dieSize: 10,
              ability: "dex",
            },
          }),
        ],
      }),
    );
  });
});

describe("QMBT8 deterministic Unit feature admission expansion", () => {
  test("fighter_action_surge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterActionSurgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(fighterActionSurgeUnitId),
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "extraActionGrant",
        unit,
        restriction: { kind: "exclude", actions: ["magic"] },
      }),
    );
  });

  test("fighter_improved_critical is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterImprovedCriticalUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(fighterImprovedCriticalUnitId),
        supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
      }),
    );
  });

  test("fighter_improved_critical admits exactly the 19-or-higher critical range", () => {
    const unit = unitLibrary.requireUnit(fighterImprovedCriticalUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Improved Critical passive mechanics.");
    }
    const mechanics = unit.mechanics;

    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (threshold) => {
        const variant = unitMechanicsVariant(unit, {
          id: "fighter_improved_critical_threshold_variant",
          mechanics: {
            ...mechanics,
            grants: mechanics.grants.map((effect) =>
              effect.kind === "modify_crit_range"
                ? { ...effect, threshold }
                : effect,
            ),
          },
        });

        expect(
          battleWeaponOrUnarmedCriticalRange19SupportForUnit(variant),
        ).toBe(threshold === 19 ? "criticalRange19" : "unsupported");
      }),
      { numRuns: 30 },
    );
  });

  test("fighter_tactical_master admits a level-gated mastery replacement support profile", () => {
    const unit = unitLibrary.requireUnit(fighterTacticalMasterUnitId);

    expect(battleTacticalMasterReplacementSupportForUnit(unit)).toEqual({
      kind: TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
      replacementProperties: TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
    });
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
        classLevels: [{ className: "fighter", level: 8 }],
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(fighterTacticalMasterUnitId),
        supportProfiles: [],
      }),
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
        classLevels: [{ className: "fighter", level: 9 }],
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(fighterTacticalMasterUnitId),
        supportProfiles: [
          {
            kind: TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
            replacementProperties:
              TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
          },
        ],
      }),
    );
  });

  test("Push and Slow mastery records are admitted through typed mastery mechanics", () => {
    const push = unitLibrary.requireUnit("mastery_push");
    const slow = unitLibrary.requireUnit("mastery_slow");

    expect(battleWeaponMasteryPushSupportForUnit(push)).toBe(
      WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
    );
    expect(battleWeaponMasterySlowSupportForUnit(slow)).toBe(
      WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: push.id },
        unit: push,
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit("mastery_push"),
        supportProfiles: [WEAPON_MASTERY_PUSH_SUPPORT_PROFILE],
      }),
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: slow.id },
        unit: slow,
      }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit("mastery_slow"),
        supportProfiles: [WEAPON_MASTERY_SLOW_SUPPORT_PROFILE],
      }),
    );
  });

  test("barbarian_rage is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(barbarianRageUnitId),
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "bonusAction",
        spendsUse: true,
        lifecycle: {
          kind: "roundExtended",
          initialExpiration: "endOfNextTurn",
          maximumDurationRounds: 100,
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attackRollAgainstEnemy",
            "bonusAction",
            "enemySavingThrow",
          ],
        },
        concentrationEffect: "breakAndPrevent",
        actionRestrictions: ["spellcasting"],
        rollModifiers: [],
        damageModifiers: [
          {
            amount: 2,
            abilityFilter: ["str"],
          },
        ],
        resistances: ["bludgeoning", "piercing", "slashing"],
      }),
    );
  });

  test("barbarian_rage projects its level-15 Persistent Rage lifecycle override", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);

    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "barbarian", level: classLevel(15) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        lifecycle: {
          kind: "fixedDuration",
          maximumDurationRounds: 100,
          earlyEndConditions: ["unconscious"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [],
        },
      }),
    );
  });

  test("synthetic round-extended support defaults omitted early ends and projects a melee damage filter", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation" ||
      unit.mechanics.ongoingFeature?.lifecycle.kind !== "round_extended"
    ) {
      throw new Error("Expected Rage round-extended activation mechanics.");
    }
    const [phase] = unit.mechanics.phases;
    if (phase?.kind !== "direct" || phase.effects === undefined) {
      throw new Error("Expected Rage direct ongoing effects.");
    }
    const lifecycle = { ...unit.mechanics.ongoingFeature.lifecycle };
    delete lifecycle.earlyEndConditions;
    delete lifecycle.earlyEndArmorCategories;
    const syntheticUnit = decodeUnitRecordSync({
      ...unit,
      id: "synthetic_round_extended_melee_damage",
      provenance: {
        kind: "synthetic-test",
        section: "Rage ongoing feature projection",
      },
      mechanics: {
        ...unit.mechanics,
        ongoingFeature: {
          ...unit.mechanics.ongoingFeature,
          lifecycle,
        },
        phases: [
          {
            ...phase,
            effects: phase.effects.map((effect) =>
              effect.kind === "modify_damage_numeric"
                ? {
                    ...effect,
                    weaponFilter: {
                      kind: "weapon_category",
                      category: "melee",
                    },
                  }
                : effect,
            ),
          },
        ],
      },
    });

    expect(
      parseSupportedUnitFeatureProfile(syntheticUnit, [
        { className: "barbarian", level: classLevel(1) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        lifecycle: expect.objectContaining({
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
        }),
        damageModifiers: expect.arrayContaining([
          expect.objectContaining({
            amount: 2,
            weaponUsageFilter: "melee",
          }),
        ]),
      }),
    );
  });

  test("barbarian_rage rejects Surface-valid lifecycle facts outside the battle profile", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation" ||
      unit.mechanics.ongoingFeature === undefined ||
      unit.mechanics.ongoingFeature.lifecycle.kind !== "round_extended"
    ) {
      throw new Error("Expected Rage round-extended activation mechanics.");
    }
    const support = unit.mechanics.ongoingFeature;
    const lifecycle = support.lifecycle;
    const unsupportedLifecycles = [
      {
        id: "barbarian_rage_exhaustion_early_end",
        lifecycle: {
          ...lifecycle,
          earlyEndConditions: ["exhaustion"],
        },
      },
      {
        id: "barbarian_rage_light_armor_early_end",
        lifecycle: {
          ...lifecycle,
          earlyEndArmorCategories: ["light"],
        },
      },
    ] as const;

    for (const {
      id,
      lifecycle: unsupportedLifecycle,
    } of unsupportedLifecycles) {
      const unsupportedUnit = decodeUnitRecordSync({
        ...unit,
        id,
        mechanics: {
          ...unit.mechanics,
          ongoingFeature: { ...support, lifecycle: unsupportedLifecycle },
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(unsupportedUnit, [
          { className: "barbarian", level: classLevel(1) },
        ]),
      ).toBeNull();
    }
  });

  test("rogue_cunning_action is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueCunningActionUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(rogueCunningActionUnitId),
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ALTERNATE_ACTION_COST_ACTIONS,
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });

  test("rogue_uncanny_dodge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueUncannyDodgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(5) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(rogueUncannyDodgeUnitId),
        supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(5),
        modifiers: [
          {
            kind: "attackDamageReduction",
            requiresVisibleAttacker: true,
            reduction: { kind: "halfDamage" },
          },
        ],
      }),
    );
  });

  test("rogue_sneak_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(rogueSneakAttackUnitId),
        supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageRider",
        unit,
        optional: true,
        usageLimit: "oncePerTurn",
        trigger: "finesseOrRangedAttackWithAdvantageOrAlly",
        eligibility:
          "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
        classLevel: classLevel(1),
        dice: {
          kind: "classLevelTable",
          dieSize: 6,
          diceByLevel: [
            { atLevel: 1, count: 1 },
            { atLevel: 3, count: 2 },
            { atLevel: 5, count: 3 },
            { atLevel: 7, count: 4 },
            { atLevel: 9, count: 5 },
            { atLevel: 11, count: 6 },
            { atLevel: 13, count: 7 },
            { atLevel: 15, count: 8 },
            { atLevel: 17, count: 9 },
            { atLevel: 19, count: 10 },
          ],
        },
      }),
    );
  });

  test("rogue_sneak_attack never admits a rider with a substituted damage type", () => {
    const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "on_hit_trigger"
    ) {
      throw new Error("Expected Sneak Attack on-hit mechanics.");
    }
    const mechanics = unit.mechanics;

    fc.assert(
      fc.property(
        fc.constantFrom(
          "acid" as const,
          "cold" as const,
          "fire" as const,
          "force" as const,
          "lightning" as const,
          "necrotic" as const,
          "poison" as const,
          "psychic" as const,
          "radiant" as const,
          "thunder" as const,
        ),
        (damageType) => {
          const variant = unitMechanicsVariant(unit, {
            id: "rogue_sneak_attack_damage_type_variant",
            mechanics: {
              ...mechanics,
              effect: { ...mechanics.effect, damageType },
            },
          });

          expect(battleAttackDamageRiderSupportForUnit(variant)).toBe(
            "unsupported",
          );
        },
      ),
      { numRuns: 30 },
    );
  });

  test("barbarian_frenzy is admitted as a mandatory Rage/Reckless damage rider", () => {
    const unit = unitLibrary.requireUnit(barbarianFrenzyUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(3) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit: unitLibrary.requireUnit(barbarianFrenzyUnitId),
        supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageRider",
        unit,
        optional: false,
        usageLimit: "oncePerTurn",
        trigger: "rageActiveRecklessStrengthBasedAttackFirstHit",
        classLevel: classLevel(3),
        dice: { kind: "rageDamageBonus", dieSize: 6 },
      }),
    );
  });
});

describe("M87 support-profile admission near misses", () => {
  test.each([
    {
      name: "halfling luck with the wrong triggering die face",
      unit: unitMechanicsVariant(
        unitLibrary.requireUnit("species_halfling_luck"),
        {
          id: "synthetic-halfling-luck-wrong-face",
          mechanics: {
            ...d20RerollMechanics(
              unitLibrary.requireUnit("species_halfling_luck"),
            ),
            trigger: { kind: "d20_test_roll_is", dieFace: 2 },
          },
        },
      ),
      project: battleD20TestNaturalOneRerollSupportForUnit,
      expected: "unsupported",
    },
    {
      name: "abjure foes with a two-minute duration",
      unit: unitMechanicsVariant(
        unitLibrary.requireUnit("paladin_abjure_foes"),
        {
          id: "synthetic-abjure-foes-duration",
          mechanics: {
            ...abjureFoesMechanics(
              unitLibrary.requireUnit("paladin_abjure_foes"),
            ),
            onFail: {
              ...abjureFoesMechanics(
                unitLibrary.requireUnit("paladin_abjure_foes"),
              ).onFail,
              duration: {
                ...abjureFoesMechanics(
                  unitLibrary.requireUnit("paladin_abjure_foes"),
                ).onFail.duration,
                amount: 2,
              },
            },
          },
        },
      ),
      project: magicActionSaveGatedConditionProfileForUnit,
      expected: null,
    },
    {
      name: "ranger roving with an extra composite part",
      unit: unitMechanicsVariant(unitLibrary.requireUnit("ranger_roving"), {
        id: "synthetic-roving-extra-part",
        mechanics: {
          ...rovingMechanics(unitLibrary.requireUnit("ranger_roving")),
          parts: [
            ...rovingMechanics(unitLibrary.requireUnit("ranger_roving")).parts,
            rovingMechanics(unitLibrary.requireUnit("ranger_roving")).parts[0],
          ],
        },
      }),
      project: passiveSpeedKindGrantsProfileForUnit,
      expected: null,
    },
    {
      name: "naturally stealthy with a same-size obscurer",
      unit: unitMechanicsVariant(
        unitLibrary.requireUnit("species_halfling_naturally_stealthy"),
        {
          id: "synthetic-naturally-stealthy-same-size",
          mechanics: {
            ...naturallyStealthyMechanics(
              unitLibrary.requireUnit("species_halfling_naturally_stealthy"),
            ),
            allowedObscurement: {
              kind: "obscured_only_by_creature",
              creatureSizeRelationToSelf: "same_size",
            },
          },
        },
      ),
      project: hideActionObscurementPermissionProfileForUnit,
      expected: null,
    },
    {
      name: "danger sense with a malformed save-ability filter",
      unit: unitMechanicsVariant(
        unitLibrary.requireUnit("barbarian_danger_sense"),
        {
          id: "synthetic-danger-sense-filter",
          mechanics: {
            ...dangerSenseMechanics(
              unitLibrary.requireUnit("barbarian_danger_sense"),
            ),
            grants: [
              {
                ...dangerSenseMechanics(
                  unitLibrary.requireUnit("barbarian_danger_sense"),
                ).grants[0],
                saveAbilityFilter: "dex",
              },
            ],
          },
        },
      ),
      project: passiveSavingThrowRollModeProfileForUnit,
      expected: null,
    },
  ] as const)(
    "$name is not recognized by its support-profile projector",
    ({ unit, project, expected }) => {
      expect(project(unit)).toBe(expected);
    },
  );
});
