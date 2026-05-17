# L1K Weapon Item Hosted Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 9 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The five seed Spell Definitions split into:

- weapon item enhancement need: `magic_weapon`
- held spell-created weapon lifecycle need: `flame_blade`
- positioned spectral force repeat-attack need: `spiritual_weapon`
- self-hosted resistance and retaliation need: `fire_shield`
- item-mediated protective bond and damage-sharing need: `warding_bond`

No candidate is an exact existing-profile fit. Existing promoted weapon-spell
profiles are intentionally narrower than this candidate group:

- `spell.invocation-spell-hosted-weapon-attack` is the True Strike shape: an
  instantaneous Magic Action weapon attack using a material-component weapon,
  spellcasting ability replacement, damage-type choice, and cantrip scaling.
- `spell.invocation-weapon-attack-override` is the Shillelagh shape: a timed
  held Club or Quarterstaff override that consumes caller-supplied selected
  loadout facts and projects spellcasting ability, damage die scaling, and
  Force-or-normal damage choice.
- `spell.invocation-weapon-damage-rider` is the Divine Favor shape: a timed
  self-hosted weapon-hit damage rider.

These profiles should not be stretched into generic item enchantment,
spell-created held objects, floating force placement, mode-linked resistance
and retaliation, or two-creature damage-sharing. Weapon/item hosted spell
support should attach runtime projections to caller-supplied item, held-object,
spectral-force, or paired-creature identities. It should not duplicate authored
weapon records, invent parallel inventory state, or depend on D's selected
identity work.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all five candidates are
  authored SRD spell records with `srd-candidate` catalog-admission
  disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all five candidates remain
  not in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the five candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.invocation-spell-hosted-weapon-attack`,
  `spell.invocation-weapon-attack-override`,
  `spell.invocation-weapon-damage-rider`, `spell.scalar-buff`,
  `spell.invocation-damage-reduction`, `spell.reaction-hellish-rebuke`, and
  `spell.reaction-shield`.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts`:
  the spell-hosted weapon profile is canonical True Strike only, and the
  weapon attack override profile is canonical Shillelagh only.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts`: the
  scalar-buff gate admits activation effects for Temporary Hit Points, flat
  Speed deltas, and Armor Class bonuses; it does not admit damage resistance,
  Saving Throw bonuses, damage sharing, object-attached weapon bonuses, or
  retaliatory damage.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Fire Shield and Flame
  Blade.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Magic Weapon.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Spiritual Weapon and
  Warding Bond.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Casting Time, Range,
  Components, Duration, Effects, and spell attacks.
- `.references/srd-5.2.1/Playing-the-Game.md`: Attack Rolls, Damage Rolls,
  Resistance and Vulnerability, melee attacks, Hit Points, and dropping to 0
  Hit Points.
- `.references/srd-5.2.1/Rules-Glossary.md`: Attack Roll, Concentration,
  Damage Roll, Damage Types, Hit Points, Magic Action, Resistance, Saving
  Throw, Spell Attack, and Wielding.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Magic Action,
  Attack Roll, Spell Attack, Damage Roll, Damage Type, Resistance,
  Concentration, Duration, Free Hand, Holding / Wielding, Hit Points, and
  Saving Throw.

## Candidate Split

| Candidate | RAW weapon/item hosted shape | Classification | Decision |
| --- | --- | --- | --- |
| `magic_weapon` | Bonus Action, Touch, 1 hour. The caster touches a nonmagical weapon; until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. The spell ends early if the caster casts it again. Slot levels 3-5 increase the bonus to +2, and slot level 6+ increases it to +3. | Weapon item enhancement need | This needs an item-attached spell effect over a caller-supplied weapon item identity and nonmagical-weapon witness. Future support must project the spell's magic-weapon status and slot-tiered attack-roll and damage-roll bonuses through attacks made with that item, ending on duration expiry or same-caster recast. Do not encode this by rewriting the authored weapon record or by copying selected loadout state into a parallel spell-owned weapon table. |
| `flame_blade` | Bonus Action, Self, Concentration up to 10 minutes. The caster evokes a fiery blade in a free hand. It disappears if let go, can be evoked again as a Bonus Action, sheds Bright Light and Dim Light, and enables a Magic Action melee spell attack for Fire damage equal to `3d6 + spellcasting ability modifier`, scaling by slot level. | Held spell-created weapon lifecycle need | This needs a held spell-created object lifecycle with free-hand and holding witnesses, let-go disappearance, Bonus Action re-evocation, light projection, and repeat Magic Action melee spell attacks. It is not a normal authored weapon, not a material-component weapon attack, and not a Shillelagh-style override of an existing held Club or Quarterstaff. |
| `spiritual_weapon` | Bonus Action, 60 feet, Concentration up to 1 minute. The caster creates a floating spectral force in a chosen space and immediately makes one melee spell attack against a creature within 5 feet of it. On later turns, the caster can use a Bonus Action to move the force up to 20 feet and repeat the attack. | Positioned spectral force repeat-attack need | This needs a positioned Spell Effect occurrence for the spectral force, with caller-supplied placement, adjacency, target, and reposition witnesses. The later-turn Bonus Action should atomically own the move-and-repeat-attack procedure. Do not model this as an authored weapon, held item, companion, stat block, Initiative participant, or independent turn owner. |
| `fire_shield` | Action, Self, 10 minutes. Wispy flames shed Bright Light and Dim Light. The caster chooses warm or chill shield: warm grants Resistance to Cold damage and retaliates with Fire damage; chill grants Resistance to Fire damage and retaliates with Cold damage. Retaliation triggers when a creature within 5 feet hits the caster with a melee attack roll. | Self-hosted resistance and retaliation need | This needs a mode-linked active Spell Effect with light emission, damage-type Resistance, a melee-hit proximity trigger, and automatic damage to the triggering attacker without spending the caster's Reaction. Existing scalar-buff and reaction profiles do not carry the warm/chill choice relationship or the no-Reaction retaliation trigger. |
| `warding_bond` | Action, Touch, 1 hour, with paired platinum rings worn by caster and target. The willing target gains +1 AC, +1 Saving Throws, and Resistance to all damage while within 60 feet of the caster. Each time the target takes damage, the caster takes the same amount. The spell ends if the caster drops to 0 Hit Points, the pair separates by more than 60 feet, or the spell is cast again on either connected creature. | Item-mediated protective bond and damage-sharing need | This needs a paired-creature Spell Effect with worn-ring/material witnesses, range-gated target projections, all-damage Resistance, Saving Throw and Armor Class bonuses, post-target-damage sharing to the caster, and early-end triggers from caster 0 Hit Points, separation, or recast on either creature. It is not an exact scalar-buff fit because the damage sharing and range/end lifecycle must remain coupled to the bond identity. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/magic_weapon.json` records object attachment, the
  base +1 attack-roll and damage-roll bonuses, and same-caster recast ending.
  Its Dhall source notes that slot-tiered +2/+3 scaling is not represented and
  that the structured object filter cannot express "nonmagical" or
  weapon-kind predicates.
