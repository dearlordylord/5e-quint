# Content Surface — Deferred Items

Tracking surface widenings, authoring gaps, and modeling questions that
are intentionally deferred. Each entry names the unit(s) that motivate
it, what's blocking it, and the next step.

Source of truth for things that would otherwise rot in `.dhall` file
comments. Updated as the survey loop lands / surfaces items.

Scope: this file tracks items that came up from authored content in
`packages/prototype-content-surface/content/*.dhall`. It does **not**
supersede the sub-agent survey corpus at
`scripts/content-surface-survey/results-srd/<slug>/proposal.md` —
those proposals are the broader queue and feed into this file as they
get evaluated.

---

## A. Deferred widenings (motivated by authored units)

### Pending partial completions (queued behind §A1 + §A13)

These units author partial today; the rider omitted in each case lands
when the named widening lands:

- **pass_without_trace** — entire mechanical effect (+10 Dex Stealth)
  blocked on §A1. Lands 100% when skill-scoped filter ships.
- **guidance** — entire mechanical effect (+1d4 chosen ability check)
  blocked on §A1. Lands 100% when skill-scoped filter ships.
- **vicious_mockery** — currently partial (core damage authored); the
  disadvantage-on-next-attack rider lands when §A13
  (`modify_roll_advantage.count + expiresOn`) ships.

### A1. Skill filter + count on roll modifiers — RESOLVED 2026-04-16

Landed:
- Closed `Skill` enum (18 SRD skills).
- `SkillFilter` union: `{ kind: "fixed", skills: Skill[] }` | `{ kind: "choice", options: Skill[] }` (parallel to DamageTypeRef.choice).
- Optional `skillFilter?: SkillFilter` on `modify_roll_numeric`, `modify_roll_advantage`, and `RollModifierOperation`.
- Optional `count?: number` on `modify_roll_numeric` (Guidance doesn't need it per SRD 5.2.1; kept for future one-shot ability-check riders).

Validation refs: `content/pass_without_trace.dhall` (fixed=[stealth]),
`content/guidance.dhall` (choice from all 18 skills).

Not addressed in this tick (still separate concerns):
- "OngoingOperation → array" for multi-rider spells — still handled per-unit via composite EffectAtom or per-family activation+direct shape.
- Condition-scoped save advantage ("Advantage on Con saves against Poisoned") — Protection from Poison remains partial; a single unit pressure is insufficient.

### A1-historical. OngoingOperation → array, with skill-scoped roll-advantage

**Motivating unit:** Hunter's Mark — "You also have Advantage on any
Wisdom (Perception or Survival) check you make to find it."

**Blockers:**
- `OngoingEffectMechanics.operation` is a single value, not an array;
  Hunter's Mark already has `damage_on_hit` as its primary operation,
  and the skill-check rider would be a second.
- `RollKind` has `ability_check` but no skill filter. A skill-scoped
  advantage rider needs either a widened RollKind or an optional
  `skillFilter` on `modify_roll_advantage`.

**Next step:** wait for a second unit that forces the same shape
(ability-check roll-advantage tied to a target) before committing.
Two widenings for one rider is too costly for a single tick.

### A2. Phase-count slot scaling on ActivationMechanics

**Motivating unit:** Scorching Ray — "one additional ray for each
spell slot level above 2".

**Blockers:** `ActivationMechanics.phases` is a fixed `ReadonlyArray`;
no shape for "repeat this phase N times where N scales with slot."

**Next step:** add a `phaseScaling?: SlotScaling<number>` field to
ActivationMechanics that marks a phase (by index or tag) as replicated
per extra slot. Design tick worth its own slot when a second unit
shows up — none in the authored corpus yet.

### A3. Save-gated ongoing effect — RESOLVED 2026-04-16

**Motivating units:** Bane, Faerie Fire.

**Resolution:** No new surface type needed. The natural composition
`family: "activation"` + `save_gate` phase + atom that can persist
(e.g., `modify_roll_numeric`, `modify_roll_advantage`) +
`Duration.concentration` already expresses save-gated ongoing: the
onFail atom's effect persists for the surrounding spell's
concentration window. Bane and Faerie Fire both author cleanly this
way. Sub-agent's Option A (new `ongoing_modifier` variant) and
Option B (`saveGateOnCast?` field) are both unnecessary — they
would have been redundant with the existing shape composition.

Validation references: `content/bane.dhall`, `content/faerie_fire.dhall`.

### A4. Barkskin-style AC floor (modify_ac_set_floor) — RESOLVED 2026-04-16

Added `modify_ac_set_floor { const: number }` as a second variant of
`ModifyAcOngoingOperation`. `content/barkskin.dhall` is the
validation reference.

### A5. Creature-type filter extensions (charm/frighten immunity,
save-advantage-by-attacker-type)

