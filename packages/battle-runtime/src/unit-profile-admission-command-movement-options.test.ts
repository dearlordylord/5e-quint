// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-command-approach-route spell.invocation-command-flee-route
import { describe, expect, test } from "vitest";
import {
  attackRollFill,
  attackExecutionSelectionForSubjectForTest,
  characterAttackSubjectForTest,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
} from "./battle-runtime.test-support.ts";
import { battleStateWithSyntheticWeakeningEndTurnSave } from "./command-delegated-end-turn.test-support.ts";
import {
  commandUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  interruptDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  commandApproachMovementFill,
  commandFleeMovementFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  combatantId,
  difficultyClass,
  discoverBattleActCandidates,
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleFill,
  BattleState,
} from "./unit-profile-admission.test-support.ts";

const commandApproachThreatId = combatantId(
  "synthetic-command-approach-opportunity-threat",
);

describe("QMBT14 deterministic Command movement option admission", () => {
  test("command Approach consumes supplied route movement and continues when not within five feet", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [commandApproachThreatId],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "approach",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Approach cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const approachAct = discoverBattleActCandidates(targetTurn.state)[0];
    expect(approachAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandApproach",
        }),
        initialHoles: [expect.objectContaining({ kind: "movement" })],
      }),
    );
    if (
      approachAct === undefined ||
      approachAct.subject.tag !== "runtimeCommand" ||
      approachAct.subject.command !== "commandApproach"
    ) {
      throw new Error("Expected Command Approach act.");
    }
    const movement = requireHole(approachAct.initialHoles, "movement");
    const opportunityAttack = resolveBattleSubject({
      state: targetTurn.state,
      subject: approachAct.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: false,
          provokedOpportunityAttacks: [
            {
              reactorId: commandApproachThreatId,
              ...attackExecutionSelectionForSubjectForTest(
                characterAttackSubjectForTest(
                  targetTurn.state,
                  commandApproachThreatId,
                  "Unarmed Strike",
                ),
              ),
            },
          ],
        }),
      ],
    });
    const opportunityAttackDecision = requireResultHole(
      opportunityAttack,
      "interruptDecision",
    );
    expect(opportunityAttackDecision).toMatchObject({
      trigger: "opportunityAttack",
    });
    if (opportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Command Approach opportunity interrupt.");
    }
    const approached = resolveBattleInterrupt({
      state: opportunityAttack.state,
      fill: interruptDecisionFill(opportunityAttackDecision, {
        kind: "decline",
        responderId: commandApproachThreatId,
      }),
    });
    expect(approached).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellTargetId },
    });
    if (approached.tag !== "resolved") {
      throw new Error("Expected Command Approach to resolve.");
    }
    expect(requireCombatant(approached.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(10),
      activeEffects: [],
    });
    expect(
      requireCombatant(approached.state, spellTargetId),
    ).not.toHaveProperty("commandApproach");
  });
  test("command Approach ends the target turn when supplied proximity reaches the caster", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "approach",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Approach cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const committedState = battleStateWithSyntheticWeakeningEndTurnSave(
      targetTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const approachAct = discoverBattleActCandidates(committedState)[0];
    if (
      approachAct === undefined ||
      approachAct.subject.tag !== "runtimeCommand" ||
      approachAct.subject.command !== "commandApproach"
    ) {
      throw new Error("Expected Command Approach act.");
    }
    const movement = requireHole(approachAct.initialHoles, "movement");
    const movementFill = commandApproachMovementFill(movement, {
      movementCostFeet: 10,
      movedWithinFiveFeetOfCaster: true,
      provokedOpportunityAttacks: [],
    });
    const awaitingEndTurnSave = resolveBattleSubject({
      state: committedState,
      subject: approachAct.subject,
      fills: [movementFill],
    });
    expect(awaitingEndTurnSave).toMatchObject({
      tag: "needsHoles",
      subject: approachAct.subject,
    });
    if (awaitingEndTurnSave.tag !== "needsHoles") {
      throw new Error("Expected Command Approach End Turn save frontier.");
    }
    expect(awaitingEndTurnSave.snapshot).toEqual(
      snapshotBattle(awaitingEndTurnSave.state),
    );
    expect(awaitingEndTurnSave.snapshot.acts).toEqual([]);
    const endTurnSave = requireResultHole(
      awaitingEndTurnSave,
      "savingThrowOutcome",
    );
    const approached = resolveBattleSubject({
      state: awaitingEndTurnSave.state,
      subject: approachAct.subject,
      fills: [
        movementFill,
        savingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(approached).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (approached.tag !== "resolved") {
      throw new Error("Expected Command Approach to resolve.");
    }
    expect(requireCombatant(approached.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(10),
      activeEffects: [],
    });
  });
  test("command Approach clears the pending effect without a Movement fill when no movement is available", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "approach",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Approach cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const grappledTargetTurn: BattleState = {
      ...targetTurn.state,
      grapples: [
        {
          grapplerId: spellCasterId,
          targetId: spellTargetId,
          escapeDc: difficultyClass(12),
          reachFeet: movementFeet(5),
          hand: "left",
        },
      ],
    };
    const approachAct = discoverBattleActCandidates(grappledTargetTurn)[0];
    expect(approachAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandApproach",
        }),
        initialHoles: [],
      }),
    );
    if (
      approachAct === undefined ||
      approachAct.subject.tag !== "runtimeCommand" ||
      approachAct.subject.command !== "commandApproach"
    ) {
      throw new Error("Expected no-movement Command Approach act.");
    }
    const approached = resolveBattleSubject({
      state: grappledTargetTurn,
      subject: approachAct.subject,
      fills: [],
    });
    expect(approached).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellTargetId },
    });
    if (approached.tag !== "resolved") {
      throw new Error("Expected no-movement Command Approach to resolve.");
    }
    expect(requireCombatant(approached.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
      activeEffects: [],
    });
    expect(
      discoverBattleActCandidates(approached.state).some(
        (candidate) =>
          candidate.subject.actorId === spellTargetId &&
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "endTurn",
      ),
    ).toBe(true);
  });
  test("command Flee consumes supplied full movement budget and ends the target turn", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "flee",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Flee cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const fleeAct = discoverBattleActCandidates(targetTurn.state)[0];
    expect(fleeAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandFlee",
        }),
        initialHoles: [expect.objectContaining({ kind: "movement" })],
      }),
    );
    if (
      fleeAct === undefined ||
      fleeAct.subject.tag !== "runtimeCommand" ||
      fleeAct.subject.command !== "commandFlee"
    ) {
      throw new Error("Expected Command Flee act.");
    }
    const movement = requireHole(fleeAct.initialHoles, "movement");
    const fled = resolveBattleSubject({
      state: targetTurn.state,
      subject: fleeAct.subject,
      fills: [
        commandFleeMovementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(fled).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (fled.tag !== "resolved") {
      throw new Error("Expected Command Flee to resolve.");
    }
    expect(requireCombatant(fled.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(30),
      activeEffects: [],
    });
  });
  test("command Flee rejects partial movement when movement is available", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "flee",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Flee cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const fleeAct = discoverBattleActCandidates(targetTurn.state)[0];
    if (
      fleeAct === undefined ||
      fleeAct.subject.tag !== "runtimeCommand" ||
      fleeAct.subject.command !== "commandFlee"
    ) {
      throw new Error("Expected Command Flee act.");
    }
    const movement = requireHole(fleeAct.initialHoles, "movement");
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: fleeAct.subject,
        fills: [
          commandFleeMovementFill(movement, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });
  test("command Flee clears the pending effect and ends turn when no movement is available", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "flee",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Flee cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const grappledTargetTurn: BattleState = {
      ...targetTurn.state,
      grapples: [
        {
          grapplerId: spellCasterId,
          targetId: spellTargetId,
          escapeDc: difficultyClass(12),
          reachFeet: movementFeet(5),
          hand: "left",
        },
      ],
    };
    const fleeAct = discoverBattleActCandidates(grappledTargetTurn)[0];
    expect(fleeAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandFlee",
        }),
        initialHoles: [],
      }),
    );
    if (
      fleeAct === undefined ||
      fleeAct.subject.tag !== "runtimeCommand" ||
      fleeAct.subject.command !== "commandFlee"
    ) {
      throw new Error("Expected no-movement Command Flee act.");
    }
    const fled = resolveBattleSubject({
      state: grappledTargetTurn,
      subject: fleeAct.subject,
      fills: [],
    });
    expect(fled).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (fled.tag !== "resolved") {
      throw new Error("Expected no-movement Command Flee to resolve.");
    }
    expect(requireCombatant(fled.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
      activeEffects: [],
    });
  });
  test("command Flee Opportunity Attack eligibility comes from actual movement", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "flee",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Flee cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const committedState = battleStateWithSyntheticWeakeningEndTurnSave(
      targetTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const fleeAct = discoverBattleActCandidates(committedState)[0];
    if (
      fleeAct === undefined ||
      fleeAct.subject.tag !== "runtimeCommand" ||
      fleeAct.subject.command !== "commandFlee"
    ) {
      throw new Error("Expected Command Flee act.");
    }
    const movement = requireHole(fleeAct.initialHoles, "movement");
    const movementFill = commandFleeMovementFill(movement, {
      movementCostFeet: 30,
      provokedOpportunityAttacks: [
        {
          reactorId: spellCasterId,
          ...attackExecutionSelectionForSubjectForTest(
            characterAttackSubjectForTest(
              committedState,
              spellCasterId,
              "Unarmed Strike",
            ),
          ),
        },
      ],
    });
    const fled = resolveBattleSubject({
      state: committedState,
      subject: fleeAct.subject,
      fills: [movementFill],
    });
    const reaction = requireResultHole(fled, "interruptDecision");
    expect(reaction.trigger).toBe("opportunityAttack");
    if (fled.tag !== "needsHoles") {
      throw new Error("Expected Command Flee opportunity interrupt.");
    }
    const afterDecline = resolveBattleInterrupt({
      state: fled.state,
      fill: interruptDecisionFill(reaction, {
        kind: "decline",
        responderId: spellCasterId,
      }),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      subject: fleeAct.subject,
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
    if (afterDecline.tag !== "needsHoles") {
      throw new Error("Expected Command Flee End Turn save after decline.");
    }
    expect(afterDecline.snapshot).toEqual(snapshotBattle(afterDecline.state));
    expect(afterDecline.snapshot.acts).toEqual([]);
    expect(afterDecline.state.interruptStack).toEqual([
      {
        kind: "replayContinuation",
        continuation: {
          kind: "replay",
          subject: fleeAct.subject,
          fills: [movementFill],
        },
        handledInterruptTrigger: "opportunityAttack",
      },
    ]);
    expect(requireCombatant(afterDecline.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({ kind: "commandPending", option: "flee" }),
      ]),
    });
    const endTurnSave = requireResultHole(afterDecline, "savingThrowOutcome");
    const rejectedReplay = resolveBattleSubject({
      state: afterDecline.state,
      subject: fleeAct.subject,
      fills: [
        savingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        savingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(rejectedReplay).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "End Turn received duplicate Saving Throw outcome fills.",
      snapshot: snapshotBattle(afterDecline.state),
      routeEvents: [
        {
          kind: "resolveBattleSubject",
          subject: "commandEffect",
          fill: "savingThrowOutcome",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ],
    });
    const replayed = resolveBattleSubject({
      state: afterDecline.state,
      subject: fleeAct.subject,
      fills: [
        savingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(replayed).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (replayed.tag !== "resolved") {
      throw new Error("Expected Command Flee replay to resolve.");
    }
    expect(requireCombatant(replayed.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(30),
      activeEffects: [],
    });

    const choice = reactionChoiceWithSubject(
      fled.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: fled.state,
      fill: interruptDecisionFill(reaction, {
        kind: "resolve",
        responderId: spellCasterId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      }),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected Command Flee Opportunity Attack roll, got ${JSON.stringify(startedReaction)}.`,
      );
    }
    const attackRoll = requireResultHole(startedReaction, "attackRoll");
    const afterAcceptedMiss = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [attackRollFill(attackRoll, { total: 1, naturalD20: 1 })],
    });
    expect(afterAcceptedMiss).toMatchObject({
      tag: "needsHoles",
      subject: fleeAct.subject,
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
    if (afterAcceptedMiss.tag !== "needsHoles") {
      throw new Error("Expected End Turn save after accepted missed attack.");
    }
    expect(
      requireCombatant(afterAcceptedMiss.state, spellCasterId)
        .reactionAvailable,
    ).toBe(false);
    expect(
      requireCombatant(afterAcceptedMiss.state, spellTargetId),
    ).toMatchObject({
      movementSpentFeet: movementFeet(0),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({ kind: "commandPending", option: "flee" }),
      ]),
    });
    const acceptedEndTurnSave = requireResultHole(
      afterAcceptedMiss,
      "savingThrowOutcome",
    );
    const replayedAfterAcceptedMiss = resolveBattleSubject({
      state: afterAcceptedMiss.state,
      subject: fleeAct.subject,
      fills: [
        savingThrowOutcomeFill(acceptedEndTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(replayedAfterAcceptedMiss).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (replayedAfterAcceptedMiss.tag !== "resolved") {
      throw new Error("Expected accepted Command Flee replay to resolve.");
    }
    expect(
      requireCombatant(replayedAfterAcceptedMiss.state, spellCasterId)
        .reactionAvailable,
    ).toBe(true);
    expect(
      requireCombatant(replayedAfterAcceptedMiss.state, spellTargetId),
    ).toMatchObject({ movementSpentFeet: movementFeet(30), activeEffects: [] });
  });
});
