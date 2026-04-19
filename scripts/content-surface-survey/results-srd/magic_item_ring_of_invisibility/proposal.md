# Proposal: Ring of Invisibility — surface_widening

## Unit

- **Name**: Ring of Invisibility
- **Kind**: magic_item
- **Rarity**: legendary (requires attunement)
- **Provenance**: SRD 5.2.1 — MagicItems#RingOfInvisibility

## SRD Text

> While wearing this ring, you can take a Magic action to give yourself the Invisible condition. You remain Invisible until the ring is removed or until you take a Bonus Action to become visible again.

## What fits the current surface

The ring encodes cleanly in the `activation` family:

| Mechanic | Encoding |
|---|---|
| "While wearing this ring" | `condition: { kind: "wearing_item" }` |
| "take a Magic action" | `activationCost: { kind: "standard_action", action: "magic" }` |
| Unlimited activations | `resource: { kind: "use_count", cap: { kind: "unlimited" } }` + `resetCadence: { kind: "never" }` |
| "give yourself the Invisible condition" | `apply_condition: "invisible"` on `attachment: { kind: "self" }` |
| Requires attunement | `requiresAttunement: true` |

The tracer ran without errors and produced a well-formed graph.

## What does NOT fit: missing `DurationEndTrigger` variants

The RAW text specifies two end conditions for the invisible state:

1. **"until the ring is removed"** — item removal as an end trigger
2. **"until you take a Bonus Action to become visible again"** — voluntary bearer bonus-action deactivation

Neither has a matching `DurationEndTrigger` variant. The existing variants are:

- `target_makes_attack_roll`
- `target_deals_damage`
- `target_casts_spell`
- `target_dons_armor`
- `target_damaged_by_caster_or_ally`
- `target_takes_damage`
- `caster_recasts_spell`

None of these covers item removal or a bearer's optional bonus-action toggle.

The `duration` field was **intentionally omitted** from the encoding rather than falsified. The invisible condition is applied but carries no modeled end trigger in the surface — which is an incomplete-but-honest representation of the gap.

## Proposed widenings

### 1. `DurationEndTrigger.item_unequipped`

A new variant of `DurationEndTrigger`:

```typescript
| { readonly kind: "item_unequipped" }
```

**Justification**: Ring of Invisibility is not the only item where removal ends an active condition. This trigger fires when the bearer removes (doffs) the item that hosts the active effect. It is distinct from:
- `target_dons_armor` (armoring-up event, not removal)
- `"dispel"` in `permanent.endsOn` (targets the magical effect, not the equipment state)

**SRD evidence**: "You remain Invisible until the ring is removed"

### 2. `DurationEndTrigger.wearer_spends_bonus_action`

A new variant of `DurationEndTrigger`:

```typescript
| { readonly kind: "wearer_spends_bonus_action" }
```

**Justification**: This covers the toggleable-invisibility pattern: the bearer voluntarily spends a Bonus Action to deactivate the applied condition. It is distinct from existing triggers (which all watch for actions taken on the target by others, or for actions the target takes on their turn as offensive acts). This is a deliberate deactivation cost paid by the bearer.

**SRD evidence**: "until you take a Bonus Action to become visible again"

## Classification rationale

- **Not `atom_widening`**: The v4 atom `apply_condition` covers the effect. No new effect atom is needed.
- **Not `structural_widening`**: The `activation` family + `PassiveMechanics` composition is not needed; all mechanics fit `activation`.
- **`surface_widening`**: Two new variants of an existing surface type (`DurationEndTrigger`) are needed. The ring otherwise encodes completely.

## Confidence

**High** — the gap is precisely identified and bounded. The rest of the unit traces cleanly.
