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
