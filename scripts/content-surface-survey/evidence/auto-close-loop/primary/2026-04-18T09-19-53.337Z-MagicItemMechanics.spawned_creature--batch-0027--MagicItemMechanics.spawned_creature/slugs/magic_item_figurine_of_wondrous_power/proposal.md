## Why this is not clean

`Figurine of Wondrous Power` now fits the existing top-level surface better than the older survey verdict suggested:

- `MagicItemRecord` already supports a variant roster via `variants`.
- `MagicItemMechanics` already supports `spawned_creature`.

So this is not a structural gap anymore.

The remaining problem is that several figurines force mechanics the current surface still cannot express honestly without collapsing variant-defining rules into a generic "summon a creature" trace.

## What already fits

The shared chassis fits current surface types:

- Magic action activation
- creature appears within 60 feet
- friendly, commandable companion
- initiative immediately after the user
- bounded duration
- per-figurine cooldown

Simple variants like Bronze Griffon, Marble Elephant, and Goat of Travail are close to `magic_item + spawned_creature`.

## Blocking gaps

### 1. Mounted-state mechanics are missing from the atom vocabulary

Two figurines depend on whether you are riding the created creature:

- Goat of Terror: the fear aura exists only "while you ride the goat"
- Obsidian Steed: the Hades transport clause happens only "if you mount the nightmare while it is ignoring your orders"

The current surface has no mount / rider attachment, no mounted-state predicate, and no way to anchor an aura or trigger to "the rider of this companion."

This is the narrowest reason the outcome is `atom_widening`.

### 2. Companion uptime draining charges is not expressible

Goat of Traveling does not spend its resource on activation in the usual way. Instead:

- it has 24 charges total
- each hour or portion of an hour in goat form costs 1 charge
- when it runs out, it reverts and then recharges after 7 days

Current `ActivationResource` models per-activation spending, not elapsed-time drain while a spawned creature remains active.

### 3. Reverting to figurine form is not representable directly

The figurines do not simply disappear when the duration ends or when dismissed; they revert to item form.

Current `CreatureDismissal` gives:

- `onZeroHp = "disappears"`
- `onSpellEnd = "disappears"`
- `manualDismiss = "magic_action" | "bonus_action" | "never"`

There is no magic-item summon dismissal variant for "returns to item form."

### 4. Companion-targeted spell access is missing

Silver Raven grants "the ability to cast *Animal Messenger* on it" while in raven form.

Current `grant_spell_access.targetRestriction` can express:

- `self_only`
- visible target within N feet of caster / spell sensor

It cannot express "the currently spawned companion only."

## Why I did not author a partial content file

A summon-only encoding would produce a plausible trace for the generic chassis, but it would materially misrepresent several variant-defining mechanics:

- Goat of Terror would lose its rider-gated fear aura and horn weapons
- Goat of Traveling would lose its per-hour charge drain
- Obsidian Steed would lose its obedience failure / Hades transport clause
- Silver Raven would lose its companion-only spell-grant rider

That would be a misleading trace rather than an honest subset.

## Proposed widenings

1. `mounted_companion` atom or equivalent rider/attachment state

- Needed for mechanics keyed to "while you ride the goat" and "if you mount the nightmare".

2. `MagicItemSpawnedCreatureMechanics.upkeepCost` (or equivalent elapsed-time resource drain)

- Needed for charge consumption per hour while a companion remains active.

3. `CreatureDismissal.returns_to_item`

- Needed for figurines that revert to statuette form instead of disappearing.

4. `GrantedSpellTargetRestriction.attached_companion_only`

- Needed for Silver Raven's "cast Animal Messenger on it".

## Evidence

- "While you ride the goat, any Hostile creature that starts its turn within a 30-foot Emanation originating from the goat must succeed on a DC 15 Wisdom saving throw..."
- "The figurine has a 10 percent chance each time you use it to ignore your orders... If you mount the nightmare while it is ignoring your orders, you and the nightmare are instantly transported..."
- "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge."
- "At the end of the duration, the creature reverts to its figurine form."
- "While in raven form, the figurine grants you the ability to cast Animal Messenger on it."
