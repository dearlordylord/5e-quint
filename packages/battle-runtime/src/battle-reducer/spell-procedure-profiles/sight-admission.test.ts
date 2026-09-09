import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import {
  spellActivationEffectPath,
  spellActivationPhasePath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  sourceWith,
  directPhaseModeUpdate,
  expectedIssue,
} from "./support-spell-procedure-admission.test-support.js";

describe("Sight spell procedure admission", () => {
  test("rejects direct-phase mode for scalar buffs and sight at the phase path", () => {
    for (const [spellId, profile, procedure] of [
      ["longstrider", scalarBuffProfile, "scalarBuff"],
      [
        "see_invisibility",
        seeInvisibleObserverSightProfile,
        "seeInvisibleObserverSight",
      ],
    ] as const) {
      const result = profile.admitMechanics(
        sourceWith(spellId, (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "direct") {
            throw new Error("Expected direct activation phase.");
          }
          return {
            ...mechanics,
            phases: [directPhaseModeUpdate(phase)],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            procedure,
            "mode",
            spellActivationPhasePath(PositiveInteger(1)),
          ),
        ],
      });
    }
  });

  test("selects the semantic sight direct phase and reports its prepended sibling ordinal", () => {
    const result = seeInvisibleObserverSightProfile.admitMechanics(
      sourceWith("see_invisibility", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected See Invisibility direct phase.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, effects: [{ kind: "none" }] }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "seeInvisibleObserverSight",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the sight effect by semantic kind and reports its actual effect ordinal", () => {
    const result = seeInvisibleObserverSightProfile.admitMechanics(
      sourceWith("see_invisibility", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected See Invisibility direct phase.");
        }
        Reflect.set(phase, "effects", [
          { kind: "none" },
          ...(phase.effects ?? []),
        ]);
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "seeInvisibleObserverSight",
          "phaseCount",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });
  });
});
