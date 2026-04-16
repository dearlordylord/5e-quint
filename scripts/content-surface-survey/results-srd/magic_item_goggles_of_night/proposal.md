# Proposal: Goggles of Night — structural widening

## Outcome

`structural_widening`

## Blocking gap

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` variant. The v4 taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom, but the surface schema has never been widened to include a corresponding record kind. No honest encoding of Goggles of Night is possible without first adding this kind.

## Secondary gaps (would surface once MagicItemRecord exists)

### 1. Passive / worn mechanics family

All existing mechanics families require an explicit activation:
- Spells: cast with action/bonus action/reaction, consume a spell slot.
- Class features: activated with `free` or `bonus_action` cost, consume a use-count.
- Masteries: triggered on weapon hit.

Goggles of Night is always-on while worn — there is no activation, no resource consumed, no trigger. A new family is needed, e.g.:

```
family: "passive_property"   // always active while worn/attuned
```

This family would hold a list of effects that apply unconditionally when the item is equipped (and possibly a condition on attunement if required).

### 2. grant_sense surface type

The v4 atom `grant_sense` exists in the taxonomy but has no surface encoding in `types.ts`. A minimal surface shape:

```typescript
export type SenseKind = "darkvision" | "blindsight" | "truesight" | "tremorsense";

export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: SenseKind;
  readonly rangeFeet: number;
};
```

### 3. Conditional sense extension

The item has two mechanically distinct branches depending on whether the wearer already possesses darkvision:

- **No darkvision**: grant darkvision 60 ft.
- **Has darkvision**: extend range by 60 ft.

This conditional-override pattern is not representable with a plain `grant_sense`. A possible encoding:

```typescript
export type GrantOrExtendSenseEffect = {
  readonly kind: "grant_or_extend_sense";
  readonly sense: SenseKind;
  readonly grantRangeFeet: number;    // used when wearer lacks the sense
  readonly extendByFeet: number;       // used when wearer already has the sense
};
```

Alternatively, the tracer could treat all `grant_sense` effects as "grant if absent, else extend by amount" — but that would require the semantics to live in the tracer rather than the type, which makes the surface less honest.

## Recommended widening order

1. Add `MagicItemRecord` to `UnitRecord` with a `passive_property` mechanics family.
2. Add `grant_sense` (or `grant_or_extend_sense`) to the surface effect types.
3. Encode Goggles of Night as:
   ```
   kind: magic_item
   mechanics.family: passive_property
   mechanics.effects: [ { kind: "grant_or_extend_sense", sense: "darkvision", grantRangeFeet: 60, extendByFeet: 60 } ]
   ```

## v4 atoms that would be exercised

- `magic_item_root` (source)
- `grant_sense` (effect) — already in v4 taxonomy, just needs surface encoding

No new v4 atoms are required; the only missing pieces are the surface record kind, the mechanics family, and the conditional-extension variant of the sense effect.
