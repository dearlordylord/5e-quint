# Architecture: libsrd5 (kupka/libsrd5)

## Snapshot

| Attribute | Value |
|---|---|
| Language | C# (.NET) |
| Framework | None (zero dependencies beyond .NET framework) |
| Edition target | D&D 5e SRD 5.1 |
| License | AGPL-3.0 (engine), CC-BY-4.0 or OGL 1.0a (SRD content in `ogl/`) |
| LOC (engine core) | ~3,250 (libsrd5/, excluding ogl/) |
| LOC (SRD content) | ~19,670 (libsrd5/ogl/ -- monsters, spells, items, classes, races, feats) |
| LOC (tests) | ~4,400 (libsrd5.tests/) |
| Test count | 274 xUnit [Fact] tests |
| Test coverage | Codecov badge on repo; spell tests cover cantrips + levels 1-2 mechanically, higher levels mostly stub |
| Active development | Moderate (sole author, version 0.3.2, spells are current focus) |

## Core Architecture Pattern

**Mutable OOP with enum-based effect flags and delegate-based spell resolution.**

The architecture is a classic object-oriented combat library with three layers:

1. **Core types** -- `Combattant` (abstract base), `CharacterSheet` (PCs), `Monster` (NPCs), `Battleground` (arena), `Attack`, `Spell`, `Dice`
2. **SRD content** (`ogl/`) -- static factory properties for monsters, spells, items, races, classes, feats, conditions, effects. Content is data, not logic -- except spells, which embed their cast logic as inline delegates.
3. **Global event bus** (`GlobalEvents`) -- static C# events for UI notification (damage received, spell cast, initiative rolled, etc.)

The critical design choice: mechanical effects are modeled as a flat `Effect` enum (~230 members) rather than as objects or modifier stacks. Conditions apply/unapply effects via extension methods. Spells are inline `SpellCastEffect` delegates that directly mutate combatant state.

## State Model

### Combattant (abstract base class)

All combatants (PCs and monsters) share mutable state stored directly on the object:

```
Combattant
  +-- Strength/Dexterity/Constitution/Intelligence/Wisdom/Charisma  (Ability objects)
  +-- HitPoints, HitPointsMax, HitPointMaxiumModifiers[]
  +-- ArmorClass, ArmorClassModifier
  +-- Speed
  +-- MeleeAttacks[], RangedAttacks[], BonusAttack
  +-- Effects[]          (flat Effect enum array)
  +-- Conditions[]       (flat ConditionType enum array)
  +-- Feats[]            (flat Feat enum array)
  +-- Proficiencies[]
  +-- AvailableSpells[]  (spell slot management)
  +-- TemporaryHitpoints
  +-- StartOfTurnEvents[], EndOfTurnEvents[]  (delegate arrays)
  +-- DamageTakenEvents[]                      (delegate arrays)
  +-- AttackModifyingEffects[]                 (delegate arrays)
  +-- Dead (bool)
```

`CharacterSheet` adds equipment inventory, character levels, race, hit dice, and computes AC from equipped armor. `Monster` adds challenge rating, monster type, innate spellcasting, and uses a flat base AC.

**Key property:** State is fully mutable. Arrays grow via `Utils.Push` (resize + append) and shrink via `Utils.RemoveSingle`. There is no snapshot, no undo, no immutable projection. The `GuidClass` base class assigns every object a `Guid` for identity.

### Deterministic RNG

`Random.cs` implements xorshift32 with a publicly settable `State` property. Tests seed it (`Random.State = 7`) for deterministic replay. This is the closest the project comes to reproducibility -- but since state is mutated in-place, there's no way to snapshot and restore a game state.

**Comparison with us:** We model state as immutable records in Quint, with transitions producing new states. libsrd5's mutable approach makes replay and verification fundamentally harder.

## Battleground (Combat Management)

`Battleground` is an abstract class with two concrete implementations:

- **`BattleGroundClassic`** -- JRPG-style front/back rows per side (BACK_LEFT=0, FRONT_LEFT=25, FRONT_RIGHT=30, BACK_RIGHT=55 feet). Distance is the absolute difference in row positions (minimum 5).
- **`Battleground2D`** -- tile grid with Euclidean distance, rounded then multiplied by 5 for D&D units.

The battleground manages:
- **Initiative:** rolled on `AddCombattant`, sorted on `Initialize()`
- **Turn order:** round-robin through sorted combattants
- **Turn phases:** `MOVE -> ACTION -> BONUS_ACTION -> next combattant` (strict sequential, `NextPhase()`)
- **Actions:** `MeleeAttackAction()`, `RangedAttackAction()`, `SpellCastAction()`, `MoveAction()`

