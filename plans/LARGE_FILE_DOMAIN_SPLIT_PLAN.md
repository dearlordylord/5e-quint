# Large File Domain Split Plan

Date: 2026-05-17

This plan scans tracked files over 1,000 lines and proposes a domain-shaped
split wave for better coding-agent context management. The goal is not smaller
files for their own sake. The goal is deeper modules with names that match SRD
and project language, small enough that an agent can load the whole relevant
module without also loading unrelated battle, Surface, MCP, or character-sheet
behavior.

## History Evidence

The strongest precedent is the May 2026 battle reducer split.

| Commit | Date | Evidence | Lesson |
| --- | --- | --- | --- |
| `9dfcf174` `reducer split WIP` | 2026-05-10 | `packages/battle-runtime/src/battle-reducer.ts` was 30,597 lines before the split. The commit added `REFACTOR_MAP.md` and extracted domain clusters such as creature state, attack roll, damage apply, movement speed, spells profiles, spells resolve, and stat-block attacks. | Start with an inventory by domain and call graph pressure, then extract in dependency order. |
| `962065b2` `Split battle reducer into focused modules` | 2026-05-10 | Reduced `battle-reducer.ts` from 13,961 lines to 2,363 lines and created focused files under `src/battle-reducer/`. Added `scripts/audit-battle-reducer-split.mjs`. | Large splits need an executable audit for moved functions/barrels, not just visual review. |
| `be38b6c6` `Split battle runtime reducer domains` | 2026-05-04 | Split a 15,166-line `packages/battle-runtime/src/index.ts` into runtime modules such as battle init, action options, subjects, resources, distances, identity, and unit feature support. | Public package entrypoints can remain stable while implementation modules move behind them. |
| `36ecb99a` `Split battle runtime QNT through rule-core bridges` | 2026-05-11 | Added package-local bridge QNT modules and a vertical inventory. | QNT splits must move semantic authority to rule-core or focused bridge modules; plain file movement does not reduce state space. |
| `f158425d` `Split character creation runtime modules` | 2026-04-29 | Split character creation into discovery, draft, fill reducer, finalization, support gates, hole factories, and types. | Runtime flow phases are good module names when they match domain workflow. |
| `f5243a80` `Finish unit profile checker modularization` | 2026-05-06 | Split a checker script into config, discovery, IO, validation, claim scan, and self-test modules. | Scripts need the same locality rule as runtime code. |

The historical pattern is: first inventory by domain, then extract leaf modules,
then keep a stable package interface, then verify with typecheck/tests plus a
purpose-built audit when the move is large.

## Current Scan

Tracked files over 1,000 lines:

- 208 total files over 1,000 lines.
- 24 are under `.references/`.
- 11 are under `plans/`.
- 81 are `scripts/content-surface-survey/results-srd/**` generated survey
  outputs.
- 92 are other source, spec, test, or script files.
- After excluding reference corpus, plans, generated survey outputs,
  `qa_generated.qnt`, and `pnpm-lock.yaml`, 88 active files remain over 1,000
  lines.

Do not manually split these classes of files:

- reference corpus: `.references/**`;
- generated or aggregate artifacts: `plans/raw-coverage/*.json*`,
  `plans/unit-profile-coverage/*.json*`, `qa_generated.qnt`,
  `scripts/content-surface-survey/results-srd/**`, generated trace outputs;
- lockfiles;
- archived restore-source material unless a restore task explicitly targets it:
  root `battle.qnt`, root `creature.qnt`, and root `dndTest.qnt`.

For generated artifacts, prefer changing the generator to emit shards or an
index when agents need context. Do not hand-edit generated outputs just to lower
line count.

## Split Principles

Use these rules in every split:

1. Name modules after the domain fact or workflow they own, not after technical
   mechanics. Prefer `spell-repeat-saves`, `command-options`,
   `battle-codec-fills`, `character-sheet-hit-points`, and
   `unit-feature-attack-riders` over `helpers`, `utils`, `new`, `current`, or
   `support2`.
2. Keep the public package interface stable first. Most splits should move
   implementation behind existing exports and update package barrels.
3. Do not add duplicate state to make a split easy. Thread existing parsed
   facts through the new module interface.
4. Use the deletion test. If deleting the new module would just spread the same
   protocol knowledge across callers, it is earning its place. If not, do not
   create it.
