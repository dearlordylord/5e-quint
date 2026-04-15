# Counter-Example Hunt v0

## Purpose

Test the hypothesis: every mechanical rule in SRD 5.2.1 / XPHB 2024 can be
encoded as structured data interpreted by a closed atom vocabulary (per
`TAXONOMY_atoms_graph.md` v4 and `TAXONOMY_graph_representation.md` v1),
without content-author-supplied executable hooks or callbacks.

This file is a single-pass research artifact, not a new validation round.
It extends `FEAT_VALIDATION_matrix_v0.md`, `SPELL_VALIDATION_matrix_v0.md`,
`CLASS_FEATURE_VALIDATION_matrix_v0.md`, and the other source-root matrices
by adversarially probing rules explicitly *not* in the prior samples.

## Scope

- Corpus: SRD 5.2.1 (`.references/srd-5.2.1/`). XPHB 2024 material not in
  the SRD is out of this repo's modeling boundary per `ARCHITECTURE.md`.
- Several rules named in the hunt prompt turned out to be **not in SRD
  5.2.1** and are recorded below for completeness but do not factor into
  the hypothesis check:
  - *Battle Master Maneuvers* — Fighter SRD 5.2.1 ships with Champion only.
  - *Wild Magic Surge* — Sorcerer SRD 5.2.1 ships with Draconic only.
  - *Deck of Many Things*, *Staff of the Magi*, *Rod of Lordly Might* —
    not in the SRD 5.2.1 magic-item catalogs.
- Tests were applied to the remaining prompt candidates plus a small set
  of adversarial picks: Wild Shape, Metamagic, Contingency, Simulacrum,
  Wish, Symbol, Magic Jar, True Polymorph, Shapechange, Animate Objects,
  Sequester, Eldritch Invocations (Gift of the Protectors, Pact of the
  Blade, Investment of the Chain Master), Channel Divinity, Sorcery Point
  conversions, Wild Resurgence.

## 1. Summary

**Answer: no** — the hunt did not surface a counter-example. The
hypothesis survives.

Strongest finding: every candidate that *looked* like it needed
executable logic decomposed into one of two shapes:

- a DM-adjudicated open clause that `ARCHITECTURE.md` already classifies
  as caller-owned (Contingency's trigger, Wish's Reshape Reality, Geas's
  "coherent order", Symbol's password, Sequester's end condition,
  Modify Memory's narrative payload); or
- a vocabulary-widening or subgraph-addition pressure on top of the
  existing `v4` inventory, where the residue composes cleanly from
  typed data once the new atom or subgraph is admitted.

The single highest-evidence widening pressure is a **stat-block
projection** subgraph with typed field masks; it is forced by at least
six SRD rules spanning spells and class features. The second is an
**anchored-trigger predicate grammar** forced by at least five anchored
spells (Alarm, Glyph of Warding, Symbol, Contingency, Sequester).

## 2. Candidate Counter-Examples

None survived both tests. The following four were the only rules that
produced any doubt at all; each is resolved below as a near-miss, not a
counter-example.

## 3. Near-Misses

For each near-miss: SRD citation, why it looked dangerous, what
resolves it, classification.

### 3.1 Contingency

Citation: `srd-5.2.1/Spells/Descriptions-A-D.md:1089`
(Level 6 Abjuration, Wizard).

Text:
> "You describe that trigger when you cast the two spells. For example,
> a *Contingency* cast with *Water Breathing* might stipulate that
> *Water Breathing* comes into effect when you are engulfed in water or
> a similar liquid."

Why it looked dangerous: the trigger is player-authored free text at
cast time. Runtime has to answer "did the trigger fire?" against
arbitrary prose.

What resolves it: the mechanical layer never evaluates the prose. The
mechanical shell is a standard **Store / Release** subgraph (B) with
one `stored_spell` and a caller-signal release, structurally identical
to the Ready action's "the trigger happens" signal which
`ARCHITECTURE.md` already classifies as DM-owned:

> "Ready action triggers: The DM confirms when a trigger circumstance
> occurs ('the zombie steps next to me'). The spec models the
> action/reaction economy of readying and releasing; the trigger itself
> is DM agenda."

Every other Contingency fact is typed:

- `spell_root` → `activate`
- `consumes` → `spell_slot` (two — outer + contingent)
- `stores` → `stored_spell` with target-self invariant + level ≤ 5 +
  action-cast invariant
- `opens_window` → `duration_window` (10 days)
- `persists_until` → expiration OR `release` OR component-not-on-person
  OR recast
- on release: single-shot, consumes the `stored_spell`, ends
  Contingency

Classification: **DM-adjudicated open clause, out-of-core**. Identical
shape to Ready triggers. No executable-logic requirement.

Secondary pressure: the `release` trigger needs to name the release
itself as an injected caller event, which is already the shape used by
subgraph O (Conditional Payment After Resolution) — no new atom.

### 3.2 Symbol

Citation: `srd-5.2.1/Spells/Descriptions-S-Z.md:715` (Level 7
Abjuration).

Text:
> "You decide what triggers the glyph when you cast the spell. For
> glyphs inscribed on a surface, common triggers include touching or
> stepping on the glyph, removing another object covering it, or
> approaching within a certain distance of it. For glyphs inscribed
> within an object, common triggers include opening that object or
> seeing the glyph. You can refine the trigger so that only creatures
> of certain types activate it … You can also set conditions for
> creatures that don't trigger the glyph, such as those who say a
> certain password."

Why it looked dangerous: open-ended trigger with creature-type filter,
password exclusion, and a closed-ish list of anchor events. Looks like
an expression grammar.

What resolves it: the SRD text enumerates a closed family of physical
anchor events ({touch, step_on, uncover, approach_within_range,
open_container, see_glyph}) plus a typed creature-type filter (the
closed list of Creature Types is already part of the glossary) plus a
typed password filter adjudicated by DM/caller ("did the creature say
the password?" is a caller signal, same shape as Contingency).

The six effects (Death / Discord / Fear / Pain / Sleep / Stunning) are
each a typed `save_gate` with typed branches — each composes from
existing atoms (`save_gate`, `branches_on_save`, `apply_condition`,
`damage`).

Classification: **vocabulary-widening pressure** for an anchored-
trigger predicate grammar (see §4.2). The password clause specifically
is caller-adjudicated, same shape as Contingency's trigger.

### 3.3 Wish — "Reshape Reality" clause

Citation: `srd-5.2.1/Spells/Descriptions-S-Z.md:1357` (Level 9
Conjuration).

Text:
> "You may wish for something not included in any of the other effects.
> To do so, state your wish to the GM as precisely as possible. The GM
> has great latitude in ruling what occurs in such an instance …"

Explicitly GM-adjudicated by the rule itself. The task prompt already
carves this out.

All other Wish clauses are typed:

- duplicate any spell of level ≤ 8 → `cast_as(spell_id, slot=8,
  ignore_material_cost=true)`;
- Object Creation → typed parameters (value ≤ 25,000 gp, ≤ 300 ft,
  non-magical);
- Instant Health → `heal_to_full + end_conditions_from(Greater
  Restoration)` on up to 20 targets;
- Resistance → `grant_resistance(type, permanent=true)` up to 10
  creatures;
- Spell Immunity → typed `grant_immunity(spell_id, 8h)`;
- Sudden Learning → `replace_feat(old, new)` with typed prerequisite
  check;
- Roll Redo → forced reroll of a recent d20 with adv/dis/neither — sits
  on `post_roll_window` with a last-round reach.

Stress rider (Necrotic-per-cast until long rest; STR = 3 for 2d4 days;
33% chance to lose access) composes from existing atoms (`damage`,
`modify_ability_score`, `grant_restriction`, once-per-event).

Classification: **DM-adjudicated open clause on one option; other
options are vocabulary widening**. `modify_ability_score` as a runtime
effect is already a known deferred residue in `v4` §12, reaffirmed
here. `Roll Redo` reaffirms `post_roll_window` with a one-round reach,
which is structurally the same as Dark One's Own Luck (Warlock/Fiend)
and Lucky (feat) — no new atom forced.

### 3.4 Wild Shape and Shape-Shift Family

Citations:
- Druid Wild Shape: `srd-5.2.1/Classes/Druid.md:95`.
- Polymorph: `srd-5.2.1/Spells/Descriptions-M-P.md:658`.
- True Polymorph: `srd-5.2.1/Spells/Descriptions-S-Z.md:965`.
- Shapechange: `srd-5.2.1/Spells/Descriptions-S-Z.md:179`.
- Magic Jar: `srd-5.2.1/Spells/Descriptions-M-P.md:60`.
- Simulacrum: `srd-5.2.1/Spells/Descriptions-S-Z.md:318`.

Why they looked dangerous: each rule swaps a creature's stat block for
another, with an idiosyncratic merge spec. Wild Shape's merge:

> "Your game statistics are replaced by the Beast's stat block, but
> you retain your creature type; Hit Points; Hit Point Dice;
> Intelligence, Wisdom, and Charisma scores; class features;
> languages; and feats. You also retain your skill and saving throw
> proficiencies and use your Proficiency Bonus for them, in addition
> to gaining the proficiencies of the creature. If a skill or saving
> throw modifier in the Beast's stat block is higher than yours, use
> the one in the stat block."

Different rules in the family retain different field sets:

| Rule | Retain-from-self | Replace-with-form | Take-higher |
|---|---|---|---|
| Wild Shape | type, HP, HD, INT, WIS, CHA, class features, languages, feats, prof bonus, skill/save proficiencies | everything else (STR, DEX, CON, speeds, natural AC, attacks, senses, traits) | skill/save modifiers |
| Polymorph | alignment, personality, HP (kept at max of new form + temp on orig) | whole stat block otherwise | — |
| True Polymorph (creature → creature) | HP, HD, alignment, personality | whole stat block | — |
| Shapechange | creature type, alignment, personality, INT/WIS/CHA, HP, HD, proficiencies, Spellcasting | whole stat block | — |
| Magic Jar | game statistics of self (class, skills, etc.) | HP, HD, STR, DEX, CON, speed, senses | — |
| Simulacrum | n/a — clone with patches | — | — |

What resolves it: this is a **deterministic field-level merge** between
two typed stat blocks with per-rule masks for (retain / replace /
take-higher). The existing atom set has `create_companion` and
`command_companion` but no self-transform atom, and no declarative
field-merge spec.

Classification: **vocabulary-widening pressure — the strongest in this
hunt** (see §4.1). Six independent SRD rules force the same shape.

No executable logic required: once the merge spec is typed as three
field-lists plus a fixed conflict rule (replace, retain, or take-
higher), evaluation is a pure projection.

### 3.5 Metamagic

Citation: `srd-5.2.1/Classes/Sorcerer.md:111` and option list at
line 145.

Why it looked dangerous: each option mutates parameters of an arbitrary
other spell cast in the same turn.

What resolves it: each option is a typed cross-rule rewrite on a
**named target family** of spell parameters. Mapping the ten options
against the `v4` effect atoms:

| Option | Existing atom? | Pressure |
|---|---|---|
| Careful Spell | `modify_roll_substitute` over `save_gate` for chosen targets | already expressible as auto-succeed save |
| Distant Spell | `modify_range` | already exists |
| Empowered Spell | `modify_roll_reroll` | already exists |
| Extended Spell | — | new: `modify_duration` on `duration_window` |
| Heightened Spell | `modify_roll_advantage` on `save_gate` | already expressible |
| Quickened Spell | — | new: `modify_casting_time` (action → bonus_action), with leveled-spell-per-turn gate |
| Seeking Spell | `modify_roll_reroll` on `attack_roll` | already exists |
| Subtle Spell | — | new: component-suppression on cast (V/S/M gates) |
| Transmuted Spell | — | new: `modify_damage_type` restricted to closed set {Acid, Cold, Fire, Lightning, Poison, Thunder} |
| Twinned Spell | — | new: `modify_slot_level_delta` (+1) on a cast, reusing existing slot-scaling pipeline |

Each new operation is a typed rewrite over an existing pipeline, not
author-supplied code. None requires evaluation beyond a typed field
update.

Classification: **vocabulary-widening pressure** concentrated under a
single umbrella: `modify_spell_cast_parameter` with a closed
operation vocabulary (see §4.3).

### 3.6 Simulacrum

Citation: `srd-5.2.1/Spells/Descriptions-S-Z.md:318`.

Text:
> "It uses the game statistics of the original creature at the time of
> casting, except it is a Construct, its Hit Point maximum is half as
> much, and it can't cast this spell."

Why it looked dangerous: produces a runtime clone with idiosyncratic
patches. And "can't cast this spell" is a rule that names *itself*.

What resolves it: typed clone with a closed patch vocabulary:

- `set_type(Construct)`;
- `set_hp_max(half_of_source)`;
- `deny_ability(cast_spell, spell_id = self)`.

Each patch is a typed operation. The self-reference is a literal
reference to the root unit's own id, not arbitrary code.

Classification: **vocabulary-widening pressure** for a stat-block
patch atom. Composes with §4.1.

### 3.7 Animate Objects

Citation: `srd-5.2.1/Spells/Descriptions-A-D.md:153`.

Inline stat block in the spell text, including **caster-derived
fields**: Slam attack bonus = your spell attack modifier; damage adds
your spellcasting ability modifier at Large/Huge; Proficiency Bonus =
yours; understands languages you know.

Why it looked dangerous: caster-derived fields on a summoned
creature's stat block.

What resolves it: these are already handled by existing modifier-field
projection: Combatant fields like `spell_attack_mod` and `pb` thread
into spawned-creature templates the same way they thread into `Aura of
Protection` for allies. The subgraph is Persistent Proxy (D) plus a
typed "inherit-from-caster" projection on a fixed field list, which
the generator pattern in `ARCHITECTURE.md` §"Future: Generator Pattern"
already anticipates.

Classification: **subgraph-addition pressure, mild**. Composes under
Persistent Proxy + a typed caster-projection list.

### 3.8 Gift of the Protectors (Warlock, Pact of the Tome)

Citation: `srd-5.2.1/Classes/Warlock.md:203`.

Text:
> "When any creature whose name is on the page is reduced to 0 Hit
> Points but not killed outright, the creature magically drops to 1
> Hit Point instead. Once this magic is triggered, no creature can
> benefit from it until you finish a Long Rest."

Why it looked dangerous: arbitrary HP intercept with a peer-list and
an "outright-killed" carve-out.

What resolves it: this is a typed HP event intercept — same shape as
Death Ward (SRD 5.2.1 spell) and Relentless Endurance-like
species abilities (outside SRD but same pattern). It is a new atom
`intercept_hp_event` that takes (condition, substitution) — where
`condition = drop_below_1_not_killed_outright` and `substitution =
set_hp(1)`. The peer-list is a caller-scoped list of creature ids;
"once per long rest" is existing `use_count` + `reset=long_rest`.

Classification: **vocabulary-widening pressure** — new atom
`intercept_hp_event` (see §4.4).

### 3.9 Channel Divinity / Monk's Focus / Cunning Strike / Sorcery Points

Citations:
- Cleric Channel Divinity: `Classes/Cleric.md:88`.
- Monk's Focus is in `CLASS_FEATURE_VALIDATION_matrix_v0.md` Group A.
- Cunning Strike ditto.
- Font of Magic: `Classes/Sorcerer.md:87`.

Why it looked dangerous: each is a pool with an open-looking option
list.

What resolves it: subgraph M (Pool With Options Menu) already names
the pattern. Each option is a typed activation subgraph; the
**option list is closed per class**. Channel Divinity's menu is
{Divine Spark, Turn Undead} plus subclass-gated additions — all
enumerable.

Font of Magic's typed conversions (slot↔sorcery point with the
Creating Spell Slots table) reinforce a secondary pressure: a typed
`convert_resource` atom with a source resource, sink resource, and
exchange-rate table. Not yet in `v4`.

Classification: **vocabulary-widening pressure** for
`convert_resource` (see §4.5). No new subgraph beyond M.

### 3.10 Sequester

Citation: `srd-5.2.1/Spells/Descriptions-S-Z.md:162`.

Text:
> "You can set a condition for the spell to end early. The condition
> can be anything you choose, but it must occur or be visible within
> 1 mile of the target."

Why it looked dangerous: arbitrary end condition.

What resolves it: identical shape to Contingency trigger and Symbol
password — caller-adjudicated trigger signal. Plus a damage-taken
trigger ("this spell also ends if the target takes any damage") that
is a standard typed `cleanup: on_damage` boundary.

Classification: **DM-adjudicated on the open clause, vocabulary-
widening on the damage-triggered cleanup** (which the existing
`cleanup` envelope candidate in `CANDIDATE_closed_extension_surface_v1.md`
already anticipates).

## 4. Vocabulary-Widening Pressure — ranked by evidence strength

This is the highest-value artifact of this hunt.

### 4.1 Stat-Block Projection Subgraph *(highest pressure)*

Independent SRD data points: Wild Shape (Druid), Polymorph,
True Polymorph (creature→creature and object→creature),
Shapechange, Magic Jar, Simulacrum. Six SRD rules; seven distinct
merge specs.

Proposed shape:

- new atom `replace_stat_block(source_stat_block, retain_mask,
  replace_mask, take_higher_mask)`;
- or equivalently, a subgraph "Stat Block Projection" composed of an
  `attaches_to: self | target` node, a `project_from: stat_block`
  edge, and three typed field-list nodes.

Per-rule fields are static; no executable merge policy needed. A
single fixed conflict-resolution rule (replace unless listed in
retain; take-higher only if both lists say so) covers every observed
case.

This is the strongest single piece of evidence in the hunt that the
`v4` atom set is **incomplete but closable**: one new subgraph would
retire six adversarial rules at once.

### 4.2 Anchored-Trigger Predicate Grammar

Independent SRD data points: Alarm, Glyph of Warding, Symbol,
Contingency, Sequester. Five rules.

The `CANDIDATE_closed_extension_surface_v1.md` payload family
`anchored_trigger` already anticipates this shape but has not been
promoted into the atom graph.

Proposed grammar (closed):

- anchor kinds: `point`, `line`, `surface`, `object`, `container`,
  `creature`;
- trigger events: {physical_contact, step_on, uncover, open,
  approach_within(range), see, time_elapsed, named_event,
  damage_taken};
- filter predicates: creature-type allow-list, creature-type deny-
  list, **caller-adjudicated** string token (password / Contingency
  trigger / Sequester condition / Geas order) — explicitly caller-
  owned;
- release payload: typed effect, typically a saved payload from
  `stores`.

No executable logic; only a closed grammar plus caller signals for
string tokens. Resolves Contingency, Sequester, Symbol's password
clause, Glyph of Warding, Alarm under one structure.

### 4.3 Cross-Spell Parameter Rewrite Operations

Independent data points: Metamagic's ten options (one rule, but ten
distinct operations), Eldritch Spear, Eldritch Smite, Eldritch Mind,
Investment of the Chain Master, Dragon Companion (Draconic subclass).

