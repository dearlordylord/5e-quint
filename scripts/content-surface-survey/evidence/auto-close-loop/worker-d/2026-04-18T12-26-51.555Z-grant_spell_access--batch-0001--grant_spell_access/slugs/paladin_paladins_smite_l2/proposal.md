# Proposal: Paladin's Smite (paladin L2) — Surface Widening

## Unit

- **Slug:** `paladin_paladins_smite_l2`
- **Kind:** `class_feature` — Paladin L2
- **Outcome:** `surface_widening`

## Source text

> You always have the *Divine Smite* spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again.

## What fits

The feature is structurally a `ClassFeatureActivationMechanics` (`family: "activation"`). Its resource shape is clean:

- `resource`: `use_count`, cap fixed at 1
- `resetCadence`: `long_rest`
- `activationCost`: `bonus_action` (Divine Smite's casting time is a Bonus Action)

All of the above are expressible with the current surface types.

## What does not fit

### Gap 1 — No `ClassFeatureEffect` variant for `grant_spell_access`

The passive "always have Divine Smite prepared" clause is a spell-access grant. The v4 atom `grant_spell_access` already exists in the taxonomy (§9 Effect Atoms), but `ClassFeatureEffect` in `types.ts` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

There is no variant for granting a spell to the always-prepared list. Proposed new variant:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly alwaysPrepared: true;
};
```

### Gap 2 — No `ClassFeatureEffect` variant for free-cast-without-slot

The activated clause lets the paladin cast Divine Smite once without expending a spell slot. This is mechanically distinct from any existing effect:

- Not `grant_extra_action` (no action is granted — it's a spell cast)
- Not `heal_hp` (it's a conditional spell invocation)

The closest v4 concept would compose from `grant_spell_access` + a cost-waiver, but there is no surface expression for "invoke a named spell, waiving the slot cost." Proposed new variant:

```typescript
export type CastNamedSpellFreeEffect = {
  readonly kind: "cast_named_spell_free";
  readonly spellId: string;
  // Slot cost is waived; other spell costs (components, casting time) still apply.
};
```

### Gap 3 — `ClassFeatureActivationMechanics` supports only one `effect`

The feature has two behaviors:

1. **Passive**: always-prepared spell access (no activation cost, no use-count, always on)
2. **Activated**: free-cast-without-slot (use_count=1, long_rest reset, bonus_action cost)

The current header:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // ← single effect only
};
```

A single `effect` field cannot carry both the passive grant and the activated cast. Options:

- **A.** Add an optional `passiveGrants?: ReadonlyArray<ClassFeatureEffect>` field to `ClassFeatureActivationMechanics` for always-on effects that accompany an activation.
- **B.** Lift `effect` to `effects: ReadonlyArray<ClassFeatureEffect>` (broader, but could overfit future cases).
- **C.** Model the two behaviors as two separate records (splitting a single SRD entry — not recommended; it fractures provenance).

Option A is the narrowest honest change.

## Widening summary

| # | Kind | Name | v4 atom? |
|---|------|------|----------|
| 1 | `new_variant` | `ClassFeatureEffect / grant_spell_access` | Yes — `grant_spell_access` in §9 |
| 2 | `new_variant` | `ClassFeatureEffect / cast_named_spell_free` | Closest: `grant_spell_access` + cost waiver; no direct match |
| 3 | `new_subgraph` | Dual passive+activated effect support on `ClassFeatureActivationMechanics` | No new atoms required; structural only |

No new v4 atoms are needed. All three gaps are surface-level schema changes to `ClassFeatureEffect` and `ClassFeatureActivationMechanics`.
