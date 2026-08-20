# Goblin Warrior versus Skeleton

Play a D&D 5e SRD 5.2.1 battle while faithfully controlling both combatants.

- Goblin Warrior: Initiative 15.
- Skeleton: Initiative 10.
- They begin exactly 60 feet apart on open, level ground, with clear line of
  sight, no cover, and no Difficult Terrain. Use theater of the mind rather than
  a grid.

Both combatants seriously pursue their hostile objectives. This tracer uses controller-authored roll
totals and is not a fairness or random-distribution experiment: choose plausible
totals only when the SDK requests them and include them in the recorded calls.
Only replay of those recorded calls is deterministic; a fresh player Execution may
make different tactical and roll choices. Choose tactics for each combatant
without favoring a predetermined outcome. Strategies may change in response to
observed SDK results. Continue until the observed state supports a reasonable
player conclusion, then report that conclusion and any SDK obstruction for
independent RAW review.

Use only the provided typed continuation context. Do not inspect repository
source, internal tests, or implementation files, and do not fabricate an SDK
capability that is not surfaced.
