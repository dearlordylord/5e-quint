# SRDINV50 Command Option Runtime Split Research

Task 243 reviewed Command's failed-save next-turn option execution and split it
into runtime slices. No behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Command.
- `.references/srd-5.2.1/Playing-the-Game.md` for turns, Movement, object
  interaction timing, and end-turn vocabulary.
- `.references/srd-5.2.1/Rules-Glossary.md` for Object, Prone, Speed,
  Opportunity Attacks, and Utilize.
- `UBIQUITOUS_LANGUAGE.md` for Spell Definition, Spell Invocation, Spell
  Effect, Movement, Speed, Prone, Object, Action, Bonus Action, and Turn.

Relevant RAW facts:

- Command is an action-time, instantaneous level-1 Enchantment spell. On a
  failed Wisdom Saving Throw, the target follows the chosen command on its next
  turn.
- The named command grammar is closed: Approach, Drop, Flee, Grovel, Halt.
- Upcasting affects one additional creature for each slot level above 1.
- Approach and Flee require route facts. Approach names the shortest and most
  direct route toward the caster and ends the target's turn if it moves within
  5 feet. Flee requires moving away by the fastest available means for the
  target's turn.
- Drop requires dropping whatever the target is holding, then ending the turn.
  The battle runtime does not currently own a general held-object inventory.
- Grovel applies Prone, then ends the turn.
- Halt suppresses Movement, Action, and Bonus Action on the target's turn.

## Existing Runtime Boundary

The Surface record already models Command as a `command_target_next_turn`
failed-save atom with typed option facts. That is authored grammar only. It
does not choose an option at cast time, create a pending next-turn Spell Effect,
resolve route/pathfinding, identify held objects, suppress action resources,
or end the target's turn.

The promoted battle runtime already has reusable owners for parts of the
future implementation:

- action and Bonus Action resources live in `BattleTurnResources`;
- Movement budget spending is resolved by the runtime Movement command;
- Prone application exists through condition helpers and stand-from-Prone
  movement cost logic;
- end turn is a runtime command and is already the boundary for turn-end and
  next-turn processing;
- object target facts are caller/table supplied for spell object targeting, but
  held-object inventory mutation is not a promoted battle-runtime state owner.

## Split Decision

Command should not be promoted in one Ralph task. Its options have different
execution invariants and different ownership boundaries:

- the cast/save/pending-effect shell is shared by all options;
- Grovel is condition plus turn end;
- Halt is action-economy and Movement suppression for a full target turn;
- Drop is held-object disposition without a general inventory owner;
- Approach and Flee are caller-supplied route execution, not runtime
  pathfinding.

The implementation sequence should first add the shared Command invocation and
pending next-turn effect with one simple executable option, then add each
remaining invariant as a separate vertical slice.

## Follow-Up Tasks

### SRDINV50A - Command Invocation and Grovel Runtime

Promote the shared Command Spell Invocation shell and the Grovel option.

Scope:

- discover Command as a supported prepared spell without treating Surface
  option facts as operational support by themselves;
- require a cast-time command-option fill narrowed to Grovel for this slice;
- support Magic Action and Spell Slot spend;
- support slot-scaled creature target count;
- create failed-save pending next-turn Spell Effects for selected targets;
- on the affected target's next turn, apply Prone and then resolve the existing
  end-turn boundary;
- update focused battle-runtime QNT, runtime projection, focused tests, README, and
  unit evidence before claiming support.

Out of scope:

- Drop, Halt, Approach, Flee;
- held-object inventory mutation;
- route/pathfinding derivation;
- claiming full Command support.

### SRDINV50B - Command Halt Runtime

Promote Halt as the action-economy suppression slice over the pending Command
effect from SRDINV50A.

Scope:

- support a Halt command-option fill;
- make Movement, Action, and Bonus Action unavailable for the affected target's
  Command turn;
- preserve non-Action runtime obligations that still occur at turn boundaries,
  such as start-turn and end-turn processing;
- clear the Command effect at the appropriate end-turn boundary;
- encode suppression in state/types rather than relying on discovery filters
  remembering the effect.

Out of scope:

- route movement;
- held-object drop;
- suppressing Reactions outside the target's own turn, since Command Halt names
  Movement, Action, and Bonus Action only.

### SRDINV50C - Command Drop Held-Object Boundary

Promote Drop as a held-object disposition boundary without adding a duplicate
inventory model.

Scope:

- support a Drop command-option fill;
- require caller/table-supplied held-object facts for the affected target at the
  execution boundary;
- emit deterministic dropped-object outcomes and then resolve end turn;
- use existing character loadout facts only where they are already the
  canonical held weapon/shield source, and avoid copying those facts into
  parallel Command state;
- keep empty held-object lists distinct from unknown held-object facts.

Out of scope:

- general inventory simulation;
- automatic object placement;
- changing character loadout or equipment ownership in this slice unless a
  single canonical battle-runtime loadout mutation boundary is added.

### SRDINV50D - Command Approach and Flee Route Runtime

Promote the route-bearing options with caller-supplied route execution facts.

Scope:

- support Approach and Flee command-option fills;
- consume caller-supplied movement result facts through the existing Movement
  budget owner;
- for Approach, require caller/table proximity evidence for whether the target
  moved within 5 feet of the caster and end the turn only when that predicate is
  true;
- for Flee, represent the whole-turn moving-away obligation with supplied
  fastest-available route facts, without deriving pathfinding or tactical route-selection policy;
- derive Opportunity Attack eligibility from actual movement through the
  existing movement/reaction boundary rather than from route labels.

Out of scope:

- automatic shortest, direct, safest, or fastest route derivation;
- map collision, terrain, pathfinding, or route-selection policy;
- treating "fastest available means" as permission to invent non-RAW movement
  modes.

## reviewer loop Convergence

- Round 1: rejected one omnibus Command runtime task. The route, held-object,
  action suppression, and condition/end-turn clauses require different runtime
  invariants.
- Round 2: rejected storing route facts, held-object inventory, or duplicate
  Movement/Speed facts in Command state. The split keeps those facts owned by
  existing movement, loadout/object, and action-resource boundaries.
