# Find Traps — Survey Proposal

## Outcome: `dm_agenda`

## Spell summary

- Level 2 Divination
- Casting time: 1 Action
- Range: 120 ft
- Components: V, S
- Duration: Instantaneous
- Effect: Caster senses traps in range and line of sight; learns the general nature of each trap's danger.

## Why `dm_agenda`

Find Traps has no deterministic mechanical resolution. Its full effect is:

> "You sense any trap within range that is within line of sight. … This spell reveals that a trap is present but not its location. You do learn the general nature of the danger posed by a trap you sense."

Nothing in this text produces a state change the core combat model can represent:

- No attack roll
- No saving throw
- No damage dealt
- No condition applied
- No buff or debuff to any creature or object stat
- No resource consumed beyond the spell slot

Every outcome is DM-adjudicated:

- **"What counts as a trap?"** — defined in prose as "any object or mechanism created to cause damage or other danger," but whether a specific thing qualifies is a DM judgment call at the table.
- **"Which traps are within line of sight?"** — depends on world geometry controlled by the DM.
- **"General nature of the danger"** — entirely narrative; no closed grammar can enumerate the possible answers.

Per ARCHITECTURE.md: *"DM rulings, agenda decisions, notification surfaces, and other caller-owned facts are not core-mechanics atoms."* Find Traps is a notification surface — its output is information for the DM to deliver, not a deterministic mechanical outcome.

## Why no existing family fits

Even the most permissive mapping fails:

| Family | Problem |
|---|---|
| `activation` | Requires `attack_roll` or `save_gate` phases. Neither exists. Empty phases array produces a meaningless trace. |
| `ongoing_effect` | Duration is instantaneous; no persistent state to attach an operation to. |
| `triggered_reaction` | Not a reaction spell; has no trigger. |
| `anchored_trigger` | Does not plant a trigger; releases no stored payload on a future event. |

## No widening proposed

This is not a gap in the vocabulary — it is a genuine scope boundary. The v4 taxonomy's `grant_sense` atom exists, but even with that atom available, the spell's output would still be: "the DM tells the players what traps are here." That delivery is permanently out of scope for the core mechanics surface.

A future "exploration/perception" surface layer could model this, but it would be a different system from the combat/activation surface modeled here.
