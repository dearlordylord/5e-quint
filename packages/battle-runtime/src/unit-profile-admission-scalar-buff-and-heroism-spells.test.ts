// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30A false_life longstrider shield_of_faith
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30D heroism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-AID aid
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BARKSKIN barkskin
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-SPIDER-CLIMB spider_climb
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.scalar-buff spell.invocation-condition-immunity-turn-start-temporary-hit-points
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { describe, expect, test } from "vitest";
import {
  aidUnitId,
  barkskinUnitId,
  falseLifeUnitId,
  heroismUnitId,
  longstriderUnitId,
  shieldOfFaithUnitId,
  spellCasterId,
  spellTargetId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  knownWillingSpellTargetListFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  breakBattleConcentration,
  combatantId,
  DieRollResult,
  Hp,
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

  test("barkskin is admitted as a Bonus Action timed willing-target Armor Class floor", () => {
    const spell = spellRecord(barkskinUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({ state, spellId: barkskinUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(barkskinUnitId, 2, "scalarBuff"),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toEqual([spellCasterId]);

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          barkskinUnitId,
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
        knownWillingSpellTargetFill(
          targetHole,
          barkskinUnitId,
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
            concentrating: false,
          }),
          expect.objectContaining({
            combatantId: spellTargetId,
            armorClass: 17,
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Barkskin to resolve.");
    }

    const target = resolved.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Barkskin target.");
    }
    expect(
      target.activeEffects.filter(
        (effect) =>
          effect.kind === "spellArmorClassFloor" &&
          effect.sourceSpellId === barkskinUnitId,
      ),
    ).toEqual([
      expect.objectContaining({
        sourceCombatantId: spellCasterId,
        floor: 17,
        expiresAt: expect.objectContaining({ kind: "duration" }),
      }),
    ]);
    const nearlyExpiredTarget = {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "spellArmorClassFloor" &&
        effect.sourceSpellId === barkskinUnitId
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
    const oneRoundRemaining: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellTargetId,
        nearlyExpiredTarget,
      ),
    };
    const targetTurn = endTurn({
      state: oneRoundRemaining,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Barkskin caster end turn to resolve.");
    }
    const nextRound = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });

    expect(nextRound).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            armorClass: 10,
          }),
        ],
      },
    });
  });

  test("barkskin does not lower a target whose Armor Class is already 17 or higher", () => {
    const spell = spellRecord(barkskinUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetArmorClass: {
        ...defaultArmorClassState(),
        base: {
          kind: "armor",
          category: "heavy",
          formula: { kind: "heavy_fixed", ac: 18 },
        },
        armorTraining: new Set(["heavy" as const]),
      },
    });
    const act = bonusSpellAct({ state, spellId: barkskinUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          barkskinUnitId,
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
            armorClass: 18,
          }),
        ],
      },
    });
  });

  test("spider_climb is admitted as a concentration Climb Speed grant with slot-scaled willing targets", () => {
    const spell = spellRecord(spiderClimbUnitId);
    const secondTargetId = combatantId("unit-profile-spider-climb-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });
    const levelTwoAct = spellAct({
      state,
      spellId: spiderClimbUnitId,
      slotLevel: 2,
    });
    const levelTwoTargetHole = requireHole(
      levelTwoAct.initialHoles,
      "targetChoice",
    );
    const levelThreeAct = spellAct({
      state,
      spellId: spiderClimbUnitId,
      slotLevel: 3,
    });
    const targetListHole = requireHole(
      levelThreeAct.initialHoles,
      "spellTargetList",
    );

    expect(levelTwoAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(spiderClimbUnitId, 2, "scalarBuff"),
      mode: { tag: "cast" },
    });
    expect(levelTwoTargetHole.choices).toEqual([spellCasterId]);
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
        choices: [spellCasterId],
      }),
    );

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: levelThreeAct.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, spiderClimbUnitId, [
          secondTargetId,
        ]),
      ],
    });
    expect(unwillingTarget).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: levelThreeAct.subject,
      fills: [
        knownWillingSpellTargetListFill(
          targetListHole,
          spellCasterId,
          spiderClimbUnitId,
          [spellCasterId, secondTargetId],
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
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "climb",
                  speedFeet: 30,
                  remainingFeet: 30,
                }),
              ]),
            }),
          }),
          expect.anything(),
          expect.objectContaining({
            combatantId: secondTargetId,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "climb",
                  speedFeet: 30,
                  remainingFeet: 30,
                }),
              ]),
            }),
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spider Climb to resolve.");
    }
    const expectedEffect = expect.objectContaining({
      kind: "specialSpeedGrant",
      sourceSpellId: spiderClimbUnitId,
      sourceCombatantId: spellCasterId,
      speedKind: "climb",
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(600),
      },
    });
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(expectedEffect);
    expect(
      resolved.state.combatants.get(secondTargetId)?.activeEffects,
    ).toContainEqual(expectedEffect);
  });

  test("spider_climb concentration cleanup removes the granted Climb Speed", () => {
    const spell = spellRecord(spiderClimbUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spiderClimbUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          spiderClimbUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spider Climb to resolve.");
    }
    const broken = breakBattleConcentration(resolved.state, spellCasterId);

    expect(broken.combatants.get(spellCasterId)?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "specialSpeedGrant",
          sourceSpellId: spiderClimbUnitId,
        }),
      ]),
    );
    const brokenCaster = snapshotBattle(broken).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(brokenCaster?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "climb",
        }),
      ]),
    );
  });

  test("aid is admitted as timed maximum and current Hit Point increases for up to three targets", () => {
    const spell = spellRecord(aidUnitId);
    const secondTargetId = combatantId("unit-profile-aid-target-2");
    const thirdTargetId = combatantId("unit-profile-aid-target-3");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
      extraTargetIds: [secondTargetId, thirdTargetId],
    });
    const act = spellAct({ state, spellId: aidUnitId, slotLevel: 3 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(aidUnitId, 3, "scalarBuff"),
      mode: { tag: "cast" },
    });
    expect(targetListHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 3 }),
    );
    expect(spellHoleInvocation([targetListHole])).toEqual(
      expect.objectContaining({
        procedure: "scalarBuff",
        effect: {
          kind: "hitPointMaximumIncrease",
          activeEffect: expect.objectContaining({
            kind: "hitPointMaximumIncrease",
            sourceSpellId: aidUnitId,
            amount: 10,
            expiresAt: expect.objectContaining({ kind: "duration" }),
          }),
        },
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, aidUnitId, [
          spellTargetId,
          secondTargetId,
          thirdTargetId,
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
            hp: 17,
            maxHp: 22,
            tempHp: 0,
          }),
          expect.objectContaining({
            combatantId: secondTargetId,
            hp: 22,
            maxHp: 22,
            tempHp: 0,
          }),
          expect.objectContaining({
            combatantId: thirdTargetId,
            hp: 22,
            maxHp: 22,
            tempHp: 0,
          }),
        ],
      },
    });
  });

  test("aid expiration removes the maximum Hit Point bonus and subtracts the current Hit Point increase", () => {
    const spell = spellRecord(aidUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
    });
    const act = spellAct({ state, spellId: aidUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, aidUnitId, [
          spellTargetId,
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Aid to resolve.");
    }
    const target = resolved.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Aid target.");
    }
    const nearlyExpiredTarget = {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "hitPointMaximumIncrease" &&
        effect.sourceSpellId === aidUnitId
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
        nearlyExpiredTarget,
      ),
    };
    const targetTurn = endTurn({
      state: oneRoundRemaining,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Aid caster end turn to resolve.");
    }
    const nextRound = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });

    expect(nextRound).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 7,
            maxHp: 12,
            tempHp: 0,
          }),
        ],
      },
    });
    if (nextRound.tag !== "resolved") {
      throw new Error("Expected Aid duration expiration to resolve.");
    }
    const expiredTarget = nextRound.state.combatants.get(spellTargetId);
    expect(
      expiredTarget?.activeEffects.some(
        (effect) =>
          effect.kind === "hitPointMaximumIncrease" &&
          effect.sourceSpellId === aidUnitId,
      ),
    ).toBe(false);
  });

  test("aid lower-slot recast waits under a stronger overlapping maximum Hit Point increase", () => {
    const spell = spellRecord(aidUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
    });
    const target = state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Aid target.");
    }
    const priorCasterId = combatantId("unit-profile-prior-aid-caster");
    const stateWithStrongerAid: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(17),
        positiveHpUnconscious: null,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "hitPointMaximumIncrease",
            sourceSpellId: aidUnitId,
            sourceCombatantId: priorCasterId,
            amount: 10,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };
    const act = spellAct({
      state: stateWithStrongerAid,
      spellId: aidUnitId,
      slotLevel: 2,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    const resolved = resolveBattleSubject({
      state: stateWithStrongerAid,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, aidUnitId, [
          spellTargetId,
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
            hp: 17,
            maxHp: 22,
            tempHp: 0,
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Aid lower-slot recast to resolve.");
    }
    const aidEffects =
      resolved.state.combatants
        .get(spellTargetId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "hitPointMaximumIncrease" &&
            effect.sourceSpellId === aidUnitId,
        ) ?? [];
    expect(aidEffects).toEqual([
      expect.objectContaining({ amount: 10, sourceCombatantId: priorCasterId }),
      expect.objectContaining({ amount: 5, sourceCombatantId: spellCasterId }),
    ]);

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Aid caster end turn to resolve.");
    }
    const afterStrongerAidExpires = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(afterStrongerAidExpires).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 12,
            maxHp: 17,
            tempHp: 0,
          }),
        ],
      },
    });
    if (afterStrongerAidExpires.tag !== "resolved") {
      throw new Error("Expected stronger Aid duration expiration to resolve.");
    }
    const remainingAidEffects =
      afterStrongerAidExpires.state.combatants
        .get(spellTargetId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "hitPointMaximumIncrease" &&
            effect.sourceSpellId === aidUnitId,
        ) ?? [];
    expect(remainingAidEffects).toEqual([
      expect.objectContaining({ amount: 5, sourceCombatantId: spellCasterId }),
    ]);
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
