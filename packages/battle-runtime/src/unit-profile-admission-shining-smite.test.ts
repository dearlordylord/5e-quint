// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-SHINING-SMITE shining_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage-illumination
import { describe, expect, test } from "vitest";
import {
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  reactionDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./battle-reducer/spells-active-effects.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  breakBattleConcentration,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { BattleSubject } from "./unit-profile-admission-test-support.ts";

describe("L12G-SPELL-SHINING-SMITE deterministic Shining Smite admission", () => {
  test("shining_smite adds Radiant damage after a melee hit and illuminates the target until Concentration ends", () => {
    const spell = spellRecord(shiningSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Shining Smite attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === shiningSmiteUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Shining Smite after-hit choice.");
    }
    expect(choice.invocation).toEqual(
      spellSlotInvocationRef(
        shiningSmiteUnitId,
        3,
        "afterHitDamageAndIllumination",
      ),
    );

    const afterShining = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [],
          },
        },
      ),
    });
    if (afterShining.tag !== "needsHoles") {
      throw new Error(
        `Expected Shining Smite replay to need attack damage, got ${afterShining.tag}.`,
      );
    }
    const damage = requireHole(afterShining.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: shiningSmiteUnitId,
            damage: {
              expr: { dice: 3, dieSize: 6 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );
    const afterWeaponDamage = resolveBattleSubject({
      state: afterShining.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [1, 2, 3]]),
      ],
    });
    if (afterWeaponDamage.tag !== "resolved") {
      throw new Error("Expected Shining Smite host attack to resolve.");
    }

    expect(requireCombatant(afterWeaponDamage.state, spellTargetId).hp).toBe(
      Hp(20),
    );
    expect(
      requireCombatant(afterWeaponDamage.state, spellCasterId).concentration,
    ).toEqual({
      sourceSpellId: shiningSmiteUnitId,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(afterWeaponDamage.state, spellTargetId).activeEffects,
    ).toContainEqual({
      kind: "shiningSmiteIllumination",
      sourceSpellId: shiningSmiteUnitId,
      sourceCombatantId: spellCasterId,
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(10),
      },
    });
    expect(snapshotBattle(afterWeaponDamage.state).lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceSpellId: shiningSmiteUnitId,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellTargetId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET,
          dimAdditionalFeet: movementFeet(0),
        },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    ]);

    const illuminatedTarget = requireCombatant(
      afterWeaponDamage.state,
      spellTargetId,
    );
    const invisibleState = {
      ...afterWeaponDamage.state,
      combatants: new Map(afterWeaponDamage.state.combatants).set(
        spellTargetId,
        battleCreatureStateWithKnockOutPreservedConditions(
          illuminatedTarget,
          applyCondition(illuminatedTarget.conditions, "invisible"),
        ),
      ),
    };
    const afterCasterTurn = endTurn({
      state: invisibleState,
      actorId: spellCasterId,
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Shining Smite caster turn to end.");
    }
    const afterTargetTurn = endTurn({
      state: afterCasterTurn.state,
      actorId: spellTargetId,
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected Shining Smite target turn to end.");
    }
    const unarmedSubject: BattleSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
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
    expect(unarmedAttackRoll).toMatchObject({ rollMode: "advantage" });

    const unseenUnarmedAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(
            unarmedTarget,
            spellCasterId,
            spellTargetId,
            "Unarmed Strike",
            [
              {
                kind: "attackAttackerCannotSeeTarget",
                attackerId: spellCasterId,
                targetId: spellTargetId,
              },
            ],
          ),
        ],
      }),
      "attackRoll",
    );
    expect(unseenUnarmedAttackRoll).not.toHaveProperty("rollMode");

    const concentrationBroken = breakBattleConcentration(
      afterWeaponDamage.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "shiningSmiteIllumination" }),
      ]),
    );
    expect(snapshotBattle(concentrationBroken).lightEmitters).toEqual([]);
  });

  test("shining_smite is admitted after an Unarmed Strike hit but not after a ranged weapon hit", () => {
    const spell = spellRecord(shiningSmiteUnitId);
    const unarmedState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: null,
    });
    const unarmedSubject: BattleSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedTargetFill = attackTargetFill(
      unarmedTarget,
      spellCasterId,
      spellTargetId,
      "Unarmed Strike",
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [unarmedTargetFill],
      }),
      "attackRoll",
    );
    const unarmedHit = resolveBattleSubject({
      state: unarmedState,
      subject: unarmedSubject,
      fills: [
        unarmedTargetFill,
        attackRollFill(unarmedRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    expect(unarmedHit).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingReaction: {
          choices: expect.arrayContaining([
            expect.objectContaining({
              kind: "castAttackHitBonusActionSpell",
              invocation: spellSlotInvocationRef(
                shiningSmiteUnitId,
                2,
                "afterHitDamageAndIllumination",
              ),
            }),
          ]),
        },
      },
    });

    const rangedState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const rangedSubject = weaponAttackSubject("Shortbow");
    const rangedTarget = requireResultHole(
      resolveBattleSubject({
        state: rangedState,
        subject: rangedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const rangedTargetFill = attackTargetFill(
      rangedTarget,
      spellCasterId,
      spellTargetId,
      "Shortbow",
    );
    const rangedRoll = requireResultHole(
      resolveBattleSubject({
        state: rangedState,
        subject: rangedSubject,
        fills: [rangedTargetFill],
      }),
      "attackRoll",
    );
    const rangedHit = resolveBattleSubject({
      state: rangedState,
      subject: rangedSubject,
      fills: [
        rangedTargetFill,
        attackRollFill(rangedRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    expect(rangedHit).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: null },
    });
  });
});
