## Elven Chain

Outcome: `surface_widening`

The top-level shape fits `MagicItemRecord` with `PassiveMechanics`, but
the current surface cannot encode the second RAW rider honestly:

> You are considered trained with this armor even if you lack training
> with Medium or Heavy armor.

### Missing surface shape

Add an `EffectAtom` variant for armor / item training, reusing the v4
taxonomy's existing `grant_proficiency` atom rather than inventing a new
taxonomy atom.

Narrowest pressure-case shape:

```ts
{
  readonly kind: "grant_proficiency";
  readonly proficiency: "armor_training";
  readonly scope: "attached_item";
}
```

Why this shape:

- The grant is mechanical, deterministic, and not DM agenda.
- It is narrower than category-wide armor proficiency; Elven Chain does
  not say you gain Medium Armor or Heavy Armor training generally.
- The grant should be active only while the magic item is worn, which is
  already the host semantics of `PassiveMechanics` on a magic item.

Why this is `surface_widening`, not `atom_widening`:

- `grant_proficiency` already exists in `TAXONOMY_atoms_graph.md`.
- The authored TS surface in `src/surface/types.ts` does not currently
  expose it in `EffectAtom`, so this is a missing surface variant.
