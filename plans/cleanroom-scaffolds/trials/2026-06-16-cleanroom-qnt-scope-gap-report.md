# 2026-06-16 Cleanroom QNT Scope Gap Report

## Purpose

This report records why copied `*.mbt.qnt` drivers are not active cleanroom
tasks in the current source scaffold. It exists before hardening or eliminating
the remaining inactive buckets.

It also records a harness design flaw: activating one driver currently requires
updates in multiple source-owned files. That should be eliminated.

## Current Counts

Current synced source roots:

- `packages/battle-runtime`
- `packages/character-creation-runtime`
- `packages/character-sheet-runtime`
- `packages/character-battle-runtime`
- `packages/shared-algebras/proofs/rule-core`

Current source counts:

| Scope | Total MBT drivers | Active drivers | Inactive copied/input-only drivers |
| --- | ---: | ---: | ---: |
| All synced roots | 152 | 77 | 75 |
| `battle-runtime` | 125 | 63 | 62 |
| `character-battle-runtime` | 5 | 2 | 3 |
| Battle plus character-battle | 130 | 65 | 65 |
| `character-creation-runtime` | 10 | 5 | 5 |
| `character-sheet-runtime` | 12 | 7 | 5 |

Current branch obligations:

- Active source branch inventory: 463 obligations.
- Explicit source-blocker obligations in the current inventory: 0.
- Explicit out-of-scope obligations in the current inventory: 0.

The last two zeroes are not a clean bill of health. They mean inactive drivers
are outside the generated inventory, so the checker has no branch-level rows for
them yet.

## What The Inventory Actually Does

The cleanroom flow has three source-owned layers:

1. `branch-scope.jsonl` names drivers that enter source branch inventory and
   supplies default scope/replay decisions.
2. `source-branch-inventory.json` is generated from `branch-scope.jsonl` plus
   parsed QNT. It records branch obligations and QNT file hashes.
3. `ACTIVE_WORK.template.json` and `LEVEL_1_2_SCOPE.snapshot.md` define the
   rendered cleanroom assignment queue.

This is too many places for one source truth. A driver should not require
manual edits in all three layers. The next harness fix should make one queue
source authoritative and generate the other views from it, with a checker that
fails drift.

## Documented Curation Logic

The documented criterion is level-1/2 reachability:

- `in`: the whole driver is suitable for the character-level-1 through
  character-level-2 Work Loop.
- `out`: the driver is wholly about later-level character access, later spell
  access, or content unavailable to a level-1/2 SRD character.
- `flagged`: the driver mixes in-scope and out-of-scope obligations, or the
  copied cleanroom corpus does not settle level-1/2 reachability.

That logic is documented in
`plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md`.

The PRD is stricter than the current implementation: mixed-scope drivers should
eventually be classified at branch level, not excluded wholesale as
driver-level `flagged` rows.

## Gap Buckets

### Valid Level-1/2 Exclusions

There are 56 inactive drivers currently documented as `out`.

These are valid exclusions only if the cleanroom assignment remains strictly
level 1/2. They should not be treated as replay-hardening failures for that
scope. They should become active when a later-level cleanroom assignment is
created.

### Flagged Drivers

There are 19 inactive drivers currently documented as `flagged`.

This is the bucket that must be eliminated for a branch-complete cleanroom
harness. `flagged` means "we know there are probably in-scope branches here, but
the driver also contains out-of-scope or unresolved branches." The right fix is
branch-level scope, driver splitting, or source QNT cleanup, not permanent
exclusion.

### Undocumented Drivers

There are now 0 inactive drivers with no decision row. The source-side scope
documentation defect found on 2026-06-16 was resolved as follows:

- `packages/battle-runtime/battle-runtime-slow-fall-selected-identity.mbt.qnt`
  is documented as `out` for level 1/2, because SRD 5.2.1 Monk Slow Fall is
  level 4.
- `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt` is
  now active work, because stat-block attack damage is base monster/combat
  behavior a level-1/2 character can encounter.
