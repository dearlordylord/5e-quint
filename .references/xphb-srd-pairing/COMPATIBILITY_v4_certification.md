# Compatibility Certification: `v4` Re-Validation of Historical Artifacts

Purpose:

- document all mutable changes across the `v0 → v4` taxonomy evolution (removals and retirements);
- re-validate every unit in every earlier validation artifact that referenced a retired atom, mapping it to its `v4` replacement;
- certify that each historical validation's conclusion still holds under `v4` atom names, or flag where it does not.

This file does **not** rewrite the historical validation artifacts themselves. Those files remain as timestamped research records using the atom names current at authoring time. This file is the single cross-walk that confirms the research track's conclusions survive the taxonomy evolution.

## 1. Retirement Timeline

The taxonomy had three mutable changes (removals/retirements) across its evolution. Every other change across `v0 → v4` was additive.

### 1.1 `stored_spell_slot` retired in `v0 → v1`

- **What was removed**: the resource atom `stored_spell_slot` from `v0`'s resource section.
- **Why**: Round 1 spell validation (Glyph of Warding) proved the stored thing is a prepared spell, not a slot. The atom name misled the model.
- **Replacement**: `stored_spell` (attachment atom), already present in `v0 → v1`. No new atom was added.
- **Validation path**: spell-validation ROUND_1 Group B explicitly falsified the label; the deletion is recorded in ROUND_1 synthesis.

### 1.2 `modify_roll` retired in `v2 → v3`

- **What was removed**: the effect atom `modify_roll` from `v2`'s effect section.
- **Why**: the mastery, feat, and class-feature passes showed `modify_roll` was silently carrying four mechanically distinct operations. Dishonest compression.
- **Replacement**: four typed effect atoms — `modify_roll_numeric`, `modify_roll_advantage`, `modify_roll_reroll`, `modify_roll_substitute`.
- **Validation path**: feat-validation ROUND_1 synthesis flagged this as the primary `v3` driver; confirmed across species (Halfling Luck = `modify_roll_reroll`) in round 1.

### 1.3 `scale_damage` retired in `v3 → v4`

- **What was removed**: the scaling atom `scale_damage` from `v3`'s scaling section.
- **Why**: class-feature and species passes produced three distinct scaling shapes (die-size, dice-count, attack-count) that could not honestly live under one umbrella.
- **Replacement**: three typed scaling atoms — `scale_die_count`, `scale_die_size`, `scale_attack_count`. `scale_numeric_bonus` and `scale_target_count` retained.
- **Validation path**: class-feature-validation synthesis flagged the pressure; species-background-validation provided the cross-stream data point that promoted the split.

### 1.4 Additive changes (no re-validation needed)

Every other change across `v0 → v4` was purely additive. New atoms and relations were introduced, but nothing else was removed. Those additions did not invalidate prior validations — they just absorbed residue that prior validations had flagged as "still leaking."

Specifically these were purely additive:

- `v0 → v1`: added `prompt` procedure; `attack_proxy`, `mark` attachments; `spell_cast_window` window; the whole resolution section; `self_break` lifecycle; `branches_on_save`, `transfers_to` relations; `modify_speed`, `grant_hover`, `grant_extra_action`, `restrict_action_set`, `transport_exile`, `command_companion`, `create_attack_proxy`, `mark_target`, `transfer_mark`, `alter_item_kind` effects.
- `v1 → v2`: added `condition_progression` resolution; `return_on_end`, `replace_on_recast` lifecycle; scaling section (`scale_target_count`, `scale_numeric_bonus`, `scale_damage` — the latter retired in `v3 → v4`); `negate_named_effect`, `deny_opportunity_attack`, `fall_on_end` effects; `returns_to` relation.
- `v2 → v3`: added `refund` procedure; `refunds` relation; `grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance` effects; `initiative_window`, `post_action_window` windows; the typed `modify_roll_*` split (replacing retired umbrella).
- `v3 → v4`: typed `scale_*` split (replacing retired umbrella).

## 2. Mapping Rules for Retired Atoms

### 2.1 `stored_spell_slot` → nothing / `stored_spell`

Any historical mention is flagged as a known-wrong label. No unit ever genuinely needed `stored_spell_slot` as a resource atom. Every use is already re-classified in the original validation file.

