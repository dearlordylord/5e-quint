# Proposal: Ring of Jumping — surface_widening

## Unit

Ring of Jumping (magic_item, uncommon, requires attunement)

> "While wearing this ring, you can cast *Jump* from it, but can target only yourself when you do so."

## What fits

- **Record kind**: `magic_item` — correct.
- **Mechanics family**: `passive` — the ring is always-on while worn/attuned; no charge pool or use counter.
- **Core atom**: `grant_spell_access` with `spellId: "jump"` and `mode: "at_will"` — Jump is castable freely, no usage limit stated in RAW.
- **Attunement**: `requiresAttunement: true` → `attunement_slot` resource.
- **Destruction**: `{ kind: "none" }` — no charge-burn lifecycle.

## What is missing

### `grant_spell_access.targetRestriction` (new optional field)

The ring's only distinguishing rule is that Jump may only target the wearer, not other creatures. The Jump spell (1st-level transmutation) normally reads "Touch" range and "one willing creature" — meaning the caster could touch and buff an ally. The ring removes that option.

The current `grant_spell_access` atom:

```typescript
| {
    readonly kind: "grant_spell_access";
    readonly spellId: string;
    readonly mode: SpellAccessMode;
  }
```

has no field for a target override or restriction. Encoding this ring with `grant_spell_access` as-is would produce a trace claiming unrestricted Jump access, which is mechanically wrong and misleading.

## Proposed widening

Add an optional `targetRestriction` field to `grant_spell_access`:

```typescript
| {
    readonly kind: "grant_spell_access";
    readonly spellId: string;
    readonly mode: SpellAccessMode;
    readonly targetRestriction?: "self_only";  // NEW
  }
```

`"self_only"` means the granted spell may only target the granting item's wearer/holder, overriding the spell's normal target selection. This is a closed value for now; the only SRD 5.2.1 pressure case found is this ring.

## Classification

`surface_widening` — the `grant_spell_access` atom exists in v4 and in `types.ts`; only a new optional field on an existing surface type is needed. No new atom, no new family, no structural change required.

## Dhall not authored

Per guardrails, no dhall was produced. A `grant_spell_access` encoding without `targetRestriction` would omit the item's sole mechanical constraint, producing a trace that misrepresents the item's rules.
