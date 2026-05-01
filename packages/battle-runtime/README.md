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

## Reducer Extensibility Discipline

The battle reducer interprets reusable SRD procedure families. It must not grow
one branch per Unit, spell, feature, monster action, or authored slug. Authored
content may select a supported procedure and provide that procedure's facts, but
the reducer owns the procedure's replay, state transition, and durable runtime
state.

Use this decision rule for every new authored battle ability:

- **Data-only:** add or widen authored Surface data, catalog fixtures, and
  deterministic contract tests when the ability already fits admitted readers
  and an implemented procedure family, uses existing hole flow, and needs no new
  durable runtime state. Examples include another supported one-target Stat
  Block attack shape or another weapon Attack option whose attack bonus,
  reach/range, damage dice, and damage type fit the current Attack procedure.
- **Support-profile or reader change:** update the support boundary when the SRD
  record can carry the needed facts but the current reader or support gate does
  not admit that shape yet. Unsupported legal content should fail there with a
  precise unsupported-shape issue; it should not leak partial behavior into
  `resolveBattleSubject`.
- **Reusable procedure family:** add or widen reducer behavior only when the SRD
  defines a distinct reusable resolution shape: a new timing window, resource
  spend/reset protocol, target or save procedure, interrupt/Reaction flow,
  persistent effect lifecycle, movement procedure, or other state transition
  that multiple authored records can select.
- **Runtime state widening:** add battle state only when a supported procedure
  needs durable execution facts that cannot be derived from existing battle state
  or retained origin records. Do not store derived labels, copied attack scalars,
  support-status markers, or provenance labels beside their source facts.

When a new procedure family is required, update the type boundary,
`battle-runtime.qnt`, focused reducer tests, and, for high-risk composed public
replay, integrated MBT. Catalog breadth remains a deterministic
table/contract-test problem. QNT/MBT should target procedure-family behavior and
composition, not one model trace per authored Unit, Spell Record, feature, or
Stat Block.

Projected executable vocabulary must stay out of this package. If old Core or
Correction material names a projected action, translate the SRD procedure into
Surface readers, support gates, battle subjects, holes, and reducer state
instead of restoring the projected vocabulary.

## Runtime Flow

1. Caller passes `BattleCreatureInit[]` to `startBattle` and receives a durable
   `BattleState`.
2. Caller reads `snapshotBattle(state)` and `discoverBattleActs(state)` to show
   the current battle and available acts.
3. Caller chooses a `BattleSubject` and calls
   `resolveBattleSubject({ state, subject, fills })`.
4. If the result is `needsHoles`, the caller renders those holes, stores the
   submitted fills outside `BattleState`, and calls `resolveBattleSubject` again
   with the returned durable state plus the accumulated fills.
5. If the result is `resolved`, the caller replaces the durable state with the
   returned `state`. If the result is `invalid`, the caller does not commit a new
   battle state.

`resolveBattleSubject` is replay-from-root: the `state` argument is the current
durable battle state before attempting the selected subject. Because callers
resubmit all accumulated fills on each attempt, `BattleState` stores durable
combat facts, not partially answered hole forms.

Reaction windows are the exception that proves the state handoff rule. Attack,
spell-cast, failed-save, and after-damage procedures can return a
`reactionDecision` hole with an updated `BattleState` containing the
`interruptStack`. Callers must store that returned state before resolving or
declining the Reaction. A resolved Reaction chooses one admitted procedure, such
as releasing a readied spell, spends the reactor's Reaction, replays that
procedure through its own holes if needed, and then resumes the interrupted
subject without caller-side sequencing conventions.

Ready spell acts carry the selected supported trigger on the subject as
`readyTrigger`; the stored `BattleReadiedSpell.trigger` is derived from that
runtime choice rather than patched into state later.

## Terms

- `BattleState` - durable battle state: battle id, Initiative order,
  combatants, and current-turn resources.
- `BattleCreatureState` - the durable runtime state for one creature in battle.
  It is identified by `CombatantId`.
