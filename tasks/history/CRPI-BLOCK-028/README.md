# CRPI-BLOCK-028 History

Task 56 reducer-routed replay is accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-028.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Starry Wisp object-target
`qRoute` projection to exact public reducer route events observed through
`battleReducerStartRouteEvent`, `discoverBattleActs`, and
`resolveBattleSubject`. Public discovery stays on the existing
`spellAttackProcedure` route subject, while object-target resolution uses
`objectTargetSpellAttack`. The replay covers object-target boundary acceptance,
missing object-fact rejection, Attack Roll hit and miss, low and high object
damage with reveal-light admission, and stale replay rejection through the
hole-frontier owner.

No duplicate durable object state was introduced. Object range, Armor Class,
Hit Point, and spatial facts remain table-supplied `objectTargetChoice` fill
facts. Object damage remains `BattleResolutionResult.objectDamages`; Starry
Wisp reveal Dim Light remains existing light-emitter state; route labels are
derived from typed object-target spell attack fills, public result holes,
object damage, light-emitter deltas, and stale-subject invalid results rather
than authored spell identity.

Plan Impact:

- Status: `none`
- Affected task: Task 56 / `CRPI-BLOCK-028` is unblocked by accepted copied
  `qRoute` replay evidence.
- Related downstream object/light route tasks remain unchanged and can reuse
  the object-target spell attack route subject where their source routes require
  object-boundary spell Attack ownership.
- Required plan edits: none.
