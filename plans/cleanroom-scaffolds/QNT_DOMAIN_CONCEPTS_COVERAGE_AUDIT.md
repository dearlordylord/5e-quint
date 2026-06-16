# Audit: QNT Domain Concept Coverage

Status: unreviewed draft coverage audit. This is not reviewed harness guidance,
not cleanroom bootstrap input, not a coverage manifest, and not a claim that
the nine concepts are fully enforced by cleanroom tasks today. Its job is to
say what is already source-owned QNT, what is tied to source TS/MBT, what the
current cleanroom sync copies, and what remains a real gap.

Scope: the nine concepts in
`plans/cleanroom-scaffolds/QNT_DOMAIN_CONCEPTS_HARNESS_PLAN.md`.

## Status Vocabulary

- `direct`: source QNT explicitly owns the concept at the audited scope, and
  source runtime parity or a source contract check is named.
- `partial`: source QNT covers concrete slices or vocabulary, but not the whole
  concept as a reusable source-owned contract.
- `narrow`: source QNT is direct for the current deliberately narrow model.
- `non-QNT remainder`: QNT can model part of the concept, but source-code shape
  or target architecture still needs static, reviewer, or artifact checks.
- `copied`: the QNT file is currently in a `scripts/sync-cleanroom-input.cjs`
  allowlisted package tree and will be copied under `cleanroom-input/qnt/**`.
- `branch-selected`: the current
  `plans/cleanroom-branch-coverage/source-branch-inventory.json` names the
  `.mbt.qnt` driver as cleanroom branch work.
- `source-obligation-only`: `plans/rules-kernel-coverage/obligations.jsonl`
  records source coverage, but the current cleanroom branch inventory does not
  select that driver.

## Current Sync Facts

- `scripts/sync-cleanroom-input.cjs` copies `.qnt` files from
  `packages/battle-runtime`, `packages/character-creation-runtime`,
  `packages/character-sheet-runtime`, `packages/character-battle-runtime`, and
  `packages/shared-algebras/proofs/rule-core`.
- The sync preserves package-relative QNT layout under `cleanroom-input/qnt/**`,
  verifies copied QNT imports resolve, rewrites branch-inventory driver paths
  to cleanroom-local QNT paths, and checks branch-inventory QNT hashes.
- The current cleanroom source branch inventory has 452 branch obligations and
  15 sampled inputs.
- `plans/rules-kernel-coverage/obligations.jsonl` is broader than the cleanroom
  branch inventory. It records source obligations, qntOwners, runtimeOwners,
  and parity witnesses that may not be selected as cleanroom branch work today.

## Summary

| # | Concept | Source QNT Coverage | Source TS/MBT Tie | Current Cleanroom Effect | Audit Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Hole, Fill, And Witness Ownership | Partial-to-direct for battle protocol vocabulary and witness result; partial for table-owned ownership as a whole | Contract test plus focused MBT drivers that import witness protocol | Copied; some related drivers branch-selected | Not a single complete source-owned concept contract yet |
| 2 | Source Fact, Table Witness, Runtime Projection | Partial, strong for light/spatial witness slices | Focused spatial witness MBT and runtime tests | Copied and branch-selected for level-1 spatial witness | Covers representative slices, not the general ownership taxonomy |
| 3 | Support-Profile Admission | Direct for many profile facts; non-QNT remainder for no identity dispatch | Rule-core QNT, selected-identity MBTs, profile coverage checks | Copied and broadly branch-selected | Strong source QNT for admission facts, but source/target static gates still matter |
| 4 | Result Taxonomy | Partial; typed witness protocol exists, but result strings remain elsewhere | Many MBT drivers use `WitnessProtocol`; character creation has typed batch results | Copied through imported witness protocol and selected drivers | Needs migration before "resolved / needs holes / invalid" is universal |
| 5 | Procedure Lifecycle And Replay Protocol | Direct for current battle command/reaction/replay obligations | Focused MBT for command ordering, reactions, interrupt stack resume | Copied; command and interrupt drivers branch-selected | Strong for covered battle procedures, not tagged as a general lifecycle concept |
| 6 | Runtime Occurrence State | Partial across active-effect lifecycle slices | Focused MBT/runtime tests for direct conditions, roll modifiers, scalar buffs, light | Copied; only some occurrence drivers branch-selected today | Needs a source-owned occurrence ownership contract if we want general coverage |
| 7 | Character Draft, Build, Sheet, Battle, Handoff | Direct/strong across creation, sheet, battle init, and settlement source obligations | Focused MBT and deterministic QNT replay tests | Copied; creation/sheet drivers selected, battle handoff mostly source-obligation-only today | Strong source QNT, partial current cleanroom branch selection |
| 8 | Authored Identity, Provenance, Runtime Projection | Partial in QNT through typed profile facts and selected identity; non-QNT remainder is central | Selected-identity MBTs and static authored-id dispatch checks | Copied for QNT facts; static target enforcement is not QNT-only | Cannot honestly become QNT-only coverage |
| 9 | Encounter Relationships And Side | Narrow and direct for current side-equality model | QNT owner participates in source feature obligations; MCP/runtime tests cover setup input | Copied, but not direct branch-selected | Covered for current narrow model, not promoted as standalone cleanroom task |

