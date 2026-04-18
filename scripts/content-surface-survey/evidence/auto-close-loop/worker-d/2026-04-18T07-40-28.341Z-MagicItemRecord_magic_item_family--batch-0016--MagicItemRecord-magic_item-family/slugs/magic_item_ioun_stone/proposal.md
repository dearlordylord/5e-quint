# Proposal: Ioun Stone

## Verdict

`Ioun Stone` does not fit honestly as a clean authored `MagicItemRecord` collection today.

The collection wrapper itself is available: `MagicItemRecord` already supports `variants` plus shared attunement, which is the right top-level shape for "rarity varies / many named stone types".

The blocker is inside the variant mechanics:

- some variants are clean passive items;
- some need new atoms;
- two variants need mechanics families the current magic-item surface does not have.

That makes the correct outcome `structural_widening`, not `clean`.

## Variants That Already Fit

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`
  - honest fit: passive `modify_ability_score` with `maximum = 20`
- `Awareness`
  - honest fit: passive `modify_roll_advantage` on `initiative` and `ability_check` with `skillFilter = perception`
- `Protection`
  - honest fit: passive `modify_ac`

These would all naturally use `condition = { kind = "wearing_item" }`, since the item text explicitly says an orbiting Ioun Stone counts as an object you are wearing.

## Structural Gaps

### 1. Reserve needs a stored-spell reservoir subgraph

`Reserve` is not just "grant spell access".

It needs all of the following:

- third-party spell ingestion into the item during another creature's cast
- storage capacity measured in spell levels
- failure when the remaining capacity is insufficient
- later casting of arbitrary stored spells
- reuse of original caster metadata when released:
  - slot level
  - spell save DC
  - spell attack bonus
  - spellcasting ability
- removal of the stored spell after release

Current magic-item families cannot express that:

- `passive` is only always-on grants
- `activation` is a one-shot owned procedure
- `triggered_reaction` requires a reaction cost and does not model durable stored payload
- `composite` only combines those existing families

Needed widening:

- a new stored-spell / reservoir mechanics subgraph for magic items
- or a more general non-spell `store/release` family with persistent item state

Evidence:

> This vibrant purple prism stores spells cast into it, holding them until you use them.

> The stone can store up to 4 levels of spells at a time.

> Any creature can cast a spell of level 1 through 4 into the stone by touching it as the spell is cast.

> While this stone orbits your head, you can cast any spell stored in it.

### 2. Regeneration needs passive periodic triggers for magic items

`Regeneration` is a repeating passive benefit:

- trigger: end of each hour
- predicate: only if you have at least 1 HP
- effect: heal 15 HP

The spell surface has `ongoing_effect` and `OngoingOperation`, but magic items do not.
`PassiveMechanics` only supports unconditional grants, not repeating time-triggered resolution.

Needed widening:

- either allow non-spell items to use an ongoing/operation family
- or add a magic-item passive-triggered family

Evidence:

> You regain 15 Hit Points at the end of each hour if you have at least 1 Hit Point while this white spindle orbits your head.

## Atom / Surface Gaps

### 3. Mastery needs a Proficiency Bonus modifier atom

No existing effect atom changes PB directly.

Evidence:

> Your Proficiency Bonus increases by 1 while this pale green prism orbits your head.

Suggested widening:

- new effect atom: `modify_proficiency_bonus`

### 4. Absorption / Greater Absorption need a richer reaction trigger

These variants are close to `triggered_reaction`, but the current trigger grammar is too weak.

Missing trigger facts:

- visible caster
- maximum triggering spell level

Also, their burnout counter is not a simple `use_count` or `charge_pool`; it accumulates canceled spell levels until 20 total.

Evidence:

> you can take a Reaction to cancel a spell of level 4 or lower cast by a creature you can see

> Once the stone has canceled 20 levels of spells, it burns out

Suggested widening:

- a richer `ReactionTrigger` variant for visible-creature spellcasting with level bounds
- likely a cumulative "resource tracked by triggering spell level" surface if these variants are to be modeled fully rather than approximately

### 5. Sustenance needs a nourishment-suppression atom

No current effect atom covers "don't need to eat or drink".

Evidence:

> You don't need to eat or drink while this clear spindle orbits your head.

Suggested widening:

- new effect atom for suppressing food / drink requirement

## Secondary Omissions Not Driving The Main Verdict

These are real, but they are not the main reason for `structural_widening`:

- activation to toss the stone and start orbiting
- utilize action to seize and stow orbiting stones
- max-three orbiting-stones limit
- orbiting stone being untargetable / unsnatchable
- falling when attunement ends

Those are shared lifecycle/equipment-state details around the collection. If every variant otherwise fit, these could likely be recorded as omissions. The decisive blockers are still `Reserve` and `Regeneration`.
