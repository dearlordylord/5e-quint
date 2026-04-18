# Proposal: Conjure Minor Elementals — atom_widening

## Unit

**Conjure Minor Elementals** (Level 4 Conjuration, concentration 10 min)

> You conjure spirits from the Elemental Planes that flit around you in a 15-foot Emanation for the duration. Until the spell ends, any attack you make deals an extra 2d8 damage when you hit a creature in the Emanation. This damage is Acid, Cold, Fire, or Lightning (your choice when you make the attack).
>
> In addition, the ground in the Emanation is Difficult Terrain for your enemies.

Higher-level scaling: +1d8 damage per slot level above 4.

---

## Payload family

`ongoing_effect` — concentration spell producing a persistent zone for its duration. The attachment would be `area` (emanation, radius 15 ft, origin self). Two simultaneous persistent operations needed.

---

## Blocking widenings

### 1. `difficult_terrain` — new atom (atom_widening)

**Evidence:** "the ground in the Emanation is Difficult Terrain for your enemies."

The current `EffectAtom` union has no atom for imposing terrain-state on an area. `force_move` moves creatures; `modify_speed` changes a creature's speed value. Neither expresses "all enemy movement through this area costs double." Difficult terrain is a named SRD rule state that attaches to a region of space, persists for the spell's duration, and affects enemy movement cost — none of which is composable from existing atoms.

The v4 TAXONOMY survey (§12, "Content Surface Survey Findings") independently identified `difficult_terrain` as genuinely new atom pressure (2 hits across the 460-unit survey).

**Proposed atom:**
```
difficult_terrain:
  kind: "difficult_terrain"
  scope: "enemies" | "all_creatures"   // CME uses "enemies"; other spells (Spike Growth) apply to all
```

This is a new v4 effect atom. It attaches to an area and persists for the spell's duration.

---

### 2. `damage_type_choice_at_use` — new variant (surface_widening, secondary)

**Evidence:** "This damage is Acid, Cold, Fire, or Lightning (your choice when you make the attack)."

The current `damage_on_hit` operation (and the `damage` EffectAtom) require a single fixed `DamageType`. This spell's on-hit damage type is chosen per-attack, not fixed at cast time. Encoding it as any single fixed type would be dishonest.

**Proposed surface variant** for `DamageType`-carrying fields:
```typescript
type DamageTypeSpec =
  | DamageType                                          // fixed (existing)
  | { readonly kind: "choice_at_use";                   // chosen per activation
      readonly options: ReadonlyArray<DamageType> }
```

This variant is needed here and would likely recur for Dragon's Breath (choice at cast time), Chromatic Orb, and similar spells. The distinction between "choice at cast" and "choice per use" matters for runtime modeling.

---

## Honest encoding posture

The spell cannot be encoded without both widenings. The on-hit damage bonus *could* be partially encoded with a fixed damage type, but:
- It would falsely represent the player's per-attack choice.
- The `difficult_terrain` effect still has no atom and cannot be omitted without losing a mechanically significant part of the spell.

No `.dhall`, `.json`, or `.trace.md` is produced for this unit.

---

## Classification

| Gap | Kind | Blocking? |
|---|---|---|
| `difficult_terrain` atom | `atom_widening` | Yes — no existing atom covers terrain-state |
| damage type choice at use | `surface_widening` | Yes — DamageType is fixed in current surface |

Overall outcome: **`atom_widening`** (most severe classification present).
