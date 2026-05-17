# Speed and Movement Cost Algebras Plan

Date: 2026-05-07

## Goal

Extract creature Speed capacity calculation and Movement cost calculation into
shared, reusable algebras so battle and future adventuring/chase runtimes can
calculate at their own procedure boundaries without duplicating rule logic.

Speed is a creature statistic. Movement cost is a rule/table fact about how
movement is spent through an activity or space. Battle legality, travel
legality, pathfinding, and procedure state remain owned by the consuming
runtime.

## Package Decision

Use existing `@dnd/shared-algebras`; do not create a new package.

Rationale:

- `@dnd/shared` already owns scalar/domain vocabulary such as `MovementFeet`,
  `MovementDeltaFeet`, and `SpeedType`.
- `@dnd/shared-algebras` already owns reusable semantic algebras and
  rule-core proof material consumed by runtime packages.
- Creating `@dnd/rules-core` now would duplicate the existing package boundary
  rather than clarify ownership.

Add a durable comment next to `SPEED_TYPES` in `@dnd/shared/game-facts`:
`"walk"` is the code-facing kind for the SRD's ordinary Speed, not a separate
walk/run mode. It aligns with ASSUMPTIONS.md A41.

## Domain Model

### Speed Algebra

Add `@dnd/shared-algebras/speed-algebra`.

Responsibilities:

- compute represented creature Speed capacities by `SpeedType`;
- apply ordinary Speed changes to special speeds according to RAW;
- model terminal Speed constraints such as "Speed 0 and can't increase";
- collapse same-kind special speed candidates by taking the best resulting
  capacity;
- keep source/provenance labels out of runtime behavior unless an explain
  helper is added later.

Out of scope:

- Movement budget, Dash budget, movement spent, and special-speed switching
  during a turn;
- movement legality;
- terrain, water, climbing surface, pathfinding, and table geometry;
- adventuring travel pace.

Important rules:

- Use shared `SpeedType = "walk" | "fly" | "swim" | "climb" | "burrow"`.
- `walk` means ordinary SRD Speed in code.
- `equalToSpeed` candidates resolve to final modified ordinary Speed.
- Fixed special speed candidates receive global Speed changes, then same-kind
  candidates are maxed.
- Multiple same-kind speed sources do not add together.
- Terminal "Speed 0 and can't increase" is a domain constraint, not a numeric
  delta.

### Movement Cost Algebra

Add `@dnd/shared-algebras/movement-cost-algebra`.

Responsibilities:

- compute Movement cost from established facts;
- encode immutable RAW cost factors such as climbing, swimming, crawling,
  squeezing, Difficult Terrain, and grapple drag;
- distinguish distance covered from Movement cost spent.

Out of scope:

- deciding whether a path or activity is available;
- deciding whether a creature has enough Movement remaining;
- opportunity attack legality;
- battle map/pathfinding/spatial derivation;
- travel pace or chase procedure state.

Important rules:

- Accept shared `SpeedType` for the speed kind being used.
- Allow simultaneous cost factors, not a single activity enum.
- Difficult Terrain contributes at most one extra foot per foot and is not
  cumulative with itself.
- Climbing surcharge applies unless using `climb`.
- Swimming surcharge applies unless using `swim`.
- Crawling and squeezing each contribute their own surcharge when established.
- Grapple drag contributes a battle-established extra cost per foot.

## Battle Integration

Refactor `@dnd/battle-runtime` so battle owns only battle-local procedure facts:

- current actor and turn resources;
- Dash bonus;
- movement distance already covered during the current move;
- Movement cost spent during the turn;
- active conditions/effects projected into speed facts;
- grapples projected into speed constraints and cost facts;
- supported battle speed subset;
- movement holes/fills and opportunity attack continuations.

Battle should call shared algebras for:

- effective creature Speeds by kind;
- Movement cost for an already-established movement activity/path.

Battle should keep its current supported subset as `walk | climb | swim` until
fly/burrow execution is actually modeled. The shared algebra should support all
SRD speed kinds immediately.

## Future Adventuring/Chase Integration

A future adventuring/chase runtime can duplicate calculation sites without
duplicating calculation logic:

- build `CreatureSpeedFacts`;
- call `speed-algebra`;
- apply travel/chase-specific legality, timing, pace, mount, vehicle, terrain,
  and exhaustion consequences locally.

