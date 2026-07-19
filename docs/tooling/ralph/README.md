# Dalph relocation

Ralph's graph-native orchestration architecture, accepted specification,
Wayfinder decisions, prototypes, and implementation tickets moved to the
[Dalph repository](https://github.com/dearlordylord/dalph).

## Historical-harness boundary

The local [`scripts/ralph-run.sh`](../../../scripts/ralph-run.sh) remains a
one-off historical D&D delivery harness. It is not Dalph architecture, a
compatibility baseline, a migration source, a fallback scheduler, or a runtime
substrate. Its checked-in plans and runbook are retained only as local delivery
history.

Canonical Dalph terminology and architecture now live in
[`docs/CONTEXT.md`](https://github.com/dearlordylord/dalph/blob/master/docs/CONTEXT.md)
and
[`docs/ARCHITECTURE.md`](https://github.com/dearlordylord/dalph/blob/master/docs/ARCHITECTURE.md).
The accepted implementation specification is
[Dalph issue #24](https://github.com/dearlordylord/dalph/issues/24).

