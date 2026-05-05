# MCP LLM Drivability Backlog

## Status

Findings from driving `@dnd/mcp` end-to-end as an LLM-style client on
2026-04-15 against commit `e9f3f55`. The probe went from an empty
`CharacterDraft` to a finalized sheet entirely through the picker surface,
then started a battle and executed one `BATTLE_ATTACK`. Everything
succeeded, but several friction points would bite any real LLM caller.

This file inventories the friction and proposes scoped fixes. It is not a
single-batch plan — findings are independently actionable.

**All 7 findings landed 2026-04-15.** See summary at the end.

## Probe Scope (what was actually exercised)

- `get_state`, `create_character_draft`, `assess_character_draft`,
  `list_character_feature_pickers`, `build_open_choice_patch`,
  `apply_character_draft_update`, `finalize_character_draft`,
  `start_battle`, `execute_control_command(BATTLE_START_TURN)`,
  `get_available_actions` (battle scope), `execute_action(BATTLE_ATTACK)`.
- The full picker loop (bootstrap + derived) landed a complete draft with
  fighter/human/soldier/NG + all required feature choices.
- Battle reached an attack resolution with `success: true`.

## Findings

Ordered by likely severity for a real LLM client.

### F1. Shallow merge in `apply_character_draft_update` silently wipes sibling choices

Status: **DONE**. `applyCharacterDraftUpdate` now deep-merges `choices` and
`equipment` at arbitrary depth (`deepMergeBranch` in
`packages/core/src/character-draft-sanitizers.ts`). Raw patches that set a
single nested field no longer wipe siblings. Previous shallow-merge test
was rewritten to assert the new preservation behavior.

Severity: high.

**Observation.** `applyCharacterDraftUpdate` in
`packages/core/src/character-draft-sanitizers.ts` does
`{ ...current, ...patch }`. Any raw patch that sets `choices: { foo: ... }`
replaces the entire `choices` object wholesale, losing all previously
applied picks. The probe hit this when trying to patch `backgroundTool`
after picker-driven fighter Fighting Style, origin feat, and class skills
had already been applied — everything downstream was silently dropped and
the next `assess_character_draft` went from `complete` back to
`incomplete`.

**Why it's hidden.** `build_open_choice_patch` always reads the current
draft and preserves siblings via `writeAtPath`, so the picker loop never
exercises the footgun. Only manual patches do.

**Fix options.**

- Deep-merge `choices` and `equipment` at depth 2 in
  `applyCharacterDraftUpdate`. Sanitizers already run afterward to drop
  invalidated values, so deep-merge is compatible.
- Or: reject raw patches that set a branch field without using
  `build_open_choice_patch`, with a clear error pointing at the picker
  tool. Less friendly.
- Or: document the shallow-merge contract prominently in the
  `apply_character_draft_update` tool description so the LLM knows to
  read-then-patch.

Recommended: deep-merge at depth 2 on `choices` and `equipment`. The
shallow-merge behavior has no callers that would benefit from it.

### F2. Finalized character is not wired into the battle host

Status: **DONE**. `start_battle` now accepts an explicit participant
roster. Each participant declares its projection source: `storedSheet`
uses `storedCharacter.sheet` through `characterSheetBattleProjection`,
`activeHost` uses the demo Fighter host, `monsterStatBlock` uses the core
monster catalog, and `basicRaw` accepts a minimal raw PC/Monster config.
Missing-sheet and still-draft cases return structured errors with
`storedCharacterState` in the detail.

Severity: high.

**Observation.** `start_battle` consumes the demo Fighter `CreatureActionHost`
(hardcoded in `createDemoHost`) and produces a battle from _that_ creature,
not from `storedCharacter.sheet`. The probe carefully built a character via
the picker surface, finalized it, and then the battle used a different
Fighter entirely. For a "create a character and make them fight" flow, this
is the single most confusing gap.

**Where it bites.** The LLM's observable surface strongly suggests the
stored sheet is the player character (that's what
`project_character_sheet` projects). Battle scope silently uses a different
creature.

**Fix options.**

