# SRDINV29F Chromatic Orb Chained Attack Research

Task: SRDINV29F

## Decision

Do not claim promoted `chromatic_orb` support from the existing
`spellAttackDamage` procedure.

Chromatic Orb needs a separate chained spell attack procedure. The procedure is
not just a spell attack with a damage-type choice: the previous damage roll
controls whether another target choice is legal, each leap has a fresh attack
roll and damage roll, target choices are unique for the whole Spell Invocation,
and the maximum number of leaps is derived from the expended Spell Slot level.

The implementation should be split before promotion. A single vertical slice is
possible only if it introduces the whole replay shape, reducer procedure, QNT
parity, deterministic admission evidence, and focused tests together. That
would be larger than the recent SRDINV29 slices because it changes the fill
protocol itself.

## RAW And Language Check

Local SRD 5.2.1 `Spells/Descriptions-A-D.md`, "Chromatic Orb" says:

- the caster chooses Acid, Cold, Fire, Lightning, Poison, or Thunder;
- the caster makes a ranged spell attack against the target;
- on a hit, the target takes `3d8` damage of the chosen type;
- if two or more d8s show the same number, the orb leaps to a different target
  of the caster's choice within 30 feet of the target;
- the caster makes an attack roll against the new target and makes a new damage
  roll;
- a level 1 casting cannot leap again;
- using a higher-level Spell Slot adds `1d8` damage per slot level above 1,
  lets the orb leap a maximum number of times equal to the slot level expended,
  and forbids targeting a creature more than once in the same casting.

Local SRD 5.2.1 `Rules-Glossary.md` defines Attack Roll, Damage Roll, Critical
Hit, Damage Types, and Target. `Playing-the-Game.md` confirms that spell damage
rolls use the dice named by the spell and that Critical Hits double an attack's
damage dice.

`UBIQUITOUS_LANGUAGE.md` distinguishes Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Attack, Base Spell Level, Cast Level, and Using
a Higher-Level Spell Slot. The chain state belongs to the Spell Invocation
replay. It is not provenance, Spell Access, or durable Spell Effect state.

## Current Code Shape

`packages/surface/content/chromatic_orb.dhall` already preserves the authored
shape: primary target hole, damage-type choice hole, `same_choice_as` damage
type for leap damage, `damage_roll_has_duplicate_faces`, slot-level leap cap,
and same-casting target exclusion.

The promoted battle-runtime support boundary does not admit that shape:

- `supportedSpellAttackDamageProfile` admits one activation phase only when the
  hit damage has a fixed string damage type and no continuation.
- `SpellInvocationRef` currently identifies spell id, slot level, and procedure
  only. It should not grow a damage-type field for this task; the damage type is
  a fill value for one Spell Invocation, not stable subject identity.
- `spellFillSet` normalizes at most one target, one attack roll, and one damage
  roll for a selected spell subject. Chromatic Orb needs ordered per-step
  target, attack, and damage fills.
- Current spell damage holes are keyed by spell id and damage expression, not
  by chain step. Reusing them would make repeated damage rolls ambiguous.
- Current target validation can check caster-to-target range for the initial
  target. The leap also needs a table-supplied spatial fact from the previous
  target to the candidate target.
- Existing repeated damage allocation is not a fit. Magic Missile-style
  allocation resolves repeated automatic effects in one damage roll; Chromatic
  Orb branches after each hit and damage roll.

## Restore-Source Findings

The deleted Core/prototype `spell-evocation.ts` only kept Chromatic Orb damage
scaling and allowed damage types. It did not model the chained replay.

The deleted `runtime-holes.test.ts` did establish useful projection lessons:
Chromatic Orb's primary target, attack roll, and damage-type holes were
projectable, and repeated continuation phases need step-scoped hole identity
such as `continuation:1`. That direction still applies, but the promoted
runtime should not restore the deleted projected-action vocabulary.

The deleted `MBT_TO_REDUCER_GRAPH.md` reinforces the current promoted boundary:
MBT should prove reducer procedures over reducer-facing facts, while Surface
projection is covered by deterministic support/admission tests. Chromatic Orb
should follow that split.

## Required Runtime Shape

Add a new spell procedure family such as `chainedSpellAttackDamage`.

The parsed supported invocation should carry these facts, derived from the
authored Spell Definition and selected slot level:

- access/resource: prepared Spell Access and expended Spell Slot level;
- attack kind and spell attack bonus;
- initial target range from caster;
- damage expression after slot scaling;
- allowed damage-type choices from the authored choice hole;
- continuation gate: duplicate faces in the just-resolved d8 damage roll with
  minimum multiplicity 2;
- maximum leap count: selected Spell Slot level;
- leap target relation: caller-supplied candidate is within 30 feet of the
  previous target;
- target uniqueness: no CombatantId appears twice in the chain.

The selected damage type should be a dedicated runtime fill, validated against
the invocation's authored choice options and then reused by every damage
application in the chain. Do not copy that choice into `SpellInvocationRef`.

The replay should parse ordered chain steps rather than parallel singleton
target/attack/damage fields. A step should be identified by chain index and
contain the target fill, attack roll fill, and optional damage roll fill for a
hit. The reducer should derive which next hole is legal from the previous fills:

1. no damage-type fill: ask for the damage-type choice;
2. no step 0 target: ask for the primary target;
3. target chosen, no attack roll: ask for that step's attack roll;
4. hit with no damage roll: ask for that step's damage roll;
5. damage roll has no duplicate d8 face: resolve and spend resources;
6. duplicate exists but leap budget is exhausted: resolve and spend resources;
7. duplicate exists and leap budget remains: ask for the next step target,
   excluding already targeted combatants and requiring previous-target
   30-foot spatial facts.

Critical Hits should double only that step's attack damage dice before checking
damage and Concentration consequences. The duplicate-face gate should inspect
the actual d8 face results for the step's damage roll, after critical doubling
has increased the number of rolled d8s.

Reaction and lifecycle composition should mirror existing spell attack damage:
open spell-cast and attack-hit reaction windows where the existing procedures
do, ask Concentration and zero-HP replacement holes per damaged target, and open
after-damage reaction windows in step order. Spending the Magic action and Spell
Slot should happen once, when the whole Spell Invocation resolves.

## Suggested Split

1. **SRDINV29F1 - Model chained spell attack replay facts.**
   Add QNT procedure facts and replay-hole invariants for damage-type choice,
   ordered steps, duplicate-face detection, target uniqueness, previous-target
   range, and slot-level leap cap. No Surface admission claim yet.

2. **SRDINV29F2 - Implement chained spell attack runtime procedure.**
   Add the battle-runtime subject/ref procedure, step-scoped holes/fills,
   resolver, damage application, resource spend, reaction-window composition,
   and focused runtime tests with synthetic authored records plus Chromatic Orb.

3. **SRDINV29F3 - Admit Chromatic Orb and close evidence.**
   Parse `packages/surface/content/chromatic_orb.json` through the new support
   profile, add deterministic admission/projection evidence, update
   `unit-claims.jsonl`, `unit-evidence.jsonl`, generated matrix/report
   artifacts, `packages/battle-runtime/README.md`, and
   `packages/battle-runtime/ARCHITECTURE_GRAPH.md`, then run the appropriate
   focused tests and Tier 1 battle-runtime MBT.

This keeps invalid partial support unrepresentable: until the ordered replay
procedure exists, `chromatic_orb` remains authored executable pressure rather
than a supported runtime Spell Definition.

## Verification For Implementation Tasks

Implementation tasks should verify:

- RAW trace to local SRD 5.2.1 Chromatic Orb, Attack Roll, Damage Roll, Critical
  Hit, Damage Types, Target, and Using a Higher-Level Spell Slot text;
- `UBIQUITOUS_LANGUAGE.md` terms listed above;
- focused QNT proof for the chained replay procedure;
- focused reducer tests for no duplicate, duplicate with exhausted leap budget,
  duplicate opening a leap target hole, target uniqueness rejection,
  previous-target 30-foot rejection, miss stopping the chain, Critical Hit dice
  doubling, damage-type reuse, Concentration follow-up, zero-HP disposition,
  and one action/slot spend;
- deterministic admission/projection tests proving old `spellAttackDamage` and
  `saveGatedDamage` subjects are not widened by a damage-type choice ref;
- `pnpm unit-profile-coverage:check` after evidence updates;
- Tier 1 battle-runtime MBT only after the promoted runtime behavior changes;
- `pnpm quality`;
- `/simplify` convergence, minimum two rounds for implementation slices.
