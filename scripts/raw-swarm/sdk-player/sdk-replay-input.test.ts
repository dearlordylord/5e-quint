import { describe, expect, test } from "vitest";

import {
  battleExecutionScopeOrdinal,
  battleId,
  battleStatBlockExecutionScopeRef,
  combatantId,
} from "../../../packages/battle-runtime/src/index.ts";
import { battleStatBlockProcedureExecutionRef } from "../../../packages/battle-runtime/src/identity.ts";
import { movementFeet } from "../../../packages/shared/src/types.ts";
import {
  canonicalSdkCallInput,
  decodeSdkCallInput,
} from "./sdk-replay-input.ts";

describe("SDK replay input", () => {
  test("decodes an ordinary scenario Movement route", () => {
    expect(
      decodeSdkCallInput({
        operation: "resolveScenarioMovement",
        input: {
          kind: "route",
          subject: {
            tag: "runtimeCommand",
            actorId: "goblin-warrior",
            command: "move",
          },
          route: [{ x: 2, y: 3 }],
          speedKind: "walk",
          fills: [],
        },
      }),
    ).toMatchObject({
      tag: "valid",
      value: {
        operation: "resolveScenarioMovement",
        input: {
          kind: "route",
          subject: { command: "move" },
          route: [{ x: 2, y: 3 }],
          speedKind: "walk",
        },
      },
    });
  });

  test("decodes a pending scenario Movement continuation without route restatement", () => {
    expect(
      decodeSdkCallInput({
        operation: "resolveScenarioMovement",
        input: { kind: "continue", fills: [] },
      }),
    ).toStrictEqual({
      tag: "valid",
      value: {
        operation: "resolveScenarioMovement",
        input: { kind: "continue", fills: [] },
      },
    });
  });

  test("accepts the omitted optional End Turn fills recorded by the tracer", () => {
    expect(
      decodeSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior" },
      }),
    ).toStrictEqual({
      tag: "valid",
      value: {
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior" },
      },
    });
  });

  test("decodes the same canonical JSON input that replay records", () => {
    expect(
      canonicalSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior", fills: undefined },
      }),
    ).toStrictEqual({
      tag: "valid",
      input: { actorId: "goblin-warrior" },
      value: {
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior" },
      },
    });
  });

  test("rejects excess properties with JSON values", () => {
    expect(
      canonicalSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior", typo: null },
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("removes undefined union properties before decoding and recording", () => {
    const actorId = combatantId("goblin-warrior");
    const targetId = combatantId("fighter");
    const procedureRef = battleStatBlockProcedureExecutionRef(
      battleStatBlockExecutionScopeRef(
        battleId("canonical-input"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      battleExecutionScopeOrdinal(1),
    );
    const statBlockDamageSelection = [
      {
        componentRef: { kind: "baseDamageComponent", ordinal: 1 },
        notation: "static",
      },
    ] as const;
    const decoded = canonicalSdkCallInput({
      operation: "resolveBattleRuntimeSubject",
      input: {
        subject: {
          tag: "action",
          actorId,
          action: "attack",
          procedureRef,
          statBlockDamageSelection,
        },
        fills: [
          {
            kind: "targetChoice",
            holeId: "battle:attack:target",
            value: targetId,
            spatialFacts: [
              {
                kind: "attackTargetDistance",
                actorId,
                targetId,
                procedureRef,
                distanceFeet: movementFeet(5),
                statBlockDamageSelection,
                attackAbility: undefined,
                attackDamageType: undefined,
              },
            ],
          },
        ],
      },
    });
    expect(decoded.tag).toBe("valid");
    expect(JSON.stringify(decoded.input)).not.toContain("attackAbility");
    expect(JSON.stringify(decoded.input)).not.toContain("attackDamageType");
  });

  test("accepts only the player's Help enemy choice at the SDK boundary", () => {
    const input = {
      subject: {
        tag: "action",
        actorId: "helper",
        action: "helpAttack",
      },
      fills: [
        {
          kind: "helpAttackEnemyDecision",
          holeId: "battle:help-attack:target",
          targetEnemyId: "enemy",
        },
      ],
    };
    expect(
      canonicalSdkCallInput({
        operation: "resolveBattleRuntimeSubject",
        input,
      }),
    ).toMatchObject({
      tag: "valid",
      input,
      value: {
        input: {
          fills: [
            {
              kind: "helpAttackEnemyDecision",
              targetEnemyId: "enemy",
            },
          ],
        },
      },
    });
    expect(
      canonicalSdkCallInput({
        operation: "resolveBattleRuntimeSubject",
        input: {
          ...input,
          fills: [
            {
              ...input.fills[0],
              targetWithinFiveFeetOfHelper: true,
            },
          ],
        },
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("rejects sparse arrays before live execution and recording", () => {
    const fills = Array<never>(1);

    expect(() =>
      canonicalSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: { actorId: "goblin-warrior", fills },
      }),
    ).toThrow("SDK evidence contains a sparse array.");
  });

  test("rejects symbol-keyed call input before validation and recording", () => {
    expect(() =>
      canonicalSdkCallInput({
        operation: "endBattleRuntimeTurn",
        input: {
          actorId: "goblin-warrior",
          [Symbol("typo")]: null,
        },
      }),
    ).toThrow("SDK evidence contains a symbol-keyed property.");
  });
});
