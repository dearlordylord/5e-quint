# Level 1-9 Full Support Baseline - 2026-07-08

## Base Check

- Declared Ralph base: `05f71ae679ce05c040a38a05cdc0c3c90c67c5ba`
- `HEAD`: `05f71ae679ce05c040a38a05cdc0c3c90c67c5ba`
- `git merge-base --is-ancestor 05f71ae679ce05c040a38a05cdc0c3c90c67c5ba HEAD`: passed

## Baseline Commands

Captured at `2026-07-08T03:30:25Z`.

| Command | Result |
| --- | --- |
| `pnpm unit-profile-coverage:check` | passed: 333 Units, 192 profiles |
| `pnpm rules-kernel-coverage:check` | passed: 131 obligations |
| `pnpm cleanroom-branch-coverage:check` | passed: 738 obligations, 24 sampled inputs |
| `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` | passed: 4 files, 9 tests |

## Generated Artifact State

- `plans/unit-profile-coverage/srd-unit-inventory.json` has 924 rows.
- `levelBand` values currently stop at `level-8` and `spell-level-4`.
- Pre-plan `level-9` rows: 0.
- Pre-plan `spell-level-5` rows: 0.
- `plans/unit-profile-coverage/level1-9-full-support.json`: absent.
- `plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md`: absent.
- `plans/unit-profile-coverage/level1-9-mining-audit.json`: absent.
- `plans/unit-profile-coverage/LEVEL1_9_MINING_AUDIT.md`: absent.
- `plans/unit-profile-coverage/ultra-golden-gate.json` scopes currently stop at `level-1-8`.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json` required flows currently stop at `level-1-8`.

## Level 9 Source Anchors

Class table rows:

- `.references/srd-5.2.1/Classes/Barbarian.md:43`
- `.references/srd-5.2.1/Classes/Bard.md:44`
- `.references/srd-5.2.1/Classes/Cleric.md:43`
- `.references/srd-5.2.1/Classes/Druid.md:40`
- `.references/srd-5.2.1/Classes/Fighter.md:39`
- `.references/srd-5.2.1/Classes/Monk.md:40`
- `.references/srd-5.2.1/Classes/Paladin.md:43`
- `.references/srd-5.2.1/Classes/Ranger.md:43`
- `.references/srd-5.2.1/Classes/Rogue.md:44`
- `.references/srd-5.2.1/Classes/Sorcerer.md:43`
- `.references/srd-5.2.1/Classes/Warlock.md:43`
- `.references/srd-5.2.1/Classes/Wizard.md:43`

Level-9 feature anchors:

- `.references/srd-5.2.1/Classes/Barbarian.md:128`
- `.references/srd-5.2.1/Classes/Bard.md:93`
- `.references/srd-5.2.1/Classes/Fighter.md:102`
- `.references/srd-5.2.1/Classes/Fighter.md:108`
- `.references/srd-5.2.1/Classes/Monk.md:138`
- `.references/srd-5.2.1/Classes/Paladin.md:144`
- `.references/srd-5.2.1/Classes/Ranger.md:118`
- `.references/srd-5.2.1/Classes/Rogue.md:175`
- `.references/srd-5.2.1/Classes/Warlock.md:104`

Spell frontier anchors:

- `.references/srd-5.2.1/Classes/Bard.md:250`
- `.references/srd-5.2.1/Classes/Cleric.md:238`
- `.references/srd-5.2.1/Classes/Druid.md:290`
- `.references/srd-5.2.1/Classes/Paladin.md:206`
- `.references/srd-5.2.1/Classes/Ranger.md:198`
- `.references/srd-5.2.1/Classes/Sorcerer.md:340`
- `.references/srd-5.2.1/Classes/Warlock.md:402`
- `.references/srd-5.2.1/Classes/Wizard.md:298`
- `.references/srd-5.2.1/Character-Creation.md:302`
- `.references/srd-5.2.1/Character-Creation.md:413`
- `.references/srd-5.2.1/Character-Creation.md:437`
- `.references/srd-5.2.1/Character-Creation.md:460`

## Expected Open Scope

Inventory enablement should open the generated denominator rather than closing
it by hand. The plan expects approximately twelve level-9 class-table rows,
about nine level-9 class-feature rows, spell-level-5 class-list pressure for
full casters and Warlock, and Paladin/Ranger spell-level-3 reachability inside
level-9 accounting.
