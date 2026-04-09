# 13. Result Values For Action Outcomes

## Idea

Return typed result values from actions instead of relying on incidental state changes or exceptions.

## Current Fit In This Repo

- the repo already uses `effect`, so typed success/failure values are idiomatic.
- available actions already package costs and outcome summaries.
- battle and machine support code still contains many helper paths where intent and effect are mixed.

## Application To Our Code

There are two good uses here:

- support-layer helpers should expose explicit result values when rejecting or projecting an action
- available-action execution and MCP boundaries should speak in typed outcomes rather than implicit side effects

The spec itself does not need a result monad. Quint state transitions already encode the authoritative result.

## Quint Impact

Low directly. This is mainly about improving TS support clarity around the spec.

## Domain Language Impact

Moderate. It would make phrases like `illegal`, `rejected`, `committed`, `refunded`, and `applied` more precise at API boundaries.

## Recommendation

Adopt at TS/API boundaries, not inside the spec. This is a support-layer cleanup that helps projections stay honest about what the spec decided.
