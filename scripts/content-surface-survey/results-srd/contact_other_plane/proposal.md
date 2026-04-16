# Contact Other Plane — Encoding Proposal

## Outcome: `dm_agenda`

## Why the unit does not fit

Contact Other Plane is a 5th-level Divination spell whose entire purpose is an oracle:

> You mentally contact a demigod, the spirit of a long-dead sage, or some other knowledgeable entity from another plane... you can ask the entity up to five questions. The DM answers each question with one word, such as "yes," "no," "maybe," "never," "irrelevant," or "unclear."

The success-branch mechanic is DM adjudication from end to end. There is no deterministic mechanical resolution, no closed-grammar effect atom, and no v4 taxonomy entry that models "grant oracle query access / DM gives one-word answers." This is the core of why the spell was cast — not a secondary rider.

The architecture principle from `ARCHITECTURE.md` explicitly excludes DM rulings and narrative outcomes from the core mechanics layer. This is a canonical example of that exclusion.

## Secondary blockers (failure branch)

Even the failure branch — which does have deterministic content — exposes two surface widenings:

### 1. `Condition` type too narrow

```typescript
export type Condition = "prone";
```

The failure branch applies the **Incapacitated** condition. Encoding it requires:

```typescript
export type Condition = "prone" | "incapacitated";
```

Evidence: *"On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest."*

### 2. `DcSource` missing fixed-DC variant

The saving throw is against a flat **DC 15**, not the caster's spell save DC and not the weapon attack DC formula. Neither existing variant fits:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number };
```

A new variant is needed:

```typescript
| { readonly kind: "fixed"; readonly value: number }
```

Evidence: *"When you cast this spell, make a DC 15 Intelligence saving throw."*

### 3. Condition expiry modeled implicitly

The Incapacitated condition lasts "until you finish a Long Rest" and can be removed early by Greater Restoration. The current surface has no per-condition expiry lifecycle. This is not a blocking widening by itself (the `rest_window` atom covers the long-rest boundary; Greater Restoration removal would be encoded in that spell's record), but it is worth noting for completeness.

## Recommended action

1. Classify as `dm_agenda` — do not attempt to encode the oracle in-core.
2. File `surface_widening` pressure notes for `Condition: incapacitated` and `DcSource: fixed`, to be addressed when the next unit that exercises those shapes lands (likely Stunning Strike for Incapacitated, or any fixed-DC spell for the DC variant).
