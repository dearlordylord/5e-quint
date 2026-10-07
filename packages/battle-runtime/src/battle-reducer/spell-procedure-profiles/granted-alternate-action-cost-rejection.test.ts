import { expect, test } from "vitest";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { grantedAlternateActionCostProfile } from "./bonus-action-dash.ts";
import { mechanicsSource } from "./support-spell-procedure-admission.test-support.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";

type Ongoing = Extract<SpellMechanics, { family: "ongoing_effect" }>;
function expectIssues(
  update: (mechanics: Ongoing) => Ongoing,
  failedFacts: readonly string[],
) {
  const base = spellRecord("expeditious_retreat");
  if (base.mechanics.family !== "ongoing_effect")
    throw new Error("Expected ongoing Dash permission.");
  const record = decodeSpellRecordForTest({
    ...base,
    id: "synthetic_alternate_action_cost_rejection",
    name: "Synthetic Alternate Action Cost Rejection",
    provenance: {
      kind: "synthetic-test",
      section: "alternate_action_cost_rejection",
    },
    mechanics: update(base.mechanics),
  });
  const result = grantedAlternateActionCostProfile.admitMechanics(
    mechanicsSource(spellAdmissionSource(record)),
  );
  expect(result.tag).toBe("unsupported");
  if (result.tag !== "unsupported")
    throw new Error("Expected unsupported authored mechanics.");
  expect(result.issues.map((issue) => issue.failedFact)).toEqual(
    expect.arrayContaining(failedFacts),
  );
}
test("an unrelated ongoing effect cannot replace the authored Dash permission", () => {
  expectIssues(
    (mechanics) => ({
      ...mechanics,
      operations: mechanics.operations.map((operation) => ({
        ...operation,
        effect: { kind: "none" },
      })),
    }),
    ["operationEffect"],
  );
});
test("additional ongoing operations are individually rejected rather than dropped", () => {
  expectIssues(
    (mechanics) => {
      const operation = mechanics.operations[0];
      if (operation === undefined)
        throw new Error("Expected authored Dash operation.");
      return { ...mechanics, operations: [operation, operation, operation] };
    },
    ["operationCount"],
  );
});
test("an alternate action grant cannot change the permitted standard action", () => {
  expectIssues(
    (mechanics) => ({
      ...mechanics,
      operations: mechanics.operations.map((operation) => {
        if (operation.effect.kind !== "grant_alternate_action_cost")
          throw new Error("Expected alternate action cost.");
        return {
          ...operation,
          effect: {
            ...operation.effect,
            from: { kind: "standard_action", actions: ["disengage"] },
          },
        };
      }),
    }),
    ["operationEffect"],
  );
});
test("unsupported headers and initial phase remain distinct reported obligations", () => {
  expectIssues(
    (mechanics) => {
      const { initialPhase, ...root } = mechanics;
      expect(initialPhase).toBeDefined();
      return {
        ...root,
        level: 2,
        castingTime: { kind: "action" },
        range: { kind: "touch" },
        duration: { kind: "instantaneous" },
        attachment: {
          kind: "target",
          selection: { mode: "one", targetKinds: ["creature"] },
        },
      };
    },
    ["level", "castingTime", "range", "duration", "attachment", "initialPhase"],
  );
});

test("a conditional Dash permission is rejected instead of becoming passive", () => {
  expectIssues(
    (mechanics) => ({
      ...mechanics,
      operations: mechanics.operations.map((operation) => ({
        ...operation,
        trigger: { kind: "on_caster_turn_start" },
      })),
    }),
    ["operation"],
  );
});
test("a non-Dash initial action cannot be executed by this profile", () => {
  expectIssues(
    (mechanics) => {
      const initialPhase = mechanics.initialPhase;
      if (initialPhase?.kind !== "direct")
        throw new Error("Expected direct initial Dash.");
      return {
        ...mechanics,
        initialPhase: {
          ...initialPhase,
          effects: [
            {
              kind: "take_standard_action",
              action: "disengage",
              cost: "included_in_effect",
            },
          ],
        },
      };
    },
    ["initialEffect"],
  );
});
