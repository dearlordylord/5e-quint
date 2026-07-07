# CRPI-BLOCK-015

## CRPI-BLOCK-015

Status: `pass`

- Task: 23
- Driver path: `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-015.json`

Round 5 update:

The rejected adapter-local qRoute checks were removed. The weapon-hosted selected qRoute is now observed through public reducer entrypoints by `createPublicLevel1WeaponHostedSelectedRouteDriver`, which executes the real selected runtime actions and returns reducer-emitted route events.

Fixed production route projection for the reviewed weapon-hosted mismatch:

- Divine Favor now emits `weaponDamageRider` discovery before damage and `weaponDamageRider` rolled-dice resolution after damage.
- Shillelagh no longer projects target-choice resolution as a held-weapon qRoute event; held qRoute starts at active-effect admission and then attack-roll/damage ownership.
- True Strike keeps damage-type choice as a separate public `resolveBattleSubject` call before target choice.

Round 6 update:

The missing marked-damage/immunity qRoute connector is now observed through public reducer entrypoints by `createPublicMarkedDamageImmunityRouteDriver`. The driver compares copied `battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt#qRoute` against reducer-emitted route events from public cast, weapon attack, Search ability-check, End Concentration, and End Turn surfaces.

Round 7 update:

The targeted ability-check roll-mode projection now matches the copied connector boundary: production emits the `markedDamageRiderEffect` `battleAbilityCheckRollMode` route only from `resolveBattleSubjectWithoutFill`, not from `discoverBattleActs`. The replay now includes the full public Search sequence route stream: discovered Search act route events, target-fill resolution route events, and ability-check resolution route events.

RAW and ubiquitous-language review was rerun for the newly modeled route owners. Checked local SRD 5.2.1 spell text for Heroism, Hex, and Hunter's Mark; Playing-the-Game and Rules Glossary text for Ability Checks, Advantage/Disadvantage, Concentration, Immunity, Damage Rolls, and Temporary Hit Points; and `UBIQUITOUS_LANGUAGE.md` terms for Rider, Attack Damage Rider, Temporary Hit Points, Damage, Condition Immunity, Concentration, Spell Effect, Ability Check, and Disadvantage.

Current public qRoute coverage:

- Covered: `battle-runtime-weapon-damage-rider.route.mbt.qnt`, `battle-runtime-held-weapon-active-effect.route.mbt.qnt`, and `battle-runtime-spell-hosted-weapon-attack.route.mbt.qnt` through `battle-runtime-level1-weapon-hosted-selected-identity.route.mbt.qnt#qRoute` and public selected replay route events.
- Covered: `battle-runtime-after-hit-damage-riders.route.mbt.qnt` through `packages/battle-runtime/src/after-hit-damage-riders.mbt.test.ts#createAfterHitDamageRidersRouteDriver`, which requires matching route events observed from public reducer entrypoints.
- Covered: `battle-runtime-scalar-buff-active-effects.route.mbt.qnt` through `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#createScalarBuffActiveEffectsRouteDriver`, which compares copied `qRoute` to public `discoverBattleActs`/`resolveBattleSubject` route events.
- Covered: `battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt` through `packages/battle-runtime/src/level1-buff-mark-smite-selected-identity.mbt.test.ts#createPublicMarkedDamageImmunityRouteDriver`, which compares copied `qRoute` to public reducer route events.
- Remaining required public qRoute coverage: none.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `fb3fcddac Unblock owner-decision Ralph tasks`; Base SHA is an ancestor of HEAD.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- MBT preflight `ps aux | grep vitest | grep -v grep` and `ps aux | grep quint_evaluator | grep -v grep` found no active runner/evaluator before the round-7 MBT run.
- `START=$(date +%s); MBT_TRACES=24 MBT_STEPS=5 pnpm --filter @dnd/battle-runtime exec vitest run src/level1-buff-mark-smite-selected-identity.mbt.test.ts -t "Level 1 buff mark smite copied qRoute connector replay" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed 2 copied public qRoute tests with 1 skipped; TOTAL: 13s.
- `MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/level1-buff-mark-smite-selected-identity.mbt.test.ts` passed 2 tests, including public weapon-hosted qRoute replay; TOTAL: 13s.
- `MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/scalar-buff-active-effects.mbt.test.ts src/after-hit-damage-riders.mbt.test.ts -t "(observes scalar buff active-effect qRoute|routes after-hit rider owner surfaces)"` passed 2 focused public qRoute tests with 3 skipped; TOTAL: 15s.
- `git diff --check` passed after round-7 updates.
- `pnpm cleanroom-branch-coverage:check` passed with Task 23 public qRoute evidence: 738 obligations, 24 sampled inputs.
- `pnpm quality` passed end to end after round-7 changes; app lint reported existing warnings and exited 0.

Reviewer-loop status:

- Round 7 addresses the targeted ability-check public entrypoint sequence gap. Task 23 now has public reducer qRoute coverage for all required connector paths without dropping Search discovery route events.