- `StatBlockMutableResourceState` - durable mutable execution state for
  authored `StatBlockRecord` monster controls: Legendary Action uses remaining,
  X/Day uses remaining, and unavailable Recharge entries. Authored limits and
  thresholds stay on the retained Stat Block and are projected only at runtime
  boundaries that need them.
- `BattleSubject` - the replay key for one discovered act that a caller wants
  to resolve. It is caller protocol, not Surface authored content, provenance,
  or a complete taxonomy of D&D actions. Current subjects cover an Attack action
  option, an action-time spell cast via the Magic action, Unit feature
  activation, or the runtime End Turn command. Add a subject for a reusable
  runtime procedure family, not for one named ability.
- `BattleHole` - a missing runtime input needed to resolve a subject, such as an
  attack target, attack roll, or damage roll.
- `BattleFill` - caller-provided answer for a `BattleHole`.
- `interruptStack` - durable Reaction-window state. The top frame carries the
  trigger, eligible reactors, admitted reaction choices, and the interrupted
  continuation to resume after all reactors decline or the chosen Reaction
  procedure completes.
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
- discover supported Stat Block Legendary Action attacks after another
  creature's turn ends for monsters that can act, have remaining Legendary
  Action uses, and have a legal target. These spend only monster Legendary
  Action resources, not the current turn action.
- discover Action Surge from the retained Unit resource only after the shared
  Action Surge support parser admits the Unit's activation mechanics shape, it
  has a remaining use, and it has not been used this turn;
- discover Second Wind from the retained Unit resource only after the support
  parser admits the direct self-healing Bonus Action shape, it has a remaining
  use, and the current turn still has its Bonus Action;
- discover supported Wizard action-time spell acts from retained Spell Records
  and runtime Spell Slot state, unless worn armor lacks required Armor
  Training. These acts consume the Magic action; Bonus Action and Reaction
  spell subjects are not modeled by this variant.

Feature and spell resources:

- Action Surge grants a Unit-sourced action resource with the authored Surface
  restriction that excludes Magic, spends one Short/Long Rest use, and records
  the once-per-turn use in battle state;
- Second Wind asks for its `1d10` healing roll, spends the current turn's Bonus
  Action, spends one retained use-count resource, and applies healing through
  the HP clamp boundary using the retained character class level;
- prepared `magic_missile` spends one runtime level-1 Spell Slot. This first
  width slice supports the all-darts-at-one-target targeting branch and exposes
  that restriction in the target hole;
- cantrip `ray_of_frost` uses a Spell Attack modifier of spellcasting ability
  modifier plus Proficiency Bonus, applies Cold damage on a hit, and records the
  `-10` Speed effect until the start of the caster's next turn without spending
  a Spell Slot;
- cantrip save-gate damage spells such as `acid_splash` ask for selected target
  Saving Throw outcomes in one replay hole, ask for damage only when at least
  one selected target failed, and apply the rolled damage only to failed targets
  without spending a Spell Slot.

Monster resources:

- Stat Block limited-use state is initialized from authored `StatBlockRecord`
  action parts, not from UnitRecord facts or inferred monster names;
- X/Day parts track remaining uses in battle state;
- Recharge parts start available, become unavailable when used, request a d6
  roll at the start of that monster's turn while unavailable, and become
  available again when the roll meets the authored minimum;
- Legendary Action uses are initialized from the Stat Block, spend on supported
  Legendary Action attacks, and refresh at the start of the monster's turn.

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
- Stat Block limited-use and Legendary Action resources are read from retained
  `StatBlockRecord` control fields. Only mutable execution facts are stored on
  battle state; authored limits and thresholds are derived from the Stat Block
  for legality checks and snapshots. No monster control resource is inferred
  from UnitRecord facts.

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
- End Turn asks for a Death Saving Throw fill when the next actor starts their
  turn at `0` HP and is neither Stable nor dead. A failed roll adds one failure,
  a natural `1` adds two failures, a natural `20` restores `1` HP and ends
  Unconscious, and a third success makes the combatant Stable.

