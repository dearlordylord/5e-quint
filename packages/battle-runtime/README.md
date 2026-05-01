# @dnd/battle-runtime

`@dnd/battle-runtime` owns the battle reducer for already-composed creature
inputs: starting a battle, tracking combatants and turns, discovering battle
acts, resolving fills for those acts, and producing snapshots for callers.

The package is a runtime boundary, not an authored-content package. It consumes
battle initialization data built by a composition layer from Character Builds,
Units, and Stat Blocks. It may retain resolved Surface records
or Unit refs as battle origin data, but it does not create a second executable
content language.

## Mental Model

`@dnd/surface` is the authored-content schema. Units are Surface-authored
selectable game objects such as classes, features, weapons, armor, and spells.
Stat Blocks are Surface-authored monster/NPC records. Character Builds are
finalized build-only player-character records produced outside battle.

This package starts after those records have already been selected and composed
into battle initialization inputs. It does not define spells, features, monster
catalogs, or character-building legality. It executes implemented battle
behavior from inputs that callers provide.

## Boundary

| Source outside battle                          | Composition output            | Battle-owned state    |
| ---------------------------------------------- | ----------------------------- | --------------------- |
| Character Build plus selected Units            | `CharacterBattleCreatureInit` | `BattleCreatureState` |
| Surface `StatBlockRecord` for a monster or NPC | `StatBlockBattleCreatureInit` | `BattleCreatureState` |

Callers construct `BattleCreatureInit[]` outside this package, then call
`startBattle`. Character Build to battle-init mapping and Stat Block catalog
selection happen before this package is called.

Every `BattleCreatureInit` contains a caller-supplied Initiative score.
`@dnd/battle-runtime` orders combatants by those scores; it does not roll
Initiative, choose passive Initiative scores, or derive monster Initiative from
Stat Block modifiers during battle initialization. If multiple combatants have
the same Initiative score, the caller supplies the tie decision by ordering tied
inputs in `BattleCreatureInit[]`; the runtime preserves that order.

`@dnd/battle-runtime` must not import `@dnd/character-creation-runtime` or Core
engine packages. Character Build to battle initialization mapping belongs to the
application composition layer. Stat Block selection and catalog ownership also
belong outside this package.

Do not conflate these boundaries:

- a Character Build is not a Stat Block;
- a Stat Block is not a Unit;
- a creature initialization input is not authored content;
- a creature initialization input is not durable battle state.

## Runtime Flow

1. Caller passes `BattleCreatureInit[]` to `startBattle` and receives a durable
   `BattleState`.
2. Caller reads `snapshotBattle(state)` and `discoverBattleActs(state)` to show
   the current battle and available acts.
3. Caller chooses a `BattleSubject` and calls
   `resolveBattleSubject({ state, subject, fills })`.
4. If the result is `needsHoles`, the caller renders those holes, stores the
   submitted fills outside `BattleState`, and calls `resolveBattleSubject` again
   with the same durable state plus the accumulated fills.
5. If the result is `resolved`, the caller replaces the durable state with the
   returned `state`. If the result is `invalid`, the caller does not commit a new
   battle state.

`resolveBattleSubject` is replay-from-root: the `state` argument is the current
durable battle state before attempting the selected subject. Because callers
resubmit all accumulated fills on each attempt, `BattleState` stores durable
combat facts, not partially answered hole forms.

## Terms

- `BattleState` - durable battle state: battle id, Initiative order,
  combatants, and current-turn resources.
- `BattleCreatureState` - the durable runtime state for one creature in battle.
  It is identified by `CombatantId`.
- `BattleSubject` - the replay key for one discovered act that a caller wants
  to resolve. It is caller protocol, not Surface authored content, provenance,
  or a complete taxonomy of D&D actions. Current subjects cover an Attack action
  option, an action-time spell cast via the Magic action, Unit feature
  activation, or the runtime End Turn command.
- `BattleHole` - a missing runtime input needed to resolve a subject, such as an
  attack target, attack roll, or damage roll.
- `BattleFill` - caller-provided answer for a `BattleHole`.
- `origin` - the Character or Stat Block origin data retained on a
  `BattleCreatureState`. Origin is not provenance. Provenance is the canonical
  rules/content source claimed by authored Surface records.
- Snapshot - JSON-friendly read model for callers. Snapshots do not expose
  internal `Map` state.

