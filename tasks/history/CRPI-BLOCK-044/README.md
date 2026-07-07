# CRPI-BLOCK-044 History

Task 87 accepted the Character Creation Fighter Fighting Style selected-reference and level-gain replacement route replay through public target entrypoints.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-044.json`.
- The copied connector projection is `packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.route.mbt.qnt#qRoute`.
- Initial Fighting Style selections are observed through `characterBuildSelectedReferencesWithRoute`, reading existing `CharacterBuild.features` selected-class-choice refs.
- Fighter level-gain replacement branches are observed through `advanceCharacterBuildFightingStyleReplacementWithRoute`, which wraps the existing typed CharacterBuild advancement reducer, then reuses selected-reference retention and build-projection route entrypoints. The replacement replay fixture preserves the three current level-1 Fighter Weapon Mastery selected refs before applying the Fighting Style replacement.
- No duplicate selected-reference state or authored-identity production dispatch was added.

Plan Impact:

- Status: `none`
- Affected task: Task 87 / `CRPI-BLOCK-044` is unblocked by accepted copied `qRoute` replay evidence.
- Future Character Creation level-gain replacement route tasks should use typed advancement route wrappers around the production advancement reducer and ensure fixture builds satisfy any current class-level choice preconditions before replaying replacements.
- Required plan edits: none.
