import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { unitId } from "@dnd/shared/game-facts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type { BattleProcedureExecutionRef } from "./index.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30A false_life longstrider shield_of_faith
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30D heroism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-AID aid
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BARKSKIN barkskin
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-SPIDER-CLIMB spider_climb
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-FLY-END-FALL-WITNESS fly
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.scalar-buff spell.invocation-condition-immunity-turn-start-temporary-hit-points
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { describe, expect, test } from "vitest";
import {
  requireCharacterSpellProcedureRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  aidUnitId,
  barkskinUnitId,
  falseLifeUnitId,
  flyUnitId,
  heroismUnitId,
  longstriderUnitId,
  shieldOfFaithUnitId,
  spellCasterId,
  spellTargetId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  maybeBonusSpellAct,
  knownWillingSpellTargetFill,
  knownWillingSpellTargetListFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  applyCondition,
  breakBattleConcentration,
  combatantId,
  DieRollResult,
  Hp,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  holeId,
  movementDeltaFeet,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveFeatherFallLanding,
  resolveFlySpeedGrantEndFallCleanup,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleFill,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleHole,
  BattleState,
  BattleTargetSpatialFact,
  CombatantId,
  EndedFlySpeedGrant,
} from "./unit-profile-admission.test-support.ts";

const featherFallUnitId = "feather_fall";

function withoutKnownWillingFacts<
  T extends Extract<
    BattleFill,
    { readonly kind: "targetChoice" | "spellTargetList" }
  >,
>(fill: T): T {
  return {
    ...fill,
    spatialFacts: fill.spatialFacts?.filter(
      (fact) => fact.kind !== "spellTargetKnownWilling",
    ),
  };
}