Zero-HP lifecycle intentionally stops before broad adventuring recovery in this
package. Stable recovery after `1d4` hours and durable zero-HP/dead character
closeout are represented by the MCP character-session handoff, not by adding
provenance labels or a parallel post-battle state model.

Not modeled in this package yet: Stat Block Multiattack, ranged attacks beyond
normal range with Disadvantage, Stat Block bonus-action options, unsupported
conditional attack riders, Magic Missile split-target replay, broad spell
effects beyond the first Wizard pressure spells, broad reactions beyond the
restored interrupt/readied/OA lanes, broad bonus-action subjects beyond Second
Wind, nonlethal melee knockout, and the zero-HP lifecycle
width listed above.

## Width Overlap Reconciliation

The first promoted width slice overlaps several old Core battle concepts. The
runtime keeps the overlap executable through typed Surface records, Character
Build facts, and battle-owned state instead of restoring the old projected
executable vocabulary.

- Action Surge matches the old Core rule shape for Fighter level 2: a Unit
  resource grants one additional action that excludes Magic, spends one
  Short/Long Rest use, and is once per turn. Discovery and resolution share one
  support parser for the admitted single-phase, single-effect Surface
  activation shape. The promoted runtime encodes the extra action as a
  restricted `RuntimeActionResource`, not a scalar action counter plus pending
  flag.
- Second Wind matches the old Core healing lane without restoring projected
  executable vocabulary: the retained Unit selects the direct self-healing
  Bonus Action procedure, the runtime asks for the `1d10` roll, spends one
  feature use and the turn Bonus Action, and heals through the same HP boundary
  used by damage and death-save recovery.
- Wizard action-time spells match the old Core distinction between prepared
  level-1 spells that spend Spell Slots and cantrips that do not for the
  implemented `magic_missile` and `ray_of_frost` lane. The promoted runtime
  intentionally does not restore old broad save-spell, reaction, ritual,
  concentration, upcast, or one-slot-per-turn coverage in this slice.
- The armor-training spell gate matches the SRD/Core consequence that worn armor
  without matching Armor Training prevents spellcasting. The gate is executable:
  composition sets `canCastSpells`, spell act discovery checks it, and runtime
  Spell Slot expenditure state is preserved rather than cleared. Missing shield
  training alone does not block spellcasting.
- Skeleton Stat Block damage modifiers match old Core damage modifier order for
  supported paths: immunity first, then resistance, then vulnerability.
  Skeleton's Bludgeoning vulnerability and Poison damage immunity are read from
  the retained `StatBlockRecord` at the HP mutation boundary. Exhaustion and
  Poisoned condition immunities remain authored Stat Block facts, but
  condition-application lanes for those facts are not restored here.

Traceability for this overlap comes from local SRD 5.2.1 text: Fighter Action
Surge (`Classes/Fighter.md:76-80`), Wizard Spellcasting
(`Classes/Wizard.md:56-82`), spell access and slots
(`Spells/Gaining-and-Casting.md:3-65`), armor casting restrictions
(`Spells/Gaining-and-Casting.md:36-38` and `Rules-Glossary.md:98-100`),
Magic-action spell casting (`Spells/Gaining-and-Casting.md:92-96` and
`Rules-Glossary.md:698-702`), spell attack modifiers
(`Spells/Gaining-and-Casting.md:176-182` and `Playing-the-Game.md:219-222`),
Magic Missile
(`Spells/Descriptions-M-P.md:85-96`), Ray of Frost
(`Spells/Descriptions-Q-R.md:41-52`), and Skeleton
(`Monsters/Monsters-P-S.md:1152-1175`).

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
Unit/StatBlock-backed battle work. `battle-runtime.qnt` is the canonical
package-local spec for this runtime's implemented subset.

Old root `battle.qnt` and Core battle MBT are legacy/Core broad proof and
restore source material. They are not the place to add new promoted runtime
behavior. Missing old-only behavior is future width/restoration work, not
evidence that old Core remains canonical.

## Proof Strategy

Promoted battle-runtime proof is intentionally layered:

- small reusable reducer algebras stay covered by modular Quint MBT in the
  shared algebra packages;
