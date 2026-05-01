# Battle Runtime Architecture Graph

This is a data-flow map of the `@dnd/battle-runtime` reducer. It owns the
battle protocol for package callers: initialize combatants, discover battle
subjects, replay caller fills, resolve state transitions, and expose snapshots.

The promoted `@dnd/battle-runtime` is the active semantic authority for new
Unit/StatBlock-backed battle behavior. `battle-runtime.qnt` is its canonical
package-local spec. The legacy Correction graph, old root `battle.qnt`, and Core
battle MBT remain useful breadth/proof source material, not active promoted
runtime authorities.

The promoted MBT strategy is selective. Shared reducer algebras remain covered
by modular MBT, broad Surface/Unit/StatBlock catalog coverage defaults to
table-driven contract tests, and integrated battle-runtime MBT is reserved for
high-risk public reducer verticals. Surface projection MBT is a separate
decision. The first selected integrated candidate is Fighter weapon Attack
against a Skeleton Stat Block target through `discoverBattleActs`,
`resolveBattleSubject`, and `snapshotBattle`.

Reducer extension follows SRD procedure families, not authored names. Surface
records and retained origin data select supported procedures; support gates
reject unsupported authored shapes before reducer replay. Add reducer state or a
new `BattleSubject` only for a reusable procedure family such as a timing
window, resource protocol, target/save flow, interrupt/Reaction flow, persistent
effect, movement procedure, or other durable transition. Do not add one branch
per Unit, spell, feature, monster action, or slug, and do not reintroduce
projected executable vocabulary.

## System Graph

```mermaid
flowchart TD
  CharacterBuild["Character Build + selected Unit refs<br/>owner: composition layer<br/>why: finalized PC facts enter battle without importing character creation"]
  StatBlock["StatBlockRecord<br/>owner: @dnd/surface catalog/composition<br/>why: monster/NPC authored facts enter battle without Core catalogs"]
  Init["BattleCreatureInit[]<br/>input to startBattle; includes caller-supplied Initiative scores<br/>why: one-time battle initialization boundary<br/>without: battle would import source package state directly"]
  State["BattleState<br/>data: battle id, initiative, combatants, pairwise distances, current-turn resources<br/>why: durable legality/replay input<br/>without: discovery and resolution would not share one combat snapshot"]
  Creature["BattleCreatureState<br/>data: HP, temp HP, AC state, conditions, zero-HP lifecycle, origin<br/>why: shared combat view for Character-derived and Stat Block-derived creatures<br/>without: runtime branches on source objects instead of combat facts"]
  Origin["origin<br/>data: Character or Stat Block origin facts retained for supported act discovery<br/>why: source attribution without a second executable content language<br/>without: battle either loses selected capability facts or imports source package state"]
  ArmorClass["ArmorClassState helpers<br/>input: combatant.armorClass<br/>success: current Armor Class<br/>why: attack rolls compare against derived AC without storing a duplicate scalar"]
  ActionEconomy["action-economy-algebra<br/>input: BattleTurnResources<br/>success: can spend/spend/reset action resources<br/>why: one turn-resource model; no scalar action quota"]
  AttackRoll["attack-roll-algebra<br/>input: AttackRollResult + Armor Class<br/>success: SRD natural 1/20 and AC hit fact<br/>why: one d20 attack-roll adjudication path"]
  RuntimeDice["runtime-dice-algebra<br/>input: rolled dice groups + weapon damage dice expression<br/>success: validated dice count/range facts<br/>why: one dice-roll validation path"]
  Discover["discoverBattleActs(state)<br/>success: AvailableBattleAct[] = subject + label + summary + initial holes<br/>why: public act discovery API<br/>without: callers duplicate legality checks"]
  Subject["BattleSubject<br/>action.attack, actionSpell, unitFeature, or runtimeCommand.endTurn<br/>why: stable caller-selected replay key, including turn-start Death Saving Throw fills"]
  FillSession["caller-owned BattleFill[]<br/>data: accumulated answers for a selected subject<br/>why: replay-from-root input<br/>without: partially answered forms become durable battle state"]
  Resolve["resolveBattleSubject(state, subject, fills)<br/>success: resolved next BattleState<br/>continuation: needsHoles<br/>invalid: stale subject, wrong actor, bad fill, unsupported subject/shape<br/>why: top-level replay/refill dispatcher"]
  EndTurn["End Turn resolution<br/>success: next initiative actor + reset turn action economy<br/>why: runtime command for turn advancement"]
  Support["support gates/readers<br/>success: authored shape selects a supported procedure family<br/>invalid: unsupported authored shape fails before reducer replay"]
  AttackOption["supported Attack action option<br/>source: character selected weapon or StatBlockRecord named attack<br/>why: attack bonus, damage, reach or normal range, and attack identity derive from authored inputs"]
  UnitFeature["Unit feature activation<br/>source: retained Unit + runtime use-count state<br/>success: Action Surge grants one non-Magic action; Second Wind spends Bonus Action and heals"]
  SpellAct["action-time spell act<br/>source: retained Spell Records + runtime Spell Slot/effect state<br/>success: consumes Magic action; Magic Missile all-darts target spends a slot; Ray of Frost records Speed effect; Acid Splash save-gate damage applies to failed saves"]
  AttackReplay["Attack replay<br/>subject carries attack name; needs target -> attack roll -> damage on hit<br/>success: miss spends action, hit applies damage then spends action<br/>why: staged holes match the SRD attack sequence without a second attack IR"]
  Damage["apply HP damage<br/>success: temp HP absorbed first, HP clamped at 0, zero-HP lifecycle applied<br/>why: one HP mutation boundary"]
  Snapshot["snapshotBattle(state)<br/>success: JSON-friendly read model<br/>why: callers do not depend on internal Map state"]

  CharacterBuild --> Init
  StatBlock --> Init
  Init --> State --> Creature
  Creature --> Origin
  Creature --> ArmorClass
  State --> ActionEconomy
  State --> Discover --> Subject
  State --> Snapshot
  State --> Resolve
  Subject --> Resolve
  FillSession --> Resolve
  Resolve -->|runtimeCommand.endTurn| EndTurn --> State
  Resolve --> Support
  Support -->|action.attack| AttackOption --> AttackReplay
  Support -->|unitFeature| UnitFeature --> State
  Support -->|actionSpell| SpellAct --> Damage
  AttackReplay --> AttackRoll
  AttackReplay --> RuntimeDice
  AttackReplay --> Damage --> State
  ArmorClass --> AttackRoll
  ActionEconomy --> Discover
  ActionEconomy --> AttackReplay

  classDef implemented fill:#eef6ff,stroke:#2563eb,color:#172554;
  class CharacterBuild,StatBlock,Init,State,Creature,Origin,ArmorClass,ActionEconomy,AttackRoll,RuntimeDice,Discover,Subject,FillSession,Resolve,EndTurn,Support,AttackOption,AttackReplay,UnitFeature,SpellAct,Damage,Snapshot implemented;
```

