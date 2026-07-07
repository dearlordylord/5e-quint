# CRPI-READY-011 History

Task 42 route replay is accepted after rerunning against the refreshed copied
Metamagic route connector. The source connector now splits Careful
saving-throw protection into the public Careful Burning Hands route
(`metamagicSavingThrowProtection`, `spellTargetList`,
`savingThrowOutcome`, damage adjustment) and the Careful Command/no-effect
route (`commandEffect`, `commandOptionChoice`, `savingThrowOutcome`) with no
rolled-dice damage frontier.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-011.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence accepts both selected-identity branches. The Careful
Burning Hands branch compares copied connector `qRoute` from
`stepRouteSavingThrowProtectionSaveGatedDamage` with public reducer route events
from `battleReducerStartRouteEvent`, `discoverBattleActs`, and
`resolveBattleSubject`: protected-target `spellTargetList`, then
`savingThrowOutcome`, `rolledDice`, damage adjustment, and final feature-resource
settlement. The Careful Command/no-effect branch compares copied connector
`qRoute` from `stepRouteSavingThrowProtectionNoEffect` with the public
`commandEffect` route: `commandOptionChoice`, `savingThrowOutcome`, and
`battleActiveEffect`, with no damage-adjustment frontier.

No duplicate Metamagic state was introduced. Selected option identity remains at
catalog, selection, admission, and SRD fixture boundaries. Runtime routing is
derived from the typed Metamagic effect kind, spell procedure shape, existing
Sorcery Point pool state, saving-throw fills, damage-adjustment projection, and
public route event boundary fields.

Plan Impact:

- Status: `none`
- Affected task: Task 42 / `CRPI-READY-011` should be marked done/accepted.
- Future metamagic route tasks remain unchanged; the refreshed connector now
  exposes the split Careful route shape they should preserve.
- Required plan edits: none.
