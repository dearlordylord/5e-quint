# Proposal: Potion of Clairvoyance — structural_widening

## Unit

**Potion of Clairvoyance** — Magic Item, Rare (SRD 5.2.1)

> When you drink this potion, you gain the effect of the *Clairvoyance* spell (no Concentration required).

## Why encoding failed

### Gap 1 (blocking): No `MagicItemRecord` kind

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `kind: "magic_item"` variant. Any JSON with `"kind": "magic_item"` fails TypeScript typecheck immediately. The tracer also has no `case "magic_item"` branch — it would throw `unhandled unit kind`.

The v4 taxonomy (`TAXONOMY_atoms_graph.md §1`) already lists `magic_item_root` as a source atom, so the atom exists at the taxonomy level but has never been wired into `types.ts` or `tracer.ts`.

**Required:** Add `MagicItemRecord` to `UnitRecord` with a corresponding `MagicItemMechanics` union and at minimum one mechanics family. The tracer needs a `traceMagicItemUnit` branch.

### Gap 2 (secondary): No `named_spell_grant` mechanics family

Even with a `MagicItemRecord` type, the Potion of Clairvoyance's mechanic has no representable family. The potion:

1. Delegates entirely to an existing named spell (*Clairvoyance*)
2. Overrides one property of that spell (removes Concentration)

This pattern — "grant the full mechanics of spell X, minus property Y" — does not fit any existing spell family:

- `ongoing_effect` / `activation` / etc. describe how a *caster* casts a spell; potions have no caster or slot cost
- There is no `SpellId` reference type to point at another unit

A new mechanics shape is needed, roughly:

```typescript
export type NamedSpellGrantMechanics = {
  readonly family: "named_spell_grant";
  readonly spellId: string;           // references another unit by slug
  readonly suppressConcentration?: boolean;
  // potentially: suppressComponents, upcastToLevel, etc.
};
```

This pattern will recur across the magic item catalogue (Potions of Animal Friendship, Mind Reading, Speed, Invisibility, etc. all delegate to named spells).

## Classification

`structural_widening` — the top-level `UnitRecord` kind is absent; no mechanics family exists for the item's core mechanic. Both gaps must be resolved before any magic-item potion can be encoded.

## Recommended sequencing

1. Add `MagicItemRecord` and `MagicItemMechanics` scaffold to `types.ts`
2. Add `traceMagicItemUnit` stub to `tracer.ts`
3. Design and add `named_spell_grant` family (with `spellId` reference and override fields)
4. Re-encode this unit

## Atoms that *would* be used (if the spell were encoded inline)

Clairvoyance is a 3rd-level divination, 10-minute cast, Concentration up to 10 minutes, creates a remote sensor. If modeled as an `ongoing_effect` spell (for reference only):

- `magic_item_root` → `activate` → `persist` → `expire`
- `grant_sense` (remote seeing/hearing through sensor at range)
- Concentration suppressed (no `concentration_lock` node, which is the whole point)

The concentration suppression is itself a structural gap: there is no `suppress_concentration` atom or `concentration_override` modifier in v4.
