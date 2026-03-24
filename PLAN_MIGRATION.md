# SRD 5.1 → 5.2.1 Migration Plan

Migrate the formal spec, XState machine, MBT bridge, QA pipeline, and docs from SRD 5.1 (2014 rules) to SRD 5.2.1 (2024 rules).

References:
- `.references/srd-5.2.1/` — full SRD 5.2.1 text (Classes/, Spells/, Monsters/, Magic-Items/, plus top-level Playing-the-Game.md, Rules-Glossary.md, Equipment.md, etc.)
- `.references/srd-5.2.1-conversion/` — official conversion guide (delta manifest: lists every new, renamed, and revised element per section — use this to drive the migration, look up actual rules in the full text)
- `.references/srd/` — SRD 5.1 (current spec source)

Note: `Magic-Items/` may be incomplete (only `Items-Q-Z.md` + `Overview.md`, no A-P file).

---

## Phase 0 — Preserve 5.1 Artifacts

Freeze current state so 5.1 remains runnable and testable.

### M0.1 Archive Quint spec
- `dnd.qnt` → `dnd2014.qnt`
- `dndTest.qnt` → `dnd2014Test.qnt`
- Update import in `dnd2014Test.qnt`: `import dnd.* from "./dnd"` → `import dnd.* from "./dnd2014"`
- Verify: `quint test dnd2014Test.qnt` passes

### M0.2 Archive PLAN
- `PLAN.md` → `PLAN_2014.md` (already deleted from git — restore from last commit or keep as-is)

### M0.3 Branch the XState machine (decision point)
Two options — pick one:

**Option A — Copy**: `machine.ts` → `machine2014.ts`, `machine-helpers.ts` → `machine-helpers2014.ts`, etc. Keep 2014 machine importable for comparison. MBT test stays pointed at 2014 files until 2024 machine is ready.

**Option B — In-place**: Evolve machine.ts directly. Use git history as the 2014 reference. Simpler, but loses ability to run both side by side.

Recommendation: **Option A** initially — copy all `machine*.ts` + `types.ts` to `*2014.ts` variants. Once 2024 machine passes MBT, delete 2014 copies.

### M0.4 Tag/branch git
- `git tag v5.1-final` before any migration work
- Consider a `migration/5.2.1` branch

---

## Phase 1 — QA Pipeline Version Tagging

Current state: 15,107 SE entries (14,878 tagged `dnd-5e-2014`, 239 tagged `dnd-5e-2024`). 2,020 classified, 876 assertion caches. Pipeline has no version awareness.

### M1.1 Add `--edition` filter to `classify.py`
- New flag: `--edition 2014|2024|all` (default `all` for backward compat)
- Filter corpus entries by SE tag: `dnd-5e-2014` vs `dnd-5e-2024`
- Reddit entries: filter by flair or date heuristic (posts after 2024-09-01 likely reference new rules)

### M1.2 Add `--edition` filter to `generate_assertions.py`
- Filter classified entries by edition before generating
- System prompt must include the correct spec (`dnd2014.qnt` or `dnd.qnt`) matching the edition
- Separate assertion cache dirs: `cache/assertions-2014/`, `cache/assertions-2024/`
- Separate output files: `qa_generated_2014.qnt` (imports `dnd2014`), `qa_generated.qnt` (imports `dnd`)

### M1.3 Add edition field to classification output
- `classify.py` output gains `"edition": "2014"|"2024"|"ambiguous"`
- Classifier prompt updated to detect edition from tags, terminology (e.g., "species" vs "race", "Monk's Focus" vs "Ki", "D20 Test" vs listing all three)
- Existing cache: keep as-is, treat as `edition: "2014"` by default

### M1.4 Version-sensitive QA assertion validation
- `run_tests.py` (if it exists) or test runner must pick the right spec module
- Add `--edition` to any test-runner scripts

### M1.5 Triage existing assertion cache
- 876 cached `.qnt` files reference `dnd` module functions that will change
- For 2014: move to `cache/assertions-2014/`, update imports to `dnd2014`
- For 2024: wipe and regenerate once `dnd.qnt` (2024) exists
- Provide a migration script: `scripts/qa/migrate_assertion_cache.py`

