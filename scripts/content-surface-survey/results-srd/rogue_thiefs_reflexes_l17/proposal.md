# Proposal: `grant_extra_turn` atom for Thief's Reflexes

## Unit

**Thief's Reflexes** — Rogue L17 class feature  
Provenance: SRD 5.2.1, Classes/Rogue#Thief's Reflexes

## SRD Text

> You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10.

## Why the Current Surface Cannot Encode This Honestly

The feature fits the **passive** mechanics family: it is always active, requires no activation cost or resource, and triggers automatically at the start of combat. The container is correct.

The gap is at the effect-atom level. The closest existing atom is `grant_extra_action`, which models Action Surge's "one additional action" grant — it adds one of the 12 SRD standard action kinds to the creature's budget for a single turn. Thief's Reflexes does something structurally different:

1. It grants a **second complete turn** (not a second action within an existing turn).
2. The second turn fires at a **specific initiative count** derived from the character's Initiative roll minus 10.
3. The grant is **scoped to the first round of combat only**; subsequent rounds proceed normally.

These three parameters (turn granularity, initiative-offset scheduling, round scope) have no encoding surface in v4.

## Proposed Atom

```
grant_extra_turn
  category: effect
  parameters:
    initiativeOffset: number          // -10 for Thief's Reflexes
    roundScope?: "first_round_only"   // absent = unlimited (future units)
```

**Trace shape:** The passive `grant` procedure node emits a `grant_extra_turn` effect atom. The atom's `initiativeOffset` and `roundScope` are recorded as labels. No new relation type is needed — the existing `grants` relation from the passive procedure to the effect atom is sufficient.

## Classification

`atom_widening` — the passive family exists and is the correct container; the missing concept (`grant_extra_turn`) is not present in the v4 taxonomy. The v4 taxonomy lists `grant_extra_action` as an effect atom for extra action-economy grants, but grants at the turn-scheduling level (initiative-based second turn) are outside the current inventory.

## Impact

- Single-atom addition to `EffectAtom` union in `types.ts`.
- Single `case` branch in `traceEffectAtom` switch in `tracer.ts`.
- No new relation types or top-level family changes required.
- Future units that grant conditional extra turns (e.g., hypothetical class features or magic items) would reuse the same atom with different `roundScope` or `initiativeOffset` values.