**Motivating unit:** Protection from Evil and Good — "The target also
can't be possessed by or gain the Charmed or Frightened conditions
from them. If the target is already possessed, Charmed, or Frightened
by such a creature, the target has Advantage on any new saving throw
against the relevant effect."

**Blockers:** `grant_condition_immunity` exists as an EffectAtom, but
has no `attackerTypeFilter` (the immunity is scoped by the creature
type causing the condition, not universal). The "Advantage on saves
against already-applied X by type Y" is a conditional re-roll rider
with no current shape.

**Next step:** when a second SRD unit forces conditional-by-type
immunity (e.g., Protection from Poison's poison-specific immunity is
not type-scoped so doesn't pair; check if Holy Aura or Mind Blank do),
coalesce into one widening.

### A6. DurationEndTrigger: additional trigger variants

**Motivating units:** various spells with state-change or event-based
early termination.

**Closed today:** `target_makes_attack_roll`, `target_deals_damage`,
`target_casts_spell`, `target_dons_armor`, `target_damaged_by_caster_or_ally`.

**Next potential additions (wait until motivated):**
- `target_leaves_area` — Spirit Guardians, Silence leaving radius.
- `ally_attacks_target` — Sanctuary equivalent.
- Cascade from upcoming Sleep authoring (damage-wakes-sleeper shape).

### A8. Unbounded target selection — RESOLVED 2026-04-16

Landed as `TargetSelection.mode = "any_number"` (no count field,
optional typeFilter). Validation reference: `content/compulsion.dhall`.
Beacon of Hope and Divine Word remain blocked on other widenings
(maximize-healing atom for Beacon of Hope; HP-threshold routing for
Divine Word) but the target-selection shape is in place.

### A9. Damage-triggered repeat save (on-damage cadence)

**Motivating units:** Dominate Beast, Dominate Person, Dominate Monster
(same cadence across the family).

**Blocker:** `RepeatSaveSpec.cadence = "end_of_target_turn"` strictly
over-generates saves vs. RAW. Dominate family's RAW: "each time you or a
creature friendly to you damages the target, it can make the save". No
current cadence variant matches damage-event-triggered.

**Proposed shape:**
```ts
type RepeatSaveSpec = {
  cadence: "end_of_target_turn" | "on_target_damage_taken";
  onSuccess: "ends_on_target";
};
```

**Next step:** coalesce with Dominate Person / Dominate Monster when
authored; 3-unit family.

### A10. Permanent / until-dispelled Duration

**Motivating units:** Sequester; Geas L9 slot (currently authored as
365 days — known partial); likely Magic Jar, Magnificent Mansion, and
other "Until Dispelled" RAW entries.

**Proposed shape:**
```ts
type Duration =
  | ...existing...
  | { kind: "permanent"; endsOn?: ReadonlyArray<"dispel" | "damage"> };
```

**Next step:** land when Sequester is authored. Would retroactively
correct Geas L9.

### A11. ActivatedAbilityMechanics duration (class-feature condition
scoping)

**Motivating unit:** Ranger Nature's Veil L14 ("Invisible until end of
next turn" with no parent duration).

**Blocker:** `ActivatedAbilityMechanics` has no duration field; a
condition applied via an activated ability has no way to expire. The
attack_roll / spell path uses `Duration.timed` to bound turn-scoped
riders, but class features can't borrow that mechanism.