describe("SRDINV30A deterministic scalar buff Spell Unit admission", () => {
  test("false_life is admitted as self Temporary Hit Points with slot scaling", () => {
    const spell = spellRecord(falseLifeUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: falseLifeUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(falseLifeUnitId, 2, "scalarBuff"),
      ),
      mode: { tag: "cast" },
    });
    const tempHpHole = requireHole(act.initialHoles, "rolledDice");
    expect(spellHoleInvocation(session, [tempHpHole])).toEqual(
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: longstriderUnitId,
      slotLevel: 2,
    });
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
        effect.sourceCombatantId === spellCasterId
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: longstriderUnitId,
      slotLevel: 2,
    });
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

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Scalar buff spells use target fills and optional scalar dice roll.",
    });
  });

  test("longstrider does not stack with an overlapping casting of the same spell", () => {
    const spell = spellRecord(longstriderUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
    });
    const state = session.state;
    const target = state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Longstrider target.");
    }
    const act = spellAct({
      session,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const stateWithPriorCasting: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "speedDelta",
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: spellCasterId,
            deltaFeet: movementDeltaFeet(10),
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      }),
    };
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
            effect.sourceCombatantId === spellCasterId,
        ) ?? [];
    expect(speedEffects).toEqual([
      expect.objectContaining({ sourceCombatantId: spellCasterId }),
    ]);
  });

  test("shield_of_faith is admitted as a Bonus Action concentration AC bonus", () => {
    const spell = spellRecord(shieldOfFaithUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const state = session.state;
    const act = bonusSpellAct({ session, spellId: shieldOfFaithUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(shieldOfFaithUnitId, 1, "scalarBuff"),
      ),
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

  test("scalar buff admission rejects explicit non-creature target selections", () => {
    const spell = shieldOfFaithWithObjectTarget();
    const session = spellBattle({ preparedSpells: [spell] });
    expect(maybeBonusSpellAct({ session, spellId: spell.id })).toBeUndefined();
  });

  test("barkskin is admitted as a Bonus Action timed willing-target Armor Class floor", () => {
    const spell = spellRecord(barkskinUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({ session, spellId: barkskinUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(barkskinUnitId, 2, "scalarBuff"),
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toEqual([spellCasterId, spellTargetId]);

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        withoutKnownWillingFacts(
          spellTargetFill(
            targetHole,
            barkskinUnitId,
            spellCasterId,
            spellTargetId,
          ),
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
          effect.sourceProcedureRef === act.subject.procedureRef,
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
        effect.sourceProcedureRef === act.subject.procedureRef
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
    const session = spellBattle({
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
    const state = session.state;
    const act = bonusSpellAct({ session, spellId: barkskinUnitId });
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });
    const state = session.state;
    const levelTwoAct = spellAct({
      session,
      spellId: spiderClimbUnitId,
      slotLevel: 2,
    });
    const levelTwoTargetHole = requireHole(
      levelTwoAct.initialHoles,
      "targetChoice",
    );
    const levelThreeAct = spellAct({
      session,
      spellId: spiderClimbUnitId,
      slotLevel: 3,
    });
    const targetListHole = requireHole(
      levelThreeAct.initialHoles,
      "spellTargetList",
    );

    expect({
      ...levelTwoAct.subject,
      invocation: battleActSpellPresentation(levelTwoAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(spiderClimbUnitId, 2, "scalarBuff"),
      ),
      mode: { tag: "cast" },
    });
    expect(levelTwoTargetHole.choices).toEqual([
      spellCasterId,
      spellTargetId,
      secondTargetId,
    ]);
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
        choices: [spellCasterId, spellTargetId, secondTargetId],
      }),
    );

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: levelThreeAct.subject,
      fills: [
        withoutKnownWillingFacts(
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            spiderClimbUnitId,
            [secondTargetId],
          ),
        ),
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
      sourceProcedureRef: levelThreeAct.subject.procedureRef,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = spellAct({
      session,
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
          sourceProcedureRef: act.subject.procedureRef,
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

  test("fly is admitted as a fixed Fly Speed and hover grant with slot-scaled willing targets", () => {
    const spell = spellRecord(flyUnitId);
    const secondTargetId = combatantId("unit-profile-fly-target-2");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });
    const state = session.state;
    const levelThreeAct = spellAct({
      session,
      spellId: flyUnitId,
      slotLevel: 3,
    });
    const levelThreeTargetHole = requireHole(
      levelThreeAct.initialHoles,
      "targetChoice",
    );
    const levelFourAct = spellAct({
      session,
      spellId: flyUnitId,
      slotLevel: 4,
    });
    const targetListHole = requireHole(
      levelFourAct.initialHoles,
      "spellTargetList",
    );

    expect({
      ...levelThreeAct.subject,
      invocation: battleActSpellPresentation(levelThreeAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(flyUnitId, 3, "scalarBuff"),
      ),
      mode: { tag: "cast" },
    });
    expect(levelThreeTargetHole.choices).toEqual([
      spellCasterId,
      spellTargetId,
      secondTargetId,
    ]);
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
        choices: [spellCasterId, spellTargetId, secondTargetId],
      }),
    );

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: levelFourAct.subject,
      fills: [
        withoutKnownWillingFacts(
          spellTargetListFill(targetListHole, spellCasterId, flyUnitId, [
            secondTargetId,
          ]),
        ),
      ],
    });
    expect(unwillingTarget).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: levelFourAct.subject,
      fills: [
        knownWillingSpellTargetListFill(
          targetListHole,
          spellCasterId,
          flyUnitId,
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
                  kind: "fly",
                  speedFeet: 60,
                  remainingFeet: 60,
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
                  kind: "fly",
                  speedFeet: 60,
                  remainingFeet: 60,
                }),
              ]),
            }),
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fly to resolve.");
    }
    const expectedEffect = expect.objectContaining({
      kind: "specialSpeedGrant",
      sourceProcedureRef: levelFourAct.subject.procedureRef,
      sourceCombatantId: spellCasterId,
      speedKind: "fly",
      speed: { kind: "fixed", speedFeet: movementFeet(60) },
      hover: true,
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(100),
      },
    });
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(expectedEffect);
    expect(
      resolved.state.combatants.get(secondTargetId)?.activeEffects,
    ).toContainEqual(expectedEffect);
  });

  test("fly concentration, duration, and Dash projections use the fixed Fly Speed grant", () => {
    const spell = spellRecord(flyUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = session.state;
    const act = spellAct({ session, spellId: flyUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          flyUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fly to resolve.");
    }
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Fly caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected Fly target end turn.");
    }
    const flyDashAct = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "fly",
      },
      fills: [],
    });
    expect(flyDashAct).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          dashMovementBonusFeet: 60,
        },
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "fly",
                  speedFeet: 60,
                  remainingFeet: 120,
                }),
              ]),
            }),
          }),
          expect.anything(),
        ],
      },
    });

    const broken = breakBattleConcentration(resolved.state, spellCasterId);
    expect(broken.combatants.get(spellCasterId)?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "specialSpeedGrant",
          sourceCombatantId: spellCasterId,
        }),
      ]),
    );
    const brokenCaster = snapshotBattle(broken).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(brokenCaster?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "fly" })]),
    );

    const caster = resolved.state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Fly caster.");
    }
    const nearlyExpiredState: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "specialSpeedGrant" &&
          effect.sourceCombatantId === spellCasterId
            ? {
                ...effect,
                expiresAt: {
                  kind: "concentration" as const,
                  combatantId: spellCasterId,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expiredTargetTurn = endTurn({
      state: nearlyExpiredState,
      actorId: spellCasterId,
    });
    if (expiredTargetTurn.tag !== "resolved") {
      throw new Error("Expected nearly expired Fly caster end turn.");
    }
    const expired = endTurn({
      state: expiredTargetTurn.state,
      actorId: spellTargetId,
    });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              speedKinds: expect.not.arrayContaining([
                expect.objectContaining({ kind: "fly" }),
              ]),
            }),
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("fly Concentration cleanup opens the existing falling Reaction and landing pipeline when the target cannot stop the fall", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(flyUnitId), spellRecord(featherFallUnitId)],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const cast = castFlyFromSession(session, 3);
    const laterCasterTurn = advanceToNextCasterTurn(cast.state);
    const broken = breakBattleConcentration(
      laterCasterTurn.state,
      spellCasterId,
    );
    const endedEffect = requirePendingFlySpeedGrantCleanup(
      broken,
      spellCasterId,
    );
    const featherFallProcedureRef = requireCharacterSpellProcedureRefForTest(
      battleRuntimeSessionForTest({ ...session, state: broken }),
      spellCasterId,
      spellSlotInvocationRef(featherFallUnitId, 1, "featherFallMitigation"),
    );
    const fallWitness = resolveFlySpeedGrantEndFallCleanup({
      state: broken,
      targetId: spellCasterId,
      witness: {
        kind: "cannotStopFall",
        reactionSpellTargetFacts: featherFallTriggerFacts(
          spellCasterId,
          featherFallProcedureRef,
        ),
      },
    });

    expect(fallWitness).toMatchObject({
      tag: "falls",
      endedEffect,
      reaction: {
        tag: "needsHoles",
        snapshot: { pendingInterrupt: { trigger: "creatureFalls" } },
      },
    });
    if (fallWitness.tag !== "falls") {
      throw new Error("Expected Fly cleanup to hand off to Falling.");
    }
    expect(
      fallWitness.state.combatants.get(spellCasterId)?.activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "specialSpeedGrant",
          sourceCombatantId: spellCasterId,
        }),
      ]),
    );
    if (fallWitness.reaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall Reaction window.");
    }
    const reactionState = fallWitness.reaction.state;

    const featherFallChoice =
      fallWitness.reaction.snapshot.pendingInterrupt?.choices.find(
        (candidate) => {
          if (candidate.kind !== "castTriggeredReactionSpell") return false;
          const invocation = characterSpellInvocationRefForProcedureRefForTest(
            battleRuntimeSessionForTest({ ...session, state: reactionState }),
            candidate.reactorId,
            candidate.subject.procedureRef,
          );
          return (
            invocation.tag === "spellSlot" &&
            invocation.spellId === featherFallUnitId &&
            invocation.procedure === "featherFallMitigation"
          );
        },
      );
    if (
      featherFallChoice === undefined ||
      featherFallChoice.kind !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    const targetList = requireHole(
      featherFallChoice.initialHoles,
      "spellTargetList",
    );
    const mitigated = resolveBattleInterrupt({
      state: fallWitness.reaction.state,
      fill: interruptDecisionFill(
        requireHole(fallWitness.reaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: featherFallChoice.subject.procedureRef,
            fills: [
              featherFallTargetListFill(
                targetList,
                featherFallChoice.subject.procedureRef,
                spellCasterId,
                [spellCasterId],
              ),
            ],
          },
        },
      ),
    });
    expect(mitigated).toMatchObject({ tag: "resolved" });
    if (mitigated.tag !== "resolved") {
      throw new Error("Expected Feather Fall to resolve.");
    }
    const landing = resolveFeatherFallLanding({
      state: mitigated.state,
      targetId: spellCasterId,
    });
    expect(landing).toMatchObject({
      tag: "mitigated",
      targetId: spellCasterId,
      fallDamagePrevented: true,
      fallingPronePrevented: true,
    });
  });

  test("fly duration expiration uses the same caller-supplied fall witness boundary", () => {
    const cast = castFlyOnCaster({
      preparedSpells: [spellRecord(flyUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const caster = cast.state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Fly caster.");
    }
    const endedEffect = {
      ...requireFlySpeedGrant(cast.state, spellCasterId),
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(1),
      },
    };
    const nearlyExpiredState: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "specialSpeedGrant" &&
          effect.sourceCombatantId === spellCasterId
            ? endedEffect
            : effect,
        ),
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpiredState);
    const pendingEndedEffect = requirePendingFlySpeedGrantCleanup(
      expired.state,
      spellCasterId,
    );
    const fallWitness = resolveFlySpeedGrantEndFallCleanup({
      state: expired.state,
      targetId: spellCasterId,
      witness: {
        kind: "cannotStopFall",
        reactionSpellTargetFacts: [],
      },
    });

    expect(fallWitness).toMatchObject({
      tag: "falls",
      endedEffect: pendingEndedEffect,
      reaction: { tag: "resolved" },
    });
    expect(fallWitness.snapshot.pendingInterrupt).toBeNull();
  });

  test("fly recast replacement can record a hover-relevant reason instead of opening a fall", () => {
    const spell = spellRecord(flyUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });
    const firstCast = castFlyFromSession(session, 3);
    const laterCasterTurn = advanceToNextCasterTurn(firstCast.state);
    const secondCast = castFlyFromSession(
      battleRuntimeSessionForTest({
        state: laterCasterTurn.state,
        context: session.context,
      }),
      4,
    );
    const endedEffect = requirePendingFlySpeedGrantCleanup(
      secondCast.state,
      spellCasterId,
    );
    const witness = resolveFlySpeedGrantEndFallCleanup({
      state: secondCast.state,
      targetId: spellCasterId,
      witness: { kind: "canStopFall", reason: "hovering" },
    });

    expect(witness).toMatchObject({
      tag: "canStopFall",
      targetId: spellCasterId,
      endedEffect,
      reason: "hovering",
      snapshot: { pendingInterrupt: null },
    });
    expect(
      witness.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "specialSpeedGrant",
        sourceCombatantId: spellCasterId,
        speedKind: "fly",
        hover: true,
      }),
    );
  });

  test("fly cleanup records a grounded witness without treating hover as generic fall immunity", () => {
    const cast = castFlyOnCaster({
      preparedSpells: [spellRecord(flyUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const endedEffect = requireFlySpeedGrant(cast.state, spellCasterId);
    const absentTargetId = combatantId("combatant:synthetic-absent-fly-target");

    expect(
      resolveFlySpeedGrantEndFallCleanup({
        state: cast.state,
        targetId: spellCasterId,
        witness: { kind: "notAloft" },
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "cleanupFrameMissing",
    });
    expect(
      resolveFlySpeedGrantEndFallCleanup({
        state: cast.state,
        targetId: absentTargetId,
        witness: { kind: "notAloft" },
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "missingCombatant",
      message: "Fly Speed end-fall witness target is not in this battle.",
    });
    const groundedState = breakBattleConcentration(cast.state, spellCasterId);
    expect(
      requirePendingFlySpeedGrantCleanup(groundedState, spellCasterId),
    ).toBe(endedEffect);
    const grounded = resolveFlySpeedGrantEndFallCleanup({
      state: groundedState,
      targetId: spellCasterId,
      witness: { kind: "notAloft" },
    });
    const fallingState = breakBattleConcentration(cast.state, spellCasterId);
    const cannotStop = resolveFlySpeedGrantEndFallCleanup({
      state: fallingState,
      targetId: spellCasterId,
      witness: {
        kind: "cannotStopFall",
        reactionSpellTargetFacts: [],
      },
    });

    expect(grounded).toMatchObject({
      tag: "notAloft",
      snapshot: { pendingInterrupt: null },
    });
    expect(cannotStop).toMatchObject({
      tag: "falls",
      reaction: { tag: "resolved" },
    });
  });

  test("aid is admitted as timed maximum and current Hit Point increases for up to three targets", () => {
    const spell = spellRecord(aidUnitId);
    const secondTargetId = combatantId("unit-profile-aid-target-2");
    const thirdTargetId = combatantId("unit-profile-aid-target-3");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
      extraTargetIds: [secondTargetId, thirdTargetId],
    });
    const state = session.state;
    const act = spellAct({ session, spellId: aidUnitId, slotLevel: 3 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(aidUnitId, 3, "scalarBuff"),
      ),
      mode: { tag: "cast" },
    });
    expect(targetListHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 3 }),
    );
    expect(spellHoleInvocation(session, [targetListHole])).toEqual(
      expect.objectContaining({
        procedure: "scalarBuff",
        effect: {
          kind: "hitPointMaximumIncrease",
          activeEffect: expect.objectContaining({
            kind: "hitPointMaximumIncrease",
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

  test("aid restores a zero-HP target to consciousness and resets death saves", () => {
    const spell = spellRecord(aidUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 0,
      targetMaxHp: 12,
    });
    const act = spellAct({ session, spellId: aidUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, aidUnitId, [
          spellTargetId,
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Aid to restore the zero-HP target.");
    }
    const target = resolved.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected restored Aid target.");
    }

    expect(Number(target.hp)).toBe(5);
    expect(Number(target.maxHp)).toBe(12);
    expect(hasCondition(target.conditions, "unconscious")).toBe(false);
    expect(target.positiveHpUnconscious).toBeNull();
    expect(target.zeroHpLifecycle).toMatchObject({
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: false,
        dead: false,
        hpRegained: false,
      },
    });
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellTargetId,
          hp: 5,
          maxHp: 17,
        }),
      ]),
    );
  });

  test("aid expiration removes the maximum Hit Point bonus and subtracts the current Hit Point increase", () => {
    const spell = spellRecord(aidUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
    });
    const state = session.state;
    const act = spellAct({ session, spellId: aidUnitId, slotLevel: 2 });
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
        effect.sourceCombatantId === spellCasterId
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
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(false);
  });

  test("aid lower-slot recast waits under a stronger overlapping maximum Hit Point increase", () => {
    const spell = spellRecord(aidUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 7,
      targetMaxHp: 12,
    });
    const state = session.state;
    const target = state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Aid target.");
    }
    const act = spellAct({
      session,
      spellId: aidUnitId,
      slotLevel: 2,
    });
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
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: spellCasterId,
            amount: 10,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };
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
          (effect) => effect.kind === "hitPointMaximumIncrease",
        ) ?? [];
    expect(aidEffects).toEqual([
      expect.objectContaining({ amount: 10, sourceCombatantId: spellCasterId }),
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
          (effect) => effect.kind === "hitPointMaximumIncrease",
        ) ?? [];
    expect(remainingAidEffects).toEqual([
      expect.objectContaining({ amount: 5, sourceCombatantId: spellCasterId }),
    ]);
  });
});

