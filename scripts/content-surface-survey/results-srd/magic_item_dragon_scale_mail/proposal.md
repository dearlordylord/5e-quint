# Proposal: Widenings Required for Dragon Scale Mail

## Outcome: `structural_widening`

Dragon Scale Mail cannot be encoded. The surface schema (`types.ts`) has no `magic_item` record kind — `UnitRecord` is currently `SpellRecord | ClassFeatureRecord | MasteryRecord`. The v4 atom taxonomy includes `magic_item_root` but the surface layer was never widened to match.

---

## Gap 1 — Missing `MagicItemRecord` kind (structural)

`UnitRecord` must grow a `MagicItemRecord` variant before any magic item can typecheck. Minimum fields needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

Dragon Scale Mail is: Armor (Scale Mail), Very Rare, Requires Attunement.

---

## Gap 2 — Missing `passive_bundle` mechanics family (structural)

Dragon Scale Mail's three core benefits are **always-on passive effects** that activate at the moment of attunement/equipping and persist until the item is removed or attuning ends:

- +1 bonus to Armor Class
- Advantage on saving throws against breath weapons of Dragons
- Resistance to one damage type (chosen at item-creation time by dragon type)

None of the existing mechanics families (`activation`, `ongoing_effect`, `triggered_reaction`, `anchored_trigger`, `on_hit_trigger`) model this shape. A new family is needed — something like:

```typescript
export type PassiveBundleMechanics = {
  readonly family: "passive_bundle";
  readonly effects: ReadonlyArray<PassiveEffect>;
};
```

Where `PassiveEffect` includes variants for `modify_ac`, `grant_resistance`, and the scoped advantage described in Gap 3.

---

## Gap 3 — Missing scoped advantage variant (surface widening)

The Advantage benefit is scoped to a specific trigger context:

> "you have Advantage on saving throws **against the breath weapons of Dragons**"

The existing `modify_roll_advantage` type takes `on: ReadonlyArray<RollKind>` — it can express "Advantage on saving throws" but cannot express "Advantage on saving throws **when the source is a breath weapon from a Dragon**". A trigger-filter variant is needed:

```typescript
export type ScopedAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly filter?: ScopeFilter;  // new
};

export type ScopeFilter =
  | { readonly kind: "source_creature_type"; readonly creatureType: string }
  | { readonly kind: "source_ability"; readonly ability: "breath_weapon" };
  // or a combined form
```

The breath weapon filter may need to be a combined predicate: source creature type = "dragon" AND ability = "breath weapon".

---

## Gap 4 — Missing `discern_location` effect atom (atom widening)

The active ability reads:

> "you can focus your senses as a Magic action to discern the **distance and direction** to the closest dragon within 30 miles of yourself that is of the same type as the armor"

No v4 atom covers this. `grant_sense` in v4 covers perceptual senses (darkvision, truesight, blindsight) — it is for modifying the creature's sensory apparatus, not for producing a one-shot directional information output.

A new `discern_location` atom is needed:

```typescript
export type DiscernLocationEffect = {
  readonly kind: "discern_location";
  readonly targetFilter: CreatureTypeFilter;  // "dragon of same type as armor"
  readonly rangeMiles: number;                // 30
  readonly output: "distance_and_direction";
};
```

This is distinct from `grant_sense` (which modifies perception range permanently or for a duration) — it is a triggered divination that resolves once and returns information.

---

## Gap 5 — Missing `dawn_reset` reset cadence (surface widening)

The active use has this recharge:

> "This action can't be used again until the next dawn."

The existing `RestResetCadence` variants (`short_rest`, `long_rest`, `short_or_long_rest`, `partial_short_full_long`) are all keyed to rest events. Dawn is a time-of-day event — it may coincide with a long rest but is mechanically distinct. A new variant is needed:

```typescript
| { readonly kind: "next_dawn" }
```

---

## Gap 6 — Missing `attunement_slot` in `types.ts` (surface widening)

The v4 taxonomy lists `attunement_slot` as a resource atom, but `types.ts` has no `attunement_slot` resource type. Any `MagicItemRecord` that requires attunement must express that it consumes an attunement slot (max 3 per creature). This is a separate resource from `use_count` or `spell_slot`.

---

## Summary table

| Gap | Kind | Blocking? |
|-----|------|-----------|
| No `MagicItemRecord` in `UnitRecord` | `structural_widening` | Yes — nothing can be authored |
| No `passive_bundle` mechanics family | `structural_widening` | Yes — always-on passive items have no family |
| Scoped advantage (breath weapon filter) | `surface_widening` | Yes — cannot represent the specific rider |
| `discern_location` atom | `atom_widening` | Yes — no v4 atom covers directional divination |
| `next_dawn` reset cadence | `surface_widening` | Yes — existing cadences are all rest-based |
| `attunement_slot` resource in types.ts | `surface_widening` | Yes (once magic_item record exists) |

No Dhall or JSON artifacts were authored. A misleading trace would require misrepresenting all three passive effects as something else and omitting the active ability entirely.
