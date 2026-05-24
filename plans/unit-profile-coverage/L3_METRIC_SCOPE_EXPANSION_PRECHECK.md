# L3 Metric Scope Expansion Precheck

Superseded metric note (2026-05-24): generated reports now distinguish
character level from spell level. `LEVEL1_2_FULL_SUPPORT.md` is scoped to
character levels 1-2 and therefore includes `spell-level-0` and
`spell-level-1`, but not `spell-level-2`. `LEVEL1_3_FULL_SUPPORT.md` is now the
generated character levels 1-3 report and includes `spell-level-2`.
`spell-level-3` remains outside that scope because it is a later
character-level-5 frontier.

Task 22 surveyed the current Level 1-2 inventory and report generators before
opening Level 3 pressure. No runtime behavior, Unit claim, owner-evidence row,
rules-kernel obligation, or generated coverage artifact changed.

## Source Artifacts

- `scripts/srd-unit-inventory.cjs`
- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

## Current Metric Owners

`scripts/srd-unit-inventory.cjs` owns the class-derived SRD backlog rows. The
current row discovery is intentionally hard-coded to:

- class level bands `level-1` and `level-2`;
- spell list bands `spell-level-0`, `spell-level-1`, and `spell-level-2`;
- `levelOneBattleReadinessLevelBands` for Level 1 product readiness;
- `levelOneTwoBattleReadinessLevelBands` for Level 1-2 product readiness;
- `spellPressureLevelBands` for cantrip plus level 1-2 spell pressure.

`scripts/level1-full-support-report.cjs` owns the strict support views. Its
`strictLevelBands` and `strictLevel12Bands` constants derive
`LEVEL1_FULL_SUPPORT.md` and `LEVEL1_2_FULL_SUPPORT.md` without reading a broad
"all rows" denominator. This means Level 3 can be added safely only if the
existing Level 1 and Level 1-2 constants remain unchanged.

Current generated inventory state:

- `srd-unit-inventory.json` has 556 rows: 156 `level-1`, 33 `level-2`, 66
  `spell-level-0`, 145 `spell-level-1`, and 156 `spell-level-2`.
- `LEVEL1_2_FULL_SUPPORT.md` has a strict executable denominator of 171 and a
  strict target closure metric of 168/171 (98.2%).
- The generated Unit matrix already contains some authored Level 3 spell and
  subclass Units, but the SRD class-derived inventory does not yet produce
  `level-3` or `spell-level-3` rows.

## Level 3 Pressure Pre-Scan

Reading the local SRD class files with the same table and heading conventions
used by `srd-unit-inventory.cjs` shows the next pressure size:

- class level 3 would add 51 rows: 12 class feature table rows plus 39 Level 3
  class or subclass feature headings;
- spell level 3 would add 128 class spell-list rows;
- those spell-list rows collapse to 42 unique spell Unit ids.

The 42 unique spell ids split against current authored/catalog state as:

- installed now: `counterspell`, `dispel_magic`, `fireball`,
  `mass_healing_word`;
- authored but not installed now: `animate_dead`, `beacon_of_hope`,
  `call_lightning`, `clairvoyance`, `create_food_and_water`, `daylight`,
  `fear`, `fly`, `hypnotic_pattern`, `lightning_bolt`, `major_image`,
  `protection_from_energy`, `spirit_guardians`, `stinking_cloud`, `tongues`,
  `vampiric_touch`, `water_breathing`, `wind_wall`;
- not authored now: `bestow_curse`, `blink`, `conjure_animals`,
  `gaseous_form`, `glyph_of_warding`, `haste`, `magic_circle`,
  `meld_into_stone`, `nondetection`, `phantom_steed`, `plant_growth`,
  `remove_curse`, `revivify`, `sending`, `sleet_storm`, `slow`,
  `speak_with_dead`, `speak_with_plants`, `tiny_hut`, `water_walk`.

The installed Level 3 spell ids are already represented in the Unit matrix.
They should not be recounted as Level 1-2 pressure, and catalog admission alone
must not be treated as runtime support.

## Smallest Safe Extension

Use a two-step expansion rather than one broad Level 3 switch.