## 1. Hole, Fill, And Witness Ownership

Verdict: partial-to-direct. There is real source QNT, but it is not a single
concept contract for all ownership cases.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-witness-protocol.qnt` defines the
  shared typed witness protocol: `WInit`, `WNeedsHoles`, `WResolved`, and
  `WInvalid(reason)`.
- `packages/battle-runtime/battle-runtime-hole-kinds.qnt`,
  `packages/battle-runtime/battle-runtime-fill-kinds.qnt`, and
  `packages/battle-runtime/battle-runtime-subject-kinds.qnt` define leaf
  vocabulary promoted from semantic-frontier rows.
- `packages/battle-runtime/battle-runtime-command-ordering.qnt` models hole
  frontier stages, fill ordering, and the table-owned held-object-facts stage
  for Command.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` marks
  `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` covered by the QNT vocabulary leaves
  and `packages/battle-runtime/src/battle-hole-family-kind.test.ts`.
- The same ledger marks `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` covered by
  ordering QNT owners and focused MBT witnesses.
- `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt` imports the
  hole/fill leaves and `WitnessProtocol`.

Cleanroom state:

- The QNT files are copied because they live under allowlisted package QNT
  roots.
- `battle-runtime-command-ordering.mbt.qnt` is currently selected in
  `source-branch-inventory.json`.
- The leaf vocabulary files are copied and imported, but are not themselves
  standalone cleanroom branch work.

Gap:

- Table-owned ownership is partly in JSON frontier classification and source
  contract checks, not fully in QNT.
- A target could still hide bad production ownership behind a quarantined
  adapter unless state-owner artifacts or later source QNT make the ownership
  observable.

Promotion path:

- Keep the source-owned QNT leaves as authority.
- If stronger cleanroom pressure is needed, add a source-owned QNT ownership
  contract or source inventory tags that connect semantic-frontier versus
  table-owned rows to branch work. Do not invent a separate cleanroom-only QNT
  truth.

## 2. Source Fact, Table Witness, And Runtime Projection

Verdict: partial. The light/spatial slice is strong; the general taxonomy is not
yet a reusable QNT contract.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-light.qnt` owns source-created light
  emitter lifecycles, projection constants, duration cleanup, and active-effect
  emitter projection.
- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
  records source facts, witness facts, and projection facts for Dancing Lights,
  Faerie Fire, Feather Fall, Fog Cloud, Grease, Jump, Light, Produce Flame, and
  Thunderwave.
- `docs/adr/0004-light-obscurement-sight-source-facts-and-witnesses.md` is the
  prose architecture record for the source-fact/table-witness/runtime-projection
  split.

Source TS/MBT tie:

- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
  is the focused MBT tie for the selected spatial witness driver.
- `plans/rules-kernel-coverage/obligations.jsonl` records source obligations
  such as `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`,
  `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`, and
  `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE` with
  `battle-runtime-light.qnt` and the spatial witness MBT.

Cleanroom state:

- The QNT files are copied.
- `battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt` is currently
  selected in the cleanroom branch inventory.

Gap:

- There is no general source-owned QNT vocabulary saying "durable source fact",
  "table witness fact", and "runtime projection" for every future task.
- Geometry, line of sight, area membership, and similar facts remain boundary
  decisions enforced by prose, source runtime shape, and review rather than one
  universal QNT model.

Promotion path:

- Add source-owned QNT only where a concrete rule slice needs the distinction.
- Add source inventory metadata only after the taxonomy is stable enough to be
  machine-checked without pretending QNT can inspect target internals.

## 3. Support-Profile Admission

Verdict: strong for profile facts, partial overall because "no authored
identity dispatch" cannot be fully QNT-enforced.

Source QNT evidence:

- `packages/shared-algebras/proofs/rule-core/spell-definition-profiles.qnt`
  defines spell definition profile vocabulary.
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`
  defines typed spell procedure facts and result functions.