- `packages/surface/content/flame_blade.json` records the light effect and
  repeat Magic Action melee spell attack. Its Dhall source explicitly defers
  the held-created-object lifecycle for disappearing when let go and
  re-evoking as a Bonus Action.
- `packages/surface/content/spiritual_weapon.json` records the spectral-force
  location, initial attack, later reposition, and later attack facts. Runtime
  admission should make the later Bonus Action's move-plus-attack relationship
  executable rather than treating movement and attack as unrelated actions.
- `packages/surface/content/fire_shield.json` records light, warm/chill
  Resistance choice, and same-choice retaliatory damage. The existing runtime
  profiles do not consume `grant_resistance`, `retaliatory_damage`, or the
  linked `same_table_choice_as` mode relation for spell admission.
- `packages/surface/content/warding_bond.json` records the target attachment,
  +1 Armor Class, +1 Saving Throw roll modifier, all-damage Resistance as a
  composite, and damage sharing to the caster. Its Dhall source marks the early
  ending conditions as partial: caster 0 Hit Points, separation beyond 60 feet,
  and recast on either connected creature are not executable source facts.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable or explicitly documented as
subset deferrals.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add a `magic_weapon` item-enhancement profile that consumes caller-supplied
   target item identity and nonmagical-weapon facts, attaches one source-owned
   spell effect to that item, derives the slot-tiered bonus from the invocation
   slot, projects magic-weapon status and attack/damage roll bonuses through
   that item, and ends on duration expiry or same-caster recast.
2. Add a held spell-created object lifecycle for `flame_blade`, including
   free-hand admission, held-object identity, let-go disappearance, Bonus
   Action re-evocation, light projection, Concentration cleanup, and repeat
   Magic Action melee spell attacks using spell attack and spell damage facts.
3. Add a positioned spectral-force Spell Effect for `spiritual_weapon` with
   placement, adjacency, and reposition witnesses supplied by the caller/table,
   plus an atomic later-turn Bonus Action that can move the force up to 20 feet
   and repeat its melee spell attack.
4. Add a self-hosted mode-linked active effect for `fire_shield` that keeps the
   warm/chill choice, granted Resistance, retaliation damage type, light, melee
   hit trigger, and no-Reaction damage application in one typed occurrence.
5. Add `warding_bond` through a paired-creature bond occurrence that owns
   caster/target identity, range-gated projections, same-amount damage sharing,
   caster-0-HP ending, separation ending, recast ending on either creature, and
   material/worn-ring witnesses without copying general inventory state.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `magic_weapon` from Shillelagh because RAW modifies a target weapon
  item and its magic status, not only a held Club or Quarterstaff attack
  projection.
- Split `flame_blade` from True Strike because RAW creates a held spell object
  with duration, light, let-go disappearance, re-evocation, and repeat Magic
  Action spell attacks.
- Split `spiritual_weapon` from companion/summon lifecycle because RAW creates
  a floating spectral force with no stat block, Hit Points, Initiative turn,
  command protocol, or independent action economy.
- Split `fire_shield` from reaction profiles because RAW retaliation is
  automatic on a melee-hit trigger and does not spend the caster's Reaction.
- Split `warding_bond` from scalar buffs because the range-gated target
  projections, damage sharing to the caster, and early-end clauses are part of
  one paired-creature bond.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- The main connascence risks for future work are item identity plus item
  projection for `magic_weapon`, held-object identity plus hand occupancy for
  `flame_blade`, force position plus attack target adjacency for
  `spiritual_weapon`, warm/chill choice plus resistance and retaliation for
  `fire_shield`, and caster/target/range/damage-sharing lifecycle for
  `warding_bond`. Future slices should colocate those coupled facts in one
  domain occurrence per spell shape rather than scattering them across
  selected loadout, active effects, and special-case spell ids.
- Runtime ownership stays limited to typed Spell Invocation and Spell Effect
  projection. Generic inventory management, authored weapon record mutation,
  automatic hand-occupancy mutation, table geometry, force placement,
  visibility/adjacency derivation, and D selected-identity workflows remain
  outside this intake.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