Each action method validates constraints (phase, range, incapacitation, spell preparation, slot availability) and returns `bool` for success/failure. On success, `NextPhase()` is called automatically.

**Comparison with us:** Our `battle.qnt` models turn structure as a state machine with explicit guards. libsrd5's approach is simpler (linear phase progression) but lacks interrupt points for reactions and does not model reactions at all -- there is no opportunity attack, no readied action, no reaction phase.

## Event/Action System

### Attack Resolution (Combattant.Attack)

Attack resolution is a single monolithic method (~100 lines) on `Combattant`:

1. Check locked target and range/reach
2. Determine advantage/disadvantage from effects + conditions (both attacker and target)
3. Apply `AttackModifyingEffect` delegates (mutable ref parameters for advantage/disadvantage)
4. Roll attack (D20, D20Advantage, or D20Disadvantage)
5. Check critical hit (nat 20) / critical miss (nat 1)
6. Handle Mirror Image (if target has SPELL_MIRROR_IMAGE_3/2/1)
7. Compare modified attack vs target AC
8. Check auto-crit conditions (AUTOMATIC_CRIT_ON_HIT, AUTOMATIC_CRIT_ON_BEING_HIT_WITHIN_5_FT)
9. Apply bonus damage from spell effects (Divine Favor, Enlarge, Reduce, Ray of Enfeeblement)
10. Call `target.TakeDamage()` for primary + additional damage
11. Apply on-hit effects via `ApplyEffectOnHit`

### Damage Resolution (Combattant.TakeDamage)

1. Check immunity -> return 0
2. Apply resistance (halve) and vulnerability (double)
3. If DC provided, roll saving throw; apply mitigation (halve or nullify)
4. Fire `GlobalEvents.ReceivedDamage`
5. Absorb through temporary HP first
6. Check instant death (remaining damage exceeds HP max)
7. Reduce HP; if 0: PCs enter death saves (FIGHTING_DEATH effect + UNCONSCIOUS condition), monsters die instantly

### Saving Throws (Combattant.DC)

DC resolution handles:
- Advantage from Magic Resistance feat or per-ability advantage effects
- Disadvantage from per-ability disadvantage effects
- Proficiency bonus if proficient in the ability
- Spell effects: Guidance (+d4, consumed), Bane (-d4), Bless (+d4), Spell Resistance (+d4, consumed)
- Nat 20 = auto success, Nat 1 = auto fail
- Legendary Resistance (turn fail into success, consumed)
- Forced failure effects (FAIL_STRENGTH_CHECK, etc.)

**Comparison with us:** Our spec separates attack resolution into distinct states (roll, compare, apply damage) with explicit interrupt points. libsrd5 resolves everything in one method call -- simpler to code, but impossible to verify sub-steps or inject reactions.

## Condition/Effect System

### Conditions (ConditionType enum)

Conditions are a flat enum: BLINDED, CHARMED, DEAFENED, EXHAUSTED_1 through EXHAUSTED_6, FRIGHTENED, GRAPPLED_DC10 through GRAPPLED_DC20, INCAPACITATED, INVISIBLE, PARALYZED, PETRIFIED, POISONED, PRONE, RESTRAINED, STUNNED, UNCONSCIOUS.

Apply/Unapply is implemented as C# extension methods (`ConditionsExtension`) that add/remove Effect flags:

- **Blinded:** adds ADVANTAGE_ON_BEING_ATTACKED + DISADVANTAGE_ON_ATTACK
- **Stunned:** applies Incapacitated + FAIL_STRENGTH_CHECK + FAIL_DEXERITY_CHECK + ADVANTAGE_ON_BEING_ATTACKED
- **Paralyzed:** applies Stunned + AUTOMATIC_CRIT_ON_BEING_HIT_WITHIN_5_FT
- **Unconscious:** applies Paralyzed + drops weapons (CharacterSheet only)

Only 5 conditions (Blinded, Incapacitated, Paralyzed, Stunned, Unconscious) have Apply/Unapply logic. The rest (Prone, Restrained, Poisoned, Frightened, etc.) are checked directly in attack advantage/disadvantage methods on `Combattant` without going through the Effect system.

### Effects (Effect enum, ~230 members)

The `Effect` enum is a flat bag of everything: damage vulnerabilities/resistances/immunities per type, condition immunities, advantage/disadvantage on saves and attacks, spell-specific flags, monster-specific poison/disease flags, death save tracking, and miscellaneous combat flags.

