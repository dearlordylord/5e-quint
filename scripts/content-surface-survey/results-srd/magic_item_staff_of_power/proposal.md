# Proposal: surface widenings for Staff of Power

Unit: `magic_item_staff_of_power` — Very Rare, requires attunement (Sorcerer, Warlock, or Wizard).

## What encoded cleanly

The composite pattern (passive + activation) covers the dominant mechanics:

- **Passive (holding_item):** +2 to attack rolls and damage rolls made with the staff (`modify_roll_numeric`, `modify_damage_numeric`, `weaponFilter: specific_item`), +2 AC (`modify_ac`), +2 saving throws and +2 spell attack rolls (`modify_roll_numeric`).
- **Activation (holding_item):** 20-charge pool (`charge_pool`, cap 20), dawn recharge of 2d8+4 (`resetCadence: dawn, regain: fixed 2d8+4`), nine charge-cast spells (`grant_spell_access` with `charge_cast` mode, each at its fixed spell level and charge cost).

Typecheck passes. Tracer emits a clean graph with no unhandled cases.

## What was omitted

### 1. Last-charge random table — `ItemDestructionPolicy` gap

SRD text:
> "If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."

The existing `last_charge_roll` variant destroys the item on the threshold roll. This item has two non-destruction outcomes:
- **On 1:** Item degrades to a mundane +2 Quarterstaff (retains weapon bonuses only; not destroyed).
- **On 20:** Item regains 1d8 + 2 charges (partial recharge bonus, not destruction).

Neither outcome fits. The destruction field is encoded as `{ kind: "none" }` and this rider is omitted.

**Proposed widening:** A new `ItemDestructionPolicy` variant (e.g., `last_charge_conditional`) that encodes a random table rolled on last-charge expenditure with multiple named branches, each carrying a result (`degrade_to: mechanics_id | regain_charges: DiceAmount | destroy`).

### 2. Retributive Strike — multiple surface gaps

SRD text:
> "You can take a Magic action to break the staff over your knee or against a solid surface. The staff is destroyed and releases its magic in an explosion that fills a 30-foot Emanation originating from itself. You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion. If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw. On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff. On a successful save, a creature takes half as much damage."

Three surface gaps prevent encoding:

**a. `DiceAmount.pool_size_times` (missing variant)**

The damage amounts (`16 × charges` and `4 × charges`) derive from the current pool count at activation time, multiplied by a fixed factor. No existing `DiceAmount` variant supports this. The closest shape, `resource_spent_linear`, only applies a perResource delta to a base expression for charges *spent in the current cast* — not the total remaining at activation.

Proposed variant:
```typescript
| {
    readonly kind: "pool_size_times";
    readonly multiplier: number;
    readonly maximum?: number;
  }
```

**b. 50% random caster transport (no analog)**

Before the explosion resolves, the caster has a 50% chance to be transported to a random plane (avoiding all damage). This is a random pre-effect gate that bypasses the primary phase. It could be modeled as a `random_table` phase with two outcomes (escape / no escape), but the damage phase on "no escape" still requires `pool_size_times` above.

**c. Activation-triggered item destruction (lifecycle gap)**

The Retributive Strike deliberately and permanently destroys the staff as part of the activation. This is not a last-charge lifecycle event — it is a chosen activation that terminates the item. The current surface has no `ActivationPhase` shape that models item self-destruction as an effect atom.

## Classification

`surface_widening` — all three gaps are missing variants of existing surface types (`ItemDestructionPolicy`, `DiceAmount`, and the activation lifecycle shapes). No new v4 taxonomy atoms are required.