- `battle-runtime.qnt` stays the package-local deterministic reference for the
  implemented runtime subset, but self-tests and generated assertions are not
  enough for long-term composed reducer proof;
- broad Surface, Unit, Spell, and Stat Block catalog coverage defaults to
  table-driven contract tests, not one MBT per authored record;
- integrated battle-runtime QNT/MBT is reserved for selected high-risk verticals
  where public discovery, replay holes, reducer state, and snapshots interact;
- Surface projection MBT is a separate future decision and is not implied by
  adding battle-runtime MBT.

The current integrated MBT strategy is recorded in
[`plans/promoted-battle-runtime-mbt-strategy.md`](../../plans/promoted-battle-runtime-mbt-strategy.md).
The first selected candidate is Fighter weapon Attack against a Skeleton
Stat Block target through public `discoverBattleActs`, `resolveBattleSubject`,
and `snapshotBattle`.

Keep four facts separate when changing battle behavior:

- semantic authority: promoted `@dnd/battle-runtime`;
- feature breadth: old Core may still cover behavior this runtime has not
  restored yet;
- proof depth: old Core MBT is useful evidence, while promoted behavior is
  checked here by reducer tests and `battle-runtime.qnt`;
- content encoding: Surface `UnitRecord` and `StatBlockRecord` remain authored
  content, not runtime state or provenance labels.

When changing promoted battle behavior, update `src/index.ts`, focused reducer
tests, and `battle-runtime.qnt` together. Use old `battle.qnt`/Core MBT as
reference material, and record any intentional divergence from shared behavior
with an SRD citation or `ASSUMPTIONS.md` entry.

## RAW Traceability

