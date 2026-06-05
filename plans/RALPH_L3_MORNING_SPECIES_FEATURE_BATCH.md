# Ralph Lane: L3 Morning Species And Feature Candidates

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {"number":1,"id":"L3MSPEC-01-CANDIDATE-TRIAGE","status":"ready-for-research","title":"Triage species and class-feature battle candidates"},
    {"number":2,"id":"L3MSPEC-02-DRAGONBORN-BREATH-WEAPON-SURFACE","status":"blocked","title":"Promote Dragonborn Breath Weapon Surface and support profile"},
    {"number":3,"id":"L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME","status":"blocked","title":"Promote Dragonborn Breath Weapon runtime parity"},
    {"number":4,"id":"L3MSPEC-04-DRAGONBORN-DAMAGE-RESISTANCE","status":"blocked","title":"Promote Dragonborn Damage Resistance"},
    {"number":5,"id":"L3MSPEC-05-DWARVEN-RESILIENCE-RESISTANCE","status":"blocked","title":"Promote Dwarven Resilience poison resistance"},
    {"number":6,"id":"L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE","status":"blocked","title":"Promote Dwarven Resilience poison save roll mode"},
    {"number":7,"id":"L3MSPEC-07-GOLIATH-POWERFUL-BUILD-GRAPPLE","status":"blocked","title":"Promote Goliath Powerful Build grapple escape fact"},
    {"number":8,"id":"L3MSPEC-08-BARBARIAN-FRENZY-RIDER-AUDIT","status":"ready-for-implementation-after-light-research","title":"Audit Barbarian Frenzy attack-damage rider"},
    {"number":9,"id":"L3MSPEC-09-BARBARIAN-FRENZY-RUNTIME","status":"blocked","title":"Promote Barbarian Frenzy runtime parity"},
    {"number":10,"id":"L3MSPEC-10-SPECIES-DARKVISION-CLOSURE","status":"ready-for-research","title":"Close or plan species Darkvision sense projection"},
    {"number":11,"id":"L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT","status":"blocked","title":"Audit selected-identity replay for promoted species traits"},
    {"number":12,"id":"L3MSPEC-12-SPECIES-FEATURE-CONSOLIDATION","status":"blocked","title":"Consolidate species and feature candidate evidence"}
  ]
}
-->

## Objective

Open a new vertical candidate lane from remaining Level 1-3 pressure after the
spell-heavy overnight work. This lane deliberately starts with triage because
species traits have several tempting but table-owned facts; invalid states must
be rejected before adding new profiles.

The previous spell lifecycle lane completed closest to morning, at
2026-06-05T10:31:36Z, about 1h12m before the status check. This lane therefore
targets roughly one night of work, not a small cleanup batch.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
83665a61ee9e47e11c88b3f14da9d26472320fe1
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 83665a61ee9e47e11c88b3f14da9d26472320fe1 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MSPEC-01-CANDIDATE-TRIAGE | ready-for-research | none | Read RAW and classify which candidates are battle-runtime, character-sheet, or table-owned. |
| 2 | L3MSPEC-02-DRAGONBORN-BREATH-WEAPON-SURFACE | blocked | L3MSPEC-01-CANDIDATE-TRIAGE | Run only if triage confirms an executable battle profile can be shaped without ancestry identity dispatch. |
| 3 | L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME | blocked | L3MSPEC-02-DRAGONBORN-BREATH-WEAPON-SURFACE | Runtime/QNT/MBT vertical slice for breath weapon. |
| 4 | L3MSPEC-04-DRAGONBORN-DAMAGE-RESISTANCE | blocked | L3MSPEC-01-CANDIDATE-TRIAGE | Passive resistance profile if damage type source can be typed from ancestry facts. |
| 5 | L3MSPEC-05-DWARVEN-RESILIENCE-RESISTANCE | blocked | L3MSPEC-01-CANDIDATE-TRIAGE | Poison damage Resistance slice. |
| 6 | L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE | blocked | L3MSPEC-05-DWARVEN-RESILIENCE-RESISTANCE | Advantage on saves to avoid/end Poisoned, after resistance facts are settled. |
| 7 | L3MSPEC-07-GOLIATH-POWERFUL-BUILD-GRAPPLE | blocked | L3MSPEC-01-CANDIDATE-TRIAGE | Only promote the battle-relevant Grappled escape check fact, not carrying capacity. |
| 8 | L3MSPEC-08-BARBARIAN-FRENZY-RIDER-AUDIT | ready-for-implementation-after-light-research | none | Audit whether existing `unit-feature.attack-damage-rider` owners already cover Frenzy. |
| 9 | L3MSPEC-09-BARBARIAN-FRENZY-RUNTIME | blocked | L3MSPEC-08-BARBARIAN-FRENZY-RIDER-AUDIT | Implement only if the audit finds a real missing runtime slice. |
| 10 | L3MSPEC-10-SPECIES-DARKVISION-CLOSURE | ready-for-research | none | Close table/perception-only Darkvision rows or plan a shared sense projection owner. |
| 11 | L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT | blocked | L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME, L3MSPEC-04-DRAGONBORN-DAMAGE-RESISTANCE, L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE, L3MSPEC-07-GOLIATH-POWERFUL-BUILD-GRAPPLE, L3MSPEC-09-BARBARIAN-FRENZY-RUNTIME | Audit only after promoted slices land. |
| 12 | L3MSPEC-12-SPECIES-FEATURE-CONSOLIDATION | blocked | L3MSPEC-10-SPECIES-DARKVISION-CLOSURE, L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT | Regenerate reports and record remaining pressure. |

