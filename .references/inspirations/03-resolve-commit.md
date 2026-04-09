# 03. Resolve / Commit

## Idea

Separate pure outcome resolution from state mutation.

## Current Fit In This Repo

- This is already the deepest architectural truth of the project.
- Quint resolves rule consequences over immutable state.
- The XState layer commits those consequences in runtime form.
- MBT exists specifically to prove commit parity against resolve semantics.

## Canonical Vocabulary

**Scope.** This vocabulary covers the interrupt-resolution pipeline — the core of what makes D&D combat tricky. It does not attempt to rename every action in the system. Actions that declare intent (`bAttack`, `bCastSaveSpell`), release held actions (`bReadyRelease`, `bReadySpellRelease`), resume interrupted chains (`returnToCSWindow`), or mark lifecycle boundaries (`bStartTurn`, `bEndTurn`) already have clear names and are outside this doctrine's scope.

Four verbs for the interrupt-resolution pipeline:

| Verb | Scope | Quint role | TS role |
|---|---|---|---|
| **resolve** | Compute an outcome from inputs. Pure. No state change. | Pure defs that determine hit/miss, save pass/fail, damage amount, legal reactions | Functions that compute what should happen |
| **apply** | Take a resolved outcome and produce new state. | Pure defs that construct a new creature/turn/slot record | Functions that build new state from a decision |
| **advance** | Move through a phase boundary. May trigger an interrupt window. | Actions that transition between battle phases | Functions that orchestrate phase progression |
| **offer** | Suspend resolution to present a reaction window. | Actions that enter an await state | Functions that set phase to `BPAwaitingReaction` |

"Commit" is the **architectural term** for the entire TS layer's role, not a function prefix. The Quint layer resolves; the XState layer commits. Individual functions within XState use apply/advance/offer.

**Decline**: A creature in a per-reactor reaction window decides not to react. Does not consume the reaction resource.

## Current State

The split already exists structurally. What works well:

- Quint actions `bResolveHitReaction`, `bResolveDmgReaction`, `bResolveCounterspell`, `bResolveSaveFailedReaction` — "resolve" used for interrupt decisions.
- TS helpers `resolveAttack()`, `resolveSave()` — "resolve" used for outcome computation.
- TS helpers `applyCondition()`, `applyFailEffects()`, `applyOnHitEffect()` — "apply" used for consequence application.
- `advanceFromHitPhase()`, `advanceEffectsForOwner()` — "advance" used for phase progression.
- `DOMAIN.md` defines "interrupt point", "reaction window", "transaction" — good infrastructure vocabulary.

What's missing:

- No canonical definition of "resolve" or "commit" in domain docs.
- MBT described as "parity proof" but not as "resolve-to-commit proof."
- Quint `bResolve*` means "resolve an interrupt" — the broader pure-computation sense isn't named.
- Many TS functions are MIXED (compute + build state) with no convention about when mixing is acceptable.
- No vocabulary distinguishes "what the rules say should happen" (resolve) from "make it happen in runtime" (commit).

## Naming Reclassification

### Quint (battle.qnt) — actions

**Keep as-is** (already correct):
- `bResolveHitReaction`, `bResolveDmgReaction`, `bResolveCounterspell`, `bResolveSaveFailedReaction` — resolve a per-reactor interrupt decision.
- `bResolveAoETarget` — not interrupt resolution, but AoE target progression (compute save, apply damage, may open a save-failed interrupt). The `bResolve` prefix is slightly misleading here — it's closer to "advance through the next AoE target" — but the name is entrenched in both layers and the MBT bridge. Keep for now; rename opportunistically if the AoE pipeline is reworked.
- `bAttack`, `bCastSaveSpell`, `bMove`, `bGrapple`, etc. — declare intent. Outside this doctrine's scope.
- `bReadyRelease`, `bReadySpellRelease` — release held actions. Outside scope.
- `returnToCSWindow` — resume interrupted spell chain. Outside scope.
- `bStartTurn`, `bEndTurn`, `bInit` — lifecycle boundaries. Outside scope.

**Rename** (per-reactor "pass" is ambiguous — decline vs. proceed):

| Current | Proposed | Rationale |
|---|---|---|
| `bAfterDamagePass` | `bAfterDamageDecline` | Per-reactor: creature explicitly declines to react |
| `bMovementOAPass` | `bMovementOADecline` | Per-reactor: creature declines opportunity attack |

**Keep as-is** (window-closing, not per-reactor):

| Action | Rationale |
|---|---|
| `bLegendaryPass` | Closes the entire legendary-action window and advances the turn — not a single creature declining |
| `bReadyPass` | Closes the entire ready-action window and advances — same semantics |

### Quint (battle.qnt) — pure helpers

| Current | Category | Proposed | Rationale |
|---|---|---|---|
| `dealDamage` | apply | `applyDamage` | Aligns with resolve/apply vocabulary |
| `dealDamageWithAfterReactions` | apply + advance | `applyDamageAndOfferReactions` | Same |
| `mkAwait` | data constructor | Keep | Constructs `AwaitCtx` record; the "offer" happens when the caller sets phase to `BPAwaitingReaction`. Renaming to `offer*` would misattribute the phase transition to the constructor. |
| `resolveAttack` | resolve | Keep | Already correct |
| `resolveSave` | resolve | Keep | Already correct |
| `resolveSpellEntry` | dispatcher | Keep | Routes to resolve, apply, or advance depending on `postCast` variant. It's a multi-phase dispatcher, not a clean resolve — but the name is accurate in the sense of "resolve which path to take." |
| `breakConcentrationAndPropagate` | apply | Keep | Specificity is valuable here |

No renames needed in creature.qnt — the `p` prefix convention is creature-internal.

