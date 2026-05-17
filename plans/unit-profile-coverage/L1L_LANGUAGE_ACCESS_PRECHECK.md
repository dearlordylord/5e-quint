# L1L Language Access Precheck

Task: `L1L-LANGUAGE-ACCESS-PRECHECK`

## Scope Result

No battle-runtime behavior should be implemented for `druid_druidic` or
`rogue_thieves_cant`.

The character-owned parts are durable Character Build and Character Sheet facts:

- `druid_druidic`: Druidic language ownership and always-prepared
  `speak_with_animals` Spell Access.
- `rogue_thieves_cant`: Thieves' Cant language ownership and one additional
  language chosen from the Character Creation language tables.

The residuals remain runtime-detached table adjudication:

- `druid_druidic`: hidden-message placement, automatic spotting by Druidic
  knowers, DC 15 Intelligence (Investigation) spotting by others, and
  deciphering without the language requiring magic.
- `rogue_thieves_cant`: communication content and table adjudication for using
  Thieves' Cant.

## RAW And Ubiquitous Language Anchors

- `.references/srd-5.2.1/Classes/Druid.md:81`: Level 1 Druidic.
- `.references/srd-5.2.1/Classes/Druid.md:83`: the Druid knows Druidic and
  always has *Speak with Animals* prepared.
- `.references/srd-5.2.1/Classes/Druid.md:85`: hidden-message spotting and
  deciphering rules.
- `.references/srd-5.2.1/Classes/Rogue.md:71`: Level 1 Thieves' Cant.
- `.references/srd-5.2.1/Classes/Rogue.md:73`: the Rogue knows Thieves' Cant
  and one other language from Character Creation language tables.
- `.references/srd-5.2.1/Character-Creation.md:106`: origin languages are
  Common plus two Standard Languages, while class/features can grant more.
- `.references/srd-5.2.1/Character-Creation.md:125`: Rare Languages are less
  widespread and can be learned from features.
- `.references/srd-5.2.1/Character-Creation.md:133-134`: Thieves' Cant and
  Druidic are Rare Languages.
- `UBIQUITOUS_LANGUAGE.md:235`: Spell Access is the creature-owned relationship
  to a Spell Definition, including prepared and always-prepared access.
- `UBIQUITOUS_LANGUAGE.md:321`: Character Sheet is the PC-derived record from
  class, level, species, background, equipment, and features.

## Current Evidence

Surface content already separates the source facts:

| Unit | Character-owned Surface grants | Runtime-detached residuals |
| --- | --- | --- |
| `druid_druidic` | `grant_language` with `languageId: "druidic"` and `grant_spell_access` with `mode: "prepared"` and `spellId: "speak_with_animals"` in `packages/surface/content/druid_druidic.json:10-18` | `grant_hidden_language_messages` in `packages/surface/content/druid_druidic.json:19-36` |
| `rogue_thieves_cant` | `grant_language` with `languageId: "thieves_cant"` and `grant_language_choice` with source `character_creation_language_tables` in `packages/surface/content/rogue_thieves_cant.json:10-18` | no executable battle residual; Thieves' Cant communication remains table-adjudicated |

The Surface schema accepts these atom shapes but leaves `languageId` as a
non-empty string:

- `packages/surface/src/surface/schema-spell.ts:2289-2292` for
  `grant_language`.
- `packages/surface/src/surface/schema-spell.ts:2293-2310` for
  `grant_hidden_language_messages`.
- `packages/surface/src/surface/schema-spell.ts:2311-2315` for
  `grant_language_choice`.

Coverage already classifies both rows as `unsupported-profile` with a
`character-fact-and-runtime-detached-split` closure:

- `plans/unit-profile-coverage/unit-matrix.json` row `druid_druidic`: installed
  class feature; character-owned Druidic language and always-prepared Spell
  Access; hidden-message discovery and deciphering detached.
- `plans/unit-profile-coverage/unit-matrix.json` row `rogue_thieves_cant`:
  installed class feature; character-owned Thieves' Cant and additional
  language choice; communication adjudication detached.

## `originLanguages` Proof

`originLanguages` is already constrained to the SRD Character Creation origin
language rule and must not absorb Druidic, Thieves' Cant, or the Rogue extra
feature language:

- `packages/shared/src/game-facts.ts:8-28` defines `STANDARD_LANGUAGES` and
  `CharacterStartingLanguages` as exactly `["Common", First, Second]`, where
  `First` and `Second` are distinct selectable Standard Languages.
- `packages/character-creation-runtime/src/discovery.ts:1622-1633` discovers
  the draft language hole as exactly two options from `STANDARD_LANGUAGES`
  excluding Common.
- `packages/character-creation-runtime/src/fill-reducer.ts:1002-1020` rejects
  too few, too many, non-standard, Common, or duplicate selected origin
  languages, then constructs `["Common", first, second]`.
- `packages/character-creation-runtime/src/draft.ts:331-350` parses stored
  draft languages with the same exact tuple shape.
- `packages/character-creation-runtime/src/finalization.ts:722-730` copies only
  finalized draft `selections.languages` into `build.originLanguages`.
- `packages/character-sheet-runtime/src/index.ts:3504-3516` rejects stored
  `originLanguages` unless they are exactly three unique Standard Languages with
  Common first.

Therefore `originLanguages` remains "Common plus two Standard Languages" and is
not the owner for class-feature or rare language grants.

## Proposed Character Build Shape

Later implementation should keep `originLanguages` unchanged and add one
required durable field for class-feature language facts:

```ts
export type CharacterBuildClassFeatureLanguage =
  | {
      readonly kind: "classFeatureLanguageGrant";
      readonly sourceUnitId: UnitRecord["id"];
      readonly language: Language;
    }
  | {
      readonly kind: "classFeatureLanguageChoice";
      readonly sourceUnitId: UnitRecord["id"];
      readonly language: Language;
    };

export type CharacterBuild = {
  // existing fields stay unchanged
  readonly originLanguages: CharacterStartingLanguages;
  readonly classFeatureLanguages: readonly CharacterBuildClassFeatureLanguage[];
};
```

`classFeatureLanguages` should be required, with `[]` meaning the finalized
class features grant no non-origin language facts. Do not use `undefined` as a
second spelling for the empty case.

The canonical `language` should be `Language` from
`packages/shared/src/game-facts.ts:30-44`. Because Surface currently stores
snake-case `languageId` strings and no canonical bridge exists, Task 2 should
add a closed parser/codec from canonical Surface language ids to `Language`
before finalization consumes authored grants. Authored ids outside that closed
bridge should be returned as typed finalization or stored-build issues, not
silently skipped.

The field is a projection, not provenance:

- provenance stays on the Surface Unit record;
- structured input stays in Surface `grant_language` and
  `grant_language_choice`;
- durable runtime-facing character ownership is projected into
  `CharacterBuild.classFeatureLanguages`.

## Invalid States To Reject

Later implementation tasks should locally reject these states at finalization
and stored Character Sheet parse boundaries:

- a `classFeatureLanguageGrant` whose `sourceUnitId` does not resolve to a
  class-feature Unit owned by the build's progression at the relevant level;
- a `classFeatureLanguageGrant` whose `language` does not match a parsed
  Surface `grant_language` on that source Unit;
- a `classFeatureLanguageChoice` whose `sourceUnitId` does not have a
  `grant_language_choice` with source `character_creation_language_tables` and
  count `1`;
- a selected Rogue extra language outside the Standard or Rare language tables;
- duplicate final known languages across `originLanguages` and
  `classFeatureLanguages`, including fixed Thieves' Cant and already-known
  origin languages;
- hidden-message or communication-adjudication facts stored in Character Build
  or Character Sheet state.

The duplicate check is the boundary that makes contradictory ownership locally
rejected. The source Unit id is retained so a stored language fact cannot become
ambiguous if later content has multiple features grant the same language.

## Druidic Spell Access Strategy

No new battle-runtime profile is needed for Druidic Spell Access.

`characterBuildFeatureUnitIds` already derives class feature Unit ids from the
build's progression and Surface class `featureGrants` in
`packages/character-creation-runtime/src/finalization.ts:947-966`.
`featurePreparedSpellIdsForBuild` already reads passive class-feature
`grant_spell_access` atoms in
`packages/character-sheet-runtime/src/index.ts:3461-3481`.

Task 5 should add focused Character Sheet evidence for `druid_druidic` making
`speak_with_animals` visible as always-prepared Spell Access, or identify the
minimal owner fix if the spell catalog/admission path blocks that projection.
The communication content of *Speak with Animals* remains runtime-detached table
adjudication.

## Later Focused Tests

Task 2:

- Druid level 1 finalization yields
  `{ kind: "classFeatureLanguageGrant", sourceUnitId: "druid_druidic", language: "Druidic" }`.
- Rogue level 1 finalization yields
  `{ kind: "classFeatureLanguageGrant", sourceUnitId: "rogue_thieves_cant", language: "Thieves' Cant" }`.
- Both tests assert `originLanguages` remains the original
  `["Common", firstStandard, secondStandard]` tuple.
- Unsupported Surface `grant_language.languageId` is rejected through typed
  finalization issues.

Task 3:

- Rogue creation discovers a Unit choice sourced from `rogue_thieves_cant` for
  one language from the Character Creation language tables.
- Fill rejects Common/origin-language duplicates and fixed Thieves' Cant.
- Finalization includes the selected extra language as
  `classFeatureLanguageChoice` with source `rogue_thieves_cant`.
- No selected extra language is written to `originLanguages`.

Task 4:

- Stored Character Sheet parse preserves `classFeatureLanguages` distinctly from
  `originLanguages`.
- Stored parse rejects duplicate final known languages and mismatched
  source/language pairs.

Task 5:

- A Druid build owning `druid_druidic` exposes `speak_with_animals` as
  always-prepared Spell Access through Character Sheet projection.
- The test does not model beast communication content as battle-runtime state.

Task 6:

- Coverage wording continues to classify `druid_druidic` and
  `rogue_thieves_cant` as character-owned facts plus runtime-detached residuals,
  with no battle-runtime profile promotion.

## Reviewer Loop Notes

RAW traceability: all modeled language and Spell Access facts above trace to
the local SRD 5.2.1 corpus. Ubiquitous language uses Character Sheet and Spell
Access terms rather than Stat Block or Spell Invocation terms.

Architecture and connascence: the main strong coupling is between Surface
snake-case language ids and shared `Language` display values. Later
implementation should centralize that mapping in one parser/codec and make
unsupported ids a typed issue. Do not duplicate the mapping in finalization,
stored-build parsing, tests, and coverage wording.

Code-review pass: this task intentionally makes no runtime code changes. The
proposed field is required rather than optional, keeps origin and class-feature
language facts distinct, and rejects duplicate/mismatched facts at the
parse/finalization boundaries where authored Surface and stored CharacterBuild
data meet.