Effects have Apply/Unapply extension methods for those that modify state (e.g., HEAVY_ARMOR_SPEED_PENALITY subtracts 10 from speed, SPELL_ENLARGE increments Size). Most effects are passive flags checked at resolution time.

**Notable: Grapple is encoded as GRAPPLED_DC10 through GRAPPLED_DC20** -- the escape DC is baked into the enum variant. This is clever for avoiding extra fields but limits the DC range.

**Comparison with us:** We model conditions as a set of enum flags with mechanical effects described in the spec invariants. libsrd5 splits condition mechanics between the condition Apply/Unapply methods and inline checks in attack resolution. This split makes it hard to audit whether all mechanical implications of a condition are correctly handled.

## Spell System

### Spell Definition

A `Spell` object holds metadata (ID, school, level, casting time, range, components, duration, area of effect, max targets) plus a `SpellCastEffect` delegate -- the actual cast implementation.

### Spell Implementation Pattern

Spells are defined as static properties on the partial `Spells` struct, organized by level across files (`Spells__Cantrips.cs`, `Spells_1st.cs`, ..., `Spells_9th.cs`). Each returns a `new Spell(...)` with an inline delegate:

```csharp
public static Spell FireBolt {
    get {
        return new Spell(ID.FIRE_BOLT, EVOCATION, CANTRIP, ...,
            delegate (Battleground ground, Combattant caster, int dc,
                      SpellLevel slot, int modifier, Combattant[] targets) {
                Dice dice = DiceLevelScaling(caster, D10);
                SpellAttack(ID.FIRE_BOLT, ground, caster, FIRE, dice, modifier, targets[0], 120);
            }
        );
    }
}
```

Shared helpers:
- `SpellAttack()` -- makes a ranged spell attack roll via `Combattant.Attack`
- `DiceLevelScaling()` -- scales cantrip dice by caster level (1/2/3/4 at levels 1/5/11/17)
- `DiceSlotScaling()` -- scales damage dice by spell slot
- `AddEffectsForDuration()` -- registers start/end-of-turn delegates to track duration and auto-remove effects
- `AddEffectAndConditionsForDuration()` -- same, but also manages conditions

### Duration/Concentration Tracking

Duration is tracked by registering delegates on `StartOfTurnEvents` and `EndOfTurnEvents` arrays. Each turn, the delegate decrements a captured `remainingRounds` counter and removes effects when expired. There is **no explicit concentration mechanic** -- concentration is not modeled. Breaking concentration (e.g., on damage) would need to be handled by the caller.

### Spell Coverage

All SRD 5.1 spell IDs are enumerated (321 spells). Mechanically implemented: all cantrips with combat effects, most 1st-level, most 2nd-level. Higher-level spells are largely stubs (`SpellWithoutEffect`). The author notes spells are the "current focus of work."

**Comparison with us:** Our spells are pure feature functions in `app/src/features/`. libsrd5 co-locates spell logic with spell metadata as inline delegates, which is concise but makes testing require a full Battleground setup.

## Spatial Model

Present via the `Battleground` abstraction. Two implementations:

1. **Classic (JRPG):** Four fixed positions (back-left, front-left, front-right, back-right). Distance is row difference. Simple, suitable for narrative combat.
2. **2D Grid:** `Tile[,]` array with `Coord(x,y)` positions. Euclidean distance rounded and multiplied by 5. Supports `Push()` in 8 directions.

Movement is validated against remaining speed. No pathfinding, no difficult terrain, no opportunity attacks on movement.

**Comparison with us:** We abstract spatial concerns as caller-provided distance inputs. libsrd5 commits to concrete spatial models, which is more complete but couples the engine to specific grid semantics.

## Content vs Engine Boundary

**Strong separation via `ogl/` directory.**

The `ogl/` folder (19,670 LOC) contains all SRD-licensed content:
- `Monsters_A.cs` through `Monsters_Z.cs` -- monster stat blocks as static factory methods
- `Spells__Cantrips.cs` through `Spells_9th.cs` -- spell definitions with inline delegates
- `Items.cs` -- weapons, armor, shields, magic items
- `Effects.cs` -- the Effect enum and Apply/Unapply logic
- `Conditions.cs` -- ConditionType enum and Apply/Unapply logic
- `Feats.cs` -- feat enum and Apply methods
- `CharacterClasses.cs`, `CharacterRaces.cs` -- class/race definitions

