# Architecture: Modeling Tiers

This project formalizes D&D 5e SRD 5.2.1 combat rules across three layers, each with a distinct role. Understanding what belongs where prevents misplaced complexity.

## Tier 1: Quint Spec (mechanics/rules)

**Files:** `creature.qnt`, `battle.qnt`
**Purpose:** Property-based fuzzing of the rules engine. Proves that invariants hold under *any* input combination.

The spec models **abstract mechanics**, not specific content. Nondeterministic ranges like `DAMAGE_RANGE = 0.to(60)` don't represent real weapons -- they stress-test the damage pipeline with values no single weapon produces, deliberately hitting edge cases (massive damage instant death, temp HP overflow, death save accumulation) that realistic inputs rarely reach.

What belongs here:
- Damage pipeline: temp HP absorption, resistance/vulnerability/immunity, death/unconscious/death saves
- Condition implication chains: Paralyzed -> Incapacitated -> no actions/concentration
- Spell slot economy: expenditure, multiclass tables, pact slots, one-slot-per-turn rule
- Turn structure: action/BA/reaction/movement/extra attack economy
- Class *resource* tracking: rage charges, focus points, smite slots, channel divinity
- Death save accumulation, stabilization, nat-20 recovery
- 41+ safety invariants that must hold for all reachable states

What does NOT belong here:
- Specific weapon stat blocks (damage dice, properties)
- Specific spell implementations (Fireball's 8d6 Fire in a 20ft sphere)
- Specific feat effects
- Content data validation

## Tier 2: TypeScript Features (content/data)

**Files:** `app/src/features/class-*.ts`, `app/src/features/feature-bridge-*.ts`
**Purpose:** Pure functions for specific class features, spells, weapons, feats. Correctness proven by unit tests with concrete inputs.

What belongs here:
- Specific weapon stats (Longsword: 1d8/1d10 versatile, Slashing)
- Specific spell behavior (Evasion damage halving, Aura of Protection bonus)
- Specific feat effects (Great Weapon Master, Sentinel)
- AC calculation from specific armor pieces
- Class feature *computation* (Sneak Attack dice count, rage damage bonus by level)
- Data validation (are all 37 SRD weapon stat blocks correct?)

## Tier 3: Not Modeled (spatial/social/narrative)

- Positions, distances, area-of-effect geometry
- Cover relationships, line of sight
- Social interactions, exploration, travel encounters

## Bridging the Tiers

The XState machine (`app/src/battle-machine.ts`) sits between Tier 1 and Tier 2. It implements the same state transitions as the Quint spec (verified by MBT) and calls Tier 2 feature functions for content-specific logic. The MBT bridge (`app/src/battle.mbt.test.ts`) replays Quint-generated ITF traces against the XState machine, comparing state field-by-field.

```
Quint spec (Tier 1)          XState machine              TS features (Tier 2)
  abstract mechanics    <--MBT parity-->    state machine    <--calls-->    pure functions
  "damage N of type T"                      "resolve attack"               "Fireball = 8d6 Fire"
  invariant fuzzing                         actual game logic               unit tests
```

## Choosing the Right Tool

| Question | Tool |
|----------|------|
| Can HP ever go negative? | Quint invariant |
| Does Fireball do 8d6? | TS unit test |
| Does death save + healing + damage at 0HP interact correctly? | Quint multi-step property |
| Does Greatsword with GWF reroll 1s and 2s? | TS feature function + unit test |
| Can concentration break leave orphaned effects? | Quint invariant |
| Does Evasion halve AoE on failed save? | Both -- Quint for the mechanic, TS for the computation |
| Are all 37 weapon stat blocks correct? | TS data tests |
| Can a creature with 3 rage charges enter rage 4 times? | Quint invariant |

## Why Abstract Ranges, Not Real Content?

Modeling all SRD content in Quint would cause combinatorial explosion. 37 weapons x 6 abilities x 20 AC values x conditions x advantage states = billions of combinations. Quint's value is proving **"the rules engine is correct regardless of which weapon you use"**, not **"all 37 weapons have the right stats."**

The abstract ranges also *intentionally* cover corners that real content rarely hits. A Longsword doing 4-11 damage won't trigger massive-damage instant death against a 50 HP creature. `DAMAGE_RANGE = 0.to(60)` will.

## Future: Generator Pattern

The [generator/contract/spec pattern](https://github.com/informalsystems/emerald/pull/236) from Emerald could bridge Tier 1 and Tier 2. Instead of raw ranges, a Quint generator would produce SRD-realistic parameter combinations (e.g., "L3 spell, 8d6 damage, DEX save, DC 15") without enumerating all 300+ spells. This constrains the state space to realistic inputs while maintaining invariant coverage -- better exploration efficiency without losing edge-case testing.
