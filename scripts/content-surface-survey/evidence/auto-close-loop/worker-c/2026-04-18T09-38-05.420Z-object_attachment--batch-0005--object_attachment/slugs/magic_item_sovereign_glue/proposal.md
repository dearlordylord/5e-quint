## Sovereign Glue

`Sovereign Glue` fits the existing top-level `magic_item` record and is closest to the `activation` mechanics family:

- it is used actively,
- it spends a `Utilize` action,
- it consumes a finite physical stock,
- it does not recharge.

I did **not** author `content/magic_item_sovereign_glue.dhall` because the current surface cannot encode the item's core mechanic honestly.

### Required widening

1. New effect atom: `bond_objects`

- Why: the item creates a persistent adhesive bond between two objects. That is not damage, a condition, a movement effect, an item-kind swap, or any existing object-facing effect.
- Pressure text: "can form a permanent adhesive bond between any two objects"
- Why existing atoms do not work:
  - `alter_item_kind` changes one object's form, not the relationship between two objects.
  - `block_travel` / `block_targeting` are area or targeting gates, not adhesive state.
  - `mark` / `transport_exile` / `force_move` do not create a durable object-to-object bond.

Suggested shape, at minimum:

```ts
{
  readonly kind: "bond_objects";
  readonly permanence: "until_broken";
  readonly brokenBy: ReadonlyNonEmptyArray<
    | { readonly kind: "named_item"; readonly itemId: string }
    | { readonly kind: "named_spell"; readonly spellId: string }
  >;
}
```

This is the narrowest honest atom pressure from the item text.

2. New attachment variant: `Attachment.object_pair`

- Why: one activation does not target a single object. It selects two objects as one bonded pair.
- Pressure text: "between any two objects"

Current `Attachment.object` only identifies one object. Encoding one side and leaving the second implied would be false.

Suggested shape:

```ts
| {
    readonly kind: "object_pair";
    readonly rangeOrigin?: AttachmentRangeOrigin;
  }
```

3. New delayed-application subgraph: `delayed_set_then_persist`

- Why: the bond does not exist at action resolution time. The glue is applied now and only becomes effective after a one-minute setting window.
- Pressure text: "Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set."

The current `activation` family supports immediate phases, and `duration` describes how long an already-applied effect persists. It does not honestly represent "apply now, effect starts later."

This wants a bounded lifecycle shape such as:

- activation commits application,
- a duration/setup window runs for 1 minute,
- the bond effect starts only after that window completes,
- the resulting state then persists until one of the named breakers is used.

### Secondary notes

- The starting quantity text could likely fit the existing resource surface if the core bonding mechanic existed:
  - `charge_pool.cap` for maximum stock,
  - `initialCount` for "When found, a container contains 1d6 + 1 ounces",
  - `resetCadence = never`.
- The storage requirement is not the main blocker:
  - "It must be stored in a jar or flask that has been coated inside with Oil of Slipperiness."
  - That reads as inventory/logistics pressure, not the item's core deterministic resolution shape for this prototype.
- I did not separately widen for the named break methods because they belong as parameters on the missing bond effect rather than as independent top-level atoms.
