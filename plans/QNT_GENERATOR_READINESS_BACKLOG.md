# QNT Generator Readiness Backlog

This is the parked task queue for work removed from the active Ralph A/B lane
plans when those lanes were drained on 2026-05-25. It is not an active Ralph
plan: do not run `ralph-run.sh` against this file directly. When reopening this
work, split a small coherent group into a fresh lane plan with a
`ralph-task-index`, reviewer-loop verification, and current checker-owned inputs.

The drained A/B lane plans were merged, then deleted. Their remaining
not-yet-runnable work is parked here so future lanes can reopen it deliberately.

## Parked Metamagic Generator Tasks

Former source lane: Ralph lane A, deleted after merge.

| Original task | Title | Depends on | Output |
| --- | --- | --- | --- |
| `A71-QUICKENED-RESTORATION-CORE` | Split Quickened direct restoration execution core | `A70` | Focused QNT semantic core for Quickened direct Hit Point restoration: Bonus Action spend, Spell Slot spend, Sorcery Point spend, target healing, and rejection without state change. |
| `A72-QUICKENED-SCALAR-BUFF-CORE` | Split Quickened scalar buff execution core | `A70` | Focused QNT semantic core for Quickened scalar buff resolution: Bonus Action spend, Spell Slot spend, Sorcery Point spend, buff projection, and rejection without state change. |
| `A73-QUICKENED-SAME-TURN-LEDGER-CORE` | Split Quickened same-turn level-1-plus spell ledger core | `A71`, `A72` | Focused QNT semantic core or existing-core reuse for the same-turn level-1-plus spell prohibition, including slot and free-cast witnesses. |
| `A74-SAVE-METAMAGIC-ADMISSION-CORE` | Split save-affecting Metamagic admission core | `A69` | Focused QNT semantic core for Careful and Heightened admission against supported save-gated procedures, including known-option, stacking, cost, and Sleep/non-save closure predicates. |
| `A75-CAREFUL-SPELL-TARGET-CORE` | Split Careful Spell protected-target core | `A74` | Focused QNT semantic core for Charisma-modifier-limited protected target selection, automatic save success boundary facts, and successful-save half-damage suppression. |
| `A76-HEIGHTENED-SPELL-ROLL-MODE-CORE` | Split Heightened Spell save roll-mode core | `A74` | Focused QNT semantic core for one-target Heightened selection and Saving Throw roll-mode projection using existing Advantage/Disadvantage combination semantics. |
| `A77-METAMAGIC-RUN-BLOCK-EXAMPLES-SPLIT` | Move Metamagic run blocks into proof-only examples | `A68`-`A76` | Move Metamagic `run` blocks and `assert` forms out of semantic-core owners while preserving behavior checks in proof-only examples. |
| `A78-METAMAGIC-GENERATOR-READINESS-ROW` | Refresh Metamagic generator-readiness row after splits | `A77` | Refresh `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` readiness with split semantic cores, proof-only examples, generator subset, and no stale blocker. |
| `A79-METAMAGIC-GENERATOR-CLOSURE-VERIFY` | Verify Metamagic generator closure | `A78` | Confirm no unit-feature generator-readiness backlog rows or run-block findings remain for covered `BATTLE.FEATURE.*` obligations owned by the former A lane. |

## Parked Battle Runtime Readiness Tasks

Former source lane: Ralph lane B, deleted after merge.

| Original task | Title | Input | Output |
| --- | --- | --- | --- |
| `B27-SELF-TRANSFORMATION-READINESS` | Classify self-transformation mode readiness | `BATTLE.SPELL.SELF_TRANSFORMATION_MODE`, `packages/battle-runtime/battle-runtime-self-transformation.qnt`, and self-transformation witnesses. | Classify mode choice, Magic Action replacement, natural weapon override, and Aquatic projections for generator readiness. |
| `B28-MIRROR-IMAGE-READINESS` | Classify Mirror Image hit-interception readiness | `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION`, `packages/battle-runtime/battle-runtime-mirror-image.qnt`, and Mirror Image witness. | Classify duplicate pool, interception roll, duplicate destruction, bypass witness, and normal damage continuation readiness. |
| `B29-MINIMAL-ATTACK-READINESS` | Classify minimal creature attack readiness | `BATTLE.ATTACK.MINIMAL_RESOLUTION`, `packages/battle-runtime/creature-attack.qnt`, and creature attack witness. | Classify whether the pilot creature-vs-creature attack slice is semantic-core, fixture-bound, or blocked for generator use. |

