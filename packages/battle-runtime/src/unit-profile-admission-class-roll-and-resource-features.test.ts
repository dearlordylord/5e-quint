import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion monk_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT62 fighter_tactical_mind
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-04-FIGHTER-INDOMITABLE fighter_indomitable
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19D-04-FIGHTER-INDOMITABLE fighter_indomitable
// UNIT-IDENTITY-REPLAY: L19D-04-FIGHTER-INDOMITABLE fighter_indomitable doResolveIndomitableFailedSavingThrowReroll
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT65 bard_cutting_words
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72A bard_bardic_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV75A sorcerer_innate_sorcery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-grant unit-feature.failed-ability-check-resource-boost unit-feature.failed-saving-throw-reroll unit-feature.innate-sorcery-activation unit-feature.reaction-roll-or-damage-reduction
import { describe, expect, it, test } from "vitest";
import { Result } from "effect";
import {
  barbarianRecklessAttackUnitId,
  bardBardicInspirationUnitId,
  bardCuttingWordsUnitId,
  fighterIndomitableUnitId,
  fighterSecondWindUnitId,
  fighterTacticalMindUnitId,
  monkEvasionUnitId,
  rogueEvasionUnitId,
  sorcererInnateSorceryUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleBardicInspirationGrantSupportForUnit,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  difficultyClass,
  DieRollResult,
  elapsedTimeTicks,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
} from "./unit-profile-admission.test-support.ts";
import type { UnitRecord } from "./unit-profile-admission.test-support.ts";
import {
  characterBattleResourceIsUseCount,
  characterBattleResourceMaxUses,
  characterResourceState,
  parseCharacterBattleClassLevels,
} from "./character-battle-resources.ts";
import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import { resolveFailedSavingThrowReroll } from "./battle-reducer/failed-saving-throw-reroll.ts";
import {
  battleSaveDamageReplacementSupportForUnit,
  battleFailedSavingThrowRerollSupportForUnit,
  FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";
import type { UnitFeatureProcedureExecution } from "./character-execution-admission.ts";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
  type BattleResourcePoolExecutionRef,
} from "./identity.ts";

function resourcePoolRefForTest(unitId: UnitRecord["id"]) {
  return battleResourcePoolExecutionRef(
    battleCharacterExecutionScopeRef(
      battleId("resource-unit-test"),
      combatantId(unitId),
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  );
}

function fighterClassLevels(level: number): CharacterBattleClassLevels {
  const result = parseCharacterBattleClassLevels([
    { className: "fighter", level },
  ]);
  if (Result.isFailure(result)) {
    throw new Error(result.failure.messages.join("; "));
  }
  return result.success;
}

function failedSavingThrowRerollExecutionForTest(
  resourcePoolRef: BattleResourcePoolExecutionRef,
): Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "failedSavingThrowReroll" }
> {
  return {
    kind: "failedSavingThrowReroll",
    savingThrow: {
      trigger: "failedSavingThrow",
      reroll: {
        use: "newRoll",
        bonus: {
          kind: "classLevel",
          className: "fighter",
          level: classLevel(9),
        },
      },
      spends: {
        resourcePoolRef,
        amount: 1,
      },
    },
  };
}

type IndomitableSelectedIdentityDriverAction =
  "doResolveIndomitableFailedSavingThrowReroll";

