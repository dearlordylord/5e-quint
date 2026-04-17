## Survey Rerun 2026-04-17

Scope: refreshed `scripts/content-surface-survey/survey-results-srd.jsonl` and `scripts/content-surface-survey/REPORT_SRD.md` against the current SRD queue.

### Baseline shift

- Prior checked-in dataset: 504 latest SRD-unit verdicts across 1060 historical rows.
- Current queue-backed dataset: 882 SRD-unit verdicts across 882 latest rows.
- Net queue expansion since the older baseline: +378 units in the latest-verdict comparison, or +386 brand-new queue slugs that were not present in the older 504-unit SRD catalog snapshot.

### Verdict distribution delta vs prior run

| Verdict | Prior latest (504) | Current latest (882) | Delta |
| --- | ---: | ---: | ---: |
| `clean` | 110 | 116 | +6 |
| `surface_widening` | 81 | 111 | +30 |
| `atom_widening` | 33 | 56 | +23 |
| `structural_widening` | 267 | 307 | +40 |
| `dm_agenda` | 13 | 14 | +1 |
| `invalid` | 0 | 39 | +39 |
| `refused` | 0 | 239 | +239 |

Notes:

- The previously tracked 504-unit overlap had **no verdict transitions**. No legacy SRD unit changed from non-clean to clean in this rerun.
- The visible delta is therefore driven by the expanded SRD queue, not by reclassification of the older 504-unit slice.

### First authoring targets

There were no newly-clean units within the older 504-unit overlap. The newly-added queue rows that already land `clean` are the best immediate authoring targets from this rerun:

1. `magic_item_potion_of_flying`
2. `magic_item_potion_of_giant_strength`
3. `magic_item_potion_of_heroism`
4. `magic_item_potion_of_invisibility`
5. `magic_item_potion_of_invulnerability`
6. `magic_item_potions_of_healing`
7. `magic_item_ring_of_resistance`
8. `magic_item_ring_of_swimming`
9. `magic_item_ring_of_telekinesis`
10. `magic_item_ring_of_three_wishes`
11. `magic_item_rod_of_resurrection`
12. `magic_item_slippers_of_spider_climbing`
13. `magic_item_stone_of_good_luck_luckstone`
14. `magic_item_wand_of_magic_detection`

### Top remaining widening clusters by count

From `REPORT_SRD.md`:

1. `grant_spell_access` — 36 units
2. `conditional_bonus_damage` — 23 units
3. `apply_condition_effect` — 21 units
4. `MagicItemRecord` — 21 units
5. `grant_sense` — 14 units

### Practical takeaway

- `CSA1` is complete as a queue refresh.
- `CSA2` should pull from the current `clean` queue, but it should not assume the old 504-unit universe.
- `CSC1` must use the 882-row SRD queue baseline unless the catalog changes again before that pass.
