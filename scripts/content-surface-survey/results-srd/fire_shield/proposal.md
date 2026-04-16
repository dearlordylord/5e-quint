# Proposal: Widenings Required for Fire Shield

## Unit

- Name: Fire Shield
- Level: 4 Evocation
- Provenance: SRD 5.2.1

## Summary

Fire Shield cannot be honestly encoded in the current surface. The spell has two mechanically distinct persistent effects — a resistance grant and a retaliatory damage rider — neither of which is representable in `OngoingOperation`. One of the two gaps requires a new v4 atom.

---

## Gap 1 — New window atom: `on_received_hit_window`

### Classification: `atom_widening`

Fire Shield deals 2d8 damage to any creature that hits the caster with a melee attack roll while the spell is active:

> "whenever a creature within 5 feet of you hits you with a melee attack roll, the shield erupts with flame. The attacker takes 2d8 Fire damage from a warm shield or 2d8 Cold damage from a chill shield."

This is a **retaliatory trigger** — it fires when the caster *receives* a hit, not when the caster *lands* a hit. The existing v4 atom `on_hit_window` is directionally opposite: it opens when the caster lands a hit against a creature in the attachment scope.

There is no v4 atom that models "when the caster/wearer receives a melee attack hit." This is a new window atom:

```
on_received_hit_window
  category: window
  opens when: a melee attack roll hits the caster (or wearer)
  constraint: attacker within 5 ft (melee range constraint)
```

Graph shape for the retaliatory rider:

```
ongoing_effect (self attachment)
  → on_received_hit_window (melee, within 5 ft)
    → damage: 2d8 fire/cold
      → attaches_to: attacker (reverse-direction attachment)
```

This also exposes a secondary gap: the damage target is the **attacker** (the creature that opened the window), not a standard attachment target. This may need a new attachment kind (`attacker`) or a special `EffectTarget` variant. Minimal: the `on_received_hit_window` itself implies the target is the opener, so a convention on that atom could suffice.

---

## Gap 2 — New `OngoingOperation` variant: `grant_resistance`

### Classification: `surface_widening`

Fire Shield grants the caster Resistance to Cold or Fire damage for its 10-minute duration:

> "The warm shield grants you Resistance to Cold damage, and the chill shield grants you Resistance to Fire damage."

The v4 atom `grant_resistance` exists in the taxonomy. However, `OngoingOperation` in `types.ts` only admits two variants:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

A `grant_resistance` variant is needed:

```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageTypes: ReadonlyArray<DamageType>;
};
```

This is a surface widening only (the v4 atom already exists). The tracer would need a `case "grant_resistance"` branch in `traceOngoingOperation`.

---

## Gap 3 — Cast-time binary choice (secondary, depends on Gaps 1 & 2)

Fire Shield's player choice (warm vs. chill) selects both the resistance type and the retaliation damage type simultaneously at cast time. This is a binary variant selection with correlated effects. The current surface has no `choose` or `variant_select` operation for this pattern. Once Gaps 1 & 2 are resolved, a third surface or procedural widening will be needed to encode the choice cleanly rather than as two parallel fixed-value instances.

---

## Encoding path once widened

With the three gaps resolved, Fire Shield would encode as `ongoing_effect`:

```
family: ongoing_effect
attachment: self
duration: timed, 10 minutes (non-concentration)
operations:
  [1] grant_resistance { damageTypes: ["cold"] }   // warm shield
  [2] on_received_hit_trigger { damageType: "fire", amount: 2d8 }  // retaliatory
```

The `on_received_hit_window` pattern from Gap 1 is structurally analogous to `damage_on_hit` in the opposite direction: instead of "caster hits → rider fires", it is "caster receives hit → rider fires against attacker."
