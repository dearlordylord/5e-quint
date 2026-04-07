# PRD: Available Actions Module & Live Suggestion Pipeline

## Problem

A D&D 5e player at a live table needs real-time awareness of what their character can do. Today, players either memorize their options (error-prone, especially at higher levels with many class features and spells) or slow the game down flipping through references.

The eventual goal: a system that listens to live game audio (single player mic), maintains character state from the transcript, and surfaces available actions — not ranked by strategy (we don't know the player's goals), but organized by action economy so the player sees the structure of their turn.

This requires two capabilities that don't exist yet:

1. **Forward projection**: Given current character state, what actions are legal and what does each one cost/do?
2. **Backward interpretation**: Given a stream of natural speech, what game events just happened?

The Quint spec (`creature.qnt`, `battle.qnt`) already formally models D&D 5e rules — what's legal, what each action does, how state changes. The XState machine implements this with MBT-verified parity. But neither layer currently exposes "here are your options" as a queryable projection.

## Solution

Build the **Available Actions Module** as the first building block — a pure function that projects the current character state into a set of structured, serializable action tokens. Expose it via an **MCP server** for LLM and programmatic consumption. In parallel, prototype the **transcript-to-events pipeline** in the Hellenvald project (simpler OSR rules, cheaper to iterate) with documented awareness of how it feeds back into this project.

## Design Context

### Two directions of uncertainty

The system operates in two directions simultaneously:

- **Backward (descriptive)**: "What just happened?" — the transcript is noisy, incomplete, ambiguous. The player said something, we need candidate interpretations of what game event occurred. Multiple candidates may exist. This is Hellenvald's existing multiverse pattern.
- **Forward (prescriptive)**: "What can happen next?" — given our best understanding of current state, what actions are legal and what does each one do? This is the new available actions module.

You can't do forward projection without backward interpretation — "what can you do next" depends on "what state are you in" which depends on "what happened so far." Both layers are needed; the available actions module is the first to build because it's spec-derivable and formally testable without any transcript infrastructure.

### The branching tail

A live transcript is perpetually unfinished. Near the end of the stream (the "tail"), the player may still be deliberating: "I'm gonna swing at— actually..." Farther from the tail, events are committed and collapsed into a single interpretation. Near the tail, multiple candidate interpretations coexist — the "multiverse" branches. As more speech arrives, branches collapse (the player commits to an action) or multiply (new ambiguity). The system must keep branching candidates materialized near the tail and zipped/collapsed farther back.

### Why no confidence scoring

Two independent reasons:

1. **Technical**: Speech-to-text gives us text, not scored game events. The LLM that interprets "I swing at the goblin" into an AttackPerformed event produces text, not calibrated probabilities. LLM logprobs measure token prediction confidence, not game-event correctness.
2. **Fundamental**: Even with a perfect transcript, we cannot score which action is "better" because we don't know the player's goals. Are they optimizing damage? Protecting an ally? Making a dramatically interesting choice? Role-play goals are opaque. Ranking actions requires strategic knowledge the system does not and should not have.

The system presents options. It does not rank them.

### Prescriptive vs. descriptive modes

The Quint spec serves dual duty:

- **Prescriptive (forward)**: The spec's guards define what's legal. The available actions module queries guards to enumerate options. Invalid events are rejected.
- **Descriptive (backward)**: When the transcript pipeline produces a candidate event that violates a spec guard, this means the table made a mechanically incorrect ruling. The system must accept that it happened AND warn that it violates RAW — the DM/player can then decide whether they meant to override the rules. This requires a `DM_OVERRIDE` mechanism (deferred to milestone 2+).

### Why confidence scoring is absent (not deferred)

This is a permanent design decision, not a gap to fill later. The system cannot and should not attempt to rank actions by optimality. It presents the option space organized by the one objective axis available: action economy (what resource each action costs). Within that grouping, no ordering.

### Hellenvald's multiverse pattern — what we take and what we change

Hellenvald (`/workspace/typescript/osr-hellenvald`) uses event sourcing with probabilistic candidates. Key architecture:

- **ObservationLog**: Append-only log of observations, each with multiple candidate events. Each entry records which candidate was selected (`selectedIndex`). Source of truth for deterministic replay.
- **Projector**: Evaluates all candidates against frozen (immutable) state. Each candidate runs through a systems pipeline independently. Winner selected by `min(burden) then max(confidence)`. Mutations from the winner are applied to state.
- **Systems pipeline**: Ordered pure functions `(readonlyState, events, priorMutations) → {mutations, warnings}`. 28 systems covering combat, inventory, progression, etc.
- **Warnings**: `ConsistencyWarning` with severity scores. Accumulated into "burden." Purely informational — no candidate is ever rejected. Even if all candidates have warnings, the least-bad one is selected.
- **Confidence scores**: Hardcoded by scenario author. No dynamic computation. This is "strategic knowledge baked in as literal numbers" — exactly the kind of knowledge we can't assume.
- **No invalid state prevention**: Warnings score but never block. Schema validation catches some impossible values (negative currency), but the system can be moved to inconsistent states. This differs from our D&D project where spec guards make illegal transitions impossible.

**What we adopt**: The structural pattern — observation log with candidates, evaluation against frozen state, selection, collapse. The separation of "evaluate candidates without mutating state" is essential for the branching tail.

**What we change**: No hardcoded confidence. No soft-only warnings (our spec provides hard legality). Selection is human-in-the-loop or transcript-disambiguated, not scored. The Quint spec replaces Hellenvald's systems pipeline as the validation backend.

### Cacheability directive

Every layer boundary must be cacheable and mockable. This is a hard requirement, not a nice-to-have:

- **Audio segments**: Recorded/cached so integration tests don't require speaking into a microphone every run.
- **Transcript text**: Cached Whisper output, replayable.
- **LLM interpretation calls**: Cached/mocked so demos work without LLM dependency and tests are deterministic. For demos, fake timeouts can simulate LLM latency to show the system working without real LLM calls.
- **Candidate events**: Serializable, storable, replayable.

Effect's service/layer pattern is the natural implementation — Hellenvald already uses this for DiceRoller (test layers with deterministic sequences, min/max rolls). Same pattern extends to every layer of the pipeline.

## Milestones

### Milestone 1: Available Actions + MCP (D&D project)

**Demoable**: Point Claude Desktop at the MCP server, ask "what can my character do?" and get structured action tokens back. Fill choices, execute, see state change.

Deliverables:
- Event type catalog (const array, compile-time validated)
- Action token schema (command with holes, serializable)
- Available actions module (pure function, queries machine guards)
- MCP server with three tools (`get_state`, `get_available_actions`, `execute_action`)
- Character-level only (no battle context, no multi-creature)
- Machine stays strict (invalid events rejected, no warnings)

### Milestone 2: Transcript-to-events prototype (Hellenvald project)

**Demoable**: Type D&D speech into a CLI, see candidate game events produced. Cached/mocked LLM calls.

Deliverables:
- Text-in CLI (stdin, line-buffered — simulating phrase-level Whisper segments)
- LLM interpretation layer (text window + game state → candidate events)
- Cached/mockable LLM service (Effect layer)
- "Electric field" documentation — each design choice annotated with D&D project implications
- No audio, no Whisper, no streaming — text input only

### Milestone 3: `DM_OVERRIDE` + warnings (D&D project)

**Demoable**: Feed the system an illegal action (e.g., casting without slots), see it accepted with a RAW violation warning.

Deliverables:
- `DM_OVERRIDE` event type in the spec and machine
- Warning emission layer (outside the machine, in the observation/projection layer)
- MCP `execute_action` returns warnings alongside state changes

### Milestone 4: Streaming transcript + buffering (Hellenvald project)

**Demoable**: Feed a recorded audio file, see phrase-buffered segments grouped into game actions, candidate events produced.

Deliverables:
- Whisper integration (recorded audio → segments)
- Phrase-to-turn buffering layer (multiple segments → coherent action)
- Cached audio segments for replay
- Branching tail visualization — show uncommitted candidates near the stream's end

### Milestone 5: Port transcript pipeline to D&D project

**Demoable**: Live (or cached) audio → transcript → candidate events → spec-validated available actions → MCP.

Deliverables:
- Transcript pipeline ported from Hellenvald, backed by Quint spec for validation
- MBT verification that candidate events from transcript produce correct state transitions
- Full pipeline cacheability (audio → transcript → LLM → candidates → state)

## User Stories

1. As a **player using Claude Desktop**, I want to ask "what can my character do?" and get a structured answer listing available actions grouped by action economy (action, bonus action, reaction, free), so I can see my turn budget at a glance.