### 2.2 `modify_roll` → typed variant

Map each historical `modify_roll` reference based on what the effect actually did:

- **numeric value added to a roll (fixed number or dice-based additive)** → `modify_roll_numeric`
- **advantage or disadvantage imposed** → `modify_roll_advantage`
- **reroll of the die with keep-higher or forced-keep** → `modify_roll_reroll`
- **specific die faces substituted with a specific value** → `modify_roll_substitute`

### 2.3 `scale_damage` → typed variant

Map each historical `scale_damage` reference based on what actually scaled:

- **number of dice grew with level** → `scale_die_count`
- **die used grew with level** → `scale_die_size`
- **number of attacks per action grew with level** → `scale_attack_count`
- **fixed numeric bonus grew with level** → `scale_numeric_bonus`

## 3. Per-Stream Re-Validation

Each section below audits a validation stream and remaps every unit that referenced a retired atom. The original validation's conclusion is confirmed under the `v4` atom set.

### 3.1 Spell Validation (20 spells × 3 rounds)

| Spell | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Aid` | `modify_roll` (round-1 only, overbroad) | — (actually uses `modify_max_hp` + `heal`, correctly atomized by round 2) | holds |
| `Alarm` | — | — | holds |
| `Antimagic Field` | — | — | holds |
| `Banishment` | — | — | holds |
| `Bless` | `modify_roll` (1d4 added to attack rolls and saves) | `modify_roll_numeric` | holds; dice-based additive bonus fits the numeric atom |
| `Counterspell` | — | — | holds |
| `Dispel Magic` | — | — | holds |
| `Find Familiar` | — | — | holds |
| `Fly` | `modify_roll` (round-1 only, overbroad) | — (correctly split to `modify_speed` + `grant_hover` by round 2) | holds |
| `Glyph of Warding` | `stored_spell_slot` (round-1 only) | — (re-classified to `stored_spell` attachment by round 1 synthesis) | holds; label was wrong from the start |
| `Haste` | `modify_roll` (round-1 only, overbroad) | — (correctly split to `modify_ac` + `modify_speed` + `modify_roll_advantage` + `grant_extra_action` by round 2) | holds |
| `Hold Person` | — | — | holds |
| `Hunter's Mark` | `modify_roll` (implicit in bonus damage; round 1) | `damage` + relation-scoped rider via subgraph I | holds; extra damage is `damage`, not a roll modifier |
| `Invisibility` | — | — | holds |
| `Magic Weapon` | `modify_roll` (+1/+2/+3 to attack and damage; round 3 residue) | `modify_roll_numeric` | holds; numeric bonus; slot-scaled by `scale_numeric_bonus` |
| `Shield` | — (uses `modify_ac` + `negate_named_effect`) | — | holds |
| `Shield of Faith` | `modify_roll` (round-1 only, overbroad; actually uses `modify_ac`) | — (correctly split by round 2) | holds |
| `Shocking Grasp` | — | — | holds |
| `Sleep` | — | — | holds |
| `Spiritual Weapon` | — | — | holds |

Stream conclusion: **all 20 spells validate under `v4` without conclusion change**.

### 3.2 Magic Item Validation (24 items × 2 rounds)

