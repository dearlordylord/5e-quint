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
    - Status: completed in the available-actions/MCP surface.
    - What is now true:
      - core owns an authoritative `pendingResolution` state:
        - `null`
        - `{ kind: "tacticalMind" }`
        - `{ kind: "peerlessSkill", mode: "abilityCheck" | "attackRoll" }`
        - `{ kind: "relentlessRage" }`
      - `USE_TACTICAL_MIND` appears only when a failed ability-check trigger is pending.
      - `USE_PEERLESS_SKILL` appears only when a failed ability-check or failed attack-roll trigger is pending.
      - `USE_RELENTLESS_RAGE` appears only after a real drop-to-zero transition while raging and not dead outright.
      - all 3 are exposed as zero-hole resolved tokens.
      - MCP/runtime injects only the final boolean:
        - `boostedCheckSucceeds`
        - `success`
        - `conSaveSucceeded`
    - Trigger ownership:
      - Tactical Mind and Peerless Skill use explicit internal trigger events:
        - `TRIGGER_TACTICAL_MIND`
        - `TRIGGER_PEERLESS_SKILL_ABILITY_CHECK`
        - `TRIGGER_PEERLESS_SKILL_ATTACK_ROLL`
      - Relentless Rage is not triggered by MCP or a fake helper event; the machine establishes it directly on qualifying drop-to-zero transitions.
      - pending state clears on successful/failed resolution and on the major state resets that would otherwise leave a stale trigger window.
    - Important caveat:
      - the current machine/event contract still reduces these rules to a final boolean result, not full roll math or DC accounting
      - MCP therefore only supplies opaque success/failure booleans, and the current demo runtime samples them randomly
      - this is acceptable for the current available-actions foundation, but richer battle/session-owned roll semantics should eventually replace the random MCP sampling
    - Quint/MBT parity notes:
      - `pendingResolution` now lives in `creature.qnt` `TurnState` as the creature-level projection used by current MBT parity
      - a small local helper (`withRelentlessRagePending`) was added to keep the new Quint wrapper logic from repeating the same Relentless Rage trigger snippet across multiple damage paths
      - battle-level semantic ownership is still the long-term authority, but this batch was implemented and validated at the creature parity layer
    - Verification completed:
      - focused core tests prove tokens appear only when the pending trigger exists
      - MCP tests prove callers send zero-hole resolved tokens and runtime injects only the final boolean
      - creature MBT Tier 1b passed after the bridge/spec update
  - `SHORT_REST` was intentionally left out of the first orchestrated parallel batch because it originally leaked `conMod` and required a contract redesign rather than a simple action exposure pass. That dedicated batch is now complete.
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

**Context serialization cleanup completed (2026-04-08)**

- **What is now true**
  - Core owns the encoded MCP/debug state contract in `packages/core/src/context-encoding.ts`.
  - `DndContextEncodedSchema` mirrors the `DndContext` surface that MCP returns.
  - `encodeDndContext(...)` is the single encoder used by MCP state responses.
  - `encodeDndSnapshot(...)` is the canonical snapshot encoder used for fingerprinting.
  - MCP no longer has an ad hoc `serializeContext(...)` JSON replacer in `packages/mcp/src/server.ts`.

- **Relevant files**
  - MCP adapter:
    - `packages/mcp/src/server.ts`
    - `packages/mcp/src/server.test.ts`
    - `packages/mcp/src/harness.ts`
    - `packages/mcp/src/dev-client.ts`
  - Core state/types:
    - `packages/core/src/machine-types.ts`
    - `packages/core/src/machine-class-states.ts`
    - `packages/core/src/types.ts`
    - `packages/core/src/context-encoding.ts`
  - Effect references already present locally:
    - `.references/effect/packages/effect/dtslint/Schema/Schema.tst.ts`
      - `OptionFromNullOr`
      - `ReadonlySet`

- **Encoding rules now owned in core**
  - `Option.None -> null` and `Option.Some(x) -> x` via `Schema.OptionFromNullOr(...)`
  - `ReadonlySet -> readonly array` via `Schema.ReadonlySet(...)`
  - arrays derived from sets are canonically sorted in core before encoding for:
    - `incapacitatedSources`
    - `grantedResistances`
    - `grantedVulnerabilities`
    - `grantedImmunities`
    - `knownMetamagicOptions`
    - `metamagicUsedThisCast`
    - `mysticArcanumUsed`
  - fingerprint stability also canonicalizes string-keyed records:
    - `rechargeAvailable`
    - `dailyUsesRemaining`
    - `dailyUsesMax`
  - naturally ordered arrays keep their semantic order:
    - `slotsCurrent`
    - `slotsMax`
    - `activeEffects`

