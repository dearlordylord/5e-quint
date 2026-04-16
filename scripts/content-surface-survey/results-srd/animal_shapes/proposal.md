# Proposal: Animal Shapes — atom_widening

## Unit

**Animal Shapes** — Level 8 Transmutation, druid spell (SRD 5.2.1)  
Casting time: Action | Range: 30 ft | Duration: 24 hours (timed, not concentration)

## Outcome

`atom_widening` (primary) with secondary `surface_widening` gaps

## Why no honest encoding is possible

The spell cannot be encoded without lying. No existing `SpellMechanics` family can express the core effect (stat-block replacement), and three additional surface variants are also missing.

---

## Primary gap — missing `polymorph_creature` effect atom

Animal Shapes' defining mechanic: each target's game statistics are replaced by a chosen Beast's, while preserving a specific closed set of original properties.

**Evidence:**
> "A target's game statistics are replaced by the chosen Beast's statistics, but the target retains its creature type; Hit Points; Hit Point Dice; alignment; ability to communicate; and Intelligence, Wisdom, and Charisma scores."

No v4 effect atom covers this:

| Atom | Why it doesn't fit |
|---|---|
| `apply_condition` | Applies a named condition, not a stat-block swap |
| `alter_item_kind` | Applies to items, not creatures |
| `modify_*` family | Adjusts individual stats — can't express wholesale replacement with selective preservation |
| `create_companion` | Creates a new entity; doesn't replace the target's stat block |

A new atom `polymorph_creature` is needed. Tentative payload shape:

```typescript
export type PolymorphCreatureEffect = {
  readonly kind: "polymorph_creature";
  readonly formConstraints: {
    readonly creatureType: "beast";
    readonly maxCR: number;
    readonly maxSize: "large" | "medium" | "small" | "tiny";
  };
  // Which original properties the target retains through the transformation
  readonly preservedProperties: ReadonlyArray<
    "creature_type" | "hp" | "hp_dice" | "alignment" | "communication_ability" |
    "int_score" | "wis_score" | "cha_score"
  >;
  // Equipment melds; target can't use any equipment while transformed
  readonly equipmentMelds: true;
  // Target can end the transformation using a bonus action
  readonly targetDismiss: "bonus_action";
};
```

---

## Secondary gap 1 — unbounded target selection

**Evidence:**
> "Choose any number of willing creatures that you can see within range."

`TargetSelection` currently:

```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> };
```

Neither applies. "Any number of willing creatures" has no upper bound and no slot scaling. Needs a new variant:

```typescript
| { readonly mode: "any_willing" }
```

This is distinct from `choose_up_to` because there is no cap — it applies to all willing creatures the caster selects, limited only by the range condition.

---

## Secondary gap 2 — temp HP derived from chosen form's HP

**Evidence:**
> "The target gains a number of Temporary Hit Points equal to the Hit Points of the first form into which it shape-shifts."

`DiceAmount` supports:
- `fixed` — a dice expression known at cast time
- `threshold_tiers` — jumps by level
- `linear_per_level` — scales per level

The temp HP here equals the HP of a specific creature chosen at cast time (DM-adjudicated or player-selected). This is not computable from a formula — it depends on which Beast stat block is chosen. A new `DiceAmount` variant is needed:

```typescript
| { readonly kind: "equals_chosen_form_stat"; readonly stat: "hp" }
```

Whether this is a surface concern or a caller-owned concern (the HP value flows from creature data, not from the spell's authored mechanics) is an open design question. Either way the current surface cannot express it.

---

## Secondary gap 3 — Magic action re-transformation on later turns

**Evidence:**
> "On later turns, you can take a Magic action to transform the targets again."

This is a recurring caster action that re-applies the transformation (potentially to different Beast forms). It is:
- Not the spell's casting time (that was the initial Action)
- Not covered by `ClassFeatureActivationCost` (which covers `free` and `bonus_action`)
- Not covered by any existing `CastingTime` variant (which covers the one-time cast)

This is an ongoing maintenance cost — the caster may spend a Magic action each turn to re-transform. The surface has no representation for "caster may spend X action on later turns to update the effect."

A new concept is needed, tentatively `OngoingCost`:

```typescript
export type OngoingCost = {
  readonly kind: "magic_action";
  readonly description: "retransform_targets";
};
```

---

## Minor gap — target-initiated dismiss not surfaced

The v4 lifecycle atom `dismiss` exists, but `ClassFeatureMechanics` and `SpellMechanics` have no surface field to express "target can dismiss with Bonus Action." This is a minor gap since the atom exists — the mechanics types just don't expose it.

---

## Recommended family fit once gaps are filled

If the primary atom `polymorph_creature` were added to `OngoingOperation`:

```typescript
export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | PolymorphOperation;  // new

export type PolymorphOperation = {
  readonly kind: "polymorph_creature";
  readonly effect: PolymorphCreatureEffect;
  readonly tempHp: ...; // needs DiceAmount.equals_chosen_form_stat
  readonly ongoingCost?: OngoingCost; // Magic action re-trigger
};
```

Animal Shapes would then encode as `ongoing_effect` with:
- `attachment.kind = "target"` with `selection.mode = "any_willing"` (new variant)
- `duration.kind = "timed"`, 24 hours
- `operation.kind = "polymorph_creature"`

---

## Summary of required widenings

| Gap | Classification | Priority |
|---|---|---|
| `polymorph_creature` effect atom | `atom_widening` | **Primary blocker** |
| `TargetSelection.any_willing` | `surface_widening` | Secondary |
| `DiceAmount.equals_chosen_form_stat` | `surface_widening` | Secondary |
| Magic action ongoing re-trigger cost | `surface_widening` | Secondary |
| Target dismiss surfaced in mechanics | Minor / `surface_widening` | Minor |
