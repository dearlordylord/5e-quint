# Plan: QNT Domain Concepts For Cleanroom Harness

This is a source-side planning document for future cleanroom harness work. It
records domain concepts that should become visible in QNT obligations,
cleanroom task artifacts, reviewer checks, or decider gates. It is not active
target-run instruction until the corresponding scaffold/templates are updated.

The goal is not to add prose for its own sake. The goal is to make the
cleanroom work shape force a target implementation to rediscover the same
domain model as the source repo: fact ownership, hole/fill frontiers, runtime
projection, support-profile admission, and state ownership across creation,
sheet, battle, and handoff layers.

## 1. Hole, Fill, And Witness Ownership

Holes are reducer-discovered requirements, not generic missing parameters.
Fills and witnesses supply facts owned outside the reducer when the domain says
the table, caller, roll, or chosen option owns that fact.

Harness pressure:

- Classify each relevant hole as `semantic-frontier` or `table-owned-fact`.
- Require target evidence that table-owned facts are consumed at the frontier
  rather than persisted as durable reducer state.
- Require task artifacts to name which fills change reducer legality or
  downstream effects.

Good target shape: target allocation is supplied as a fill; the reducer
validates allocation and applies damage.

Bad target shape: the reducer silently chooses targets or stores durable
pairwise `canSeeTarget` or `distanceToTarget` state.

## 2. Source Fact, Table Witness, And Runtime Projection

Durable source facts, table witnesses, and runtime projections are different
owners. Light emitters and obscurement zones can be durable source facts. Sight,
cover, path, area membership, distance, occupancy, and similar spatial facts are
table witnesses at the point a rule consumes them.

Harness pressure:

- Extend state-owner artifacts to distinguish durable source facts,
  witness-only facts, and runtime projections.
- Require table/spatial witness tasks to show that fills carry only table facts
  and cannot restate or override authored RAW constants.
- Reject target implementations that introduce map geometry, pathfinding,
  line-of-sight, or pairwise visibility state as reducer-owned facts unless a
  future source-side decision widens that model.

Good target shape: Fog Cloud creates an `ObscurementZone`; attack resolution
consumes a per-action sight witness.

Bad target shape: battle runtime owns a geometry map or a durable visibility
matrix.

## 3. Support-Profile Admission

Executable support comes from parsed shape, support-profile readers, typed
procedure facts, and explicit selected facts. It does not come from authored
identity dispatch.

Harness pressure:

- Require selected-identity tasks to show how behavior is admitted through
  support-profile facts.
- Require review/decider checks for reducer branches on spell, feature, class,
  monster, source-section, or official catalog names.
- Keep narrow, documented admission exceptions visible as debt instead of
  teaching a general pattern.

Good target shape: a spell is admitted as a direct-damage profile with target
cardinality and damage projection facts.

Bad target shape: executable reducer code says `if spell.id ==
"magic_missile"`.

## 4. Result Taxonomy

Resolved state, requested holes, and typed invalid outcomes are separate
results. Incompleteness is not invalidity, and ordinary invalid domain input is
not an exception.

Harness pressure:

- Require target replay evidence to classify outcomes as resolved, needs-holes,
  or typed invalid.
- Prefer typed protocol/result variants over stringly scenario labels where the
  source QNT is ready for that migration.
- Reject implementations that collapse current-frontier requests and invalid
  fills into one generic error path.

Good target shape: `NeedsHoles({ SpellTargetAllocation })`.

Bad target shape: `Error("missing target")` for a normal table-decision
frontier.

## 5. Procedure Lifecycle And Replay Protocol

End-state projection is not enough. Relevant procedures have stages such as
discovery, fill, rejection, interrupt, resume, replay-from-root, cleanup, and
settlement.

Harness pressure:

- Tag each driver/task with the lifecycle stages it covers.
- Require target evidence that stages are implemented through reusable engine
  behavior, not only final projection special cases.
- Keep replay adapters quarantined from production modules.

Good target shape: a reaction task records suspended continuation and resumes
from fills.

Bad target shape: code directly mutates final damage after a reaction without
modeling the interrupt/resume path.

## 6. Runtime Occurrence State

Active effects and ongoing feature occurrences are first-class runtime state.
They carry mutable execution facts such as source key, selected runtime choice,
expiration, and cleanup state. They are not authored records and should not
duplicate Surface mechanics.

Status: accepted as a tentative concept. It needs more shaping before becoming a
hard harness gate.

Harness pressure:

- Ask state-owner artifacts what occurrence state was introduced, what owns
  cleanup, and which authored/static facts are deliberately not copied.
- Prefer cleanup/lifecycle evidence over broad metadata requirements.
- Avoid requiring every target to use the exact source repo occurrence names
  unless the QNT obligation already requires that vocabulary.