1. Seed `spell-level-3` inventory rows first.
   Add a separate Level 3 spell-list discovery band and separate Level 3 spell
   pressure metrics. Keep `spellPressureLevelBands`,
   `levelOneBattleReadinessLevelBands`, `levelOneTwoBattleReadinessLevelBands`,
   `strictLevelBands`, and `strictLevel12Bands` unchanged so existing reports
   keep their Level 1-2 meanings.

2. Keep class `level-3` rows out of the first seed.
   Class level 3 introduces subclass selection, subclass feature grants, and
   subclass always-prepared Spell Access. Those are different owner questions
   from spell-list pressure and should enter through the concrete follow-up
   task below.

3. Run the rules-kernel join precheck only after the spell-level-3 rows exist.
   Task 24 should consume the resulting spell-level-3 inventory and current
   Unit claims to decide which supported or likely-supported profiles need
   obligation mappings. It should not infer Level 3 pressure from the broad Unit
   matrix alone.

If Task 23 edits the existing `srd-unit-inventory.json` artifact rather than
creating a separate Level 3 artifact, it should expect `totalRows` to change.
That is acceptable only if the report continues to label Level 1-2 readiness
from the unchanged Level 1-2 band constants and adds separate Level 3 spell
pressure counts. Do not widen `levelOneTwoBattleReadiness` or
`LEVEL1_2_FULL_SUPPORT.md` to include Level 3 rows.

## Concrete Follow-Up Task

The historical MBT coverage lane that carried this draft task has been deleted
after completion/staleness cleanup. If Level 3 is reopened, seed the
class/subclass slice from this section into a fresh Level 3 backlog instead of
following the deleted lane.

### Task 30 - L3-CLASS-SUBCLASS-INVENTORY-SEED - Level 3 Class And Subclass Inventory Seed

Status: `ready-for-research`

Depends on:

- Task 22.
- Task 23.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface class, subclass, class-feature, Spell Access, Unit claim, and
  owner-evidence artifacts.

Output:

- Seed or plan class `level-3` inventory rows from the SRD class feature table
  rows, class Level 3 headings, subclass selection rows, subclass feature
  grants, and subclass always-prepared Spell Access rows.
- Keep class/subclass `level-3` rows separate from `spell-level-3` spell-list
  pressure and from existing Level 1-2 readiness/support reports.
- Update generated inventory/report artifacts only where this class/subclass
  task is the correct owner; otherwise record precise follow-up splits.

Acceptance:

- The 51 pre-scanned class `level-3` rows have checker-visible classification:
  supported owner evidence, accepted runtime-detached or character-fact
  closure, or a smaller executable follow-up split.
- Subclass selection, subclass feature grants, and subclass Spell Access are not
  collapsed into spell-list pressure or treated as runtime support from catalog
  admission alone.
- No companion AI/autonomous-control behavior and no authored identity dispatch
  are introduced.

## RAW And Vocabulary Check

No new D&D rule behavior was modeled. Local RAW was checked for the data shape
only:

- Class feature tables and Level 3 headings in `.references/srd-5.2.1/Classes/`
  provide the class-level-3 source rows.
- Class spell-list sections headed `### Level 3 <Class> Spells` provide the
  spell-level-3 source rows.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` distinguishes Spell
  Level, Spell Slots, Class Spell Lists, Spell Invocation inputs, and
  higher-level slot casting.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Magic Action, Spell Slot, subclass, Unit, runtime
projection, and table/caller ownership language.

## Review Notes

- Round 1: the broad "Level 3" wording was too large. Spell-list pressure and
  class/subclass level 3 pressure have different owners and should not enter the
  same first implementation slice.
- Round 2: the proposed extension keeps the existing Level 1-2 constants intact
  and adds only separate Level 3 spell pressure accounting. No authored identity
  dispatch, companion control, autonomous behavior, runtime reducer behavior, or
  duplicate state is introduced by this precheck.
- Round 3: the class/subclass Level 3 follow-up stays concrete and separate
  from the spell-list pressure seed.

## Verification For Implementation

- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

MBT is not required for this precheck because it changes only planning
documentation and does not change Quint, runtime, bridge, claim, evidence, or
generated coverage behavior.
