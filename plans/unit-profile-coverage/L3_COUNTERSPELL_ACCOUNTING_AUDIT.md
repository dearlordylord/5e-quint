# Level 3 Counterspell Accounting Audit

Task 25 audited Counterspell after the Level 3 spell-list pressure seed. No
runtime behavior changed.

## RAW And Vocabulary Check

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1185` through `:1196`
  defines Counterspell as a level 3 Abjuration Reaction taken when the caster
  sees a creature within 60 feet casting a spell with Verbal, Somatic, or
  Material components. The triggering creature makes a Constitution Saving
  Throw; failure dissipates the spell with no effect, wastes the casting Action,
  Bonus Action, or Reaction, and preserves the triggering Spell Slot. A
  higher-level Counterspell automatically ends a spell whose level is equal to
  or lower than Counterspell's Cast Level.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md:92` through `:100`
  defines Reaction spell casting-time triggers and the one-spell-slot-per-turn
  rule used by the promoted same-turn slot ledger.
- `.references/srd-5.2.1/Rules-Glossary.md:814` through `:816` defines the
  Reaction resource reset boundary.
- `UBIQUITOUS_LANGUAGE.md` was checked for Reaction, Offer, Decline, Spell
  Definition, Spell Access, Spell Invocation, Spell Effect, Base Spell Level,
  Cast Level, Spell Slot, Saving Throw, and table-supplied witness language.

## Level 3 Inventory Rows

The generated Level 3 spell-list pressure rows for Counterspell are already
accepted with owner evidence:

- Sorcerer spell list Counterspell:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:455`
- Warlock spell list Counterspell:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:474`
- Wizard spell list Counterspell:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:489`

All three rows point at the installed SRD Surface record
`packages/surface/content/counterspell.json` and the supported profile
`spell.reaction-counterspell`.

## Accounting Result

No missing profile, evidence, or rules-kernel accounting was found.

- Surface: `packages/surface/content/counterspell.json` carries the SRD
  provenance, level 3 spell definition, Reaction trigger, Somatic component,
  60-foot range, Constitution Saving Throw gate, triggering-spell negation, and
  higher-slot automatic branch.
- Unit claim: `plans/unit-profile-coverage/unit-claims.jsonl` classifies
  `counterspell` as `supported-profile` for `spell.reaction-counterspell`.
- Deterministic admission/projection evidence:
  `plans/unit-profile-coverage/unit-evidence.jsonl` records QMBT22 evidence at
  `packages/battle-runtime/src/unit-profile-admission-candidate-narrowing-spells.test.ts`.
- Profile ownership:
  `plans/unit-profile-coverage/profiles.jsonl` identifies the promoted Quint
  and runtime owners and keeps visibility, range geometry, and component
  witnesses at the table-supplied boundary.
- Proof and runtime parity evidence:
  `plans/unit-profile-coverage/task-claims.jsonl` records SRDINV91A QNT proof
  and completed runtime parity claims for Counterspell's spell-cast Reaction
  frame, same-turn Spell Slot ledger, automatic and Constitution-save-gated
  interruption, triggering slot release, recursive Counterspell interruption,
  and focused reducer tests.
- Rules-kernel join:
  `plans/rules-kernel-coverage/profile-obligations.jsonl` maps
  `spell.reaction-counterspell` to `BATTLE.SPELL.REACTION_CASTING_TIME` and
  `BATTLE.REACTION.OFFER_DECLINE_RESUME`.
- Rules-kernel obligation evidence:
  `plans/rules-kernel-coverage/obligations.jsonl` includes Counterspell RAW
  evidence and the battle-runtime reaction-window, spell-invocation, dispatcher,
  reaction-triggered-spells, and spell-cast frame owners, with
  `packages/battle-runtime/src/counterspell-reaction-spell.test.ts` as a parity
  witness.
- Generated reports:
  `plans/unit-profile-coverage/UNIT_REPORT.md` includes `counterspell` in
  covered supported Units and lists the deterministic evidence and SRDINV91A
  proof/parity task claims. `plans/rules-kernel-coverage/REPORT.md` includes
  `spell.reaction-counterspell` under both joined covered obligations.

## Decision

Task 25 lands as supported. The current accounting is sufficient for the Level
3 Counterspell rows, so no new runtime code, generated matrix edits, or
follow-up task split is required.

This audit did not introduce companion control, autonomous behavior, authored
identity dispatch, duplicate state, or reducer behavior changes.

## Reviewer-Loop Convergence

- Round 1: checked RAW and ubiquitous language against the existing Surface,
  profile, evidence, and rules-kernel claims. The existing supported profile
  accurately tracks the SRD spell-cast interruption boundary and keeps witness
  facts table-supplied.
- Round 2: checked architecture and connascence. The strong coupling between
  the Surface record, supported profile id, task claims, runtime owner markers,
  and rules-kernel obligations is explicit in checker-readable JSONL and
  generated reports; no parallel status field or adapter was needed.
- Round 3: code-review pass found no reasonable Task 25 findings. Because the
  task changed only accounting documentation and plan status, focused coverage
  checks are sufficient and MBT is not required.

## Verification For Implementation

- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
