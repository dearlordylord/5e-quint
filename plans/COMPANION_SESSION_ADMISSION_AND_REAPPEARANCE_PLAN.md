# Companion Session Admission And Reappearance Plan

Status: future work; not part of the reducer-discovered battle-act slice.

## Task Index

| Task                                          | Status   | Summary                                                                                                                                                 |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `L13COMP-01-COMPANION-SESSION-ADMISSION`      | deferred | Create an out-of-battle/session workflow that can build a character with companion access and start battle with an already-present companion combatant. |
| `L13COMP-02-COMPANION-REAPPEARANCE-DISCOVERY` | done     | Normal battle act discovery and resolution can reappear a temporarily dismissed familiar without adding MCP-local companion procedures.                 |
| `L13COMP-03-GENERIC-MCP-COMPANION-ACTS`       | deferred | Complete remaining MCP companion coverage through reducer-discovered battle acts and fills, without public authored-identity companion tools.           |

## L13COMP-01-COMPANION-SESSION-ADMISSION

The missing workflow is outside the battle reducer. A caller should be able to
create a character with a supported companion source, record the table-selected
companion form and mutable retained facts, and start a battle with the companion
already admitted as a source-linked combatant.

Battle admission must not care whether the companion was produced by a ritual,
a Spell Slot cast, a class feature, or another legal out-of-battle source. The
battle boundary should receive typed companion/source facts and a combatant init
shape. Source-specific eligibility and cost rules belong at the session,
Character Sheet, or character-creation boundary that owns the out-of-battle
event.

Required output:

- A generic MCP/session path for selecting and retaining an out-of-battle
  companion form/source fact, including owning character, selected form,
  selected creature type where applicable, stable companion identity, lifecycle
  status, retained HP/Temporary Hit Points when no active battle combatant owns
  those facts, and source facts sufficient to reconstruct battle admission.
- Battle start admission that consumes those typed facts without dispatching on
  authored spell or feature identity in reducers.
- Focused MCP/session tests showing a character starts battle with a present
  companion that can use already-supported battle behavior such as delivering a
  Touch-range spell.

Non-goals:

- Do not add Ritual casting as a battle act.
- Do not duplicate combatant HP or Stat Block facts in session state while the
  companion is an active battle combatant.
- Do not make battle admission branch on "ritual-summoned familiar" or any
  other source event that produced the durable companion.
- Do not add a table-owned tactics or placement policy; callers still supply
  placement, Initiative, and other table facts at the boundary.

Current gap to remove in this follow-up: `start_battle` source-linked familiar
admission still derives eligibility from prepared spell, spellbook Ritual, and
Pact access on the battle character. That is retained only as the pre-session
companion bridge; the target architecture is typed durable companion facts at
the battle boundary.

## L13COMP-02-COMPANION-REAPPEARANCE-DISCOVERY

Implemented in the reducer-discovered battle-act slice. Generic battle act
discovery now exposes a `companionLifecycle` `reappear` subject for a retained
temporarily dismissed familiar when the owner can spend a Magic action.
Resolution consumes generic placement and Initiative fills plus the resolver
Stat Block catalog context that MCP already owns. No MCP-local companion verb is
needed.

Closed evidence:

- A catalog/source-fact route lets battle runtime reconstruct the selected
  companion form from retained companion facts and resolver catalog context.
- A reducer-discovered reappearance act and resolution path uses normal
  `discoverBattleActs`, `resolveBattleSubject`, and `fill_battle_hole`
  protocols.
- No MCP-local `companion` verb or special `find_familiar` verb. MCP should
  pass through reducer-discovered subjects and fills only.

## L13COMP-03-GENERIC-MCP-COMPANION-ACTS

MCP must continue to expose companion behavior only through the ordinary
runtime-discovered battle subject and hole protocol. A caller can ask what the
actor can do, select the returned act, and fill the returned holes; MCP must not
define separate public tools named for individual spells, class features, or
companion mechanics.

Required output:

- Companion admission/cast options discovered by battle runtime from the
  current character/session/battle facts, including loaded authored content
  projected through typed procedure and support-profile facts.
- Wild Companion cast discovery must be included here. The current runtime
  has the low-level `castWildCompanion` reducer and battle support marker, but
  the reducer-discovered act path still lacks typed Find Familiar form-catalog
  facts at the battle boundary; do not solve that by branching on the raw
  `druid_wild_companion` or `find_familiar` ids in reducers or MCP.
- Generic fills for selected form, creature type mode, companion identity,
  Initiative, placement, source-cost choice, and any table-supplied facts the
  selected act requires.
- Generic lifecycle and routing subjects for remaining companion admission/cast
  paths, long-rest disappearance, and any future companion protocol effects
  where those behaviors are available from protocol facts. Temporary dismissal,
  reappearance, permanent dismissal, shared senses, and Touch spell delivery are
  already carried by reducer-discovered battle subjects and fills.
- A damage-result/table-fact path for carried or worn objects left behind when
  ordinary damage reduces a present familiar to 0 Hit Points. The current
  battle damage hook records the zero-HP disappearance; the explicit companion
  zero-HP helper can report dropped objects when supplied held-object facts, but
  ordinary damage resolution does not yet have a hole/outcome channel for that
  table fact.
- MCP tests proving `resolve_battle_act` / `fill_battle_hole` carry the
  runtime-returned subjects and fills, and proving public tools such as
  `cast_find_familiar` or `cast_wild_companion` do not exist.

Non-goals:

- Do not add a renamed generic MCP wrapper that still bypasses runtime
  discovery.
- Do not make MCP own companion eligibility, lifecycle, command semantics, or
  companion state.

## Related Work

- `plans/DESIGN_C4a_spawned_companion.md` owns the broader spawned-companion
  stat-block design pressure.
- Complete Find Steed remains blocked on a mounted-combat core owner; do not
  use this plan to add ridden controlled-mount semantics.
