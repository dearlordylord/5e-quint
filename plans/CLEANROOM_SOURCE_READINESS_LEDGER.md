# Cleanroom Source Readiness execution ledger

> **Continuity contract:** [GitHub issue #38](https://github.com/dearlordylord/5e-quint/issues/38)
> owns the terminal Source Readiness outcome, and the recursively linked issues
> own their requirements. This file is a temporary current-state execution
> index: it owns ordering, the current frontier, worktree leases, and
> exact-revision milestone receipts. It is not a second specification or
> historical journal. Delete it when #38 closes.

## Resume here

This section is the sole mutable handoff for a new session.

- Ledger state observed: 2026-09-04
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
  integration certification-review checkpoint
  `7920c5e00637bd91142a8dafc2fa6308869a18df`
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
- Next action: continue the remaining top-level Battle profile migration. The
  current integration-tip declaration audit retains exactly seven legacy
  top-level `SpellProcedureDeclaration` `admit` fields in six files:
  `creatureSizeChange`, `creatureSizeDecrease`,
  `compositeTargetBuffWithAftermath`, `selfTransformationMode`,
  `controlledVerticalSuspension`, `spellCreatedHeldObject`, and
  `creatureTypeProtection`. The original W13 Battle branch remains clean and
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

| Checkpoint/unit | Ticket/slice                                    | Owner                                                                      | Worktree/branch                                                                                                                            | Base SHA    | Write lease                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | State  |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `SR-04G`        | #474 Battle spell mechanics procedure admission | Codex orchestrator                                                         | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr-04g`; `integration/cleanroom-sr-04g`                                              | `dd1350f81` | Integration checkpoint `e4dc4ffa3`; C2, B3, A4, B4, A5, `persistentArmorEffect`, linked defense, movable light, object light, repeated damage allocation, persistent area obscurement, magical darkness, movement-distance area damage, compelled next-turn behavior, directional persistent area, magic suppression emanation, condition-immunity turn-start Temporary Hit Points, and ongoing spell end integrated; cumulative Surface publication delta certified; seven top-level profile migrations remain                                                                                                  | Active |
| `SR-04G/W13`    | creature-type-protection profile admission      | Codex orchestrator; Sol fallback after initial Luna max lane stalled twice | `/workspace/typescript/.codex-worktrees/dnd-cleanroom-sr04g-creature-type-protection-battle`; `work/sr04g-creature-type-protection-battle` | `eb96dcc7f` | Existing lease plus new `active-effect/creature-type-protection.ts` canonical cross-capability policy-query owner and `active-effect/creature-type-protection.test.ts` focused synthetic matrix; `protection-charm-routes.ts` consumer; compile-time fixture/assertion migration only in the selected-identity MBT file and Hypnotic Pattern test. No duplicate compatibility fields or first-match queries; MBT file lease is not execution authorization. No Surface/publication/certificate, QNT, MBT execution, registry, coverage, lifecycle, other glyph, execution-type/projector, or other Battle lease. | Active |

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