type IndomitableSelectedIdentityProjection = {
  readonly unitId: "fighter_indomitable";
  readonly supportProfile: typeof FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE;
  readonly resourceUnitId: "fighter_indomitable";
  readonly resourceMaxUses: number;
  readonly finalTotal: number;
  readonly succeeded: boolean;
  readonly mustUseNewRoll: true;
  readonly usesRemaining: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly IndomitableSelectedIdentityDriverAction[];
  readonly expected: IndomitableSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19D-04-FIGHTER-INDOMITABLE";
  readonly unitId: "fighter_indomitable";
  readonly actions: readonly IndomitableSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19D-04-FIGHTER-INDOMITABLE",
    unitId: "fighter_indomitable",
    actions: ["doResolveIndomitableFailedSavingThrowReroll"],
    sequences: [
      {
        name: "selected-fighter-indomitable-rerolls-failed-save-with-fighter-level-bonus",
        actions: ["doResolveIndomitableFailedSavingThrowReroll"],
        expected: expectedIndomitableProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const indomitableSelectedIdentityActions = {
  doResolveIndomitableFailedSavingThrowReroll:
    (): IndomitableSelectedIdentityProjection => {
      const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
      const profile = battleFailedSavingThrowRerollSupportForUnit(unit);
      const resource = characterResourceState(
        { unit },
        fighterClassLevels(9),
        resourcePoolRefForTest(unit.id),
      );
      if (profile === null || profile === "unsupported") {
        throw new Error("Expected supported Indomitable profile.");
      }
      if (!characterBattleResourceIsUseCount(resource)) {
        throw new Error("Expected Indomitable use-count resource.");
      }
      const result = resolveFailedSavingThrowReroll({
        execution: failedSavingThrowRerollExecutionForTest(
          resource.resourcePoolRef,
        ),
        resource,
        failedSave: {
          ability: "wis",
          dc: difficultyClass(15),
          originalTotal: 12,
          originalNaturalD20: DieRollResult(8),
        },
        replacementRoll: {
          naturalD20: DieRollResult(3),
          totalBeforeIndomitableBonus: 6,
        },
      });
      if (result.tag !== "resolved") {
        throw new Error("Expected resolved Indomitable reroll.");
      }
      return {
        unitId: fighterIndomitableUnitId,
        supportProfile: profile.kind,
        resourceUnitId: fighterIndomitableUnitId,
        resourceMaxUses: Number(
          characterBattleResourceMaxUses({
            unit,
            classLevels: fighterClassLevels(9),
          }),
        ),
        finalTotal: result.finalTotal,
        succeeded: result.succeeded,
        mustUseNewRoll: result.mustUseNewRoll,
        usesRemaining: Number(result.spentResource.usesRemaining),
      };
    },
} as const satisfies Record<
  IndomitableSelectedIdentityDriverAction,
  () => IndomitableSelectedIdentityProjection
>;

function expectedIndomitableProjection(): IndomitableSelectedIdentityProjection {
  return {
    unitId: "fighter_indomitable",
    supportProfile: FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE,
    resourceUnitId: "fighter_indomitable",
    resourceMaxUses: 1,
    finalTotal: 15,
    succeeded: true,
    mustUseNewRoll: true,
    usesRemaining: 0,
  };
}

describe("QMBT7 deterministic Unit profile admission", () => {
  test("fighter_second_wind is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterSecondWindUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "selfBonusActionHealing",
        unit,
        dice: 1,
        dieSize: 10,
        flatBase: 1,
        flatPerLevel: 1,
        startingAtLevel: 1,
        className: "fighter",
        classLevel: classLevel(1),
      }),
    );
  });

  test("self-healing admission projects independently omitted flat terms as zero", () => {
    const unit = unitLibrary.requireUnit(fighterSecondWindUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Second Wind activation feature Unit.");
    }
    const [phase] = unit.mechanics.phases;
    const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
    if (
      effect?.kind !== "heal_hp" ||
      effect.amount.kind !== "linear_per_level"
    ) {
      throw new Error("Expected Second Wind linear self-healing effect.");
    }
    const baseWithoutFlat = { ...effect.amount.base };
    delete baseWithoutFlat.flat;
    const perLevelWithoutFlat = { ...effect.amount.perLevel };
    delete perLevelWithoutFlat.flat;
    const variants = [
      {
        id: "synthetic_self_healing_without_base_flat",
        amount: { ...effect.amount, base: baseWithoutFlat },
        expected: { flatBase: 0, flatPerLevel: 1 },
      },
      {
        id: "synthetic_self_healing_without_per_level_flat",
        amount: { ...effect.amount, perLevel: perLevelWithoutFlat },
        expected: { flatBase: 1, flatPerLevel: 0 },
      },
    ] as const;

    for (const variant of variants) {
      const syntheticUnit = decodeUnitRecordSync({
        ...unit,
        id: variant.id,
        provenance: {
          kind: "synthetic-test",
          section: "Second Wind healing projection",
        },
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              effects: [{ ...effect, amount: variant.amount }],
            },
          ],
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(syntheticUnit, [
          { className: "fighter", level: classLevel(1) },
        ]),
      ).toEqual(
        expect.objectContaining({
          kind: "selfBonusActionHealing",
          ...variant.expected,
        }),
      );
    }
  });

  test("barbarian_reckless_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "firstAttackRoll",
        spendsUse: false,
        lifecycle: {
          kind: "turnBoundary",
          initialExpiration: "startOfNextTurn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
          extensionTriggers: [],
        },
        actionRestrictions: [],
        rollModifiers: [
          {
            mode: "advantage",
            affects: "selfRoll",
            on: "attackRoll",
            abilityFilter: ["str"],
          },
          {
            mode: "advantage",
            affects: "rollsAgainstSelf",
            on: "attackRoll",
          },
        ],
        damageModifiers: [],
        resistances: [],
      }),
    );
  });

  test("ongoing feature admission requires its owning class level", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);

    expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
  });

  test("ongoing feature admission rejects a class level below acquisition", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);

    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "barbarian", level: classLevel(1) },
      ]),
    ).toBeNull();
  });

  test("ongoing feature admission rejects area-scoped effects in a self phase", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Reckless Attack activation mechanics.");
    }
    const [phase] = unit.mechanics.phases;
    if (phase?.kind !== "direct" || phase.effects === undefined) {
      throw new Error("Expected Reckless Attack direct effects.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_reckless_area_scoped_effect",
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            effects: [
              ...phase.effects,
              {
                kind: "push_unsecured_objects",
                objectLocation: "entirely_within_area",
                originDirection: "away_from_caster",
                distanceFeet: 10,
              },
            ],
          },
        ],
      },
    });

    expect(
      parseSupportedUnitFeatureProfile(syntheticUnit, [
        { className: "barbarian", level: classLevel(2) },
      ]),
    ).toBeNull();
  });

  test("ongoing feature admission rejects an unsupported turn-boundary armor end", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation" ||
      unit.mechanics.ongoingFeature?.lifecycle.kind !== "turn_boundary"
    ) {
      throw new Error("Expected Reckless Attack turn-boundary mechanics.");
    }
    const support = unit.mechanics.ongoingFeature;
    const unsupportedArmorEnd = decodeUnitRecordSync({
      ...unit,
      id: "synthetic_turn_boundary_light_armor_end",
      provenance: {
        kind: "synthetic-test",
        section: "Reckless Attack lifecycle admission",
      },
      mechanics: {
        ...unit.mechanics,
        ongoingFeature: {
          ...support,
          lifecycle: {
            ...support.lifecycle,
            earlyEndArmorCategories: ["light"],
          },
        },
      },
    });

    expect(
      parseSupportedUnitFeatureProfile(unsupportedArmorEnd, [
        { className: "barbarian", level: classLevel(2) },
      ]),
    ).toBeNull();
  });

  test.each([
    { className: "rogue", unitId: rogueEvasionUnitId },
    { className: "monk", unitId: monkEvasionUnitId },
  ] as const)(
    "$unitId is admitted and projected through production feature support",
    ({ className, unitId }) => {
      const unit = unitLibrary.requireUnit(unitId);
      const profile = parseSupportedUnitFeatureProfile(unit, [
        { className, level: classLevel(7) },
      ]);

      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Result.succeed({
          unit,
          supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
        }),
      );
      expect(profile).toEqual(
        expect.objectContaining({
          kind: "saveDamageReplacement",
          unit,
          ability: "dex",
          requiredSuccessDamage: "half",
          onSuccess: "none",
          onFail: "half",
          suppressedByCondition: "incapacitated",
        }),
      );
    },
  );

  test("save-damage replacement support rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(rogueEvasionUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "save_damage_replacement"
    ) {
      throw new Error("Expected Rogue Evasion mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_evasion_wrong_ability",
      mechanics: {
        ...unit.mechanics,
        trigger: { ...unit.mechanics.trigger, ability: "con" },
      },
    });

    expect(battleSaveDamageReplacementSupportForUnit(nearMiss)).toBe(
      "unsupported",
    );
  });
});

