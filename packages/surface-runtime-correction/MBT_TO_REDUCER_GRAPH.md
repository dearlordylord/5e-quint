# MBT To Reducer Graph

This package keeps model-based tests small on purpose. Each Quint file models one reducer algebra, and the TypeScript MBT driver replays that Quint transition system against the TypeScript module that production code also imports.

The MBT entry points do not currently prove `resolveSubjectHoles` as one large state machine. They prove the smaller sub-reducers that the main reducer composes, while `reducer-boundaries.test.ts` covers the public discovery/resolution wiring.

## Ownership Note

`@dnd/shared/initiative-algebra` and `@dnd/shared/conditions-algebra` are already package-neutral domain primitives, so this package imports and MBT-checks them directly.

The newer death-save, armor-class, and action-economy reducers intentionally stay local to `surface-runtime-correction` for now. Their MBT specs check the local TypeScript modules against the local Quint models:

- death saves are tied to `CreatureState`, zero-HP lifecycle policy, healing, and damage;
- armor class is the reducer-local structured state for armor/equipment reducer facts, regardless of whether those facts later come from Surface, fixtures, or another caller;
- action economy is tied to this reducer's current turn-resource fields and current Surface activation-cost support.

Promotion rule:

- move pure, package-neutral algebra to `@dnd/shared`;
- move battle-owned lifecycle/action semantics to `@dnd/core` when they become canonical runtime behavior;
- keep Surface projection glue near the Surface/correction runtime.

MBT is evidence about behavior, not ownership. Passing MBT does not make a module canonical; canonical status is decided by where the repo wants that rule to live and which callers should depend on it.

## Entry Points

```mermaid
flowchart TD
  subgraph Q["Quint MBT specs"]
    QInitiative["initiative-algebra-mbt.qnt"]
    QConditions["conditions-algebra-mbt.qnt"]
    QDeath["death-saves-algebra-mbt.qnt"]
    QArmor["armor-class-algebra-mbt.qnt"]
    QAction["action-economy-algebra-mbt.qnt"]
  end

  subgraph D["Vitest + quint-connect drivers"]
    DInitiative["initiative-algebra.mbt.test.ts"]
    DConditions["conditions-algebra.mbt.test.ts"]
    DDeath["death-saves-algebra.mbt.test.ts"]
    DArmor["armor-class-algebra.mbt.test.ts"]
    DAction["action-economy-algebra.mbt.test.ts"]
  end

  subgraph TS["TypeScript algebra modules"]
    TSInitiative["@dnd/shared/initiative-algebra"]
    TSConditions["@dnd/shared/conditions-algebra"]
    TSDeath["reducer-death-saves.ts"]
    TSArmor["reducer-armor-class.ts"]
    TSAction["reducer-action-economy.ts"]
  end

  QInitiative --> DInitiative --> TSInitiative
  QConditions --> DConditions --> TSConditions
  QDeath --> DDeath --> TSDeath
  QArmor --> DArmor --> TSArmor
  QAction --> DAction --> TSAction
```

Each driver uses the same shape:

```ts
await run({
  spec,
  init: "init",
  step: "step",
  driver,
  backend: "typescript",
  stateCheck,
});
```

Quint chooses traces. The driver exposes matching action names. After every step, `stateCheck` compares the normalized Quint state with the TypeScript module state.

## Reducer Composition

