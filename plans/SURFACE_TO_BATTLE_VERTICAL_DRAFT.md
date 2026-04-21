# Surface To Battle Vertical Draft

Curated architectural summary of the vertical from rules sources to reducers.

This file is not the scratchpad. The evolving working diagrams live in
[SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1).

## Code Anchors

```mermaid
flowchart TD
  A["Rules Sources"] --> B["Authored"]
  A --> C["Surface / DSL"]

  B --> D["Runtime typed value"]
  C --> D

  D --> E["Character reducer"]
  D --> F["Battle reducer"]

  E --> G["Table Choices"]
  F --> G
  G --> E
  G --> F

  H["Test harness / Quint MBT adapter"] --> E
  H --> F
```

Current important code anchors:

- `packages/core/src/features/spell-registry.ts`
- `packages/core/src/character-sheet-derived.ts`
- `packages/core/src/battle-spell-access.ts`
- `packages/core/src/battle-machine-actions-turn.ts`
- `packages/core/src/projected-action-bridge.ts`

Note:
- `Test harness / Quint MBT adapter` is a test-time lane, not a runtime dependency of reducers.

## Intended Vertical

```mermaid
flowchart TD
  classDef note fill:#f7f7f7,stroke:#999,stroke-dasharray: 4 4,color:#222,font-size:12px;

  subgraph SOURCES["Rules Sources (Provenance)"]
    direction TB
    SRD["SRD"]
    PHB["PHB"]
    OTHER["Other books and materials"]
  end

  subgraph CONTENT["Authored And Surface"]
    direction TB
    AUTHORED["Authored units"]
    SURFACE["Surface / DSL"]
    RUNTIME["Runtime typed value<br/>validated against schema"]
  end

  subgraph REDUCERS["Reducers"]
    direction TB
    CHARACTER["Character"]
    BATTLE["Battle"]
  end

  TABLE["Table Choices"]
  STATE["New state"]
  TEST["Test-time Quint / MBT"]

  SRD -->|Extracted| AUTHORED
  SRD -->|Extracted| SURFACE
  PHB -->|Extracted| AUTHORED
  PHB -->|Extracted| SURFACE
  OTHER -->|Extracted| AUTHORED
  OTHER -->|Extracted| SURFACE

  SURFACE -->|Is schema for| AUTHORED
  AUTHORED -->|Applied and parsed| RUNTIME
  SURFACE -->|Defines schema for| RUNTIME

  SURFACE -->|Shared language for| REDUCERS
  RUNTIME -->|Input to| REDUCERS

  TEST -->|Thru MBT adapter| REDUCERS
  REDUCERS -->|Prompts| TABLE
  TABLE -->|Informs| REDUCERS
  REDUCERS -->|Executes effects| STATE
  STATE -->|Feeds next reduction| REDUCERS

  SOURCES_NOTE["Rules sources provide provenance.<br/>They are not runtime code."]
  AUTHORED_NOTE["Authored units carry provenance<br/>and use Surface as schema.<br/>Authored content is not runtime state<br/>except in tests and fixtures."]
  RUNTIME_NOTE["Reducers should consume hydrated,<br/>validated runtime values,<br/>not raw authored content."]

  SOURCES_NOTE -. comment .-> SOURCES
  AUTHORED_NOTE -. comment .-> AUTHORED
  RUNTIME_NOTE -. comment .-> RUNTIME

  class SOURCES_NOTE,AUTHORED_NOTE,RUNTIME_NOTE note
```

## Stable Conclusions

- `Surface` is the shared language and schema. It exists in both Quint and TS.
- `Authored` content is not runtime state. It is source material that conforms to `Surface`.
- `Runtime typed value` is the honest bridge between `Authored` and reducers.
- Reducers should consume:
  - `Surface` as language
  - hydrated runtime values as input
- Table choices are part of reducer execution, not part of authored content.
- Provenance must stay distinct from structured input and from runtime projection.
- The landed correction slice now has an explicit prompt contract:
  - `discoverAvailableBattlePrompt(state)` derives the current prompt
  - `BattlePromptAnswer` is complete-answer-only
  - answering a prompt can produce either a resolved action or a newly opened follow-up prompt
- The next phase is Quint parity for this discovered prompt/action pattern, not further TS-only drift.

## Conflation Points To Avoid

```mermaid
flowchart TD
  A["Definition<br/>what the unit is"]
  B["Access<br/>how this creature can use it"]
  C["Executable shape<br/>what branches runtime may execute"]
  D["Invocation<br/>this actual cast / use / reaction"]
  E["Runtime choice or observation<br/>slot level, target, rolls, visibility"]

  A -. must not collapse with .-> B
  A -. must not collapse with .-> C
  B -. must not collapse with .-> D
  C -. may require .-> E
  D -. consumes .-> E
```

## Open Rewrite Targets

- Remove any remaining battle-init reconstruction from partial spell ingredients.
- Stop attaching runtime-owned facts too high in the model.
  - Example: save DC should not live on a generic access if only some execution branches need it.
- Remove remaining direct authored-id semantic branching from battle logic.
- Rework `projected-action-bridge.ts` separately after the battle/state entry surface is honest.
