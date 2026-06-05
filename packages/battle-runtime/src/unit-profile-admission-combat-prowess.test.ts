// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT56 feat_boon_of_combat_prowess
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-roll-miss-to-hit-replacement
import { describe, expect, test } from "vitest";
import {
  boonOfCombatProwessUnitId,
  combatProwessSupportProfile,
  rayOfFrostUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
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
} from "./unit-profile-admission-creature-fixture-support.ts";
import { combatProwessBattle } from "./unit-profile-admission-feature-fixture-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  Either,
  parseSupportedUnitFeatureProfile,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleSubject,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT56 deterministic Combat Prowess profile slice", () => {
  test("boon of combat prowess is admitted as an attack-roll miss-to-hit replacement", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: boonOfCombatProwessUnitId,
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

  test("peerless aim can replace a missed weapon attack with the ordinary hit damage path", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
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

    expect(roll).toMatchObject({
      missToHitReplacements: [
        { unitId: boonOfCombatProwessUnitId, label: boonOfCombatProwessUnitId },
      ],
    });

    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);
  });

  test("peerless aim survives attack-hit reaction replay before damage", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetPreparedSpells: [spellRecord(shieldUnitId)],
    });
    const subject = weaponAttackSubject("Longsword");
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
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim hit to open Shield reaction.");
    }
    const shieldChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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
            invocation: shieldChoice.invocation,
            fills: [],
          },
        },
      ),
    });
    expect(afterShield).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingInterrupt: null },
    });
    if (afterShield.tag !== "needsHoles") {
      throw new Error("Expected replayed Peerless Aim attack to need damage.");
    }
    const damage = requireHole(afterShield.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterShield.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);
  });

  test("pending peerless aim replay cannot authorize a different attack roll", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      cantrips: [spell],
    });
    const subject = weaponAttackSubject("Longsword");
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
    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim weapon attack to need damage.");
    }

    const act = spellAct({
      state: awaitingDamage.state,
      spellId: rayOfFrostUnitId,
    });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: awaitingDamage.state,
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
    expect(spellRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state: awaitingDamage.state,
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
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("declining peerless aim leaves the miss unresolved as a miss", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
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

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 1, naturalD20: 2 }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("peerless aim applies to Unarmed Strike and spell attack misses", () => {
    const unarmedState = combatProwessBattle({ attack: null });
    const unarmedSubject: Extract<BattleSubject, { readonly tag: "action" }> = {
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
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [attackTargetFill(unarmedTarget, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(unarmedTarget, spellCasterId, spellTargetId),
          attackRollFill(unarmedRoll, {
            total: 1,
            naturalD20: 1,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    const spell = spellRecord(rayOfFrostUnitId);
    const spellState = combatProwessBattle({
      attack: null,
      cantrips: [spell],
    });
    const act = spellAct({ state: spellState, spellId: rayOfFrostUnitId });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: spellState,
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
      state: spellState,
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
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
    const subject = weaponAttackSubject("Longsword");
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
          attackRollFill(roll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
      "rolledDice",
    );
    const used = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
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
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);

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
        state: reset.state,
        attackName: "Longsword",
        actorId: spellCasterId,
        targetId: spellTargetId,
      }),
    ).toMatchObject({
      missToHitReplacements: [
        { unitId: boonOfCombatProwessUnitId, label: boonOfCombatProwessUnitId },
      ],
    });
  });

  test("adjacent roll replacement shapes remain unsupported for the profile", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    expect(unit.kind).toBe("feat");
    if (unit.kind !== "feat") {
      throw new Error("Expected Boon of Combat Prowess feat Unit.");
    }
    const adjacentUnits = [
      {
        ...unit,
        id: "test_combat_prowess_required",
        mechanics: { ...unit.mechanics, optional: false },
      },
      {
        ...unit,
        id: "test_combat_prowess_long_rest",
        mechanics: { ...unit.mechanics, resetCadence: { kind: "long_rest" } },
      },
    ] as unknown as readonly UnitRecord[];

    for (const adjacentUnit of adjacentUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle attack-roll miss-to-hit replacement Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});
