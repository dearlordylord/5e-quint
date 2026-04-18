# Holy Avenger

## Verdict

`Holy Avenger` does not fit the current `MagicItemMechanics` surface honestly. The narrowest honest outcome is `structural_widening`.

## Why It Does Not Fit

The item combines three distinct mechanical streams:

1. A passive held-weapon bonus:
   - `+3` to attack rolls made with this weapon
   - `+3` to damage rolls made with this weapon

2. A weapon-hit rider:
   - "When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage."

3. A held aura affecting multiple creatures:
   - "While you hold the drawn weapon, it creates a 10-foot Emanation originating from you."
   - "You and all creatures Friendly to you in the Emanation have Advantage on saving throws against spells and other magical effects."
   - "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."

The current `MagicItemMechanics` union can represent:

- passive self-grants;
- activated abilities;
- triggered reactions;
- spawned creatures;
- composites over those families.

It cannot represent a **passive area aura** on a magic item, and it cannot represent a **magic-item on-hit rider** analogous to mastery `on_hit_trigger`.

## Required Structural Widenings

### 1. Passive aura-style magic-item family or reusable non-spell ongoing family

The aura is not a spell and not an activation. It is a persistent held-item effect with:

- area attachment (`emanation` from self),
- ally/self beneficiaries inside that area,
- a persistent roll-advantage rider,
- radius scaling by class level.

Today, `PassiveMechanics` only grants effects to the owner; it has no attachment/area/operation grammar. Encoding this as a plain passive self-grant would be false.

### 2. Magic-item on-hit rider family/component

The Fiend/Undead radiant rider is neither:

- a passive always-on self modifier,
- an activation,
- a triggered reaction.

It is an on-hit conditional rider attached to weapon hits with this specific item. The current surface has an `on_hit_trigger` family only for `MasteryRecord`, not for magic items or reusable magic-item components.

## Additional Surface Gaps Exposed After Structural Fix

If the structural families above existed, `Holy Avenger` would still pressure narrower surface variants:

### A. Save-source narrowing to magical effects

Current `modify_roll_advantage` can target saving throws generally and can narrow by save ability, but it cannot say:

- "saving throws against spells and other magical effects"

This is the same gap already noted for `Robe of the Archmagi`.

### B. Friendly-creature beneficiary selection inside a persistent aura

The surface currently has no honest beneficiary filter for:

- self plus friendly creatures in the emanation

An area attachment by itself would over-apply to all creatures in the area.

### C. Class-level scaling for area size in a non-spell persistent item effect

The item says:

- "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."

The current area attachment shape has fixed geometry only; it has no threshold-tier scaling for radius keyed to class level.

## Evidence

- "When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage."
- "While you hold the drawn weapon, it creates a 10-foot Emanation originating from you."
- "You and all creatures Friendly to you in the Emanation have Advantage on saving throws against spells and other magical effects."
- "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."
