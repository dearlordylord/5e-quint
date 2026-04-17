# Proposal: Ring of the Ram — Structural Widening

## Unit

Ring of the Ram — SRD 5.2.1, `magic_item`, rare, requires attunement.

## Why this unit cannot be honestly encoded

### 1. Dual exclusive activation modes (primary blocker — structural_widening)

The ring offers two mutually exclusive uses per activation:

- **Mode A (combat):** Magic action, 1–3 charges → ranged spell attack with +7 bonus. On hit, per charge: 2d10 Force damage + 5 ft push.
- **Mode B (utility):** Magic action, 1–3 charges → Strength check (+5 per charge) to break a nonmagical object within 60 ft.

The current `activation` family models `phases` as a sequential array joined by `branches_on_completion` edges. This expresses "phase 1 resolves, then phase 2 follows." It does **not** express "choose exactly one of these two phase sequences at use time."

Encoding both as phases would imply the Strength check always follows the ranged attack, which is mechanically false. Encoding only one mode omits a mechanically significant alternate use. Neither is honest.

**Proposed shape** (tentative): a `modes` field on `ActivatedAbilityMechanics` replacing `phases` for choice-based activations:

```typescript
// New variant — choose one mode per activation
type ChoiceModeActivation = {
  readonly kind: "choose_one";
  readonly modes: ReadonlyArray<{
    readonly label: string;
    readonly phases: ReadonlyArray<ActivationPhase>;
  }>;
};
```

Or alternatively, a new mechanics family `choice_activation` at the top level.

### 2. Per-charge scaling of damage (surface_widening)

Damage is 2d10 Force **per charge spent**: 1 charge → 2d10, 2 → 4d10, 3 → 6d10.

`DiceAmount.resource_spent` captures that the amount depends on charges spent but carries no dice-per-charge formula — it renders as "= charges spent," not "= 2d10 × charges." This is dishonest for Ring of the Ram.

**Proposed variant:**

```typescript
| {
    readonly kind: "per_charge_spent";
    readonly perCharge: DiceExpr;       // 2d10 in this case
  }
```

### 3. Per-charge scaling of push distance (surface_widening)

Push distance is 5 ft per charge spent (1 → 5 ft, 2 → 10 ft, 3 → 15 ft). The `force_move` atom has a fixed `distanceFeet: number`. No scaling mechanism exists.

**Proposed extension:**

```typescript
| {
    readonly kind: "force_move";
    readonly direction: "push" | "pull" | "slide";
    // Either fixed or per-charge:
    readonly distanceFeet?: number;
    readonly distanceFeetPerCharge?: number;
  }
```

Or align with DiceAmount by extending `force_move` to carry a new field that references the activation's charge count.

### 4. Ability check phase (surface_widening)

Mode B triggers a Strength check (not an attack roll, not a saving throw) against an object. The v4 taxonomy includes `ability_check` as a resolution atom, but the surface's `ActivationPhase` union covers only `attack_roll`, `save_gate`, and `direct`. The ability_check phase is absent.

**Proposed phase variant:**

```typescript
| {
    readonly kind: "ability_check";
    readonly attachment: Attachment;
    readonly ability: Ability;
    readonly dc: DcSource;               // or a new "fixed_bonus" dc kind for +5/charge
    readonly onSuccess: EffectAtom;
    readonly onFailure: EffectAtom;
  }
```

Note: The per-charge +5 bonus to the check is itself a sub-problem of the per-charge scaling gap above.

### 5. Object-break effect atom (atom_widening)

The on-success outcome of Mode B is destroying a nonmagical object. No v4 effect atom covers this. The nearest atoms (`damage`, `force_move`, `block_travel`) target creatures or spaces. Object destruction is a distinct mechanic.

**Proposed atom:**

```typescript
| {
    readonly kind: "break_object";
    // No additional fields needed beyond the attachment (nonmagical object within 60 ft).
  }
```

This is the only gap that qualifies as a true `atom_widening` (missing from v4 taxonomy). All other gaps are missing surface variants of concepts that v4 names.

## Classification

**`structural_widening`** (primary) — the dual exclusive activation mode pattern has no honest representation in the current mechanics family.

Secondary gaps: **`surface_widening`** (per-charge damage scaling, per-charge push scaling, ability_check phase), **`atom_widening`** (break_object effect).

## Proposed widenings (priority order)

| # | Kind | Name | Reason |
|---|------|------|--------|
| 1 | `new_subgraph` | `dual_mode_activation` / `choice_activation` | Exclusive alternative activation paths |
| 2 | `new_variant` | `DiceAmount.per_charge_spent` | 2d10 × N charges formula |
| 3 | `new_variant` | `force_move.distanceFeetPerCharge` | 5 ft × N charges formula |
| 4 | `new_variant` | `ActivationPhase.ability_check_gate` | Strength check resolution phase |
| 5 | `new_atom` | `break_object` | Object destruction outcome (v4 gap) |
