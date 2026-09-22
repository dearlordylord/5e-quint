# Level 1-9 Full Support Baseline - 2026-07-08

## Base Check

- Declared Ralph base: `05f71ae679ce05c040a38a05cdc0c3c90c67c5ba`
- `HEAD`: `05f71ae679ce05c040a38a05cdc0c3c90c67c5ba`
- `git merge-base --is-ancestor 05f71ae679ce05c040a38a05cdc0c3c90c67c5ba HEAD`: passed

## Baseline Commands

Captured at `2026-07-08T03:30:25Z`.

| Command                                             | Result                                     |
| --------------------------------------------------- | ------------------------------------------ |
| `pnpm unit-profile-coverage:check`                  | passed: 333 Units, 192 profiles            |
| `pnpm rules-kernel-coverage:check`                  | passed: 131 obligations                    |
| `pnpm cleanroom-branch-coverage:check`              | passed: 738 obligations, 24 sampled inputs |
| `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` | passed: 4 files, 9 tests                   |

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

- `.references/srd-5.2.1/classes.md:136`
- `.references/srd-5.2.1/classes.md:622`
- `.references/srd-5.2.1/classes.md:1975`
- `.references/srd-5.2.1/classes.md:3261`
- `.references/srd-5.2.1/classes.md:4702`
- `.references/srd-5.2.1/classes.md:5032`
- `.references/srd-5.2.1/classes.md:5473`
- `.references/srd-5.2.1/classes.md:6250`
- `.references/srd-5.2.1/classes.md:6959`
- `.references/srd-5.2.1/classes.md:7399`
- `.references/srd-5.2.1/classes.md:8840`
- `.references/srd-5.2.1/classes.md:10015`

Level-9 feature anchors:

- `.references/srd-5.2.1/classes.md:306`
- `.references/srd-5.2.1/classes.md:888`
- `.references/srd-5.2.1/classes.md:4834`
- `.references/srd-5.2.1/classes.md:4840`
- `.references/srd-5.2.1/classes.md:5212`
- `.references/srd-5.2.1/classes.md:5704`
- `.references/srd-5.2.1/classes.md:6457`
- `.references/srd-5.2.1/classes.md:7151`
- `.references/srd-5.2.1/classes.md:9010`

Spell frontier anchors:

- `.references/srd-5.2.1/classes.md:1418`
- `.references/srd-5.2.1/classes.md:2676`
- `.references/srd-5.2.1/classes.md:4119`
- `.references/srd-5.2.1/classes.md:5880`
- `.references/srd-5.2.1/classes.md:6665`
- `.references/srd-5.2.1/classes.md:8347`
- `.references/srd-5.2.1/classes.md:9534`
- `.references/srd-5.2.1/classes.md:11036`
- `.references/srd-5.2.1/character-creation.md:653`
- `.references/srd-5.2.1/character-creation.md:903`
- `.references/srd-5.2.1/character-creation.md:927`
- `.references/srd-5.2.1/character-creation.md:951`

## Expected Open Scope

Inventory enablement should open the generated denominator rather than closing
it by hand. The plan expects approximately twelve level-9 class-table rows,
about nine level-9 class-feature rows, spell-level-5 class-list pressure for
full casters and Warlock, and Paladin/Ranger spell-level-3 reachability inside
level-9 accounting.