2. As a **player**, I want each available action to show what it costs (action type, spell slot, class resource charges) and what it does (damage range, healing range, condition applied/removed, movement gained), so I can make informed choices without looking up rules.

3. As a **developer building a game UI**, I want available actions returned as serializable tokens with typed choice slots (spell selection, slot level, target), so I can render interactive controls (dropdowns, buttons) that let the user fill in choices and submit the completed token back to the engine for execution.

4. As a **developer**, I want the action token format to be the same structure for querying options and executing them — fill the choice holes in the returned token, send it back — so there's a single contract between the engine and any consumer (MCP, UI, transcript pipeline).

5. As a **developer**, I want to call `get_available_actions()` via MCP and receive action tokens, then call `execute_action(filled_token)` with my choices filled in, so I can build LLM-powered tools or deterministic UIs on the same interface.

6. As a **player or DM**, I want the system to warn me when a ruling violates RAW (e.g., casting a spell without sufficient slots, using a bonus action for something that costs an action), so I can decide whether to override the rules knowingly. *(Deferred: `DM_OVERRIDE` event — milestone 2+.)*

7. As a **developer prototyping the transcript pipeline**, I want to type natural D&D speech ("I swing at the goblin with my longsword, two-handed — that's a 17 plus 5 so 22") and get candidate game events back, so I can validate the LLM interpretation layer without audio infrastructure.

8. As a **developer**, I want every layer of the pipeline (audio segments, transcript text, LLM calls, candidate events) to be cacheable and mockable, so I can replay integration tests and build demos without live dependencies.

9. As a **developer**, I want the available actions module to derive legality from the same guards the XState machine uses (which MBT validates against the Quint spec), so there is no redundant legality logic that can diverge from the spec.

10. As a **developer**, I want multi-creature fields (targets, triggers) to be optional in the action token schema from day one, so introducing battle context later requires filling holes, not erasing character-only logic.

## Implementation Decisions

### Action Token Schema

An action token is a **command with choice holes** — a structured description of one available action, its costs, its effects, and the choices the consumer must fill before execution.

- **Resource cost** is always known and fully populated: which action economy slot it uses (action, bonus action, reaction, movement, free), plus any resource expenditure (spell slot level, class feature charges).
- **Choice holes** represent decisions the consumer must make: which slot level (for spells that support higher-level casting), which target. These are typed with their valid options enumerated. For milestone 1 (character-only), target choices are omitted (optional field, not populated).
- **Outcome description** states what the action does: cost + what changes. For deterministic actions (Dash, Dodge, Disengage), a single effect description. For nondeterministic actions (attack, saving throw spells), the possible effects and damage/healing ranges. No probability scores — we don't rank outcomes.
- **Grouping**: Actions are grouped by resource cost (action, bonus action, reaction, free/movement). Within groups, no ordering. Spells sharing a slot level or feature charges may be grouped into a single token with a spell choice hole, avoiding combinatorial explosion of spell x slot permutations.
- **Serializable**: The token is a plain JSON-serializable structure. The same structure is returned by `get_available_actions` and accepted by `execute_action` (with choice holes filled).

### Action Token Type Design

The token type system uses a `Hole<T>` wrapper to distinguish open choices from filled values. A single type-level mapping `FillHoles<T>` converts an `ActionToken` (with holes) into an `ActionTokenInstance` (all holes filled):

```typescript
// A choice the consumer must fill — lists valid options
type Hole<T> = { readonly options: ReadonlyArray<T> }

// Type-level mapping: Hole<T> → T, everything else passes through
type FillHoles<T> = {
  readonly [K in keyof T]: T[K] extends Hole<infer V> ? V : T[K]
}
```

**Key design rules:**

- **One token per spell.** `spell` is never a hole — each known spell gets its own token. This keeps outcome descriptions specific (Fireball's outcome differs from Shield's).
- **Slot level is a hole only when casting at a higher level is possible.** A spell with only one valid slot level (e.g., Shield at level 1 when only level-1 slots remain) has `slot` as a concrete value, not a `Hole`. `Hole` only appears when there are 2+ valid options. See `MaybeHole<T>` below.
- **`FillHoles` distributes over unions.** `FillHoles<CastSpellToken | SecondWindToken>` produces the instance union automatically — no hand-written instance types.

