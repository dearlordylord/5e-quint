# Proposal: Delayed Blast Fireball surface widenings

## Classification

`surface_widening` — the spell fits the `ongoing_effect` family and all needed atoms exist in v4, but the surface lacks variants to express:
1. A damage amount that accumulates turn-by-turn during concentration
2. A trigger that fires when the spell ends (rather than during it)
3. A trigger for a creature touching the spell's attachment point
4. A creature-agency throw mechanic with collision-triggered spell termination

---

## Mechanic 1: Accumulating damage counter

**SRD text:** "The spell's base damage is 12d6, and the damage increases by 1d6 whenever your turn ends and the spell hasn't ended."

The damage at explosion time is 12d6 + (N × 1d6) where N is the number of caster turns that elapsed while the spell was active. This is a runtime counter — not a cast-time level. `DiceAmount.linear_per_level` requires `LevelAxis`, whose current variants (`character`, `class`, `slot`, `subclass`, `proficiency_bonus`) are all resolved at cast time or character-sheet time, not during play.

### Proposed widening

**Option A (narrower):** Add `"turns_elapsed"` to `LevelAxis`. This reuses the existing `linear_per_level` machinery but extends the axis vocabulary to include runtime turn counts. Simple, but conceptually stretches `LevelAxis` beyond its "scalar character progression" semantics.

**Option B (more honest):** Add a new `DiceAmount` variant:

```typescript
| {
    readonly kind: "accumulating";
    readonly base: DiceExpr;
    readonly perTrigger: DiceExprDelta;
    readonly trigger: "caster_turn_end";  // closed for now; widen if another unit surfaces "per round elapsed" accumulation
  }
```

The trigger fires each time the caster's turn ends while the spell persists; the damage counter grows. At explosion time, the counter value is used as the damage amount. Option B is the honest choice because `turns_elapsed` is not a level — it is a runtime event count.

**Upcast scaling** (+1d6 base per slot above 7) maps cleanly to `DiceAmount.linear_per_level` with `axis="slot"` and can be layered on top of the accumulating base.

---

## Mechanic 2: On-spell-end explosion trigger

**SRD text:** "When the spell ends, the bead explodes, and each creature in a 20-foot-radius Sphere … makes a Dexterity saving throw."

All existing `OngoingTrigger` variants fire *during* the spell's active window (on turn start, on hit, on creature entering area, etc.). There is no trigger variant for "when the spell terminates" — whether that termination is natural (concentration dropped, duration elapsed) or forced (touch/throw path below).

### Proposed widening

Add to `OngoingTrigger`:

```typescript
| { readonly kind: "on_spell_end" }
```

The tracer would emit a `post_action_window` or a new `spell_end_window` atom tied to the lifecycle `expire` / `dismiss` / `break` nodes. The explosion's `save_gate` → `damage` would be connected via this trigger.

---

## Mechanic 3: Creature-touch trigger

**SRD text:** "If a creature touches the glowing bead before the spell ends, that creature makes a Dexterity saving throw."

This opens a save window when any creature makes physical contact with the bead (the spell's attachment point). No existing `OngoingTrigger` covers contact with the attachment itself.

### Proposed widening

Add to `OngoingTrigger`:

```typescript
| { readonly kind: "on_creature_touches_attachment" }
```

This is distinct from `on_creature_enters_area` (geometrically-defined area, not point contact) and `on_attached_damaged` (damage, not touch). It is a close-range physical-contact event.

---

## Mechanic 4: Creature-agency throw with collision termination

**SRD text:** "On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead enters a creature's space or collides with a solid object, the spell ends, and the bead explodes."

On a successful touch-save, the creature (not the caster) may reposition the bead. `reposition_attachment` exists but is exclusively a caster-action atom (`cost: caster_spends_action`). Here it is creature-agency with:
- A distance cap (40 ft)
- Collision semantics: entering a creature's space or hitting a solid object ends the spell

This combines creature-agency repositioning with collision-triggered early spell termination. Neither is representable in the current surface.

### Proposed widening

Extend the `on_spell_end` trigger (Mechanic 2) to include a `collision` early-end trigger on `Duration`:

```typescript
// In DurationEndTrigger:
| { readonly kind: "attachment_collision"; readonly collidesWith: "creature_space" | "solid_object" }
```

And extend `OngoingEffect` (or add a new phase shape) for creature-agency throw:

```typescript
| {
    readonly kind: "creature_throw_attachment";
    readonly maxFeet: number;
    readonly endsTriggers: ReadonlyNonEmptyArray<"creature_space" | "solid_object">;
  }
```

This is scoped to the touch-save success branch only.

---

## What fits without widening

- **Spell family**: `ongoing_effect` ✓
- **Attachment**: `{ kind: "object" }` (the bead) at `{ kind: "point", feet: 150 }` ✓
- **Duration**: `{ kind: "concentration", upTo: { unit: "minute", amount: 1 } }` ✓
- **Components**: V, S, M ✓
- **School**: `evocation` ✓
- **Level**: 7 ✓
- **Upcast scaling** (+1d6 base per slot above 7): `DiceAmount.linear_per_level axis="slot"` ✓
- **Explosion shape**: `area { kind: "sphere", radiusFeet: 20 }` origin `on_primary_target` ✓
- **Dex save + half-damage**: `save_gate { ability: "dex", onSuccess: { kind: "half_damage" } }` ✓
- **Fire damage type**: `"fire"` ✓
- **Flammable objects igniting**: DM-agenda, legitimately omitted ✓

---

## Summary

Four surface widenings are needed. All are `new_variant` (extending existing types), not new v4 atoms. Priority order:

| # | Gap | Proposed fix | Urgency |
|---|-----|-------------|---------|
| 1 | Accumulating per-turn damage | `DiceAmount.accumulating` variant | Blocking |
| 2 | Explosion on spell end | `OngoingTrigger.on_spell_end` | Blocking |
| 3 | Creature-touch trigger | `OngoingTrigger.on_creature_touches_attachment` | Secondary |
| 4 | Creature-agency throw + collision | `DurationEndTrigger.attachment_collision` + `OngoingEffect.creature_throw_attachment` | Secondary |

Gaps 1 and 2 together block the core mechanic. Gaps 3 and 4 are the touch/throw interaction path; the spell can be partially encoded (minus the touch/throw path) once 1 and 2 are resolved.
