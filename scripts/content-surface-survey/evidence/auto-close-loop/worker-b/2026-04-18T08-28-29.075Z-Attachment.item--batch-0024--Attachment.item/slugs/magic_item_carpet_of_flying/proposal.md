`Carpet of Flying` fits the existing top-level `magic_item` kind, and its four physical sizes could reuse `MagicItemRecord.variants`. The honest failure is lower-level: the current surface has no way to represent an activated item that itself becomes a remotely directed moving subject with load-dependent speed.

What the rule needs:

- An activation on the item: taking a `Magic` action makes the carpet hover and fly.
- The moving subject is the carpet, not the wielder.
- Ongoing control is range-gated: it moves according to your directions only while you are within 30 feet of it.
- Speed is variant-specific by carpet size.
- Speed is conditional on carried load: normal speed up to listed capacity, half speed above that up to twice that capacity.

Why existing shapes are dishonest:

- Encoding this as `grant_speed` on `self` would incorrectly say the user gains flight.
- Encoding it as a `companion` would incorrectly recast the carpet as a creature.
- Encoding only a fixed `grant_speed` on an `item` attachment would drop the rule's controlling-distance gate and the load-conditioned speed change, which are core mechanics rather than flavor.

Recommended widening:

1. Add an item-mobility variant that can attach to `Attachment.item` and represent:
   - fly/hover capability on the item itself;
   - controller range (`within 30 feet`);
   - optionally, directional control by the activator.
2. Add conditional speed support keyed by carried load, sufficient for:
   - normal capacity;
   - maximum capacity;
   - alternate speed when over normal capacity.

Classification:

- `surface_widening`, not `structural_widening`: the unit still belongs under `MagicItemRecord` with an activation-family payload.
- Not `atom_widening` for this pass because the main gap is the authored surface's inability to express item-attached controlled movement and conditional speed inside an otherwise existing family.