- `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt`
  models unit-feature procedure profile behavior over action economy, feature
  pools, rage/reckless occurrences, attack riders, save damage, reaction
  reductions, passive movement/defense, martial arts, and zero-hit-point
  behavior.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` records
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` and
  `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` as covered, with rule-core QNT
  owners and focused MBT witnesses.
- Selected-identity MBT drivers in battle, character creation, sheet, and
  character battle prove that concrete selected records are admitted through
  typed facts at package boundaries.
- `scripts/check-authored-id-dispatch-boundary.cjs` is the non-QNT static check
  for the identity-dispatch side of the concept.

Cleanroom state:

- Rule-core profile QNT and selected-identity `.mbt.qnt` drivers are copied.
- Many selected-identity drivers are currently selected in cleanroom branch
  inventory.

Gap:

- QNT can force profile facts and behavior, but it cannot scan a target Rust
  reducer for `if spell_id == ...` style dispatch.
- Current cleanroom branch inventory does not explicitly tag branches as
  support-profile-admission obligations.

Promotion path:

- Keep source QNT as the authority for profile semantics.
- Keep static/reviewer gates for authored identity dispatch. This should remain
  a `non-QNT remainder`, not be forced into QNT dishonestly.

## 4. Result Taxonomy

Verdict: partial. The typed witness protocol exists and is widely imported, but
the result taxonomy is not universal yet.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-witness-protocol.qnt` defines typed
  `WitnessResult` variants: init, needs holes, resolved, and typed invalid.
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
  defines `FillBatchResult = Accepted(...) | Rejected(...)` and
  `FinalizationStatus = Ready | Incomplete | Invalid`.
- `packages/battle-runtime/battle-runtime-command-ordering.qnt` defines typed
  accepted/requested-earlier/rejected/not-ordering-error results for Command
  fill order.

Source TS/MBT tie:

- Many battle MBT drivers import `WitnessProtocol`.
- `character-creation-runtime.mbt.qnt` projects accepted/rejected batch results
  into source runtime parity.
- `docs/adr/0001-forest-of-qnt-slices.md` explicitly notes that legacy mutable
  witness-protocol names are banned, but remaining `qScenarioResult`-style
  projection strings are separate future migration work.

Cleanroom state:

- The result QNT files are copied through package QNT sync.
- Drivers using `WitnessProtocol` or typed character creation batch results are
  selected when their `.mbt.qnt` files are selected.

Gap:

- There is no universal source QNT result taxonomy contract applied to all
  drivers.
- Some witnesses still use string scenario labels for domain projection while
  carrying `WitnessProtocol` for protocol result.
- Target replay evidence checks pass/fail and projection hashes; they do not
  currently require production APIs to expose a typed result taxonomy.

Promotion path:

- Continue migrating source QNT witnesses from ad hoc result strings to typed
  result variants where the result has protocol meaning.
- Only after source QNT is consistent should cleanroom evidence require the same
  taxonomy broadly.

## 5. Procedure Lifecycle And Replay Protocol

Verdict: direct for current battle command/reaction/replay obligations; not yet
a general lifecycle tag system.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-command-ordering.qnt` models
  discovery, fill ordering, table-fact stages, and resolution for Command.