```typescript
// Fields that may or may not require a choice
type MaybeHole<T> = T | Hole<T>

// Spell token: slot is a hole only when higher-level casting is available
type CastSpellToken = {
  readonly type: "CAST_SPELL"
  readonly cost: ResourceCost
  readonly spell: SpellId              // concrete — one token per spell
  readonly slot: MaybeHole<SlotLevel>  // Hole if multiple valid levels, concrete if only one
  readonly outcome: OutcomeDescription
}

// No-choice token: no holes at all
type SecondWindToken = {
  readonly type: "USE_SECOND_WIND"
  readonly cost: ResourceCost
  readonly outcome: OutcomeDescription
}
```

**Spell slot terminology** (see `UBIQUITOUS_LANGUAGE.md`): A spell's **base spell level** is the minimum slot required (Fireball = 3). The **cast level** is the slot actually used. "Using a higher-level spell slot" is the RAW phrasing (not "upcast"). The `slot` hole in a spell token lists available cast levels >= base spell level.

**Examples at runtime:**

```
// Shield: base level 1, only level-1 slots available → no hole
{ type: "CAST_SPELL", cost: { reaction: true }, spell: "shield",
  slot: 1, outcome: "AC +5 until next turn" }

// Fireball: base level 3, slots at 3, 4, 5 available → hole
{ type: "CAST_SPELL", cost: { action: 1 }, spell: "fireball",
  slot: { options: [3, 4, 5] }, outcome: "8d6 fire, +1d6 per level above 3" }

// Second Wind: no holes
{ type: "USE_SECOND_WIND", cost: { bonusAction: true, charge: "secondWind" },
  outcome: "heal 1d10 + fighter level" }

// Dash: no holes
{ type: "DASH", cost: { action: 1 }, outcome: "movement +30ft" }
```

### Available Actions Module

A pure function: `(DndContext, machineState) → ActionToken[]`.

- Queries the XState machine's guard system to determine legality. Does not duplicate guard logic — calls into the same guards MBT validates against the Quint spec.
- Enumerates valid fills for choice holes by reading DndContext (e.g., `slotsCurrent` for available spell slots, class state for feature charges).
- Lives in the app layer alongside the machine. Not inside the machine (it's a projection, not a transition). Not in a separate package (premature extraction).
- The module depends on a **runtime-iterable event type catalog** — a const array of all event type strings, validated at compile time against the `DndEvent` union (`as const satisfies ReadonlyArray<DndEvent["type"]>`). This catalog is a preparation task that benefits the codebase independently.

### MCP Server

Three tools, independent from the React app (separate entry point, same domain):

- **`get_state()`** — returns current DndContext as structured JSON (HP, conditions, resources, class features, turn economy).
- **`get_available_actions()`** — calls the available actions module, returns action tokens grouped by resource cost.
- **`execute_action(token)`** — accepts a filled action token, validates it against machine guards, sends the corresponding event to the XState actor, returns the new state + description of what happened. If the filled token fails guards, returns an error (not a warning — strict mode for milestone 1).

The MCP server instantiates its own XState actor. It does not share state with the React app. Both are consumers of the same domain code.

### Hellenvald Transcript Pipeline (Parallel Workstream)

Prototyped in the Hellenvald project (`/workspace/typescript/osr-hellenvald`), documented with awareness of how it feeds into the D&D project.

- **Input**: Phrase-buffered text stream. Whisper outputs segments (sentence/clause level). The pipeline buffers segments into coherent action descriptions — a single game action may span multiple segments ("I swing at him" + "that's a 17 plus 5"). Buffering heuristics: pauses, dice-result patterns, DM responses.
- **Processing**: LLM interpretation layer. Given a text window + current game state, determine: has the player committed to an action? If yes, produce candidate events. If no, produce nothing (or partial/uncommitted candidates for the branching tail).
- **Output**: Candidate events in Hellenvald's observation format — multiple interpretations when ambiguous, no confidence scores (we can't meaningfully score them). Selection is human-in-the-loop or transcript-disambiguated.
- **Cacheability**: Every layer boundary is an Effect service that can be backed by cached/recorded data or mocked responses. Recorded audio segments, recorded transcripts, recorded LLM responses — full pipeline replay without live dependencies.
- **"Electric field" documentation**: Each design choice in the Hellenvald prototype documents what changes when ported to the D&D project. Key differences: D&D project has formal spec (Quint) for validation, hard guards instead of soft warnings, MBT for parity verification.

