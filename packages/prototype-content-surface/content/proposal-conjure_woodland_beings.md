# Proposal: Widenings Required for Conjure Woodland Beings

**Unit**: Conjure Woodland Beings (Level 4 Conjuration, SRD 5.2.1)
**Outcome**: `structural_widening`

---

## Why the Unit Does Not Fit

The spell's core mechanic is a **self-moving emanation** (10-foot radius centered on the caster, travels with them) that fires **caster-optional, movement-triggered Wisdom saves** against **5d8 Force damage** (half on success). The save triggers on three distinct events:

1. The emanation enters a creature's space (caster moves toward creature)
2. A creature enters the emanation (creature moves into range)
3. A creature ends its turn inside the emanation

Additionally, "a creature makes this save only once per turn" — a per-target per-turn rate limiter.

A secondary passive effect allows the caster to take Disengage as a Bonus Action for the duration.

None of the four existing spell families represent this pattern honestly:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Handles static attachments + always-on `roll_modifier` / `damage_on_hit` riders. Not movement-event-triggered, not optional, no emanation attachment. |
| `activation` | Instant / one-shot phases. Not a persistent moving area. |
| `triggered_reaction` | Reaction-shaped spell. Cast as an action, not in response to a trigger. |
| `anchored_trigger` | Plants a trigger at a fixed location. An Emanation moves with the caster. |

---

## Required Widenings

### 1. `surface_widening` — New `Range` variant: `emanation`

**Current `Range`**: `self | touch | point`

An Emanation is not `self` (no area), not `touch` (single target), and not `point` (fixed position). It is a self-moving sphere that travels with the caster throughout the duration. This pattern appears in multiple SRD spells (Spirit Guardians is the canonical prior art).

```typescript
// Proposed addition to Range:
| { readonly kind: "emanation"; readonly radiusFeet: number }
```

---

### 2. `structural_widening` — New spell family: `ongoing_emanation`

The emanation + movement-triggered conditional save is a distinct family. Proposed shape:

```typescript
// Sketch only — not a complete spec
export type OngoingEmanationMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_emanation";
  readonly radiusFeet: number;       // size of the moving area
  readonly triggers: ReadonlyArray<EmanationTrigger>;
  readonly optional: boolean;        // caster chooses whether to invoke
  readonly saveGate: {
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: Effect;
    readonly onSuccess: Effect;
  };
  readonly perTargetLimit?: { readonly kind: "once_per_turn" };
  readonly passiveEffects?: ReadonlyArray<PassiveSpellEffect>;
};

// Trigger events for the emanation
export type EmanationTrigger =
  | { readonly kind: "emanation_enters_creature_space" }
  | { readonly kind: "creature_enters_emanation" }
  | { readonly kind: "creature_ends_turn_in_emanation" };
```

---

### 3. `atom_widening` — New window atom: `emanation_contact_window`

The three movement-event triggers are not covered by any existing window atom:
- `on_hit_window` — weapon/spell hit only
- `post_action_window` — after a creature's action
- `reaction_window` — reaction trigger
- `rest_window` — end of rest

A window atom is needed for "creature enters emanation / emanation enters creature's space / creature ends turn in emanation." Closest label: `emanation_contact_window` (covers entry) + `turn_end_window` (already exists for end-of-turn, but needs to be scoped to "while in emanation").

---

### 4. `atom_widening` — New resource atom: `per_creature_per_turn_fence`

"A creature makes this save only once per turn" is not a global `use_count` (which resets on rest or turn start for the wielder). It is a per-target rate limiter that resets on each creature's own turn. No existing atom models this; `use_count` with `once_per_turn` tracks the wielder's turn, not each affected creature's turn independently.

---

### 5. `atom_widening` — New effect atom: `grant_action_as_bonus_action`

"You can take the Disengage action as a Bonus Action for the spell's duration."

The existing `grant_extra_action` (class-feature only, grants a full extra action) does not cover this. This is an action-cost reduction: a specific Standard Action becomes available at Bonus Action cost. Proposed atom: `grant_action_as_bonus_action` with a `standardAction` field specifying which action (`disengage` in this case).

---

### 6. `surface_widening` — Optional flag on save triggers

"you **can** force that creature to make a Wisdom saving throw" — the caster's choice at the time of the trigger event. No current `save_gate` variant in `ActivationPhase` or `SaveGateRider` is caster-optional. This is a narrow surface widening (adding an `optional: boolean` to the gate trigger) rather than a structural one, since the save itself and its outcomes are standard.

---

## What Fits Without Widening

- **Damage type**: `force` — already in `DamageType`
- **Damage amount**: 5d8 base + 1d8/slot above 4 — representable as `linear_per_level` with `axis: "slot"`, `base: {dice: 5, dieSize: 8}`, `perLevel: {dice: 1}`, `startingAtLevel: 5`
- **Concentration**: `duration.kind = "concentration"` with `upTo: { unit: "minute", amount: 10 }` — already in `Duration`
- **Casting time**: Action — already in `CastingTime`
- **Save ability**: WIS — already in `Ability`
- **DC source**: caster spell save DC — already in `DcSource`
- **Damage on fail / half on success**: standard save-gate branching

---

## Related Prior Art in Corpus

**Spirit Guardians** (not yet encoded) has the same emanation + movement-triggered save structure. Any widening for Conjure Woodland Beings should be designed to accommodate Spirit Guardians as well. Both spells represent the canonical "aura of harm" pattern in SRD 5.2.1.
