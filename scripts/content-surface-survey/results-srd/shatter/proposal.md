# Proposal: surface_widening for Shatter — save-for-half pattern

## Unit
Shatter — spell, level 2, evocation, srd-5.2.1

## Outcome
`surface_widening`

---

## What fits

Shatter maps cleanly onto the `activation` spell family:

| Mechanic | Surface shape | Status |
|---|---|---|
| 1 Action casting time | `castingTime: { kind: "action" }` | ✓ |
| Range 60 ft point | `range: { kind: "point", feet: 60 }` | ✓ |
| V S M (chip of mica) | `components: { v: true, s: true, m: "a chip of mica" }` | ✓ |
| Instantaneous | `duration: { kind: "instantaneous" }` | ✓ |
| 10-ft sphere, point origin | `attachment: { kind: "area", shape: { kind: "sphere", radiusFeet: 10 }, origin: { kind: "point_within_range" } }` | ✓ |
| Constitution save gate | `phases[0]: { kind: "save_gate", ability: "con", dc: { kind: "caster_spell_save_dc" } }` | ✓ |
| 3d8 Thunder on fail | `onFail: { kind: "damage", damageType: "thunder", amount: { kind: "fixed", expr: { dice: 3, dieSize: 8 } } }` | ✓ |
| +1d8 per slot above 2 | `linear_per_level (axis=slot, perLevel={dice:1}, startingAtLevel:2)` | ✓ |

---

## Blocking gap: half-damage on success

The rule text:

> "taking 3d8 Thunder damage on a failed save or **half as much damage** on a successful one."

The current `Effect` union:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

Neither variant can represent "half of the onFail damage":

- `onSuccess: { kind: "none" }` — **false**: the spell does deal damage on a successful save.
- `onSuccess: { kind: "damage", amount: { dice: 3, dieSize: 8 } }` — **false**: it's half, not full.

No honest encoding is possible. Per the guardrails, a misleading trace is worse than no trace. Dhall and JSON are not authored.

---

## Proposed widening

### Option A — flag on `save_gate` (recommended)

Add `halfDamageOnSuccess?: true` to the `save_gate` ActivationPhase variant. When present, the resolution applies the `onFail` damage at half value on a successful save; `onSuccess` is always `none` in this case.

```typescript
| {
    readonly kind: "save_gate";
    readonly attachment: Attachment;
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: Effect;
    readonly onSuccess: Effect;
    readonly halfDamageOnSuccess?: true;   // NEW
  }
```

**Rationale**: The SRD "save for half" pattern is always tied symmetrically to the `onFail` damage — there is no case in the corpus where half-damage-on-success uses a different dice expression than onFail. A flag is the narrowest honest representation. It also makes tracer logic simple: when the flag is set, emit a `damage` effect node from the `branches_on_save` (success) edge labeled "½" and reuse the `onFail` amount.

### Option B — new `Effect` variant

```typescript
type HalfDamageEffect = {
  readonly kind: "half_damage";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
export type Effect = DamageEffect | HalfDamageEffect | NoneEffect;
```

More general, but overkill: in D&D 5e "half on success" always references the same roll as the fail branch. Option A is preferred.

---

## Secondary gaps (not blocking, record only)

### 1. Construct disadvantage on the save

> "A Construct has Disadvantage on the save."

The `save_gate` ActivationPhase has a single resolution path with no mechanism for creature-type-conditional roll modifiers. A v4 `modify_roll_advantage` effect exists but there is no surface grammar to express "apply disadvantage to this save gate for creatures of type X."

**Classification if isolated**: `surface_widening` (new optional field on `save_gate` for creature-type-conditional roll modifiers). Single-unit pressure; defer.

### 2. Nonmagical object damage

> "A nonmagical object that isn't being worn or carried also takes the damage if it's in the spell's area."

The `area` attachment targets all entities in the area but the surface types make no creature-vs-object distinction. Modeling object damage would require a secondary `onFail`-like branch targeting objects, or an explicit `targets_objects: true` flag. v4 has the `object` attachment atom but no surface variant wires it into an area-effect phase. Single-unit pressure; defer.

---

## Corpus impact

"Save for half" is the most common damage pattern in D&D spells. It blocks clean encoding of:

- Fireball (3d6 fire, area, DEX save for half)
- Thunderwave (2d8 thunder, area, CON save for half)
- Cone of Cold (8d8 cold, cone, CON save for half)
- Ice Storm (2d8 + 4d6, area, DEX save for half bludgeoning/cold split)
- Shatter (this unit)
- and many others

Resolving Option A would unblock the largest single category of blocked spells.
