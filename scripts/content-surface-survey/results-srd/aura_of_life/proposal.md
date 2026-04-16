# Widening Proposal: Aura of Life

**Outcome**: `atom_widening`  
**Unit**: Aura of Life (4th-level Abjuration, concentration 10 min, self 30-ft emanation)

---

## What the spell does

> *An aura radiates from you in a 30-foot Emanation for the duration. While in the aura, you and your allies have Resistance to Necrotic damage, and your Hit Point maximums can't be reduced. If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point.*

Three simultaneous ongoing effects apply to all creatures (caster + allies) within the 30-ft emanation while concentration holds:

1. **Necrotic resistance** — grant_resistance (necrotic) to all in range
2. **HP max protection** — HP maximums cannot be reduced
3. **Turn-start conditional heal** — ally at 0 HP at start of their turn regains 1 HP

---

## Why the unit does not fit

### 1. `OngoingEffectMechanics.operation` is singular

```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;   // ← singular
};
```

Aura of Life has three operations. The field must become `operations: ReadonlyArray<OngoingOperation>` or the family needs a multi-effect variant.

### 2. `OngoingOperation` covers only two kinds

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

None of Aura of Life's effects are `roll_modifier` or `damage_on_hit`. Three new variants are needed:

#### A. `GrantResistanceOperation`

`grant_resistance` is a v4 taxonomy effect atom but is absent from `OngoingOperation`. Proposed shape:

```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};
```

#### B. `BlockMaxHpReductionOperation` ← **atom widening**

"HP maximums can't be reduced" is not `modify_max_hp` with a positive delta — it is a *protection* that suppresses all negative-delta `modify_max_hp` effects while the aura is active. This concept does not exist in v4 taxonomy. Proposed new v4 atom:

- **Name**: `block_max_hp_reduction`
- **Category**: effect
- **Semantics**: while this effect is active on a creature, any event that would reduce that creature's HP maximum is suppressed.
- **Justification**: distinct from `grant_resistance` (which halves damage), distinct from `modify_max_hp` (which changes the value), and distinct from `suppress` (which is a procedure, not an effect). Single-pressure from Aura of Life at this survey pass; related pressure expected from Death Ward and similar spells.

```typescript
export type BlockMaxHpReductionOperation = {
  readonly kind: "block_max_hp_reduction";
};
```

#### C. `ConditionalTurnStartHealOperation`

"If an ally with 0 HP starts its turn in the aura, that ally regains 1 HP" is a turn-start-triggered conditional heal. `turn_start_window` and `heal` both exist in v4 but the wiring — an `OngoingOperation` that opens a `turn_start_window` gated by a creature-state condition — is not expressible in the current surface. Proposed shape:

```typescript
export type TurnStartCondition =
  | { readonly kind: "has_zero_hp" };

export type ConditionalTurnStartHealOperation = {
  readonly kind: "conditional_turn_start_heal";
  readonly condition: TurnStartCondition;
  readonly amount: DiceAmount;
  readonly target: "creatures_in_attachment";
};
```

---

## Proposed widenings summary

| # | Kind | Name | Level |
|---|------|------|-------|
| 1 | `new_variant` | `GrantResistanceOperation` on `OngoingOperation` | surface |
| 2 | `new_atom` | `block_max_hp_reduction` | v4 taxonomy + surface |
| 3 | `new_variant` | `ConditionalTurnStartHealOperation` on `OngoingOperation` | surface |
| 4 | `new_subgraph` | `operations: ReadonlyArray<OngoingOperation>` on `OngoingEffectMechanics` | surface |

---

## Encoding path after widening

Once all four widenings land, Aura of Life fits `ongoing_effect` with:

- `attachment`: `area` with `sphere` shape (r=30), `origin: on_primary_target` (self-cast, caster is the origin)
- `operations`: array of three operations:
  1. `{ kind: "grant_resistance", damageType: "necrotic" }`
  2. `{ kind: "block_max_hp_reduction" }`
  3. `{ kind: "conditional_turn_start_heal", condition: { kind: "has_zero_hp" }, amount: { kind: "fixed", expr: { dice: 0, dieSize: 1, flat: 1 } }, target: "creatures_in_attachment" }`

One open question: the `area` attachment doesn't currently model a **self-moving emanation** (as opposed to a fixed-point sphere). Aura of Life's aura moves with the caster. The current `origin: on_primary_target` is the closest but doesn't encode the dynamic-movement property. This is lower-priority (the engine tracks creature positions); noting for completeness.
