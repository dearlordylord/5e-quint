# Proposal: Hat of Disguise — surface_widening

## What fits

The Hat of Disguise encodes cleanly as a `magic_item` / `passive` family with a single `grant_spell_access` atom:

```json
{
  "kind": "grant_spell_access",
  "spellId": "disguise_self",
  "mode": "at_will"
}
```

This matches the Ring of Jumping pattern exactly. The attunement gate is expressed via `requiresAttunement: true` on the record.

## What's missing

**SRD text:** "The spell ends if the hat is removed."

Disguise Self has a printed duration of 1 hour (not concentration). The hat imposes an additional early-end condition: the ongoing spell effect terminates when the bearer removes the hat. This is an equipment-state early-end trigger that has no current representation in the surface.

### The gap

`GrantedSpellDurationOverride` currently:

```typescript
export type GrantedSpellDurationOverride = {
  readonly removeConcentration?: true;
  readonly endsWhenGrantedSpellEnds?: string;
};
```

Neither field covers "ends when this item is no longer worn/held."

### Proposed widening

Add an `endsWhenItemRemoved` boolean flag to `GrantedSpellDurationOverride`:

```typescript
export type GrantedSpellDurationOverride = {
  readonly removeConcentration?: true;
  readonly endsWhenGrantedSpellEnds?: string;
  readonly endsWhenItemRemoved?: true;   // NEW
};
```

With this addition, the full encoding would be:

```json
{
  "kind": "grant_spell_access",
  "spellId": "disguise_self",
  "mode": "at_will",
  "durationOverride": {
    "endsWhenItemRemoved": true
  }
}
```

## Classification

- **Outcome:** `surface_widening`
- **Atom:** `grant_spell_access` already exists; only a new field on an existing override type is needed.
- **Taxonomy impact:** None — no new v4 atom or relation is required. The constraint belongs to the `GrantedSpellDurationOverride` grammar, which is authored-surface metadata rather than a new execution atom.

## Pressure check

This pattern appears on other SRD items that grant spell access tied to continued item wear (e.g., items where the granted effect explicitly persists "while worn" or ends on removal). Adding `endsWhenItemRemoved` covers the class without widening the v4 taxonomy.
