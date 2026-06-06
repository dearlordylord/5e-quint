# L3MMETA-05 Antimagic QNT Proof Evidence Audit

Task 5 audits whether the Antimagic Field MBT QNT drivers should contribute
profile-level QNT proof evidence or stay explicitly classified as MBT-only
witnesses.

## RAW And Language Check

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 208-223 for
  Antimagic Field.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 430-436 for Emanation.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 698-704 for Magic Action and
  Magical Effect.
- `UBIQUITOUS_LANGUAGE.md` Spellcasting and Action Lifecycle entries for Magic
  Action, Spell Invocation, and Spell Effect.

Relevant modeled clauses:

- Antimagic Field creates a self-range 10-foot Emanation.
- Creatures inside the aura cannot cast spells or take Magic Actions.
- Spells, magic items, and other magical effects cannot target or otherwise
  affect things inside the aura.
- Ongoing spells are suppressed rather than deleted, with Artifact/deity
  exceptions and duration still ticking.

## Owner Audit

| Profile | QNT artifact | Current role | Audit decision |
| --- | --- | --- | --- |
| `spell.invocation-antimagic-field-ongoing-spell-suppression` | `packages/battle-runtime/battle-runtime-antimagic-suppression.qnt` plus `packages/battle-runtime/battle-runtime-antimagic-suppression-tests.qnt` | semantic core plus qnt-proof verification owner | Keep as proof evidence. The focused non-`.mbt.qnt` slice models executable suppression state, tracked ongoing Spell Effect refs, slot/action spend, Concentration, duration, and cleanup. |
| `spell.invocation-antimagic-field-action-interdiction` | `packages/battle-runtime/battle-runtime-antimagic-field-action-interdiction.mbt.qnt` | `mbt-fixture` | Keep MBT-only. The driver is a self-contained literal projection witness; the TypeScript MBT driver executes production reducers and compares projections. It does not derive a reusable QNT reducer semantic core or run-block proof evidence. |
| `spell.invocation-antimagic-field-magical-effect-interdiction` | `packages/battle-runtime/battle-runtime-antimagic-field-magical-effect-interdiction.mbt.qnt` | `mbt-fixture` | Keep MBT-only. The driver is a self-contained literal projection witness for target/effect-delivery outcomes. It should not be counted as qnt-proof verification evidence. |

## Decision

The two `.mbt.qnt` Antimagic prevention drivers should not contribute QNT proof
coverage. They remain `focused-mbt` verification owners in
`plans/unit-profile-coverage/profiles.jsonl` and `mbt-fixture` owners in
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`.

Do not add `verification-owner:qnt-proof` markers or `qnt-proof` task claims for
the action-interdiction or magical-effect-interdiction profiles unless a future
task creates non-MBT proof modules that model reusable executable semantics for
those reducers. The current `qntProofCoverage` gap is intentional for these two
profiles rather than missing evidence.

## Reviewer Loop Convergence

- RAW/ubiquitous-language pass: the audit traces to the Antimagic Field,
  Emanation, Magic Action, Magical Effect, Spell Invocation, and Spell Effect
  source vocabulary listed above.
- Architecture/connascence pass: the roles now agree across profile evidence,
  task claims, parity witnesses, and `qnt-owner-roles`: `.mbt.qnt` literal
  projection drivers are MBT-only, while the suppression semantic core keeps the
  actual qnt-proof evidence.
- Code-review pass: no runtime behavior, reducer protocol, QNT semantics, or
  generated schema changed; this is a ledger/documentation audit.

## Plan Impact

- `L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT` is done.
- `L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION` remains blocked until its other
  dependencies close, but this dependency is satisfied.
