# CRPI-BLOCK-042 History

Task 85 accepted the Character Creation class-feature selected-identity route
replay through public target reducer entrypoints.

- Driver: `packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- Route connector: `packages/character-creation-runtime/character-creation-class-feature-selected-identity.route.mbt.qnt`
- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-042.json`
- Accepted projection: `qRoute`

The target replay compares the copied connector `qRoute` to the public
Character Creation reducer-route session in
`packages/character-creation-runtime/src/reducer-route-connectors.mbt.test.ts`.
The session uses public draft creation, hole discovery, fill, and finalization
entrypoints before calling
`characterBuildSelectedReferencesWithRoute` for `CreationSelectedReferenceOwner`
route events. Projection branches then call
`characterBuildClassFeatureFactsProjectionWithRoute` for `CharacterBuildOwner`
build-projection events.

No duplicate durable selected-reference state was introduced. Selected
class-choice refs, Eldritch Invocation selections, Sorcerer Metamagic options,
and selected spell refs remain existing `CharacterBuild` facts, and route
evidence is emitted from a runtime projection at the owner boundary.

Plan Impact:

- Status: `none`
- Affected task: Task 85 / `CRPI-BLOCK-042` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent Character Creation selected-reference route tasks remain unchanged.
- Required plan edits: none.
