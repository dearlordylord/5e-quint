# 06. Stat-Indexed Effect Pipeline

## Idea

Compute derived values through an explicit stat/effect pipeline instead of ad hoc per-feature code.

## Current Fit In This Repo

- `battle.qnt` already has narrow derived pipelines such as speed adjustment from effects.
- `packages/core/src/battle-machine-helpers.ts` recomputes effective speed from base speed plus effect deltas and movement constraints.
- `ARCHITECTURE.md` already points toward modifier features as generic fields on `Combatant`.

## Application To Our Code

This idea maps well to the TS support layer and partly to the Quint frontier.

Good candidates:

- effective speed
- AC bonuses
- save bonuses
- granted resistances/vulnerabilities/immunities
- attack-roll advantage gates

The important constraint is that the pipeline must remain typed and enumerable. Avoid a generic string-key modifier system.

## Quint Impact

Moderate to high for modifier features. The best use is not a free-form stat engine; it is a closed, typed set of modifier pipelines that Quint can model and MBT can project.

## Domain Language Impact

Moderate. Terms like `base`, `granted`, `effective`, `expiry owner`, and `pipeline` become sharper.

## Recommendation

Adopt selectively. Use closed typed pipelines for generic modifier families, especially the planned modifier-feature frontier in `ARCHITECTURE.md`.
