# Proposal: Holy Aura — structural_widening

## Unit

**Holy Aura** · Level 8 Abjuration · Concentration, 1 minute
SRD 5.2.1 · `srd52: true`

## Mechanics summary

```
Casting: Action · Range: Self (30-ft Emanation) · V/S/M (reliquary 1,000+ GP)
Duration: Concentration, up to 1 minute

Effect A: Chosen creatures in aura → Advantage on all saving throws
Effect B: Non-chosen creatures → Disadvantage on attack rolls against chosen creatures
Effect C: When a Fiend or Undead hits an affected creature with a melee attack roll
           → attacker makes CON save (caster spell save DC)
           → on fail: Blinded until end of attacker's next turn
```

## Why it does not fit

### 1. `ongoing_effect` has a singular `operation`

`OngoingEffectMechanics` declares:
```typescript
readonly operation: OngoingOperation;
```

Holy Aura requires three simultaneous, heterogeneous effects. Encoding it with a single operation would silently drop two of the three effects. The field must become:
```typescript
readonly operations: ReadonlyArray<OngoingOperation>;
```

### 2. `OngoingOperation` has no advantage/disadvantage variant

`OngoingOperation` = `RollModifierOperation | DamageOnHitOperation`.

- `RollModifierOperation` carries a `DiceDelta` — a numeric addend (+1d4, +1d6, etc.).
- There is no variant that carries advantage or disadvantage.

Both Effect A and Effect B require advantage/disadvantage semantics. A new variant is needed:

```typescript
export type AdvantageModifierOperation = {
  readonly kind: "advantage_modifier";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  // Scope: which creatures within the attachment are affected.
  // "chosen_at_cast" for Effect A; "attackers_against_affected" for Effect B.
  readonly scope: "affected" | "attackers_against_affected";
};
```

Note: Effect B ("Disadvantage on attack rolls **against** chosen creatures") involves a role inversion — the rider attaches to the attacker, not the chosen creature. This inversion may need a dedicated scope or a second attachment node, which is itself a novel subgraph pattern.

### 3. `AreaOrigin` has no emanation variant

`AreaOrigin` = `point_within_range | on_primary_target`. Both are static origins.

An Emanation is a sphere that is **centered on and moves with** the caster. A new variant is needed:

```typescript
| { readonly kind: "emanation_from_caster" }
```

This is distinct from `point_within_range` because:
- The area tracks the caster's position each round.
- It does not require the caster to choose a point within range — it IS the caster.

### 4. Creature-type-gated save gate rider (new subgraph)

Effect C is a reactive save gate conditional on the **creature type** of the attacker (Fiend or Undead). The trigger chain is:

```
aura persists
 └─ on_hit_window [attacker is Fiend or Undead, melee only]
      └─ save_gate [CON, caster spell save DC]
           ├─ on fail → apply_condition: blinded (until end of attacker's next turn)
           └─ on success → none
```

No existing surface type or v4 atom carries a creature-type predicate as a guard on a window or trigger. The `MasteryTrigger` type (`weapon_hit` | `weapon_hit_melee_only`) is the closest analog but is not creature-type-filtered and lives in the mastery family.

Proposed new operation variant for `OngoingOperation`:

```typescript
export type CreatureTypeGatedSaveRider = {
  readonly kind: "creature_type_gated_save_rider";
  readonly triggerKind: "melee_hit_against_affected";
  // Attacker must be one of these creature types.
  readonly attackerTypeFilter: ReadonlyArray<"fiend" | "undead">;
  readonly save: {
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: { readonly kind: "apply_condition"; readonly condition: Condition };
    readonly onSuccess: { readonly kind: "none" };
  };
  readonly expiry: RiderExpiry;
};
```

This requires a `creature_type` concept in the surface that does not currently exist. Whether this becomes a `new_atom` (a `creature_type_filter` node in v4) or stays structural surface grammar needs a taxonomy decision.

### 5. `Condition` is missing `"blinded"`

Currently:
```typescript
export type Condition = "prone";
```

Effect C applies the Blinded condition. Add:
```typescript
export type Condition = "prone" | "blinded";
```

This is an independent, narrowly-scoped surface widening that can be added regardless of the structural decisions above.

## v4 atom inventory check

All v4 atoms **needed** for Holy Aura exist:
- `modify_roll_advantage` (Effect A, B) ✓
- `save_gate` (Effect C) ✓
- `apply_condition` (Effect C on-fail) ✓
- `on_hit_window` (Effect C trigger) ✓
- `area` attachment ✓
- `concentrate` / `expire` lifecycle ✓

The gaps are entirely at the **surface layer** (type system) and one structural gap (multi-op family).

## Minimal widening path

If ordered by dependency:

1. Add `Condition: "blinded"` — self-contained, no other changes needed.
2. Add `AreaOrigin: emanation_from_caster` — self-contained.
3. Add `OngoingOperation.advantage_modifier` — enables encoding Effects A and B.
4. Widen `OngoingEffectMechanics.operation` → `operations: ReadonlyArray<OngoingOperation>` — prerequisite for encoding all three effects simultaneously. **Breaking change** to existing `ongoing_effect` records.
5. Add `OngoingOperation.creature_type_gated_save_rider` (or equivalent) — enables Effect C. Depends on a taxonomy decision about creature-type filter atoms.

Steps 1–3 are non-breaking. Step 4 is a breaking schema change to `ongoing_effect` that requires updating `bless.json`, `hunters_mark.json`, and all other `ongoing_effect` records.
