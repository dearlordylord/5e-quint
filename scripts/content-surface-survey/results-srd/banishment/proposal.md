# Proposal: Banishment widening

**Unit:** Banishment (spell, level 4, abjuration)
**Outcome:** `surface_widening`

## Why it doesn't fit

Banishment's core mechanic is a **Charisma saving throw** that on failure:
1. Transports the target to a harmless demiplane (`transport_exile`)
2. Inflicts the Incapacitated condition for the duration (`apply_condition`)

The spell's family is `activation` with a `save_gate` phase — that shape exists in the surface. The blocker is that `ActivationPhase.save_gate` types `onFail` / `onSuccess` as `Effect`, and `Effect` is currently:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

Neither `transport_exile` nor `apply_condition` is representable as a spell phase outcome. Forcing the spell into the current surface would require writing `onFail: { kind: "none" }`, which is a false trace — it erases the spell's entire mechanical payload.

---

## Required widenings

### 1. `Effect.transport_exile` (new variant)

A new Effect variant for planar / demiplane transport:

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: "harmless_demiplane" | "specific_plane";
  // "harmless_demiplane" = Banishment standard case
  // "specific_plane" = Banishment creature-type permanent case (DM-determined)
};
```

Maps to the v4 atom `transport_exile` (already in the taxonomy, §9 Effect Atoms).

### 2. `Effect.apply_condition` (new variant)

A new Effect variant for condition infliction as a spell phase outcome:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
```

The v4 atom `apply_condition` already exists (§9). This is a surface gap — the atom is present in the taxonomy and in `SaveGateRiderResult` (mastery context) but is absent from `Effect` (spell phase context).

### 3. `Condition.incapacitated` (new variant)

`Condition` currently only lists `"prone"`. Banishment requires `"incapacitated"`:

```typescript
export type Condition = "prone" | "incapacitated";
```

This is a narrow union extension, not a structural change.

---

## Secondary gap: creature-type conditional at expiry

The second paragraph of Banishment introduces a conditional permanent exile:

> "If the target is an Aberration, a Celestial, an Elemental, a Fey, or a Fiend, the target doesn't return if the spell lasts for 1 minute."

This requires:

- A **creature-type predicate** evaluated at cast time or continuously during concentration (Aberration / Celestial / Elemental / Fey / Fiend)
- A **branch at spell expiry**: if the full 1-minute duration was served, the target does not return — it is instead permanently transported to a plane associated with its creature type
- The terminal destination plane is **DM's choice** — the deterministic part ends at "permanent transport_exile"; the plane selection is caller-owned

This subgraph has no existing model:
- There is no creature-type predicate in any existing filter or condition type
- The "did the spell run its full duration" branch at `expire` has no encoding
- `return_on_end` (v4 lifecycle atom) has no conditional variant

**Proposed shape** (sketch only, not a full surface proposal):

```
expire --branches_on_condition--> [creature_type_is_planar_entity]
  → true + full_duration: transport_exile(specific_plane, dm_determined)
  → false OR interrupted: return_to_space
```

The `return_to_space` behavior (target reappears in original space or nearest unoccupied) is also not currently modeled as an explicit lifecycle effect — it may be implied by `return_on_end` but isn't surfaced. This is a minor secondary gap.

---

## What would be clean after widening

With `Effect` extended to include `transport_exile` and `apply_condition`, and `Condition` including `"incapacitated"`, the primary mechanic encodes as:

```
family: activation
phases:
  - kind: save_gate
    attachment: { kind: target, selection: { mode: choose_up_to, count: { kind: linear, base: 1, perSlotAboveBase: 1, baseLevel: 4 } } }
    ability: cha
    dc: caster_spell_save_dc
    onFail: [transport_exile(harmless_demiplane), apply_condition(incapacitated)]  -- would need multi-effect onFail
    onSuccess: { kind: none }
```

Note: `onFail` currently takes a single `Effect`. Banishment needs two simultaneous effects on fail (transport + incapacitate). Either `onFail` would need to become `ReadonlyArray<Effect>`, or a `CompositeEffect` variant would be needed. This is a further surface widening.

The upcast scaling (+1 target per slot above 4) maps cleanly to `choose_up_to` + `SlotScaling<number>` as modeled in Bless.

The creature-type permanent-exile subgraph remains a separate, deeper gap regardless of the Effect widening.
