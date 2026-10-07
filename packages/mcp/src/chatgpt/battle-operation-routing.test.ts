import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { discoverBattleActCandidates, endTurn } from "@dnd/battle-runtime";
import {
  longCastingBattle,
  longCastingActorId,
  castingAction,
  advance,
  resolved,
} from "../../../battle-runtime/src/long-casting-lifecycle.test-support.ts";
import { chatGptBattleExecutionInputSchema } from "./battle-execution-schema.ts";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import type { BattleSubject } from "@dnd/battle-runtime";
import {
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  fighterId,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { chatGptBattleSubjectExposure } from "./battle-operation-routing.ts";

describe("ChatGPT Battle operation ownership", () => {
  it("routes admitted Stat Block casts and long casting progress through cast_spell", () => {
    const validate = new AjvJsonSchemaValidator().getValidator(
      chatGptBattleExecutionInputSchema("cast_spell"),
    );
    for (const bonusSection of [false, true]) {
      const session = longCastingBattle({
        time: { kind: "action" },
        bonusSection,
      });
      const act = discoverBattleActCandidates(session.state).find(
        (candidate) =>
          candidate.subject.tag ===
          (bonusSection ? "bonusActionSpell" : "actionSpell"),
      );
      if (act === undefined)
        throw new Error("Expected admitted Stat Block cast.");
      const exposure = chatGptBattleSubjectExposure(session.state, act.subject);
      expect(Result.isSuccess(exposure)).toBe(true);
      if (Result.isFailure(exposure))
        throw new Error("Expected public cast route.");
      expect(exposure.success.tools).toEqual(["cast_spell"]);
      expect(validate({ subject: act.subject }).valid).toBe(true);
    }
    const initial = longCastingBattle().state;
    const start = castingAction(initial);
    const continuing = resolved(
      endTurn({ state: advance(initial), actorId: longCastingActorId }),
    );
    const continuation = castingAction(continuing);
    for (const [state, act] of [
      [initial, start],
      [continuing, continuation],
    ] as const) {
      const exposure = chatGptBattleSubjectExposure(state, act.subject);
      expect(Result.isSuccess(exposure)).toBe(true);
      if (Result.isFailure(exposure))
        throw new Error("Expected public long cast route.");
      expect(exposure.success.tools).toEqual(["cast_spell"]);
      expect(validate({ subject: act.subject }).valid).toBe(true);
    }
  });
  it("rejects missing procedure bindings and unavailable readied responses", () => {
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-routing-ownership"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const procedureRef = battleProcedureExecutionRefForTest("missing-binding");
    const subjects: readonly BattleSubject[] = [
      { tag: "unitFeature", actorId: fighterId, procedureRef },
      { tag: "unitFeature", actorId: goblinId, procedureRef },
      {
        tag: "actionSpell",
        actorId: fighterId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "actionSpell",
        actorId: goblinId,
        procedureRef,
        mode: { tag: "cast" },
      },
      {
        tag: "runtimeCommand",
        command: "releaseReadiedAction",
        actorId: fighterId,
        reactorId: fighterId,
      },
    ];
    for (const subject of subjects) {
      const route = chatGptBattleSubjectExposure(session.state, subject);
      expect(Result.isFailure(route)).toBe(true);
      expect(JSON.stringify(route)).toContain("CHATGPT_OPERATION_NOT_EXPOSED");
    }
  });
});
