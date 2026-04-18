# Proposal: Carpet of Flying

## Verdict

`Carpet of Flying` does not fit the current authored surface honestly, but it does fit the existing `magic_item` record kind and `activation` family once the surface learns how to model commanded item locomotion. This is `surface_widening`, not `structural_widening`.

## Why it does not fit today

The current surface can model:

- a magic item with an activation cost;
- an item-local attachment via `Attachment.item`;
- passive or activated creature speed grants via `grant_speed`;
- collection-style magic-item variants.

It cannot model:

- an item itself becoming a moving/flying object;
- remote directional control with a fixed control radius;
- speed that changes based on carried load.

Using `grant_speed` would be dishonest because the carpet is not granting a creature a Fly Speed. Using `spawned_creature` would also be dishonest because the carpet is not creating a companion creature or stat block.

## Narrowest widening that would solve it

Add a magic-item activation effect variant for commanded item locomotion, roughly in the shape of:

- target: `Attachment.item`
- movement mode: hover / fly
- control range: `30 feet`
- speed: fixed numeric value
- optional load rule: reduced speed when carried load exceeds a threshold

That would let the four printed carpets author as item variants rather than forcing a fake creature or self-buff encoding.

## Size table

The size table itself is not the blocker. It can be represented as four `MagicItemVariant` entries:

- `3 ft × 5 ft` / `200 lb` / `80 ft`
- `4 ft × 6 ft` / `400 lb` / `60 ft`
- `5 ft × 7 ft` / `600 lb` / `40 ft`
- `6 ft × 9 ft` / `800 lb` / `30 ft`

The GM's choice or random determination of which variant exists is item-generation metadata, not the missing mechanic.

## Evidence

> You can make this carpet hover and fly by taking a Magic action and using the carpet's command word. It moves according to your directions if you are within 30 feet of it.

> A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity.
