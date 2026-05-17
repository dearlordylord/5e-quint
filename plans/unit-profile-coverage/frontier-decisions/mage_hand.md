# Mage Hand Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:18` defines Mage Hand
  as a Conjuration cantrip for Bards, Sorcerers, Warlocks, and Wizards.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:22` through
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:25` define Action
  casting time, 30-foot range, Verbal/Somatic components, and 1-minute
  duration.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:27` creates the
  spectral floating hand at a chosen point within range, keeps it for the
  duration, and makes it vanish when it is more than 30 feet from the caster or
  when the spell is cast again.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:29` lets the caster use
  the hand at cast time to manipulate an object, open an unlocked door or
  container, stow or retrieve an item from an open container, or pour a vial's
  contents.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:31` lets the caster take a
  later Magic action to control the hand again and move the hand up to 30 feet.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:33` says the hand cannot
  attack, activate magic items, or carry more than 10 pounds.
- `.references/srd-5.2.1/Classes/Bard.md:149`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:229`,
  `.references/srd-5.2.1/Classes/Warlock.md:338`, and
  `.references/srd-5.2.1/Classes/Wizard.md:148` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:186` through `UBIQUITOUS_LANGUAGE.md:193`
  distinguish creature Speed and Movement from Carrying Capacity; Mage Hand's
  hand movement and 10-pound carrying limit are spell-object facts, not
  creature movement-budget facts.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:246` through `UBIQUITOUS_LANGUAGE.md:261` reserve
  SRD-facing hand-occupancy terms such as holding and avoid invented
  handedness terms.
- `UBIQUITOUS_LANGUAGE.md:268` defines Duration, and
  `UBIQUITOUS_LANGUAGE.md:270` defines Conjuration as transport/summon magic.

## Current Generated State

- Unit pressure id: `mage_hand`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has four level-1 spell
  pressure rows: Bard spell list Mage Hand, Sorcerer spell list Mage Hand,
  Warlock spell list Mage Hand, and Wizard spell list Mage Hand.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says remote hand creation, object manipulation, carry
  limit, repeated Magic action control, and distance/recast expiry are
  exploration object-control effects outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `mage_hand` Unit
  matrix row.
- `packages/surface/content/mage_hand.json` and
  `packages/surface/content/mage_hand.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `mage_hand` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md:108` lists `mage_hand`
  under No Matrix SRD Pressure, outside the strict executable denominator.
- `packages/battle-runtime/README.md:3` through
  `packages/battle-runtime/README.md:23` scope battle runtime to already
  composed creature battle inputs and implemented battle behavior from caller
  inputs.
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

No promoted runtime package currently owns a durable remote hand, a hand
position separate from creature position, caster-to-hand distance expiry,
recast displacement, object/container lock or open state, item holder or
container transfer, vial contents, carried-object weight, magic item activation
permissions, or the later Magic action as a control operation over a represented
spell object.

Battle runtime owns selected creature battle procedure families, but Mage
Hand's consequential payload is object control rather than damage, conditions,
creature movement, a target save, or an existing active Spell Effect family.
The spell's "can't attack" clause is a prohibition against treating the hand as
an attack source, not a reason to add a battle attack subject. Character Sheet
can project current loadout facts, but it does not own mutable carried/equipped
equipment or object transfer workflows as executable state.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Create a spectral floating hand at a point within 30 feet for 1 minute | Runtime-detached object-control adjudication | Hand identity, map point, caster association, and persistent hand position are exploration/object facts with no current runtime owner. |
| Vanish when more than 30 feet from the caster or when recast | Runtime-detached duration and distance adjudication | The distance threshold and recast replacement require represented hand state and caster-to-hand geometry that no current package owns. |
| Manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour a vial at cast time | Runtime-detached object/container adjudication | Object state, unlocked/open container state, item holder transfer, and vial contents are table-facing object facts outside promoted owners. |
| Later Magic action controls the hand again and moves the hand up to 30 feet | Runtime-detached object-control adjudication | The Magic action matters only if a represented hand can consume the control operation; the hand's relocation is not creature Movement. |
| Cannot attack | No battle-runtime behavior to add | This prevents using the hand as an attack source. Adding an attack subject solely to reject it would invent runtime state for a prohibited action. |
| Cannot activate magic items | Runtime-detached magic-item/object adjudication | Magic item activation permissions require a magic item owner and object-use workflow that do not exist in current promoted packages. |
| Cannot carry more than 10 pounds | Runtime-detached object/inventory adjudication | Carry enforcement needs represented carried object weight and hand load state; Character Sheet defers mutable equipment/inventory workflows. |

## Decision

Keep `mage_hand` as no-matrix spell pressure with no runtime profile in this
task. The selected current closure is catalog-only/no-runtime-profile: there is
no SRD-provenance `mage_hand` Surface UnitRecord, no catalog admission, no Unit
matrix row, and no package owner that can consume the spell's remote hand,
object/container, carried-load, magic-item, Magic-action control, or
distance/recast facts without inventing a Mage Hand-specific object-control
subsystem.

For the current plan, classify Mage Hand execution as runtime-detached
object-control and exploration table adjudication. Do not add a future
object-control subsystem task solely for this spell. If the product later
creates a general object-control or mutable equipment/inventory owner, Mage
Hand is a candidate input to that owner, but the owner must exist before Unit
claims, support profiles, evidence rows, or runtime behavior are added.

The existing Strict Level 1 report treatment is correct: the Bard, Sorcerer,
Warlock, and Wizard spell-list pressures are product readiness
accepted/no-battle-effect pressure and remain outside strict support accounting
because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `mage_hand` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent Action casting, 30-foot range, 1-minute
  duration, remote hand creation, caster-to-hand distance expiry, recast
  replacement, cast-time object manipulation, later Magic action control,
  30-foot hand relocation, prohibited attacks, prohibited magic item
  activation, and the 10-pound carrying limit without storing contradictory
  object, inventory, or action facts.

After those gates, promotion still needs one of these owner decisions:

- an object-control or mutable equipment/inventory owner explicitly accepts
  hand identity, hand position, caster association, represented object and
  container state, item transfer, vial contents, carried-object weight, magic
  item activation permissions, later Magic action control, and expiry/recast
  behavior as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached
  object-control table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected for Task 13. If a
future object-control or mutable equipment/inventory subsystem is created, add
a separate implementation atom to author/admit `mage_hand` before adding any
Unit claim, runtime closure, support profile, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-M-P.md:18`
  through `.references/srd-5.2.1/Spells/Descriptions-M-P.md:33`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:149`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:229`,
  `.references/srd-5.2.1/Classes/Warlock.md:338`, and
  `.references/srd-5.2.1/Classes/Wizard.md:148`.
- Ubiquitous language checked for Magic Action, Movement, Carrying Capacity,
  hand occupancy terms, Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Duration, and Conjuration terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
- Package owner boundaries checked against `packages/battle-runtime/README.md`
  and `packages/character-sheet-runtime/README.md`.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
