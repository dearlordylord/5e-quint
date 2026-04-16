# Proposal: Widening for Contingency

**Unit:** Contingency (SRD 5.2.1, level 6 Abjuration)
**Outcome:** `structural_widening`
**Closest family:** `anchored_trigger` (used by Alarm)

---

## Why anchored_trigger is closest but not sufficient

Alarm established the `anchored_trigger` family: cast a spell to plant a trigger on an anchor; when a matching event fires (gated by filters), the spell releases a signal effect. Contingency fits this high-level shape — store something at cast time, release it when a condition is met — but diverges from Alarm in every structural detail.

### Gap 1: AnchorTarget has no `self` variant (surface_widening)

Contingency plants its trigger on **the caster**, not on a door, window, or area. `AnchorTarget` currently only models `location` and `area`. A `{ kind: "self" }` variant is needed.

### Gap 2: AnchoredEvent cannot represent a free-form player-described condition (structural_widening)

This is the critical gap. The SRD says:

> "You describe that trigger when you cast the two spells."

Alarm's events (`physical_contact`, `enters_area`) are closed, deterministic, engine-evaluable predicates. Contingency's trigger is literally any condition the caster names — "when I drop to 0 HP", "when I am engulfed in water", "when I am targeted by a divination spell", etc. No closed-enum variant can honestly represent this without collapsing to a free-text string. This is a structural break from the closed-atom model.

A possible future variant: `{ kind: "player_described_condition"; description: string }` — but this means the engine cannot deterministically evaluate the condition; DM adjudication is required at trigger time. This makes the trigger predicate partially `dm_agenda`, while the stored spell release is fully mechanical. The architecture must decide whether to represent the condition as an opaque string (with DM-adjudication semantics) or to develop a richer closed trigger grammar covering common patterns (HP threshold, condition applied, spell targeted, etc.).

### Gap 3: AnchoredSignal has no `stored_spell_release` variant (surface_widening)

The Alarm signals (`audible`, `mental`) are notification effects. Contingency's "signal" is the full mechanical execution of the stored contingent spell, applied to the caster. The signal union needs a `{ kind: "stored_spell_release" }` variant that points at the stored spell payload.

### Gap 4: Dual spell-slot consumption at cast time (surface_widening)

Contingency consumes two spell slots simultaneously:
- One level 6 slot for Contingency itself
- One level 1–5 slot for the contingent spell

The current surface models a single `spell_slot` resource per cast. A dual-slot pattern requires either a new resource shape or a way to annotate an additional slot consumption tied to the stored spell's level.

### Gap 5: Cast-time constrained spell capture (new subgraph)

Contingency requires choosing a second spell at cast time, subject to constraints:
- Level ≤ 5
- Casting time: action
- Must be able to target the caster

The taxonomy lists `stored_spell` as an attachment atom (§3), and `store`/`release` as procedure atoms (§2). These exist in the taxonomy inventory but have no corresponding surface types. A `stored_spell` attachment with a constraint filter (`{ canTarget: "self", castingTime: "action", maxLevel: 5 }`) is needed to represent the contingent spell reference. The stored spell's own mechanics (effects, saves, etc.) should be treated as a pointer to another authored unit, not inlined.

---

## Summary table

| Gap | Type | Scope |
|---|---|---|
| `AnchorTarget` missing `self` | `surface_widening` | New variant of existing type |
| `AnchoredEvent` cannot model open conditions | `structural_widening` | Requires either DM-adjudication semantics or a new closed trigger grammar |
| `AnchoredSignal` missing `stored_spell_release` | `surface_widening` | New variant of existing type |
| Dual spell-slot consumption | `surface_widening` | New resource shape or annotation |
| Stored spell reference with constraint filter | `structural_widening` | New subgraph (stored_spell attachment + constraint filter) |

The open trigger predicate and stored-spell-reference pattern are both structural gaps. All other items are surface widenings that could be added incrementally to `AnchoredTriggerMechanics`.

---

## Recommended future path

1. **Add `stored_spell` attachment** to the surface types, referencing a unit by ID with optional constraint annotations. This unlocks Contingency and Glyph of Warding.
2. **Decide on trigger predicate semantics.** Option A: closed trigger grammar (HP threshold, condition applied, spell targeted, etc.) to keep engine-evaluable predicates. Option B: opaque `player_described_condition` string with DM-adjudication semantics, documented as out-of-core. Contingency is the primary pressure case for this decision.
3. **Add `AnchorTarget { kind: "self" }`** trivially alongside any Glyph of Warding encoding work.
4. **Model dual slot cost** once `stored_spell` attachment exists — the cost naturally attaches to the stored spell reference.
