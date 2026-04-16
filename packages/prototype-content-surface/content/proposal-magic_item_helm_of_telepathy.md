# Proposal: Widenings for Helm of Telepathy

## Outcome: structural_widening

The Helm of Telepathy cannot be honestly encoded in the current surface. The primary blocker is that `magic_item` does not exist as a `UnitRecord` kind — `types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The tracer's top-level switch would throw `unhandled unit kind: magic_item` immediately.

---

## Unit mechanics

```
While wearing this helm, you have telepathy with a range of 30 feet,
and you can cast Detect Thoughts or Suggestion (save DC 13) from the helm.
Once either spell is cast from the helm, that spell can't be cast again
until the next dawn.
```

Three distinct mechanics:

1. **Passive telepathy (30 ft)** — always-on while worn/attuned, no action, no charge.
2. **Detect Thoughts from helm** — cast once per dawn, fixed DC 13.
3. **Suggestion from helm** — cast once per dawn, fixed DC 13.

---

## Required widenings

### W1. New top-level kind: `MagicItemRecord` (structural)

A new record type and tracer branch are needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The tracer needs a new `traceMagicItemUnit` branch.

### W2. New mechanics family: `passive_while_attuned` (structural)

The helm's telepathy is a persistent passive effect that is active whenever the wearer is attuned and wearing the item. No existing family models this:

- `ClassFeatureActivationMechanics` requires `activationCost` + `resource` — doesn't fit a free passive.
- Spell families (`ongoing_effect`, `activation`, etc.) all require a spell cast event.

A minimal new family:

```typescript
export type PassiveWhileAttuned = {
  readonly family: "passive_while_attuned";
  readonly effects: ReadonlyArray<PassiveEffect>;
};
```

Where `telepathic_link` (already a v4 atom) is one valid `PassiveEffect`:

```typescript
export type TelepaticLinkEffect = {
  readonly kind: "telepathic_link";
  readonly rangeFeet: number;
};
```

### W3. New mechanics family: `item_charge_spell_access` (structural)

The helm grants access to named spells from a per-spell charge pool that resets at dawn. This pattern (charge → cast named spell → dawn reset) is common across magic items (wands, staves, helms) and needs a dedicated family.

Key shape:

```typescript
export type ItemSpellEntry = {
  readonly spellId: string;
  readonly fixedDc?: number;       // absent if caster-derived
  readonly chargesPerReset: number;
};

export type ItemChargeSpellAccessMechanics = {
  readonly family: "item_charge_spell_access";
  readonly spells: ReadonlyArray<ItemSpellEntry>;
  readonly resetCadence: RestResetCadence;  // needs dawn variant (W4)
};
```

### W4. New variant: `RestResetCadence.dawn` (surface_widening)

The per-spell charges reset at dawn, not on a rest. `RestResetCadence` currently has:
- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

Add:

```typescript
| { readonly kind: "dawn" }
```

This covers dawn-keyed recharges across many SRD magic items.

### W5. New variant: `DcSource.fixed` (surface_widening)

Suggestion's save DC is a hard-coded 13, not derived from caster stats. `DcSource` currently only has `caster_spell_save_dc` and `weapon_attack_dc`. Add:

```typescript
| { readonly kind: "fixed_dc"; readonly dc: number }
```

### W6. Attunement resource (structural)

The `attunement_slot` resource atom exists in v4 taxonomy (§7) but has no surface representation. Magic items require a surface mechanism to express attunement gating. At minimum:

```typescript
export type MagicItemRarity = "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
```

And the `MagicItemRecord` should carry `requiresAttunement: boolean`. The `attune` procedure atom (v4 §2) would be emitted by the tracer when `requiresAttunement` is true.

---

## Atoms involved (if widening were implemented)

From v4 taxonomy, all atoms needed already exist:
- `magic_item_root` (source)
- `attune` (procedure) — if attunement modeled
- `attunement_slot` (resource)
- `telepathic_link` (effect)
- `grant_spell_access` (effect)
- `charge` (resource)
- `use_count` (resource)

No net-new v4 atoms are required. All gaps are at the surface type level (new record kind, new families, new variants).

---

## Summary table

| Gap | Kind | Narrowest classification |
|-----|------|--------------------------|
| No `MagicItemRecord` kind | New record type + tracer branch | structural_widening |
| No passive-while-attuned family | New mechanics family | structural_widening |
| No item-charge spell access family | New mechanics family | structural_widening |
| No `dawn` reset cadence | New `RestResetCadence` variant | surface_widening |
| No `fixed_dc` DcSource | New `DcSource` variant | surface_widening |
| Attunement unmodeled | New record field + resource | structural_widening |
