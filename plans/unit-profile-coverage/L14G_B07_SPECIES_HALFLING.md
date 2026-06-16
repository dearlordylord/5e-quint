# L14G-B07 Species Halfling Research Note

## Sources Checked

- RAW: `.references/srd-5.2.1/Character-Origins.md:215-229`.
- Ubiquitous language: Creature, Size, Speed, Movement, Hide action, Obscurement, D20 Test, Advantage, Saving Throw, Condition, and Frightened terms in `UBIQUITOUS_LANGUAGE.md`.

## Catalog Decision

`species_halfling` is installed as an SRD Surface species record with fixed Small size, Humanoid creature type, 30-foot Speed, and four authored trait refs:

- `species_halfling_brave`
- `species_halfling_nimbleness`
- `species_halfling_luck`
- `species_halfling_naturally_stealthy`

Halfling is admitted to character creation in this task. Unlike Gnome, it has no required species-selection subchoice or spellcasting ability choice, so finalizing a CharacterBuild can retain the selected species identity and all four trait Unit refs without under-specifying the build.

## Trait Ownership

Brave is authored as passive Advantage on Saving Throws with `conditionFilter = ["frightened"]`. It remains unsupported in this task: the promoted passive-saving-throw roll-mode profile admits Poisoned condition-scoped species saves, not Frightened saves. A future condition-scoped Saving Throw Advantage owner should widen the typed profile and add rule-core/runtime evidence without dispatching on Halfling or Brave identity.

Halfling Nimbleness is authored as `creature_space_movement_permission`, with a larger-creature occupied-space traversal permission and an explicit `canStopInOccupiedSpace = false` boundary. It remains unsupported until a movement/spatial-occupancy owner promotes creature-space path traversal and ending-space legality.

Luck is authored as `d20_test_natural_one_reroll`: trigger exactly die face 1 on a D20 Test, optional reroll of the triggering d20, and mandatory use of the new roll. It remains unsupported until a D20 Test reroll replacement owner models post-roll timing across Attack Rolls, Ability Checks, and Saving Throws.

Naturally Stealthy is authored as `hide_action_obscurement_permission`, allowing Hide when obscured only by a creature at least one size larger. It remains unsupported until a Hide/obscurement eligibility owner promotes creature-caused obscurement and size-relation facts.

## Reviewer Loop

Round 1 RAW/vocabulary check found four distinct rule shapes rather than one broad species-trait bucket. The implementation keeps Brave in the existing passive mechanics family and adds narrow source-fact mechanics for movement permission, D20 Test reroll, and Hide obscurement permission.

Round 1 architecture/connascence check found coupled facts for Halfling trait ids, fixed Small size, Speed 30, the natural-1 trigger, the cannot-stop movement boundary, and the larger-creature size relations. These are encoded in schemas and catalog tests rather than left as comments or open strings.

Round 1 code-review check found no need for a new adapter or parallel character-creation state. The existing species finalization path can retain Halfling and its trait refs once the species record is in the catalog and the supported species manifest includes `species_halfling`.

Round 2 RAW/vocabulary, architecture/connascence, and code-review checks found no remaining reasonable findings. Battle MBT was not run because this task adds Surface source facts and character-creation admission only; no battle runtime reducer behavior changed.

Round 3 reviewer-feedback check found that Brave had been over-claimed as supported. The implementation now classifies Brave as unsupported with a future condition-scoped Saving Throw Advantage owner, which removes the generated selected-identity witness gap for Halfling.
