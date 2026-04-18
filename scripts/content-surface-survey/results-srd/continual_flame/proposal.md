# Proposal: `emit_light` effect atom

**Unit:** Continual Flame (spell, SRD 5.2.1)
**Outcome:** `atom_widening`

## Gap

Continual Flame's entire mechanical payload is producing magical light with defined bright-light and dim-light radii on a touched object. No effect atom exists for this in `EffectAtom` or the v4 taxonomy.

## Why light is a mechanical effect

In SRD 5.2.1, lighting conditions directly affect:
- Perception checks in dim light (lightly obscured)
- Attack rolls and Perception checks in darkness (heavily obscured → effectively Blinded)
- Hiding, stealth, and area-detection abilities

Light emission is deterministic and engine-observable — it is not DM-agenda.

## Structural fit (everything except the atom)

If `emit_light` existed, the spell would encode cleanly:

```
family: "activation"
level: 2
school: "evocation"
castingTime: { kind: "action" }
range: { kind: "touch" }
components: { v: true, s: true, m: "ruby dust worth 50+ GP", materialCostGp: 50, materialConsumed: true }
duration: { kind: "permanent", endsOn: ["dispel"] }
phases:
  - kind: "direct"
    attachment: { kind: "object", count: 1 }
    effects:
      - { kind: "emit_light", brightRadiusFeet: 20, dimRadiusFeet: 20 }
```

The `permanent` duration with `endsOn: ["dispel"]` and the `object` attachment are both already in the surface. Only the atom is missing.

## Proposed atom

```typescript
| {
    readonly kind: "emit_light";
    // Radius of bright light around the object or creature.
    readonly brightRadiusFeet: number;
    // Additional radius beyond bright light that is dim light.
    readonly dimRadiusFeet: number;
  }
```

**Placement:** `EffectAtom` union in `types.ts`.

**Tracer label:** `emit_light\nbright ${brightRadiusFeet} ft / dim +${dimRadiusFeet} ft`

**v4 taxonomy:** A new entry under §9 Effect Atoms. No existing v4 atom covers light emission. This is the first SRD spell whose core effect is purely a persistent light source (Faerie Fire grants advantage via the Blinded interaction, not via a raw light atom; Dancing Lights is movement + light but a cantrip with concentration).

## Secondary flavor properties not encoded

The SRD text also says: "It looks like a regular flame, but it creates no heat and consumes no fuel. The flame can be covered or hidden but not smothered or quenched." These are object-behavior flavor notes with no deterministic mechanical resolution in the core engine (heat interaction, fuel tracking, smothering immunity). They would remain unencoded as DM-agenda notes even after `emit_light` is added.
