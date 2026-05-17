// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT47 orc_relentless_endurance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT53 orc_adrenaline_rush
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bonus-action-dash-temporary-hit-points unit-feature.zero-hit-point-replacement
import { describe, expect, test } from "vitest";
import {
  acidSplashUnitId,
  orcAdrenalineRushUnitId,
  orcRelentlessEnduranceUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  adrenalineRushBattle,
  adrenalineRushDashAct,
  adrenalineRushDashSubject,
  adrenalineRushProfilePayload,
  adrenalineRushSupportProfile,
  relentlessEnduranceBattle,
  relentlessEnduranceDamageResult,
  relentlessEnduranceDisposition,
} from "./unit-profile-admission-feature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  characterBattleResourceForUnit,
  discoverBattleActs,
  Either,
  parseSupportedUnitFeatureProfile,
  resolveBattleSubject,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./unit-profile-admission-test-support.ts";
import type { UnitRecord } from "./unit-profile-admission-test-support.ts";

describe("QMBT47 deterministic Relentless Endurance admission", () => {
  test("orc_relentless_endurance is admitted as zero-Hit-Point replacement", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: orcRelentlessEnduranceUnitId,
        supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "zeroHitPointReplacement",
        unit,
        optional: true,
        trigger: "reducedToZeroHitPointsNotKilledOutright",
        replacementHp: 1,
        resetCadence: "longRest",
      }),
    );
    expect(characterBattleResourceForUnit(unit)).toEqual({
      kind: "use_count",
      cap: { kind: "fixed", uses: 1 },
    });
  });

  test("Relentless Endurance replaces a non-outright drop to 0 with 1 Hit Point and spends its use", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    expect(disposition.choices).toContainEqual({
      kind: "zeroHitPointReplacement",
      unitId: orcRelentlessEnduranceUnitId,
    });

    const result = resolveBattleSubject({
      state,
      subject: weaponAttackSubject("Longsword"),
      fills: [
        ...disposition.prefixFills,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          }),
        ]),
      },
    });
    if (result.tag !== "resolved") {
      throw new Error("Expected Relentless Endurance damage to resolve.");
    }
    const target = result.state.combatants.get(spellTargetId);
    if (target?.origin.kind !== "character") {
      throw new Error("Expected Relentless Endurance target character.");
    }
    expect(target.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Relentless Endurance replaces non-attack spell damage that drops the target to 0", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const spell = spellRecord(rayOfFrostUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetHp: 3,
      targetResources: [{ unit }],
      targetUnitRefs: [
        {
          unitId: orcRelentlessEnduranceUnitId,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({ state, spellId: rayOfFrostUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const disposition = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, rollFill, damageFill],
      }),
      "attackDamageDisposition",
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        rollFill,
        damageFill,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Relentless Endurance replaces failed save damage that drops the target to 0", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const spell = spellRecord(acidSplashUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetHp: 3,
      targetResources: [{ unit }],
      targetUnitRefs: [
        {
          unitId: orcRelentlessEnduranceUnitId,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({ state, spellId: acidSplashUnitId });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills: [saveFill] }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const disposition = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill, damageFill],
      }),
      "attackDamageDisposition",
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        saveFill,
        damageFill,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("declining Relentless Endurance follows the ordinary zero-HP lifecycle", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    const result = resolveBattleSubject({
      state,
      subject: weaponAttackSubject("Longsword"),
      fills: [
        ...disposition.prefixFills,
        attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          }),
        ]),
      },
    });
  });

  test("Relentless Endurance is not offered for outright death or spent uses", () => {
    const killedOutright = relentlessEnduranceBattle({
      targetHp: 1,
      targetMaxHp: 6,
    });
    expect(relentlessEnduranceDamageResult(killedOutright, 7)).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({ dead: true }),
          }),
        ]),
      },
    });

    const spent = relentlessEnduranceBattle({ targetHp: 3, usesRemaining: 0 });
    expect(relentlessEnduranceDamageResult(spent, 4)).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("invalid zero-Hit-Point replacement disposition fills are rejected", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    expect(
      resolveBattleSubject({
        state,
        subject: weaponAttackSubject("Longsword"),
        fills: [
          ...disposition.prefixFills,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "wrong_relentless_endurance",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Damage disposition must match one of the currently offered choices.",
    });
  });

  test("malformed zero-Hit-Point replacement mechanics remain unsupported", () => {
    const base = unitLibrary.requireUnit(
      orcRelentlessEnduranceUnitId,
    ) as UnitRecord & {
      readonly mechanics: {
        readonly family: "triggered_replacement";
        readonly trigger: object;
        readonly effect: object;
        readonly optional: boolean;
        readonly resetCadence: object;
      };
    };
    const malformedUnits = [
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_replacement_hp",
        mechanics: {
          ...base.mechanics,
          effect: { ...base.mechanics.effect, replacementHp: 2 },
        },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_required",
        mechanics: { ...base.mechanics, optional: false },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_trigger",
        mechanics: {
          ...base.mechanics,
          trigger: { kind: "creature_makes_damage_roll" },
        },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_reset",
        mechanics: {
          ...base.mechanics,
          resetCadence: { kind: "short_or_long_rest" },
        },
      }),
      {
        ...base,
        id: "relentless_endurance_spell_source",
        kind: "spell",
      } as UnitRecord,
    ];

    for (const unit of malformedUnits) {
      expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
      const supportResult = battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      });
      expect(supportResult).toEqual(
        unit.kind === "species_trait"
          ? Either.left({
              tag: "battleUnitSupportProfileIssue",
              message: `Unsupported battle zero-Hit-Point replacement Unit hook: ${unit.id}.`,
            })
          : Either.right({ unitId: unit.id, supportProfiles: [] }),
      );
    }
  });
});

