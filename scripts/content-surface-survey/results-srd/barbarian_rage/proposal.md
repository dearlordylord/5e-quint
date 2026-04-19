# Proposal: Barbarian Rage widening gaps

Unit: `barbarian_rage` (class_feature, Barbarian L1)
Outcome: `atom_widening` (also includes several `surface_widening` gaps)

---

## What fits cleanly

- **Activation**: `activationCost: { kind: "bonus_action" }` ✓
- **Equipment gate**: `condition: { kind: "not_wearing_armor", categories: ["heavy"] }` ✓
- **Use-count resource**: `ThresholdTiers<number>` cap (Rages column by level) ✓
- **Reset cadence**: `partial_short_full_long` with `shortRestRefill: 1` ✓ ("You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.")
- **Damage Resistance ×3**: `grant_resistance` for `bludgeoning`, `piercing`, `slashing` ✓
- **Strength saving throw advantage**: `modify_roll_advantage` on `saving_throw` with `saveAbilityFilter: ["str"]` ✓

---

## Gap 1 — `modify_damage_numeric` needs an ability-based attack filter

**Surface location**: `EffectAtom` — `modify_damage_numeric.weaponFilter`

**Problem**: Rage Damage applies "when you make an attack using Strength — with either a weapon or an Unarmed Strike." The current `WeaponFilter` discriminant union covers:
- `weapon_category` (melee/ranged)
- `weapon_property` (thrown, etc.)
- `specific_item`

None of these express "attacks whose ability modifier is Strength." Encoding without a filter would grant the bonus to ALL damage rolls (including Dexterity finesse attacks, ranged attacks, spell attacks), which is incorrect.

**Proposed fix**: Add a new `WeaponFilter` variant:
```typescript
| { readonly kind: "ability_used"; readonly ability: Ability }
```
This narrows to attacks that use a specific ability for the attack/damage roll, covering Rage Damage (STR), Sneak Attack bonus riders, and similar ability-gated damage bonuses.

---

## Gap 2 — `modify_roll_advantage` needs `checkAbilityFilter`

**Surface location**: `EffectAtom` — `modify_roll_advantage`

**Problem**: The atom has `saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>` to narrow saving-throw riders by ability, but no parallel field for ability checks. Rage grants Advantage on Strength checks specifically. Without `checkAbilityFilter`, the only honest encoding would apply Advantage to ALL ability checks — incorrect.

**Proposed fix**: Add an optional field mirroring `saveAbilityFilter`:
```typescript
readonly checkAbilityFilter?: ReadonlyNonEmptyArray<Ability>;
```
Only meaningful when `on` contains `"ability_check"`. Same semantics as `saveAbilityFilter` but scoped to check-kind rolls.

---

## Gap 3 — Missing `suppress_concentration` atom

**Not in v4 taxonomy.**

**Problem**: "You can't maintain Concentration" while raging. No existing `EffectAtom` removes a creature's ability to maintain concentration. This is distinct from:
- `apply_condition` — no SRD condition causes loss of concentration ability directly
- `grant_condition_immunity` — this prevents conditions from taking hold; concentration is not a condition
- `restrict_action_set` — the SRD standard action kinds don't include "concentrate"

**Proposed atom**:
```typescript
| { readonly kind: "suppress_concentration" }
```
Semantics: while this effect is active on the creature, any concentration it was maintaining immediately drops and new concentration cannot be started. Aligns with v4's `concentrate` lifecycle atom (which this atom blocks).

---

## Gap 4 — Missing `suppress_spellcasting` atom

**Not in v4 taxonomy.**

**Problem**: "You can't cast spells" while raging. No existing `EffectAtom` blocks a creature's ability to cast spells. This differs from:
- `restrict_action_set` — blocks SRD standard action-economy actions (Attack, Dash, etc.); "cast a spell" is accomplished via the Magic action, but the SRD explicitly distinguishes the spellcasting prohibition from the action economy prohibition in this context, and some spells cast via Bonus Action or Reaction would also be blocked
- `apply_condition` incapacitated — incapacitation blocks the Magic action but also blocks attacks and other things; Rage only suppresses spellcasting