## Implemented Behavior

This package supports:

Initialization:

- start battle from caller-built creature initialization inputs;
- derive Initiative order and current actor from caller-supplied Initiative
  scores, preserving caller order for tied scores;
- derive Hit Points, Armor Class, and zero-HP lifecycle policy.

Turn flow:

- track per-turn action resources through `@dnd/shared-algebras`;
- reset the next actor's turn action resources when End Turn advances
  Initiative;
- expose End Turn as a runtime command, not an Action.

Available acts:

- discover End Turn for the current actor;
- discover Attack for supported character weapon attacks and supported
  Stat Block named attacks when the current actor can take actions and at least
  one target is legal for the selected attack's melee reach or normal range.
- discover Action Surge from the retained Unit resource when it has a
  remaining use and has not been used this turn;
- discover supported Wizard action-time spell acts from retained Spell Records
  and runtime Spell Slot state, unless worn armor lacks required Armor
  Training. These acts consume the Magic action; Bonus Action and Reaction
  spell subjects are not modeled by this variant.

Feature and spell resources:

- Action Surge grants a Unit-sourced action resource with the authored Surface
  restriction that excludes Magic, spends one Short/Long Rest use, and records
  the once-per-turn use in battle state;
- prepared `magic_missile` spends one runtime level-1 Spell Slot. This first
  width slice supports the all-darts-at-one-target targeting branch and exposes
  that restriction in the target hole;
- cantrip `ray_of_frost` uses a Spell Attack modifier of spellcasting ability
  modifier plus Proficiency Bonus, applies Cold damage on a hit, and records the
  `-10` Speed effect until the start of the caster's next turn without spending
  a Spell Slot.

Attack and damage:

- replay Attack through target, attack-roll, and damage holes;
- carry the selected attack name in the Attack subject so authored Stat Block
  attacks such as Scimitar and Shortbow cannot be confused during replay;
- derive target choices from the selected attack's authored reach or normal
  range and the battle's pairwise combatant distance facts;
- resolve hit/miss through the shared attack-roll algebra;
- apply character weapon damage or supported Stat Block attack damage including
  the Goblin Warrior's advantage-triggered on-hit bonus damage, Critical Hit
  doubled damage dice, Temporary Hit Points, and HP clamping at `0`;
- apply supported Stat Block damage immunities, resistances, and vulnerabilities
  before HP mutation. The first widened monster pressure is Skeleton's
  Bludgeoning vulnerability and Poison damage immunity.

Zero-HP lifecycle:

- Stat Block combatants use the typed `diesAtZeroHp` runtime policy. When
  damage or initialization leaves them at `0` HP, the snapshot projects them as
  dead through that policy.
- Character Build combatants use the typed `usesDeathSavingThrows` runtime
  policy. When damage drops them to `0` HP, they gain the Unconscious condition
  and their Death Saving Throw counters are reset.
- Damage while a Character Build combatant is already at `0` HP adds one Death
  Saving Throw failure, or two failures when the damage came from a Critical
  Hit.
- Massive Damage is applied at the HP mutation boundary. If damage reduces a
  Character Build combatant to `0` HP and the remaining damage equals or exceeds
  maximum HP, or if damage at `0` HP equals or exceeds maximum HP, the death-save
  lifecycle is marked dead.

Zero-HP lifecycle intentionally stops there for this package. Start-turn Death
Saving Throw rolls, becoming Stable from three successes or the Help action,
Stable recovery after `1d4` hours, durable zero-HP/dead character closeout, and
broader adventuring-state storage are future width. They must be restored
through battle-runtime and character-session state together, not by adding
provenance labels or a parallel post-battle state model.

Not modeled in this package yet: Stat Block Multiattack, ranged attacks beyond
normal range with Disadvantage, Stat Block bonus-action options, unsupported
conditional attack riders, Magic Missile split-target replay, broad spell
effects beyond the first Wizard pressure spells, reactions, bonus-action
subjects, nonlethal melee knockout, and the zero-HP lifecycle width listed
above. The action-resource state can represent bonus-action availability; this
package does not yet expose a bonus-action battle subject.

## State Ownership Rules

Battle state stores durable combat facts and origin references needed to
rediscover supported acts. It avoids duplicate scalar projections when a
structured runtime type already owns the fact.