---

## Phase 2 — New Quint Spec (`dnd.qnt` for 5.2.1)

Start from `dnd2014.qnt` as template, apply 5.2.1 changes systematically.

### M2.1 Core rules delta
Changes that affect the entire spec:

| 5.1 | 5.2.1 | Impact |
|-----|-------|--------|
| Surprise skips turn | Surprise = disadvantage on Initiative | Remove surprised-skip-turn, add initiative modifier |
| Bonus-action spell rule | One Spell with Spell Slot per Turn | Rewrite spell-per-turn constraint |
| Knock out → 0 HP | Knock out → 1 HP + start Short Rest | Modify `pKnockOut` |
| Exhaustion: 6 tiers, cumulative debuffs | Exhaustion: conditions-based (revised) | Rewrite exhaustion system |
| Stunned: can't move | Stunned: can move, can't speak | Modify `CStunned` effects |
| Grappled: speed 0 | Grappled: revised (speed halved?) | Modify `CGrappled` effects |
| Saving throws: must roll | Saving throws: can choose to fail | Add voluntary-fail option to save resolution |
| Cast a Spell action | Magic action (covers spells + magic items + magical features) | Rename action type |
| Use an Object action | Utilize action | Rename |
| Race | Species | Rename throughout |
| Hit Dice | Hit Point Dice | Rename |
| Armor proficiency | Armor training | Rename |
| Walking Speed | Speed | Already modeled as Speed |
| Concentration DC: no cap | Concentration DC: max 30 | Add cap |
| Unarmed Strike: separate from grapple/shove | Unarmed Strike: includes grapple/shove options | Restructure |
| Attack action: fixed | Attack action: equip/unequip per attack, move between attacks | Extend action model |

### M2.2 Type/enum renames
- `Race` → `Species`; add `Goliath`, `Orc`; remove subraces (replaced by trait choices)
- `Ki` → `Focus` (Monk)
- `DivineSmite` → `PaladinsSmite`
- `CastASpell` → `Magic` (action)
- `UseAnObject` → `Utilize` (action)
- `HitDice` → `HitPointDice`
- `FightingStyle` → now a Feat category, not class feature
- `Feeblemind` → `Befuddlement`
- `BrandingSmite` → `ShiningSmite`
- Subclass names: `DraconicBloodline` → `DraconicSorcery`, `TheFiend` → `FiendPatron`, `Evocation` → `Evoker`, `WayOfTheOpenHand` → `WarriorOfTheOpenHand`

### M2.3 Class feature overhaul
Every class gains new features and has existing ones revised. Major structural change: 6 classes pick subclass at level 3 (was 1-2).

New features to add per class (not in 5.1 at all):
- **All classes**: Epic Boon (level 19-20 capstone feat), Weapon Mastery
- **Barbarian**: Primal Knowledge, Instinctive Pounce, Brutal Strike / Improved Brutal Strike
- **Fighter**: Tactical Mind, Tactical Shift, Tactical Master, Studied Attacks
- **Rogue**: Steady Aim, Cunning Strike, Improved Cunning Strike, Devious Strikes
- **Monk**: Uncanny Metabolism, Heightened Focus, Deflect Energy, Superior Defense, Body and Mind
- **Paladin**: Faithful Steed, Abjure Foes, Restoring Touch
- **Ranger**: Deft Explorer, Roving, Tireless, Relentless Hunter, Nature's Veil, Precise Hunter
- **Bard**: Words of Creation
- **Cleric**: Sear Undead, Improved Blessed Strikes, Greater Divine Intervention, Divine Order
- **Druid**: Wild Companion, Wild Resurgence, Elemental Fury / Improved Elemental Fury
- **Sorcerer**: Innate Sorcery, Sorcery Incarnate, Arcane Apotheosis; new metamagics (Seeking Spell, Transmuted Spell)
- **Warlock**: Magical Cunning, Contract Patron; Pact Boons moved to invocations; new invocations (Devouring Blade, Eldritch Mind, Eldritch Smite, etc.)
- **Wizard**: Scholar, Memorize Spell

