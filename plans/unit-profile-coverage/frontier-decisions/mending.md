# Mending Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:264` defines Mending as
  a Transmutation cantrip for Bards, Clerics, Druids, Sorcerers, and Wizards.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:268` through
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:271` define 1-minute
  casting time, Touch range, Verbal/Somatic/Material components, and
  Instantaneous duration.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:273` repairs one break
  or tear in a touched object, with examples of a broken chain link, broken
  key, torn cloak, and leaking wineskin, as long as the break or tear is no
  larger than 1 foot in any dimension.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:275` allows physical
  repair of a magic item but says the spell cannot restore magic to that
  object.
- `.references/srd-5.2.1/Classes/Bard.md:150`,
  `.references/srd-5.2.1/Classes/Cleric.md:152`,
  `.references/srd-5.2.1/Classes/Druid.md:191`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:230`, and
  `.references/srd-5.2.1/Classes/Wizard.md:149` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:223` defines Cantrip, and
  `UBIQUITOUS_LANGUAGE.md:225` defines Spell Component.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:267` defines Casting Time,
  `UBIQUITOUS_LANGUAGE.md:268` defines Duration, and
  `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.

## Current Generated State

- Unit pressure id: `mending`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has five level-1 spell
  pressure rows: Bard spell list Mending, Cleric spell list Mending, Druid
  spell list Mending, Sorcerer spell list Mending, and Wizard spell list
  Mending.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says object repair without restoring magic is
  equipment/exploration state outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `mending` Unit matrix
  row.
- `packages/surface/content/mending.json` and
  `packages/surface/content/mending.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `mending` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md:109` lists `mending`
  under No Matrix SRD Pressure, outside the strict executable denominator.
- `packages/battle-runtime/README.md:3` through
  `packages/battle-runtime/README.md:23` scope battle runtime to
  already-composed creature battle inputs and implemented battle behavior from
  caller inputs.
- `packages/battle-runtime/README.md:55` through
  `packages/battle-runtime/README.md:88` require reusable SRD procedure
  families and durable runtime state before widening reducer behavior.
- `packages/character-sheet-runtime/README.md:14` through
  `packages/character-sheet-runtime/README.md:66` list current Character Sheet
  executable state as HP, sheet-visible conditions, spent Hit Dice, feature and
  spell-slot expenditures, rest workflows, Lay On Hands, ritual invocation, AC
  projection, and parsing.
- `packages/character-sheet-runtime/README.md:68` through
  `packages/character-sheet-runtime/README.md:75` defer mutable
  carried/equipped equipment to a future equipment module.
## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

No promoted runtime package currently owns object integrity, object damage
instances, break or tear dimensions, repair history, magic item physical state,
or magic item magical-function state. Character Sheet defers mutable
carried/equipped equipment to a future equipment module, and battle runtime does
not own generic object durability or magic-item restoration. Mending's 1-minute
casting time and Instantaneous duration also produce no current battle action,
reaction, damage, condition, movement, resource, target-save, or active Spell
Effect procedure family.

The magic-item sentence is the domain signal that a future model must keep
physical object repair separate from magical capability restoration. Collapsing
those into one "item repaired" flag would make the impossible state
"magic restored by Mending" representable. A future owner needs an object or
equipment state shape where a physical break/tear can be mended while lost or
inactive magic remains unchanged.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Repair one break or tear in a touched object | Runtime-detached object/equipment adjudication | The runtime has no object-damage instance, touched-object selection, or object-integrity state to update. |
| Enforce that the break or tear is no larger than 1 foot in any dimension | Runtime-detached table adjudication | Size of an object's damage is table-facing object state until an equipment/object owner represents damage geometry. |
| Leave no trace of the former damage | Runtime-detached object-state adjudication | This requires represented physical damage and repair history. No current package owns either fact. |
| Physically repair a magic item | Future object/equipment pressure only if such an owner is created | Physical repair of magic items belongs to an item model that can distinguish physical integrity from magical function. |
| Cannot restore magic to a magic item | Runtime-detached magic-item adjudication until promotion | Preserving non-restored magic requires owned magic-item capability state; no promoted package owns that state. |

## Decision

Keep `mending` as no-matrix spell pressure with no runtime profile in this
task. The selected current closure is catalog-only/no-runtime-profile: there is
no SRD-provenance `mending` Surface UnitRecord, no catalog admission, no Unit
matrix row, and no package owner that can consume the spell's object damage,
repair-size, physical item state, or magic-item non-restoration facts without
inventing a Mending-specific object/equipment subsystem.

For the current plan, classify Mending execution as runtime-detached
object/equipment table adjudication. Do not add a future equipment/object
subsystem task solely for this spell. If the product later creates a general
object-durability, equipment-damage, or magic-item state owner, Mending is a
candidate input to that owner, but the owner must exist before Unit claims,
support profiles, evidence rows, or runtime behavior are added.

The existing Strict Level 1 report treatment is correct: the Bard, Cleric,
Druid, Sorcerer, and Wizard spell-list pressures are product readiness
accepted/no-battle-effect pressure and remain outside strict support accounting
because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `mending` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent 1-minute casting time, Touch range,
  Instantaneous duration, one touched object, one break or tear, the 1-foot
  maximum dimension limit, trace-free physical repair, physical repair of a
  magic item, and the prohibition on restoring magic without storing
  contradictory object or magic-item facts.

After those gates, promotion still needs one of these owner decisions:

- an object-durability, equipment-damage, or magic-item owner explicitly
  accepts object identity, object integrity, damage instances, break/tear size,
  physical repair, magic item physical state, and magic item magical-function
  state as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached
  object/equipment table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected for Task 14. If a
future object-durability, equipment-damage, or magic-item subsystem is created,
add a separate implementation atom to author/admit `mending` before adding any
Unit claim, runtime closure, support profile, or runtime behavior.

That future atom should model physical object damage and magic-item magical
function as separate facts from one canonical object/item source, so Mending can
repair the physical break or tear without representing magical restoration.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-M-P.md:264`
  through `.references/srd-5.2.1/Spells/Descriptions-M-P.md:275`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:150`,
  `.references/srd-5.2.1/Classes/Cleric.md:152`,
  `.references/srd-5.2.1/Classes/Druid.md:191`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:230`, and
  `.references/srd-5.2.1/Classes/Wizard.md:149`.
- Ubiquitous language checked for Cantrip, Spell Component, Spell Definition,
  Spell Access, Spell Invocation, Spell Effect, Casting Time, Duration, and
  Transmutation terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
- Package owner boundaries checked against `packages/battle-runtime/README.md`
  and `packages/character-sheet-runtime/README.md`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
