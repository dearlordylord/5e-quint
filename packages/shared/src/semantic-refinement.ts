/**
 * Reasons for a schema refinement that is meaningful to runtime admission but
 * cannot be represented by the published Draft JSON Schema.
 */
export const SEMANTIC_REFINEMENT_REASONS = [
  "canonicalExecutionReferenceSyntax",
  "creationHoleIdSyntax",
  "creationHoleSourceCorrelation",
  "creationHoleCardinalityCorrelation",
  "creationFrontierCorrelation",
  "checkpointFrontierCorrelation",
  "corpusBatchTraceLengthCorrelation",
  "constraintFreeBrand",
] as const;

export type SemanticRefinementReason =
  (typeof SEMANTIC_REFINEMENT_REASONS)[number];

/** Stable symbol so all schema owners attach the same source AST annotation. */
export const SemanticRefinementAnnotationId = Symbol.for(
  "dnd/semantic-refinement-reason",
);

export function semanticRefinement(reason: SemanticRefinementReason): {
  readonly [SemanticRefinementAnnotationId]: SemanticRefinementReason;
} {
  return { [SemanticRefinementAnnotationId]: reason };
}

export function isSemanticRefinementReason(
  value: unknown,
): value is SemanticRefinementReason {
  return SEMANTIC_REFINEMENT_REASONS.some((reason) => reason === value);
}
