# CRPI-BLOCK-017

## CRPI-BLOCK-017

Status: `pass`

- Task: 25
- Driver path: `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-017.json`

Task 25 required target replay for the level-1 spatial witness selected-identity driver as a `reducer-routed` route task. The selected replay exercises SRD catalog admission for Dancing Lights, Faerie Fire, Feather Fall, Fog Cloud, Grease, Jump, Light, Produce Flame, and Thunderwave through public battle reducer entrypoints and table-supplied spatial witnesses.

Current public qRoute coverage:

- Covered: `battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt` through `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts` public reducer route replay, which compares copied qRoute literals to route events returned by public reducer calls.
- Covered: `battle-runtime-save-gated-spell-ordering.route.mbt.qnt` through the supporting connector public replay for Thunderwave save-gated route events.
- Covered: `battle-runtime-reaction-casting-time.route.mbt.qnt` through the supporting connector public replay for generic Feather Fall Reaction casting-time route events: `openCreatureFallsInterruptWindow` and `resolveBattleInterrupt`.
- Covered: `battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt` through the supporting connector public replay for the Feather Fall fall-mitigation payload and landing route surface.
- Covered: `battle-runtime-object-light-riders.route.mbt.qnt` through the supporting connector public replay for Light and Produce Flame `discoverBattleActs`/`resolveBattleSubject` route events.
- Covered: `battle-runtime-spatial-effects.route.mbt.qnt` through the supporting connector public replay for Dancing Lights, Faerie Fire, Fog Cloud, and Grease spatial-effect route events.
- Covered: `battle-runtime-movement-presentation.route.mbt.qnt` through the supporting connector public replay for Jump and Thunderwave movement-presentation route events.
- Remaining required public qRoute coverage: none.

No new durable `BattleState` field or duplicate route ledger was added. The durable owner remains the battle runtime reducer surface: selected spell identity enters at catalog/support-profile admission, while route evidence is projected from typed spell procedures, reaction interrupts, movement and landing witnesses, object/light active effects, area and table geometry facts, light/sight/obscurement projections, area hazards, and public reducer result route events.

Task 25 made focused production route-projection changes in `packages/battle-runtime/src/battle-reducer/reducer-route.ts`: public reducer route events now expose the save-gated, generic Reaction, spatial, object-light, movement-presentation, reaction-fall-mitigation, reaction payload, and table/light/sight/obscurement/hazard route subject and owner terms already present in copied QNT route connectors and MBT decoding vocabulary. This does not branch production behavior on authored spell identity.

RAW and ubiquitous-language review checked local SRD 5.2.1 spell and generic rule passages for the selected spatial witness spell substrates, plus `UBIQUITOUS_LANGUAGE.md` terms for Reaction, Area of Effect, Cover, Difficult Terrain, Long Jump, Illumination, Obscurement, Movement, Speed, Spell Invocation, Spell Effect, Boundary Crossing, and Table Decision.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `a4eadb62b Mark Ralph task 24 done`; Base SHA is an ancestor of HEAD.
- RAW/ubiquitous-language review passed for selected level-1 spatial witness spell substrates and route-owner terms.
- MBT preflight `ps aux | grep vitest | grep -v grep` and `ps aux | grep quint_evaluator | grep -v grep` found no active runner/evaluator before focused MBT.
- `pnpm --filter @dnd/battle-runtime typecheck` passed after adding public route projection for Task 25 spatial composition surfaces.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/level1-spatial-witness-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: copied Task 25 aggregate and supporting connector qRoute literals matched route events returned by public reducer calls.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/level1-spatial-witness-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts src/reaction-interrupt-routes.mbt.test.ts src/movement-forced-movement-selected-identity.mbt.test.ts -t "(Level 1 spatial witness selected identity replay|public reducer route replay|routes the grouped level-1 spatial witness through composed generic reducer surfaces|routes save-gated spell ordering through the shared reducer surface|routes Reaction casting time through explicit battle owners|routes reaction payload taxonomy through generic trigger families and owners|routes object and light riders through object boundary, active-effect, projection, and table-witness owners|routes spatial effects through light, sight, hazard, and table-witness owners|routes movement replacement, forced movement, and object-push presentation through generic facts)" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed with the aggregate and supporting connector public reducer route replay included: 4 files passed; 10 tests passed, 36 skipped; TOTAL: 22s.
- `pnpm cleanroom-branch-coverage:check` passed with Task 25 evidence: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 2 fixed the aggregate public-entrypoint evidence gap from implementation review. Round 5 added explicit supporting-connector public qRoute replay for save-gated ordering, Reaction casting time, Reaction payload taxonomy, object-light riders, spatial effects, and movement presentation. The task uses generic public route owners, does not add authored-identity production dispatch, and does not duplicate route state.
