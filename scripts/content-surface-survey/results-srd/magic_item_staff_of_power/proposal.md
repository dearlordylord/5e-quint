# Staff of Power

## Verdict

`Staff of Power` does not fit the current authored surface honestly.

The blocking issue is structural: the item is simultaneously:

- a passive attunement/holding item with ongoing bonuses;
- a charge-cast spell item;
- an item with a separate destructive activated ability;
- an item with a last-charge outcome table that degrades properties rather than only destroying or emptying the item.

The current surface allows `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`, so one record can only be one of those families at a time.

## Why Existing Families Fail

### 1. Mixed passive + activation item

The staff has passive mechanics:

> "This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls."

It also has activated spellcasting:

> "While holding the staff, you can cast one of the spells on the following table from it..."

And it also has a distinct activated destructive ability:

> "You can take a Magic action to break the staff over your knee or against a solid surface..."

Encoding it as `passive` drops the spellcasting and Retributive Strike.
Encoding it as `activation` drops the always-on bonuses.
That is not an omission on a secondary rider; it is the item's core shape.

### 2. Last-charge degradation is not existing destruction policy

Current `ItemDestructionPolicy` supports:

- `none`
- `last_charge_roll` => destroy on threshold
- `permanent_on_empty`

But Staff of Power says:

> "On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."

That is neither destruction nor simple empty/nonmagical exhaustion. It is a state transition to a reduced-property item plus a special recharge outcome.

### 3. Retributive Strike pressures additional surface shapes

Retributive Strike also needs shapes that do not currently exist:

- damage based on current charges remaining (`16 × charges` to self, `4 × charges` to others);
- interplanar random travel on a 50% chance;
- an activation whose effect destroys the item immediately.

These are secondary to the main structural blocker, but they are real follow-on gaps.

## Proposed Widenings

### 1. New mechanics composition for magic items

Add a way for one `MagicItemRecord` to carry both passive grants and one or more activated abilities.

Possible direction:

- `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics | { family = "composite", passive = PassiveMechanics, activations = NonEmptyArray<ActivatedAbilityMechanics> }`

This is the minimum honest widening for items like Staff of Power.

### 2. New last-charge outcome table variant

Add an item-lifecycle variant that can express outcome tables on last-charge expenditure, not just destruction.

Pressure text:

> "On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."

### 3. Resource-remaining amount shape

Add a `DiceAmount` or equivalent shape for "amount equals current charges remaining × N".

Pressure text:

> "you take Force damage equal to 16 times the number of charges in the staff"

and

> "a creature takes Force damage equal to 4 times the number of charges in the staff"

### 4. Interplanar random-travel shape

If modeled in-core, add a teleport/transport variant for random-plane travel.

Pressure text:

> "You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion."

If the random destination is considered caller-owned / out-of-core, that should be stated explicitly in the surface rules.
