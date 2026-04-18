# Proposal: Delayed Blast Fireball — Surface Widenings

## Outcome

`surface_widening` — The payload family (`ongoing_effect`) and all resolution shapes
(save\_gate, sphere area, dex save, half\_damage on success) already exist. The encoding
fails on four missing variants of existing surface types.

No `content/delayed_blast_fireball.dhall` is authored because all four gaps are load-bearing:
omitting or misrepresenting them would produce a misleading trace.

---

## Mechanic 1: Damage Accumulation Counter

### SRD text

> The spell's base damage is 12d6, and the damage increases by 1d6 whenever your turn ends
> and the spell hasn't ended.

### Surface gap

`DiceAmount` has no variant for a runtime accumulator. Existing variants fix the value
at cast time or derive it from a static axis (character / class / slot / subclass / PB
level). Delayed Blast Fireball's damage is a stateful counter: it starts at 12d6 and grows
by exactly 1d6 each time the caster's turn ends while the spell persists. The total is not
knowable at cast time.

### Proposed widening

Add a new `DiceAmount` variant:

```typescript
| {
    readonly kind: "accumulated";
    readonly base: DiceExpr;
    readonly perTrigger: DiceExprDelta;
    readonly trigger: "on_caster_turn_end";  // or a shared OngoingTrigger reference
  }
```

The runtime engine tracks how many times the trigger has fired since cast, multiplies
`perTrigger` by that count, and adds it to `base` at explosion time. The upcast widening
(base increases by 1d6 per slot above 7) composes on top of `base` via existing slot
scaling.

---

## Mechanic 2: `on_caster_turn_end` Trigger

### SRD text

> …increases by 1d6 **whenever your turn ends** and the spell hasn't ended.

### Surface gap

`OngoingTrigger` has `on_caster_turn_start` but not `on_caster_turn_end`. These are
mechanically distinct: start-of-turn fires before any actions resolve; end-of-turn fires
after all actions, bonus actions, and movement have resolved. Conflating them would
misrepresent when the damage accrues.

### Proposed widening

```typescript
| { readonly kind: "on_caster_turn_end" }
```

Added to the `OngoingTrigger` union alongside the existing `on_caster_turn_start`.
The tracer would emit a `turn_end_window` (already in the v4 window inventory) for this
trigger kind.

---

## Mechanic 3: `on_spell_end` Explosion Trigger

### SRD text

> When the spell ends, the bead explodes, and each creature in a 20-foot-radius Sphere
> centered on that point makes a Dexterity saving throw.

### Surface gap

The explosion fires **when the spell terminates** regardless of cause — natural expiry,
dropped concentration, bead-touch save failure, or thrown-bead collision. No `OngoingTrigger`
variant fires on host-effect termination. Existing triggers fire on recurring schedules
(`on_caster_turn_start`, `on_attached_turn_start`) or creature events (`on_creature_enters_area`),
not on spell end.

### Proposed widening

```typescript
| { readonly kind: "on_spell_end" }
```

This trigger is semantically distinct from both per-turn triggers and the duration's `expire`
lifecycle node: the explosion is an effect that fires exactly once at termination, not a
recurring operation. The tracer would connect it to a new `spell_end_window` atom or reuse
`post_action_window` with an appropriate label.

---

## Mechanic 4: Bead-Touch Interaction

### SRD text

> If a creature touches the glowing bead before the spell ends, that creature makes a
> Dexterity saving throw. On a failed save, the spell ends, causing the bead to explode.
> On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead
> enters a creature's space or collides with a solid object, the spell ends, and the bead
> explodes.

### Surface gaps (two)

**4a. Trigger: `on_creature_touches_object`**

`OngoingTrigger` has `on_creature_enters_area` and `on_creature_moves` but no physical-contact
event for a spell-attached object. The bead is a created object at a fixed point; any creature
that makes physical contact with it opens the save-gate window.

```typescript
| { readonly kind: "on_creature_touches_object" }
```

**4b. Success outcome: throw object**

On a successful save the creature may throw the bead up to 40 feet. This is a player-chosen
repositioning action on the spell's object attachment with a capped distance and
termination-on-collision semantics (the thrown bead ending the spell if it collides). No
`SaveSuccessOutcome` variant or `EffectAtom` covers granting the target an ad-hoc throw
action on an active spell object. This likely needs either:

- A new `EffectAtom.throw_object` variant with `{ maxFeet: number }`, paired with the
  `on_spell_end` trigger for the collision-triggered explosion; or
- A new `SaveSuccessOutcome` sentinel analogous to `half_damage` that encodes the
  throw-object grant idiom without duplicating the full object lifecycle.

The collision sub-rule ("if the thrown bead enters a creature's space or collides with a
solid object, the spell ends") also needs the `on_spell_end` trigger from Mechanic 3 to
be wired into the bead's repositioning logic.

---

## Mechanic 5: Flammable Objects (omitted — DM agenda)

> When the bead explodes, flammable objects in the explosion that aren't being worn or
> carried start burning.

Per `ARCHITECTURE.md`, setting objects on fire is DM agenda (environmental state the DM
tracks). This mechanic has no deterministic mechanical resolution in the core rules engine
and is legitimately omitted.

---

## Upcast Scaling (would be clean once base is encodable)

> The base damage increases by 1d6 for each spell slot level above 7.

This is standard slot scaling on `base` within the `accumulated` DiceAmount variant.
Once Mechanic 1's new variant exists, the upcast composes cleanly via:

```typescript
// on base DiceExpr, slot-linear scaling:
// base: { dice: 12 + (slot - 7), dieSize: 6, flat: 0 }
// OR explicit slot tiers on the base field
```

No additional widening needed for the upcast once the accumulation primitive exists.

---

## Summary Table

| # | Gap | Kind | Blocking? |
|---|-----|------|-----------|
| 1 | `DiceAmount.accumulated` | `new_variant` | Yes — core damage cannot be expressed |
| 2 | `OngoingTrigger.on_caster_turn_end` | `new_variant` | Yes — accumulation cadence wrong without it |
| 3 | `OngoingTrigger.on_spell_end` | `new_variant` | Yes — explosion timing cannot be expressed |
| 4a | `OngoingTrigger.on_creature_touches_object` | `new_variant` | Yes — bead-touch mechanic unaddressable |
| 4b | Throw-object success outcome | `new_variant` | Yes — success branch has no honest atom |
| 5 | Flammable objects | DM agenda | No — legitimately omitted |

All five blocking gaps are new variants of existing surface types, not new v4 atoms or new
payload families. Classification: **`surface_widening`**.
