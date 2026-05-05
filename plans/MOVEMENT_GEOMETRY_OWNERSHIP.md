# Movement And Help Spatial Fact Boundary

This document is the source-of-truth decision for movement/help spatial facts.
MCP surface planning and audits should conform to it.

## Decision

Do not add a grid engine, pathfinding layer, or geometry subsystem to core,
battle, or MCP. Geometry always comes from the table. Runtimes and MCP may
consume explicit table/caller/session spatial facts, but they do not infer them.

Movement is still a valid public/session-facing surface, but only as a thin
boundary over explicit table-supplied spatial facts. The battle layer owns
movement economy and downstream rule consequences; it does not own coordinates,
pathfinding, or geometric inference.

Help is still a valid public/session-facing surface, but it does not need any
geometry machinery beyond one explicit proximity fact from the table/caller.

Table/caller/session code supplies spatial relations. Battle consumes those
facts and applies mechanical consequences.

Specifically:

- Visibility relations are table/caller/session-supplied.
- Path, destination, difficult-terrain, reach-exit, and threatened-creature
  facts are table/caller/session-supplied.
- Movement provocation classification is table/caller/session-supplied at the public
  boundary.
- Reach as a creature or weapon statistic remains core-owned, but "within reach
  now" and "left reach on this step" are spatial relations and therefore
  table/caller/session-supplied.

## Rule Notes

`Help [Action]` uses a fixed proximity rule: the distracted enemy must be
within 5 feet of the helper when Help is taken. It does not require
helper-to-ally or helper-to-target visibility.

That means `BATTLE_HELP_ATTACK` only needs:

- `allyId`
- `targetId`
- one explicit table/caller/session fact for whether the target is within 5 feet
  of the helper

The later attack still resolves with its own attack-legality visibility facts.

Opportunity attacks use current melee reach, including reach weapons. The
table/caller/session boundary therefore supplies the reach-exit fact itself: for
example, moving from 5 feet to 10 feet leaves a longsword user's reach but does
not leave a pike user's reach.

## Planning Implications

For PM handoff and future planning:

- Do not schedule grid, coordinate, line-drawing, or pathfinding work in core,
  battle, or MCP.
- Any public/session-facing `BATTLE_MOVE` design must stay checkpoint-based and
  accept explicit table-supplied movement facts.
- Any public/session-facing `BATTLE_HELP_ATTACK` design must use only ally/target
  choice plus helper-target 5-foot proximity.
- If a proposed task depends on core, battle, or MCP deriving geometry, it
  conflicts with this decision and should be rewritten or removed.

## References

- `.references/srd-5.2.1/Rules-Glossary.md` (`Help [Action]`, `Opportunity Attacks`, `Reach`)
- `.references/srd-5.2.1/Playing-the-Game.md` (movement rules, Difficult Terrain)
- `UBIQUITOUS_LANGUAGE.md`
- `ARCHITECTURE.md`
- `battle/DOMAIN.md`
- `.references/inspirations/12-opportunity-attack-path-analysis.md`
