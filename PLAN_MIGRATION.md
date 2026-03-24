# SRD 5.1 -> 5.2.1 Migration Plan

Migrate the formal spec, XState machine, MBT bridge, QA pipeline, and docs from SRD 5.1 (2014 rules) to SRD 5.2.1 (2024 rules).

**SRD parity principle:** the spec formalizes the SRD and nothing else. Every rule traces to a specific SRD passage. No homebrew or interpretive extensions. Where the formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`. This migration changes the source of truth from SRD 5.1 to SRD 5.2.1.

Two plan files to migrate, strictly in order:
1. **PLAN.md** (core) — generic mechanics in `dnd.qnt`. Migrated first.
2. **PLAN_NONCORE.md** (non-core) — class features, spells, racial traits in TS/caller. Migrated second, after core is stable.

References:
- `.references/srd-5.2.1/` — full SRD 5.2.1 text (Classes/, Spells/, Monsters/, Magic-Items/, plus top-level Playing-the-Game.md, Rules-Glossary.md, Equipment.md, etc.)
- `.references/srd-5.2.1-conversion/` — official conversion guide (delta manifest: lists every new, renamed, and revised element per section — use this to drive the migration, look up actual rules in the full text)
- `.references/srd/` — SRD 5.1 (current spec source)

Note: `Magic-Items/` may be incomplete (only `Items-Q-Z.md` + `Overview.md`, no A-P file).

---

## Phase 0 — Preserve 5.1 Artifacts ✅ DONE

Completed: `81c0554`. Tag: `v5.1-final`.

- M0.1: `dnd2014.qnt` + `dnd2014Test.qnt` archived, `quint test` passes
- M0.2: `PLAN_2014.md` + `PLAN_NONCORE_2014.md` archived
- M0.3: **Option B** chosen — evolve in-place, git history as 5.1 reference
- M0.4: `v5.1-final` tag set. Continuing on `master` (greenfield)

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

## Phase 2 — Migrate PLAN.md (Core) to 5.2.1

Port every task in PLAN.md from SRD 5.1 rules to SRD 5.2.1 rules. This is a rule-checking task: read the conversion guide and full SRD 5.2.1 text, update each task's description to reflect 2024 mechanics.

Use `.references/srd-5.2.1-conversion/` as the delta manifest. Look up actual rules in `.references/srd-5.2.1/`.

### M2.1 Core rules delta

Changes that affect PLAN.md tasks:

| 5.1 | 5.2.1 | Location in current spec (needs updating) |
|-----|-------|-------------------------------------------|
| Surprise skips turn | Surprise = disadvantage on Initiative | TA3, TA4 |
| Bonus-action spell rule | One Spell with Spell Slot per Turn | dnd.qnt spellcasting section |
| Knock out -> 0 HP | Knock out -> 1 HP + start Short Rest | dnd.qnt pKnockOut |
| Exhaustion: 6 tiers, cumulative | Exhaustion: conditions-based (revised) | dnd.qnt pAddExhaustion |
| Stunned: can't move | Stunned: can move, can't speak | dnd.qnt pApplyCondition |
| Grappled: speed 0 | Grappled: speed 0 + disadvantage on attacks vs non-grappler + drag costs 1 extra ft/ft | dnd.qnt pStartTurn, pOwnAttackModifiers |
| Saving throws: must roll | Can choose to fail | dnd.qnt saveSucceeds |
| Cast a Spell action | Magic action | dnd.qnt ActionType |
| Use an Object action | Utilize action | dnd.qnt ActionType |
| Race | Species | Non-core T01 (CharConfig identity) |
| Hit Dice | Hit Point Dice | Rename throughout |
| Armor proficiency | Armor training | Rename |
| Concentration DC: no cap | Concentration DC: max 30 | dnd.qnt pConcentrationDC |
| Unarmed Strike: separate | Unarmed Strike: includes grapple/shove | dnd.qnt section 13 (grapple/shove) |
| Attack action: fixed | Equip/unequip per attack, move between | dnd.qnt section 11 (turn structure) |

### M2.2 Type/enum renames in core
- `HitDice` -> `HitPointDice`
- `ACastSpell` -> `AMagic`
- `AUseObject` -> `AUtilize`
- Add new action types: `AStudy`, `AInfluence`
- Note: `Race` -> `Species` rename is non-core (T01 in PLAN_NONCORE.md)

### M2.3 Condition revisions in core
- Exhaustion: completely new system (replace 6-tier with new)
- Stunned: can move, can't speak (reverse current behavior)
- Grappled: revised
- Charmed, Incapacitated, Invisible, Petrified: revised

### M2.4 New core mechanics
- Weapon Mastery framework (property system, not individual mastery effects)
- Concentration DC cap at 30
- Voluntary save failure
- Unarmed Strike restructure (grapple/shove as options within Unarmed Strike)

### M2.5 Implement migrated core spec
- Apply all M2.1-M2.4 changes to `dnd.qnt`
- Write new `dndTest.qnt` (or adapt from `dnd2014Test.qnt`)
- `quint test dndTest.qnt` must pass

---

## Phase 3 — Migrate PLAN_NONCORE.md to 5.2.1

Port every task in PLAN_NONCORE.md from SRD 5.1 rules to SRD 5.2.1 rules. Same rule-checking approach as Phase 2. Depends on Phase 2 being complete (non-core composes on core).

### M3.1 Class feature delta
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
- **Warlock**: Magical Cunning, Contract Patron; Pact Boons moved to invocations; new invocations
- **Wizard**: Scholar, Memorize Spell

Revised features: see `.references/srd-5.2.1-conversion/03-classes.md` for full list. Key changes: Berserker Frenzy no longer causes exhaustion, Ki renamed Focus, Divine Smite is now a spell (Paladin's Smite), Channel Divinity absorbs Divine Sense, Fighting Styles are now Feats.

New features fold into existing PLAN_NONCORE.md tasks where a matching class section exists (e.g., Barbarian new features -> T12 Barbarian Passives, Fighter new features -> T22/T23). Features with no natural home get new task IDs assigned during migration (e.g., Weapon Mastery per-class unlocks, Epic Boons).

### M3.2 Type/enum renames in non-core
- `Ki` -> `Focus` (Monk)
- `DivineSmite` -> `PaladinsSmite`
- `FightingStyle` -> Feat category
- `Feeblemind` -> `Befuddlement`
- `BrandingSmite` -> `ShiningSmite`
- Subclass names: `DraconicBloodline` -> `DraconicSorcery`, `TheFiend` -> `FiendPatron`, `Evocation` -> `Evoker`, `WayOfTheOpenHand` -> `WarriorOfTheOpenHand`

### M3.3 Species (was Races)
- Ability scores no longer from species — come from Background
- Subraces eliminated (trait choices within species instead)
- New: Goliath, Orc
- T140/T141 need full rewrite

### M3.4 Spell changes
- All spells revised in presentation/stats
- Renames: Feeblemind->Befuddlement, Branding Smite->Shining Smite
- ~20 new spells (Divine Smite is now a spell, Hex, Chromatic Orb, etc.)
- Spell lists per class revised
- One Spell with Spell Slot per Turn: replaces bonus-action spell restriction

### M3.5 Feat system
- Feats categorized: Origin, General, Fighting Style, Epic Boon
- ASI is a feat
- Grappler revised
- Many new feats in SRD (all categories)
- Scope decision: model all SRD feats or keep minimal?

### M3.6 Equipment & Weapon Mastery (non-core aspects)
- Weapon Mastery individual effects (Cleave, Slow, Nick, Topple, Graze, Push, Sap, Vex) — per-weapon behavior, TS side
- Fighting Styles -> Feats: T05 restructure
- New weapons: Musket, Pistol

---

## Phase 4 — XState Machine Migration

### M4.1 Update `types.ts`
- Rename types to match 2024 terminology
- Add new enums (Weapon Mastery, feat categories, species, etc.)
- Remove subraces, add species trait choices

### M4.2 Update `machine.ts` + `machine-helpers.ts` + `machine-combat.ts`
- Evolve state machine to match new `dnd.qnt`
- Key changes: new action types (Magic, Utilize, Study, Influence), revised conditions, new class features
- Surprise -> initiative disadvantage (not turn skip)
- Bonus-action spell rule -> one slot spell per turn
- Unarmed Strike restructure (includes grapple/shove)

### M4.3 Update `machine-states.ts` + `machine-queries.ts`
- State hierarchy changes for new action types
- Query functions for new mechanics

### M4.4 Update `machine-types.ts`
- Context type changes to match new `dnd.qnt` state fields

### M4.5 Reconnect MBT bridge (`machine.mbt.test.ts`)
- Update Quint->TS enum mappings (new condition names, action types, etc.)
- Point at new `dnd.qnt` (not `dnd2014.qnt`)
- Update `stateCheck` field mappings for changed/new context fields
- Run 50 traces x 30 steps — must pass

### M4.6 Update `machine.test.ts`
- Adapt unit tests for revised mechanics
- Add tests for new features

---

## Phase 5 — Docs & References

### M5.1 Update `UBIQUITOUS_LANGUAGE.md`
- Race -> Species
- Ki -> Monk's Focus
- Hit Dice -> Hit Point Dice
- Armor proficiency -> Armor training
- Cast a Spell -> Magic action
- Use an Object -> Utilize
- Add: D20 Test, Heroic Inspiration, Bloodied, Weapon Mastery, etc.

### M5.2 Update `CLAUDE.md`
- Reference new SRD location
- Update parity rules for new spec

### M5.3 Update `README.md`
- Note SRD version (5.2.1)
- Link to conversion guide
- Mention 5.1 archived artifacts

---

## Phase 6 — QA Pipeline Rebuild for 2024

### M6.1 Regenerate 2024 assertions
- Run `generate_assertions.py --edition 2024` against new `dnd.qnt`
- Only 239 SE entries tagged `dnd-5e-2024` — thin corpus initially

### M6.2 Validate 2014 assertions still work
- `quint test qa_generated_2014.qnt --main qa_generated_2014` against `dnd2014.qnt`
- Should pass unchanged (regression guard)

### M6.3 Cross-version triage
- Some 2014 Q&A is version-agnostic (basic d20 math, HP overflow, etc.)
- Classifier could tag these as `ambiguous` -> usable for both versions
- Low priority; manual curation later

---

## Dependency Order

```
M0 (archive) ──────────────────────────────────────────┐
  M0.1 archive qnt                                     |
  M0.2 archive PLANs                                   |
  M0.3 branch machine                                  |
  M0.4 git tag                                         |
                                                       |