- `packages/battle-runtime/battle-runtime-reaction-window.qnt` and
  `packages/battle-runtime/battle-runtime-reaction-resolution.qnt` model
  reaction offer/decline/resolution behavior.
- `packages/battle-runtime/battle-runtime-replay-equivalence.qnt` defines
  replay-from-root projection vocabulary.
- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
  witnesses nested interrupt resume, mutation resume, and replay-from-root
  equivalence.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` marks
  `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`,
  `BATTLE.REACTION.OFFER_DECLINE_RESUME`, and
  `BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` covered with focused MBT
  witnesses.
- `packages/battle-runtime/src/command-ordering.mbt.test.ts`,
  `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts`, and
  `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts` are the
  named TS ties.

Cleanroom state:

- The QNT files are copied.
- `battle-runtime-command-ordering.mbt.qnt`,
  `battle-runtime-interrupt-stack-resume.mbt.qnt`, and
  `rule-core-reactions.mbt.qnt` are selected in current branch inventory.

Gap:

- Branch inventory rows are not lifecycle-stage tagged.
- A copied driver can force a target behavior branch without teaching the
  target agent which reusable lifecycle stage it should generalize next.

Promotion path:

- Prefer adding lifecycle metadata to source obligations or branch inventory
  after source QNT stage names stabilize.
- Keep replay adapters quarantined; do not turn QNT action names into
  production API names.

## 6. Runtime Occurrence State

Verdict: partial. There are several source QNT occurrence slices, but no
general source-owned occurrence ownership contract.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.qnt`
  models a spell-owned condition source, duration ticks, early ending,
  concentration cleanup, and preservation of non-spell condition source.
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
  models active roll modifiers, selected ability/skill facts, concentration,
  and cleanup projections for several spells.
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
  models active scalar effects for AC, Speed, special speeds, Hit Point maximum,
  and Temporary Hit Points.
- `UBIQUITOUS_LANGUAGE.md` defines Active Ongoing Feature Occurrences as runtime
  state carrying mutable runtime facts without duplicating display names,
  source mechanics, or derived support labels.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` records active-effect
  obligations such as `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`,
  `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`, and
  `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`.
- `packages/battle-runtime/src/direct-condition-lifecycle.mbt.test.ts`,
  `packages/battle-runtime/src/roll-modifier-active-effects.mbt.test.ts`, and
  `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts` are
  named parity ties.

Cleanroom state:

- The QNT files are copied.
- Current cleanroom branch inventory selects roll-modifier and scalar-buff
  active-effect drivers, but not every occurrence-state source obligation.

Gap:

- No general QNT contract states what every occurrence must and must not store:
  source key, mutable choice, expiry, cleanup owner, and excluded authored facts.
- Some occurrence ownership is currently enforced by runtime type shape,
  ubiquitous-language prose, and review.

Promotion path:

- Add source QNT occurrence contracts only for concrete lifecycle families.
- If a generic occurrence audit is desired later, pair QNT with state-owner
  artifacts rather than pretending QNT can prove no redundant internal fields.

## 7. Character Draft, Build, Sheet, Battle, And Handoff Ownership

Verdict: strong source QNT coverage; partial current cleanroom branch selection.

Source QNT evidence:

- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
  models draft holes, fills, revision checks, accepted/rejected batch results,
  finalization status, and the supported creation slice.
- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
  replays creation fill sequences and rejection cases.
- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`,
  `character-sheet-hp-rest-hit-dice.mbt.qnt`,
  `character-sheet-spell-slots-pact-slots.mbt.qnt`, and other sheet drivers
  cover sheet-owned in-play projections and state transitions.
- `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
  models character sheet/build projection into battle init.
- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
  models battle settlement back into sheet state and conflict rejection.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` records covered obligations
  for creation draft/fill, creation choices, sheet hit-point maximum, sheet rest
  and slot transitions, character-battle init projection, settlement, and
  identity conflicts.