Character-derived battle creatures keep selected Unit refs, resolved attack
facts, feature resource state, and spellcasting runtime state in `origin` so
battle can discover and resolve supported acts without importing
character-creation state. Character Build owns starting spell access and slot
capacity; battle state owns expended Spell Slots and feature uses once combat
starts.

Stat Block-derived battle creatures keep the generic `StatBlockRecord` in
`origin`. Supported named attacks are derived from that authored record during
discovery and replay; the runtime does not copy attack bonus, damage expression,
damage type, melee reach, or normal range into MCP state. The runtime does not
import Core monster catalogs or SRD-specific Stat Block collection types.
Damage vulnerability, resistance, and immunity are likewise read from the
retained `StatBlockRecord` at the HP mutation boundary.

Armor Class is structured `ArmorClassState`, not a copied scalar. Turn resources
use `RuntimeActionResource[]`; the runtime does not store a scalar action quota.
Zero-HP lifecycle is a typed union on each `BattleCreatureState`.

## Parity

`@dnd/battle-runtime` is the active semantic authority for new promoted
Unit/StatBlock-backed battle work. `battle-runtime-slice.qnt` is the
package-local parity slice for this runtime's implemented subset.

Old root `battle.qnt` and Core battle MBT remain legacy/broad proof and restore
source material until BA reconciliation decides their final layout. They are not
the place to add new promoted runtime behavior. Missing old-only behavior is
future width/restoration work, not evidence that old Core remains canonical.

Keep four facts separate when changing battle behavior:

- semantic authority: promoted `@dnd/battle-runtime`;
- feature breadth: old Core may still cover behavior this runtime has not
  restored yet;
- proof depth: old Core MBT is useful evidence, while promoted behavior is
  checked here by reducer tests and `battle-runtime-slice.qnt`;
- content encoding: Surface `UnitRecord` and `StatBlockRecord` remain authored
  content, not runtime state or provenance labels.

When changing promoted battle behavior, update `src/index.ts`, focused reducer
tests, and `battle-runtime-slice.qnt` together. Use old `battle.qnt`/Core MBT as
reference material, and record any intentional divergence from shared behavior
with an SRD citation or `ASSUMPTIONS.md` entry.

## RAW Traceability

