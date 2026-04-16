# Proposal: surface_widening for warlock_mystic_arcanum_l11

## Unit

**Mystic Arcanum (warlock L11)** — `class_feature`, `warlock`, acquired at level 11.

SRD text (relevant excerpt):
> You can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.

---

## What fits

| Surface element | Verdict |
|---|---|
| `kind: "class_feature"` | fits |
| `family: "activation"` | fits |
| `activationCost: { kind: "free" }` | fits — no action cost to *have* the arcanum; activation cost is embedded in the spell's own casting time |
| `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }` | fits |
| `resetCadence: { kind: "long_rest" }` | fits |
| v4 atom `use_count` | fits |
| v4 atom `rest_window` | fits |
| v4 atom `grant_spell_access` (taxonomy §9) | named in v4 but absent from `ClassFeatureEffect` in `types.ts` |

---

## The gap

`ClassFeatureEffect` in `types.ts` is currently:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

There is no variant that expresses: **"grant access to a player-chosen spell of a given level/class, castable N times per long rest without consuming a spell slot."**

This is not a missing v4 atom — `grant_spell_access` already exists in the taxonomy. The gap is entirely at the `types.ts` surface layer: the `ClassFeatureEffect` union needs a new member.

---

## Proposed new variant

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  // Spell is chosen by the player at the time the feature is acquired,
  // not at cast time. Constraints narrow the valid spell pool.
  readonly selection: "chosen_at_acquisition";
  readonly constraint: {
    readonly spellLevel: SpellLevel;       // e.g. 6 for Mystic Arcanum L11
    readonly spellClass: ClassName;        // "warlock"
  };
  // The granted casting does NOT consume a spell slot; the use_count
  // resource on the enclosing ClassFeatureActivationMechanics IS the
  // casting resource.
  readonly castWithoutSlot: true;
};
```

`ClassFeatureEffect` would become:

```typescript
export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | GrantSpellAccessEffect;
```

---

## Multi-level note

The full Mystic Arcanum progression (L11/L13/L15/L17) adds one arcanum per milestone at increasing spell levels. The L11 slice (one arcanum, level 6, one use, long rest) is the pressure case here. Encoding the whole progression would additionally require either:

- Four separate `ClassFeatureRecord` entries (one per milestone), each with `acquiredAtLevel` set to the milestone level and `constraint.spellLevel` to 6/7/8/9 respectively; or
- A `threshold_tiers`-style growth on the arcanum pool count — but this is a secondary concern. The single-arcanum L11 variant is already a clean pressure case.

---

## Tracer impact

Once `GrantSpellAccessEffect` is added to the surface, the tracer would need a new `case "grant_spell_access":` branch in `traceClassFeatureEffect()` emitting a `grant_spell_access` atom node. This is a narrow, additive change.
