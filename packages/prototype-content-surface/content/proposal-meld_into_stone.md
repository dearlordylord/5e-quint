# Proposal: Meld into Stone — structural_widening

## Unit

- **Name:** Meld into Stone
- **Slug:** `meld_into_stone`
- **Level:** 3 Transmutation
- **Casting Time:** Action (also Ritual)
- **Range:** Touch
- **Duration:** 8 hours (timed, not concentration)
- **Components:** V, S

## Why encoding was blocked

Meld into Stone cannot be encoded honestly in any existing `SpellMechanics` family.

### 1. No family hosts "self-merger into object"

The spell's core effect is the caster physically entering and merging with a stone object. This produces a persistent caster state lasting up to 8 hours in which:

- The caster is undetectable by nonmagical senses (hidden state)
- Movement is 0 (except using 5 ft movement to exit, which ends the spell)
- Perception (hearing) checks have Disadvantage
- The caster can cast spells on themselves
- Ending requires deliberate movement action (or expulsion)

None of the four existing `SpellMechanics` families can host this:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Requires `OngoingOperation` (roll_modifier or damage_on_hit). Neither covers "merge into stone", restricted movement, or Disadvantage on Perception. |
| `activation` | For one-shot combat phases (attack_roll or save_gate at cast time). No such resolution occurs here. |
| `triggered_reaction` | Reaction-shaped spells only. This is a normal Action cast. |
| `anchored_trigger` | Plants a trigger on a location. Here the *caster* merges into an object — no planted anchor, no signal, no release on event. |

The closest analogy structurally is `ongoing_effect` (timed, persistent, self-attached), but `OngoingOperation` only carries `roll_modifier` and `damage_on_hit`. A self-transformation state with movement restriction and sense restriction is a fundamentally different operation shape.

### 2. Expulsion-on-destruction mechanic has no v4 atom chain

When the host stone is damaged, two distinct expulsion branches trigger:

- **Partial destruction / reshape** → expelled + 6d6 Force damage + Prone
- **Complete destruction / transmutation** → expelled + 50 Force damage + Prone

This is damage + condition applied to the *caster* when an *external object* reaches a destruction threshold. The triggering event is "host object is partially/fully destroyed," which is:
- Not a combat action (attack roll, spell, save)
- Not a turn-boundary event (turn start/end window)
- Not a rest event

No v4 window atom covers "host object destruction event." The `post_action_window` is the closest approximation but it covers "after a creature acts on an anchor," not "when an inanimate object's HP crosses a threshold." This would need either a new window kind (`object_destruction_window`) or a new subgraph for "damage-to-self-when-containing-object-is-destroyed."

### 3. Disadvantage on Perception is outside OngoingOperation

Even if a self-merger family existed, the Disadvantage on Wisdom (Perception) checks to hear sounds outside requires `modify_roll_advantage` as a valid `OngoingOperation` variant. Currently `OngoingOperation = RollModifierOperation | DamageOnHitOperation` — Disadvantage is not expressible.

## Proposed widenings (narrowest classification)

### A. New family: `self_merge` (structural)

A new `SpellMechanics` family for spells that merge the caster into or with an object/plane. Key shape:

```
SelfMergeMechanics = SpellMechanicsHeader & {
  family: "self_merge";
  anchor: MergeAnchor;           // object type constraint (e.g. "stone, large enough")
  ingressCost: ...;              // movement type (e.g. "touch")
  egressCost: ...;               // how to leave (e.g. "5 ft movement, ends spell")
  whileMerged: ReadonlyArray<MergedEffect>;  // effects while inside
  expulsionBranches: ReadonlyArray<ExpulsionBranch>;  // conditional damage on exit
}
```

### B. New subgraph: `expulsion_on_destruction` (structural)

A window-triggered subgraph for "damage + condition applied to occupant when host object is destroyed or reshaped." Pressure case: Meld into Stone. Future: imprisonment variants, object-bound effects.

```
ExpulsionBranch = {
  trigger: "partial_destruction" | "full_destruction" | "transmutation" | "resize";
  damage: DiceExpr | number;    // 6d6 Force or fixed 50
  damageType: DamageType;
  condition?: Condition;         // prone
  movement: "nearest_unoccupied";
}
```

### C. New `OngoingOperation` variant: `modify_roll_advantage` (surface widening)

Even in a hypothetical extended `ongoing_effect` family, `modify_roll_advantage` would need to join `OngoingOperation`:

```typescript
export type ModifyRollAdvantageOperation = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;  // or skill check kinds
};
```

This would be a `surface_widening` secondary to the structural gap.

## Ritual flag

The spell can be cast as a Ritual. The `CastingTime.minutes` variant already has `ritual: boolean`, so this is representable as:

```
castingTime = { kind = "minutes", amount = 10, ritual = True }
```

This is **not** a widening — the existing surface already covers it.

## Summary

| Gap | Classification |
|---|---|
| No family for self-merger into object | structural_widening |
| No expulsion-on-object-destruction subgraph | structural_widening |
| `modify_roll_advantage` not in `OngoingOperation` | surface_widening (secondary) |
