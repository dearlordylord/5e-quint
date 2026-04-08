# Plan: Available Actions Module & Live Suggestion Pipeline

> Source PRD: `PRD_AVAILABLE_ACTIONS.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Three-step execution contract**: `get_available_actions` returns `ActionToken` values (query-time shape). `execute_action` accepts `ResolvedActionToken` values (user-facing holes filled, no engine-only fields). Core then resolves that token into a `ResolutionRequest`, and the runtime layer supplies engine-only inputs (dice rolls, turn-start runtime facts) to produce the final `DndEvent`.
- **`execute_action` MCP input schema is derived from `ResolvedActionToken`**: Effect Schema `Schema.Union`, discriminated on `type`, generated from the supported resolved-token variants rather than hand-writing a union over all machine event types. `JSONSchema.make()` generates the MCP tool schema. Validation via `Schema.decodeUnknownEither`.
- **MCP tool surface**: Three tools — `get_state`, `get_available_actions`, `execute_action`. Independent process from React app, instantiates its own XState actor. Low-level MCP SDK (`Server` + `setRequestHandler`), not the high-level `McpServer` class (which is zod-only).
- **Supported action spec is the source of truth for the executable surface**: The available-actions module owns the supported action registry. For each supported action, the registry defines the query token, resolved execute shape, runtime-input requirements, and final `DndEvent` mapping. State topology (which events the machine accepts in which state) is still derived from `rootEventHandlers` + `turnPhaseConfig`.
- **Battle semantics own combat-state meaning**: `battle.qnt` is the authoritative combat spec. If the MCP layer has to remember a combat fact such as grapple state in order to drive `execute_action`, that is treated as a domain-ownership bug and should be pushed down into battle/spec/machine state, then projected outward.
- **MCP inconsistencies are a diagnostic surface**: if the MCP adapter must remember, fabricate, or re-derive a combat fact in order to execute an action, the ownership boundary is wrong. Fix the domain/spec/machine state first; do not solve ownership leaks in the adapter.
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

**Turn-start runtime facts ownership**: `START_TURN` is now zero-payload at the consumer boundary in the MCP/runtime path. Grapple-derived movement facts are machine-owned, and start-of-turn effect application is derived from owned `ActiveEffect` hooks rather than fabricated in MCP. Remaining work is to remove the last compatibility fields from the event surface and stop accepting old payload paths entirely.

**Broaden the supported executable surface gradually**: the current implementation intentionally exposes only a narrow supported subset (`ENTER_COMBAT`, `START_TURN`, `USE_SECOND_WIND`, `EXIT_COMBAT`). Each new action must add all of: query token, resolved token schema, runtime-input requirements, final `DndEvent` mapping, and focused tests.

**`USE_HEROIC_INSPIRATION` + `USE_METAMAGIC` available-actions rollout**: completed. This batch now exercises the cleaned execution contract with one root action and one filtered choice-hole action.

- **What is now true**:
  - `USE_HEROIC_INSPIRATION` is exposed through `packages/core/src/available-actions.ts` and MCP as a zero-hole root action.
  - Projection legality for Heroic Inspiration now comes from `packages/core/src/machine-guards.ts` via a dedicated helper/guard, rather than ad hoc adapter checks.
  - `USE_METAMAGIC` is exposed through the resolved-token/runtime-input pipeline as `{ type: "USE_METAMAGIC", option: MetamagicOption }`.
  - The `option` hole is filtered to the currently legal known subset, not all known options and not the global list of ten options.
  - MCP `execute_action` now accepts and executes both resolved-token variants.
- **Important semantics preserved**:
  - `USE_HEROIC_INSPIRATION` still means only “spend Heroic Inspiration if present”; it is not yet tied to a richer die/reroll context.
  - `USE_METAMAGIC` legality remains core-owned and Quint-aligned. Query-time filtering mirrors current legality, but execution remains authoritative if the caller bypasses the query surface.
  - After a non-stackable Metamagic option is used on the current cast, the `USE_METAMAGIC` token may disappear entirely for that cast if no other currently legal options remain. This is expected and should not be “fixed” by keeping stale options visible.
- **Verification completed**:
  - Focused core tests cover Heroic Inspiration exposure/spend, Metamagic legality filtering, resolve/finalize behavior, and rejection of bypassed illegal Metamagic options.
  - MCP tests cover round-trip execution of both actions.
  - No new MBT run was required for this batch because the change is action-surface exposure over already-owned semantics, not a Quint-visible behavior redesign.
- **Manual-debugging caveat**:
  - The default MCP demo actor is still the damaged Fighter 5 used for Second Wind inspection. It does not naturally expose Heroic Inspiration or Metamagic. If manual stdio inspection is needed for those actions, use a dedicated test fixture or extend the harness/demo actor intentionally rather than inferring missing state from the default demo run.

**Next orchestrator batch: broaden `execute_action` coverage in parallel, but keep one owner for the shared contract seam**.

- **Why this batch is parallelizable at all**:
  - The remaining work splits into three structural families:
    - dice-roll runtime-input actions
    - hole pass-through actions
    - battle-context boolean/result actions
  - Each family has repeated shape and repeated test needs.
- **Why it is not fully parallel**:
  - `packages/core/src/available-actions.ts` is still the single supported-action registry and resolved-token schema source.
  - `packages/core/src/machine-guards.ts` is still the shared query-time legality seam.
  - `packages/mcp/src/server.ts` is still the shared runtime-input builder / tool execution seam.
  - Those files need one orchestrator owner, or multiple workers will trip over each other.
- **Recommended ownership split for a multi-agent orchestrator**:
  - **Orchestrator/main owner**:
    - owns `packages/core/src/available-actions.ts`
    - owns `packages/core/src/machine-guards.ts`
    - owns `packages/mcp/src/server.ts`
    - owns final integration, final tests, and plan updates
  - **Worker A: dice-roll runtime-input family**
    - target actions:
      - `USE_TIRELESS`
      - `WHOLENESS_OF_BODY`
      - `UNCANNY_METABOLISM`
    - primary files:
      - `packages/core/src/available-actions.test.ts`
      - `packages/mcp/src/server.test.ts`
      - action-specific source/context reading in `machine.ts`, `machine-states.ts`, and class feature modules
    - contract to implement:
      - zero-hole resolved token
      - runtime input supplied by MCP (`d8Roll` or `healRoll`)
      - direct final `DndEvent`
  - **Worker B: hole pass-through family**
    - target actions:
      - `CONVERT_SLOT_TO_POINTS`
      - `CONVERT_POINTS_TO_SLOT`
      - `USE_ARCANE_RECOVERY`
      - `USE_MYSTIC_ARCANUM`
      - `USE_FONT_SLOT_RESTORE`
      - `USE_WILD_RESURGENCE_CHARGE`
      - `USE_DIVINE_SMITE`
      - `USE_LAY_ON_HANDS`
    - primary files:
      - focused tests first
      - source/context reading in `machine.ts`, `machine-states.ts`, and feature modules
    - contract to implement:
      - hole-bearing token filtered to currently legal numeric/domain choices
      - resolved token passes the chosen value directly through
      - runtime inputs remain `none`
  - **Worker C: battle-context result family**
    - target actions:
      - `USE_RELENTLESS_RAGE`
      - `USE_TACTICAL_MIND`
      - `USE_PEERLESS_SKILL`
    - primary files:
      - focused tests first
      - source/context reading in `machine.ts`, `machine-states.ts`, feature modules, and MBT bridge paths if semantics need checking
    - contract to implement:
      - user-facing resolved token is likely zero-hole or simple-hole
      - MCP/runtime supplies the battle-result boolean if that boolean is treated as engine-only in the current model
      - if the boolean is actually a user-facing choice in current semantics, document that explicitly before wiring it
- **Important coordination rule for the orchestrator**:
  - workers should not all edit `available-actions.ts` or `server.ts` directly
  - workers should return:
    - exact token shape needed
    - runtime-input shape needed
    - legality/filtering requirements
    - focused tests or test cases
  - then the orchestrator integrates those results into the shared registry/MCP seam
- **Current action-family context**:
  - **Dice-roll family** already has direct machine events with numeric payloads:
    - `USE_TIRELESS` uses `d8Roll`
    - `WHOLENESS_OF_BODY` uses `healRoll`
    - `UNCANNY_METABOLISM` uses `healRoll`
    - Status: completed in the available-actions/MCP surface.
    - Runtime-owned inputs stay in MCP:
      - `USE_TIRELESS` prerolls `d8Roll`
      - `UNCANNY_METABOLISM` prerolls the Martial Arts die
      - `WHOLENESS_OF_BODY` prerolls the Martial Arts die and converts it to the final heal amount expected by the current machine event
    - Caveat:
      - the current single-creature monk state stores `wholenessMax` (charge max), not the exact Wisdom modifier
      - that is exact for `WIS >= 1`, but low-WIS monks lose precision after the `minimum 1` clamp
      - if exact Wholeness text/runtime behavior for low-WIS monks matters, the machine/spec state should own explicit Wisdom-modifier information instead of reconstructing from `wholenessMax`
  - **Hole pass-through family** already has direct machine events with scalar payloads:
    - `slotLevel`, `spellLevel`, or `amount`
    - Status: completed in the available-actions/MCP surface for:
      - `CONVERT_SLOT_TO_POINTS`
      - `CONVERT_POINTS_TO_SLOT`
      - `USE_ARCANE_RECOVERY`
      - `USE_MYSTIC_ARCANUM`
      - `USE_FONT_SLOT_RESTORE`
      - `USE_WILD_RESURGENCE_CHARGE`
      - `USE_DIVINE_SMITE`
      - `USE_LAY_ON_HANDS`
    - Important query-surface rule:
      - do not rely only on the coarse top-level machine guard for these actions
      - hole options must be filtered from the update-path legality, or the MCP query surface will advertise no-op or resource-wasting choices
  - **Battle-context family** already has direct machine events with boolean payloads:
    - `conSaveSucceeded`
    - `boostedCheckSucceeds`
    - `success`
    - Status: not yet exposed.
    - Blocker:
      - the single-creature machine does not currently own enough trigger state to know that a failed check / failed attack roll / Relentless Rage 0-HP trigger is actually pending
      - exposing these actions now would over-suggest them because the existing guards are too broad
    - Required follow-up before rollout:
      - add authoritative pending-result state (for example failed-check pending / Relentless Rage trigger pending), then expose these actions through the same resolved-token/runtime-input contract
    - Pre-research for the next session:
      - `USE_TACTICAL_MIND`
        - current machine guard is effectively `fighter level >= 2 && secondWindCharges > 0`, because it hardcodes `checkFailed = true`
        - the real rule needs a pending failed ability check context before the action should be suggested
        - current machine event only wants `{ boostedCheckSucceeds: boolean }`, which should remain runtime-owned once the trigger state exists
      - `USE_PEERLESS_SKILL`
        - current machine guard is effectively `bard level >= 14 && bardicInspirationCharges > 0`
        - the real rule needs a pending failed ability check or attack roll context before the action should be suggested
        - current machine event only wants `{ success: boolean }`, which should remain runtime-owned once the trigger state exists
      - `USE_RELENTLESS_RAGE`
        - current machine guard is effectively `barbarian level >= 11 && raging`
        - the real rule needs a pending “dropped to 0 HP while raging and not dead outright” trigger before the action should be suggested
        - current machine event only wants `{ conSaveSucceeded: boolean }`, which should remain runtime-owned once the trigger state exists
    - Recommended ownership direction:
      - do not solve this by making MCP remember that a failed check or Relentless Rage trigger happened
      - add authoritative pending-trigger state to the machine/spec first, then project the zero-hole action token from that state
      - after that, keep the boolean payload in runtime inputs, not in the public resolved token
    - Likely shape of the missing state:
      - a small pending-resolution object in context, not duplicated booleans spread across the adapter
      - examples:
        - pending failed ability-check context for Tactical Mind
        - pending failed ability-check/attack-roll context for Peerless Skill
        - pending Relentless Rage trigger context including current DC
      - once that state exists, the token summary can be specific without MCP fabrication
    - Important non-goal:
      - do not expose these actions just because the coarse guard passes
      - a false-positive suggestion here is worse than an omitted action, because it teaches the wrong ownership model
    - Verification target for that future batch:
      - focused core tests proving tokens appear only when the pending trigger exists
      - MCP tests proving callers send zero-hole resolved tokens and runtime injects only the final boolean
      - if the new pending-trigger state changes Quint-visible semantics, run the appropriate MBT tier after implementation
  - `SHORT_REST` is intentionally separate and should stay out of the first orchestrated parallel batch because it has a compound payload (`conMod`, `hdRolls`) and is a larger design surface than the other remaining items.
- **Recommended implementation order for the orchestrator**:
  1. integrate the dice-roll family first
  2. integrate the hole pass-through family second
  3. integrate the battle-context family third
  4. leave `SHORT_REST` for its own dedicated batch afterward
- **Verification expectations for the orchestrator batch**:
  - focused core tests for each action family
  - MCP tests for at least one representative action per family
  - manual stdio harness inspection for one representative action per family if practical
  - MBT only if the batch changes Quint-visible semantics rather than just exposing already-owned machine behavior

**`knownMetamagicOptions` in `SorcererClassState`**: the authoritative-state and legality parts are now implemented. Remaining work is only the available-actions hole filtering when `USE_METAMAGIC` is added to the supported executable surface.

- **SRD basis**: Sorcerers choose 2 Metamagic options at level 2, gain 2 more at level 10, and 2 more at level 17. Whenever they gain a Sorcerer level, they can replace one Metamagic option with one they do not know. That means the actual known subset is character-specific and cannot be derived from level alone; level only determines the allowed count (`2`, `4`, `6`).
- **Implemented**:
  - `knownMetamagicOptions: ReadonlySet<MetamagicOption>` now exists in `SorcererClassState`.
  - Quint `SorcererState` now owns the same chosen-subset field.
  - Machine input can initialize a sorcerer with an explicit known subset.
  - Initialization validates that the chosen subset size matches `metamagicOptionsKnown(level)`.
  - `canMetamagic` / `useMetamagicUpdate` / Quint `canUseMetamagic` now reject unknown options even when the option name is globally valid.
  - MBT bridge and normalized-state comparison include the new field.
- **Current implementation caveat**:
  - Internal initialization still uses a deterministic default subset when explicit input is omitted (`careful`, `distant`, then `empowered`, `extended`, then `heightened`, `quickened`) so existing internal fixtures can construct sorcerers without a second config step.
  - This is an internal stopgap for repo-owned callers and parity fixtures, not the ideal long-term character-build model. If/when a richer character-construction path exists, it should provide the chosen subset explicitly.
- **Remaining projection change**:
  - When `USE_METAMAGIC` is added to the available-actions surface, its `option` hole must be filtered to `knownMetamagicOptions`, not `METAMAGIC_OPTIONS`.
  - The execution/update path already enforces the same known-option constraint, so the remaining work is query-surface narrowing rather than legality ownership.
- **Verification completed**:
  - Unit tests for count validation by sorcerer level (`2`/`4`/`6`).
  - Unit tests proving unknown options are rejected in the machine update path.
  - Unit tests proving known options are accepted when other Metamagic constraints pass.
  - Creature MBT passed after the spec/bridge update.

**Context serialization**: Replace `JSON.stringify` replacer with Effect Schema transforms (`Option` -> `null`, `Set` -> `array`). Define a `DndContextEncoded` schema in core using `Schema.OptionFromNullOr` and `Schema.ReadonlySet`.

**Manual debugging ergonomics**: Keep a lightweight local MCP harness for end-to-end inspection of `get_state`, `get_available_actions`, and `execute_action`. Harness runs can leave stale wrapper processes behind even after the MCP transport closes; before and after manual inspection, check `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/harness.ts'` and clean stale wrappers with `pkill -f 'pnpm --filter @dnd/mcp exec tsx src/harness.ts'` before trusting process-level observations. If an action is hard to exercise manually, prefer adjusting demo initial conditions or adding a small temporary fixture over adding duplicated persistent state.

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

