# Creation → Battle Admission Reachability Plan

Ticket: #528. Status: Step 1 (census) implemented; Step 2 (join) not started.
Persisted from the 2026-09-14 investigation into how automated unit admission
is. Reviewed against the code (sound-with-fixes); review findings are folded in
below.

## Progress log

- **2026-09-14 — Step 1 census landed** (commit `39b69376e`,
  `packages/battle-runtime/src/unit-support-admission-census.test.ts`).
  Census result: exactly 4 detected-but-unparseable units, all honestly
  claimed `unsupported-profile`, all battle-relevant-but-unmodeled (no `noop`
  candidates): `species_gnome_gnomish_cunning`, `mastery_graze`,
  `mastery_nick`, `mastery_vex`. No claim-truth mismatches; the ledger was
  accurate but had no executable teeth. These four are the modeling backlog —
  separate follow-up tickets, not this one.
  - Design decision: `ranger_hunters_prey` fails the raw seam with a
    missing-selection error, which is Step 2 scope, not census scope. The
    census helper detects the retained-selection message and re-admits with a
    canonical selection (generic — no per-id branch), keeping the allowlist
    exactly the detected-but-unparseable set.
  - Package suite green (4244 tests), typecheck clean.

## Problem

Character creation and battle initialization each have admission machinery, but
nothing joins them. Concrete witness: creation admits Gnome
(`SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS`,
`packages/character-creation-runtime/src/phase1-manifest.ts:108`), while battle
admission rejects its `species_gnome_gnomish_cunning` trait
(`packages/battle-runtime/src/unit-feature-support.ts:1445-1452`): the detector
`hasPassiveSavingThrowRollModeMechanics` (:3628) matches, but
`passiveSavingThrowRollModeProfileForUnit` (:4756) admits species traits only
with `saveAbilityFilter: []` plus a Poisoned/Frightened condition filter
(:4811-4830), not Gnomish Cunning's `saveAbilityFilter: ["int","wis","cha"]`.
Gate matched + parser null → whole-build rejection at battle init.

Structural holes found:

1. The coverage ledger (`plans/unit-profile-coverage/`) is hand-written claims;
   its checker (`scripts/unit-profile-coverage-validation.cjs`) validates claim
   format, catalog completeness, and marker↔evidence joins, but never executes
   code. Behavioral truth is unverified. (The checker is still valuable — git
   history shows it catches ledger drift constantly — it is a bookkeeping gate,
   not an admission gate.)
2. The catalog-wide sweep already exists but is scoped away from admission:
   `packages/battle-runtime/src/character-execution-profile-projection.test.ts`
   skips admission failures (`if (Result.isFailure(profiles)) continue;` at
   :192, :257) because its contract is projection of _admitted_ profiles.
3. No test enumerates what creation can emit and runs it through battle
   admission. Battle-side character test support hardcodes `species_orc`
   (`packages/character-battle-runtime/src/sdk-integration.test-support.ts:339`).

Key admission semantics: a unit matching no detector is silently ignored
(admission succeeds). Failure requires gate-match + parser-null. The
detected-but-unparseable set is currently unknown; Gnomish Cunning is the only
known member among the 22 species traits.

## Main cart

Two extensions of existing gates. Deliberately no new gate, no new package
dependency, no hotfix of the Gnomish Cunning parser (the census may spawn that
as a follow-up task; this plan does not do it).

### Step 1 — Admission census (Tier 1)

Extend the asserted-known-failures idiom that
`character-execution-profile-projection.test.ts` already uses for projection
(`SHARED_EMPTY_CONTEXT_PROJECTION_FAILURES`, :98-131, asserted via
`expect(...).toEqual(...)` at :240, :276) one level up, at the admission seam.

- New sibling test file in `packages/battle-runtime/src/` (same vitest lane,
  same gate — e.g. `unit-support-admission-census.test.ts`), iterating
  `catalog.listUnits()` through the seam that production admission actually
  invokes: `battleUnitRefWithSupportProfiles({ unitRef, unit, classLevels,
sourceFacts })` (`unit-feature-support.ts:1869`), not the narrower
  `battleUnitSupportProfilesForUnit` — the per-unit-ref seam additionally owns
  the Hunter's Prey retained-selection check (:1903-1915). Consider also
  exercising `admitResourceFeature` (the other leg of
  `characterBattleSupportAdmission`, `battle-support-profiles.ts:298`) so the
  census is a true admission census, not only a support-profile census.
- Collect every `Result.isFailure` into records and assert equality with an
  explicit `KNOWN_ADMISSION_FAILURES` allowlist (`as const`).