describe("QMBT53 deterministic Adrenaline Rush admission", () => {
  test("orc_adrenaline_rush is admitted as Bonus Action Dash Temporary Hit Points", () => {
    const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: orcAdrenalineRushUnitId,
        supportProfiles: [adrenalineRushSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "bonusActionDashTemporaryHitPoints",
        unit,
        dashTemporaryHitPoints: adrenalineRushProfilePayload(),
      }),
    );
    expect(characterBattleResourceForUnit(unit)).toEqual({
      kind: "use_count",
      cap: { kind: "proficiency_bonus" },
    });
  });

  test("Adrenaline Rush spends a Bonus Action Dash use and grants Proficiency Bonus Temporary Hit Points", () => {
    const state = adrenalineRushBattle({ tempHp: 1 });
    const act = adrenalineRushDashAct(state);
    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 3,
            movement: expect.objectContaining({
              speedFeet: 30,
              remainingFeet: 60,
            }),
            origin: expect.objectContaining({
              resources: [
                expect.objectContaining({
                  unitId: orcAdrenalineRushUnitId,
                  usesRemaining: 2,
                }),
              ],
            }),
          }),
        ]),
      },
    });
  });

  test("Adrenaline Rush keeps higher existing Temporary Hit Points", () => {
    const state = adrenalineRushBattle({ tempHp: 5 });
    const result = resolveBattleSubject({
      state,
      subject: adrenalineRushDashAct(state).subject,
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 5,
          }),
        ]),
      },
    });
  });

  test("Adrenaline Rush is unavailable without uses", () => {
    const state = adrenalineRushBattle({ usesRemaining: 0 });
    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "bonusActionStandardAction" &&
          act.subject.sourceUnitId === orcAdrenalineRushUnitId,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: adrenalineRushDashSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("malformed Bonus Action Dash Temporary Hit Points mechanics remain unsupported", () => {
    const base = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
    if (
      base.kind !== "species_trait" ||
      base.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Adrenaline Rush activation species trait.");
    }
    const [phase] = base.mechanics.phases;
    if (phase?.kind !== "direct") {
      throw new Error("Expected Adrenaline Rush direct phase.");
    }
    const [effect] = phase.effects ?? [];
    if (effect?.kind !== "grant_temp_hp") {
      throw new Error("Expected Adrenaline Rush direct Temporary Hit Points.");
    }
    const malformedUnits = [
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_standard_action_dash",
        mechanics: {
          ...base.mechanics,
          activationCost: { kind: "standard_action", action: "dash" },
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_effect_amount",
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...phase,
              effects: [
                {
                  ...effect,
                  amount: {
                    kind: "fixed",
                    expr: { dice: 0, dieSize: 0, flat: 4 },
                  },
                },
              ],
            },
          ],
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_resource_cap",
        mechanics: {
          ...base.mechanics,
          resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_reset",
        mechanics: {
          ...base.mechanics,
          resetCadence: { kind: "long_rest" },
        },
      }),
    ] as const satisfies readonly UnitRecord[];

    for (const unit of malformedUnits) {
      expect(bonusActionDashTemporaryHitPointsProfileForUnit(unit)).toBeNull();
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle Bonus Action Dash Temporary Hit Points Unit hook: ${unit.id}.`,
        }),
      );
    }
  });
});