- Add a tool `promote_stored_character_to_battle_host` (or fold into
  `start_battle`) that converts `storedCharacter.sheet` into a creature
  actor with its durable state, then runs `BATTLE_INIT` with that
  creature. Use `characterSheetBattleProjection` (already present in
  `@dnd/core`) for the conversion.
- `start_battle` should make participant source explicit, erroring if a
  `storedSheet` participant is requested while the stored character is
  absent or still a draft. The demo-host behavior should live behind an
  explicit `source: "activeHost"` participant.

### F3. Battle `execute_action` runtime inputs are LLM-hostile

Status: **DONE**. `preview_action` for battle scope now returns a
`runtimeSchema` descriptor (`{runtime, valueFields: {field: {type, source,
description, ...}}}`) whenever the resolution requires session-owned
runtime inputs. `INVALID_RUNTIME_INPUT` error messages include the
expected field list. Schema descriptors live in
`packages/mcp/src/server-battle-attack-runtime.ts`
(`BATTLE_ATTACK_RUNTIME_SCHEMA`, `BATTLE_GRAPPLE_RUNTIME_SCHEMA`,
`RUNTIME_SCHEMAS_BY_TAG`). The session-owned-facts boundary remains
intact — MCP still doesn't roll dice or compute geometry.

Severity: medium (partly intentional).

**Observation.** `execute_action` for `BATTLE_ATTACK` requires a
`runtime: { runtime: "battleAttack", values: {...} }` record with
`attackRoll`, `targetAc`, `weaponDamage`, `attackerWithin5ft`,
`hostileWithin5ft`, `targetCanSeeAttacker`, `attackerCanSeeTarget`,
`frightSourceInLOS`, `hasAllyAdjacentToTarget`, `hitReactionCandidates`.
None of these are discoverable through MCP — the shape lives only in
`packages/mcp/src/server-battle-attack-runtime.ts` and the test fixtures.

**Why it's partly intentional.** The session-owned-facts boundary
([MCPA3](./MCPA3_SPATIAL_ACTION_CONTRACTS.md),
[MOVEMENT_GEOMETRY_OWNERSHIP.md](./MOVEMENT_GEOMETRY_OWNERSHIP.md)) says MCP
does not roll dice, own geometry, or infer visibility. The LLM must
compute or be told these. That design is fine; the discoverability is not.

**Fix options.**

- `preview_action` already returns `runtime: "battleAttack"` — extend it to
  also return the expected `values` schema (field names, types, whether
  each is a session fact vs. a session-facing roll). The LLM can then
  construct the full `execute_action` payload without grepping source.
- On an "invalid runtime input" error, include the exact expected shape
  (not the full Effect Schema AST dump), keyed on the provided `runtime`
  tag.
- Optional: add a `roll_d20` / `roll_damage` helper surface with explicit
  seeding, so an LLM can request a deterministic roll when no human is
  at the table.

### F4. `get_state` in battle scope hides per-creature HP

Status: **DONE**. `encodeBattleRuntimeState` now emits a `creatures` map
keyed by `CreatureId` with `hp`, `maxHp`, `maxHpReduction`, `tempHp`,
`dead`, `stable`, `exhaustion`, `conditions`, `deathSaves`, and
`creatureKind` per creature. Conditions are filtered via
`CREATURE_CONDITION_KEYS`.

Severity: medium.

**Observation.** The battle-scope `get_state` encoder
(`encodeBattleRuntimeState` in `server-shared.ts`) returns phase, round,
turn index, initiative, and `monsterControl`, but no creature HP, no
active effects per creature, and no condition state. After a successful
attack, the only feedback an LLM gets is `success: true` and "Make a
weapon or unarmed strike attack…". It cannot confirm damage landed.

**Fix.** Extend `encodeBattleRuntimeState` to include a per-creature
summary (`hp`, `maxHp`, `conditions`, `tempHp`) keyed by `CreatureId`.
Same shape as the creature-scope `get_state` but scoped to every creature
in `context.creatures`.

### F5. `get_available_actions` is empty between `BATTLE_INIT` and `BATTLE_START_TURN`

Status: **DONE**. Battle `get_state` now reports `phase:
"awaitingStartTurn"` and `turnStarted: false` whenever initiative is set
but the current creature's turn has not yet begun (applies at initial
BATTLE_INIT and between turns). A `nextRequiredAction` hint points the
caller at `execute_control_command(BATTLE_START_TURN)` in that case.

