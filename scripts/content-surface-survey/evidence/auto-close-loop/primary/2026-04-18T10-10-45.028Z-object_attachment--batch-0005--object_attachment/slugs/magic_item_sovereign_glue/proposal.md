# Sovereign Glue

## Verdict

`atom_widening`

The item fits the existing `magic_item` top-level kind and an `activation` mechanics family in principle:

- activation cost: `standard_action` with `action = "utilize"`
- resource: finite ounce pool via `charge_pool`
- reset cadence: `never`

The blocker is the actual payload. The current surface has no honest way to encode the item's core rule:

> "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."

## Missing surface

### 1. New effect atom: `bond_objects`

The surface needs a deterministic effect atom for creating a persistent bonded state between two objects.

Why existing atoms do not work:

- `alter_item_kind` changes one object's form, not a relation between two objects.
- `block_travel` and `force_move` are area/travel constraints, not object-to-object adhesion.
- `transport_exile`, `teleport`, `apply_condition`, and similar effect atoms are unrelated.

The missing mechanic is not narrative-only or DM-owned. The item imposes a concrete, durable state with explicit counterplay:

> "Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."

That is a real mechanical relation, not flavor.

### 2. New attachment variant: `dual_object_attachment`

The current attachment grammar can attach to:

- `self`
- one `target`
- one `object`
- one `area`
- one `mark`

Sovereign Glue needs one activation to bind **two** objects together. A single-object attachment cannot represent both endpoints honestly.

Evidence:

> "between any two objects"

## Why I did not author a content file

Any authored `content/magic_item_sovereign_glue.dhall` would have to fake the central rule as some unrelated atom. That would produce a misleading trace, which the task explicitly forbids.

So I wrote only:

- `result-magic_item_sovereign_glue.json`
- `proposal-magic_item_sovereign_glue.md`