Make `START_TURN` runtime facts come from authoritative domain state rather than MCP placeholders, with grapple as the first concrete case and owned effect hooks as the second.

- Keep `START_TURN` zero-payload at the consumer boundary.
- Move `isGrappling` and `grappledTargetTwoSizesSmaller` out of MCP-owned placeholder logic and into spec/machine/session-owned state.
- Model grapple from battle semantics first: battle owns the grapple link; single-creature tooling may persist only the local projection needed for speed and legality, but must not invent adapter-owned memory.
- Model grapple as persistent combat state, not caller memory. User-supplied grapple events should establish or remove grapple state; subsequent turn-start logic should derive from that owned state.
- The current single-creature implementation uses a temporary mixed local projection (`grappled` plus `grappling`) to preserve creature MBT parity while enabling owned grappler-side movement logic. This is an intentional intermediate state, not the target end state.
- Move `startOfTurnEffects` to the same ownership pattern: derive from authoritative effect/session state rather than fabricating `[]` in the adapter.
- Use a generic owned-effect hook model on `ActiveEffect` for the first pass, with explicit owner-relative timing fields shared with battle semantics.
- Preserve battle-first ownership: `battle.qnt` is the authoritative combat model, and MCP inconsistencies are treated as a diagnostic surface for ownership leaks rather than the place to solve them.

