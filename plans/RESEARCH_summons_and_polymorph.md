# Research — summons, polymorph, and companions (SRD 5.2.1)

Pre-design research for §C4 "stat-block projection" widening. Gathers
every SRD 5.2.1 unit that touches creature-spawn, shape-shift, or
companion control, and groups them by the sub-problem they pressure.
**No encoding decisions here** — this is inventory + pattern
classification so the later design tick sees the full pressure set at
once.

---

## 1. Full inventory (SRD 5.2.1 core)

### Spells

| Spell | Level | Family (by pattern — see §2) |
|---|---|---|
| Find Familiar | 1 | D — templated-catalog companion |
| Find Steed | 2 | A — level-parameterized stat block |
| Alter Self | 2 | F — self-modify without stat-block swap |
| Animate Dead | 3 | B — catalog reanimation, control-multiple |
| Conjure Animals | 3 | *not a summon* — movable damage emanation (§A15) |
| Conjure Minor Elementals | 4 | *not a summon* — caster-centric emanation (§A15) |
| Conjure Woodland Beings | 4 | *not a summon* — caster-centric emanation (§A15) |
| Polymorph | 4 | C — target → Beast, retain HP/alignment |
| Animate Objects | 5 | D — templated object-companions (Animated Object stat block with size-branched damage) |
| Awaken | 5 | G — grant sentience to Beast/Plant (narrative) |
| Conjure Elemental | 5 | *not a summon* — persistent damage spirit (§A15) |
| Planar Binding | 5 | H — bind already-summoned creature (narrative service) |
| Summon Dragon | 5 | A — level-parameterized inline stat block |
| Awaken | 5 | G — Charmed 30d, then free-willed |
| Create Undead | 6 | B — catalog reanimation with upcast tiers |
| Conjure Celestial | 7 | *not a summon* — movable Bright Light cylinder (§A15) |
| Conjure Fey | 6 | *not a summon* — teleporting spirit with melee attack |
| Planar Ally | 6 | H — narrative-contract summoning (DM-GM agenda) |
| Shapechange | 9 | C — self → any creature (keep mental stats) |
| True Polymorph | 9 | C + E — target → creature OR object, optionally permanent |

### Class features

| Feature | Class / level | Family |
|---|---|---|
| Wild Shape | Druid L2 | C — self → Beast, catalog from "known forms" |
| Wild Companion | Druid L2 | D — templated companion (Find Familiar spawn) |
| Primal Strike | Druid (while Wild Shape) | weapon-rider attached to shapeshift form |
| Nature's Wrath | Druid subclass path | free-standing emanation (§A15) |
| Spiritual Weapon | (spell, Cleric) | *summoned proxy attacker* — caster-BA-controlled separate entity |

### Known deferred items already surfaced

- §A9 damage-triggered repeat save — also applies to Planar Binding's Cha save.
- §A10 permanent duration — True Polymorph (Concentration ≥1hr → permanent), Planar Binding upcast (366d at slot 9, effectively permanent), Clone (until you die).
- §C4 listed in DEFERRED as "stat-block projection" — this research feeds its scope.

---

## 2. Stat-block source patterns

Six distinct ways SRD 5.2.1 specifies the summoned/transformed creature's stats.

### A — Level-parameterized inline stat block

Stat block printed in the spell; fields reference `the spell's level`.
- **Find Steed**: `AC 10 + 1 per spell level`, `HP 5 + 10 per spell level`, `Rend damage 1d6 + 4 + spell level`.
- **Summon Dragon**: `AC 14 + spell's level`, `HP 50 + 10 per level above 5`, Multiattack count scales with level, Breath Weapon save = caster spell save DC.

Key modeling shapes:
- The spell IS the stat block source; no external catalog reference.
- Numeric fields (AC, HP, attack damage, DC) are formulas over spell level.
- Caster's stats enter: `spell attack modifier`, `spell save DC`, `Proficiency Bonus`, `spellcasting ability modifier` all thread into the summoned creature's stats.
- Caster makes choices at cast time (Steed type → damage type; Dragon → damage type from Resistances list).

### B — Named catalog reanimation

Caster animates a corpse/pile-of-bones → specific named Monster catalog entry.
- **Animate Dead** L3: Skeleton or Zombie.
- **Create Undead** L6: Ghoul (base), slot-tiered upgrades at L7 (4 Ghouls), L8 (5 Ghouls / 2 Ghasts / 2 Wights), L9 (6 Ghouls / 3 Ghasts-or-Wights / 2 Mummies).

