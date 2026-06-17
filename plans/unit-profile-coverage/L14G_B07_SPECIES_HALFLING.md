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

Brave is authored as passive Advantage on Saving Throws with `conditionFilter = ["frightened"]`. Follow-up task `L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME` promotes Brave through the existing passive-saving-throw roll-mode profile by widening the typed condition-scoped support set to include Frightened, with deterministic runtime evidence and selected-identity MBT coverage. The runtime support is derived from Saving Throw roll kind and Frightened condition facts, not Halfling or Brave authored identity.

Halfling Nimbleness is authored as `creature_space_movement_permission`, with a larger-creature occupied-space traversal permission and an explicit `canStopInOccupiedSpace = false` boundary. Follow-up task `L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME` promotes the occupied creature-space traversal profile through caller-supplied movement witnesses, current effective creature sizes, and the existing Movement budget without storing species-owned movement state.

Luck is authored as `d20_test_natural_one_reroll`: trigger exactly die face 1 on a D20 Test, optional reroll of the triggering d20, and mandatory use of the new roll. Follow-up task `L3-FOLLOWUP-HALFLING-LUCK-RUNTIME` promotes the selected/effective D20 subset for Attack Rolls, Ability Checks, Saving Throws, Concentration Saving Throws, and Death Saving Throws. Follow-up task `L3-FOLLOWUP-D20-TEST-ROLLED-DIE-REROLL-CHOICE` extends the same owner to Advantage and Disadvantage fills that expose raw two-d20 facts and an explicit die-selection replacement, then projects one downstream D20 Test result without storing Luck-owned parallel roll state.

Naturally Stealthy is authored as `hide_action_obscurement_permission`, allowing Hide when obscured only by a creature at least one size larger. Follow-up task `L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME` promotes this as `unit-feature.hide-action-obscurement-permission`: admission consumes the Surface mechanics shape, and battle runtime consumes selected Unit support refs, current effective combatant sizes, and caller/table-supplied Hide prerequisites for creature-only obscurement plus out-of-enemy-line-of-sight facts. Automatic line-of-sight, observer-specific perception, and map/body-coverage derivation remain table/perception work outside this Unit profile.

## Reviewer Loop

Round 1 RAW/vocabulary check found four distinct rule shapes rather than one broad species-trait bucket. The implementation keeps Brave in the existing passive mechanics family and adds narrow source-fact mechanics for movement permission, D20 Test reroll, and Hide obscurement permission.

Round 1 architecture/connascence check found coupled facts for Halfling trait ids, fixed Small size, Speed 30, the natural-1 trigger, the cannot-stop movement boundary, and the larger-creature size relations. These are encoded in schemas and catalog tests rather than left as comments or open strings.

Round 1 code-review check found no need for a new adapter or parallel character-creation state. The existing species finalization path can retain Halfling and its trait refs once the species record is in the catalog and the supported species manifest includes `species_halfling`.

Round 2 RAW/vocabulary, architecture/connascence, and code-review checks found no remaining reasonable findings. Battle MBT was not run because this task adds Surface source facts and character-creation admission only; no battle runtime reducer behavior changed.

Round 3 reviewer-feedback check found that Brave had been over-claimed as supported. At that point, the implementation classified Brave as unsupported with a future condition-scoped Saving Throw Advantage owner, which removed the generated selected-identity witness gap for Halfling.

Task 12 follow-up reviewer loop promoted Brave from `unsupported-profile` to `supported-profile` after confirming the SRD Brave anchor and ubiquitous-language terms. The implementation reuses the passive Saving Throw roll-mode owner for Frightened condition scopes and does not broaden support to unrelated Saving Throw Advantage shapes.

Task 15 follow-up reviewer loop promoted Naturally Stealthy from `unsupported-profile` to `profile-subset-supported` after rechecking the SRD Hide action and Halfling trait anchors plus ubiquitous-language Hide action, Obscurement, Creature, and Size terms. The implementation derives support from the `hide_action_obscurement_permission` mechanics shape and current effective size relation, while leaving automatic line-of-sight and creature-obscurement derivation to future table/perception owners.
