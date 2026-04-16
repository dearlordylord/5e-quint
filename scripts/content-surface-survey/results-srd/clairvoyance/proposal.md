# Proposal: Surface Widenings for Clairvoyance

## Unit

**Clairvoyance** — SRD 5.2.1, 3rd-level Divination spell, Concentration 10 min, Range 1 mile.

## Outcome

`surface_widening` — The `ongoing_effect` family is the right family. Two variants of existing surface types are missing. All required v4 atoms already exist.

## Why `ongoing_effect`

Clairvoyance plants a persistent sensor at a remote location and maintains it while the caster concentrates. The sensor enables continuous remote perception. This matches the `ongoing_effect` family shape (persistent state during concentration/timed duration with an ongoing operation).

It is **not** `anchored_trigger`: that family models "arm a trap that fires when a trigger event occurs, then releases a signal." Clairvoyance's sensor has no trigger event and no release — it is continuously and actively used by the caster.

## Gap 1: `Attachment { kind: "location" }`

**What's missing:** The `Attachment` union in `types.ts` covers `self`, `target`, `area`, and `mark`. Clairvoyance's sensor is placed at a chosen remote **location** — up to 1 mile away, either a familiar place or an obvious unfamiliar one. None of the existing attachment kinds model this.

**Evidence:**
> "You create an Invisible sensor within range in a location familiar to you (a place you have visited or seen before) or in an obvious location that is unfamiliar to you."

**Proposed shape:**
```typescript
| {
    readonly kind: "location";
    readonly chosenAt: "cast_time";
    readonly constraint: "familiar_or_obvious_unfamiliar";
  }
```

**Why not `AnchorTarget.location`?** `AnchorTarget` exists but it only applies inside the `anchored_trigger` family. It also has a domain-specific `description: "door_or_window"`. Clairvoyance's location is a general chosen point, not a door or window. The `Attachment` union needs its own `location` variant.

**v4 atom used:** `location` (already in taxonomy §3 Attachment Atoms).

## Gap 2: `OngoingOperation { kind: "remote_sense" }`

**What's missing:** `OngoingOperation` currently has two variants: `roll_modifier` and `damage_on_hit`. Clairvoyance's ongoing operation is routing the caster's perception through the sensor — the caster sees or hears as if present in the sensor's space. This is neither a roll modifier nor damage.

**Evidence:**
> "When you cast the spell, choose seeing or hearing. You can use the chosen sense through the sensor as if you were in its space."

**Proposed shape:**
```typescript
| {
    readonly kind: "remote_sense";
    readonly senses: ReadonlyArray<"sight" | "hearing">;
    readonly choiceAt: "cast_time";
  }
```

**v4 atom used:** `grant_sense` (already in taxonomy §9 Effect Atoms). The distinction from Darkvision-style `grant_sense` is directional: it routes an existing sense to a remote attachment, rather than granting a new sense type to the creature.

## Gap 3 (secondary): Bonus Action mode-switch rider

**What's missing:** During concentration, the caster can spend a Bonus Action to switch the active sense. No existing `OngoingOperation` variant models active mid-concentration player choice with a resource cost.

**Evidence:**
> "As a Bonus Action, you can switch between seeing and hearing."

**Proposed shape:** An optional `activeControl` field on the `remote_sense` operation, specifying the cost (`bonus_action`) and the switchable set (`senses`). Alternatively, a new `ongoing_bonus_action` rider type. This is secondary — the `remote_sense` gap above must be resolved first.

**v4 atom used:** `bonus_action_quota` (already a resource atom). The switch action would consume it.

## Non-gap: Range

The 1-mile range can be encoded as `{ kind: "point", feet: 5280 }` without any surface change. The `Range` type's `feet` field is not constrained to short values.

## Summary

| Gap | Type of widening | v4 atoms needed | New atoms? |
|-----|-----------------|-----------------|------------|
| `Attachment.location` | New variant of `Attachment` | `location` | No |
| `OngoingOperation.remote_sense` | New variant of `OngoingOperation` | `grant_sense` | No |
| Bonus action mode-switch rider | New variant (secondary) | `bonus_action_quota` | No |

All three gaps are surface variants. No new v4 atoms are required.
