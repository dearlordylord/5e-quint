# Maze — Surface Widening Proposal

## Unit

- **Name:** Maze
- **Level:** 8 conjuration
- **Family:** `ongoing_effect` (concentration, up to 10 minutes, single target)
- **Outcome:** `surface_widening`

## Why it doesn't encode today

Maze fits the `ongoing_effect` family structurally — it is a concentration spell that applies a persistent state to one target for the duration. The header fields (level, school, castingTime, range, components, duration) all map cleanly. The two mechanics that block encoding are both gaps in `OngoingOperation`.

### Gap 1: No `transport_exile` operation variant

**Rule text:** "You banish a creature that you can see within range into a labyrinthine demiplane. The target remains there for the duration or until it escapes the maze."

The v4 atom `transport_exile` covers this concept. But `OngoingOperation` in `types.ts` only exposes:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can represent "the target is exiled to an extradimensional space and removed from the battlefield for the duration." There is no way to write an `OngoingOperation` that is not a lie.

**Proposed widening:** Add a new variant to `OngoingOperation`:

```typescript
export type TransportExileOperation = {
  readonly kind: "transport_exile";
  readonly destination: "extradimensional_demiplane";   // closed enum, widen as needed
};
```

The tracer would emit a `transport_exile` effect atom attached to the target, with a `persist` → `expire` lifecycle chain for the concentration duration.

---

### Gap 2: No escape condition on `OngoingEffectMechanics`

**Rule text:** "The target can take a Study action to try to escape. When it does so, it makes a DC 20 Intelligence (Investigation) check. If it succeeds, it escapes, and the spell ends."

This is a **target-initiated escape condition**: while the ongoing effect holds, the affected creature can spend a specific action to make an ability check; on success the effect ends early. This pattern is distinct from:

- `save_gate` in `ActivationMechanics` — that is a caster-side, cast-time save, not a repeatable target-action
- `repeat_save` (v4 atom) — covers repeated saves on creature turns, but this is an ability check gated on taking the Study *action*, not a passive save

No surface type exposes this. `OngoingEffectMechanics` has no optional `escapeCondition` field.

**Proposed widening:** Add an optional `escapeCondition` field to `OngoingEffectMechanics`:

```typescript
export type AbilityCheckSpec = {
  readonly ability: Ability;
  readonly skill?: string;   // optional named skill ("investigation", etc.)
};

export type EscapeCondition = {
  readonly cost: { readonly kind: "action"; readonly actionKind: StandardActionKind };
  readonly check: AbilityCheckSpec;
  readonly dc: DcSource;
  readonly onSuccess: "end_effect";
};
```

The tracer would emit:
- `ability_check` resolution atom gated by `action_window` (Study action)
- On success branch: `expire` lifecycle atom ending the ongoing effect

---

## What traces cleanly today (if gaps were filled)

- `spell_root` → `activate` → `action_quota` + `spell_slot` (level 8) + `concentration_lock`
- `concentrate` → `expire` (≤ 10 minutes)
- `activate` → `attaches_to` → `target` (one, 60 ft)
- `activate` → `grants` → `transport_exile` effect → `attaches_to` target
- `transport_exile` → `persist` → `expire` (duration end)
- escape condition: `action_window` (Study) → `ability_check` (DC 20 Int/Investigation) → on success → `expire`
- `return_on_end` lifecycle atom (target reappears in original space on spell end)

All atoms used (`transport_exile`, `ability_check`, `return_on_end`, `action_window`) exist in v4 taxonomy. No new atoms required — only new surface variants/fields.
