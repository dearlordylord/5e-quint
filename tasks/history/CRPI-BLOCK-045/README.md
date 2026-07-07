# CRPI-BLOCK-045 History

Task 88 accepted the Character Creation Rogue Expertise selected-reference route replay through public target entrypoints.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-045.json`.
- The copied connector projection is `packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.route.mbt.qnt#qRoute`.
- The in-scope level-1 Rogue Expertise branch is observed through `characterBuildSelectedReferencesWithRoute` after an actual Rogue public creation replay selects owned Rogue skill Expertise.
- `CharacterBuild.proficiencyChoices` owns the two `skill_expertise` choices; `characterBuildProficiencies` derives the final Expertise proficiency-level projection.
- The same valid Rogue build also retains two Rogue Weapon Mastery selected Unit refs, so the selected-reference route count is four total retained refs while the Task 88 Expertise assertion remains two skill Expertise choices.
- The level-six additional Expertise branch is intentionally excluded because the task denominator marks it outside the level 1-5 lane.
- No authored-identity production dispatch was added.

Plan Impact:

- Status: `none`
- Affected task: Task 88 / `CRPI-BLOCK-045` is unblocked by accepted copied `qRoute` replay evidence.
- Future Rogue level-six Expertise work should remain a separate denominator task and should reuse `CharacterBuild` proficiency projection rather than adding parallel skill state.
- Required plan edits: none.