- **Verification completed**
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - `pnpm --filter @dnd/mcp exec tsc --noEmit`
  - `pnpm --filter @dnd/core exec vitest run src/context-encoding.test.ts src/machine.test.ts -t "context encoding|SHORT_REST"`
  - `pnpm --filter @dnd/mcp test -- server.test.ts`
  - `pnpm --filter @dnd/mcp harness`
  - `pnpm --filter @dnd/mcp probe:short-rest`
  - wrapper cleanup check:
    - `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/harness.ts'`
    - `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/probe-short-rest.ts'`
    - `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx -e'`
    - all clear after the final run

- **Important caveat learned**
  - set canonicalization was not enough for stable fingerprinting; the monster recharge/daily-use records also needed sorted-key canonicalization or semantically equal snapshots could stringify differently.

**Manual debugging ergonomics**: Keep a lightweight local MCP harness for end-to-end inspection of `get_state`, `get_available_actions`, and `execute_action`. Prefer the checked-in scripts:
- `pnpm --filter @dnd/mcp harness`
- `pnpm --filter @dnd/mcp probe:short-rest`

They now use Effect-scoped client acquisition/release and explicitly terminate the wrapper process after the script finishes, which avoids the stale launcher behavior seen with ad hoc `pnpm --filter @dnd/mcp exec tsx -e ...` probes. If an action is hard to exercise manually, prefer adding another checked-in probe script over using `tsx -e`. If you suspect an old wrapper is still around from earlier runs, check:
- `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/harness.ts'`
- `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/probe-short-rest.ts'`
- `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx -e'`

and clean with the matching `pkill -f ...` command before trusting process-level observations.

**Project existing state before adding more**: If MCP needs to expose or drive more “inner state”, first project authoritative machine/spec state that already exists. Do not add adapter-owned copies of combat facts just to make demos or debugging easier.

**Next step after serialization cleanup**

- Finish the remaining app-package cleanup from Phase 1.5:
  - remove legacy `startOfTurnEffects`, `endOfTurnSaves`, and `endOfTurnDamage` payload construction still hidden behind `as DndEvent` casts in `packages/app/`
- Then continue Phase 2 coverage:
  - representative reaction/free-permanent grouping gaps
  - grouping-shape snapshot tests

**Wire remaining `execute_action` handlers**:
- ~~Dice-roll actions: `USE_TIRELESS` (d8Roll), `WHOLENESS_OF_BODY` (healRoll), `UNCANNY_METABOLISM` (healRoll)~~ — completed
- ~~Battle-context actions: `USE_RELENTLESS_RAGE` (conSaveSucceeded), `USE_TACTICAL_MIND` (boostedCheckSucceeds), `USE_PEERLESS_SKILL` (success)~~ — completed with owned `pendingResolution` state
- ~~Hole-field pass-throughs: `CONVERT_SLOT_TO_POINTS`, `CONVERT_POINTS_TO_SLOT`, `USE_ARCANE_RECOVERY`, `USE_MYSTIC_ARCANUM`, `USE_FONT_SLOT_RESTORE`, `USE_WILD_RESURGENCE_CHARGE`, `USE_DIVINE_SMITE`, `USE_LAY_ON_HANDS`, `USE_METAMAGIC`~~ — completed
- ~~Complex payload: `SHORT_REST` (conMod, hdRolls)~~ — completed via spend-plan + runtime-roll contract

