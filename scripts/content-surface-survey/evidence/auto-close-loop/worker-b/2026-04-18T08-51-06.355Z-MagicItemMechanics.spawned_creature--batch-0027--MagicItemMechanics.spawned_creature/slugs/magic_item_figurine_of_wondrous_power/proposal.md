## Why I stopped

`Figurine of Wondrous Power` no longer fails for the old reason that magic items cannot spawn companions. The current surface does have `magic_item`, collection variants, and a `spawned_creature` family for magic items.

I still stopped before authoring because the full SRD collection does not fit honestly without unsupported mechanics.

## What fits already

The generic shell is representable:

- magic-item collection with rarity-varying variants
- Magic action activation
- spawned companion with friendly control
- duration-bound reversion
- early reversion at 0 HP or manual dismissal
- elapsed-days recharge for the simple variants

If the unit were only Bronze Griffon / Marble Elephant style entries and each creature stat block were available inline, the current surface would be close enough.

## Blockers

### 1. Most variants need catalog-ref creatures, not inline stat blocks

The current `MagicItemSpawnedCreatureMechanics` requires an inline `statBlock`.

That is not honest for this unit. The source text gives a full stat block only for **Giant Fly**. The other variants mostly point at named creatures:

- Griffon
- Lion
- Giant Goat
- Riding Horse
- Elephant
- Nightmare
- Mastiff
- Giant Owl
- Raven

Encoding those as invented inline blocks or placeholder copies would be false. The surface needs a catalog-ref source for spawned-creature items.

Suggested widening:

- `SpawnedCreaturePayload.catalog_ref` or equivalent `monsterId` source shared with magic-item/spell summon families.

### 2. Goat of Traveling spends charges as time passes

This is not just a cooldown. It is an active-form maintenance cost:

> "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge."

The current surface can:

- give an item a `charge_pool`
- reset that pool after elapsed days
- fire passive operations on elapsed time

It cannot spend charges because time elapsed while the companion remains active. There is no atom or resource operation for time-based pool depletion, and no supported way to tie "pool hits 0" to an automatic revert.

Suggested widening:

- new atom or resource operation such as `spend_resource_over_time`
- optional auto-revert-on-empty hook for spawned-companion items

### 3. Obsidian Steed needs a probabilistic obedience override

The nightmare variant has a per-use 10% disobedience branch:

> "The figurine has a 10 percent chance each time you use it to ignore your orders, including a command to revert to figurine form."

That is not an attack roll, save gate, ability check, or plain direct effect. The surface does have `random_table`, but not in a way that can modify future companion obedience state and override later commands.

The mounted consequence is a further deterministic rider on that random branch:

> "If you mount the nightmare while it is ignoring your orders, you and the nightmare are instantly transported to a random location on the plane of Hades ..."

Suggested widening:

- new atom / resolution concept such as `probabilistic_override`
- or a companion-state random branch that can suppress obedience and reversion commands

### 4. Golden Lions / Ivory Goats are bundled sibling items

These lines are not just ordinary variants. They are packaged multi-figurine sets:

> "These gold statuettes of lions are always created in pairs. You can use one figurine or both simultaneously."

> "These ivory statuettes of goats are always created in sets of three. Each goat looks unique and functions differently from the others."

The current `MagicItemVariant` shape gives one payload per variant. It does not model:

- a closed bundle of sibling figurines inside one variant
- independent recharge state per member
- optional simultaneous use of more than one member

You could flatten some of this into extra variants, but that loses the item-level bundle semantics.

Suggested widening:

- `MagicItemVariant.bundle_members`
- or a nested closed roster for grouped item members

## Classification

I classified this as `atom_widening`.

Why not `surface_widening` only:

- a surface variant for catalog-ref creatures would help, but it would not solve Goat of Traveling's time-based charge drain or Obsidian Steed's probabilistic disobedience

Why not `structural_widening`:

- the top-level `magic_item` kind, collection variants, and magic-item `spawned_creature` family already exist
- the remaining blockers are specific missing mechanics, not a wholly absent family

## Files intentionally not created

I did **not** create:

- `content/magic_item_figurine_of_wondrous_power.dhall`
- `content/magic_item_figurine_of_wondrous_power.json`
- `content/magic_item_figurine_of_wondrous_power.trace.md`

Creating them would have required either placeholder monster data or knowingly false omissions across multiple core variant behaviors.