## Task Details

### Task 1 - L3MSPEC-01-CANDIDATE-TRIAGE

Read RAW and classify species/class-feature candidates as battle-runtime,
character-sheet, or table-owned before implementation.

### Task 2 - L3MSPEC-02-DRAGONBORN-BREATH-WEAPON-SURFACE

Promote the Breath Weapon Surface/support profile only if Task 1 confirms a
safe typed runtime shape.

### Task 3 - L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME

Promote Breath Weapon runtime, QNT, MBT, and ledgers after Surface shape exists.

### Task 4 - L3MSPEC-04-DRAGONBORN-DAMAGE-RESISTANCE

Promote Dragonborn passive damage Resistance if ancestry damage type is a typed
fact rather than authored-identity dispatch.

### Task 5 - L3MSPEC-05-DWARVEN-RESILIENCE-RESISTANCE

Promote Dwarven poison damage Resistance as its own profile fact.

### Task 6 - L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE

Promote Dwarven save roll mode for avoiding or ending Poisoned after resistance
facts are settled.

### Task 7 - L3MSPEC-07-GOLIATH-POWERFUL-BUILD-GRAPPLE

Promote only the battle-relevant Grappled escape check fact.

### Task 8 - L3MSPEC-08-BARBARIAN-FRENZY-RIDER-AUDIT

Audit whether current attack-damage rider owners already cover Frenzy.

### Task 9 - L3MSPEC-09-BARBARIAN-FRENZY-RUNTIME

Implement Frenzy runtime parity only if Task 8 finds a real missing slice.

### Task 10 - L3MSPEC-10-SPECIES-DARKVISION-CLOSURE

Close or plan species Darkvision as a shared sense projection owner.

### Task 11 - L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay for any promoted species traits.

### Task 12 - L3MSPEC-12-SPECIES-FEATURE-CONSOLIDATION

Regenerate reports and record remaining candidate pressure.

## Task Rules

- Do not dispatch runtime behavior on authored species, ancestry, or feature
  ids. Parse Surface facts into typed support profiles and consume those.
- Do not promote table/perception facts as battle state just to improve a
  percentage.
- Dragonborn Breath Weapon must thread ancestry damage type and shape facts as
  typed runtime facts; do not hard-code SRD authored identity.
- Dwarven Resilience resistance and save mode are separate facts; do not
  collapse damage Resistance and Poisoned save Advantage into one ambiguous
  profile unless the type makes the coupling explicit.

## Verification

- RAW/ubiquitous-language check: read the relevant species/class passages in
  `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` before modeling.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run focused runtime tests and `pnpm --filter @dnd/battle-runtime typecheck`
  for battle-runtime changes.
- Run `pnpm unit-profile-coverage:check -- --write`, then
  `pnpm unit-profile-coverage:check`.
- Run `pnpm rules-kernel-coverage:check -- --write`, then
  `pnpm rules-kernel-coverage:check` if profile obligations change.
- Run MBT only for completed battle-runtime behavior changes, under
  `.ralph/mbt-global.lock`, one MBT at a time.