**Proposed shape:** add an optional `duration?: Duration` to
`ActivatedAbilityMechanics` (mirrors spell's `SpellMechanicsHeader.duration`).

**Next step:** defer. Second class-feature-condition unit will coalesce.

### A13. `EffectAtom.modify_roll_advantage` count + expiresOn fields — RESOLVED 2026-04-16

Landed: optional `count?: number` + `expiresOn?: RiderExpiry` on the
`modify_roll_advantage` EffectAtom variant. Unifies with mastery-side
`ModifyRollAdvantageRider`. Validation reference:
`content/vicious_mockery.dhall` (full auth: count=1 + expiresOn=end_of_next_turn
in composite onFail).

### A13-historical. `EffectAtom.modify_roll_advantage` count + expiresOn fields

**Motivating unit:** Vicious Mockery ("Disadvantage on the next attack
roll it makes before the end of its next turn"). Likely Hunter's Mark
skill-check rider, Compelled Duel and similar next-action riders.

**Blocker:** `EffectAtom.modify_roll_advantage` has `mode` + `on` +
optional `attackerTypeFilter`, but no one-shot-count and no expiry.
Authoring without those over-applies the effect (all attacks through
the spell's duration, not just the next one).

**Proposed shape — unify with mastery side:**
```ts
type ModifyRollAdvantageAtom = {
  kind: "modify_roll_advantage";
  mode: "advantage" | "disadvantage";
  on: ReadonlyArray<RollKind>;
  attackerTypeFilter?: ReadonlyArray<CreatureType>;
  count?: number;            // "next N rolls only" — unifies with mastery
  expiresOn?: RiderExpiry;   // "before end of its next turn" — unifies with mastery
};
```

Mastery-side `ModifyRollAdvantageRider` already has both fields; this
widening collapses the duplicate shape.

**Next step:** land when the next "one-shot disadvantage rider" unit
surfaces, OR coalesce with §A1 (since both unlock Vicious Mockery +
pass_without_trace + guidance when paired with skill-narrowing). 3+
units pressure; worth landing soon.

### A15. Per-turn-trigger ongoing operation — RESOLVED 2026-04-16

Landed: unified trigger-predicate-effect grammar on `OngoingOperation`.
All 7 existing ongoing_effect content files rewritten to the new shape
(bless, pass_without_trace, guidance, divine_favor, hunters_mark,
barkskin, mage_armor — all clean). Tracer refactored to emit
trigger-specific window atoms (on_caster_attack_hit → on_hit_window;
on_attached_turn_start → turn_start_window; etc.). 107-file regression
passes.

Shape:
```ts
type OngoingOperation = { trigger; predicate?; effect };
type OngoingTrigger =
  | { kind: "passive" }
  | { kind: "on_caster_attack_hit" }
  | { kind: "on_attached_turn_start" }
  | { kind: "on_caster_turn_start" }
  | { kind: "on_attached_damaged" }      // absorbs §A9
  | { kind: "on_creature_moves"; perFeet? }
  | { kind: "on_creature_enters_area" };
type OngoingEffect =
  | EffectAtom
  | { kind: "save_gate"; ... }           // §A9
  | { kind: "modify_ac_set_base"; ... }
  | { kind: "modify_ac_set_floor"; ... };
```

§A9 (damage-triggered repeat save) is subsumed — absorbed as `trigger:
"on_attached_damaged"` + `effect: { kind: "save_gate", ... }`.

Unlocks authoring for pending partials: Heroism (per-turn temp-HP),
Aura of Life (conditional turn-start heal), Spirit Guardians, Web,
Spike Growth, Cloudkill, Moonbeam, Beacon of Hope, Dominate family.
All will be authored in next pass as validation refs.


**Motivating units:** Heroism ("gains Temp HP equal to your
spellcasting ability modifier at the start of each of its turns"),
Aura of Life ("If an ally with 0 HP starts its turn in the aura, that
ally regains 1 HP"), Beacon of Hope (queued per A7 — maximize healing
received per each heal event, analogous shape). Likely Spirit
Guardians, Cloudkill, Moonbeam (area + start-of-turn damage), Web
(start-of-turn save to escape).

**Blocker:** `OngoingOperation` handles passive static modifiers
(`roll_modifier`, `damage_on_hit`, `modify_ac_*`) but not recurring
per-turn events. The pattern that's missing: "at the start of each
target's turn (or caster's turn), evaluate predicate, fire effect".

**Proposed shape (sketch):**
```ts
type PerTurnTriggerOp = {
  kind: "per_turn_start";
  on: "target_turn_start" | "caster_turn_start";
  predicate?:
    | { kind: "at_hp_threshold"; threshold: number }
    | { kind: "in_area" };
  effect: EffectAtom;
};
```

**Next step:** land when a 4th unit surfaces. 3+ queued cases
(Heroism, Aura of Life, Beacon of Hope); Spirit Guardians / Moonbeam
likely. Design tick worth coordinating with A2 (phase-count slot
scaling) and C2 (Sleep's delayed-repeat-save) if all three share a
cadence grammar.

### A16. Damage-type immunity / block_max_hp_reduction

**Motivating units:** Mind Blank (Psychic immunity; explicit
block_max_hp_reduction clause), Aura of Life ("HP maximums can't be
reduced" — same clause), likely Holy Aura and monster stat blocks
when those land.

**Blockers:**
- `grant_resistance` halves damage; no atom for full immunity (zero).
- `modify_max_hp` is an additive delta; no atom for "prevent max-HP
  reductions from applying".

**Proposed shapes:**
```ts
| { kind: "grant_damage_immunity"; damageType: DamageTypeRef }
| { kind: "block_max_hp_reduction" };
```

**Next step:** defer. 2+ units pressure both atoms; coalesce with a
third (Holy Aura or first monster trait batch).

### A14. Relative-to-stat DiceAmount / SpeedValue ("linked amount")

**Motivating units:** Spider Climb ("Climb Speed equal to its Speed"),
Harm ("HP maximum reduced by an amount equal to the Necrotic damage
it took"), likely Vampiric Touch (heal-caster-by-damage-dealt),
possibly Enervation family.

**Blockers:**
- `EffectAtom.grant_speed.feet` is a fixed number — no "equal to walk
  speed" variant.
- `DiceAmount` has no variant for "amount equal to another atom's
  resolved output in the same phase".

**Proposed shape — one `LinkedAmount` grammar covering both:**
```ts
type LinkedAmount =
  | { kind: "equal_to_walk_speed" }
  | { kind: "equal_to_damage_taken" }       // Harm
  | { kind: "equal_to_damage_dealt" };      // Vampiric Touch candidate
```
Applied where: `grant_speed.value`, `modify_max_hp.delta.kind`,
`heal_hp.amount.kind` (as extended `DiceAmount` alternatives).

**Next step:** defer. Design tick when a second relative-amount unit
surfaces (likely Vampiric Touch when authored).

### A12. UseCountCap.ability_modifier

**Motivating unit:** Ranger Nature's Veil L14 (Wis-mod uses, minimum 1).
Also Bardic Inspiration, several other class features.

**Proposed shape:**
```ts
type UseCountCap =
  | ...existing...
  | { kind: "ability_modifier"; ability: Ability; minimum: number };
```

**Next step:** high-value cross-cutting widening. Land when a second
ability-mod-scaled feature surfaces in a digest.

### A7. Landed this digest (2026-04-16)

Already in the surface; listed here for cross-reference from future
deferrals:

- `EffectAtom.apply_condition.condition` and `remove_condition.condition` accept a **three-shape union**: bare `Condition` (unconditional), `ReadonlyArray<Condition>` (ALL applied/removed together — Heal), or `{ kind: "choose", from: [...] }` (caster picks one — Blindness/Deafness apply side, Lesser Restoration remove side).
- `EffectAtom.modify_max_hp { delta: DiceAmount }` — Aid-style max-HP-plus-heal.
- `EffectAtom.composite { effects }` — bundle multiple atoms in a single slot (Hypnotic Pattern, Protection from Poison, Stoneskin). Avoids array-widening every consumer site (save_gate.onFail, direct phase, etc.).
- `EffectAtom.set_speed { feet }` — absolute speed set (Hypnotic Pattern's "Speed of 0"), distinct from modify_speed (additive delta).
- `TargetSelection.choose_up_to.count: number | SlotScaling<number>` — fixed-count (Aid) vs slot-scaled (Bless).
- `DurationEndTrigger.target_takes_damage` — damage from any source (Hypnotic Pattern).
- `TargetSelection.mode = "any_number"` — unbounded open selection (Compulsion; ≥3 units pressure with Beacon of Hope and Divine Word).

---

## B. Consciously deferred mechanics (DM / session agenda)

Per ARCHITECTURE.md §1, spatial relationships, DM rulings, and
session-owned information flow are not modeled in the content surface.
The following RAW clauses are intentionally omitted from the spec side:

- **Alarm** — cast-time choice between door/window location and a cube
  area. *Story-dependent, low value to model deeper; see user guidance
  2026-04-16.* AnchorTarget already supports both variants; deferring
  the "pick at cast time" UX shape.
- **Fly** — "target falls if still aloft" on spell end.
- **Detect Magic** — "Magic action to see a faint aura" follow-up and
  "blocked by 1 ft of stone / thin lead" barrier permeability.
- **Chain Lightning** — "each target within 30 ft of the first target"
  (spatial predicate resolved by session).
- **Charm Person / Charm Monster** — "Advantage on the save if you or
  your allies are fighting it" ("fighting" predicate is situational).
- **Command** — behavioral commands (Approach / Drop / Flee / Halt)
  are session-owned; only Grovel → Prone maps to an atom.
- **Comprehend Languages** — language comprehension is session-owned
  translation, not a content-surface atom.
- **Counterspell** — the "see a creature casting" trigger is a
  perception predicate (DM agenda); see A7 for the non-DM parts.
- **Feather Fall** — fall speed is spatial; "no fall damage" is a
  session-layer damage mitigation trigger.
- **Identify** — information-disclosure effect (session reveals item
  facts); authored as a pure validation reference for material cost
  metadata.
- **Sleep** — "shake it out of the spell's effect" by an ally within
  5 ft is DM agenda (proximity + action-to-wake).
- **Starry Wisp** — Dim Light emanation + "can't benefit from
  Invisible" are visibility predicates (DM agenda).
- **Tongues** — speak/understand any language is session-owned
  translation. Same class as Comprehend Languages.
- **Find the Path** — navigation / route knowledge is session-owned.
  "Fastest route" is a DM/map-layer mechanic; no deterministic
  encoding.
- **Locate Object** — object-location sense is spatial/session-owned.
  Lead-barrier predicate and "within 1,000 ft" range are spatial
  predicates; same class as Detect Magic's barrier clause.
- **Jump** — "jump distance tripled" is a movement-conversion
  mechanic (5e: 10 ft of movement = high jump = Str mod ft). Jump
  distance / running-vs-standing conversion is not modeled in the
  rules core; caller-owned.
- **Scrying** — remote-viewing sense is session-owned.
- **Disguise Self / Major Image / Silent Image / Minor Illusion** —
  illusion appearance + Investigation-action reveal is
  perception/visual-illusion agenda.
- **Continual Flame / Daylight / Light** — illumination (Bright/Dim
  Light emanation, darkness-overlap dispel) is perception/visibility
  agenda; magical-object creation is world-object mechanic.
- **Speak with Animals / Speak with Plants / Speak with Dead** —
  communication / language class (sibling to Comprehend Languages /
  Tongues).
- **Create Food and Water / Heroes' Feast** — conjured consumable
  world-objects; consumption and nourishment are session-layer state.
- **Dancing Lights / Light** — create/reposition illumination points
  (illumination class, sibling to Daylight / Continual Flame).
- **Gate / Plane Shift / Teleportation Circle** — planar transit and
  named planar destinations are spatial / session-layer content.
- **Gentle Repose / Spare the Dying (stabilize rider)** — corpse /
  death-save-state mechanics whose effect (prevent decay, raise-dead
  eligibility) is session/narrative state.
- **Stone Shape / Fabricate / Mold Earth / Move Earth** — craft /
  terrain manipulation; world-object geometry and material state are
  session-layer.
- **Fire Bolt (and attack-spell riders)** — "a flammable object
  ignites if not worn or carried" is a world-object-state rider,
  session-layer.

---

## C. Big / complex modeling questions (open design)

### C1. Counterspell

**SRD 5.2.1 text:** Reaction, "which you take when you see a creature
within 60 feet of yourself casting a spell with Verbal, Somatic, or
Material components"; target caster makes Con save; on fail spell
dissipates, action wasted, slot not expended; upcast auto-succeeds if
dispel slot ≥ target spell level.

**Open questions:**
- New `ReactionTrigger` variant `creature_casts_spell` with a
  component-presence filter (any of V/S/M).
- `triggered_reaction` family currently has `effects: EffectAtom[]`;
  Counterspell needs a save-gated outcome inside a reaction. Either
  widen the family to allow a save_gate phase inside, or create a new
  `contested_reaction` family.
- Generic "negate the triggering spell cast" atom (contrast with the
  existing `negate_named_effect` which targets a specific named spell).
- Slot-auto-success: upcast adds "skip save if slot level ≥ target
  spell level". This is a DC-bypass pattern that has no current atom.

**Next step:** needs design input before authoring. Deferred.

### C2. Sleep (SRD 5.2.1)

**SRD 5.2.1 text:** WIS save, on fail Incapacitated until end of next
turn; at that point, repeat the save; second fail → Unconscious for
duration; spell ends on target if it takes damage or if someone
within 5 ft uses an action to shake it out; creatures that don't
sleep or are immune to Exhaustion auto-succeed.

**Open questions:**
- Two-stage save chain (Incapacitated → Unconscious) with the second
  save happening at a scheduled time, not end-of-every-turn. Current
  `RepeatSaveSpec.cadence` is `end_of_target_turn`; Sleep's second
  save is `end_of_first_repeat`.
- Two DurationEndTriggers (damage; shake-by-ally) — damage is
  straightforward; shake-by-ally is DM agenda.
- Auto-success predicate by creature-immunity ("immune to Exhaustion
  auto-succeeds") — a per-target save-ability-level filter.

**Next step:** not worth one tick. Split into sub-widenings driven by
other units first.

### C3. Dispel Magic

**Open questions:**
- Ability check (caster's spellcasting ability vs DC 10 + target
  spell level) — not a save, a check. Current `DcSource` and
  resolution shapes don't have a caster-side ability check.
- Generic "end any ongoing spell" atom (distinct from
  `negate_named_effect`).
- Slot-auto-success, same pattern as Counterspell.

**Next step:** ties to C1 (both have slot-auto-success); design them
together.

### C4. Magic Missile alternatives

**Current shape:** `TargetSelection.choose_up_to.repeatsAllowed = true`
gives Magic Missile's multiset of dart targets.

**Alternative:** a `strikes: SlotScaling<number>` on the `direct`
phase would be more explicit about "N independent strikes, each
picking its own target". Current choice is minimal-widening; the
alternative may become preferable if a spell surfaces that is clearly
"strike count" rather than "target count" (e.g., a spell with 3
darts that all hit the same target by force, not player choice).

**Next step:** leave as-is; the current shape is RAW-faithful.

### C5. OngoingOperation vs EffectAtom union duplication

**Observation:** `OngoingOperation` (roll_modifier, damage_on_hit,
modify_ac_set_base) duplicates shapes already in `EffectAtom`
(modify_roll_numeric, damage, modify_ac). The duplication is partly
historical (legacy content) and partly principled (operations are
persistent; effect atoms are one-shot).

**Open question:** should these unions unify? Every family could use
EffectAtom directly, with persistence determined by the family kind.

**Next step:** not urgent. Protection from Evil and Good demonstrated
that activation + concentration + direct phase is a viable substitute
for ongoing_effect family for cases where the operation happens to
overlap with an EffectAtom. Revisit when the duplication causes real
pain.

---

## D. Meta: survey-plan decision still open

**A vs B for scaling-shape encoding** (see
`plans/CONTENT_SURFACE_SURVEY.md`). Every widening so far has been
Option-A-style (additive per-atom variants). No evidence has forced
an Option-B refactor (parameterized `ThresholdTiers<T>` /
`LinearPerLevel<T>`). Decision still open; revisit after enough
widenings have landed that the pattern is obvious.

---

## E. Sub-agent survey corpus

`scripts/content-surface-survey/results-srd/<slug>/` contains
sub-agent analyses for ~777 SRD units, with the following verdict
distribution (as of last check):

- 267 `structural_widening` (big design work)
- 132 `surface_widening` (small type-shape extensions)
- 47 `atom_widening` (new effect atom needed)
- 19 `clean` (no widening needed)
- 13 `dm_agenda` (correctly classified as out of scope)
- 255 `refused` / 41 `invalid`

Each `surface_widening` or `atom_widening` unit has a `proposal.md`
with the sub-agent's shape proposal. These should be consulted
whenever an authoring tick picks a new unit — they save design work
and keep the prototype aligned with what the survey measured.

Survey workflow (post-unblock):

1. Pick a unit from `results-srd/` (prefer `surface_widening` /
   `atom_widening`; skip `structural_widening` without design input).
2. Read `proposal.md`; evaluate against current surface + user
   policy (DM agenda, bounded closed enums, ARCHITECTURE.md §1).
3. Accept, refactor, or reject the proposal.
4. Land the widening + author the content file as a validation
   reference.
5. Mark items here as landed / dropped / still-open.
