# Dalph relocation

Ralph's graph-native orchestration architecture, accepted specification,
Wayfinder decisions, prototypes, and implementation tickets moved to the
[Dalph repository](https://github.com/dearlordylord/dalph).

## Historical-harness boundary

The local [`scripts/ralph-run.sh`](../../../scripts/ralph-run.sh) remains a
repository-specific D&D delivery harness. It is not Dalph architecture, a
compatibility baseline, a migration source, a fallback scheduler, or a runtime
substrate. Its checked-in plans and runbook govern only repository-local D&D
deliveries and carry no authority beyond that role.

The tracked [`.ralph/`](../../../.ralph/README.md) directory exposes
repository-local lane entrypoints for this harness. It deliberately contains
no copied task graph or runtime state; each entrypoint selects a canonical plan
from [`plans/`](../../../plans/) and delegates to `scripts/ralph-run.sh`.

Canonical Dalph terminology and architecture now live in
[`docs/CONTEXT.md`](https://github.com/dearlordylord/dalph/blob/master/docs/CONTEXT.md)
and
[`docs/ARCHITECTURE.md`](https://github.com/dearlordylord/dalph/blob/master/docs/ARCHITECTURE.md).
The accepted implementation specification is
[Dalph issue #24](https://github.com/dearlordylord/dalph/issues/24).
