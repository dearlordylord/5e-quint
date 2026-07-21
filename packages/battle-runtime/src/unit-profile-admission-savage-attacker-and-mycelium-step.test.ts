import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT31 feat_savage_attacker
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT21 mycelium_step
import { describe, expect, test } from "vitest";
import {
  characterAttackSubjectForTest,
  characterBattleFeatureInitForTest,
  requireCharacterUnitProcedureRefForTest,
} from "./battle-runtime-test-support.ts";
import {
  rogueSneakAttackUnitId,
  savageAttackerUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  attackDamageRiderBattleUnitRef,
  savageAttackerBattle,
  savageAttackerBattleUnitRef,
} from "./unit-profile-admission-feature-fixture-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  classLevel,
  DieRollResult,
  Either,
  mechanicsOnlyMyceliumStepUnit,
  myceliumStepInput,
  parseSupportedUnitFeatureProfile,
  resolveBattleSubject,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

describe("QMBT31 deterministic Savage Attacker profile slice", () => {
  test("savage attacker is admitted and projected as a weapon damage dice roll choice", () => {
    const unit = unitLibrary.requireUnit(savageAttackerUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unit,
        supportProfiles: [WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "weaponDamageDiceRollChoice",
        unit,
        damageDiceChoice: {
          optional: true,
          trigger: "weaponHit",
          usageLimit: "oncePerTurn",
          diceScope: "weaponDamageDice",
          choose: "eitherRoll",
        },
      }),
    );
  });

  test("savage attacker support projection chooses either weapon damage dice candidate on a weapon hit", () => {
    const session = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state = session.state;
    const subject = weaponAttackSubject(session, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      weaponDamageDiceRollChoiceProcedureRefs: [
        requireCharacterUnitProcedureRefForTest(
          session,
          spellCasterId,
          savageAttackerUnitId,
        ),
      ],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[8]], undefined, {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            spellCasterId,
            savageAttackerUnitId,
          ),
          selection: "second",
          candidates: [
            { results: [DieRollResult(2)] },
            { results: [DieRollResult(8)] },
          ],
        }),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          weaponDamageDiceRollChoicesUsedThisTurn: [
            {
              attackerId: spellCasterId,
              procedureRef: requireCharacterUnitProcedureRefForTest(
                session,
                spellCasterId,
                savageAttackerUnitId,
              ),
            },
          ],
        },
      },
    });
  });

  test("savage attacker critical-hit candidates are full doubled weapon dice pools", () => {
    const session = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state = session.state;
    const subject = weaponAttackSubject(session, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      weaponDamageDiceRollChoiceProcedureRefs: [
        requireCharacterUnitProcedureRefForTest(
          session,
          spellCasterId,
          savageAttackerUnitId,
        ),
      ],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damage, [[2, 3]], undefined, {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            spellCasterId,
            savageAttackerUnitId,
          ),
          selection: "second",
          candidates: [
            { results: [DieRollResult(1), DieRollResult(2)] },
            { results: [DieRollResult(2), DieRollResult(3)] },
          ],
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          weaponDamageDiceRollChoicesUsedThisTurn: [
            {
              attackerId: spellCasterId,
              procedureRef: requireCharacterUnitProcedureRefForTest(
                session,
                spellCasterId,
                savageAttackerUnitId,
              ),
            },
          ],
        },
      },
    });
  });

  test("savage attacker rerolls only weapon dice when the hit has an attack damage rider", () => {
    const session = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      classLevels: [{ className: "rogue", level: classLevel(1) }],
      characterUnitRefs: [
        savageAttackerBattleUnitRef(),
        attackDamageRiderBattleUnitRef(),
      ],
      unitFeatures: [
        characterBattleFeatureInitForTest(
          unitLibrary.requireUnit(rogueSneakAttackUnitId),
          [{ className: "rogue", level: classLevel(1) }],
        ),
      ],
    });
    const state = session.state;
    const subject = weaponAttackSubject(session, "Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        {
          attackerId: spellCasterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            spellCasterId,
            rogueSneakAttackUnitId,
          ),
          optional: true,
          damage: { dice: 1, dieSize: 6, damageType: "piercing" },
        },
      ],
      weaponDamageDiceRollChoiceProcedureRefs: [
        requireCharacterUnitProcedureRefForTest(
          session,
          spellCasterId,
          savageAttackerUnitId,
        ),
      ],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(
          damage,
          [[5], [6]],
          [
            requireCharacterUnitProcedureRefForTest(
              session,
              spellCasterId,
              rogueSneakAttackUnitId,
            ),
          ],
          {
            procedureRef: requireCharacterUnitProcedureRefForTest(
              session,
              spellCasterId,
              savageAttackerUnitId,
            ),
            selection: "second",
            candidates: [
              { results: [DieRollResult(2)] },
              { results: [DieRollResult(5)] },
            ],
          },
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          attackDamageRidersUsedThisTurn: [
            {
              attackerId: spellCasterId,
              procedureRef: requireCharacterUnitProcedureRefForTest(
                session,
                spellCasterId,
                rogueSneakAttackUnitId,
              ),
            },
          ],
          weaponDamageDiceRollChoicesUsedThisTurn: [
            {
              attackerId: spellCasterId,
              procedureRef: requireCharacterUnitProcedureRefForTest(
                session,
                spellCasterId,
                savageAttackerUnitId,
              ),
            },
          ],
        },
      },
    });
  });

  test("savage attacker cannot be used after a miss or on non-weapon damage", () => {
    const weaponSession = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const weaponState = weaponSession.state;
    const subject = weaponAttackSubject(weaponSession, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: weaponState, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const hitDamage = requireResultHole(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 1, naturalD20: 2 }),
          damageRollFillWithGroups(hitDamage, [[8]], undefined, {
            procedureRef: requireCharacterUnitProcedureRefForTest(
              weaponSession,
              spellCasterId,
              savageAttackerUnitId,
            ),
            selection: "second",
            candidates: [
              { results: [DieRollResult(2)] },
              { results: [DieRollResult(8)] },
            ],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const unarmedSession = savageAttackerBattle({ attack: null });
    const unarmedState = unarmedSession.state;
    const unarmedSubject = characterAttackSubjectForTest(
      unarmedState,
      spellCasterId,
      "Unarmed Strike",
    );
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(
            unarmedTarget,
            spellCasterId,
            spellTargetId,
            "Unarmed Strike",
          ),
        ],
      }),
      "attackRoll",
    );
    const unarmedDamage = resolveBattleSubject({
      state: unarmedState,
      subject: unarmedSubject,
      fills: [
        attackTargetFill(
          unarmedTarget,
          spellCasterId,
          spellTargetId,
          "Unarmed Strike",
        ),
        attackRollFill(unarmedRoll, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(unarmedDamage).not.toMatchObject({
      holes: [
        expect.objectContaining({
          weaponDamageDiceRollChoiceProcedureRefs: [
            requireCharacterUnitProcedureRefForTest(
              weaponSession,
              spellCasterId,
              savageAttackerUnitId,
            ),
          ],
        }),
      ],
    });
  });

  test("savage attacker is unavailable after one use in the same turn", () => {
    const baseSession = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const base = baseSession.state;
    const state: BattleState = {
      ...base,
      currentTurnResources: {
        ...base.currentTurnResources,
        weaponDamageDiceRollChoicesUsedThisTurn: [
          {
            attackerId: spellCasterId,
            procedureRef: requireCharacterUnitProcedureRefForTest(
              baseSession,
              spellCasterId,
              savageAttackerUnitId,
            ),
          },
        ],
      },
    };
    const subject = weaponAttackSubject(
      battleRuntimeSessionForTest({ state, context: baseSession.context }),
      "Longsword",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).not.toHaveProperty(
      "weaponDamageDiceRollChoiceProcedureRefs",
    );
  });
});

describe("QMBT21 Classic non-SRD deterministic feature profile slice", () => {
  test("mycelium_step is admitted and projected through production alternate action cost support", () => {
    const unit = mechanicsOnlyMyceliumStepUnit(myceliumStepInput);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unit,
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ["dash"],
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });
});
