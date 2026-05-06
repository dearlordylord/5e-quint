# QMBT1-QMBT6 Pre-Research

Date: 2026-05-06

Purpose: add the first promoted rule-core MBT parity queue after QCORE7-QCORE11
without widening into full battle state space. QNT remains the first authority;
the MBT drivers must exercise production reducers or extracted production
procedures, not test-only reimplementations.

## Shared Architecture

- Keep QNT free of authored Surface records. Use QCORE projection facts and
  small runtime-shaped fixtures.
- Prefer one focused MBT spec/driver per QCORE family instead of one broad
  `battle-runtime.qnt` lane.
- Compare scalar projections: resources, holes, HP deltas, reaction window
  shape, movement budget, and last result. Do not compare full runtime state.
- If production-equivalent procedure logic is private in `battle-reducer.ts`,
  either validate through public battle runtime APIs or extract a production
  module that battle-runtime itself consumes before MBT tests it.
- Avoid broad catalogs, multiple eligible reactors, full authored spell lists,
  and full attack/damage recursion unless that QMBT task owns the behavior.
- Use bounded fixtures and fixed fact tables. State-space growth should come
  from the procedure under test, not from authored content discovery.

Open projection-vocabulary guidance:

- Candidate shared terms include `lastResult` or `lastOutcome`,
  `invalidReason`, `holes`, `actionAvailable`, `bonusActionAvailable`,
  `reactionAvailable`, `movementSpentFeet`, `movementRemainingFeet`,
  `concentrationActive`, `readiedHeld`, and `readiedReleased`.
- Candidate lane-local terms include `pendingPrimaryDispatches`,
  `pendingSecondaryDispatches`, `multiattackContinuationOpen`,
  `legendaryActionWindowOpen`, `level1SlotsRemaining`,
  `deathSaveSuccesses`, `deathSaveFailures`, `featurePoolRemaining`,
  `rageActive`, `sneakAttackUsed`, and `cuttingWordsDieAvailable`.
- Treat this list as provisional, not reviewed contract. Revisit it after the
  QMBT3 worktree lands, and extract shared helpers only when the same domain
  projection shape repeats across at least two lanes.

## QMBT1 - Standard Rule-Core MBT Bridge Contract

Recommended home:

- Shared rule-core procedure MBT belongs near the production procedure modules
  that the reducers use.
- Battle runtime parity MBT belongs in `packages/battle-runtime` when the only
  stable production API is `startBattle`, `discoverBattleActs`,
  `resolveBattleSubject`, `resolveBattleReaction`, and `snapshotBattle`.

Bridge contract:

- QNT action names mirror the owned proof action names: `init`, procedure
  action, optional `step`.
- TS driver actions call production reducers/procedure functions.
- The bridge projects only QCORE-observable facts.
- Each MBT file documents its fixture bounds and explicit exclusions.
- Existing promoted battle MBT remains a final integration gate, not the place
  to accumulate all QCORE parity.

Verification candidates:

- `pnpm --filter @dnd/shared-algebras typecheck`
- `pnpm --filter @dnd/shared-algebras proof:quint`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/battle-runtime test`
- Focused MBT only after implementation, with the mandatory timing wrapper and
  a small `MBT_TRACES`/`MBT_STEPS` bound.

## QMBT2 - Movement/Grapple Runtime Parity

QCORE source:

- `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple-inductive.qnt`

Runtime entrypoints:

- `resolveBattleSubject` for `move`, `standFromProne`, `dash`, `disengage`,
  `grapple`, `escapeGrapple`, and `releaseGrapple`.
- `resolveBattleReaction` only for Opportunity Attack decline/resume.

Projection:

- movement spent, movement remaining, dash bonus, disengaged, prone,
  grapple-active, grapple escape DC, action availability, holes, pending OA,
  last result, and invalid reason.

Bounds:

- two-combatant fixture, one possible OA threat, one grapple link.
- movement costs `{5, 10, 30, 35}`.
- grapple outcome success/failure.
- decline-only OA. Resolving the OA attack belongs to attack/reaction MBT.

Risk:

- Full OA resolution pulls attack roll, damage, damage reactions,
  concentration, and knockout paths into the movement lane.

## QMBT3 - Reaction/Continuation Runtime Parity

QCORE source:

- `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`
- `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration-inductive.qnt`

Scope:

- offer, decline, matching reaction spend, continuation resume, readied
  movement release, and concentration save break/hold.
- keep full readied spell release out unless projecting only held/dissipated
  state; spell release belongs to QMBT5.

Projection:

- pending reaction trigger, pending stack depth, holes, reaction availability,
  readied movement/spell held flags, concentration flags, movement spent, last
  result, and invalid reason.

Bounds:

- one eligible reactor per window.
- movement costs `{0, 5, 10}`.
- concentration damage amounts `{0, 8, 22, 80}`.
- one or two fixtures; post-ready fixture setup is allowed when documented as
  fixture state rather than a modeled transition.

Risk:

- Runtime interruption stacks are richer than QCORE8. Keep projection scalar and
  avoid mixing feature reactions, readied spell resolution, and OA attack
  damage in the same lane.

## QMBT4 - Feature Procedure Runtime Parity

QCORE source:

- `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles.qnt`
- `packages/shared-algebras/proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt`

Runtime entrypoints:

- `discoverBattleActs` for supported unit features and bonus-action standard
  actions.
- `resolveBattleSubject` for `unitFeature`, `bonusActionStandardAction`,
  attacks, spells, and runtime commands.
- `resolveBattleReaction` for Cutting Words and Uncanny Dodge windows.

Scope:

- Action Surge discovery/resolution, non-Magic extra action, once-per-turn stale
  rejection.
- Second Wind hole, Bonus Action/resource spend, bounded healing.
- Cunning Action Dash/Disengage/Hide as Bonus Action.
- Rage activation, resistance/damage modifier, Bonus Action extension, early-end
  gate.
- Reckless first-attack activation and reciprocal Advantage.
- Sneak Attack eligible rider, selected rider, once-per-turn use.
- Evasion save-damage replacement for Dexterity half-damage cantrip.
- Cutting Words attack/damage reduction fixture and Uncanny Dodge attack-damage
  halving fixture.

Bounds:

- Project per-feature facts instead of the full character resource object.
- Keep reaction features in a bounded path separate from action-economy
  features when needed.

Risk:

- QCORE9 models an abstract feature pool, while runtime uses independent
  resources and support profiles.
- Cunning Action is not a `unitFeature` subject in runtime; it is
  support-profile-driven `bonusActionStandardAction`.

## QMBT5 - Spell Procedure Runtime Parity

QCORE source:

- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles-inductive.qnt`

