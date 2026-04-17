# Proposal: magic_item_shield_of_the_cavalier — structural_widening

## Unit

**Shield of the Cavalier** (Magic Item, Very Rare, Requires Attunement)

> While holding this Shield, you have a +2 bonus to Armor Class.
>
> **Forceful Bash.** When you take the Attack action, you can make one of the attack rolls using the Shield against a target within 5 feet of yourself. Apply your Proficiency Bonus and Strength modifier to the attack roll. On a hit, the Shield deals Force damage to the target equal to 2d6 + 2 plus your Strength modifier, and if the target is a creature, you can push it up to 10 feet directly away from yourself. If the creature is your size or smaller, you can also knock it down, giving it the Prone condition.
>
> **Protective Field.** As a Reaction, when you or an ally you can see within 5 feet of you is targeted by an attack or makes a saving throw against an area of effect, you can use the Shield to create an immobile 5-foot Emanation originating from you. When the Emanation appears, any creatures or objects not fully contained within it are pushed into the nearest unoccupied spaces outside it. The attack or area of effect that triggered the Reaction has no effect on creatures and objects inside the Emanation, which lasts as long as you maintain Concentration, up to 1 minute. Nothing can pass into or out of the Emanation. A creature or object inside the Emanation can't be damaged by attacks or effects originating from outside, nor can a creature inside the Emanation damage anything outside it. Once this property is used, it can't be used again until the next dawn.

## Why this unit cannot be encoded honestly

### Gap 1 — magic items cannot carry this combination of properties

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`.

Shield of the Cavalier needs all of these at once:

- a passive AC bonus while held;
- a replace-an-attack offensive property;
- a separate reaction property with its own cadence and a concentration field.

That is not one passive item and not one activated item. It is one item with multiple independent mechanics. Encoding only one property would misrepresent the unit; flattening all properties into one activation would lose the always-on AC bonus and the distinct triggers/costs.

Required widening: a compound magic-item shape that can host multiple properties, likely a list of passive/activated/reaction property records rather than a single `mechanics` union arm.

### Gap 2 — Protective Field is a non-spell triggered reaction with persistence

The existing `triggered_reaction` family exists only under `SpellMechanics`. `ActivatedAbilityMechanics` can consume a reaction quota, but it has no trigger grammar and no way to say "this reaction opens in response to an incoming attack or area effect."

Protective Field also is not a one-shot reaction. It creates a 5-foot emanation that persists while concentrated on, up to 1 minute. That matches the spell-side idea of a triggered reaction followed by an ongoing attached area, but no parallel exists for magic items.

Required widening: either:

- allow magic items to reuse the spell-side `triggered_reaction`/`ongoing_effect` subgraphs, or
- add a non-spell triggered-reaction property family that can create a persistent field.

### Gap 3 — Forceful Bash is not representable as the current attack phase

`ActivationPhase.attack_roll.attackKind` only allows:

- `melee_spell_attack`
- `ranged_spell_attack`

Forceful Bash is neither. It is an attack made with the shield during the Attack action, using Proficiency Bonus and Strength modifier. Encoding it as a spell attack would be a category lie.

Required widening: add a non-spell attack kind such as `melee_weapon_attack` or a more general attack-roll formula shape for activated item abilities.

### Gap 4 — damage cannot add Strength modifier

The hit damage is:

- `2d6`
- `+2`
- `+ Strength modifier`

`DiceExpr` supports flat bonuses and `spellcastingMod`, but not named non-spell ability modifiers. So even if the attack-kind issue were fixed, the damage bundle still cannot be authored honestly.

Required widening: a `DiceExpr` or `DiceAmount` variant that can add a named ability modifier.

### Gap 5 — the prone rider is size-gated

The push always applies to creature targets on hit, but prone applies only if the target is your size or smaller. The current effect bundle can express `force_move` plus `apply_condition(prone)`, but it cannot put a size comparison gate on only the prone half of the bundle.

Required widening: a conditional rider shape keyed to source-target size comparison, or a general effect gate primitive that can host this rule.

## Classification

Overall: **`structural_widening`**.

The blocking issue is not just a missing atom. The current magic-item surface cannot honestly host one passive property plus multiple independent activated properties, one of which is reaction-shaped and persistent. The attack-kind, damage-modifier, and size-gated-rider gaps are secondary surface issues that would still remain after the structural fix.