Severity: low-medium.

**Observation.** After a successful `start_battle`, `get_available_actions`
returns `{action: [], bonusAction: [], reaction: [], free: []}` even though
`phase: "activeTurn"`. Actions only appear after an explicit
`execute_control_command({scope: "battle", type: "BATTLE_START_TURN", ...})`.

**Fix options.**

- Distinguish the two states in the encoded `phase` (e.g.
  `phase: "battleInitialized"` vs `phase: "activeTurn"`), so the LLM can
  tell it still needs to issue a control command.
- Include a `nextRequiredAction` hint on the battle state when the machine
  is idle awaiting a specific command, naming the tool and type to call
  next.

### F6. No cross-reference between assessment codes and picker `featureRef`s

Status: **DONE**. `assess_character_draft` and
`preview_character_draft_update` now enrich each `openChoice` (and
`newlyOpenedChoices`) with its resolving picker's `featureRef` where one
exists. Helper lives in `packages/mcp/src/character-session-helpers.ts`
(`enrichAssessment`, `enrichOpenChoices`). Codes with no picker
(e.g. `missingEquipmentChoices`, `missingClassLevels`) pass through
unchanged.

Severity: low-medium.

**Observation.** `assess_character_draft` returns
`openChoices: [{code, message}]` with codes like `missingPrimaryClass`.
`list_character_feature_pickers` returns pickers keyed by
`featureRef` like `primary_class`. The two are related but have no
explicit link in either response. An LLM must do the mapping by prefix
intuition ("`missingX` → find picker whose `featureRef` matches X").

**Fix.** Either:

- Add `featureRef?: string` to each `CharacterOpenChoice` in
  `assess_character_draft`, or
- Add `code?: string` / `codes?: string[]` to each
  `CharacterOpenChoicePayload` in `list_character_feature_pickers`.

The bidirectional internal map already exists in `PICKER_ENTRIES` in
`character-open-choice-payload.ts`. Exposing either direction closes the
loop.

### F7. Picker surface leaves gaps: ability scores, languages, equipment loadout

Status: **DONE**. New resolvers in
`packages/core/src/character-open-choice-payload.ts`:

- `ability_score_generation` — 1-pick over
  `ABILITY_SCORE_GENERATION_MODES`; `lift` builds the tagged variant with
  an empty `assignedScores` map (standard-array/point-buy score
  assignment is left for a follow-up).
- `background_ability_score_increase:<background>` — 2-pick over
  `BACKGROUND_ABILITY_SCORE_OPTIONS[background]` (index 0 = plusTwo,
  index 1 = plusOne); `lift` builds the plusTwoPlusOne variant.
- `languages` — 3-pick over `CHARACTER_LANGUAGES` (the current
  character-creation slice expects exactly three starting languages).
- selected-equipment loadout slots (`armor`, `shield`, `weapon`) — all emitted
  by a single consolidated loadout picker that caches the
  `ownedCombatEquipment` lookup.

Severity: medium.

**Observation.** These required draft fields have no pickers:

- `abilityScoreGeneration` (mode + assigned scores)
- `backgroundAbilityScoreIncrease`
- `languages`
- `equipment.purchasedCombatEquipment` and `equipment.loadout`

An LLM has to raw-patch them with knowledge of the schema shape, which
isn't discoverable through MCP. The probe hardcoded
`{mode: "standardArray", assignedScores: {...}}` etc. by reading the
core types.

**Fix.** Extend `listCharacterFeaturePickers` in
`packages/core/src/character-open-choice-payload.ts` with resolvers:

- `ability_score_generation` (pickCount = 1, options =
  `["standardArray", "pointBuy", "manual"]`, `lift` transforms to the
  tagged-variant shape). Standard-array assignment can be a follow-up
  multi-pick once the mode is chosen.
- `background_ability_score_increase:<background>` (options derived from
  `BACKGROUND_ABILITY_SCORE_OPTIONS`).
