# Proposal: Cape of the Mountebank — structural_widening

## Unit

**Cape of the Mountebank** — Wondrous Item, Rare (SRD 5.2.1, Magic-Items/Items-A-H.md)

## Why this unit cannot be encoded

### Primary blocker: `magic_item` kind does not exist in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy lists `magic_item_root` as a source atom, but the type system has no corresponding record kind, mechanics family, or tracer branch. Every magic item fails at this level before any atom-level question can be asked. (Identical blocker to `magic_item_bag_of_beans`.)

### Secondary blocker: "next dawn" reset cadence has no variant

The item's Dimension Door property recharges at dawn. The current `RestResetCadence` union covers:

- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

None of these cover a time-of-day-based recharge. "Next dawn" is a fundamentally different reset trigger — it is not keyed to a rest event but to a real-world/in-game time boundary. Many SRD magic items share this pattern (e.g., Helm of Teleportation, Helm of Telepathy) and would require the same widening. A new variant such as `{ kind: "dawn" }` is needed.

### Tertiary blocker: post-teleport smoke cloud requires new trigger + effect

The secondary mechanic fires *after* the Dimension Door teleport resolves:

> When you teleport with that spell, you leave behind a cloud of smoke. The space you left is Lightly Obscured by that smoke until the end of your next turn.

This requires:

1. **Post-teleport trigger window** — a window atom that opens after a teleport effect resolves. The current window atoms in `types.ts` (and the v4 taxonomy) include `on_hit_window`, `on_miss_window`, `reaction_window`, `rest_window`, `turn_start_window`, `turn_end_window`, `post_action_window`. None of these capture "after this creature's teleport resolves." A new `post_teleport_window` or generalized `post_effect_window` atom would be needed.

2. **Environmental obscurement effect** — the smoke creates a Lightly Obscured zone at the *origin* space (not the destination, not the caster). The current `Effect` type in `types.ts` only has `damage` and `none`. The v4 taxonomy lists `create_object` as an effect atom (which could model the smoke cloud), but it is absent from `types.ts`. A new effect variant for environmental zone creation — at minimum `{ kind: "create_obscurement_zone"; obscurementLevel: "lightly" | "heavily"; durationExpiry: ... }` — would be needed.

## What could encode cleanly (if structural gaps were closed)

Once a `MagicItemRecord` family exists, the core mechanic is straightforward:

- **Activation**: Magic action
- **Resource**: use_count (cap: 1), reset cadence: dawn
- **Effect**: `grant_spell_access` (cast Dimension Door at its normal level, no upcasting)
- **Secondary**: post-teleport trigger → create Lightly Obscured zone at origin, duration: end of caster's next turn

The Dimension Door spell itself has an existing spell record. The item uses it as a named spell reference rather than embedding full spell mechanics — a `grant_named_spell_use` effect would be cleaner than embedding the spell's full mechanics inline.

## Required widenings

1. **`MagicItemRecord` + magic item mechanics family** — structural addition. Needs at minimum: `id`, `name`, `provenance`, `description`, `kind: "magic_item"`, attunement flag, and a `mechanics` field with at least one family. Tracer needs a `traceMagicItemUnit` branch. (Shared with all magic items — this is the same gap identified in `magic_item_bag_of_beans`.)

2. **`dawn` reset cadence variant** — surface widening. Add `{ kind: "dawn" }` to `RestResetCadence`. Shared with many other SRD magic items (Helm of Teleportation, Helm of Telepathy, Hat of Disguise, etc.).

3. **`post_teleport_window` atom** — atom widening (or surface widening if modeled as a variant of `post_action_window`). Needed to trigger the smoke cloud aftermath. Alternatively, if the environmental effect is authored as part of the spell reference ("when you cast Dimension Door via this item, the smoke appears"), the trigger could be folded into the item mechanics family rather than requiring a new window atom.

4. **`create_object` effect variant in `types.ts`** — surface widening. The v4 taxonomy already lists `create_object`; it just needs to be added to the `Effect` union in `types.ts` with a shape sufficient to encode environmental obscurement zones.