- Allowlist entries carry **structured** citation fields (`unitId`, `claimTag`
  matching the unit's row in `plans/unit-profile-coverage/unit-claims.jsonl`),
  not comments — the parked checker join (Tier 3) will consume them.
- Scope statement (write it in the test name/docs): the census enumerates
  "detected-but-unparseable under a maximally provided context" — fixed
  `sourceFacts = { draconicAncestryDamageType: "acid" }` covers the whole
  sourceFacts shape (single field, `unit-feature-support.ts:224-226`), and
  level-20-all-classes is the most permissive classLevels context. Failures
  that manifest only with _absent_ sourceFacts or _missing selections_ are
  Step 2's job, not the census's.
- Fail-fast caveat: per-unit aggregation returns on the first unsupported hook,
  so the census names only the first unparseable hook per unit; a unit with
  two needs a second census run after the first is fixed or registered.
- First run produces the census. Triage branch per discovered failure:
  - Battle-relevant but unmodeled (Gnomish Cunning class) → follow-up modeling
    task; until modeled it stays in the allowlist with its claim reference.
  - Genuinely outside battle scope → belongs to sidecart A's `noop`
    disposition once that exists; for now, register with claim reference.
- **Decided: no new `battleReadinessClosure` kind in `unit-claims.jsonl`.**
  The blocking-vs-inert fact is already canonical in the asserted census
  allowlist; a hand-written closure kind would be a second, driftable copy of
  the same fact (the exact pattern that let the gnome claim go stale). When
  Tier 3 lands, the checker derives blocking-vs-inert from the census artifact.
- Closed-world property: any _new_ detected-but-unparseable unit breaks the
  test until fixed or registered. This is what would have caught Gnomish
  Cunning at trait-authoring time.

### Step 2 — Reachability join (Tier 2)

A new test file in `packages/character-battle-runtime/src/` — the package that
already owns the production join (`battle-support-profiles.ts:114`,
`battle-creature-init.ts:267`) and already depends on both creation-runtime and
battle-runtime (`packages/character-battle-runtime/package.json:20-21`), so no
layering change. This is sidecart B realized as a gate: the invariant "creation
only promises what battle admits" is enforced by test, not by coupling
creation-runtime to battle-runtime at runtime.

- Enumerate the species axis from `SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS`
  itself (not a parallel list), so manifest additions auto-extend coverage.
  **Required boundary change:** the constant is exported from
  `phase1-manifest.ts:108` but not re-exported through the package index
  (`packages/character-creation-runtime/src/index.ts:370-415`); add it there.
- Per species, build a minimal finalized Fighter 1 through the real creation
  path, then assert `characterBattleSupportAdmission(build, unitLibrary)`
  succeeds. Species traits are emitted unconditionally by finalization
  (`characterBuildDerivedFeatureUnitIds` → `speciesTraitUnitIds`,
  `finalization.ts:4007-4017`), so one minimal build per species exercises all
  species traits.
- Hoist one canonical fill-helper set. The ~8-pass fill/finalize loop and its
  satellite helpers are currently copy-pasted and divergent:
  `completeSupportedProgressionDraft` in six vitest-lane files
  (`character-creation-runtime/src/index.test.ts:11779`,
  `level10-character-support.test.ts:278`, `bard-expertise.test.ts:216`,
  `wizard-scholar.test.ts:851`, `rogue-expertise-level6.test.ts:108`,
  `ranger-expertise-level9.test.ts:359`) plus two inline loops in
  `character-battle-runtime/src/sdk-integration.test-support.ts:405,445`;
  satellites `initialManifestFills`, `requireAcceptedBatch`, `holeSummary`,
  `testAbilityScoreAssignment` are likewise duplicated, and
  `supportedFillForHole` has divergent signatures (positional at
  `index.test.ts:11830` vs object-shaped at `bard-expertise.test.ts:264`) and
  divergent default ability arrays. Hoist the set into character-creation-runtime
  test support with divergent defaults as explicit options, exposed via a new
  `./test-support` subpath export (precedent:
  `@dnd/battle-runtime/package.json:13`), and re-point the vitest-lane copies.
  **Do not touch the seventh copy** in
  `character-creation-runtime/src/weapon-mastery-level-gain.mbt.test.ts:722` —
  re-pointing it would obligate a locked MBT re-run
  (`docs/agents/QNT-MBT.md`); leave it in place.
- Per-species choice facts are explicit inputs, in a per-species options map:
  gnome needs the lineage preference (`GNOMISH_LINEAGE_CHOICE_KEY`,
  `phase1-manifest.ts:282`), dragonborn needs draconic ancestry feeding
  `sourceFacts`. A new species with mandatory creation choices will fail loudly
  here until its entry is added — that is the gate working.
- Assert additionally that every unit ref emitted by
  `characterBuildUnitRefs(build, unitLibrary)` (`finalization.ts:3841`) passes
  `battleUnitRefWithSupportProfiles`, threading the admission's own
  `sourceFacts` (`admission.success.sourceFacts`) and classLevels into the
  per-ref check — without sourceFacts, dragonborn refs fail (existing witness:
  `character-battle-runtime/src/index.test.ts:4854-4876`). This names the exact
  failing trait unit, not just the build.
- Known-failure handling mirrors Step 1: an asserted allowlist with structured
  claim citations. Gnome enters it on day one and leaves when its modeling task
  lands.
- Dropped after review: the manifest-species == catalog-species equality
  assertion. The SRD species set is closed; the drift direction that matters
  (manifest adds a species battle rejects) is already caught by enumerating
  from the manifest, and the other direction is covered by the Step 1 census.

## Sidecart A — typed admission disposition (parked, agreed direction)

Battle admission currently has two outcomes for undetected/unparseable
mechanics: silently ignored, or whole-build rejection. Agreed direction: make
the disposition explicit and typed per unit:

- `supported` — modeled, contributes profiles.
- `noop` — admitted without effect; battle does not model this mechanic and
  the character must not be refused for it (social/knowledge/exploration
  mechanics). Naming: `noop`, not `noopOutsideBattleScope` — the no-op happens
  _inside_ battle.
- `unsupportedBattleRelevant` — battle-relevant but unmodeled; keep the loud
  rejection (Gnomish Cunning today: INT/WIS/CHA save advantage matters in
  combat, and silently dropping it would be a rules bug worse than refusing
  the character).

This also fixes today's conflation where "no detector matched" means both
"out of scope" and "nobody wrote a detector" (e.g. darkvision is silently
ignored). When picked up: the disposition flows into the claims ledger so the
checker can distinguish a benign deferral from a build-poisoning one. Not part
of the main cart; do not block Steps 1-2 on it.

## Parked (explicitly out of scope for now)

- Tier 3: coverage checker consumes a machine-readable admission artifact
  (precedent: `character-creation-owner-evidence.json`) and joins claim truth,
  deriving blocking-vs-inert from the census rather than from a declared
  closure kind.
- Tier 4: end-to-end smoke matrix through `battleCreatureInitFromCharacterBuild`
  per species/lineage, a small targeted set rather than an exhaustive gate.
- The Gnomish Cunning parser extension itself (a Step 1 census follow-up).
- Any MBT/Quint lane work — orthogonal; these gates live in the vitest lane.

## Verification and process

- Focused runs during implementation:
  `pnpm --filter @dnd/battle-runtime test` and the character-battle-runtime
  equivalent (vitest lane; no MBT lock needed — no `*.mbt.test.ts` touched,
  including leaving the MBT fill-loop copy alone).
  Then `pnpm typecheck`; `pnpm test` and `pnpm quality:milestone` only at a
  stable integration revision, via the shared lock, per AGENTS.md.
- Conditional gate: if Step 1 triage ends up editing `unit-claims.jsonl`
  anyway (e.g. correcting a claim's reason text), the owning doc's done-state
  gate `pnpm unit-profile-coverage:check --write` applies
  (`plans/unit-profile-coverage/README.md:326-337`). No new closure kind is
  planned; if that decision is revisited, the checker vocabulary and its
  self-test must change with it.
- SRD fixtures only; no PHB+ identity in tests (project policy).
- Conventions: `Result`/discriminated unions, no exceptions for runtime
  failures (test-helper throws are fine per `.claude/review-rules.md`);
  narrowest return types; fixed vocabularies as `as const` arrays.
- Reviewer-loop convergence before landing: RAW traceability (any claim that a
  mechanic is "outside battle scope" must trace to
  `.references/srd-5.2.1/`), domain language, architecture/connascence (the
  hoisted fill helpers and the structured allowlist↔ledger citations are the
  coupling points), and code quality. Recheck only the changed delta after
  fixes.

## Done state

- Step 1 census test green over the true admission seam, with an asserted,
  claim-cited allowlist; the detected-but-unparseable set is enumerated and
  every member triaged.
- Step 2 join test green over all manifest species; a newly admitted species
  that battle rejects fails CI without any test edit (a species with new
  mandatory choices fails loudly in the per-species options map — also the
  gate working).
- No new gate scripts; both checks live in the existing package vitest lanes.
