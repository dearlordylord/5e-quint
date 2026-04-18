`Wand of Lightning Bolts` fits the existing `magic_item` + `activation` surface honestly for its core mechanics:

- held-item activation gate
- 7-charge pool
- charge-cast spell access for `lightning_bolt` at levels 3-5
- fixed item DC override (`15`)
- dawn recharge (`1d6 + 1`)
- last-charge destruction roll

Remaining gap: the attunement qualifier `by a spellcaster` is not representable. `MagicItemRecord.requiresAttunement` is only a boolean, so the surface can say the wand requires attunement but not who is eligible to attune to it.

Classification: `surface_widening`

Suggested widening:

- `MagicItemRecord.attunement?: { required: boolean, qualifier?: ... }`
  Justification: multiple SRD magic items distinguish plain attunement from class- or capability-gated attunement.
  Evidence: "Rare (Requires Attunement by a Spellcaster)"
