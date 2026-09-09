import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { spellActivationEffectPath } from "@dnd/surface/surface/spell-mechanics-path";

import {
  sourceWith,
  scalarBuffTemporaryHitPointUpdates,
  expectedIssue,
} from "./support-spell-procedure-admission.test-support.js";

describe("Scalar-buff spell procedure admission", () => {
  test.each(scalarBuffTemporaryHitPointUpdates)(
    "rejects dropped scalar-buff temporary-hit-point %s at its effect path",
    (_label, update) => {
      const result = scalarBuffProfile.admitMechanics(
        sourceWith("false_life", (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected False Life activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "direct") {
            throw new Error("Expected False Life direct phase.");
          }
          const effect = phase.effects?.[0];
          if (effect?.kind !== "grant_temp_hp") {
            throw new Error("Expected False Life temporary-hit-point effect.");
          }
          return {
            ...mechanics,
            phases: [{ ...phase, effects: [update(effect)] }],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "scalarBuff",
            "effect",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ],
      });
    },
  );
});
