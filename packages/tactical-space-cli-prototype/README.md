# Tactical Space CLI Prototype

> **THROWAWAY PROTOTYPE — not a production package.**

This package is the composition root for the tactical-space experiment. It owns
the synthetic arena, token setup, rendering, command parsing, and mutable CLI
session reference. Geometry comes from `@dnd/tactical-space-prototype`; movement
weights come from `@dnd/tactical-adjudicator-prototype`.

Run it from the repository root:

```sh
pnpm prototype:tactical-space
```

Start by comparing the fighter's observation of the orc before and after:

```text
door closed
door open
```

The orc remains exactly eighteen cells south—90 feet by the arena's named range
policy—but visibility and routing change when the local gate boundary changes.
Then compare route selection with:

```text
profile ordinary
profile crawling
profile unaffected-by-difficult-terrain
move
```

`route <x> <y> <level>` changes the preview destination. `move` commits the
displayed spatial-revision-bound route. Nothing is persisted.
