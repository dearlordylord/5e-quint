import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT56 feat_boon_of_combat_prowess
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-roll-miss-to-hit-replacement
import { describe, expect, test } from "vitest";
import {
  characterAttackSubjectForTest,
  battleFrontierInterruptDecisionForState,
  requireCharacterUnitProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  boonOfCombatProwessUnitId,
  combatProwessSupportProfile,
  rayOfFrostUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
  weaponAttackRollHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { combatProwessBattle } from "./unit-profile-admission-feature-fixture.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  Either,
  parseSupportedUnitFeatureProfile,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import { battleAttackRollMissToHitReplacementSupportForUnit } from "./unit-feature-support.ts";

function combatProwessProcedureRef(
  state: Parameters<typeof requireCharacterUnitProcedureRefForTest>[0],
) {
  return requireCharacterUnitProcedureRefForTest(
    state,
    spellCasterId,
    boonOfCombatProwessUnitId,
  );
}

describe("QMBT56 deterministic Combat Prowess profile slice", () => {
  test("boon of combat prowess is admitted as an attack-roll miss-to-hit replacement", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unit: unitLibrary.requireUnit(boonOfCombatProwessUnitId),
        supportProfiles: [combatProwessSupportProfile],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackRollMissToHitReplacement",
        unit,
        replacement: combatProwessSupportProfile.replacement,
      }),
    );
  });

  test("combat prowess support rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    if (
      unit.kind !== "feat" ||
      unit.mechanics.family !== "triggered_replacement"
    ) {
      throw new Error("Expected Combat Prowess mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_combat_prowess_required",
      mechanics: { ...unit.mechanics, optional: false },
    });

    expect(battleAttackRollMissToHitReplacementSupportForUnit(nearMiss)).toBe(
      "unsupported",
    );
  });

  test("peerless aim can replace a missed weapon attack with the ordinary hit damage path", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({
      missToHitReplacements: [
        { procedureRef: combatProwessProcedureRef(state) },
      ],
    });

    const awaitingDamage = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
      ],
    });
    const damage = requireResultHole(awaitingDamage, "rolledDice");
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim weapon attack to need damage.");
    }
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Peerless Aim weapon attack to resolve.");
    }
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.procedureRef,
        ),
    ).toEqual([
      requireCharacterUnitProcedureRefForTest(
        state,
        spellCasterId,
        boonOfCombatProwessUnitId,
      ),
    ]);
  });

  test("peerless aim survives attack-hit reaction replay before damage", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetPreparedSpells: [spellRecord(shieldUnitId)],
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim hit to open Shield reaction.");
    }
    const shieldChoice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find(
      (choice) =>
        choice.kind === "castTriggeredReactionSpell" &&
        choice.reactorId === spellTargetId,
    );
    if (
      shieldChoice === undefined ||
      shieldChoice.kind !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Shield reaction choice.");
    }
    const afterShield = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellTargetId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: shieldChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    expect(afterShield).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
    if (afterShield.tag !== "needsHoles") {
      throw new Error("Expected replayed Peerless Aim attack to need damage.");
    }
    const damage = requireHole(afterShield.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterShield.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Peerless Aim weapon attack to resolve.");
    }
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.procedureRef,
        ),
    ).toEqual([
      requireCharacterUnitProcedureRefForTest(
        state,
        spellCasterId,
        boonOfCombatProwessUnitId,
      ),
    ]);
  });

  test("pending peerless aim replay cannot authorize a different attack roll", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      cantrips: [spell],
    });
    const spellActBeforeAttack = spellAct({
      session: state,
      spellId: rayOfFrostUnitId,
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    const awaitingDamage = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
      ],
    });
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim weapon attack to need damage.");
    }

    expect(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: spellActBeforeAttack.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("declining peerless aim leaves the miss unresolved as a miss", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );

    expect(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId),
          attackRollFill(roll, { total: 1, naturalD20: 2 }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("peerless aim applies to Unarmed Strike and spell attack misses", () => {
    const unarmedState = combatProwessBattle({ attack: null });
    const unarmedSubject = characterAttackSubjectForTest(
      unarmedState.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedState.state,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState.state,
        subject: unarmedSubject,
        fills: [attackTargetFill(unarmedTarget, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: unarmedState.state,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(unarmedTarget, spellCasterId, spellTargetId),
          attackRollFill(unarmedRoll, {
            total: 1,
            naturalD20: 1,
            missToHitReplacementProcedureRef:
              combatProwessProcedureRef(unarmedState),
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    const spell = spellRecord(rayOfFrostUnitId);
    const spellState = combatProwessBattle({
      attack: null,
      cantrips: [spell],
    });
    const act = spellAct({ session: spellState, spellId: rayOfFrostUnitId });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: spellState.state,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: spellState.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    const spellDamage = resolveBattleSubject({
      state: spellState.state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          spellTarget,
          rayOfFrostUnitId,
          spellCasterId,
          spellTargetId,
        ),
        attackRollFill(spellRoll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef:
            combatProwessProcedureRef(spellState),
        }),
      ],
    });
    expect(spellDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    if (spellDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim spell attack to need damage.");
    }
    expect(
      resolveBattleSubject({
        state: spellDamage.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(spellRoll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementProcedureRef: combatProwessProcedureRef(
              battleRuntimeSessionForTest({
                state: spellDamage.state,
                context: spellState.context,
              }),
            ),
          }),
          damageRollFillWithGroups(
            requireHole(spellDamage.holes, "rolledDice"),
            [[4]],
          ),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("peerless aim cannot be reused before start of turn and resets at start of next turn", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId),
          attackRollFill(roll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
          }),
        ],
      }),
      "rolledDice",
    );
    const used = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementProcedureRef: combatProwessProcedureRef(state),
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    expect(used).toMatchObject({ tag: "resolved" });
    if (used.tag !== "resolved") {
      throw new Error("Expected first Peerless Aim attack to resolve.");
    }

    expect(
      used.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.procedureRef,
        ),
    ).toEqual([
      requireCharacterUnitProcedureRefForTest(
        battleRuntimeSessionForTest({
          state: used.state,
          context: state.context,
        }),
        spellCasterId,
        boonOfCombatProwessUnitId,
      ),
    ]);

    const afterTargetTurn = resolveBattleSubject({
      state: used.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(afterTargetTurn).toMatchObject({ tag: "resolved" });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected end turn to resolve.");
    }
    const reset = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(reset).toMatchObject({ tag: "resolved" });
    if (reset.tag !== "resolved") {
      throw new Error("Expected second end turn to resolve.");
    }

    expect(
      reset.state.combatants.get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart,
    ).toEqual([]);
    expect(
      weaponAttackRollHole({
        session: battleRuntimeSessionForTest({
          state: reset.state,
          context: state.context,
        }),
        attackName: "Longsword",
        actorId: spellCasterId,
        targetId: spellTargetId,
      }),
    ).toMatchObject({
      missToHitReplacements: [
        {
          procedureRef: combatProwessProcedureRef(
            battleRuntimeSessionForTest({
              state: reset.state,
              context: state.context,
            }),
          ),
        },
      ],
    });
  });
});
