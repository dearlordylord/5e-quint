# Ralph Lane: Level 3 Class Feature Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES",
      "status": "done",
      "title": "Promote Remarkable Athlete Initiative and Strength Athletics roll modes"
    },
    {
      "number": 2,
      "id": "L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT",
      "status": "done",
      "title": "Promote Remarkable Athlete post-critical half-Speed movement"
    },
    {
      "number": 3,
      "id": "L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION",
      "status": "done",
      "title": "Promote Sacred Weapon activation, Channel Divinity spend, and held weapon binding"
    },
    {
      "number": 4,
      "id": "L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT",
      "status": "done",
      "title": "Promote Sacred Weapon attack bonus, Radiant choice, light, and lifecycle cleanup"
    },
    {
      "number": 5,
      "id": "L3CF-05-ROGUE-FAST-HANDS-BATTLE-CLOSURE-AUDIT",
      "status": "done",
      "title": "Close or promote Fast Hands battle-owned delegated action economy"
    },
    {
      "number": 6,
      "id": "L3CF-06-CLASS-FEATURE-GOLDEN-LEDGER-CONSOLIDATION",
      "status": "ready-for-implementation",
      "title": "Consolidate class-feature golden tracer bullet evidence and stale follow-ups"
    }
  ]
}
-->

## Objective

Move level-3 class-feature follow-up splits toward promoted Unit tracer bullets
without duplicating work from `RALPH_L3_PROMOTED_UNIT_TRACER_BULLETS.md`.

A promoted Unit tracer bullet means:

```text
RAW scope
  -> battle-supported profile decision
  -> QNT obligation / focused MBT expectation
  -> TypeScript reducer or explicit non-reducer closure
  -> selected Unit identity replay when reducer behavior is supported
  -> coverage ledger rows that join Unit, profile, runtime owner, QNT owner, and verification owner
```

## Declared Base And Task-Base Check

Declared Base SHA for every task in this lane:

```text
d05bfd52bf6a5964af9f2a5f88c37d5093256e06
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor d05bfd52bf6a5964af9f2a5f88c37d5093256e06 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES - Promote Remarkable Athlete Initiative and Strength Athletics roll modes | done | none | Independent roll-mode slice. |
| 2 | L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT - Promote Remarkable Athlete post-critical half-Speed movement | done | none | Independent movement-trigger slice. |
| 3 | L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION - Promote Sacred Weapon activation, Channel Divinity spend, and held weapon binding | done | none | Established activation/effect binding. |
| 4 | L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT - Promote Sacred Weapon attack bonus, Radiant choice, light, and lifecycle cleanup | done | L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION | Consumes the activation/effect binding from Task 3. |
| 5 | L3CF-05-ROGUE-FAST-HANDS-BATTLE-CLOSURE-AUDIT - Close or promote Fast Hands battle-owned delegated action economy | done | none | Closed as deterministic admission metadata with table/tool-check, Utilize, and magic-item activation owners responsible for the concrete Bonus Action spend when they consume the profile. |
| 6 | L3CF-06-CLASS-FEATURE-GOLDEN-LEDGER-CONSOLIDATION - Consolidate class-feature golden tracer bullet evidence and stale follow-ups | ready-for-implementation | L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES, L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT, L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION, L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT, L3CF-05-ROGUE-FAST-HANDS-BATTLE-CLOSURE-AUDIT | All class-feature slices are closed; consolidation can now reconcile the golden ledger and remaining explicit table-owned closures. |

## Global Acceptance Criteria

1. Read `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` before modeling
   any rule.
2. If the feature behavior enters a battle or character reducer, it must have
   a matching QNT witness and focused runtime or MBT replay in the same task.
3. If a clause is table-owned or outside battle runtime, do not add QNT. Record
   an explicit closure disposition instead.
4. Runtime code must consume typed support profiles, battle state, selected
   options, resources, and caller-supplied facts. Do not dispatch on Unit id,
   class name, subclass name, source section, or authored spell/feature name.
5. Do not add duplicate resource, movement, attack, weapon, or light state.
   Reuse existing owners or stop with a typed blocked disposition.
6. Update `profiles.jsonl`, `unit-claims.jsonl`, `unit-evidence.jsonl`, and
   generated reports only to match behavior actually promoted or closed.

## Concurrent Ralph Constraints

Multiple Ralph lanes may run at the same time. Treat MBT as a global scarce
resource across all worktrees. Any MBT command must be wrapped in:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside that lock, still run the AGENTS MBT precheck for existing `vitest` and
`quint_evaluator` processes. Never run broad exploratory MBT.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm check:mbt-driver-closure
```

