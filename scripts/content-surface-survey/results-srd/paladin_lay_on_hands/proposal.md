# Proposal: Lay On Hands — surface_widening

## Unit

- **Name**: Lay On Hands
- **Kind**: class_feature (Paladin L1)
- **Provenance**: SRD 5.2.1, Classes/Paladin#Lay On Hands

## What fits

The primary healing mechanic encodes cleanly:

- `charge_pool` resource with `LinearPerLevel<number>` cap (`base=5, perLevel=5, axis=class, startingAtLevel=1`) — pool equals 5 × paladin level.
- `DiceAmount.resource_spent` — amount healed equals player-chosen charges spent, bounded by pool remainder. The `types.ts` comment literally names Lay on Hands as the canonical pressure case for this variant.
- `ClassFeatureActivationCost.bonus_action` — Bonus Action to activate.
- `ResetCadence.long_rest` — pool replenishes on Long Rest.
- `heal_hp` with `target: "target_creature"` — heals the touched creature (not just self).
- `CastTimeEffectModeChoice` in the `direct` phase — captures mutual exclusivity of the two modes (heal HP vs. remove Poisoned).

## The gap

### Missing: per-option fixed charge cost on `CastTimeEffectModeChoice`

SRD text:
> You can also expend **5 Hit Points** from the pool of healing power to remove the Poisoned condition from the creature; those points don't also restore Hit Points to the creature.

The cure-poison mode always costs **exactly 5 charges**, regardless of player choice. The current `CastTimeEffectModeChoice.options` element has no cost field:

```typescript
readonly options: ReadonlyNonEmptyArray<{
  readonly id: string;
  readonly displayName: string;
  readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
}>;
```

There is no `fixedChargeCost?: number` (or similar) to pin an option to a specific charge expenditure. Without it, the trace shows `remove_condition` as a freely-selectable mode branch with no encoded cost constraint. The player could theoretically spend any number of charges when choosing that mode — the RAW constraint (exactly 5) is lost.

## Proposed widening

Add an optional `fixedChargeCost` field to `CastTimeEffectModeChoice.options`:

```typescript
readonly options: ReadonlyNonEmptyArray<{
  readonly id: string;
  readonly displayName: string;
  readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
  // When present, activating this option always spends exactly this
  // many charges from the activation's charge_pool resource, regardless
  // of player choice. Lay On Hands cure-poison mode: fixedChargeCost=5.
  readonly fixedChargeCost?: number;
}>;
```

This is a **surface_widening** (new variant field on an existing type), not an atom_widening — all v4 atoms involved (`charge`, `remove_condition`, `choose`) already exist.

## Classification

| | |
|---|---|
| Outcome | `surface_widening` |
| Missing atom | none |
| Missing surface shape | `CastTimeEffectModeChoice.options[].fixedChargeCost?: number` |
| Confidence | high |
