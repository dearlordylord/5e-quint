# Proposal: surface widenings required for Guidance

## Unit

**Guidance** (cantrip, Divination, concentration up to 1 minute)  
SRD 5.2.1 — "You touch a willing creature and choose a skill. Until the spell ends, the creature adds 1d4 to any ability check using the chosen skill."

## Family fit

`ongoing_effect` (spell). The spell is concentration-timed, targets one creature at touch range, and grants a persistent roll modifier. The tracer subgraph is: `spell_root → activate → target (touch) + concentration_lock + concentrate → expire`. The operation is `modify_roll_numeric`. All of this fits structurally.

## Blocking gaps

### 1. `RollKind: "ability_check"` (new variant)

**Current type:**
```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Guidance's effect applies to **ability checks**, which are a third, distinct roll kind in SRD 5.2.1. The closed union has no member for it. `RollModifierOperation.on` accepts only `ReadonlyArray<RollKind>`, so there is no valid value that means "ability check".

**Proposed addition:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

This is a backward-compatible union widening. All existing encodings using `RollKind` remain valid.

**Pressure count:** Guidance is the first unit to exercise this. However, any other ongoing buff that modifies skill or ability checks (Bless modifies attack rolls and saving throws — already covered; a hypothetical Bane-for-checks variant would need this) will hit the same gap. The gap is narrow today but structurally fundamental.

### 2. `RollModifierOperation`: optional skill-scope field (new variant)

**Current type:**
```typescript
export type RollModifierOperation = {
  readonly kind: "roll_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: DiceDelta;
};
```

Guidance doesn't apply to all ability checks — only to checks using **the skill chosen at cast time**. There is no field to express this scoping. Without it, an encoding that adds `"ability_check"` to `on` would imply the bonus applies to all ability checks, which is false.

**Proposed addition:**
```typescript
export type AbilityCheckScope =
  | { readonly kind: "all" }
  | { readonly kind: "chosen_skill_at_cast" };

export type RollModifierOperation = {
  readonly kind: "roll_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: DiceDelta;
  readonly abilityCheckScope?: AbilityCheckScope;   // only meaningful when on includes "ability_check"
};
```

Alternatively, this could be typed as a discriminated variant where a separate operation kind (e.g., `ability_check_modifier`) carries the scope inline. Either approach is honest; the key requirement is that the skill-scoping intent is represented rather than silently dropped.

**Why this is surface_widening, not atom_widening:**  
The v4 atom `modify_roll_numeric` already covers "numeric bonus to a roll." The gap is entirely in the surface type variant — how the authored JSON expresses which roll kind and which scope. No new atom is needed.

## Tracer impact

Once both widenings land:
- `traceOngoingOperation` handles `roll_modifier` with `on: ["ability_check"]` — the existing branch already emits `modify_roll_numeric`. No tracer change needed for the atom.
- The skill-scope field would be surfaced as label text on the `modify_roll_numeric` node (analogous to how `on` is already joined into the label). No new tracer branch required unless the scope becomes its own atom (not proposed here).

## Classification

`surface_widening` — both gaps are new variants of existing surface types. No new v4 atom, no new family, no new tracer branch needed beyond label enrichment.
