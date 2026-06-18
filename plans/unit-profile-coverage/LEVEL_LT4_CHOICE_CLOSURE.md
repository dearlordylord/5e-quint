# Level <4 Choice Closure Gate

Status: generated, non-strict until the Ralph closure lanes land.

## Summary

- Targets: 19
- Cataloged: 19/19
- Character-creation selectable: 18/19
- Current blockers: 1

## Current Blockers

| Unit | Domain | Missing | RAW anchor |
| --- | --- | --- | --- |
| `species_gnome` | srd-species-target | missing-character-creation-admission | .references/srd-5.2.1/Character-Origins.md:177-193 |

## Target Rows

| Unit | Domain | Cataloged | Selectable | Claim | Closure | RAW anchor |
| --- | --- | --- | --- | --- | --- | --- |
| `feat_archery` | fighting-style-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:91-97 |
| `defense` | fighting-style-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:99-103 |
| `feat_great_weapon_fighting` | fighting-style-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:105-109 |
| `feat_two_weapon_fighting` | fighting-style-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:111-115 |
| `alert` | human-origin-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:23-31 |
| `feat_magic_initiate_cleric` | human-origin-feat-target | yes | yes | unsupported-profile | character-fact-and-runtime-detached-split | .references/srd-5.2.1/Feats.md:33-45 |
| `feat_magic_initiate_druid` | human-origin-feat-target | yes | yes | unsupported-profile | character-fact-and-runtime-detached-split | .references/srd-5.2.1/Feats.md:33-45 |
| `feat_magic_initiate_wizard` | human-origin-feat-target | yes | yes | unsupported-profile | character-fact-and-runtime-detached-split | .references/srd-5.2.1/Feats.md:33-45 |
| `feat_savage_attacker` | human-origin-feat-target | yes | yes | supported-profile |  | .references/srd-5.2.1/Feats.md:47-51 |
| `feat_skilled` | human-origin-feat-target | yes | yes | supported-profile | character-fact-and-runtime-detached-split | .references/srd-5.2.1/Feats.md:53-59 |
| `species_dragonborn` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:99-127 |
| `species_dwarf` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:129-145 |
| `species_elf` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:147-175 |
| `species_gnome` | srd-species-target | yes | no | unsupported-profile | selection-grant-container | .references/srd-5.2.1/Character-Origins.md:177-193 |
| `species_goliath` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:194-213 |
| `species_halfling` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:215-229 |
| `species_human` | srd-species-target | yes | yes | unsupported-profile | selection-grant-container | .references/srd-5.2.1/Character-Origins.md:231-243 |
| `species_orc` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:245-259 |
| `species_tiefling` | srd-species-target | yes | yes | unsupported-profile |  | .references/srd-5.2.1/Character-Origins.md:261-274 |

## Verification

- RAW/ubiquitous-language check: compare every row to `.references/srd-5.2.1/Feats.md`, `.references/srd-5.2.1/Character-Origins.md`, and `UBIQUITOUS_LANGUAGE.md` before implementing rules.
- Reviewer-loop convergence: after implementation, run RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes until no reasonable findings remain.
- Non-strict check: `pnpm level-lt4-choice-closure:check`.
- Regenerate: `pnpm level-lt4-choice-closure:check -- --write`.
- Strict activation after closure lanes: `pnpm level-lt4-choice-closure:check -- --strict`.

