# Architecture: avrae (avrae/avrae)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Python 3.8+ |
| Framework | disnake (Discord bot), d20 (dice parser), draconic (sandboxed scripting), MongoDB (persistence), Redis (caching) |
| Edition target | D&D 5e (SRD + D&D Beyond licensed content) |
| License | GPL-3.0 |
| LOC (total) | ~55,400 |
| LOC (automation system) | ~4,300 (`cogs5e/models/automation/`) |
| LOC (initiative tracker) | ~5,800 (`cogs5e/initiative/`) |
| LOC (aliasing/scripting) | ~5,600 (`aliasing/`) |
| LOC (game data models) | ~2,700 (`gamedata/`) + ~2,200 (`cogs5e/models/sheet/`) |
| LOC (tests) | ~7,400 (unit + e2e) |
| Test coverage | Moderate --- e2e Discord command tests, unit tests for dice/arg parsing/resistances |
| Active development | Maintained by D&D Beyond / Fandom; 451 stars, production Discord bot serving millions |

## Core Architecture Pattern

**Automation Tree Interpreter** with JSON-serializable effect nodes.

Avrae's distinctive contribution is the **automation tree**: a JSON-defined tree of effect nodes (Attack, Save, Damage, Target, IEffect, Condition, Roll, Text, etc.) that is interpreted at runtime against a mutable context (`AutomationContext`). Every spell, attack, and custom action in avrae is represented as an `Automation` object containing a list of `Effect` nodes. The tree is walked depth-first; branching nodes (Attack has hit/miss children, Save has success/fail children, Condition has onTrue/onFalse children) produce different subtrees depending on resolution. This is the core pattern that makes avrae's combat automation extensible --- content is data, not code.

The surrounding architecture is a standard Discord bot: disnake cogs for slash commands, MongoDB for persistence, Redis for caching, and a character sheet integration layer (D&D Beyond, Dicecloud, Google Sheets).

## State Model

### Combat State (`Combat`)

Combat is a mutable object persisted per-channel in MongoDB:

```
Combat
  channel_id: str             # one combat per Discord channel
  dm_id: int                  # controlling user
  round_num: int              # current round (1-indexed)
  turn_num: int               # current initiative count
  current_index: int | None   # index into sorted combatant list
  combatants: List[Combatant] # sorted by init desc, includes groups
  options: CombatOptions      # dynamic init, turn notifications, etc.
```

Turn management is index-based: `advance_turn()` increments `current_index`, wrapping to 0 on new rounds. Combatants are sorted by `(init, init_skill)` descending. Groups share an index --- all combatants in a group act on the same initiative.

### Combatant State (`Combatant` / `StatBlock`)

`Combatant` extends `StatBlock`, the universal stat container:

```
StatBlock (base class for all actors)
  name, stats (6 abilities), levels, attacks, skills, saves
  resistances, spellbook, ac, max_hp, hp, temp_hp, creature_type

Combatant (extends StatBlock, adds combat metadata)
  id: str                     # UUID
  controller_id: int          # Discord user ID
  init: int                   # initiative roll
  is_private: bool            # hide stats from other players
  effects: List[InitiativeEffect]  # active effects
  group_id: str | None        # if in a group
```

Three combatant subtypes: `Combatant` (generic), `MonsterCombatant` (from compendium), `PlayerCombatant` (delegates HP/stats to a linked `Character` document).

### Initiative Effects (`InitiativeEffect`)

The main mechanism for tracking ongoing conditions/buffs/debuffs during combat:

```
InitiativeEffect
  name: str                   # "Bless", "Shield", etc.
  duration: int | None        # in rounds (None = permanent)
  end_round: int | None       # precomputed round when effect expires
  end_on_turn_end: bool       # tick at end vs start of turn
  concentration: bool         # removed if caster concentrates on something else
  effects: InitPassiveEffect  # passive stat modifications (see below)
  attacks: List[AttackInteraction]  # granted attacks
  buttons: List[ButtonInteraction]  # Discord buttons that trigger automation
  parent/children: refs       # hierarchical effect relationships
  tick_on_combatant_id: str   # which combatant's turn ticks the duration
```

**Passive effects** modify combatant stats dynamically:

```
InitPassiveEffect (descriptor-based class with ~20 fields)
  attack_advantage, to_hit_bonus, damage_bonus
  magical_damage, silvered_damage
  resistances, immunities, vulnerabilities, ignored_resistances
  ac_value, ac_bonus, max_hp_value, max_hp_bonus
  save_bonus, save_adv, save_dis
  check_bonus, check_adv, check_dis
  dc_bonus
```

These are applied lazily: when `combatant.ac` is accessed, it calls `active_effects()` with a mapper/reducer to fold all effect AC bonuses onto the base value. No modifier registry --- just a functional fold over the effects list.

### Persistence

All combat state serializes to MongoDB via `to_dict()`/`from_dict()` methods. `PlayerCombatant` delegates to the `Character` document. A TTL cache (`cachetools.TTLCache`, 10s TTL, 500 max) ensures multiple Discord commands in the same invocation share the same `Combat` instance.

## Automation System

This is avrae's most architecturally distinctive feature. Every action in the system --- spells, attacks, class features, custom aliases --- is represented as a tree of JSON-serializable `Effect` nodes.

### Effect Node Types (15 types)

| Node | Key Role | Children? |
|---|---|---|
| `Target` | Selects targets (all, self, parent, indexed) | `effects` list run per target |
| `Attack` | d20 attack roll vs AC | `hit` and `miss` child lists |
| `Save` | Saving throw vs DC | `success` and `fail` child lists |
| `Damage` | Damage roll with resistance/crit handling | none (leaf) |
| `TempHP` | Grant temporary hit points | none (leaf) |
| `Roll` | Generic dice roll, stored as metavar | none (leaf) |
| `Text` | Display text or entity descriptions | none (leaf) |
| `IEffect` | Apply an `InitiativeEffect` to target | none (leaf) |
| `RemoveIEffect` | Remove the triggering effect | none (leaf) |
| `SetVariable` | Set a variable for downstream nodes | none (leaf) |
| `Condition` | Evaluate expression, branch true/false | `onTrue` and `onFalse` child lists |
| `UseCounter` | Deduct a limited-use resource | none (leaf) |
| `CastSpell` | Recursively invoke another spell's automation | none (leaf, but triggers a full automation run) |
| `Check` | Ability/skill check | `success` and `fail` child lists |

### Execution Model

1. An `Automation` object holds a list of root `Effect` nodes.
2. `Automation.run()` creates an `AutomationContext` (caster, targets, args, combat, metavars, embed queues).
3. Two-pass execution: first `preflight()` (async, DFS) for entitlement checks, then `run()` (sync, DFS) for effect resolution.
4. Branching nodes resolve their condition (attack roll vs AC, save vs DC, condition expression), then run the appropriate child list.
5. Results are captured as frozen `@dataclass` objects forming a result tree mirroring the effect tree.

### Key Design: Metavars

The `AutomationContext` carries a `metavars` dict that effects can read and write:

```python
autoctx.metavars["lastAttackDidHit"] = True
autoctx.metavars["lastAttackRollTotal"] = to_hit_roll.total
autoctx.metavars["lastDamage"] = dmgroll.total
autoctx.metavars["lastSaveDidPass"] = True
```

These are accessible in `AnnotatedString` expressions (e.g., `{lastDamage}` in a downstream damage roll), creating a dataflow channel between sibling nodes. This is how multi-step automations like "on hit, deal 2d6 + {lastDamage}/2 bonus damage" work.

### Key Design: AnnotatedString

String fields in automation nodes can contain `{expressions}` that are evaluated by the `draconic` sandboxed Python evaluator. This allows dynamic values:

```json
{"type": "damage", "damage": "{spell_level}d6 + {caster.stats.cha_mod}"}
```

The evaluator has access to: `caster` (AliasStatBlock), `target`, `combat`, `spell_level`, `lastDamage`, and all metavars.

### Example: Fireball Automation Tree

```
Target(all)
  Save(stat="dex", dc="{8+proficiencyBonus+wisdomMod}")
    fail:
      Damage("8d6[fire]", higher={"4": "1d6[fire]"})
    success:
      Damage("(8d6[fire])/2", higher={"4": "(1d6[fire])/2"})
```

### Comparison With Our Project

