# Battle Runtime Architecture Graph

This is a data-flow map of the `@dnd/battle-runtime` reducer. It owns the
battle protocol for package callers: initialize combatants, discover battle
subjects, replay caller fills, resolve state transitions, and expose snapshots.

The promoted `@dnd/battle-runtime` is the active semantic authority for new
Unit/StatBlock-backed battle behavior. The legacy Correction graph, old root
`battle.qnt`, and Core battle MBT remain useful breadth/proof source material
until BA reconciliation classifies or restores them.

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
  Subject["BattleSubject<br/>action.attack, actionSpell, unitFeature, or runtimeCommand.endTurn<br/>why: stable caller-selected replay key"]
  FillSession["caller-owned BattleFill[]<br/>data: accumulated answers for a selected subject<br/>why: replay-from-root input<br/>without: partially answered forms become durable battle state"]
  Resolve["resolveBattleSubject(state, subject, fills)<br/>success: resolved next BattleState<br/>continuation: needsHoles<br/>invalid: stale subject, wrong actor, bad fill, unsupported subject/shape<br/>why: top-level replay/refill dispatcher"]
  EndTurn["End Turn resolution<br/>success: next initiative actor + reset turn action economy<br/>why: runtime command for turn advancement"]
  AttackOption["supported Attack action option<br/>source: character selected weapon or StatBlockRecord named attack<br/>why: attack bonus, damage, reach or normal range, and attack identity derive from authored inputs"]
  UnitFeature["Unit feature activation<br/>source: retained Unit + runtime use-count state<br/>success: Action Surge grants one non-Magic action and spends one use"]
  SpellAct["action-time spell act<br/>source: retained Spell Records + runtime Spell Slot/effect state<br/>success: consumes Magic action; Magic Missile all-darts target spends a slot; Ray of Frost records Speed effect"]
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
  Resolve -->|action.attack| AttackOption --> AttackReplay
  Resolve -->|unitFeature| UnitFeature --> State
  Resolve -->|actionSpell| SpellAct --> Damage
  AttackReplay --> AttackRoll
  AttackReplay --> RuntimeDice
  AttackReplay --> Damage --> State
  ArmorClass --> AttackRoll
  ActionEconomy --> Discover
  ActionEconomy --> AttackReplay

  classDef implemented fill:#eef6ff,stroke:#2563eb,color:#172554;
  class CharacterBuild,StatBlock,Init,State,Creature,Origin,ArmorClass,ActionEconomy,AttackRoll,RuntimeDice,Discover,Subject,FillSession,Resolve,EndTurn,AttackOption,AttackReplay,UnitFeature,SpellAct,Damage,Snapshot implemented;
```

## Interpretation Graph

```mermaid
flowchart TD
  Subject["BattleSubject<br/>action.attack, actionSpell, unitFeature, or runtimeCommand.endTurn"]
  CurrentActor["actorId === currentActing(state.initiative)<br/>success: continue<br/>failure: invalid wrongActor<br/>why: subject legality is turn-local"]
  EndTurn["runtimeCommand.endTurn<br/>success: resolved next turn<br/>invalid: fills are not accepted"]
  Attack["action.attack + attackName<br/>success: staged target/roll/damage replay<br/>invalid: actor missing, unsupported shape, no action resource, bad fills"]
  UnitFeature["unitFeature Action Surge<br/>success: spend use-count resource and grant non-Magic action<br/>invalid: no use remains or already used this turn"]
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
  retained Unit id, and `runtimeCommand.endTurn`.
- Fills are caller/session state, not durable `BattleState`.
- Initiative scores are caller-supplied in `BattleCreatureInit`; this runtime
  orders turns from those scores but does not derive them from Stat Blocks.
- Attack replay uses target, attack-roll, and on-hit damage holes. Target
  choices are filtered from the selected attack's melee reach or normal range
  and the battle's pairwise combatant distances.
- Stat Block-derived creatures can be initialized, damaged, and use supported
  named attacks derived from `StatBlockRecord.actions.attacks`.
- Character-derived attacks come from a supported weapon Attack action option
  assembled at the composition boundary.
- Character-derived Action Surge comes from a retained Unit plus
  runtime use-count state. It grants a Unit-sourced action resource carrying
  the authored non-Magic restriction.
- Character-derived Wizard action-time spell acts come from retained Spell Records
  plus runtime Spell Slot and active-effect state. Prepared level-1 spells spend
  slots; cantrips do not. `magic_missile` is narrowed by a support gate to all
  repeated darts at one target. `ray_of_frost` requires both its Cold damage and
  Speed-reduction rider before discovery.
- Stat Block damage vulnerabilities, resistances, and immunities are read from
  the retained `StatBlockRecord` at the HP mutation boundary.
- Unsupported Stat Block attack branches such as Multiattack and unsupported
  conditional on-hit riders are filtered by support gates and are not copied
  into MCP state.
- Bonus-action availability can be represented in turn resources, but no
  bonus-action subject is exposed yet.
- The package-local QNT slice constrains this implemented subset. Old
  `battle.qnt` remains broad legacy proof/reference material until
  reconciliation, not the target for new promoted behavior.

## Relationship To Surface Runtime Correction

`packages/surface-runtime-correction/ARCHITECTURE_GRAPH.md` documents a broader
Correction reducer: Unit subjects, cantrip discovery, save-gate effects,
healing, extra-action grants, spell-slot/use-count gates, and other Unit
activation machinery. Those concepts are source material for future battle
runtime width/restoration, not evidence that legacy Correction or Core remains
canonical for promoted battle behavior.
