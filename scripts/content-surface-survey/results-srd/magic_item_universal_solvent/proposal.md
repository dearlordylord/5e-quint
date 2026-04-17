`Universal Solvent` does not fit the current magic-item activation surface honestly, so no authored `content/magic_item_universal_solvent.dhall` was created.

Why it fails:

- The item targets a non-creature physical surface: "pour 1 or more ounces of solvent from the tube onto a surface within reach." Current `ActivationPhase.attachment` only supports `self`, `target`, `area`, and `mark`; there is no object/surface attachment for magic-item activations.
- The core effect is not any existing surfaced v4 effect atom. "Each ounce instantly dissolves up to 1 square foot of adhesive it touches" is a deterministic world-state mutation on adhesive coverage, not damage, condition, movement, targeting denial, spell access, or another existing effect atom.
- The activation economy is specifically a `Utilize` action, not a generic action. Current `ClassFeatureActivationCost` has `action`, `bonus_action`, `reaction`, `free`, and `replace_attack`, but nothing that preserves the SRD action-kind distinction.
- The consumable resource is variable-spend ounces with a randomized starting quantity: "When found, a tube contains 1d6 + 1 ounces" and each use spends "1 or more ounces". The current magic-item resource model can represent variable spend (`charge_pool`) and non-recharge (`never`), but not a randomized initial pool size on the record.

Recommended widenings:

1. `Attachment` / target-surface widening
   - Add a variant for a non-creature object/surface target in activation phases.
   - Evidence: "pour 1 or more ounces of solvent from the tube onto a surface within reach"

2. New effect atom for adhesive dissolution
   - Add a deterministic effect atom that removes or dissolves adhesive coverage from a touched surface, parameterized by area per resource spent.
   - Evidence: "Each ounce instantly dissolves up to 1 square foot of adhesive it touches, including Sovereign Glue."

3. `ClassFeatureActivationCost` widening for `utilize`
   - Preserve the explicit SRD action kind instead of collapsing to generic `action`.
   - Evidence: "You can take a Utilize action"

4. Resource-cap widening for randomized initial quantity
   - Add a way to express "initially contains NdM + K units" for consumable items with no recharge.
   - Evidence: "When found, a tube contains 1d6 + 1 ounces."

Classification:

- Primary verdict: `atom_widening`
- Reason: even if targeting and action-cost variants were added, the item still needs a new core effect atom for dissolving adhesive.