5. Extract test support only when the support names domain fixtures or replay
   operations. Avoid a single giant `test-utils.ts`.
6. For QNT, split semantic authority, not text. A smaller file that imports the
   same broad state machine is not enough.
7. Preserve coverage marker comments such as `UNIT-PROFILE-COVERAGE` and
   `UNIT-IDENTITY-EVIDENCE`; move each marker to the test file that owns the
   evidence.

## Tier 1 Candidates

### 1. Battle Runtime Public Regression Tests

Files:

- `packages/battle-runtime/src/index.test.ts` at 29,714 lines.
- Helper tail starts around line 26,115, so about 3,600 lines are shared test
  fixture/replay code after the test body.

Problem:

The file is now another monolith like the old reducer. It mixes public API
smoke tests, movement, hidden state, attacks, reactions, death saves, stat-block
controls, unit features, spell access, spell attacks, save-gated spells, Sleep,
marked riders, object targeting, and QNT self-tests. An agent working on one
spell or one reaction window must load unrelated domains and many fixtures.

Solution:

Create `packages/battle-runtime/src/test-support/` with domain fixtures:

- `battle-fixtures.ts`: ids, sides, `startBattleRight`, baseline
  fighter/goblin/wizard/skeleton battles.
- `attack-fixtures.ts`: weapon attacks, attack target/roll/damage fills,
  damage disposition fills.
- `spell-fixtures.ts`: spell records, spell subjects, target allocation, save
  outcome, object target, and spell damage fills.
- `reaction-fixtures.ts`: reaction decisions, readied spell setups, reaction
  modifier setups.
- `stat-block-fixtures.ts`: monster stat blocks, multiattack/recharge/limited
  use fixtures.
- `feature-fixtures.ts`: Unit refs/resources for Rage, Sneak Attack, Bardic
  Inspiration, Deflect Attacks, Weapon Mastery, and similar features.

Then split tests by runtime procedure family:

- `battle-runtime/start-and-snapshot.test.ts`;
- `battle-runtime/movement-grapple-hidden.test.ts`;
- `battle-runtime/weapon-attacks-and-mastery.test.ts`;
- `battle-runtime/reactions-and-readied-responses.test.ts`;
- `battle-runtime/hit-points-death-and-knockout.test.ts`;
- `battle-runtime/stat-block-controls.test.ts`;
- `battle-runtime/unit-features.test.ts`;
- `battle-runtime/spell-access-and-concentration.test.ts`;
- `battle-runtime/spell-attacks-and-object-targets.test.ts`;
- `battle-runtime/save-gated-spells-and-conditions.test.ts`;
- `battle-runtime/sleep-repeat-save-lifecycle.test.ts`;
- `battle-runtime/marked-riders-and-obscurement.test.ts`;
- `battle-runtime/qnt-self-tests.test.ts`.

Benefits:

- Better locality for public runtime behavior. A spell-change agent loads spell
  tests and spell fixtures, not every battle regression.
- Better leverage from fixture modules, because replay protocols become named
  test interfaces rather than repeated incidental setup.
- Lower merge pressure: unrelated feature/spell tests no longer edit the same
  30k-line file.

Implementation order:

1. Extract `test-support/battle-fixtures.ts` and move only baseline ids,
   catalog setup, `startBattleRight`, and small battle constructors.
2. Extract attack, spell, reaction, stat-block, and feature fixtures in separate
   commits.
3. Move one low-coupling test group first, such as start/snapshot and QNT
   self-test, and run the package test file set.
4. Move procedure-family tests in the order above. Keep `index.test.ts` as a
   temporary compatibility shell until the last group moves, then delete it or
   leave only index-export smoke if one is still useful.

### 2. Unit Profile Admission Tests

Files:

- `packages/battle-runtime/src/unit-profile-admission.test.ts` at 19,515 lines.

Problem:

The file mixes unit-feature admission, spell-profile admission, deterministic
runtime replay for admitted profiles, unsupported-shape checks, and broad
catalog evidence. The existing `describe` blocks already expose natural seams:
unit features, spell damage, spell riders, repeat-save spells, Command, Grease,
movement spells, healing, Extra Attack, and passive movement.

Solution:

Create `packages/battle-runtime/src/unit-profile-admission/`:

- `fixtures.ts`: unit/stat-block catalogs, common ids, profile builders, shared
  battle constructors, fill builders.
