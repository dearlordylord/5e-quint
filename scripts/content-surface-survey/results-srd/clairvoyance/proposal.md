# Proposal: Clairvoyance widening

## Outcome: `atom_widening`

Clairvoyance cannot be encoded honestly. Two gaps block it.

---

## Gap 1 (primary blocker): `grant_remote_perception` atom

**SRD text:**
> You create an Invisible sensor within range in a location familiar to you… You can use the chosen sense through the sensor as if you were in its space.

**What the mechanic is:**  
The caster projects a sensor to a remote location and then uses their sight or hearing *through that sensor* — effectively borrowing the sensor's spatial position for the purpose of one sensory channel.

**Why no existing atom covers it:**

- `grant_sense` — grants a new sense type (darkvision 60 ft, blindsight, etc.) *to the creature*. It does not place a remote observation point.
- `detect` — scans for a closed set of properties (magic, evil_and_good, poison_and_disease, thoughts) within a radius around the caster. It is not general remote vision or hearing.
- `create_object` — creates tangible, potentially destructible matter. The sensor is intangible and invulnerable — not an object in the SRD sense.

**Proposed atom:**

```typescript
| {
    readonly kind: "grant_remote_perception";
    readonly channels: ReadonlyNonEmptyArray<"sight" | "hearing">;
    // Perceive through the spell's attachment anchor (sensor location)
    // as if occupying that space.
  }
```

The two-channel `channels` field parallels `create_illusion`'s `IllusionSensoryChannel`. Only `sight` and `hearing` are pressured by Clairvoyance; future units (e.g. a scrying variant) may add others.

The attachment anchor for the sensor is the existing `area` or `object` attachment at `rangeOrigin: "spell_sensor"` — the `spell_sensor` AttachmentRangeOrigin concept already exists on the surface for exactly this remote-measurement pattern.

---

## Gap 2 (secondary): `allowsMidDurationSwitchAs: "bonus_action"` variant

**SRD text:**
> As a Bonus Action, you can switch between seeing and hearing.

**Current surface:**
```typescript
export type CastTimeEffectModeChoice = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{...}>;
  readonly allowsMidDurationSwitchAs?: "magic_action";
};
```

The only supported mid-duration switch cost is `"magic_action"`. Clairvoyance's switch costs a **Bonus Action**.

**Proposed widening:**
```typescript
readonly allowsMidDurationSwitchAs?: "magic_action" | "bonus_action";
```

This is a closed enum extension with no semantic complexity — the tracer already emits an `action_quota` / `bonus_action_quota` resource node for the switch; adding the variant lets the tracer branch correctly.

---

## Sketch of what a clean encoding would look like

```dhall
{ kind = "spell"
, id = "clairvoyance"
, name = "Clairvoyance"
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "divination"
    , castingTime = { kind = "minutes", amount = 10, ritual = False }
    , range = { kind = "point", feet = 5280 }   -- 1 mile
    , components = { v = True, s = True, m = Some "a focus worth 100+ GP..." }
    , duration = { kind = "concentration", upTo = { unit = "minute", amount = 10 } }
    , attachment = { kind = "area", shape = ..., origin = { kind = "point_within_range" }, rangeOrigin = "spell_sensor" }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect =
              { kind = "grant_remote_perception"     -- MISSING
              , channels = [ "sight", "hearing" ]
              }
          }
        ]
    }
}
```

The `CastTimeEffectModeChoice` (choose sight vs. hearing at cast, switch via Bonus Action) would layer on top once both gaps are resolved.

---

## Classification

| Gap | Kind | Blocking? |
|-----|------|-----------|
| `grant_remote_perception` atom | `atom_widening` | Yes — no honest substitute |
| `allowsMidDurationSwitchAs: "bonus_action"` | `surface_widening` | Yes (secondary) |
