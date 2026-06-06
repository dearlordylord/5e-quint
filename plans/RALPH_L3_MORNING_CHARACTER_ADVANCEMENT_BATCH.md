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
      "status": "done",
      "title": "Resolve Fighting Style cantrip replacement closure"
    },
    {
      "number": 5,
      "id": "L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT",
      "status": "done",
      "title": "Resolve Wizard Evocation Savant later-slot closure"
    },
    {
      "number": 6,
      "id": "L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS",
      "status": "done",
      "title": "Resolve Prayer of Healing cast witness closure"
    },
    {
      "number": 7,
      "id": "L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE",
      "status": "done",
      "title": "Resolve Font of Magic battle slot source closure"
    },
    {
      "number": 8,
      "id": "L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP",
      "status": "done",
      "title": "Deduplicate Fast Hands delegated owner rows"
    },
    {
      "number": 9,
      "id": "L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE",
      "status": "done",
      "title": "Resolve Monk focus jump witness closure"
    },
    {
      "number": 10,
      "id": "L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT",
      "status": "done",
      "title": "Audit selected identity for character advancement profiles"
    },
    {
      "number": 11,
      "id": "L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION",
      "status": "done",
      "title": "Consolidate character advancement ledgers"
    },
    {
      "number": 12,
      "id": "L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT",
      "status": "done",
      "title": "Report next character advancement candidates"
    },
    {
      "number": 13,
      "id": "L3MCHAR-NB-01-JACK-OF-ALL-TRADES-ROW-EVIDENCE",
      "status": "done",
      "title": "Connect Jack of All Trades inventory row evidence"
    },
    {
      "number": 14,
      "id": "L3MCHAR-NB-02-DISCIPLE-OF-LIFE-ROW-EVIDENCE",
      "status": "done",
      "title": "Reconcile Disciple of Life inventory row evidence"
    },
    {
      "number": 15,
      "id": "L3MCHAR-NB-03-REMARKABLE-ATHLETE-ROW-EVIDENCE",
      "status": "done",
      "title": "Reconcile Remarkable Athlete inventory row evidence"
    },
    {
      "number": 16,
      "id": "L3MCHAR-NB-04-STEADY-AIM-ROW-EVIDENCE",
      "status": "done",
      "title": "Reconcile Steady Aim inventory row evidence"
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
| 1 | L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE | done | none | Close Fighter/Barbarian later-count support as character-build facts unless battle reducer reachability exists. |
| 2 | L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE | done | none | Close later Expertise progression without duplicating skill selection state. |
| 3 | L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION | done | none | Cover Life, Fiend, Draconic, Devotion, and similar access rows through one typed owner shape. |
| 4 | L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT | done | none | Resolve Ranger/Paladin Fighting Style replacement and cantrip access rows. |
| 5 | L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT | done | none | Later-slot support is closed to the future character-advancement Wizard spell slot level access owner; level-3 acquisition-time Evocation Savant spellbook evidence is present. |
| 6 | L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS | done | none | Cast witness and rest interaction close to the existing character-sheet spell-rest benefit owner, with casting progress, range maintenance, and interruption remaining caller/table facts. |
| 7 | L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE | done | none | Sorcery-point slot creation remains Character Sheet-owned; Character Battle receives aggregate Spell Slot capacity, rejects source-ambiguous handoff, and exposes no Font of Magic battle Unit Bonus Action. |
| 8 | L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP | done | none | Remove duplicated delegated owner rows or make the single owner executable. |
| 9 | L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE | done | none | Resolve jump-distance support without adding absent movement state. |
| 10 | L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT | done | none | Verify character advancement selected identity is connected to production code. |
| 11 | L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION | done | L3MCHAR-01-WEAPON-MASTERY-LATER-COUNT-CLOSURE, L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE, L3MCHAR-03-SUBCLASS-SPELL-ACCESS-PROGRESSION, L3MCHAR-04-FIGHTING-STYLE-CANTRIP-REPLACEMENT, L3MCHAR-05-WIZARD-EVOCATION-SAVANT-LATER-SLOT, L3MCHAR-06-PRAYER-OF-HEALING-CAST-WITNESS, L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE, L3MCHAR-08-FAST-HANDS-DELEGATED-OWNER-DEDUP, L3MCHAR-09-MONK-FOCUS-JUMP-WITNESS-CLOSURE, L3MCHAR-10-CHARACTER-SHEET-SELECTED-IDENTITY-AUDIT | Regenerate ledgers after all closures. |
| 12 | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | done | L3MCHAR-11-ADVANCEMENT-LEDGER-CONSOLIDATION | Reported the next row-evidence reconciliation split for Bard Jack of All Trades, Cleric Disciple of Life, Fighter Remarkable Athlete, and Rogue Steady Aim. |
| 13 | L3MCHAR-NB-01-JACK-OF-ALL-TRADES-ROW-EVIDENCE | done | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | Connected the existing Character Sheet Jack of All Trades owner evidence to the generated inventory readiness path. |
| 14 | L3MCHAR-NB-02-DISCIPLE-OF-LIFE-ROW-EVIDENCE | done | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | Connected existing Disciple of Life battle-runtime and QNT evidence to the generated inventory readiness path. |
| 15 | L3MCHAR-NB-03-REMARKABLE-ATHLETE-ROW-EVIDENCE | done | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | Connected existing Remarkable Athlete deterministic admission and selected-identity MBT evidence to the generated inventory readiness path. |
| 16 | L3MCHAR-NB-04-STEADY-AIM-ROW-EVIDENCE | done | L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT | Connected existing Steady Aim deterministic admission and selected-identity MBT evidence to the generated inventory readiness path. |

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

Closed as Character Sheet-owned support. Font of Magic Creating Spell Slots is
RAW Bonus Action resource conversion, but the supported Character Battle
boundary receives only aggregate Spell Slot capacity, rejects
ordinary-vs-created source-ambiguous handoff, and exposes no Font of Magic battle
Unit Bonus Action. Do not add battle-local created-slot source state unless a
future task promotes a source-aware Spell Slot spend owner with matching QNT and
MBT evidence.

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

Closed by
`plans/unit-profile-coverage/L3MCHAR_12_ADVANCEMENT_NEXT_BATCH_REPORT.md`.
The recommended next split is one Character Sheet row-evidence task for Bard
Jack of All Trades and three battle-runtime row-evidence tasks for Cleric
Disciple of Life, Fighter Remarkable Athlete, and Rogue Steady Aim. The report
also records that current Unit matrix claims/evidence already exist for these
Unit ids, while the generated SRD inventory still keeps their row-level owner
evidence open.

### Task 13 - L3MCHAR-NB-01-JACK-OF-ALL-TRADES-ROW-EVIDENCE

Connect `bard_jack_of_all_trades` to the generated SRD inventory readiness path
using the existing Character Sheet Ability Check Proficiency Bonus owner
evidence. Do not add skill, Expertise, or Jack of All Trades state beside
existing CharacterBuild facts; fix the checker input, owner symbol, or
generator path that still leaves the row open.

### Task 14 - L3MCHAR-NB-02-DISCIPLE-OF-LIFE-ROW-EVIDENCE

Reconcile or complete `cleric_disciple_of_life` as a spell-slot Hit Point
restoration modifier. If the target branch already has runtime and QNT evidence,
connect that evidence to the generated SRD inventory readiness path; otherwise
promote the direct spell healing modifier with focused runtime tests and Quint
parity before closing the row.

### Task 15 - L3MCHAR-NB-03-REMARKABLE-ATHLETE-ROW-EVIDENCE

Reconcile or complete `fighter_remarkable_athlete` for Initiative Advantage,
Strength (Athletics) Advantage, and immediately-after-Critical-Hit movement up
to half Speed without Opportunity Attacks. Use existing roll-mode, movement, and
Opportunity Attack owners rather than adding a generic feature flag.

### Task 16 - L3MCHAR-NB-04-STEADY-AIM-ROW-EVIDENCE

Reconcile or complete `rogue_steady_aim` as a Bonus Action available only if the
Rogue has not moved on the current turn, granting Advantage on the next attack
roll on that turn and setting Speed to 0 until turn end. Keep movement history,
action economy, attack-roll, and Speed facts in their existing owners.

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
