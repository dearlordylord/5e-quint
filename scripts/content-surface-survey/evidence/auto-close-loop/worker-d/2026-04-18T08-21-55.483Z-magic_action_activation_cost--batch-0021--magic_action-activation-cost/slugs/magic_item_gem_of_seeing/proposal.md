`Gem of Seeing` fits the existing `magic_item` + `activation` family for its resource model:

- charge pool: 3 charges
- activation cost: Magic action
- reset cadence: daily at dawn, regain `1d3`
- timed duration: 10 minutes

The honest blocker is the payload of the timed effect. The SRD does not say the bearer simply gains unconditional Truesight for 10 minutes. It says:

> "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."

Current surface options are not precise enough:

- `grant_sense` would grant unconditional Truesight, which overstates the effect.
- `condition = { kind = "holding_item" }` only gates activation or passive application by equipment state; it does not capture "while peering through the gem".
- There is no existing attachment / predicate / effect parameter for "sense is mediated through a specific held item" or "sense only applies while using the item as the viewpoint."

Proposed widening: add a new variant on an existing surface type rather than a new atom.

- Candidate shape: widen `EffectAtom.grant_sense` with an optional mediation qualifier, such as an item-view / through-item condition.
- Alternative shape: widen the ongoing/passive gating surface with a non-equipment usage predicate like `peer_through_item`.

This is `surface_widening`, not `atom_widening`:

- the underlying effect atom already exists in v4 (`grant_sense`);
- the missing piece is the authored-surface qualifier that constrains how that sense is exercised.
