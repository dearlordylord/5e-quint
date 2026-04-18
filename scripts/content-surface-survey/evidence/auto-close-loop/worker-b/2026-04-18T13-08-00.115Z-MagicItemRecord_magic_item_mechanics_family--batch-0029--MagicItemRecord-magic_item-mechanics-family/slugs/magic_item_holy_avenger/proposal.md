`Holy Avenger` is a `magic_item`, but it does not fit the current authored surface honestly.

Why it fails:

1. The weapon-hit rider is missing from the current magic-item surface.
Evidence:
> "When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage."

The current `MagicItemComponentMechanics` admits `on_hit_trigger`, but only through the mastery-shaped `MasteryEffect` union:
- `modify_roll_advantage`
- `save_gate`
- `grant_weapon_attack`

It cannot express a direct `damage` effect on hit, and it cannot narrow that rider by target creature type.

Narrowest honest widening:
- Add a magic-item on-hit rider shape that can grant ordinary `EffectAtom` payloads, especially `damage`.
- Add target-side creature-type narrowing for that rider, or a more general on-hit predicate/filter.

2. Passive emanation aura support is missing from `PassiveMechanics`.
Evidence:
> "While you hold the drawn weapon, it creates a 10-foot Emanation originating from you. You and all creatures Friendly to you in the Emanation have Advantage on saving throws against spells and other magical effects."

The current `PassiveMechanics` shape is only:
- `condition?: EquipmentPredicate`
- `grants: EffectAtom[]`
- optional elapsed-time `operations`

It has no attachment/area field, so it cannot scope passive grants to:
- an emanation,
- originating from self,
- affecting friendly occupants of that area.

There is an area attachment vocabulary elsewhere in the surface, but only for spell families and activation phases, not for passive item auras.

Narrowest honest widening:
- Add an attachment-capable passive aura shape, or widen `PassiveMechanics` so grants can be attached to `self` / `target` / `area`.

3. The aura radius scaling also lacks an honest slot in the current passive shape.
Evidence:
> "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."

The current scaling vocabulary can scale damage/count/bonuses, but the passive item surface has no way to scale an attached area’s size by class level.

Narrowest honest widening:
- Add threshold-tier scaling for passive area geometry (here: emanation radius 10 ft, then 30 ft at paladin level 17).

Classification:
- `surface_widening`

Why this is not `structural_widening`:
- The unit still belongs under the existing `magic_item` kind.
- The missing pieces are variants/shapes inside existing mechanics families, not a new top-level family.

Why no authored subset was produced:
- Omitting the fiend/undead hit rider and the aura would discard two central mechanics, producing a misleadingly incomplete item trace.