### TypeScript — battle-machine files

The TS layer is the commit world. Functions should use apply/advance/offer. Most MIXED functions are **correctly mixed** — they implement an atomic SRD event (e.g., "roll save, if failed apply condition"). The doctrine accepts mixing when the SRD defines the operation as atomic.

No aggressive splitting recommended. The value is in naming and documentation, not mechanical decomposition.

## Documentation Changes

### UBIQUITOUS_LANGUAGE.md — add Action Lifecycle section

```markdown
## Action Lifecycle

**Resolve**: Compute an outcome from inputs without changing state.
In the Quint spec, all computation is resolution — the spec never mutates,
it produces a new immutable record. In TypeScript, resolution functions
compute what should happen (hit/miss, save pass/fail, damage amount,
eligible reactors) without building new creature state.

**Apply**: Take a resolved outcome and produce new state.
In Quint, state-building defs that construct a new creature, turn, or
slot record. In TypeScript, functions that take a decision and return
updated BattleCreatureState.

**Advance**: Move through a phase boundary, potentially opening an
interrupt window. The orchestration layer between resolve and apply.

**Offer**: Suspend resolution to present a reaction window. The battle
pauses until every eligible creature has reacted or declined.

**Decline**: A creature in a reaction window decides not to react.
Does not consume the reaction resource.
```

### battle/DOMAIN.md — add Resolve / Commit Doctrine section

```markdown
## Resolve / Commit Doctrine

The project separates pure outcome resolution from state mutation
across two independent implementations:

- **Resolve layer** (Quint): `battle.qnt` computes rule consequences
  over immutable records. Every action is a pure function from
  (current state, nondeterministic inputs) → new state.

- **Commit layer** (TypeScript/XState): `battle-machine.ts` implements
  the same transitions as runtime state mutations, driving React UI,
  events, and actors.

- **Parity proof** (MBT): `battle-projection.mbt.test.ts` replays
  Quint-generated ITF traces against the XState machine, verifying
  field-by-field that the commit layer faithfully reproduces the
  resolve layer's outcomes. MBT is a resolve-to-commit proof.

Within the interrupt-resolution pipeline, functions follow:
resolve → offer → (react/decline) → apply → advance.
Actions outside the pipeline (declare intent, release held actions,
resume interrupted chains, lifecycle boundaries) keep existing names.
```

### ARCHITECTURE.md — one-line addition

In the XState Machines section, after "Correctness mechanism," add:

> **Architectural role:** The commit layer. Quint resolves what the rules prescribe; XState commits those outcomes as runtime state.

## What NOT To Do

1. **Don't add a generic phase framework.** No `ActionPhase<T>` or `ResolvePipeline`. The doctrine is vocabulary, not abstraction.
2. **Don't split naturally atomic functions.** `bConcentrationCheck` (check + break) is one SRD event. Splitting it creates a seam the rules don't have.
3. **Don't rename everything at once.** The two per-reactor `bPass` → `bDecline` renames are the only batch rename. Other renames are opportunistic — do them when touching a function for other reasons.
4. **Don't rename action names without updating the full surface.** Action renames (e.g., `bAfterDamagePass` → `bAfterDamageDecline`) propagate to `battle-machine.ts` (event routing), `battle-machine-events.ts` (event types), and both MBT test files (`battle-machine.mbt.test.ts`, `battle-projection.mbt.test.ts`). Helper renames (e.g., `dealDamage` → `applyDamage`) are narrower — they affect `battle.qnt` + `battle-machine-helpers.ts` but generally do **not** appear in `mbt-shared.ts`.
5. **Don't force resolve/apply on creature.qnt internals.** The `p` prefix convention is creature-scoped and works fine.

## Implementation Order

| Step | Scope | Effort | Risk |
|---|---|---|---|
| 1. Add vocabulary to UBIQUITOUS_LANGUAGE.md and DOMAIN.md | Docs only | ~30 min | None |
| 2. Add "commit layer" framing to ARCHITECTURE.md | Docs only | ~10 min | None |
| 3. Rename `bAfterDamagePass` → `bAfterDamageDecline` and `bMovementOAPass` → `bMovementOADecline` in battle.qnt + TS + MBT bridge | Code + bridge | ~2 hr | Low-to-medium — action renames propagate to battle-machine.ts, battle-machine-events.ts, and both MBT test files. MBT tier 1 validates. |
| 4. Rename `dealDamage` → `applyDamage` in battle.qnt + helpers.ts | Code | ~1 hr | Low — helper-internal, does not appear in mbt-shared.ts |
| 5. Audit new functions going forward against the vocabulary | Process | Ongoing | None |

Steps 1–2 are pure documentation. Steps 3–4 are optional mechanical renames, done incrementally. Step 5 is the real value — once the vocabulary is documented, every future PR can be reviewed against it.

## Quint Impact

Very high. This principle helps decide what belongs in Quint:

- if a branch affects correctness or interrupt ordering, it belongs in resolve space
- if it is merely projection or presentation, it stays outside

The vocabulary clarifies helper roles within the interrupt-resolution pipeline: `resolveAttack` computes hit/miss (resolve), `dealDamage` constructs new HP state (apply), `advanceFromHitPhase` orchestrates the next interrupt window (advance). Currently these roles are implicit in the code; the doctrine makes them explicit. Actions outside the pipeline (declare, release, resume, lifecycle) keep their existing names.

## Domain Language Impact

High. "Resolve" and "commit" become canonical terms. The four-verb vocabulary (resolve/apply/advance/offer) gives every function in the interrupt-resolution pipeline a reviewable classification. The per-reactor `bDecline` renames eliminate the most common source of naming ambiguity in battle.qnt's reaction handling.