**`SHORT_REST` batch completed (2026-04-08)**

 - **RAW used**
   - `.references/srd-5.2.1/Rules-Glossary.md`
     - `## Short Rest`
     - `## Hit Point Dice`
 - **Implemented**
   - `conMod` is now owned state:
     - `DndMachineInput` accepts `conMod`
     - `DndContext` owns `conMod`
     - `creature.qnt` `CreatureState` owns `conMod`
   - `SHORT_REST` no longer accepts caller-supplied `conMod`
   - `SPEND_HIT_DIE` no longer accepts caller-supplied `conMod`
   - `START_TURN` no longer carries the old `conMod` override; Heroic Rally uses owned state
   - short-rest healing is now `max(1, roll + conMod)` in both TS and Quint
   - starting a Short Rest now requires `!inCombat && hp >= 1`
   - the public contract is now:
     - `ActionToken`:
       - `type: "SHORT_REST"`
       - `availableHitDice: ReadonlyArray<{ className, remaining, dieSize }>`
       - token omitted entirely if a short rest would not change anything
     - `ResolvedActionToken`:
       - `type: "SHORT_REST"`
       - `spendHitDice: ReadonlyArray<ClassName>`
     - runtime input:
       - `hdRolls: ReadonlyArray<{ className, roll }>`
     - final machine event:
       - `SHORT_REST { hdRolls }`
   - runtime validation now enforces:
     - same length as `spendHitDice`
     - same class order as `spendHitDice`
     - each roll within that class’s hit-die size
 - **Important caveats learned**
   - the old default MCP demo actor surfaced a real projection bug:
     - if a short rest cannot change anything at all, exposing the token leads to `execute_action` failing with “Action was not accepted by the machine”
     - the fix is to omit the token unless the rest can actually change state
   - Quint MBT still limits `doShortRest` to at most 3 sampled hit dice for tractability
     - this is only an MBT sampling limit
     - it must not leak into the public action contract
 - **Verification completed**
   - `pnpm --filter @dnd/core exec tsc --noEmit`
   - `pnpm --filter @dnd/mcp exec tsc --noEmit`
   - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts src/machine.test.ts`
   - `pnpm --filter @dnd/mcp test -- server.test.ts`
   - manual stdio MCP probe confirmed the default demo actor no longer advertises `SHORT_REST` when no short-rest benefit exists
   - creature MBT Tier 1b passed after the spec/bridge update
     - seed: `0x6a71f4a5`
     - total: `20s`

**Next batch after `SHORT_REST`**

- `SHORT_REST` is no longer pending.
- The next technical follow-up is **context serialization cleanup**:
  - replace the MCP `JSON.stringify` replacer in `packages/mcp/src/server.ts`
  - define a core `DndContextEncoded` schema with Effect Schema transforms for `Option` and `Set`
  - keep this separate from action-surface work
    - `execute_action` with a valid plan updates HP, hit-dice pools, pact slots, and short-rest class resources
  - manual harness:
    - add a dedicated fixture rather than reusing the default Fighter 5 / Second Wind demo
  - parity:
    - run creature MBT Tier 1b after the spec/bridge update

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

Core types are clean — `startOfTurnEffects`, `endOfTurnSaves`, `endOfTurnDamage` are removed from `machine-types.ts`. The owned `ActiveEffect` hook model (`startOfTurnHook`, `endOfTurnHook` on `EffectTurnHook`) is implemented in `types.ts` and used by `machine-startturn.ts` / `machine-endturn.ts`. Owned-state fields (`expiryOwnerId`, `blocksOpportunityAttacks`, `speedDeltaFeet`) are wired.

**Remaining: app-package legacy only.** These files still construct old payload shapes behind `as DndEvent` casts:

- `packages/app/src/components/trace-visualizer/actual-play-types.ts` — `startTurn()` has `startOfTurnEffects: []`, `endTurn()` has `endOfTurnSaves: [], endOfTurnDamage: []`
- `packages/app/src/components/trace-visualizer/sample-trace.ts` — same legacy fields
- `packages/app/src/components/trace-visualizer/actual-play-skeleton.ts` — `startOfTurnEffects: []`
- `packages/app/src/components/EventPanel.tsx` — constructs `startOfTurnEffects: []`
- `packages/app/src/features/useFeatures.test.tsx` — 4 locations with `startOfTurnEffects: []`, 2 with `endOfTurnSaves: [], endOfTurnDamage: []`

Cleanup is mechanical: delete the old fields from these app helpers/tests. The `as DndEvent` casts mask the fact that core types no longer include them.

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
- [x] `get_available_actions` response is grouped by resource cost
- [x] Each action's outcome description accurately reflects what the action does (cost + what changes)
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

- [x] CLI accepts typed natural language input and produces structured candidate events
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

**Completed after initial writeup (2026-04-08):**

- CLI demo exists in `/workspace/typescript/osr-hellenvald/examples/transcript-demo.ts` and accepts line-buffered text input.
- `TranscriptInterpreter.liveLayer` is wired to a real OpenRouter-backed `TranscriptLlm` Effect service with in-memory request caching.
- Live mode was exercised end-to-end against the real LLM for attack, ambiguous attack, movement, and non-actionable transcript inputs.

**Remaining for Phase 5:**
- Demo mode — run the CLI through the LLM service boundary using mocked/recorded responses with optional fake latency for presentations.

**Moved to Phase 7:**
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
