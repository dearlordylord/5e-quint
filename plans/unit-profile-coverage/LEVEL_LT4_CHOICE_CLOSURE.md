# Level <4 Choice Closure Gate

Status: generated, non-strict until the dedicated closure issues land.

## Summary

- Targets: 19
- Cataloged: 19/19
- Character-creation selectable: 19/19
- Current blockers: 0

## Current Blockers

None.

## Target Rows

| Unit                         | Domain                     | Cataloged | Selectable | Claim                    | Closure                                   | RAW anchor                                         |
| ---------------------------- | -------------------------- | --------- | ---------- | ------------------------ | ----------------------------------------- | -------------------------------------------------- |
| `feat_archery`               | fighting-style-feat-target | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:85-91               |
| `defense`                    | fighting-style-feat-target | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:93-97               |
| `feat_great_weapon_fighting` | fighting-style-feat-target | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:93-97               |
| `feat_two_weapon_fighting`   | fighting-style-feat-target | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:99-103              |
| `alert`                      | human-origin-feat-target   | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:21-29               |
| `feat_magic_initiate_cleric` | human-origin-feat-target   | yes       | yes        | supported-profile        | character-fact-and-runtime-detached-split | .references/srd-5.2.1/feats.md:31-43               |
| `feat_magic_initiate_druid`  | human-origin-feat-target   | yes       | yes        | supported-profile        | character-fact-and-runtime-detached-split | .references/srd-5.2.1/feats.md:31-43               |
| `feat_magic_initiate_wizard` | human-origin-feat-target   | yes       | yes        | supported-profile        | character-fact-and-runtime-detached-split | .references/srd-5.2.1/feats.md:31-43               |
| `feat_savage_attacker`       | human-origin-feat-target   | yes       | yes        | supported-profile        |                                           | .references/srd-5.2.1/feats.md:45-49               |
| `feat_skilled`               | human-origin-feat-target   | yes       | yes        | supported-profile        | character-fact-and-runtime-detached-split | .references/srd-5.2.1/feats.md:51-57               |
| `species_dragonborn`         | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:97-160  |
| `species_dwarf`              | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:162-178 |
| `species_elf`                | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:180-233 |
| `species_gnome`              | srd-species-target         | yes       | yes        | profile-subset-supported | selection-grant-container                 | .references/srd-5.2.1/character-origins.md:235-252 |
| `species_goliath`            | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:253-277 |
| `species_halfling`           | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:279-293 |
| `species_human`              | srd-species-target         | yes       | yes        | unsupported-profile      | selection-grant-container                 | .references/srd-5.2.1/character-origins.md:295-307 |
| `species_orc`                | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:309-323 |
| `species_tiefling`           | srd-species-target         | yes       | yes        | unsupported-profile      |                                           | .references/srd-5.2.1/character-origins.md:325-338 |

## Magic Initiate Spell Access Closure

| Unit                         | Spell list | Character-creation retained fact                          | Selected cantrips owner                                                            | Selected level 1 spell owner                                                                   | Spellcasting ability owner                                                            | Selected Spell Definition owner                                    | Spell Invocation runtime owner                              |
| ---------------------------- | ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `feat_magic_initiate_cleric` | cleric     | character-creation-runtime: selected Origin feat Unit ref | future character-sheet spell-access owner: Magic Initiate selected cantrip choices | future character-sheet spell-access owner: Magic Initiate selected level-1 Spell Access choice | future character-sheet spell-access owner: Magic Initiate spellcasting ability choice | selected Spell Definition profiles: static execution/profile facts | spell invocation runtime boundary: runtime Spell Invocation |
| `feat_magic_initiate_druid`  | druid      | character-creation-runtime: selected Origin feat Unit ref | future character-sheet spell-access owner: Magic Initiate selected cantrip choices | future character-sheet spell-access owner: Magic Initiate selected level-1 Spell Access choice | future character-sheet spell-access owner: Magic Initiate spellcasting ability choice | selected Spell Definition profiles: static execution/profile facts | spell invocation runtime boundary: runtime Spell Invocation |
| `feat_magic_initiate_wizard` | wizard     | character-creation-runtime: selected Origin feat Unit ref | future character-sheet spell-access owner: Magic Initiate selected cantrip choices | future character-sheet spell-access owner: Magic Initiate selected level-1 Spell Access choice | future character-sheet spell-access owner: Magic Initiate spellcasting ability choice | selected Spell Definition profiles: static execution/profile facts | spell invocation runtime boundary: runtime Spell Invocation |

## Verification

- RAW/ubiquitous-language check: compare every row to `.references/srd-5.2.1/feats.md`, `.references/srd-5.2.1/character-origins.md`, and `UBIQUITOUS_LANGUAGE.md` before implementing rules.
- Reviewer-loop convergence: after implementation, run RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes until no reasonable findings remain.
- Non-strict check: `pnpm level-lt4-choice-closure:check`.
- Regenerate: `pnpm level-lt4-choice-closure:check -- --write`.
- Strict activation after closure lanes: `pnpm level-lt4-choice-closure:check -- --strict`.
