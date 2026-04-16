# Proposal: Teleportation Circle — surface_widening

## Unit

- **Name**: Teleportation Circle
- **Slug**: `teleportation_circle`
- **Kind**: spell
- **Level**: 5 (Conjuration)

## Why this unit does not fit today

Teleportation Circle creates a portal — a 5-foot-radius circle on the ground that any creature can step through to be instantly transported to a named permanent teleportation circle. The structural pattern maps to `anchored_trigger` (cast → plant anchor → event → release effect), but two `types.ts` gaps prevent a valid encoding:

1. **`AnchoredSignal` has no transport variant** — only `audible | mental`. Adding a `transport` signal kind is the primary requirement.
2. **`AnchorTarget.area` only supports `cube` shape** — the portal is a circle (5-ft radius). The gap is specific to `AnchorTarget`; `Attachment.area` already supports sphere/radius.

A third surface gap is secondary but required for honest encoding:

3. **No destination type for transport** — the caster chooses at cast time which permanent teleportation circle (identified by sigil sequence) to connect to. A `chosenAtCast: true` destination sub-shape with `kind: "permanent_teleportation_circle"` is needed on the transport signal.

## Closest existing family: `anchored_trigger`

The `anchored_trigger` pattern (Alarm reference) maps as follows:

| Teleportation Circle mechanic | Anchored trigger concept |
|-------------------------------|--------------------------|
| 1-minute casting, consumes 5th-level slot | `store` procedure, `action_quota`, `spell_slot` |
| 5-ft-radius circle drawn on ground | `anchor: area` (needs circle shape) |
| Any creature that enters | `event: enters_area` ✓ already exists |
| No creature exemption | no filter (empty `filters` array) |
| Transport to destination circle | `signal: transport` ← **missing** |
| Lasts until end of next turn (1 round) | `duration: timed, 1 round` → `persist → expire` ✓ |

## Proposed surface additions

### 1. `AnchorTarget.area.shape.circle`

```typescript
export type AnchorTarget =
  | { readonly kind: "location"; readonly description: "door_or_window" }
  | {
      readonly kind: "area";
      readonly shape:
        | { readonly kind: "cube"; readonly maxSideFeet: number }
        | { readonly kind: "circle"; readonly radiusFeet: number };  // NEW
    };
```

### 2. `AnchoredSignal.transport`

```typescript
export type AnchoredSignal =
  | { readonly kind: "audible"; ... }
  | { readonly kind: "mental"; ... }
  | {                                                               // NEW
      readonly kind: "transport";
      readonly destinationKind: "permanent_teleportation_circle";
      readonly destinationChosenAtCast: true;
      readonly samePlaneConstraint: true;
    };
```

The v4 atom `transport_exile` already exists in the taxonomy — this is a surface-only addition that exposes the existing atom in the `anchored_trigger` release payload.

## Semantic note: continuous vs. one-shot trigger

Alarm fires a single signal when the first matching creature triggers it (one-shot). Teleportation Circle's portal transports **every** creature that enters during its 1-round duration (continuous/multi-fire). If `anchored_trigger` is semantically one-shot, a `continuous: true` flag or a new `portal` family may be warranted. This is a secondary concern; the two blocking surface gaps above must be resolved first.

## Atoms that would be emitted (theoretical)

If encoded honestly after the widening:

```
spell_root → store
store → action_quota (1-minute cast)
store → spell_slot (≥ level 5)
store → area anchor (circle, 5-ft radius, 10-ft range)  [needs circle shape]
store → persist → expire (1 round)
area anchor → post_action_window (enters_area)
post_action_window → release
release → transport signal  [needs transport variant]
```

Atom kinds: `spell_root`, `store`, `action_quota`, `spell_slot`, `area`, `persist`, `expire`, `post_action_window`, `release`, `transport_exile`

Relations: `roots`, `consumes`, `attaches_to`, `stores`, `opens_window`, `prompts`, `grants`, `persists_until`
