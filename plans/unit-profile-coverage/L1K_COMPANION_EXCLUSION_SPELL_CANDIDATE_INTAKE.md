# L1K Companion Exclusion Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 10 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The four seed Spell Definitions are companion, mount, or stat-block summon
handoffs:

- reanimated Undead control lifecycle: `animate_dead`
- templated Construct creature lifecycle: `animate_objects`
- summoned mount companion lifecycle: `find_steed`
- stat-block summon lifecycle with shared resistance: `summon_dragon`

No candidate should be admitted by stretching the existing Find Familiar
profile. `spell.find-familiar-lifecycle` proves a companion runtime boundary
can own source-linked creatures, caller-supplied placement, combatant
insertion, replacement, turns, actions, Reactions, Hit Points, and stat-block
actions, but it is source-specific to Find Familiar. These four Spell
Definitions need their own companion/summon owner or a shared companion runtime
that makes the spell-specific lifecycle facts type-visible.

This loop must not implement those lifecycles. It records the exclusions and
hands them to companion/summon follow-up work.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all four candidates are
  authored SRD spell records with `srd-candidate` catalog-admission
  disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all four candidates remain
  not in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the four candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: the related promoted
  companion profile is `spell.find-familiar-lifecycle`; it is precedent for a
  companion owner, not admission evidence for these four spells.
- `packages/battle-runtime/src/find-familiar-lifecycle.ts`,
  `packages/battle-runtime/src/find-familiar-state.ts`,
  `packages/battle-runtime/src/find-familiar-telepathy.ts`, and
  `packages/battle-runtime/src/find-familiar-pact-chain.ts`: Find Familiar
  companion runtime ownership is source-specific.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Animate Dead and Animate
  Objects.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Find Steed.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Summon Dragon.
- `.references/srd-5.2.1/Playing-the-Game.md`: combat turns, Initiative, Dodge,
  and Mounted Combat.
- `.references/srd-5.2.1/Monsters/Overview.md`: Stat Block parts, Creature
  Type, Hit Points, Speed, Actions, Bonus Actions, and monster Proficiency
  Bonus.
- `.references/srd-5.2.1/Monsters/Monsters-P-S.md` and
  `.references/srd-5.2.1/Monsters/Monsters-T-Z.md`: Skeleton and Zombie stat
  blocks referenced by Animate Dead.

Ubiquitous-language terms checked:

- Spell Definition, Spell Invocation, Spell Effect, Bonus Action, Action,
  Reaction, Turn, Initiative, Controlled Mount, Independent Mount,
  Mounting/Dismounting, Creature, Monster, Stat Block, Creature Type, Hit
  Points, Multiattack, Recharge, Concentration, Damage Type, Resistance, and
  Condition.

## Candidate Split

| Candidate | RAW companion/summon shape | Classification | Decision |
| --- | --- | --- | --- |
| `animate_dead` | Level 3, 1-minute casting. A pile of bones or a corpse of a Small or Medium Humanoid becomes a Skeleton or Zombie. The caster can command any creatures made by the spell with a Bonus Action within 60 feet, chooses their next action and movement or a general task, and must recast before the 24-hour control window expires to maintain control. Higher slots animate or reassert control over more Undead. | Reanimated Undead control lifecycle | Hand off to companion/summon work. This needs source-owned created-creature identity, corpse-or-bones source facts, Skeleton/Zombie stat-block selection, control duration, reassert-control targeting, command fan-out, next-turn action and movement instructions, default Dodge/avoid-harm behavior, and scaling creature counts. Do not admit it as a generic spell effect or damage profile. |
| `animate_objects` | Level 5, Action, Concentration up to 1 minute. Nonmagical unattended objects become Construct creatures using the Animated Object stat block. They share the caster's Initiative count, take turns immediately after the caster, obey Bonus Action commands within 500 feet, default to Dodge and danger avoidance without commands, revert to object form at 0 Hit Points, and carry over remaining damage. Size tiers determine count weight, Hit Points, and Slam damage; higher slots increase Slam damage. | Templated Construct creature lifecycle | Hand off to companion/summon work. This needs object-to-creature occurrence identity, object eligibility and size witnesses, shared-Initiative turn insertion, command range, grouped command handling, default behavior, Hit Point and overflow-damage reversion, and slot-scaled stat-block action data. Do not model this by copying inventory objects into a parallel combat table. |
| `find_steed` | Level 2, Action, instantaneous. The caster summons a loyal steed in an unoccupied space. It uses the Otherworldly Steed stat block, replaces any existing steed from the spell, has a chosen Celestial/Fey/Fiend type, functions as a controlled mount while ridden, acts independently after the caster if the caster is Incapacitated, disappears at 0 Hit Points or on caster death, leaves worn/carried items behind, and can be resummoned. The stat block has slot-level AC/HP/Slam scaling, Life Bond, type-linked Slam damage, and type-gated Bonus Actions that recharge after a Long Rest. | Summoned mount companion lifecycle | Hand off to companion/mount work. This needs owner-linked steed identity, replacement, unoccupied placement, mount control state, rider relationship, Incapacitated branch, disappearance and item-drop boundary, resummon identity choice, slot-scaled stat-block projection, Life Bond healing, type-linked damage, and type-gated Bonus Action recharge. Do not collapse it into Find Familiar or ordinary mounted-combat state. |
| `summon_dragon` | Level 5, Action, Concentration up to 1 hour. The caster calls a Draconic Spirit into an unoccupied visible space. It uses the Draconic Spirit stat block, disappears at 0 Hit Points or when the spell ends, shares the caster's Initiative count, takes its turn immediately after the caster, obeys verbal commands with no caster action, defaults to Dodge and danger avoidance without commands, grants the caster one chosen shared Resistance, and has Multiattack, Rend, and Breath Weapon actions tied to spell level and the chosen damage type. | Stat-block summon lifecycle with shared resistance | Hand off to companion/summon work. This needs summon occurrence identity, Concentration cleanup, placement and visibility witnesses, shared-Initiative turn insertion, no-action command handling, default behavior, caster shared-Resistance projection, slot-scaled stat-block values, Multiattack dispatch count, and Breath Weapon damage-type coupling. Do not admit only the shared Resistance while dropping the summoned creature lifecycle. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps and handoff
notes were found:

- `packages/surface/content/animate_dead.json` records the reanimated-creature
  family, Skeleton/Zombie menu, command facts, and 24-hour reassert window.
  Runtime support still needs a companion owner for the created creatures,
  their combat turns, and the distinction between animating new creatures and
  reasserting control over existing ones.
- `packages/surface/content/animate_objects.json` records the templated
  multi-spawn family, Animated Object stat block, size tiers, shared-Initiative
  control facts, command range, and 0-HP reversion. Runtime support still needs
  object identities, object eligibility witnesses, creature insertion, grouped
  command execution, and object-form damage carryover.
- `packages/surface/content/find_steed.json` records the spawned-creature
  family, Otherworldly Steed stat block, type mode, control facts, and
  disappearance facts. Its Dhall source marks the type-branched Slam damage
  and mode-gated Bonus Actions as partial, so future support must not claim
  full steed behavior until those coupled stat-block facts are executable.
- `packages/surface/content/summon_dragon.json` records the spawned-creature
  family, Draconic Spirit stat block, command facts, disappearance, shared
  Resistance, Multiattack, Rend, and Breath Weapon facts. Its Dhall source
  marks the half-spell-level Multiattack count and possible Breath Weapon slot
  scaling as partial, so future support should make those slot-level facts
  executable before claiming full summon behavior.

Do not add Unit claims for these candidates until the companion/summon runtime
owner can execute the structured source facts needed by the chosen profile or
until a later task records an explicit subset decision with typed deferrals.

## Handoff Shape

Recommended future slices, in increasing runtime scope:

1. Define a shared companion/summon occurrence boundary with source Spell
   Definition, source caster, companion combatant identity, caller-supplied
   placement facts, Stat Block source, Hit Points, turn ownership, command
   protocol, duration or control window, and disappearance/reversion cleanup.
2. Extend the Find Familiar companion precedent into a spell-indexed
   companion/summon owner only if the source-specific facts remain typed:
   familiar form and Pact delivery for Find Familiar, mount/rider and Life Bond
   for Find Steed, object reversion for Animate Objects, reasserted control for
   Animate Dead, and shared Resistance/Breath Weapon coupling for Summon Dragon.
3. Add `find_steed` through a mount companion slice that composes controlled
   mount, independent mount, rider state, replacement, disappearance,
   item-drop, slot scaling, Life Bond, type-linked Slam damage, and
   mode-gated Bonus Action recharge.
4. Add `animate_objects` through an object-to-Construct slice that consumes
   object identities and object eligibility witnesses, inserts Animated Object
   combatants, owns shared-Initiative turns, resolves grouped Bonus Action
   commands, and reverts to object form with overflow damage at 0 Hit Points.
5. Add `summon_dragon` through a stat-block summon slice that owns
   Concentration cleanup, no-action command handling, shared Resistance,
   slot-scaled stat-block values, Multiattack count, Rend, and Breath Weapon.
6. Add `animate_dead` through a reanimated-Undead control slice that owns
   corpse-or-bones source facts, Skeleton/Zombie stat-block selection, created
   creature identity, 24-hour control, recast reassertion, command fan-out, and
   default behavior.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Kept all four candidates out of Loop K runtime promotion because each creates
  or controls one or more creatures with Stat Block facts, turn/action
  behavior, command or mount protocol, and disappearance/reversion/control
  lifecycle.
- Split `find_steed` from Find Familiar because the steed is a mount with
  controlled and independent mount branches, rider coupling, Life Bond,
  type-linked stat-block actions, and item-drop disappearance semantics.
- Split `animate_dead` from ordinary instantaneous spells because the
  instantaneous spell leaves behind controlled Undead creature state and a
  24-hour reassert-control lifecycle.
- Split `summon_dragon` from scalar Resistance profiles because the caster's
  shared Resistance is coupled to a Concentration summon occurrence and the
  spirit's chosen Resistance/Breath Weapon damage type.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing `spell.find-familiar-lifecycle` evidence is cited only as ownership
  precedent. This artifact does not create parallel support metadata or
  duplicate runtime gates for the four Task 10 candidates.
- The main connascence risks for future work are source spell plus companion
  identity, Stat Block source plus slot-level projections, command protocol
  plus turn ownership, mount/rider state plus steed action limits, object
  identity plus Construct combatant identity, and shared Resistance plus Breath
  Weapon damage type. Future slices should keep each coupled group in one
  source-specific occurrence model rather than scattering them across active
  effects, combatants, inventory, and special-case spell ids.
- Runtime ownership should stay at typed companion/summon occurrence boundaries
  with table-supplied placement, visibility, object eligibility, corpse/bones,
  rider, and command facts. It should not derive map geometry, inventory
  placement, object availability, corpse availability, or rider positioning
  automatically inside the reducer.

## Verification For This Intake

- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
