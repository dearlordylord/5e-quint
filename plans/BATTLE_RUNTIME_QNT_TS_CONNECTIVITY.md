# Battle Runtime QNT/TS Connectivity

Date: 2026-05-11

This map shows how the split is connected now. The important boundary is that
QNT and TypeScript do not call each other at production runtime. They connect
through verification lanes: focused MBT drivers, direct TS tests, and the public
trace checkpoint contract.

## End-To-End Shape

```mermaid
flowchart TB
  subgraph QNT["QNT proof/spec layer"]
    BRQ["packages/battle-runtime/battle-runtime.qnt<br/>broad battle-runtime integration shell"]
    TraceQ["battle-runtime-public-trace-contract.qnt<br/>public checkpoint order, no BattleState diffs"]

    subgraph Bridges["battle-runtime QNT bridge modules"]
      MoveBridge["battle-runtime-movement-bridge.qnt"]
      IntBridge["battle-runtime-interrupt-bridge.qnt"]
      StatBridge["battle-runtime-stat-block-bridge.qnt"]
      FeatureBridge["battle-runtime-feature-bridge.qnt"]
      SpellBridge["battle-runtime-spell-bridge.qnt"]
    end

    subgraph RuleCore["shared-algebras/proofs/rule-core"]
      ActionTurn["action-turn-procedures.qnt"]
      Movement["movement-spatial-grapple.qnt"]
      HP["hit-point-damage/recovery<br/>zero-hit-point-lifecycle.qnt"]
      DamageAdj["damage-component-adjustments.qnt"]
      AttackComp["attack-damage-composition.qnt"]
      Reactions["reactions-continuations-concentration.qnt"]
      StatControls["stat-block-controls.qnt"]
      Features["unit-feature-procedure-profiles.qnt"]
      Spells["spell-procedure-profiles.qnt"]
    end

    subgraph QntMbt["QNT MBT specs"]
      IntegratedMbtQ["battle-runtime-weapon-attack-skeleton.mbt.qnt<br/>selected integrated weapon attack lane"]
      FocusedRuntimeMbtQ["battle-runtime-*.mbt.qnt<br/>extra attack, scalar buff, object, eldritch blast,<br/>sleep repeat-save, death saves, magic missile"]
      RuleCoreMbtQ["rule-core-*.mbt.qnt<br/>movement, reactions, features, spells, stat-block controls"]
    end
  end

  subgraph TS["TypeScript runtime layer"]
    PublicIndex["src/index.ts<br/>public package API"]
    TraceTS["src/battle-trace-contract.ts<br/>projects public results to checkpoints"]

    subgraph ReducerFacade["battle reducer facade and slices"]
      BattleReducer["src/battle-reducer.ts<br/>public types, schemas, legacy facade"]
      ReducerIndex["src/battle-reducer/index.ts<br/>split TS reducer barrel"]
      Discovery["battle-discovery / hole helpers"]
      Dispatcher["dispatcher / resolveBattleSubject<br/>interrupt and replay orchestration"]
      AttackTS["attack-main / attack-resolution / damage apply"]
      MovementTS["turn-end-movement / movement-speed"]
      SpellsTS["spells-* slices<br/>profiles, holes/fills, resolve, active effects"]
      FeaturesTS["unit-feature-support / reaction modifiers"]
      StatTS["statblock-* slices"]
    end

    subgraph Tests["TS verification"]
      TraceTest["src/battle-trace-contract.test.ts"]
      PublicTests["src/index.test.ts and focused runtime tests"]
      MbtDrivers["src/*.mbt.test.ts<br/>quint-connect drivers"]
    end
  end

  BRQ --> MoveBridge
  BRQ --> IntBridge
  BRQ --> StatBridge
  BRQ --> FeatureBridge
  BRQ --> SpellBridge
  BRQ --> Reactions

  MoveBridge --> ActionTurn
  MoveBridge --> Movement
  IntBridge --> Reactions
  StatBridge --> StatControls
  FeatureBridge --> Features
  FeatureBridge --> AttackComp
  SpellBridge --> Spells
  SpellBridge --> DamageAdj
  SpellBridge --> AttackComp
  SpellBridge --> ActionTurn
  SpellBridge --> Reactions
  BRQ --> HP
  BRQ --> DamageAdj
  BRQ --> AttackComp

  PublicIndex --> BattleReducer
  PublicIndex --> ReducerIndex
  PublicIndex --> TraceTS
  ReducerIndex --> Discovery
  ReducerIndex --> Dispatcher
  ReducerIndex --> AttackTS
  ReducerIndex --> MovementTS
  ReducerIndex --> SpellsTS
  ReducerIndex --> FeaturesTS
  ReducerIndex --> StatTS
  BattleReducer --> ReducerIndex

  TraceTS --> BattleReducer
  TraceTest --> PublicIndex
  TraceTest -. mirrors checkpoint order .-> TraceQ
  PublicTests --> PublicIndex
  MbtDrivers --> PublicIndex
  MbtDrivers -. run via quint-connect .-> IntegratedMbtQ
  MbtDrivers -. run via quint-connect .-> FocusedRuntimeMbtQ
  MbtDrivers -. run via quint-connect .-> RuleCoreMbtQ

  IntegratedMbtQ --> BRQ
  FocusedRuntimeMbtQ --> BRQ
  RuleCoreMbtQ --> RuleCore

  classDef qnt fill:#eef5ff,stroke:#3567a8,color:#112;
  classDef ts fill:#effaf1,stroke:#2f7d3d,color:#112;
  classDef verify fill:#fff6df,stroke:#a87020,color:#112;
  classDef boundary fill:#f8eeee,stroke:#a43b3b,color:#112;

  class BRQ,TraceQ,MoveBridge,IntBridge,StatBridge,FeatureBridge,SpellBridge,ActionTurn,Movement,HP,DamageAdj,AttackComp,Reactions,StatControls,Features,Spells,IntegratedMbtQ,FocusedRuntimeMbtQ,RuleCoreMbtQ qnt;
  class PublicIndex,TraceTS,BattleReducer,ReducerIndex,Discovery,Dispatcher,AttackTS,MovementTS,SpellsTS,FeaturesTS,StatTS ts;
  class TraceTest,PublicTests,MbtDrivers verify;
```

