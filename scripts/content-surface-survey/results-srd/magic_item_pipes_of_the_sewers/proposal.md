`Pipes of the Sewers` does not fit the current authored surface honestly.

Why it stops at proposal:

- The unit is not just a simple magic-item `activation` or `passive` item.
- It combines:
  - a passive social-state rider on specific creature kinds;
  - a charge-spending call effect that depends on ambient rat availability;
  - an ongoing per-round "keep playing" upkeep loop;
  - repeated save-based sway/control over nearby independent swarms;
  - per-creature 24-hour lockout after a successful save or after control breaks.

Why existing families are insufficient:

- `MagicItemMechanics.composite` can only combine `passive` and `activation` parts.
- The summon/control half is not an honest `activation`:
  - the swarms are not created ex nihilo like `spawned_creature`;
  - they are existing nearby creatures, caller/GM-gated by environmental availability;
  - they remain independent until they enter range and fail a save;
  - control persists only while the item user spends a Magic action each round to keep playing.
- The passive rider also lacks a clean atom:
  - "ordinary rats and giant rats are Indifferent toward you and won't attack you unless you threaten or harm them"
  - there is no current effect atom for creature-attitude override / nonaggression by creature type.

Recommended widening:

1. `new_variant` — widen `MagicItemComponentMechanics` / `MagicItemMechanics` so a magic item can host an `ongoing_effect`-style component, not just `passive` and `activation`.
   - Evidence: "for as long as you continue to play the pipes each round as a Magic action"
   - Reason: the item's main mechanic is a maintained control field with repeated event windows, not a one-shot activation.

2. `new_subgraph` — add a maintained creature-influence/control loop for extant creatures entering range, saving, becoming controlled, and losing control on break conditions.
   - Evidence: "Whenever a Swarm of Rats ... comes within 30 feet of you while you are playing the pipes, the swarm makes a DC 15 Wisdom saving throw."
   - Evidence: "On a failed save, the swarm is swayed by the pipes' music and becomes Friendly to you and your allies ..."
   - Evidence: "If a Friendly swarm starts its turn more than 30 feet away from you, your control over that swarm ends ..."
   - Reason: this is not a current spell or item subgraph; it is an ongoing state machine over existing nearby creatures.

3. `new_atom` — `modify_creature_attitude` (or equivalent) with creature filtering.
   - Evidence: "ordinary rats and giant rats are Indifferent toward you and won't attack you unless you threaten or harm them"
   - Reason: the current effect inventory has no honest way to encode attitude/friendliness/nonaggression state.

Notes:

- The GM/environment gate ("if enough rats are within half a mile ... as determined by the GM") is caller-owned, but it is not the whole unit. The deterministic control mechanic still needs surface support.
- Because the main mechanic does not fit the available families, I did not author placeholder Dhall/JSON content files.
