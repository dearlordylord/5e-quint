# Level 1-2 Background Catalog Closure Lane

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12BG-SURFACE-ACOLYTE-CRIMINAL-SAGE",
      "status": "ready-for-research",
      "title": "Author Missing SRD Background Surface Records"
    },
    {
      "number": 2,
      "id": "L12BG-CHARACTER-CREATION-ADMISSION",
      "status": "ready-for-research",
      "title": "Admit SRD Backgrounds In Character Creation"
    },
    {
      "number": 3,
      "id": "L12BG-FULL-SUPPORT-GATE-CLOSURE",
      "status": "blocked",
      "title": "Close Background Full-Support Claim Gate"
    }
  ]
}
-->

This lane closes the current SRD Background full-support gate for level 1-2
catalog completeness. It does not change battle runtime behavior and must not
invent new background mechanics beyond the local SRD 5.2.1 corpus.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Ralph must run the normal reviewer loop until convergence: RAW traceability,
ubiquitous-language/domain-language, architecture/connascence, and code review.
Fix every reasonable note, reject only with a concrete reason, and repeat until
no reasonable findings remain.

## Source Of Truth

- `.references/srd-5.2.1/Character-Origins.md:33-63`
- `UBIQUITOUS_LANGUAGE.md`
- Existing Soldier background records:
  - `packages/surface/content/background_soldier.json`
  - `packages/surface/content/background_soldier.dhall`
- Existing character-creation background readers, support gates, and tests.
- Current full-support gate:
  - `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
  - `plans/unit-profile-coverage/level1-2-full-support.json`

## Lane Rules

- Do not add battle-runtime behavior.
- Do not treat Backgrounds as battle Unit profiles; they are character-creation
  authored data and origin facts.
- Keep SRD authored identity at Surface/catalog and test boundaries only.
- Preserve existing Soldier semantics and avoid special-casing individual
  background ids in generic runtime logic when a data-driven path is available.
- Prefer typed Surface facts and current background reader/finalizer paths over
  parallel registries or duplicate projection tables.
- If a missing origin feat or equipment item blocks exact authoring, record the
  smallest precise follow-up instead of silently substituting another rule.

## Verification

Every task must include:

- RAW check against `.references/srd-5.2.1/Character-Origins.md:33-63`.
- Ubiquitous-language/domain-language check.
- Focused Surface tests for new records and catalog wiring.
- Focused Character Creation tests when admission/finalization changes.
- `pnpm unit-profile-coverage:check --write` when generated artifacts change,
  then `pnpm unit-profile-coverage:check`.
- `git diff --check`.
- Reviewer-loop convergence.

## Tasks

### Task 1 - L12BG-SURFACE-ACOLYTE-CRIMINAL-SAGE - Author Missing SRD Background Surface Records

Status: `ready-for-research`

Input:

- `.references/srd-5.2.1/Character-Origins.md:33-63`.
- Existing Soldier background Surface records and tests.
- Current Surface schemas for Background ability scores, tool proficiency,
  origin feat, and starting equipment.

Output:

- Add SRD Surface content for:
  - `background_acolyte`
  - `background_criminal`
  - `background_sage`
- Wire the three records into the SRD Unit catalog.
- Add focused Surface/catalog tests proving all four SRD backgrounds decode,
  read creation facts, and have no unresolved Unit refs in option A equipment.
- Add the required non-runtime Unit profile disposition claims for the three
  newly installed Background Units and regenerate coverage artifacts so
  `pnpm unit-profile-coverage:check` stays green after catalog wiring.
- If a referenced feat/equipment/tool cannot be represented exactly by current
  Surface types, split a precise follow-up and keep the record lossless for the
  fields current Surface can represent.

Acceptance:

- New records use local SRD provenance and do not copy extra non-SRD prose.
- The background records preserve RAW ability-score lists, origin feat refs,
  skill proficiencies, tool proficiency, option A equipment, and option B 50 GP.
- Surface tests pass.

### Task 2 - L12BG-CHARACTER-CREATION-ADMISSION - Admit SRD Backgrounds In Character Creation

Status: `ready-for-research`

Depends on:

- Task 1.

Input:

- New SRD Background records from Task 1.
- `packages/character-creation-runtime/src/phase1-manifest.ts`
- `packages/character-creation-runtime/src/support-gates.ts`
- Character Creation background discovery/fill/finalization tests.

Output:

- Widen the supported Background admission set from Soldier-only to all four SRD
  backgrounds.
- Add focused Character Creation tests for Acolyte, Criminal, and Sage:
  - background selection is discoverable;
  - ability-score increase choices are derived from each background's own
    ability list;
  - fixed or chosen tool proficiency is fillable/finalizable;
  - option B 50 GP remains finalizable;
  - finalized build references the selected background and applies its origin
    facts without duplicating background state.
- Keep unsupported option A equipment behavior precise if any option A item is
  still outside current supported equipment finalization.

Acceptance:

- Character Creation uses data from the selected Background record, not
  Soldier-specific assumptions.
- Focused Character Creation tests pass.
- No battle-runtime code changes are introduced.

### Task 3 - L12BG-FULL-SUPPORT-GATE-CLOSURE - Close Background Full-Support Claim Gate

Status: `blocked`

Depends on:

- Task 1.
- Task 2.

Input:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/profiles.jsonl`
- Full-support generated artifacts.

Output:

- Reconcile the Background Unit profile claims and add any necessary
  profile/evidence rows for the widened character-creation Background admission
  path from Task 2.
- Regenerate unit profile and full-support artifacts so the SRD Background gate
  is complete.

Acceptance:

- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md` no longer reports SRD
  Background family as incomplete.
- `pnpm unit-profile-coverage:check` passes.
- The closure does not falsely count Backgrounds as battle runtime profiles.
