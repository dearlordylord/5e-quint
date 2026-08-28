import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  attackExecutionSelectionForSubjectForTest,
  battleStateWithAllocatedEffectForTest,
  battleProcedureExecutionRefForTest,
  characterAttackSubjectForTest,
  testShortswordAttack,
} from "./battle-runtime.test-support.ts";
import {
  battleActSpellPresentation,
  battleActSpellSlotPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV49 expeditious_retreat
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV53 jump
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-expeditious-retreat-dash spell.invocation-jump-movement-replacement
import { describe, expect, test } from "vitest";
import type { BonusActionSpellAct } from "./unit-profile-admission-catalog.test-support.ts";
import {
  expeditiousRetreatUnitId,
  jumpUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusActionDashSpellAct,
  bonusSpellAct,
  jumpMovementReplacementAct,
  jumpSpellTargetListFill,
  maybeJumpMovementReplacementAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import { resolveBonusActionDashSpellAct } from "./battle-reducer/spells-resolve.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import {
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";

describe("SRDINV49 deterministic Expeditious Retreat admission", () => {
  test("expeditious_retreat casts as a Bonus Action Dash spell", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const act = bonusActionDashSpellAct({
      session,
      spellId: expeditiousRetreatUnitId,
    });
    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef: expect.any(String),
          tag: "bonusActionDashSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
          speedKind: "walk",
        },
        initialHoles: [],
      }),
    );
  });

  test("expeditious_retreat immediately Dashes and stores a Concentration-owned Bonus Action Dash permission", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const act = bonusActionDashSpellAct({
      session,
      spellId: expeditiousRetreatUnitId,
    });
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              speedFeet: 30,
              remainingFeet: 60,
            }),
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(resolved.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "turn" })]),
    );
    expect(caster.concentration).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellDashBonusAction",
        effectRef: expect.any(String),
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );
  });

  test("rejects a discovered Expeditious Retreat cast after its caster or resources become stale", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = bonusActionDashSpellAct({
      session,
      spellId: expeditiousRetreatUnitId,
    });
    const caster = requireCombatant(session.state, spellCasterId);
    if (
      caster.origin.kind !== "character" ||
      caster.origin.spellcasting === undefined
    ) {
      throw new Error("Expected Expeditious Retreat character spellcaster.");
    }

    const withoutCaster = {
      ...session.state,
      combatants: new Map(
        [...session.state.combatants].filter(
          ([combatantId]) => combatantId !== spellCasterId,
        ),
      ),
    };
    const withoutSpellSlot = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...caster,
        origin: {
          ...caster.origin,
          spellcasting: {
            ...caster.origin.spellcasting,
            spellSlots: caster.origin.spellcasting.spellSlots.map((slot) => ({
              ...slot,
              expended: slot.count,
            })),
          },
        },
      }),
    };
    const afterSpellSlotUse = {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        spellSlotUsesThisTurn: [
          { kind: "committed" as const, combatantId: spellCasterId },
        ],
      },
    };
    const withoutBonusAction = {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        currentHasBonusAction: false,
      },
    };

    expect(
      resolveBattleSubject({
        state: withoutCaster,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: withoutSpellSlot,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Expeditious Retreat no longer has its required runtime spell resource.",
    });
    for (const state of [afterSpellSlotUse, withoutBonusAction]) {
      expect(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    }
  });

  test("admitted Bonus Action Dash subjects reject stale caller-mutation actors", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const act = bonusActionDashSpellAct({
      session,
      spellId: expeditiousRetreatUnitId,
    });
    const admission = admitBattleResolutionInput({
      state: session.state,
      subject: act.subject,
      fills: [],
    });
    if (admission.tag !== "admitted") {
      throw new Error(
        "Expected admitted Expeditious Retreat resolution input.",
      );
    }
    const statBlockSource = session.state.combatants.get(spellTargetId);
    if (statBlockSource === undefined) {
      throw new Error("Expected a stat-block combatant for caller mutation.");
    }
    const staleActor = {
      ...statBlockSource,
      combatantId: spellCasterId,
    };
    expect(
      resolveBonusActionDashSpellAct(
        {
          ...admission.input,
          state: {
            ...admission.input.state,
            combatants: new Map(session.state.combatants).set(
              spellCasterId,
              staleActor,
            ),
          },
        },
        spellProcedureExecutionRegistry(),
      ),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Bonus Action Dash spell act requires a supported Expeditious Retreat spell.",
    });
  });

  test("expeditious_retreat grants only later Bonus Action Dash until Concentration ends", () => {
    const spell = spellRecord(expeditiousRetreatUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusActionDashSpellAct({
      session,
      spellId: expeditiousRetreatUnitId,
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat target end turn.");
    }
    assertBattleSnapshotCodecRoundTripForTest(nextCasterTurn.snapshot);
    const laterDashAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: nextCasterTurn.state,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionStandardAction" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          expeditiousRetreatUnitId &&
        candidate.subject.action === "dash" &&
        candidate.subject.speedKind === "walk",
    );
    expect(laterDashAct).toBeDefined();
    if (
      laterDashAct === undefined ||
      laterDashAct.subject.tag !== "bonusActionStandardAction" ||
      laterDashAct.subject.action !== "dash"
    ) {
      throw new Error("Expected Expeditious Retreat Bonus Action Dash act.");
    }

    expect(
      resolveBattleSubject({
        state: nextCasterTurn.state,
        subject: {
          tag: "bonusActionStandardAction",
          actorId: laterDashAct.subject.actorId,
          procedureRef: laterDashAct.subject.procedureRef,
          action: "disengage",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The spell effect that granted this Bonus Action is no longer active.",
    });

    const withoutConcentration = breakBattleConcentration(
      nextCasterTurn.state,
      spellCasterId,
    );
    expect(
      resolveBattleSubject({
        state: withoutConcentration,
        subject: laterDashAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const dashed = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: laterDashAct.subject,
      fills: [],
    });
    expect(dashed).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({ remainingFeet: 60 }),
          }),
        ]),
      },
    });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Expeditious Retreat Bonus Action Dash.");
    }
    expect(dashed.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "turn" })]),
    );

    const broken = breakBattleConcentration(cast.state, spellCasterId);
    const afterBrokenTargetTurn = endTurn({
      state: broken,
      actorId: spellCasterId,
    });
    if (afterBrokenTargetTurn.tag !== "resolved") {
      throw new Error("Expected broken Expeditious Retreat caster end turn.");
    }
    const afterBrokenCasterTurn = endTurn({
      state: afterBrokenTargetTurn.state,
      actorId: spellTargetId,
    });
    if (afterBrokenCasterTurn.tag !== "resolved") {
      throw new Error("Expected broken Expeditious Retreat target end turn.");
    }
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: afterBrokenCasterTurn.state,
          context: session.context,
        }),
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "bonusActionStandardAction",
            sourceProcedureRef: expect.any(String),
            action: "dash",
          }),
        }),
      ]),
    );
  });
});

