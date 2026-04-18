# Javelin of Lightning

`Javelin of Lightning` fits the existing top-level `magic_item` kind, but it does not fit the current magic-item mechanics families honestly.

## Why This Stops

- The first paragraph is not a plain passive grant. It is a deterministic rider on a weapon hit:
  `Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage.`
  Current magic-item mechanics allow:
  - passive always-on grants
  - activated abilities
  - triggered reactions
  - composites over those shapes

  None of those expresses an equipped item's non-spell on-hit rider.

- The rider's payload is also missing. The current effect vocabulary can:
  - add damage
  - modify damage numerically
  - change crit range
  - apply conditions

  But it cannot replace the damage type of an already-existing weapon hit.

- The `Lightning Bolt` property is closer to the current activation surface, but it still has a deterministic item-return clause:
  `Immediately after dealing this damage, the weapon reappears in your hand.`
  The current activation surface has no honest way to target the thrown item itself and model that return behavior.

## Proposed Widenings

1. Add a non-spell on-hit component/family for magic items.
   This would let an equipped item open an `on_hit_window` off the wielder's weapon hit and apply a rider without pretending the rule is a passive always-on grant.

2. Add an effect atom for weapon-hit damage-type substitution.
   Pressure case:
   `you can have it deal Lightning damage instead of Piercing damage`

3. Add item-targeted return behavior for thrown-item activations.
   Pressure case:
   `Immediately after dealing this damage, the weapon reappears in your hand.`

## Notes

- The `Lightning Bolt` property alone mostly fits existing pieces:
  - `activation` magic-item family
  - `replace_attack` activation cost
  - fixed `use_count` 1
  - `dawn` reset
  - fixed DC 13 Dex `save_gate`
  - line-area lightning damage with half on success

- I still stopped before authoring `content/magic_item_javelin_of_lightning.dhall` because omitting the first paragraph would misrepresent the item, not just leave out a minor rider.
