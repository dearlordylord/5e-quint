// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A18 fighter_remarkable_athlete monk_open_hand_technique paladin_sacred_weapon ranger_hunters_prey rogue_steady_aim wizard_potent_cantrip
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.remarkable-athlete unit-feature.open-hand-technique unit-feature.paladin-sacred-weapon unit-feature.hunters-prey unit-feature.rogue-steady-aim unit-feature.potent-cantrip
import { describe, expect, test } from "vitest";
import {
  classRogueUnitId,
  fighterRemarkableAthleteUnitId,
  fighterSecondWindUnitId,
  monkOpenHandTechniqueUnitId,
  paladinSacredWeaponUnitId,
  rangerHuntersPreyUnitId,
  subclassFighterChampionUnitId,
  subclassMonkWarriorOfTheOpenHandUnitId,
  subclassPaladinOathOfDevotionUnitId,
  subclassRangerHunterUnitId,
  subclassWizardEvokerUnitId,
  unitLibrary,
  unitMechanicsVariant,
  wizardPotentCantripUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleHuntersPreySupportForUnit,
  battleOpenHandTechniqueSupportForUnit,
  battlePaladinSacredWeaponSupportForUnit,
  battlePotentCantripSupportForUnit,
  battleRemarkableAthleteSupportForUnit,
  battleRogueSteadyAimSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  HUNTERS_PREY_SUPPORT_PROFILE,
  movementFeet,
  OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
  PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  POTENT_CANTRIP_SUPPORT_PROFILE,
  REMARKABLE_ATHLETE_SUPPORT_PROFILE,
  ROGUE_STEADY_AIM_SUPPORT_PROFILE,
  rogueSteadyAimUnitId,
} from "./unit-profile-admission-test-support.ts";

const remarkableAthleteSupport = {
  kind: REMARKABLE_ATHLETE_SUPPORT_PROFILE,
  remarkableAthlete: {
    initiative: { kind: "rollAdvantage", roll: "initiative" },
    abilityCheck: {
      kind: "rollAdvantage",
      ability: "str",
      skill: "athletics",
    },
    criticalHitMovement: {
      trigger: "scoreCriticalHit",
      timing: "immediatelyAfterTrigger",
      distance: { kind: "halfSpeed" },
      opportunityAttacks: "doesNotProvoke",
    },
  },
} as const;

const openHandTechniqueSupport = {
  kind: OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
  technique: {
    trigger: {
      kind: "hitWithAttackGrantedBy",
      resourceUnitId: "monk_monks_focus",
      optionId: "flurry_of_blows",
    },
    optional: true,
    effectSaveDc: {
      kind: "classFeatureAbilitySaveDc",
      base: 8,
      ability: "wis",
    },
    choices: [
      {
        id: "addle",
        effect: {
          kind: "denyOpportunityAttacks",
          expires: "startOfTargetNextTurn",
        },
      },
      {
        id: "push",
        save: { ability: "str" },
        onFail: { kind: "pushAway", distanceFeet: movementFeet(15) },
      },
      {
        id: "topple",
        save: { ability: "dex" },
        onFail: { kind: "applyCondition", condition: "prone" },
      },
    ],
  },
} as const;