## Interpretation Graph

```mermaid
flowchart TD
  Subject["BattleSubject<br/>action.attack, actionSpell, unitFeature, or runtimeCommand.endTurn"]
  CurrentActor["actorId === currentActing(state.initiative)<br/>success: continue<br/>failure: invalid wrongActor<br/>why: subject legality is turn-local"]
  EndTurn["runtimeCommand.endTurn<br/>success: resolved next turn<br/>invalid: fills are not accepted"]
  Attack["action.attack + attackName<br/>success: staged target/roll/damage replay<br/>invalid: actor missing, unsupported shape, no action resource, bad fills"]
  UnitFeature["unitFeature<br/>success: spend retained feature resource and resolve supported Unit procedure<br/>invalid: no use remains, no Bonus Action, or already used this turn"]
  Magic["actionSpell + spellId<br/>success: staged action-time spell replay via Magic action<br/>invalid: unsupported spell shape, no Magic action, no slot for prepared spell"]
  AttackOption["supported Attack action option<br/>source: BattleCreatureState.origin character weapon or StatBlockRecord named attack<br/>why: selected attack identity and authored damage facts stay coupled"]
  Target["target choice<br/>choices filtered by selected attack reach or normal range and combatant distance<br/>needsHoles until caller selects a legal combatant"]
  Roll["attack roll<br/>needsHoles until caller supplies AttackRollResult"]
  HitCheck["attackRollHits(roll, target AC)<br/>hit: ask/apply damage<br/>miss: spend action"]
  DamageHole["damage roll<br/>needsHoles only after a hit"]
  Apply["apply damage + spend action<br/>success: resolved next BattleState"]

  Subject --> CurrentActor
  CurrentActor --> EndTurn
  CurrentActor --> Attack --> AttackOption --> Target --> Roll --> HitCheck
  CurrentActor --> UnitFeature
  CurrentActor --> Magic
  HitCheck -->|hit| DamageHole --> Apply
  HitCheck -->|miss| Apply

  classDef implemented fill:#eef6ff,stroke:#2563eb,color:#172554;
  class Subject,CurrentActor,EndTurn,Attack,UnitFeature,Magic,AttackOption,Target,Roll,HitCheck,DamageHole,Apply implemented;
```

