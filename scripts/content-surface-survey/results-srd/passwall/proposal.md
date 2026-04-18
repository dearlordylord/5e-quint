# Proposal: Passwall widening

## Unit

**Passwall** — Level 5 Transmutation, SRD 5.2.1 (Spells/Descriptions-N-Z#Passwall)

## Outcome

`atom_widening` — the spell's structure fits existing grammar (timed duration, object attachment, activation/ongoing family) but the core effect atom is missing from v4 and `types.ts`.

---

## Gap 1 — Missing atom: `create_passage`

### What it means

Passwall creates a traversable void through an existing solid surface for its duration. No v4 atom covers this:

| Candidate | Why it fails |
|---|---|
| `create_object` | Creates **new** matter (Fabricate, Walls of Ice/Stone). Passwall **removes** matter (negative space). Opposite operation. |
| `alter_item_kind` | Relabels an object's rules kind (Folding Boat: box → rowboat). Can't carry spatial dimensions or eject-on-end semantics. Produces a dishonest trace. |
| `block_travel` | Restricts movement through a space. Passwall does the inverse. |

### Proposed atom

```typescript
| {
    readonly kind: "create_passage";
    // Maximum opening dimensions (all author-specified; actual size
    // is caster-chosen up to these bounds at cast time).
    readonly maxWidthFeet: number;
    readonly maxHeightFeet: number;
    readonly maxDepthFeet: number;
  }
```

The atom attaches to the targeted surface via the existing `object` attachment. The passage exists for the host spell's duration and then closes (lifecycle handled by the existing `expire` atom). The eject-on-end behavior is a secondary gap addressed below.

### SRD evidence

> "A passage appears at a point that you can see on a wooden, plaster, or stone surface (such as a wall, ceiling, or floor) within range and lasts for the duration. You choose the opening's dimensions: up to 5 feet wide, 8 feet tall, and 20 feet deep."

---

## Gap 2 — Missing `ObjectMaterial` values: `stone`, `wood`, `plaster`

### What it means

`OBJECT_MATERIALS` in `types.ts` currently defines only `"metal"` and `"flammable"`. Passwall targets wooden, plaster, or stone surfaces. The `ObjectFilter.material` field cannot express this gate without new values.

### Proposed widening

Extend `OBJECT_MATERIALS`:

```typescript
export const OBJECT_MATERIALS = [
  "metal",
  "flammable",
  "stone",
  "wood",
  "plaster",
] as const satisfies ReadonlyArray<string>;
```

Alternatively, introduce a broader `"structural"` category covering all three if other spells share the same gate (Wall of Stone, Meld into Stone, Stone Shape all pierce or target stone; Passwall adds wood and plaster).

---

## Gap 3 — Missing lifecycle mechanic: eject-on-expire

### What it means

When the passage closes, any creatures or objects still inside are safely moved to the nearest unoccupied space. This is a spatial-cleanup lifecycle event triggered by the spell's expiry — not a target-action-driven early end. None of the existing `DurationEndTrigger` variants cover it:

```typescript
// Current triggers — all target-action-driven:
| { readonly kind: "target_makes_attack_roll" }
| { readonly kind: "target_deals_damage" }
| { readonly kind: "target_casts_spell" }
| { readonly kind: "target_dons_armor" }
| { readonly kind: "target_damaged_by_caster_or_ally" }
| { readonly kind: "target_takes_damage" }
| { readonly kind: "caster_recasts_spell" }
```

### Options

**Option A** — new `DurationEndTrigger` variant:
```typescript
| { readonly kind: "expire_eject_occupants" }
```
Semantics: when the host effect expires, any creatures/objects occupying the effect's volume are moved to the nearest unoccupied space. The nearest-unoccupied-space logic is caller-owned.

**Option B** — new `EffectAtom`:
```typescript
| { readonly kind: "eject_occupants_on_expire" }
```
Authored as an effect in the direct/ongoing phase alongside the `create_passage` atom. Keeps cleanup semantics visible in the effect list rather than hidden in the duration grammar.

Option B is preferred — it keeps the effect explicit and composable with future surface pressure (Forcecage eject, Maze eject-on-end).

---

## Proposed encoding (pending widening)

Once the three gaps are addressed:

```
family: "activation"
level: 5
school: "transmutation"
castingTime: { kind: "action" }
range: { kind: "point", feet: 30 }
components: { v: true, s: true, m: "a pinch of sesame seeds" }
duration: { kind: "timed", value: { unit: "hour", amount: 1 } }

phases:
  - kind: "direct"
    attachment:
      kind: "object"
      count: 1
      filter:
        material: "stone" | "wood" | "plaster"   ← Gap 2
    effects:
      - kind: "create_passage"                   ← Gap 1
        maxWidthFeet: 5
        maxHeightFeet: 8
        maxDepthFeet: 20
      - kind: "eject_occupants_on_expire"        ← Gap 3
```

The `timed` duration (non-concentration, 1 hour) fits the existing `Duration` shape without change.

---

## Summary

| Gap | Kind | Blocking? |
|---|---|---|
| `create_passage` atom | `atom_widening` | Yes — core mechanic |
| `ObjectMaterial` stone/wood/plaster | `surface_widening` | Secondary |
| Eject-on-expire mechanic | `atom_widening` or `surface_widening` | Secondary |
