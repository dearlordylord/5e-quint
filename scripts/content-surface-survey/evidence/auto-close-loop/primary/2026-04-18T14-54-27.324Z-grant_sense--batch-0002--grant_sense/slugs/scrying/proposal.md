# Proposal: Scrying surface widenings

## Unit

**Scrying** — Level 5 Divination, Concentration (10 min), SRD 5.2.1

## Outcome

`surface_widening` — The activation/save_gate family is the right structural fit, but
four surface types need new variants before the unit can be encoded honestly.

## Structural fit

The spell maps cleanly to `ActivationMechanics` with a `save_gate` phase:

```
activate (10-min cast)
  → consumes action_quota (CastingTime.minutes, 10 min)
  → consumes spell_slot ≥ 5
  → consumes concentration_lock
  → save_gate (Wis save, DC: caster spell save DC + contextual modifiers)
      on fail → ??? (sensor: grant_sense, remote view/hear, follows target)
      on success → none + reuse_lock(24h, per-target)
```

The alternative location mode is a second cast path:

```
activate (10-min cast)
  → attachment: location (seen by caster)
  → grants sensor (grant_sense, fixed, no save)
```

## Gap 1 — `Effect.grant_sense` (blocking)

**What's missing:** The `Effect` union is `DamageEffect | NoneEffect`. Scrying's
on-fail effect creates an invisible intangible sensor through which the caster
sees and hears at the target's location. This is a `grant_sense` effect in v4
taxonomy, but the surface `Effect` type does not expose it.

**Evidence:** "On a failed save, the spell creates an Invisible, intangible sensor
within 10 feet of the target. You can see and hear through the sensor as if you
were there."

**Proposed variant:**
```typescript
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly senses: ReadonlyArray<"sight" | "hearing">;
  readonly through: "sensor";        // caster perceives via a remote sensor
  readonly sensorFollowsTarget: boolean;
};
```

This directly maps to the v4 `grant_sense` atom and `persist` lifecycle (sensor
persists for spell duration). The sensor's visibility ("luminous orb") is a
narrative/DM-caller concern, consistent with ARCHITECTURE.md.

## Gap 2 — `DcSource.contextual_save_modifier` (blocking)

**What's missing:** Scrying applies additive modifiers to the Wis saving throw
based on two independent contextual axes at cast time. `DcSource` has only
`caster_spell_save_dc` (flat) and `weapon_attack_dc` (base + attack ability +
PB). Neither supports contextual modifiers.

**Evidence:**

| Caster's knowledge | Save modifier |
|--------------------|--------------|
| Secondhand (heard of target) | +5 |
| Firsthand (met target) | +0 |
| Extensive (know target well) | −5 |

| Physical connection | Save modifier |
|--------------------|--------------|
| Picture or likeness | −2 |
| Garment or possession | −4 |
| Body part, hair, or nail | −10 |

**Proposed variant:**
```typescript
export type ContextualSaveDc = {
  readonly kind: "caster_spell_save_dc_with_modifiers";
  readonly modifierAxes: ReadonlyArray<{
    readonly axis: string;          // e.g. "caster_knowledge", "physical_connection"
    readonly chosenAtCast: true;    // player selects the applicable row at cast time
    readonly tiers: ReadonlyArray<{
      readonly description: string;
      readonly saveModifier: number; // positive = harder for caster (target rolls higher)
    }>;
  }>;
};
```

The modifier is applied to the **target's roll** (positive = advantage for the
target). This is distinct from changing the DC itself.

## Gap 3 — `SaveSuccessEffect.reuse_lock` (secondary)

**What's missing:** On a successful save the caster cannot target that creature
with Scrying again for 24 hours. No surface type represents a temporal per-target
reuse restriction as a save-outcome side-effect.

**Evidence:** "On a successful save, the target isn't affected, and you can't use
this spell on it again for 24 hours."

**Proposed variant:**
```typescript
export type ReuseLockEffect = {
  readonly kind: "reuse_lock";
  readonly target: "save_target";
  readonly durationHours: number;   // 24
};
```

This would be an additional item in the `onSuccess` branch of the save_gate phase,
alongside `NoneEffect`.

## Gap 4 — Location alternative targeting (secondary)

**What's missing:** Scrying can target a seen location instead of a creature.
When used this way the sensor appears at the location (no save, no movement).
No current `Attachment` or `ActivationPhase` variant represents a mutually
exclusive creature-vs-location choice at cast time.

**Evidence:** "Instead of targeting a creature, you can target a location you have
seen. When you do so, the sensor appears at that location and doesn't move."

**Proposed approach:** A new `CastingMode` discriminator or a second `ActivationPhase`
variant with an optional `target_creature | target_location` union. This is
secondary — the creature-targeting path is the main mechanic.

## What does NOT need widening

- `CastingTime.minutes` — already in the surface (`{ kind: "minutes", amount: 10, ritual: false }`)
- `Duration.concentration` — already in the surface
- `SpellLevel` 5 — already in the surface
- `SpellSchool` "divination" — already in the surface
- `save_gate` phase structure — already in the surface
- `grant_sense` atom — already in v4 taxonomy (Gap 1 is surface_widening, not atom_widening)
