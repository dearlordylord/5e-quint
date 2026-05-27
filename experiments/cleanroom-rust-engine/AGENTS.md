# Cleanroom Agent Instructions

You are working in a cleanroom experiment. The purpose is to test whether agents
can build a Rust D&D rules engine from QNT plus RAW only.

## Source Boundary

Allowed source material:

- `input/**`
- files in this experiment directory
- Rust standard library and Cargo documentation available from local tooling

Forbidden source material:

- production TypeScript runtime code outside this experiment
- production TypeScript tests outside this experiment
- generated JS/checker implementation outside this experiment
- old worktrees or Ralph task branches

If a rule cannot be derived from `input/**`, record the gap in
`tasks/CLEANROOM_RESEARCH_LOG.md` instead of copying from production code.

## Scope

Build a Rust rules engine for SRD level 1-2:

- character creation: draft holes, fills, rejection, finalization, level 1-2
  progression, and character build facts needed by battle;
- battle: reducer-owned level 1-2 mechanics represented by the cleanroom QNT
  obligations;
- table-owned facts: represent as explicit caller inputs/witnesses, not as
  hidden AI or invented runtime behavior.

Out of scope:

- PHB+ authored identity;
- production TypeScript compatibility;
- UI, MCP protocol, persistence, networking;
- game AI for companions or creatures;
- whole-battle exhaustive state-space modeling.

## Engineering Rules

- Make invalid states unrepresentable where practical.
- Prefer typed Rust enums/structs over stringly protocols.
- Do not dispatch runtime behavior on authored spell/class/feature names.
- Keep character creation and battle as separate modules joined by explicit
  projection types.
- Add tests for every implemented rule slice.
- When blocked, write the smallest factual blocker note possible in
  `tasks/CLEANROOM_RESEARCH_LOG.md`.
