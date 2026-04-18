`Sovereign Glue` does not fit the current surface honestly enough to author a placeholder `content/magic_item_sovereign_glue.dhall`.

Classification: `atom_widening`

Why this is not `structural_widening`

- The top-level kind is still `magic_item`.
- The item is still activation-shaped: applying an ounce takes a Utilize action, then the effect sets after 1 minute.
- The blocker is not the absence of a magic-item family. The blocker is that the existing surface has no honest effect atom for creating a persistent adhesive bond between two objects.

Primary atom gap

1. Missing object-bond / adhesive effect atom

- Core rule text: "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."
- No current `EffectAtom` models:
  - choosing two objects as the bonded pair,
  - creating a durable "bonded together" state between them,
  - making that bond permanent until a narrow break condition is met.
- Existing object-facing shapes like `attachment.kind = "object"` and `alter_item_kind` are not enough. They can target objects, but they cannot express "these two objects are now permanently adhered to each other."

Secondary surface pressure

1. Delayed arming / setting window

- Core rule text: "the applied glue takes 1 minute to set."
- `ActivatedAbilityMechanics.duration` can describe a duration window on the activation, but there is no existing effect/lifecycle coupling for "after this minute, upgrade the target pair into a bonded state."
- That is still downstream of the missing bond atom, so this remains secondary pressure rather than the main classification driver.

2. Narrow break conditions on the created bond

- Core rule text: "the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."
- The surface has targeted negation for spells (`negate_named_effect`) and some lifecycle atoms, but nothing that expresses "this created bond persists unless one of these specific external counteragents is applied."

3. Consumable ounce accounting

- Core rule text: "When found, a container contains 1d6 + 1 ounces. One ounce of the glue can cover a 1-foot square surface."
- The current item-resource surface can model fixed or scaling pools, but not a random initial inventory quantity on discovery.
- This matters for a full encoding, but it is still secondary to the missing adhesive-bond mechanic.

Why I did not coerce this into current JSON

- Encoding only the Utilize action would produce a trace with no representation of the item's actual effect.
- Encoding the result as `alter_item_kind`, `block_travel`, or another existing atom would be false: the item does not transform an object, create a barrier, or move anything. It bonds two objects together.
- Encoding only the storage caveat ("must be stored in a jar or flask coated with Oil of Slipperiness") would also be misleading because that is not the item's main mechanic.

Recommended widening direction

1. Add a new effect atom for a persistent object-to-object adhesive bond, e.g. `bond_objects` or `adhere_objects`.
2. Let that atom name two targeted objects, a setting delay, and permanent persistence.
3. Add lifecycle / counteragent support so the bond can be broken only by named items/spells called out by the source text.
