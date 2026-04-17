# Proposal: Ring of Djinni Summoning

**Outcome:** `structural_widening`

## Unit

*Ring of Djinni Summoning* — Legendary magic item, requires attunement.

> While wearing this ring, you can take a Magic action to summon a particular **Djinni** from the Elemental Plane of Air. The djinni appears in an unoccupied space you choose within 120 feet of yourself. It remains as long as you maintain Concentration, to a maximum of 1 hour, or until it drops to 0 Hit Points.
>
> After the djinni departs, it can't be summoned again for 24 hours, and the ring becomes nonmagical if the djinni dies.

## Why it doesn't fit

### Gap 1 — No creature-summoning mechanics family for magic items (structural)

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`.

`ActivatedAbilityMechanics` routes through `ActivationPhase`, whose `direct` variant carries `effects: ReadonlyNonEmptyArray<EffectAtom>`. `EffectAtom` has no `create_companion` or `summon_creature` variant — those are internal to the tracer's handling of `SpawnedCreatureMechanics`, which is a `SpellMechanics` family only.

The spawned creature here (the Djinni) has a full stat block from the monster catalog, a concentration duration, and command/dismissal semantics — the exact shape the `spawned_creature` spell family models. That family is simply not available on `MagicItemRecord`.

**Proposal:** Extend `MagicItemMechanics` to include `SpawnedCreatureMechanics` (or a structurally equivalent item-scoped variant). Alternatively, introduce a new `EffectAtom` variant `summon_companion` that references a monster-catalog ID and control/dismissal policy, usable inside `ActivatedAbilityMechanics.phases[].direct.effects`.

### Gap 2 — No timed post-use cooldown in `RestResetCadence` (surface_widening)

The 24-hour cooldown is explicitly tied to departure time, not to the clock resetting at dawn or on a rest. Current `RestResetCadence` variants:

- `short_or_long_rest` / `short_rest` / `long_rest` / `partial_short_full_long` — rest-based
- `dawn` — daily at dawn (regains charges)
- `never` — permanently exhausted

None matches "24 hours after the summoned creature departs." A new variant is needed:

```typescript
| {
    readonly kind: "timed_after_use";
    readonly hours: number;
  }
```

This would also cover other items with fixed-duration cooldowns independent of rest scheduling.

### Gap 3 — No creature-death destruction trigger in `ItemDestructionPolicy` (surface_widening)

The ring becomes nonmagical if the djinni dies — a one-way permanent state change triggered by a companion's death. Existing `ItemDestructionPolicy` variants model charge-based destruction (`last_charge_roll`, `permanent_on_empty`) but not event-based destruction tied to a companion's fate.

**Proposal:**

```typescript
| {
    readonly kind: "on_companion_death";
    readonly effect: "becomes_nonmagical";
  }
```

## Encoding path once gaps are closed

Once `MagicItemMechanics` admits `SpawnedCreatureMechanics` (or a `summon_companion` EffectAtom exists), the encoding would be:

```
kind = "magic_item"
rarity = "legendary"
requiresAttunement = True
mechanics = {
  family = "activation",          -- or spawned_creature if extended to items
  activationCost = { kind = "action" },
  resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } },
  resetCadence = { kind = "timed_after_use", hours = 24 },
  duration = {
    kind = "concentration",
    upTo = { unit = "hour", amount = 1 }
  },
  -- phases: direct → summon_companion referencing "djinni" catalog entry
  -- control: bonus_action command, 120 ft range
  -- dismissal: disappears at 0 HP or spell end
}
destruction = { kind = "on_companion_death", effect = "becomes_nonmagical" }
```

## Classification

`structural_widening` — the dominant mechanic (item-activated creature summoning) has no honest encoding path in the current surface. Two secondary widenings (cooldown cadence, destruction trigger) are `surface_widening` once the structural gap is addressed.
