# Proposal: Ring of Animal Influence — Surface Widenings

## Summary

The ring fits `magic_item` / `ActivatedAbilityMechanics` with a `charge_pool` resource and three `grant_spell_access` effects using `charge_cast` mode. Two fields missing from `grant_spell_access` block honest encoding.

## What fits

| Field | Encoding |
|---|---|
| Record kind | `magic_item` |
| Rarity | `rare` |
| Requires attunement | `false` |
| Resource | `charge_pool`, `cap: { kind: "fixed", uses: 3 }` |
| Reset cadence | `dawn`, `regain: { kind: "fixed", expr: { dice: 1, dieSize: 3 } }` |
| Activation cost | `action` (Magic action to cast) |
| Destruction | `none` |
| Animal Friendship access | `grant_spell_access { spellId: "animal_friendship", mode: { kind: "charge_cast", baseCharges: 1, perLevelCharges: 0, minLevel: 1, maxLevel: 1 } }` |
| Speak with Animals access | `grant_spell_access { spellId: "speak_with_animals", mode: { kind: "charge_cast", baseCharges: 1, perLevelCharges: 0, minLevel: 1, maxLevel: 1 } }` |

## Gap 1: `grant_spell_access` needs a creature-type filter

**SRD text:** "*Fear* (affects Beasts only)"

When cast from this ring, Fear targets only Beasts, not its normal "any creature" targeting. The current `grant_spell_access` atom:

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: SpellAccessMode;
}
```

has no field for a creature-type restriction on the cast. Encoding `{ spellId: "fear", mode: charge_cast }` without the restriction would produce a trace claiming Fear targets any creature — materially wrong and incorrect for downstream combat resolution.

### Proposed widening

Add an optional `targetTypeFilter` field to `grant_spell_access`:

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: SpellAccessMode;
  readonly targetTypeFilter?: ReadonlyNonEmptyArray<CreatureType>;  // new
}
```

Semantics: when present, the spell may only be cast targeting creatures of the listed types. `TargetTypeFilter` already exists in the surface (`ReadonlyNonEmptyArray<CreatureType>`); this field reuses it.

The ring would then encode Fear as:
```
{ kind = "grant_spell_access"
, spellId = "fear"
, mode = { kind = "charge_cast", baseCharges = 1, perLevelCharges = 0, minLevel = 3, maxLevel = 3 }
, targetTypeFilter = [ "beast" ]
}
```

## Gap 2: `grant_spell_access` needs a fixed-DC override

**SRD text:** "you can expend 1 charge to cast one of the following spells (save DC 13) from it"

The ring specifies DC 13 — a fixed value independent of the wearer's spellcasting ability modifier or proficiency bonus. The current `grant_spell_access` atom carries no DC information; the save DC would be resolved from the caster's spell save DC at runtime, which would be incorrect for an item with a pinned DC.

### Proposed widening

Add an optional `fixedDc` field (or `dcSource: DcSource`) to `grant_spell_access`:

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: SpellAccessMode;
  readonly targetTypeFilter?: ReadonlyNonEmptyArray<CreatureType>;  // gap 1
  readonly fixedDc?: number;                                        // new — gap 2
}
```

`fixedDc: 13` would mean any saving throw against spells cast from this item uses DC 13, overriding the caster's spell save DC. Alternatively, reuse `DcSource` for generality, but `fixedDc: number` suffices for every observed SRD magic-item pattern.

The ring would then encode all three spells with `fixedDc = 13`.

## Classification

- **Outcome:** `surface_widening`
- **Atoms blocked:** `grant_spell_access` (two missing fields)
- **v4 taxonomy impact:** None — `grant_spell_access` already exists as a v4 effect atom; both widenings are new fields on the existing surface type, not new atoms.
- **Other pressure:** The `targetTypeFilter` pattern has precedent in `TargetSelection.typeFilter` (Hold Person: Humanoid only) and `modify_roll_advantage.attackerTypeFilter`; the proposed field reuses the same `CreatureType` vocabulary. The `fixedDc` pattern has pressure from any SRD magic item that pins a save DC independent of caster stats.
