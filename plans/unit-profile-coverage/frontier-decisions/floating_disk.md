# Floating Disk Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:552` defines Floating
  Disk as a level 1 Conjuration spell for Wizards.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:556` through
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md:559` define Action or
  Ritual casting time, 30-foot range, Verbal/Somatic/Material components, and
  1-hour duration.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:561` creates the
  circular horizontal plane of force in an unoccupied visible space, keeps it
  3 feet above the ground, gives it a 500-pound capacity, and ends the spell
  when overloaded so disk contents fall.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:563` defines the disk's
  immobility within 20 feet of the caster, following behavior beyond 20 feet,
  uneven-terrain and stairs/slopes traversal, and the 10-foot elevation-change
  limit.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:565` ends the spell when
  the caster moves more than 100 feet from the disk.
- `.references/srd-5.2.1/Classes/Wizard.md:174` is the level-1 Wizard spell-list
  pressure row.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:184` through `UBIQUITOUS_LANGUAGE.md:193` distinguish
  Speed, Movement, Difficult Terrain, Size, and Carrying Capacity terminology.
- `UBIQUITOUS_LANGUAGE.md:224` defines Ritual casting.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:268` defines Duration, and
  `UBIQUITOUS_LANGUAGE.md:270` defines Conjuration as transport/summon magic.

## Current Generated State

- Unit pressure id: `floating_disk`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has one level-1 spell
  pressure row: Wizard spell list Floating Disk.
- The row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- The row has `battleReadinessStatus: accepted-no-battle-effect`.
- The row's next action says the created carrying disk, load capacity,
  terrain-following, and distance-based end behavior are object/exploration
  state outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `floating_disk` Unit
  matrix row.
- `packages/surface/content/floating_disk.json` and
  `packages/surface/content/floating_disk.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `floating_disk`
  rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `floating_disk`
  under No Matrix SRD Pressure, outside the strict executable denominator.

## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

No promoted runtime package currently owns a created force platform as a durable
object, object or inventory placement on that platform, item weight aggregation,
load-limit overflow, map position for a noncreature object, caster-to-object
distance thresholds, path following, terrain/elevation traversal, or the fall
of carried objects when the spell ends. Character Sheet does not currently own
transported inventory position or container/object movement as executable
state. Battle runtime does not currently own generic exploration objects,
terrain pathfinding, elevation barriers, or noncreature carried-load movement.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Create a 3-foot-diameter plane of force in an unoccupied visible space | Runtime-detached object/exploration adjudication | Disk identity, space occupancy, object position, and visible-space selection are map/object facts with no current runtime owner. |
| Hold up to 500 pounds, end when overloaded, and drop contents | Runtime-detached inventory/object adjudication | The runtime has no owned item-weight aggregation, disk load state, or carried-object fall boundary for an object that is not a creature. |
| Stay immobile within 20 feet and follow beyond 20 feet | Runtime-detached exploration movement adjudication | This requires caster and disk positions plus following/path updates outside the promoted battle and Character Sheet boundaries. |
| Traverse uneven terrain, stairs, and slopes but not elevation changes of 10 feet or more | Future object/inventory movement pressure only if such an owner is created | Terrain traversal and elevation barriers require map geometry/pathfinding semantics that do not exist in current owners. |
| End when the caster is more than 100 feet from the disk | Runtime-detached exploration adjudication | The distance threshold depends on durable disk position and obstacle/path failure state that no current runtime package models. |

## Decision

Keep `floating_disk` as no-matrix spell pressure with no runtime profile in
this task. The selected current closure is catalog-only/no-runtime-profile:
there is no SRD-provenance `floating_disk` Surface UnitRecord, no catalog
admission, no Unit matrix row, and no package owner that can consume the disk's
object identity, carried-load, terrain traversal, or caster-distance facts
without inventing a spell-specific object/inventory movement subsystem.

For the current plan, classify Floating Disk execution as runtime-detached
object, inventory, and exploration table adjudication. Do not add a future
object/inventory movement subsystem task solely for this spell. If the product
later creates a general object and inventory movement owner, Floating Disk is a
candidate input to that owner, but the owner must exist before Unit claims,
support profiles, evidence rows, or runtime behavior are added.

The existing Strict Level 1 report treatment is correct: the Wizard spell-list
pressure is product readiness accepted/no-battle-effect pressure and remains
outside strict support accounting because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `floating_disk` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent Action or Ritual casting, fixed 1-hour
  duration, disk creation in an unoccupied visible space, 500-pound capacity,
  overload expiry and falling contents, 20-foot following, terrain traversal,
  10-foot elevation-change blocking, and 100-foot distance expiry without
  storing contradictory object, inventory, or movement facts.

After those gates, promotion still needs one of these owner decisions:

- an object/inventory movement owner explicitly accepts disk identity,
  transported inventory, item weight aggregation, map position, path following,
  terrain/elevation limits, and expiry/drop behavior as durable runtime state;
  or
- the decider chooses to close an admitted Unit as runtime-detached object,
  inventory, and exploration table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected for Task 11. If a
future object/inventory movement subsystem is created, add a separate
implementation atom to author/admit `floating_disk` before adding any Unit
claim, runtime closure, support profile, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-E-L.md:552`
  through `.references/srd-5.2.1/Spells/Descriptions-E-L.md:565`.
- Spell-list pressure checked against
  `.references/srd-5.2.1/Classes/Wizard.md:174`.
- Ubiquitous language checked for Magic Action, Movement, Difficult Terrain,
  Carrying Capacity, Ritual, Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Duration, and Conjuration terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