Revised features: see `.references/srd-5.2.1-conversion/03-classes.md` for full list per class. Berserker Frenzy no longer causes exhaustion. Monk's Ki is renamed Focus. Divine Smite is now a spell (Paladin's Smite). Channel Divinity absorbs Divine Sense. Etc.

### M2.4 Equipment & Weapon Mastery
- **Weapon Mastery properties**: entirely new system (Cleave, Slow, Nick, Topple, Graze, Push, Sap, Vex). Each weapon has a mastery property. Classes unlock mastery at various levels.
- Weapons table revised: Trident damage up, Lance changed, Net → adventuring gear
- New weapons: Musket, Pistol
- Armor naming standardized (Padded → Padded Armor, etc.)
- **Fighting Styles → Feats**: no longer class features; ASI is also a Feat now

### M2.5 Feat system
- Feats categorized: Origin, General, Fighting Style, Epic Boon
- ASI is a feat
- Grappler revised
- Many new feats in SRD (all categories)
- PLAN.md currently only models Grappler — scope decision: model all SRD feats or keep minimal?

### M2.6 Species (was Races)
- Ability scores no longer from species — come from Background
- Subraces eliminated (trait choices within species instead)
- All species descriptions revised
- New: Goliath, Orc
- T140/T141 need full rewrite

### M2.7 Spell changes
- All spells revised in presentation/stats
- Renames: Feeblemind→Befuddlement, Branding Smite→Shining Smite
- ~20 new spells (Divine Smite is now a spell, Hex, Chromatic Orb, etc.)
- Spell lists per class revised
- Rituals: no special class feature needed
- Always-Prepared: generalized rule
- One Spell with Spell Slot per Turn: replaces bonus-action spell restriction

### M2.8 Condition revisions
- Exhaustion: completely new system
- Stunned: can move, can't speak
- Grappled: revised
- Charmed: revised
- Incapacitated: revised
- Invisible: revised
- Petrified: revised

### M2.9 New `dndTest.qnt`
- Write tests for 2024 spec from scratch (or adapt from `dnd2014Test.qnt`)
- Each revised mechanic needs new test coverage
- `quint test dndTest.qnt` must pass

---

## Phase 3 — XState Machine Migration

### M3.1 Update `types.ts`
- Rename types to match 2024 terminology
- Add new enums (Weapon Mastery, feat categories, species, etc.)
- Remove subraces, add species trait choices

### M3.2 Update `machine.ts` + `machine-helpers.ts` + `machine-combat.ts`
- Evolve state machine to match new `dnd.qnt`
- Key changes: new action types (Magic, Utilize, Study, Influence), revised conditions, new class features
- Surprise → initiative disadvantage (not turn skip)
- Bonus-action spell rule → one slot spell per turn
- Unarmed Strike restructure (includes grapple/shove)

### M3.3 Update `machine-states.ts` + `machine-queries.ts`
- State hierarchy changes for new action types
- Query functions for new mechanics

### M3.4 Update `machine-types.ts`
- Context type changes to match new `dnd.qnt` state fields

### M3.5 Reconnect MBT bridge (`machine.mbt.test.ts`)
- Update Quint→TS enum mappings (new condition names, action types, etc.)
- Point at new `dnd.qnt` (not `dnd2014.qnt`)
- Update `stateCheck` field mappings for changed/new context fields
- Run 50 traces x 30 steps — must pass

### M3.6 Update `machine.test.ts`
- Adapt unit tests for revised mechanics
- Add tests for new features

---

## Phase 4 — Docs & References

### M4.1 Add SRD 5.2.1 reference files
- Place full SRD 5.2.1 text at `.references/srd-5.2.1/` (organized by section)
- Keep `.references/srd/` as the 5.1 reference (rename to `.references/srd-5.1/`?)

### M4.2 Update `UBIQUITOUS_LANGUAGE.md`
- Race → Species
- Ki → Monk's Focus
- Hit Dice → Hit Point Dice
- Armor proficiency → Armor training
- Cast a Spell → Magic action
- Use an Object → Utilize
- Add: D20 Test, Heroic Inspiration, Bloodied, Weapon Mastery, etc.

