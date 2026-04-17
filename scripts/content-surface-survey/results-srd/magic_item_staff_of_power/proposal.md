## Staff of Power proposal

Outcome: `surface_widening`

`Staff of Power` fits the existing top-level `magic_item` kind, and its overall shape is plausibly a `composite` magic item combining passive grants with activated spellcasting / activated destruction. I did not author a placeholder record because several rules require missing surface shapes, and encoding them with today's schema would produce a misleading trace.

### Missing surface shapes

1. `PassiveMechanics.condition` needs an item-held predicate
Evidence:
> "This staff has 20 charges and can be wielded as a magic Quarterstaff..."
>
> "While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls."

Why this forces widening:
The current predicate vocabulary only supports `always`, `wearing_armor`, and coarse `wielding_weapon`. `Staff of Power` needs bonuses that apply specifically while holding this item, including non-weapon bonuses (AC, saves, spell attack rolls). Encoding those as unconditional passives would be false.

2. `modify_roll_numeric` needs a spell-attack-only filter
Evidence:
> "While holding it, you gain a +2 bonus to ... spell attack rolls."

Why this forces widening:
`RollKind` has `attack_roll`, but there is no filter that narrows a roll modifier to spell attacks only. `WeaponFilter` can narrow weapon attacks, but not spell attacks. Using plain `attack_roll` would incorrectly buff all attack rolls.

3. `DiceAmount` needs "remaining charges" support with multipliers
Evidence:
> "you take Force damage equal to 16 times the number of charges in the staff"
>
> "On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff."

Why this forces widening:
The existing `DiceAmount.resource_spent` reads charges spent by the current activation, not charges remaining in the item's pool. Retributive Strike scales from the staff's current remaining charges and uses different multipliers for self and area damage. No existing `DiceAmount` variant can express that honestly.

4. Activation flow needs a probabilistic branch
Evidence:
> "You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion."

Why this forces widening:
The activation families have attack/save/ability-check gates and direct phases, but no chance gate or random branch. This is not DM-agenda text; it is a deterministic rules procedure with a random outcome. The current surface cannot express it.

5. Item depletion / destruction needs a partial-loss outcome, not only destroy-or-not
Evidence:
> "If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."

Why this forces widening:
`ItemDestructionPolicy.last_charge_roll` only models "destroyed on threshold". `Staff of Power` instead has a three-way depletion outcome:
- on 1: lose some properties but keep the weapon bonuses
- on 20: immediately regain charges
- otherwise: no extra change

That is a stateful item-property transition, not a pure destruction policy.

6. Attunement restriction is still missing on `MagicItemRecord`
Evidence:
> "Requires Attunement by a Sorcerer, Warlock, or Wizard"

Why this forces widening:
`MagicItemRecord` only has `requiresAttunement: boolean`. It cannot record class-restricted attunement.

### Why I did not author partial content

I could have encoded the charge-cast spell list and some passive numeric bonuses, but doing so would omit or falsify core mechanics:

- the held-item gating,
- the spell-attack-only bonus,
- Retributive Strike's charge-remaining damage,
- the 50% planar escape branch,
- the last-charge partial property loss / recharge behavior.

That would create a trace that looks cleaner than the real fit. Per the task guardrails, no placeholder record was written.
