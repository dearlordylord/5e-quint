# SRDINV48 Recursive Planning Review

Task 241 reviewed SRDINV42-SRDINV47 and refreshed the generated SRD Unit
inventory after the movement/action Surface widening batch.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-present` rows: 144
- Level-1 `non-runtime` rows: 12
- Spell Unit `catalog-installed-owner-evidence-present` rows: 97
- Spell Unit `catalog-installed-owner-evidence-required` rows: 19
- Spell Unit `needs-surface-widening` rows: 15
- Spell Unit `catalog-only/dead-for-now` rows: 80
- Unique Spell Unit ids with owner evidence required: 7
- Unique Spell Unit ids still needing Surface widening: 8
- Unique Spell Unit ids kept catalog-only/dead-for-now: 26

Unit matrix metrics after the same refresh:

- Installed collection inventory count: 130 Units
- Authored Surface Unit catalog admission: 129/422, 30.6%
- Authored Surface executable catalog admission: 105/355, 29.6%
- Installed Unit profile classification coverage: 130/130, 100%
- Supported executable Unit coverage: 63/106, 59.4%
- QNT profile modeling coverage: 42/42, 100%
- QNT proof coverage: 40/42, 95.2%
- Runtime mapping coverage: 42/42, 100%
- Runtime parity coverage: 42/42, 100%
- Deterministic admission/projection coverage: 59/63, 93.7%
- Selected identity MBT coverage: 10/63, 15.9%

SRDINV42-SRDINV47 moved Command, Dissonant Whispers, Thunderwave,
Expeditious Retreat, Jump, and Feather Fall out of Surface-widening pressure.
They are now installed Spell Definitions with owner-evidence-required runtime
pressure. Catalog admission remains deliberately insufficient as a support
claim.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Command and
  Dissonant Whispers.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Expeditious Retreat,
  Feather Fall, and Jump.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Thunderwave.
- `.references/srd-5.2.1/Playing-the-Game.md` for Reaction timing, Movement
  and Position, Dash, movement budget spending, Difficult Terrain, and
  Opportunity Attack timing.
- `.references/srd-5.2.1/Rules-Glossary.md` for Cube, Dash, Falling, Jumping,
  Magic Action, Object, Opportunity Attacks, Prone, Reaction, and Speed.

`UBIQUITOUS_LANGUAGE.md` was checked for Saving Throw, Magic Action, Reaction,
Spell Definition, Spell Invocation, Spell Effect, Spell Slot, Movement, Speed,
Opportunity Attack, Falling, Prone, Target, Creature, Object, and Area of
Effect.

## Review Findings

- Command now has typed Surface facts for its named options, but runtime
  execution remains too broad to promote in one task without research. The
  route-bearing options, held-item drop, Prone application, action suppression,
  and turn-ending clauses are separate execution invariants.
- Expeditious Retreat is the smallest runtime follow-up because its executable
  pressure is Dash access over existing Speed and Movement budget vocabulary.
  It should establish the shared movement-budget boundary before Jump or
  Dissonant Whispers consumes it.
- Thunderwave can be promoted before generic pathfinding if the runtime accepts
  caller-supplied push legality and final-position facts. Object push and
  audible-boom outcomes must be evidence-bearing results, not object inventory
  or sound propagation simulation.
- Dissonant Whispers should wait for the Dash/Movement budget boundary. Its
  safest route remains caller/table-owned; Opportunity Attack eligibility
  derives from the target moving using its Reaction.
- Jump should also wait for the Dash/Movement budget boundary. The spell-owned
  executable facts are duration, target count, once-per-turn use, and the
  10-foot Movement spend for up to 30 feet of jump movement. Landing legality,
  jump arc, and Difficult Terrain landing checks remain caller-supplied.
- Feather Fall still needs research before runtime promotion because the repo
  does not yet have a promoted falling hazard boundary. The research should
  decide whether table-supplied falling and landing facts are sufficient or
  whether fall-distance/damage lifecycle needs a separate prerequisite.

## Appended Batch

SRDINV48 selects a runtime frontier for the movement/action Spell Definitions
that SRDINV42-SRDINV47 made expressible:

- `SRDINV49`: promote Expeditious Retreat Dash runtime. This is the smallest
  movement/action runtime slice and should establish the Movement budget
  contract used by later tasks.
- `SRDINV50`: research Command option runtime split. This must produce
  Ralph-sized follow-up tasks if all named options do not fit one executable
  support contract.
- `SRDINV51`: promote Thunderwave push runtime boundary with caller-supplied
  push facts, unsecured-object push disposition, and audible-boom evidence.
- `SRDINV52`: promote Dissonant Whispers forced Reaction movement after
  SRDINV49, preserving caller/table ownership of safest-route facts.
- `SRDINV53`: promote Jump movement replacement after SRDINV49, preserving
  caller/table ownership of jump arc, landing, and Difficult Terrain facts.
- `SRDINV54`: research Feather Fall falling runtime boundary before promotion.
- `SRDINV55`: recursive review after the movement/action runtime batch lands.

Remaining Surface blockers such as Fire Bolt object ignition, Fog Cloud, Hex,
Hideous Laughter, Sanctuary, Shillelagh, Sorcerous Burst, and Spare the Dying
remain counted for SRDINV55 or later batches.

## /simplify Convergence

- Round 1: rejected an omnibus runtime batch for all six widened spells.
  Command and Feather Fall need research; Dissonant Whispers and Jump should
  wait for the movement-budget boundary.
- Round 2: rejected storing route, pathfinding, push geometry, landing
  geometry, fall distance, or sound propagation as battle-runtime state. The
  appended tasks keep those facts caller/table-owned and executable only at
  the boundary where the runtime consumes them.