- `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
  is now active work, because stat-block condition riders and target size gates
  are base monster/combat behavior a level-1/2 character can encounter.

### Replay-Readiness Blockers

There are no explicit source replay-readiness blockers in the current generated
inventory.

That does not prove all inactive drivers are hardened. It only proves the
current inventory does not include them. A proper hardening report requires
adding branch-level rows for flagged candidates, then recording either
replayable obligations or explicit source blockers.

### Too Broad

"Too broad" is not currently a formal source-scope category. When it appears,
it is hidden inside `flagged`, especially composite drivers such as:

- `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- `packages/battle-runtime/rule-core-features.mbt.qnt`
- `packages/battle-runtime/rule-core-spells.mbt.qnt`

This bucket should be eliminated by splitting drivers or adding branch-level
scope rows. It should not remain an informal reason for exclusion.

## Flagged Driver List

| Driver | Current reason |
| --- | --- |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt` | Mixed base/Search and Guidance behavior with spell-level-2 Enhance Ability. |
| `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt` | Mixed level-1/2 after-hit riders with spell-level-2 Shining Smite. |
| `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` | Mixed level-1 condition spells with spell-level-2 and spell-level-3 condition spells. |
| `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt` | Mixed level-1 forced-movement spells and level-5/6 class movement features. |
| `packages/battle-runtime/battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` | Copied RAW corpus does not establish the feature or its acquisition level. |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt` | Driver mixes out-of-scope Counterspell branches with a level-1 Hellish Rebuke branch. |
| `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt` | Driver mixes level-1 reaction spell selections with Counterspell. |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt` | Mixed base/Search, cantrip, level-1 Command, and spell-level-2 Enhance Ability. |
| `packages/battle-runtime/rule-core-features.mbt.qnt` | Composite rule-core driver mixes level-1/2 and later-level feature obligations. |
| `packages/battle-runtime/rule-core-spells.mbt.qnt` | Composite rule-core driver mixes cantrip/level-1 spells with higher-level spell profiles. |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt` | Mixed level-1/2 handoff facts with spell-level-2 and spell-level-3 capacity facts. |
| `packages/character-battle-runtime/character-battle-settlement.mbt.qnt` | Mixed basic battle settlement with later/ambiguous created spell-slot and active-Wild-Shape handoff questions. |
| `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt` | Mixed level-1/2 resources with out-of-scope created level-3 slot behavior. |
| `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt` | Mixed level-1/2 selections and a level-3 Wizard subclass selection. |
| `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt` | Mixed level-1 Rogue Expertise and level-6 additional Expertise projection. |
| `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt` | Mixed level-1/2 invocation acquisition and later-level replacement/prerequisite facts. |
| `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt` | Arcane Recovery is level 1, but this driver includes second-level slot recovery unavailable to ordinary level-1/2 Wizards. |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt` | Mixed level-1/2 features with level-3 subclass spell features. |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt` | Mixed level-1/2 slot facts and later full-caster level-4/second-level slot examples. |

## Resolved Undocumented Driver List

| Driver | Applied classification |
| --- | --- |
| `packages/battle-runtime/battle-runtime-slow-fall-selected-identity.mbt.qnt` | `out` for level 1/2; Slow Fall is Monk level 4. |
| `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt` | `in`; base stat-block attack-control behavior. |
| `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt` | `in`; base stat-block condition-rider behavior. |

## Out Driver List

