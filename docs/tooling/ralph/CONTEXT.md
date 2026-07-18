# Ralph Tooling Context

This context names repository delivery-orchestration concepts. It is separate
from the D&D application, Cleanroom SDK, and Mushroom Playbook domains.

## Language

**Main application**:
The D&D product system built from the repository's packages, rules models,
runtimes, MCP surface, and React UI.
_Avoid_: Ralph, delivery tooling

**Repository tooling**:
Software that builds, verifies, plans, or delivers changes to the main
application without becoming part of its product runtime or domain model.
_Avoid_: Main application, product runtime

**Ralph orchestrator**:
The graph-native repository tooling being designed to coordinate delivery work.
_Avoid_: New `ralph-run.sh`, shell-harness replacement

**Historical Ralph harness**:
The one-off `scripts/ralph-run.sh` experiment and its execution formats.
_Avoid_: Ralph architecture, compatibility baseline, legacy runtime

**Candidate tooling requirement**:
A possible Ralph requirement mined from evidence but not yet accepted by an
owning decision or implementation specification.
_Avoid_: Requirement, contract

**Accepted tooling requirement**:
A Ralph requirement explicitly selected by its owning tooling decision or
implementation specification.
_Avoid_: Observed shell behavior, candidate

**Managed execution**:
A run, attempt, claim, session, or artifact created and namespaced by the Ralph
orchestrator.
_Avoid_: Historical harness run, pre-existing workspace
