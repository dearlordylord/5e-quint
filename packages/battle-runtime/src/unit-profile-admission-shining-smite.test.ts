import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-SHINING-SMITE shining_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage-illumination
import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import {
  BattleInterruptProcedureChoiceSchema,
  BattleSnapshotSchema,
} from "./index.ts";
import {
  characterSpellInvocationRefForProcedureRefForTest,
  battleFrontierInterruptDecisionForState,
  testCharacterD20Statistics,
} from "./battle-runtime.test-support.ts";
import { characterAttackSubjectForTest } from "./battle-runtime.test-support.ts";
import {
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./battle-reducer/spells-active-effects.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type { BattleSubject } from "./unit-profile-admission.test-support.ts";

const paladinFiveSpellcastingFacts = {
  casterClassLevels: [{ className: "paladin", level: 5 }],
  casterD20Statistics: testCharacterD20Statistics({ cha: 16 }),
  casterProficiencyBonus: proficiencyBonus(3),
  spellSlots: [
    { spellLevel: 1, count: 4 },
    { spellLevel: 2, count: 2 },
  ],
} as const satisfies Pick<
  Parameters<typeof spellBattle>[0],
  | "casterClassLevels"
  | "casterD20Statistics"
  | "casterProficiencyBonus"
  | "spellSlots"
>;
const paladinNineSpellcastingFacts = {
  casterClassLevels: [{ className: "paladin", level: 9 }],
  casterD20Statistics: testCharacterD20Statistics({ cha: 16 }),
  casterProficiencyBonus: proficiencyBonus(4),
  spellSlots: [
    { spellLevel: 1, count: 4 },
    { spellLevel: 2, count: 3 },
    { spellLevel: 3, count: 2 },
  ],
} as const satisfies Pick<
  Parameters<typeof spellBattle>[0],
  | "casterClassLevels"
  | "casterD20Statistics"
  | "casterProficiencyBonus"
  | "spellSlots"
>;
const shiningSmiteUpcastSlotLevel: (typeof paladinNineSpellcastingFacts.spellSlots)[number]["spellLevel"] = 3;

describe("L12G-SPELL-SHINING-SMITE deterministic Shining Smite admission", () => {
  test("shining_smite adds Radiant damage, illuminates its target, and routes public Concentration teardown to the effect owners", () => {
    const spell = spellRecord(shiningSmiteUnitId);
    const session = spellBattle({
      ...paladinNineSpellcastingFacts,
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
    const subject = weaponAttackSubject(session, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
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
    const choice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find((candidate) => {
      if (candidate.kind !== "castAttackHitBonusActionSpell") return false;
      const invocationRef = characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...session,
          state: awaitingReaction.state,
        }),
        candidate.reactorId,
        candidate.subject.procedureRef,
      );
      return (
        invocationRef.spellId === shiningSmiteUnitId &&
        invocationRef.tag === "spellSlot" &&
        Number(invocationRef.slotLevel) === shiningSmiteUpcastSlotLevel
      );
    });
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Shining Smite after-hit choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...session,
          state: awaitingReaction.state,
        }),
        choice.reactorId,
        choice.subject.procedureRef,
      ),
    ).toEqual(
      spellSlotInvocationRef(
        shiningSmiteUnitId,
        shiningSmiteUpcastSlotLevel,
        "afterHitDamageAndIllumination",
      ),
    );

    const afterShining = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
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
            sourceProcedureRef: choice.subject.procedureRef,
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
      sourceProcedureRef: choice.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(afterWeaponDamage.state, spellTargetId).activeEffects,
    ).toContainEqual({
      kind: "shiningSmiteIllumination",
      sourceProcedureRef: choice.subject.procedureRef,
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
        sourceProcedureRef: choice.subject.procedureRef,
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
    const unarmedSubject: BattleSubject = characterAttackSubjectForTest(
      afterTargetTurn.state,
      spellCasterId,
      "Unarmed Strike",
    );
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
        fills: [attackTargetFill(unarmedTarget, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(unarmedAttackRoll).toMatchObject({ rollMode: "advantage" });

    const unseenUnarmedAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(unarmedTarget, spellCasterId, spellTargetId, [
            {
              kind: "attackAttackerCannotSeeTarget",
              attackerId: spellCasterId,
              targetId: spellTargetId,
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    expect(unseenUnarmedAttackRoll).toHaveProperty("rollMode", "normal");

    const endConcentrationAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...session,
        state: afterWeaponDamage.state,
      }),
    ).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "endConcentration",
    );
    if (
      endConcentrationAct?.subject.tag !== "runtimeCommand" ||
      endConcentrationAct.subject.command !== "endConcentration"
    ) {
      throw new Error("Expected public Shining Smite End Concentration act.");
    }
    expect(endConcentrationAct.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "afterHitSpell",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "discoverBattleActs",
        subject: "afterHitSpell",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    const concentrationBroken = resolveBattleSubject({
      state: afterWeaponDamage.state,
      subject: endConcentrationAct.subject,
      fills: [],
    });
    if (concentrationBroken.tag !== "resolved") {
      throw new Error("Expected Shining Smite Concentration to end.");
    }
    expect(concentrationBroken.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "afterHitSpell",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "afterHitSpell",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    expect(
      requireCombatant(concentrationBroken.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "shiningSmiteIllumination" }),
      ]),
    );
    expect(snapshotBattle(concentrationBroken.state).lightEmitters).toEqual([]);
  });

  test("shining_smite is admitted after an Unarmed Strike hit but not after a ranged weapon hit", () => {
    const spell = spellRecord(shiningSmiteUnitId);
    const unarmedSession = spellBattle({
      ...paladinFiveSpellcastingFacts,
      preparedSpells: [spell],
      attack: null,
    });
    const unarmedSubject: BattleSubject = characterAttackSubjectForTest(
      unarmedSession.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedSession.state,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedTargetFill = attackTargetFill(
      unarmedTarget,
      spellCasterId,
      spellTargetId,
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedSession.state,
        subject: unarmedSubject,
        fills: [unarmedTargetFill],
      }),
      "attackRoll",
    );
    const unarmedHit = resolveBattleSubject({
      state: unarmedSession.state,
      subject: unarmedSubject,
      fills: [
        unarmedTargetFill,
        attackRollFill(unarmedRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (unarmedHit.tag !== "needsHoles") {
      throw new Error("Expected Shining Smite Unarmed Strike window.");
    }
    const unarmedChoice = battleFrontierInterruptDecisionForState(
      unarmedHit.state,
    )?.choices.find(
      (candidate) => candidate.kind === "castAttackHitBonusActionSpell",
    );
    if (unarmedChoice?.kind !== "castAttackHitBonusActionSpell") {
      throw new Error("Expected Shining Smite after-hit choice.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)(
        unarmedChoice,
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(
        Schema.encodeSync(BattleSnapshotSchema)(unarmedHit.snapshot),
      ),
    ).not.toThrow();
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...unarmedSession,
          state: unarmedHit.state,
        }),
        unarmedChoice.reactorId,
        unarmedChoice.subject.procedureRef,
      ),
    ).toEqual(
      spellSlotInvocationRef(
        shiningSmiteUnitId,
        2,
        "afterHitDamageAndIllumination",
      ),
    );

    const rangedSession = spellBattle({
      ...paladinFiveSpellcastingFacts,
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const rangedSubject = weaponAttackSubject(rangedSession, "Shortbow");
    const rangedTarget = requireResultHole(
      resolveBattleSubject({
        state: rangedSession.state,
        subject: rangedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const rangedTargetFill = attackTargetFill(
      rangedTarget,
      spellCasterId,
      spellTargetId,
    );
    const rangedRoll = requireResultHole(
      resolveBattleSubject({
        state: rangedSession.state,
        subject: rangedSubject,
        fills: [rangedTargetFill],
      }),
      "attackRoll",
    );
    const rangedHit = resolveBattleSubject({
      state: rangedSession.state,
      subject: rangedSubject,
      fills: [
        rangedTargetFill,
        attackRollFill(rangedRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    expect(rangedHit).toMatchObject({
      tag: "needsHoles",
    });
  });
});