### Relationship Between Projects

The D&D project's Quint spec serves as the correctness anchor. The Hellenvald project is the experimentation ground for the transcript pipeline. They connect at the **action token interface**: the transcript pipeline produces candidate events, the available actions module says whether each candidate is legal and what it leads to.

When the transcript pipeline matures, porting it to the D&D project means: the spec validates candidates (illegal events get warnings instead of Hellenvald's soft scoring), and MBT verifies that the available actions module correctly reflects the spec.

## Testing Decisions

### Available Actions Module
- **MBT validation**: The module queries the same guards MBT validates. No separate legality tests needed for individual guards — MBT covers spec parity. Tests for this module verify that the token construction (choice enumeration, grouping, outcome descriptions) is correct given a DndContext.
- **Property-based**: For any state, every returned action token, when filled with any valid choice, should be accepted by `execute_action`. Conversely, no event type omitted from the result should be accepted by the machine.
- **Snapshot tests**: For representative character states (level 5 Fighter, level 9 Wizard with specific spell slots), assert the action token list matches expected shape. Catches regressions when new event types are added.

### MCP Server
- **Integration tests**: Call `get_available_actions`, fill a token, call `execute_action`, verify state changed correctly. Round-trip tests.
- **Schema validation**: MCP tool inputs/outputs conform to the action token schema.

### Hellenvald Transcript Pipeline
- **Cached replay tests**: Recorded transcript segments → expected candidate events. No live LLM needed.
- **Buffering tests**: Given a sequence of segments with timing, verify the buffer groups them into correct action boundaries.
- **LLM interpretation tests**: With mocked LLM responses, verify the pipeline produces expected candidates for known transcript patterns.

### Event Type Catalog
- **Compile-time validation**: `as const satisfies ReadonlyArray<DndEvent["type"]>` — adding a new event type to the union without adding it to the catalog is a compile error.

## Out of Scope

- **Ranking/strategy**: The system does not score or order actions by tactical value. It presents options grouped by action economy. Player goals are opaque.
- **Confidence scoring**: No numeric confidence on candidates or outcomes. We can't meaningfully compute it (no strategic knowledge, LLM logprobs aren't calibrated game-event probabilities).
- **Multi-creature / battle context**: Milestone 1 is character-level only. Token schema includes optional target/trigger fields for forward compatibility, but they are not populated. Battle-level projection (who's in range, area effects, opportunity attacks) is a later milestone.
- **`DM_OVERRIDE` event**: Accepting mechanically incorrect rulings with warnings is deferred. Milestone 1 machine stays strict — invalid events are rejected, not warned.
- **Audio pipeline**: Whisper integration, real-time streaming, microphone handling. The Hellenvald prototype works with text input (typed or cached).
- **React UI for available actions**: The React app is a separate consumer. It can use the module later, but milestone 1 exposes via MCP only.
- **Probability distributions on outcomes**: We describe what an action does (damage range, conditions), not how likely each outcome is.
- **Quint AST analysis for automatic outcome derivation**: Deriving outcome schemas by parsing the Quint spec's nondet structure. Interesting but not practical today. Outcomes are hand-written in TypeScript, validated by MBT.

## Notes

- The Quint spec is the single source of truth for rule correctness. The available actions module, the MCP server, and eventually the transcript pipeline are all projections validated against it.
- The event type catalog (`const EVENT_TYPES = [...] as const`) is a preparation task that benefits the codebase independently of this feature — it enables runtime iteration over event types with compile-time safety.
- Effect (the library) is the natural choice for the cacheability/mockability requirements in both projects — Hellenvald already uses it, and the service/layer pattern handles test doubles cleanly.
- The action token "command with holes" pattern is influenced by Hellenvald's observation/candidate architecture, adapted for forward projection (legal options) rather than backward interpretation (what happened).
- Hellenvald reference: `/workspace/typescript/osr-hellenvald` — event sourcing with probabilistic candidates, ECS, Effect services. See its `Projector` and `ObservationLog` for the multiverse pattern.

## Design Log

Key decisions and reasoning from the design conversation. Preserved so future readers understand not just *what* was decided but *why*, and what alternatives were considered.

### Starting question: can we derive "possible outcomes" from the spec alone?

The Quint spec models rules operationally — `nondet` choices define branching (dice rolls), guards define legality, action bodies define state transitions. The spec implicitly contains the full outcome space for every action. Three ways to surface it were considered:

1. **Predicate-style** — write `post_Attack(pre, post)` predicates in Quint that collect all constraints on the post-state. Already expressible in Quint, just not named.
2. **Symbolic enumeration via Apalache** — bounded model checking with depth=1 computes reachable successor states. Correct but blows up with wide integer ranges (HP x damage x modifiers).
3. **Outcome schema** — describe the *shape* of outcomes (hit/miss/crit with damage bounds) rather than enumerating concrete states.

**Decision**: Option 3. Practical, doesn't require Apalache infrastructure, captures what a player needs to know. Implemented as TypeScript pure functions, validated against the spec via MBT.

### Why not rank actions?

Initially considered expected-value ranking (`sum(probability * damage)`), tactical context ("3 enemies surround you, Dodge is good"), and player intent from transcript. All rejected:

- **EV ranking requires probability** — which requires knowing AC, save modifiers of enemies. Character-only scope doesn't have this.
- **Tactical context requires battle state** — deferred to multi-creature milestones.
- **Player intent is opaque** — role-play goals (dramatic, protective, aggressive, comedic) can't be inferred or scored. This is fundamental, not a technical limitation. Even with perfect information, we don't know what the player *wants*.

**Decision**: Present options grouped by action economy (the one objective axis). No ordering within groups. Permanent design choice, not a gap.

### The Hellenvald multiverse — what it is and isn't

Explored `/workspace/typescript/osr-hellenvald` to understand its "multiverse" architecture. Key findings:

- **Not forking state trees** — evaluates competing candidate interpretations against a single frozen state. All candidates run through a systems pipeline independently. Winner selected, mutations applied.
- **Confidence is hardcoded** — literal numbers in scenario files (0.70, 0.85, etc.), set by the scenario author. No dynamic computation from game state or probabilities. This is "strategic knowledge baked in" — exactly what we can't assume.
- **Warnings are purely informational** — `ConsistencyWarning` with severity scores accumulate into "burden" but never block a candidate. `selectBestIndex` always returns a winner, even if all candidates have warnings. No veto mechanism.
- **Invalid states are possible** — unlike our D&D project where spec guards make illegal transitions impossible. Hellenvald's systems flag unlikely interpretations, not impossible ones.

**Decision**: Adopt the structural pattern (observation log, candidate evaluation against frozen state, selection, collapse). Replace confidence scoring with human-in-the-loop or transcript disambiguation. Replace soft warnings with spec-backed hard legality (for the D&D project; Hellenvald keeps its soft approach).

### Both backward and forward uncertainty needed

Initial framing separated "what happened?" (Hellenvald's problem) from "what can happen next?" (our new module). User corrected: you can't project forward without knowing current state, which requires interpreting what happened. Both layers are needed.

Similarly, candidates aren't just a forward-projection concept — even "what happened" has multiple interpretations when working from human speech. The player said something ambiguous; we need candidate events for the past, not just the future.

**Decision**: The system handles both directions. The available actions module (forward) is built first because it's spec-derivable and testable without transcript infrastructure. The transcript pipeline (backward) is prototyped in Hellenvald in parallel.

### Warnings for mechanically incorrect rulings

User pointed out: the DM might rule something wrong ("you cast Shield as a bonus action" — Shield costs a reaction per RAW). The system must accept that this happened at the table AND warn that it violates rules.

Our machine currently rejects invalid events via guards. Two approaches considered:

- **A: Dual-mode machine** — guards emit warnings instead of rejecting in "permissive" mode. Rejected: muddies spec parity, complicates MBT.
- **B: Warnings as a separate layer** — the machine stays strict. A `DM_OVERRIDE` event type is the spec-legal way to represent "the table ruled this." Warnings are metadata on the observation layer, not guard logic. Matches Hellenvald's pattern.

**Decision**: Option B. Machine stays strict for milestone 1. `DM_OVERRIDE` deferred to milestone 3 with its own warning emission layer.

### Why confidence doesn't work — two independent reasons

1. **Technical**: Whisper produces text, not scored game events. The LLM interpreting transcript produces text, not calibrated probabilities. LLM logprobs measure token prediction, not game-event correctness. There's no off-the-shelf confidence score for "this sentence means attack vs. move."
2. **Fundamental**: Even with perfect transcription and perfect event parsing, we cannot score which action is *better* because player goals are opaque. Optimizing damage? Protecting allies? Dramatic role-play? We don't know and shouldn't pretend to.

These are independent — fixing one doesn't fix the other. Confidence scoring is absent by design, not deferred.

### Action tokens as executable commands ("command with holes")

User asked: should available actions be serializable tokens that the caller can send back to execute? This would support both LLM consumers (fill choices in JSON) and deterministic UI (render buttons, user clicks, submit filled token).

**Decision**: Yes. The action token is a partially-filled command. `get_available_actions()` returns tokens with typed choice holes (spell, slot level, target). The consumer fills the holes, sends the token to `execute_action()`. Same structure for query and execution — single contract.

**Grouping to avoid combinatorial explosion**: Don't enumerate every spell x slot level combination. Group spells with a choice hole for slot level: `{type: "CAST_SPELL", spell: "fireball", choose: {slot: [3, 4, 5]}}`. The consumer picks the slot, not the catalog.

### Outcome representation

Debated what an "outcome" means for different action types. Resolved:

- Common interface for all actions: **cost + what changes**.
- Deterministic actions (Dash, Dodge): single effect description.
- Nondeterministic actions (attack): effect description with damage/healing ranges and the structural possibilities (hit does X, miss does nothing, crit does Y).
- No probability field. No branching taxonomy. Just "what does this action do."

Initial proposal included `probability: 1.0` for deterministic actions — user rejected. Probability is a concept we explicitly excluded. Removed entirely.

### Module placement

Considered "closer to the spec" (derive option space from Quint, either by generating TS from Quint AST or calling Quint evaluator at runtime). Rejected: Quint evaluator is expensive at runtime, no TS-from-Quint codegen tooling exists.

**Decision**: Pure function in the TypeScript app layer, alongside the machine. Queries XState guards for legality, reads DndContext for valid choice fills. MBT validates that TS logic matches spec. The spec is the authority, the TS module is a tested projection.

### MCP server — separate from React app

The MCP server and React app are two different consumers of the same domain. The React app presents blog content and visual feedback. The MCP server serves LLM/programmatic interaction. Neither owns the domain.

**Decision**: MCP server is an independent entry point. Instantiates its own XState actor. Three tools: `get_state`, `get_available_actions`, `execute_action`. No dependency on React.

### Why prototype transcript pipeline in Hellenvald

- Simpler rules (OSR vs D&D 5e) — less complex event space, faster iteration on the hard problem (speech → game events).
- No formal spec to maintain parity with — mistakes are cheap.
- Already uses Effect (cacheability/mockability infrastructure exists).
- "Electric field" documentation: every design choice annotated with what changes when ported to D&D project.

Risk: scope creep in Hellenvald. Mitigation: only build the transcript → candidate pipeline there, nothing else.

### Streaming and buffering

Transcript input is a stream, not discrete commands. Whisper emits segments (sentence/clause level). But a single game action may span multiple segments ("I swing at him" + "that's a 17 plus 5 so 22").

Two levels of buffering identified:

- **Phrase level** (from Whisper): raw segments, the physical input unit.
- **Turn level** (from interpretation layer): multiple phrases accumulated until they form a complete game action.

The LLM interpretation layer watches phrases arrive, accumulates context, emits candidate events when a complete action is detected. Signals: pauses, dice-result patterns, DM responses.

For milestone 2 (Hellenvald), simplified to line-buffered stdin. Streaming buffering deferred to milestone 4.

### Character-only scope — no throwaway code

User concern: character-only milestone shouldn't have case-specific logic that gets erased when multi-creature is introduced.

**Decision**: The available actions function signature `(DndContext, machineState) → ActionToken[]` is inherently single-creature. In battle, you call it for the active creature. Multi-creature fields (targets, triggers) are optional in the token schema from day one — milestone 1 doesn't populate them, later milestones fill them. No code to erase, just holes to fill.

### Event type catalog as preparation task

The `DndEvent` union is hand-written as a type (`machine-types.ts:205`). No runtime-iterable array exists. The available actions module needs to iterate all event types to check which ones pass guards.

**Decision**: Define `const EVENT_TYPES = [...] as const satisfies ReadonlyArray<DndEvent["type"]>`. Compile-time validated, runtime-iterable. This is a preparation task that benefits the codebase independently — useful even without the available actions module.
