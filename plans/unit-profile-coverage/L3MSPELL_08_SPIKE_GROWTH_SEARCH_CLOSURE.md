# L3MSPELL-08 Spike Growth Search Closure

Task 8 resolved Spike Growth hidden terrain discovery and Search-state
ownership against RAW, ubiquitous language, and the current battle reducer.
No runtime behavior, Surface shape, QNT owner, or MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spike Growth` for the
  point-origin Sphere, Difficult Terrain, movement-metered Piercing damage,
  camouflaged terrain, Search action, Wisdom (Perception or Survival) check,
  caster Spell Save DC, and "before entering" timing.
- `.references/srd-5.2.1/Playing-the-Game.md#Ability Checks` for Wisdom checks
  and Skill proficiency as a modifier to an Ability Check.
- `.references/srd-5.2.1/Playing-the-Game.md#Actions` and
  `.references/srd-5.2.1/Rules-Glossary.md#Search [Action]` for Search as an
  Action that makes a Wisdom check to discern something that is not obvious,
  with Perception and Survival as applicable skills for the relevant hidden or
  natural-hazard facts.
- `.references/srd-5.2.1/Playing-the-Game.md#Finding Hidden Objects` for the
  vicinity and GM/table ownership of hidden-object discovery.
- `UBIQUITOUS_LANGUAGE.md#Action Lifecycle` for Action and Search terminology.
- `UBIQUITOUS_LANGUAGE.md#Movement` for Movement and Difficult Terrain.
- `UBIQUITOUS_LANGUAGE.md#Vision and Light` for why "can see the area when the
  spell is cast" is a table sight witness, not a stored hazard fact.
- `UBIQUITOUS_LANGUAGE.md#Ability Scores` for Skill as a specialization of an
  Ability Check rather than a separate roll type.

Relevant RAW facts:

- Spike Growth is a level-2 Action spell with 150-foot point range and
  Concentration up to 10 minutes.
- The ground in a 20-foot-radius Sphere becomes Difficult Terrain for the
  duration.
- A creature moving into or within the area takes 2d4 Piercing damage for every
  5 feet traveled.
- The ground transformation is camouflaged to look natural.
- Only a creature that could not see the area when the spell was cast needs the
  recognition procedure.
- Recognition requires taking the Search action before entering and succeeding
  on a Wisdom (Perception or Survival) check against the caster's Spell Save
  DC.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/spike_growth.json` records the SRD-authored
  description, the level-2 Action spell, 150-foot point range, Concentration up
  to 10 minutes, point-origin 20-foot-radius Sphere attachment, passive
  Difficult Terrain operation, and movement-triggered 2d4 Piercing damage per
  5 feet.
- Surface keeps the camouflaged-recognition text as authored prose. It does
  not project per-observer terrain knowledge or a Search result into the
  `operations` array.

Promoted movement hazard branch:

- `plans/unit-profile-coverage/profiles.jsonl` binds
  `spell.invocation-spike-growth-movement-hazard` to the Spike Growth movement
  hazard QNT, runtime, focused MBT, and runtime admission owners.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spike-growth-movement-hazard.ts`
  admits the profile from parsed Surface shape: level, Action casting,
  150-foot point range, 10-minute Concentration, one point-origin Sphere, one
  Difficult Terrain operation, and one movement-triggered Piercing damage
  operation.
- `packages/battle-runtime/src/battle-reducer/spells-resolve-area-effects.ts`,
  `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts`, and
  `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts` own the
  active hazard identity, movement-cost projection, per-5-foot damage scaling,
  damage resolution, and cleanup on Concentration or duration end.
- `plans/unit-profile-coverage/task-claims.jsonl` already records QNT proof and
  completed runtime parity for the promoted movement hazard branch under
  `L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME`.

Existing Search ownership:

- `packages/battle-runtime/src/battle-reducer/attack-resolution.ts` owns the
  current battle Search reducer for hidden combatant discovery: selected hidden
  combatant target, Ability Check total versus stored discovery DC, and reveal
  on success.
- `plans/rules-kernel-coverage/obligations.jsonl` records
  `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` as the focused Ability Check
  and Search hole owner. Its evidence keeps Search target choice and
  total-vs-DC consequences semantic only after candidate facts are supplied,
  while vicinity, sight/obscurement, candidate discovery, and target admission
  remain boundary facts.
- That Search owner is not a generic per-observer terrain-knowledge store.
  Reusing hidden-combatant state for Spike Growth terrain recognition would
  conflate concealed combatant discovery with a spell-created terrain hazard
  recognition witness.

Existing closure ledger:

- `plans/unit-profile-coverage/unit-claims.jsonl` keeps `spike_growth` as
  `profile-subset-supported` under
  `spell.invocation-spike-growth-movement-hazard`.
- The supported mechanics cover Magic Action and level-2-or-higher Spell Slot
  casting, caller-supplied point-origin Sphere identity, caster-owned
  Concentration, Difficult Terrain movement-cost projection, movement-triggered
  Piercing damage scaling, and cleanup.
- The deferred camouflaged-terrain recognition mechanic is already closed as
  `outside-runtime-presentation-exploration` with the
  `runtime-detached table Search/perception witness owner`.

## Boundary Decision

Spike Growth movement hazard support remains promoted under
`spell.invocation-spike-growth-movement-hazard`. The current reducer owns the
battle-visible hazard consequences after the table supplies the area and
movement facts: spell resource spending, caster-owned Concentration, active
area identity, Difficult Terrain movement cost, movement-triggered Piercing
damage, and cleanup.

The camouflaged terrain recognition clause is not promoted. It depends on
observer-specific facts that the battle reducer does not own: whether that
creature could see the area when the spell was cast, whether it spends the
Search action before entering, whether Perception or Survival is the applicable
Skill for the table-described search, the Wisdom Ability Check result against
the caster's Spell Save DC, and the resulting recognized-hazard witness.

Adding Spike Growth-specific recognized/unrecognized terrain state would
duplicate table perception and Search-state ownership. Adding the fact to the
active area effect would also make invalid states representable: one global
hazard could claim to be recognized even though RAW recognition is per
creature. The correct boundary is to keep recognition as a runtime-detached
Search/perception witness supplied by the table or a future generic
exploration/perception owner before movement into the area is resolved.

## Plan Impact

- L3MSPELL-08 can close as boundary resolved.
- L3MSPELL-09 should remain unchanged; this task did not create a generic
  spatial, falling, sight/obscurement, or per-observer terrain-knowledge owner.
- L3MSPELL-11 can remain unchanged; this task did not find a selected-identity
  replay gap in the promoted Spike Growth movement hazard branch.
- L3MSPELL-12 should include this note and the existing Spike Growth closure
  ledger when consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding recognized terrain state to `BattleState`, the
  Spike Growth active area effect, or combatant hidden state. Those placements
  either duplicate table-owned Search/perception facts or conflate combatant
  discovery with terrain hazard recognition.
- Round 2: retained the existing promoted movement hazard profile and the
  runtime-detached Search/perception closure. The RAW recognition clause is a
  real SRD mechanic, but its executable owner is a future generic
  exploration/perception witness owner, not a Spike Growth-local reducer path.