Key shapes:
- References to external Monster catalog entries (Skeleton, Zombie, Ghoul, Ghast, Wight, Mummy — stat blocks live in "Monsters").
- Slot-tiered count + slot-tiered entry-list (Create Undead's L7/L8/L9 menus).
- Control model: "Bonus Action to mentally command, 24-hour control window, recast to maintain control, reasserts over N existing instead of spawning new".

### C — Target-replacement with retained fields

Target's stat block swapped for a new one; some fields retained.
- **Polymorph**: target → any Beast of CR ≤ target's CR/level. Retains: alignment, personality, creature type, HP, HD. Gains: Beast's temp HP pool (reverts to original on loss). Actions limited by anatomy.
- **Shapechange** (self): self → any non-Construct non-Undead CR ≤ caster level. Retains more: creature type, alignment, personality, INT/WIS/CHA, HP, HD, proficiencies, Spellcasting feature, communication.
- **True Polymorph** (target): creature → creature OR object (size ≤ original). Retains: HP, HD, alignment, personality. With maintained concentration for full hour → "lasts until dispelled" (effectively permanent).
- **Wild Shape** (Druid class feature): self → Beast from "known forms", plus temp HP = Druid level.

Key shapes:
- "Replace stat block, retain list: [...]" — retained-field selector grammar.
- Source-of-form: caster choice constrained by CR filter + form-legality predicate (Polymorph: Beast-only; Shapechange: not-Construct-not-Undead; Wild Shape: from learned roster).
- Dismissal/reversion: drop to 0 HP → revert (damage carries over in Polymorph); spell ends → revert.

### D — Templated ephemeral companion with caster-choice parameters

Stat block printed in the spell, customizable by caster choices.
- **Find Familiar**: choose from 12-name Beast roster OR any CR-0 Beast. Creature type declared Celestial/Fey/Fiend (your choice). No combat attack.
- **Animate Objects**: N objects = spellcasting ability modifier; each categorized Medium-or-smaller (1 cost) / Large (2 cost) / Huge (3 cost); Slam damage varies by size branch, upcast adds +dice per size branch (+1d4 / +1d6 / +1d12).
- **Wild Companion** (Druid L2): cast Find Familiar via Wild Shape use.

Key shapes:
- Catalog-of-forms (Familiar's 12-name list) OR predicate over game content (CR-0 Beast).
- Caster's spellcasting-ability-modifier as a *count* parameter (Animate Objects N).
- Size-branched per-instance stat variants (Animate Objects Small/Large/Huge with 3 damage rows).
- No-attack creatures (Familiar) — combat-modelable but action-restricted.

### E — Object-target transform

True Polymorph: creature → object, or object → creature.
- Creature → object: object has creature's HP? (spec says "statistics become those of the object"). On spell end: creature returns with no memory of time-as-object.
- Object → creature: creature size ≤ object size, CR ≤ 9. "Friendly", obeys commands, takes turn after caster's.
- Unwilling-object clause: object can't be worn/carried (by someone).

Key shapes:
- Target attachment can be `object` (new Attachment kind per current surface — NOT yet present).
- Bidirectional transform: creature ↔ object.
- Memory/state preservation during transform (session-layer).

### F — Self-modification without full stat-block swap

- **Alter Self**: three mutually-exclusive modes, caster picks one at cast time, can SWAP between modes as a Magic action during duration.
  - Aquatic Adaptation — gain gills + Swim Speed = Speed (§A14 relative-to-stat).
  - Change Appearance — illusion-adjacent (§B DM agenda).
  - Natural Weapons — unarmed-strike override (new damage, spellcasting ability replaces STR).
- Stays as "you" mechanically — no stat-block swap, only atomic modifiers.

Key shapes:
- Mode-switch mid-duration as a Magic action (caster-choice persistent flag + switch atom).
- Add/override weapon property on Unarmed Strike (weapon-attack override).
- Relative-to-stat speed (§A14).

### G — Sentience / creature-type grant (Awaken)

Target gains Int 10 + language + Charmed condition (30 days / until damaged by caster+allies).
- Mostly narrative — "awakened creature chooses its attitude toward you".
- Beast/Plant creature-type change possible.

Key shapes:
- Creature-type mutation atom (Beast → Plant-creature).
- Ability-score floor (Int becomes 10).
- Language grant.
- Extended-duration Charmed with damage-ends trigger (`target_damaged_by_caster_or_ally` — already landed).

### H — Narrative summon (Planar Ally)

Pure DM agenda — "The being must be known to you: a god, a demon prince,
or some other being of cosmic power. [...] GM's choice." Task payment
in GP per minute/hour/day.

Classify §B on DEFERRED.

---

## 3. Conjure X spells — NOT summons in SRD 5.2.1

Important RAW update: the SRD 5.2.1 / PHB 2024 rewrote the Conjure
family. They no longer spawn creatures you control. They're movable
damage emanations.

- **Conjure Animals**: "Large pack of spectral, intangible animals" — no stat block, caster moves pack 30 ft/turn, save-gate damage when entering creature spaces.
- **Conjure Celestial**: pillar of light cylinder, per-creature healing-or-damage choice per turn.
- **Conjure Elemental**: 8d8 elemental spirit with Restrained rider on failed save + repeat save.
- **Conjure Fey**: teleporting melee-spirit caster can direct as BA.
- **Conjure Minor Elementals**: caster-self 15-ft emanation, extra 2d8 damage on caster's attacks into emanation.
- **Conjure Woodland Beings**: caster-self 10-ft emanation, save-or-damage on entry.

These belong to **§A15 per-turn-trigger ongoing-op** cluster, NOT the
stat-block-projection cluster. They're area spells with movement and
per-turn save-gate resolution — no companion to control.

Only **Summon Dragon** is a proper creature summon in the Conjuration
school in SRD 5.2.1.

---

## 4. Sub-problems for §C4 design

Grouping the pressure into independently-designable pieces:

### C4a — Spawned-companion payload (spells: Find Familiar, Find Steed, Summon Dragon, Spiritual Weapon-like)

Creates a discrete companion creature parameterized by spell level.
Needs: stat-block grammar with level-indexed formulas, caster-derived
stats (spell attack mod, spell save DC, PB), cast-time caster choices
(damage type / creature type / action subset).

### C4b — Catalog-spawn with slot-tiered menus (Animate Dead, Create Undead)

Spawn creatures from a named Monster catalog entry. Needs: monster
catalog references + slot-tiered menus + count + control-window
grammar (24h refresh, BA-command, "reassert over N existing").

### C4c — Templated multi-spawn with per-instance size branches (Animate Objects, Find Familiar catalog mode)

Spawn N instances chosen from a branching template. Needs: count
parameterized by caster stat, per-instance category picker, per-category
stat row.

### C4d — Target stat-block replacement with retained fields (Polymorph, True Polymorph, Shapechange, Wild Shape)

Replace target's stat block with a caster-chosen form; retain a named
subset of the original's fields. Needs: form-legality predicate (CR
filter, type filter), retained-field selector, dismissal/reversion rules,
temp HP pool from new form.

### C4e — Self-modify without stat-block swap (Alter Self)

Multi-mode persistent effect with runtime mode-switch. Needs: mode
enum + mode-switch atom.

### C4f — Companion control mechanics (cross-cutting)

Every spawned-ally spell needs: initiative slot (shared with caster /
own turn / immediately-after-caster), BA-command vs auto-behave, range
limit on command (60 ft / 100 ft telepathy / 500 ft), what-happens-if-no-command (Dodge by default), on-0-HP dismissal, on-spell-end dismissal.

### C4g — Object-target transform (True Polymorph only)

Attachment kind `object`; size/CR constraint on target + new form; memory
preservation / reversion.

### C4h — Permanent-after-concentration (True Polymorph's "concentrate for full hour → until dispelled")

New Duration variant: concentration-for-full-duration upgrades to
permanent. Coalesces with §A10.

---

## 5. XPHB Summon family (2024 PHB — research scope, NOT shipped code)

User policy (2026-04-16): **XPHB content is included in research and
surface modeling with the same weight as SRD**, but NEVER checked into
this public git repo as code, Dhall, JSON, or content files. Clean-room
style: we design the surface to accommodate XPHB shapes so that when
XPHB content is eventually authored through its own lane (the
`.references/xphb-srd-pairing/phb-survey/` workspace + `provenance-check.sh`
gate), it does not force another round of widenings.

### Full XPHB Summon inventory (from 5etools data)

All concentration, hour-long, action-cast, and share the same family
structure: inline stat block parameterized by spell level + caster picks
a mode/subtype at cast time that branches specific stat-block fields.

| Spell | Level | Mode picker | Stat block |
|---|---|---|---|
| Summon Beast | 2 | Air / Land / Water (environment) | Bestial Spirit |
| Summon Fey | 3 | Fuming / Mirthful / Tricksy | Fey Spirit |
| Summon Undead | 3 | Ghostly / Putrid / Skeletal | Undead Spirit |
| Summon Aberration | 4 | Beholderkin / Slaadi / Star Spawn | Aberrant Spirit |
| Summon Construct | 4 | Clay / Metal / Stone | Construct Spirit |
| Summon Elemental | 4 | Air / Earth / Fire / Water | Elemental Spirit |
| Summon Celestial | 5 | Avenger / Defender | Celestial Spirit |
| Summon Dragon | 5 | (Resistance choice, no stat branch) | Draconic Spirit (**in SRD**) |
| Summon Fiend | 6 | Demon / Devil / Yugoloth | Fiendish Spirit |

The healing-allies 5th-level spirit the user remembered is
**Summon Celestial — Defender mode**: each turn, caster or spirit can
heal a creature within 30 ft by 2d6 + spell level. (The spell is
Cleric/Paladin, not Ranger — close enough in memory to ranger-tier
utility, but the actual class list doesn't include Ranger.)

### Modeling implications

All 9 XPHB Summon X spells share the **Pattern A** shape from §2:
- Level-parameterized inline stat block.
- Caster-chosen mode at cast time that indexes into branch tables.
- Stat-block fields formulaic in spell level: AC, HP, attack bonus = spell attack modifier, damage includes `+ spell level` or `+ 2 × spell level`.
- Control model identical across the family: shared initiative, obeys verbal commands (no action required), Dodge fallback, disappear on 0 HP / spell end.

This family is the dominant pressure case for §C4a (spawned-companion
payload). SRD-side (Summon Dragon, Find Steed, Find Familiar) is 3 units
pressuring the same pattern; XPHB adds 8 more, bringing total Pattern-A
pressure to 11+ units. **Designing C4a without modeling the XPHB family
would leave 8 future units forcing another widening — not acceptable
given user's "XPHB = SRD in importance" policy.**

### Additional XPHB units touching §C4 sub-problems

- **Conjure Animals / Minor Elementals / Woodland Beings / Elemental / Fey / Celestial** (L3–L7) — all non-summon emanations, §A15 cluster (same as SRD 5.2.1 which shares these rewrites).
- **Conjure Barrage** (L3), **Conjure Volley** (L5) — instantaneous AoE attack conjurations, NOT summons. Belong in activation family with area attack.

### Research vs code boundary

- **Research and surface design**: cite XPHB spells, analyze their shape, factor them into §C4 type grammar.
- **Authored content**: only SRD 5.2.1 Dhall/JSON files land in `packages/surface/content/`.
- **XPHB content**: authored under `.references/xphb-srd-pairing/phb-survey/workspace/content/` when that lane runs, gated by `provenance-check.sh`. That tree is git-ignored per repo policy.

### Ranger companion note

User mentioned Ranger spirit-heal. Two candidate interpretations:
1. **Summon Fey (L3, Ranger)** — Fuming/Mirthful/Tricksy modes; Mirthful has some supportive utility but not direct HP heal.
2. **Summon Celestial Defender (L5, Cleric/Paladin)** — explicit per-turn ally heal. Memory near-match but class-list doesn't include Ranger.

No Ranger-specific healing-spirit spell in XPHB core. **Healing Spirit**
(an older XGTE spell) was NOT ported into XPHB 2024. If it's something
the user wants in the corpus, flag as "XGE legacy inclusion" outside
XPHB — different provenance, same research-only / no-ship policy.

---

## 6. Coalescing with already-known widenings

- §A9 (damage-triggered repeat save) — Planar Binding reinforces the damage-breaks-Charm family.
- §A10 (permanent Duration) — True Polymorph's concentrate-full-hour → permanent; Clone's until-you-die; Planar Binding upcast 366d; Animate Dead's 24h-reassert loop is a distinct cadence.
- §A14 (relative-to-stat amount) — Alter Self's "Swim Speed = Speed"; Wild Shape's "temp HP = Druid level"; Summon Dragon's "AC 14 + spell's level".
- §A15 (per-turn-trigger ongoing-op) — all non-summon Conjure spells collapse into this cluster.
- §B (DM agenda) — Planar Ally; Change Appearance mode of Alter Self; Awaken's post-Charmed behavior.

---

## 7. Recommended next step

Scope confirmed 2026-04-16: **XPHB included in research + surface
modeling, excluded from code/content** (clean-room). Pattern-A pressure
cases: Find Familiar, Find Steed, Summon Dragon (SRD) + Summon
Beast/Fey/Undead/Aberration/Construct/Elemental/Celestial/Fiend (XPHB).
**11 units** pressuring the spawned-companion payload grammar alone.

Design path:

1. **C4a (spawned-companion payload)** first. It's the cleanest
   sub-problem, has the most pressure cases, and the stat-block grammar
   it produces is reused by C4b/c/d.
2. **C4d (target stat-block replacement)** second. Builds on C4a's
   stat-block grammar by adding a retained-field selector for Polymorph
   / Shapechange / True Polymorph / Wild Shape.
3. **C4b (catalog reanimation)** third. Overlaps with C4a for stat-block
   grammar but adds slot-tiered menu + refresh-control-window pattern.
4. **C4c (templated multi-spawn)** fourth. Covers Animate Objects'
   size-branch + count-by-spellcasting-mod.
5. **C4e/f/g/h** as they're forced.

**Park non-summon Conjure spells in §A15** — they're movable emanations,
not companions.

When user approves start, first deliverable: a design doc for **C4a**
keyed on the 11-unit pressure set, proposing the stat-block grammar
(retention / parameterization / caster-derived fields / mode branches)
that covers both the SRD and XPHB families without further widening.
