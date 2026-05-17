# Goodberry Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:871` defines
  Goodberry as a level 1 Conjuration spell for Druids and Rangers.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:875` through
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md:878` define Action
  casting time, Self range, Verbal/Somatic/Material components, and 24-hour
  duration.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:880` creates ten
  duration-limited magic berries in the caster's hand, lets a creature take a
  Bonus Action to eat one berry, restores 1 Hit Point, and provides enough
  nourishment for one day.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:882` makes uneaten
  berries disappear when the spell ends.
- `.references/srd-5.2.1/Classes/Druid.md:213` and
  `.references/srd-5.2.1/Classes/Ranger.md:172` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:47` defines Timer as a countdown or duration with an
  explicit expiry clock.
- `UBIQUITOUS_LANGUAGE.md:126` identifies actions, bonus actions, and
  reactions as distinct blocked action resources for Incapacitated.
- `UBIQUITOUS_LANGUAGE.md:131` through `UBIQUITOUS_LANGUAGE.md:136`
  distinguish action-resource modeling boundaries.
- `UBIQUITOUS_LANGUAGE.md:138` through `UBIQUITOUS_LANGUAGE.md:143` say active
  occurrence state should carry only mutable runtime facts and should not
  duplicate static source mechanics.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.

## Current Generated State

- Unit pressure id: `goodberry`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has two level-1 spell
  pressure rows: Druid spell list Goodberry and Ranger spell list Goodberry.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says created consumable berries, nourishment,
  inventory persistence, and later Bonus Action consumption are item or
  Character Sheet pressure outside current promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `goodberry` Unit matrix
  row.
- `packages/surface/content/goodberry.json` and
  `packages/surface/content/goodberry.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `goodberry` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `goodberry` under
  No Matrix SRD Pressure, outside the strict executable denominator.
- `packages/character-sheet-runtime/README.md:14` through
  `packages/character-sheet-runtime/README.md:66` list current Character Sheet
  executable state as HP, sheet-visible conditions, spent Hit Dice, selected
  resource expenditures, Spell Slot and Pact Slot expenditures, rest
  completion, Lay On Hands, ritual invocation, Armor Class projection, and
  parsing.
- `packages/character-sheet-runtime/README.md:68` through
  `packages/character-sheet-runtime/README.md:75` defer non-spell resources
  beyond promoted Lay On Hands and mutable carried/equipped equipment to future
  modules.
- `packages/v0/src/features/spell-conjuration.ts:16` through
  `packages/v0/src/features/spell-conjuration.ts:18` and
  `packages/v0/src/features/spell-registry.ts:2016` through
  `packages/v0/src/features/spell-registry.ts:2025` contain archived
  restore-source Goodberry constants and spell metadata. `README.md:83`
  through `README.md:86` and `packages/v0/README.md:3` through
  `packages/v0/README.md:7` keep that package outside the active workspace and
  forbid using it as the source of truth for current character-runtime work.

## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

`@dnd/character-sheet-runtime` owns current HP and some sheet-time workflows,
but it does not currently own a durable item inventory, consumable item use,
food or nourishment state, or general item expiry. Its current elapsed-time
operation is scoped to Stable recovery, and its current healing-resource action
is Lay On Hands with a feature-derived pool. Threading Goodberry through either
boundary would create spell-specific consumable state beside the missing
inventory owner.

Goodberry also has a battle-facing Bonus Action clause, but the action is the
later act of eating an already-created berry. Promoting that action without an
owned berry inventory would make the berry count, holder, expiry, and
nourishment facts implicit. The current product therefore treats Goodberry as
out of scope until a consumable inventory owner is explicitly selected.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Ten berries appear in the caster's hand | Future consumable inventory pressure only if such an owner is created | The created objects need holder/location, count, and persistence facts. No current package owns mutable consumable inventory. |
| Magic lasts for 24 hours and uneaten berries disappear | Future item-expiry pressure only if such an owner is created | Expiry is meaningful only over represented berry instances. Character Sheet elapsed time currently handles Stable recovery, not arbitrary item timers. |
| A creature takes a Bonus Action to eat one berry | Runtime-detached item-use adjudication for now | Bonus Action use depends on a represented berry and action-economy context. No current owner can consume the berry while preserving holder, count, and expiry. |
| Eating restores 1 Hit Point | Future consumable-healing pressure only if consumable use is owned | Character Sheet can represent HP, but there is no Goodberry use boundary that spends an owned berry before applying the heal. A standalone heal action would duplicate or skip the consumable source fact. |
| Eating provides one day of nourishment | Runtime-detached survival/inventory adjudication | The product has no food, hunger, ration, or nourishment clock owner. |

## Decision

Keep `goodberry` as no-matrix spell pressure with no runtime profile in this
task. The selected current closure is catalog-only/no-runtime-profile: there is
no SRD-provenance `goodberry` Surface UnitRecord, no catalog admission, no Unit
matrix row, and no current package owner for consumable berry inventory,
nourishment, use, or expiry.

Do not create a Character Sheet follow-up task in this loop. Character Sheet
would be the plausible future owner only if the product first chooses to model
mutable consumable inventory as sheet state. That broader owner is not selected
by the current plan, and adding a Goodberry-specific counter or action would
duplicate the missing inventory source of truth.

The existing Strict Level 1 report treatment is correct: the Druid and Ranger
spell-list pressures are product readiness accepted/no-battle-effect pressure
and remain outside strict support accounting because no executable Unit matrix
row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `goodberry` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent Action casting, Self range, 24-hour duration,
  ten created berries, Bonus Action eating, 1 HP restoration, one-day
  nourishment, and uneaten-berry disappearance without storing contradictory
  inventory or expiry facts.

After those gates, promotion still needs one of these owner decisions:

- `@dnd/character-sheet-runtime` or a future inventory package explicitly
  accepts durable consumable item instances, holder/count state, item expiry,
  consumable use, HP restoration from a consumed item, and nourishment tracking
  as executable state; or
- the decider chooses to close an admitted Unit as runtime-detached consumable,
  survival, and table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. Consumable inventory is not in scope for Task 12, so
no Character Sheet implementation task is produced.

If a future product decision creates a consumable inventory owner, add a
separate implementation atom to author/admit `goodberry` before adding any Unit
claim, runtime closure, support profile, or runtime behavior. That atom should
name the owner files for consumable inventory, expiry, nourishment, and HP
restoration from a consumed item rather than adding a spell-specific parallel
state field.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-E-L.md:871`
  through `.references/srd-5.2.1/Spells/Descriptions-E-L.md:882`.
- Spell-list pressure checked against
  `.references/srd-5.2.1/Classes/Druid.md:213` and
  `.references/srd-5.2.1/Classes/Ranger.md:172`.
- Ubiquitous language checked for Timer, action-resource terminology, Active
  Ongoing Feature Occurrence state discipline, Spell Definition, Spell Access,
  Spell Invocation, and Spell Effect.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
- Character Sheet ownership checked against
  `packages/character-sheet-runtime/README.md` and
  `packages/character-sheet-runtime/src/index.ts`.
- Archived `packages/v0` Goodberry constants and metadata checked and excluded
  as restore-source material, not active package ownership.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
