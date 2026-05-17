// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30A false_life longstrider shield_of_faith
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30D heroism
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.scalar-buff spell.invocation-condition-immunity-turn-start-temporary-hit-points
import { describe, expect, test } from "vitest";
import {
  falseLifeUnitId,
  heroismUnitId,
  longstriderUnitId,
  shieldOfFaithUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  combatantId,
  DieRollResult,
  elapsedTimeTicks,
  endTurn,
  holeId,
  movementDeltaFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

describe("SRDINV30A deterministic scalar buff Spell Unit admission", () => {
  test("false_life is admitted as self Temporary Hit Points with slot scaling", () => {
    const spell = spellRecord(falseLifeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: falseLifeUnitId, slotLevel: 2 });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(falseLifeUnitId, 2, "scalarBuff"),
      mode: { tag: "cast" },
    });
    const tempHpHole = requireHole(act.initialHoles, "rolledDice");
    expect(spellHoleInvocation([tempHpHole])).toEqual(
      expect.objectContaining({
        procedure: "scalarBuff",
        effect: {
          kind: "temporaryHitPoints",
          amount: { expr: { dice: 2, dieSize: 4, flat: 9 } },
        },
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageRollFillWithGroups(tempHpHole, [[4, 3]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 16,
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("longstrider is admitted as timed Speed increase with slot-scaled targets", () => {
    const spell = spellRecord(longstriderUnitId);
    const secondTargetId = combatantId("unit-profile-longstrider-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({ state, spellId: longstriderUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, longstriderUnitId, [
          spellTargetId,
          secondTargetId,
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ speedFeet: 40 }),
          }),
          expect.objectContaining({
            combatantId: secondTargetId,
            movement: expect.objectContaining({ speedFeet: 40 }),
          }),
        ],
      },
    });

    if (resolved.tag !== "resolved") {
      throw new Error("Expected Longstrider to resolve.");
    }
    const target = resolved.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Longstrider target.");
    }
    const expiringTarget = {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "speedDelta" &&
        effect.sourceSpellId === longstriderUnitId
          ? {
              ...effect,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    };
    const oneRoundRemaining = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellTargetId,
        expiringTarget,
      ),
    };
    const targetTurn = resolveBattleSubject({
      state: oneRoundRemaining,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Longstrider caster end turn to resolve.");
    }
    const secondTargetTurn = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (secondTargetTurn.tag !== "resolved") {
      throw new Error("Expected Longstrider target end turn to resolve.");
    }
    const nextRound = resolveBattleSubject({
      state: secondTargetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: secondTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(nextRound).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ speedFeet: 30 }),
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("longstrider rejects unrelated attack-roll fills", () => {
    const spell = spellRecord(longstriderUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: longstriderUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, longstriderUnitId, [
          spellTargetId,
        ]),
        {
          kind: "attackRoll",
          holeId: holeId("battle:attack:roll"),
          value: {
            total: 20,
            naturalD20: DieRollResult(15),
          },
        },
      ],
    });

    expect(resolved).toEqual({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Scalar buff spells use target fills and optional scalar dice roll.",
      snapshot: snapshotBattle(state),
    });
  });

  test("longstrider does not stack with an overlapping casting of the same spell", () => {
    const spell = spellRecord(longstriderUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
    });
    const target = state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Longstrider target.");
    }
    const priorCasterId = combatantId("unit-profile-prior-longstrider-caster");
    const stateWithPriorCasting: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "speedDelta",
            sourceSpellId: longstriderUnitId,
            sourceCombatantId: priorCasterId,
            deltaFeet: movementDeltaFeet(10),
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      }),
    };
    const act = spellAct({
      state: stateWithPriorCasting,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state: stateWithPriorCasting,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          longstriderUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ speedFeet: 40 }),
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Longstrider to resolve.");
    }
    const speedEffects =
      resolved.state.combatants
        .get(spellTargetId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "speedDelta" &&
            effect.sourceSpellId === longstriderUnitId,
        ) ?? [];
    expect(speedEffects).toEqual([
      expect.objectContaining({ sourceCombatantId: spellCasterId }),
    ]);
  });

  test("shield_of_faith is admitted as a Bonus Action concentration AC bonus", () => {
    const spell = spellRecord(shieldOfFaithUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusSpellAct({ state, spellId: shieldOfFaithUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(shieldOfFaithUnitId, 1, "scalarBuff"),
      mode: { tag: "cast" },
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          shieldOfFaithUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
          }),
          expect.objectContaining({
            combatantId: spellTargetId,
            armorClass: 12,
          }),
        ],
      },
    });
  });
});

describe("SRDINV30D deterministic Heroism Spell Unit admission", () => {
  test("heroism stores Frightened immunity separately from turn-start Temporary Hit Points", () => {
    const spell = spellRecord(heroismUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: heroismUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        heroismUnitId,
        1,
        "conditionImmunityAndTurnStartTemporaryHitPoints",
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toEqual([spellCasterId]);

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          heroismUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(unwillingTarget).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          heroismUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heroism to resolve.");
    }
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "conditionImmunity",
          sourceSpellId: heroismUnitId,
          sourceCombatantId: spellCasterId,
          condition: "frightened",
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
        expect.objectContaining({
          kind: "turnStartTemporaryHitPoints",
          sourceSpellId: heroismUnitId,
          sourceCombatantId: spellCasterId,
          amount: 3,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
      ],
    );
  });

  test("heroism grants spellcasting-modifier Temporary Hit Points when the target starts its turn", () => {
    const spell = spellRecord(heroismUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: heroismUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          heroismUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heroism to resolve.");
    }

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target opponent turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });

    expect(casterTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 3,
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("heroism makes an already Frightened willing target unaffected by Frightened", () => {
    const spell = spellRecord(heroismUnitId);
    const baseState = spellBattle({ preparedSpells: [spell] });
    const target = baseState.combatants.get(spellCasterId);
    expect(target).not.toBeUndefined();
    if (target === undefined) {
      throw new Error("Expected Heroism target to exist.");
    }
    expect(target.positiveHpUnconscious).toBeNull();
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected Heroism target to be conscious.");
    }
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellCasterId, {
        ...target,
        conditions: applyCondition(target.conditions, "frightened"),
      }),
    };
    const act = spellAct({ state, spellId: heroismUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          heroismUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            conditions: expect.not.arrayContaining(["frightened"]),
          }),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Heroism to resolve.");
    }
    expect(resolved.state.combatants.get(spellCasterId)?.conditions).toEqual(
      expect.objectContaining({ frightened: false }),
    );
  });

  test("heroism scales target count by slot level while limiting choices to known-willing targets", () => {
    const spell = spellRecord(heroismUnitId);
    const secondTargetId = combatantId("unit-profile-heroism-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({ state, spellId: heroismUnitId, slotLevel: 2 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 2 }),
    );
    expect(targetHole.choices).toEqual([spellCasterId]);
    const unwillingTargets = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetHole, spellCasterId, heroismUnitId, [
          spellCasterId,
          secondTargetId,
        ]),
      ],
    });
    expect(unwillingTargets).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetHole, spellCasterId, heroismUnitId, [
          spellCasterId,
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });
});