## Implemented Slice Boundaries

- Public subjects are `action.attack` with an authored `attackName`,
  `actionSpell` with a retained Spell Record id, `unitFeature` with a
  retained Unit id, and `runtimeCommand.endTurn`. They select reusable runtime
  procedures; they are not a projected executable taxonomy and are not one
  reducer branch per authored slug.
- Fills are caller/session state, not durable `BattleState`.
- Reaction decisions are durable state transitions. A `needsHoles` result may
  return a `BattleState` with an `interruptStack`; MCP and other callers must
  store that state before filling the `reactionDecision` hole or any holes for
  the selected reaction procedure. The frame carries its own interrupted
  continuation so callers do not manually resume attacks, spells, saves, or
  after-damage procedures.
- Initiative scores are caller-supplied in `BattleCreatureInit`; this runtime
  orders turns from those scores but does not derive them from Stat Blocks.
- Attack replay uses target, attack-roll, and on-hit damage holes. Target
  choices are filtered from the selected attack's melee reach or normal range
  and the battle's pairwise combatant distances.
- Stat Block-derived creatures can be initialized, damaged, and use supported
  named attacks derived from `StatBlockRecord.actions.attacks`.
- Character-derived attacks come from a supported weapon Attack action option
  assembled at the composition boundary.
- Character-derived Action Surge comes from a retained Unit admitted by the
  shared Action Surge support parser plus runtime use-count state. It grants a
  Unit-sourced action resource carrying the authored non-Magic restriction.
- Character-derived Second Wind comes from a retained Unit admitted by the
  support parser for direct self-healing Bonus Action features. It asks for the
  healing roll, spends the turn Bonus Action and retained use-count resource,
  and applies HP healing through the battle HP boundary.
- Character-derived Wizard action-time spell acts come from retained Spell Records
  plus runtime Spell Slot and active-effect state. Prepared level-1 spells spend
  slots; cantrips do not. `magic_missile` is narrowed by a support gate to all
  repeated darts at one target. `ray_of_frost` requires both its Cold damage and
  Speed-reduction rider before discovery. Save-gate damage cantrips such as
  `acid_splash` use a Saving Throw outcome hole that selects in-range targets;
  damage is requested and applied only for failed outcomes.
- Stat Block damage vulnerabilities, resistances, and immunities are read from
  the retained `StatBlockRecord` at the HP mutation boundary.
- Unsupported Stat Block attack branches such as Multiattack and unsupported
  conditional on-hit riders are filtered by support gates and are not copied
  into MCP state.
- New authored abilities are data-only when they fit these implemented
  procedure families. Widen readers or support gates when the authored shape is
  legal but unsupported. Add reducer state or QNT/MBT behavior only for a
  reusable SRD procedure family, not for catalog breadth.
- Bonus-action availability is represented in turn resources. Second Wind is
  the first promoted bonus-action Unit feature subject; broader bonus-action
  spell, monster, and generic subjects remain future width.
- The package-local `battle-runtime.qnt` spec constrains this implemented
  subset. Old root `battle.qnt` remains broad legacy/Core proof and restore
  source material, not the target for new promoted behavior.
- The first integrated promoted MBT is
  `src/battle-runtime.mbt.test.ts` plus `battle-runtime.mbt.qnt`. It targets the
  public weapon Attack reducer path against Skeleton, is intentionally narrower
  than the old Core MBT, and does not require MBT for every authored Unit or
  Stat Block.

## Relationship To Surface Runtime Correction

`packages/surface-runtime-correction/ARCHITECTURE_GRAPH.md` documents a broader
Correction reducer: Unit subjects, cantrip discovery, save-gate effects,
healing, extra-action grants, spell-slot/use-count gates, and other Unit
activation machinery. Those concepts are source material for future battle
runtime width/restoration, not evidence that legacy Correction or Core remains
canonical for promoted battle behavior.
