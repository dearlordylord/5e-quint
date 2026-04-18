`Staff of Power` does not fit the current authored surface honestly.

Primary blocker: the item combines:

- passive held benefits;
- a spellcasting activation that spends from a 20-charge pool;
- a separate `Retributive Strike` activation that also spends that same 20-charge pool.

The current `MagicItemMechanics.composite` shape can contain multiple parts, but each `activation` part owns its own `resource` and `resetCadence`. There is no way to model one shared charge pool across multiple activated branches without duplicating state across parts, which would be dishonest.

Secondary gaps exposed by this unit:

- `modify_roll_numeric` cannot narrow to spell attack rolls only, so `"+2 bonus to ... spell attack rolls"` would overgrant if encoded as `attack_roll`.
- `Retributive Strike` damage scales off the number of charges currently in the staff, not a fixed amount, slot scaling, or `resource_spent`.
- `Retributive Strike` deterministically destroys the item on activation, which is different from the existing `ItemDestructionPolicy` shapes (`none`, `last_charge_roll`, `permanent_on_empty`).
- `You have a 50 percent chance to instantly travel to a random plane of existence` needs a probability / chance gate before `transport_exile`; the current surface has no probabilistic resolution primitive.
- The staff's last-charge failure text is partial property loss, not full destruction: it keeps the weapon bonuses but loses all other properties. Existing destruction policy shapes cannot express partial capability loss.

Suggested classification: `structural_widening`.

Proposed widenings:

1. `new_subgraph`: shared item resource across composite parts
   Justification: a composite magic item needs one charge pool that multiple activated branches consume.
   Evidence: "This staff has 20 charges ... While holding the staff, you can cast one of the spells ..." and "`Retributive Strike.` ... damage equal to 16 times the number of charges in the staff."

2. `new_variant`: `DiceAmount.current_resource_pool`
   Justification: `Retributive Strike` damage is derived from the pool remainder at activation time, not from a fixed amount or chosen spend.
   Evidence: "you take Force damage equal to 16 times the number of charges in the staff ... Each other creature ... takes Force damage equal to 4 times the number of charges in the staff."

3. `new_variant`: deterministic destruction on named activation
   Justification: breaking the staff destroys it immediately, independent of pool exhaustion.
   Evidence: "You can take a Magic action to break the staff ... The staff is destroyed"

4. `new_variant`: attack-roll modifier filter for spell attacks
   Justification: the item grants a held `+2` only to spell attack rolls, not all attack rolls.
   Evidence: "While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls."

5. `new_variant` or `new_subgraph`: probability gate
   Justification: the self-exile branch is a 50% chance outcome preceding the damage/exile result.
   Evidence: "You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion."

6. `new_variant`: partial property loss on depletion
   Justification: last-charge failure removes only some properties; the item remains a magic quarterstaff with weapon bonuses.
   Evidence: "On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties."
