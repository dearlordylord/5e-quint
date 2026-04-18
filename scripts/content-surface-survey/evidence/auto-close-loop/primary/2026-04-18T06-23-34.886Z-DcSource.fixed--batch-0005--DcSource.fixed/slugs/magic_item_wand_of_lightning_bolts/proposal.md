# Wand of Lightning Bolts

## Verdict

`surface_widening`

The item's mechanical payload now fits the current surface honestly:

- `kind = "magic_item"`
- mechanics family = `activation`
- `resource = charge_pool`
- `resetCadence = dawn`
- `grant_spell_access.mode = charge_cast`
- `grant_spell_access.dcOverride = { kind = "fixed", dc = 15 }`
- `destruction = last_charge_roll`

The remaining gap is the attunement qualifier.

## Encoded Cleanly

The current surface can represent the wand's deterministic mechanics:

- 7-charge pool
- spend 1-3 charges
- cast `lightning_bolt` at level 3-5
- use fixed save DC 15
- regain `1d6 + 1` charges at dawn
- destruction roll on the last charge

These all typecheck and trace without widening.

## Required Surface Widening

### 1. Attunement qualification on magic items

`MagicItemRecord` only carries:

```ts
requiresAttunement: boolean
```

That lets the record say the wand requires attunement, but not:

> "Requires Attunement by a Spellcaster"

Suggested widening:

```ts
readonly attunementRestriction?:
  | { readonly kind: "spellcaster" }
```

This is a surface widening, not an atom widening:

- no new v4 atom is forced;
- no new top-level family is forced;
- the missing concept is a narrower variant on existing record metadata.

## Why The Outcome Is Not `clean`

If authored today, the content can only say `requiresAttunement = true`.
That omits the eligibility rule for who may attune to the item. The
rest of the wand is encoded honestly, but the attunement restriction is
not representable on the current surface.
