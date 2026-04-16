# Locate Creature — Survey Proposal

## Outcome: `dm_agenda`

Locate Creature cannot be honestly encoded in the current content surface because its core mechanic is purely informational. No encoding path exists that would produce a meaningful mechanical trace.

---

## Why dm_agenda

The spell text reads: *"You sense the direction to the creature's location if that creature is within 1,000 feet of you."*

The entire output of the spell is directional awareness delivered to the caster. Concretely:

| Attribute | Value |
|---|---|
| Attack roll? | No |
| Saving throw? | No |
| Damage? | No |
| Condition applied? | No |
| Roll modifier? | No |
| AC delta? | No |
| HP change? | No |
| Resource consumed (beyond spell slot + concentration)? | No |

The only deterministic rules are:
- Detection fires if and only if the target is within 1,000 feet.
- Lead of any thickness blocks detection entirely.

Both conditions gate *whether* the caster receives the directional signal — but the signal itself is a notification routed to the player/DM, not to the combat engine. Per `ARCHITECTURE.md`, notification surfaces and caller-owned informational facts are explicitly out-of-core.

---

## Why not surface_widening

One might argue: add a new `OngoingOperation` kind, e.g.:

```typescript
export type DetectCreatureOperation = {
  readonly kind: "detect_creature";
  readonly radiusFeet: number;
  readonly blockedBy: "lead";
};
```

This would widen `OngoingOperation` and allow Locate Creature to typecheck. However:

1. The tracer would emit a `detect_creature` atom — but what category does it belong to? It is not `effect`, `resolution`, `window`, `resource`, or `scaling`. It is a sensing/notification atom.
2. The v4 taxonomy does not include a `detect_creature` or `sense_direction` atom. Adding one would require `atom_widening`.
3. Even if the atom existed, the combat engine has no deterministic behavior to implement: "direction to creature" is a display fact, not a state transition.

The honest conclusion is that no amount of surface or atom widening produces a meaningful trace — the mechanic is structurally outside the core.

---

## Comparison to classified units

| Spell | Classification | Reason |
|---|---|---|
| Alarm | `anchored_trigger` | Plants a trigger; release fires a signal. The *trigger* mechanism is core; the signal is caller-owned but the pattern fits. |
| Detect Magic | (not yet encoded) | Expected `dm_agenda` — reveals magical auras, purely informational. |
| Commune | (not yet encoded) | Expected `dm_agenda` — DM answers yes/no, no mechanical effect. |
| **Locate Creature** | **`dm_agenda`** | Continuous directional sensing, no combat state change. |

---

## Notes on the lead-blocking rule

The "blocked by lead" clause is a deterministic filter on when the detection signal fires. It could in principle be modeled as an `AnchoredFilter`-like predicate on a sensing operation. However, this only deepens the problem: the filter gates a notification, not a mechanical resolution. Modeling it precisely would require both atom_widening (new `detect_creature` atom) and structural work (new sensing family), all in service of routing information that is caller-owned by definition.

No encoding is recommended until the architecture explicitly adopts a detection/sensing family with a defined runtime consumer.