Runtime entrypoints:

- `resolveBattleSubject` for prepared slot spell, cantrip spell attack,
  cantrip save-gate damage, persistent spell, healing spell, and ready spell.
- `resolveReleaseReadiedSpellCommand` through public runtime resolution.

Scope:

- Magic Missile one-target level-1 lane, optional level-2 split later.
- Ray of Frost miss/hit/crit with HP, action spend, and speed effect.
- Acid Splash one/two targets with all-success and one-fail outcomes.
- Healing Word wounded and 0-HP target with Bonus Action, slot, HP,
  unconscious, and death-save reset projection.
- Mage Armor self willing unarmored with active spell base AC and slot/action
  spend.
- Readied Spell ready and release, projecting concentration/readied map/reaction
  spend/no second slot spend.

Projection:

- HP, action/bonus availability, spell slot spent this turn, remaining level-1
  slots, active effect kind, readied held/released, concentration flag, holes,
  and last result.

Bounds:

- No full spell catalog.
- Avoid concentration saves in the baseline spell lane unless the task is
  explicitly testing QCORE8/QCORE10 integration.
- Bound multitarget spell cases to the smallest useful set.

## QMBT6 - Stat-Block Control Runtime Parity

QCORE source:

- `packages/shared-algebras/proofs/rule-core/stat-block-controls.qnt`
- `packages/shared-algebras/proofs/rule-core/stat-block-controls-inductive.qnt`

Runtime entrypoints:

- Stat-block subject resolution through production battle-runtime APIs or a
  production stat-block control procedure module consumed by those APIs.
- Authored SRD monster projection tests are separate. QMBT6 uses small typed
  control-profile fixtures, not monster ids or parsed catalog records.

Scope:

- Start with Multiattack named dispatch as the first tracer. The fixture should
  have at least two named attack options and a profile with pending dispatches
  after the first listed attack.
- Prove that the first listed attack spends the Attack action, pending named
  dispatches remain explicit, Movement may interleave, End Turn closes unspent
  dispatches, and unrelated turn subjects such as Bonus Action or ordinary
  Action are rejected while the Multiattack continuation is open.
- Add Legendary Actions as a separate later tracer after Multiattack parity is
  stable. That tracer should cover opening after another creature's turn,
  spending one Legendary Action use, closing after one action, rejecting use on
  the legendary creature's own turn, and refreshing uses at the monster's start
  turn.

Projection:

- attack action availability, pending primary/secondary dispatch counts,
  movement spent/remaining, whether a Multiattack continuation is open, last
  result, and invalid reason.
- For the later Legendary Action tracer: window open, uses remaining/maximum,
  actor-turn ownership, last result, and invalid reason.

Bounds:

- Fixture attack names only, such as primary/secondary stat-block attacks.
- No authored monster catalog breadth, tactics, action priority, parser
  admission, or provenance checks in QMBT6.
- Keep Multiattack and Legendary Actions in separate focused lanes even though
  they share the QMBT6 task label; their timing models differ enough that one
  trace would blur failures.

Risk:

- Multiattack interleaving is the highest-value stat-block control invariant.
  If runtime permits Bonus Actions, ordinary Actions, or unrelated subjects
  during an open Multiattack continuation, QCORE11 and runtime have diverged
  even if dispatch counters decrement correctly.
