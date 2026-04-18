# Proposal: Folding Boat — Surface Widening

## Unit

**Folding Boat** — Wondrous Item, Rare (SRD 5.2.1)

## What fits

- `magic_item` record kind ✓
- `composite` mechanics shape ✓ (three independent command-word activations)
- `alter_item_kind` effect atom ✓ (added specifically for this form-transformation pattern)
- `standard_action { action: "magic" }` activation cost ✓
- No attunement required ✓

## What is missing

### 1. `UseCountCap.unlimited`

**Gap:** `ActivatedAbilityMechanics` requires `resource: ActivationResource`. `UseCountCap` has five variants (`fixed`, `threshold_tiers`, `linear_per_level`, `proficiency_bonus`, `ability_modifier`) but no `unlimited` variant. The Folding Boat's command words carry no stated usage limit — they may be used any number of times, with no cooldown or cadence.

**SRD text:** "This item also has three command words, each requiring a Magic action to use." No further restriction is stated.

**Proposed widening:**

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | LinearPerLevel<number>
  | { readonly kind: "proficiency_bonus" }
  | { readonly kind: "ability_modifier"; readonly ability: Ability }
  // NEW: no usage limit — activation is free to use any number of times.
  | { readonly kind: "unlimited" };
```

With `kind: "unlimited"`, `resetCadence` becomes vacuous. A paired `ResetCadence` variant `{ kind: "not_applicable" }` may also be warranted to avoid authors inventing a misleading dawn/rest cadence.

**Pressure:** Multiple SRD magic items have unlimited-use command words (staff passives, wand activations with no charge cost when using a cantrip mode, etc.). This widening will recur.

---

### 2. `EquipmentPredicate` (or new `ActivationPredicate`) — occupancy condition

**Gap:** The third command word ("fold back into box") is conditional: it fires only "if no creatures are aboard." `EquipmentPredicate` covers only equipment-state gates (wearing, wielding, holding, armored/unarmored). It has no variant for item-occupancy state.

**SRD text:** "The Folding Boat folds back into a box if no creatures are aboard."

**Design options:**

A. Add a narrowly-scoped variant to `EquipmentPredicate`:

```typescript
| { readonly kind: "item_unoccupied" }
```

This is item-specific and would only apply to occupiable items (vessels, containers large enough for creatures), but it is consistent with the "equipment gate" framing — the activation condition is about the equipment's current state.

B. Introduce a broader `ActivationPredicate` union distinct from `EquipmentPredicate`, for activation-time runtime conditions that are not equipment-wearing/wielding gates:

```typescript
export type ActivationPredicate =
  | EquipmentPredicate
  | { readonly kind: "item_unoccupied" }
  // Future: target_in_range, resource_at_threshold, etc.
```

Option A is narrower and less likely to invite scope creep; option B is more principled if other items require activation-time state checks.

**Pressure:** Unique in SRD 5.2.1 so far, but the pattern (activation gated by a specific runtime state of the item itself) is plausible for other vessels and constructs.

---

## Secondary encoding notes

The Folding Boat's **box form** has a passive storage capability ("It can be opened to store items inside"). This could be modeled as a `PassiveMechanics` part in the composite with a `container_storage` atom:

```dhall
{ family = "passive"
, grants =
    [ { kind = "container_storage"
      , storage = { ... }  -- dimensions/weight from box form stats
      }
    ]
}
```

However, the SRD does not give explicit cubic-foot or pound-capacity figures for the 12"×6"×6" box, so authoring this part would require estimation. It is secondary to the transformation mechanics.

The vessel forms (Rowboat, Keelboat) reference external stat blocks ("Statistics for the Rowboat and Keelboat appear in 'Equipment'"). These are not inline stat blocks; they are catalog references resolved at play time. No encoding gap here — the `alter_item_kind` atom records only the destination form name.

## Classification

`surface_widening` — both missing pieces are new variants of existing surface types, not missing v4 taxonomy atoms.
