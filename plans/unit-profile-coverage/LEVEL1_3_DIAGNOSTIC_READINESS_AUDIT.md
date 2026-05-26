# Level 1-3 Diagnostic Readiness Audit

Date: 2026-05-26

Task: L13UG-A08-LEVEL13-DIAGNOSTIC-READINESS-AUDIT

## Decision

The level 1-3 product-readiness diagnostics do not add a hidden blocker to the
current full-support claim gate.

`LEVEL1_3_FULL_SUPPORT.md` reports a passing claim because the actual gate has
zero strict open rows, zero selected-identity blockers, and zero
SRD-authored-product-readiness blockers. The 30 non-green product-readiness rows
remain useful planning diagnostics, but they are not an additional conjunctive
claim gate under the current checker.

## Gate Check

Checked `scripts/level1-full-support-report.cjs`.

- `productReadiness` is copied from `srd-unit-inventory.json` into the Metrics
  section as diagnostic lower-layer accounting.
- `claimGate.status` is computed only from strict target open count,
  selected-identity blocker count, and SRD-authored-product-readiness blocker
  count.
- The rendered report says product-readiness statuses other than `accepted` or
  `accepted-no-battle-effect` stay visible but do not block unless they also
  appear in SRD-authored readiness blockers.

Checked generated artifacts:

- `plans/unit-profile-coverage/level1-3-full-support.json` reports
  `claimGate.status: "pass"` with blocker counts `0/0/0`.
- Product readiness is `577/607 (95.1%)`.
- Non-green diagnostic rows are `battle-runtime-required: 1`,
  `owner-evidence-required: 18`, and `partial-battle-runtime: 11`.
- `srdAuthoredProductReadiness.blockerRows` is empty.

## RAW And Language Check

Checked local RAW for the audited executable diagnostic families:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:5` for Acid Arrow.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1307` for Darkness.
- `.references/srd-5.2.1/Classes/Druid.md:95` for Wild Shape.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:68` for Enhance Ability.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:445` for Moonbeam.
- `.references/srd-5.2.1/Classes/Sorcerer.md:111` and `:145` for Metamagic.
- `.references/srd-5.2.1/Classes/Bard.md:99` for Jack of All Trades.
- `.references/srd-5.2.1/Classes/Wizard.md:411` for Evocation Savant.
- The level-3 owner-evidence-required class rows at the SRD class feature
  headings recorded in `srd-unit-inventory.json`.

Checked `UBIQUITOUS_LANGUAGE.md` for the terms used here: `Ability Check`,
`Spell Slot`, `Concentration`, `Spell Definition`, `Spell Invocation`, `Spell
Effect`, `Using a Higher-Level Spell Slot`, `Spell Attack`, `Area of Effect`,
`Stat Block`, and `Character Sheet`.

## Status Audit

| Product-readiness status | Rows | Blocks current claim? | Audit result |
| --- | ---: | --- | --- |
| `battle-runtime-required` | 1 | No | The sole row is Acid Arrow from the Wizard level-2 spell-list pressure. It is already represented in the strict view as `blocked-follow-up-split` with concrete RAW reconciliation, Surface repair, and battle-runtime support owners. Task 7 audited that split as non-blocking under the current gate. |
| `owner-evidence-required` | 18 | No | None of these rows appear in SRD-authored-product-readiness blockers. Fifteen are level-3 class feature rows with no Unit matrix row yet, kept visible for the no-matrix/future-owner audits. The other three are installed Units needing better checker-readable owner evidence or follow-up accounting: `bard_jack_of_all_trades`, `sorcerer_metamagic`, and `wizard_evocation_savant`. |
| `partial-battle-runtime` | 11 | No | These 11 source rows collapse to four profile-subset-supported Units: `darkness`, `druid_wild_shape`, `enhance_ability`, and `moonbeam`. Each has selected-identity evidence and concrete follow-up split owners for the residual mechanics. Task 7 audited those follow-up splits as non-blocking under the current gate. |

## Row Inventory