| Driver | Current reason |
| --- | --- |
| `packages/battle-runtime/bardic-inspiration-selected-identity.mbt.qnt` | Driver asserts a d12 Bardic Inspiration die, which RAW reaches at Bard level 15. |
| `packages/battle-runtime/battle-runtime-acid-arrow-timing.mbt.qnt` | Acid Arrow is spell level 2. |
| `packages/battle-runtime/battle-runtime-antimagic-field-action-interdiction.mbt.qnt` | Antimagic Field is spell level 8. |
| `packages/battle-runtime/battle-runtime-antimagic-field-magical-effect-interdiction.mbt.qnt` | Antimagic Field is spell level 8. |
| `packages/battle-runtime/battle-runtime-antimagic-field-ongoing-suppression.mbt.qnt` | Antimagic Field is spell level 8. |
| `packages/battle-runtime/battle-runtime-beam-sequence-selected-identity.mbt.qnt` | The driver records the two-beam level-5 cantrip upgrade. |
| `packages/battle-runtime/battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt` | Blur is spell level 2. |
| `packages/battle-runtime/battle-runtime-condition-removal-protection-selected-identity.mbt.qnt` | Lesser Restoration and Protection from Poison are spell level 2. |
| `packages/battle-runtime/battle-runtime-creature-size-change-lifecycle.mbt.qnt` | Enlarge/Reduce is spell level 2. |
| `packages/battle-runtime/battle-runtime-dark-ones-blessing.mbt.qnt` | Dark One's Blessing is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.mbt.qnt` | The driver is for direct spell-owned conditions with minimum slot level 2. |
| `packages/battle-runtime/battle-runtime-disciple-of-life.mbt.qnt` | Disciple of Life is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-dispel-magic-ongoing-spell-ending.mbt.qnt` | Dispel Magic is spell level 3. |
| `packages/battle-runtime/battle-runtime-dispel-magic-selected-identity.mbt.qnt` | Dispel Magic is spell level 3. |
| `packages/battle-runtime/battle-runtime-dragons-breath-granted-action.mbt.qnt` | Dragon's Breath is spell level 2. |
| `packages/battle-runtime/battle-runtime-dragons-breath-initial-effect.mbt.qnt` | Dragon's Breath is spell level 2. |
| `packages/battle-runtime/battle-runtime-druid-lands-aid.mbt.qnt` | Land's Aid is a level-3 Circle of the Land feature. |
| `packages/battle-runtime/battle-runtime-extra-attack.mbt.qnt` | Extra Attack is first gained at level 5. |
| `packages/battle-runtime/battle-runtime-fireball-selected-identity.mbt.qnt` | Fireball is spell level 3. |
| `packages/battle-runtime/battle-runtime-flaming-sphere-hazard-ram.mbt.qnt` | Flaming Sphere is spell level 2. |
| `packages/battle-runtime/battle-runtime-gust-of-wind-line-lifecycle.mbt.qnt` | Gust of Wind is spell level 2. |
| `packages/battle-runtime/battle-runtime-heat-metal-object-contact.mbt.qnt` | Heat Metal is spell level 2. |
| `packages/battle-runtime/battle-runtime-hunters-prey.mbt.qnt` | Hunter's Prey is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt` | Driver is explicitly spell-level-2. |
| `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt` | Driver is explicitly spell-level-2. |
| `packages/battle-runtime/battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt` | Driver is explicitly spell-level-2. |
| `packages/battle-runtime/battle-runtime-level2-protection-spell-selected-identity.mbt.qnt` | Driver is explicitly spell-level-2. |
| `packages/battle-runtime/battle-runtime-levitated-creature-lifecycle.mbt.qnt` | Levitate is spell level 2. |
| `packages/battle-runtime/battle-runtime-lightning-bolt-selected-identity.mbt.qnt` | Lightning Bolt is spell level 3. |
| `packages/battle-runtime/battle-runtime-magical-darkness-point-origin-lifecycle.mbt.qnt` | Darkness is spell level 2. |
| `packages/battle-runtime/battle-runtime-mind-spike-selected-identity.mbt.qnt` | Mind Spike is spell level 2. |
| `packages/battle-runtime/battle-runtime-mirror-image-hit-interception.mbt.qnt` | Mirror Image is spell level 2. |
| `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.mbt.qnt` | Moonbeam is spell level 2. |
| `packages/battle-runtime/battle-runtime-open-hand-technique.mbt.qnt` | Open Hand Technique is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-paladin-sacred-weapon-selected-identity.mbt.qnt` | Sacred Weapon is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-potent-cantrip.mbt.qnt` | Potent Cantrip is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-preserve-life.mbt.qnt` | Preserve Life is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-ray-of-enfeeblement-lifecycle.mbt.qnt` | Ray of Enfeeblement is spell level 2. |
| `packages/battle-runtime/battle-runtime-remarkable-athlete-selected-identity.mbt.qnt` | Remarkable Athlete is a level-3 subclass feature. |
| `packages/battle-runtime/battle-runtime-rogue-steady-aim.mbt.qnt` | Steady Aim is a level-3 Rogue feature. |
| `packages/battle-runtime/battle-runtime-see-invisibility-observer-sight.mbt.qnt` | See Invisibility is spell level 2. |
| `packages/battle-runtime/battle-runtime-self-teleport-lifecycle.mbt.qnt` | Misty Step is spell level 2. |
| `packages/battle-runtime/battle-runtime-self-transformation-mode-lifecycle.mbt.qnt` | Alter Self is spell level 2. |
| `packages/battle-runtime/battle-runtime-shining-smite-selected-identity.mbt.qnt` | Shining Smite is spell level 2. |
| `packages/battle-runtime/battle-runtime-slow-fall-selected-identity.mbt.qnt` | Slow Fall is a level-4 Monk feature. |
| `packages/battle-runtime/battle-runtime-spell-created-held-object-lifecycle.mbt.qnt` | Flame Blade is spell level 2. |
| `packages/battle-runtime/battle-runtime-spell-sequencing-integration.mbt.qnt` | Driver's concrete sequencing path is Dragon's Breath into Heat Metal, both spell-level-2 effects first ordinarily reached at character level 3. |
| `packages/battle-runtime/battle-runtime-spike-growth-movement-hazard.mbt.qnt` | Spike Growth is spell level 2. |
| `packages/battle-runtime/battle-runtime-spiritual-weapon.mbt.qnt` | Spiritual Weapon is spell level 2. |
| `packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.mbt.qnt` | Warding Bond is spell level 2. |
| `packages/battle-runtime/battle-runtime-web-restraint-hazard.mbt.qnt` | Web is spell level 2. |
| `packages/battle-runtime/monk-martial-arts-selected-identity.mbt.qnt` | Driver projects a d12 Martial Arts die, which is later-level, not level 1/2. |
| `packages/character-creation-runtime/character-creation-weapon-mastery-level-gain.mbt.qnt` | The driver is about level-4 Weapon Mastery gain/reselection. |
| `packages/character-creation-runtime/character-creation-wizard-evocation-savant.mbt.qnt` | Evocation Savant is a level-3 Wizard subclass feature. |
| `packages/character-sheet-runtime/character-sheet-spell-rest-benefit-application.mbt.qnt` | Prayer of Healing is a spell-level-2 rest benefit, not reachable by ordinary level-1/2 characters. |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-class-level-reselection.mbt.qnt` | The driver is about level-4 class-level reselection. |

## Required Follow-Ups

1. Make a single source of truth for active cleanroom drivers. Generate
   `source-branch-inventory.json`, `ACTIVE_WORK.template.json`, and
   `LEVEL_1_2_SCOPE.snapshot.md` from that source, or add a checker that fails
   if they drift.
2. Resolved: eliminate the 3 undocumented drivers by adding source-owned
   decisions.
3. Eliminate the 19 flagged drivers by splitting drivers or adding branch-level
   scope rows.
4. Add a replay-hardening report for every flagged driver after it enters
   inventory, with explicit source blockers instead of silent exclusion.
5. Keep the 56 `out` drivers excluded only for level-1/2 cleanroom scope; move
   them into a later-level assignment when that scope exists.

## Verification

Commands used:

```text
find packages/battle-runtime packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime packages/shared-algebras/proofs/rule-core -name '*.mbt.qnt' | sort | wc -l
jq -r '.branchObligations[].driverPath' plans/cleanroom-branch-coverage/source-branch-inventory.json | sort -u | wc -l
jq '[.branchObligations[] | select(.replay.tag=="source-blocker")] | length' plans/cleanroom-branch-coverage/source-branch-inventory.json
jq '[.branchObligations[] | select(.scope.tag=="out-of-scope")] | length' plans/cleanroom-branch-coverage/source-branch-inventory.json
pnpm cleanroom-branch-coverage:check -- --write
pnpm cleanroom-branch-coverage:check
pnpm cleanroom-scaffold:check
git diff --check -- plans/cleanroom-branch-coverage/branch-scope.jsonl plans/cleanroom-branch-coverage/source-branch-inventory.json plans/cleanroom-branch-coverage/REPORT.md plans/cleanroom-scaffolds/tasks/ACTIVE_WORK.template.json plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md plans/cleanroom-scaffolds/trials/2026-06-16-cleanroom-qnt-scope-gap-report.md plans/cleanroom-scaffolds/trials/2026-06-16-rust-agent-source-gap-analysis.md
```
