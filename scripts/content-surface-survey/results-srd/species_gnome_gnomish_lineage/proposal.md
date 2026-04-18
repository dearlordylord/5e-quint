# Proposal: Gnomish Lineage (Gnome) — `structural_widening`

## Unit

- **Name**: Gnomish Lineage  
- **Kind**: `species_trait`  
- **Species**: Gnome  
- **Provenance**: SRD 5.2.1, Species/Gnome#Gnomish Lineage

## Summary

Three independent widenings are required before this unit can be encoded honestly. The blocking one is structural: `SpeciesTraitMechanics` has no build-time bundle-choice family.

---

## Gap 1 — Build-time lineage selection (structural)

### RAW text

> Choose one of the following options; whichever one you choose, Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage):
> - **Forest Gnome.** …
> - **Rock Gnome.** …

### Problem

`SpeciesTraitMechanics = PassiveMechanics | ActivatedAbilityMechanics`. Neither family models a permanent character-creation selection between two distinct bundles of effects. `CompositeClassFeatureMechanics` exists for class features but has no species-trait equivalent.

`CastTimeEffectModeChoice` (used inside `direct` phases) is cast-time, not character-build-time, and is scoped to spell activation phases — not to species trait mechanics headers.

### Proposed widening

Add a `lineage_choice` mechanics variant to `SpeciesTraitMechanics`:

```typescript
export type LineageChoiceMechanics = {
  readonly family: "lineage_choice";
  // Ability the character picks at lineage-selection time as the
  // spellcasting ability for all granted spells.
  readonly spellcastingAbility?: CastTimeChoice<Ability>;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly grants: ReadonlyNonEmptyArray<EffectAtom>;
  }>;
};
```

The emitted trace would be: `species_trait_root → choose (build-time) → [option A grants] | [option B grants]`.

---

## Gap 2 — Forest Gnome: `SpellAccessMode` for prepared + PB uses/LR (surface)

### RAW text

> You also always have the *Speak with Animals* spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.

### Problem

`SpellAccessMode` has `prepared_once_per_long_rest` (always prepared + 1 free cast/LR). Forest Gnome needs **prepared + PB free casts per LR**, which is a scaled use-count reset — not a fixed 1. No existing mode carries this.

### Proposed widening

Add a new mode variant:

```typescript
| {
    readonly kind: "prepared_uses_per_long_rest";
    readonly cap: UseCountCap;  // UseCountCap.proficiency_bonus for this case
  }
```

This carries the prepared flag implicitly (as with `prepared_once_per_long_rest`) and parametrizes the free-cast pool with a `UseCountCap`.

---

## Gap 3 — Rock Gnome: clockwork device (structural/atom)

### RAW text

> you can spend 10 minutes casting *Prestidigitation* to create a Tiny clockwork device (AC 5, 1 HP)… When you create the device, you determine its function by choosing one effect from *Prestidigitation*; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch… You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.

### Problem

This is an interactive persistent physical object with:
1. **Creation cost**: 10-minute Prestidigitation cast (not a standard activation family cost)
2. **Foreign-triggered activation**: ANY creature (not just the creator) can spend a Bonus Action to trigger the device's effect
3. **Concurrent pool cap**: max 3 devices simultaneously in existence
4. **Per-device duration**: 8 hours or until manually dismantled (Utilize action)
5. **Effect selection**: device's effect chosen from Prestidigitation's option list at creation time

`create_object` captures durability (AC/HP) but has no foreign-trigger activation semantics. The device is not a spell ongoing effect (it persists independently of concentration and the creator). No existing family models "object that any creature can activate via a Bonus Action touch."

### Proposed widening

This requires a new subgraph — an "interactive object" atom or family distinct from `create_object`:

```typescript
| {
    readonly kind: "create_interactive_object";
    readonly maxSize: Size;
    readonly durability: CreatedObjectDurability;
    readonly duration: Duration;
    readonly poolCap: number;            // max 3 concurrent
    // Who may trigger the object's effect:
    readonly activationBy: "any_creature" | "creator_only";
    readonly activationCost: { readonly kind: "bonus_action" };
    readonly dismantleCost?: { readonly kind: "standard_action"; readonly action: StandardActionKind };
    readonly effect: EffectAtom;         // or a choice from a named spell's effects
  }
```

The creation cost (10-minute Prestidigitation cast) also requires `ClassFeatureActivationCost` to support a `{ kind: "minutes"; amount: number; spellId: string }` variant.

---

## Gap 4 — Spellcasting ability choice (surface)

### RAW text

> Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)

### Problem

`grant_spell_access` has no field for "which ability is the spellcasting ability for this grant." The ability is a character-build-time choice from a closed set. There is no surface representation for "spellcasting ability is character-chosen from {Int, Wis, Cha}" at the trait or grant level.

### Proposed widening

Add an optional `spellcastingAbility` field to `grant_spell_access` (or to the lineage-choice mechanics header):

```typescript
readonly spellcastingAbility?: Ability | CastTimeChoice<Ability>;
```

`CastTimeChoice<Ability>` already exists in the surface for build-time selections like Dragonborn ancestry damage type — the same shape applies here.

---

## What fits today

**Gnomish Cunning** (the other Gnome trait, not this unit) would encode cleanly:

```dhall
{ family = "passive"
, grants =
    [ { kind = "modify_roll_advantage"
      , mode = "advantage"
      , on = [ "saving_throw" ]
      , saveAbilityFilter = [ "int", "wis", "cha" ]
      }
    ]
}
```

This confirms the atom vocabulary is sufficient for simple saving-throw advantage grants. The blockers are specific to the lineage-choice structure and its two sub-options.

---

## Encoding decision

**No content files authored.** All three widenings (lineage-choice family, prepared+PB/LR spell access mode, clockwork device subgraph) must land before this unit can be encoded without producing a misleading trace.
