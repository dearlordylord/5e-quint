# L3MSPELL-11 Spell Selected Identity Audit

Task 11 audited promoted spell Unit selected-identity replay evidence against
the production runtime reachability gate. No runtime behavior, Surface shape,
QNT owner, MBT driver, or generated coverage ledger was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting Spells` for
  the distinction between spell access, casting a spell, Spell Slot spending,
  Casting Time, Range, Targets, Saving Throws, Attack Rolls, Duration, and
  spell Effects.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Access, Spell Invocation, and Spell Effect ownership terms.
- `UBIQUITOUS_LANGUAGE.md#Action Lifecycle` for Resolve, Apply, Magic Action,
  Bonus Action, Reaction, and related runtime action terms.

No new D&D rule was modeled in this task. The audit checks that existing
selected Unit identity witnesses remain connected to the runtime-owned Spell
Invocation or Spell Effect paths rather than to driver-local projections.

## Existing Gate

`scripts/unit-profile-coverage-claim-scan.cjs` extracts every
`UNIT-IDENTITY-REPLAY` marker, the selected replay data consumed by the
deterministic test, the focused QNT `step` action set, and the owner/import
closure's runtime entrypoints.

`scripts/unit-profile-coverage-validation.cjs` rejects selected-identity replay
data when any of these facts are missing or stale:

- matching `unit-evidence.jsonl` `selected-identity-replay` row;
- deterministic replay consumer;
- non-empty replay actions;
- matching `UNIT-IDENTITY-REPLAY` marker and action set;
- action names declared by the driver schema or
  `defineSelectedIdentityReplayWitness`;
- action names reachable from a joined focused QNT replay `step` when that
  owner exists;
- production runtime entrypoint reachability.

For `packages/battle-runtime`, the reachability check requires the selected
identity owner/import closure to reach public runtime entrypoints such as
`startBattle`, `discoverBattleActs`, `resolveBattleSubject`, or
`resolveBattleInterrupt`, or package-public runtime code exported from
`src/index.ts` for projection-only owners. This is the real app/MCP-facing
runtime path, not a test-only action table.

## Audit Result

Read-only audit queries found:

- 108 supported or profile-subset-supported `kind: "spell"` Units with
  `spell.*` profiles.
- 0 supported or profile-subset-supported spell Units missing
  `selected-identity-replay` evidence.
- 108 promoted supported or profile-subset-supported spell Unit identities with
  selected-identity replay evidence.
- 109 `kind: "spell"` Unit identities total with selected-identity replay
  evidence.
- 203 selected replay rows scanned across all owners.
- 0 promoted spell Unit identities missing replay evidence or production
  reachability through the selected-identity hard gate.
- 0 selected-identity replay gaps in
  `plans/unit-profile-coverage/unit-matrix.json`.

The headline `selectedIdentityReplayCoverage` metric remains `157/161` because
that metric's denominator is installed Units with `supported-profile` claims.
The four `supported-profile` Units without direct evidence are non-spell
deterministic Character Creation or Character Sheet projection rows with
explicit whole-claim `selectedIdentityEvidenceDisposition: not-applicable`.
If `profile-subset-supported` rows are included in a broader audit, there are
five whole-claim non-applicable non-spell rows because one delegated-action
feature row is also outside selected-identity replay. None of those rows are
promoted spell profiles or Task 11 work.

The two spell rows with deferred selected-identity non-applicable dispositions
still have selected-identity replay evidence for their promoted runtime-owned
spell portions. Their deferred mechanics remain outside the promoted battle
runtime boundary and do not create replay gaps.

## Boundary Decision

Promoted spell profiles currently satisfy the selected-identity audit. The
selected authored Unit identity flows through the same production reducer or
package-public runtime path that application and MCP callers would reach:
selected-identity evidence binds a concrete Unit id to executable discovery and
resolution, while the runtime behavior remains admitted by parsed Surface
shape, support-profile facts, typed invocation/effect state, and explicit
runtime witnesses.

No spell-specific adapter, alternate replay registry, duplicate selected-id
state, or authored-identity dispatch should be added for this task. The
default `pnpm unit-profile-coverage:check` path run by `pnpm quality` validates
existing selected-identity replay rows, replay markers, focused QNT step
reachability, production reachability, and generated matrix freshness. The
fail-closed check for newly supported executable Units that are missing
selected-identity evidence is the explicit hard-gate command:
`pnpm unit-profile-coverage:check -- --selected-identity-hard-gate`.

## Plan Impact

- L3MSPELL-11 can close as audit complete.
- L3MSPELL-12 should treat selected-identity replay as already green for
  promoted spell profiles and should consume this note when consolidating
  spell-boundary evidence.
- The remaining `selectedIdentityReplayCoverage` denominator gap is non-spell
  deterministic projection work and should not block spell boundary
  consolidation.

## Reviewer Loop Convergence

- Round 1: rejected adding new MBT drivers or replay evidence rows. The
  existing generated matrix and scanner already show no promoted spell replay
  gaps and no spell-scoped production-reachability failures.
- Round 2: retained the existing selected-identity gate as the executable
  invariant. It localizes the connascence between evidence rows, replay
  markers, driver action names, focused QNT step actions, deterministic test
  consumers, and runtime entrypoint reachability.
