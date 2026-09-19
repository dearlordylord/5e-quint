---
status: accepted
---

# Battle pending procedures derive from canonical execution requests

Battle Runtime distinguishes the replay root from the procedure that currently
needs input. The replay root remains the selected `BattleSubject` and its
ordered accepted Fill prefix under the ordinary replay contract established by
ADR-0009. Each turn-boundary Hole return instead constructs one ephemeral,
typed execution request classified as outgoing end-turn work, start-turn
occurrence ordering, or one incoming start-turn occurrence. The classification
correlates the ending actor with the incoming source turn and, for an individual
occurrence, its canonical occurrence identity and kind. An ordinary request
outside turn-boundary execution is subject resolution. Runtime and public frontier
projections exhaustively match that request rather than infer procedure timing
or ownership from Hole kinds.

The request classification is not Battle state and does not commit ordinary
turn-boundary progress. While an ordinary request is open, the durable
checkpoint remains the state before End Turn replay, and every retry replays
the same subject with the complete accepted Fill prefix. Hole order,
applicability rechecks, turn advancement, duration processing, and rule outcomes
remain owned by the existing execution sequence.

Interrupted start-turn work derives the same pending-procedure meaning from the
canonical `BattleStartTurnOccurrenceSequenceCheckpoint`. That checkpoint alone
owns the ending actor, incoming source turn, exact occurrence sequence,
completed child-Hole prefix, round-duration cohort, and interrupted child
continuation. It retains the ending actor once because neither the advanced
checkpoint nor every delegated replay subject can recover that fact. Recovery
derives the currently executing occurrence from this sequence and projects the
pending procedure from those correlated facts; it does not persist another
ordinary cursor, copy the sequence or duration cohort into presentation state,
or maintain a procedure registry beside execution.

While a Reaction interrupt is active, the interrupt decision or selected
Reaction procedure describes the input currently needed. The enclosing
turn-boundary procedure remains in its canonical continuation rather than being
published as the active procedure. After the interrupt closes, resumed boundary
work again derives its current occurrence from that continuation.

## Considered options

- **Infer a pending procedure from the returned Holes** — rejected because a
  Hole describes the input shape, not the procedure timing, replay root, or
  actor ownership. The same Hole family can occur in different procedures.
- **Persist an ordinary turn-boundary cursor** — rejected because partial
  ordinary progress would contradict atomic replay and create a second owner
  for occurrence ordering, applicability, and duration processing.
- **Construct public procedure metadata independently** — rejected because a
  presentation-only classifier or registry could drift from the execution
  branch that actually requested input.

## Consequences

Every turn-boundary branch that returns Holes must supply the canonical typed
request at that return site. Public schemas and consumers may project the
request, but cannot reconstruct it from Hole kinds. Runtime-owned interrupt
checkpoints remain durable and ordinary turn-boundary requests remain
replay-only, so the two continuation ownership modes stay distinct even when
they describe the same incoming start-turn procedure.