When QNT owner rows or Unit/profile ledgers change, also run the write/read
coverage pair:

```sh
pnpm rules-kernel-coverage:check -- --write
pnpm rules-kernel-coverage:check
pnpm unit-profile-coverage:check -- --write
pnpm unit-profile-coverage:check
```

For reducer behavior, add focused runtime tests and focused QNT/MBT parity.
Run reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
language, architecture/connascence, and code-review passes until no reasonable
findings remain.

### Task 1 - L3CF-01-FIGHTER-REMARKABLE-ATHLETE-ROLL-MODES

Status: `done`

Promote the roll-mode portion of `fighter_remarkable_athlete`.

Required behavior:

- consume admitted `unit-feature.remarkable-athlete` support profile;
- project Advantage for Initiative;
- project Advantage for Strength (Athletics) Ability Checks;
- reject adjacent/synthetic unsupported shapes through existing support gates;
- avoid duplicating initiative or ability-check state.

Expected outputs:

- focused QNT witness for Initiative and Strength (Athletics) roll modes;
- runtime implementation through existing initiative and ability-check owners;
- selected-identity replay for `fighter_remarkable_athlete`;
- focused runtime tests and focused MBT/parity;
- coverage ledger updates.

Out of scope:

- post-critical half-Speed movement;
- Opportunity Attack interaction;
- other Champion features.

### Task 2 - L3CF-02-FIGHTER-REMARKABLE-ATHLETE-CRITICAL-MOVEMENT

Status: `done`

Promote the post-Critical Hit movement clause of Remarkable Athlete.

Required behavior:

- detect an attack Critical Hit by a combatant with the admitted profile;
- expose or execute immediate movement up to half Speed;
- consume existing movement and Opportunity Attack owners;
- prove no movement is granted for non-critical hits or missing profile.

Expected outputs:

- QNT/parity for critical-hit trigger, half-Speed cap, and rejection cases;
- runtime tests for movement grant/use and cleanup;
- selected-identity replay extension for `fighter_remarkable_athlete`;
- honest ledger update.

### Task 3 - L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION

Status: `done`

Promote Sacred Weapon activation up to the active-effect boundary.

Required behavior:

- consume admitted `unit-feature.paladin-sacred-weapon` profile;
- discover the Attack-action activation only with an available Channel Divinity
  use and eligible held Melee weapon;
- spend one Paladin Channel Divinity use;
- bind one active effect to the selected held weapon without duplicating item
  state.

Expected outputs:

- QNT/parity for activation, resource spend, weapon rejection, and recast gate;
- runtime tests;
- selected-identity replay for `paladin_sacred_weapon`.

### Task 4 - L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT

Status: `done`

Promote Sacred Weapon effects after activation.

Required behavior:

- apply Charisma attack-roll bonus with minimum 1 to the bound weapon;
- allow normal or Radiant damage choice where the admitted profile permits it;
- project Bright/Dim light from the bound weapon;
- end the effect on dismissal, recast, or no longer carrying the weapon.

Expected outputs:

- QNT/parity for attack bonus, damage type choice, light projection, cleanup;
- focused runtime and selected-identity replay updates.

### Task 5 - L3CF-05-ROGUE-FAST-HANDS-BATTLE-CLOSURE-AUDIT

Status: `done`

Audit whether any Fast Hands delegated action-economy clause is genuinely owned
by battle runtime today.

Required behavior:

- read RAW and current `unit-feature.bonus-action-delegated-standard-actions`;
- decide whether battle owns a Bonus Action delegation shell independent of
  table-owned lock/trap/pocket/utilize/item effects;
- if yes, promote only the action-economy shell with QNT and selected identity;
- if no, update closure text so no table-only clause pretends to need QNT.

Expected outputs:

- either a promoted reducer/QNT tracer bullet or a precise closure disposition;
- no item/object state invented for Fast Hands.

Closure result:

- no independent battle-owned Bonus Action shell was promoted;
- lock, trap, and pocket procedures remain table/tool-check owned;
- generic Utilize object effects remain owned by a future Utilize action owner;
- magic-item Magic action activation remains owned by a future magic-item
  activation owner.

### Task 6 - L3CF-06-CLASS-FEATURE-GOLDEN-LEDGER-CONSOLIDATION

Status: `ready-for-implementation`

Consolidate class-feature ledger state after Tasks 1-5.

Required behavior:

- remove stale follow-up text for behavior now promoted;
- keep remaining table-owned closures explicit;
- run coverage write/read checks;
- summarize any remaining class-feature lvl3 non-golden gaps.

Expected outputs:

- generated coverage artifacts match source claims;
- no new runtime behavior unless tied to QNT in a previous task.