describe("QMBT62 Tactical Mind deterministic Unit profile admission", () => {
  test("fighter_tactical_mind is admitted from failed ability-check resource boost mechanics", () => {
    const unit = unitLibrary.requireUnit(fighterTacticalMindUnitId);
    const supportProfile = {
      kind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
      abilityCheck: {
        trigger: "failedAbilityCheck",
        bonus: { dice: 1, dieSize: 10 },
        spends: { resourceUnitId: fighterSecondWindUnitId },
        refundSpendOnStillFailed: true,
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleFailedAbilityCheckResourceBoostSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "fighter", level: classLevel(2) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "failedAbilityCheckResourceBoost",
        unit,
        abilityCheck: supportProfile.abilityCheck,
      }),
    );
  });

  test("fighter_tactical_mind rejects unrelated ability-check feature shapes", () => {
    expect(
      battleFailedAbilityCheckResourceBoostSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });

  test("fighter_tactical_mind rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(fighterTacticalMindUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "failed_ability_check_resource_boost"
    ) {
      throw new Error("Expected Tactical Mind mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_tactical_mind_without_refund",
      mechanics: { ...unit.mechanics, refundSpendOnStillFailed: false },
    });

    expect(battleFailedAbilityCheckResourceBoostSupportForUnit(nearMiss)).toBe(
      "unsupported",
    );
  });
});

