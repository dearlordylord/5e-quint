# Level 1-8 Ralph Baseline - 2026-07-07

Task: `L18FOUND-01-BASELINE-ACCOUNTING-SNAPSHOT`

Base check:

- Base ref: `master`
- Base SHA: `2e60d55ade4eeca5108bd1b24ecc2cb9ff8410bd`
- HEAD: `2e60d55ade4eeca5108bd1b24ecc2cb9ff8410bd`
- `git merge-base --is-ancestor <Base SHA> HEAD`: pass

## Generated Scope State

`plans/unit-profile-coverage/level1-6-full-support.json`:

- Claim gate: pass.
- Strict target open count: 0.
- Selected identity blocker count: 0.
- SRD-authored readiness blocker count: 0.
- Strict target closure: 263 / 263.
- Product readiness: 795 / 795.
- Rules-kernel supported Unit coverage: 164 / 164.
- Rules-kernel profile join: 117 / 117.
- Rules-kernel covered profile join: 117 / 117.

`plans/unit-profile-coverage/level1-7-mining-audit.json`:

- Scope: Character Levels 1-7 Mining Audit.
- Max character level: 7.
- Mining support gate: non-blocking mining frontier, not a full-support claim.
- Missing mined level bands: none.
- Mined denominator rows: 900.
- Rows by axis: 342 character-level, 558 spell-level.
- Level-7 character rows: 24.
- Level-7 row kinds: 12 class-table-summary, 12 class-feature-grant.
- Level-7 support dispositions: 12 non-runtime, 11 level-5-7 follow-up required, 1 catalog-installed owner evidence present.
- Existing supported level-7 feature evidence: `rogue_evasion`.
- Level-7 follow-up feature rows: `barbarian_feral_instinct`, `barbarian_instinctive_pounce`, `bard_countercharm`, `cleric_blessed_strikes`, `druid_elemental_fury`, `fighter_additional_fighting_style`, `monk_evasion`, `paladin_aura_of_devotion`, `ranger_defensive_tactics`, `rogue_reliable_talent`, `sorcerer_sorcery_incarnate`.
- Spell-level-4 class-list rows: 81.
- Spell-level-4 unique identities: 34.
- Spell-level-4 unique identity ids: `arcane_eye`, `aura_of_life`, `banishment`, `black_tentacles`, `blight`, `charm_monster`, `compulsion`, `confusion`, `conjure_minor_elementals`, `conjure_woodland_beings`, `control_water`, `death_ward`, `dimension_door`, `divination`, `dominate_beast`, `fabricate`, `faithful_hound`, `fire_shield`, `freedom_of_movement`, `giant_insect`, `greater_invisibility`, `guardian_of_faith`, `hallucinatory_terrain`, `ice_storm`, `locate_creature`, `phantasmal_killer`, `polymorph`, `private_sanctum`, `resilient_sphere`, `secret_chest`, `stone_shape`, `stoneskin`, `vitriolic_sphere`, `wall_of_fire`.

`plans/unit-profile-coverage/ultra-golden-gate.json`:

- Status: pass.
- Blocked scope ids: none.
- Current scopes do not include level-1-7 or level-1-8 full-support artifacts yet.

Missing generated scopes at baseline:

- `plans/unit-profile-coverage/level1-7-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_7_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-8-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_8_FULL_SUPPORT.md`

## Verification

Passed before level-7/level-8 checker changes:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check` (`Unit profile coverage OK: 332 Units, 192 profiles.`)
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check` (`Rules kernel coverage OK: 131 obligations.`)
- `pnpm cleanroom-branch-coverage:check` (`738 obligations, 24 sampled inputs.`)
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`

No runtime behavior, QNT behavior, MBT bridge, MCP source, or generated report behavior was changed for this baseline.
