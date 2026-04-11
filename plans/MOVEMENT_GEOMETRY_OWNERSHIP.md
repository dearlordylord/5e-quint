# Movement And Help Geometry Ownership

Task 12 decision note for public `BATTLE_MOVE` and `BATTLE_HELP_ATTACK`.

## Decision

Continue deferring the public movement/help surfaces. Do not add a grid engine, pathfinding layer, or session-owned geometry subsystem to core, battle, or MCP.

Keep spatial facts as explicit caller/session-owned inputs:

- Visibility relations are caller/session-owned.
- Path, destination, and difficult-terrain facts are caller/session-owned.
- Reach-exit and threatened-creature facts are caller/session-owned, using battle-owned reach statistics as inputs.
- Movement provocation classification stays caller/session-owned at the public boundary, while battle still owns downstream rule filters such as reaction availability and incapacitation.
- Reach as a creature or weapon statistic remains core-owned, but "within reach now" and "left reach on this step" are spatial relations and therefore caller/session-owned.

## RAW-Constrained Help Conclusion

SRD 5.2.1 `Help [Action]` narrows the attack-help blocker more than the earlier audit text did: the helper must momentarily distract an enemy within 5 feet, but the rule does not require helper-to-ally or helper-to-target visibility.

That means any future public `BATTLE_HELP_ATTACK` token only needs:

- `allyId`
- `targetId`
- one explicit caller/session fact for whether the target is within 5 feet of the helper

The later attack still resolves with its own attack-legality visibility facts.

## Movement Boundary

`BATTLE_MOVE` remains deferred, but the ownership split is now explicit. Any future public movement token should stay checkpoint-based and accept caller/session spatial facts instead of positions or pathfinding internals:

- destination or path label
- difficult-terrain cost beyond the engine's fixed 5-foot spend
- whether the step crosses a reach-exit checkpoint
- threatened creature set
- provocation classification for movement that should not trigger opportunity attacks

## References

- `.references/srd-5.2.1/Rules-Glossary.md` (`Help [Action]`, `Opportunity Attacks`, `Reach`)
- `.references/srd-5.2.1/Playing-the-Game.md` (movement rules, Difficult Terrain)
- `UBIQUITOUS_LANGUAGE.md`
- `ARCHITECTURE.md`
- `battle/DOMAIN.md`
- `.references/inspirations/12-opportunity-attack-path-analysis.md`
