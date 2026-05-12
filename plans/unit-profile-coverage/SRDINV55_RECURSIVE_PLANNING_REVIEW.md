# SRDINV55 Recursive SRD Inventory Planning Review

Task 248 reviewed the closed Command route and Feather Fall runtime batch after
SRDINV50D1, SRDINV50D2, SRDINV56A, and SRDINV56B landed.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-present` rows: 144
- Level-1 `non-runtime` rows: 12
- Spell Unit `catalog-installed-owner-evidence-present` rows: 115
- Spell Unit `catalog-installed-owner-evidence-required` rows: 1
- Spell Unit `needs-surface-widening` rows: 15
- Spell Unit `catalog-only/dead-for-now` rows: 80

Unit matrix metrics from `plans/unit-profile-coverage/unit-matrix.json`:

- Installed collection inventory count: 130 Units
- Authored Surface Unit catalog admission: 129/422, 30.6%
- Authored Surface executable catalog admission: 105/355, 29.6%
- Installed Unit profile classification coverage: 130/130, 100%
- Supported executable Unit coverage: 66/106, 62.3%
- QNT profile modeling coverage: 47/47, 100%
- QNT proof coverage: 45/47, 95.7%
- Runtime mapping coverage: 47/47, 100%
- Runtime parity coverage: 47/47, 100%
- Deterministic admission/projection coverage: 62/66, 93.9%
- Selected identity MBT coverage: 10/66, 15.2%

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Command.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Feather Fall.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Shocking Grasp.
- `.references/srd-5.2.1/Playing-the-Game.md` for Reaction timing, movement
  spending, Difficult Terrain, and Opportunity Attack timing.
- `.references/srd-5.2.1/Rules-Glossary.md` for Falling, Opportunity Attacks,
  Prone, Reaction, and Speed.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Invocation, Spell Effect, Spell
Slot, Reaction, Opportunity Attack, Movement, Speed, Difficult Terrain,
Falling, Prone, and Target.

## Review Findings

- Command support claims are now honest for all five named options. Grovel and
  Halt use pending next-turn effects, Drop keeps held-object facts
  caller/table-supplied, and Approach/Flee consume caller-supplied route
  execution facts through the shared Movement budget. Route labels do not
  create Opportunity Attack eligibility; actual movement facts do.
- Feather Fall is now correctly classified as a supported subset: table-supplied
  falling trigger facts, up-to-five falling target admission, Reaction and Spell
  Slot spend, per-target mitigation effects, the 60-foot-per-round descent cap
  projection, and table-supplied landing cleanup are supported. Fall-distance
  derivation, map elevation, and landing geometry simulation remain outside the
  runtime boundary.
- Shocking Grasp should not remain queued as duplicate runtime work.
  `packages/battle-runtime/battle-runtime.qnt` models
  `ShockingGraspOpportunityAttackDenied`,
  `packages/battle-runtime/src/unit-profile-admission.test.ts` admits the
  Opportunity Attack denial rider, and
  `packages/battle-runtime/src/index.test.ts` checks that the active effect
  suppresses Opportunity Attack windows. The generated inventory already records
  Sorcerer and Wizard Shocking Grasp spell-list rows as
  `catalog-installed-owner-evidence-present`.
- The only remaining `catalog-installed-owner-evidence-required` Spell Unit row
  is Warlock Hellish Rebuke. That row belongs to the SRDINV66 successor batch,
  not this closed Command/Feather Fall review.

## Batch Disposition

SRDINV55 unblocks the immediate executable follow-up tasks whose only
dependency was this review:

- `SRDINV57`: Grease Difficult Terrain movement boundary.
- `SRDINV58A`: Faerie Fire Invisible-denial runtime.
- `SRDINV59A`: Starry Wisp Dim Light rider runtime.
- `SRDINV60A`: Protection from Evil and Good condition prevention.
- `SRDINV61`: Animal Friendship damage-break cleanup.
- `SRDINV62`: Hunter's Mark upcast duration maxima.
- `SRDINV64`: Chill Touch healing-prevention rider.

Dependent research or second-slice tasks stay blocked behind their explicit
task prerequisites: `SRDINV58B`, `SRDINV59B`, `SRDINV60B`, `SRDINV63`, and
`SRDINV66`.

`SRDINV65` is marked done as a plan correction because promoted Shocking Grasp
Opportunity Attack denial evidence already exists; no new runtime slice should
duplicate it.

## /simplify Convergence

- Round 1: rejected treating Shocking Grasp as a new runnable task. Existing
  QNT, admission, reducer, and inventory evidence already close the
  Opportunity Attack denial clause.
- Round 2: checked the unblocked batch for Ralph-sized ownership boundaries.
  The remaining immediate tasks each name one executable rule slice and keep
  deferred spatial, light, finding, save, or cleanup clauses in their dependent
  tasks rather than collapsing them into one backlog.
