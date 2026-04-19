# Proposal: Barbarian Rage surface widenings

## Classification: `surface_widening`

Rage is a Barbarian level-1 class feature. Its overall shape fits the `activation` family (`ClassFeatureMechanics`) and its resource/reset model is expressible today. However, five distinct gaps prevent an honest encoding.

---

## Gap 1 (critical): Duration extension mechanism

**Evidence**
> The Rage lasts until the end of your next turn, and it ends early if you don Heavy armor or have the Incapacitated condition. If your Rage is still active on your next turn, you can extend the Rage for another round by doing one of the following:
> - Make an attack roll against an enemy.
> - Force an enemy to make a saving throw.
> - Take a Bonus Action to extend your Rage.
> Each time the Rage is extended, it lasts until the end of your next turn. You can maintain a Rage for up to 10 minutes.

**Gap**
The current `Duration` union has three variants: `instantaneous`, `concentration`, and `timed`. Rage is explicitly *not* concentration. A plain `timed: 1 round` duration would imply Rage always expires after one round, which is wrong — in practice Rage runs as long as the barbarian acts aggressively (potentially 10 minutes / 100 rounds).

**Proposed widening**
Option A — new `Duration` variant:
```typescript
| {
    readonly kind: "maintained";
    readonly initialWindow: DurationValue;         // "until end of your next turn"
    readonly extendBy: ReadonlyNonEmptyArray<       // any of these extends another window
      | { readonly kind: "attack_roll_vs_enemy" }
      | { readonly kind: "force_enemy_saving_throw" }
      | { readonly kind: "bonus_action_intent" }
    >;
    readonly maxDuration?: DurationValue;           // "up to 10 minutes"
    readonly earlyEnd?: ReadonlyNonEmptyArray<DurationEndTrigger>;
  }
```

Option B — compose existing `timed` with a new `OngoingTrigger` kind `on_caster_turn_end_without_extend` that fires the expire path, and a complement trigger that resets the timer. This is less clean because it requires two new triggers and an extend-timer atom.

Option A is preferred: the "active-maintenance duration" pattern appears in Rage, and may recur in other features (Monk Flurry-sustained stances, future subclass auras). Naming the pattern explicitly is cleaner than threading it through the ongoing-operation grammar.

---

## Gap 2: Strength-based attack filter on `modify_damage_numeric`

**Evidence**
> When you make an attack using Strength — with either a weapon or an Unarmed Strike — and deal damage to the target, you gain a bonus to the damage…

**Gap**
`modify_damage_numeric` accepts `weaponFilter?: WeaponFilter`. `WeaponFilter` has three variants: `weapon_category` (melee/ranged), `weapon_property` (thrown), `specific_item`. None of these expresses "attacks that use Strength as the attack/damage ability." Scoping to `weapon_category: "melee"` would miss thrown-with-Strength attacks; scoping to both melee and thrown would over-include finesse and ranged weapon attacks.

**Proposed widening**
Add a new `WeaponFilter` variant:
```typescript
| { readonly kind: "ability_used"; readonly ability: Ability }
```
This narrows the rider to attacks made with a specific ability, which is a concept that appears in Rage Damage (Strength) and may recur in class features that key off Dexterity vs. Strength (e.g., finesse disambiguation).

---

## Gap 3: Ability filter for raw ability checks on `modify_roll_advantage`

**Evidence**
> You have Advantage on Strength checks and Strength saving throws.

**Gap**
`modify_roll_advantage` has `saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>` for saving throws and `skillFilter?: SkillFilter` for skill-tagged checks. Raw ability checks (e.g., Strength vs a DC for forced movement, grapple contests) carry no skill tag and cannot be filtered by ability through the existing fields.

**Proposed widening**
Add `abilityCheckFilter?: ReadonlyNonEmptyArray<Ability>` to `modify_roll_advantage` (and symmetrically to `modify_roll_numeric` if needed by future units):
```typescript
readonly abilityCheckFilter?: ReadonlyNonEmptyArray<Ability>;
```
Only meaningful when `on` contains `"ability_check"`. Completes the parallel with `saveAbilityFilter`.

---

## Gap 4: `suppress_spellcasting` atom

**Evidence**
> You can't maintain Concentration, and you can't cast spells.

**Gap**
No `EffectAtom` variant blocks spellcasting while an effect is active. The v4 taxonomy does not include a `suppress_spellcasting` atom.

**Proposed widening**
```typescript
| { readonly kind: "suppress_spellcasting" }
```
Applied as a persistent effect for the rage duration. No parameters needed for the base case.

---

## Gap 5: `block_concentration_maintenance` atom

**Evidence**
> You can't maintain Concentration, and you can't cast spells.

**Gap**
Concentration maintenance (the per-turn ability to hold a concentration spell) is distinct from casting. A barbarian who casts a concentration spell before raging loses it on entry. No atom expresses "while this effect is active, the bearer cannot hold Concentration." The existing `concentration_lock` resource atom marks the slot as occupied — it does not *prohibit* using the slot.

**Proposed widening**
```typescript
| { readonly kind: "block_concentration_maintenance" }
```
This atom prevents the bearer from retaining or acquiring concentration spells while the host effect persists.

---

## Encoding status

No `content/barbarian_rage.dhall` or `content/barbarian_rage.json` produced. A partial encoding (e.g., timed:1-round + resistance only) would misrepresent the feature's core duration semantics and omit the central combat behavior. The trace would be actively misleading.

## Atoms expressible today (for future clean encoding)

Once the five gaps above are closed:

| Mechanic | Atom / type |
|---|---|
| Bonus Action activation cost | `activationCost: { kind: "bonus_action" }` |
| Not wearing Heavy armor gate | `condition: { kind: "not_wearing_armor", categories: ["heavy"] }` |
| Use count (threshold_tiers by class level) | `resource: { kind: "use_count", cap: ThresholdTiers }` |
| Partial short / full long rest reset | `resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 }` |
| Resistance to Bludgeoning | `grant_resistance { damageType: "bludgeoning" }` |
| Resistance to Piercing | `grant_resistance { damageType: "piercing" }` |
| Resistance to Slashing | `grant_resistance { damageType: "slashing" }` |
| Advantage on Strength saving throws | `modify_roll_advantage { mode: "advantage", on: ["saving_throw"], saveAbilityFilter: ["str"] }` |
| Early end on Heavy armor / Incapacitated | `earlyEnd` triggers on new maintained duration |