M1 (QA pipeline) -- can start in parallel with M0 ─────|
  M1.1-M1.5 edition tagging                            |
                                                       |
M2 (migrate PLAN.md core) -- needs M0.1 ───────────────|
  M2.1-M2.4 rule-check core tasks against 5.2.1       |
  M2.5 implement migrated core spec                    |
                                                       |
M3 (migrate PLAN_NONCORE.md) -- needs M2 ──────────────|
  M3.1-M3.6 rule-check non-core tasks against 5.2.1   |
                                                       |
M4 (XState + TS) -- needs M2.5; M3 for TS target ─────|
  M4.1-M4.6 machine + MBT                              |
                                                       |
M5 (docs) -- needs M2 ────────────────────────────────-|
                                                       |
M6 (QA rebuild) -- needs M1 + M2.5 ────────────────────┘
```

Key ordering constraint: **M2 (core) strictly before M3 (non-core)**. Non-core depends on core primitives being stable.

Parallelizable: M0 + M1 can start immediately. M3 can start as soon as M2 is done. M4 needs M2.5 (core spec implemented) to start core XState parity; M3 (non-core plan migrated) so TypeScript knows the full target design for non-core pure functions and caller logic. M5 can start after M2.

---

## Risk / Open Questions

1. **Magic-Items A-P may be missing** — `Magic-Items/` only has `Items-Q-Z.md` + `Overview.md`.
2. **Weapon Mastery scope** — large new system. Core framework (property on weapons, unlock by class level) goes in PLAN.md. Individual mastery effects (Cleave, Slow, etc.) go in PLAN_NONCORE.md. How many to model?
3. **Feat system scope** — 5.2.1 SRD has many more feats than 5.1's sole Grappler. How many to model?
4. **Epic Boons** — every class gets one at 19-20. Model all or treat as config?
5. **Subclass level shift** — 6 classes now pick subclass at 3 instead of 1-2. Affects CharConfig structure?
6. **Keep both specs runnable long-term?** — or archive 2014 and move on?
7. **Thin 2024 QA corpus** — only 239 SE entries. May need manual test cases.
8. **UI components** — `app/src/components/*.tsx` reference machine types. Need updating in M4.
9. **`@firfi/quint-connect` compatibility** — MBT bridge. Any version issues?
10. **Berserker Frenzy** — no longer causes exhaustion in 5.2.1. Significant mechanical shift.
