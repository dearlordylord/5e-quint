---
status: accepted
---

# Battle continuation uses ordinary replay and durable interrupt checkpoints

Ordinary Runtime Hole continuation replays one typed Battle subject and its
ordered accepted fills from the preceding durable Battle checkpoint. An open
ordinary procedure does not commit partially applied procedure state; rejection
preserves the checkpoint, accepted fills, and frontier for retry.

An interrupt is different: opening a Reaction window establishes a durable
mechanical checkpoint owned by Battle Runtime. The checkpoint state owns spent
Reactions; its typed interrupt frames retain the admitted responder, nested
procedure, and exact outer continuation so callers cannot forge sequencing or
double-spend resources. The runtime resumes that continuation after the
interrupt resolves. Interactive Play Session recovery may persist and
reconstruct these checkpoints.

Checkpoint snapshots, continuation frontiers, and presentation are separate
projections. A continuation result exposes one checkpoint and exactly one
frontier: available Acts, non-empty Runtime Holes, or one interrupt decision.
Presentation joins remain outside reducer state.

The Cleanroom Opaque Oracle composes this production protocol inside one fresh,
call-local evaluation. Oracle Cases and Traces expose no Play Session identity,
interrupt frames, partial procedure state, or transport state. Statelessness at
that boundary does not replace the product's durable interrupt protocol.

## Considered options

- **Replay interrupt decisions from one caller-owned prefix** — rejected. It
  externalizes runtime sequencing, weakens the Reaction-spend ownership
  boundary, duplicates established recovery behavior, and is not required for
  a stateless Oracle boundary.
- **Make the interactive Battle protocol match the Oracle wire contract** —
  rejected. The Oracle is a projection of production behavior for conformance;
  it does not own product state or consumer architecture.