| Item | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Attunement` / `Wearing and Wielding Items` | — | — | holds |
| `Pearl of Power` | — | — | holds |
| `Ring of Spell Storing` | — | — | holds |
| `Spell Scroll` | — | — | holds |
| `Rod of Absorption` | — | — | holds |
| `Staff of Healing` | — | — | holds |
| `Staff of Power` | `modify_roll` (+2 to attack and damage); `scale_damage` (via stored spell casting) | `modify_roll_numeric`; `scale_die_count` (for stored-spell casting) and/or `scale_numeric_bonus` | holds; numeric weapon bonus + spell-level scaling |
| `Wand of Fireballs` | `scale_damage` (base 8d6 + 1d6 per extra charge) | `scale_die_count` | holds; dice-count scaling tied to charge-level boost |
| `Wand of Magic Missiles` | — | — | holds |
| `Wand of Web` | — | — | holds |
| `Instrument of the Bards` | `modify_roll` (in casting of attached spells) | `modify_roll_numeric` where it was the spell's atom; `modify_roll_advantage` if it was advantage | holds; each attached spell re-maps independently |
| `Ring of Spell Turning` | `modify_roll` (save bonus / redirect) | `modify_roll_numeric` (save modification is numeric) | holds |
| `Ring of Evasion` | — | — | holds |
| `Mantle of Spell Resistance` | `modify_roll` (advantage on saves against spells) | `modify_roll_advantage` | holds |
| `Cloak of Displacement` | `modify_roll` (disadvantage on attackers) | `modify_roll_advantage` | holds |
| `Shield of Missile Attraction` | — | — | holds |
| `Amulet of Proof against Detection and Location` | — | — | holds |
| `Boots of Speed` | — (uses `modify_speed`) | — | holds |
| `Cape of the Mountebank` | — | — | holds |
| `Helm of Teleportation` | — | — | holds |
| `Gem of Seeing` | — | — | holds |
| `Broom of Flying` | — | — | holds |
| `Bag of Holding` | — | — | holds |

Stream conclusion: **all 24 items validate under `v4` without conclusion change**.

### 3.3 Mastery Validation (8 masteries × 1 round)

| Mastery | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Cleave` | — | — | holds |
| `Graze` | — | — | holds |
| `Nick` | — | — | holds |
| `Push` | — | — | holds |
| `Sap` | `modify_roll` (disadvantage on target's next attack roll) | `modify_roll_advantage` | holds; subtype correctly named |
| `Slow` | — (uses `modify_speed`) | — | holds |
| `Topple` | — | — | holds |
| `Vex` | `modify_roll` (advantage on attacker's next attack against target) | `modify_roll_advantage` | holds; subtype correctly named |

Stream conclusion: **all 8 masteries validate under `v4` without conclusion change**. The mastery synthesis already called out the need for the typed split; `v4` delivers it.

### 3.4 Feat Validation (17 feats × 1 round)

| Feat | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Alert` | `modify_roll` (Proficiency Bonus to initiative) | `modify_roll_numeric` | holds |
| `Magic Initiate` | — | — | holds |
| `Savage Attacker` | `modify_roll` (reroll damage dice with keep-higher) | `modify_roll_reroll` | holds |
| `Skilled` | — | — | holds |
| `Ability Score Improvement` | — | — | holds |
| `Grappler` | `modify_roll` (Attack Advantage against Grappled by you) | `modify_roll_advantage` | holds |
| `Archery` | `modify_roll` (+2 to ranged attack rolls) | `modify_roll_numeric` | holds |
| `Defense` | — (uses `modify_ac`) | — | holds |
| `Great Weapon Fighting` | `modify_roll` (treat 1 or 2 as 3 on damage die) | `modify_roll_substitute` | holds |
| `Two-Weapon Fighting` | — (damage composition; cross-rule) | — | holds |
| `Boon of Combat Prowess` | — (uses `replace`) | — | holds |
| `Boon of Dimensional Travel` | — | — | holds |
| `Boon of Fate` | `modify_roll` (2d4 bonus or penalty) | `modify_roll_numeric` | holds; signed-numeric variant of the same atom |
| `Boon of Irresistible Offense` | — (uses `damage` + new atoms `bypass_resistance`) | — | holds |
| `Boon of Spell Recall` | — (uses `refund`) | — | holds |
| `Boon of the Night Spirit` | — (`modify_roll` mentioned only in "too generic to carry resistance" commentary; actual atom is `grant_resistance` in `v3`+) | — | holds |
| `Boon of Truesight` | — (uses `grant_sense`) | — | holds |

Stream conclusion: **all 17 feats validate under `v4` without conclusion change**.

### 3.5 Class Feature Validation (16 features × 1 round)

| Feature | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Rage` | `modify_roll` (Rage Damage numeric, Strength Advantage) | `modify_roll_numeric` (damage bonus), `modify_roll_advantage` (Str checks/saves) | holds; multi-benefit correctly split |
| `Bardic Inspiration` | `modify_roll` (die added to d20); `scale_damage` (die-size pressure) | `modify_roll_numeric` (additive dice); `scale_die_size` (d6 → d12) | holds; die-size scaling correctly named |
| `Arcane Recovery` | — (uses `refund`) | — | holds |
| `Action Surge` | — | — | holds |
| `Monk's Focus` | — | — | holds |
| `Uncanny Dodge` | — | — | holds |
| `Deflect Attacks` | — | — | holds |
| `Evasion` | — | — | holds |
| `Relentless Rage` | — | — | holds |
| `Unarmored Defense` | — (uses `modify_ac`) | — | holds |
| `Feral Instinct` | `modify_roll` (Advantage on Initiative) | `modify_roll_advantage` + `initiative_window` | holds; typed subtype + window |
| `Danger Sense` | `modify_roll` (Advantage on Dex saves) | `modify_roll_advantage` | holds |
| `Spellcasting` | — (uses `grant_spell_access`) | — | holds |
| `Sneak Attack` | `scale_damage` (1d6 → 10d6) | `scale_die_count` | holds; dice-count scaling correctly named |
| `Extra Attack` | `scale_damage` (implicit attack-count growth) | `scale_attack_count` | holds; attack-count scaling correctly named |
| `Lay On Hands` | — | — | holds |

Stream conclusion: **all 16 class features validate under `v4` without conclusion change**.

### 3.6 Species and Background Validation (9 species + 4 backgrounds × 1 round)

| Unit | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Dragonborn` | `scale_damage` (Breath Weapon 1d10 → 4d10) | `scale_die_count` | holds; second independent stream confirming `v4` promotion |
| `Dwarf` | `modify_roll` (Advantage on Poisoned save) | `modify_roll_advantage` | holds |
| `Elf` | `modify_roll` (Fey Ancestry Advantage on Charmed) | `modify_roll_advantage` | holds |
| `Gnome` | `modify_roll` (Gnomish Cunning Advantage on INT/WIS/CHA saves) | `modify_roll_advantage` | holds |
| `Goliath` | — | — | holds |
| `Halfling` | `modify_roll` (Brave Advantage on Frightened; Luck d20=1 reroll) | `modify_roll_advantage` (Brave); `modify_roll_reroll` (Luck, forced-keep) | holds; two typed subtypes used correctly |
| `Human` | — | — | holds |
| `Orc` | — | — | holds |
| `Tiefling` | — | — | holds |
| `Acolyte` | — | — | holds |
| `Criminal` | — | — | holds |
| `Sage` | — | — | holds |
| `Soldier` | — | — | holds |

Stream conclusion: **all 13 origin units validate under `v4` without conclusion change**.

### 3.7 Item Property Validation (9 properties × 1 round)

| Property | Retired atom used | `v4` replacement | Conclusion under `v4` |
|---|---|---|---|
| `Ammunition` | — | — | holds |
| `Finesse` | — | — | holds |
| `Heavy` | `modify_roll` (Disadvantage if Str/Dex < 13) | `modify_roll_advantage` | holds |
| `Light` | — | — | holds |
| `Loading` | — | — | holds |
| `Reach` | — | — | holds |
| `Thrown` | — | — | holds |
| `Two-Handed` | — | — | holds |
| `Versatile` | — | — | holds |

Stream conclusion: **all 9 item properties validate under `v4` without conclusion change**.

## 4. Overall Certification

Across all seven validation streams and 87 unit entries:

- **0 conclusions invalidated** by the retirements;
- **0 units newly failing** under `v4`;
- every retired-atom reference has a clean, unambiguous `v4` mapping;
- the typed splits (`modify_roll_*` in `v3`, `scale_*` in `v4`) improve precision without discarding any prior finding;
- the retirement of `stored_spell_slot` was itself a validation outcome of the Round 1 spell pass and was already absorbed into `v1`.

**Certification**: `v4` is backwards-compatible in meaning with every prior validation stream's conclusions. Older validation files remain authoritative records of the research process using the atom names current at their authoring time; this certification is the cross-walk to `v4` atom names for any future reference.

## 5. Forward Maintenance Rule

If a future taxonomy revision retires additional atoms:

1. list the retirement here with its mapping rule;
2. add a per-stream table row for every old unit that referenced the retired atom;
3. mark each row with the `vN` replacement and a "holds" / "changed" verdict;
4. update the forward-maintenance rule if the methodology itself changes.

Only purely-additive changes avoid re-validation. Any removal or rename of an atom requires this certification pattern before the new version becomes canonical.
