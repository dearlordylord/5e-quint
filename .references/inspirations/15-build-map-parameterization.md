# 15. Build-Map Parameterization

## Idea

Represent action parameter collection as an explicit “what choice is needed next?” protocol.

## Current Fit In This Repo

- `packages/core/src/available-actions.ts` already exposes holes and fillable action tokens.
- the design is strong, but some tokens still feel like static payloads rather than a progressive parameterization protocol.

## Application To Our Code

This is a good fit for:

- available actions
- MCP action execution
- future transcript candidate disambiguation
- battle-only action holes such as target, slot level, reaction choice

The build-map idea should be adapted to the current hole model, not replace it.

Possible refinement:

- each hole has a domain name
- each hole states its legality source
- each hole states whether filling it can narrow later holes

That would make action-token filling more compositional without introducing UI-specific abstractions.

## Quint Impact

Low directly. The benefit is that support layers can expose the spec’s legal branch points more faithfully.

## Domain Language Impact

Moderate. It can sharpen how the repo talks about `choice`, `hole`, `instance`, `filled token`, and `execution`.

## Recommendation

Adopt as an evolution of the current hole-based available-action system. This is support-layer work that can improve the legibility of spec-derived options without changing semantic ownership.
