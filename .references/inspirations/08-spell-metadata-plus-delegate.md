# 08. Spell As Metadata Plus Delegate

## Idea

Keep spell metadata and spell-specific implementation close together, with shared helpers reducing boilerplate.

## Current Fit In This Repo

- `packages/core/src/features/spell-registry.ts` already holds large amounts of spell metadata.
- spell behavior is distributed across school files and battle logic.
- `available-actions.ts` and spell-available-actions support also need structured spell data.

## Application To Our Code

The likely win is not to collapse everything into one file. The win is to define a consistent spell package shape:

- registry metadata
- legality/projection metadata
- runtime helper
- battle/spec integration note

That would reduce fragmentation between:

- spell registry
- feature implementation
- available-action projection
- battle-machine application

## Quint Impact

Low directly. Quint should still model generic spell mechanics and named flow features only when interaction complexity requires it.

## Domain Language Impact

Moderate. It would make the repo’s notion of "a modeled spell" more explicit.

## Recommendation

Adopt as TS content organization. Keep the spec generic and let this pattern make content support cleaner and easier to promote when a spell crosses the Quint frontier.
