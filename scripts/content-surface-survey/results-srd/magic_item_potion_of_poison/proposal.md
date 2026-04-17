# Proposal: `DcSource` — new `fixed_dc` variant

## Unit

**Potion of Poison** (`magic_item_potion_of_poison`) — SRD 5.2.1 magic item, uncommon, no attunement.

## What this unit requires

When consumed, the Potion of Poison applies two effects:

1. **Unconditional damage**: 4d6 Poison damage to the drinker.
2. **Constitution save gate**: DC 13, on fail → Poisoned condition for 1 hour; on success → nothing.

The unit fits `magic_item` + `activation` (ActivatedAbilityMechanics) family:

```
activationCost: { kind: "action" }          // drinking uses the Action
resource:       { kind: "use_count", cap: { kind: "fixed", uses: 1 } }
resetCadence:   { kind: "never" }           // consumable
duration:       { kind: "timed", value: { unit: "hour", amount: 1 } }
phases:
  [0] direct   { attachment: { kind: "self" }
                 effects: [{ kind: "damage", damageType: "poison",
                              amount: { kind: "fixed", expr: { dice: 4, dieSize: 6 } } }] }
  [1] save_gate { attachment: { kind: "self" }
                  ability: "con"
                  dc: <BLOCKED>
                  onFail:    { kind: "apply_condition", condition: "poisoned" }
                  onSuccess: { kind: "none" } }
```

## The gap

`save_gate.dc` is typed as `DcSource`:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number }
  | { readonly kind: "innate_dc"; readonly base: number; readonly ability: Ability };
```

All three variants scale with character state:
- `caster_spell_save_dc` — derived from the caster's spellcasting ability + PB.
- `weapon_attack_dc` — `8 + attack ability mod + PB`.
- `innate_dc` — `base + ability_mod + PB`.

A consumed magic item has **no caster** to derive from. Its DC is a fixed number printed on the item. DC 13 here is not `13 + ability + PB`; it is just `13`.

## Proposed widening

Add a `fixed_dc` variant to `DcSource`:

```typescript
| { readonly kind: "fixed_dc"; readonly dc: number }
```

### Encoding under the proposed variant

```typescript
dc: { kind: "fixed_dc", dc: 13 }
```

### Tracer handling

The tracer's `describeDc` helper covers `DcSource`; a new `case "fixed_dc": return \`DC ${d.dc}\`` branch is sufficient.

## SRD evidence

> "must succeed on a DC 13 Constitution saving throw or have the Poisoned condition for 1 hour"
> — SRD 5.2.1, Equipment / Magic Items / Potion of Poison

The DC 13 is item-static; it does not scale with the consuming character's stats.

## Survey impact

At least four other SRD magic items have fixed-DC saving throws (e.g., Potion of Heroism, Oil of Slipperiness rider). The `fixed_dc` variant is expected to be the dominant DC source for consumable magic items.

## Omitted flavor

The illusion masquerade ("looks like a Potion of Healing") is purely narrative DM-agenda content — `Identify` reveals it, which is an out-of-combat DM ruling with no core-mechanics resolution tree. It belongs only in `description` and is deliberately excluded from the mechanics encoding.