const sacredWeaponSupport = {
  kind: PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
  sacredWeapon: {
    activationCost: { kind: "standardAction", action: "attack" },
    spends: { resourceUnitId: "paladin_channel_divinity", amount: 1 },
    target: "heldMeleeWeapon",
    duration: {
      unit: "minute",
      amount: 10,
      endsOn: ["useFeatureAgain", "dismissNoAction", "notCarryingWeapon"],
    },
    attackRollBonus: {
      kind: "abilityModifier",
      ability: "cha",
      minimum: 1,
      appliesTo: "imbuedWeaponAttackRolls",
    },
    hitDamageTypeChoice: ["normal", "radiant"],
    light: {
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
  },
} as const;

const huntersPreySupport = {
  kind: HUNTERS_PREY_SUPPORT_PROFILE,
  huntersPrey: {
    choice: { kind: "chooseOne", replaceOn: "shortOrLongRest" },
    options: [
      {
        id: "colossusSlayer",
        trigger: "hitCreatureWithWeapon",
        targetPredicate: "missingAnyHitPoints",
        usageLimit: "oncePerTurn",
        damage: {
          kind: "addAttackDamageDice",
          dice: { dice: 1, dieSize: 8 },
          damageType: "sameAsAttack",
        },
      },
      {
        id: "hordeBreaker",
        trigger: "makeWeaponAttack",
        usageLimit: "oncePerTurn",
        extraAttack: {
          weapon: "sameWeapon",
          target: {
            kind: "differentCreatureNearOriginalTarget",
            withinFeetOfOriginalTarget: movementFeet(5),
            withinWeaponRange: true,
            notAttackedThisTurn: true,
          },
        },
      },
    ],
  },
} as const;

const steadyAimSupport = {
  kind: ROGUE_STEADY_AIM_SUPPORT_PROFILE,
  steadyAim: {
    activationCost: { kind: "bonusAction" },
    precondition: "noMovementThisTurn",
    attackRoll: {
      mode: "advantage",
      appliesTo: "nextAttackRollCurrentTurn",
    },
    speed: { kind: "setToZero", until: "endOfCurrentTurn" },
  },
} as const;

const potentCantripSupport = {
  kind: POTENT_CANTRIP_SUPPORT_PROFILE,
  potentCantrip: {
    trigger: { kind: "castCantripAtCreature", cantripKind: "damaging" },
    outcomes: ["missWithAttackRoll", "targetSucceedsSavingThrow"],
    damage: "halfCantripDamageIfAny",
    additionalEffect: "none",
  },
} as const;

const admissionCases = [
  {
    unitId: fighterRemarkableAthleteUnitId,
    className: "fighter",
    support: remarkableAthleteSupport,
    supportForUnit: battleRemarkableAthleteSupportForUnit,
    payloadKey: "remarkableAthlete",
  },
  {
    unitId: monkOpenHandTechniqueUnitId,
    className: "monk",
    support: openHandTechniqueSupport,
    supportForUnit: battleOpenHandTechniqueSupportForUnit,
    payloadKey: "technique",
  },
  {
    unitId: paladinSacredWeaponUnitId,
    className: "paladin",
    support: sacredWeaponSupport,
    supportForUnit: battlePaladinSacredWeaponSupportForUnit,
    payloadKey: "sacredWeapon",
  },
  {
    unitId: rangerHuntersPreyUnitId,
    className: "ranger",
    support: huntersPreySupport,
    supportForUnit: battleHuntersPreySupportForUnit,
    payloadKey: "huntersPrey",
  },
  {
    unitId: rogueSteadyAimUnitId,
    className: "rogue",
    support: steadyAimSupport,
    supportForUnit: battleRogueSteadyAimSupportForUnit,
    payloadKey: "steadyAim",
  },
  {
    unitId: wizardPotentCantripUnitId,
    className: "wizard",
    support: potentCantripSupport,
    supportForUnit: battlePotentCantripSupportForUnit,
    payloadKey: "potentCantrip",
  },
] as const;

describe("L13UG-A18 level-3 attack and movement feature admission", () => {
  test("SRD class and subclass records grant the admitted level-3 feature Units", () => {
    expect(
      unitLibrary.requireUnit(subclassFighterChampionUnitId),
    ).toMatchObject({
      kind: "subclass",
      className: "fighter",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: fighterRemarkableAthleteUnitId },
      ]),
    });
    expect(
      unitLibrary.requireUnit(subclassMonkWarriorOfTheOpenHandUnitId),
    ).toMatchObject({
      kind: "subclass",
      className: "monk",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: monkOpenHandTechniqueUnitId },
      ]),
    });
    expect(
      unitLibrary.requireUnit(subclassPaladinOathOfDevotionUnitId),
    ).toMatchObject({
      kind: "subclass",
      className: "paladin",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: paladinSacredWeaponUnitId },
      ]),
    });
    expect(unitLibrary.requireUnit(subclassRangerHunterUnitId)).toMatchObject({
      kind: "subclass",
      className: "ranger",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: rangerHuntersPreyUnitId },
      ]),
    });
    expect(unitLibrary.requireUnit(classRogueUnitId)).toMatchObject({
      kind: "class",
      className: "rogue",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: rogueSteadyAimUnitId },
      ]),
    });
    expect(unitLibrary.requireUnit(subclassWizardEvokerUnitId)).toMatchObject({
      kind: "subclass",
      className: "wizard",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: wizardPotentCantripUnitId },
      ]),
    });
  });

  test.each(admissionCases)(
    "$unitId is admitted and projected deterministically",
    ({ unitId, className, support, supportForUnit, payloadKey }) => {
      const unit = unitLibrary.requireUnit(unitId);
      const payload = (support as Record<string, unknown>)[payloadKey];

      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Either.right({
          unitId,
          supportProfiles: [support],
        }),
      );
      expect(supportForUnit(unit)).toEqual(support);
      expect(
        parseSupportedUnitFeatureProfile(unit, [
          { className, level: classLevel(3) },
        ]),
      ).toEqual(
        expect.objectContaining({
          kind: support.kind,
          unit,
          [payloadKey]: payload,
        }),
      );
    },
  );

  test("feature profile readers reject malformed mechanics and ignore unrelated Units", () => {
    const remarkableAthlete = unitLibrary.requireUnit(
      fighterRemarkableAthleteUnitId,
    );
    const openHandTechnique = unitLibrary.requireUnit(
      monkOpenHandTechniqueUnitId,
    );
    const sacredWeapon = unitLibrary.requireUnit(paladinSacredWeaponUnitId);
    const huntersPrey = unitLibrary.requireUnit(rangerHuntersPreyUnitId);
    const steadyAim = unitLibrary.requireUnit(rogueSteadyAimUnitId);
    const potentCantrip = unitLibrary.requireUnit(wizardPotentCantripUnitId);
    if (
      remarkableAthlete.kind !== "class_feature" ||
      remarkableAthlete.mechanics.family !== "remarkable_athlete" ||
      openHandTechnique.kind !== "class_feature" ||
      openHandTechnique.mechanics.family !== "open_hand_technique" ||
      sacredWeapon.kind !== "class_feature" ||
      sacredWeapon.mechanics.family !== "sacred_weapon" ||
      huntersPrey.kind !== "class_feature" ||
      huntersPrey.mechanics.family !== "hunters_prey" ||
      steadyAim.kind !== "class_feature" ||
      steadyAim.mechanics.family !== "steady_aim" ||
      potentCantrip.kind !== "class_feature" ||
      potentCantrip.mechanics.family !== "potent_cantrip"
    ) {
      throw new Error("Expected Task 18 level-3 feature mechanics.");
    }

    expect(
      battleRemarkableAthleteSupportForUnit(
        unitMechanicsVariant(remarkableAthlete, {
          id: "fighter_remarkable_athlete_wrong_skill",
          mechanics: {
            ...remarkableAthlete.mechanics,
            abilityCheck: {
              ...remarkableAthlete.mechanics.abilityCheck,
              skill: "acrobatics",
            },
          },
        }),
      ),
    ).toBe("unsupported");
    expect(
      battleOpenHandTechniqueSupportForUnit(
        unitMechanicsVariant(openHandTechnique, {
          id: "monk_open_hand_technique_wrong_push_distance",
          mechanics: {
            ...openHandTechnique.mechanics,
            choices: [
              openHandTechnique.mechanics.choices[0],
              {
                ...openHandTechnique.mechanics.choices[1],
                onFail: {
                  ...openHandTechnique.mechanics.choices[1].onFail,
                  distanceFeet: 10,
                },
              },
              openHandTechnique.mechanics.choices[2],
            ],
          },
        }),
      ),
    ).toBe("unsupported");
    expect(
      battlePaladinSacredWeaponSupportForUnit(
        unitMechanicsVariant(sacredWeapon, {
          id: "paladin_sacred_weapon_wrong_resource",
          mechanics: {
            ...sacredWeapon.mechanics,
            spends: {
              ...sacredWeapon.mechanics.spends,
              resourceUnitId: sacredWeapon.id,
            },
          },
        }),
      ),
    ).toBe("unsupported");
    expect(
      battleHuntersPreySupportForUnit(
        unitMechanicsVariant(huntersPrey, {
          id: "ranger_hunters_prey_wrong_damage_die",
          mechanics: {
            ...huntersPrey.mechanics,
            options: [
              {
                ...huntersPrey.mechanics.options[0],
                damage: {
                  ...huntersPrey.mechanics.options[0].damage,
                  dice: {
                    ...huntersPrey.mechanics.options[0].damage.dice,
                    dieSize: 6,
                  },
                },
              },
              huntersPrey.mechanics.options[1],
            ],
          },
        }),
      ),
    ).toBe("unsupported");
    expect(
      battleRogueSteadyAimSupportForUnit(
        unitMechanicsVariant(steadyAim, {
          id: "rogue_steady_aim_wrong_speed_duration",
          mechanics: {
            ...steadyAim.mechanics,
            speed: {
              ...steadyAim.mechanics.speed,
              until: "start_of_next_turn",
            },
          },
        }),
      ),
    ).toBe("unsupported");
    expect(
      battlePotentCantripSupportForUnit(
        unitMechanicsVariant(potentCantrip, {
          id: "wizard_potent_cantrip_wrong_target",
          mechanics: {
            ...potentCantrip.mechanics,
            trigger: {
              ...potentCantrip.mechanics.trigger,
              cantripKind: "any",
            },
          },
        }),
      ),
    ).toBe("unsupported");

    const unrelatedUnit = unitLibrary.requireUnit(fighterSecondWindUnitId);
    for (const { supportForUnit } of admissionCases) {
      expect(supportForUnit(unrelatedUnit)).toBeNull();
    }
  });
});
