// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-command-approach-route spell.invocation-command-flee-route
import { describe, expect, test } from "vitest";
import {
  commandUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  commandApproachMovementFill,
  commandFleeMovementFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  difficultyClass,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleState,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic Command movement option admission", () => {
  test("command Approach consumes supplied route movement and continues when not within five feet", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
    const approachAct = discoverBattleActs(targetTurn.state)[0];
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
    const approached = resolveBattleSubject({
      state: targetTurn.state,
      subject: approachAct.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: false,
        }),
      ],
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
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
    const approachAct = discoverBattleActs(targetTurn.state)[0];
    if (
      approachAct === undefined ||
      approachAct.subject.tag !== "runtimeCommand" ||
      approachAct.subject.command !== "commandApproach"
    ) {
      throw new Error("Expected Command Approach act.");
    }
    const movement = requireHole(approachAct.initialHoles, "movement");
    const approached = resolveBattleSubject({
      state: targetTurn.state,
      subject: approachAct.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: true,
        }),
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
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
          targetExemptFromDragCost: false,
        },
      ],
    };
    const approachAct = discoverBattleActs(grappledTargetTurn)[0];
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
      discoverBattleActs(approached.state).some(
        (candidate) =>
          candidate.subject.actorId === spellTargetId &&
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "endTurn",
      ),
    ).toBe(true);
  });
  test("command Flee consumes supplied full movement budget and ends the target turn", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
    const fleeAct = discoverBattleActs(targetTurn.state)[0];
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
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
    const fleeAct = discoverBattleActs(targetTurn.state)[0];
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
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
          targetExemptFromDragCost: false,
        },
      ],
    };
    const fleeAct = discoverBattleActs(grappledTargetTurn)[0];
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
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
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
        state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state,
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
    const fleeAct = discoverBattleActs(targetTurn.state)[0];
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
          provokedOpportunityAttacks: [
            { reactorId: spellCasterId, attackName: "Unarmed Strike" },
          ],
        }),
      ],
    });
    const reaction = requireResultHole(fled, "interruptDecision");
    expect(reaction.trigger).toBe("opportunityAttack");
  });
});
