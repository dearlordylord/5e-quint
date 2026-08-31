import { describe, expect, it } from "vitest";

import {
  isSemanticRefinementReason,
  SEMANTIC_REFINEMENT_REASONS,
  semanticRefinement,
  SemanticRefinementAnnotationId,
} from "./semantic-refinement.ts";

describe("semantic refinement annotations", () => {
  it("attaches every supported reason under the shared symbol", () => {
    for (const reason of SEMANTIC_REFINEMENT_REASONS) {
      expect(isSemanticRefinementReason(reason)).toBe(true);
      expect(semanticRefinement(reason)).toEqual({
        [SemanticRefinementAnnotationId]: reason,
      });
    }

    expect(
      isSemanticRefinementReason("canonicalExecutionReferenceSyntax"),
    ).toBe(true);
    expect(
      semanticRefinement("constraintFreeBrand")[SemanticRefinementAnnotationId],
    ).toBe("constraintFreeBrand");

    expect(SemanticRefinementAnnotationId).toBe(
      Symbol.for("dnd/semantic-refinement-reason"),
    );
  });

  it("rejects values outside the published reason vocabulary", () => {
    expect(isSemanticRefinementReason("unknownReason")).toBe(false);
    expect(isSemanticRefinementReason(undefined)).toBe(false);
    expect(isSemanticRefinementReason(null)).toBe(false);
    expect(isSemanticRefinementReason({})).toBe(false);
  });
});