**Proposed atom**:
```typescript
| { readonly kind: "suppress_spellcasting" }
```
Semantics: while active, the creature cannot cast any spell, regardless of the casting time (Action, Bonus Action, Reaction). Distinct from `restrict_action_set` because it targets spell resolution specifically, not the action economy quota.

---

## Gap 5 — No Duration variant for per-turn extendable duration

**Surface location**: `Duration` type

**Problem**: Rage uses a unique duration pattern:
1. Activates until the end of the activating creature's **next turn** (not a timed round count).
2. The creature may **extend** it for one more turn by performing one of three acts on that next turn: make an attack roll against an enemy, force an enemy saving throw, or spend a Bonus Action.
3. Maximum duration: 10 minutes (100 rounds).

The four current `Duration` kinds don't model this:
- `timed` — fixed elapsed time; no conditional extension
- `concentration` — concentration-maintained; Rage explicitly cannot be concentration-maintained
- `instantaneous` / `permanent` — obviously not applicable

The extension mechanic is mechanically significant (it drives barbarian action-economy incentives each turn and is different from concentration), and cannot be collapsed into a `timed` duration with an `earlyEnd` trigger.

**Proposed new Duration variant**:
```typescript
| {
    readonly kind: "extendable_turn_by_turn";
    readonly extensionCosts: ReadonlyNonEmptyArray<TurnExtensionCost>;
    readonly maxMinutes: number;
  }
```
Where `TurnExtensionCost` is a closed enum:
```typescript
export type TurnExtensionCost =
  | { readonly kind: "make_attack_roll_against_enemy" }
  | { readonly kind: "force_enemy_saving_throw" }
  | { readonly kind: "bonus_action" };
```
Semantics: the duration ends at the end of the source creature's next turn unless the creature performs at least one of the listed extension acts on that turn. The `maxMinutes` cap is a hard ceiling regardless of extensions.

---

## Gap 6 — `target_dons_armor` needs armor-category parameter

**Surface location**: `DurationEndTrigger`

**Problem**: The existing `target_dons_armor` trigger (added for Mage Armor) carries no parameters. Rage ends when "you don **Heavy** armor" specifically — not any armor. Mage Armor ends on *any* armor (no category). The surface needs an optional category narrowing so authors can distinguish.

**Proposed fix**: Add an optional field:
```typescript
| {
    readonly kind: "target_dons_armor";
    readonly armorCategory?: ArmorTrainingCategory;
  }
```
Absent `armorCategory` = any armor (Mage Armor semantics, backward-compatible). Present = only that category triggers early end.

---

## Gap 7 — Missing `target_gains_condition` DurationEndTrigger variant

**Surface location**: `DurationEndTrigger`

**Problem**: Rage ends early if the barbarian gains the Incapacitated condition. No existing trigger fires on condition acquisition. The closest (`target_takes_damage`, `target_damaged_by_caster_or_ally`) are damage-event triggers, not condition-gain triggers.

**Proposed new variant**:
```typescript
| {
    readonly kind: "target_gains_condition";
    readonly condition: Condition;
  }
```
Semantics: the duration ends immediately when the target acquires the named condition. Covers Rage (Incapacitated), and is likely reusable for other features (Monk Stunning Strike riders, concentration break checks, etc.).

---

## Summary table

| Gap | Kind | Severity | v4 atom? |
|---|---|---|---|
| `modify_damage_numeric` ability-based attack filter | `new_variant` | surface_widening | n/a (new WeaponFilter variant) |
| `modify_roll_advantage` `checkAbilityFilter` | `new_variant` | surface_widening | n/a (new field on existing atom) |
| `suppress_concentration` | `new_atom` | atom_widening | No |
| `suppress_spellcasting` | `new_atom` | atom_widening | No |
| extendable turn-by-turn Duration variant | `new_variant` | surface_widening | n/a (new Duration kind) |
| armor-category param on `target_dons_armor` | `new_variant` | surface_widening | n/a |
| `target_gains_condition` DurationEndTrigger | `new_variant` | surface_widening | No |

The primary driver of the `atom_widening` classification is the absence of `suppress_concentration` and `suppress_spellcasting` from the v4 taxonomy. All other gaps are `surface_widening` (new variants/fields within existing surface type positions). No content dhall/json was authored; a misleading trace would be worse than no trace.
