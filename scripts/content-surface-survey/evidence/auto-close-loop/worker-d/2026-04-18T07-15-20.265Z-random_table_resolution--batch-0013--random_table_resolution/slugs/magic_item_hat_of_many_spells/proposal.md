## Hat of Many Spells

Verdict: `surface_widening`

The item fits the existing top-level `magic_item` kind, and its overall shape still looks like an existing magic-item composition:

- a passive held-item rider (`Spellcasting Focus`)
- an activated property (`Unknown Spell`)

So this does **not** force a new `UnitRecord` kind or a brand-new top-level mechanics family.

The blocker is that the current surface cannot encode the **Unknown Spell** property honestly.

## Why The Existing Surface Fails

### 1. Arbitrary spell-list access is not representable

`grant_spell_access` requires a concrete `spellId`. The hat does not grant one named spell or even a fixed closed list. It lets the wizard attempt:

- any **level 1+** spell,
- on the **Wizard spell list**,
- that the wielder **doesn't know**,
- of a level the wielder **can cast**,
- and without costly Material components above **1,000 GP**.

That is a widening of the existing `grant_spell_access` shape, not a new top-level family.

Evidence:

> "While holding the hat, you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast, and it can't have Material components costing more than 1,000 GP."

### 2. The activation uses the chosen spell's normal casting time

Magic-item activations currently have a fixed `activationCost`. The hat's property instead says:

- first choose an eligible spell,
- spend a spell slot of that spell's level,
- make a check,
- and on success cast the chosen spell using **its normal casting time**.

That means the activation cost is not a single fixed item-side value like `action` or `bonus_action`; it is inherited from the chosen spell. The current activation header cannot express that.

Evidence:

> "On a successful check, you cast the spell using its normal casting time"

### 3. The item consumes a spell slot, not an item pool

The current activated-item resource surface only supports:

- `use_count`
- `charge_pool`

The hat instead spends the wielder's **spell slot of the chosen spell's level**. That is an existing resource kind in the spell surface (`spell_slot`), but not an available activation resource for non-spell units.

Evidence:

> "you must expend a spell slot of the spell's level"

### 4. The cooldown is conditional on success

The item becomes unavailable until a Short or Long Rest **only after a successful check**. On failure, you do not cast the chosen spell and instead roll on the mishap table. The current activated-ability resource model consumes on activation, not conditionally on one branch of an ability-check result.

This is a missing activation subgraph / resource-consumption variant, not a missing top-level family.

Evidence:

> "On a successful check, you cast the spell ... and you can't use this property again until you finish a Short or Long Rest. On a failed check, you fail to cast the spell and a random effect occurs instead"

### 5. The failure branch is a random mishap table with heterogeneous outcomes

Even if the success path were representable, the failure table still needs additional surface support:

- random selection across a d100 table
- random nested selection inside some rows
- rows that cast a random spell from a closed list
- rows that create mundane objects
- rows that create uncontrolled or hostile creatures
- a portal to another plane with GM-chosen destination
- a GM-chosen magic item by rarity

Some rows map to existing atoms, some are caller-owned / DM agenda, and some need broader selection surfaces. Because the main success path already fails honest encoding, I stopped before trying to partial-author the mishap branch.

## Narrowest Honest Widenings

1. `new_variant`: widen `grant_spell_access` so a magic item can grant access to a **spell-list-constrained arbitrary spell pick** rather than a single `spellId`.
2. `new_variant`: widen non-spell activation cost so an activation can use the **chosen spell's casting time** instead of a fixed item action cost.
3. `new_variant`: widen non-spell activation resources so a magic-item activation can consume a **spell slot**.
4. `new_subgraph`: support **branch-conditional cooldown / resource lockout on success only** after an `ability_check_gate`.

## Secondary Notes

- The passive `Spellcasting Focus` property is also not obviously representable in the current surface; it changes component handling for Wizard spells cast through the item rather than producing a standard v4 effect atom.
- The random-table rows that produce harmless butterflies, mundane objects, GM-chosen portals, or GM-chosen magic items also mix deterministic mechanics with caller-owned outcomes.