- `unit-feature-profiles.test.ts`: Second Wind, Rage, Cunning Action, Evasion,
  Bardic Inspiration, Cutting Words, Innate Sorcery, Martial Arts, Deflect
  Attacks, Extra Attack, Fast Movement, Roving, Relentless Endurance,
  Adrenaline Rush.
- `weapon-and-attack-profiles.test.ts`: critical range, Weapon Mastery,
  Savage Attacker, Combat Prowess, attack riders.
- `spell-damage-profiles.test.ts`: cantrip/slot attack damage, save-gated
  damage, burst, chained, beam sequence.
- `spell-control-profiles.test.ts`: Sleep, Hideous Laughter, Command, Grease,
  Entangle, Color Spray.
- `spell-light-object-profiles.test.ts`: Light, Dancing Lights, Produce Flame,
  Starry Wisp, Fire Bolt object facts, Fog Cloud.
- `spell-rider-profiles.test.ts`: Divine Favor, Divine Smite, Ensnaring Strike,
  Searing Smite, Hunter's Mark, Hex, Bless/Bane/Guidance/Resistance.
- `spell-healing-and-movement-profiles.test.ts`: healing spells, Heroism,
  False Life, Longstrider, Shield of Faith, Expeditious Retreat, Jump,
  Thunderwave, Dissonant Whispers.

Benefits:

- Admission profile work becomes searchable by support-profile domain, not by
  authored record chronology.
- Coverage markers can sit beside the profile-family tests that own them.
- New SRD records land in the matching profile file instead of appending to a
  single accumulator.

Implementation order:

1. Extract fixtures.
2. Move unit-feature profiles first, because they use fewer spell fixtures.
3. Move spell families by profile, not by individual spell name.
4. Run the unit profile coverage checker after the full split so marker
   relocation is verified.

### 3. Package-Local Battle Runtime QNT

Files:

- `packages/battle-runtime/battle-runtime.qnt` at 12,219 lines.

Problem:

The file remains the canonical promoted spec, but it has accumulated domain
vocabulary, BattleState fixtures, active effects, turn hooks, reactions,
attacks, spell families, familiar lifecycle, object/light/obscurement, and
run tests. The May 11 split already proved the right direction: generic SRD
procedure semantics go to `shared-algebras/proofs/rule-core`, and package-local
QNT owns projection, integration, holes, replay, and smoke checks.

Solution:

Do not do a mechanical `types.qnt` split first. Follow the existing vertical
inventory and move behavior by semantic owner:

- `battle-runtime-find-familiar-lifecycle.qnt`: familiar summon, dismissal,
  reappearance, zero-HP disappearance, telepathy, shared senses, touch spell
  delivery, Pact of the Chain reaction attack. This is a good early candidate
  because it is package-local but conceptually narrow.
- `battle-runtime-object-light-obscurement.qnt`: Object Target, Light Emitter,
  Illumination, Sight Obscurement, object outline/ignition/damage facts.
- `battle-runtime-attack-replay.qnt`: package-local attack replay checkpoints,
  critical range wrappers, weapon mastery integration, Sneak Attack integration,
  attack-hit and after-damage reaction openings. Generic roll/damage math stays
  in rule-core.
- `battle-runtime-turn-effects.qnt`: active-effect duration ticking,
  start-of-turn and end-of-turn hooks, resistance reset, Heroism Temporary Hit
  Points, timed concentration cleanup.
- `battle-runtime-spell-repeat-saves.qnt`: Sleep and Hideous Laughter repeat
  save lifecycle, damage cleanup, shake-awake, and repeat-save turn hooks.
- `battle-runtime-command-and-ground-hazards.qnt`: Command options and Grease
  ground hazard turn/movement/save integration.
- `battle-runtime-marked-riders.qnt`: Hunter's Mark, Hex, target transfer, find
  marked target Advantage, duration maxima.

Keep `battle-runtime.qnt` as the stable integration shell with compatibility
wrappers only where focused MBT or older imports still require them. New focused
MBT should import narrower QNT modules directly when possible.

Benefits:

- QNT context becomes procedure-family context.
- Broad package-local QNT stops being the first place every promoted spell or
  feature lands.
- Model-checking cost can be managed through focused entrypoints instead of a
  single wider state machine.

Implementation order:

1. Refresh the May 11 vertical inventory against current line ranges.
2. Pick `Find Familiar` or `object/light/obscurement` as the tracer bullet.
3. Add direct focused imports in the matching selected-identity MBT where
   practical.
