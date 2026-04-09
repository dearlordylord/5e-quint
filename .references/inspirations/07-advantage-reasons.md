# 07. Named Advantage / Disadvantage Reasons

## Idea

Preserve the reasons behind advantage and disadvantage instead of only the final booleans.

## Current Fit In This Repo

- `UBIQUITOUS_LANGUAGE.md` defines the rules precisely.
- `packages/core/src/types.ts` uses boolean-style mod summaries like `hasAdvantage` and `hasDisadvantage`.
- many feature modules express one-off booleans such as target disadvantage on next attack or advantage on the next attack vs target.

## Application To Our Code

This should mainly improve debugging, trace readability, and action explanations.

Potential reason families:

- condition source
- unseen/visibility source
- range source
- feature source
- spell source
- environment source

The final cancellation rule remains binary. The reasons are support metadata.

## Quint Impact

Low for the authoritative semantics. Quint mostly cares whether the roll has advantage, disadvantage, or both. Carrying complete reason chains in the spec would likely add noise unless a specific invariant needs them.

## Domain Language Impact

Moderate to high in tooling. It would improve MBT failure analysis and user-facing explanations.

## Recommendation

Adopt in TS traces, debug snapshots, and available-action/outcome explanations. Do not bloat the core Quint state with full reason chains unless a correctness need emerges.
