# Active Effect Deep Module Plan

Date: 2026-05-20

Status: `adopted` — supersedes `LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 2 #8
(active-effects portion) and #9 (`turn-active-effects.ts` portion). On branch
`active-effect-deep-module`: **steps 1a + 1b + 3 done; perception deferred.**
Step 3 (this commit): `active-effect/lifecycle.ts` is a **value-leaf** holding the
effect-centric core — `battleCreatureWithSpellActiveEffects` plus its two pure
closures (condition derivation: `conditionsAfterApplyingSpellConditionEffects` +
`isConditionApplyingActiveEffect`/`activeEffectCondition`/`activeEffectConditions`;
held-object hand-state: `battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects`
+ `battleCreatureWithoutSpellCreatedHeldObjectHand`). Spell-coupled
apply-from-invocation logic stays in `battle-reducer/` and calls into it. madge
confirms `lifecycle.ts` is in no cycle (61 value cycles unchanged).

Step-1a/1b context: the lifecycle model and the
full `BattleActiveEffect` union + arm-payload types now live in
`active-effect/types.ts` (478-line union moved; `battle-reducer.ts` down ~5,600 →
~5,000 lines; workspace `pnpm -r typecheck` green, 9/9). **Step 3** (lifecycle
runtime + effect-centric seam inversion) and **perception** pending.

> **Implementation finding (2026-05-20):** the single-shot union relocation in
> the original plan was over-optimistic. Doing the work surfaced two entanglements
> the scan missed:
> 1. The 440-line union is laced with **value consts** (`BATTLE_SPECIAL_SPEED_KINDS`,
>    `BATTLE_D20_ROLL_MODIFIER_KINDS`, `KNOWN_WILLING_TARGET_*`) and **4 cross-domain
>    type tendrils** (`BattleCommandOption`, `MarkedDamageRiderAbilityCheckBehavior`,
>    `BattleDancingLight`/`List`). Moving the whole union at once would force either a
>    runtime-unsafe value-const cycle or 6+ type-only back-imports.
> 2. `SpellConditionRepeatSave` (line 2243) is **not stranded** — it heads the
>    adjacent `SpellFailedSaveCondition*` cluster. Co-locating just it would split
>    that cluster, so it is deferred to the union/condition-effects step.
>
> So step 1 was narrowed to the **acyclic, pure-type lifecycle model** (lines
> 493–620): expiration model, early-end model, effect bases, possession
> disposition, condition-escape, turn-start-damage, marked-rider transfer, and
> the self-transformation payload — the most-reused effect sub-vocabulary, on
> which the union and runtime depend one-directionally.

## Goal

Turn the `BattleActiveEffect` concept from a type universe smeared across two
files (plus a stranded support type and a tangled perception projection) into a
single **deep module**: a small interface — *what active effects exist, when
they end, apply / tick / expire / project them* — hiding the 59-arm union, its
lifecycle runtime, and its derived perception views.

This is the "full deep module" shape, not a type relocation. It restructures
around the domain concept and **inverts the spell↔effect coupling** so the effect
module no longer depends on spell-support types.

## Relationship To Existing Plans

This plan **supersedes** the overlapping parts of the prior dormant split plan
(owner decision, 2026-05-20). Do not execute the superseded parts.

- **`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 2 #8** ("Battle Reducer Type and
  Codec Surface") proposed `battle-reducer/active-effects.ts` as a
  **type/codec-surface split only**, keeping the historical "type hub + runtime
  dir" shape. Its active-effects portion is now **superseded** by this plan. The
  remaining codec/state/reaction-protocol splits in that section still stand.
- **`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 2 #9** proposed `turn-active-effects.ts`
  (effect runtime split by **turn phase**). That portion is now **superseded** by
  this plan's `lifecycle.ts`. The dispatcher and non-effect turn/movement splits
  in #9 still stand.
- **`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 1 #3** (QNT) is **not** superseded;
  coordinate if the effect type homes change what the QNT projection imports.

How this plan differs from the superseded approach:

| Axis | Prior plan (Tier 2 #8/#9) | This plan (deep module) |
| --- | --- | --- |
| Shape | types in `battle-reducer/`, runtime split by turn-phase | co-located `active-effect/` (types + lifecycle + perception) |
| Seam | invocation-aware (`applySpellActiveEffects(state, ids, invocation)` stays) | effect-centric (`applyEffect(creature, effect)`; translation moves to spell-resolution) |
| Effect module deps | re-imports spell-support types | depends only on effect types + expiration model |
| Depth | finer-grained files, same coupling | small interface, inverted coupling — genuinely deep |

## Staging Decision (owner, 2026-05-20)

Adopted with this staging to manage the two sequencing risks:

1. **`perception.ts` is DEFERRED.** `ACTIVE_PLAN.md` links
   `PRD_BATTLE_LIGHT_OBSCUREMENT_WITNESSES.md`; light/obscurement is under active
   feature development, so the perception projection is a moving target. Land
   `types.ts` and `lifecycle.ts` now; extract `perception.ts` only after the light
   PRD work settles.
2. **`types.ts` relocation is the FIRST step (tracer bullet).** It is
   behaviour-preserving and typecheck-gated, so it de-risks the module boundary
   before the semantics-adjacent `lifecycle.ts` seam inversion.
3. **Test-split prerequisite acknowledged, not required.** The prior plan ordered
   the high-coupling reducer split after splitting the 30k-line battle test files.
   We proceed without that prerequisite; the parity suite (focused reducer tests +
   `battle-runtime.qnt` MBT) is the regression guard for the one semantics-adjacent
   step.

## Established Facts (verified 2026-05-20)

- **Single store, per-creature.** `activeEffects: readonly BattleActiveEffect[]`
  lives on `BattleCreatureState` (`battle-reducer.ts:3709`); `BattleState`
  aggregates creatures via `combatants`. No dual store.
- **Clean cycle direction.** Every union arm references IDs (`CombatantId`,
  `BattleAreaId`) — never `BattleState`/`BattleCreatureState`. So
  `BattleState → BattleActiveEffect → leaf types`, one-way. Extraction creates no
  type import cycle.
- **The type set to move together** (`battle-reducer.ts`): `BattleActiveEffect`
  (659), `BattleActiveEffectExpiration` (493), `BattleSpellEffectEarlyEnd` (519),
  `BattleSpellEffectBase` (530), `BattleUnitFeatureEffectBase` (534),
  `SpellConditionEscape` (563), `SpellTurnStartDamage` (573),
  `MarkedDamageRiderTransferState` (587), `SelfTransformationModeEffectPayload`
  (610), **and the stranded `SpellConditionRepeatSave` (2243)** — referenced by
  arms at ~752 but defined 1,500 lines away (distant connascence).
- **The apply layer mixes two jobs.** `applySpellActiveEffects`
  (`spells-active-effects.ts:235`) both (a) *translates* a
  `SupportedSpellInvocation` into effects (`postDamageRiders` →
  `spellPostDamageRiderActiveEffect`, with replacement predicates) and (b) runs
  the *generic* "put effects on the creature and reproject" via
  `battleCreatureWithSpellActiveEffects` (1157). The generic half is already
  factored out — the seam is half-cut.
- **The perception layer is already nearly pure.**
  `battleIlluminationFromLightEmitters(emitters, facts)` (393),
  `battleSightObscurement(illumination, observer)` (415),
  `battlePerceptionRollModeForSight(...)` (424) do not take `BattleState`. Only
  `battleLightEmitters(state)` (283) reads state to gather emitters.
- **Blast radius.** 22 non-test files import `BattleActiveEffect`; ~30 match on
  `effect.kind`. A type move is import-path-only for all of them — no match arm
  changes. The light/sight projection functions are each used by 3–6 other files.
- **No isolation test exists.** There is no `spells-active-effects.test.ts`; the
  effect lifecycle is exercised only through full battle scenarios + MBT.

## Target Module

```
packages/battle-runtime/src/active-effect/
  types.ts       union(59 arms) + expiration + early-end + bases
                 + escape/repeat-save/turn-start-damage/transform payload
                 + light-emitter types
                 └─ depends on: leaf domain types only · no behaviour     [STEP 1]
  lifecycle.ts   applyEffect / replaceEffects (generic add+reproject)
                 · tick durations · expire at turn boundary / early-end / dispel
                 · battleCreatureWithSpellActiveEffects · constructors / guards
                 └─ depends on: types + expiration · NOT on SupportedSpellInvocation [STEP 3]
  perception.ts  battleLightEmitters(creatures) → illumination(facts)
                 → obscurement / sight / perceptionRollMode
                 └─ depends on: types only · already nearly pure          [DEFERRED]
  index.ts       the small public interface
```

The interface is effect-centric. Spell resolution keeps `SupportedSpellInvocation`
and the invocation→effect translation, then calls `applyEffect`. This inverts the
current coupling (effect module stops knowing about spells).

Interface sketch (illustrative, not final — finalize during implementation):

```ts
// active-effect/index.ts
export type { BattleActiveEffect, BattleActiveEffectExpiration, /* … */ };

// lifecycle
export function applyEffect(creature: BattleCreatureState, effect: BattleActiveEffect): BattleCreatureState;
export function replaceEffects(creature: BattleCreatureState, /* predicate + new */): BattleCreatureState;
export function tickEffectDurations(creature: BattleCreatureState, elapsed: ElapsedTimeTicks): BattleCreatureState;
export function expireEffects(creature: BattleCreatureState, boundary: TurnBoundary): BattleCreatureState;

// perception (projection over effects) — DEFERRED
export function lightEmitters(creatures: Iterable<BattleCreatureState>): readonly BattleLightEmitter[];
export function illumination(emitters: readonly BattleLightEmitter[], facts: readonly BattleLightEmitterProjectionFact[]): BattleIllumination;
export function sightObscurement(illumination: BattleIllumination, observer?: BattleSightObserver): BattleSightObscurement;
```

## Migration Sequence (parity-gated)

Each step is independently typecheckable. Step 1 is behaviour-preserving; step 3
is the only semantics-adjacent step and is gated by the parity suite. Perception
is deferred (see Staging Decision).

1a. **`types.ts` lifecycle model** *(DONE)* — relocated the contiguous, acyclic,
   pure-type lifecycle model (lines 493–620: `BattleActiveEffectExpiration` +
   anchored variants, `BattleSpellEffectEarlyEnd` + variants, `BattleSpellEffectBase`,
   `BattleUnitFeatureEffectBase`, `SpellConditionAbilityCheckSuccessEnd`,
   `ProtectionFromEvilAndGoodPreventedCondition`, `BattlePossessionAttemptDisposition`,
   `SpellConditionEscape`, `SpellTurnStartDamage(Save)`, `MarkedDamageRiderRetargetTiming`,
   `BattleTurnAnchor`, `MarkedDamageRiderTransferState`, `SelfTransformationNaturalWeaponFacts`,
   `SelfTransformationModeEffectPayload`) into `active-effect/types.ts`. Re-exported
   the previously-public types from `battle-reducer.ts`; the union and runtime import
   the rest one-directionally. Workspace `pnpm -r typecheck` green (9/9 packages).
1b. **`BattleActiveEffect` union + arm payloads** *(DONE)* — moved the union and its
   arm-payload types (`SpellCreatedHeldObjectState`/`ActiveEffect`,
   `SpellObjectContactDamageActiveEffect`) into `active-effect/types.ts`. The value
   consts stayed in `battle-reducer.ts`; the **9 cross-domain tendrils**
   (`BattleSpecialSpeedKind`, `BattleD20RollModifierKind`/`Delta`, `BattleCommandOption`,
   `MarkedDamageRiderAbilityCheckBehavior`, `BattleDancingLight`/`List`, `SpellAttackKind`,
   `SpellConditionRepeatSave`) are type-only back-imports from `battle-reducer.ts` —
   a documented transitional type-only cycle (erased at runtime; no `import/no-cycle`
   lint here) that dissolves as those domains extract. The previously-public types are
   re-exported from `battle-reducer.ts`, so the move is behaviour-preserving.
   **Deferred to a later step:** co-locating `SpellConditionRepeatSave` + the
   `SpellFailedSaveCondition*` cluster (still in `battle-reducer.ts`).
2. **`index.ts`** — the small public barrel re-exporting `types.ts` (and later
   `lifecycle.ts`). Migrate type-importers to `@dnd/battle-runtime/active-effect`
   where it improves locality; remove temporary re-exports from `battle-reducer.ts`
   for moved types.
3. **`lifecycle.ts`** *(next, parity-gated)* — move
   `battleCreatureWithSpellActiveEffects`, tick/expire, constructors/guards.
   **Invert the apply seam:** split invocation→effect translation (stays in
   `spells-resolve*` / callers that own `SupportedSpellInvocation`) from the
   generic `applyEffect`/`replaceEffects` (moves to module). Add isolation tests
   for expiration and tick. Run package reducer tests + the parity MBT/QNT suite.
4. **`perception.ts`** *(DEFERRED until light PRD settles)* — move
   `battleLightEmitters`, projection/illumination/obscurement/sight, dancing-lights
   helpers; add the isolation tests that don't exist today.
5. After each behaviour-affecting step: **reviewer-loop convergence** (below);
   one battle-MBT run only after step 3.

## Verification

Per repository plan-verification requirements.

Reviewer-loop convergence:
- Run RAW traceability, ubiquitous-language/domain-language, architecture and
  connascence, and code-review passes after implementation.
- Fix every reasonable finding; reject only with a concrete reason; repeat until
  no reasonable findings remain. At least two rounds (this is not a <20-line
  change).

RAW and ubiquitous-language check:
- This is a refactor that models **no new rules**. Verify behaviour preservation:
  no modeled rule, support gate, state shape, or runtime projection changes
  meaning. If a moved module exposes a hidden rule assumption, stop and add the
  RAW check before continuing.
- Names: "Active Effect" and the perception terms (Illumination, Obscurement,
  Sight) are battle-runtime-internal, not canonical SRD terms, so they belong in
  the battle-runtime package vocabulary/README, not `UBIQUITOUS_LANGUAGE.md`.
  Record them there when the module lands. Cross-check `UBIQUITOUS_LANGUAGE.md`
  to confirm no naming conflict.

Mechanical checks:
- `pnpm --filter @dnd/battle-runtime typecheck` after each step.
- `pnpm --filter @dnd/battle-runtime exec vitest run <moved/added test files>`
  after each step.
- `pnpm check:authored-id-dispatch` after the lifecycle/seam-inversion step
  (production reducer source changed).
- Split audit (`scripts/audit-battle-reducer-split.mjs`) after the import-path
  migration.

MBT discipline:
- No MBT for step 1 (behaviour-preserving; typecheck + focused tests suffice).
- One battle-MBT run after step 3 only:
  `cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/battle-runtime.mbt.test.ts`,
  in background with a timing wrapper. Check for zombie `quint_evaluator`
  processes first. Reproduce any failure with the reported seed before fixing.

Connascence checks:
- The stranded `SpellConditionRepeatSave` → its referencing arms: co-locate in
  `types.ts` (kills the 1,500-line-distant coupling).
- The 30 `effect.kind` match sites: name/type connascence only — acceptable and
  tool-visible; the move changes import paths, not arms.
- The half-cut apply seam: the inversion makes the spell→effect translation
  explicit at the spell-resolution boundary instead of hidden inside the effect
  apply path.

Circular-dependency tooling:
- The step-1b back-imports form a **type-only** cycle. All cross-package cycle
  detection must ignore type-only edges: ESLint via `import type`, and madge via
  a root `.madgerc` with `detectiveOptions.ts/tsx.skipTypeImports = true` (the same
  pattern used in sibling repos `hulymcp`/`quint-connect`). With it, madge no longer
  reports `active-effect/types.ts ↔ battle-reducer.ts`, and the gated `circular`
  scripts (`@dnd/surface`, `@dnd/mcp`, `@dnd/app`) still report zero cycles.
- `@dnd/battle-runtime` has ~61 pre-existing **value** cycles in `battle-reducer/`
  and intentionally has no `circular` gate; this refactor does not add one and
  does not worsen that count (the type-only edge it adds is skipped).

## Verification results (2026-05-21, step 3)

- **Workspace typecheck**: green, 9/9 packages.
- **madge**: `active-effect/lifecycle.ts` appears in no cycle (value-leaf); total
  battle-runtime value-cycle count unchanged at 61.
- **Deterministic reducer suite** (`vitest run --exclude '**/*.mbt.test.ts'`):
  **900 passed**, 9 failed — **identical** to the pre-step-3 base state (same 4
  files: bardic-inspiration, cutting-words, opportunity-and-light-attacks,
  uncanny-dodge). The 9 failures are a **pre-existing** init bug ("Ability-modifier
  resource cap requires the projected ability modifier" in
  `character-battle-resources.ts`), unrelated to this refactor. → behaviour
  preservation proven (zero new failures).
- **Battle MBT**: could **not execute** in this fresh worktree — quint reports
  `QNT404` name-resolution errors (`damageAfterAdjustments`, etc.) on `.mbt.qnt`
  spec files this refactor never touched (`git diff` is TS-only). Root cause is a
  worktree quint environment gap: the worktree lacks the `.quint-cache` the main
  repo has; quint-connect version is identical. This is independent of the
  TS-only change. To actually run MBT, prime/copy the quint cache or run it from
  the main checkout.

## Out Of Scope

- Character-sheet monolith (`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 2 #7).
- Dispatcher reaction/interrupt split (`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 2
  #9 dispatcher half — still stands).
- QNT split (`LARGE_FILE_DOMAIN_SPLIT_PLAN.md` Tier 1 #3) — coordinate only if
  the effect type homes change what the QNT projection imports.
