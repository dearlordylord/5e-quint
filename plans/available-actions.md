# Plan: Available Actions Module & Live Suggestion Pipeline

> Source PRD: `PRD_AVAILABLE_ACTIONS.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Three-step execution contract**: `get_available_actions` returns `ActionToken` values (query-time shape). `execute_action` accepts `ResolvedActionToken` values (user-facing holes filled, no engine-only fields). Core then resolves that token into a `ResolutionRequest`, and the runtime layer supplies engine-only inputs (dice rolls, turn-start runtime facts) to produce the final `DndEvent`.
- **`execute_action` MCP input schema is derived from `ResolvedActionToken`**: Effect Schema `Schema.Union`, discriminated on `type`, generated from the supported resolved-token variants rather than hand-writing a union over all machine event types. `JSONSchema.make()` generates the MCP tool schema. Validation via `Schema.decodeUnknownEither`.
- **MCP tool surface**: Three tools — `get_state`, `get_available_actions`, `execute_action`. Independent process from React app, instantiates its own XState actor. Low-level MCP SDK (`Server` + `setRequestHandler`), not the high-level `McpServer` class (which is zod-only).
- **Supported action spec is the source of truth for the executable surface**: The available-actions module owns the supported action registry. For each supported action, the registry defines the query token, resolved execute shape, runtime-input requirements, and final `DndEvent` mapping. State topology (which events the machine accepts in which state) is still derived from `rootEventHandlers` + `turnPhaseConfig`.
- **Grouping axis**: Actions grouped by resource cost (action, bonus action, reaction, free/movement). No ordering within groups. Permanent — we do not rank by tactical value or optimality.
- **No confidence scoring**: Permanent design decision. Player goals are opaque; we present options, never rank them.
- **Cacheability**: Every layer boundary is an Effect service with test/mock/cached layers. Audio segments, transcript text, LLM calls, candidate events — all cacheable and replayable.
- **Module placement**: Available actions is a pure function `(DndContext, machineState) → ActionToken[]` in `packages/core/src/available-actions.ts`. Not inside the machine (projection, not transition). `packages/mcp/` is the MCP server process; it imports `@dnd/core`. `packages/app/` is the React demo; it also imports `@dnd/core`. Neither app nor mcp duplicates logic — both consume from core.
- **Package layout**: `packages/core/` holds ActionToken types, available-actions module, and all machine logic. `packages/mcp/` is the MCP server process. `packages/app/` is the React demo. MCP imports `@dnd/core`; app imports `@dnd/core`.
- **Legality from guards**: The available actions module queries the same XState guards that MBT validates against the Quint spec. No redundant legality logic.
- **Engine-only inputs are runtime-owned**: Dice rolls, turn-start runtime facts, and similar non-user inputs are supplied after token resolution by the runtime layer (MCP for now, later possibly a session/battle manager). The MCP caller never provides those directly.
- **Executable surface stays narrow until coverage is complete**: Do not expose actions through `get_available_actions` unless the full path exists and is tested: action token → resolved action token → runtime inputs → `DndEvent` → accepted machine transition.
- **Multi-creature forward compatibility**: Target and trigger fields are optional in the token schema from phase 1. Not populated until battle-level phases. No character-only code to erase later.

---

## Phase 1: Single action tracer bullet

**User stories**: 1, 2, 4, 5

### What to build

Pick one action type — Second Wind is a good candidate (bonus action, has a guard `canSecondWind`, costs a class resource charge, produces a healing outcome with a dice range). Build the thinnest possible end-to-end path around the new three-step contract:

- Define the query-time `ActionToken` schema and execute-time `ResolvedActionToken` schema.
- Implement the available actions module returning only supported action tokens when guards and state topology allow them.
- Implement core action resolution: resolved token → runtime-input request → final `DndEvent`.
- Stand up the MCP server with all three tools. `get_state` returns DndContext. `get_available_actions` returns the supported token set grouped by cost. `execute_action` accepts a resolved token, runtime-resolves engine-only fields, sends the event, and returns the new state.
- Verify: connect Claude Desktop to the MCP server. Ask "what can my character do?" — get the supported action set back. Execute one — see state change.

### Acceptance criteria

- [x] Action token utilities are defined with `Hole<T>`, `MaybeHole<T>`, `FillHoles<T>` mapping (see PRD "Action Token Type Design")
- [x] Core distinguishes `ActionToken`, `ResolvedActionToken`, and runtime resolution to `DndEvent`
- [x] Available actions module returns only the supported executable action subset, including Second Wind when `canSecondWind` passes
- [x] MCP server runs as an independent process with its own XState actor
- [x] `get_state` returns current DndContext as JSON
- [x] `get_available_actions` returns action tokens grouped by resource cost
- [x] `execute_action` accepts a resolved token, runtime-resolves engine-only inputs, applies the event, and returns new state + description
- [x] Round-trip integration test: get actions → resolve token → execute → verify state changed
- [x] Focused creature MBT confirmation passes after the contract redesign
- [x] Manual MCP harness run confirms post-action state transitions via returned snapshots, not only success booleans

### Phase 1 TODOs

Items discovered during implementation that need resolution before Phase 1 is complete:

**Turn-start runtime facts ownership**: `START_TURN` is now zero-payload at the consumer boundary, but the runtime layer still supplies placeholder values for `isGrappling`, `grappledTargetTwoSizesSmaller`, and `startOfTurnEffects`. Fix: derive these from authoritative domain state or a session/battle manager. The MCP caller should not provide or remember them.

**Broaden the supported executable surface gradually**: the current implementation intentionally exposes only a narrow supported subset (`ENTER_COMBAT`, `START_TURN`, `USE_SECOND_WIND`, `EXIT_COMBAT`). Each new action must add all of: query token, resolved token schema, runtime-input requirements, final `DndEvent` mapping, and focused tests.

**`USE_HEROIC_INSPIRATION` guard**: Token builder is missing because the guard isn't wired in `machine-guards.ts`. Need to add the guard, then add the token builder.

**`knownMetamagicOptions` in `SorcererClassState`**: `USE_METAMAGIC` token currently offers all 10 metamagic options. Should filter to character's known options (2-6 depending on level). Requires adding the field to class state and Quint spec.

**Context serialization**: Replace `JSON.stringify` replacer with Effect Schema transforms (`Option` -> `null`, `Set` -> `array`). Define a `DndContextEncoded` schema in core using `Schema.OptionFromNullOr` and `Schema.ReadonlySet`.

**Manual debugging ergonomics**: Keep a lightweight local MCP harness for end-to-end inspection of `get_state`, `get_available_actions`, and `execute_action`. If an action is hard to exercise manually, prefer adjusting demo initial conditions or adding a small temporary fixture over adding duplicated persistent state.

**Project existing state before adding more**: If MCP needs to expose or drive more “inner state”, first project authoritative machine/spec state that already exists. Do not add adapter-owned copies of combat facts just to make demos or debugging easier.

**Wire remaining `execute_action` handlers**:
- Dice-roll actions: `USE_TIRELESS` (d8Roll), `WHOLENESS_OF_BODY` (healRoll), `UNCANNY_METABOLISM` (healRoll)
- Battle-context actions: `USE_RELENTLESS_RAGE` (conSaveSucceeded), `USE_TACTICAL_MIND` (boostedCheckSucceeds), `USE_PEERLESS_SKILL` (success)
- Hole-field pass-throughs: `CONVERT_SLOT_TO_POINTS`, `CONVERT_POINTS_TO_SLOT`, `USE_ARCANE_RECOVERY`, `USE_MYSTIC_ARCANUM`, `USE_FONT_SLOT_RESTORE`, `USE_WILD_RESURGENCE_CHARGE`, `USE_DIVINE_SMITE`, `USE_LAY_ON_HANDS`, `USE_METAMAGIC` (all slotLevel/amount/option)
- Complex payload: `SHORT_REST` (conMod, hdRolls)

---

## Phase 1.5: Turn-start and grapple-state ownership

**User stories**: 1, 4, 5, 9

### What to build

Make `START_TURN` runtime facts come from authoritative domain state rather than MCP placeholders, with grapple as the first concrete case.

- Keep `START_TURN` zero-payload at the consumer boundary.
- Move `isGrappling` and `grappledTargetTwoSizesSmaller` out of MCP-owned placeholder logic and into spec/machine/session-owned state.
- Model grapple as persistent combat state, not caller memory. User-supplied grapple events should establish or remove grapple state; subsequent turn-start logic should derive from that owned state.
- Move `startOfTurnEffects` to the same ownership pattern: derive from authoritative effect/session state rather than fabricating `[]` in the adapter.

### Acceptance criteria

- [ ] `START_TURN` consumer input remains `{ type: "START_TURN" }`
- [ ] Runtime derives grapple-related turn-start inputs from authoritative domain state
- [ ] MCP no longer hardcodes grapple booleans
- [ ] Focused tests confirm that grapple-establishing events affect later `START_TURN` behavior without caller bookkeeping
- [ ] Creature/battle parity still holds after the grapple-state ownership change

---

## Phase 2: Action economy coverage

**User stories**: 1, 2

### What to build

Extend the available actions module to cover one representative action per resource-cost group, so the grouping structure is exercised end-to-end:

- **Action**: A straightforward action-cost event (e.g., Dash — deterministic, grants extra movement).
- **Bonus Action**: Second Wind (already done in phase 1).
- **Reaction**: An event that costs the reaction (e.g., a reaction-costed class feature or spell if one is currently modeled).
- **Free / movement**: Stand from prone (costs movement), object interaction, or similar zero-action-economy event.

The MCP response from `get_available_actions` now returns tokens organized into resource-cost groups. A consumer sees the turn budget structure.

### Acceptance criteria

- [ ] At least one action from each resource group (action, bonus action, reaction, free/movement) is returned when its guard passes
- [ ] `get_available_actions` response is grouped by resource cost
- [ ] Each action's outcome description accurately reflects what the action does (cost + what changes)
- [ ] Guards correctly exclude actions when resources are spent (e.g., no Action-cost tokens when `actionsRemaining === 0`)
- [ ] Snapshot test for a representative character state confirms expected grouping shape

---

## Phase 3: Choice holes (spellcasting)

**User stories**: 3, 4

### What to build

Add spell casting — the first action type with non-trivial choice holes. A spell token doesn't enumerate every spell x slot combination; it groups them:

- Token for a known spell includes a choice hole for slot level, listing available slots that can cast it (including upcasts).
- Multiple spells at the same slot level may be grouped.
- The consumer picks spell + slot, fills the holes, sends the token back to `execute_action`.

This exercises the full command-with-holes pattern under the new contract: `get_available_actions` returns `ActionToken` values with typed choice slots, the consumer fills them into `ResolvedActionToken` values, `execute_action` validates them, the runtime layer supplies engine-only inputs, and the machine applies the resulting event.

### Acceptance criteria

- [ ] Spell tokens include `choose: { slot: [...available levels...] }` with valid upcast options
- [ ] No combinatorial explosion — spells are not multiplied by slot levels into separate tokens
- [ ] Filling a spell token with a valid slot level and calling `execute_action` succeeds via the resolved-token/runtime-input pipeline
- [ ] Filling with an invalid slot level (e.g., no slots remaining at that level) is rejected
- [ ] Spell tokens only appear when the character has the relevant spell slots and meets casting prerequisites (action/bonus action available, not incapacitated)

---

## Phase 4: Full event catalog

**User stories**: 9, 10

### What to build

Extend the event type catalog and available actions module to cover every event type in the `DndEvent` union. This is the breadth pass after phases 1-3 proved the depth.

- Complete the `EVENT_TYPES` const array — every event type in the union is listed.
- The available actions module queries guards for all event types and builds tokens for each legal one, but only exposes actions whose full execute contract is implemented.
- Optional multi-creature fields (target, trigger context) are present in the token schema but not populated — forward compatibility for battle-level phases.
- Property-based testing validates the contract: every returned token is executable, every omitted event type is actually illegal in the current state.

### Acceptance criteria

- [ ] `EVENT_TYPES` array includes every member of the `DndEvent["type"]` union — compile error if any are missing
- [ ] Available actions module returns tokens for all legal actions in a given state, not just the representative subset from phases 1-3
- [ ] Property-based test: for any generated DndContext, every returned token (filled with any valid choice) resolves through the supported execution contract and is accepted by the machine
- [ ] Property-based test: for any generated DndContext, no event type absent from the result is accepted by the machine in that state
- [ ] Multi-creature fields (target, trigger) exist as optional in token schema, are not populated
- [ ] Snapshot tests for multiple character archetypes (Fighter, Wizard, multiclass) confirm expected token sets

---

## Phase 5: Hellenvald transcript prototype

**User stories**: 7, 8

### What to build

In the Hellenvald project (`/workspace/typescript/osr-hellenvald`), build the transcript-to-events pipeline. Text in, candidate game events out. No audio — text input simulating phrase-level Whisper segments.

- CLI interface (stdin, line-buffered) where you type natural D&D speech.
- LLM interpretation layer: given a text window + current game state (via Hellenvald's ReadModelStore), produce candidate events. Multiple candidates when ambiguous, single candidate when clear.
- Effect-based caching/mocking for LLM calls. Recorded responses for deterministic replay and demos (fake timeouts to simulate LLM latency without live dependency).
- "Electric field" documentation: each design choice annotated with what changes when this moves to the D&D project (hard guards instead of soft warnings, Quint spec validation, MBT parity).

### Acceptance criteria

- [ ] CLI accepts typed natural language input and produces structured candidate events
- [ ] LLM interpretation layer is an Effect service with test/mock/cached layers
- [ ] Cached replay test: recorded input → expected candidates, no live LLM needed
- [ ] Multiple candidates produced for ambiguous input (e.g., "I attack" when multiple targets exist)
- [ ] Single candidate produced for unambiguous input
- [ ] "Electric field" annotations present in code/docs for key design choices
- [ ] Demo mode works with mocked LLM responses and optional fake latency

---

## Phase 6: DM_OVERRIDE + warnings

**User story**: 6

### What to build

Add the ability to accept mechanically incorrect rulings from the table and warn about them. The machine stays strict — a new `DM_OVERRIDE` event type is the spec-legal way to represent "the table ruled this, RAW notwithstanding."

- `DM_OVERRIDE` event in the Quint spec and XState machine. Accepts an arbitrary state change that would otherwise fail guards.
- Warning emission layer outside the machine — when a `DM_OVERRIDE` is used, the observation layer records which guard(s) it bypassed and what RAW violation occurred.
- MCP `execute_action` returns warnings alongside state changes. The consumer sees both "here's the new state" and "this violated rule X."

### Acceptance criteria

- [ ] `DM_OVERRIDE` event type exists in spec and machine
- [ ] An action that fails normal guards can be applied via `DM_OVERRIDE`
- [ ] Warning includes which rule was violated (reference to guard / spec rule)
- [ ] MCP `execute_action` response includes warnings array when `DM_OVERRIDE` is used
- [ ] Normal (non-override) actions produce no warnings
- [ ] MBT validates that `DM_OVERRIDE` doesn't break spec parity for the state fields it modifies

---

## Phase 7: Streaming transcript + buffering

**User story**: 8

### What to build

Add audio input to the Hellenvald transcript pipeline. Whisper processes recorded audio into phrase-level segments. A buffering layer groups segments into complete game actions before passing to the LLM interpretation layer.

- Whisper integration: recorded audio file → timestamped segments.
- Two-level buffering: phrase level (Whisper segments) → turn level (complete game action spanning multiple phrases).
- Buffering heuristics: pauses, dice-result patterns, DM response patterns.
- Cached audio segments for replay testing.
- Branching tail: near the end of the stream, uncommitted candidates are materialized. Farther back, collapsed to selected events.

### Acceptance criteria

- [ ] Recorded audio file → Whisper → phrase-level segments with timestamps
- [ ] Buffering layer groups related segments into complete action descriptions
- [ ] Buffering correctly handles multi-segment actions ("I swing at him" + "that's a 17 plus 5")
- [ ] Audio segments are cacheable — integration tests replay recorded segments
- [ ] Branching tail: uncommitted candidates visible near stream end, collapsed farther back
- [ ] End-to-end: recorded audio → segments → buffered groups → LLM → candidate events

---

## Phase 8: Port transcript pipeline to D&D project

**User stories**: 7, 8, 9

### What to build

Port the proven transcript pipeline from Hellenvald into the D&D project. Replace Hellenvald's soft validation with Quint spec-backed hard legality. The pipeline produces candidate events; the available actions module and spec guards validate them; MBT verifies correctness.

- Transcript pipeline adapted for D&D event types (from the full event catalog in phase 4).
- Candidate events validated against XState guards. Legal candidates are applied. Illegal candidates trigger warnings (using `DM_OVERRIDE` from phase 6 if the table insists).
- MBT verification: transcript-derived events produce correct state transitions matching the Quint spec.
- Full pipeline cacheability: audio → transcript → LLM → candidates → spec validation → state.
- MCP integration: the transcript pipeline feeds into the same `get_available_actions` / resolved-token `execute_action` interface.

### Acceptance criteria

- [ ] Transcript pipeline runs in the D&D project using D&D event types
- [ ] Candidate events are validated against XState guards (spec-backed legality)
- [ ] Illegal candidates produce warnings (not silent rejection)
- [ ] MBT test: transcript-derived event sequences produce state transitions matching Quint spec
- [ ] Full pipeline cacheable at every layer boundary
- [ ] MCP tools work with transcript-derived state: `get_available_actions` reflects state after transcript events applied
- [ ] End-to-end demo: cached audio → transcript → events → spec validation → available actions via MCP
