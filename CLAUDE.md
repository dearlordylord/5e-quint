# D&D 5e Quint Specification

## Motto: Keep it composable.

## Design Principles

1. **Single-creature state machine.** Model one creature's state transitions. Multi-creature interactions (contests, opportunity attacks, Help) are externalized as caller-provided parameters. This is composability — the spec stays modular and add-able.

2. **All dice pre-resolved.** Never generate randomness. Callers pass roll results.

3. **Ability scores are immutable config.** Combat state doesn't mutate ability scores. Level-up produces a new config.

4. **No battlemaps.** Spatial queries (range, AoE targets, positioning) are caller-provided booleans/enums.

5. **Module split is practical, not dogmatic.** Start in one file if convenient, split when it gets unwieldy. Quint supports multi-module imports. Don't pre-optimize the file tree.

6. **State type + Pure functions + Thin actions.** All business logic in pure functions. Actions are thin wrappers. See savage repo for reference.

## Project Structure

- `PLAN.md` — comprehensive implementation plan
- `.references/rules/` — PHB chapters as markdown (source of truth for rules)
- `.references/*.json` — raw 5etools data

## Reference

- Savage Worlds Quint spec: `/Users/firfi/work/typescript/savage/savage.qnt`
- Quint patterns: State type, Pure functions, Thin actions, Map pre-population
- Quint MBT bridge: `@firfi/quint-connect` (parse Quint AST, generate traces, replay against implementation)