Engine core (`Combattant.cs`, `Battleground.cs`, `Attack.cs`, `Spell.cs`, `Dice.cs`, etc.) is SRD-independent -- it operates on Effects, Conditions, Attacks, and Spells as abstract inputs. The dual licensing (AGPL for engine, CC-BY-4.0/OGL for content) reinforces this boundary.

**The boundary leaks in one direction:** spell delegates directly mutate `Combattant` state and call `TakeDamage`, `AddEffect`, `AddCondition` -- content has full access to engine internals. This is intentional (spells need to do arbitrary things) but means content can violate engine invariants.

## Verification Story

**Decent for an OOP combat library.** 274 xUnit tests across 25 test files.

**Test distribution by category:**
- **Spell tests** (93 tests): One test file per caster class (Wizard: 27, Druid: 33, Cleric: 24, Warlock: 4, Bard: 3, Paladin: 1, Ranger: 1). Tests set up a Battleground2D, seed the RNG, cast spells, and assert on HP changes, effect application/removal, and duration expiry.
- **Attack effect tests** (46 tests): Monster-specific on-hit effects (grappling, poison, disease, paralysis). Most thorough test file -- exercises complex delegate interactions.
- **Battleground tests** (19 tests): Turn phases, movement, melee/ranged attacks, spell casting constraints (phase, preparation, range, slots), area effects, push mechanics, classic vs 2D grids.
- **CharacterSheet tests** (34 tests): Equipment, leveling, AC calculation, proficiency, long rest, multi-classing.
- **Combattant tests** (13 tests): Damage (resistance/vulnerability/immunity), healing, death saves, temporary HP, HP max modifiers.
- **Dice/Random tests** (19 tests): Dice parsing, rolling, critical rolls, RNG distribution.
- **Everything else** (50 tests): Conditions, effects, feats, items, monsters, alignment, experience, text resources, utilities.

**Testing pattern:** Tests use deterministic RNG seeding (`Random.State = N`) to make dice rolls reproducible. This is effective for regression testing but doesn't provide the coverage guarantees of property-based testing or model-based testing.

**What's not tested:** No property-based testing, no invariant checking, no state-space exploration. Condition interactions (e.g., unconscious + paralyzed + stunned stacking effects correctly) are only tested implicitly through spell tests. The Apply/Unapply symmetry of conditions and effects is not systematically verified.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Deterministic RNG via settable seed** -- the xorshift32 with public `State` property is a clean, minimal approach to test reproducibility. Every test sets `Random.State` to a known value. We achieve this differently (Quint nondeterminism for exploration, XState-level determinism for replay), but the simplicity is instructive.

2. **Effect as flat enum with Apply/Unapply symmetry** -- the `Effect` enum with paired Apply/Unapply extension methods is a lightweight way to represent reversible mechanical effects. The pattern of effects modifying state on application and reversing on removal is a simple alternative to our modifier-based approach. The enum naming convention (`RESISTANCE_FIRE`, `IMMUNITY_BLINDED`, `ADVANTAGE_WISDOM_SAVES`) makes effect lookup trivially derivable from damage/condition/ability types.

3. **Spell as metadata + inline delegate** -- co-locating spell metadata (range, components, duration) with the cast implementation as a single constructor call is concise. The shared helpers (`DiceLevelScaling`, `DiceSlotScaling`, `AddEffectsForDuration`) factored into the `Spells` struct eliminate boilerplate. Worth studying for our TS feature function organization.

4. **Turn event delegates for duration tracking** -- registering closures on `StartOfTurnEvents`/`EndOfTurnEvents` that capture remaining round counters is a clean pattern for managing spell durations without a global tick system. The delegate returns `true` when it should be removed, acting as self-cleaning.

5. **Content/engine licensing split** -- the `ogl/` boundary with dual licensing is a clean model for separating SRD content from engine mechanics. The approach of making content call into engine primitives (rather than the engine interpreting content descriptors) is pragmatic.

### Anti-Patterns (For Us)

1. **Mutable state with no snapshot/rollback** -- every action mutates combatant state in-place. No way to compare before/after, replay a sequence, or verify that undo operations are correct. The `FIGHTING_DEATH_SAVE_FAIL_1/FAIL_2/SUCCESS_1/SUCCESS_2` effects track death save state as accumulated flags rather than a counter -- brittle to audit.

2. **Condition Apply/Unapply asymmetry risk** -- only 5 of 19 condition types have Apply/Unapply logic. The rest are checked inline in attack resolution. This split means a new condition's mechanical effects must be added in multiple places, with no compiler or test to catch omissions. The Stunned->Incapacitated->Paralyzed->Unconscious chain of Apply calls creates nested effect stacking that could produce duplicate effects if conditions are applied in certain orders.