4. Move one vertical, leaving wrappers only for names that external QNT imports
   still use.
5. Run targeted QNT self-tests through the existing Vitest bridge, then only
   run battle MBT after a complete behavior-affecting batch.

### 4. Surface Tracer

Files:

- `packages/surface/src/interpreter/tracer.ts` at 8,268 lines.

Problem:

The tracer is one interpreter over many Surface record families: spells,
creatures/stat blocks, equipment, classes, features, species, backgrounds,
feats, magic items, spawned creatures, passive operations, and description
formatting. Its public interface is deep enough, but the implementation has too
many unrelated record-family branches in one file.

Solution:

Keep `traceUnit` and `traceStatBlock` as the public interface in
`tracer.ts`, then move record-family interpreters into
`packages/surface/src/interpreter/tracer/`:

- `graph.ts`: `Trace`, `TraceNode`, `TraceEdge`, `traceFromNodes`, id
  generation, common node/edge helpers.
- `spells.ts`: spell records, spell mechanics, activation phases, target
  selection, ongoing effects, save branches, spell scaling.
- `creatures.ts`: stat blocks, spawned creatures, attacks, saves, multiattack,
  controls, reanimated/templated creatures.
- `equipment.ts`: weapons, armor, shields, equipment predicates, damage,
  mastery, don/doff, magic equipment variants.
- `character-options.ts`: class records, class features, species, backgrounds,
  feats, starting equipment, proficiency grants.
- `magic-items.ts`: magic item payloads, attunement, variants, destruction,
  random tables, spawned creatures.
- `describe.ts`: label/format functions that have no graph-building state.

Benefits:

- Authoring-pressure agents can load only the record family under review.
- Trace graph primitives remain one shared implementation.
- The Surface interface stays a deep module: callers still learn `traceUnit`,
  not every record-family visitor.

Implementation order:

1. Extract `graph.ts` and `describe.ts` first.
2. Move equipment and magic items next; they are relatively far from spell
   replay logic.
3. Move creature/stat-block tracing.
4. Move spell tracing last because it has the widest atom vocabulary.

### 5. Character Creation Runtime Tests

Files:

- `packages/character-creation-runtime/src/index.test.ts` at 6,767 lines.

Problem:

The file mixes parser checks, source/key isomorphism, hole discovery, batch fill
semantics, finalization, class advancement, spellcasting, Warlock invocations,
equipment/loadout, and build projection. The runtime modules are already split;
the tests have not followed that shape.

Solution:

Create `packages/character-creation-runtime/src/test-support/fixtures.ts`, then
split tests:

- `character-draft-parser.test.ts`;
- `source-keys.test.ts`;
- `hole-discovery.test.ts`;
- `fill-reducer.test.ts`;
- `finalization.test.ts`;
- `build-projection.test.ts`;
- `class-advancement.test.ts`;
- `warlock-invocations.test.ts`;
- `spellcasting-creation.test.ts`;
- `equipment-and-loadout.test.ts`;
- `quint-slice-parity.test.ts`.

Benefits:

- Tests mirror the existing runtime workflow modules.
- Advancement and Warlock invocation work no longer requires loading all
  draft/fill/finalization tests.
- Finalization support-gate behavior gets its own review surface.

### 6. MCP Server Tests

Files:

- `packages/mcp/src/server.test.ts` at 5,809 lines.

Problem:

The file mixes MCP route registration, catalog tools, character creation tools,
battle tools, character-to-battle projection, end-battle handoff, and end-user
verticals. MCP is a composition seam, so tests should be grouped by workflow,
not by server file.

Solution:

Create `packages/mcp/src/test-support/mcp-route-fixtures.ts`, then split:

- `mcp/catalog-tools.test.ts`;
- `mcp/character-tools.test.ts`;
- `mcp/battle-tools.test.ts`;
- `mcp/character-battle-init.test.ts`;
- `mcp/battle-fills.test.ts`;
- `mcp/end-battle-handoff.test.ts`;
- `mcp/end-user-verticals.test.ts`;
- `mcp/tool-schema-contracts.test.ts`.

Benefits:

- MCP composition tests stay workflow-shaped.
- End-user verticals no longer share a file with low-level schema and route
  registration checks.
- The module interface for the test harness can encode common server/session
  setup once.

## Tier 2 Candidates