| Status | Candidate Unit | Source row | Current disposition | Claim relation |
| --- | --- | --- | --- | --- |
| `battle-runtime-required` | `acid_arrow` | Wizard spell list Acid Arrow | `catalog-authored-executable-follow-up` | Strict row is `blocked-follow-up-split`; existing follow-ups own RAW reconciliation, Surface repair, and delayed runtime support. |
| `owner-evidence-required` | `barbarian_primal_knowledge` | Barbarian Primal Knowledge | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `bard_jack_of_all_trades` | Bard Jack of All Trades | `catalog-installed-owner-evidence-required` | Supported Unit profile exists; product metric still wants checker-readable character-sheet owner evidence. |
| `owner-evidence-required` | `cleric_disciple_of_life` | Cleric Disciple of Life | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `cleric_preserve_life` | Cleric Preserve Life | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `druid_lands_aid` | Druid Land's Aid | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `fighter_remarkable_athlete` | Fighter Remarkable Athlete | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `monk_open_hand_technique` | Monk Open Hand Technique | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `paladin_channel_divinity` | Paladin Channel Divinity | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `paladin_sacred_weapon` | Paladin Sacred Weapon | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `ranger_hunters_prey` | Ranger Hunter's Prey | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `rogue_fast_hands` | Rogue Fast Hands | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `rogue_second_story_work` | Rogue Second-Story Work | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `rogue_steady_aim` | Rogue Steady Aim | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `sorcerer_metamagic` | Sorcerer Metamagic | `catalog-installed-needs-owner-evidence` | Strict row is `blocked-follow-up-split`; supported subset and residual owners were audited in Task 7. |
| `owner-evidence-required` | `sorcerer_draconic_resilience` | Sorcerer Draconic Resilience | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `warlock_dark_ones_blessing` | Warlock Dark One's Blessing | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `owner-evidence-required` | `wizard_evocation_savant` | Wizard Evocation Savant | `catalog-installed-owner-evidence-required` | Strict row is `closed-later-level-only`; product metric still wants explicit character-creation and spellbook owner evidence. |
| `owner-evidence-required` | `wizard_potent_cantrip` | Wizard Potent Cantrip | `level-3-follow-up-required` | No Unit matrix row yet; outside strict denominator and retained for no-matrix audit. |
| `partial-battle-runtime` | `enhance_ability` | Bard spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Strict row is `blocked-follow-up-split`; residual is higher-level-slot per-target ability choices. |
| `partial-battle-runtime` | `enhance_ability` | Cleric spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `druid_wild_shape` | Druid Wild Shape | `catalog-installed-owner-evidence-present` | Strict row is `blocked-follow-up-split`; residual shape-shifting owners were audited in Task 7. |
| `partial-battle-runtime` | `enhance_ability` | Druid spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `moonbeam` | Druid spell list Moonbeam | `catalog-installed-owner-evidence-present` | Strict row is `blocked-follow-up-split`; residual true-form owners were audited in Task 7. |
| `partial-battle-runtime` | `enhance_ability` | Ranger spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `darkness` | Sorcerer spell list Darkness | `catalog-installed-owner-evidence-present` | Strict row is `blocked-follow-up-split`; residual object-origin branch was audited in Task 7. |
| `partial-battle-runtime` | `enhance_ability` | Sorcerer spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `darkness` | Warlock spell list Darkness | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `darkness` | Wizard spell list Darkness | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |
| `partial-battle-runtime` | `enhance_ability` | Wizard spell list Enhance Ability | `catalog-installed-owner-evidence-present` | Same Unit as above; duplicate source-list pressure, not an additional Unit blocker. |

## Reviewer Loop

Round 1 findings:

- The highest-risk diagnostic is `battle-runtime-required` because it sounds
  blocker-like. Current data contains exactly one such level 1-3 row, Acid
  Arrow, and the strict claim does not hide it: the non-supported frontier
  records concrete follow-up tasks and Task 7 already audited the split.
- `owner-evidence-required` is mixed. Some rows are installed Units that need
  better owner evidence; most are no-matrix level-3 feature rows. That is a
  planning signal, not a current claim blocker, because no row appears in
  `srdAuthoredProductReadiness.blockerRows`.
- `partial-battle-runtime` is source-row pressure over profile-subset-supported
  Units with selected-identity evidence and explicit residual owners.

Round 2 findings:

- No current diagnostic status is ambiguous as a hidden blocker under the
  checker as written.
- If product readiness should become a strict blocker later, that must be a
  deliberate checker change with self-tests. It should not be inferred from this
  audit artifact.

## Plan Impact

- Task 9: leave unchanged, but use this artifact to tighten generated/report
  wording around claim gates versus diagnostic product-readiness accounting.
- Task 10: leave unchanged, but include this artifact when checking level 1-3
  report consistency.
- Task 12: leave unchanged. It remains the right owner for auditing SRD pressure
  rows with no Unit matrix row, including the 15 level-3 owner-evidence-required
  rows listed above.

Required plan edits: none.
