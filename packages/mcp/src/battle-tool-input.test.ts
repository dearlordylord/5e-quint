import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  combatantId,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { battleToolNames, decodeBattleToolCall } from "./battle-tool-input.ts";

const actorId = combatantId("falling-mitigation-reactor");
const fallingCreatureId = combatantId("falling-creature");
const sourceProcedureRef = battleProcedureExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("battle:falling-mitigation-tool-input"),
    actorId,
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);
const creatureFallsSubject = {
  tag: "runtimeCommand",
  actorId,
  command: "creatureFalls",
  fallingCreatureId,
} as const;

describe("battle tool input", () => {
  test("decodes a visible falling creature within range trigger witness", () => {
    const decoded = decodeBattleToolCall({
      name: battleToolNames.resolveBattleAct,
      args: {
        subject: creatureFallsSubject,
        reactionSpellTargetFacts: [
          {
            kind: "fallingCreatureMitigationTrigger",
            reactorId: actorId,
            sourceProcedureRef,
            witness: {
              kind: "visibleCreatureWithinRangeFalls",
              fallingCreatureId,
              distanceFeet: 60,
            },
          },
        ],
      },
    });

    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(decoded.success.args).toMatchObject({
      subject: creatureFallsSubject,
      reactionSpellTargetFacts: [
        {
          kind: "fallingCreatureMitigationTrigger",
          reactorId: actorId,
          sourceProcedureRef,
          witness: {
            kind: "visibleCreatureWithinRangeFalls",
            fallingCreatureId,
            distanceFeet: 60,
          },
        },
      ],
    });
  });

  test("decodes the reactor falling without an inapplicable range witness", () => {
    const decoded = decodeBattleToolCall({
      name: battleToolNames.resolveBattleAct,
      args: {
        subject: { ...creatureFallsSubject, fallingCreatureId: actorId },
        reactionSpellTargetFacts: [
          {
            kind: "fallingCreatureMitigationTrigger",
            reactorId: actorId,
            sourceProcedureRef,
            witness: { kind: "reactorFalls" },
          },
        ],
      },
    });

    expect(Result.isSuccess(decoded)).toBe(true);
  });

  test("rejects an unrelated spatial-fact kind for creature-falls input", () => {
    const decoded = decodeBattleToolCall({
      name: battleToolNames.resolveBattleAct,
      args: {
        subject: creatureFallsSubject,
        reactionSpellTargetFacts: [
          {
            kind: "reactionSpellDamagerVisibleWithinRange",
            reactorId: actorId,
            damageSourceId: fallingCreatureId,
            sourceProcedureRef,
            rangeFeet: 60,
          },
        ],
      },
    });

    expect(Result.isFailure(decoded)).toBe(true);
  });

  test("rejects a falling creature fact without a self-or-visibility witness", () => {
    const decoded = decodeBattleToolCall({
      name: battleToolNames.resolveBattleAct,
      args: {
        subject: creatureFallsSubject,
        reactionSpellTargetFacts: [
          {
            kind: "fallingCreatureMitigationTrigger",
            reactorId: actorId,
            fallingCreatureId,
            sourceProcedureRef,
            rangeFeet: 60,
          },
        ],
      },
    });

    expect(Result.isFailure(decoded)).toBe(true);
  });
});
