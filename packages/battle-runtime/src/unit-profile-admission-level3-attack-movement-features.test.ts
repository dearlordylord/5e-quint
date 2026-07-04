// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A18 fighter_remarkable_athlete monk_open_hand_technique paladin_sacred_weapon ranger_hunters_prey rogue_steady_aim wizard_potent_cantrip
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.remarkable-athlete unit-feature.open-hand-technique unit-feature.paladin-sacred-weapon unit-feature.hunters-prey unit-feature.rogue-steady-aim unit-feature.potent-cantrip
import { describe, expect, test } from "vitest";
import {
  classRogueUnitId,
  fighterRemarkableAthleteUnitId,
  fighterSecondWindUnitId,
  flyUnitId,
  monkOpenHandTechniqueUnitId,
  paladinSacredWeaponUnitId,
  produceFlameUnitId,
  rangerHuntersPreyUnitId,
  spellCasterId,
  spellTargetId,
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
  battleId,
  attackRollFill,
  attackTargetFill,
  classLevel,
  combatantId,
  Either,
  HUNTERS_PREY_SUPPORT_PROFILE,
  movementFeet,
  OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
  oppositionSide,
  PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  partySide,
  POTENT_CANTRIP_SUPPORT_PROFILE,
  REMARKABLE_ATHLETE_SUPPORT_PROFILE,
  requiredInitiativeRollModeForCombatant,
  movementFill,
  ROGUE_STEADY_AIM_SUPPORT_PROFILE,
  rogueSteadyAimUnitId,
  requireResultHole,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";
import type { BattleActiveEffect } from "./battle-reducer.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const remarkableAthleteActorId = combatantId("remarkable-athlete-actor");
const remarkableAthleteTargetId = combatantId("remarkable-athlete-target");

function remarkableAthleteRuntimeBattle(input: { readonly selected: boolean }) {
  const { unit, unitRef } = remarkableAthleteSelectedUnit();
  const state = startBattle({
    battleId: battleId(
      input.selected
        ? "remarkable-athlete-critical-movement"
        : "remarkable-athlete-critical-movement-unselected",
    ),
    combatants: [
      characterCreature({
        combatantId: remarkableAthleteActorId,
        displayName: "Remarkable Athlete Critical Actor",
        initiative: 18,
        side: partySide,
        characterUnitRefs: input.selected ? [unitRef] : [],
        classLevels: [{ className: "fighter", level: 3 }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: remarkableAthleteTargetId,
        displayName: "Remarkable Athlete Critical Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(state)).toBe(true);
  if (Either.isLeft(state)) {
    throw new Error(state.left.message);
  }
  return state.right;
}

function remarkableAthleteRuntimeBattleWithFlySpeed() {
  const state = remarkableAthleteRuntimeBattle({ selected: true });
  const actor = state.combatants.get(remarkableAthleteActorId);
  if (actor === undefined) {
    throw new Error("Expected Remarkable Athlete actor in fixture.");
  }
  const flySpeedGrant = {
    kind: "specialSpeedGrant",
    sourceSpellId: flyUnitId,
    sourceCombatantId: remarkableAthleteActorId,
    speedKind: "fly",
    speed: { kind: "fixed", speedFeet: movementFeet(40) },
    hover: true,
    expiresAt: { kind: "untilDispelled" },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(remarkableAthleteActorId, {
      ...actor,
      activeEffects: [...actor.activeEffects, flySpeedGrant],
    }),
  };
}

function remarkableAthleteSelectedUnit() {
  const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Either.isRight(unitRef)).toBe(true);
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return { unit, unitRef: unitRef.right };
}

function remarkableAthleteAttackPrefix(
  state: ReturnType<typeof remarkableAthleteRuntimeBattle>,
) {
  const subject = {
    tag: "action",
    actorId: remarkableAthleteActorId,
    action: "attack",
    attackName: "Unarmed Strike",
  } as const;
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    remarkableAthleteActorId,
    remarkableAthleteTargetId,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  return { subject, target: targetFill, attackRoll };
}

function unitFeatureDecisionFill(
  hole: ReturnType<typeof requireResultHole<"unitFeatureDecision">>,
  value: "use" | "decline",
) {
  return {
    kind: "unitFeatureDecision" as const,
    holeId: hole.holeId,
    value,
  };
}

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

const huntersPreyWoundedTargetWeaponDamageSupport = {
  kind: HUNTERS_PREY_SUPPORT_PROFILE,
  huntersPrey: {
    kind: "woundedTargetWeaponDamage",
    trigger: "hitCreatureWithWeapon",
    targetPredicate: "missingAnyHitPoints",
    usageLimit: "oncePerTurn",
    damage: {
      kind: "addAttackDamageDice",
      dice: { dice: 1, dieSize: 8 },
      damageType: "sameAsAttack",
    },
  },
} as const;

const huntersPreyNearbyDifferentTargetSameWeaponAttackSupport = {
  kind: HUNTERS_PREY_SUPPORT_PROFILE,
  huntersPrey: {
    kind: "nearbyDifferentTargetSameWeaponAttack",
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

  test("Hunter's Prey selected options project to semantic battle support", () => {
    const unit = unitLibrary.requireUnit(rangerHuntersPreyUnitId);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: {
          unitId: unit.id,
          selectedOption: {
            kind: "huntersPrey",
            optionId: "colossusSlayer",
          },
        },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: rangerHuntersPreyUnitId,
        supportProfiles: [huntersPreyWoundedTargetWeaponDamageSupport],
      }),
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: {
          unitId: unit.id,
          selectedOption: {
            kind: "huntersPrey",
            optionId: "hordeBreaker",
          },
        },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: rangerHuntersPreyUnitId,
        supportProfiles: [
          huntersPreyNearbyDifferentTargetSameWeaponAttackSupport,
        ],
      }),
    );
    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.left({
        tag: "battleUnitSupportProfileIssue",
        message:
          "Battle Unit ref ranger_hunters_prey requires a retained Hunter's Prey selection before battle initialization.",
      }),
    );
    expect(battleHuntersPreySupportForUnit(unit)).toBeNull();
    expect(
      battleHuntersPreySupportForUnit(unit, {
        kind: "huntersPrey",
        optionId: "hordeBreaker",
      }),
    ).toEqual(huntersPreyNearbyDifferentTargetSameWeaponAttackSupport);
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "ranger", level: classLevel(3) },
      ]),
    ).toBeNull();
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

  test("Remarkable Athlete projects Initiative and Strength Athletics Advantage from the selected support profile", () => {
    const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Either.isRight(unitRef)).toBe(true);
    if (Either.isLeft(unitRef)) {
      throw new Error(unitRef.left.message);
    }
    const state = startBattle({
      battleId: battleId("remarkable-athlete-roll-modes"),
      combatants: [
        characterCreature({
          combatantId: remarkableAthleteActorId,
          displayName: "Remarkable Athlete Actor",
          initiative: 18,
          side: partySide,
          characterUnitRefs: [unitRef.right],
          classLevels: [{ className: "fighter", level: 3 }],
          unitFeatures: [{ unit }],
        }),
        characterCreature({
          combatantId: remarkableAthleteTargetId,
          displayName: "Remarkable Athlete Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    expect(Either.isRight(state)).toBe(true);
    if (Either.isLeft(state)) {
      throw new Error(state.left.message);
    }

    expect(
      requiredInitiativeRollModeForCombatant(
        state.right,
        remarkableAthleteActorId,
      ),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(
        state.right,
        remarkableAthleteActorId,
        "str",
        { skill: "athletics" },
      ),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(
        state.right,
        remarkableAthleteActorId,
        "str",
      ),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(
        state.right,
        remarkableAthleteActorId,
        "str",
        { skill: "acrobatics" },
      ),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(
        state.right,
        remarkableAthleteActorId,
        "dex",
        { skill: "athletics" },
      ),
    ).toBeUndefined();
    expect(
      requiredInitiativeRollModeForCombatant(
        state.right,
        remarkableAthleteTargetId,
      ),
    ).toBeUndefined();
  });

  test("Remarkable Athlete profile is not executable without the selected support-profile Unit ref", () => {
    const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
    const state = startBattle({
      battleId: battleId("remarkable-athlete-unselected"),
      combatants: [
        characterCreature({
          combatantId: remarkableAthleteActorId,
          displayName: "Unselected Remarkable Athlete Actor",
          initiative: 18,
          side: partySide,
          classLevels: [{ className: "fighter", level: 3 }],
          unitFeatures: [{ unit }],
        }),
      ],
    });
    expect(Either.isRight(state)).toBe(true);
    if (Either.isLeft(state)) {
      throw new Error(state.left.message);
    }

    expect(
      requiredInitiativeRollModeForCombatant(
        state.right,
        remarkableAthleteActorId,
      ),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(
        state.right,
        remarkableAthleteActorId,
        "str",
        { skill: "athletics" },
      ),
    ).toBeUndefined();
  });

  test("Remarkable Athlete offers immediate half-Speed movement after a selected-profile Critical Hit", () => {
    const state = remarkableAthleteRuntimeBattle({ selected: true });
    const prefix = remarkableAthleteAttackPrefix(state);
    const critical = attackRollFill(prefix.attackRoll, {
      total: 20,
      naturalD20: 20,
    });
    const decision = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [prefix.target, critical],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Remarkable Athlete movement",
      choices: ["use", "decline"],
      unitFeature: {
        unitId: fighterRemarkableAthleteUnitId,
        label: "Remarkable Athlete",
      },
    });

    const movement = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [
          prefix.target,
          critical,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "movement",
    );
    expect(movement).toMatchObject({
      label: "Remarkable Athlete movement",
      actorId: remarkableAthleteActorId,
      movementBudgetFeet: movementFeet(15),
      speedKinds: [{ kind: "walk", movementBudgetFeet: movementFeet(15) }],
    });

    const moved = resolveBattleSubject({
      state,
      subject: prefix.subject,
      fills: [
        prefix.target,
        critical,
        unitFeatureDecisionFill(decision, "use"),
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(moved.tag).not.toBe("invalid");
    if (moved.tag === "resolved") {
      expect(moved.snapshot.pendingInterrupt).toBeNull();
      expect(
        moved.state.combatants.get(remarkableAthleteActorId)?.movementSpentFeet,
      ).toEqual(movementFeet(0));
    }
  });

  test("Remarkable Athlete Critical Hit movement projects represented Speed kinds", () => {
    const state = remarkableAthleteRuntimeBattleWithFlySpeed();
    const prefix = remarkableAthleteAttackPrefix(state);
    const critical = attackRollFill(prefix.attackRoll, {
      total: 20,
      naturalD20: 20,
    });
    const decision = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [prefix.target, critical],
      }),
      "unitFeatureDecision",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [
          prefix.target,
          critical,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "movement",
    );
    expect(movement).toMatchObject({
      label: "Remarkable Athlete movement",
      actorId: remarkableAthleteActorId,
      movementBudgetFeet: movementFeet(20),
      speedKinds: [
        { kind: "walk", movementBudgetFeet: movementFeet(15) },
        { kind: "fly", movementBudgetFeet: movementFeet(20) },
      ],
    });

    const moved = resolveBattleSubject({
      state,
      subject: prefix.subject,
      fills: [
        prefix.target,
        critical,
        unitFeatureDecisionFill(decision, "use"),
        movementFill(movement, {
          speedKind: "fly",
          movementCostFeet: 20,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(moved.tag).not.toBe("invalid");
    if (moved.tag === "resolved") {
      expect(
        moved.state.combatants.get(remarkableAthleteActorId)?.movementSpentFeet,
      ).toEqual(movementFeet(0));
    }
  });

  test("Remarkable Athlete offers immediate movement after a selected-profile spell attack Critical Hit", () => {
    const { unit, unitRef } = remarkableAthleteSelectedUnit();
    const spell = spellRecord(produceFlameUnitId);
    const state = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "fighter", level: classLevel(3) }],
      casterUnitRefs: [unitRef],
      casterUnitFeatures: [{ unit }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const lit = resolveBattleSubject({
      state,
      subject: bonusSpellAct({ state, spellId: produceFlameUnitId }).subject,
      fills: [],
    });
    expect(lit).toMatchObject({ tag: "resolved" });
    if (lit.tag !== "resolved") {
      throw new Error("Expected Produce Flame held light to resolve.");
    }
    const hurl = spellAct({
      state: lit.state,
      spellId: produceFlameUnitId,
    });
    const target = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = spellTargetFill(
      target,
      produceFlameUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const critical = attackRollFill(attack, {
      total: 20,
      naturalD20: 20,
    });
    const decision = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [targetFill, critical],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Remarkable Athlete movement",
      unitFeature: {
        unitId: fighterRemarkableAthleteUnitId,
        label: "Remarkable Athlete",
      },
    });

    const movement = requireResultHole(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [targetFill, critical, unitFeatureDecisionFill(decision, "use")],
      }),
      "movement",
    );
    expect(movement).toMatchObject({
      actorId: spellCasterId,
      movementBudgetFeet: movementFeet(15),
    });
    expect(
      resolveBattleSubject({
        state: lit.state,
        subject: hurl.subject,
        fills: [
          targetFill,
          critical,
          unitFeatureDecisionFill(decision, "use"),
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
  });

  test("Remarkable Athlete critical movement can be declined without leaving a movement hole", () => {
    const state = remarkableAthleteRuntimeBattle({ selected: true });
    const prefix = remarkableAthleteAttackPrefix(state);
    const critical = attackRollFill(prefix.attackRoll, {
      total: 20,
      naturalD20: 20,
    });
    const decision = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [prefix.target, critical],
      }),
      "unitFeatureDecision",
    );
    const declined = resolveBattleSubject({
      state,
      subject: prefix.subject,
      fills: [
        prefix.target,
        critical,
        unitFeatureDecisionFill(decision, "decline"),
      ],
    });
    expect(declined.tag).not.toBe("invalid");
    if (declined.tag === "needsHoles") {
      expect(declined.holes).not.toContainEqual(
        expect.objectContaining({ kind: "movement" }),
      );
    }
  });

  test("Remarkable Athlete critical movement rejects excess distance and Opportunity Attack threats", () => {
    const state = remarkableAthleteRuntimeBattle({ selected: true });
    const prefix = remarkableAthleteAttackPrefix(state);
    const critical = attackRollFill(prefix.attackRoll, {
      total: 20,
      naturalD20: 20,
    });
    const decision = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [prefix.target, critical],
      }),
      "unitFeatureDecision",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [
          prefix.target,
          critical,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [
          prefix.target,
          critical,
          unitFeatureDecisionFill(decision, "use"),
          movementFill(movement, {
            movementCostFeet: 16,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject: prefix.subject,
        fills: [
          prefix.target,
          critical,
          unitFeatureDecisionFill(decision, "use"),
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [
              {
                reactorId: remarkableAthleteTargetId,
                attackName: "Unarmed Strike",
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Remarkable Athlete movement does not provoke Opportunity Attacks.",
    });
  });

  test("Remarkable Athlete does not offer critical movement for non-critical hits or missing selected profile", () => {
    const selectedState = remarkableAthleteRuntimeBattle({ selected: true });
    const selectedPrefix = remarkableAthleteAttackPrefix(selectedState);
    const nonCritical = resolveBattleSubject({
      state: selectedState,
      subject: selectedPrefix.subject,
      fills: [
        selectedPrefix.target,
        attackRollFill(selectedPrefix.attackRoll, {
          total: 15,
          naturalD20: 10,
        }),
      ],
    });
    expect(nonCritical).not.toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "unitFeatureDecision" })],
    });

    const unselectedState = remarkableAthleteRuntimeBattle({ selected: false });
    const unselectedPrefix = remarkableAthleteAttackPrefix(unselectedState);
    const unselectedCritical = resolveBattleSubject({
      state: unselectedState,
      subject: unselectedPrefix.subject,
      fills: [
        unselectedPrefix.target,
        attackRollFill(unselectedPrefix.attackRoll, {
          total: 20,
          naturalD20: 20,
        }),
      ],
    });
    expect(unselectedCritical).not.toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "unitFeatureDecision" })],
    });
  });

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
