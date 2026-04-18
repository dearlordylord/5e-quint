# Proposal: Ring of Jumping

## Verdict

`surface_widening`

The unit fits the existing top-level shape:

- `kind = "magic_item"`
- `mechanics.family = "passive"`
- grant via `EffectAtom.grant_spell_access`

What does **not** fit is the rider on that granted spell access:

> "While wearing this ring, you can cast *Jump* from it, but can target only yourself when you do so."

## Missing surface shape

The current `grant_spell_access` atom can express:

- which spell is granted
- how often / with what resource it can be cast

It cannot express:

- target restrictions on the granted casting

That matters here because `Jump` is not inherently self-only; the ring changes the granted casting's legal target set. Encoding this as plain:

```json
{ "kind": "grant_spell_access", "spellId": "jump", "mode": "at_will" }
```

would be dishonest, because it would imply the wearer can cast `Jump` on any legal `Jump` target, not only themself.

## Narrowest widening

Add a target-restriction field to `grant_spell_access`, for example:

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: SpellAccessMode;
  readonly targetRestriction?: "self_only";
}
```

This is a surface widening, not an atom widening:

- the core mechanic is still `grant_spell_access`
- no new top-level family is needed
- no new v4 atom is forced

## Notes

There is existing authored content with the same omission pattern (`magic_item_ring_of_water_walking`). I did not copy that omission here because the protocol for this task requires an honest fit rather than a closest-valid placeholder.