### Acceptance criteria

- [x] `START_TURN` consumer input remains `{ type: "START_TURN" }`
- [x] Runtime derives grapple-related turn-start inputs from authoritative domain state
- [x] MCP no longer hardcodes grapple booleans
- [x] Focused tests confirm that grapple-establishing events affect later `START_TURN` behavior without caller bookkeeping
- [x] Creature/battle parity still holds after the grapple-state ownership change
- [x] `START_TURN` derives owned effect applications from `ActiveEffect` state in the runtime/MCP path

### Remaining cleanup from Phase 1.5

The ownership direction is now correct, but the type surface is still mixed. The next steps should be done as a breaking cleanup, not extended with more compatibility:

1. **Break old `START_TURN` payload compatibility**
   - Remove deprecated `startOfTurnEffects` from the `START_TURN` event surface.
   - Remove any remaining tests/MBT paths that construct turn-start effect payloads directly.
   - `START_TURN` should become a fully owned-state transition except for truly engine-only prerolls.

2. **Redesign `END_TURN` ownership the same way**
   - Move end-of-turn saves/damage application toward owned `ActiveEffect.endOfTurnHook` derivation rather than caller-supplied `endOfTurnSaves` / `endOfTurnDamage`.
   - Keep the same battle-first contract: effect timing/ownership lives in spec/machine state, not MCP or caller memory.

