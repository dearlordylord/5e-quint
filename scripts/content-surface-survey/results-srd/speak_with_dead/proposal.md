# Speak with Dead — Encoding Proposal

## Outcome: `dm_agenda`

Speak with Dead cannot be encoded in the current content surface because its core mechanic is entirely DM adjudication. No honest encoding exists.

## Why this is `dm_agenda` and not a widening

The spell's only mechanical action is "create a 10-minute timed window during which the caster may ask a corpse up to 5 questions." Everything downstream is narrative:

- **What answers the corpse gives** — DM decides, constrained by lore ("knows only what it knew in life, including languages it knew").
- **Whether the corpse is truthful** — DM adjudicates based on the corpse's relationship to the caster ("under no compulsion to offer a truthful answer if you are antagonistic toward it or it recognizes you as an enemy").
- **Whether answers are helpful** — spell text explicitly notes "answers are usually brief, cryptic, or repetitive."

None of these have deterministic mechanical outcomes. There is no attack roll, no save gate, no damage, no healing, no condition applied, no movement, no buff/debuff to a mechanical stat.

## Preconditions are not atoms

The spell has three failure conditions:
1. Corpse lacks a mouth
2. Deceased creature was Undead when it died
3. Corpse was targeted by this spell within the past 10 days

These are eligibility predicates on world/NPC state, not mechanical resolution atoms. They do not map to any existing v4 atom and do not justify a `surface_widening` or `atom_widening` — they are DM/narrative checks that the caller handles before committing the cast.

## No widening proposed

This spell is legitimately out-of-core. Modeling it would require:
- A `question_gate` or `information_exchange` atom with no deterministic payload
- Or forcing the "corpse answers questions" into an `ongoing_effect` with a `none`-effect operation — which would be dishonest (the trace would claim there is no effect when in fact there is a DM-owned interaction loop)

Neither is appropriate. Speak with Dead belongs to the same category as Commune, Divination, and Augury — divination/information spells whose output is DM-owned narrative, not engine-owned state.

## SRD reference

SRD 5.2.1 Spells — Speak with Dead (school: Necromancy, level 3).