## Interaction Semantics

```mermaid
flowchart LR
  subgraph QNTQNT["QNT <-> QNT"]
    Q1["battle-runtime.qnt"]
    QB["bridge qnt modules"]
    QC["rule-core qnt modules"]
    QM["mbt qnt specs"]
    Q1 -->|"imports and delegates"| QB
    QB -->|"imports pure procedure facts"| QC
    QM -->|"imports broad or rule-core authority"| Q1
    QM -->|"imports focused rule-core authority"| QC
  end

  subgraph TSTS["TS <-> TS"]
    T0["src/index.ts"]
    T1["public reducer APIs<br/>startBattle, discoverBattleActs,<br/>resolveBattleSubject, resolveBattleInterrupt,<br/>snapshotBattle"]
    T2["split reducer modules"]
    T3["battle-trace-contract.ts"]
    T0 -->|"exports"| T1
    T0 -->|"exports"| T3
    T1 -->|"dispatches into"| T2
    T3 -->|"uses public result/hole types"| T1
  end

  subgraph QNTTS["QNT <-> TS"]
    X1["quint-connect MBT drivers"]
    X2["direct checkpoint tests"]
    X3["NO production runtime call boundary"]
    X1 -->|"runs QNT traces"| QM
    X1 -->|"drives production TS APIs"| T1
    X2 -->|"compares TS public trace projection"| T3
    X2 -.->|"against QNT-owned semantic order"| Q1
    X3 -.->|"QNT is verification/spec only"| Q1
    X3 -.->|"TS runtime ships production behavior"| T1
  end
```

## What Is Connected

```mermaid
flowchart TB
  subgraph Connected["Connected and active"]
    C1["Generic SRD semantics<br/>HP, damage, action economy, movement,<br/>features, spells, reactions, stat-block controls"]
    C2["Rule-core QNT modules"]
    C3["Battle-runtime QNT bridges"]
    C4["battle-runtime.qnt integration shell"]
    C5["TS public reducer modules"]
    C6["Focused MBT and TS tests"]
    C7["Public trace checkpoint contract"]

    C1 --> C2 --> C3 --> C4
    C5 --> C6
    C2 --> C6
    C4 --> C6
    C7 --> C6
  end

  subgraph IntentionalInline["Connected by projection, intentionally not extracted"]
    I1["QNT Actor / Combatant / BattleState / ActiveEffect / Hole / replay variants"]
    I2["Package-local mutation and integration:<br/>interrupt stack, active-effect storage,<br/>concentration cleanup, concrete replay"]
    I3["Rule-core bridge inputs"]

    I1 --> I2 --> I3
  end
```

## Non-Connections And Anomaly Watchlist

```mermaid
flowchart TB
  subgraph Intended["Intentional non-connections"]
    N1["battle-runtime-public-trace-contract.qnt"]
    N2["battle-runtime.qnt"]
    N3["Production TS runtime"]
    N4["Surface authored catalogs"]
    N5["Rule-core QNT"]

    N1 -.->|"not imported by broad battle; contract is verified by TS test"| N2
    N5 -.->|"does not enumerate authored catalog width"| N4
    N2 -.->|"does not ship into production TS"| N3
  end

  subgraph Watch["Would be anomalies if introduced"]
    A1["Parallel QNT type module duplicating Actor/BattleState/ActiveEffect<br/>without direct focused imports"]
    A2["TS reducer logic that changes a rule-core-owned semantic<br/>without bridge/QNT update"]
    A3["New spell/feature local math added only to battle-runtime.qnt<br/>when a rule-core owner already exists"]
    A4["Public trace test that asserts full BattleState snapshots<br/>instead of checkpoint projection"]
    A5["Focused MBT driver reimplements reducer decisions<br/>instead of calling public TS APIs"]
    A6["QNT model enumerates full Surface catalog breadth<br/>instead of fixed procedure fixtures"]
  end

  N1 -->|"protected by"| A4
  N5 -->|"protected by"| A2
  N4 -->|"protected by"| A6
  N2 -->|"protected by"| A1
  N3 -->|"protected by"| A5
```

## Reading Guide

- Solid arrows mean a real code import/export/delegation path.
- Dotted arrows mean a verification relationship, not a production dependency.
- The broad QNT file is still connected, but its intended role is integration:
  battle-runtime state, replay, reaction windows, mutation, and smoke checks.
- Rule-core QNT owns reusable SRD procedure facts.
- TypeScript owns concrete public fill payloads, authored content shape, and
  production reducer execution.
- The public trace contract is deliberately narrow: semantic checkpoint order in
  QNT, concrete reducer trace in TS.