No adventuring runtime is part of this changeset.

## Implementation Phases

### Phase 1: Shared Vocabulary Comment

- Update `packages/shared/src/game-facts.ts` near `SPEED_TYPES`.
- No behavior change.

### Phase 2: Speed Algebra

- Add `packages/shared-algebras/src/speed-algebra.ts`.
- Export it from `packages/shared-algebras/package.json`.
- Add focused deterministic tests.

Test cases:

- ordinary base Speed only;
- fixed special speed;
- Roving-style `climb` and `swim` equal to final Speed;
- Fast Movement-style global `+10` applying to ordinary and special speeds;
- same-kind candidates collapse by max, not sum;
- terminal Speed 0 prevents increases;
- all shared `SpeedType` variants are accepted at the algebra boundary.

### Phase 3: Movement Cost Algebra

- Add `packages/shared-algebras/src/movement-cost-algebra.ts`.
- Export it from `packages/shared-algebras/package.json`.
- Add focused deterministic tests.

Test cases:

- ordinary movement costs 1 foot per foot;
- Difficult Terrain costs 2 per foot and is not cumulative;
- climbing without `climb` costs extra;
- climbing using `climb` avoids climbing surcharge;
- swimming without `swim` costs extra;
- swimming using `swim` avoids swimming surcharge;
- crawling and squeezing add their own cost factors;
- simultaneous factors compose predictably;
- distance covered and Movement cost are both present in the result.

### Phase 4: Battle Speed Refactor

- Replace local battle speed math in `battle-reducer.ts` with calls to
  `speed-algebra`.
- Keep battle-specific support gates and supported speed subset local.
- Project character Unit support profiles and stat-block speeds into shared
  speed facts rather than maintaining battle-only speed derivation logic.
- Preserve current Roving behavior from commit `779feecd`.

### Phase 5: Battle Movement Cost Refactor

- Replace local movement cost arithmetic that belongs to RAW cost factors with
  `movement-cost-algebra`.
- Keep battle legality and spatial fact establishment in `battle-runtime`.
- Introduce explicit distance-vs-cost state only where required by current
  special-speed switching behavior.

## RAW References

Before implementing, re-read and cite these local corpus passages in code tests
or plan closeout notes:

- `.references/srd-5.2.1/Rules-Glossary.md` "Speed"
- `.references/srd-5.2.1/Rules-Glossary.md` "Dash [Action]"
- `.references/srd-5.2.1/Rules-Glossary.md` "Difficult Terrain"
- `.references/srd-5.2.1/Rules-Glossary.md` "Climbing" and "Climb Speed"
- `.references/srd-5.2.1/Rules-Glossary.md` "Swimming" and "Swim Speed"
- `.references/srd-5.2.1/Playing-the-Game.md` "Movement and Position"
- `.references/srd-5.2.1/Classes/Ranger.md` "Roving"
- `UBIQUITOUS_LANGUAGE.md` "Movement"
- `ASSUMPTIONS.md` A41

## Verification

- RAW/ubiquitous-language reviewer check: confirm all modeled Speed and Movement cost rules trace to
  the listed SRD 5.2.1 passages and `UBIQUITOUS_LANGUAGE.md`; do not browse
  external rules sources.
- Run focused deterministic tests:
  `pnpm --filter @dnd/shared-algebras test:deterministic`
- Run package typechecks:
  `pnpm --filter @dnd/shared typecheck`
  `pnpm --filter @dnd/shared-algebras typecheck`
  `pnpm --filter @dnd/battle-runtime typecheck`
- Run targeted battle tests affected by Roving/Fast Movement/movement:
  `pnpm --filter @dnd/battle-runtime test -- src/unit-profile-admission.test.ts src/index.test.ts src/rule-core-movement.mbt.test.ts`
- Run battle MBT only after battle integration is complete, and only once:
  `cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/battle-runtime.mbt.test.ts`
- reviewer loop convergence: run at least 2 rounds immediately after
  implementation. Continue until each round finds fewer issues and no important
  fixes remain.

## Non-Goals

- No new adventuring, chase, travel, map, or pathfinding runtime.
- No fly/burrow battle execution.
- No non-SRD species such as Tabaxi in this changeset.
- No broad battle MBT for exploratory questions.