describe("L19D-04 Fighter Indomitable failed Saving Throw reroll", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<IndomitableSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: IndomitableSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = indomitableSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("fighter_indomitable is admitted from failed Saving Throw reroll mechanics", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const supportProfile = {
      kind: FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE,
      savingThrow: {
        trigger: "failedSavingThrow",
        reroll: {
          use: "newRoll",
          bonus: { kind: "classLevel", className: "fighter" },
        },
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [],
      }),
    );
    expect(battleFailedSavingThrowRerollSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, fighterClassLevels(9)),
    ).toEqual(
      expect.objectContaining({
        kind: "failedSavingThrowReroll",
        unit,
        savingThrow: supportProfile.savingThrow,
      }),
    );
  });

  test("fighter_indomitable projects Long Rest use-count tiers from class level", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);

    expect(
      characterBattleResourceMaxUses({
        unit,
        classLevels: fighterClassLevels(9),
      }),
    ).toBe(1);
    expect(
      characterBattleResourceMaxUses({
        unit,
        classLevels: fighterClassLevels(13),
      }),
    ).toBe(2);
    expect(
      characterBattleResourceMaxUses({
        unit,
        classLevels: fighterClassLevels(17),
      }),
    ).toBe(3);
  });

  test("fighter_indomitable rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "failed_saving_throw_reroll"
    ) {
      throw new Error("Expected Indomitable mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_indomitable_optional_old_roll",
      mechanics: {
        ...unit.mechanics,
        reroll: { ...unit.mechanics.reroll, mustUseNewRoll: false },
      },
    });

    expect(battleFailedSavingThrowRerollSupportForUnit(nearMiss)).toBe(
      "unsupported",
    );
  });

  test("resolver spends a use and adds Fighter level to the mandatory new roll", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const profile = battleFailedSavingThrowRerollSupportForUnit(unit);
    const resource = characterResourceState(
      { unit },
      fighterClassLevels(9),
      resourcePoolRefForTest(unit.id),
    );
    if (profile === null || profile === "unsupported") {
      throw new Error("Expected supported Indomitable profile.");
    }
    if (!characterBattleResourceIsUseCount(resource)) {
      throw new Error("Expected Indomitable use-count resource.");
    }

    expect(
      resolveFailedSavingThrowReroll({
        execution: failedSavingThrowRerollExecutionForTest(
          resource.resourcePoolRef,
        ),
        resource,
        failedSave: {
          ability: "wis",
          dc: difficultyClass(15),
          originalTotal: 12,
          originalNaturalD20: DieRollResult(8),
        },
        replacementRoll: {
          naturalD20: DieRollResult(3),
          totalBeforeIndomitableBonus: 6,
        },
      }),
    ).toEqual({
      tag: "resolved",
      finalTotal: 15,
      succeeded: true,
      mustUseNewRoll: true,
      spentResource: {
        ...resource,
        usesRemaining: 0,
      },
    });
  });

  test("resolver still spends the use when the mandatory new roll fails", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const profile = battleFailedSavingThrowRerollSupportForUnit(unit);
    const resource = characterResourceState(
      { unit },
      fighterClassLevels(9),
      resourcePoolRefForTest(unit.id),
    );
    if (profile === null || profile === "unsupported") {
      throw new Error("Expected supported Indomitable profile.");
    }
    if (!characterBattleResourceIsUseCount(resource)) {
      throw new Error("Expected Indomitable use-count resource.");
    }

    expect(
      resolveFailedSavingThrowReroll({
        execution: failedSavingThrowRerollExecutionForTest(
          resource.resourcePoolRef,
        ),
        resource,
        failedSave: {
          ability: "con",
          dc: difficultyClass(20),
          originalTotal: 10,
          originalNaturalD20: DieRollResult(4),
        },
        replacementRoll: {
          naturalD20: DieRollResult(2),
          totalBeforeIndomitableBonus: 5,
        },
      }),
    ).toEqual({
      tag: "resolved",
      finalTotal: 14,
      succeeded: false,
      mustUseNewRoll: true,
      spentResource: {
        ...resource,
        usesRemaining: 0,
      },
    });
  });

  test("resolver rejects non-failed saves, exhausted resources, and wrong resources", () => {
    const unit = unitLibrary.requireUnit(fighterIndomitableUnitId);
    const profile = battleFailedSavingThrowRerollSupportForUnit(unit);
    const resource = characterResourceState(
      { unit },
      fighterClassLevels(9),
      resourcePoolRefForTest(unit.id),
    );
    const exhaustedResource = characterResourceState(
      { unit, usesRemaining: 0 },
      fighterClassLevels(9),
      resourcePoolRefForTest(unit.id),
    );
    const wrongResource = characterResourceState(
      { unit: unitLibrary.requireUnit(fighterSecondWindUnitId) },
      fighterClassLevels(9),
      resourcePoolRefForTest(parseSharedUnitId(fighterSecondWindUnitId)),
    );
    if (profile === null || profile === "unsupported") {
      throw new Error("Expected supported Indomitable profile.");
    }
    if (
      !characterBattleResourceIsUseCount(resource) ||
      !characterBattleResourceIsUseCount(exhaustedResource) ||
      !characterBattleResourceIsUseCount(wrongResource)
    ) {
      throw new Error("Expected use-count resources.");
    }
    const baseInput = {
      execution: failedSavingThrowRerollExecutionForTest(
        resource.resourcePoolRef,
      ),
      failedSave: {
        ability: "dex" as const,
        dc: difficultyClass(15),
        originalTotal: 10,
        originalNaturalD20: DieRollResult(5),
      },
      replacementRoll: {
        naturalD20: DieRollResult(6),
        totalBeforeIndomitableBonus: 6,
      },
    };

    expect(
      resolveFailedSavingThrowReroll({
        ...baseInput,
        resource,
        failedSave: { ...baseInput.failedSave, originalTotal: 15 },
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        issue: expect.objectContaining({
          reason: "originalSavingThrowDidNotFail",
        }),
      }),
    );
    expect(
      resolveFailedSavingThrowReroll({
        ...baseInput,
        resource: exhaustedResource,
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        issue: expect.objectContaining({ reason: "resourceUnavailable" }),
      }),
    );
    expect(
      resolveFailedSavingThrowReroll({
        ...baseInput,
        resource: wrongResource,
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        issue: expect.objectContaining({ reason: "resourceMismatch" }),
      }),
    );
  });
});

