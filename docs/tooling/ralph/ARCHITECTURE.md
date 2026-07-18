# Ralph Tooling Architecture

This document owns stable architecture for the Ralph repository tooling. It
does not own D&D rules, product runtime structure, authored content, Cleanroom
SDK behavior, or the main application's package architecture.

Canonical boundary terminology lives in [CONTEXT.md](CONTEXT.md).

## Historical-Harness Boundary

The Ralph orchestrator is a clean tooling system. `scripts/ralph-run.sh` is a
one-off historical execution harness, not its architecture, compatibility
baseline, migration source, fallback scheduler, or runtime substrate. The
historical harness may supply candidate tooling requirements, failure evidence,
and design lessons. A candidate becomes an accepted tooling requirement only
when an owning decision or implementation specification explicitly accepts it.

The Ralph orchestrator must not invoke, wrap, resume, migrate, or preserve
behavioral parity with the historical harness. Historical plan indexes, shell
stages, claims, run directories, prompts, retained runs, and cleanup
conventions remain evidence outside the Ralph orchestrator's managed namespace.
Tracker claims, journal runs, attempts, sessions, evidence, and recovery state
are allocated and owned only through the orchestrator's typed ports.

## Documentation Authority

| Document or system                                                                 | Tooling authority                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Ralph tooling context](CONTEXT.md)                                                | Canonical boundary terminology and the tooling/main-application distinction      |
| This document                                                                      | Stable Ralph tooling structure and ownership boundaries                          |
| Accepted implementation specification                                              | Executable Ralph requirements and acceptance                                     |
| Canonical issue tracker                                                            | Work identity, accepted planning decisions, and dependency state                 |
| `plans/wayfinder/ralph-graph-native/`                                              | Historical investigation and decision evidence after accepted facts are promoted |
| [`scripts/ralph-run.md`](../../../scripts/ralph-run.md) and `scripts/ralph-run.sh` | Historical harness behavior only                                                 |

The main application's [root architecture](../../../ARCHITECTURE.md), D&D
[ubiquitous language](../../../UBIQUITOUS_LANGUAGE.md), and
[modeling assumptions](../../../ASSUMPTIONS.md) are not Ralph architecture
owners.