3. **Remove the remaining old event-payload model instead of carrying it forward**
   - Do not keep deprecated compatibility fields.
   - Collapse the temporary mixed grapple projection once the old event model is gone; the local projection should no longer need to preserve legacy `GRAPPLE` semantics just for compatibility.
   - Once `START_TURN` and `END_TURN` are fully owned-state driven, delete the old hook-payload paths from core types, tests, and adapters.

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
- [x] LLM interpretation layer is an Effect service with test/mock/cached layers
- [x] Cached replay test: recorded input → expected candidates, no live LLM needed
- [x] Multiple candidates produced for ambiguous input (e.g., "I attack" when multiple targets exist)
- [x] Single candidate produced for unambiguous input
- [x] "Electric field" annotations present in code/docs for key design choices
- [ ] Demo mode works with mocked LLM responses and optional fake latency

### Phase 5 progress

**Completed (2026-04-08):** Transcript-to-events pipeline core in `/workspace/typescript/osr-hellenvald/src/transcript/`:

- `TranscriptInterpreter` Effect service (`Context.Tag`) with `mockLayer` — pattern-matches known phrases to candidate `DomainEvent`s with confidence scores. Entity resolution for named targets ("the goblin" → EntityId).
- `TranscriptPipeline` orchestration service: segments → interpreter → `ObservationEntry` → `Projector.projectLatest()`. Bridges transcript layer to existing event-sourcing infrastructure.
- `TranscriptSegment` Schema class for phrase-level input (text + timestamp + speaker hint).
- 10 tests: 6 unit (interpreter patterns), 4 end-to-end (pipeline through Projector with state verification).
- Electric field annotations on all key design points (guard validation, entity context derivation).

**Remaining for Phase 5:**
- CLI interface (stdin, line-buffered) — simple readline or Ink wrapper that feeds typed input to the pipeline.
- LLM live layer — replace mock pattern matching with actual LLM calls via an Effect service layer with caching.
- Demo mode — mocked LLM responses with optional fake latency for presentations.
- Segment buffering — grouping multiple phrase-level segments into complete game actions before interpretation.

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
