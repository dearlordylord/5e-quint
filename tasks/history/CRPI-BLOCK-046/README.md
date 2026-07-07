# CRPI-BLOCK-046 History

Task 92 accepted the Character Creation Warlock Eldritch Invocations selected-identity route replay through public target entrypoints.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-046.json`.
- The copied connector projection is `packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.route.mbt.qnt#qRoute`.
- Accepted Warlock level-gain and replacement routes are produced by `packages/character-creation-runtime/src/character-build-advancement.ts#applyCharacterBuildWarlockLevelGainWithRoute`, then observed through `characterBuildSelectedReferencesWithRoute` and `characterBuildProjectionWithRoute`.
- Duplicate and prerequisite-retained invocation rejections are produced by the same public Warlock level-gain route wrapper and owned by `CreationSupportProfileAdmissionOwner`.
- The level-5 prerequisite-retained replacement branch is covered and recorded as the source inventory's level-5 out-of-scope branch.

No duplicate durable state was introduced. Selected Eldritch Invocation choices remain existing `CharacterBuild.features` `selectedEldritchInvocation` facts, Pact Magic remains the existing source-scoped `CharacterBuild.spellcasting` projection, and rejection state remains typed `CharacterBuildAdvancementIssue` output plus route evidence.

Plan Impact:

- Status: `none`
- Affected task: Task 92 / `CRPI-BLOCK-046` is unblocked by accepted copied `qRoute` replay evidence.
- Future Warlock invocation execution tasks remain unchanged; this task only covers creation selected-reference/Pact Magic/rejection routing.
- Required plan edits: none.
