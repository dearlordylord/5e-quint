## Rod of Alertness

Outcome: `structural_widening`

### Why it does not fit honestly

The item is a composite magic item with three parts:

1. A held passive rider:
   - Advantage on Initiative rolls.
   - Advantage on Wisdom (Perception) checks.
2. A held spell-access rider:
   - `Detect Evil and Good`
   - `Detect Magic`
   - `Detect Poison and Disease`
   - `See Invisibility`
3. A planted, timed protective aura:
   - activated with a Magic action;
   - persists for 10 minutes or until a creature pulls the rod up with a Magic action;
   - applies to creatures in a 60-foot Bright Light radius;
   - grants +1 AC, +1 saving throws, and invisible-creature location sensing while inside that Bright Light;
   - refreshes at next dawn.

Parts 1 and 2 fit the current surface:

- `MagicItemMechanics.composite`
- passive `holding_item` gate
- `modify_roll_advantage`
- `grant_spell_access`

The blocker is part 3. The current non-spell surface only allows magic-item/class-feature/species/feat activations through `ActivatedAbilityMechanics`, which has:

- activation cost;
- resource/reset cadence;
- optional duration metadata;
- `phases` for immediate resolution.

It does **not** allow non-spell `ongoing_effect`-style operations, area attachments that persist as an aura over time, or a persistent effect that ends on a second non-spell activation ("pull the rod from the ground"). Authoring the aura as a one-shot `direct` phase would be false, because the item's main mechanic is an ongoing positional state, not an instantaneous application.

### Honest widening

Add a non-spell ongoing family, or generalize the existing ongoing grammar so magic items can use it.

Minimal shape:

- widen `MagicItemComponentMechanics` with an `ongoing_effect`-like family;
- or widen `ActivatedAbilityMechanics` so non-spell activations can carry:
  - persistent `attachment`,
  - `operations`,
  - timed expiry,
  - and early/manual end semantics for a second action ending the planted state.

### Secondary gaps surfaced by this item

Even after the family widening, two narrower pressures remain:

1. Light-region coupling.
   The aura keys off "While in that Bright Light". The current surface has no authored way to say "effects apply only inside the bright-light subregion created by this activation". Light emission itself has generally been treated as caller-owned, but here the light region is also the deterministic boundary for the buffs.

2. Invisible-creature location sensing.
   The closest existing atom is `grant_sense`, but the item grants only "sense the location of any Invisible creature that is also in the Bright Light", which is narrower than a generic permanent sense and is scoped to the aura region.

Those are secondary to the main blocker: the missing non-spell persistent-aura family.

### Evidence

> "As a Magic action, you can plant the haft end of the rod in the ground..."

> "While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws and can sense the location of any Invisible creature that is also in the Bright Light."

> "The rod's head stops glowing and the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground."

> "Once used, this property can't be used again until the next dawn."
