import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { describe, expect, it } from "vitest";
import { unitLibrary } from "./battle-runtime.test-support.ts";
import { statBlockSpellInvocationAdmissionPlan } from "./stat-block-spell-invocation-admission-plan.ts";

describe("Stat Block invocation candidate admission plan", () => {
  it("retains the complete shipped candidate space including unresolved definitions", () => {
    const plans = srdStatBlockCollection.statBlocks.flatMap((record) =>
      statBlockSpellInvocationAdmissionPlan(record, unitLibrary),
    );
    const unrestricted = plans.filter(
      (candidate) =>
        candidate.definitionJoin.kind === "joined" &&
        candidate.definitionJoin.value.continuation.kind === "unrestricted",
    );
    const authoredReferences = srdStatBlockCollection.statBlocks.flatMap(
      (record) =>
        [
          ...(record.statBlock.actions ?? []),
          ...(record.statBlock.bonusActions ?? []),
        ].flatMap((entry) =>
          entry.kind !== "executable" || entry.procedure.kind !== "spellcasting"
            ? []
            : entry.procedure.groups.flatMap((group) => group.spells),
        ),
    );
    const authoredUnrestricted = authoredReferences.filter(
      (reference) => reference.restriction === undefined,
    );
    expect(authoredUnrestricted).toHaveLength(286);
    expect(plans).toHaveLength(authoredReferences.length);
    expect(unrestricted).toHaveLength(285);
    expect(
      plans.some(
        (candidate) => candidate.definitionJoin.kind === "missingDefinition",
      ),
    ).toBe(true);
    expect(
      plans.some(
        (candidate) =>
          candidate.definitionJoin.kind === "joined" &&
          candidate.definitionJoin.value.continuation.kind === "restricted",
      ),
    ).toBe(true);
  });
});