function castFlyOnCaster(
  input: Parameters<typeof spellBattle>[0],
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  return castFlyFromSession(spellBattle(input), 3);
}

function castFlyFromSession(
  session: ReturnType<typeof spellBattle>,
  slotLevel: 3 | 4,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const state = session.state;
  const act = spellAct({ session, spellId: flyUnitId, slotLevel });
  const targetChoice = act.initialHoles.find(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
  const targetList = act.initialHoles.find(
    (hole): hole is Extract<BattleHole, { readonly kind: "spellTargetList" }> =>
      hole.kind === "spellTargetList",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetChoice !== undefined
        ? knownWillingSpellTargetFill(
            targetChoice,
            flyUnitId,
            spellCasterId,
            spellCasterId,
          )
        : knownWillingSpellTargetListFill(
            targetList ?? requireHole(act.initialHoles, "spellTargetList"),
            spellCasterId,
            flyUnitId,
            [spellCasterId],
          ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Fly to resolve.");
  }
  return resolved;
}

function advanceToNextCasterTurn(
  state: BattleState,
): Extract<ReturnType<typeof endTurn>, { readonly tag: "resolved" }> {
  const targetTurn = endTurn({ state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected target turn.");
  }
  const casterTurn = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected next caster turn.");
  }
  return casterTurn;
}

function requireFlySpeedGrant(
  state: BattleState,
  targetId: CombatantId,
): EndedFlySpeedGrant {
  const effect = state.combatants
    .get(targetId)
    ?.activeEffects.find(
      (candidate): candidate is EndedFlySpeedGrant =>
        candidate.kind === "specialSpeedGrant" &&
        candidate.speedKind === "fly" &&
        candidate.sourceCombatantId === spellCasterId,
    );
  if (effect === undefined) {
    throw new Error("Expected active Fly Speed grant.");
  }
  return effect;
}

function requirePendingFlySpeedGrantCleanup(
  state: BattleState,
  targetId: CombatantId,
): EndedFlySpeedGrant {
  const frame = state.interruptStack.find(
    (candidate): candidate is BattleFlySpeedGrantEndFallCleanupFrame =>
      candidate.kind === "flySpeedGrantEndFallCleanup" &&
      candidate.targetId === targetId,
  );
  if (frame === undefined) {
    throw new Error("Expected pending Fly Speed grant cleanup.");
  }
  return frame.endedEffect;
}

function featherFallTriggerFacts(
  fallingCreatureId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): readonly BattleTargetSpatialFact[] {
  return [
    {
      kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange",
      reactorId: spellCasterId,
      fallingCreatureId,
      sourceProcedureRef,
      rangeFeet: movementFeet(60),
    },
  ];
}

function featherFallTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
  casterIdValue: CombatantId,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "featherFallTargetFallingWithinRange",
      casterId: casterIdValue,
      targetId,
      sourceProcedureRef,
      rangeFeet: movementFeet(60),
    })),
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

