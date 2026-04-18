`Necklace of Fireballs` is not an atom widening. It fits the existing `magic_item` / `activation` family, but the current authored surface cannot encode two item-specific parameter overrides honestly.

Missing surface shapes:

1. `grant_spell_access` needs a range override for point-targeted spells.
Evidence:
`You can take a Magic action to detach a bead and throw it up to 60 feet away. When it reaches the end of its trajectory, the bead detonates as a level 3 Fireball (save DC 15).`

Why the current surface is insufficient:
- `grant_spell_access` can override DC, area, and target restriction, but not spell range.
- Reusing the existing `fireball` record would falsely trace the item as casting to a point within 150 feet instead of 60 feet.
- `targetRestriction` does not help because `Fireball` targets a point in space, not a creature.

Suggested widening:
- Add a `rangeOverride` field on `grant_spell_access`, reusing the existing `Range` type or a narrowed override type that at least admits `{ kind: "point", feet: number }`.

2. `SpellAccessMode.charge_cast` conflates resource spend with spell-level scaling too tightly for capped overspend.
Evidence:
`You can hurl multiple beads, or even the whole necklace, at one time. When you do so, increase the damage of the Fireball by 1d6 for each bead after the first (maximum 12d6).`

Why the current surface is insufficient:
- The closest fit is `grant_spell_access` for `fireball` with `charge_cast`, mapping 1 bead -> level 3, 2 beads -> level 4, ... 5 beads -> level 7.
- That captures the damage increase up to the 12d6 cap, but it cannot express throwing more than 5 beads at once and still consuming them with no further increase.
- Existing `charge_cast.maxLevel` limits both effect scaling and spend. The necklace needs those concerns separated: resource spent may exceed the effect-scaling cap.

Suggested widening:
- Extend `SpellAccessMode.charge_cast` with an optional spend cap distinct from `maxLevel`, or an optional `maxEffectiveLevel` / `maxEffectiveCharges` field so extra charges can be consumed without further scaling.

Classification:
- `surface_widening`

Why not `structural_widening`:
- The unit still belongs to the existing `magic_item` top-level kind and `activation` family.
- No new atom or new top-level mechanics family is forced.
