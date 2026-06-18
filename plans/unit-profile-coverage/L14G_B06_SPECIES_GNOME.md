# L14G-B06 Species Gnome Research Note

## Sources Checked

- RAW: `.references/srd-5.2.1/Character-Origins.md:177-203`.
- Ubiquitous language: Saving Throw and Advantage, Spell Access, Spell Definition, Spell Invocation, Darkvision, Action, Bonus Action, Utilize, Character Sheet, and Stat Block terms in `UBIQUITOUS_LANGUAGE.md`.

## Catalog Decision

`species_gnome` is installed as an SRD Surface species record with fixed Small size, Humanoid creature type, 30-foot Speed, and three authored trait refs:

- `species_gnome_darkvision`
- `species_gnome_gnomish_cunning`
- `species_gnome_gnomish_lineage`

Gnome is not added to character-creation species admission in this task. That admission would be under-specified because Gnomish Lineage requires a species-selection lineage choice and a spellcasting ability choice before a CharacterBuild can be finalized.

## Trait Ownership

Darkvision is authored as a passive `grant_sense` source fact with 60-foot range. It remains unsupported as an executable Unit profile, matching the existing species Darkvision ownership split: sight and illumination projection owners consume derived observer facts rather than executing the trait Unit directly.

Gnomish Cunning is authored as passive Advantage on Saving Throws with `saveAbilityFilter = ["int", "wis", "cha"]`. It remains unsupported until a passive saving-throw ability-filter roll-mode profile admits that typed fact. This avoids dispatching on Gnome identity in battle reducers.

Gnomish Lineage is authored as a `species_lineage_choice` mechanics family with exact Forest and Rock branches. Forest owns Minor Illusion known access, Speak with Animals prepared access, and Speak with Animals Proficiency Bonus free casts per Long Rest. Rock owns Mending and Prestidigitation known access plus the clockwork-device source facts. Character creation owns the lineage and spellcasting ability selections, the selected lineage trait projection derives Forest/Rock spell and device source facts from Surface, and table/object ownership remains the follow-up boundary for Rock device execution state.

## Reviewer Loop

Round 1 RAW/vocabulary check found that the trait is not a single executable mechanic: it crosses species selection, spell access, free-cast resources, and table/object behavior. The implementation keeps those as structured source facts and does not claim character-creation or battle support.

Round 1 architecture/connascence check found coupled facts for lineage option ids, spell ids, Proficiency Bonus count, and Rock device fields. These are encoded in the Gnomish Lineage schema rather than left as open strings in a generic choice bucket.

Round 1 code-review check found one widened `grant_spell_free_casts.count` risk. Existing class-feature free-cast resource readers were narrowed back to numeric grants so Gnome's Proficiency Bonus source fact cannot be consumed by fixed-cap resource projections.

Round 2 RAW/vocabulary check found no source-shape drift. The only wording issue was an existing test name that implied character-creation admission for all decoded non-Orc species records; it now says species records instead.

Round 2 architecture/connascence and code-review checks found no remaining reasonable findings. The Gnome ids, lineage option ids, spell ids, Proficiency Bonus count, and Rock device facts are all decoded through the new schema and covered by focused catalog tests.
