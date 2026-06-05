# Ralph Lane: L3 Morning Character Advancement Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE",
      "status": "done",
      "title": "Resolve Weapon Mastery later-count closure"
    },
    {
      "number": 2,
      "id": "L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE",
      "status": "done",
      "title": "Resolve Bard Expertise level 9 closure"
    },
    {
      "number": 3,
      "id": "L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION",
      "status": "done",
      "title": "Resolve subclass spell access progression closure"
    },
    {
      "number": 4,
      "id": "L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT",
      "status": "ready-for-research",
      "title": "Resolve Fighting Style cantrip replacement closure"
    },
    {
      "number": 5,
      "id": "L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT",
      "status": "ready-for-research",
      "title": "Resolve Wizard Evocation Savant later-slot closure"
    },
    {
      "number": 6,
      "id": "L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS",
      "status": "ready-for-research",
      "title": "Resolve Prayer of Healing cast witness closure"
    },
    {
      "number": 7,
      "id": "L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE",
      "status": "ready-for-research",
      "title": "Resolve Font of Magic battle slot source closure"
    },
    {
      "number": 8,
      "id": "L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP",
      "status": "ready-for-implementation-after-light-research",
      "title": "Deduplicate Fast Hands delegated owner rows"
    },
    {
      "number": 9,
      "id": "L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE",
      "status": "ready-for-research",
      "title": "Resolve Monk focus jump witness closure"
    },
    {
      "number": 10,
      "id": "L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Audit selected identity for character advancement profiles"
    },
    {
      "number": 11,
      "id": "L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION",
      "status": "blocked",
      "title": "Consolidate character advancement ledgers"
    },
    {
      "number": 12,
      "id": "L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT",
      "status": "blocked",
      "title": "Report next character advancement candidates"
    }
  ]
}
-->

## Objective

Move Level 1-3 character advancement pressure toward ultra-golden coverage
without pretending character-sheet facts are battle reducer behavior. This lane
should shrink the admitted/closed unit-profile set by proving which remaining
profiles are character-build support, which are battle-reducer support needing
QNT, and which are explicitly table-owned.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
9e8ea6e4db35bc2703907697f1c291643bf94e45
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 9e8ea6e4db35bc2703907697f1c291643bf94e45 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE | ready-for-research | none | Close Fighter/Barbarian later-count support as character-build facts unless battle reducer reachability exists. |
| 2 | L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE | done | none | Close later Expertise progression without duplicating skill selection state. |
| 3 | L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION | done | none | Cover Life, Fiend, Draconic, Devotion, and similar access rows through one typed owner shape. |
| 4 | L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT | ready-for-research | none | Resolve Ranger/Paladin Fighting Style replacement and cantrip access rows. |
| 5 | L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT | ready-for-research | none | Decide if later slot support is build-time, spellcasting kernel, or out of L3. |
| 6 | L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS | ready-for-research | none | Classify cast witness and rest interaction against current runtime owners. |
| 7 | L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE | ready-for-research | none | Decide whether sorcery-point slot creation is reachable in battle reducer flows. |
| 8 | L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP | ready-for-implementation-after-light-research | none | Remove duplicated delegated owner rows or make the single owner executable. |
| 9 | L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE | ready-for-research | none | Resolve jump-distance support without adding absent movement state. |
| 10 | L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT | ready-for-implementation-after-light-research | none | Verify character advancement selected identity is connected to production code. |
| 11 | L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION | blocked | L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE, L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE, L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION, L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT, L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT, L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS, L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE, L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP, L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE, L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT | Regenerate ledgers after all closures. |
| 12 | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | blocked | L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION | Report remaining high-value L3 candidates for future parallel lanes. |

## Task Details

### Task 1 - L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE

Read Fighter and Barbarian RAW and close later Weapon Mastery count rows as
typed character-build support, battle runtime support, or explicit out-of-scope
rows.

### Task 2 - L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE

Close Bard Expertise level 9 support without duplicating skill selection state
or treating character advancement as battle behavior.

### Task 3 - L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION

Resolve subclass spell access rows through a shared typed owner where possible.
Candidate pressure includes Life Domain, Fiend patron, Draconic sorcery,
Devotion oath, and similar access profiles.

### Task 4 - L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT

Resolve Fighting Style cantrip access and replacement facts for Ranger and
Paladin without adding authored-identity dispatch.

### Task 5 - L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT

Classify Evocation Savant later-level slot behavior against current spell
preparation and spellcasting support.

### Task 6 - L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS

Resolve whether Prayer of Healing needs an executable cast witness, a rest
owner blocker, or a table-only closure.

### Task 7 - L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE

Decide whether sorcery point to spell slot conversion is reachable by the real
battle reducer. If it is promoted as battle behavior, add QNT and MBT evidence.

### Task 8 - L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP

Deduplicate Fast Hands delegated owner rows and keep only one executable owner
for the currently supported boundary.

### Task 9 - L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE

Resolve Monk focus jump support against the current movement model and avoid
adding movement facts that the reducer cannot consume.

### Task 10 - L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay for promoted character advancement profiles and
prove each test is connected to production code, not a dead fixture path.

### Task 11 - L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION

Regenerate unit/profile ledgers and remove stale rows made obsolete by this
lane.

### Task 12 - L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT

Record the remaining L3 character advancement candidates with a recommended
next parallel split.

## Task Rules

- `in reducer = in QNT` applies when a character feature is promoted into the
  battle reducer path.
- Character-build-only support should be covered by production build/selection
  code and focused tests, not fake battle MBT.
- Do not duplicate provenance, selected identity, spell access, or progression
  facts across layers. Thread existing facts or reshape the owner.
- Do not dispatch on PHB+ authored identity. Synthetic fixture identity is
  allowed only at test/content boundaries.
- Keep each closure task narrow. If a task discovers a subsystem-sized missing
  owner, record the owner precisely and update ledgers rather than doing a wide
  refactor.

## Verification

- RAW/ubiquitous-language check: read the relevant class, feat, or spell
  passage in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before
  modeling any rule.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` for profile/evidence changes.
- Run `pnpm rules-kernel-coverage:check -- --write` and
  `pnpm rules-kernel-coverage:check` when rule-core obligation evidence changes.
- Run focused package tests and typechecks for any production code touched.
- Run battle MBT only for completed battle-runtime behavior changes, one at a
  time, with the global `.ralph/mbt-global.lock`.
