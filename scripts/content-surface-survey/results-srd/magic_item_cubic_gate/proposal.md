# Proposal: Cubic Gate — Structural Widening

## Outcome: `structural_widening`

The Cubic Gate cannot be encoded in the current surface. The primary blocker is that `magic_item` is not a variant of `UnitRecord` in `types.ts`.

---

## Primary gap: Missing `MagicItemRecord` kind

```typescript
// current
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;

// needed
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The v4 taxonomy already names `magic_item_root` as a source atom, and the survey corpus includes ~200+ magic items at tier 2. However, `types.ts` has never been extended with a `MagicItemRecord` shape. No honest encoding of any magic item is possible until this kind exists.

---

## Secondary gaps (once the kind exists)

### 1. Dice-valued daily recharge cadence

**Rule text:** "The cube has 3 charges and regains 1d3 expended charges daily at dawn."

The existing `RestResetCadence` covers `short_or_long_rest`, `long_rest`, `short_rest`, and `partial_short_full_long`. It does not cover:
- Daily-at-dawn recharge (a time-based cadence, not rest-based)
- Variable refill amount (1d3, not a fixed number)

This is a `surface_widening`: a new variant of `RestResetCadence` (or a new recharge cadence type for items):

```typescript
| {
    readonly kind: "daily_at_dawn";
    readonly refill: DiceAmount;  // supports fixed or dice-valued refill
  }
```

### 2. Spell-by-reference casting via charge expenditure

**Rule text:** "As a Magic action, you can expend 1 of the cube's charges to cast one of the following spells using the cube."

The item does not originate a spell — it casts a fully-specified named spell (Gate, Plane Shift) by reference. The v4 inventory has `stored_spell` (attachment) and `grant_spell_access` (effect), but neither is wired into a surface mechanics shape. A magic item mechanics family needs a way to express:

```
activate (Magic action) → consumes charge → casts named_spell [gate | plane_shift]
```

This is a `surface_widening`: a new `CastNamedSpellEffect` type (or a new `MagicItemEffect` variant) pointing to a spell by ID.

### 3. Plane-keyed selection (partial DM-agenda)

**Rule text:** "The other sides are linked to planes determined by the GM."

Which plane each face connects to is DM-determined at item creation. This is caller-owned metadata. However, the mechanical consequence — "pressing a side opens a portal to *that* plane" — is deterministic given the assignment. The plane identity itself is DM-agenda; the transport effect is core mechanics.

This is analogous to Alarm's audible signal (caller-owned notification surface) combined with a deterministic release trigger. The item mechanic needs a way to say "the destination is the plane keyed to this face" without enumerating all possible planes in the type. A closed grammar might be:

```typescript
type PlaneTarget = { readonly kind: "keyed_face"; readonly sideIndex: 0 | 1 | 2 | 3 | 4 | 5 }
```

where the actual plane identity is resolved from item state at runtime.

---

## Summary of proposed widenings

| Gap | Kind | Classification |
|-----|------|----------------|
| `MagicItemRecord` top-level kind | `new_subgraph` | `structural_widening` |
| Daily-at-dawn dice recharge cadence | `new_variant` of recharge | `surface_widening` |
| Cast named spell via charge | `new_variant` of item effect | `surface_widening` |
| Plane-keyed face selection | `new_variant` of target/attachment | `surface_widening` (partially DM-agenda) |

The structural gap must be resolved first; the surface widenings are internal to the magic item mechanics family once the kind exists.
