# Call Lightning — Encoding Notes

**Outcome:** `clean`

## What encoded cleanly

Call Lightning fits the `ongoing_effect` family without any surface widening:

- **Main attachment:** `area` cylinder (60 ft radius, 10 ft tall, `point_within_range`) — the storm cloud.
- **Initial phase:** `save_gate` with its own `area` sphere attachment (5 ft radius, `point_within_range`) for the first bolt fired at cast time. Dex save, caster spell save DC, 3d10 lightning on fail, `half_damage` on success.
- **Operation:** `on_caster_spends_action` (Magic action) → `save_gate` (Dex, same DC, same damage). The ongoing save_gate inherits the cloud cylinder as its host attachment per `OngoingEffect.save_gate` semantics.
- **Upcast scaling:** `linear_per_level` (axis=`slot`, base=3d10, perLevel={dice:1}, startingAtLevel=3) — +1d10 per slot above 3.

## What was deliberately omitted

**Outdoor storm bonus** (DM-agenda):

> "If you're outdoors in a storm when you cast this spell, the spell gives you control over that storm instead of creating a new one. Under such conditions, the spell's damage increases by 1d10."

This +1d10 situational bonus is gated on a DM-determined environmental state (whether the party is currently outdoors in a natural storm). There is no deterministic surface trigger for "currently outdoors in a storm" — it is an ambient world condition that the DM tracks, not a mechanical predicate the surface can express. Omitted per `ARCHITECTURE.md` DM-agenda classification.

## Modeling approximation

The ongoing `save_gate` operation attaches to the cloud cylinder (the spell's main attachment) rather than to the per-activation 5-ft sphere. This is an approximation: each bolt actually targets creatures within 5 ft of a player-chosen point under the cloud, not the entire cylinder. The approximation is acceptable because:

1. The chosen point is always inside the cylinder — the cloud bounds the valid target set.
2. The per-activation targeting is player-chosen at resolution time, not a fixed authored area.
3. The `initialPhase` accurately captures the 5-ft sphere geometry for the first bolt; subsequent bolts share the same targeting logic.

No new atom or surface variant is needed to handle this.
