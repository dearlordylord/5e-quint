## Staff of Power

`Staff of Power` fits the existing `magic_item` top-level kind and the existing `composite` mechanics family for its held passive bonuses plus charge-cast spell list.

The current surface does not honestly encode two parts of the item:

1. The last-charge rider is not the existing `last_charge_roll` destruction shape.
   The current surface only supports "on last charge, maybe destroy the item."
   `Staff of Power` instead has a branched outcome table:
   - on `1`, the staff is not destroyed; it keeps its weapon bonuses and loses its other properties;
   - on `20`, it regains `1d8 + 2` charges.

2. `Retributive Strike` needs charge-linked damage with a multiplier, not 1:1 charge spending.
   The current `DiceAmount.resource_spent` shape can only express "amount equals charges spent."
   It cannot express:
   - self damage = `16 × remaining charges`
   - area damage = `4 × remaining charges`

3. `Retributive Strike` also destroys the item as part of a dedicated activation.
   Current item lifecycle shapes are tied to depletion (`last_charge_roll`, `permanent_on_empty`) rather than "this activation breaks the item now."

### Narrowest honest widening

- Add a magic-item last-charge outcome variant that can branch into partial property shutdown and recharge, rather than only destruction.
- Add a charge-linked damage amount variant that supports a numeric multiplier over the consumed or remaining pool.
- Add an activation-side way to consume the remaining charge pool and destroy or suppress item properties as part of that activation.

### Omitted from authored subset

The shipped Dhall/JSON for this worker intentionally includes only:

- held +2 quarterstaff attack bonus
- held +2 quarterstaff damage bonus
- held +2 AC
- held +2 saving throws
- held +2 spell attack rolls
- charge-cast spell list
- dawn recharge `2d8 + 4`

It intentionally omits:

- the special last-charge branch
- `Retributive Strike`