describe("QMBT65 Cutting Words deterministic Unit profile admission", () => {
  test("bard_bardic_inspiration is admitted as a Bonus Action grant profile", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
      }),
    );
    expect(battleBardicInspirationGrantSupportForUnit(unit)).toBe(
      BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(1) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "bardicInspirationGrant",
        unit,
        rangeFeet: movementFeet(60),
        dieSize: 6,
        durationTicks: elapsedTimeTicks(600),
        spends: { resourceUnitId: bardBardicInspirationUnitId, amount: 1 },
      }),
    );
  });

  test.each([
    { level: 1, dieSize: 6 },
    { level: 5, dieSize: 8 },
    { level: 10, dieSize: 10 },
    { level: 15, dieSize: 12 },
  ] as const)(
    "bard_bardic_inspiration grant profile projects the Bardic die at Bard level $level",
    ({ level, dieSize }) => {
      const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);

      expect(
        parseSupportedUnitFeatureProfile(unit, [
          { className: "bard", level: classLevel(level) },
        ]),
      ).toEqual(
        expect.objectContaining({ kind: "bardicInspirationGrant", dieSize }),
      );
    },
  );

  test("bard_bardic_inspiration rejects malformed grant mechanics", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Bardic Inspiration activation mechanics.");
    }
    const malformedUnit = decodeUnitRecordSync({
      ...unit,
      mechanics: {
        ...unit.mechanics,
        range: { kind: "point" as const, feet: 30 },
      },
    });

    expect(battleBardicInspirationGrantSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
  });

  test("bard_bardic_inspiration rejects non-SRD Bardic die tier tables", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Bardic Inspiration activation mechanics.");
    }
    const phase = unit.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected Bardic Inspiration direct phase.");
    }
    const effect = phase.effects?.[0];
    if (
      effect?.kind !== "grant_die_token" ||
      effect.die.kind !== "threshold_tiers"
    ) {
      throw new Error("Expected Bardic Inspiration grant-die token.");
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
            tier.atLevel === 5 ? { ...tier, atLevel: 4 } : tier,
          ),
        },
      },
      {
        name: "wrong_tier_die",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 10
              ? { ...tier, override: { ...tier.override, dieSize: 12 } }
              : tier,
          ),
        },
      },
      {
        name: "missing_tier",
        die: {
          ...die,
          tiers: die.tiers.filter((tier) => tier.atLevel !== 15),
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
        id: `bard_bardic_inspiration_${malformed.name}`,
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              effects: [{ ...effect, die: malformed.die }],
            },
          ],
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(malformedUnit, [
          { className: "bard", level: classLevel(15) },
        ]),
      ).toBeNull();
      expect(battleBardicInspirationGrantSupportForUnit(malformedUnit)).toBe(
        "unsupported",
      );
    }
  });

  test("bard_cutting_words is admitted from reaction roll-or-damage reduction mechanics", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    const supportProfile = REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(3),
        modifiers: [
          {
            kind: "attackRollReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
          {
            kind: "abilityCheckReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
          {
            kind: "attackDamageRollReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
        ],
      }),
    );
  });

  test("bard_cutting_words rejects malformed ability-check reduction mechanics", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedAbilityCheckModifier = unit.mechanics.modifiers.map(
      (modifier) =>
        modifier.kind === "ability_check_reduction"
          ? {
              ...modifier,
              trigger: {
                ...modifier.trigger,
                requiresVisibleCreature: false,
              },
            }
          : modifier,
    );
    const malformedUnit = decodeUnitRecordSync({
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedAbilityCheckModifier,
      },
    });

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words rejects malformed ability-check reduction range", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedAbilityCheckModifier = unit.mechanics.modifiers.map(
      (modifier) =>
        modifier.kind === "ability_check_reduction"
          ? {
              ...modifier,
              trigger: {
                ...modifier.trigger,
                rangeFeet: 30,
              },
            }
          : modifier,
    );
    const malformedUnit = decodeUnitRecordSync({
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedAbilityCheckModifier,
      },
    });

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words rejects malformed reduction resource projection facts", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedUnit = decodeUnitRecordSync({
      ...unit,
      mechanics: {
        ...unit.mechanics,
        resource: {
          kind: "use_count" as const,
          cap: { kind: "ability_modifier" as const, ability: "wis" as const },
        },
      },
    });

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words projects Bardic Inspiration die size by class level", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);

    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        modifiers: expect.arrayContaining([
          expect.objectContaining({
            kind: "attackRollReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
          expect.objectContaining({
            kind: "abilityCheckReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
          expect.objectContaining({
            kind: "attackDamageRollReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
        ]),
      }),
    );
  });
});

