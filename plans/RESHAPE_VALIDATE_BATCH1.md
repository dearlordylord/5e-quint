# Reshape-validate batch 1 — findings

Ran 10 strategic slugs against the v5-in-progress surface (FeatRecord + SpeciesTraitRecord + MagicItemRecord + PassiveMechanics + EquipmentPredicate + RestResetCadence.dawn + attunement_slot). One agent at a time (`MAX_PARALLEL=1`), 600s per-unit timeout.

## Results

| # | Slug | Harness verdict | Agent self-verdict | Notes |
|---|---|---|---|---|
| 1 | `feat_alert` | invalid (self-report only) | atom_widening | v4 gaps: initiative RollKind, DiceDelta source discriminator (PB as delta), swap_initiative atom. Tasks #6, #7. |
| 2 | `feat_defense` | invalid at agent time | surface_widening | Equipment gate missing. **Fixed mid-batch** by adding `EquipmentPredicate` (`wearing_armor` variant). Hand-authored `content/feat_defense.dhall` now traces clean. |
| 3 | `feat_archery` | invalid at agent time | surface_widening | Same equipment-gate pattern as Defense (`wielding_weapon` variant added alongside `wearing_armor`). |
| 4 | `species_dwarf_darkvision` | **clean** | clean | First fresh-authored unit to land clean. Traces `grant_sense` through `species_trait_root`. |
| 5 | `species_dragonborn_damage_resistance` | surface_widening | surface_widening | Needs `DamageTypeRef` (build-time choice bound to Draconic Ancestry). Task #8. |
| 6 | `species_dragonborn_breath_weapon` | surface_widening | surface_widening | 5 proposals: `replace_attack` activation cost (#9), phases on ActivatedAbilityMechanics (#10), half_damage on save success (#11), ancestry-determined damage type (#8 dupe), `area_choice` for cone-or-line (#12). |
| 7 | `magic_item_cloak_of_protection` | **clean** | surface_widening (overruled) | Harness passed typecheck + tracer; agent self-report was wrong. |
| 8 | `magic_item_amulet_of_health` | atom_widening | atom_widening | `set_ability_score` / `floor_ability_score` atom. Task #13. |
| 9 | `magic_item_wand_of_magic_missiles` | surface_widening | surface_widening | 4 proposals: `charge_cast` spell-access mode (#14), variable charges coupled to spell level (#15), item destruction on depletion (#16). |
| 10 | `magic_item_ring_of_the_ram` | structural_widening | structural_widening | Most complex: `dual_mode_activation` (two modes sharing one charge pool), `charges_spent` LevelAxis, fixed attack-roll bonus, multi-effect on hit, `object_break` ability_check phase. |

## Aggregate

- 2/10 fully clean (both pre-authored references).
- 1 additional clean after mid-batch surface reshape (`feat_defense.dhall` hand-authored post-fix).
- 0 fresh-encoded slugs landed clean on first try — the agents' honesty guardrail routed them to widening proposals rather than forced encodings.
- Widening shape distribution: 1 structural, 5 surface, 2 atom, 0 dm_agenda, 0 refused.

## Surface changes landed during batch

- **`EquipmentPredicate`** — gates `PassiveMechanics.grants` on `wearing_armor { categories }` / `wielding_weapon { weaponKind }` / `always`. Emitted as a `resolution` node with `requires` relation. Unblocks all four Fighting Style feats (Defense validated; Archery / GWF / TWF share the pattern with small atom deltas).

## Highest-leverage remaining widenings

Ordered by cross-unit blast radius:

1. **`phases` on `ActivatedAbilityMechanics`** (task #10) — breath_weapon + ring_of_the_ram mode A + Monk Stunning Strike + most save-based class features.
2. **`half_damage` on save_gate success** (task #11) — Fireball family (most evocation area spells) + Breath Weapon.
3. **Charge-based spell casting** (tasks #14, #15) — majority of wands/staves.
4. **`DamageTypeRef` build-time binding** (task #8) — Dragonborn traits (resistance + breath weapon damage type) + future ancestry/subclass-chosen mechanics.
5. **`set_ability_score` atom** (task #13) — Amulet of Health, Gauntlets of Ogre Power, Headband of Intellect, Ioun Stones.
6. **`area_choice`** (task #12) — cone-or-line abilities.
7. **`replace_attack` activation cost** (task #9) — Breath Weapon, certain smites, other "swap-an-attack" shapes.
8. **`item_destruction_on_depletion`** (task #16) — charge-consumable items.

## Recommended next batch

After landing tasks #10, #11 together (they interlock via `save_gate.onSuccess: EffectAtom` widening):

- Re-run `species_dragonborn_breath_weapon` — if clean, confirms `phases` + `half_damage` combo works end-to-end.
- Run a Paladin Divine Smite and a Cleric Turn Undead to stress the same shape from different directions.

Don't add more content surface changes until batch 2 corroborates the `phases` widening — single-unit pressure is not enough to commit to the exact shape.
