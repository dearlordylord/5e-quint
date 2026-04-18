# Proposal: surface_widening for Rod of Absorption

`Rod of Absorption` should not be authored into `content/` with the current surface.

The outer shape is already present:

- `kind: "magic_item"` exists.
- `MagicItemMechanics.family: "composite"` exists.
- A triggered-reaction component plus a passive held-item component would be the honest family fit.

The blockers are narrower than a new family. They are missing variants of existing surface grammars.

## Why it is not clean

The rod has three coupled mechanics:

1. A reaction that cancels a qualifying spell targeting only the wielder.
2. A stored-energy reservoir that gains spell levels equal to the canceled spell's cast level, up to a lifetime ceiling of 50 absorbed levels.
3. A passive permission for a spellcaster wielder to spend stored energy as substitute spell slots for spells they already know or have prepared, with slot-level caps.

The current surface can express only part 1, and only almost:

- `negate_triggering_spell` exists.
- `triggered_reaction` magic-item mechanics exist.
- But `ReactionTrigger` has no generic "targeted by a spell" variant with the needed predicates.

Parts 2 and 3 do not fit the existing resource surface honestly:

- `charge_pool` only models a bounded pool with fixed/level-based activation costs and reset cadences.
- It cannot model refilling from the triggering spell's cast level.
- It cannot model the rod's separate lifetime absorption ceiling of 50 total levels.
- It cannot model "use stored levels in place of your slots" for any spell the wielder already knows or has prepared.

## Required widenings

### 1. `ReactionTrigger.targeted_by_spell`

Classification: `surface_widening`

Need a generic non-named spell-target trigger, likely parallel to the existing spell predicates already used on `spell_save_outcome`.

Why:

- The current trigger surface has `targeted_by_named_spell`, but the rod reacts to any qualifying spell.

Evidence:

> "you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect"

Suggested shape:

- `ReactionTrigger = { kind: "targeted_by_spell", spellTargetsOnlySelf?: true, spellHasNoAreaOfEffect?: true }`

### 2. Absorbed spell-energy reservoir resource

Classification: `surface_widening`

Need a resource variant distinct from `charge_pool`.

Why:

- The rod stores spell levels, not ordinary charges.
- Refill amount is derived from the triggering spell's cast level.
- The item tracks both current stored energy and total absorbed energy over its existence.
- The rod stops absorbing once lifetime absorbed energy reaches 50, even if current stored energy later drops.

Evidence:

> "The energy has the same level as the spell when it was cast."

> "The rod can absorb and store up to 50 levels of energy over the course of its existence."

> "Once the rod absorbs 50 levels of energy, it can't absorb more."

Suggested shape:

- New `ActivationResource` or magic-item resource variant such as `absorbed_spell_levels`
- Fields for:
  - `currentCap`
  - `lifetimeCap`
  - `initialCount`
  - refill source `triggering_spell_level`

### 3. Slot-substitution permission for wielder spellcasting

Classification: `surface_widening`

Need a way for a magic item to let the wielder spend the item's stored resource as a generic spell slot substitute for the wielder's own known/prepared spells.

Why:

- `grant_spell_access` only grants access to named spells.
- The rod does not grant any spell.
- It alters how the wielder pays slot costs for their own spells.

Evidence:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know"

> "You use the stored levels in place of your slots but otherwise cast the spell as normal."

Suggested shape:

- New variant on the magic-item passive/activation surface expressing:
  - substitute resource for spell-slot expenditure
  - max created slot level 5
  - slot level must be `<=` wielder's normal slot ceiling
  - spellcaster-only user gate

### 4. Conditional nonmagical lifecycle after lifetime-cap exhaustion

Classification: `surface_widening`

Need an item lifecycle variant more specific than `permanent_on_empty`.

Why:

- The rod does not become nonmagical when merely emptied.
- It becomes nonmagical only when both:
  - it can no longer absorb more spell energy, and
  - it has no energy remaining.

Evidence:

> "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical."

Suggested shape:

- New `ItemDestructionPolicy` or lifecycle variant gated by:
  - reservoir exhausted by lifetime cap
  - current stored energy = 0

## Why this is `surface_widening`, not `structural_widening`

No new top-level unit kind or new mechanics family is forced.

An honest future encoding would still be a `magic_item` using existing family structure, likely:

- `family: "composite"`
- part 1: `triggered_reaction` with `holding_item`
- part 2: passive held-item resource permission / spell-slot substitution

The missing pieces are inside existing families and resource grammars.

## What is caller-owned / omitted

This line is informational rather than a deterministic mechanical effect and does not force encoding pressure by itself:

> "When you become attuned to the rod, you know how many levels of energy the rod has absorbed over the course of its existence and how many levels of spell energy it currently has stored."

Likewise, "a newly found rod typically has 1d10 levels of spell energy stored in it" is naturally metadata for the reservoir's initial count once the reservoir variant exists; it does not require a separate atom.