describe("SRDINV30D deterministic Heroism Spell Unit admission", () => {
  test("heroism stores Frightened immunity separately from turn-start Temporary Hit Points", () => {
    const spell = spellRecord(heroismUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const state = session.state;
    const act = spellAct({ session, spellId: heroismUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(
          heroismUnitId,
          1,
          "conditionImmunityAndTurnStartTemporaryHitPoints",
        ),
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toEqual([spellCasterId, spellTargetId]);

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        withoutKnownWillingFacts(
          spellTargetFill(
            targetHole,
            heroismUnitId,
            spellCasterId,
            spellTargetId,
          ),
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
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          condition: "frightened",
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
        expect.objectContaining({
          kind: "turnStartTemporaryHitPoints",
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          amount: 3,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
      ],
    );
    const ended = resolveBattleSubject({
      state: resolved.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endConcentration",
      },
      fills: [],
    });
    expect(ended).toMatchObject({
      tag: "resolved",
      routeEvents: [
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
          subject: "conditionImmunityTemporaryHitPointEffect",
          holes: [],
          owner: "battleConcentration",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "conditionImmunityTemporaryHitPointEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
      ],
    });
  });

  test("heroism grants spellcasting-modifier Temporary Hit Points when the target starts its turn", () => {
    const spell = spellRecord(heroismUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const state = session.state;
    const act = spellAct({ session, spellId: heroismUnitId });
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
    const baseSession = spellBattle({ preparedSpells: [spell] });
    const baseState = baseSession.state;
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
    const session = battleRuntimeSessionForTest({
      state,
      context: baseSession.context,
    });
    const act = spellAct({ session, spellId: heroismUnitId });
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const state = session.state;
    const act = spellAct({
      session,
      spellId: heroismUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");

    expect(targetHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 2 }),
    );
    expect(targetHole.choices).toEqual([
      spellCasterId,
      spellTargetId,
      secondTargetId,
    ]);
    const unwillingTargets = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        withoutKnownWillingFacts(
          spellTargetListFill(targetHole, spellCasterId, heroismUnitId, [
            spellCasterId,
            secondTargetId,
          ]),
        ),
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

function shieldOfFaithWithObjectTarget(): ReturnType<typeof spellRecord> {
  const spell = spellRecord(shieldOfFaithUnitId);
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Shield of Faith activation mechanics.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected Shield of Faith direct target phase.");
  }
  return {
    ...spell,
    id: unitId("shield_of_faith_object_target"),
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              selection: {
                ...phase.attachment.value.selection,
                targetKinds: ["object"],
              },
            },
          },
        },
      ],
    },
  } as ReturnType<typeof spellRecord>;
}
