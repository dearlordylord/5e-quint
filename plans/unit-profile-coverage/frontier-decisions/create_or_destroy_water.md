# Create or Destroy Water Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1213` defines Create
  or Destroy Water as a level 1 Transmutation spell for Clerics and Druids.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1217` through
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1220` define Action
  casting time, 30-foot range, Verbal/Somatic/Material components, and
  Instantaneous duration.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1222` makes the spell a
  choice between Create Water and Destroy Water.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1224` defines Create
  Water: create up to 10 gallons of clean water in an open container within
  range, or rain in a 30-foot Cube within range that extinguishes exposed
  flames there.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1225` defines Destroy
  Water: destroy up to 10 gallons of water in an open container within range,
  or destroy fog in a 30-foot Cube within range.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1227` defines Using a
  Higher-Level Spell Slot: add 10 gallons or increase the Cube size by 5 feet
  for each spell slot level above 1.
- `.references/srd-5.2.1/Classes/Cleric.md:165` and
  `.references/srd-5.2.1/Classes/Druid.md:206` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:265` defines Using a Higher-Level Spell Slot,
  `UBIQUITOUS_LANGUAGE.md:268` defines Duration, and
  `UBIQUITOUS_LANGUAGE.md:269` defines Cube as an Area of Effect shape.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.
- `UBIQUITOUS_LANGUAGE.md:284` through `UBIQUITOUS_LANGUAGE.md:285` and
  `UBIQUITOUS_LANGUAGE.md:354` through `UBIQUITOUS_LANGUAGE.md:355` define
  illumination and obscurement terms relevant to the fog clause and the
  existing Fog Cloud profile boundary.

## Current Generated State

- Unit pressure id: `create_or_destroy_water`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has two level-1 spell
  pressure rows: Cleric spell list Create or Destroy Water and Druid spell list
  Create or Destroy Water.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says creation/destruction of water, rain
  extinguishing exposed flames, and fog removal are exploration/environment
  effects outside the current promoted Character Creation and battle-runtime
  owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no
  `create_or_destroy_water` Unit matrix row.
- `packages/surface/content/create_or_destroy_water.json` and
  `packages/surface/content/create_or_destroy_water.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no
  `create_or_destroy_water` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists
  `create_or_destroy_water` under No Matrix SRD Pressure, outside the strict
  executable denominator.
- The existing `fog_cloud` Unit is installed and subset-supported through
  `spell.invocation-fog-cloud-obscurement`. That profile owns caller-supplied
  Fog Cloud area identity, the Concentration-owned Heavily Obscured area, slot
  radius scaling, duration cleanup, and table-supplied strong-wind dispersal.
  It explicitly leaves automatic area membership, line of sight, map
  illumination, pathfinding, wind derivation, and grid geometry outside the
  runtime boundary.

## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

No promoted runtime package currently owns clean water volume in open
containers, container fill levels, environmental rain, exposed mundane flame
state, generic fog volume, fog subareas, or Cube-to-environment overlap.
Character Sheet does not currently own water inventory, hydration, or
container contents as executable state. Battle runtime owns specific
source-created Spell Effects such as Fog Cloud's Heavily Obscured area, but it
does not own a general environment or fog-volume subsystem.

The fog clause can point at runtime Fog Cloud state in play, but the current
Fog Cloud boundary is not a correct Create or Destroy Water owner. Fog Cloud's
runtime command is specifically `disperseFogCloud` for table-supplied strong
wind, and it removes the whole active Fog Cloud effect. Create or Destroy Water
instead destroys fog in a level-scaled Cube. Reusing the strong-wind command
would collapse different SRD causes and would overstate the modeled geometry
unless a table witness explicitly says the Cube clears the relevant active fog
occurrence.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Create up to 10 gallons of clean water in an open container | Runtime-detached environment/item adjudication | Container openness, capacity, water volume, and later use of that water are table-facing environment or inventory facts with no current runtime owner. |
| Rain in a 30-foot Cube extinguishes exposed flames | Runtime-detached environment/object adjudication | Exposed flame state and Cube membership are environmental facts. Existing light profiles own source-created spell emitters, not mundane flame inventory or automatic map illumination. |
| Destroy up to 10 gallons of water in an open container | Runtime-detached environment/item adjudication | Destroying container water requires owned water volume and container state, neither of which exists in promoted runtime packages. |
| Destroy fog in a 30-foot Cube | Runtime-detached table adjudication unless a future fog/environment owner is selected | The table can adjudicate ordinary fog. Touching active Fog Cloud state would need an admitted UnitRecord and a typed witness distinct from strong-wind dispersal, with either explicit whole-occurrence clearance or honest fog-subarea semantics. |
| Add 10 gallons or increase Cube size by 5 feet for each spell slot level above 1 | Runtime-detached scaling fact until promotion | The scaling is straightforward RAW input to either table adjudication or a future admitted UnitRecord, but no current runtime owner consumes it. |

## Decision

Keep `create_or_destroy_water` as no-matrix spell pressure with no runtime
profile in this task. The current closure is catalog-only/no-runtime-profile:
there is no SRD-provenance `create_or_destroy_water` Surface UnitRecord, no
catalog admission, no Unit matrix row, and no package owner that can consume the
spell's water, flame, rain, fog, or Cube-overlap facts without inventing a
spell-specific environment model.

For the current plan, classify the spell's effects as runtime-detached
environment/item/object table adjudication. Do not add a table-supplied runtime
witness for Fog Cloud yet. That witness is only justified after an authored and
admitted `create_or_destroy_water` Unit exists and a runtime owner explicitly
accepts Create or Destroy Water's Cube-based fog destruction as a distinct
boundary from Fog Cloud's strong-wind dispersal.

The existing Strict Level 1 report treatment is correct: the Cleric and Druid
spell-list pressures are product readiness accepted/no-battle-effect pressure
and remain outside strict support accounting because no executable Unit matrix
row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `create_or_destroy_water` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent the cast-time Create Water versus Destroy Water
  mode, the 10-gallon open-container cases, the 30-foot Cube cases, and the
  slot-level scaling without storing contradictory water/fog/flame facts.

After those gates, promotion still needs one of these owner decisions:

- an environment/item owner explicitly accepts clean-water volume, container
  contents, environmental rain, exposed flame state, ordinary fog state, and
  Cube overlap as durable runtime state;
- battle-runtime explicitly accepts a table-supplied Create or Destroy Water
  fog witness that names an active fog occurrence and encodes whether the
  spell's Cube clears the whole occurrence or a represented subarea, without
  reusing the strong-wind dispersal command or duplicating automatic geometry;
  or
- the decider chooses to close an admitted Unit as runtime-detached
  environment/item/object table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected for Task 10. If a future
environment/item/fog owner is created, add a separate implementation atom to
author/admit `create_or_destroy_water` before adding any Unit claim, runtime
closure, Fog Cloud witness, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1213`
  through `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1227`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Cleric.md:165`
  and `.references/srd-5.2.1/Classes/Druid.md:206`.
- Ubiquitous language checked for Magic Action, Spell Definition, Spell
  Access, Spell Invocation, Spell Effect, Using a Higher-Level Spell Slot,
  Duration, Area of Effect, Transmutation, illumination, and obscurement
  terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths,
  existing claim/profile/evidence row files, and the existing Fog Cloud
  profile and runtime command boundary.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