### M4.3 Update `CLAUDE.md`
- Reference new SRD location
- Update parity rules for new spec

### M4.4 Update `README.md`
- Note SRD version (5.2.1)
- Link to conversion guide
- Mention 5.1 archived artifacts

### M4.5 Write new `PLAN.md`
- Full rewrite of task DAG for 5.2.1 mechanics
- Use `.references/srd-5.2.1/` as sole source (same audit methodology as 5.1 plan)

---

## Phase 5 — QA Pipeline Rebuild for 2024

### M5.1 Regenerate 2024 assertions
- Run `generate_assertions.py --edition 2024` against new `dnd.qnt`
- Only 239 SE entries tagged `dnd-5e-2024` — thin corpus initially
- As community produces more 2024 Q&A, corpus grows automatically on re-download

### M5.2 Validate 2014 assertions still work
- `quint test qa_generated_2014.qnt --main qa_generated_2014` against `dnd2014.qnt`
- Should pass unchanged (regression guard)

### M5.3 Cross-version triage
- Some 2014 Q&A is version-agnostic (basic d20 math, HP overflow, etc.)
- Classifier could tag these as `ambiguous` → usable for both versions
- Low priority; manual curation later

---

## Dependency Order

```
M0 (archive) ─────────────────────────────────────────┐
  M0.1 archive qnt                                    │
  M0.2 archive PLAN                                   │
  M0.3 branch machine                                 │
  M0.4 git tag                                        │
                                                      │
M1 (QA pipeline) ── can start in parallel with M0 ────┤
  M1.1 classify --edition                             │
  M1.2 generate --edition                             │
  M1.3 edition field in classification                 │
  M1.4 version-sensitive test runner                   │
  M1.5 triage assertion cache                          │
                                                      │
M4.1 (add SRD 5.2.1 files) ── prerequisite ──────────┤
                                                      │
M2 (new qnt spec) ── needs M0.1 + M4.1 ──────────────┤
  M2.1 core rules delta                               │
  M2.2 type renames                                    │
  M2.3 class features                                  │
  M2.4 equipment + weapon mastery                      │
  M2.5 feat system                                     │
  M2.6 species                                         │
  M2.7 spells                                          │
  M2.8 conditions                                      │
  M2.9 new tests                                       │
                                                      │
M3 (XState) ── needs M2 ─────────────────────────────┤
  M3.1-M3.6 machine + MBT                             │
                                                      │
M4.2-M4.5 (docs) ── needs M2 ────────────────────────┤
                                                      │
M5 (QA rebuild) ── needs M1 + M2 ─────────────────────┘
```

Parallelizable: M0 + M1 can start immediately. M2-M5 are now unblocked (SRD 5.2.1 text available).

---

## Risk / Open Questions

1. **Magic-Items A-P may be missing** — `Magic-Items/` only has `Items-Q-Z.md` + `Overview.md`.
2. **Weapon Mastery scope** — large new system. Model all mastery properties or subset? Each weapon gets one property; many classes unlock mastery at different levels.
3. **Feat system scope** — 5.2.1 SRD has many more feats than 5.1's sole Grappler. How many to model?
4. **Epic Boons** — every class gets one at 19-20. These are basically capstone feats. Model all or treat as config?
5. **Subclass level shift** — 6 classes now pick subclass at 3 instead of 1-2. Does this change the CharConfig structure or just the level gating?
6. **Keep both specs runnable long-term?** — or archive 2014 and move on?
7. **Thin 2024 QA corpus** — only 239 SE entries. May need to supplement with manual test cases until community produces more.
8. **UI components** — `app/src/components/*.tsx` reference machine types. Need updating in M3.
9. **`@firfi/quint-connect` compatibility** — MBT bridge. Any version issues with changed trace format?
10. **Berserker Frenzy** — no longer causes exhaustion in 5.2.1. This is a significant mechanical shift. Existing tests that assert exhaustion will fail.