### 7. Character Sheet Runtime

Files:

- `packages/character-sheet-runtime/src/index.ts` at 4,184 lines.

Problem:

The package has a useful public interface, but implementation now mixes sheet
creation/parsing, HP and zero-HP lifecycle, rests, resources, Lay On Hands,
Arcane Recovery, armor class, ritual invocation, Spell Slots, Pact Slots,
Hit Dice, and stored build parsing.

Solution:

Keep `src/index.ts` as the public barrel and split implementation modules:

- `sheet-types.ts`: exported domain types and branded `CharacterSheetId`.
- `sheet-lifecycle.ts`: creation, parsing, top-level sheet accessors.
- `hit-points.ts`: HP, Temporary Hit Points, zero-HP lifecycle, Stable recovery,
  Knock Out state.
- `rests.ts`: Short Rest, Long Rest, Hit Dice recovery, Pact Slot recovery,
  Arcane Recovery.
- `resources.ts`: Lay On Hands, Favored Enemy free-cast resources, generic
  resource expenditure capacity.
- `spell-invocation.ts`: ordinary Spell Slot and Pact Slot invocation, Wizard
  Ritual Adept, Book of Shadows ritual access.
- `armor-class.ts`: armor loadout, Unarmored Defense base choice, current AC.
- `stored-sheet-parser.ts`: parse stored build/sheet/session records.

Benefits:

- Character Sheet becomes easier to widen without editing a single entrypoint.
- In-play state domains remain separate from build-derived projections.
- Parser failures stay typed and local.

### 8. Battle Reducer Type and Codec Surface

Files:

- `packages/battle-runtime/src/battle-reducer.ts` at 4,378 lines.
- `packages/battle-runtime/src/battle-reducer/battle-codecs.ts` at 3,543 lines.

Problem:

The old reducer split left the public type/codec surface still large. That was
reasonable during the first split, but now agents often need only active-effect
types, reaction protocol types, fill codecs, or snapshot codecs.

Solution:

Split by domain families, not `types` versus `schemas`:

- `battle-reducer/active-effects.ts`: `BattleActiveEffect`, concentration-owned
  active effect facts, light emitters, obscurement zones.
- `battle-reducer/reaction-protocol.ts`: interrupted procedures, reaction
  frames, reaction choices, replay continuations, after-damage events.
- `battle-reducer/battle-state.ts`: `BattleState`, `BattleCreatureState`,
  turn resources, creature origin state, top-level state constructors.
- `battle-reducer/battle-codec-holes.ts`: `BattleHoleSchema` and its members.
- `battle-reducer/battle-codec-fills.ts`: `BattleFillSchema` and fill payload
  members.
- `battle-reducer/battle-codec-subjects.ts`: subject/act schemas.
- `battle-reducer/battle-codec-snapshots.ts`: snapshot schemas.
- `battle-reducer/battle-codec-spells.ts`: spell invocation/access/resource
  codecs.

Benefits:

- Codec changes for one runtime protocol do not require loading every codec.
- The public type surface becomes navigable by protocol domain.
- Future audit scripts can compare schemas by exported member family.

Risk:

This is a high-coupling split. Do it after the test split so regression tests
are easier to run and review.

### 9. Dispatcher and Turn/Movement Modules

Files:

- `packages/battle-runtime/src/battle-reducer/dispatcher.ts` at 3,685 lines.
- `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts` at 3,481
  lines.

Problem:

`dispatcher.ts` intentionally kept subject resolution, reaction windows, and
turn/snapshot orchestration together after the 30k-line split because of
cycles. `turn-end-movement.ts` now conflates turn boundary, start-turn effects,
end-turn effects, Command option execution, Grease ground hazards, movement
resolution, stand from Prone, and repeat-save hooks.

Solution:

Do not split `dispatcher.ts` mechanically. First extract internal modules behind
the same dispatcher interface:

- `reaction-windows.ts`: open/take/decline reaction window and choice
  enumeration.
- `reaction-continuations.ts`: replay continuation, attack-damage continuation,
  concentration continuation.
- `battle-snapshot.ts`: snapshot projection and current frame read helpers.
- `subject-resolution.ts`: the direct subject dispatcher.

For `turn-end-movement.ts`, split by runtime procedure:

- `turn-boundary.ts`: `resolveEndTurn`, turn resource reset, start/end turn
  orchestration.
