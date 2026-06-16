# L14G-03 Monk Slow Fall Triage

Task 1 decided the ownership boundary for `monk_slow_fall`. No runtime
behavior, Surface shape, QNT owner, Unit claim, or MBT driver was added in this
task.

## Source Review

Local RAW and project-language sources checked:

- `.references/srd-5.2.1/Classes/Monk.md:116-118` for Slow Fall: the Monk can
  take a Reaction when falling and reduce fall damage by five times Monk level.
- `.references/srd-5.2.1/Playing-the-Game.md:326-332` for Reaction timing:
  a Reaction is an instant response to a trigger, one Reaction is available
  until the start of the creature's next turn, and timing is immediately after
  the trigger unless the Reaction says otherwise.
- `.references/srd-5.2.1/Rules-Glossary.md:470-474` for Falling: fall damage
  is 1d6 Bludgeoning damage per 10 feet, maximum 20d6, applied at the end of
  the fall; the creature lands Prone unless it avoids taking any fall damage;
  the falling-into-liquid check is its own Reaction and can halve damage.
- `.references/srd-5.2.1/Rules-Glossary.md:814-816` for the glossary Reaction
  definition.
- `UBIQUITOUS_LANGUAGE.md:171` for the project Reaction term and
  `UBIQUITOUS_LANGUAGE.md:305` for Falling as the environmental hazard.
- `ASSUMPTIONS.md:128-134` and `ASSUMPTIONS.md:176-182` for the existing
  battle-layer trigger taxonomy and bounded Reaction interrupt continuation
  model.

## Existing Owners

- `packages/battle-runtime/src/battle-interrupt-triggers.ts` already includes
  the `creatureFalls` interrupt trigger.