describe("SRDINV53 deterministic Jump movement replacement admission", () => {
  test("using one of two mechanically identical Jump occurrences consumes only its exact occurrence", () => {
    const session = spellBattle({ preparedSpells: [] });
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "two-jump-occurrences",
    );
    const jumpEffect = {
      kind: "jumpMovementReplacement" as const,
      sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      movementCostFeet: movementFeet(10),
      maxJumpDistanceFeet: movementFeet(30),
      usedThisTurn: false,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(10),
      },
    };
    const firstState = battleStateWithAllocatedEffectForTest({
      state: session.state,
      ownerId: spellCasterId,
      effect: jumpEffect,
    });
    const state = battleStateWithAllocatedEffectForTest({
      state: firstState,
      ownerId: spellCasterId,
      effect: jumpEffect,
    });
    const jumpOccurrences = requireCombatant(
      state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "jumpMovementReplacement",
    );
    expect(jumpOccurrences).toHaveLength(2);
    const selectedAct = jumpMovementReplacementAct(state);
    const movement = requireHole(selectedAct.initialHoles, "movement");

    const resolved = resolveBattleSubject({
      state,
      subject: selectedAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
        }),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected the selected Jump occurrence to resolve.");
    }
    const resolvedOccurrences = requireCombatant(
      resolved.state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "jumpMovementReplacement",
    );
    expect(
      resolvedOccurrences.find(
        (effect) => effect.effectRef === selectedAct.subject.effectRef,
      ),
    ).toMatchObject({ usedThisTurn: true });
    expect(
      resolvedOccurrences.find(
        (effect) => effect.effectRef !== selectedAct.subject.effectRef,
      ),
    ).toMatchObject({ usedThisTurn: false });
  });

  test("jump casts as a touched willing target-list Bonus Action spell with slot-scaled targets", () => {
    const spell = spellRecord(jumpUnitId);
    const extraTargetId = combatantId("unit-profile-jump-target-2");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
      extraTargetIds: [extraTargetId],
    });
    const jumpActs = discoverBattleActs(session).filter(
      (candidate): candidate is BonusActionSpellAct =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          jumpUnitId,
    );

    expect(
      jumpActs.map((act) => battleActSpellPresentation(act)?.invocation),
    ).toEqual(
      expect.arrayContaining([
        spellSlotInvocationRef(jumpUnitId, 1, "jumpMovementReplacement"),
        spellSlotInvocationRef(jumpUnitId, 2, "jumpMovementReplacement"),
      ]),
    );
    const levelTwo = jumpActs.find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
        Number(battleActSpellSlotPresentation(act)?.invocation.slotLevel) === 2,
    );
    expect(levelTwo).toBeDefined();
    if (levelTwo === undefined) {
      throw new Error("Expected level 2 Jump act.");
    }
    const targets = requireHole(levelTwo.initialHoles, "spellTargetList");
    expect(targets).toMatchObject({
      minTargets: 1,
      maxTargets: 2,
      requiresKnownWillingTargets: true,
      choices: expect.arrayContaining([spellCasterId, spellTargetId]),
    });
  });

  test("rejects a stale Jump movement-replacement subject after its effect ends", () => {
    const spell = spellRecord(jumpUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusSpellAct({ session, spellId: jumpUnitId });
    const targetHole = requireHole(castAct.initialHoles, "spellTargetList");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Jump to resolve.");
    }

    const jumpAct = jumpMovementReplacementAct(cast.state);
    const caster = requireCombatant(cast.state, spellCasterId);
    const staleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.filter(
          (effect) => effect.kind !== "jumpMovementReplacement",
        ),
      }),
    };
    expect(
      resolveBattleSubject({
        state: staleState,
        subject: jumpAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Jump movement replacement is not available.",
    });
  });

  test("jump installs a one-minute per-target movement replacement and spends 10 Movement for up to 30 feet", () => {
    const spell = spellRecord(jumpUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      targetAttack: testShortswordAttack(),
    });
    const castAct = bonusSpellAct({ session, spellId: jumpUnitId });
    const targetHole = requireHole(castAct.initialHoles, "spellTargetList");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Jump to resolve.");
    }
    expect(cast.state.combatants.get(spellCasterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "jumpMovementReplacement",
        sourceProcedureRef: castAct.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        movementCostFeet: movementFeet(10),
        maxJumpDistanceFeet: movementFeet(30),
        usedThisTurn: false,
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);

    const jumpAct = jumpMovementReplacementAct(cast.state);
    const movement = requireHole(jumpAct.initialHoles, "movement");
    const threatenedJump = resolveBattleSubject({
      state: cast.state,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [
            {
              reactorId: spellTargetId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                characterAttackSubjectForTest(
                  cast.state,
                  spellTargetId,
                  "Shortsword",
                ),
              ),
            },
          ],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
        }),
      ],
    });
    expect(threatenedJump).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingInterrupt: { trigger: "opportunityAttack" },
      },
    });
    if (threatenedJump.tag !== "needsHoles") {
      throw new Error("Expected Jump to open an Opportunity Attack window.");
    }
    expect(
      threatenedJump.state.combatants
        .get(spellCasterId)
        ?.activeEffects.find(
          (effect) => effect.kind === "jumpMovementReplacement",
        ),
    ).toMatchObject({ usedThisTurn: true });
    const jumped = resolveBattleSubject({
      state: cast.state,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
        }),
      ],
    });

    expect(jumped).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              spentFeet: 10,
              remainingFeet: 20,
            }),
          }),
        ]),
      },
    });
    if (jumped.tag !== "resolved") {
      throw new Error("Expected Jump movement replacement to resolve.");
    }
    expect(
      jumped.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "jumpMovementReplacement",
        usedThisTurn: true,
      }),
    );
    expect(maybeJumpMovementReplacementAct(jumped.state)).toBeUndefined();

    const targetTurn = endTurn({ state: jumped.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn after Jump.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected next caster turn after Jump.");
    }
    expect(maybeJumpMovementReplacementAct(nextCasterTurn.state)).toBeDefined();
  });

  test("jump rejects non-willing target facts and malformed movement replacement fills", () => {
    const spell = spellRecord(jumpUnitId);
    const session = spellBattle({ preparedSpells: [spell] });
    const castAct = bonusSpellAct({ session, spellId: jumpUnitId });
    const targetHole = requireHole(castAct.initialHoles, "spellTargetList");

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: castAct.subject,
        fills: [
          spellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
            spellTargetId,
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Spell targets must be known willing combatants.",
    });

    const cast = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Jump to resolve.");
    }
    const jumpAct = jumpMovementReplacementAct(cast.state);
    const movement = requireHole(jumpAct.initialHoles, "movement");

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            jumpMovementReplacement: {
              kind: "jumpMovementReplacement",
              distanceFeet: movementFeet(30),
              landing: {
                kind: "legalLanding",
                difficultTerrainAcrobatics: "passed",
              },
            },
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: jumpAct.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            jumpMovementReplacement: {
              kind: "jumpMovementReplacement",
              distanceFeet: movementFeet(35),
              landing: {
                kind: "legalLanding",
                difficultTerrainAcrobatics: "passed",
              },
            },
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const failedLanding = resolveBattleSubject({
      state: cast.state,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "failed",
            },
          },
        }),
      ],
    });
    expect(failedLanding).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
  });

  test("Jump recast replaces its admitted occurrence and preserves a low-level unrelated effect", () => {
    const spell = spellRecord(jumpUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    });
    const firstAct = bonusSpellAct({ session, spellId: jumpUnitId });
    const firstTargetHole = requireHole(
      firstAct.initialHoles,
      "spellTargetList",
    );
    const firstCast = resolveBattleSubject({
      state: session.state,
      subject: firstAct.subject,
      fills: [
        jumpSpellTargetListFill(firstTargetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    if (firstCast.tag !== "resolved") {
      throw new Error("Expected first admitted Jump cast to resolve.");
    }
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-jump-unrelated-resistance",
    );
    const stateWithUnrelatedEffect = battleStateWithAllocatedEffectForTest({
      state: firstCast.state,
      ownerId: spellCasterId,
      effect: {
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellCasterId,
        damageType: "cold",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });
    const beforeRecast = requireCombatant(
      stateWithUnrelatedEffect,
      spellCasterId,
    );
    const priorJump = beforeRecast.activeEffects.find(
      (effect) => effect.kind === "jumpMovementReplacement",
    );
    if (priorJump?.kind !== "jumpMovementReplacement") {
      throw new Error("Expected prior Jump occurrence.");
    }
    const targetTurn = endTurn({
      state: stateWithUnrelatedEffect,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected first Jump caster turn to end.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected first Jump target turn to end.");
    }
    const recastSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const act = bonusSpellAct({ session: recastSession, spellId: jumpUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const recast = resolveBattleSubject({
      state: recastSession.state,
      subject: act.subject,
      fills: [
        jumpSpellTargetListFill(targetHole, spellCasterId, jumpUnitId, [
          spellCasterId,
        ]),
      ],
    });
    expect(recast).toMatchObject({ tag: "resolved" });
    if (recast.tag !== "resolved") {
      throw new Error("Expected Jump recast to resolve.");
    }
    const effects = requireCombatant(recast.state, spellCasterId).activeEffects;
    const recastCaster = requireCombatant(recast.state, spellCasterId);
    expect(effects).toContainEqual(
      expect.objectContaining({
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        kind: "jumpMovementReplacement",
        sourceProcedureRef: act.subject.procedureRef,
        usedThisTurn: false,
      }),
    );
    expect(
      effects.filter((effect) => effect.kind === "jumpMovementReplacement"),
    ).toHaveLength(1);
    const replacementJump = effects.find(
      (effect) => effect.kind === "jumpMovementReplacement",
    );
    expect(replacementJump?.effectRef).not.toBe(priorJump.effectRef);
    expect(Number(recastCaster.nextEffectOrdinal)).toBe(
      Number(beforeRecast.nextEffectOrdinal) + 1,
    );
  });
});
