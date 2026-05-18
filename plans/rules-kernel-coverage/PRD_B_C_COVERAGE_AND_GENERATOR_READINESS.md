# PRD: Rules Kernel Coverage Closure And Generator Readiness

## Problem Statement

The project has a strong QNT/MBT lane, but the goal is larger than selected
parity. The rules kernel should eventually be trusted as QNT-first: current TS
reducers should be fully connected to QNT today, and later the QNT semantic core
should be structured enough to generate a Rust reducer kernel.

There are two distinct problems:

- **B: Coverage closure.** We need to prove that every reducer semantic currently
  supported by TS has a semantic obligation, QNT ownership, and an executable TS
  parity witness.
- **C: Generator readiness.** We need to reshape and classify QNT so it can serve
  as a future implementation source, not only as proof/MBT oracle.

These must remain separate. B establishes trust in current TS behavior. C
prepares for future replacement of TS implementation logic. Combining them would
make coverage closure depend on broad QNT architecture refactoring and would
hide the actual coverage denominator.

## Solution

Close the existing rules-kernel coverage baseline first, then run a separate
generator-readiness program.

For B, the rules-kernel coverage lane becomes the source of truth for
TS-current reducer semantic coverage. A reducer feature counts as covered only
when the chain is complete:

```text
Surface record
  -> deterministic admission/projection evidence
  -> support profile
  -> semantic obligation id
  -> QNT owner
  -> executable TS parity witness
```

For C, the QNT corpus is classified and refactored toward a generation-ready
semantic core. The output is not generated Rust. The output is a disciplined
QNT architecture, generation subset, readiness matrix, and manually validated
dry run that makes a future generator plausible.

## User Stories

1. As the project owner, I want every current reducer semantic to have a stable obligation id, so that coverage is measured by domain meaning instead of code coverage.
2. As the project owner, I want every obligation to name a QNT owner, so that reducer semantics have a formal source.
3. As the project owner, I want every covered obligation to name a TS parity witness, so that QNT is connected to current production behavior.
4. As the project owner, I want Surface catalog breadth separated from reducer semantics, so that MBT does not explode across catalog records and game states.
5. As a runtime maintainer, I want every supported Surface executable profile to map to a covered obligation, so that “Surface supported” cannot bypass QNT semantics.
6. As a runtime maintainer, I want parser-only and catalog-only support classified outside the QNT denominator, so that coverage does not turn into the entire product backlog.
7. As a runtime maintainer, I want every Battle hole kind classified, so that legal next-move frontiers cannot remain implicit.
8. As a runtime maintainer, I want option frontiers modeled semantically, so that available choices exposed to clients are treated as core reducer logic.
9. As a runtime maintainer, I want concrete Surface option enumeration covered deterministically, so that QNT does not enumerate full catalogs.
10. As a battle-runtime contributor, I want movement, reactions, spells, features, stat-block controls, active effects, resources, and holes covered as separate obligations, so that each reducer family has a clear owner.
11. As a character-creation contributor, I want supported choices, fill validation, batch atomicity, advancement, and finalization covered as obligations, so that character creation is not treated as a battle-only afterthought.
12. As a character-sheet contributor, I want HP, rests, Hit Dice, spell slots, pact slots, Lay On Hands, Arcane Recovery, Armor Class, and weapon mastery reselection covered as obligations, so that session state mutations are QNT-connected.
13. As a character-battle contributor, I want battle initialization and handoff settlement covered as obligations, so that composition does not duplicate or lose runtime facts.
14. As a reviewer, I want transitional gaps reported explicitly, so that closure work can be planned without pretending the baseline is already complete.
15. As a reviewer, I want the checker to fail on unknown markers or stale generated reports, so that documentation drift is caught mechanically.
16. As a future generator author, I want to know which QNT files are semantic core, proof-only, MBT fixture, bridge, selected identity trace, or legacy, so that generator inputs are not guessed.
17. As a future generator author, I want a documented generation subset, so that QNT intended for code generation uses stable constructs.
18. As a future generator author, I want generation-blocking fixture assumptions identified, so that `Fighter | Goblin`-style bounded worlds do not leak into a Rust ABI.
19. As a future generator author, I want kernel IR types identified, so that command, fill, result, state, active-effect, and profile boundaries are explicit before generator work begins.
20. As the project owner, I want C to stop before Rust generation, so that generator readiness can be reviewed before committing to a generator architecture.

## Implementation Decisions

- B and C are separate phases with separate done states.
- B uses TS-current reducer semantics as the denominator. Unsupported future SRD pressure is not in scope.
- A reducer semantic is any branch or state transition that changes legal table-observable game state or legal next moves.
- Public protocol failures, malformed payloads, unknown ids, and parser errors are boundary-only unless they encode a rule-semantic rejection.
- Surface support requires production admission into a typed executable support profile plus an executable runtime path. Schema/catalog presence alone is not support.
- The primary manifest is profile-centered. Surface records are evidence rows that point to profiles.
- Support profiles are split by reducer procedure shape, not by authored name.
- Composed profiles are allowed, but composition obligations must expose sequencing, shared resources, active-effect handoff, and cleanup points.
- QNT owns abstract option legality, cardinality, timing, and effects. Deterministic Surface evidence owns concrete option enumeration and display payloads.
- B closure removes transitional `needs-*` statuses from the baseline before the lane becomes mandatory for new reducer semantics.
- C introduces generator-readiness statuses without requiring generated Rust.
- C classifies QNT file roles before refactoring.
- C defines a generation subset before any generator is built.
- C identifies kernel IR boundaries before any generated Rust ABI is attempted.
- C includes one manual dry run from QNT semantic core to hypothetical Rust types/functions, but does not implement the generator.

## Testing Decisions

- The rules-kernel coverage checker is the main gate for manifest consistency.
- Covered obligations require source markers for QNT owner, runtime owner, and parity witness.
- Parity witnesses must be executable and QNT-connected.
- Focused MBT is used for sequencing, holes, reactions, resources, active effects, and interleavings.
- Deterministic QNT replay is acceptable for fixed projection/scalar obligations.
- QNT-generated projection checks are acceptable when QNT is the oracle and TS is mechanically compared against it.
- Plain TS unit tests do not count as full-circle QNT coverage by themselves.
- Deterministic Surface admission/projection tests count for the Surface-to-profile link, not for profile semantics by themselves.
- Existing unit-profile and raw-coverage lanes remain separate and should continue to validate alongside rules-kernel coverage.
- MBT remains scarce and should not be used for exploratory catalog enumeration.

## Out of Scope

- Implementing Stage D or E Rust generation.
- Replacing TS reducers.
- Enumerating all Surface catalog records through MBT.
- Modeling UI display payloads, labels, descriptions, sort order, or provenance strings in QNT.
- Expanding runtime support to currently unsupported SRD features.
- Treating parser-only or catalog-only Surface records as reducer-kernel support.
- Fixing unrelated raw-coverage drift unless it blocks rules-kernel coverage closure.

## Further Notes

B is done when no transitional coverage gaps remain for TS-current reducer
semantics, and the checker can be made mandatory for new reducer changes.

C is done when the QNT corpus has a reviewed generator-readiness classification,
a documented generation subset, identified kernel IR boundaries, a refactor plan
for role separation, and one manual dry run proving the subset can express a
small generated Rust kernel slice later.

Only after C should the project consider D/E work: building and expanding an
actual Rust generator.
