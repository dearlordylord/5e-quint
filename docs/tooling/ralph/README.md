# Retired Ralph harness

The repository-local Ralph delivery harness was retired by
[issue #334](https://github.com/dearlordylord/5e-quint/issues/334). No tracked
entrypoint, public package script, current delivery workflow, or active
canonical plan depends on it. Git history is the archive for its runner,
runbook, tests, lane entrypoint, and level 1–12 task index.
Existing ignored `.ralph/` runtime artifacts and `.ralphrc` files are local
history only; no repository command reads or maintains them.

Ralph's graph-native successor is owned by the separate
[Dalph repository](https://github.com/dearlordylord/dalph). This repository does
not contain Dalph architecture, a compatibility layer, a fallback scheduler,
or a replacement orchestrator.

Useful product evidence was not retired with the harness. Generated SRD mining
and coverage evidence remains under
[`plans/unit-profile-coverage/`](../../../plans/unit-profile-coverage/) and
[`plans/rules-kernel-coverage/`](../../../plans/rules-kernel-coverage/). Parked,
non-runnable QNT research remains in
[`plans/QNT_GENERATOR_READINESS_BACKLOG.md`](../../../plans/QNT_GENERATOR_READINESS_BACKLOG.md)
and must be reopened through a tracker-authoritative delivery issue.

The shared broad/MBT resource wrappers remain repository infrastructure. New
checkouts coordinate on `dnd-heavy-verification.lock`; the wrappers also acquire
the three retired `ralph-*.lock` filenames so older linked worktrees in the same
Git common directory cannot overlap current verification. Those files are
cross-revision lock aliases only and carry no harness or Dalph semantics.
