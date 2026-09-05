# Cleanroom Source Readiness execution ledger

> **Continuity contract:** [GitHub issue #38](https://github.com/dearlordylord/5e-quint/issues/38)
> owns the terminal Source Readiness outcome, and the recursively linked issues
> own their requirements. This file is a temporary current-state execution
> index: it owns ordering, the current frontier, worktree leases, and
> exact-revision milestone receipts. It is not a second specification or
> historical journal. Delete it when #38 closes.

## Resume here

This section is the sole mutable handoff for a new session.

- Ledger state observed: 2026-09-05
- Current frontier: `SR-04`
- Active work: #474 Battle spell mechanics procedure admission
- Active owner: Codex orchestrator
- Last completed landing unit: `SR-04F` Battle feature and mastery mechanics
  projection, #471
- Last accepted milestone SHA: `b1afacf0a3c38b09dc9d79154096dfb1571ff6ea`
- Coordination base before `SR-00`: `51beff526`
- `SR-00` integration base: `301229532`
- Active landing unit: `integration/cleanroom-sr-04g` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr-04g`; current
  `master` synchronization base `dd1350f81b72111d4a58fd8b8d28dbf4346db4ea`,
  integration W25 receipt checkpoint
  `798bc0262270edf6b5629a71bb6f9965167523c5`
- Minimal pause checkpoint: C2 ongoing-profile admission is integrated at
  `369912462`; B3 save/activation admission reviewed tip
  `bcf318a1fd91a3cf7f99b9ef4365329ca66b4e6e` is integrated by
  `83f568febf6aed7b77e73198ed7aac1036b45731`; A4 attack/direct/reaction
  admission reviewed tip `83a5b71b1e623ff5e4c87ad992735775b7250ec2`
  is integrated by `527b59b01cca6f133ba6d47e64f4cb4217a42d6f`;
  B4 teleport/interdiction/roll-mode admission reviewed tip
  `952da11aba37773353f02f6defc86b3b8a5c4d84` is integrated by
  `f11d07e2248cb5f685a7a72bf1b2bd0557857dba`; A5 contact/weapon admission
  reviewed tip `42ceb3a3e2bdbac5005b9ce5911bb699c597dc1a` is integrated by
  `7e37645a92a9cde80e824bf23969ae6b645203ce`; the cumulative Surface
  publication delta is classified and certified by
  `73921983ca794c3584b300ae4f2feb27a4347af1`, with Standards review repairs at
  `2bd514943` and `7cede904b`; Spec review had zero findings. The
  `persistentArmorEffect` admission reviewed tip
  `ae0216827fa4788c371677b067b36ce93e24f5f0` is integrated by
  `acdbacb9ae44b1bb111d1b93b92df2c7f7e7eeed`; the linked-defense admission
  reviewed tip `98f660aeb3f4296120f9e85ab7a52ae94e48a711` is integrated by
  `1bdac2e20e81475c28d120378a3298504485d548`; the movable-light admission
  reviewed tip `1d575ad22faf096f334bd88d048d93c73128bc75` is integrated by
  `c7d0da9cf1d2ec30f18e2e4e0f88271eff9b6fcf`; the object-light admission
  reviewed tip `3a6008cb25f426ef2ea6228a860cef3d1c0967b7` is integrated by
  `6de14f5a66a9422dbca471e9e2c52ae5146d3f91`; the repeated-damage-allocation
  admission reviewed tip `a8d079fa06fb5e993d8eb7e7b9a42361180373fb` is integrated by
  `eadaeaf108ce4792d9deb78e076b3b4ea3feae52`; the persistent-area-obscurement
  admission reviewed tip `a467206400b25ae7d4f48baec62af8edc8b434c5` is integrated by
  `7425d13b9e3b71ba603eac7f2e0bf3cefaee4992`; the
  magical-darkness-point-origin admission reviewed tip
  `9ac1fd18e0268f03ee9de4f9684ac2b612a43a6a` is integrated by
  `f4555acbe3b20d284ca5490e266a6b27c4a9a839`; the
  area-movement-distance-damage admission reviewed tip
  `cf4284425b599e595dffc728543c7134925e3b1b` is integrated by
  `d07e59f5c08ac978866a4ae3d41f275be15964e1`; the compelled-next-turn-behavior
  admission reviewed tip `51b9017bd1e3589ab97a10adeca7636847024cfe`
  is integrated by `a1ac97140f3e34915b9c6ec283cbf22a49486af0`; the
  directional-persistent-area admission reviewed tip
  `1162ed6b4d50dbae3622ac2c83b214b45efdfe7e` is integrated by
  `cc4826a31a275162c4b794e8e798c8effd213a91`; the
  magic-suppression-emanation admission reviewed tip
  `9b57ca535ecbad7927bb59ab3a6099dbaf6298ab` is integrated by
  `7920c5e00637bd91142a8dafc2fa6308869a18df`.
  Current `master` tip
  `dd1350f81b72111d4a58fd8b8d28dbf4346db4ea` is synchronized by this
  integration merge. `SR-04G` remains Active and incomplete. The exact
  observation baseline is 99 complete, 22 partial, and 74 with no owner.
- B3 evidence: Standards and Spec/RAW review axes converged with no findings;
  focused B3 plus shared admission tests passed 47/47, and Surface path tests
  passed 6/6. A secondary registry/runtime run passed its 5 helper tests; its
  other 64 tests stopped at the known incomplete-frontier
  `admitMechanics is not a function` boundary before scenario assertions, so
  no broader registry verification is claimed.
- A4 evidence: Standards and Spec/RAW review axes converged with no findings at
  `83a5b71b1`; integrated A4 plus shared admission tests passed 61/61 and the
  Battle codec/runtime samples retained 14 passing tests. The remaining 14
  runtime scenarios and the codec-boundary import stopped before assertions at
  the known incomplete-frontier registry gap: 27 future/unmigrated profiles
  still project `admitMechanics: undefined`. Battle package diagnostics retain
  the corresponding legacy profile/registry errors, so no Battle typecheck or
  registry/runtime pass is claimed. Scoped ESLint, Prettier, and diff checks
  passed.
- B4 evidence: Standards and Spec/RAW review axes converged with no findings at
  `952da11ab`; integrated B4 admission tests passed 17/17 and Surface path tests
  passed 6/6. Scoped ESLint, Prettier, and diff checks passed. Battle package
  diagnostics retain the documented incomplete-frontier profile/registry
  errors, so no Battle typecheck or broader registry/runtime pass is claimed.
- A5 evidence: Standards and Spec/RAW review axes converged with no findings at
  `42ceb3a3e`; integrated A5, B4, and shared admission tests passed 64/64.
  Scoped ESLint, Prettier, and diff checks passed. Battle package diagnostics
  report no error in the five A5 files, while the documented incomplete-frontier
  profile/registry errors remain elsewhere, so no Battle typecheck or broader
  registry/runtime pass is claimed.
- Persistent-armor evidence: exact reviewed tip `ae0216827` migrates the legacy
  top-level `persistentArmorEffect` declaration to `admitMechanics`; the
  persistent-armor plus shared spell-mechanics admission suites passed 27/27,
  and the five focused Mage Armor/Armor of Shadows parser tests passed 5/5.
  Rules-kernel coverage passed 162 obligations, and scoped ESLint, Prettier,
  and diff checks passed. Battle package typecheck reports no diagnostics in
  the six changed TypeScript files, but remains incomplete elsewhere at the
  registry-wide migration frontier. The remaining 19 legacy declarations
  prevent whole-package convergence, and no registry-wide or full lifecycle
  pass is claimed.
- Linked-defense evidence: exact reviewed tip `98f660aeb` migrates the legacy
  top-level linked-defense declaration to `admitMechanics`; Standards and
  Spec/RAW review axes converged with no findings. The focused static-admission
  selection passed 14/14. The full lifecycle file reached the same 14 static
  assertions, while all 18 lifecycle scenarios stopped at the known
  legacy-registry `TypeError`; that run is not claimed as lifecycle
  verification. Changed-file type diagnostics were zero while the workspace
  typecheck retained its documented baseline failures. Rules-kernel coverage
  passed 162 obligations. Unit-profile coverage remains baseline-blocked by the
  prior unknown `spell.invocation-persistent-armor-effect` profile marker. The
  actual reviewed write set was the linked-defense profile, Warding Bond
  admission test, `battle-state-execution.ts` source-type boundary, and the
  rules-kernel obligations/matrix plus Unit-profile coverage map. No QNT/MBT
  run is claimed. The remaining 18 legacy declarations prevent whole-package
  convergence.
- Movable-light evidence: exact reviewed tip
  `1d575ad22faf096f334bd88d048d93c73128bc75` migrates the legacy
  top-level movable-light declaration to `admitMechanics`; Standards and
  Spec/RAW review axes converged with no findings. The focused static-admission
  selection passed 10/10. Changed-file type diagnostics were zero, focused
  ESLint, Prettier, and diff checks passed, and rules-kernel coverage passed
  162 obligations. Unit-profile coverage remains baseline-blocked by the prior
  unknown `spell.invocation-persistent-armor-effect` profile marker. The actual
  reviewed write set was the movable-light profile, Dancing Lights admission
  test, `battle-state-execution.ts` invocation-source boundary, and the
  rules-kernel obligations/matrix plus Unit-profile coverage map. The full
  lifecycle selection was not run or claimed because the remaining legacy
  registry frontier still prevents it from reaching those assertions. No
  QNT/MBT run is claimed. The remaining 17 legacy declarations prevent
  whole-package convergence.
- Object-light evidence: exact reviewed tip `3a6008cb2` migrates the legacy
  top-level object-light declaration to `admitMechanics`; Standards and
  Spec/RAW review axes converged with no findings. The focused static-admission
  selection passed 11/11. Changed-file type diagnostics were zero, focused
  ESLint, Prettier, and diff checks passed, and rules-kernel coverage passed
  162 obligations. Unit-profile coverage remains baseline-blocked by the prior
  unknown `spell.invocation-persistent-armor-effect` profile marker. The actual
  reviewed write set was the object-light profile, object-light admission test,
  `battle-state-execution.ts` invocation-source boundary, and the rules-kernel
  obligations/matrix plus Unit-profile coverage map. The full lifecycle
  selection was not run or claimed because the remaining legacy registry
  frontier prevents it from reaching those assertions. No QNT/MBT run is
  claimed. The remaining 16 legacy declarations prevent whole-package
  convergence.
- Repeated-damage-allocation evidence: exact reviewed tip `a8d079fa0`
  migrates the legacy top-level repeated-damage-allocation declaration to
  `admitMechanics`; Standards and Spec/RAW review axes converged with zero
  findings after four rounds. The focused static-admission selection passed
  7/7 with 38 tests skipped. Changed-root type diagnostics were zero, and
  scoped ESLint, Prettier, and diff checks passed. The actual reviewed write set
  was the repeated-damage-allocation profile, the damage-spell admission test,
  and `battle-state-execution.ts`. An earlier full damage-spell-file run reached
  the static passes, but all 38 lifecycle cases stopped at the known remaining
  registry frontier with `admitMechanics is not a function`; that run is not
  claimed as lifecycle verification. No coverage checker, QNT, MBT, registry,
  or broad/full verification is claimed. The remaining 15 legacy declarations
  prevent whole-package convergence.
- Persistent-area-obscurement evidence: exact reviewed tip `a46720640`
  migrates the legacy top-level persistent-area-obscurement declaration to
  `admitMechanics`; Standards and Spec/RAW review axes converged with zero
  findings after three rounds. The focused static-admission selection passed
  9/9 with five lifecycle tests skipped. Changed-root type diagnostics were
  zero, and scoped ESLint, Prettier, and diff checks passed. The actual reviewed
  write set was the persistent-area-obscurement profile, the Fog Cloud test,
  and `battle-state-execution.ts`. Lifecycle and full-file verification are not
  claimed because the remaining registry frontier raises
  `admitMechanics is not a function` before those assertions. No package,
  broad, coverage, QNT, MBT, or registry run is claimed, and reducer semantics
  are unchanged. The remaining 14 legacy declarations prevent whole-package
  convergence.
- Magical-darkness-point-origin evidence: exact reviewed tip `9ac1fd18e`
  migrates the legacy top-level magical-darkness-point-origin declaration to
  `admitMechanics`; Standards and Spec/RAW review axes converged with zero
  findings after three rounds. The focused static-admission selection passed
  15/15 with seven lifecycle tests skipped. Custom changed-root type
  diagnostics were zero, and scoped ESLint, Prettier, and diff checks passed.
  The actual reviewed write set was the magical-darkness-point-origin profile,
  the Darkness test, and `battle-state-execution.ts`. Two direct package-wide
  `tsc -p` attempts violated the low-load and lock protocol; both ended
  normally, were not repeated, and are excluded from verification. No
  lifecycle, full-file, package, broad, coverage, QNT, MBT, or registry run is
  claimed, and reducer semantics are unchanged. The remaining 13 legacy
  declarations prevent whole-package convergence.
- Area-movement-distance-damage evidence: exact reviewed tip `cf4284425`
  migrates the legacy top-level area-movement-distance-damage declaration to
  `admitMechanics`. It widens the typed Surface canonical
  `authoredConditionalMechanics` collection and honestly renames its canonical
  mechanics path. Spike Growth camouflage/Search is retained as exact
  ordinal-1 unowned Table evidence. Local RAW was inspected, and Standards and
  Spec/RAW review axes converged with zero findings after five rounds. Surface
  focused checks passed 216/216, and portable/generator checks passed 93/93.
  Battle focused checks passed 18/18 for the area profile, 173/173 for the
  combined B3, C2, and area selection, 1/1 each for the changed static Fog and
  Darkness selections, and 2/2 for linked-defense and movable-light controls.
  Changed-root diagnostics were zero; scoped lint, formatting, diff, and
  generation checks passed. The initial five-file Battle run had 12 known
  lifecycle registry-harness failures; those failures are excluded and that
  run is not lifecycle verification. No lifecycle, package-wide, broad,
  coverage, QNT, MBT, or registry verification is claimed. The remaining 12
  legacy declarations prevent whole-package convergence.
- Compelled-next-turn-behavior evidence: exact reviewed tip `51b9017bd`
  migrates Command's legacy top-level declaration to parse-once
  `admitMechanics`. Admission accumulates independent exact-path issues for the
  complete supported root, including all nested option and target-selection
  facts and authored phase ordinals. Renamed synthetic record, hole-id, and
  label parity proves admission and execution are identity-inert. Slot scaling
  is carried as source-derived branded facts; Surface records the local-RAW
  `caster_can_see` requirement and Battle projects it to the existing
  `requiresSight` target-hole request and codec. The table retains Command
  option selection, while execution receives no authored mechanics. Local
  Command RAW was inspected, and Standards and Spec/RAW review axes converged
  with zero findings after four rounds. The final focused static Command
  selection passed 12/12 with nine lifecycle tests skipped. Changed-file
  diagnostics were zero; focused Surface catalog and portable checks, Dhall and
  artifact generators, and scoped lint, formatting, generation, and diff
  checks passed. An accidental ad-hoc single-file `tsc` invocation produced
  only TS5097 import-extension noise and is explicitly excluded from
  verification. No package-wide, lifecycle, full/broad, coverage, QNT, MBT, or
  registry pass is claimed. Command visibility is a table-owned fact outside
  the Command QNT relation, and the applicable locked Command MBT remains
  deferred until the registry loads completely. The remaining 11 legacy
  declarations prevent whole-package convergence.
- Directional-persistent-area evidence: exact reviewed tip `1162ed6b4d`
  migrates Gust of Wind's legacy top-level declaration to parse-once
  `admitMechanics`; it is integrated by `cc4826a31`. The profile accumulates
  independent exact-path issues across the complete represented root, retains
  actual authored operation and conditional-mechanic ordinals, requires the
  canonical table-hole wrapper without dispatching on hole id or label, and
  carries source-derived branded 60-by-10-foot Line, duration, save, push, and
  movement-cost facts into mechanics-free execution. Renamed synthetic spell
  and hole identity parity is unchanged. `laterTurnsOnly: true` is now explicit
  in canonical Surface data and admission; the existing runtime `castTurn`
  boundary already owns later-turn enforcement, so the applicable focused QNT
  relation required no change. Strong-wind evidence and the RAW gas, vapor,
  and flame interactions remain table-owned; every authored conditional
  mechanic is rejected independently at its own evidence path. Required local
  RAW discovery and direct corpus inspection completed. Review convergence took
  three rounds: round one returned four findings; round two returned four
  Standards and two Spec/RAW findings; round three returned zero findings on
  both axes. The final Battle static selection passed 23/23 with 18 lifecycle
  tests skipped, and diagnostics rooted at the three changed Battle files were
  zero. Surface catalog selection passed 1/1 with 175 skipped, the portable
  generator passed 5/5, and focused sync passed 2/2 with 26 skipped. Bounded
  generation, Dhall/JSON byte synchronization, scoped ESLint, Prettier, and
  diff checks passed with no artifact drift. A pre-existing full-file Gust
  Dhall formatting issue remains excluded. Incidental commit-hook inventory
  and gitleaks checks are not a QNT execution claim. No lifecycle, package,
  broad, registry, coverage, QNT, or MBT verification is claimed. The remaining
  10 legacy declarations prevent whole-package convergence.
- Magic-suppression-emanation evidence: Luna max produced two bounded no-edit
  checkpoints before Sol fallback implemented initial tip `dee06cd21`; exact
  lease expansion `4e9d4c5ee1201151fe0c1eefe3617daecf248a42` added only the
  canonical `magicSuppressionEmanation` procedure-execution projection field,
  and repair tip `9b57ca535ecbad7927bb59ab3a6099dbaf6298ab` is integrated by
  `7920c5e00`. Parse-once admission owns the exact local-RAW Action, Self, V/S/M
  iron-filings, 1-hour Concentration, 10-foot Emanation, ongoing suppression,
  suppressed-time-counting, and Artifact/deity exception facts. It accumulates
  exact-path and actual-ordinal issues, retains the four non-executed operation
  effects as exact unowned evidence, ignores authored spell and area-hole
  identity, and passes no authored mechanics to execution. The exact normalized
  exception tuple is source-derived once and threaded through facts,
  invocation, canonical procedure execution, codec, and runtime filtering.
  Required local RAW bounded discovery and direct corpus inspection completed.
  Review round one returned three Standards findings and one overlapping
  Spec/RAW exact-set finding; round two returned zero findings on both axes. The
  focused static selection passed 13/13 with eight lifecycle tests skipped.
  Four-root diagnostics reported zero leased-file errors; 21 unrelated baseline
  diagnostics were excluded, as were the pre-expansion two leased-file errors
  plus those same 21 baseline diagnostics. Scoped ESLint, Prettier, and diff
  checks passed. Commit-hook inventory, lint-staged, and gitleaks checks are
  incidental only. No lifecycle, package, broad, registry, coverage, QNT, or
  MBT verification is claimed. The remaining nine legacy declarations prevent
  whole-package convergence.
- Condition-immunity and turn-start Temporary Hit Points evidence: Luna max
  produced two bounded no-edit checkpoints before Sol fallback implemented
  initial tip `0f11267b4`; exact lease expansion
  `61c0eb091755d122ca03d853eeff70fdecdd7295` added only this procedure's
  invocation and canonical execution targeting fields plus removal or
  replacement of its old procedure-name willingness branch. Repair tips
  `17b67e48e` and `f360d0ce1` are integrated by `5269bd92b`. Parse-once
  admission owns Heroism's exact local-RAW level 1, Magic Action, Touch, V/S
  without Material, up-to-1-minute Concentration, willing-creature target,
  Frightened immunity, spellcasting-ability-modifier Temporary Hit Points at
  each target turn start, and one-additional-target-per-higher-slot facts. It
  accumulates complete exact-path issues at actual authored ordinals, resolves
  structurally ambiguous operation roles without authored identity or array
  order, and carries typed target scaling and willingness from Surface through
  admitted facts, invocation, codec, canonical procedure execution, and the
  sole generic target-disposition consumer. Execution receives no authored
  mechanics; duration has one canonical owner. Required local RAW bounded
  discovery and direct corpus inspection completed. Review round one returned
  three Standards findings and one Spec/RAW finding; round two returned two
  Standards findings and one Spec/RAW finding; round three returned zero on
  both axes. The final focused static selection passed 13/13 with 32 lifecycle
  tests skipped. Five-root diagnostics reported zero leased-file errors and 20
  unrelated baseline diagnostics. Scoped ESLint, Prettier, and diff checks
  passed. Existing QNT and Glyph semantics were unchanged. Commit-hook
  inventory, lint-staged, and gitleaks checks are incidental only. No
  lifecycle, package, broad, registry, coverage, QNT, or MBT verification is
  claimed. The remaining eight legacy declarations prevent whole-package
  convergence.
- Ongoing-spell-end evidence: Luna max produced two bounded no-edit
  checkpoints before Sol fallback implemented initial tip `ef68bdbab`;
  follow-up tips `7dd86712f` and `489311b0c` repaired the W10 Antimagic Field
  and W8 Command canonical execution projections, and Dispel repair tips
  `c0b834ce2`, `ddbef5d80`, and `7c5d48411` are integrated by
  `e4dc4ffa3410665eaa532f83165660ebf4ac561f`. Parse-once admission owns
  Dispel Magic's exact local-RAW level, school, Action, 120-foot range, V/S
  components without Material, Instantaneous duration, creature/object/magical
  effect target attachments, direct ending, spellcasting Ability Check, and
  higher-level Spell Slot facts. It accumulates independent exact-path issues
  at actual authored phase and effect ordinals, including mode, effect
  cardinality, target-selection fields, and range origin. The source-derived
  branded `abilityCheckDcBase` is threaded through facts, invocation,
  procedure type/schema, character projector, and runtime hole; runtime no
  longer copies `10 + contestedSpellLevel`. Execution receives no authored
  mechanics and ignores authored spell and hole identity. The expanded W12
  diagnostics exposed real W10 `exceptSources` and W8 `visibility` projector
  gaps; both canonical fields were restored and focused regression-tested.
  Required bounded local RAW searches and direct reads completed for Dispel
  Magic, Antimagic Field, and Command. Review convergence took four rounds:
  round one returned four Standards and two Spec/RAW findings; round two
  returned one Standards finding and zero Spec/RAW findings; round three
  returned zero Standards and one Spec/RAW finding; round four returned zero
  findings on both axes. Final focused selections passed 12/12 with 19 skipped
  for Dispel, 12/12 with nine skipped for Command, and 13/13 with eight skipped
  for Antimagic Field. Seven-root diagnostics reported zero relevant errors;
  17 unrelated total-program diagnostics were excluded. Scoped ESLint,
  Prettier, and diff checks passed. Commit hooks are incidental only. No
  lifecycle, package, broad, registry, coverage, QNT, or MBT verification is
  claimed. The remaining seven legacy declarations prevent whole-package
  convergence.
- Creature-type-protection Battle evidence: reviewed implementation tips
  `3ac2bd5c6`, `fccf556ee`, and `752164080` are integrated by non-fast-forward
  merge `d65e4f804`. Parse-once admission consumes the generic Surface
  `creature_type_protection` and ongoing `creature_type_ward` shapes, retains
  exact special-function paths as unowned evidence, uses
  `BattleSpellExecutionSource`, and gives execution no authored mechanics.
  The canonical active effect carries source Creature Types and its complete
  discriminated protection policy. One domain query owner searches every
  capability and outcome for attack Disadvantage, scoped new
  Condition/possession prevention, and scoped existing-effect save Advantage;
  Dispel Evil and Good's attack-only ward therefore cannot gain save
  Advantage. No compatibility `protectedAgainstCreatureTypes` field or copied
  creature-protection constants remain in production.
  The exact lease expansions added the route consumer and compile-time-only
  fixture migrations in the selected-identity MBT file and Hypnotic Pattern
  test, then the canonical active-effect policy owner and focused synthetic
  matrix test. Integration mapping `35990c92a` adds that policy owner to
  `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`; public
  generation changed `matrix.json`, while `REPORT.md` remained byte-stable,
  and the rules-kernel checker passed all 162 obligations. Review round one
  returned three Standards and two Spec/RAW findings; round two returned one
  Standards and one Spec/RAW finding (the stale-lease portion was corrected,
  while the missing rules-kernel mapping remained valid); round three returned
  zero findings on both axes.
  The exact policy/attack selection passed 10/10 and Protection/Dispel static
  admission passed 4/4 with eight lifecycle tests skipped. Custom diagnostics
  across all 14 changed Battle roots reported zero relevant errors and 20
  unrelated transitive baseline diagnostics. Scoped ESLint, supported-file
  Prettier, JSONL parsing, and diff checks passed; the explicit `.jsonl`
  Prettier attempt was inapplicable because no parser is registered and is not
  a failed source-format claim. The previously reported 4-passing/19-failing
  selection was not rerun unchanged and is not verification. No lifecycle,
  package-wide, broad, registry, coverage-map, QNT, or MBT pass is claimed.
  Final integration composite review returned zero Standards and zero Spec/RAW
  findings at pre-receipt checkpoint `c68efa280`. W13/S and W13 Battle are
  integrated and complete, making W13 a handoffable integration checkpoint.
  Six legacy top-level declarations remain in five files, so SR-04G/#474 stays
  Active and incomplete and remains off `master`.
- Surface publication evidence: exact checkpoint `73921983c` classifies
  Hunter's Mark's source-derived aggregate change without adding a schema or
  runtime claim. Regeneration was byte-stable; the public Unit and Stat Block
  aggregate checks, 935-peer content-publication sync, delta verifier, and
  publication typecheck passed. The lock-owning publication self-test passed
  64/64. The deeper delta-verifier suite passed 42/48 before exposing six stale
  schema fixture coordinates; after repairing all eight affected coordinate
  cases, their focused rerun passed 8/8. ESLint, Prettier, and diff checks
  passed. The Standards rationale repair at `2bd514943` leaves volatile counts
  and digests to the executable certificate. The final locator repair at
  `7cede904b` makes every changed fixture mutation use unique
  semantic/discriminant evidence, follows local Speed-union references, and
  removes all numbered generated definition names; its two affected negative
  cases passed 2/2. Spec review had zero findings. No broad/full or QNT/MBT pass
  is claimed.
- W18 is complete for the final legacy top-level declaration,
  `spellCreatedHeldObject`, on `work/sr04g-spell-created-held-object` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-spell-created-held-object`,
  exact base `d3d9bb830e33d4a0e6b7e01e72778b4c0628332f`. The fresh audit found no
  prerequisite Surface or runtime slice: one complete ongoing-effect root,
  one profile, one focused test owner, and the existing creation, hand-
  occupancy, attack, re-evocation, light, duration, Concentration, dismissal,
  and cleanup runtime owners form one coherent production-consumed milestone.
  W18's exact implementation lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-created-held-object.ts`;
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/held-light.ts`;
  `packages/battle-runtime/src/unit-profile-admission-flame-blade.test.ts`;
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/c2-support-profile-admission.test.ts`;
  and
  only the `spell` fields of `SpellCreatedHeldObjectSpellInvocation`,
  `SpellCreatedHeldObjectAttackSpellInvocation`, and
  `SpellCreatedHeldObjectReEvokeSpellInvocation` in
  `packages/battle-runtime/src/battle-state-execution.ts`. The profile must
  parse authored mechanics once through `admitMechanics`, bind correlated
  admitted facts and exact mechanics-path evidence to contextual admission,
  pass only `BattleSpellExecutionSource` into execution, and keep attack and
  re-evocation declarations synthesized from the admitted active effect rather
  than recognizing authored identity again. Supported admission requires the
  level-2 Evocation Bonus Action/Self/V-S-M/Concentration-up-to-ten-minutes
  header; self attachment and direct creation phase; caster-held object with a
  free-hand requirement, disappearance on release, and Bonus Action/free-hand
  re-evocation; 10-foot Bright plus 10-foot Dim light; a caster Magic Action
  melee spell attack that deals 3d6 plus spellcasting-ability-modifier Fire
  damage on a hit and no damage on a miss; and one additional d6 per slot level
  above 2. The generic SRD melee-reach/runtime owner supplies the existing
  5-foot attack range; the blade's descriptive shape is not an executable
  Surface field. A complete recognizable near miss must be `unsupported` with
  accumulated exact issue paths across the header, duration, attachment,
  phase, effect, operation, trigger, predicate, attack, damage, light, and
  scaling facts. Unrelated or insufficient-signature roots remain
  `notRepresented`; a supported root must consume every executable branch and
  report no unowned paths.
  The W18 registry witness exposed a pre-existing ownership collision:
  `heldLightRepresentation` also classified Flame Blade from its generic light,
  Bonus Action, and self facts even though Flame Blade has neither Produce
  Flame's timed ten-minute duration nor its ranged hurl operation. The
  held-light selection lease may require at least one of those two independent
  domain discriminants in addition to its existing redundant signature. This
  retains `unsupported` ownership when either characteristic Produce Flame
  fact is individually malformed, while a root missing both discriminants is
  `notRepresented`; it does not dispatch on authored identity. Regression
  coverage must prove canonical and renamed Produce Flame remain supported,
  individual timed-duration and ranged-hurl defects remain represented as
  accumulated `unsupported` issues, canonical and renamed Flame Blade are
  `notRepresented` by `heldLightProfile`, and canonical registry admission
  selects only `spellCreatedHeldObject` for Flame Blade.
  RAW is `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Flame-Blade`, with
  generic melee reach and light in `Playing-the-Game.md`, and Concentration in
  `Rules-Glossary.md`. The primary mapped obligation is
  `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE`; its semantic-core QNT
  owners are `packages/battle-runtime/battle-runtime-light-emitters.qnt`,
  `packages/battle-runtime/battle-runtime-light-spell-attacks.qnt`, and
  `packages/battle-runtime/battle-runtime-light-spell-lifecycle.qnt`. The
  inherited shared spell-damage, damage-disposition, and Hit Point obligations
  and their semantic-core QNT owners remain unchanged and unleased. The
  focused runtime witness is
  `packages/battle-runtime/src/unit-profile-admission-flame-blade.test.ts`; the
  focused held-object lifecycle MBT remains an unleased parity witness.
  Acceptance requires identity-independent static admission, renamed
  synthetic parity, unrelated controls, exact consumed/unowned and
  unsupported-path evidence, exact-base disposition of the focused lifecycle
  cases, changed-root diagnostics, scoped ESLint/Prettier/diff checks, and
  converged RAW/domain/architecture/connascence plus Standards/Spec review. A
  newly proved compile-only consumer requires a ledger lease expansion before
  edit. No Surface/content/publication/certificate, shared algebra,
  active-effect/lifecycle, hand-occupancy helper, attack resolver, synthesized-
  procedure semantics, Battle subject/composition, selected-identity/MBT
  fixture, registry, rules-kernel mapping or generation, QNT/MBT semantic
  change or execution, broad gate, authored-id gate, or other file is leased.
  Activation `ed2b03aadd24cd1687eea3a120b192fb6485fadb` established the
  initial lease, and `a0cc74bcfe2b944bad6551c637a2e7ecb772da6c` amended it
  after the first integrated registry witness exposed held-light's ownership
  overlap. The initial Luna implementation lane made no edit, so Sol completed
  the bounded source work. Source commits `325767d66`, `268910a0b`,
  `62c1f8af5`, `ce7f41384`, `777402588`, and `8a2c46763` migrated the final
  profile, preserved the exact branded duration, removed a compile-only
  assertion, repaired imports and narrowed test helpers, restored nonempty-
  tuple contextual typing, and moved the deliberately malformed empty-hand-
  requirement fixture to the parser boundary. Source review progressed from
  Standards 1 High/Spec 0, to Standards 1 Low/Spec 0, then Standards 0/Spec 0.
  Post-merge repair reviews R4, R5, and R6 each returned Standards 0/Spec 0.
  Reviewed source tip `8a2c467631d7d93530c83122e84698be12523998`
  is integrated without history rewriting through non-fast-forward merges
  `15a1679ff`, `cbdb62a66`, `d5cbe17db`, and `385a7fba0`.
  The lost source package-typecheck result is not evidence. The first locked
  integrated package typecheck found nine W18 changed-root diagnostics plus
  the unrelated transitive baseline; the next two repaired integrated runs
  reduced the W18 count to two and then one. The final locked run completed in
  12.2 seconds with zero W18 changed-root diagnostics and 12 unrelated
  transitive diagnostics: eight in the existing registry generic boundary,
  three in `scalar-buff.ts`, and one in
  `spells-resolve-target-selection.ts`. The package remains red; no package
  typecheck pass is claimed.
  Exact-base Flame Blade lifecycle admission was 16/16 red. The reviewed W18
  tip's full Flame Blade file passed 20/20, and the full C2 admission owner
  passed 120/120; their joined integrated run passed 140/140 in 6.1 seconds.
  Direct integrated registry loading completed in 11.1 seconds and admitted
  Flame Blade only as `spellCreatedHeldObject`. The unchanged six-file joined
  evidence passed 176 and failed 43 in 7.44 seconds. All 43 failures are
  external ownership-selection debt: `rollModifier` rejects Levitate and
  Enlarge/Reduce, both creature-size profiles additionally reject Levitate,
  and `scalarBuff` rejects Haste. Neither W18 profile contributes an issue, so
  no W14-W16 lifecycle convergence is claimed. Scoped ESLint, Prettier, and
  diff checks passed. The exact inventory is zero legacy top-level `admit`
  fields, 73 authored top-level `admitMechanics` fields, and three synthesized
  admission declarations.
  Pre-receipt `b307942aa2666004caa7867d9de6d95c7ec7b0ab` received composite
  Standards 1 Low/Spec 1 Low for the resume checkpoint and synthesized-
  declaration inventory. Repair `d24fb0722711e0b3cf7289497be127bb828ead37`
  corrected both ledger facts, and composite R2 converged at Standards 0/Spec 0. W18 is Complete, while SR-04G remains Active.
  Historical W19 handoff: the `rollModifier` activation-ownership collision
  ran on branch `work/sr04g-roll-modifier-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-roll-modifier-ownership`,
  exact base `eaa85e409e7abf2114efc82f93f2360b79aace81`. The exact registry
  payload had `rollModifier` reporting `saveAppliesIf` at activation phase 1
  and `effect` at effect 1 of phase 1 for both Levitate and Enlarge/Reduce.
  This was separate from the then-remaining owners: `creatureSizeIncrease` and
  `creatureSizeDecrease` each reported Levitate's `range`, `durationValue`,
  `objectTarget`, and `modeChoice`, while `scalarBuff` reported Haste's
  `visibility` and effects at ordinals 1, 3, 4, 5, and 2.
  W19 was chosen as the smallest production-consumed slice that removed one
  profile's complete collision family and immediately restored a lifecycle
  owner. Bane RAW supplies the activation roll-modifier signature: level-1
  Enchantment, Action, 30-foot point range, Concentration up to 1 minute,
  Charisma save, and an up-to-three creature target count that gains one target
  per slot above 1. Its characteristic failed-save effect subtracts 1d4 from
  attack rolls and Saving Throws. Enlarge/Reduce and Levitate are instead
  level-2 Transmutations with distinct size-mode and vertical-suspension
  effects. Representation therefore had to keep a present
  `modify_roll_numeric` failed-save effect as the primary semantic witness and,
  only when that characteristic effect was absent, require the complete
  independent Bane-shaped activation signature. A canonical or renamed Bane
  with the characteristic effect deleted had to remain represented as
  `unsupported` at the exact effect path; canonical and renamed Levitate and
  Enlarge/Reduce had to be `notRepresented`. No authored identity participated.
  W19's exact write lease was
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/roll-modifier.ts`
  and
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/c2-support-profile-admission.test.ts`.
  Existing Surface facts were sufficient; no schema, content, publication,
  registry, or runtime execution change was required. RAW owners are
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Bane`,
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce`, and
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate`. The mapped
  obligation is `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`; its semantic-core
  QNT owners are
  `packages/battle-runtime/battle-runtime-temporary-ability-check-roll-mode.qnt`,
  `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`, and
  `packages/battle-runtime/battle-runtime-thaumaturgy.qnt`. They are unchanged
  because W19 changed representation ownership, not reducer semantics.
  W19 acceptance required focused C2 support and exact-path rejection tests,
  canonical and renamed collision regressions, the existing roll-modifier
  runtime owner, full Enlarge/Reduce and Levitate files, and the six-file joined
  disposition. The expected joined result was 195 passed/24 failed: the 19
  Enlarge/Reduce cases became reachable, while 11 Levitate cases remained
  blocked by the two creature-size profiles and 13 Haste cases remained blocked
  by `scalarBuff`. W19 acceptance also required changed-root diagnostics, scoped
  ESLint/Prettier/diff checks, and converged RAW/domain/architecture/connascence
  plus Standards/Spec review. No other profile or test file, Surface,
  publication/certificate, shared algebra, lifecycle/helper/resolver, registry,
  rules-kernel mapping/generation, QNT/MBT semantic change or execution,
  authored-id gate, broad gate, or other Battle file was leased. The later
  creature-size and scalar-buff collision families remained unleased at the
  W19 handoff. After all
  collision convergence, SR-04G still requires the deferred marker audit,
  independent cumulative architecture review, applicable locked MBT, and
  stable broad milestone gate. No QNT, MBT, or broad quality result is claimed
  here.
  W19 is complete. The initial Luna lane
  made no edit, so Sol completed the bounded implementation. Source commits
  `0ef4434d1` and `641354a2a` narrowed activation ownership and reused the
  canonical target-count projection; source review progressed from Standards
  1/Spec 0 to Standards 0/Spec 0. Non-fast-forward merge `355e65505` integrated
  that reviewed tip. The first locked integrated package typecheck then found
  one W19-local TS2345 in the deliberately malformed C2 fixture plus the
  unrelated transitive baseline. Source repair `7bdbe61f5` preserved the typed
  activation root and injected malformed fields at the admission boundary;
  review R3 returned Standards 0/Spec 0, and non-fast-forward follow-up merge
  `bbfb48e0c` integrated it without rewriting history. The final locked package
  typecheck completed within 11.7 seconds with zero W19 changed-root
  diagnostics and 12 unrelated transitive diagnostics: eight at the existing
  registry generic boundary, three in `scalar-buff.ts`, and one in
  `spells-resolve-target-selection.ts`. The package remains red; no package
  typecheck pass is claimed.
  Full C2 admission passed 120/120 in 5.85 seconds, and the focused Bane runtime
  selection passed 1/1 with 32 skipped in 5.51 seconds. The joined six-file
  result moved exactly from W18's 176 passed/43 failed to 195 passed/24 failed
  in 6.35 seconds. All 19 Enlarge/Reduce cases became reachable. At the W19
  receipt, the remaining 24 failures were the separately owned collision
  families: 11 Levitate cases were blocked by `creatureSizeIncrease` and
  `creatureSizeDecrease`, and 13 Haste cases were blocked by `scalarBuff`.
  Scoped ESLint, Prettier, and diff
  checks passed. Pre-receipt `56215fd567860b37c59d0c61be8d8b7c5ec4eb4b`
  received composite Standards 1 Low/Spec 1 Low for its stale resume
  checkpoint. Ledger repair `97d258f155475f0606e8b1ca2b7cf185c5d1f438`
  corrected that sole mutable checkpoint, and composite R2 converged at
  Standards 0/Spec 0. W19 is Complete, while SR-04G remained Active at that
  checkpoint. At the W19 receipt, the next collision-convergence slice was
  unleased. No Surface/publication/certificate,
  runtime semantics,
  registry implementation, rules-kernel mapping/generation, QNT/MBT semantic
  change or execution, authored-id gate, broad gate, or remaining-collision
  convergence is claimed.
  Historical W20 handoff: the paired creature-size ownership collision ran on
  branch `work/sr04g-creature-size-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-size-ownership`,
  exact base `25390d674a42730504527d9c8240950a01fcdff2`. The exact registry
  payload had both `creatureSizeIncrease` and `creatureSizeDecrease` reporting
  Levitate's `range` at the header, `durationValue`, `objectTarget` at
  activation attachment 1, and `modeChoice` at effect 1 of activation phase 1.
  At W20 activation, the remaining `scalarBuff` collision on Haste was a
  distinct owner and remained unleased.
  W20 was the smallest coherent production-consumed slice because both size
  procedures share one representation function, source file, test owner,
  authored root, and lifecycle obligation. Enlarge/Reduce RAW defines a
  level-2 Transmutation with an Action, 30-foot point range, Concentration up
  to 1 minute, an unwilling-creature Constitution save, a visible creature-or-
  object target with the object neither worn nor carried, and a choice between
  increase and decrease effects. Levitate shares level, school, save, and broad
  creature-or-object targeting but instead has a 60-foot range, 10-minute
  duration, loose-object constraint, and `levitate_target` effect.
  Representation had to use the `choose_effect_mode` save-gate branch as the
  primary semantic witness while preserving a complete independent
  Enlarge/Reduce-shaped fallback when that characteristic branch is absent.
  Canonical and renamed Enlarge/Reduce had to remain supported. Removing its
  entire characteristic mode effect had to remain represented as `unsupported`
  with exact `modeChoice` evidence, and existing partial/broken direction
  cases had to retain exact `modeCount`/mode-path diagnostics. Canonical and
  renamed Levitate had to be `notRepresented` by both creature-size profiles.
  No authored identity participated.
  W20's exact write lease was
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/creature-size-change.ts`
  and
  `packages/battle-runtime/src/unit-profile-admission-enlarge-reduce.test.ts`.
  Existing Surface mechanics were complete; no schema, content, publication,
  registry, or execution change was required. RAW owners are
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce` and
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate`. The mapped
  obligations are `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE` and the
  collision control's `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE`. Their
  semantic-core QNT owners are
  `packages/battle-runtime/battle-runtime-creature-size-change.qnt`,
  `packages/battle-runtime/battle-runtime-concentration.qnt`,
  `packages/battle-runtime/battle-runtime-controlled-vertical-suspension.qnt`,
  `packages/battle-runtime/battle-runtime-levitate-creature.qnt`, and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`; they remained
  unchanged because W20 narrowed representation ownership only.
  W20 acceptance required focused paired static admission and exact-path
  regressions, canonical and renamed collision controls, full Enlarge/Reduce
  and Levitate files, and the six-file joined disposition. The expected joined
  result was 206 passed/13 failed: all 11 Levitate cases became reachable,
  while the 13 Haste cases remained blocked by the then-unleased `scalarBuff`
  collision. W20 acceptance also required changed-root diagnostics, scoped
  ESLint/Prettier/diff, and
  converged RAW/domain/architecture/connascence plus Standards/Spec review. No
  other profile/test, Surface/publication/certificate, shared algebra,
  lifecycle/helper/resolver, registry, rules-kernel mapping/generation,
  QNT/MBT semantic change or execution, authored-id gate, broad gate, or other
  file was leased. After collision convergence, the deferred marker audit,
  independent cumulative architecture review, applicable locked MBT, and
  stable broad milestone gate remain required.
  The initial Luna lane added a partial red admission test and then became
  silent without completing the bounded implementation; Sol continued from
  that evidence. Source commits `9d49e75a0` and `acbb541e8` narrowed the shared
  increase/decrease ownership predicate, added canonical and renamed Levitate
  collision controls plus malformed true-owner regressions, and centralized
  the phase semantic projection. Source review progressed from Standards
  1/Spec 0 for duplicated phase-semantic selection to Standards 0/Spec 0 after
  that projection was centralized. Reviewed source tip
  `acbb541e889a1448852f3093424338eb6383411e` is integrated by non-fast-forward
  merge `eaff7cb55f50c50b971eeefdacda6c12fb9d47b1`.
  The full Enlarge/Reduce and Levitate files passed 43/43 in 7.73 seconds. The
  exact six-file joined run passed 206 and failed 13 in 18.01 seconds, moving
  from W19's 195/24 disposition and making all 11 Levitate lifecycle cases
  reachable. At the W20 receipt, the remaining 13 failures were exclusively
  the separately owned, then-unleased Haste `scalarBuff` collision. The single
  locked package typecheck
  completed within the 120-second cap in 12.58 seconds with zero W20
  changed-root diagnostics and the same 12 unrelated transitive diagnostics:
  eight at the existing registry generic boundary, three in `scalar-buff.ts`,
  and one in `spells-resolve-target-selection.ts`. The package remains red; no
  package typecheck pass is claimed. Scoped ESLint, Prettier, and diff checks
  passed. Existing Surface, runtime, RAW, and QNT semantics remain unchanged.
  Pre-receipt `eeee6507b525cd90bd76dcb1dd693d3832aaaa5b` and its
  resume-checkpoint candidate `fdf66f9e037f4d88b7adf9502cb272a34b4872c6`
  passed first-pass composite review at Standards 0/Spec 0. W20 is Complete,
  while SR-04G remained Active at that checkpoint. At the W20 receipt, the
  scalar-buff collision family remained unleased and was the next
  collision-convergence slice; W21 later completed it. No QNT/MBT,
  quality gate, authored-id gate, Surface/publication/certificate, registry,
  rules-kernel, unrelated profile/test, or deferred-convergence result is
  claimed.
  W22 is complete for the Sleep/`saveGatedAreaControl` ownership
  collision on branch `work/sr04g-save-gated-area-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-save-gated-area-ownership`,
  exact base `2d54bd3ef93bf7338f87b993ab3fdb9f3efb0d55`. The exact registry
  payload reports Sleep's `level` and `range` headers, activation-phase-1
  `attachment`, missing `failedSaveEffect` roles at synthesized ordinals 3 and
  4, and repeat-save ordinal 1. This is the sole failure in the 219-case joined
  set.
  Hypnotic Pattern is the true area-control owner. RAW defines a level-3
  Illusion, Action, 120-foot range, Concentration up to 1 minute, and a
  30-foot point-origin Cube whose occupants must see the pattern. A failed
  Wisdom save applies the complete Charmed, Incapacitated, Speed-0, and
  other-creature shake-awake role set; damage also ends the target's effect.
  Sleep is instead a level-1 Enchantment at 60 feet over a 5-foot-radius
  Sphere. Its failed-save branch initially applies Incapacitated plus
  shake-awake, then an end-of-turn repeat save can apply Unconscious. Those are
  distinct area, effect, and lifecycle domains despite the two shared roles.
  Representation must use the complete four-role Hypnotic Pattern failed-save
  control set as the characteristic primary witness, selected semantically
  without assuming authored identity. When one or more characteristic roles
  are deleted, replaced, or malformed, only a complete independent true-owner
  envelope may retain representation: level-3 Illusion, Action, 120-foot point
  range, canonical one-minute Concentration with target-damage ending, Wisdom
  caster Spell Save DC, and the exact 30-foot point-origin Cube plus occupant-
  sight attachment. The admission boundary must validate every fact used by
  that signature, including school, so malformed true owners remain
  `unsupported` with exact paths. Canonical and renamed Sleep must be
  `notRepresented`; no id, name, provenance, or other authored identity may
  participate.
  W22's exact write lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/area-control-condition.ts`
  and
  `packages/battle-runtime/src/unit-profile-admission-hypnotic-pattern.test.ts`.
  Existing Surface family, phase, area shape, occupant-perception, condition,
  Speed, escape-action, duration-ending, repeat-save, level, school, range,
  casting-time, ability, and DC facts are sufficient; no Surface schema,
  content, publication, registry, or runtime execution edit is required. RAW
  owners are `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Hypnotic-Pattern`
  and `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sleep`. Hypnotic
  Pattern maps through `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`, whose
  directly relevant semantic-core owners include
  `packages/battle-runtime/battle-runtime-save-gated-control-escape.qnt`,
  `packages/battle-runtime/battle-runtime-repeated-save-condition-control.qnt`,
  and `packages/battle-runtime/battle-runtime-save-gated-facts.qnt`. Sleep's
  collision-control owner is `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE`, with
  semantic cores
  `packages/shared-algebras/proofs/rule-core/spell-staged-save-condition-lifecycle-core.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-sleep-repeat-save-lifecycle-core.qnt`,
  and `packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`.
  W22 changes representation ownership only.
  Acceptance requires focused canonical and renamed Hypnotic Pattern/Sleep
  admission regressions; characteristic-role and complete-envelope deletion,
  replacement, reordering, sibling, and exact-path cases; the full Hypnotic
  Pattern runtime owner; and the exact six-file joined result expected at
  219/219. Read-only selector audit found no concrete additional claimant for
  canonical Hypnotic Pattern among the migrated profiles, but its full owner
  file must be run and any newly exposed external registry debt recorded
  without expanding W22. Also required are changed-root diagnostics, scoped
  ESLint/Prettier/diff, and converged RAW/domain/architecture/connascence plus
  Standards/Spec review. No Sleep implementation/test, other profile/test,
  Surface/publication/certificate, shared algebra, runtime/lifecycle/helper,
  registry, rules-kernel mapping/generation, QNT/MBT semantic change or
  execution, authored-id gate, broad gate, or other file is leased. The
  Barkskin/`weaponAttackDamageEnhancement`, Spider Climb/`directCondition`, and
  Heroism/`rollModifier` debts remain unleased, as do the deferred marker
  audit, independent cumulative architecture review, applicable locked MBT,
  and stable broad milestone gate.
  Source commits `b8b55d83ecde2dc8bd86077965a8396f304f14e8`,
  `120c0f8ba3d89fc2bf008539e9188a5bbf6d5b82`, and reviewed tip
  `87f74df2e4b065b961bcdb57010c38bc39d28aae` narrowed area-control ownership,
  selected the owner phase semantically, and centralized attachment
  projection. Source review converged in R3 at Standards 0/Spec 0. The
  reviewed source tip is integrated by non-fast-forward merge
  `fedecdd294427a50a87510442446edfa60696c2f`.
  The focused ownership selection passed 18 with 11 skipped in 6.10 seconds.
  The exact six-file main set passed 219/219 in 7.17 seconds; this closes its
  collision set but is not SR-04G acceptance. The full Hypnotic Pattern file
  passed 28 and failed one in 6.09 seconds. Its sole failure is external W13
  registry debt: the Protection from Evil and Good scenario cannot select its
  `creatureTypeProtection` procedure, so the package test file remains red and
  no full-file pass is claimed. The single locked package typecheck completed
  within the 120-second cap in 11.43 seconds and retained the exact 12 inherited
  diagnostics: eight at the registry generic boundary, three
  `CreatureTypeWard` mismatches in `scalar-buff.ts`, and one target-selection
  mismatch in `spells-resolve-target-selection.ts`. W22 adds zero changed-root
  diagnostics, and the package remains red. Existing Surface, runtime, RAW,
  and QNT semantics remain unchanged. No QNT proof, MBT, broad milestone,
  authored-id, publication/certificate, registry, rules-kernel, lifecycle, or
  deferred-convergence result is claimed.
  Pre-receipt `27c683178c4dfe5b3c12335fe6cf741c76d9ebd1` records the merged
  evidence. First composite checkpoint and receipt
  `2a37a3c5802b5bb3529acc24029ead477016fd4b` promoted W22 to Complete while
  SR-04G remained Active. Its Standards review found one Low bookkeeping
  contradiction between the W23 handoff and stale W21 activation wording;
  repair and re-review candidate `83342da3f282de0b1aea0479568d0d2854887d9f`
  retired that wording into historical evidence. Composite re-review found two
  remaining Low bookkeeping contradictions: the stale W19 activation handoff
  and the pre-receipt mislabeled as the resume-here checkpoint. Follow-up
  receipt `43af70bf168abd815188e3f8722067fdbec5d9a8` repaired both. Spec
  re-review then found one Low current-tense W20 handoff; repair receipt
  `6bd5012bd55aa7138f3f14c0c2481338f7f2d70e` recast the full W19/W20 prose
  region as historical evidence. This follow-up receipt applies the same
  temporal scoping to the W19-W21 table summaries.
  `6bd5012bd55aa7138f3f14c0c2481338f7f2d70e` is the self-reference-safe
  resume-here checkpoint.
  Historical W23 execution: weapon-attack enhancement ownership convergence
  ran on branch
  `work/sr04g-weapon-attack-enhancement-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-weapon-attack-enhancement-ownership`,
  exact base `a6f68731f264f1f76947486100aa955dce9d0da2`. The baseline full
  scalar-buff/Heroism file passed 51 and failed 10 in 5.74 seconds with 6.3
  seconds wall time: two Barkskin cases are rejected by
  `weaponAttackDamageEnhancement`, three Spider Climb cases by
  `directCondition`, and five Heroism cases by `rollModifier`.
  Magic Weapon is the true weapon-attack enhancement owner. RAW defines a
  level-2 Transmutation cast as a Bonus Action at Touch with Verbal and Somatic
  but no Material component, lasting 1 hour on exactly one nonmagical weapon
  and ending early when the caster casts the spell again. It grants +1 to the
  weapon's attack and damage rolls, increasing to +2 at slot level 3 and +3 at
  slot level 6. Barkskin instead targets one willing creature, has a Material
  component, and establishes an Armor Class floor of 17. Canonical and renamed
  Barkskin must be `notRepresented` without authored identity.
  Representation must use the characteristic
  `grant_weapon_attack_enhancement` semantic operation as its primary witness.
  When that operation or effect is deleted, replaced, or malformed, only the
  complete independent Magic Weapon envelope may retain ownership: exact
  header, components, duration and caster-recast early end, plus object
  attachment. The admission boundary must preserve exact-path `unsupported`
  results for malformed true owners, existing issue accumulation and evidence,
  canonical and renamed Magic Weapon support, and unrelated profile behavior.
  W23's exact write lease was
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/weapon-attack-enhancement.ts`
  and
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/a4-admission.test.ts`.
  `packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`
  was verification-only and not writable. No Surface, runtime, QNT, registry,
  other profile/test, broad, or deferred-gate file was leased.
  W23 acceptance required focused ownership regressions in A4; canonical and
  renamed Barkskin `notRepresented`; malformed, deleted, and replaced true
  Magic Weapon operation cases retained as exact-path `unsupported`; scoped
  ESLint, Prettier, and diff checks; the full A4 owner; the scalar-buff/Heroism
  file moving exactly from 51/61 to 53/61 with only the three external Spider
  Climb/`directCondition` and five Heroism/`rollModifier` failures; the exact
  prior six-file main set remaining 219/219; later integration changed-root
  typecheck classification; and converged source plus composite Standards/Spec
  review. W23 did not authorize broad, QNT, or MBT execution.
  Before SR-04G acceptance, preserve the deferred unknown invocation-marker
  audit, cumulative independent implementation/architecture review of linked
  defense, movable light, and object light, applicable locked MBT after the
  registry loads completely, and the public broad milestone gate on a stable
  revision.
  Source commit `26e1d8f719c757b0e3294182b32c94f205253e5f` narrowed weapon-
  enhancement ownership; repair tip
  `23d3e3100413dd9b3c07f880a9e33b608e6e6bee` retained unowned-root rejection.
  Source review progressed from Standards High/Spec 0 in R1 to Standards
  0/Spec 0 in R2. The reviewed source tip is integrated by non-fast-forward
  merge `582fe0353f9a60872dc4ef2292316206939a6ca6`. Compiler-boundary repair
  `579290a52fe3de2702d44d7a6e9194a86b17415d` then received R3 Standards
  0/Spec 0 and is integrated by follow-up non-fast-forward merge
  `500f2990a076ac658c6140c6d1c094300f4dac54`. Final test-boundary repair
  `10408d2106aaf89d51ef0028963c195260d16012` received R4 Standards 0/Spec 0
  and is integrated by final non-fast-forward merge
  `6218b705450e6b1375425bc81166cbca97b6fcbc`.
  The exact requested focused command with `-t 'weapon-enhancement'` passed 5
  test declarations with 53 skipped in 7.69 seconds, not the expected 13/45;
  the source's broader focused selection separately passed 13 with 45 skipped,
  and these are not results from the same command. After the first follow-up
  merge, the full A4 owner passed 58/58 in 6.05 seconds; after the final merge,
  it passed 58/58 again in 5.90 seconds. The full
  scalar-buff/Heroism file exited 1 after 5.10 seconds with exactly 53 passed
  and 8 failed. Its failures remain exclusively the external three Spider
  Climb/`directCondition` and five Heroism/`rollModifier` cases, so no
  full-file pass is claimed. The exact prior six-file main set remained green
  at 219/219 in 11.69 seconds. An earlier path-typo command ran only the five
  non-C2 files at 99/99 and is not six-file evidence. Scoped ESLint, Prettier,
  and diff checks passed.
  The single locked package typecheck exited 1 after 16.15 seconds with 16
  diagnostics. Twelve are the inherited baseline: eight registry-generic,
  three `scalar-buff.ts` `CreatureTypeWard`, and one target-selection
  diagnostic. W23 adds four changed-root diagnostics: two TS2345 fixture-shape
  errors in `a4-admission.test.ts`, TS2459 for the non-exported
  `UnitMechanicsPath` import in `weapon-attack-enhancement.ts`, and TS2345 for
  that profile's ongoing-effect union. All four of those diagnostics are
  repaired at the follow-up merge. The post-repair locked package typecheck
  nevertheless exited 1 after 12.12 seconds with 14 diagnostics: the same 12
  inherited diagnostics plus two newly exposed W23-local test diagnostics in
  `a4-admission.test.ts`, TS2322 at line 680 for an empty nonempty operations
  tuple and TS2537 at line 848 for indexing a possibly absent issue array. The
  production-profile diagnostics were gone, but the package and W23
  changed-root disposition remained red. The final repair removes both test
  diagnostics. The final locked package typecheck exited 1 after 10.94 seconds
  with the exact 12 inherited diagnostics and zero W23-local diagnostics, so
  the package remains red only on the inherited baseline. The final repair is
  test-only: `weapon-attack-enhancement.ts` retains identical blob
  `1430cef58d5a3fa2cd30c5bf402147980dcd2ccb` across the R3 and R4 source tips.
  Therefore the already integrated controlled-red 53/61 scalar/Heroism and
  green 219/219 exact six-file results remain the production evidence and were
  not rerun after R4. No broad test or quality gate, QNT proof, MBT,
  Surface/runtime semantic change, registry change, or deferred SR-04G gate is
  claimed.
  Final pre-receipt `9dc2f3bc66f5089cd83a853142ebbe76637174aa` is the
  self-reference-safe integration certification-review candidate; earlier
  pre-receipt `a7ba9fbf647ccd9d344e56fc80447890637340e8` and intermediate checkpoint
  `2f2396fe4e66fd03cbbcd1988fd396777a73997b` preserve the preceding evidence
  states. Composite R1 on resume receipt
  `9fa6a3ffd318eac57af59618fd14ab62dbfdc154` converged at Standards 0/Spec 0.
  W23 is Complete and its lease is retired; SR-04G remains Active.
  Historical W24 execution: the next-smallest Spider Climb/`directCondition`
  ownership collision (three cases) ran from branch
  `work/sr04g-direct-condition-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-direct-condition-ownership`,
  from exact prior receipt `800a4dfcf5a0a10cccef90940dda43af1006500c`.
  Ownership convergence was required to remain identity-free, clear the three
  external Spider Climb/`directCondition` failures, preserve canonical and
  renamed Invisibility support, and retain exact unsupported behavior for
  malformed true-owner mechanics. The exact write lease was limited to
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/direct-condition.ts`
  and
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/a2-admission.test.ts`.
  `packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`
  was verification-only and not writable. W24 did not authorize broad, QNT, or
  MBT execution.
  Source review R1 found Standards High exact-shape and Medium
  duplication/order issues plus a Spec Medium positional-endings issue.
  Repair `a91e70d78` resolved the Spec finding; R2 returned Spec 0 and a
  Standards Low duplicated-ending-inspector finding. Final repair
  `bbdc1aa3469e4e7aa43d0aecb81045a999a4d895` received R3 Standards 0/Spec 0
  and is integrated by non-fast-forward merge
  `e570cdbcf473a4d0fb4a1fb9b49bf3096561cb93`.
  The full A2 owner passed 90/90 in 5.79 seconds. The full
  scalar-buff/Heroism file exited 1 after 5.17 seconds with exactly 56 passed
  and five failed, all five exclusively the external Heroism/`rollModifier`
  cases; all three Spider Climb cases are clear, so no full-file pass is
  claimed. The exact six-file main set—C2 support admission plus Levitate,
  Enlarge/Reduce, Haste positive, Alter Self, and Flame Blade—passed 219/219 in
  10.71 seconds. Scoped ESLint passed in 1.38 seconds, Prettier in 0.43 seconds,
  and the exact activation-to-merge diff check passed.
  The single locked package typecheck exited 1 after 12.78 seconds with 15
  diagnostics. Twelve are the inherited baseline: eight registry-generic,
  three `scalar-buff.ts` `CreatureTypeWard`, and one target-selection
  diagnostic. W24 adds three changed-root TS2345 diagnostics in
  `a2-admission.test.ts` at lines 772, 807, and 1403 for widened optional or
  nonempty duration arrays. No W24 production diagnostic is present, but the
  package remained red and the W24-local fixture diagnostics required
  disposition. Test-only repair
  `79f79ae80045777d57032285c034d8acd551f02e` received R4 Standards 0/Spec 0
  and is integrated by follow-up non-fast-forward merge
  `eba6551824735eb995c1ffbf0ba3e6cb63c5ff07`. It preserves identical
  production `direct-condition.ts` blob
  `829aac8f307e8c9e4ba21adbbdfb6579d836aba5` from R3. After the repair, full
  A2 passed 90/90 in 6.24 seconds, scoped ESLint passed in 1.46 seconds,
  Prettier passed in 0.40 seconds, and the follow-up diff check passed. The
  locked package typecheck exited 1 after 12.62 seconds with the exact 12
  inherited diagnostics and zero W24-local diagnostics. The earlier
  controlled-red scalar-buff/Heroism 56/61 and exact six-file 219/219 evidence
  remains valid because the follow-up is test-only; those suites were not
  rerun after R4.
  Earlier pre-receipt `8457298eddb686db646e2a854161a3c7a7e1d77e` records the
  first integration state. Final pre-receipt
  `c79ada42cc84b62619303a99c637e22220447974` is the self-reference-safe W24
  integration certification-review candidate. Composite R1 on resume receipt
  `cbf1f42f3e66a909ec54fb5394560acdde48d364` found one shared Low stale
  typecheck-pending handoff. Repair candidate
  `e28f5ab7239108b162031adbc63c406a8ce37221` removed the contradiction, and
  composite R2 converged at Standards 0/Spec 0. W24 is Complete and its exact
  lease is retired; SR-04G remains Active.
  Historical W25 execution: the five-case Heroism/`rollModifier` ownership
  collision ran from branch
  `work/sr04g-heroism-roll-modifier-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-heroism-roll-modifier-ownership`,
  from exact prior receipt `95bbd1e19991a38aeff868d8424871e75ea776c8`.
  Ownership convergence was required to remain identity-free so canonical and
  renamed Heroism were `notRepresented` by `rollModifier`, clearing the five
  runtime cases while preserving canonical and renamed true roll-modifier
  owners plus malformed, deleted, and replaced true-owner exact-path
  `unsupported` behavior. The exact write lease was limited to
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/roll-modifier.ts`
  and
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/c2-support-profile-admission.test.ts`.
  `packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`
  was verification-only and not writable. No Heroism owner implementation or
  test, Surface, runtime, QNT, MBT, registry, broad, or deferred-gate file or
  execution was authorized.
  Source commits `9e6b08381`, `0df729cef`, and
  `0d872737fc39a6bbc888eefff893709f78bd532f` narrowed fallback ownership,
  closed its envelopes, and inferred fallback ordinals. Source review
  converged at R3 Standards 0/Spec 0. The reviewed source tip is integrated by
  non-fast-forward merge `6ccbf499e75ab5732970146e49114f88fdc4c3d2`.
  Compiler repair `e3a0d1def` received R4 Spec 0 and Standards 1 Low for
  duplicated duration inspection. Standards repair
  `061f46e36e649aaf579ff7986e6d977235cef9b8` then received R5 Standards 0;
  both are integrated by follow-up non-fast-forward merge
  `7d836465e288e919d0b5e3e15ed0f109e0b94308`. Final fixture repair
  `fa36b22a528febd5556059892cee7cc94b80182c` received R6 Standards 0 and is
  integrated by final non-fast-forward merge
  `ff42ad4ff885274a2815033efaef7471620e5aee`.
  Full C2 passed 135/135 in 27.68 seconds and full scalar-buff/Heroism passed
  61/61 in 21.82 seconds. The exact six paths—C2 support admission plus
  Levitate, Enlarge/Reduce, Haste positive, Alter Self, and Flame Blade—passed
  234/234 in 67.20 seconds, rather than the prior 219 count because C2 added 15
  W25 declarations; no 219/219 result is claimed at the W25 tip. Scoped ESLint
  passed in 7.92 seconds, Prettier in 1.82 seconds, and the activation-to-source
  diff check passed.
  The first locked package typecheck exited 1 after 63.04 seconds with 17
  diagnostics: the exact 12 inherited baseline plus five W25-local diagnostics
  in `roll-modifier.ts` and `c2-support-profile-admission.test.ts`. The next
  locked retry exited 1 after 86.02 seconds with the 12 inherited diagnostics
  plus one W25-local C2 fixture diagnostic. The final locked retry exited 1
  after 60.02 seconds with the exact 12 inherited diagnostics and zero
  W25-local diagnostics. Those inherited diagnostics remain eight
  registry-generic, three `scalar-buff.ts` `CreatureTypeWard`, and one
  target-selection diagnostic, so the package remains red. An interrupted,
  unwrapped source `tsc` attempt is explicitly not verification evidence.
  Separately, `damageReduction`/deleted-Guidance registry debt remains pending;
  W25 neither fixes nor claims it. Pre-receipt
  `59dfa952f2d618c5d206c847246014b1930f068a` recorded the integrated evidence.
  Chronology repair `461b2300b389b3ff836069e50f75ba5631578d59`
  received composite R2 Standards 0/Spec 0 and is the accepted
  self-reference-safe candidate. Final W25 receipt
  `798bc0262270edf6b5629a71bb6f9965167523c5` received receipt-only Standards
  0/Spec 0. W25 is Complete and its exact lease is retired. SR-04G remains
  Active.
  Current action: W26 persistent-armor Unit-profile marker audit/repair is
  Active on branch `work/sr04g-persistent-armor-profile-coverage` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-persistent-armor-profile-coverage`,
  from exact prior receipt
  `798bc0262270edf6b5629a71bb6f9965167523c5`. The disposition adds canonical
  profile `spell.invocation-persistent-armor-effect`, reclassifies
  `mage_armor` from the false `spell.invocation-damage-save-or-attack` profile
  to that profile while retaining `spell.readied-action-time-spell`, and joins
  existing QCORE10, QMBT14, and L1H-MAGE-ARMOR evidence with obligations
  `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` and
  `BATTLE.SPELL.INVOCATION_RESOURCE_PROCEDURE`. Armor of Shadows is alternate
  no-Spell-Slot access into the same profile, not a separate Unit or profile;
  W26 adds no runtime semantics.
  The exact authored-data lease is limited to
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/task-claims.jsonl`, and
  `plans/rules-kernel-coverage/profile-obligations.jsonl`, plus
  `plans/rules-kernel-coverage/obligations.jsonl`. Marker-only edits are
  permitted as proven necessary in the existing persistent-armor evidence
  owners: QNT proof
  `packages/battle-runtime/battle-runtime-armor-spell-tests.qnt`, runtime test
  `packages/battle-runtime/src/battle-runtime-mage-armor-and-armor-of-shadows.test.ts`,
  QMBT14 admission runtime test
  `packages/battle-runtime/src/unit-profile-admission-chained-attack-and-mage-armor-spells.test.ts`,
  focused MBT `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`, and
  selected-identity MBT
  `packages/battle-runtime/src/mage-armor-selected-identity.mbt.test.ts`, plus
  necessary QNT owners
  `packages/battle-runtime/battle-runtime-armor-class.qnt`,
  `packages/battle-runtime/battle-runtime-armor-spell-resolution.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-defensive-effect-core.qnt`,
  and
  `packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt`.
  This activation bookkeeping repair adds the QMBT14 admission owner because
  the accepted profile names it as a `runtime-test` verification owner and the
  existing Mage Armor QMBT14 evidence already points there; it does not replace
  the selected-identity owner or authorize implementation changes.
  The first rules-kernel writer attempt failed after 10.48 seconds because the
  new scalar-buff-active-effects join lacked the required runtime-test parity
  witness. Sol Spec review concluded that the correct repair is to register the
  already-declared Mage Armor runtime test above as the parity witness for
  `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`; the scalar-buff-and-Heroism
  admission test is not leased or marked because it contains no Mage Armor
  scenario. Adding `obligations.jsonl` to the authored lease permits that
  existing-obligation witness registration without broadening W26 semantics.
  The corrected rules-kernel writer and check then passed in 12.05 and 10.80
  seconds respectively with 162 obligations. The first Unit-profile writer
  reached its 120-second cap during external overlap and is excluded from
  evidence. A clear-system retry exited 1 after about 89.5 seconds because the
  new profile still lacked a reciprocal runtime-parity claim. Sol review then
  required the reusable QMBT5 claim to name the profile reciprocally and the
  selected-identity owner to carry its focused-MBT marker. The final
  Unit-profile writer passed in about 89 seconds and its check passed in about
  57 seconds with 438 Units and 273 profiles. QCORE10 and QMBT5 are reusable
  proof and runtime-parity claims; QMBT14 deterministic admission and
  L1H-MAGE-ARMOR selected-identity replay remain Unit-specific evidence.
  At source tip `aaeebb619ff22c3909ada37bcd117babbfb31242`, the exact 28
  Unit-profile mechanically generated outputs are:
  `plans/unit-profile-coverage/LEVEL1_10_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_2_QNT_MBT_JOIN.md`,
  `plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md`,
  `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_5_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_6_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_7_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_8_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/SPELL_PROCEDURE_MBT_EVIDENCE_GATE.md`,
  `plans/unit-profile-coverage/UNIT_REPORT.md`,
  `plans/unit-profile-coverage/level1-10-full-support.json`,
  `plans/unit-profile-coverage/level1-2-full-support.json`,
  `plans/unit-profile-coverage/level1-2-qnt-mbt-join.json`,
  `plans/unit-profile-coverage/level1-3-full-support.json`,
  `plans/unit-profile-coverage/level1-4-full-support.json`,
  `plans/unit-profile-coverage/level1-5-full-support.json`,
  `plans/unit-profile-coverage/level1-6-full-support.json`,
  `plans/unit-profile-coverage/level1-7-full-support.json`,
  `plans/unit-profile-coverage/level1-8-full-support.json`,
  `plans/unit-profile-coverage/level1-9-full-support.json`,
  `plans/unit-profile-coverage/level1-full-support.json`,
  `plans/unit-profile-coverage/spell-procedure-mbt-evidence-gate.json`,
  `plans/unit-profile-coverage/ultra-golden-gate.json`, and
  `plans/unit-profile-coverage/unit-matrix.json`. The two rules-kernel
  mechanically generated outputs are
  `plans/rules-kernel-coverage/REPORT.md` and
  `plans/rules-kernel-coverage/matrix.json`. These 30 paths are writer outputs
  and must not be hand-edited. The implementation commit therefore consists of
  nine marker files, five authored registries, and 30 generated outputs: 44
  paths total. The fixed-point diff contains 45 paths only because it also
  contains the preceding ledger-repair path.
  Standards R1 on that source tip returned one High for the omitted four-QNT
  marker lease and one Low for the missing generated-output enumeration. This
  ledger-only repair adds those owners and the exact generated inventory; it is
  the pending R2 repair candidate and does not mark W26 Complete. Production
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/persistent-armor-effect.ts`
  is verification-only because its runtime-owner marker is already correct.
  Acceptance requires the two coverage writers followed by their check modes,
  exact generated-diff inspection, scoped formatting/lint, and converged Sol
  Standards/Spec reviews. Luna owns implementation; Sol owns reviews and
  integration. No other production, RAW, Surface, registry, QNT semantics, MBT
  execution, or broad gate is leased or claimed.
  After W26, the discovered `damageReduction`/deleted-Guidance registry
  collision still requires disposition before aggregate registry convergence.
  SR-04G also still requires cumulative independent implementation/architecture
  review of linked defense, movable light, and object light, applicable locked
  MBT after the registry loads completely, and the public broad milestone gate
  on a stable revision.
  Historical W21 handoff: the final `scalarBuff` ownership collision ran on
  branch `work/sr04g-scalar-buff-ownership` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-scalar-buff-ownership`,
  exact base `d12f379c874f3665682a48f29de8258d93d1724b`. The exact registry
  payload has `scalarBuff` reject Haste for `visibility` at its activation
  attachment and for its effects at authored ordinals 1, 3, 4, 5, and 2. At
  W21 activation, all 13 then-remaining joined failures stopped at that same
  ownership collision.
  W21 was one coherent production-consumed slice. Scalar-buff RAW owners each
  define one scalar effect: Aid increases Hit Point maximum/current Hit Points;
  False Life grants Temporary Hit Points; Longstrider increases Speed; Shield
  of Faith grants an Armor Class bonus; Barkskin sets an Armor Class floor;
  Spider Climb grants a Climb Speed; and Fly grants a fixed Fly Speed with
  hover. Haste instead defines a five-effect composite: doubled Speed, an Armor
  Class bonus, Dexterity Saving Throw Advantage, a restricted extra action, and
  a spell-end Incapacitated/Speed-0 aftermath. Its visible willing-creature
  selection is also outside the scalar-buff target projection.
  Representation must use a successfully projected scalar effect as its
  primary characteristic witness. When that witness is absent, only a complete
  true-owner envelope may retain representation: supported casting time,
  range, canonical duration, and target projection plus one direct phase with
  at most one authored effect for activation, or no initial/conditional branch
  and at most one passive operation for ongoing effects. This fallback must
  keep a true-owner effect deletion, replacement, or malformed projection
  `unsupported` at exact paths; a valid scalar witness with extra siblings must
  also remain represented and report those siblings. Canonical and renamed
  Haste must be `notRepresented`. No authored identity may participate.
  W21's exact write lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/scalar-buff.ts`
  and
  `packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`,
  plus only the stale two-phase Longstrider expectation in
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/c2-support-profile-admission.test.ts`.
  That fixture removes Longstrider's scalar effect and replaces the record with
  two direct phases: an effectless phase and an object-attached phase whose
  fixed-dice Armor Class effect is not scalar-projectable. No complete
  true-owner envelope remains. Treating it as `notRepresented` is therefore
  correct; retaining `scalarBuff` ownership would require authored identity or
  the same permissive incomplete signature W21 removes. The C2 lease permits
  only renaming that case for its ownership boundary and changing its expected
  result to `notRepresented`; it does not permit C2 production changes.
  Existing Surface effect atoms, operation triggers, phase/operation
  cardinality, targeting, duration, and casting facts are sufficient; no
  Surface schema/content/publication, registry, or runtime execution edit is
  required. RAW owners are the Aid and Barkskin passages in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md`, False Life, Fly, Haste,
  and Longstrider in `Descriptions-E-L.md`, and Shield of Faith and Spider
  Climb in `Descriptions-S-Z.md`. The scalar owner is
  `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`, mapped to
  `packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`,
  `packages/shared-algebras/proofs/rule-core/triggered-armor-defense.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-defensive-effect-core.qnt`,
  `packages/battle-runtime/battle-runtime-spell-scalar-buff-bridge.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-turn-hook-core.qnt`, and
  `packages/battle-runtime/battle-runtime-spell-lifecycle-bridge.qnt`, with
  armor-class proof owners unchanged. Haste remains owned by
  `BATTLE.SPELL.HASTE_POSITIVE_EFFECTS` and its composite-target-buff QNT
  owners. W21 changed representation ownership only.
  W21 acceptance required focused canonical and renamed true-owner/Haste
  admission regressions, exact malformed-effect and sibling paths across
  activation and ongoing families, the full scalar-buff and Haste runtime
  owners, and the exact six-file joined disposition expected at 218 passed/1
  failed after the C2 expectation repair. W21 removed all 13
  `scalarBuff`/Haste failures.
  The sole remaining Haste/Sleep scenario then reached Haste execution, but its
  subsequent Sleep cast was absent because the then-unleased
  `saveGatedAreaControl` profile reported `level`, `range`, `attachment`, two `failedSaveEffect`
  issues, and `repeatSave`. This was newly unmasked external ownership debt,
  not a W21 failure; W22 later completed its separate convergence slice. W21
  acceptance also required changed-root diagnostics, scoped
  ESLint/Prettier/diff, and converged RAW/domain/architecture/connascence plus
  Standards/Spec review. No Haste/composite-target-buff source or test, other
  profile/test, Surface,
  publication/certificate, shared algebra, runtime/lifecycle/helper/resolver,
  registry, rules-kernel mapping/generation, QNT/MBT semantic change or
  execution, authored-id gate, broad gate, or other file was leased. In
  particular, `saveGatedAreaControl` and its tests were not leased. W21 did not
  satisfy the deferred marker audit, independent cumulative architecture
  review, applicable locked MBT, or stable broad milestone gate.
  W21 was integrated and passed final composite review as recorded below.
  Source commit `c21d5aa027e55344426bc60cb6f6daf4fe3205f9` implemented the
  characteristic projection plus complete-envelope fallback and the amended
  C2 ownership expectation. First-pass source review returned Standards 0/Spec 0. The
  reviewed tip is integrated by non-fast-forward merge
  `9d0143b28b4ba04507a1f5acb57ce6ae4005259b`.
  Focused W21 ownership TDD passed 16/16 with 45 skipped in 5.48 seconds,
  covering canonical and renamed Haste exclusion, seven canonical and renamed
  scalar owners, activation and ongoing deleted/replaced/malformed
  characteristic roots, and extra-sibling exact paths. The exact six-file run
  passed 218/219 in 10.72 seconds. All 13 prior `scalarBuff`/Haste failures are
  removed; its only failure is the separately owned Sleep
  `saveGatedAreaControl` collision recorded by the lease amendment.
  The full scalar-buff/Heroism file passed 51 and failed 10 in 4.41 seconds.
  Those failures are also external ownership debt: two Barkskin cases are
  rejected by `weaponAttackDamageEnhancement`, three Spider Climb cases by
  `directCondition`, and five Heroism cases by `rollModifier`. The W21 focused
  ownership tests in that file all pass.
  The single locked package typecheck completed within the 120-second cap in
  11.6 seconds and retained the exact 12-diagnostic baseline: eight at the
  registry generic boundary, three pre-existing `CreatureTypeWard` mismatches
  in the changed `scalar-buff.ts` file, and one in
  `spells-resolve-target-selection.ts`. One scalar-buff line moved with the
  implementation, but the diagnostics are otherwise the exact inherited
  mismatch; W21 adds zero diagnostics. The package remains red, and no package
  pass is claimed. Scoped ESLint, Prettier, and diff checks passed.
  Pre-receipt `da6214cbfad469db523481fc58c0a0a55369ca07` and its
  resume-checkpoint candidate `fa20a93d59259c67b6c5f7383f0b60fa1a35a4c2`
  passed first-pass composite review at Standards 0/Spec 0. W21 is Complete,
  while SR-04G remains Active. At the W21 receipt, separate ownership-
  convergence slices for `saveGatedAreaControl`,
  `weaponAttackDamageEnhancement`, `directCondition`, and the Heroism/
  `rollModifier` overlap were unleased; W22 later completed the first of those.
  No QNT/MBT, quality gate, authored-id gate, Surface/publication/certificate,
  registry, rules-kernel, unrelated profile/test, or deferred-convergence
  result is claimed.
  W17 is complete. Reviewed `selfTransformationMode` tip
  `3a6daaf2d27611bf0148fc7bc51fd93d6a7c6397` is integrated by
  non-fast-forward merge `fc702268d20b30e12ec0c3b6cf8d59e53f1ae47d`.
  Pre-receipt `3d13422cf890d02732c503f8900278ef95673d36` received final
  composite review at Standards 1 Low and Spec 1 Low for the same lifecycle-
  evidence overclaim. Ledger-only repair
  `7d900cc5cbf5135f3ff2408935db299df3d66694` limits focused TDD evidence to
  static admission and states that the seven lifecycle cases remain transition-
  blocked before assertions and unverified; composite round two returned
  Standards 0 and Spec 0. The implementation lane is
  `work/sr04g-self-transformation-mode` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-self-transformation-mode`,
  exact base `31549421f585219dde63c30e9e312ebbc5779eb4`. The fresh
  two-declaration/two-file audit selected it as the smallest coherent
  production-consumed slice. It has one top-level procedure, one existing
  activation-mode profile, one focused runtime owner, and one semantic-core QNT
  owner. `spellCreatedHeldObject` remains for W18 and separately spans cast,
  attack, re-evocation, hand occupancy, light, and three semantic-core QNT
  owners. The existing complete typed Surface activation root represents the
  three modes, mid-duration Magic Action replacement,
  Aquatic Adaptation, Change Appearance, and Natural Weapons facts; no Surface
  schema or publication change is required.
  W17's exact implementation lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/self-transformation-mode.ts`;
  `packages/battle-runtime/src/unit-profile-admission-alter-self.test.ts`; and
  only the `SelfTransformationModeSpellInvocation.spell` field in
  `packages/battle-runtime/src/battle-state-execution.ts`. The profile must
  parse authored mechanics once through `admitMechanics`, bind correlated
  admitted facts and exact mechanics-path evidence to contextual admission,
  pass only `BattleSpellExecutionSource` into execution, and recognize renamed
  synthetic parity without authored identity. Unsupported complete-root and
  independently invalid nested facts must accumulate typed issues. Admission
  must retain the level-2 Action/Self/one-hour Concentration header; the single
  self-attached direct phase; the three exact modes; Magic Action replacement;
  water breathing and Swim Speed equal to Speed; appearance mode with no stat
  change; and the Natural Weapons 1d6 Bludgeoning/Piercing/Slashing override
  using the spellcasting ability for attack and damage. Existing mode-choice,
  damage-type-choice, active-effect replacement, Concentration, movement-speed,
  attack, and stored-glyph behavior remains unchanged.
  RAW is `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Alter-Self`. The
  mapped obligation is `BATTLE.SPELL.SELF_TRANSFORMATION_MODE`; its
  semantic-core QNT owner is
  `packages/battle-runtime/battle-runtime-self-transformation.qnt`. The focused
  runtime witness is
  `packages/battle-runtime/src/unit-profile-admission-alter-self.test.ts`; the
  focused lifecycle MBT remains an unleased parity witness.
  Acceptance requires identity-independent static admission, exact
  consumed/unowned and unsupported-path evidence, exact-base disposition of
  the focused runtime/lifecycle selection, changed-root diagnostics, scoped
  ESLint/Prettier/diff checks, and converged RAW/domain/architecture/connascence
  plus Standards/Spec review. A newly proved compile-only consumer requires a
  ledger lease expansion before edit. No Surface, publication, certificate,
  shared algebra, active-effect/replacement, movement-speed, attack, stored-
  glyph, selected-identity/MBT fixture, registry, rules-kernel mapping or
  generation, QNT/MBT semantic change or execution, broad gate, other Battle
  file, or W18 file is leased.
  The initial Luna implementation lane made no edit, so Sol completed the
  bounded source work. Source commits `25e462504`, `ed94e3a20`, and
  `3a6daaf2d` migrated the profile, then repaired canonical mode and damage
  tuples, representation confidence, partial-mode selection, and accumulated
  diagnostics, and finally repaired envelope-only false ownership, strongest
  recognizable modal selection, and propagation of the exact branded duration.
  Source review progressed from Standards 3 and Spec 1, to Standards 1 and
  Spec 2, and then converged at Standards 0 and Spec 0. Focused TDD evidence
  covers exact complete-root facts and evidence, mechanics-free execution,
  reordered renamed synthetic parity, unrelated and envelope-only rejection,
  partial-root ownership selection, and accumulated exact nested issue paths.
  The seven lifecycle cases remain present but are transition-blocked before
  their assertions and unverified. The exact-base focused file had 7/7
  inherited transition failures. The
  reviewed tip added seven static passes and retained the same seven lifecycle
  failures, so lifecycle behavior remains unverified. The integrated joined
  W14-W17 static selection passed 28/28 with 51 skipped. At source commit
  `25e462504`, package typecheck had 0 changed-root and 15 unrelated transitive
  diagnostics. A later source run found the helper tuple issue resolved but
  retained those 15 transitive diagnostics and found one local duration-brand
  diagnostic; that local diagnostic was repaired after the run, so no
  post-repair source compiler claim is made. The single locked integrated
  package typecheck completed in 11.5 seconds with 0 W17 changed-root and the
  same 15 unrelated transitive diagnostics. The package typecheck therefore
  remains red. Scoped ESLint, Prettier, and diff checks passed. No broad
  quality/test, authored-id, Surface/publication, registry-wide, rules-kernel
  generation, QNT semantic/proof, MBT, or lifecycle pass is claimed. The
  deferred SR-04G convergence contract is unchanged. Exactly one legacy
  top-level declaration remains in one file: `spellCreatedHeldObject`.
  W16 is complete. Reviewed paired `creatureSizeChange` and
  `creatureSizeDecrease` tip
  `bd7741b741a228cd0edbf8723b4a4744f9e4ff8e` is integrated by
  non-fast-forward merge `d12fac392a17009b514e711a6ea23623f47006ee`.
  Pre-receipt `fb0b912cd6f1d4aa5975da0250fcfcfe37c20e52` received final
  composite review at Standards 1 Low for the stale observation date and Spec 0. Ledger-only repair `b08fc98f123c2ee577696e3ed69e9ce0a2ebf8b4`
  updated that date from 2026-09-04 to 2026-09-05; composite round two returned
  Standards 0 and Spec 0.
  The implementation lane is `work/sr04g-creature-size-change` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-size-change`,
  exact base `7ffea39f0c21c0916cdbd3615500dd37df89d2d2`. The fresh
  four-declaration/three-file audit selected this shared-file pair as the
  smallest coherent production-consumed slice. Both declarations use the same
  authored-mechanics parser, two-mode projection, execution schema, runtime
  obligation, and focused test owner; splitting them would duplicate one
  Surface-mode admission boundary. `selfTransformationMode` additionally owns
  mode-choice and natural-weapon hole protocols, while `spellCreatedHeldObject`
  owns cast, attack, re-evocation, light, and free-hand lifecycle protocols.
  The existing complete typed Surface activation root is adequate and requires
  no schema or publication change.
  W16's exact implementation lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/creature-size-change.ts`;
  `packages/battle-runtime/src/unit-profile-admission-enlarge-reduce.test.ts`;
  and only the `CreatureSizeChangeSpellInvocation.spell` field in
  `packages/battle-runtime/src/battle-state-execution.ts`. The pair must parse
  authored mechanics once through `admitMechanics`, bind correlated admitted
  facts and exact mechanics-path evidence to contextual admission, pass only
  `BattleSpellExecutionSource` into execution, and recognize renamed synthetic
  parity without authored identity. Unsupported complete-root and nested child
  facts must accumulate typed issues. The static boundary must retain the
  creature-or-object one-target shape and the object's visibility and
  not-worn-or-carried constraints. The admitted creature branch must retain the
  unwilling-creature Constitution save, one-minute Concentration, one-step Size
  change, Strength Ability Check and Saving Throw
  roll modes, weapon-or-Unarmed-Strike 1d4 damage adjustment, Reduce minimum
  damage 1, opposite-mode replacement, Extended and Quickened Spell behavior,
  and stored-glyph full-duration behavior. The object and carried/worn item
  lifecycle remains unrepresented by Battle and must retain exact unowned-path
  evidence rather than acquire a runtime claim.
  RAW is `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce` with
  Size categories at
  `.references/srd-5.2.1/Playing-the-Game.md#Creature-Size`. The mapped
  obligation is `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`; its semantic-core
  QNT owners are
  `packages/battle-runtime/battle-runtime-creature-size-change.qnt`,
  `packages/battle-runtime/battle-runtime-concentration.qnt`, and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`. The focused
  runtime witness is
  `packages/battle-runtime/src/unit-profile-admission-enlarge-reduce.test.ts`;
  the focused lifecycle MBT remains an unleased parity witness.
  Acceptance requires identity-independent static admission for both
  procedures, exact consumed/unowned and unsupported-path evidence, exact-base
  disposition of the focused runtime/lifecycle selection, changed-root
  diagnostics, scoped ESLint/Prettier/diff checks, and converged
  RAW/domain/architecture/connascence plus Standards/Spec review. A newly
  proved compile-only consumer requires a ledger lease expansion before edit.
  No Surface, publication, certificate, shared algebra, active-effect or
  lifecycle helper, metamagic owner, stored-glyph owner, selected-identity or
  MBT fixture, registry, rules-kernel mapping/generation, QNT/MBT semantic
  change or execution, broad gate, or other Battle file is leased.
  The initial Luna implementer lane made no edit, so Sol completed the bounded
  source work. Source commits `cca23d21f`, `428ccdaf2`, and `bd7741b74`
  migrated both declarations, then repaired the overlapping representation and
  inspection selector plus the exact branded one-minute duration, and finally
  repaired the same broken-direction fallback so partial mode diagnostics stay
  on the characteristic modal save gate instead of an unrelated earlier save
  gate. Source review progressed from Standards 2 and Spec 2 for the selector
  overlap and exact duration, to Standards 1 and Spec 1 for the shared broken-
  direction fallback, and then converged at Standards 0 and Spec 0.
  Focused TDD evidence covers both correlated modes with exact partial-root
  evidence, renamed synthetic identity independence, unrelated-root rejection,
  accumulated complete-root/attachment/mode issues, characteristic selection
  after distinct leading modal and save gates, and nested material/duration
  paths. The joined W14-W16 static selection passed 21/21 with 44 skipped.
  The 30-minute-guarded W16 full focused file returned in 12.2 seconds with
  7 static passes and the same 20 transition failures as the 7.3-second exact-
  base run's 20/20 failures. Both failure sets terminate at the same remaining
  legacy declaration without `admitMechanics`; this is inherited transition
  debt, not lifecycle verification. Changed-root diagnostics were 0 relevant
  and 17 unrelated transitive diagnostics. Scoped ESLint, Prettier, and diff
  checks passed. The initial 30-minute-guarded source operation's automatic
  maintenance completed in under 25 seconds; later Git operations observed the
  existing `gc.log` unreachable-object warning and suppressed automatic
  maintenance. No broad, workspace or package typecheck pass, authored-id,
  Surface/publication, registry-wide, rules-kernel generation, QNT semantic or
  proof, MBT, or lifecycle pass is claimed. The deferred SR-04G convergence
  contract is unchanged. Exactly two legacy top-level declarations remain
  across two files: `selfTransformationMode` and `spellCreatedHeldObject`.
  W15 is complete. Reviewed `compositeTargetBuffWithAftermath` tip
  `9a07c298d8b2e2f01f4b3bf28d50fbbae96f0271` is integrated by
  non-fast-forward merge `e28e1ba318dc6468e8b3eb8c4fb760c2ca00036d`.
  Pre-receipt `3167b21905c55ca79f0db8ec0a2d6bdc4f23fb3f` received a
  final-composite first round with zero Standards and one Spec finding for
  stale current-inventory wording. Ledger-only repair
  `059244dd1188fa1f941148a3be62a87a3d2d1bb2` time-qualified that W14
  receipt-time inventory; final-composite round two returned zero Standards
  and zero Spec findings.
  The implementation lane is `work/sr04g-composite-target-buff` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-composite-target-buff`,
  exact base `6497b6e8c437117564e1d187259c0aee2c063c7a`. The fresh
  five-declaration audit selected this Haste profile because it is the smallest
  remaining profile owner, contains one independently migratable declaration,
  already consumes a complete typed Surface direct-effect shape, and has
  production runtime and parity ownership without a Surface prerequisite. The
  two creature-size declarations remain one later coherent shared-file unit;
  self transformation and the spell-created held object have wider runtime
  protocols and larger profile owners.
  W15's exact implementation lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/composite-target-buff.ts`;
  `packages/battle-runtime/src/unit-profile-admission-haste-positive.test.ts`;
  and only the `CompositeTargetBuffWithAftermathSpellInvocation.spell` field in
  `packages/battle-runtime/src/battle-state-execution.ts`. The profile must
  parse authored mechanics once through `admitMechanics`, bind exact admitted
  facts and mechanics-path evidence to contextual admission, pass only
  `BattleSpellExecutionSource` into execution, recognize renamed synthetic
  parity without authored identity, and accumulate typed issues for unsupported
  complete-root and nested children. It must preserve the represented visible
  willing-creature target, Concentration duration, doubled Speed, +2 Armor
  Class, Dexterity Saving Throw Advantage, restricted extra action, spell-end
  Incapacitated plus separate Speed 0 aftermath, and existing stored-glyph
  full-duration consumption.
  RAW is `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Haste`. Existing
  rules-kernel owners are `BATTLE.SPELL.HASTE_POSITIVE_EFFECTS` and
  `BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE`. Their mapped QNT owners are
  `packages/shared-algebras/proofs/rule-core/composite-target-buff-core.qnt`,
  `packages/shared-algebras/proofs/rule-core/spell-haste-positive-effects-core-examples.qnt`,
  `packages/battle-runtime/battle-runtime-composite-enhancement-aftermath.qnt`,
  `packages/battle-runtime/battle-runtime-composite-enhancement-aftermath-tests.qnt`,
  and
  `packages/battle-runtime/battle-runtime-haste-lethargy-lifecycle.mbt.qnt`.
  Acceptance requires focused identity-independent static admission and exact
  evidence-path tests, preservation or exact-base disposition of the focused
  Haste positive/aftermath runtime suite, changed-root diagnostics, scoped
  ESLint/Prettier/diff checks, and RAW/domain/architecture/connascence plus
  Standards/Spec reviewer-loop convergence. Any newly proved compile-only
  consumer requires a ledger lease expansion before editing. No Surface,
  publication, certificate, shared algebra, active-effect/lifecycle consumer,
  stored-glyph owner, selected-identity or MBT fixture, registry, rules-kernel
  mapping/generation, QNT/MBT semantic change or execution, broad gate, or
  other Battle file is leased.
  The initial Luna implementer lane made no edit, so Sol completed the bounded
  source work. Source commits `90d8dd213`, `0453a3def`, `cfaeaa88e`, and
  `9a07c298d` migrated the profile, canonicalized the shared action restriction
  and one-minute duration evidence, preserved authored effect ordinals through
  malformed or non-Effect siblings, unified representation and admission on
  one characteristic-phase selector, and strengthened the leading-phase
  regression with a representationally distinct synthetic attachment.
  Source review progressed from Standards 3 and Spec 1 for the same-ordinal
  overlap, to Standards 1 and Spec 0, to Standards 0 and Spec 1 for test
  evidence, and then converged at Standards 0 and Spec 0. Source verification
  passed 9/9 focused static cases with 13 skipped. The exact-base comparison
  found the same 13 inherited runtime/lifecycle failures at base and reviewed
  tip, with the reviewed tip also passing the nine static cases; this is not
  lifecycle verification. Changed-root diagnostics found 0 relevant and 19
  unrelated transitive diagnostics. The authored-identity check retained its
  nonzero baseline without a W15 hit, and scoped ESLint, Prettier, and diff
  checks passed. The post-merge joined static selection also passed 9/9 with 13
  skipped. The commit hook's 833/833 QNT inventory result was incidental
  inventory hygiene only, not QNT semantic, proof, or MBT verification.
  The deferred SR-04G convergence contract and all stated exclusions remain
  unchanged. The remaining legacy top-level admissions are four declarations
  across three files: `creatureSizeChange`, `creatureSizeDecrease`,
  `selfTransformationMode`, and `spellCreatedHeldObject`.
  W14 is complete.
  Reviewed `controlledVerticalSuspension` tip
  `828c657f762aa614f53ec7c4d6fcb50538070ba2` is integrated by
  non-fast-forward merge `c4503ea9be6b1e922d175cba6f309bbf5fbc4c41`
  with reviewed pre-receipt
  `f2f1715c8178c96a2081348e60f834613663c3d0`. Final integrated composite
  review returned zero Standards and zero Spec/RAW/QNT findings. The completed
  implementation lane is
  `work/sr04g-controlled-vertical-suspension` at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-controlled-vertical-suspension`,
  exact base `11e38a0d438cc306ac8d529fc2bf8ba167197479`. The six-profile
  dependency/write-set audit selected this independently handoffable file: it
  is the smallest remaining one-declaration owner, already has a
  production-consumed runtime and focused parity witness, and requires no
  Surface schema or publication work. Its exact implementation lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/levitated-creature.ts`;
  `packages/battle-runtime/src/unit-profile-admission-levitate.test.ts`; and
  only the `ControlledVerticalSuspensionSpellInvocation.spell` field in
  `packages/battle-runtime/src/battle-state-execution.ts`. The profile must
  parse authored mechanics once through `admitMechanics`, return exact
  supported/not-represented/unsupported evidence, bind the supported facts to
  contextual admission, and pass only `BattleSpellExecutionSource` into the
  invocation. It must preserve the represented creature branch, including the
  willing/unwilling Constitution save gate, initial rise, Concentration,
  caster altitude control, target movement, and gentle-ending ownership; the
  unrepresented loose-object branch must not be silently admitted. RAW is
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate`; existing QNT
  owners are
  `packages/battle-runtime/battle-runtime-controlled-vertical-suspension.qnt`,
  `packages/battle-runtime/battle-runtime-levitate-creature.qnt`, and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`; existing runtime
  coverage is `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE`. Acceptance requires
  identity-independent static admission and exact evidence-path tests in the
  leased focused test, preservation of its current creature lifecycle tests,
  the relevant static-mechanics/registry selection, changed-root diagnostics,
  scoped ESLint/Prettier/diff checks, and reviewer-loop convergence. The
  existing focused lifecycle MBT remains a parity witness but is not leased or
  authorized for execution in W14; no QNT, MBT, Surface, publication,
  certificate, registry, rules-kernel mapping, lifecycle owner, glyph owner,
  execution projector, or other Battle file is leased.
  The Luna max implementation lane produced a bounded no-edit stall before Sol
  completed the implementation. Review round one returned two Standards and
  one Spec/RAW finding; exact-base comparison withdrew the Spec finding.
  `0e490fce9` repaired the valid shared-constant Standards finding. Review round
  two returned one Standards and zero Spec/RAW findings; `828c657f7` named the
  remaining profile constants and removed the repeated level, range, and
  duration literals. Review round three returned zero findings on both axes.
  On the joined merge, the focused static-admission selection passed 5/5 with
  11 lifecycle tests skipped; changed-root diagnostics were zero with 19
  unrelated transitive diagnostics, and scoped ESLint, Prettier, and diff
  checks passed. The exact-base lifecycle comparison remains debt rather than
  verification: the W14 branch retained the same 11 lifecycle failures as
  base `11e38a0d4`, while its five new static tests passed. The unchanged full
  lifecycle selection was not rerun after integration and no lifecycle pass is
  claimed. The pre-receipt commit hook incidentally passed the 833/833 QNT
  inventory check; this is inventory hygiene only, not a QNT semantic, proof,
  or MBT verification claim. No broad typecheck/test/quality, registry-wide,
  Surface/publication, rules-kernel generation, QNT, or MBT gate was run or
  claimed. The deferred SR-04G convergence contract is unchanged.
  At the W14 receipt-time integration tip, the declaration audit retained
  exactly five legacy top-level `SpellProcedureDeclaration` `admit` fields in
  four files:
  `creatureSizeChange`, `creatureSizeDecrease`,
  `compositeTargetBuffWithAftermath`, `selfTransformationMode`,
  and `spellCreatedHeldObject`. The original
  W13 Battle branch remains clean and
  paused at exact base `b1973765cedc85a1d7aaea1da3baecb474c32cff` with zero
  edits after proving the Surface source-model gap. W13/S supplied that
  prerequisite from the same base without a CONTEXT or ADR change. Its source
  tips were `6dcb6bddb`, `bbc4f8aa2`, and reviewed tip `5f86f777f`, followed by
  exact raw-JSON peer repair `8187d0a98`; integration landed source merge
  `531131630`, serialized artifacts `1a09b8e7f`, and repair merge `4d7e42dd0`.
  The generic `creature_type_protection` Effect Atom carries nonempty source
  Creature Types and nonempty discriminated attack, relevant-effect, and save
  protections. Generic nonempty ongoing `specialFunctions` distinguish
  `end_source_scoped_relevant_effects` and
  `dismiss_creature_to_home_plane`; Battle may retain their exact paths as
  unowned evidence and does not execute them in this profile.
  Luna max produced two bounded no-edit checkpoints before Sol completed the
  Surface implementation. Source reviews converged at Standards/Spec counts
  4/0, 4/0, and 0/0. The path-helper finding was retained because immediate W13
  Battle admission explicitly requires those mechanics paths. The cumulative
  certificate landed at `6dbf2092d`. Composite reviews converged at 1/0, 1/0,
  1/0, and 0/0: `11c513f79` removed the volatile generated owner name,
  `05e6d3ab0` propagated typed graph-invalid data instead of exceptions, and
  `9a2da2faa` removed copied comparison/generated identities from tests while
  retaining exact pointer and node-hash authorization.
  Verification passed 47/47 for the source selection, 147/147 for the
  integrated source selection, 100/100 for publication/portable checks, exact
  parity for both edited Dhall/JSON peers, and 52/52 for the final delta
  verifier. Public publication checks reported 437 Units, synchronized Stat
  Blocks, 935/935 Dhall/JSON peers, and Stat Block parity of 334 occurrences,
  330 identities, and zero issues. Exact authority verification accepted
  baseline `76d9abaf`; scoped lint, format, and diff checks passed. The focused
  typecheck retained three exact-base diagnostics only: TS2322 and TS2554 in
  `tracer-spell-ongoing.ts` and TS2339 in `unit-catalog.test.ts`. No broad,
  QNT, MBT, Battle, lifecycle, registry, or coverage pass is claimed. W13/S is
  integrated and complete. The post-Surface write-set audit activates a fresh
  W13 Battle lane from this receipt: `work/sr04g-creature-type-protection-battle`
  at
  `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-type-protection-battle`,
  exact base `eb96dcc7f`. Sol remains the fallback owner because the initial
  W13 Battle Luna lane already produced two bounded no-edit checkpoints. The
  exact lease is
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/creature-type-protection.ts`;
  `packages/battle-runtime/src/unit-profile-admission-protection-from-evil-and-good.test.ts`;
  `packages/battle-runtime/src/unit-profile-admission-dispel-evil-and-good.test.ts`;
  only the
  `creatureTypeProtection` invocation source field in
  `packages/battle-runtime/src/battle-state-execution.ts`;
  `packages/battle-runtime/src/active-effect/types.ts`;
  `packages/battle-runtime/src/active-effect/codecs.ts`; only removal of the
  three copied creature-type protection constants and resulting import cleanup
  in `packages/battle-runtime/src/battle-reducer/domain-constants.ts`; and the
  exact consumers
  `packages/battle-runtime/src/battle-reducer/attack-roll.ts` and
  `packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts`.
  A valid focused package typecheck then proved three additional exact
  consumers of the canonical active-effect shape:
  `packages/battle-runtime/src/battle-reducer/protection-charm-routes.ts`
  (current lines 379-380) must replace its removed
  `protectedAgainstCreatureTypes` read with narrowed canonical attack
  protection consumption;
  `packages/battle-runtime/src/creature-type-protection-and-charm-selected-identity.mbt.test.ts`
  (current lines 2083-2088) and
  `packages/battle-runtime/src/unit-profile-admission-hypnotic-pattern.test.ts`
  (current lines 230-243) own only compile-time fixture/assertion migration to
  that shape. The MBT file lease does not authorize MBT execution, and no
  compatibility duplicate fields may preserve the removed representation.
  Review-round-one audit adds two previously absent, conflict-free owners:
  `packages/battle-runtime/src/active-effect/creature-type-protection.ts` is the
  canonical domain-named policy-query owner for eligible Creature Types,
  attack Disadvantage, scoped new Condition/possession prevention, and scoped
  existing-effect save Advantage across every capability and outcome;
  `packages/battle-runtime/src/active-effect/creature-type-protection.test.ts`
  owns its focused synthetic policy matrix. `active-effect/types.ts` and
  `active-effect/codecs.ts` own shape and serialization, not policy queries;
  the condition-only reducer helper and its focused tests cannot honestly own
  attack, possession, and existing-effect save behavior. Centralizing the
  queries prevents duplicated consumer predicates and prevents first-match
  lookup from hiding a later applicable capability or outcome.
  After the reviewed Battle merge, integration alone owns the exact
  rules-kernel coverage join: add
  `packages/battle-runtime/src/active-effect/creature-type-protection.ts` to
  `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION.runtimeOwners`
  in `plans/rules-kernel-coverage/obligations.jsonl`, then run the public
  rules-kernel generator/checker. Audit of `coveragePaths` and the checker's two
  `compareOrWrite` calls proves the only generated outputs are
  `plans/rules-kernel-coverage/matrix.json` and
  `plans/rules-kernel-coverage/REPORT.md`. These three coverage files are an
  integration-only serialized lease, not an implementation-branch lease and
  not a QNT or MBT semantic change or execution claim.
  These owners are required to parse the
  new `creature_type_protection` and ongoing `creature_type_ward` shapes once,
  carry their canonical protections through a shared active-effect codec,
  consume attack/condition/possession/save policy, retain exact special-function
  paths as unowned, use `BattleSpellExecutionSource`, and prevent Dispel Evil
  and Good's attack-only ward from gaining save Advantage. The existing
  `SpellActiveEffectTemplate` procedure type and whole-`activeEffect` character
  projector already preserve the narrowed payload, so neither execution owner
  is leased. Existing occurrence routing, lifecycle, protection commands,
  other glyph consumers, schema registry, and coverage owners likewise require no
  change. No Surface, publication, certificate, QNT, MBT, registry, coverage,
  or other Battle file is leased.
  The Battle lane's reviewed tip `752164080` is integrated by `d65e4f804`, and
  integration-only rules-kernel mapping `35990c92a` is pushed. Final integrated
  pre-receipt checkpoint `c68efa280` passed composite review with zero
  Standards and zero Spec/RAW findings. W13/S, W13 Battle, and W13 as a
  handoffable integration checkpoint are complete. SR-04G/#474 remains Active
  and incomplete.
  Before every landing, fetch `origin` and prove the current `master` tip is
  present in the integration branch; this is routine integration work and does
  not require an operator decision. The observation baseline remains exactly
  99 complete, 22 partial, and 74 with no owner; integrating
  `persistentArmorEffect`, linked defense, movable light, object light, and
  repeated-damage allocation does not reclassify those catalog-root
  observations.
- Deferred SR-04G convergence contract: before an SR-04G acceptance claim,
  audit and repair or reject the unknown
  `spell.invocation-persistent-armor-effect` Unit-profile marker; run an
  independent cumulative implementation/architecture review of the
  linked-defense, movable-light, and object-light landings; run the applicable
  locked MBT selection after the registry loads completely; and run the public
  broad milestone gate only on a stable integration revision when resource
  conditions permit. Interrupted or incomplete runs remain unverified.
- Parallel work allowed now: `SR-09` and `SR-12` are available, subject to the
  serialized write hotspots and a current-base write-set audit
- Cleanroom Acceptance Run #39: excluded

Before acting, compare this section with current `master`, live native GitHub
dependencies, and active worktree ownership. If they disagree, current source
and generated artifacts win. Repair this section in a ledger-only commit before
claiming new implementation work.

For prior system-state evidence and ticket dispositions, consult
[`docs/research/cleanroom-source-readiness-subgraph-refresh.md`](../docs/research/cleanroom-source-readiness-subgraph-refresh.md).
Recover the canonical ticket graph by recursively following native blockers and
subissues from #38. The #368–#386 and #479 convergence sequence is the temporary
operational overlay recorded here, not a new domain dependency.

## How to update this ledger

For every implementation or gate milestone:

1. Create or resume the active landing unit's short-lived integration branch and
   worktree from the latest ledger-accepted `master`.
2. Merge each reviewed implementation-lane result into that integration branch
   as soon as it is coherent; do not wait for every sibling lane before
   integrating completed work.
3. Bring the latest `master` into the integration branch, run the checkpoint's
   composite review and gates, and merge the accepted landing unit into
   `master`.
4. Comment on the owning ticket with the exact `master` landing SHA, focused and
   composite verification, reviewer convergence, and remaining blockers. Close
   only satisfied tickets.
5. Immediately make a ledger-only follow-up commit that:
   - updates **Resume here**;
   - updates the checkpoint state below;
   - appends one receipt row;
   - records the next available checkpoint and active worktree leases.
6. Delete the completed landing unit's integration branch/worktree after the
   ledger follow-up is on `master`.
7. Do not begin newly unblocked work until that ledger follow-up lands.

The follow-up commit is necessary because a Git commit cannot contain its own
future SHA. The receipt records the preceding implementation or gate SHA, not
the ledger-only commit that describes it.

Do not copy ticket acceptance criteria into this file. Link the ticket and
record only execution state that the issue graph cannot express: checkpoint
ordering, exact base/landing SHAs, current leases, verification receipts, and
what became available.

## Checkpoint states

- `Waiting`: its start prerequisites are not yet satisfied.
- `Available`: it may be claimed from the named stable base.
- `Active`: one named owner and worktree hold its write lease.
- `Receipt pending`: implementation/gates landed, but the ticket comment and
  ledger follow-up are not both complete.
- `Complete`: the exact receipt is recorded and downstream work may rely on it.

Only one state may apply to a checkpoint. A ticket may remain open after a
checkpoint completes when later Slice-derived recalibration is part of that
ticket's acceptance.

## Stable checkpoint map

There are **20 coordination checkpoints**, `SR-00` through `SR-19`.
Checkpoints containing several tickets use master-merge landing units named
`SR-<checkpoint><letter>`, such as `SR-04A`. Each landing unit owns one
short-lived integration branch and one coherent master merge. The coordination
checkpoint becomes `Complete` only after all of its landing units and named
results are on one coherent `master` line.

| ID      | State     | Outcome / tickets                                          | Start after                  | Complete after                     |
| ------- | --------- | ---------------------------------------------------------- | ---------------------------- | ---------------------------------- |
| `SR-00` | Complete  | Land and certify the user-owned #368–#386 line             | current user session         | #386 receipt                       |
| `SR-01` | Complete  | Reconcile and land #479 / PR #480                          | `SR-00`                      | #479 receipt                       |
| `SR-02` | Complete  | Establish the exact common-base convergence receipt        | `SR-01`                      | stable common-base gate            |
| `SR-03` | Complete  | Land typed weapon-mastery references, #476                 | `SR-02`                      | #476 receipt                       |
| `SR-04` | Available | Land owner projections, #464/#469/#477/#470/#473/#471/#474 | `SR-03`                      | every named ticket receipt         |
| `SR-05` | Waiting   | Land joins/composition and close #465–#468/#52             | `SR-04`                      | #52 receipt                        |
| `SR-06` | Waiting   | Bind admitted mechanics, #117                              | `SR-05`                      | #117 receipt                       |
| `SR-07` | Waiting   | Derive dynamic availability, #118                          | `SR-06`                      | #118 receipt                       |
| `SR-08` | Waiting   | Generate the Cleanroom Mechanics Slice, #29                | `SR-07`                      | #29 receipt                        |
| `SR-09` | Available | Implement the typed two-slot publication store, #99        | `SR-03` shared-Surface lease | #99 receipt                        |
| `SR-10` | Waiting   | Add live cross-process leasing/recovery, #409              | `SR-09`                      | #409 receipt                       |
| `SR-11` | Waiting   | Route the public CLI and close #410/#45                    | `SR-10`                      | #410 and #45 receipts              |
| `SR-12` | Available | Land QNT protocol/context spine, #389–#393                 | `SR-02`                      | every named ticket receipt         |
| `SR-13` | Waiting   | Land QNT prerequisites/verticals, #394–#408                | `SR-12`; see execution order | `SR-08` plus all vertical receipts |
| `SR-14` | Waiting   | Recalibrate, run #211, and close #31                       | `SR-08`, `SR-13`             | #211 and #31 receipts              |
| `SR-15` | Waiting   | Publish Core and calibrate Oracle, #34/#40                 | `SR-08`, `SR-14`             | #34 and #40 receipts               |
| `SR-16` | Waiting   | Publish the minimal Rust Adapter, #35                      | `SR-15`                      | #35 receipt                        |
| `SR-17` | Waiting   | Assemble the Cleanroom Harness, #36                        | `SR-15`, `SR-16`             | #36 receipt                        |
| `SR-18` | Waiting   | Run and repair Dirty-Cleanroom Rehearsal, #37              | `SR-17`                      | #37 receipt                        |
| `SR-19` | Waiting   | Establish atomic Source Readiness, #38                     | `SR-11`, `SR-18`             | #38 closed                         |

## Milestone receipt ledger

Append one row per completed landing unit and one consolidating row per completed
coordination checkpoint. Ticket/slice landings inside a checkpoint first append
rows such as `SR-04A`; the final checkpoint row consolidates them after every
required unit has landed.

| Checkpoint/unit | Base SHA    | Accepted SHA | Result                                                                                                                                                                                                                                      | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Ticket evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Unlocked         |
| --------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `SR-00`         | `f566a5dca` | `b1afacf0a`  | Effect 4 migration and reconciliation are on `master`; terminal certification, controlled-red closure, and live #386 closure are complete                                                                                                   | Exact SHA `b1afacf0a3c38b09dc9d79154096dfb1571ff6ea` passed all 49 `pnpm quality:milestone` checks, including its build, typecheck, test, proof-closure, parity-certificate, clean-consumer, and coverage owners; direct public typecheck and test also passed; two complete review rounds and their post-fix re-reviews converged with no findings; no migration exception remains; the explicit Surface coverage recalibration and debt are tracked by #227                                                                                                | [Terminal certification report](../docs/migrations/effect-4/final-parity-report.md#terminal-public-receipts); [closed #386 receipt](https://github.com/dearlordylord/5e-quint/issues/386#issuecomment-5515847382)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `SR-01`          |
| `SR-01`         | `b2457bb42` | `aceda1aa5`  | Local master now contains the reviewed SR-00 line and merged #479 / PR #480 cohort without importing the four excluded deltas                                                                                                               | Standards and Spec/RAW reviews converged with no findings; Battle Runtime typecheck passed; focused transaction 19/19, projection 27/27, spellcasting allocation 40/40, Surface 27/27 plus encoded-reference 1/1; rules-kernel 162 obligations and unit-profile 435 Units/272 profiles passed; the operator-waived interrupted broad/full run was not replayed and is not claimed as passed                                                                                                                                                                  | [#479 final merge and preservation receipt](https://github.com/dearlordylord/5e-quint/issues/479#issuecomment-5470608738); [PR #480](https://github.com/dearlordylord/5e-quint/pull/480)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `SR-02`          |
| `SR-02`         | `94e28943d` | `22aa1a6f8`  | Exact common-base Surface, RAW-coverage, rules-kernel, QNT, and Static Mechanics Admission evidence converged on local master                                                                                                               | Standards and Spec/RAW reviews converged with no findings; Surface/Battle/publication typechecks passed; Surface 30/30 and admission/projection 29/29 focused tests passed; publication synchronized 932 Dhall/JSON peers and verified its 39 changed/344 added delta; RAW 23,966/23,966, rules-kernel 162, Unit profiles 435/272, and QNT inventory 833/833 passed; the operator-waived broad/full run was not replayed or claimed, and #481 owns the separate Stone Giant parity diagnostic                                                                | [#38 SR-02 receipt](https://github.com/dearlordylord/5e-quint/issues/38#issuecomment-5473537527); partial audits [#102](https://github.com/dearlordylord/5e-quint/issues/102#issuecomment-5473536917), [#103](https://github.com/dearlordylord/5e-quint/issues/103#issuecomment-5473537001), [#105](https://github.com/dearlordylord/5e-quint/issues/105#issuecomment-5473537103), [#56](https://github.com/dearlordylord/5e-quint/issues/56#issuecomment-5473537178), [#119](https://github.com/dearlordylord/5e-quint/issues/119#issuecomment-5473537264); accepted behavior retained behind #389: [#407](https://github.com/dearlordylord/5e-quint/issues/407#issuecomment-5473537344), [#408](https://github.com/dearlordylord/5e-quint/issues/408#issuecomment-5473537423) | `SR-03`, `SR-12` |
| `SR-03`         | `18673a70c` | `1520c58f3`  | Typed weapon-to-mastery authored references landed across Surface content, publication, catalog diagnostics, and narrowed runtime admission                                                                                                 | Standards and Spec/RAW/architecture reviews converged locally with no findings; changed-file lint and diff checks passed; Surface and Battle typechecks passed; focused Surface 336/336, Battle 6/6, and Character 4/4 tests passed; publication synchronized 932 Dhall/JSON peers; authored-id dispatch remained baseline-red with the same 130 production violations; no broad/full or QNT/MBT pass claimed                                                                                                                                                | [#476 closed receipt](https://github.com/dearlordylord/5e-quint/issues/476#issuecomment-5474179379)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `SR-04`, `SR-09` |
| `SR-04A`        | `c2218a8cd` | `65bbb45b8`  | Context-independent Character Definition projection and graph admission landed for class, subclass, background, and species roots                                                                                                           | Two local RAW/domain/architecture/standards reviews converged; Surface and Character Creation Runtime typechecks passed; focused final suite 140/140 passed; changed-file formatting and lint passed; authored-id dispatch remained baseline-red with the same 130 production violations and collision evidence; no broad/full or QNT/MBT pass claimed                                                                                                                                                                                                       | [#464 closed receipt](https://github.com/dearlordylord/5e-quint/issues/464#issuecomment-5474448769)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #469             |
| `SR-04B`        | `2b5989812` | `4314430dd`  | Source-free Character Creation feature/trait projection landed across discovery, finalization, advancement, and specialized partial-root consumers, with exact mechanics-path dispositions for the seven partial roots                      | Two local RAW/domain/architecture/connascence/standards reviews converged; Surface typecheck and 622/622 tests passed; Character Creation Runtime typecheck and 507 passed/2 skipped tests passed; Unit-profile coverage passed for 435 Units/272 profiles; changed-file formatting, lint, and diff checks passed; authored-id dispatch remained baseline-red with the unchanged 130 production violations and collision evidence; no broad/full or QNT/MBT pass claimed                                                                                     | [#469 closed receipt](https://github.com/dearlordylord/5e-quint/issues/469#issuecomment-5474879699)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #477             |
| `SR-04C`        | `0a12f771e` | `1f356613e`  | Character Sheet now owns one source-free static projection for the three armor roots and one Shield root, and Armor Class loadout consumption uses the narrowed correlated facts                                                            | Two local RAW/domain/architecture/connascence/standards reviews converged; Character Sheet and Surface typechecks passed; focused Character Sheet 23/23 and Surface 188/188 tests passed; focused projection/Armor Class coverage reached 94.24% statements with the new projection fully covered; split ownership and Unit-profile 435/272 checks passed; formatting, lint, and diff checks passed; authored-id dispatch remained at the unchanged known baseline; the unrelated full sheet sample was 491/492 and no broad/full or QNT/MBT pass is claimed | [#477 closed receipt](https://github.com/dearlordylord/5e-quint/issues/477#issuecomment-5475159645)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #470             |
| `SR-04D`        | `37119f6f4` | `e210067de`  | Character Sheet now owns one source-free static projection for class-feature, feat, and species-trait roots; current production consumers use its narrowed facts, with exact mechanics-path dispositions for the six partial roots          | Two local RAW/domain/architecture/connascence/standards/spec reviews converged; Character Sheet and Surface typechecks passed; focused Character Sheet 295/295 and Surface 188/188 tests passed; split ownership and Unit-profile 435/272 checks passed; changed-file formatting, lint, isolated complexity, and diff checks passed; authored-id dispatch and workspace complexity remained at their known integration baselines; the operator-waived broad/full run was not replayed and no QNT/MBT pass is claimed                                         | [#470 closed receipt](https://github.com/dearlordylord/5e-quint/issues/470#issuecomment-5475779117)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #473             |
| `SR-04E`        | `e210067de` | `11d7dfc22`  | Character Sheet now owns one root-record-identity-free spell admission projection; current production consumers use projected facts, with exact mechanics-path dispositions for all 31 partial roots                                        | Standards and Spec/RAW/domain/architecture/connascence reviews converged with no findings; Character Sheet and Surface typechecks passed; projection 77/77, focused Character Sheet 198/198, and Surface familiar-form 4/4 tests passed; split ownership and Unit-profile 435/272 checks passed; formatting, lint, and diff checks passed; authored-id dispatch remained at the identical 130-violation fixed-base baseline; the wider non-MBT sample retained its known unrelated 507/508 schema failure and no broad/full or QNT/MBT pass is claimed       | [#473 closed receipt](https://github.com/dearlordylord/5e-quint/issues/473#issuecomment-5477996798)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #471             |
| `SR-04F`        | `11d7dfc22` | `d383f8a7a`  | Battle now owns focused source-free procedure admission for the canonical feature, species-trait, mastery, Indomitable, Wild Shape, and Monk Focus roots; migrated Battle consumers carry admitted facts with exact nine-root path evidence | RAW/domain/architecture/connascence/Standards/Spec reviews converged with no findings; Battle and Surface typechecks passed; final admission/evidence 79/79, Monk/Open Hand/Stunning Strike 45/45, tracer regression 1/1, resource-boundary 43/43, and broader boundary/profile 139/139 tests passed; Battle import ownership and Unit-profile 435/272 checks passed; authored-id self-test passed while the full check retained the confirmed 130-violation fixed-base certificate mismatch; no broad/full or QNT/MBT pass is claimed                       | [#471 closed receipt](https://github.com/dearlordylord/5e-quint/issues/471#issuecomment-5480739757)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #474             |

## Active landing table

This table prevents worktrees from silently drifting or sharing write ownership.
Clear a row only after its landing is recorded on the ticket or the work is
explicitly abandoned.

| Checkpoint/unit | Ticket/slice                                      | Owner                                                                      | Worktree/branch                                                                                                                                    | Base SHA    | Write lease                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | State    |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `SR-04G`        | #474 Battle spell mechanics procedure admission   | Codex orchestrator                                                         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr-04g`; `integration/cleanroom-sr-04g`                                                      | `dd1350f81` | Integration checkpoint `798bc0262`; C2, B3, A4, B4, A5, `persistentArmorEffect`, linked defense, movable light, object light, repeated damage allocation, persistent area obscurement, magical darkness, movement-distance area damage, compelled next-turn behavior, directional persistent area, magic suppression emanation, condition-immunity turn-start Temporary Hit Points, ongoing spell end, W13 creature-type protection, W14 controlled vertical suspension, W15 composite target buff, W16 paired creature size, W17 self-transformation, W18 spell-created held object, W19 roll-modifier ownership, W20 paired creature-size ownership, W21 scalar-buff ownership, W22 save-gated area-control ownership, W23 weapon-attack enhancement ownership, W24 direct-condition ownership, and W25 roll-modifier ownership convergence complete; cumulative Surface publication delta certified; legacy top-level declaration inventory is zero; W26 persistent-armor Unit-profile marker audit/repair is active under its exact authored, marker-only, and generated-output leases; damageReduction/deleted-Guidance registry debt remains pending before aggregate registry convergence, followed by cumulative linked-defense/light architecture review, applicable locked MBT, and stable broad gate                                                                                                      | Active   |
| `SR-04G/W13`    | creature-type-protection profile admission        | Codex orchestrator; Sol fallback after initial Luna max lane stalled twice | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-type-protection-battle`; `work/sr04g-creature-type-protection-battle`         | `eb96dcc7f` | W13/S and W13 Battle are complete at final integrated pre-receipt `c68efa280` after composite review converged at Standards/Spec 0/0. Reviewed Battle tip `752164080` is integrated by `d65e4f804`; integration mapping `35990c92a` joined the canonical policy runtime owner and regenerated the byte-changing `matrix.json` while `REPORT.md` stayed byte-stable. No duplicate compatibility fields or first-match queries; no Surface/publication/certificate, QNT/MBT semantic change or execution, registry, other coverage, lifecycle, glyph, execution-type/projector, or other Battle lease.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Complete |
| `SR-04G/W14`    | controlled-vertical-suspension profile admission  | Luna max stalled; Sol fallback implementer; Codex orchestrator             | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-controlled-vertical-suspension`; `work/sr04g-controlled-vertical-suspension`           | `11e38a0d4` | Reviewed tip `828c657f7` is integrated by `c4503ea9b`; pre-receipt `f2f1715c8` passed final composite review at Standards 0 and Spec/RAW/QNT 0. Source reviews progressed 2/1 (Spec withdrawn by exact-base comparison), 1/0, then 0/0. Exact lease stayed limited to `spell-procedure-profiles/levitated-creature.ts`, focused `unit-profile-admission-levitate.test.ts`, and only `ControlledVerticalSuspensionSpellInvocation.spell` in `battle-state-execution.ts`. Joined static admission passed 5/5 with 11 skipped; exact-base lifecycle failures remained 11/11 and unverified. Changed-root diagnostics were 0 relevant/19 unrelated transitive; scoped lint/format/diff passed. Hook inventory was incidental only. No broad, lifecycle, Surface/publication, registry-wide, rules-kernel, QNT semantic/proof, or MBT claim.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Complete |
| `SR-04G/W15`    | composite-target-buff profile admission           | Luna no-edit stall; Sol fallback implementer; Codex orchestrator           | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-composite-target-buff`; `work/sr04g-composite-target-buff`                             | `6497b6e8c` | Reviewed tip `9a07c298d` is integrated by `e28e1ba31`; pre-receipt `3167b2190` received final composite review at Standards 0/Spec 1 for stale inventory wording, repaired by `059244dd1`, then converged at 0/0. Source reviews progressed 3/1 for the same-ordinal overlap, 1/0, 0/1 for test evidence, then 0/0. Joined static admission passed 9/9 with 13 skipped; exact-base comparison retained the same 13 inherited runtime/lifecycle failures and does not verify lifecycle behavior. Changed-root diagnostics were 0 relevant/19 unrelated transitive; authored identity retained its nonzero baseline without a W15 hit; scoped lint/format/diff passed. Hook inventory was incidental only. Exact lease stayed limited to `spell-procedure-profiles/composite-target-buff.ts`, focused `unit-profile-admission-haste-positive.test.ts`, and only `CompositeTargetBuffWithAftermathSpellInvocation.spell` in `battle-state-execution.ts`. No Surface/publication/certificate, shared algebra, lifecycle/stored-glyph owner, selected-identity/MBT fixture, registry, rules-kernel, QNT/MBT, broad, or other Battle claim.                                                                                                                                                                                                                                                                                | Complete |
| `SR-04G/W16`    | paired creature-size-change profile admission     | Luna no-edit stall; Sol fallback implementer; Codex orchestrator           | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-size-change`; `work/sr04g-creature-size-change`                               | `7ffea39f0` | Reviewed tip `bd7741b74` is integrated by `d12fac392`; pre-receipt `fb0b912cd` received composite review at Standards 1 Low/Spec 0 for the stale observation date, repaired by `b08fc98f1`, then converged at 0/0. Source reviews progressed 2/2 for overlapping selection and exact duration, 1/1 for the shared broken-direction fallback, then 0/0. Joined W14-W16 static admission passed 21/21 with 44 skipped. W16 exact-base comparison retained the same 20 inherited transition failures while the tip added seven static passes; lifecycle remains unverified. Changed-root diagnostics were 0 relevant/17 unrelated transitive; scoped lint/format/diff passed. Exact lease stayed limited to `spell-procedure-profiles/creature-size-change.ts`, focused `unit-profile-admission-enlarge-reduce.test.ts`, and only `CreatureSizeChangeSpellInvocation.spell` in `battle-state-execution.ts`. No Surface/publication/certificate, shared algebra, active-effect/lifecycle/metamagic helper, stored-glyph owner, selected-identity/MBT fixture, registry, rules-kernel, QNT/MBT, broad, authored-id, or other Battle claim.                                                                                                                                                                                                                                                                                | Complete |
| `SR-04G/W17`    | self-transformation-mode profile admission        | Luna no-edit stall; Sol fallback implementer; Codex orchestrator           | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-self-transformation-mode`; `work/sr04g-self-transformation-mode`                       | `31549421f` | Reviewed tip `3a6daaf2d` is integrated by `fc702268d`; pre-receipt `3d13422cf` received composite Standards 1 Low/Spec 1 Low for the same lifecycle-evidence overclaim, repaired by `7d900cc5c`, then converged at 0/0. Source reviews progressed 3/1, 1/2, then 0/0 after repairs to canonical facts, admission confidence and selection, issue accumulation, false ownership, and exact duration propagation. Joined W14-W17 static admission passed 28/28 with 51 skipped. Exact-base comparison retained the same seven transition-blocked lifecycle failures while the tip added seven static passes; lifecycle remains unverified. The single locked integrated package typecheck had 0 W17 changed-root/15 unrelated transitive diagnostics and remains red; scoped lint/format/diff passed. Exact lease stayed limited to `spell-procedure-profiles/self-transformation-mode.ts`, focused `unit-profile-admission-alter-self.test.ts`, and only `SelfTransformationModeSpellInvocation.spell` in `battle-state-execution.ts`. No broad quality/test, Surface/publication/certificate, shared algebra, active-effect/replacement, movement-speed, attack, stored-glyph owner, selected-identity/MBT fixture, registry, rules-kernel, QNT/MBT, authored-id, W18, or other Battle claim.                                                                                                                        | Complete |
| `SR-04G/W18`    | spell-created-held-object profile admission       | Luna zero-edit stall; Sol fallback implementer; Codex orchestrator         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-spell-created-held-object`; `work/sr04g-spell-created-held-object`                     | `d3d9bb830` | Reviewed tip `8a2c46763` is integrated through final follow-up merge `385a7fba0`. Activation `ed2b03aad` and lease amendment `a0cc74bcf` bounded the five-file source/test lease. Source reviews progressed Standards/Spec 1 High/0, 1 Low/0, then 0/0; post-merge repair reviews R4-R6 each returned 0/0. W18 and C2 passed 140/140; the exact-base Flame Blade file was 16/16 red. Final package typecheck has 0 W18 changed-root and 12 unrelated transitive diagnostics, so the package remains red. Inventory is zero legacy top-level declarations. The joined six-file result is 176 passed/43 failed only on pre-existing roll-modifier, creature-size, and scalar-buff ownership collisions; neither W18 profile contributes an issue. Pre-receipt `b307942aa` received composite Standards 1 Low/Spec 1 Low for two ledger facts, repaired by `d24fb0722`, and R2 converged at 0/0. Existing RAW/QNT/runtime semantics remain unchanged. W18 is Complete; SR-04G additionally requires a not-yet-leased collision-convergence slice and its deferred gates. No Surface/publication/certificate, shared algebra, lifecycle/helper/resolver semantics, selected-identity fixture, registry implementation, rules-kernel, QNT/MBT execution/change, broad gate, authored-id gate, or other-file claim.                                                                                                        | Complete |
| `SR-04G/W19`    | roll-modifier activation ownership convergence    | Luna no-edit stall; Sol fallback implementer; Codex orchestrator           | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-roll-modifier-ownership`; `work/sr04g-roll-modifier-ownership`                         | `eaa85e409` | Reviewed source tip `641354a2a` and reviewed fixture repair `7bdbe61f5` are integrated by non-fast-forward merges `355e65505` and `bbfb48e0c`. Source reviews progressed Standards/Spec 1/0, 0/0, then post-typecheck R3 0/0. Exact lease stayed limited to `spell-procedure-profiles/roll-modifier.ts` and focused `c2-support-profile-admission.test.ts`. C2 passed 120/120, focused Bane runtime passed 1/1, and joined evidence moved from 176/43 to 195/24, restoring all 19 Enlarge/Reduce cases. The first typecheck had one W19-local fixture diagnostic; final typecheck has zero W19-local and 12 unrelated transitive diagnostics, so the package remains red. Pre-receipt `56215fd56` received composite Standards 1 Low/Spec 1 Low for the resume checkpoint, repaired by `97d258f15`, then R2 converged at 0/0. W19 is Complete. At that receipt, the 11 Levitate creature-size and 13 Haste scalar-buff collision failures remained separately owned and unleased; W20 and W21 later completed them. Existing Surface/runtime/QNT semantics remain unchanged. No other profile/test, Surface/publication, registry, rules-kernel, QNT/MBT, authored-id, broad gate, or other file claim.                                                                                                                                                                                                              | Complete |
| `SR-04G/W20`    | paired creature-size ownership convergence        | Luna partial-red stall; Sol continuation; Codex orchestrator               | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-size-ownership`; `work/sr04g-creature-size-ownership`                         | `25390d674` | Reviewed tip `acbb541e8` is integrated by non-fast-forward merge `eaff7cb55`. Source reviews progressed Standards/Spec 1/0 then 0/0 after centralizing duplicated phase-semantic selection. Exact lease stayed limited to `spell-procedure-profiles/creature-size-change.ts` and focused `unit-profile-admission-enlarge-reduce.test.ts`; no identity dispatch was added. Full Enlarge/Reduce and Levitate passed 43/43, and the joined six-file disposition moved from 195/24 to 206/13, restoring all 11 Levitate cases. The locked package typecheck had zero W20-local and 12 unrelated transitive diagnostics, so the package remains red. Scoped checks passed. Pre-receipt `eeee6507b` and checkpoint candidate `fdf66f9e0` passed first-pass composite review at Standards 0/Spec 0. W20 is Complete. Existing Surface/runtime/QNT semantics remain unchanged. No other profile/test, Surface/publication, registry, rules-kernel, QNT/MBT, authored-id, broad gate, or other file is claimed. At that receipt, the remaining 13-case Haste/scalar-buff convergence slice was unleased; W21 later completed it.                                                                                                                                                                                                                                                                                              | Complete |
| `SR-04G/W21`    | scalar-buff ownership convergence                 | Codex orchestrator                                                         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-scalar-buff-ownership`; `work/sr04g-scalar-buff-ownership`                             | `d12f379c8` | Reviewed source tip `c21d5aa02` is integrated by non-fast-forward merge `9d0143b28`; first-pass source review returned Standards 0/Spec 0. Exact lease stayed limited to `spell-procedure-profiles/scalar-buff.ts`, `unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`, and one C2 ownership expectation. Focused ownership passed 16/16. The six-file result moved from 206/13 to 218/1, eliminating every scalarBuff/Haste collision; the one failure is external Sleep/saveGatedAreaControl debt. Full scalar/Heroism passed 51/61; its ten external failures are Barkskin/weaponAttackDamageEnhancement 2, Spider Climb/directCondition 3, and Heroism/rollModifier 5. Typecheck retained 12 inherited diagnostics and added zero W21 diagnostics; package remains red. Scoped checks passed. Pre-receipt `da6214cbf` and checkpoint candidate `fa20a93d5` passed first-pass composite review at Standards 0/Spec 0. W21 is Complete; SR-04G remained Active, and at that receipt the next ownership slice was unleased; W22 later completed it. No unrelated ownership, Surface/publication, registry, rules-kernel, QNT/MBT, authored-id, broad, or deferred gate is claimed.                                                                                                                                                                                                                     | Complete |
| `SR-04G/W22`    | save-gated area-control ownership convergence     | Codex orchestrator                                                         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-save-gated-area-ownership`; `work/sr04g-save-gated-area-ownership`                     | `2d54bd3ef` | Reviewed source tip `87f74df2e` is integrated by non-fast-forward merge `fedecdd29`; source review converged in R3 at Standards 0/Spec 0. Exact lease stayed limited to `spell-procedure-profiles/area-control-condition.ts` and `unit-profile-admission-hypnotic-pattern.test.ts`, using semantic phase/role/envelope ownership without authored identity. Focused ownership passed 18 with 11 skipped; the exact six-file main set passed 219/219, which is not SR-04G acceptance. Full Hypnotic Pattern passed 28/29 and remains red solely because external Protection from Evil and Good cannot select its `creatureTypeProtection` procedure. Locked package typecheck retained 12 inherited diagnostics and added zero W22 changed-root diagnostics, so the package remains red. Pre-receipt `27c683178` records the integrated evidence; first composite checkpoint/receipt `2a37a3c58` promoted W22 Complete; repair candidate `83342da3f` retired the stale W21 handoff; follow-up receipt `43af70bf1` repaired the W19 and receipt-chain findings; W20 repair receipt `6bd5012bd` and final table-scoping receipt `a6f68731f` complete the W22 chain. SR-04G remains Active. No Sleep implementation/test, other profile/test, Surface/publication, registry, rules-kernel, QNT/MBT, authored-id, broad, or deferred gate is claimed.                                                                     | Complete |
| `SR-04G/W23`    | weapon-attack enhancement ownership convergence   | Codex orchestrator                                                         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-weapon-attack-enhancement-ownership`; `work/sr04g-weapon-attack-enhancement-ownership` | `a6f68731f` | Reviewed source tip `23d3e3100` is integrated by non-fast-forward merge `582fe0353`; compiler-boundary repair `579290a52` received R3 Standards 0/Spec 0 and is integrated by follow-up merge `500f2990a`; final test-boundary repair `10408d210` received R4 0/0 and is integrated by merge `6218b7054`. Exact lease stayed limited to `spell-procedure-profiles/weapon-attack-enhancement.ts` and `a4-admission.test.ts`; scalar/Heroism was verification-only. The exact integration focused filter reported 5 passed/53 skipped; the separate broader source selection reported 13/45. Final full A4 passed 58/58. Scalar/Heroism remained controlled-red 53/61, with only Spider Climb 3 and Heroism 5 external failures. The exact six-file set remained 219/219; the final delta was test-only and the production profile blob was identical to R3. Typecheck chronology was 4 W23-local initially, then 2 production locals repaired while 2 test locals remained, then all W23-local diagnostics repaired; final typecheck had only the exact 12 inherited diagnostics. Intermediate evidence checkpoint `2f2396fe4`, final pre-receipt `9dc2f3bc6`, and resume receipt `9fa6a3ffd` preceded composite R1 Standards 0/Spec 0. W23 is Complete. No Surface/runtime/QNT/registry/other profile/test/broad/deferred gate is claimed.                                                                           | Complete |
| `SR-04G/W24`    | direct-condition ownership convergence            | Codex implementer; Codex orchestrator                                      | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-direct-condition-ownership`; `work/sr04g-direct-condition-ownership`                   | `800a4dfcf` | Reviewed source tip `bbdc1aa34` is integrated by non-fast-forward merge `e570cdbcf`; reviews progressed from R1 Standards High + Medium/Spec Medium through repairs `a91e70d78` and `bbdc1aa34` to R3 Standards 0/Spec 0. Test-only repair `79f79ae80` received R4 0/0 and is integrated by follow-up merge `eba655182`; the production profile blob is unchanged from R3. Exact lease stayed limited to `spell-procedure-profiles/direct-condition.ts` and `a2-admission.test.ts`; scalar-buff/Heroism was verification-only. Final full A2 passed 90/90. Scalar-buff/Heroism remained controlled-red 56/61 solely on five Heroism/rollModifier failures; all three Spider Climb/directCondition cases cleared. The exact six-file main set remained 219/219; neither suite was rerun after the test-only R4 delta. Scoped checks passed. Typecheck chronology moved from inherited 12 plus three W24-local A2 fixture diagnostics to the exact inherited 12 with zero W24-local. Candidate `c79ada42c` received composite R1 Standards/Spec one shared Low stale-handoff finding; repair `e28f5ab72` received composite R2 Standards 0/Spec 0. W24 is Complete and its lease is retired. No broad, QNT, MBT, other production/test, Surface/runtime, registry, or deferred-gate result is claimed.                                                                                                                 | Complete |
| `SR-04G/W25`    | roll-modifier ownership convergence               | Codex implementer; Codex orchestrator                                      | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-heroism-roll-modifier-ownership`; `work/sr04g-heroism-roll-modifier-ownership`         | `95bbd1e19` | Reviewed source tip `0d872737f` is integrated by non-fast-forward merge `6ccbf499e`; reviews converged at R3 Standards 0/Spec 0. Compiler repair `e3a0d1def` received R4 Spec 0 and Standards 1 Low for duplicated duration inspection; repair `061f46e36` received R5 Standards 0, and both are integrated by `7d836465e`. Final fixture repair `fa36b22a5` received R6 Standards 0 and is integrated by `ff42ad4ff`. Exact lease stayed limited to `spell-procedure-profiles/roll-modifier.ts` and `c2-support-profile-admission.test.ts`; scalar-buff/Heroism was verification-only. C2 passed 135/135, scalar-buff/Heroism passed 61/61, and the exact six paths passed 234/234 because C2 added 15 W25 declarations. Typecheck chronology was 17 total (12 inherited + 5 W25-local), 13 total (12 + 1), then 12 inherited + 0 W25-local; interrupted unwrapped source `tsc` was not evidence. Separate damageReduction/deleted-Guidance registry debt remains pending and unclaimed. Pre-receipt `59dfa952f` and accepted chronology-repair candidate `461b2300b` received composite R2 Standards 0/Spec 0; final receipt `798bc0262` received receipt-only Standards 0/Spec 0. W25 is Complete and its lease is retired. No Heroism owner implementation/test, Surface/runtime, QNT/MBT, registry, broad, deferred-gate, or other-file result is claimed.                                                      | Complete |
| `SR-04G/W26`    | persistent-armor Unit-profile marker audit/repair | Luna implementer; Sol reviews/integrator                                   | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-persistent-armor-profile-coverage`; `work/sr04g-persistent-armor-profile-coverage`     | `798bc0262` | Source tip `aaeebb619` registers `spell.invocation-persistent-armor-effect`, reclassifies `mage_armor` while retaining readied-action-time ownership, and joins reusable QCORE10/QMBT5 with Unit-specific QMBT14/L1H evidence. Authored lease is five registries. Marker lease is the five evidence owners plus four necessary QNT owners: armor class, armor spell resolution, defensive-effect core, and invocation-resource core. Rules writer/check passed 162 obligations after the 10.48-second missing-witness failure and Sol correction. The first Unit writer timed out at 120 seconds under external overlap and is excluded; a clear retry exposed the missing reciprocal QMBT5 claim, and final writer/check passed 438 Units/273 profiles after correction. Exact generated lease is the 28 Unit-profile plus two rules-kernel outputs enumerated in Resume Here. Source classification is 9 markers + 5 authored registries + 30 generated = 44 paths; fixed-point diff is 45 only with prior ledger repairs. Standards R1 found one High lease omission and one Low enumeration omission; this ledger-only repair is the pending R2 candidate. W26 remains Active. `persistent-armor-effect.ts` is verification-only/already marked; Armor of Shadows remains alternate no-slot access. No runtime semantics, other production, RAW, Surface, registry, QNT semantics, MBT execution, or broad gate. | Active   |

## Landing discipline

- Create one short-lived integration branch/worktree for the active landing
  unit from the latest ledger-accepted green `master`. Use a name such as
  `integration/cleanroom-sr-04a`.
- Branch implementation worktrees from that exact landing-unit base, never from
  another implementation worktree.
- Use at most three implementation worktrees plus the landing unit's one
  integration/review worktree.
- Give every lane one ticket or one independently useful slice and a declared
  package/file write lease.
- Merge a coherent lane result into the integration branch as soon as its
  focused review converges. The integration branch must merge into `master`
  before its landing unit crosses a second calendar day. If it cannot, stop and
  redefine smaller production-consumed landing units from current `master`.
- Before composite review, merge the latest `master` into the integration
  branch and re-run affected focused checks. Do not perform the final gate on a
  stale base.
- Run focused typecheck/tests and applicable focused QNT/MBT gates under the
  repository lock protocol. Only one worktree runs broad or MBT-heavy gates at
  a time.
- Complete RAW traceability where rules change, ubiquitous-language/domain,
  architecture/connascence, and standards/specification reviewer loops. Fix
  reasonable findings and repeat until converged.
- Merge the landing unit into `master` immediately after the composite receipt
  is green. Later landing units start from that new `master`; still-active lanes
  for the same unit synchronize through its integration branch before making
  completion claims.
- Reserve `pnpm quality:milestone` for `SR-02`, `SR-05`, `SR-14`, `SR-17`, and
  `SR-19`, plus any earlier checkpoint whose cross-package risk justifies it.

## Serialized write hotspots

Only the landing/review worktree may regenerate shared artifacts after the
canonical owner lands. Never grant these files to concurrent lanes without a
current-base write-set audit proving disjoint ownership:

- Surface schema and publication files;
- package entrypoints and barrel exports;
- root/package manifests and `pnpm-lock.yaml`;
- rules-kernel/QNT inventories and generated reports;
- Character-to-Battle handoff composition;
- global quality and complexity baselines.

`SR-03` receives the first post-convergence shared-Surface lease. `SR-09` may
develop in parallel only if its write set is proven disjoint; otherwise it
starts from the accepted `SR-03` SHA. Publication regeneration and `SR-09`–
`SR-11` finalization alternate through the landing coordinator.

## Integration and review loop

Every master-merge landing unit follows the same loop:

```text
accepted master SHA
  -> landing-unit integration worktree
       -> implementation worktrees with disjoint leases
       -> focused tests and lane review
       -> merge completed lanes into integration
       -> synchronize latest master
       -> regenerate shared projections once
       -> composite RAW/domain/architecture/standards reviews
       -> focused join gates and named milestone gate
  -> merge landing unit into master
  -> ticket evidence
  -> ledger-only receipt commit on master
  -> delete landing-unit branches/worktrees
```

The integration branch is coordination state, not an alternate product line.
No subsequent checkpoint branches from it before it lands on `master`. If a
coordination checkpoint contains more than one same-day master merge, allocate
lettered landing units and a fresh integration branch for each one.

## Checkpoint execution notes

### `SR-00`–`SR-02`: convergence

- `SR-00` is exclusively owned by the user's #368–#386 session. Do not copy or
  duplicate its work.
- `SR-01` starts from the exact #386 landing. Treat #479/PR #480 as evidence and
  selectively reusable commits. Resolve its quality failure rather than
  bypassing it.
- If #479 cannot become green in one session, split reconstruction into
  independently coherent landings; do not create another long-lived aggregate
  integration line.
- `SR-02` regenerates Surface publication/reports, reruns Static Mechanics
  Admission diagnostics, audits rules-kernel/QNT inventory and #407/#408, then
  runs the stable quality/reviewer gate on one exact SHA.
- At `SR-02`, audit #102/#103/#105/#56/#119 against landed #386 behavior. Close
  satisfied tickets with exact evidence instead of duplicating them.

### `SR-03`–`SR-05`: Static Mechanics Admission

- `SR-03` owns the canonical Surface schema/reference change in #476. If needed,
  slice it into: typed schema plus one production consumer; authored corpus and
  regenerated publication; remaining consumers and old-path deletion.
- After `SR-03`, `SR-04` runs three serial-per-package trains in parallel:
  - Creation: #464, then #469;
  - Character Sheet: #477, then #470, then #473;
  - Battle: #471, then #474.
- #464 may land as: projection plus a production discovery consumer;
  finalization/selection consumers; repeated-recognition deletion and exact
  admission closure.
- `SR-05` serializes #478, #472, and #475 through the Character-to-Battle
  handoff owner unless a current-base audit proves disjoint files. Then
  reconcile #465/#466/#467, land #468, regenerate the exact denominator, and
  close #52.

### `SR-06`–`SR-08`: binding and Slice

These are serial because each changes the next contract. Each ticket lands
separately.

Before #117, confirm that closed #53's required implementation is present on the
accepted common base; a closed tracker state alone is not implementation
evidence.

- #117: binding result plus one consumer; remaining selection consumers;
  identity-based rebinding deletion.
- #118: unsupported-versus-currently-unavailable result and discovery;
  production route consumers; superseded discovery deletion.
- #29: generator over admitted bindings; deterministic dependency closure and
  artifact; public gate and handwritten-inventory deletion.

Historical #117 work is selective-reuse evidence only. Do not cherry-pick its
aggregate blindly.

### `SR-09`–`SR-11`: publication integrity

#98 is already closed. Land #99, then #409, then #410 separately with black-box
receipts. After #410, close parent #45 only if its full remaining outcome is
true. This train may advance beside admission/QNT work subject to the shared
Surface lease.

### `SR-12`–`SR-14`: executable QNT conformance

- `SR-12`: land #389 first; then #390/#391/#392 in parallel; then #393. Resolve
  #382's closed-while-blocked-by-#381 metadata using `SR-00` evidence.
- `SR-13` suggested waves:
  - #394/#395/#396;
  - #397/#398/#399;
  - #401/#402/#405;
  - #400 after #396/#401, #403 after #402, #404 after audited #407/#408;
  - #406 after #394/#395/#400/#403/#404/#405 and #119.
- Before #401/#406, implement only interruption work still missing after the
  `SR-02` audit: #102 first; #103 and #56 in parallel; #105 independently; #119
  after #56.
- QNT work may land before #29, but a vertical that derives its completion set
  from the Slice remains open until `SR-08` recalibration.
- Split large verticals only at executable seams: semantic core consumed by one
  real path; driver/bridge; production route and decisive observation. Do not
  retain model-only branches or let lanes edit shared QNT inventories.
- `SR-14`: regenerate every eligible set from #29, land only necessary
  recalibrations, run #211's dynamic terminal proof lane, close #31, and run the
  stable quality/reviewer gate.

### `SR-15`–`SR-17`: delivery artifacts

- In `SR-15`, #34 and residual #40 run in parallel and land separately. #40
  preserves the existing Oracle and changes only Slice input, QNT calibration,
  and source-free distribution evidence.
- #34 may split into: schema/index with one consumed corpus entry; deterministic
  builder and complete corpus; portable validation and obsolete-path deletion.
- `SR-16` lands the minimal Rust Adapter and its one native property-test
  example.
- `SR-17` lands deterministic Harness assembly, declared-input validation, and
  clean-directory discovery. If split, every landing must have its own usable
  black-box consumer.

### `SR-18`–`SR-19`: diagnostic repair and exact readiness

- `SR-18` runs Dirty-Cleanroom Rehearsal against the exact Harness Candidate
  SHA. Each defect becomes one bounded owner repair that lands directly into
  `master`; never accumulate repairs on a rehearsal branch. Rehearsal evidence
  remains diagnostic.
- `SR-19` selects one immutable `master` SHA and runs #38's complete source gate
  and two-round reviewer loop. Every fix lands normally and restarts the full
  gate on the new SHA. Close #38 only against the final coherent state.
- Stop before #39.

## Parallel shape

```text
SR-00 -> SR-01 -> SR-02
                    |
           +--------+--------+
           |                 |
           v                 v
        SR-03              SR-12 -> SR-13 implementation
           |                             |
       +---+---+                         |
       |       |                         |
       v       v                         |
    SR-04    SR-09                       |
       |       |                         |
    SR-05    SR-10                       |
       |       |                         |
    SR-06    SR-11                       |
       |                                 |
    SR-07                               |
       |                                 |
    SR-08 -------------------------------+
       |
    SR-13 complete -> SR-14 -> SR-15 -> SR-16 -> SR-17 -> SR-18 --+
    SR-11 -------------------------------------------------------+-> SR-19
```

## Receipt format

Use this exact compact shape in the ledger row and link fuller ticket evidence:

```text
Checkpoint/unit: SR-__
Base: <master SHA>
Accepted: <landed implementation/gate SHA>
Result: <one concrete executable outcome>
Verification: <exact focused commands>; <milestone gate when applicable>
Reviews: RAW <result>; domain <result>; architecture/connascence <result>; standards/spec <result>
Tickets: <closed/kept-open with links>
Unlocked: <checkpoint ids>
```

## Deletion rule

Delete this file in the same change that closes #38 or promotes any still-useful
operational rule to its true owner. Git and issue history retain completed
receipts; do not archive this ledger as Cleanroom documentation.