describe("SRDINV75A Innate Sorcery deterministic Unit profile admission", () => {
  test("sorcerer_innate_sorcery is admitted as a fixed-duration Bonus Action activation", () => {
    const unit = unitLibrary.requireUnit(sorcererInnateSorceryUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "sorcerer", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Result.succeed({
        unit,
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
          kind: "fixedDuration",
          maximumDurationRounds: 10,
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
          extensionTriggers: [],
        },
        actionRestrictions: [],
        rollModifiers: [],
        spellModifiers: [
          {
            sourceClassName: "sorcerer",
            saveDcBonus: 1,
            attackRollMode: "advantage",
          },
        ],
        damageModifiers: [],
        resistances: [],
      }),
    );
  });

  test("fixed-duration ongoing feature admission rejects an unsupported armor early end", () => {
    const unit = unitLibrary.requireUnit(sorcererInnateSorceryUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation" ||
      unit.mechanics.ongoingFeature?.lifecycle.kind !== "fixed_duration"
    ) {
      throw new Error("Expected Innate Sorcery fixed-duration mechanics.");
    }
    const support = unit.mechanics.ongoingFeature;
    const unsupportedUnit = decodeUnitRecordSync({
      ...unit,
      id: "synthetic_fixed_duration_light_armor_end",
      provenance: {
        kind: "synthetic-test",
        section: "Innate Sorcery lifecycle admission",
      },
      mechanics: {
        ...unit.mechanics,
        ongoingFeature: {
          ...support,
          lifecycle: {
            ...support.lifecycle,
            earlyEndArmorCategories: ["light"],
          },
        },
      },
    });

    expect(
      parseSupportedUnitFeatureProfile(unsupportedUnit, [
        { className: "sorcerer", level: classLevel(1) },
      ]),
    ).toBeNull();
  });

  test("spell attack benefit admission rejects unsupported roll filters", () => {
    const unit = unitLibrary.requireUnit(sorcererInnateSorceryUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Innate Sorcery activation feature Unit.");
    }
    const [phase] = unit.mechanics.phases;
    if (
      phase === undefined ||
      phase.kind !== "direct" ||
      phase.effects === undefined
    ) {
      throw new Error("Expected Innate Sorcery direct activation phase.");
    }
    const filteredUnit = unitMechanicsVariant(unit, {
      id: "sorcerer_innate_sorcery_spell_attack_affects_filter",
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            effects: phase.effects.map((effect) =>
              effect.kind === "modify_roll_advantage"
                ? { ...effect, affects: "rolls_against_self" }
                : effect,
            ),
          },
        ],
      },
    });

    expect(
      parseSupportedUnitFeatureProfile(filteredUnit, [
        { className: "sorcerer", level: classLevel(1) },
      ]),
    ).toBeNull();
  });
});
