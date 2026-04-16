# Proposal: Halfling Luck — structural_widening

## Unit

**Name:** Luck (Halfling)  
**Kind:** species_trait  
**Provenance:** srd-5.2.1 — Character-Origins.md §Halfling  
**Rule text:** "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll."

## Why it does not fit

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `kind: "species_trait"` discriminant. The tracer's top-level switch (`traceUnit`) is exhaustive over `"spell" | "class_feature" | "mastery"` and has no `"species_trait"` arm. Any JSON with `"kind": "species_trait"` would fail the TypeScript typecheck before the tracer is even reached.

## What is missing

### 1. `SpeciesTraitRecord` (structural)

A new top-level record type analogous to `ClassFeatureRecord` is needed:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

`UnitRecord` must be widened to include it.

### 2. `passive_trigger` mechanics family (structural)

Halfling Luck is passive — it requires no activation action, no use count, and no resource. It fires automatically whenever a specific trigger condition is met (d20 result = 1), with a player choice to invoke. No existing mechanics family covers this pattern:

- `ClassFeatureActivationMechanics` requires an activation cost and a use-count resource — not applicable to a always-on passive.
- `OnHitTriggerMechanics` (mastery) is weapon-hit-specific.
- `OngoingEffectMechanics` requires a spell header.

A new `passive_trigger` family is needed:

```typescript
export type PassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly trigger: PassiveTriggerCondition;
  readonly optional: boolean;       // true: player may decline to invoke
  readonly effect: PassiveTriggerEffect;
};
```

### 3. `PassiveTriggerCondition` with a d20-outcome variant (surface)

The trigger "when you roll a 1 on the d20" requires a predicate on a specific numeric die result. No surface type currently models this. A minimal variant:

```typescript
export type PassiveTriggerCondition =
  | { readonly kind: "d20_result_equals"; readonly value: 1 }
  // future: d20_result_lte, ability_check, etc.
  ;
```

The scope of the trigger (which test types: attack rolls, saving throws, ability checks — i.e., any D20 Test) may also need encoding as an optional filter alongside the numeric predicate.

### 4. `PassiveTriggerEffect` (surface)

For Luck the effect is `modify_roll_reroll` (v4 atom, already exists). The surface layer needs a union type to carry it:

```typescript
export type PassiveTriggerEffect =
  | { readonly kind: "modify_roll_reroll"; readonly keepNew: true }
  // future: additional passive effects
  ;
```

## Atom inventory

All required v4 atoms exist — no atom widening is needed:

| Atom | Category | Status |
|---|---|---|
| `species_trait_root` | source | exists in v4 |
| `post_roll_window` | window | exists in v4 |
| `modify_roll_reroll` | effect | exists in v4 |

The graph shape would be:

```
species_trait_root
  └─roots─> passive_trigger_procedure
              └─opens_window─> post_roll_window (d20 = 1, D20 Test)
                                 └─grants─> modify_roll_reroll (keep new)
                                              └─attaches_to─> self
```

## Other Halfling traits (out of scope for this worker)

For reference, the other three Halfling traits each require their own widening analysis:

- **Brave** — advantage on saving throws vs. Frightened: needs species_trait kind + `modify_roll_advantage` rider scoped to a condition-specific save.
- **Halfling Nimbleness** — movement rule (pass through larger creature's space): purely positional/movement; likely `dm_agenda` or a new movement-rule family.
- **Naturally Stealthy** — Hide action under specific concealment condition: Hide-action enablement with a context predicate; needs species_trait kind + a new permission-grant effect.

None of these are blockers for Luck; each would be a separate survey entry.