```mermaid
flowchart TD
  State["State<br/>initiative, combatants, action economy"]
  Discovery["discoverAvailableActs(state)"]
  Interpreted["discoverInterpretedActs(state)"]
  Resolve["resolveSubjectHoles(state, request)"]
  Phase["resolveFilledActivationPhase(...)"]

  subgraph Algebra["MBT-backed algebra modules"]
    Initiative["initiative-algebra<br/>currentActing / nextInitiative"]
    Conditions["conditions-algebra<br/>has/apply/remove condition"]
    Action["reducer-action-economy<br/>can/spend/reset resources"]
    Armor["reducer-armor-class<br/>currentCreatureArmorClass"]
    Death["reducer-death-saves<br/>death-save counters"]
  end

  Lifecycle["reducer-creature-lifecycle<br/>damage/heal/death-save policy"]
  CoreActs["reducer-core-acts<br/>canCurrentActorAct / canUseCoreAttack"]
  CoreAttack["reducer-core-attack<br/>core attack hole protocol"]
  Holes["runtime-holes + reducer-hole-refilling<br/>project/validate/refill holes"]

  State --> Discovery --> Interpreted
  State --> Resolve
  Interpreted --> Resolve
  Resolve --> CoreAttack
  Resolve --> Phase

  Initiative --> State
  Initiative --> Resolve
  Conditions --> CoreActs
  Conditions --> Lifecycle
  Action --> CoreActs
  Action --> Interpreted
  Action --> Resolve
  Armor --> Phase
  Death --> Lifecycle
  Lifecycle --> Phase
  CoreActs --> Interpreted
  CoreActs --> CoreAttack
  Holes --> Interpreted
  Holes --> Resolve
```

The important connection is that MBT drivers and production reducer code import the same TypeScript modules. For example, action-economy MBT validates `spendActivationResource`, and `resolveSubjectHoles` uses that same function when a unit is resolved.

## Coverage Status

Legend:

- **MBT-covered module with reducer usage:** MBT covers the TS module, and the main reducer imports some or all of that module in discovery/resolution.
- **Implemented + reducer-used, not MBT-covered:** production reducer uses it, but only unit/boundary tests cover it today.
- **Implemented + MBT, partially reducer-used:** MBT covers the algebra, but the main reducer currently uses only part of that algebra.
- **Missing:** explicit frontier or no integrated proof exists yet.

```mermaid
flowchart TD
  classDef full fill:#ecfdf5,stroke:#047857,color:#064e3b;
  classDef partial fill:#fffbeb,stroke:#b45309,color:#78350f;
  classDef reducerOnly fill:#eff6ff,stroke:#2563eb,color:#1e3a8a;
  classDef missing fill:#fff1f2,stroke:#be123c,stroke-dasharray:6 4,color:#881337;

  subgraph Used["MBT-covered module with reducer usage"]
    InitiativeFull["initiative algebra<br/>MBT: yes<br/>Reducer: current actor + end turn"]
    ConditionsFull["conditions algebra<br/>MBT: yes<br/>Reducer: incapacitated/unconscious lifecycle"]
    DeathPureFull["death-save counter algebra<br/>MBT: yes<br/>Reducer: damage/heal lifecycle helpers<br/>Unused now: start-turn roll path"]
    ArmorFull["armor-class algebra<br/>MBT: yes<br/>Reducer: unit attack AC comparison<br/>Unused now: Surface armor/equipment projection"]
  end

  subgraph Partial["Implemented + MBT, partially reducer-used"]
    ActionPartial["action economy algebra<br/>MBT: action/free/bonus/reset<br/>Reducer: action spend/reset now; bonus/free only resolver-ready"]
  end

  subgraph ReducerOnly["Implemented + reducer-used, not MBT-covered"]
    LifecycleOnly["creature lifecycle<br/>damage/heal/zero-HP policy<br/>Tests: unit + reducer-boundary"]
    SupportOnly["Surface support gate<br/>UnitRecord -> supported slice<br/>Tests: reducer-support + boundaries"]
    HolesOnly["runtime holes/refilling<br/>project/validate/replay holes<br/>Tests: runtime-holes + boundaries"]
    PublicReducerOnly["public reducer flow<br/>discoverAvailableActs / resolveSubjectHoles<br/>Tests: reducer-boundaries"]
  end

  subgraph Missing["Missing or explicit frontier"]
    IntegratedMbtMissing["integrated reducer MBT<br/>Surface act -> holes -> resolution -> state"]
    SurfaceMbtQuestion["OPEN QUESTION<br/>whether/where to MBT Surface fact projection"]
    CoreAttackMissing["core Attack adjudication<br/>target + roll + damage still frontier"]
    SaveGateMissing["save_gate outcome application"]
    GrantExtraActionMissing["grant_extra_action execution"]
    UpcastUsesMissing["upcast slots / use counts / other once-turn limits"]
    StartTurnDeathSaveMissing["start-turn death-save reducer path"]
  end

  DeathPureFull --> LifecycleOnly
  ConditionsFull --> LifecycleOnly
  LifecycleOnly --> PublicReducerOnly
  InitiativeFull --> PublicReducerOnly
  ActionPartial --> PublicReducerOnly
  ArmorFull --> PublicReducerOnly
  SupportOnly --> PublicReducerOnly
  HolesOnly --> PublicReducerOnly

  IntegratedMbtMissing -. would cover .-> PublicReducerOnly
  SurfaceMbtQuestion -. would clarify .-> SupportOnly

  class InitiativeFull,ConditionsFull,DeathPureFull,ArmorFull full;
  class ActionPartial partial;
  class LifecycleOnly,SupportOnly,HolesOnly,PublicReducerOnly reducerOnly;
  class IntegratedMbtMissing,SurfaceMbtQuestion,CoreAttackMissing,SaveGateMissing,GrantExtraActionMissing,UpcastUsesMissing,StartTurnDeathSaveMissing missing;
```

