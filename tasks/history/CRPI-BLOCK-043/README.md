# CRPI-BLOCK-043 History

Task 86 accepted the Character Creation Cleric and Druid Order selected-reference route replay through public target entrypoints.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-043.json`.
- The copied connector projection is `packages/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.route.mbt.qnt#qRoute`.
- The observed target projection is produced by `packages/character-creation-runtime/src/reducer-route-connectors.mbt.test.ts#createCompletedReducerRouteDriver` after `completedReducerSurfaceRoute` drives the public creation draft, fill, and finalization reducer path.
- Selected Divine/Primal Order refs remain existing `CharacterBuild.features` selected-class-choice facts; Task 86 added no durable selected-reference cache and no downstream option-behavior dispatch.

Plan Impact:

- Status: `none`
- Affected task: Task 86 / `CRPI-BLOCK-043` is unblocked by accepted copied `qRoute` replay evidence.
- Later Character Creation selected-reference route tasks should reuse `characterBuildProjectionWithRoute` when their copied connector expects build-projection without fact-recording.
- Required plan edits: none.
