# Proposal: surface_widening for Stoneskin

## Unit

- **Name**: Stoneskin
- **Slug**: stoneskin
- **Kind**: spell / ongoing_effect
- **Provenance**: srd-5.2.1, Spells/S#Stoneskin

## Summary

Stoneskin fits the `ongoing_effect` family cleanly. Every header field and the attachment encode without issue. The sole gap is that `OngoingOperation` has no variant for granting damage resistance.

## What fits

| Field | Surface type | Notes |
|---|---|---|
| Family | `ongoing_effect` | Concentration-persistent buff |
| `level` | `SpellLevel` = 4 | Fine |
| `school` | `SpellSchool` = `"transmutation"` | Fine |
| `castingTime` | `{ kind: "action" }` | Fine |
| `range` | `{ kind: "touch" }` | Fine |
| `components` | `{ v: true, s: true, m: "diamond dust worth 100+ GP, which the spell consumes" }` | Consumed material is representable as a string |
| `duration` | `{ kind: "concentration", upTo: { unit: "hour", amount: 1 } }` | Fine |
| `attachment` | `{ kind: "target", selection: { mode: "one" } }` | One willing creature touched |

## What does NOT fit

### Gap: `OngoingOperation` has no `grant_resistance` variant

**SRD text**: "one willing creature you touch has Resistance to Bludgeoning, Piercing, and Slashing damage."

**Current `OngoingOperation`**:
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither existing variant can honestly express "grant resistance to these damage types":
- `roll_modifier` — modifies attack rolls or saving throws; not applicable.
- `damage_on_hit` — adds rider damage on a hit; not applicable.

## Proposed widening

Add a new variant to `OngoingOperation`:

```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageTypes: ReadonlyArray<DamageType>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantResistanceOperation;
```

**Atom mapping**: The v4 taxonomy already lists `grant_resistance` as an effect atom (Section 9, unchanged from v3). No new atom is needed. The tracer would emit a `grant_resistance` effect node linked from the procedure via `grants`, attached to the target via `attaches_to`.

## Pressure evidence

Stoneskin is the direct pressure case. Protection from Energy (another SRD tier-2 spell — resistance to one chosen energy type, concentration) would require the same widening. The pattern is common enough (Resistance spell, Cloak of Protection, various armor enchantments) that this is a recurring surface need.

## Classification

`surface_widening` — the family and all structural atoms fit. The gap is a missing variant of the existing `OngoingOperation` surface type. The `grant_resistance` v4 atom already exists.
