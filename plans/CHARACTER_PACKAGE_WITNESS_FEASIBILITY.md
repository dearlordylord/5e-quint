# Character Package Witness Feasibility

Task: PDS-A23-CHARACTER-PACKAGE-WITNESS-FEASIBILITY

Date: 2026-06-11

## Decision

Keep the battle-runtime parity-driver kit and typed witness protocol
package-local. Open a separate future character-package MBT cleanup lane instead
of extracting shared test support in Lane A.

The reusable surface is narrower than the current kit. The generic pieces are
Quint state readers, primitive field decoders, trace-count defaults, and
`quint-connect` re-exports. The battle-runtime kit also owns
`BattleResolutionResult` recording, battle invalid-reason vocabulary,
`BattleHole` decoding, subject/interrupt submission, battle fixture creation,
and Surface catalog setup. Extracting the whole kit would either make character
packages depend on battle-runtime concepts or require a new test-support package
plus migrations across all 24 character drivers. That is a separate ownership
slice, not a follow-up inside the battle-runtime parity-driver lane.

## Inputs Checked

- `prd/03_MBT_PARITY_DRIVER_KIT.md` stretch note for non-battle drivers.
- `prd/04_TYPED_WITNESS_PROTOCOL.md` out-of-scope note for the 24 character
  package witnesses.
- `docs/adr/0001-forest-of-qnt-slices.md`, especially import-closure and typed
  witness-protocol guidance.
- `packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts`.
- `packages/battle-runtime/battle-runtime-witness-protocol.qnt`.
- `UBIQUITOUS_LANGUAGE.md` and
  `packages/character-creation-runtime/VOCABULARY.md`. This task models no new
  D&D rule, so no new SRD rule passage is required.
- Character package ownership docs:
  `packages/character-sheet-runtime/README.md` and
  `packages/character-battle-runtime/README.md`.

Discovery commands:

```sh
rg --files packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime | rg 'mbt\.(test\.ts|qnt)$|\.mbt\.qnt$'
for d in packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime; do find "$d" -name '*.mbt.qnt' | wc -l; done
for d in packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime; do rg -l 'qLastResult' "$d" --glob '*.mbt.qnt' | wc -l; done
for d in packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime; do rg -l 'action recordProjection' "$d" --glob '*.mbt.qnt' | wc -l; done
rg -n '^\s*import ' packages/character-creation-runtime packages/character-sheet-runtime packages/character-battle-runtime --glob '*.mbt.qnt'
```

## Verification

- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes were run for this
  documentation-only decision and converged with no remaining reasonable
  findings.
- RAW/ubiquitous-language check: this task models no new D&D rule and changes
  no runtime semantics, so no new SRD passage is required;
  `UBIQUITOUS_LANGUAGE.md` was checked to keep the character-package boundary
  terms aligned.
- `git diff --check 94e527bd3670b18e4d99143629e47c094caa11b4 --`: passed.
- `pnpm exec prettier --check plans/CHARACTER_PACKAGE_WITNESS_FEASIBILITY.md plans/RALPH_LANE_PARITY_DRIVER_SEAM.md`:
  passed.
- MBT not run: this task changed planning documentation only, with no
  executable `.ts`, `.qnt`, driver, witness, or runtime package changes.

## Inventory

The non-battle MBT corpus matches the PRD notes:

- `packages/character-creation-runtime`: 9 witness/driver pairs.
- `packages/character-sheet-runtime`: 11 witness/driver pairs.
- `packages/character-battle-runtime`: 4 witness/driver pairs.

All 24 QNT witnesses still expose `qLastResult`. Twenty-three use local
`recordProjection(...)` helpers with string scenario labels and parallel
projection fields. The exception is
`packages/character-creation-runtime/character-creation-runtime.mbt.qnt`, which
imports `character-creation-runtime-slice` and records computed
`FillBatchResult` projections.

Import shape:

- 14 of 24 character witnesses are self-contained.
- 9 import small shared-algebras rule-core modules.
- 1 imports a package-local character-creation runtime slice.

Driver shape:

- All 24 paired TS drivers have local state decoding or parser plumbing.
- Several creation drivers use `zod` schemas for state projection.
- Many sheet and character-battle drivers use repeated local helpers such as
  `scenarioField`, `resultField`, `stringField`, `booleanField`, and direct
  "Expected Quint state record" assertions.

## Why Not Shared Extraction Now

The battle-runtime QNT protocol is not domain-neutral. Its invalid reasons
mirror battle resolution failures such as stale subject, wrong actor, missing
combatant, invalid fill, unsupported subject, and unsupported act option.
Character creation and sheet workflows have different domain failures: stale
draft revisions, fill issue codes, finalization states, rest gates, resource
projection scenarios, and battle-handoff settlement messages.

The TS kit has the same split. Its generic state-reader functions are useful,
but its recorder and fixture helpers are battle-runtime specific. Pulling those
helpers into character packages would create a shared abstraction named after
the transport rather than the domain invariant. Pulling only the generic readers
into shared test support is feasible, but it would touch every package's test
imports and provides little value until the character witnesses themselves move
off parallel string state.

Lane C ownership is decisive. `packages/character-sheet-runtime` contains 11 of
the 24 pairs and is explicitly owned by Lane C. A real extraction would need to
edit those executable drivers and probably their witness shapes. This task
should not introduce that cross-lane dependency by editing or coupling to that
package.

## Future Lane Shape

Add a future character-package MBT cleanup lane after Lane C's
`character-sheet-runtime` ownership work is merged or explicitly handed off.
Suggested scope:

1. Audit the 24 pairs by domain shape: selected-identity literal projection
   witnesses, rule-core computed projection witnesses, the character-creation
   slice computed-oracle witness, and character-battle handoff projection
   witnesses.
2. Introduce package-local typed witness protocol leaves first, not a
   cross-package QNT protocol:
   `packages/character-creation-runtime/character-creation-witness-protocol.qnt`,
   `packages/character-sheet-runtime/character-sheet-witness-protocol.qnt`, and
   `packages/character-battle-runtime/character-battle-witness-protocol.qnt`.
3. Migrate each package's witnesses from `qLastResult: str` and parallel
   projection vars to record-typed witness state using package-domain result
   variants.
4. Only after those migrations, consider extracting domain-neutral TS helpers
   into shared test support. Candidate ownership:
   `packages/shared/src/mbt-test-support.ts` exported as
   `@dnd/shared/mbt-test-support`, containing only `defineDriver`, `run`,
   `stateCheck`, `transformITFValue` re-exports; `mbtSpecPath`;
   trace-count/timeout defaults; Quint state readers for record, field, list,
   set, variant tag/value; and primitive decoders for number, boolean, and
   string literals.

Do not extract battle `BattleResolutionResult` recording, battle invalid
reasons, battle fixtures, Surface catalogs, character draft parsers, character
sheet fixtures, or character-battle handoff builders. Those remain in their own
package test support because their invariants are domain-specific.

## Plan Impact

- Keep PDS-A20, PDS-A21, and PDS-A22 unchanged; the scenario-outcome migration
  remains battle-runtime-owned.
- PDS-A23 is marked done/research-complete with no executable changes.
- PDS-A24-CHARACTER-PACKAGE-MBT-CLEANUP-LANE has been added as the deferred
  follow-up entry after Lane C or with an explicit Lane C dependency.

Required plan edit: none; the tracked lane plan now contains the deferred
PDS-A24 follow-up.