| Runtime behavior                   | Source                                                                                                                                                                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initiative order and current actor | SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative"; `UBIQUITOUS_LANGUAGE.md` "Initiative"                                                                                                                                                                                                               | Combat is organized into rounds and turns. Initiative determines turn order. Tied Initiative order is caller-supplied because the SRD assigns tie decisions to the GM or players before runtime execution.                                                                                                                |
| Stat Block initialization          | SRD 5.2.1 `Rules-Glossary.md` "Stat Block"                                                                                                                                                                                                                                                                   | Monster AC, Initiative, and HP entries are Stat Block facts consumed at initialization.                                                                                                                                                                                                                                   |
| Character initialization           | SRD 5.2.1 `Character-Creation.md`; Character Build produced by `@dnd/character-creation-runtime`                                                                                                                                                                                                             | This runtime consumes finalized build facts; it does not recalculate character-creation legality.                                                                                                                                                                                                                         |
| Armor Class                        | SRD 5.2.1 `Playing-the-Game.md` "Armor Class"; `Equipment.md` "Armor"                                                                                                                                                                                                                                        | Armor and Shield facts are resolved before battle initialization.                                                                                                                                                                                                                                                         |
| End Turn command                   | SRD 5.2.1 combat turn structure; `ASSUMPTIONS.md` A2                                                                                                                                                                                                                                                         | End Turn is a runtime command because D&D has end-of-turn trigger points, not because it is an Action.                                                                                                                                                                                                                    |
| Action resources                   | SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" / "Bonus Actions"; `UBIQUITOUS_LANGUAGE.md`                                                                                                                                                                                                          | The runtime tracks per-turn action resources through shared algebras.                                                                                                                                                                                                                                                     |
| Attack resolution                  | SRD 5.2.1 `Rules-Glossary.md` "Attack [Action]"; `Playing-the-Game.md` "Making an Attack" / "Attack Rolls"                                                                                                                                                                                                   | Attack replay chooses a target, consumes an attack roll, and compares the roll to Armor Class, with natural 1 and natural 20 overrides.                                                                                                                                                                                   |
| Stat Block named attacks           | SRD 5.2.1 `Monsters/Monsters-E-G.md` "Goblin Warrior"; `Playing-the-Game.md` "Making an Attack"                                                                                                                                                                                                              | Supported Stat Block attacks derive attack bonus, reach or normal range, base on-hit damage, and the Goblin Warrior advantage bonus from the authored `StatBlockRecord`.                                                                                                                                                  |
| Damage and Temporary Hit Points    | SRD 5.2.1 `Playing-the-Game.md` "Damage Rolls", "Hit Points", "Temporary Hit Points"                                                                                                                                                                                                                         | Damage uses character weapon damage plus the attack ability modifier or a supported Stat Block damage expression, applies Temporary Hit Points first, and clamps HP at `0`.                                                                                                                                               |
| Action Surge                       | SRD 5.2.1 `Classes/Fighter.md` "Level 2: Action Surge"; `UBIQUITOUS_LANGUAGE.md` "Action Surge"                                                                                                                                                                                                              | Grants one additional non-Magic action, spends a retained use-count resource, and enforces once-per-turn use in battle state.                                                                                                                                                                                             |
| Second Wind                        | SRD 5.2.1 `Classes/Fighter.md` "Level 1: Second Wind"; `Playing-the-Game.md` "Bonus Actions" and "Healing"; `UBIQUITOUS_LANGUAGE.md` "Bonus Action", "Pool", and "Hit Points"                                                                                                                                | Spends a Bonus Action and one retained use-count resource, then restores `1d10 + Fighter level` HP through the runtime HP clamp boundary.                                                                                                                                                                                 |
| Wizard action-time spell acts      | SRD 5.2.1 `Classes/Wizard.md` "Spellcasting"; `Rules-Glossary.md` "Magic [Action]" / "Armor Training"; `Spells/Gaining-and-Casting.md` "Spell Slots" / "Cantrips" / "Attack Rolls"; `Spells/Descriptions-M-P.md` "Magic Missile"; `Spells/Descriptions-Q-R.md` "Ray of Frost"                                | Prepared level-1 `magic_missile` spends a runtime Spell Slot and supports the all-darts-at-one-target branch. Cantrip `ray_of_frost` uses spellcasting ability modifier + Proficiency Bonus for the attack and records its Speed reduction. Untrained worn armor suppresses spell acts without deleting Spell Slot state. |
| Skeleton damage modifiers          | SRD 5.2.1 `Monsters/Monsters-P-S.md` "Skeleton"; `UBIQUITOUS_LANGUAGE.md` "Damage"                                                                                                                                                                                                                           | Skeleton's Bludgeoning vulnerability and Poison damage immunity modify supported damage before HP mutation.                                                                                                                                                                                                               |
| Zero-HP lifecycle                  | SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points", "Instant Death", "Falling Unconscious", "Death Saving Throws", "Damage at 0 Hit Points", "Stabilizing a Character"; `Rules-Glossary.md` "Stable"; `UBIQUITOUS_LANGUAGE.md` "Death Saving Throw", "Stable", "Instant Death"; `ASSUMPTIONS.md` A12 | Stat Block combatants use `diesAtZeroHp`; Character Build combatants use `usesDeathSavingThrows`. Implemented behavior covers drop to `0` HP, damage at `0` HP, Critical Hit damage at `0` HP, Massive Damage, and start-turn Death Saving Throw rolls through Stable/dead/natural-20 outcomes.                           |
| Incapacitated action gating        | SRD 5.2.1 `Rules-Glossary.md` "Incapacitated [Condition]" and "Unconscious [Condition]"                                                                                                                                                                                                                      | Incapacitated prevents actions; Unconscious includes Incapacitated.                                                                                                                                                                                                                                                       |

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
  spec checks.
- `src/battle-runtime.mbt.test.ts` - narrow integrated promoted MBT bridge
  that replays Fighter weapon Attack traces against a Skeleton Stat Block
  target through public reducer APIs.
- `battle-runtime.qnt` - canonical package-local spec for the implemented
  subset.
- `battle-runtime.mbt.qnt` - package-local randomized model for the selected
  integrated promoted MBT path.

Useful checks:

```sh
pnpm --filter @dnd/battle-runtime typecheck
pnpm --filter @dnd/battle-runtime test
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime.mbt.test.ts
```
