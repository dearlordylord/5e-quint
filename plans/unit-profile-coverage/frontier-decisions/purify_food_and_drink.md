# Purify Food and Drink Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:933` defines
  Purify Food and Drink as a level 1 Transmutation spell for Clerics, Druids,
  and Paladins.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:937` through
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:940` define Action or
  Ritual casting time, 10-foot range, Verbal/Somatic components, and
  Instantaneous duration.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:942` removes poison and
  rot from nonmagical food and drink in a 5-foot-radius Sphere centered on a
  point within range.
- `.references/srd-5.2.1/Classes/Cleric.md:174`,
  `.references/srd-5.2.1/Classes/Druid.md:219`, and
  `.references/srd-5.2.1/Classes/Paladin.md:186` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:86` defines Poison as a damage type, and
  `UBIQUITOUS_LANGUAGE.md:107` defines the Poisoned condition. Those are
  separate modeled concepts from poison as a substance in food or drink.
- `UBIQUITOUS_LANGUAGE.md:224` defines Ritual casting.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:268` defines Duration,
  `UBIQUITOUS_LANGUAGE.md:269` defines Area of Effect including Sphere, and
  `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.

## Current Generated State

- Unit pressure id: `purify_food_and_drink`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has three level-1 spell
  pressure rows: Cleric spell list Purify Food and Drink, Druid spell list
  Purify Food and Drink, and Paladin spell list Purify Food and Drink.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says removing poison and rot from nonmagical food and
  drink is exploration or inventory state outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no
  `purify_food_and_drink` Unit matrix row.
- `packages/surface/content/purify_food_and_drink.json` and
  `packages/surface/content/purify_food_and_drink.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no
  `purify_food_and_drink` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists
  `purify_food_and_drink` under No Matrix SRD Pressure, outside the strict
  executable denominator.
- `packages/surface/src/surface/schema-nonspell.ts` references
  `purify_food_and_drink` as class spell-list source data, not as an
  authored/admitted Purify Food and Drink UnitRecord.
- `packages/character-sheet-runtime/README.md:14` through
  `packages/character-sheet-runtime/README.md:66` list current Character Sheet
  executable state as HP, sheet-visible conditions, spent Hit Dice, selected
  resource expenditures, Spell Slot and Pact Slot expenditures, rest
  completion, Lay On Hands, ritual invocation, Armor Class projection, and
  parsing.
- `packages/character-sheet-runtime/README.md:68` through
  `packages/character-sheet-runtime/README.md:75` defer mutable
  carried/equipped equipment to a future equipment module.
- `packages/v0/src/features/spell-registry.ts:3248` through
  `packages/v0/src/features/spell-registry.ts:3258` contain archived
  restore-source Purify Food and Drink metadata. `packages/v0` is not an active
  package owner for current runtime work.

## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

No promoted runtime package currently owns food or drink item identity, poison
as an item contaminant, rot or spoilage state, nonmagical item classification,
container or inventory placement, edible-item volume, or 5-foot-radius Sphere
membership over carried or environmental food and drink. Character Sheet owns
the Poisoned condition only as creature state and through the promoted Lay On
Hands condition-removal action; that boundary does not own poison as a
substance in inventory. Battle runtime owns creature battle state and supported
Spell Effects, not edible inventory contamination or spoilage.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Remove poison from nonmagical food and drink | Runtime-detached item/inventory table adjudication | The spell changes contaminant state on food or drink objects. No current package owns those object instances or contaminant facts. |
| Remove rot from nonmagical food and drink | Runtime-detached item/inventory table adjudication | Rot is spoilage state on food or drink, not a creature condition, damage type, or battle Spell Effect. |
| Affect all matching food and drink in a 5-foot-radius Sphere centered on a point within 10 feet | Runtime-detached area/item adjudication | Determining which food and drink items are inside the Sphere requires item location, carried/container state, and area membership that no current runtime owner represents. |

## Decision

Keep `purify_food_and_drink` as no-matrix spell pressure with no runtime
profile in this task. The selected current closure is
catalog-only/no-runtime-profile: there is no SRD-provenance
`purify_food_and_drink` Surface UnitRecord, no catalog admission, no Unit matrix
row, and no package owner that can consume food or drink contamination,
spoilage, nonmagical item classification, or area membership without inventing
a spell-specific inventory subsystem.

For the current plan, classify Purify Food and Drink execution as
runtime-detached item and inventory table adjudication rather than a future
item/inventory implementation task. The table can decide which nonmagical food
and drink are in the Sphere and remove poison and rot from those objects. A
future general item or inventory subsystem can still admit this spell later,
but this spell does not justify adding that subsystem by itself.

The existing Strict Level 1 report treatment is correct: the Cleric, Druid, and
Paladin spell-list pressures are product readiness accepted/no-battle-effect
pressure and remain outside strict support accounting because no executable
Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `purify_food_and_drink` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent Action or Ritual casting, 10-foot range,
  Instantaneous duration, a 5-foot-radius Sphere point target, nonmagical food
  and drink targeting, and poison and rot removal without storing
  contradictory creature-poison, item-contaminant, spoilage, or inventory facts.

After those gates, promotion still needs one of these owner decisions:

- an item, inventory, or environment owner explicitly accepts food and drink
  item identity, nonmagical classification, poison and rot state, container or
  carried placement, and Sphere membership as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached item and
  inventory table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected for Task 15. If a
future item, inventory, or environment subsystem is created, add a separate
implementation atom to author/admit `purify_food_and_drink` before adding any
Unit claim, runtime closure, support profile, evidence row, or runtime
behavior.

That future atom should model poison as an item contaminant separately from the
Poison damage type and Poisoned creature condition, and should model rot as
food or drink spoilage state on the canonical item/inventory object rather than
as a spell-specific parallel flag.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-M-P.md:933`
  through `.references/srd-5.2.1/Spells/Descriptions-M-P.md:942`.
- Spell-list pressure checked against
  `.references/srd-5.2.1/Classes/Cleric.md:174`,
  `.references/srd-5.2.1/Classes/Druid.md:219`, and
  `.references/srd-5.2.1/Classes/Paladin.md:186`.
- Ubiquitous language checked for Magic Action, Poison damage type, Poisoned
  condition, Ritual, Spell Definition, Spell Access, Spell Invocation, Spell
  Effect, Duration, Area of Effect, Sphere, and Transmutation terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
- Package owner boundaries checked against
  `packages/character-sheet-runtime/README.md` and
  `packages/battle-runtime/README.md`.
- Archived `packages/v0` Purify Food and Drink metadata checked and excluded as
  restore-source material, not active package ownership.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
