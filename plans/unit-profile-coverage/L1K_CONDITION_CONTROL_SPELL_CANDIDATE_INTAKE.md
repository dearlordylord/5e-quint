# L1K Condition Control Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 3 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The six seed Spell Definitions split into:

- combat-condition save lifecycle widening: `hold_person`,
  `blindness_deafness`
- combat-control condition/effect bundle needs: `fear`, `hypnotic_pattern`
- non-condition roll and damage debuff need: `ray_of_enfeeblement`
- social and agency-control queue: `dominate_person`

No candidate is an exact existing-profile fit. The closest promoted profile is
`spell.invocation-condition-save`, but its admitted shapes currently cover
fixed-condition cases such as Color Spray and Entangle, plus creature-type
Charm-style support elsewhere. These candidates add repeat-save lifecycles,
cast-time condition choice, forced held-object or route behavior, composite
condition plus Speed effects, success-side roll modifiers, or agency control.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all six candidates are authored
  SRD spell records with `srd-candidate` catalog-admission disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all six candidates remain not
  in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the six candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.invocation-condition-save`,
  `spell.invocation-command-halt-grovel`,
  `spell.invocation-command-drop-held-object`,
  `spell.invocation-command-approach-route`,
  `spell.invocation-command-flee-route`,
  `spell.invocation-hideous-laughter-repeat-save-lifecycle`, and
  `spell.creature-type-protection-and-charm`.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-save-gates.ts`:
  the condition-save profile currently admits specific fixed-condition spell
  shapes, not a general repeat-save or condition-choice profile.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`:
  Blindness/Deafness and Dominate Person.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Fear, Hold Person, and
  Hypnotic Pattern.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`: Ray of Enfeeblement.
- `.references/srd-5.2.1/Rules-Glossary.md`: Blinded, Charmed, Deafened,
  Frightened, Incapacitated, Paralyzed, Dash, Influence, Magic, and Saving
  Throw.
- `.references/srd-5.2.1/Playing-the-Game.md`: D20 Tests, Saving Throws, and
  Advantage/Disadvantage.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Condition, Charmed, Blinded, Deafened, Frightened,
  Incapacitated, Paralyzed, Saving Throw, D20 Test, Advantage, Disadvantage,
  Dash, Movement, Speed, and Influence.

## Candidate Split

| Candidate | RAW condition/control shape | Classification | Decision |
| --- | --- | --- | --- |
| `hold_person` | Action, one visible Humanoid within 60 feet, Wisdom Saving Throw, Paralyzed for Concentration up to 1 minute, end-of-target-turn repeat save, slot-scaled extra Humanoid targets. | Combat-condition save lifecycle widening | This is the cleanest fixed-condition candidate, but exact support still needs a general end-of-target-turn repeat-save lifecycle for spell-owned conditions plus slot-scaled Humanoid target lists. Do not claim it through the current condition-save profile until the repeat-save lifecycle is executable. |
| `blindness_deafness` | Action, one visible creature within 120 feet, Constitution Saving Throw, caster chooses Blinded or Deafened for 1 minute without Concentration, end-of-target-turn repeat save, slot-scaled extra creature targets. | Combat-condition save lifecycle widening | This is a condition-save candidate, but the cast-time Blinded-or-Deafened choice is a real rules branch. Admission needs condition-choice support and repeat saves; storing one fixed condition would collapse an authored choice. |
| `fear` | Action, Self, 30-foot Cone, Wisdom Saving Throw, failed targets drop what they hold and have Frightened for Concentration up to 1 minute. Each affected target takes Dash and moves away by the safest route on its turns unless nowhere to move; line-of-sight absence gates an end-turn repeat save. | Combat-control condition/effect bundle need | The Frightened condition alone is not the spell. Exact support needs held-object drop, ongoing forced Dash and route consumption, and a line-of-sight witness for repeat-save eligibility. Existing Command drop/flee route profiles are useful precedent, but Fear is an ongoing condition-driven control lifecycle rather than a one-turn command. |
| `hypnotic_pattern` | Action, point-origin 30-foot Cube within 120 feet, each creature in the area who can see the pattern makes a Wisdom Saving Throw. Failed targets have Charmed; while Charmed, they also have Incapacitated and Speed 0. The spell ends for a target on damage or if another creature uses an action to shake it awake. | Combat-control condition/effect bundle need | This should not be routed as a social Charmed spell. Charmed is the RAW carrier for a combat incapacitation bundle. Exact support needs the 30-foot Cube boundary, sight witness, composite condition plus Speed effect, damage escape, and an action-based shake-awake escape. |
| `ray_of_enfeeblement` | Action, one creature within 60 feet, Constitution Saving Throw. On success, the target has Disadvantage on its next attack roll until the start of the caster's next turn. On failure, the target has Disadvantage on Strength-based D20 Tests and subtracts 1d8 from all damage rolls for Concentration up to 1 minute, with end-of-target-turn repeat saves. | Non-condition roll and damage debuff need | This is not a Condition Spell Definition. It needs a roll-modifier and damage-roll reduction Spell Effect with repeat saves, plus a success-side one-attack Disadvantage rider. Do not admit it through condition-save infrastructure. |
| `dominate_person` | Action, one visible Humanoid within 60 feet, Wisdom Saving Throw with hostile-target Advantage, Charmed for Concentration up to 1 minute, damage-triggered repeat save, telepathic commands on the caster's turn, and caster-spent Reaction to command the target's Reaction. Higher slots lengthen Concentration. | Social and agency-control queue | The Humanoid Charmed shell resembles Charm Person, but the core rules payload is agency control. A Charmed-only subset would hide the telepathic command and Reaction commandeering mechanics. Route this to a social/agency-control owner unless the decider explicitly approves a documented subset. |

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add a general fixed-condition repeat-save lifecycle for spell-owned
   conditions, then admit `hold_person` if Humanoid target-list scaling is
   covered.
2. Add cast-time condition-choice support on top of that lifecycle before
   admitting `blindness_deafness`.
3. Add composite condition plus Speed active effects and target-specific damage
   and shake-awake escapes before admitting `hypnotic_pattern`.
4. Add an ongoing Frightened forced-route lifecycle that reuses the normal
   Movement and held-object owners rather than duplicating route or inventory
   state before admitting `fear`.
5. Add a spell-owned roll-modifier and damage-roll reduction lifecycle with
   success-side one-attack Disadvantage before admitting
   `ray_of_enfeeblement`.
6. Route `dominate_person` to a social/agency-control design task that models
   commands, target autonomy fallback, and caster-spent target Reaction control;
   do not treat it as merely another Charmed condition spell.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `ray_of_enfeeblement` out of condition-control admission because RAW
  applies roll and damage modifiers, not a named Condition.
- Split `dominate_person` out of the combat-condition path because its durable
  effect is control over target choices, commands, and Reactions; Charmed is
  only part of that control surface.
- Kept `hypnotic_pattern` in combat-control rather than social-control because
  RAW uses Charmed to host Incapacitated and Speed 0.

Round 2 architecture and connascence pass:

- No checker-visible state was added. The candidate ids are repeated only as
  local planning boundaries; generated coverage artifacts remain the source of
  truth for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- Strong remaining coupling is local to the follow-up list: if a candidate
  moves buckets, the candidate table and follow-up list must change together.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
