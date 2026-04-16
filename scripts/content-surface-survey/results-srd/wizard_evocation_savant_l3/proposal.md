# Proposal: Widening for Evocation Savant (wizard L3)

## Outcome: `structural_widening`

## Why the unit doesn't fit

Evocation Savant is a **passive, level-progression spell-learning feature**. It fires in two modes:

1. **At acquisition (L3):** add 2 Evocation spells (≤ level 2) to the spellbook for free.
2. **At each new spell slot level unlocked:** add 1 Evocation spell of that level or lower to the spellbook for free.

The only existing `ClassFeatureMechanics` family is `activation`, which requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

None of these fields apply to Evocation Savant:
- **No activationCost** — the wizard does not spend an action, bonus action, or any quota. The spells are simply added to the spellbook.
- **No use_count resource** — there is no pool that depletes and refills.
- **No resetCadence** — there is no rest that replenishes anything; the ongoing grant fires once per newly unlocked spell slot level, permanently.

Using `activation` would require inventing fake values for all three fields, producing a misleading trace that implies a quota-consuming, resettable resource where none exists.

Additionally, `ClassFeatureEffect` only has two variants (`GrantExtraActionEffect`, `HealHpEffect`). Neither represents "add spells to a spellbook."

## Required widenings

### 1. New class feature mechanics family: `passive_grant` (or `spell_learning`)

A new mechanics family for class features that are not activated during play but instead fire passively at character-creation or level-up milestones. Shape sketch:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly trigger: PassiveGrantTrigger;
  readonly effect: ClassFeaturePassiveEffect;
};

export type PassiveGrantTrigger =
  | { readonly kind: "at_acquisition" }
  | { readonly kind: "on_new_spell_slot_level"; readonly className: ClassName };
  // future: on_subclass_acquisition, on_proficiency_bonus_increase, etc.
```

### 2. New `ClassFeatureEffect` variant: `grant_spell_access`

The v4 taxonomy already names `grant_spell_access` as an effect atom. A surface variant is needed:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly school?: SpellSchool;             // filter: Evocation
  readonly maxSpellLevel?: SpellLevel;       // filter: ≤ 2 (at acquisition only)
  readonly count: number;                    // 2 at acquisition, 1 per trigger
  readonly source: "wizard_spellbook";       // distinguishes spellbook vs. known list
};
```

### 3. New window / trigger atom: `on_new_spell_slot_level`

The ongoing grant fires at a character-progression boundary, not a combat or rest boundary. None of the existing v4 window atoms cover this:

- `rest_window` — fires on Short/Long Rest
- `turn_start_window` / `turn_end_window` — combat windows
- `post_action_window` — combat window
- `initiative_window` — combat window

A new atom (or a new `PassiveGrantTrigger` variant in the surface) is needed for "when the character gains access to a new level of spell slots in a given class."

## Pressure assessment

This is **narrow but structurally necessary**. Several other Wizard subclass features follow the same passive-grant pattern (e.g., Abjuration Savant, Divination Savant, etc.), so the widening has multi-unit justification even within the Wizard class alone. The gap is not a fringe case.

## No trace produced

No `.dhall`, `.json`, or `.trace.md` files were authored because no honest encoding exists in the current surface.
