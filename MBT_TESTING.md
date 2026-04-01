# MBT Parity Fix Report

**Methodology:** Seed-deterministic model-based conformance testing. Quint spec (`creature.qnt`) is the formal model / test oracle; XState machine is the SUT. `@firfi/quint-connect` replays Quint-generated traces step-by-step against XState, comparing state field-by-field. Each trace is fully determined by a seed (`QUINT_SEED`), making failures reproducible.

Fixes applied during the 2026-03-28/29 fuzzer session. All bugs were XState divergences from the Quint spec.

## Fix Table

| Commit | Bug | Root Cause | Why Missed Before | Seeds Fixed |
|--------|-----|------------|-------------------|-------------|
| `dbd1134` | `bonusMovementOAFree` not set on crit with 0 speed | `scoreCriticalHit` returned `{}` when `effectiveSpeed=0`, but Quint's `pGrantBonusMovement` always sets `bonusMovementOAFree: true` | Guard `d <= 0` was intended to skip zero-distance movement, but also skipped the OA-free flag. 0-speed crits are rare (requires grappled Champion). | 1 |
| `dbd1134` | `dropProne` allowed at 0 speed | `dropProne` unconditionally set `prone: true`; Quint's `pDropProne` is a no-op when `effectiveSpeed == 0` | Seemed like a trivial action with no guard needed. Only observable when grappled to 0 speed. | 1 |
| `3575319` | Death save on stable creature increments successes | `dying.unstable` sub-state didn't sync with `context.stable`. When `computeStartTurn` stabilized a creature (parallel `turnPhase` branch), `damageTrack` stayed in `dying.unstable`, accepting DEATH_SAVE events. | Cross-branch state sync issue — the parallel state machine architecture meant stabilization in one branch wasn't visible to another. Only triggered by specific start-of-turn → death-save sequences. | 5 |
| `3575319` | `heroicInspiration` not usable outside `acting` phase | `USE_HEROIC_INSPIRATION` was scoped to `turnPhase.acting`; Quint's `doUseHeroicInspiration` has no turn-phase guard. | Assumed heroic inspiration was a combat-only action. Quint correctly models it as phase-independent. | 3 |
| `3575319` | `bonusMovementOAFree` not set on Second Wind at 0 speed | Same pattern as the crit bug — `tacticalShiftDistance > 0` guard skipped OA-free flag when speed was 0. | Same class as the crit bug. Tactical Shift (Second Wind L5+) shares the `pGrantBonusMovement` path. | 1 |
| `33a5788` | Monster death clears unconscious incorrectly | `monsterDeathCleanup` was applied too broadly — it cleared `unconscious` on monster death paths where Quint's `pMonsterDeathCheck` selectively preserves pre-existing conditions. | Initial `monsterDeathCleanup` implementation was added to all monster death transitions uniformly. Quint only applies cleanup in specific paths (not direct TAKE_DAMAGE monster death). | 3 |
| `1aa3d55` | Monster suffocate clears pre-existing unconscious | `monsterDeathCleanup` on SUFFOCATE transition cleared unconscious that was already present before suffocation. Quint's `pSuffocate` handles monster death directly and preserves conditions. | Same over-application of `monsterDeathCleanup`. Suffocate has its own death path in Quint that doesn't go through `pMonsterDeathCheck`. | 24 |
| `1aa3d55` | Start/end-of-turn damage: swapped argument order | `computeStartTurn` and `computeEndTurn` called `computeTakeDamage` with `(resistances, vulnerabilities, immunities)` instead of `(immunities, resistances, vulnerabilities)`. | Argument order mismatch — all three are `ReadonlySet<DamageType>` so TypeScript couldn't catch it. Only observable when immunities/vulnerabilities differ from resistances. | 19 |
| `1aa3d55` | Petrified auto-resistance missing in turn processing | `computeStartTurn` and `computeEndTurn` didn't apply petrified → all-damage-type resistance. Only `TAKE_DAMAGE` flow (`pR` helper) did. | Petrified resistance was added to the direct damage path but not copied to the turn-processing paths. Petrified creatures rarely take turn damage. | 1 |
| `1aa3d55` | `stable` reset on drop-to-zero | `damageAtZeroTransition` set `stable: false` unconditionally. Quint's `pApplyCondition(CUnconscious)` doesn't touch `stable`. | Assumed dropping to 0 HP always meant entering an unstable dying state. But a creature can be stable and then drop to 0 from a different source. | 3 |
| `1aa3d55` | Prone removal while unconscious | `removeConditionUpdate` allowed prone removal on unconscious creatures. Quint's `pRemoveCondition` blocks `CProne` removal when `s.unconscious`. | The unconscious → prone coupling was implemented for applying unconscious but not enforced on the removal side. | 1 |
| `7aff0f1` | Dying creature not prone on instant-death fall | `applyFall` checked HP change (`took`) to decide prone. Dying creatures at 0 HP take fall damage that doesn't change HP but kills via overflow >= maxHp. Quint compares full state (`s1 == s`), catches the `dead` flag change. | The `took` heuristic (HP/tempHP delta) works for alive creatures but fails for dying creatures where death is the state change, not HP. Edge case: dying + fall + damage >= maxHp. | 1 |

## Patterns

**Most common root cause:** XState guards/actions checking a subset of state (e.g., HP delta) where Quint checks full state equality (`s1 == s`). This class includes the crit OA-free, Second Wind OA-free, and fall prone bugs.

**Second most common:** Over-application of cleanup actions (`monsterDeathCleanup`) to transitions where Quint uses specialized paths. Fix was to match Quint's selective application.

**Third:** Argument-order bugs in functions with identically-typed parameters (`Set<DamageType>`). TypeScript can't distinguish these structurally.

## Total

- **63 seeds** resolved across 5 commits
- **11 distinct bugs** found
- **0 remaining** in `mbt-failures.jsonl`