Our Quint spec models combat actions as explicit state machine transitions with guards and postconditions. Avrae's automation tree is an **interpreter pattern** --- more flexible for content authoring (any user can define new automations via JSON), but with no static verification. We get exhaustive model checking; avrae gets infinite extensibility. The tradeoff is fundamental and deliberate on both sides.

## Scripting (Draconic / Aliasing)

### Draconic Language

Avrae's scripting layer uses `draconic`, a sandboxed Python dialect (separate library: `github.com/avrae/draconic`). It provides:

- Standard Python expressions and operators
- Whitelisted builtins: `floor`, `ceil`, `len`, `max`, `min`, `range`, `sqrt`, `sum`, etc.
- Avrae-specific functions: `roll()`, `vroll()`, `err()`, `typeof()`, `argparse()`
- Sandboxed: no imports, no I/O, no arbitrary attribute access, execution time limits

### Aliasing System (`aliasing/`)

Users can define custom commands (aliases) and server-specific variables (svars). The aliasing API (`aliasing/api/`) exposes:

- `AliasStatBlock` --- read-only view of a character's stats
- `AliasContext` --- Discord context, combat access
- `SimpleCombat` / `SimpleCombatant` / `SimpleEffect` --- combat manipulation API

This creates a two-tier system:
1. **Automation JSON** --- declarative effect trees, no code, created in avrae's web editor or `!a import`
2. **Alias scripting** --- imperative draconic code that can manipulate combat state, create automation on the fly, and compose complex workflows

The Alias Workshop (avrae.io) is a community marketplace for user-created aliases --- effectively a modding ecosystem.

### Evaluation Scopes

Three evaluator classes with increasing capability:
- `AutomationEvaluator` --- used inside automation AnnotatedStrings, minimal scope
- `ScriptingEvaluator` --- used in aliases, full combat/character API access
- `MathEvaluator` --- used in dice commands, expression-only

## Combat Tracker

### Architecture

The initiative tracker (`cogs5e/initiative/`) is the Discord-facing combat management layer:

- `InitTracker` (cog, 1624 LOC) --- Discord slash commands (`!init begin`, `!init add`, `!init next`, `!init attack`, etc.)
- `Combat` (697 LOC) --- combat state container, turn management, MongoDB persistence
- `Combatant` (856 LOC) --- stat block + combat metadata, effect management
- `CombatantGroup` (162 LOC) --- groups of combatants sharing initiative

### Turn Management

Linear index-based: `advance_turn()` increments `current_index` mod combatant count, incrementing `round_num` on wraparound. Optional "dynamic initiative" rerolls all initiatives each round.

Effect duration ticking happens in `Combatant.on_turn()`, called for every combatant on each turn advance. Effects track `end_round` and compare against the combat's current round/index to determine expiry. The `tick_on_combatant_id` field allows an effect to tick on a different combatant's turn than the one bearing the effect (for "until the start of the caster's next turn" durations).

### Effect Lifecycle

1. An automation `IEffect` node creates an `InitiativeEffect` and adds it to the target combatant.
2. Concentration conflicts are resolved immediately: adding a concentration effect removes all existing concentration effects on the caster.
3. Parent-child relationships enable cascading removal (removing a parent removes all children).
4. Effects modify combatant stats through the `InitPassiveEffect` passive effect system.
5. Effects can grant attacks (`AttackInteraction`) and Discord buttons (`ButtonInteraction`) that trigger sub-automations when clicked.

### HP Management

Simple mutable state: `combatant.hp` is directly set. `modify_hp()` handles temp HP absorption. Concentration checks are prompted on damage (DC = max(damage/2, 10)) but not enforced --- the bot displays the DC and trusts players.

## Content vs Engine Boundary

### Three-Layer Content Model

1. **Compendium / Game Data** (`gamedata/`) --- SRD content (spells, monsters, classes, feats, items) loaded from JSON files or D&D Beyond API. Each entity has metadata (source, entitlement ID) for content licensing.

2. **Automation** (`cogs5e/models/automation/`) --- the effect tree interpreter is content-agnostic. A Fireball and a homebrew spell use the exact same node types. Automation JSON is attached to entities via the `AutomatibleMixin`.

