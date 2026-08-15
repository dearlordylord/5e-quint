import { describe, expect, test } from "vitest";

import { retainedProgramSessionAudit } from "./fixed-baseline-measurement.ts";

describe("fixed baseline omission audit", () => {
  test("distinguishes projected tactical reads from discarded observation copies", () => {
    expect(
      retainedProgramSessionAudit(`
        const phase = context.session.battle.state.subjectResolutionPhase;
        return {
          kind: "continue",
          session: context.session,
          observation: {
            battle: context.session.battle,
            battlefield: context.session.battlefield,
          },
        };
      `),
    ).toEqual({
      subjectResolutionPhaseReferences: 1,
      discardedFullObservationCopies: 2,
      unsupportedSessionReferences: [],
    });
    expect(
      retainedProgramSessionAudit(
        "const hidden = context.session.battle.state.combatants;",
      ),
    ).toMatchObject({
      unsupportedSessionReferences: ["context.session.battle.state.combatants"],
    });
  });
});