## Parked Oracle-Reliability Tasks (Attack Integration Shell)

Source: 2026-05-29 shell-boundary audit of `battle-runtime-weapon-attacks.qnt`,
prompted by the cleanroom Rust transcription. Framing: make QNT a reliable
*oracle* for non-TS targets, not only a TS parity spec.

Audit verdict (reopen context): the package-local attack shell has overgrown
ADR-0001's "thin bounded witness" mandate. It imports no rule-core slice and
re-implements the general attack pipeline inline — `attackHits(...,
combatantArmorClass(state.goblin), fighterCriticalThreshold(state))`, inline
rider arithmetic, `applyDamageFromSource(state.goblin, ...)` — while rule-core
already owns the general resolver (`resolveAttackProcedure`, `resolveAttackRoll`,
`resolveAttackDamage`, `attackDamageDispositionIsLegal`) and riders
(`resolveSneakAttack`, `attackCriticalThreshold`); `spendActionQuota` is
referenced 0×. The logic is duplicated per direction (a `resolveAttack*` fighter
family and a parallel `resolveGoblin*` family), and `BattleState` carries
per-combatant capability facts as `fighter*`-prefixed top-level fields
(`fighterLongswordSapMastery`, `fighterQuarterstaffToppleMastery`,
`fighterGreataxeCleaveMastery`, `fighterCriticalRange`, …) plus the relationship
field `fighterHelpAttackGoblinForGoblin`. This is
`BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md` anomaly A3 realized at scale.

Sequenced **O2 before O1**: stand up the executable parity instrument before the
shell is remodelled, so O1 is validated against it for non-TS targets (not only
the existing TS MBT). O1 overlaps the parked `B28-MIRROR-IMAGE-READINESS` and
`B29-MINIMAL-ATTACK-READINESS` rows above (same fixture-bound-vs-semantic-core
question, applied to the weapon-attack shell rather than `creature-attack.qnt`);
reopen them together, do not duplicate.

| Task | Title | Depends on | Input | Output |
| --- | --- | --- | --- | --- |
| `O2-NONTS-PARITY-LANE` | Executable QNT→non-TS parity export | — (target boundary fixed by audit) | `battle-runtime-public-trace-contract.qnt`; rule-core general resolver slices; ITF / `quint` trace generation; cleanroom `quint`-binary admission decision | Fixture-free parity-vector export from the oracle (public trace contract per slice + materialized ITF vectors) that a non-TS target replays, mirroring the TS quint-connect lane in `BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md`. Targets rule-core + public-trace-contract, NOT the internal `resolveAttack*` surface. |
| `O1-ATTACK-SHELL-DEFIXTURE` | Compose attack shell over rule-core; de-fixture state | `O2`; overlaps `B28`, `B29` | `battle-runtime-weapon-attacks.qnt`; `battle-runtime-model.qnt` `BattleState`; rule-core `attack-damage-composition.qnt` + `unit-feature-attack-rider-core.qnt` | Shell attack families compose over `resolveAttackProcedure` / `resolveSneakAttack`; per-combatant capability facts move onto `Combatant`; the `resolveGoblin*` family collapses to the general resolver + thin per-actor sequencing. Validated against O2 parity vectors and existing battle MBT; reviewer-loop + RAW/ubiquitous-language convergence required. |

## Reopen Checklist

- Start from `plans/QNT_COVERAGE_PROGRAM.md` and
  `plans/rules-kernel-coverage/README.md`.
- Read only the relevant rows in `generator-readiness.jsonl`,
  `obligations.jsonl`, `qnt-owner-roles.jsonl`, and
  `profile-obligations.jsonl`.
- Preserve the existing table-owned/runtime-owned boundaries. Do not add
  generated-state placeholders or authored-identity dispatch.
- Verification for a reopened lane must include
  `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`, focused QNT/parity tests named by changed
  rows, `git diff --check`, and reviewer-loop convergence.
