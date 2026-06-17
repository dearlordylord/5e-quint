# 2026-06-16 Cleanroom QNT Scope Gap Report

## Purpose

This report records why copied `*.mbt.qnt` drivers are or are not active
cleanroom tasks in the current source scaffold. It also records the 2026-06-17
elimination of the former `flagged` bucket.

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
| All synced roots | 154 | 96 | 58 |
| `battle-runtime` | 127 | 73 | 54 |
| `character-battle-runtime` | 5 | 5 | 0 |
| Battle plus character-battle | 132 | 78 | 54 |
| `character-creation-runtime` | 10 | 8 | 2 |
| `character-sheet-runtime` | 12 | 10 | 2 |

Current branch obligations:

- Active source branch inventory: 684 obligations.
- Explicit source-blocker obligations in the current inventory: 1.
- Explicit out-of-scope obligations in the current inventory: 53.
- Explicit transit-only obligations in the current inventory: 8.

The source-blocker, transit-only, and out-of-scope obligations are branch-level
decisions inside otherwise active drivers. Whole-driver `out` decisions remain
documented in the `Full Driver Decisions` table.

## What The Inventory Actually Does

The active cleanroom work source of truth is
`plans/cleanroom-branch-coverage/branch-scope.jsonl`.

Its rows name active drivers and provide default branch scope/replay decisions.
The branch coverage checker parses those drivers and, on `--write`, regenerates
all derived active-work artifacts:

- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/REPORT.md`
- `plans/cleanroom-scaffolds/tasks/ACTIVE_WORK.template.json`
- the generated queue sections in
  `plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md`

The non-write checker path fails if any of those derived artifacts drift from
`branch-scope.jsonl`. The `Full Driver Decisions` table in the scope snapshot
remains the curation record for `in`, `out`, and `flagged` decisions.

## Documented Curation Logic

The documented criterion is level-1/2 reachability:

- `in`: the driver is active for the character-level-1 through
  character-level-2 Work Loop. Branch-scoped active drivers may still contain
  later-level branches, but those branches are explicitly marked out in
  `branch-scope.jsonl`.
- `out`: the driver is wholly about later-level character access, later spell
  access, or content unavailable to a level-1/2 SRD character.
- `flagged`: the driver mixes in-scope and out-of-scope obligations, or the
  copied cleanroom corpus does not settle level-1/2 reachability.

There are currently no `flagged` drivers. Sequential mixed-scope drivers that
must pass through a later-level branch to reach later in-scope actions use an
explicit `transit-only` replay decision on that branch.

That logic is documented in
`plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md`.

The current implementation classifies mixed-scope active drivers at branch
level rather than excluding them wholesale as driver-level `flagged` rows.

## Gap Buckets

### Valid Level-1/2 Exclusions

There are 58 inactive drivers currently documented as `out`.

There are also 53 out-of-scope branch obligations inside active drivers. Those
branch decisions keep mixed-scope drivers active without treating later-level
facts as target obligations.

Eight of the out-of-scope branch obligations are `transit-only`. They are
allowed only as sequential pass-through actions needed to reach later active
level-1/2 branches in the same driver.

These are valid exclusions only if the cleanroom assignment remains strictly
level 1/2. They should not be treated as replay-hardening failures for that
scope. They should become active when a later-level cleanroom assignment is
created.

### Flagged Drivers

There are 0 inactive drivers currently documented as `flagged`.

This bucket was eliminated on 2026-06-17. The five remaining sequential mixed
drivers were added to active branch inventory with explicit out-of-scope and
transit-only branch decisions rather than source rewrites.

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
- `packages/battle-runtime/battle-runtime-grappler-selected-identity.mbt.qnt`
  is documented as `out` for level 1/2, because SRD 5.2.1 Grappler has a
  Level 4+ prerequisite.
- `packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt`
  is now active work, because Halfling Nimbleness is a species trait available
  at character creation.

### Replay-Readiness Exceptions

There is 1 explicit source replay-readiness blocker in the current generated
inventory:

- `packages/battle-runtime/rule-core-features.mbt.qnt#doMyceliumStepDash` is
  source-blocked because the copied SRD 5.2.1 corpus has no Mycelium Step
  source heading or acquisition level.

That blocker is explicit rather than hidden inside `flagged`.

There are also 8 transit-only branch obligations:

- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#doShortRestArcaneRecoveryRefundsOrdinarySpellSlot`
- `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#doProjectSheetSpellcastingAndMetamagic`
- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt#doRejectAmbiguousCreatedSpellSlotSource`
- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt#doFontOfMagicSlotToPoints`
- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt#doRejectFontOfMagicAmbiguousSlotSource`
- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt#doFontOfMagicPointsToSlot`
- `packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt#doRejectFontOfMagicInsufficientPoints`
- `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#doEnhanceAbilityChoice`

These are not target obligations for the level-1/2 cleanroom run. They are
explicit pass-through actions in sequential drivers.

### Too Broad

"Too broad" is not currently a formal source-scope category. It was eliminated
by branch-level scope rows, including `rule-core-ability-skill-command.mbt.qnt`.
It should not return as an informal reason for exclusion.

## Flagged Driver List

No current flagged drivers remain. Former flagged drivers are either active with
branch-level decisions, whole-driver out, or source-blocked at branch level.

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
| `packages/battle-runtime/battle-runtime-grappler-selected-identity.mbt.qnt` | Grappler is a General Feat with prerequisite Level 4+. |
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
| `packages/battle-runtime/battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` | Copied RAW corpus does not establish the feature or its acquisition level. |
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

1. Resolved: eliminate the 5 undocumented drivers by adding source-owned
   decisions.
2. Resolved: move 13 formerly flagged drivers into active branch inventory with
   branch-level out/source-blocker decisions.
3. Resolved: eliminate the remaining 5 flagged drivers by adding explicit
   branch-level out-of-scope and transit-only decisions.
4. Keep the 58 `out` drivers excluded only for level-1/2 cleanroom scope; move
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