- `turn-active-effects.ts`: start/end/tick active effects and concentration
  duration cleanup.
- `spell-repeat-saves.ts`: Sleep, Hideous Laughter, and turn-start damage
  repeat-save hooks.
- `command-options.ts`: Command Grovel, Halt, Drop, Approach, and Flee.
- `ground-hazards.ts`: Grease ground hazard appearance, entry, and end-turn
  saves.
- `movement-resolution.ts`: Movement fills, readied Movement, stand from Prone,
  Jump movement replacement, movement parsing.

Benefits:

- The existing dispatcher module remains the external seam while internal
  locality improves.
- Command and Grease work stop requiring all generic movement code in context.

### 10. Surface Schemas

Files:

- `packages/surface/src/surface/schema-spell.ts` at 3,300 lines.
- `packages/surface/src/surface/schema-nonspell.ts` at 2,362 lines.

Problem:

The schema files are authored-content vocabulary files. They are dense because
they encode many record families and mechanics. Agents working on one Surface
family need a narrower context.

Solution:

For spells:

- `schema-spell/scaling.ts`: levels, threshold tiers, dice expressions.
- `schema-spell/timing.ts`: casting time, duration, reset cadence, action
  restrictions.
- `schema-spell/targeting.ts`: ranges, target selection, areas, object filters.
- `schema-spell/effects.ts`: effect atoms, ongoing operations, save branches,
  damage, conditions, movement effects.
- `schema-spell/spawned-creatures.ts`: familiar/summon/reanimated/templated
  creature mechanics.
- `schema-spell/record.ts`: final `SpellRecordSchema` composition.

For non-spells:

- `schema-nonspell/class-records.ts`;
- `schema-nonspell/class-feature-mechanics.ts`;
- `schema-nonspell/weapon-mastery-and-riders.ts`;
- `schema-nonspell/background-species-feats.ts`;
- `schema-nonspell/equipment-records.ts`;
- `schema-nonspell/magic-items.ts`;
- `schema-nonspell/unit-record.ts`.

Benefits:

- Surface widening work happens near the authored family that creates pressure.
- The final record schemas become composition modules rather than monoliths.

### 11. Battle Unit Feature Support

Files:

- `packages/battle-runtime/src/unit-feature-support.ts` at 3,191 lines.

Problem:

This file owns many support-profile parsers and projections. The module name is
correct, but the implementation should now split by reusable profile family.

Solution:

Create `packages/battle-runtime/src/unit-feature-support/`:

- `index.ts`: public support-profile interface.
- `resources.ts`: resource capacity and resource-owner projections.
- `action-grants.ts`: Action Surge, alternate action cost, bonus action dash.
- `passive-profiles.ts`: armor class, attack-roll, speed, speed-kind profiles.
- `attack-riders.ts`: Sneak Attack, Divine Smite-like rider admission,
  Savage Attacker, Weapon Mastery, Combat Prowess.
- `reaction-modifiers.ts`: Cutting Words, Uncanny Dodge, Deflect Attacks.
- `zero-hit-point-replacements.ts`: Relentless Endurance-style profiles.
- `ongoing-features.ts`: Rage, Reckless Attack, Innate Sorcery, similar active
  ongoing features.

Benefits:

- New feature support is reviewed in the matching profile family.
- Discovery and resolution can import narrowed profile parsers instead of a
  single all-support module.

## Tier 3 Candidates

These are useful but lower priority than the active battle, Surface, MCP, and
character runtimes.

