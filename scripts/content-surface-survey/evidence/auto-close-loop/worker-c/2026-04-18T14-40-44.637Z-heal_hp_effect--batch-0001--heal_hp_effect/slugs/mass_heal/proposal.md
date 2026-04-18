# Proposal: Surface Widenings for Mass Heal

## Unit

**Mass Heal** — Level 9 Abjuration, SRD 5.2.1, `Spells/Descriptions-M-R#Mass Heal`

## Outcome

`surface_widening` — The `activation` family is the correct home for this spell, but six surface type variants are missing. All required v4 atoms (`heal`, `remove_condition`, `target`) already exist; only the authored surface types need expansion.

## Mechanics Summary

> "You restore up to 700 Hit Points, divided as you choose among any number of creatures that you can see within range. Creatures healed by this spell also have the Blinded, Deafened, and Poisoned conditions removed from them."

- Casting time: Action; Range: 60 ft; Components: V, S; Duration: Instantaneous
- Two simultaneous effects: (1) HP restoration from a capped pool, (2) condition removal on all healed targets
- No attack roll, no saving throw — both effects are unconditional

## Proposed Widenings

### 1. `ActivationPhase` — new `direct_effect` variant

**Problem:** `ActivationPhase` only has `attack_roll` and `save_gate`. Mass Heal's effects fire directly on cast with no gating mechanic.

**Proposed shape:**
```typescript
| {
    readonly kind: "direct_effect";
    readonly attachment: Attachment;
    readonly effects: ReadonlyArray<Effect>;
  }
```

This variant covers any instantaneous spell whose effects are unconditional — no roll, no save. Future examples: Power Word Heal, Heal (the single-target analogue), Revivify.

### 2. `Effect` — new `heal_hp` variant

**Problem:** `Effect` (used in spell activation phases) is `DamageEffect | NoneEffect`. `HealHpEffect` exists in `ClassFeatureEffect` but is not exposed in the spell `Effect` union.

**Proposed shape:** Lift `HealHpEffect` into the shared `Effect` union, or duplicate it:
```typescript
| {
    readonly kind: "heal_hp";
    readonly amount: HealAmount;  // see widening #5
    readonly target: "self" | "target_creature";
  }
```

### 3. `Effect` — new `remove_condition` variant

**Problem:** `remove_condition` is a v4 atom but has no surface counterpart in `Effect`. Mass Heal removes three conditions.

**Proposed shape:**
```typescript
| {
    readonly kind: "remove_condition";
    readonly conditions: ReadonlyArray<Condition>;
  }
```

### 4. `TargetSelection` — new `any_number` variant

**Problem:** `TargetSelection` has `one` and `choose_up_to: SlotScaling<number>`. "Any number of creatures you can see within range" is uncapped — it cannot be expressed as a finite `SlotScaling`.

**Proposed shape:**
```typescript
| { readonly mode: "any_number" }
```

Combined with `Attachment.kind = "target"` and `range: { kind: "point", feet: 60 }`, this correctly models the targeting.

### 5. `DiceAmount` — new `pool` variant

**Problem:** `DiceAmount` requires dice (`fixed DiceExpr`, `threshold_tiers`, `linear_per_level`). Mass Heal's heal amount is a flat integer cap (`700`) from which the caster allocates freely. There are no dice involved.

**Proposed shape:**
```typescript
| {
    readonly kind: "pool";
    readonly totalHp: number;
    readonly allocation: "caster_choice";
  }
```

Alternatively, a new `HealAmount` union separate from `DiceAmount` could handle this and the pool variant together, keeping `DiceAmount` for purely dice-based quantities.

### 6. `Condition` — widen to include `blinded | deafened | poisoned`

**Problem:** `Condition = "prone"`. Three additional conditions appear in Mass Heal's remove effect.

**Proposed change:**
```typescript
export type Condition = "blinded" | "deafened" | "poisoned" | "prone";
```

(Further conditions will accumulate as more content is encoded.)

## Why Not a Different Classification

- **Not `atom_widening`:** All required v4 atoms exist — `heal`, `remove_condition`, and `target` are in §9 and §3 of TAXONOMY_atoms_graph.md v4. The gap is entirely at the surface (type) layer.
- **Not `structural_widening`:** The `activation` family is the correct home; no new family or cross-family composition is required. Adding a `direct_effect` phase variant suffices.
- **Not `dm_agenda`:** Mass Heal's mechanics are fully deterministic — the caster chooses allocation but the outcomes (HP restored, conditions removed) are deterministic given that choice. Nothing is DM-adjudicated.

## Priority Order

The `direct_effect` phase variant (#1) is the highest-leverage widening — it unlocks all unconditional instantaneous spells (Heal, Power Word Heal, Prayer of Healing, etc.). The `pool` DiceAmount variant (#5) is Mass Heal-specific and should be validated against at least one other pool-style spell before finalizing the shape.