- The corresponding TS ties include
  `packages/character-creation-runtime/src/character-creation-runtime.mbt.test.ts`,
  `packages/character-sheet-runtime/src/hit-point-maximum.mbt.test.ts`,
  `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts`,
  and
  `packages/character-battle-runtime/src/character-battle-settlement.mbt.test.ts`.

Cleanroom state:

- The QNT files are copied.
- Current cleanroom branch inventory selects several creation and sheet drivers.
- Current cleanroom branch inventory does not select the character-battle init
  and settlement drivers even though the source obligation ledger marks them
  covered.

Gap:

- The source side is strong, but cleanroom branch selection is not yet the full
  draft/build/sheet/battle/handoff loop.
- QNT proves observable protocol and projection facts. It does not by itself
  prove a target implementation avoided one giant `Character` struct unless
  state-owner or static review gates also inspect target shape.

Promotion path:

- Add the handoff drivers to cleanroom branch scope when the target should be
  forced through the full Ralph loop.
- Keep layer ownership evidence in state-owner artifacts for internal target
  structure.

## 8. Authored Identity, Provenance, And Runtime Projection

Verdict: partial in QNT with a required non-QNT remainder.

Source QNT evidence:

- Rule-core profile QNT files model typed profile/procedure facts rather than
  authored ids.
- Selected-identity `.mbt.qnt` drivers use concrete selected records as
  boundary evidence while projecting behavior through typed facts.

Source TS/MBT tie:

- Selected-identity MBT tests tie source runtime behavior to QNT-selected
  boundary facts.
- `scripts/check-authored-id-dispatch-boundary.cjs` owns the source-code
  scanning part of the concept.
- `ARCHITECTURE.md` and `AGENTS.md` state that runtime semantics must use
  parsed shape, support-profile readers, typed procedure facts, and explicit
  runtime state rather than authored identity dispatch.

Cleanroom state:

- The QNT files that model typed facts are copied.
- The current cleanroom scaffold has reviewer/decider language around authored
  identity dispatch, but QNT alone cannot enforce target source-code shape.

Gap:

- QNT cannot honestly verify that target Rust never branches on authored names,
  ids, slugs, source headings, or provenance sections.
- Provenance versus structured input versus runtime projection is broader than
  the copied QNT files.

Promotion path:

- Keep source QNT focused on typed facts and selected-identity boundaries.
- Keep authored-identity dispatch as an explicit static/reviewer/decider gate
  for both source and cleanroom targets.

## 9. Encounter Relationships And Encounter Side

Verdict: narrow and direct for the current model.

Source QNT evidence:

- `packages/battle-runtime/battle-runtime-combatant-side.qnt` defines actor
  side, damage-source side, caster-or-ally checks, and enemy projection as side
  inequality.

Source TS/MBT tie:

- `plans/rules-kernel-coverage/obligations.jsonl` includes
  `battle-runtime-combatant-side.qnt` under current feature procedure coverage.
- MCP and battle runtime tests exercise caller-supplied `side` input during
  battle setup.

Cleanroom state:

- The QNT file is copied.
- It is not currently selected as a standalone cleanroom branch driver.

Gap:

- Current QNT is intentionally narrow: same side means ally, different side
  means enemy. It does not model neutrality, temporary hostility, charm
  allegiance override, or per-pair relationship matrices.
- Since the current model is narrow by design, the gap is not "missing
  mechanics"; it is only missing standalone cleanroom pressure if we want target
  architecture to expose encounter-side ownership explicitly.

Promotion path:

- Keep the side-equality QNT until source widens the relationship model.
- If cleanroom needs explicit pressure, add side setup ownership to source
  branch inventory or state-owner artifacts, not a broader QNT than source
  currently believes.

## Honest Next Work

Do not create a "1-9 covered" manifest from this audit. The source does not yet
have full source-owned QNT concept contracts for all nine concepts.

Useful next actions, in order:

1. Decide which partial concepts should become stronger source-owned QNT
   contracts and which should stay QNT plus artifact/static gates.
2. Add source QNT only for concrete rule/lifecycle families, then prove source
   TS/MBT parity.
3. Update cleanroom branch scope only after source QNT coverage exists.
4. Add cleanroom evidence requirements only for facts that source QNT or source
   artifact gates already own.