| File | Lines | Recommendation |
| --- | ---: | --- |
| `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts` | 4,615 | Split selected identity evidence into light/object sight, forced movement/terrain, and visibility witness files. |
| `packages/battle-runtime/src/level1-buff-mark-smite-selected-identity.mbt.test.ts` | 4,132 | Split into scalar buffs, roll modifiers, marked riders, smite/weapon riders, and protection/charm evidence. |
| `packages/battle-runtime/src/level1-damage-spell-selected-identity.mbt.test.ts` | 2,204 | Split into attack damage, save-gated damage, burst/chained, and object-target evidence. |
| `packages/battle-runtime/src/battle-runtime.mbt.test.ts` | 3,740 | Keep as broad MBT shell for now. Extract helper setup only after Tier 1 test split. |
| `packages/battle-runtime/src/rule-core-features.mbt.test.ts` | 2,673 | Split by rule-core feature family if it keeps growing past current feature batches. |
| `packages/battle-runtime/src/rule-core-spells.mbt.test.ts` | 2,199 | Split by spell procedure family after spell QNT modules settle. |
| `packages/character-creation-runtime/src/finalization.ts` | 2,709 | Split into readiness/support, build identity, proficiencies, spellcasting, equipment/loadout, ability-score increases. |
| `packages/character-creation-runtime/src/character-build-advancement.ts` | 2,244 | Split into class-level gain, Fighter Fighting Style replacement, Warlock invocation advancement, Pact Magic advancement. |
| `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt` | 2,239 | Split by procedure family only when battle-runtime QNT imports have narrowed. |
| `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt` | 1,690 | Split after the battle-runtime spell QNT split identifies stable spell procedure families. |
| `scripts/srd-unit-inventory.cjs` | 3,632 | Split into inventory IO, source scanning, classification, report writing, and task planning. |
| `scripts/ralph-run.sh` | 2,594 | Split shell functions into sourced files by queue, GitHub, execution, and reporting if this script remains active. |
| `packages/character-battle-runtime/src/battle-character-build-projection.ts` | 1,181 | Split only if projection broadens: character sheet init, spellcasting projection, invocation projection, and handoff settlement. |

## Recommended Wave Order

1. Battle runtime test split:
   `index.test.ts` and `unit-profile-admission.test.ts`.
2. Surface tracer split.
3. Character creation and MCP test splits.
4. Battle runtime QNT tracer bullet, starting with Find Familiar or
   object/light/obscurement.
5. Character Sheet runtime split.
6. Battle reducer public type/codec split.
7. Turn/movement and dispatcher internal split.
8. Surface schema split.
9. Unit feature support split.
10. Tier 3 MBT/script/runtime follow-ups as they become active work surfaces.

This order improves review and verification before touching the most
semantically coupled modules. It also makes later reducer/QNT changes cheaper
because tests are no longer concentrated in two huge files.

## Verification

Every implementation plan derived from this split wave must include these
checks.

Reviewer-loop convergence:

- Run RAW traceability, ubiquitous-language/domain-language, architecture and
  connascence, and code-review passes after implementation.
- Fix every reasonable finding.
- Reject only findings with a concrete reason.
- Repeat the loop until no reasonable findings remain. A single round is only
  acceptable for trivially small moves under about 20 lines.

RAW and ubiquitous-language check:

- Before changing modeled rules, read the relevant SRD passage in
  `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`.
- For pure file/test splits that should not change rules, verify that no
  modeled rule, support gate, state shape, or runtime projection changed. If a
  moved module exposes a hidden rule assumption, stop and add the RAW check for
  that assumption before continuing.

Mechanical checks:

- Run `pnpm --filter <package> typecheck` after each code split batch.
- Run focused `pnpm --filter <package> exec vitest run <moved test files>` after
  each test split batch.
- For large source moves, add or reuse an audit like
  `scripts/audit-battle-reducer-split.mjs` to compare moved function names,
  hashes when possible, and barrel exports.
- For battle-runtime production source, run
  `pnpm check:authored-id-dispatch` after reducer/support-profile splits.
- For unit profile admission test splits, run
  `pnpm unit-profile-coverage:check` after marker relocation.
- For Surface schema/tracer splits, run
  `pnpm --filter @dnd/surface typecheck` and
  `pnpm --filter @dnd/surface test`.
- For MCP test splits, run `pnpm --filter @dnd/mcp test`.
- For Character Creation and Character Sheet splits, run the package-local
  `typecheck` and `test` scripts.

MBT discipline:

- Do not run battle MBT for exploratory split planning.
- Only run battle MBT after a completed behavior-affecting battle-runtime
  change.
- If a split is purely mechanical and focused tests plus typecheck establish no
  behavior movement, do not spend MBT unless the moved seam is an MBT bridge or
  QNT integration entrypoint.
- If MBT is required, follow the repository protocol: one MBT run at a time,
  check for zombie `quint_evaluator` processes first, run in background with a
  timing wrapper, and reproduce failures with the reported seed before fixing.

Connascence checks:

- For each moved module ask: what must change together if this line changes?
- Weaken or localize duplicated string literals, option ids, support-profile
  tags, tuple positions, and action sequencing protocols.
- Preserve executable assumptions. Do not replace type-enforced or parser-
  enforced assumptions with comments.
