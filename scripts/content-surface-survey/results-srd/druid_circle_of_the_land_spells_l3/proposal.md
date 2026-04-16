# Proposal: structural_widening — Circle of the Land Spells (druid L3)

## Unit

- Slug: `druid_circle_of_the_land_spells_l3`
- Kind: `class_feature` / `druid` / L3
- Provenance: SRD 5.2.1, Classes/Druid, "Level 3: Circle of the Land Spells"

## Why it doesn't fit

The only `ClassFeatureMechanics` family is `activation`. That family models:

```
activationCost: free | bonus_action
resource: use_count (with a cap and a reset cadence)
effect: GrantExtraActionEffect | HealHpEffect
```

Circle of the Land Spells has none of those mechanical constituents:

| Activation dimension | Existing surface | This feature |
|---|---|---|
| Trigger | Player turn (free / bonus action cost) | Long Rest completion |
| Resource | use_count (consumed then refilled) | No use count — list just reflects current choice |
| Player decision point | Not modeled (or absent) | Choose land type each long rest |
| Effect | grant_extra_action / heal_hp | grant_spell_access (not in ClassFeatureEffect) |
| Scaling | fixed or threshold_tiers on use_count | Class-level-gated spell list |

There is no honest mapping. Forcing the unit into `activation` would require fabricating a `use_count` resource that doesn't exist in the rules, omitting the land-choice mechanic entirely, and mischaracterizing a rest-triggered passive grant as an on-turn activation.

## Proposed widenings

### 1. New ClassFeatureMechanics family: `rest_grant` (structural)

A family for class features that:
- Fire automatically at Long Rest completion (no action economy cost)
- Optionally require a player choice from a closed enum at that moment
- Grant a conditional prepared spell list (or other passive benefit) based on the choice

Sketch:

```typescript
export type RestGrantMechanics = {
  readonly family: "rest_grant";
  readonly trigger: "long_rest" | "short_or_long_rest";
  readonly choice?: RestGrantChoice;
  readonly grant: RestGrantEffect;
};

export type RestGrantChoice = {
  readonly kind: "one_of";
  readonly options: ReadonlyArray<string>;  // closed enum label; actual content varies by option
};
```

Analogues that would use the same family: Life Domain Spells (cleric L3), Oath of Devotion Spells (paladin L3), Fiend Spells (warlock L3), Draconic Spells (sorcerer L3) — all "bonus prepared spell list" subclass features. This is repeated pressure, not a single-unit anomaly.

### 2. New ClassFeatureEffect variant: `grant_spell_access` (surface)

The v4 atom `grant_spell_access` exists in the taxonomy (Section 9, Effect Atoms). It is absent from the TS surface `ClassFeatureEffect`. It must be added before any "bonus prepared list" feature can be encoded honestly.

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spells: SpellAccessList;
};
```

### 3. New `SpellAccessList` shape: level-gated roster (surface)

The granted spells unlock progressively by class level:

| Druid Level | Arid spells added |
|---|---|
| 3 | Blur, Burning Hands, Fire Bolt |
| 5 | Fireball |
| 7 | Blight |
| 9 | Wall of Stone |

This is structurally identical across all four land types (and all analogous domain/oath/circle features in other classes). A `threshold_tiers`-style structure keyed on class level, where each tier extends the previous roster, would cover all of them.

### 4. Rest-time choice branching (surface or structural)

The druid chooses one of four land types. The resulting spell list differs entirely between options. The v4 taxonomy has a `choose` procedure atom, but no TS surface mechanism for "rest-time player choice that gates which grant_spell_access fires." This could be expressed as:

```typescript
export type ConditionalSpellGrant = {
  readonly kind: "conditional";
  readonly choiceLabel: string;        // e.g. "land type"
  readonly branches: ReadonlyArray<{
    readonly when: string;             // e.g. "arid"
    readonly spells: SpellAccessList;
  }>;
};
```

## Pattern pressure

Five different subclass spell-list features (Druid Circle, Cleric Domain, Paladin Oath, Warlock Patron, Sorcerer Draconic) share the same rest-grant pattern. The widening should be designed to cover all of them, not just this one. The land-type choice is unique to Circle of the Land; the other four grant a fixed list unconditionally at rest.

## Classification

**`structural_widening`** — no existing family can encode the passive, rest-triggered, choice-gated spell grant without falsifying the rules.
