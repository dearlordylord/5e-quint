# 04. Interface-Segregated Creature Subsystems

## Idea

Split creature concerns into focused subsystems instead of treating a creature as one giant bag of fields and helpers.

## Current Fit In This Repo

- `creature.qnt` and `packages/core/src/types.ts` have large, comprehensive state records.
- `ARCHITECTURE.md` already draws a boundary between battle authority and TS support.
- TS helpers are partly decomposed, but the decomposition is uneven.

## Application To Our Code

This should not change Quint ownership. It should change support-layer organization.

The clean decomposition for this repo is likely:

- vitality
- action economy
- movement
- conditions/effects
- spellcasting economy
- class resources
- battle-only reaction facilities

The spec can still keep unified records for proof convenience. The TS bridge and docs can project those records into subsystem views.

## Quint Impact

Low to moderate. It may help reorganize helper sections in `creature.qnt`, but splitting the actual state record too aggressively would likely make proofs harder, not easier.

## Domain Language Impact

Moderate. Subsystem names can improve documentation and helper grouping.

## Recommendation

Adopt as a support-layer structuring principle, not as a spec rewrite. Keep the authoritative state unified where Quint benefits from whole-state visibility.
