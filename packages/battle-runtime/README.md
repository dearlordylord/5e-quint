# @dnd/battle-runtime

`@dnd/battle-runtime` owns the battle reducer for already-composed creature
inputs: starting a battle, tracking combatants and turns, discovering battle
acts, resolving fills for those acts, and producing snapshots for callers.

The package is a runtime boundary, not an authored-content package. It consumes
battle initialization data built by a composition layer from Character Builds,
Surface Units, and Surface Stat Blocks. It may retain resolved Surface records
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
| Character Build plus selected Surface Units    | `CharacterBattleCreatureInit` | `BattleCreatureState` |
| Surface `StatBlockRecord` for a monster or NPC | `StatBlockBattleCreatureInit` | `BattleCreatureState` |

Callers construct `BattleCreatureInit[]` outside this package, then call
`startBattle`. Character Build to battle-init mapping and Stat Block catalog
selection happen before this package is called.

Every `BattleCreatureInit` contains a caller-supplied Initiative score.
`@dnd/battle-runtime` orders combatants by those scores; it does not roll
Initiative, choose passive Initiative scores, or derive monster Initiative from
Stat Block modifiers during battle initialization.

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
- `BattleSubject` - the selected thing a caller wants to resolve, such as an SRD
  Attack action or the runtime End Turn command.
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
  scores;
- derive Hit Points, Armor Class, and zero-HP lifecycle policy.

Turn flow:

- track per-turn action resources through `@dnd/shared-algebras`;
- expose End Turn as a runtime command, not an SRD Action.

Available acts:

- discover End Turn for the current actor;
- discover Attack for supported character weapon attacks and supported
  Stat Block named attacks when the current actor can take actions and at least
  one target is legal for the selected attack's melee reach or normal range.

Attack and damage:

- replay Attack through target, attack-roll, and damage holes;
- carry the selected attack name in the Attack subject so authored Stat Block
  attacks such as Scimitar and Shortbow cannot be confused during replay;
- derive target choices from the selected attack's authored reach or normal
  range and the battle's pairwise combatant distance facts;
- resolve hit/miss through the shared attack-roll algebra;
- apply character weapon damage or supported Stat Block attack damage including
  the Goblin Warrior's advantage-triggered on-hit bonus damage, Critical Hit
  doubled damage dice, Temporary Hit Points, and HP clamping at `0`.

Zero-HP lifecycle:

- Stat Block combatants use `diesAtZeroHp`;
- Character Build combatants use `usesDeathSavingThrows`.

Not modeled in this package yet: Stat Block Multiattack, ranged attacks beyond
normal range with Disadvantage, Stat Block bonus-action options, unsupported
conditional attack riders, spells, reactions, bonus-action subjects, nonlethal
melee knockout, and start-turn Death Saving Throw rolls. The action-resource
state can represent bonus-action availability; this package does not yet expose
a bonus-action battle subject.

## State Ownership Rules

Battle state stores durable combat facts and origin references needed to
rediscover supported acts. It avoids duplicate scalar projections when a
structured runtime type already owns the fact.

Character-derived battle creatures keep selected Unit refs and resolved attack
facts in `origin` so battle can discover and resolve supported acts without
importing character-creation state.

Stat Block-derived battle creatures keep the generic `StatBlockRecord` in
`origin`. Supported named attacks are derived from that authored record during
discovery and replay; the runtime does not copy attack bonus, damage expression,
damage type, melee reach, or normal range into MCP state. The runtime does not
import Core monster catalogs or SRD-specific Stat Block collection types.

Armor Class is structured `ArmorClassState`, not a copied scalar. Turn resources
use `RuntimeActionResource[]`; the runtime does not store a scalar action quota.
Zero-HP lifecycle is a typed union on each `BattleCreatureState`.

## Parity

`battle-runtime-slice.qnt` is the package-local parity slice for this runtime's
implemented subset. Broad combat authority remains `battle.qnt` until this
package-local slice is reconciled into the canonical battle spec.

Reducer tests cover the TypeScript runtime behavior and the package-local Quint
slice. Broad Core MBT is still owned by `@dnd/core`.

When changing battle behavior in this package, update `src/index.ts`, focused
reducer tests, and `battle-runtime-slice.qnt` together. Check `battle.qnt` for
canonical SRD combat semantics and do not intentionally diverge without an SRD
citation or `ASSUMPTIONS.md` entry.

## RAW Traceability

| Runtime behavior                   | Source                                                                                                     | Notes                                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initiative order and current actor | SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative"; `UBIQUITOUS_LANGUAGE.md` "Initiative"             | Combat is organized into rounds and turns. Initiative determines turn order.                                                                                                |
| Stat Block initialization          | SRD 5.2.1 `Rules-Glossary.md` "Stat Block"                                                                 | Monster AC, Initiative, and HP entries are Stat Block facts consumed at initialization.                                                                                     |
| Character initialization           | SRD 5.2.1 `Character-Creation.md`; Character Build produced by `@dnd/character-creation-runtime`           | This runtime consumes finalized build facts; it does not recalculate character-creation legality.                                                                           |
| Armor Class                        | SRD 5.2.1 `Playing-the-Game.md` "Armor Class"; `Equipment.md` "Armor"                                      | Armor and Shield facts are resolved before battle initialization.                                                                                                           |
| End Turn command                   | SRD 5.2.1 combat turn structure; `ASSUMPTIONS.md` A2                                                       | End Turn is a runtime command because D&D has end-of-turn trigger points, not because it is an SRD Action.                                                                  |
| Action resources                   | SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" / "Bonus Actions"; `UBIQUITOUS_LANGUAGE.md`        | The runtime tracks per-turn action resources through shared algebras.                                                                                                       |
| Attack resolution                  | SRD 5.2.1 `Rules-Glossary.md` "Attack [Action]"; `Playing-the-Game.md` "Making an Attack" / "Attack Rolls" | Attack replay chooses a target, consumes an attack roll, and compares the roll to Armor Class, with natural 1 and natural 20 overrides.                                     |
| Stat Block named attacks           | SRD 5.2.1 `Monsters/Monsters-E-G.md` "Goblin Warrior"; `Playing-the-Game.md` "Making an Attack"            | Supported Stat Block attacks derive attack bonus, reach or normal range, base on-hit damage, and the Goblin Warrior advantage bonus from the authored `StatBlockRecord`.    |
| Damage and Temporary Hit Points    | SRD 5.2.1 `Playing-the-Game.md` "Damage Rolls", "Hit Points", "Temporary Hit Points"                       | Damage uses character weapon damage plus the attack ability modifier or a supported Stat Block damage expression, applies Temporary Hit Points first, and clamps HP at `0`. |
| Zero-HP lifecycle                  | SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points"; `ASSUMPTIONS.md` A12                           | Stat Block monsters die at `0` HP. Character Build participants use the death-save lifecycle.                                                                               |
| Incapacitated action gating        | SRD 5.2.1 `Rules-Glossary.md` "Incapacitated [Condition]" and "Unconscious [Condition]"                    | Incapacitated prevents actions; Unconscious includes Incapacitated.                                                                                                         |

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