Good target shape: active effect stores source ref, expiry, and mutable selected
choice.

Bad target shape: active effect stores display name, full source mechanics, and
derived support labels.

## 7. Character Draft, Build, Sheet, Battle, And Handoff Ownership

This is a lifecycle stack, not one flat `Character` object.

- Character Draft is mutable character-creation session state with holes,
  fills, revisions, selected options, and possible incompleteness. It is not
  authored content and not in-play state.
- Character Build is the finalized build-only output from a complete legal
  draft. It stores durable build facts and non-derivable choices such as
  progression, origin identity, selected Unit refs, spellcasting choices,
  equipment, and loadout refs. It does not store current HP, spent resources,
  Hit Dice remaining, or battle state.
- Character Sheet is in-play player-character state initialized from a build.
  It owns current HP, Temporary Hit Points, conditions, spent Hit Dice, rest
  feature uses, spell slot expenditure, created slots, Pact Slot expenditure,
  retained companions, and other adventuring/session state.
- Battle Creature Init and Battle State are combat projections. Battle consumes
  creature-facing facts; it does not own draft/build legality or sheet session
  state.
- Character Battle Handoff and settlement project sheet state into battle and
  settle accepted battle-owned deltas back into the same sheet identity.

Harness pressure:

- Character-creation tasks should force draft holes, fills, revision checks,
  atomic batch acceptance/rejection, and finalization gates.
- Character-sheet tasks should force in-play resource, rest, and session-state
  ownership while deriving capacities from build/catalog facts.
- Battle-handoff tasks should force projection and settlement without letting
  battle become a character builder or sheet store.

Good target shape: rejected draft fills leave the original draft and revision
unchanged; `CharacterBuild` excludes current HP and spent resources; settlement
rejects identity mismatch, maximum-HP drift, slot-capacity drift, and unsupported
handoff states.

Bad target shape: one struct stores draft choices, finalized build facts,
current HP, battle initiative, selected combat targets, and encounter resources.

## 8. Authored Identity, Provenance, And Runtime Projection

Provenance, structured input, authored identity, and executable runtime
projection are distinct. Runtime semantics should not dispatch on authored
names, ids, slugs, source headings, page refs, or official catalog labels.

Harness pressure:

- Keep authored-identity-dispatch checks in reviewer and decider gates.
- Prefer synthetic identity in cleanroom examples where SRD identity is not the
  point of the obligation.
- Require support-profile admission to flow through typed facts rather than
  catalog names.

Good target shape: provenance says SRD; runtime dispatch uses typed procedure
facts.

Bad target shape: runtime behavior branches on official spell, class, feature,
or monster names.

## 9. Encounter Relationships And Encounter Side

The repo does not store a full ally/enemy matrix. It stores a caller-supplied
`BattleCombatantSide` on each combatant and currently projects encounter
relationships from side equality:

- same side means allies for the current encounter;
- different side means enemies for the current encounter.

Encounter Side is battle setup state. It is not SRD content provenance, not
Creature Type, and not player-vs-monster origin. It exists because SRD rules
refer to allies, enemies, and hostile creatures, and those relationships cannot
be safely derived from whether a creature came from a Character Sheet or a Stat
Block. Friendly monsters, hostile characters, companions, summons, and NPCs make
origin-based inference wrong.

Current uses include Help ally/enemy picks, Initiative Swap's willing same-side
ally, adjacent-ally branches, enemy-reduced-to-0 features, and caster-or-ally
cleanup triggers.

Harness pressure:

- Require target implementations to take encounter relationship facts from
  setup/projection state, not from provenance or authored identity.
- Keep current QNT cleanroom expectations at the side-equality model unless a
  future source-side decision widens the relationship model.
- Record a blocker or new source-side modeling task if a rule needs neutrality,
  per-pair hostility, charm-specific relationship changes, or temporary faction
  overrides.

Good target shape: combatants carry side ids; same-side effects use ally
semantics; different-side effects use enemy semantics.

Bad target shape: `origin.kind == "character"` means ally, or `origin.kind ==
"statBlock"` means enemy.

## Later Harness Work

These concepts should become enforceable only where the source QNT/task corpus
can carry them without turning the harness into prose theater. Likely next
steps:

1. Add concept tags to source branch inventory or adjacent cleanroom task
   metadata.
2. Extend `STATE_OWNER_MANIFEST` around source fact, witness fact, projection,
   occurrence state, build evidence, sheet state, and battle state.
3. Extend reviewer/decider templates with focused checks for the concepts above.
4. Add synthetic harness fixtures that fail on identity dispatch, redundant
   state, collapsed result taxonomy, table-fact persistence, and character
   layer conflation.
5. Rerun a cleanroom shakedown after the scaffold learns these checks.