3. **Character Sheets** (`cogs5e/models/sheet/`, `cogs5e/models/character.py`) --- `StatBlock` is the universal interface. Characters are loaded from D&D Beyond, Dicecloud, or Google Sheets. The `PlayerCombatant` delegates to the `Character` for live stats.

### Homebrew Integration

Homebrew uses the same `Automation` tree format as official content. The `automation-common` library (separate repo) defines validation schemas. Users can:
- Create custom spells/attacks with automation via the web editor (avrae.io)
- Define "Tomes" (homebrew spell packs) and "Packs" (homebrew item packs)
- Import community-shared automation from the Workshop

### D&D Beyond Integration (`ddb/`)

Live character sync via D&D Beyond API. Entitlement checking ensures users only access content they've purchased. The `Compendium` class manages a global content registry loaded at bot startup.

## Verification Story

### Test Coverage

- **E2E tests** (~2,100 LOC): Full Discord command simulation using mocked bot context. Tests for automation effects (`automation_effects_test.py`, 757 LOC), initiative commands (`initTracker_test.py`, 542 LOC), game tracking, aliasing.
- **Unit tests** (~3,400 LOC): Dice rolling, argument parsing, resistances, selection UI, evaluator sandboxing.
- **Static test data** (`tests/static/`): JSON fixtures for automation effect testing.
- **CI**: GitHub Actions workflow, codecov integration.

### What Is Not Verified

- No property-based testing or model checking
- No formal verification of automation tree semantics
- No invariant checking on combat state transitions
- Resistance/immunity resolution is tested but edge cases (stacking, ordering) rely on manual testing
- Concentration and effect duration ticking are tested at e2e level but not exhaustively

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Automation tree as data, not code.** Avrae's biggest insight: combat actions are JSON trees of typed effect nodes (Attack, Save, Damage, Condition, IEffect), not imperative code. This makes every spell and feature a data document that can be serialized, shared, imported, and inspected. Our Quint spec already captures action semantics declaratively --- but avrae shows how a content-authoring system can use the same pattern for extensibility.

2. **Branching node design (Attack/Save/Condition).** The hit/miss and success/fail child lists are an elegant encoding of the "if attack hits, then deal damage, else nothing" pattern. Each branching node resolves its condition and selects a subtree. This is essentially a lightweight decision tree embedded in the automation, analogous to our Quint match/variant patterns. The pattern makes it trivial to add half-damage-on-save, miss effects, conditional extra damage, etc.

3. **Metavar dataflow between sibling nodes.** `lastDamage`, `lastAttackDidHit`, `lastSaveRollTotal` --- these metavars create a communication channel between nodes in the tree without explicit wiring. Downstream nodes can reference upstream results. This solves the "damage depends on attack roll" and "secondary effect depends on save result" problems naturally.

4. **Passive effect descriptor system (`InitPassiveEffect`).** The `_PassiveEffect` Python descriptor that auto-registers serialization/deserialization/stringification per field is a clean pattern for defining many similar typed fields with minimal boilerplate. The mapper/reducer fold over active effects for computing derived stats (AC with bonuses, resistances from multiple sources) is simple and correct.

5. **Effect parenting for cascading removal.** Parent-child relationships between `InitiativeEffect` instances enable "remove concentration removes all child effects" cleanly. The `InitEffectReference` indirection (combatant_id + effect_id) makes this work across combatants.

6. **Concentration as a first-class constraint.** Adding a concentration effect automatically removes all prior concentration effects on the caster. This is enforced at the `Combatant.add_effect()` level, not left to the automation author.

### Anti-Patterns (For Us)

1. **Mutable state everywhere.** Combat, combatants, HP, effects --- all mutated in place. No snapshots, no undo, no replay. The `modify_hp()` method directly mutates `self._hp`. This is pragmatic for a Discord bot but fundamentally incompatible with our immutable-state Quint model.

2. **No rules enforcement.** Avrae is a combat *tracker*, not a combat *engine*. It does not enforce action economy, movement, spell slot consumption (beyond what automation explicitly checks), legal targets, or turn order. Players can `!init hp Goblin set 0` at any time. Our project's value proposition is the opposite: the spec IS the rules.

