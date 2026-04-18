# Proposal: Defender widening gaps

## Unit

**Defender** — Weapon (Any Melee Weapon), Legendary, Requires Attunement  
Provenance: SRD 5.2.1, `MagicItems#Defender`

## Encoded subset

The authored JSON captures the unconditional weapon bonus:

- `modify_roll_numeric` +3 on `attack_roll`, scoped to `specific_item: magic_item_defender`
- `modify_damage_numeric` +3, same scope

Condition gate: `holding_item`. Family: `passive`. Typecheck and tracer both pass.

## Missing mechanic: Bonus Transfer

> "The first time you attack with the weapon on each of your turns, you can transfer some or all of the weapon's bonus to your Armor Class. For example, you could reduce the bonus to your attack rolls and damage rolls to +1 and gain a +2 bonus to Armor Class. The adjusted bonuses remain in effect until the start of your next turn, although you must hold the weapon to gain a bonus to AC from it."

This is the Defender's primary novel mechanic and its namesake feature. It is **not** encodable in the current surface.

---

## Gap 1: First-attack-of-turn trigger

**Missing variant:** `OngoingTrigger.on_first_attack_of_turn` (or equivalent activation gate)

The transfer opportunity fires exactly once per turn, at the moment the wielder makes their first attack with the weapon. This is distinct from:

- `passive` — fires unconditionally at all times, not at a specific attack moment
- `on_caster_attack_hit` — fires on every qualifying attack hit, not just the first per turn
- An `activation` with `usageLimit: once_per_turn` — activation costs fire before the attack; there is no "at the moment of my first attack" activation timing in `ClassFeatureActivationCost`
- `on_hit_trigger` (mastery family) — fires on hit; the transfer decision is made *before* the attack roll is resolved

The SRD pattern "the first time you X on each of your turns" is a distinct timing window: the player decides the split before rolling, the choice persists for the attack sequence, and the opportunity expires once used.

**Proposed shape:**
```typescript
| { readonly kind: "on_first_attack_of_turn" }
```
Added to `OngoingTrigger` or as a new `ClassFeatureActivationCost` variant representing "at the moment of my first attack (per turn)".

---

## Gap 2: Dynamic bonus-pool redistribution atom

**Missing atom:** `transfer_weapon_bonus` (or `redistribute_bonus_pool`)

The Defender holds a bounded integer pool (the weapon's magic bonus: +3). On the first attack each turn, the wielder may redirect any integer N in [0, bonus] from the attack/damage channel to the AC channel. The remaining (bonus − N) stays on attack/damage. Both halves expire at the start of the wielder's next turn.

This is not expressible by combining existing atoms because:

1. `modify_ac` takes a fixed `DiceDelta` — there is no "player-chosen integer in [0, N]" DiceAmount or DiceDelta variant
2. The attack/damage bonus is simultaneously *reduced* by N — existing atoms only add bonuses; there is no "reduce an active passive bonus by player choice"
3. The two effects are interdependent: attack/damage + AC = constant. No existing composition models this mutual constraint

**Proposed atom:**
```typescript
| {
    readonly kind: "transfer_weapon_bonus";
    // Maximum pool available to transfer (matches the weapon's base bonus)
    readonly maxTransfer: number;
    // Duration of the transferred AC portion
    readonly acBonusExpiry: RiderExpiry;
  }
```

Semantics: the wielder chooses integer N ∈ [0, maxTransfer] at the trigger moment. Attack/damage bonus effectively becomes +(maxTransfer − N); AC bonus becomes +N. Both revert when `acBonusExpiry` fires (here: `caster_turn_start`).

The existing `RiderExpiry.caster_turn_start` covers "until the start of your next turn" correctly and requires no new variant.

---

## Classification

- **Outcome:** `atom_widening`
- **Encoded partial:** yes — the +3 weapon bonus traces cleanly
- **Missing mechanic:** Bonus Transfer (the item's core defensive rider)
- **Required new surface concepts:** (a) first-attack-of-turn trigger, (b) dynamic bonus-pool redistribution atom
