# Widening Proposal: Sovereign Glue

**Unit slug:** `magic_item_sovereign_glue`  
**Outcome:** `atom_widening`

## Why the unit does not fit honestly

`Sovereign Glue` fits the existing top-level `magic_item` kind and broadly fits an activation-shaped item:

- activation cost could be `standard_action` with `action: "utilize"`;
- ounce stock could likely be modeled as a nonrecharging `charge_pool` with random `initialCount`;
- the item is object-scoped, and `Attachment.object` already exists.

That only solves the economy and target domain. It does **not** solve the mechanic the item actually performs.

The current surface has no honest way to represent:

1. selecting **two objects** as the bonded pair;
2. creating a **persistent adhesive bond** between them;
3. delaying that bond until the glue **sets after 1 minute**.

Because those are the core mechanics, emitting a placeholder JSON would produce a misleading trace.

## Required widenings

### 1. `Attachment.two_objects`

The current `Attachment.object` selects one object:

```typescript
| { readonly kind: "object"; readonly rangeOrigin?: AttachmentRangeOrigin }
```

`Sovereign Glue` needs a pairwise object attachment, not a single-object target.

Suggested shape:

```typescript
| {
    readonly kind: "two_objects";
    readonly rangeOrigin?: AttachmentRangeOrigin;
  }
```

Evidence:

> "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."

### 2. `bond_objects` effect atom

The current effect vocabulary has no atom for creating a persistent relationship between two objects. Existing object-facing atoms like `alter_item_kind` mutate one object's form; they do not join two objects into a bonded state.

Suggested effect direction:

```typescript
| {
    readonly kind: "bond_objects";
    readonly permanence: "permanent";
    readonly brokenBy: ReadonlyNonEmptyArray<
      | { readonly kind: "named_magic_item"; readonly itemId: string }
      | { readonly kind: "named_spell"; readonly spellId: string }
    >;
  }
```

Evidence:

> "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."

> "Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."

This is the main blocker and is why the unit is classified as `atom_widening`.

### 3. Delayed-set timing on non-spell activations

The item does not bond immediately; the applied glue sets after one minute. Current activated-ability mechanics can carry a duration, but they do not express a delayed transition from "applied" to "bonded" for item activations.

This could be a new activation-header variant or a dedicated subgraph concept, for example:

```typescript
readonly setsAfter?: { readonly unit: "minute"; readonly amount: 1 };
```

Evidence:

> "Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set."

## Why this is not `structural_widening`

The item does not force a new top-level record kind or a brand-new family:

- `MagicItemRecord` already exists.
- An activated magic-item family already exists.
- `standard_action: "utilize"` already exists.
- Nonrecharging stock can plausibly reuse `charge_pool` + `initialCount`.

The failure is inside the payload surface: missing pairwise object selection and, more importantly, a missing effect atom for adhesive bonding.

## Notes

- The storage clause about needing a jar or flask coated with `Oil of Slipperiness` is ancillary usage text, not the core deterministic payload.
- The coverage metric of one ounce per 1-foot square surface is inventory/application detail that could likely remain in description text unless a broader object-surface area subsystem appears.
- I intentionally did **not** author `content/magic_item_sovereign_glue.dhall`, because any current encoding would omit the item's core effect and create a false trace.