3. **No reaction/interrupt model** -- the strict MOVE->ACTION->BONUS_ACTION phase progression has no interrupt points. No opportunity attacks, no Shield spell reaction, no Counterspell, no readied actions. This is a fundamental architectural limitation, not just missing content.

4. **Global static events** -- `GlobalEvents` uses static C# events, meaning all combatants in all battlegrounds share a single event bus. Tests that subscribe to events can interfere with each other (the `[Collection("SingleThreaded")]` attribute on BattlegroundTest confirms this). We avoid this with our per-machine event model.

5. **Enum string parsing for effect lookup** -- `Effects.Resistance(DamageType)` constructs `"RESISTANCE_" + Enum.GetName(...)` and parses it back to an Effect enum. Similarly, `IsDoubleProficient` constructs effect names from proficiency names. This is fragile -- misspellings, missing enum variants, and refactoring are all runtime errors. A discriminated union or typed mapping would be safer.

6. **Grapple DC baked into enum** -- `GRAPPLED_DC10` through `GRAPPLED_DC20` is a creative workaround for not having parameterized conditions, but it creates an artificial DC range limit (10-20) and requires string parsing to extract the DC value in `EscapeFromGrapple`.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `libsrd5/Combattant.cs` | 708 | Abstract combatant: HP, abilities, attacks, damage, saves, conditions, effects |
| `libsrd5/Battleground.cs` | 517 | Abstract battleground + Classic (JRPG) and 2D grid implementations, turn management |
| `libsrd5/CharacterSheet.cs` | 554 | PC: levels, equipment, AC, inventory, spell slots, multi-classing |
| `libsrd5/ogl/Effects.cs` | 701 | Effect enum (~230 members) + Apply/Unapply extension methods |
| `libsrd5/ogl/Spells.cs` | 585 | Spell class, SpellCastEffect delegate, shared helpers (attack, scaling, duration) |
| `libsrd5/ogl/Items.cs` | 727 | Weapons, armor, shields, magic items, consumables |
| `libsrd5/ogl/Spells_1st.cs` | 719 | All 1st-level spell implementations |
| `libsrd5/ogl/Spells_2nd.cs` | 900 | All 2nd-level spell implementations |
| `libsrd5/ogl/Spells__Cantrips.cs` | 375 | All cantrip implementations |
| `libsrd5/ogl/Conditions.cs` | 134 | ConditionType enum + Apply/Unapply for 5 conditions |
| `libsrd5/ogl/Monsters.cs` | 369 | Monster type/ID enums, monster creation helpers |
| `libsrd5/ogl/Monsters_*.cs` | ~9,880 | All SRD monsters (A-Z, 26 files) |
| `libsrd5/ogl/Feats.cs` | 361 | Feat enum + Apply methods for racial/class/monster feats |
| `libsrd5/ogl/CharacterClasses.cs` | 230 | Class definitions with spell slots, hit dice, proficiencies |
| `libsrd5/GlobalEvents.cs` | 269 | Static event bus: attack, damage, healing, DC, spell, death events |
| `libsrd5/Attack.cs` | 181 | Attack struct: bonus, damage, reach, range, on-hit effects |
| `libsrd5/Spell.cs` | 79 | Spell class: metadata + cast delegate |
| `libsrd5/Dice.cs` | 309 | Dice parsing ("3d6+2"), rolling, critical rolls |
| `libsrd5/Random.cs` | 28 | Xorshift32 deterministic PRNG |
| `libsrd5/Ability.cs` | 49 | Ability scores with modifier calculation |
| `libsrd5/Utils.cs` | 97 | Array push/remove helpers, GuidClass base |
| `libsrd5/AvailableSpells.cs` | 82 | Spell slot and preparation management |
| `libsrd5.tests/BattlegroundTest.cs` | 553 | Turn phases, attacks, spellcasting, movement, push |
| `libsrd5.tests/AttackEffectTest.cs` | 721 | Monster on-hit effects (grapple, poison, disease) |
| `libsrd5.tests/SpellTest_Wizard.cs` | 415 | Wizard spell tests (27 facts) |
| `libsrd5.tests/SpellTest_Druid.cs` | 648 | Druid spell tests (33 facts) |
| `libsrd5.tests/CharacterSheetTest.cs` | 570 | PC creation, equipment, leveling, AC |
| `libsrd5.tests/CombattantTest.cs` | ~200 | Damage, healing, death saves, temp HP |
