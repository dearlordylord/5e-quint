# Proposal: Brazier of Commanding Fire Elementals

## Outcome: `structural_widening`

The Brazier of Commanding Fire Elementals cannot be encoded in the current surface. The primary blocker is that `UnitRecord` has no `magic_item` kind. The v4 taxonomy includes `magic_item_root` as a source atom, but `types.ts` never defines `MagicItemRecord` or a corresponding mechanics family.

---

## Primary widening: `MagicItemRecord` kind

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. Magic items are a separate provenance category — they are not spells, class features, or masteries — and cannot be forced into any of those shapes without producing a misleading trace.

**Required:** Add `MagicItemRecord` to `UnitRecord` with a corresponding mechanics family.

---

## Secondary widenings (needed even after the kind is added)

### 1. `RestResetCadence: dawn`

The brazier recharges at the next dawn, not on a short or long rest. Current `RestResetCadence` variants:
- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

**Required:** Add `{ kind: "dawn" }` variant.

This widening also applies to many other magic items (e.g., Censer of Controlling Air Elementals has the same reset cadence).

### 2. Activation cost: Magic action

The user spends their Magic action to activate the brazier. `ClassFeatureActivationCost` only covers `free` and `bonus_action`.

**Required:** Add `{ kind: "magic_action" }` to the activation cost type (or an equivalent magic-item-specific activation cost type).

### 3. `create_companion` + `command_companion` subgraph

The core mechanic summons a named creature (Fire Elemental) that:
- appears in an unoccupied space near the brazier
- understands the user's languages
- obeys the user's commands
- has a duration (1 hour / death / dismissal)

`create_companion` and `command_companion` exist in the v4 atom inventory but nothing in the surface types encodes this subgraph. A `summon_companion` mechanics family is needed, analogous to how `activate` works for class features.

Evidence: *"summon a Fire Elemental … obeys your commands"*

### 4. Companion duration: timed with optional Bonus Action dismissal

The elemental's duration is "1 hour, or when it dies, or when you dismiss it as a Bonus Action." The existing `Duration` type (`instantaneous | concentration | timed`) does not support dismissal-as-bonus-action as a termination condition.

**Required:** A new duration termination shape, e.g.:
```typescript
| { readonly kind: "timed_or_dismissed"; readonly value: DurationValue; readonly dismissCost: "bonus_action" }
```

Evidence: *"The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action."*

### 5. Proximity constraint on activation

The item requires the user to be within 5 feet of the brazier to activate it. No proximity-to-item constraint exists in any activation precondition shape.

Evidence: *"While you are within 5 feet of this brazier"*

This may be expressible as an `item` attachment constraint rather than a new surface type, depending on how the magic-item mechanics family is designed. Deferred until the family shape is defined.

### 6. Initiative placement for summoned companion

The summoned elemental "takes its turn immediately after you on your Initiative count." No initiative-placement metadata exists for companions.

Evidence: *"takes its turn immediately after you on your Initiative count"*

This is likely out-of-core per `ARCHITECTURE.md` (initiative ordering is a DM/table concern), but it is recorded here for completeness.

---

## Classification summary

| Gap | Classification |
|---|---|
| `magic_item` kind missing from `UnitRecord` | `structural_widening` |
| Dawn reset cadence | `surface_widening` |
| Magic action activation cost | `surface_widening` |
| `create_companion` subgraph | `structural_widening` |
| Timed + dismissable duration shape | `surface_widening` |
| Proximity constraint on activation | `surface_widening` (or out-of-scope) |
| Initiative placement | Likely `dm_agenda` / out-of-core |

The `magic_item` kind and the companion-summoning subgraph are the two structural gaps that must be resolved before any magic item of this class can be encoded honestly.
