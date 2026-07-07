# CRPI-BLOCK-035 History

Task 64 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-035.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied weapon-hosted route connector
`qRoute` projections to public BattleState reducer route events for True
Strike, Shillelagh, Divine Favor, and Magic Weapon surfaces. The replay observes
the `startBattle` route marker plus public `BattleResolutionResult.routeEvents`
from `resolveBattleSubject` and `endTurn`.

No duplicate durable state was introduced. The replay uses existing
`BattleState` combatants, active effects, spell invocation procedure facts,
weapon attack subjects, public hole/fill kinds, Hit Point fields, and turn
advancement cleanup. Magic Weapon item identity remains table-supplied boundary
evidence; the accepted `qRoute` has no reducer-route hole for that item choice.
Production route behavior does not branch on authored item, spell, or attack
identity, QNT branch action names, witness field names, fixture labels, or
connector filenames.

Revision round 2 fixed the held-weapon active-effect route classifier so it
uses the actually selected attack's held weapon item and weapon shape before
emitting `heldWeaponActiveEffect`. An Unarmed Strike while Shillelagh remains
active now records the normal `weaponAttack` route tail instead of the hosted
held-weapon route.

Plan Impact:

- Status: `none`
- Affected task: Task 64 / `CRPI-BLOCK-035` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR17-WEAPON-HOSTED-RIDER-ROUTES` remains unchanged.
- Observation: unaffected attacks while a held-weapon override exists are
  covered by focused regression and preserve the normal weapon route.
- Required plan edits: none.