| Runtime behavior                   | Source                                                                                                                                                                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initiative order and current actor | SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative"; `UBIQUITOUS_LANGUAGE.md` "Initiative"                                                                                                                                                                                                               | Combat is organized into rounds and turns. Initiative determines turn order. Tied Initiative order is caller-supplied because the SRD assigns tie decisions to the GM or players before runtime execution.                                                                                                                               |
| Stat Block initialization          | SRD 5.2.1 `Rules-Glossary.md` "Stat Block"                                                                                                                                                                                                                                                                   | Monster AC, Initiative, and HP entries are Stat Block facts consumed at initialization.                                                                                                                                                                                                                                                  |
| Character initialization           | SRD 5.2.1 `Character-Creation.md`; Character Build produced by `@dnd/character-creation-runtime`                                                                                                                                                                                                             | This runtime consumes finalized build facts; it does not recalculate character-creation legality.                                                                                                                                                                                                                                        |
| Armor Class                        | SRD 5.2.1 `Playing-the-Game.md` "Armor Class"; `Equipment.md` "Armor"                                                                                                                                                                                                                                        | Armor and Shield facts are resolved before battle initialization.                                                                                                                                                                                                                                                                        |
| End Turn command                   | SRD 5.2.1 combat turn structure; `ASSUMPTIONS.md` A2                                                                                                                                                                                                                                                         | End Turn is a runtime command because D&D has end-of-turn trigger points, not because it is an Action.                                                                                                                                                                                                                                   |
| Action resources                   | SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" / "Bonus Actions"; `UBIQUITOUS_LANGUAGE.md`                                                                                                                                                                                                          | The runtime tracks per-turn action resources through shared algebras.                                                                                                                                                                                                                                                                    |
| Attack resolution                  | SRD 5.2.1 `Rules-Glossary.md` "Attack [Action]"; `Playing-the-Game.md` "Making an Attack" / "Attack Rolls"                                                                                                                                                                                                   | Attack replay chooses a target, consumes an attack roll, and compares the roll to Armor Class, with natural 1 and natural 20 overrides.                                                                                                                                                                                                  |
| Stat Block named attacks           | SRD 5.2.1 `Monsters/Monsters-E-G.md` "Goblin Warrior"; `Playing-the-Game.md` "Making an Attack"                                                                                                                                                                                                              | Supported Stat Block attacks derive attack bonus, reach or normal range, base on-hit damage, and the Goblin Warrior advantage bonus from the authored `StatBlockRecord`.                                                                                                                                                                 |
| Damage and Temporary Hit Points    | SRD 5.2.1 `Playing-the-Game.md` "Damage Rolls", "Hit Points", "Temporary Hit Points"                                                                                                                                                                                                                         | Damage uses character weapon damage plus the attack ability modifier or a supported Stat Block damage expression, applies Temporary Hit Points first, and clamps HP at `0`.                                                                                                                                                              |
| Action Surge                       | SRD 5.2.1 `Classes/Fighter.md` "Level 2: Action Surge"; `UBIQUITOUS_LANGUAGE.md` "Action Surge"                                                                                                                                                                                                              | Grants one additional non-Magic action, spends a retained use-count resource, and enforces once-per-turn use in battle state.                                                                                                                                                                                                            |
| Wizard action-time spell acts      | SRD 5.2.1 `Classes/Wizard.md` "Spellcasting"; `Rules-Glossary.md` "Magic [Action]" / "Armor Training"; `Spells/Gaining-and-Casting.md` "Spell Slots" / "Cantrips" / "Attack Rolls"; `Spells/Descriptions-M-P.md` "Magic Missile"; `Spells/Descriptions-Q-R.md` "Ray of Frost"                                | Prepared level-1 `magic_missile` spends a runtime Spell Slot and supports the all-darts-at-one-target branch. Cantrip `ray_of_frost` uses spellcasting ability modifier + Proficiency Bonus for the attack and records its Speed reduction. Untrained worn armor suppresses spell acts without deleting Spell Slot state.                |
| Skeleton damage modifiers          | SRD 5.2.1 `Monsters/Monsters-P-S.md` "Skeleton"; `UBIQUITOUS_LANGUAGE.md` "Damage"                                                                                                                                                                                                                           | Skeleton's Bludgeoning vulnerability and Poison damage immunity modify supported damage before HP mutation.                                                                                                                                                                                                                              |
| Zero-HP lifecycle                  | SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points", "Instant Death", "Falling Unconscious", "Death Saving Throws", "Damage at 0 Hit Points", "Stabilizing a Character"; `Rules-Glossary.md` "Stable"; `UBIQUITOUS_LANGUAGE.md` "Death Saving Throw", "Stable", "Instant Death"; `ASSUMPTIONS.md` A12 | Stat Block combatants use `diesAtZeroHp`; Character Build combatants use `usesDeathSavingThrows`. Implemented behavior covers drop to `0` HP, damage at `0` HP, Critical Hit damage at `0` HP, and Massive Damage. Start-turn Death Saving Throw rolls, Stable handoff/recovery, and post-battle durable zero-HP state are future width. |
| Incapacitated action gating        | SRD 5.2.1 `Rules-Glossary.md` "Incapacitated [Condition]" and "Unconscious [Condition]"                                                                                                                                                                                                                      | Incapacitated prevents actions; Unconscious includes Incapacitated.                                                                                                                                                                                                                                                                      |

## Old Authority Divergence

For BA5 action-economy overlap, promoted runtime divergence from old root
`battle.qnt` is categorized as follows:

- **Assumption/runtime boundary:** old root `battle.qnt` can model rolling and
  sorting Initiative internally; this runtime starts after the caller has rolled
  Initiative and resolved ties, then preserves that caller-supplied order.
- **Legacy-only behavior:** old Dash, Dodge, Disengage, Ready, Help, Stand from
  Prone, mid-battle add/remove, and bonus-action subjects are not exposed here.
  They remain future width/restoration scope, not BA5 behavior.
- **Canonical promoted behavior:** End Turn is a runtime command, not a rules
  Action; action resources remain structured `RuntimeActionResource[]`, and the
  package does not introduce a duplicate scalar action quota.

## Files And Verification

- `src/index.ts` - public API and reducer implementation.
- `src/index.test.ts` - deterministic reducer tests and package-local Quint
  slice checks.
- `battle-runtime-slice.qnt` - local parity slice for the implemented subset.

Useful checks:

```sh
pnpm --filter @dnd/battle-runtime typecheck
pnpm --filter @dnd/battle-runtime test
```