Promotes to `v4` as five new atoms or one umbrella:

- `modify_duration`
- `modify_casting_time`
- `modify_damage_type` (restricted to closed damage-type set of the
  rule)
- `modify_slot_level_delta`
- `modify_save_auto_success` (careful spell carve-out)
- and a retention of `modify_range`, `modify_roll_numeric`,
  `modify_roll_reroll`, `modify_roll_advantage`,
  `modify_roll_substitute`.

These all fit subgraph H (Cross-Rule Composition) / N (Cross-Rule
Rewrite) without creating a new subgraph.

### 4.4 HP-Event Intercept

Independent SRD data points: Gift of the Protectors (Warlock/Pact of
Tome), Death Ward, Relentless Rage (Barbarian) — the last already
flagged in `CLASS_FEATURE_VALIDATION_matrix_v0.md` as a 0-HP reversal.

Proposed atom `intercept_hp_event(condition, substitution)` where
condition ∈ {drop_below_1, drop_to_0_not_killed_outright,
drop_to_0_from_damage, would_die} and substitution ∈ {set_hp(n),
stabilize, apply_condition(downed), cancel_damage}.

Composes cleanly with `use_count` and existing reset cadences.

### 4.5 Resource Conversion Table

Independent data points: Font of Magic (slot ↔ sorcery point),
Wild Resurgence (slot ↔ wild shape use, both directions), Archdruid
Nature Magician (wild shape uses → single-slot lump), Magical Cunning
(pact slot recovery), Sorcerous Restoration.

