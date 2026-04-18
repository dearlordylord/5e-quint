## Figurine of Wondrous Power

Outcome: `surface_widening`

The top-level `magic_item` collection shape fits: this SRD line is naturally one `MagicItemRecord` with named rarity variants. The blocker is lower down. Several figurine variants are not just "summon a creature for N hours, then go on cooldown"; they attach additional mechanics to the active creature form, and the current `MagicItemSpawnedCreatureMechanics` shape cannot express those riders honestly.

Why I did not author `content/magic_item_figurine_of_wondrous_power.dhall`:

- The current summon-item family can represent the base summon/control/duration/cooldown loop for simple variants like Bronze Griffon and Marble Elephant.
- The line as a whole cannot be represented honestly because multiple variants require extra mechanics scoped to the spawned form or to the controller's relationship with that form.

Concrete surface gaps:

1. Companion-active rider composition
Evidence:
> "While in raven form, the figurine grants you the ability to cast Animal Messenger on it."
> "While you ride the goat, any Hostile creature that starts its turn within a 30-foot Emanation originating from the goat must succeed on a DC 15 Wisdom saving throw or have the Frightened condition..."

The current magic-item `spawned_creature` family has no place for additional passive/ongoing/activated mechanics that are active only while the companion form exists, and no predicate for "while riding the companion."

2. Duration-linked charge drain on the active companion form
Evidence:
> "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge. While it has charges, you can use it as often as you wish. When it runs out of charges, it reverts to a figurine..."

The current activation resource model spends charges when the item is activated, not as time passes during an active summon. There is also no "auto-revert when pool hits 0 during duration" hook on `MagicItemSpawnedCreatureMechanics`.

3. Randomized control failure on a spawned companion
Evidence:
> "The figurine has a 10 percent chance each time you use it to ignore your orders, including a command to revert to figurine form."
> "If you mount the nightmare while it is ignoring your orders, you and the nightmare are instantly transported to a random location on the plane of Hades..."

`random_table` exists for spell activation phases, but the magic-item summon family cannot sequence a use-time random branch that modifies later control behavior for the summoned creature.

4. Temporary weaponized body-part transformation tied to reversion
Evidence:
> "you can (harmlessly) remove its horns and use them as weapons. One horn becomes a +1 Lance, and the other becomes a +2 Longsword... The weapons disappear and the horns return when the goat reverts to figurine form."

The current surface has no honest way to represent temporary item creation from a companion body part plus forced disappearance when the companion reverts.

Narrowest honest classification:

- Not `structural_widening`: `magic_item`, collection variants, and summon-item families already exist.
- Not `atom_widening`: the main blockers are missing surface composition/state variants around an existing summon family, not a clearly forced brand-new v4 atom.
- Therefore `surface_widening`.
