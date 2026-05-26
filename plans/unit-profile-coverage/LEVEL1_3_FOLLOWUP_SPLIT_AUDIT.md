# Level 1-3 Follow-Up Split Audit

Date: 2026-05-26

Task: L13UG-A07-LEVEL13-FOLLOWUP-SPLIT-AUDIT

## Decision

All six current `blocked-follow-up-split` rows in
`LEVEL1_3_FULL_SUPPORT.md` are correctly non-blocking under the current
level 1-3 claim gate. No new atomic tasks are needed for this audit.

This decision does not mean the six rows are complete runtime support. It means
the current gate already treats each row as strict-target closed because the
remaining work is explicitly split into smaller follow-up owners instead of
being hidden as an ambiguous open frontier.

## Gate Check

Checked `scripts/level1-full-support-report.cjs`.

- `blocked-follow-up-split` is a strict-target-closed status.
- A Unit reaches that status when its Unit claim records concrete
  `followUpTasks`.
- The full-support claim gate blocks only on strict target open count, selected
  identity blockers, and SRD-authored product-readiness blockers.

Checked generated artifacts:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md` reports
  `claimGate.status: pass`, strict blockers `0`, selected-identity blockers
  `0`, and SRD-authored readiness blockers `0`.
- `plans/unit-profile-coverage/level1-3-full-support.json` records
  `blockingRows: []` and six `blocked-follow-up-split` rows.

## RAW And Language Check

Checked local RAW:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:5` for Acid Arrow.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1307` for Darkness.
- `.references/srd-5.2.1/Classes/Druid.md:95` for Wild Shape.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:68` for Enhance Ability.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:445` for Moonbeam.
- `.references/srd-5.2.1/Classes/Sorcerer.md:145` for Metamagic options.

Checked `UBIQUITOUS_LANGUAGE.md` for the terms used in this audit:
`Spell Definition`, `Spell Invocation`, `Spell Effect`, `Spell Slot`, `Using a
Higher-Level Spell Slot`, `Spell Attack`, `Ability Check`, `Concentration`,
`Area of Effect`, `Boundary Crossing`, `Illumination`, `Obscurement`,
`Darkvision`, `Stat Block`, and `Character Sheet`.

## Split Rows

| Unit | Current claim shape | Existing split owner | Audit result |
| --- | --- | --- | --- |
| `acid_arrow` | `unsupported-profile`; selected identity `not-required`; not in Unit catalog | RAW corpus reconciliation, Surface damage shape, delayed battle-runtime support | Correctly non-blocking under the current gate. Local RAW has an internal damage-timing contradiction: hit text gives delayed Acid damage, miss text refers to initial damage, and higher-slot text distinguishes initial and later damage. The row already blocks admission until owner-approved RAW or assumption input exists; promoting runtime support before that would invent a rule. |
| `darkness` | `profile-subset-supported`; selected identity `witness-present`; installed | Object-origin spell-area and opaque-cover owner | Correctly non-blocking under the current gate. The supported subset covers point-origin magical Darkness, Concentration, cleanup, and light-overlap consequences. The remaining object-origin Emanation and opaque-cover branch is a distinct object/area witness boundary with a concrete follow-up owner. |
| `druid_wild_shape` | `profile-subset-supported`; selected identity `witness-present`; installed | Remaining shape-shifting runtime and retained-statistics owners | Correctly non-blocking under the current gate. The supported subset covers character facts, known-form/resource ownership, selected identity, and a promoted battle subset. The remaining equipment, anatomy, Beast Spells, Stat Block action, non-D20 retained-statistic, and active-form persistence questions are explicitly split. `ASSUMPTIONS.md` A27 already owns the active-form character-sheet handoff boundary. |
| `enhance_ability` | `profile-subset-supported`; selected identity `witness-present`; installed | Higher-level-slot per-target ability-choice owner | Correctly non-blocking under the current gate. The supported subset covers the level-2 one-target Spell Invocation and chosen Ability Check Advantage. The remaining higher-level-slot branch requires multiple targets with independent ability choices, which is a narrower target-list and choice-lifecycle follow-up rather than a hidden level-2 support gap. |
| `moonbeam` | `profile-subset-supported`; selected identity `witness-present`; installed | Spell-effect shape-shift and Stat Block shapechanger true-form owners | Correctly non-blocking under the current gate. The supported subset covers the movable Cylinder, save and damage lifecycle, once-per-turn save invariant, slot scaling, Concentration cleanup, and supported shared reversion result consumption. The remaining work is not Moonbeam-specific authored-identity dispatch; it belongs to shared true-form ownership for spell-effect and Stat Block shape-shift sources. |
| `sorcerer_metamagic` | `profile-subset-supported`; selected identity `witness-present`; installed | Quickened-all-action-spells, save-option, and damage-shape owners | Correctly non-blocking under the current gate. Character Creation, Character Sheet, Character Battle resource bridging, and the promoted Quickened direct Hit Point restoration slice are covered. The remaining Metamagic options require typed procedure gates for broader Spell Invocation families, saving-throw hooks, damage-type substitution, and higher-level-slot target-count projection. Those are concrete follow-up owners, not silent gaps in the supported subset. |

## Reviewer Loop

Round 1 findings:

- Acid Arrow is the highest-risk row because it is an executable level-2 spell
  with no supported runtime profile. The existing split is still correct because
  the local RAW contradiction prevents a lossless executable model until owner
  input exists. No new task is needed; the existing RAW corpus reconciliation,
  Surface shape, and delayed runtime tasks are the correct atomic sequence.
- The other five rows are subset-supported with selected-identity evidence.
  Their remaining work is represented by domain-specific follow-up owners and
  does not invalidate the supported subset.

Round 2 findings:

- No follow-up split silently hides an executable level 1-3 support gap under
  the current gate.
- If the project wants "zero blocked-follow-up-split rows" to be mandatory for
  level 1-3, that is a deliberate metric-strengthening change for a later task,
  not a Task 7 bug fix.

## Plan Impact

- Task 8: leave unchanged. It still owns product-readiness diagnostics.
- Task 9: leave unchanged but use this audit as input for wording that explains
  why split follow-up rows can coexist with the current passing claim.
- Task 10: leave unchanged. It can use this artifact when checking report
  consistency.

Required plan edits: none.
