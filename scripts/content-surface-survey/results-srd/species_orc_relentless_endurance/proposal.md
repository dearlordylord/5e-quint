# Widening Proposal: Relentless Endurance (Orc)

**Outcome:** `structural_widening`
**Slug:** `species_orc_relentless_endurance`
**Provenance:** SRD 5.2.1 — Character-Origins.md § Orc

---

## Why this unit cannot be encoded today

### 1. Missing top-level record kind: `species_trait`

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy already defines `species_trait_root` as a source atom (§1), but the surface schema has not been widened to match. This is a hard block: no JSON file can satisfy the `UnitRecord` type constraint for this unit.

**Minimum required addition:**

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

---

### 2. Missing mechanics family: passive reactive trigger

Relentless Endurance fires **reactively** when an external event occurs during damage resolution — not when the player spends an action/bonus action/reaction. No existing family covers this:

| Existing family | Why it doesn't fit |
|---|---|
| `activation` (class feature) | Requires explicit player activation with a cost |
| `on_hit_trigger` (mastery) | Watches attacker hitting; Relentless Endurance watches the defender's HP |
| `triggered_reaction` (spell) | Requires spell infrastructure (level, school, components, casting time) |

The needed family is a **passive reactive trigger**: a trait that arms itself permanently (or until used), watches for a named combat event, and responds automatically (or with player choice) when that event fires.

Proposed shape sketch:
```typescript
export type SpeciesTraitPassiveReactiveMechanics = {
  readonly family: "passive_reactive";
  readonly trigger: SpeciesTraitTrigger;  // new type
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
  readonly effect: SpeciesTraitEffect;    // new type
};
```

---

### 3. Missing trigger: `reduced_to_0_hp`

The trigger "when you are reduced to 0 Hit Points but not killed outright" requires a new window/event type. The closest existing atoms are:

- `on_hit_window` — fires when an attacker hits; wrong direction (attacker-centric, not defender HP state)
- `post_action_window` — fires after a creature's action; wrong scope
- `damage_threshold_window` — does not exist

A new event kind is needed:

```typescript
export type SpeciesTraitTrigger =
  | { readonly kind: "reduced_to_0_hp_not_outright_killed" };
  // widen as more pressure cases land
```

The qualifier "but not killed outright" (massive damage / instant-kill effects) is rule-meaningful — it gates whether the trait fires at all. It must be part of the trigger shape, not folded into a note.

---

### 4. Missing effect atom: `prevent_ko` / `set_hp_floor`

The effect "drop to 1 Hit Point instead" is **not** `heal_hp`. The distinction:

- `heal_hp` adds a dice amount to current HP (current HP + 1d6+con)
- Relentless Endurance **overrides the damage result**: the creature that would reach 0 HP instead lands at exactly 1 HP, regardless of how much damage was dealt

This is a floor-setting operation on a damage resolution, not a post-resolution heal. No v4 effect atom covers it.

Proposed atom:

```
prevent_ko — effect that intercepts a damage resolution that would reduce the bearer to 0 HP (and not outright kill) and instead sets HP to a fixed floor (1).
```

In the v4 taxonomy this would sit in §9 (Effect Atoms), alongside `heal` and `modify_max_hp`.

---

## Comparison: Death Ward (spell)

Death Ward (4th-level spell, concentration-free timed) produces a superficially similar outcome: "the next time you would drop to 0 HP as a result of taking damage, you instead drop to 1 HP." The mechanics differ structurally:

| Dimension | Death Ward | Relentless Endurance |
|---|---|---|
| Kind | Spell | Species trait |
| Delivery | Cast by another creature (or self), consumes spell slot | Passive, no cast |
| Duration | 8 hours (timed persist) | Always-on until used |
| Reset | Single use per casting | Long rest |
| Intercept logic | Same `prevent_ko` effect | Same `prevent_ko` effect |

Death Ward would benefit from the same `prevent_ko` atom and `reduced_to_0_hp` trigger — this is shared pressure from two independent units, which strengthens the case for adding both to the vocabulary.

---

## Summary of required widenings

| # | Kind | Name | Scope |
|---|---|---|---|
| 1 | `new_variant` | `SpeciesTraitRecord` (kind = `"species_trait"`) | surface types |
| 2 | `new_subgraph` | `passive_reactive` mechanics family | surface types + tracer |
| 3 | `new_atom` | `reduced_to_0_hp_not_outright_killed` trigger event | surface types + tracer |
| 4 | `new_atom` | `prevent_ko` (set HP floor on damage intercept) | v4 taxonomy §9 + surface + tracer |