The key non-obvious status is death saves. The pure counter algebra is MBT-covered. The composed creature lifecycle that decides whether a creature dies at 0 HP, uses death saves, becomes unconscious, or resets counters on healing is not MBT-covered yet; it is covered by reducer unit tests and reducer boundary tests. The start-turn death-save roll path is missing from the public reducer. It is a "wire soon" item because the pure counter and creature lifecycle helpers already exist; what is missing is the reducer act/window that asks for the death save roll at the right turn boundary.

The key action-economy status is similar. The algebra supports action, free action, bonus action, and reset. The public discovery lane currently exposes action cantrips only, so bonus/free-action algebra is implemented but only exercised when an explicit supported unit subject reaches resolution. Wiring bonus/free actions into discovery is a "wire later" item because it depends on broader supported Surface units, not just the algebra.

Armor-class math is MBT-covered and used for unit attack AC comparison. Surface armor/equipment projection into `ArmorClassState` does not exist yet. That belongs to the open Surface/MBT boundary discussion: first decide the Surface fact projection contract, then decide whether that contract needs ordinary tests, MBT, or both.

## Surface Boundary

The full Surface-to-reducer data-flow graph belongs in `ARCHITECTURE_GRAPH.md`. This document only records the MBT boundary.

The Quint MBT specs do not parse or execute Surface directly. They model reducer facts after Surface has already been decoded, support-checked, and converted into reducer-facing state or runtime holes.

Current MBT validates reducer algebra over reducer facts, not Surface facts. The adjacent unit/boundary tests cover the current Surface-to-reducer boundary:

- `UnitRecord`s sit on `CreatureState.units`.
- `reducer-support.ts` decides whether an authored unit is inside this reducer slice.
- `runtime-holes.ts` projects supported Surface holes/effects into reducer-facing runtime holes.
- `resolveSubjectHoles` consumes the projected holes and then calls MBT-backed reducer algebra where needed.

The distinction matters: a reducer fact is something like "this activation costs one action", "this target has AC 18", or "this runtime hole asks for an attack roll". A Surface fact is authored content shape: `UnitRecord`, phases, attachments, effects, dice expressions, equipment, and other content-level data.

Whether Surface fact projection should get MBT is an open question. For now, this document must not assume a Surface projection MBT exists or must exist. The current concrete coverage is ordinary unit/boundary testing around support gates, runtime-hole projection, and reducer execution.

## Surface And State Explosion Policy

The project-wide battle model should not enumerate every concrete Surface-authored state. That would fight the architecture: combat semantics are proved over abstract mechanics and caller-provided inputs, while content, spatial facts, and table rulings enter through explicit projection/input boundaries.

That gives two current MBT layers plus one open design question:

```mermaid
flowchart TD
  Small["Small algebra MBT<br/>projected facts -> reducer algebra"]
  Integrated["Narrow integrated reducer MBT<br/>one Surface-backed act -> public reducer flow -> state transition"]
  SurfaceQuestion["OPEN QUESTION<br/>whether Surface fact projection needs MBT"]
  Avoid["Do not build<br/>all Surface content x all battle states"]

  Small --> Integrated
  SurfaceQuestion -. must be decided separately .-> Integrated
  Integrated -. avoid state explosion .-> Avoid

  classDef good fill:#ecfdf5,stroke:#047857,color:#064e3b;
  classDef open fill:#eff6ff,stroke:#2563eb,stroke-dasharray:6 4,color:#1e3a8a;
  classDef warn fill:#fff1f2,stroke:#be123c,stroke-dasharray:6 4,color:#881337;
  class Small,Integrated good;
  class SurfaceQuestion open;
  class Avoid warn;
```

Current `.qnt` files are the first layer. They should stay post-projection and should not parse Surface `UnitRecord`s or Surface JSON.

The open Surface projection question should be decided using representative contracts, not all content. Possible examples to evaluate:

- `fire_bolt`: Surface unit -> support gate -> target/attack/damage holes -> AC comparison -> action spend -> HP/death lifecycle.
- Armor/equipment: Surface armor/shield facts -> `ArmorClassState` -> `currentArmorClass`.
- Healing spell: Surface `cure_wounds` unit -> target/healing-roll holes -> spell slot/action spend -> lifecycle healing.

Do not make the full battle MBT enumerate all Surface content and all concrete runtime states. If Surface projection gets MBT later, keep it as projection-contract checks and keep battle semantics abstract where the architecture already treats inputs as caller/session/table-provided.

## Current Coverage Boundary

```mermaid
flowchart TD
  MBT["MBT proves small algebra modules"]
  Boundary["reducer-boundaries.test.ts covers public reducer wiring"]
  Future["Open integrated reducer MBT"]

  MBT --> Boundary
  Boundary --> Future

  Future["Potential next slice:<br/>Surface fire_bolt UnitRecord<br/>target + attack roll + damage holes<br/>AC comparison<br/>action spend<br/>HP/death lifecycle"]
```

This split is deliberate for state explosion. The small algebras are composable and independently checkable. The public reducer tests make sure those same modules are used in discovery and resolution. If integrated reducer MBT is added, it should cover one narrow vertical Surface-backed reducer slice rather than all combat at once.

## Missing Work List

Missing entirely:

- Integrated reducer MBT for a real Surface-backed act.
- Decision on whether Surface fact projection should have MBT, ordinary tests, or both.
- Core `Attack` adjudication and state mutation.
- `save_gate` outcome execution.
- `grant_extra_action` execution.
- Upcast slots, use counts, and other once-per-turn limits.
- Start-turn death-save transition in the public reducer.

Implemented but not fully utilized by MBT:

- Creature lifecycle composition (`damageCreatureHp`, `healCreatureHp`, zero-HP policy).
- Public reducer discovery/resolution flow.
- Surface support gate and runtime-hole projection/refilling.

Implemented but not fully utilized by main reducer logic:

- Bonus/free-action action-economy spending is implemented in the sub-reducer; discovery of bonus/free-action unit acts is not wired yet.
- Armor algebra is ready to receive projected armor/equipment reducer facts; the Surface-to-armor projection contract is undecided and not implemented.
- Death-save counter algebra is ready for start-turn death-save rolls; the public reducer has no start-turn death-save act/window yet.

Likely wire soon:

- Start-turn death-save act/window. The algebra and lifecycle helpers already exist; the missing part is reducer scheduling and the roll hole/result application.
- Core attack adjudication. The hole protocol exists; the remaining work is hit comparison, action spend, and damage mutation, similar to the already implemented unit attack-roll path.

Likely wire later:

- Bonus/free-action unit discovery. The sub-reducer can spend those resources, but useful discovery depends on more supported Surface units.
- Surface armor/equipment projection. The armor reducer shape exists, but the projection contract from authored Surface equipment facts still needs design.
- Upcasts, use counts, and other once-per-turn limits. These depend on broader Surface resource semantics.