Proposed atom `convert_resource(source_kind, source_cost, sink_kind,
sink_amount)` with an optional per-rule exchange-rate table (Creating
Spell Slots table for Font of Magic).

Currently `v4` models these as ad-hoc `refund` + `consumes`, which
hides the structural similarity. A typed `convert_resource` retires
the pattern.

### 4.6 Caster-Field Projection Onto Spawned Stat Blocks

Independent data points: Animate Objects, Conjure X spells, Summon X
spells (non-SRD but same shape), Spiritual Weapon, Find Familiar
(with Warlock Investment).

Already handled partly by existing modifier-field pipeline. Remaining
pressure: a typed "inherit from caster" field list on Persistent
Proxy subgraph (D), so stat blocks can declare which fields they
pull from the caster (spell attack mod, spell save DC, PB, ability
mods) rather than hard-coding.

## 5. Architectural Implications

Since no counter-example surfaced, the implication is for
**Phase 1 of `PLAN_closed_extension_surface_implementation.md`**, not
for an executable-hook surface.

### 5.1 No executable-author surface is justified by this hunt

Every rule that appeared to need arbitrary code falls into one of two
buckets already covered by architecture:

- **Caller-adjudicated open clause** — DM/session owns the "did the
  trigger fire" / "did the password match" / "is the wish coherent"
  decision. The core receives a typed signal. Matches the Ready-
  trigger pattern already documented in `ARCHITECTURE.md`.
