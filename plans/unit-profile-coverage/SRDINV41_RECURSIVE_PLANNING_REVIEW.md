# SRDINV41 Recursive Planning Review

Task 231 reviewed SRDINV34-SRDINV40 plus SRDINV38A-SRDINV38C and refreshed
the generated SRD Unit inventory.

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
- Spell Unit `catalog-installed-owner-evidence-required` rows: 1
- Spell Unit `needs-surface-widening` rows: 33
- Spell Unit `catalog-only/dead-for-now` rows: 80
- Unique Spell Unit ids with owner evidence present: 43
- Unique Spell Unit ids with owner evidence required: 1
- Unique Spell Unit ids still needing Surface widening: 14
- Unique Spell Unit ids kept catalog-only/dead-for-now: 26

The review found one checker-visible dependency-batch gap that must remain
visible: Hellish Rebuke has focused runtime tests and package documentation
from SRDINV36, but the promoted focused battle-runtime QNT model does not yet own a
Hellish Rebuke or save-gated after-damage Reaction damage branch. SRDINV41
therefore keeps Hellish Rebuke as `catalog-installed-owner-evidence-required`
rather than promoting a QNT proof, completed runtime-parity claim, or supported
Unit profile.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Command and
  Dissonant Whispers.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Expeditious Retreat,
  Feather Fall, Grease, and Jump.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Thunderwave.
- `.references/srd-5.2.1/Playing-the-Game.md` for Dash, Reaction, movement,
  Difficult Terrain, forced movement and Opportunity Attack interaction.
- `.references/srd-5.2.1/Rules-Glossary.md` for Dash, Difficult Terrain,
  Falling, Jumping, Magic Action, Opportunity Attack, Prone, Reaction, Speed,
  and special speeds.

`UBIQUITOUS_LANGUAGE.md` was checked for Saving Throw, Magic Action, Reaction,
Readied Movement Response, Spell Definition, Spell Invocation, Spell Effect,
Spell Slot, Area of Effect, Movement, Speed, Difficult Terrain, Falling,
Prone, Target, Creature, Object, and Stat Block.

## Rejected Partial-Support Findings

- Charm Person's Friendly disposition, social interaction effects, and target
  knowledge when the spell ends are not battle-runtime state. They remain
  checker-visible deferred mechanics, but SRDINV41 does not plan a battle
  adapter for social/exploration memory.
- Grease's automatic Difficult Terrain movement-cost derivation remains a
  table-authored Movement boundary. The runtime now owns the timed hazard and
  save events; it still must not derive grid geometry, pathfinding, or movement
  costs from an area id.
- Sleep's executable non-sleeper auto-success remains visible until a durable
  non-sleeper fact is owned by a Stat Block or table-supplied fact boundary.

## Appended Batch

The next Surface frontier should not mix all remaining spell pressure into one
task. SRDINV41 selects the movement/action-control Surface blockers first
because they share Movement, Reaction, Dash, and Prone invariants but still
split cleanly by execution protocol:

- `SRDINV42`: Command option Surface model. This is a named-command effect
  grammar: Approach, Drop, Flee, Grovel, Halt, and slot-scaled targets.
- `SRDINV43`: Dissonant Whispers forced Reaction movement Surface model. This
  couples save-gated Psychic damage with target Reaction spend, safest-route
  movement, and no-reaction fallback.
- `SRDINV44`: Thunderwave push Surface model. This couples self-origin Cube
  save damage with creature push and unsecured-object push/noise facts.
- `SRDINV45`: Expeditious Retreat Dash-grant Surface model. This separates the
  immediate Dash on Bonus Action casting from ongoing Concentration-granted
  Bonus Action Dash.
- `SRDINV46`: Jump movement replacement Surface model. This is once-per-turn
  jump movement up to 30 feet by spending 10 feet of movement, with
  slot-scaled targets.
- `SRDINV47`: Feather Fall falling Reaction Surface model. This covers the
  falling trigger, up-to-five falling targets, fall-rate cap, fall-damage
  prevention, and per-target landing cleanup.
- `SRDINV48`: recursive review after the movement/action Surface batch lands.

Remaining Surface blockers such as Fire Bolt object ignition, Fog Cloud, Hex,
Hideous Laughter, Sanctuary, Shillelagh, Sorcerous Burst, and Spare the Dying
remain counted for SRDINV48 or later batches.

## reviewer loop Convergence

- Round 1: rejected the false Hellish Rebuke QNT proof/runtime-parity promotion
  and kept its inventory row owner-evidence-required until the authoritative
  QNT model owns the behavior.
- Round 2: rejected Charm Person social memory and Grease automatic geometry as
  battle-runtime implementation targets; both remain visible without adding
  duplicate state or grid/pathfinding ownership.
- Round 3: split the appended frontier by execution invariant rather than by
  spell list row. The batch is concrete and Ralph-sized, and SRDINV48 is the
  only recursive continuation.