- `granted_language` (multi-pick over `CHARACTER_LANGUAGES`, pickCount
  driven by the draft's total grant count).
- Equipment loadout pickers for `wornArmor`, `wieldedWeapon`,
  `secondaryWeapon`, `shield`, `wieldedWeaponGrip` driven by
  `ownedCombatEquipment(sheetLike)` output.

Each is bounded and mirrors the CHARUI2 pattern.

## Out of Scope

- Expanding the `execute_action` schema beyond the current
  session-owned-facts boundary. Dice/geometry/visibility ownership stays
  with the caller per MCPA3 and MOVEMENT_GEOMETRY_OWNERSHIP.
- Mutating the core type shape of `CharacterDraft` to eliminate branch
  fields — deep-merge at apply time is the cheaper fix for F1.
- Replacing the MCP stdio transport or changing the SDK version.

## Recommended Batch Order

If these are taken in a batch, the order that minimizes rework:

1. **F1** (deep-merge `choices` / `equipment` at apply time). Tiny, unlocks
   the rest without callers re-learning semantics.
2. **F4** (expose per-creature HP in battle `get_state`). Tiny encoder
   change; immediately useful to any battle test harness.
3. **F2** (stored-sheet → battle host). Unblocks the "create-then-fight"
   narrative. Medium-sized; depends on a clear decision about whether
   `start_battle` keeps the demo-host escape hatch.
4. **F6** (assess ↔ picker cross-link). One field addition on either side
   of the existing picker registry.
5. **F7** (fill picker gaps). Four resolvers, same pattern as CHARUI2.
6. **F5** (phase-name or `nextRequiredAction` hint). Small encoder tweak.
7. **F3** (runtime-input discoverability). Largest and least urgent —
   `preview_action` already half-carries the answer; extending it is the
   cleanest vector.

## RAW / Architecture Anchors

- Session-owned facts boundary:
  [MCPA3_SPATIAL_ACTION_CONTRACTS.md](./MCPA3_SPATIAL_ACTION_CONTRACTS.md),
  [MOVEMENT_GEOMETRY_OWNERSHIP.md](./MOVEMENT_GEOMETRY_OWNERSHIP.md).
- Existing MCP surface inventory:
  [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).
- Picker surface (CHARUI1 + CHARUI2 + root-field bootstrap):
  `packages/core/src/character-open-choice-payload.ts`,
  `packages/mcp/src/character-session.ts`.

## Completion Summary (2026-04-15)

All 7 findings landed. Delivery followed the recommended batch order.

- **F1** — deep-merge `choices`/`equipment` in `applyCharacterDraftUpdate`.
- **F4** — per-creature HP/conditions/deathSaves in battle `get_state`.
- **F2** — `start_battle` consumes an explicit participant roster.
  `source: "storedSheet"` projects from `characterSheetBattleProjection`;
  `source: "activeHost"` keeps the demo-host escape hatch.
- **F6** — `assess_character_draft` and
  `preview_character_draft_update` enrich each open choice with the
  resolving picker's `featureRef`.
- **F7** — new pickers: `ability_score_generation`,
  `background_ability_score_increase:<bg>`, `languages`, and four
  loadout pickers (worn armor, wielded weapon, grip, shield).
- **F5** — `phase: "awaitingStartTurn"` + `turnStarted` + optional
  `nextRequiredAction` hint.
- **F3** — `runtimeSchema` on battle `preview_action`; error messages
  include expected field shape.

Verification: 82 core + 139 MCP tests passing; typecheck clean across
both packages. `/simplify` converged in 2 rounds (round 1 merged 4
loadout resolvers into one, simplified `isAbility`; round 2 extracted
shared `loadoutEntryFields` / `nonZeroLevelFields` helpers and tightened
types).

### Known follow-ups deferred from F7

- `abilityScoreGeneration.assignedScores` assignment picker (a multi-pick
  per ability, staged after mode selection).
- Loadout `secondaryWeapon` picker (needs main-hand context to compute
  legal options).
- Widen `BattleInitRawCreatureConfigSchema` to accept
  `baseArmorClass`, `preparedSpells`, `readyableSpellPayloads`,
  `slotsMax/Current`, `pactSlots*` so F2 can surface the full
  spellcasting projection. Blocked on schema plumbing for
  `SpellId`/`BattleReadyableSpellPayload`.