- **Closed vocabulary that v4 hasn't typed yet** — each surfaced as
  vocabulary-widening pressure above. Evaluation is a deterministic
  projection once the vocabulary is admitted.

The hypothesis therefore holds: the content author ships typed data +
caller-signal declarations; the runtime ships a closed interpreter.

### 5.2 Recommended additions to Phase 1

Ordered by evidence strength:

1. **Stat-Block Projection** (§4.1) — single subgraph with three
   typed field masks. Retires Wild Shape, Polymorph, True Polymorph,
   Shapechange, Magic Jar, Simulacrum.
2. **Anchored-Trigger Predicate Grammar** (§4.2) — closed anchor /
   event / filter vocabulary, with the caller-signal string-token
   sink made explicit. Retires Contingency, Symbol, Glyph of Warding,
   Alarm, Sequester.
3. **Cross-Spell Parameter Rewrite** (§4.3) — five new
   `modify_<parameter>` atoms. Retires Metamagic plus several
   Invocations.
4. **HP-Event Intercept** (§4.4) — one new atom, retires Gift of the
   Protectors, Death Ward, Relentless Rage's 0-HP reversal.
5. **Resource Conversion Table** (§4.5) — one new atom, retires Font
   of Magic, Wild Resurgence, Archdruid, Sorcerous Restoration.
