# Movement And Help Geometry Ownership

This document is the source-of-truth decision for movement/help ownership.
MCP surface planning and audits should conform to it.

## Decision

Do not add a grid engine, pathfinding layer, or session-owned geometry subsystem to core, battle, or MCP.

Movement is still a valid public/session-facing surface, but only as a thin
boundary over explicit caller-owned spatial facts. The battle layer owns
movement economy and downstream rule consequences; it does not own coordinates,
pathfinding, or geometric inference.

Help is still a valid public/session-facing surface, but it does not need any
geometry owner beyond one explicit proximity fact from the caller.

Caller/session code owns spatial relations. Battle consumes those facts and
applies mechanical consequences.

Specifically:

- Visibility relations are caller/session-owned.
- Path, destination, difficult-terrain, reach-exit, and threatened-creature
  facts are caller/session-owned.
- Movement provocation classification is caller/session-owned at the public
  boundary.
- Reach as a creature or weapon statistic remains core-owned, but "within reach
  now" and "left reach on this step" are spatial relations and therefore
  caller/session-owned.

## Rule Notes

`Help [Action]` uses a fixed proximity rule: the distracted enemy must be
within 5 feet of the helper when Help is taken. It does not require
helper-to-ally or helper-to-target visibility.

That means `BATTLE_HELP_ATTACK` only needs:

- `allyId`
- `targetId`
- one explicit caller/session fact for whether the target is within 5 feet of
  the helper

The later attack still resolves with its own attack-legality visibility facts.

Opportunity attacks use current melee reach, including reach weapons. The
caller/session boundary therefore owns the reach-exit fact itself: for example,
moving from 5 feet to 10 feet leaves a longsword user's reach but does not
leave a pike user's reach.

## Planning Implications

For PM handoff and future planning:

- Do not schedule grid, coordinate, line-drawing, or pathfinding ownership work
  in core, battle, or MCP.
- Any public/session-facing `BATTLE_MOVE` design must stay checkpoint-based and
  accept explicit caller-owned movement facts.
- Any public/session-facing `BATTLE_HELP_ATTACK` design must use only ally/target
  choice plus helper-target 5-foot proximity.
- If a proposed task depends on core or MCP deriving geometry, it conflicts with
  this decision and should be rewritten or removed.

## References

- `.references/srd-5.2.1/Rules-Glossary.md` (`Help [Action]`, `Opportunity Attacks`, `Reach`)
- `.references/srd-5.2.1/Playing-the-Game.md` (movement rules, Difficult Terrain)
- `UBIQUITOUS_LANGUAGE.md`
- `ARCHITECTURE.md`
- `battle/DOMAIN.md`
- `.references/inspirations/12-opportunity-attack-path-analysis.md`
