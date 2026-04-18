`Sovereign Glue` fits the existing `magic_item` top-level kind and an activation-style item workflow for economy and resource use, but it does not fit the current effect surface honestly.

The usable parts already exist:

- Activation cost can be modeled as `standard_action: utilize`.
- Consumption can be modeled as a non-recharging `charge_pool`, with the ounces as charges and an `initialCount` of `1d6 + 1`.
- Object targeting already exists through `Attachment.kind = "object"`.

The blocker is the payload:

- The item does not damage, move, transform, summon, detect, or grant a passive bonus.
- Its core mechanic is creating a persistent adhesive relationship between two objects.
- The relationship is delayed: the glue is applied first, then it sets after 1 minute, then the permanent bond exists.
- The permanent bond has named break conditions: `Universal Solvent`, `Oil of Etherealness`, or `Wish`.

That forces at least:

- A new effect atom such as `bond_objects`.
- A delayed-commit lifecycle/subgraph such as `delayed_set_then_permanent_bond`, so the trace can distinguish:
  - application,
  - 1-minute setting window,
  - permanent bonded state,
  - named breakers.

Why this is `atom_widening`, not `structural_widening`:

- The unit does not need a new top-level kind.
- It does not need a new mechanics family.
- The missing concept is the effect/lifecycle payload, not the outer record structure.

Why I did not author placeholder Dhall:

- Any current encoding would have to lie about the rule by pretending the glue grants some unrelated effect like `alter_item_kind`, `block_travel`, or another existing atom.
- The instructions explicitly forbid producing a misleading trace when the only valid JSON would be false.