6. **Caster-Field Projection** (§4.6) — subgraph extension, retires
   Animate Objects and several Conjure/Summon shapes.

### 5.3 What to *not* add

- No generic scripting atom. No open rewrite language. No arbitrary
  field mutation. The hunt confirms `v1` of the candidate closed
  extension surface was right to exclude these.
- No new top-level family. All widenings fit under the existing node
  families (procedure, window, effect, scaling, resource) plus one
  new subgraph (Stat-Block Projection) and one new envelope
  (anchored-trigger grammar).
- No DM-decision encoding inside the core. Open clauses remain
  caller-signaled.

### 5.4 Residual risk

Three classes of rules were *not* probed in this hunt because they
are outside SRD 5.2.1:

- Battle Master Maneuvers (XPHB 2024 Fighter subclass) — structurally
  a typed Pool-With-Options-Menu over superiority dice riders; same
  shape as Cunning Strike.
- Wild Magic Surge / Deck of Many Things (XPHB/DMG) — large closed
  dispatch tables of heterogeneous typed effects. Vocabulary-
  widening only; each entry decomposes into existing atoms. The task
  prompt classifies this as vocabulary-widening, not a counter-
  example, and the structural intuition held for every similar case
  in scope.
- Simulacrum's "personality and memories" narrative clauses — same
  DM-adjudication seam as Modify Memory.

If and when the repo extends its corpus beyond SRD 5.2.1, these
should be re-probed, but the structural prediction is: more
vocabulary widening, no counter-example.

## 6. Method Notes

- Source-of-truth: `.references/srd-5.2.1/` only. Files read: the
  twelve `Classes/*.md`, the five `Spells/Descriptions-*.md`, and
  spot checks into `Magic-Items/`.
- For each candidate: quoted the SRD passage, attempted a `v4` atom-
  graph encoding, recorded residue.
- No MBT or Quint runs were performed. No files outside this one
  were modified. `INDEX.md` was not updated.
