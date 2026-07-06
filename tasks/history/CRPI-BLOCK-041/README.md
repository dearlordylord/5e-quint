# CRPI-BLOCK-041 History

Task 84 accepted the Character Creation class-feature build projection route
replay through public target reducer entrypoints.

- Driver: `packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- Route connector: `packages/character-creation-runtime/character-creation-class-feature-projections.route.mbt.qnt`
- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-041.json`
- Accepted projection: `qRoute`

The target replay compares the copied connector `qRoute` to the public Character
Creation reducer-route session in
`packages/character-creation-runtime/src/reducer-route-connectors.mbt.test.ts`.
For each route action, the handler calls the public
`characterBuildClassFeatureFactsProjectionWithRoute` entrypoint. That entrypoint
derives the exported `CharacterBuild`/Unit-catalog projection facts for Monk
Focus plus Uncanny Metabolism or Sorcerer Font of Magic plus Metamagic and
returns the `CharacterBuildOwner` build-projection route events that record
`CreationBuildProjectionInputFact`.

No duplicate durable state was introduced. CharacterBuild retained facts and the
Unit catalog remain the source facts; resource/source projections are derived at
the build-projection boundary and represented as route events rather than stored
resource or source caches.

Plan Impact:

- Status: `none`
- Affected task: Task 84 / `CRPI-BLOCK-041` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent Character Creation route tasks remain unchanged.
- Required plan edits: none.