- `packages/battle-runtime/src/battle-reducer/dispatcher.ts` owns
  `openCreatureFallsInterruptWindow`, `resolveFlySpeedGrantEndFallCleanup`,
  and `resolveFeatherFallLanding`.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/feather-fall-mitigation.ts`
  owns Feather Fall's spell-specific falling Reaction and per-target landing
  mitigation from caller-supplied falling facts.
- `packages/battle-runtime/battle-runtime-feather-fall.qnt` owns the promoted
  Feather Fall landing mitigation lifecycle.
- `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt`
  and `packages/battle-runtime/src/battle-reducer/reaction-modifiers.ts` own
  the existing unit-feature Reaction roll/damage-reduction family, but that
  family currently admits only attack-roll, ability-check, attack-damage-roll,
  and attack-damage reductions. `reactionRollOrDamageReductionChoices` opens
  choices only for `attackHit` and `attackDamage`, so Slow Fall must not be
  represented as an attack-damage reduction.

## Boundary Decision

Decision: split between table-owned falling adjudication and promoted
battle-runtime Reaction damage reduction.

Table/spatial adjudication keeps ownership of:

- determining that a creature falls;
- fall distance, route, landing time, landing position, and terrain or map
  geometry;
- deriving the raw Falling hazard damage roll from distance;
- resolving the falling-into-liquid Reaction check, if any, as a separate
  table-owned Reaction procedure.

Battle runtime should own a promoted Slow Fall slice after Surface admission is
added:

- retain selected `monk_slow_fall` support from the character handoff without
  authored-identity dispatch;
- offer the feature from a caller-supplied `creatureFalls` trigger when the
  selected Monk can take a Reaction;
- spend the Monk's Reaction through the existing Reaction resource protocol;
- reduce the caller-supplied fall damage by `5 * Monk level`, capped at zero;
- resolve fall damage and the Falling-Prone prevention at the same landing
  boundary, because RAW makes Prone depend on whether the creature avoids
  taking fall damage.

The falling-into-liquid check and Slow Fall both spend a Reaction. A follow-up
must not accept a silently pre-halved water/liquid fall-damage amount and then
also spend Slow Fall. The caller must either choose the table-owned liquid
Reaction path or provide an explicit shared-reaction witness in a future generic
fall owner; this Slow Fall slice should treat that procedure as out of scope.

The battle runtime must not store fall distance, falling position, landing
geometry, or a duplicate `isFalling` fact beside table/spatial state. If a
future implementation needs a pending Slow Fall mitigation between fall start
and landing, that state must represent only the selected feature's one-fall
Reaction mitigation, not independent fall progression.

## Follow-Up Runtime Slice

Add a new Ralph implementation task:
`L14G-03A-MONK-SLOW-FALL-RUNTIME`.

Required output:

- Author `packages/surface/content/monk_slow_fall.dhall` and generated JSON,
  and add the level-4 `monk_slow_fall` feature grant to the Monk class record
  if it is still absent.
- Widen the existing `reaction_roll_or_damage_reduction` Surface mechanics with
  a fall-specific modifier, for example a `fall_damage_reduction` trigger and a
  `class_level_multiplier` reduction of 5. Do not reuse
  `attack_damage_reduction`.
- Extend `unit-feature.reaction-roll-or-damage-reduction` support projection in
  `packages/battle-runtime/src/unit-feature-support.ts` with a typed
  fall-damage branch.
- Extend or refactor `packages/battle-runtime/src/battle-reducer/reaction-modifiers.ts`
  and the dispatcher landing/fall-damage path so `creatureFalls` can offer and
  resolve Slow Fall without creating a parallel falling-state owner.
- Keep the falling-into-liquid Reaction check out of scope unless a generic
  fall owner coordinates that check and Slow Fall through the same Reaction
  resource. Do not compose a pre-halved liquid landing result with a Slow Fall
  Reaction spend by convention.
- Add reusable rule-core facts to
  `packages/shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core.qnt`
  and a focused package-local QNT owner, preferably
  `packages/battle-runtime/battle-runtime-slow-fall.qnt`, for the
  `creatureFalls` integration and landing damage outcome.
- Add checker-visible Unit support and evidence only after the runtime and QNT
  behavior exist: `plans/unit-profile-coverage/unit-claims.jsonl` should claim
  `monk_slow_fall` under `unit-feature.reaction-roll-or-damage-reduction`, and
  `unit-evidence.jsonl` should record deterministic admission/projection plus
  selected-identity evidence.

Recommended evidence targets:

- deterministic admission/projection: a focused Slow Fall test or the existing
  martial action feature admission test if the new assertions stay local;
- reducer behavior: a focused `slow-fall-reaction` runtime test covering
  Reaction availability, no-Reaction rejection, class-level scalar reduction,
  zero-damage cap, and Falling-Prone prevention only when reduced damage is
  zero;
- selected identity: a focused literal-witness MBT such as
  `packages/battle-runtime/src/slow-fall-selected-identity.mbt.test.ts`;
- rules-kernel parity: extend the existing rule-core feature MBT/QNT witness
  only if the new rule-core facts are not already covered by the focused Slow
  Fall witness.

Follow-up verification commands:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/slow-fall-reaction.test.ts src/unit-profile-admission-martial-action-features.test.ts`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

If the follow-up adds an MBT driver, run only the focused file after checking
for existing `vitest` and `quint_evaluator` processes, and use the repository
background/timing MBT protocol from `AGENTS.md`.

## Plan Impact

- `L14G-03-MONK-SLOW-FALL-TRIAGE` can close as boundary decided.
- `L14G-03A-MONK-SLOW-FALL-RUNTIME` should be added as a ready implementation
  follow-up.
- `L14G-05-GATE-CONSOLIDATION` should stay blocked until the decider either
  runs the Slow Fall implementation follow-up or explicitly defers Slow Fall
  outside the level-1-4 gate.

## Reviewer Loop Convergence

- Round 1: rejected a runtime-detached closure. Slow Fall is a selected class
  feature that spends a Reaction and changes fall damage, so the battle runtime
  should own the executable Reaction and damage-reduction slice once the
  Surface record exists.
- Round 2: rejected storing generic falling state in battle. Fall distance,
  landing geometry, and raw Falling hazard damage derivation remain
  table/spatial facts; the promoted slice consumes explicit fall-trigger and
  fall-damage witnesses.
- Round 3: rejected reusing the current attack-damage reduction branch. Slow
  Fall needs a fall-specific modifier under the existing Reaction
  roll/damage-reduction support family so profile admission remains typed and
  domain-correct.