3. **Async/sync duplication.** `from_dict` and `from_dict_sync`, `from_ctx` and `from_ctx_sync` --- the code is duplicated because `PlayerCombatant` deserialization needs to fetch the character. Our TypeScript + XState approach avoids this entirely.

4. **Discord coupling throughout.** `AutomationContext` takes a `disnake.Embed` and queues display text alongside computation. The embed-building is interleaved with effect resolution. Our project correctly separates computation (XState) from presentation (React).

5. **Stringly-typed passive effects.** Save bonuses are strings like `"1d4|wis"`, parsed with regex at read time. Advantage is tracked as sets of 3-letter stat abbreviations. This is fragile and hard to verify. Our typed Quint/TS approach catches these errors at compile time.

6. **No formal model of turn/round semantics.** Effect duration ticking logic (`on_turn`, `end_round` calculation, `will_tick_this_round`) is spread across `InitiativeEffect.new()` and `InitiativeEffect.on_turn()` with subtle index comparisons. Edge cases (effect added mid-round, combatant removed, group index) are handled ad hoc. Our Quint spec models turn structure formally.

7. **Global state via class-level caches.** `Combat._cache` is a class-level TTL cache. Combatant `_cache` dicts hold computed attacks and effect maps. Cache invalidation is manual and easy to miss.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `cogs5e/initiative/cog.py` | 1,624 | Discord commands for initiative tracking |
| `cogs5e/models/character.py` | 886 | Character model, sheet integration |
| `cogs5e/initiative/combatant.py` | 856 | Combatant/MonsterCombatant/PlayerCombatant |
| `aliasing/evaluators.py` | 807 | Draconic scripting evaluators |
| `cogs5e/initiative/combat.py` | 697 | Combat state, turn management, persistence |
| `gamedata/monster.py` | 655 | Monster model |
| `gamedata/lookuputils.py` | 645 | Content lookup and entitlement checking |
| `cogs5e/models/automation/effects/ieffect.py` | 611 | IEffect automation node (apply initiative effects) |
| `cogs5e/initiative/upenn_nlp.py` | 597 | NLP recording for research |
| `aliasing/api/combat.py` | 669 | Alias API for combat manipulation |
| `aliasing/api/statblock.py` | 968 | Alias API for character stat access |
| `cogs5e/initiative/effects/effect.py` | 428 | InitiativeEffect lifecycle, duration, parenting |
| `cogs5e/models/automation/effects/usecounter.py` | 383 | UseCounter node (resource tracking) |
| `cogs5e/models/automation/runtime.py` | 382 | AutomationContext (execution environment) |
| `cogs5e/models/automation/effects/check.py` | 354 | Check node (ability/skill checks) |
| `cogs5e/initiative/effects/passive.py` | 344 | InitPassiveEffect (stat modifiers from effects) |
| `cogs5e/models/sheet/resistance.py` | 331 | Resistance model and resolution |
| `cogs5e/models/sheet/base.py` | 315 | BaseStats, Levels, Skills, Saves |
| `cogs5e/models/automation/results.py` | 301 | Frozen dataclass result tree |
| `cogs5e/models/automation/effects/attack.py` | 282 | Attack node (to-hit, crit, advantage) |
| `cogs5e/models/sheet/attack.py` | 278 | Attack model (wrapper around Automation) |
| `cogs5e/models/automation/effects/target.py` | 230 | Target node (all/self/parent/indexed) |
| `cogs5e/models/automation/effects/damage.py` | 213 | Damage node (crit, resistance, dtype) |
| `cogs5e/models/automation/effects/save.py` | 196 | Save node (DC, advantage, ieffects) |
| `cogs5e/models/automation/effects/__init__.py` | 157 | Effect base class, EFFECT_MAP registry |
| `cogs5e/models/automation/__init__.py` | 148 | Automation class (tree root, run method) |
| `cogs5e/models/automation/effects/condition.py` | 90 | Condition node (expression branching) |
| `gamedata/action.py` | 76 | Action model with AutomatibleMixin |
| `gamedata/mixins.py` | 51 | AutomatibleMixin, DescribableMixin |
| `tests/e2e/automation_effects_test.py` | 757 | E2E tests for automation nodes |
| `tests/e2e/cogs/initTracker_test.py` | 542 | E2E tests for initiative tracking |
