# Proposal: Divine Favor — surface_widening

## Unit

**Divine Favor** — Level 1 Transmutation, Bonus Action, Range: Self, Duration: 1 minute (timed, non-concentration in SRD 5.2.1), V/S.

> "Until the spell ends, your attacks with weapons deal an extra 1d4 Radiant damage on a hit."

## Why it doesn't fit honestly

### Family diagnosis

`ongoing_effect` is the correct family — the spell persists for up to 1 minute and applies a recurring rider on every qualifying hit. All structural elements are encodable:

| Field | Value | Status |
|---|---|---|
| `family` | `ongoing_effect` | ✓ exists |
| `castingTime` | `bonus_action` | ✓ exists |
| `range` | `self` | ✓ exists |
| `duration` | `timed` 1 minute | ✓ exists |
| `components` | V, S | ✓ exists |
| `school` | `transmutation` | ✓ exists |
| `level` | 1 | ✓ exists |
| `operation.kind` | `damage_on_hit` | ✓ exists |
| `operation.damageType` | `radiant` | ✓ exists |
| `operation.amount` | 1d4 fixed | ✓ exists |

### The gap: `DamageOnHitOperation` scope

`DamageOnHitOperation` is semantically a **target-scoped** rider: it fires "when the caster hits a creature *in the attachment's scope*," where the `attachment` node identifies the specific creature to hit for the bonus (Hunter's Mark: `mark` → fires on hits against the marked creature).

Divine Favor is a **caster-scoped** rider: the bonus fires on *any weapon attack hit the caster makes*, against *any creature*. There is no specific target to identify as the attachment.

Attempting `self` attachment + `damage_on_hit` produces two false traces:

1. The tracer hardcodes `on_hit_window\n(caster hits attachment)`. With `self` attachment this reads "caster hits [self]" — a lie about the mechanics.
2. The `damage → attaches_to → self` edge says the damage effect attaches to the caster, not to the hit creature.

These are not superficial label problems — they represent a real semantic mismatch in the graph structure. The edge topology would be wrong: the on-hit damage in Divine Favor fires against the *struck creature*, but the `attaches_to` edge would point to the caster.

### What's needed

A scope field (or a new attachment variant) on `DamageOnHitOperation` that distinguishes:

- **Target-scoped** (existing, implicit): fires when the caster hits the creature identified by the attachment (`mark`, `target`).
- **Caster-scoped** (new): fires on any weapon attack hit made by the caster, regardless of target. The effect is owned by the caster; the hit target receives the damage.

One concrete proposal:

```typescript
export type DamageOnHitOperation = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
  // NEW: omitting scope (or scope: "target_scoped") = existing behaviour.
  // scope: "caster_any_weapon_hit" = fires on any weapon hit by the caster.
  readonly scope?: "caster_any_weapon_hit";
};
```

With this addition, Divine Favor would encode as `ongoing_effect` + `self` attachment + `damage_on_hit` with `scope: "caster_any_weapon_hit"`, and the tracer would label the `on_hit_window` as "caster makes any weapon hit" (not "caster hits self").

## Scope

- No new v4 atoms required.
- No new mechanics family required.
- Change is entirely within the surface type for `DamageOnHitOperation` — one new optional discriminant field.
- The tracer would need a corresponding label update for `damage_on_hit` when scope is `caster_any_weapon_hit`.

## Comparison to Hunter's Mark

Hunter's Mark and Divine Favor are both `ongoing_effect` + `damage_on_hit` spells, but differ in rider scope:

| | Hunter's Mark | Divine Favor |
|---|---|---|
| Attachment | `mark` (specific creature) | `self` (caster) |
| On-hit trigger | "caster hits the marked creature" | "caster hits any creature with a weapon" |
| Damage routes to | the marked creature | the hit creature |
| Scope | target-scoped | caster-scoped |

The same `on_hit_window` + `damage` atoms cover both cases; only the scope qualifier differs.
