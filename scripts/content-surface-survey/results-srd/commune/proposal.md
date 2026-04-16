# Commune — dm_agenda

## Why this unit cannot be encoded

Commune's mechanic is entirely DM adjudication. The spell contacts a deity and asks up to three yes/no questions. The outcome is:

- **Yes / No** — the DM determines the "correct" answer based on the deity's knowledge
- **"Unclear"** — the DM decides when a question lies beyond the deity's knowledge
- **Short phrase** — the DM substitutes when a one-word answer would be misleading

None of these map to a deterministic mechanical resolution. There is no attack roll, saving throw, damage, heal, condition, concentration lock, or any other state the engine can own.

The repeat-cast failure rule ("cumulative 25% chance of no answer after the first casting before a Long Rest") is the only mechanical element. But its outcome — silence — is also purely narrative. There is no engine state that changes on failure.

## Classification

`dm_agenda` — the unit's entire purpose is information delivery via divine adjudication. Per ARCHITECTURE.md: DM rulings, agenda decisions, and notification surfaces are not core-mechanics atoms. Commune has no core mechanics.

## What would be needed to encode it

A hypothetical encoding would require:
1. A new `information_query` family (or similar) — not in any existing `SpellMechanics` variant
2. A way to represent "DM answers with yes/no/unclear" as a deterministic signal — which contradicts the spell's design intent
3. Possibly a `cumulative_use_failure` resource pattern not present in the surface

None of these are appropriate widenings. The spell is legitimately out-of-core.
