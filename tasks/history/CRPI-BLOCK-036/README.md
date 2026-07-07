# CRPI-BLOCK-036 History

Task 67 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-036.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied creature attack route connector
`qRoute` projection to public BattleState reducer route events. The replay
observes the `startBattle` route marker plus public `AvailableBattleAct.routeEvents`
from `discoverBattleActs` and public `BattleResolutionResult.routeEvents` from
`resolveBattleSubject`.

No duplicate durable state was introduced. The production route uses a typed
`creatureAttack` battle subject, existing `BattleState.combatants`, existing
`BattleCreatureState.hp`, public Attack Roll fills, ordinary Rolled Dice fills
for positive copied damage, the creature-attack-specific zero-damage fill, and
the shared Hit Point damage owner. The route projection derives subject, owner,
fill, and frontier holes from public reducer facts; it does not dispatch on
authored identity, QNT action names, witness field names, fixture labels, or
connector filenames.
Discovery is limited to stat-block-origin creatures with no structured action
section, the current actor, an actor that can take actions, and an available
Attack action. Ordinary character attacks, off-turn actors, incapacitated or
terminal zero-HP actors, spent-action actors, and already structured stat-block
attacks do not gain an extra generic action. The replay fixture uses
`synthetic-test` provenance rather than claiming SRD provenance.

The copied QNT source and route connector keep their original abstract
`damage = 0..6` domain. The target replay represents copied zero damage as a
public `creatureAttackZeroDamage` fill that projects to the connector's
`rolledDice` route event, preserving positive die-face brands when dice are
present and preserving the global non-empty `rolledDice` fill boundary. Because
the copied model has no turn state, the replay harness may rotate the target
battle through public `endTurn` before an attack action so the copied actor is
legally current; those target-only alignment events are not appended to the
accepted copied `qRoute` projection.

Plan Impact:

- Status: `none`
- Affected task: Task 67 / `CRPI-BLOCK-036` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Observation: minimal creature attacks now have a narrow typed reducer subject
  and route projection, limited to stat-block-origin creatures with no
  structured action section, the current actor, an actor that can take actions,
  and an available Attack action, that can be reused or replaced by later
  stat-block attack work without adding a parallel route ledger.
- Required plan edits: none.
