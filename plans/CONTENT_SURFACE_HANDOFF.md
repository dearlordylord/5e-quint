# Content Surface — Session Handoff (end of 2026-04-16)

Checkpoint for a fresh session to pick up the content-surface work
without reconstructing context from conversation history. Read this
file first, then the docs in §Required Reading, then resume per
§Next Steps.

---

## What this project is

`packages/prototype-content-surface/` is **where the taxonomy
actually lives and evolves**. Closed atom vocabulary emerged from
`.references/xphb-srd-pairing/` (v4). This package continues to
shape the vocabulary under real SRD 5.2.1 authoring pressure.

**Goal:** keep reducing `surface_widening` / `atom_widening` queue by
landing unified widenings per-cluster. **Destination (later):**
Quint-first integration — surface types drive Quint variants, which
drive XState, which drives engine.

**Three-way separation:**
- `.references/xphb-srd-pairing/` — frozen research input.
- `.references/competitors/` + `.references/RESEARCH_*.md` — neighbor research (read-only).
- `packages/prototype-content-surface/` — **where the surface evolves**.

**Provenance policy** (updated 2026-04-16):
- SRD 5.2.1 content authored as Dhall/JSON in `content/` — shipped code.
- **XPHB content included in research + surface-type modeling** (so future XPHB authoring doesn't force new widenings) but **NEVER checked into this public git repo as code/content**. Clean-room style.
- XPHB content authoring (when it happens) goes through `.references/xphb-srd-pairing/phb-survey/workspace/content/`, gated by `provenance-check.sh`. That tree is git-ignored.

---

## Required Reading (in order)

1. **`packages/prototype-content-surface/README.md`** — package self-description.
2. **`plans/CONTENT_SURFACE_PROTOTYPE.md`** — red/green loop spec.
3. **`plans/CONTENT_SURFACE_DEFERRED.md`** — THE running ledger of widenings. §A1, §A8, §A13, §A15 are RESOLVED this session; §A9 absorbed into §A15; §A10, §A11, §A12, §A14, §A16, §C1-§C5 still open. §B expanded significantly (illusions, illumination, language, navigation, world-objects, movement-conversion).
4. **`plans/DESIGN_C4a_spawned_companion.md`** — **unread design doc for the next implementation tick.** Full type grammar for spawned-companion payload family; 11 pressure units (3 SRD + 8 XPHB).
5. **`plans/RESEARCH_summons_and_polymorph.md`** — pre-design research. Inventory of all SRD 5.2.1 + XPHB summon/polymorph/shapeshift spells grouped by pattern.
6. **`scripts/content-surface-survey/BATCH_DIGEST_PROMPT.md`** — Stage-2 cluster-digest sub-agent prompt template (includes DM-agenda hard rules, classification vocabulary).
7. **`ARCHITECTURE.md` §1** (lines 100–130) — spatial / DM rulings = caller-provided. Never add to surface.
8. **`CLAUDE.md`** — project conventions (no redundant state, SRD feature parity, provenance discipline).

---

## What landed this session (2026-04-16)

### Widenings landed

- **§A8 any_number target selection** — `TargetSelection.mode = "any_number"`. Unbounded "each creature of your choice". Validation ref: `compulsion.dhall`.
- **§A13 modify_roll_advantage count + expiresOn** — unifies with mastery-side `ModifyRollAdvantageRider`. Validation ref: `vicious_mockery.dhall` (count=1 + expiresOn=end_of_next_turn).
- **§A1 Skill enum + SkillFilter** — closed 18-skill enum; `SkillFilter` tri-union (`fixed` / `choice`); fields added to `modify_roll_numeric`, `modify_roll_advantage`, `RollModifierOperation`. Validation refs: `pass_without_trace.dhall` (fixed=[stealth]), `guidance.dhall` (choice from all 18).
- **§A15 option B — OngoingOperation trigger grammar** — BIG REFACTOR. `OngoingOperation` rewritten to `{ trigger, predicate?, effect }`. Absorbs §A9 (damage-triggered repeat save). 7 existing ongoing_effect files rewritten. Tracer refactored to emit trigger-specific window atoms. See `CONTENT_SURFACE_DEFERRED.md` §A15 for the exact type shape.

### Atom-whitelist fixes

Added to `STAGE_3_EXTENSIONS`: `grant_temp_hp`, `grant_condition_immunity`, `grant_feat`, `modify_max_hp` — these were in types.ts as EffectAtom variants but missing from the validator whitelist, causing false `atom_widening` verdicts. Fixed mid-session.

### Batch-digest infrastructure

- `scripts/content-surface-survey/BATCH_DIGEST_PROMPT.md` — the Stage-2 cluster-digest sub-agent prompt, versioned. Distinguishes from Stage-1 (`run-survey.sh` + `worker.sh` + `prompt-template.md`) which is the initial parallel survey. Stage-2 is re-run per cluster as surface evolves.
- Codified DM-agenda hard rules (spatial/perception/language/location/allegiance/narrative-mutation etc.) so sub-agents stop proposing type-sound-but-architecture-unsound widenings.
- Partial-authoring convention — classify as `partial` when core is encodable and only rider is deferred. Precedents: `compulsion.dhall`, `vicious_mockery.dhall`, `fire_bolt.dhall`.

### 8 batch digests run

- Batch 1 (apply_condition, 16 units): 3 auth + 1 DM + 12 needs_widening.
- Batch 2 (small-proposal spells, 12): 1 partial + 7 DM/deferred + 4 needs_widening.
- Batch 3 (mixed atom+surface, 15): 1 stale + 4 partial + 5 DM + 4 needs_widening + 1 deferred.
- Batch 4 (mixed, 15): 1 partial + 5 DM + 1 deferred + 8 needs_widening.
- Batch 5 (mixed, 15): 4 partial + 4 DM + 1 deferred + 5 needs_widening + 1 structural.
- Batch 6 (mixed, 15): 1 stale + 3 partial + 2 DM + 9 deferred.
- Batch 7 (structural-heavy, 15): 0 authored + 3 DM + 12 deferred/structural.
- Batch 8 (final mini, 4): 0 authored.

### Authored content files this session (24 total)

**Clean** (no widening needed):
- `true_seeing`, `banishment`, `geas`, `ray_of_sickness`, `false_life`, `prayer_of_healing`

**Clean after §A1/§A13 landed** (originally partial, upgraded):
- `vicious_mockery`, `pass_without_trace`, `guidance`, `compulsion`

**Partial** (core authored, rider deferred):
- `heroism`, `mind_blank`, `aura_of_life`, `freedom_of_movement`, `fire_bolt`, `disintegrate`, `fear`, `grease`, `mind_spike`, `dimension_door`, `chromatic_orb`, `mass_suggestion`

**Rewritten for §A15 refactor** (already-clean files updated to new shape):
- `bless`, `divine_favor`, `hunters_mark`, `barkskin`, `mage_armor`

### Survey verdict distribution delta

| Verdict | Session start | Session end | Δ |
|---|---|---|---|
| clean | 89 | 108 | +19 |
| surface_widening | 92 | 83 | −9 |
| atom_widening | 43 | 33 | −10 |
| dm_agenda | 13 | 13 | — |
| structural_widening | 267 | 267 | — |

108 clean (21% of 504 total, 49% of 219 spells).

---

## Current state

- **107 Dhall files in `content/`** — all pass regression.
- **103 dispositions tracked** in `scripts/content-surface-survey/results-srd/<slug>/disposition.md`.
- **88 spell-kind units** digested this session (classified, some authored). Remaining queue is mostly structural (class features, magic items, species traits) + §C-class spells (counterspell, sleep, dispel_magic, harm, spiritual_weapon, wall_of_fire — all need dedicated design).

---

## Next Steps (in order)

### STEP 1 — implement §C4a (spawned-companion payload)

**Design complete:** `plans/DESIGN_C4a_spawned_companion.md` has full type grammar. No user input needed; all implementation decisions were delegated (one flagged in §"Open questions for implementation" — keep DiceAmount, extend `DiceExprDelta.flat` to accept `StatBlockValue`).

**Tasks:**
1. Add types from the design doc to `src/surface/types.ts`:
   - `SpawnedCompanionMechanics` as new payload family
   - `CompanionStatBlock`, `StatBlockValue`, `CompanionAction`, `CompanionMode`, `CompanionControl`, `CompanionDismissal`
   - `CastTimeChoice<T>` generic primitive
2. Add tracer arm in `src/interpreter/tracer.ts` for `family === "spawned_companion"`. Emit `create_companion` + action subgraphs (`attack_roll` / `save_gate` / `support` / `multiattack` dispatch).
3. Author SRD validation refs:
   - `content/find_familiar.dhall` (simplest — CR-0 Beast roster, no attack, type-choice)
   - `content/find_steed.dhall` (level-parameterized AC/HP/damage, type-choice, Life Bond trait)
   - `content/summon_dragon.dhall` (multiattack + breath weapon + caster-shared-resistance trait — full complexity test)
4. Regression sweep.
5. Update DEFERRED.md §C4a → RESOLVED.

Estimate: 1–2 hours.

### STEP 2 — land remaining §C4 sub-problems (C4b–C4h)

Each is its own tick. In order of complexity:
- **C4b catalog reanimation** (Animate Dead, Create Undead) — monster-catalog reference + slot-tiered menus + 24h control cycle.
- **C4c templated multi-spawn** (Animate Objects) — count-by-spellcasting-mod + per-size-class Slam damage rows.
- **C4d target stat-block replacement** (Polymorph, Shapechange, True Polymorph, Wild Shape) — retained-field selector + CR filter + revert-on-0HP.
- **C4e self-modify without swap** (Alter Self) — mode enum + mid-duration switch.
- **C4g object-target** (True Polymorph object mode) — `Attachment.object` kind + bidirectional transform.
- **C4h permanent-after-concentration** (True Polymorph's full-hour → until-dispelled) — coalesces with §A10 permanent Duration.

After C4a ships, design each as a mini-doc (like DESIGN_C4a) before landing. Some may coalesce.

### STEP 3 — author the §A15-unlocked partials

§A15 refactor completed the grammar but didn't yet author the units that pressured it. Author these as validation refs (no new widenings needed — just use the new OngoingOperation shape):

- **Heroism** — rewrite existing partial to full auth: `operation = { trigger: on_attached_turn_start, effect: grant_temp_hp (amount = caster spellcasting mod) }` paired with the already-landed `grant_condition_immunity frightened`. **Note:** "equal to spellcasting ability modifier" pressures §A14 relative-to-stat DiceAmount. May have to stay partial until §A14 lands.
- **Aura of Life** — add `{ trigger: on_attached_turn_start, predicate: at_hp_threshold (0, eq), effect: heal_hp 1 }`.
- **Spirit Guardians** — `{ trigger: on_attached_turn_start, effect: save_gate (Wis, onFail: half-damage'd radiant/necrotic) }` in area emanation.
- **Web** — `{ trigger: on_attached_turn_start, predicate: (restrained), effect: save_gate (Str) }` for escape check.
- **Spike Growth** — `{ trigger: on_creature_moves, perFeet: 5, effect: damage 2d4 piercing }`.
- **Cloudkill** — `{ trigger: on_attached_turn_start, effect: save_gate (Con, onFail: 5d8 poison, onSuccess: half_damage) }` + moving area (§A15-sibling area-movement mechanic, may need extra grammar).
- **Moonbeam** — similar to Cloudkill + save-on-entry variant.
- **Beacon of Hope** — max-healing-received rider pressures §A16 damage-immunity-family (sibling mechanic). May partial-author the save-advantage portion.
- **Dominate Beast / Person / Monster** — `trigger: on_attached_damaged, effect: save_gate (with advantage)` — the §A9 absorption.

Some are fully authorable now; some still hit §A14 / §A16 partials. Each is ~5 min to author + validate.

### STEP 4 — land remaining smaller DEFERRED items

- **§A10 permanent / until-dispelled Duration** (Sequester, Geas L9, Clone, Planar Binding upcast, True Polymorph concentrate-full → permanent). Coalesce with C4h.
- **§A11 ActivatedAbilityMechanics.duration** (Ranger Nature's Veil; class-feature condition scoping).
- **§A12 UseCountCap.ability_modifier** (Bardic Inspiration; Nature's Veil).
- **§A14 relative-to-stat amount** (Spider Climb climb=walk speed, Harm HP=damage-taken, Vampiric Touch heal=damage-dealt, Heroism temp-HP=spellcasting-mod).
- **§A16 damage-type immunity + block_max_hp_reduction** (Mind Blank psychic, Aura of Life block-max-hp-reduction, future Holy Aura).

Each is 1 tick. Unlocks corresponding partials to full-auth.

### STEP 5 — tackle §C design questions

- **§C1 Counterspell family** — reaction-with-save-gate + observer-relative trigger + slot-auto-success DC bypass. Hellish Rebuke lives here too. Big design.
- **§C2 Sleep** — two-stage save chain.
- **§C3 Dispel Magic** — ability check (not save) + slot-auto-success (shares shape with C1).
- **§C4b–h** (see STEP 2).
- **§C5 OngoingOperation / EffectAtom unification** — revisit now that §A15 refactored OngoingOperation. Some duplication may have dissolved; check if it's still open.

### STEP 6 — structural queue (267 units)

Different beast:
- **Class features (126):** need design passes per class/resource family (rage, channel divinity, ki/focus, bardic inspiration, spellcasting progression, subclass dispatch). Probably 3–5 big design docs, each unlocking 20–40 units.
- **Magic items (66):** attunement variants, cursed items, charge-wand variants, sentient items.
- **Species traits (17):** mostly batch-digestable — simple grant_sense / grant_resistance / size / speed. Use the improved batch-digest prompt.

### STEP 7 — Quint-first integration (the destination)

Per README §"Where Quint comes in (later)": once surface stops producing widenings (~10 consecutive units clean), Phase 1 of `.references/xphb-srd-pairing/PLAN_closed_extension_surface_implementation.md` begins.

1. Surface types → Quint-variant generator.
2. Generated variants into `packages/core/*.qnt`.
3. `battle.qnt` / `creature.qnt` gain spec support.
4. MBT parity in `packages/core`.
5. XState machines updated.

**Stop condition the README commits to:** "~10 consecutive spells author cleanly without a new atom" → taxonomy track converged.

---

## Surface state cheat sheet

Current surface types (highlights from this session):

### Target selection
```ts
TargetSelection =
  | { mode: "one"; typeFilter? }
  | { mode: "choose_up_to"; count: number | SlotScaling<number>; repeatsAllowed?; typeFilter? }
  | { mode: "any_number"; typeFilter? }   // §A8 — landed this session
```

### EffectAtom highlights
- `modify_roll_numeric` — has `skillFilter?: SkillFilter`, `count?`, `weaponFilter?` (§A1, §A13 parallel)
- `modify_roll_advantage` — has `skillFilter?`, `count?`, `expiresOn?: RiderExpiry`, `attackerTypeFilter?` (§A13, §A1)
- `apply_condition` / `remove_condition` — tri-union (bare / array / choose)
- `composite { effects: EffectAtom[] }` — bundle multiple atoms in one slot
- All 15 conditions in `CONDITIONS`; all 14 creature types in `CREATURE_TYPES`; all 18 skills in `SKILLS`

### Duration
```ts
Duration =
  | { kind: "instantaneous" }
  | { kind: "concentration"; upTo: DurationValue; earlyEnd? }
  | { kind: "timed"; value: DurationValue; earlyEnd? }
```
`DurationValue` has `upcastTiers?` for slot-scaled duration (Hunter's Mark pattern).
`DurationEndTrigger` enum: target_makes_attack_roll, target_deals_damage, target_casts_spell, target_dons_armor, target_damaged_by_caster_or_ally, target_takes_damage.

### OngoingOperation (§A15 refactor — new grammar)
```ts
OngoingOperation = {
  trigger: OngoingTrigger;      // passive | on_caster_attack_hit | on_attached_turn_start | on_caster_turn_start | on_attached_damaged | on_creature_moves { perFeet? } | on_creature_enters_area
  predicate?: OngoingPredicate; // at_hp_threshold
  effect: OngoingEffect;        // EffectAtom | save_gate | modify_ac_set_base | modify_ac_set_floor
}
```

### Attachment kinds
- `self`, `target`, `area { shape, origin }`, `mark { selection, transfer? }`
- Area origins: `point_within_range`, `on_primary_target`, `self` (emanation)

### Mechanics families
- `activation` (phases: attack_roll / save_gate / direct)
- `ongoing_effect` (attachment + operation)
- `triggered_reaction` (Shield, Counterspell shape)
- `anchored_trigger` (Alarm)
- **`spawned_companion`** (designed in DESIGN_C4a, not yet implemented)

### Closed enums
- `RollKind`: attack_roll | saving_throw | ability_check | initiative
- `Ability`: str/dex/con/int/wis/cha
- `DamageType`: 13 types
- `Condition`: 15 SRD conditions
- `CreatureType`: 14 SRD types
- `Skill`: 18 SRD skills (§A1)
- `SenseKind`: darkvision | blindsight | tremorsense | truesight
- `StandardActionKind`: 12 action kinds
- `ClassName`: 12 classes

---

## File locations cheat sheet

### Code
- Surface types: `packages/prototype-content-surface/src/surface/types.ts`
- Tracer: `packages/prototype-content-surface/src/interpreter/tracer.ts`
- Content: `packages/prototype-content-surface/content/<slug>.{dhall,json,trace.md}`

### Survey infrastructure
- Atom whitelist: `scripts/content-surface-survey/atom-whitelist.ts`
- Validator: `scripts/content-surface-survey/validate.ts`
- Aggregate: `scripts/content-surface-survey/aggregate.ts`
- Report: `scripts/content-surface-survey/REPORT_SRD.md`
- Dataset: `scripts/content-surface-survey/survey-results-srd.jsonl`
- Per-unit: `scripts/content-surface-survey/results-srd/<slug>/{proposal,result,verdict,disposition}.md/json`
- Batch digest prompt: `scripts/content-surface-survey/BATCH_DIGEST_PROMPT.md`
- Trace one unit: `packages/prototype-content-surface/scripts/content-surface-survey/trace-one.ts`

### Plans / design
- `plans/CONTENT_SURFACE_PROTOTYPE.md` — red/green loop spec (stable)
- `plans/CONTENT_SURFACE_SURVEY.md` — Stage-1 survey pipeline
- `plans/CONTENT_SURFACE_DEFERRED.md` — ledger of open/resolved widenings (living doc)
- `plans/DESIGN_C4a_spawned_companion.md` — NEXT implementation (this doc drives STEP 1)
- `plans/RESEARCH_summons_and_polymorph.md` — SRD + XPHB summon/polymorph inventory

### References
- SRD 5.2.1 spells: `.references/srd-5.2.1/Spells/Descriptions-{A-D,E-L,M-P,Q-R,S-Z}.md`
- SRD 5.2.1 classes: `.references/srd-5.2.1/Classes/*.md`
- SRD 5.2.1 glossary: `.references/srd-5.2.1/Rules-Glossary.md`
- XPHB data (research-only): `.references/5etools-src/data/spells/spells-xphb.json`
- Research corpus: `.references/xphb-srd-pairing/`

---

## Conventions / lessons from this session

1. **Partial authoring is encouraged.** Core of a unit authors cleanly; rider omitted with a `DEFERRED.` comment. Precedents: `compulsion.dhall`, `vicious_mockery.dhall` (before A13), `fire_bolt.dhall`.

2. **Turn-scoped riders on "Instantaneous" spells:** use `Duration.timed 1 round` to host the rider's expiry window. Precedent: Ray of Sickness. The RAW header is bent; comment in the Dhall file explains the convention.

3. **Skill/ability-scoped effects that over-apply:** use `§A1 SkillFilter.fixed` or OMIT with comment. Never author `on: ["ability_check"]` without narrowing if RAW narrows to a specific skill.

4. **Cast-time choices:** use the `choice` variant pattern — `DamageTypeRef.choice`, `SkillFilter.choice`, `DamageTypeRef.choice` (Chromatic Orb), etc. Generic `CastTimeChoice<T>` primitive proposed in DESIGN_C4a.

5. **DM-agenda proactive rejection:** the dominant Stage-1 mistake is proposing type-sound widenings for caller-owned capabilities (language, location, visibility, allegiance, narrative mutation). Batch-digest prompt now has an explicit §B list.

6. **Empty arrays and dhall-to-json `--omit-empty`:** empty arrays get stripped. For `ActivationPhase.onMiss` with no effect, use `[ { kind = "none" } ]`, not `[]`.

7. **CLAUDE.md "no redundant state":** when refactoring, remove old shapes rather than keeping deprecated aliases. §A15 did this (removed `RollModifierOperation`, `DamageOnHitOperation`, `ModifyAcOngoingOperation` top-level aliases — the AC variants live inside `OngoingEffect` now).

8. **Atom whitelist drift:** when a new EffectAtom variant lands in types.ts, remember to add its atomKind string to `STAGE_3_EXTENSIONS` in `atom-whitelist.ts`. Otherwise the validator returns a false `atom_widening` verdict. Fixed four gaps mid-session: grant_temp_hp, grant_condition_immunity, grant_feat, modify_max_hp.

9. **Memory files (CLAUDE.md):** do not modify unless the user asks. Per handoff note from prior session.

---

## Open tasks (see /tasks)

As of end-of-session all top-level tasks are `completed`. No pending tasks carried forward — next session should create new tasks from §Next Steps.

---

## How to resume tomorrow (quick start)

```sh
cd /workspace/typescript/dnd

# 1. Read handoff + the NEXT design doc
cat plans/CONTENT_SURFACE_HANDOFF.md      # this file
cat plans/DESIGN_C4a_spawned_companion.md # next implementation

# 2. Sanity-check state
cd packages/prototype-content-surface
pnpm typecheck                             # should be clean
ls content/*.dhall | wc -l                 # should be 107

# 3. Run regression
for f in content/*.dhall; do
  name=$(basename "$f" .dhall)
  [ "$name" = "magic_item_gauntlets_of_ogre_power" ] && continue
  dhall-to-json --omit-empty --file "$f" > /tmp/$name.json 2>/dev/null \
    && npx tsx scripts/content-surface-survey/trace-one.ts /tmp/$name.json > /dev/null 2>&1 \
    || echo "FAIL: $name"
done

# 4. Start implementing C4a from the design doc
```

After resume, delete this handoff file (it's a session-bridge artifact, not a persistent plan — the persistent docs are `DEFERRED.md`, `PROTOTYPE.md`, `SURVEY.md`, `DESIGN_C4a`, `RESEARCH_summons_and_polymorph.md`).
