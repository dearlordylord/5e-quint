# Proposal: `magic_item_robe_of_useful_items`

Outcome: `structural_widening`

## Why it does not fit today

`Robe of Useful Items` is not a normal charge item and not a normal passive item.

Its core mechanic is:

1. The item starts with a finite heterogeneous inventory of embedded patches.
2. The user takes a Magic action to select one remaining patch.
3. That exact patch is consumed.
4. The robe releases a payload determined by that patch.
5. When the inventory is empty, the robe downgrades into an ordinary garment.

Current `MagicItemRecord` activation mechanics can model:

- one fixed activation shape;
- a scalar `use_count` or `charge_pool`;
- a fixed phase list.

They cannot model:

- named per-option stock with independent depletion;
- heterogeneous latent payloads inside one item;
- one activation that first selects a stored payload, then dispatches to different release shapes;
- end-state tied to the embedded inventory becoming empty.

## Pressure points from the text

- "detach one of the patches, causing it to become the object or creature it represents"
- "Once the last patch is removed, the robe becomes an ordinary garment."
- "The robe has two of each of the following patches"
- "In addition, the robe has 4d4 other patches"

## Narrowest honest widening

This looks like a new stored-payload / release subgraph for magic items, not just one missing atom.

Suggested additions:

- `ActivationResource.embedded_inventory`
  - Models finite named stock such as `bullseye_lantern: 2`, `dagger: 2`, `rope: 2`, plus extra generated entries.
- `ActivationPhase.release_embedded_payload`
  - Activation chooses one remaining entry and releases its payload.
- Embedded payload records that can point to heterogeneous outcomes:
  - mundane object creation
  - creature creation
  - consumable item creation
  - spell-scroll creation with a bounded spell-level choice

## Why this is `structural_widening`, not just `surface_widening`

If the robe only needed a new effect atom like `create_object`, that would be a surface gap. But even with `create_object`, the current family still cannot honestly say:

- which patch was selected;
- whether that patch was still available;
- how many copies remained;
- that the item becomes inert after the last remaining patch is detached.

That is a missing composition shape around the activation, not a single missing leaf.

## DM-agenda boundary

The GM-chosen or random determination of the extra `4d4` patches is partly caller-owned setup. That is not the primary blocker. Even if the patch list were fully known up front, the stored heterogeneous inventory / release mechanism is still missing.
