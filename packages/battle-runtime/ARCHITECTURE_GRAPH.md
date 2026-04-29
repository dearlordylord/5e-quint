# Battle Runtime Architecture Graph

This is a data-flow map of the `@dnd/battle-runtime` reducer. It owns the
battle protocol for package callers: initialize combatants, discover battle
subjects, replay caller fills, resolve state transitions, and expose snapshots.

The legacy Correction graph remains useful source material for future Unit
activation work, but this graph is the package-owned map for battle runtime
behavior.

## System Graph

```mermaid
flowchart TD
  CharacterSheet["Character Sheet + selected Unit refs<br/>owner: composition layer<br/>why: finalized PC facts enter battle without importing character creation"]
  StatBlock["StatBlockRecord<br/>owner: @dnd/surface catalog/composition<br/>why: monster/NPC authored facts enter battle without Core catalogs"]
  Init["BattleCreatureInit[]<br/>input to startBattle<br/>why: one-time battle initialization boundary<br/>without: battle would import source package state directly"]
  State["BattleState<br/>data: battle id, initiative, combatants, current-turn resources<br/>why: durable legality/replay input<br/>without: discovery and resolution would not share one combat snapshot"]
  Creature["BattleCreatureState<br/>data: HP, temp HP, AC state, conditions, zero-HP lifecycle, origin<br/>why: shared combat view for Character-derived and Stat Block-derived creatures<br/>without: runtime branches on source objects instead of combat facts"]
  Origin["origin<br/>data: Character or Stat Block origin facts retained for supported act discovery<br/>why: source attribution without a second executable content language<br/>without: battle either loses selected capability facts or imports source package state"]
  ArmorClass["ArmorClassState helpers<br/>input: combatant.armorClass<br/>success: current Armor Class<br/>why: attack rolls compare against derived AC without storing a duplicate scalar"]
  ActionEconomy["action-economy-algebra<br/>input: BattleTurnResources<br/>success: can spend/spend/reset action resources<br/>why: one turn-resource model; no scalar action quota"]
  AttackRoll["attack-roll-algebra<br/>input: AttackRollResult + Armor Class<br/>success: SRD natural 1/20 and AC hit fact<br/>why: one d20 attack-roll adjudication path"]
  RuntimeDice["runtime-dice-algebra<br/>input: rolled dice groups + weapon damage dice expression<br/>success: validated dice count/range facts<br/>why: one dice-roll validation path"]
  Discover["discoverBattleActs(state)<br/>success: AvailableBattleAct[] = subject + label + summary + initial holes<br/>why: public act discovery API<br/>without: callers duplicate legality checks"]
  Subject["BattleSubject<br/>srdAction.attack or runtimeCommand.endTurn<br/>why: stable caller-selected branch identity"]
  FillSession["caller-owned BattleFill[]<br/>data: accumulated answers for a selected subject<br/>why: replay-from-root input<br/>without: partially answered forms become durable battle state"]
  Resolve["resolveBattleSubject(state, subject, fills)<br/>success: resolved next BattleState<br/>continuation: needsHoles<br/>invalid: stale subject, wrong actor, bad fill, unsupported subject/shape<br/>why: top-level replay/refill dispatcher"]
  EndTurn["End Turn resolution<br/>success: next initiative actor + reset turn action economy<br/>why: runtime command for turn advancement"]
  AttackReplay["Attack replay<br/>needs target -> attack roll -> damage on hit<br/>success: miss spends action, hit applies damage then spends action<br/>why: staged holes match the SRD attack sequence"]
  Damage["apply HP damage<br/>success: temp HP absorbed first, HP clamped at 0, zero-HP lifecycle applied<br/>why: one HP mutation boundary"]
  Snapshot["snapshotBattle(state)<br/>success: JSON-friendly read model<br/>why: callers do not depend on internal Map state"]

  CharacterSheet --> Init
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
  Resolve -->|srdAction.attack| AttackReplay
  AttackReplay --> AttackRoll
  AttackReplay --> RuntimeDice
  AttackReplay --> Damage --> State
  ArmorClass --> AttackRoll
  ActionEconomy --> Discover
  ActionEconomy --> AttackReplay

  classDef implemented fill:#eef6ff,stroke:#2563eb,color:#172554;
  class CharacterSheet,StatBlock,Init,State,Creature,Origin,ArmorClass,ActionEconomy,AttackRoll,RuntimeDice,Discover,Subject,FillSession,Resolve,EndTurn,AttackReplay,Damage,Snapshot implemented;
```

## Interpretation Graph

```mermaid
flowchart TD
  Subject["BattleSubject<br/>srdAction(actorId, attack) or runtimeCommand(actorId, endTurn)"]
  CurrentActor["actorId === currentActing(state.initiative)<br/>success: continue<br/>failure: invalid wrongActor<br/>why: subject legality is turn-local"]
  EndTurn["runtimeCommand.endTurn<br/>success: resolved next turn<br/>invalid: fills are not accepted"]
  Attack["srdAction.attack<br/>success: staged target/roll/damage replay<br/>invalid: actor missing, unsupported shape, no action resource, bad fills"]
  AttackProfile["supported character weapon attack profile<br/>source: BattleCreatureState.origin<br/>why: implemented slice discovers character weapon attacks only"]
  Target["target choice<br/>needsHoles until caller selects another combatant"]
  Roll["attack roll<br/>needsHoles until caller supplies AttackRollResult"]
  HitCheck["attackRollHits(roll, target AC)<br/>hit: ask/apply damage<br/>miss: spend action"]
  DamageHole["damage roll<br/>needsHoles only after a hit"]
  Apply["apply damage + spend action<br/>success: resolved next BattleState"]

  Subject --> CurrentActor
  CurrentActor --> EndTurn
  CurrentActor --> Attack --> AttackProfile --> Target --> Roll --> HitCheck
  HitCheck -->|hit| DamageHole --> Apply
  HitCheck -->|miss| Apply

  classDef implemented fill:#eef6ff,stroke:#2563eb,color:#172554;
  class Subject,CurrentActor,EndTurn,Attack,AttackProfile,Target,Roll,HitCheck,DamageHole,Apply implemented;
```

## Implemented Slice Boundaries

- Public subjects are `srdAction.attack` and `runtimeCommand.endTurn`.
- Fills are caller/session state, not durable `BattleState`.
- Attack replay uses target, attack-roll, and on-hit damage holes.
- Stat Block-derived creatures can be initialized and damaged, but Stat Block
  attack actions are not implemented yet.
- Character-derived attacks come from a supported weapon attack profile
  assembled at the composition boundary.
- Bonus-action availability can be represented in turn resources, but no
  bonus-action subject is exposed yet.
- The package-local QNT slice constrains this implemented subset; `battle.qnt`
  remains the broad combat authority until reconciliation.

## Relationship To Surface Runtime Correction

`packages/surface-runtime-correction/ARCHITECTURE_GRAPH.md` documents a broader
Correction reducer: Unit subjects, cantrip discovery, save-gate effects,
healing, extra-action grants, spell-slot/use-count gates, and other Unit
activation machinery. Those concepts are source material for future battle
runtime growth, not current `@dnd/battle-runtime` architecture.
