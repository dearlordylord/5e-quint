# SRD Inventory Ralph Batch Plan

This plan turns the generated SRD Unit inventory into a Ralph-executable task
sequence. It is SRD-only and starts with level-1 class pressure.

Source artifacts:

- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `.references/srd-5.2.1/Classes/`

The SRD inventory lane is independent from QMBT. QMBT is used only if a later
task promotes battle-runtime behavior that needs QNT/runtime parity.

## Batch Shape

The generator emits `recommendedBatches` and the Markdown report renders them
under `Recommended Ralph Batches`. `ACTIVE_PLAN.md` mirrors those generated
batches so Ralph can execute them.

Current sequence:

- `SRDINV1`: classify installed level-1 owner evidence.
- `SRDINV1A`: replace private owner-evidence classifications with durable
  evidence sources before downstream tasks proceed.
- `SRDINV1B`: create a checker-readable character-creation evidence manifest,
  wire it into the inventory generator, and reclassify only covered rows.
- `SRDINV2`: author or explicitly close missing level-1 class containers.
- `SRDINV3`: classify missing level-1 class feature rows.
- `SRDINV4`: classify level-1 character-creation/progression rows.
- `SRDINV5A`: classify level-1 class Spellcasting/access rows.
- `SRDINV5B`: classify missing cantrip and level-1 Spell Unit rows.
- `SRDINV5C`: classify installed cantrip and level-1 Spell Unit owner
  evidence.
- `SRDINV5D`: review catalog-only cantrip and level-1 Spell Unit rows.
- `SRDINV6`: review nonspell catalog-only/dead-for-now and Surface-widening
  rows.
- `SRDINV7`: recursive review and append the next concrete multi-task batch.
- `SRDINV8`: widen class-container proficiency and multiclass-entry Surface
  facts.
- `SRDINV9`: widen non-Wizard spell-access Surface facts and own the shared
  Warlock Pact Magic source shape.
- `SRDINV10`: widen level-1 class-feature Surface mechanics after SRDINV9,
  consuming the shared Pact Magic source shape instead of remodeling it.
- `SRDINV11`: recursive review after the concrete Surface-widening batch.
- `SRDINV12`: author expressible level-1 class container records.
- `SRDINV13`: author expressible level-1 class Spell Access records.
- `SRDINV14`: author expressible level-1 class feature records.
- `SRDINV15`: author level-1 Weapon Mastery records.
- `SRDINV16`: recursive review after the concrete authoring batch.
- `SRDINV17`: close character-creation class container and class-owned source
  fact owner evidence.
- `SRDINV18`: close character-creation class feature owner evidence.
- `SRDINV19`: close character-creation Spell Access owner evidence.
- `SRDINV20`: close character-creation Weapon Mastery owner evidence.
- `SRDINV21`: recursive review after the concrete owner-evidence batch.
- `SRDINV22`: close shared multiclass Primary Ability owner evidence.
- `SRDINV23`: promote character-sheet Armor Class formula runtime evidence.
- `SRDINV24`: promote character-sheet rest and Spell Slot recovery runtime
  evidence.
- `SRDINV25`: promote character-sheet healing resource action runtime evidence.
- `SRDINV26`: close Wizard Ritual Adept spell-invocation owner evidence.
- `SRDINV27`: recursive review after the promoted-runtime batch.
- `SRDINV28A`: generalize spell damage invocation runtime evidence.
- `SRDINV28B`: promote pure spell damage runtime evidence.
- `SRDINV28C`: promote spell attack damage runtime evidence.
- `SRDINV28D`: promote simple spell rider timing runtime evidence.
- `SRDINV28E`: decide Starry Wisp object targeting support.
- `SRDINV29A`-`SRDINV29F`: promote area, chain, typed-damage, and Chromatic
  Orb spell runtime evidence as separate vertical slices.
- `SRDINV30A`-`SRDINV30F`: promote buff, debuff, protection, roll modifier,
  and damage-reduction spell runtime evidence as separate vertical slices.
- `SRDINV31A`-`SRDINV31F`: promote attack-rider, smite, mark, and True Strike
  spell runtime evidence as separate vertical slices.
- `SRDINV32A`-`SRDINV32B`: promote Produce Flame held-light and hurled attack
  runtime evidence as separate vertical slices.
- `SRDINV33`: recursive review after the spell-runtime batch.

The spell-pressure rows are split into `SRDINV5A` through `SRDINV5D` because
class spell access, missing Spell Unit records, installed Spell Unit evidence,
and catalog-only Spell Unit closure are different decisions with different
acceptance criteria.

Each generated task should have one coherent decision shape. Do not combine
unrelated authoring, admission, runtime-support, and closure decisions just
because they all mention spells.

`SRDINV1` is intentionally first because installed/catalog-loaded rows should
not imply full support. It must decide which installed rows need operational
owner evidence and which can be explicitly closed as catalog-only/dead-for-now.
`SRDINV1A` is the correction gate for that classification: owner evidence may
be reported as present only when the generator derives it from durable matrix,
runtime, or character-creation evidence artifacts. Rows without durable
evidence must remain evidence-required or explicit catalog-only closures.
Because no checker-readable character-creation evidence manifest currently
exists, SRDINV1A keeps installed character-creation rows evidence-required. The
active plan includes SRDINV1B as the atomic follow-up before unblocking
character-creation evidence-present classifications: create that manifest, wire
it into the SRD inventory generator, and then reclassify only rows covered by
the manifest.

QMBT68/QMBT69 are deliberately deferred while this lane is active. The next
Ralph-ready task should be `SRDINV1`, not the older QMBT projection-cleanup
queue.

## Post-SRDINV7 Frontier Loop

SRDINV7 found that level-1 inventory is still open and that the highest-signal
frontier is Surface expressivity, not runtime promotion. The next batch is
therefore three concrete Surface-widening families followed by a recursive
review:

1. `SRDINV8` handles class-container proficiency and multiclass-entry blockers.
2. `SRDINV9` handles non-Wizard Spell Access blockers and owns the shared
   Warlock Pact Magic source shape.
3. `SRDINV10` handles level-1 class-feature blockers after SRDINV9, consuming
   the Pact Magic source shape for class-feature projections instead of
   defining parallel Pact Magic state.
4. `SRDINV11` reviews the landed widening work, refreshes inventory metrics, and
   appends the next concrete batch.

The loop may recurse, but recursion must append concrete atomic work before it
re-adds a review task. A recursive-only continuation is not an acceptable
closeout.

## Post-SRDINV11 Frontier Loop

SRDINV11 found that SRDINV8-SRDINV10 removed active level-1 Surface-widening
blockers. Level-1 inventory is still open, but the active frontier is now
authored SRD record absence, not more Surface expressivity.

The next batch is therefore four concrete authoring families followed by a
recursive review:

1. `SRDINV12` authors missing level-1 class containers for Bard, Cleric, Druid,
   Monk, Paladin, Ranger, Rogue, and Sorcerer.
2. `SRDINV13` authors missing level-1 Spell Access records for Bard, Cleric,
   Druid, Paladin, Ranger, and Sorcerer, without admitting individual Spell
   Definitions as runtime-supported.
3. `SRDINV14` authors missing level-1 class feature records for Bardic
   Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored
   Enemy, Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocations.
4. `SRDINV15` authors missing level-1 Weapon Mastery records for Barbarian,
   Paladin, Ranger, and Rogue. Fighter Weapon Mastery already has owner
   evidence.
5. `SRDINV16` reviews the authoring batch, refreshes inventory metrics, and
   appends the next concrete batch unless level-1 is explicitly complete.

Spell Unit Surface blockers and authored executable spell-runtime follow-ups
remain counted, but they are not the immediate SRDINV12-SRDINV15 frontier.

## Post-SRDINV16 Frontier Loop

SRDINV16 found that SRDINV12-SRDINV15 closed the expressible level-1
authored-record backlog. Level-1 inventory is still open, but the active
frontier is now owner-evidence closure for installed authored rows, especially
character-creation evidence.

The next batch is therefore four concrete character-creation evidence families
followed by a recursive review:

1. `SRDINV17` closes class-container, core-trait, starting-equipment, and
   multiclass-entry owner evidence through character-creation support-profile
   and manifest evidence.
2. `SRDINV18` closes character-creation owner evidence for authored level-1
   class features retained on CharacterBuilds or discovered as choices.
3. `SRDINV19` closes non-Wizard Spell Access owner evidence without admitting
   individual Spell Definitions as runtime-supported.
4. `SRDINV20` closes non-Fighter Weapon Mastery owner evidence while keeping
   mastery property execution separate.
5. `SRDINV21` reviews the landed evidence work, refreshes inventory metrics,
   and appends the next concrete batch unless level-1 is explicitly complete.

The shared-algebra Primary Ability rows, Wizard Ritual Adept, character-sheet
Armor Class formulas, rest/Spell Slot recovery, and Lay On Hands remain visible
for SRDINV21. Spell Unit Surface blockers and authored executable spell runtime
follow-ups remain counted, but they are not the immediate SRDINV17-SRDINV20
frontier.

## Post-SRDINV21 Frontier Loop

SRDINV21 found that SRDINV17-SRDINV20 plus SRDINV18A closed the
character-creation owner-evidence frontier. Level-1 inventory is still open,
but the active frontier is now promoted runtime ownership outside
character-creation.

The next batch is therefore five concrete promoted-runtime closure families
followed by a recursive review:

1. `SRDINV22` closes all 12 Primary Ability rows through shared multiclass
   prerequisite algebra evidence without duplicating class-container source
   facts.
2. `SRDINV23` promotes character-sheet Armor Class derivation for base AC and
   Barbarian/Monk Unarmored Defense, including the one-formula-at-a-time
   multiclass rule.
3. `SRDINV24` promotes character-sheet rest and Spell Slot recovery for Short
   Rest, Long Rest, and Wizard Arcane Recovery while keeping Spell Slot, Pact
   Slot, Hit Die, and feature recharge facts distinct.
4. `SRDINV25` promotes Lay On Hands as a character-sheet healing resource
   action with one pool for HP restoration and Poisoned-condition removal.
5. `SRDINV26` closes Wizard Ritual Adept through a promoted
   spell-access/invocation runtime boundary over spellbook Spell Access and
   ritual-tagged Spell Definitions.
6. `SRDINV27` reviews the promoted-runtime closure batch, refreshes inventory
   metrics, and either records level-1 completion or appends the next concrete
   frontier.

Spell Unit Surface blockers and authored executable spell-runtime follow-ups
remain counted, but they are not the immediate SRDINV22-SRDINV26 frontier while
level-1 rows remain open.

## Post-SRDINV27 Frontier Loop

SRDINV27 found that SRDINV22-SRDINV26 closed the promoted-runtime level-1
frontier and that the generated level-1 inventory is complete. The remaining
frontier is spell Unit pressure outside level 1. The immediate batch is the
runtime-ready authored executable spell rows, leaving Surface blockers,
installed unsupported spell rows, missing Detect spell records, and explicit
catalog-only/dead-for-now rows counted for the next recursive review.

The next batch is therefore a split spell-damage foundation, small spell-runtime
vertical slices, and a recursive review:

1. `SRDINV28A` generalizes spell attack/save-damage invocation so cantrips and
   prepared spell-slot damage can share one executable runtime shape.
2. `SRDINV28B` promotes the simplest pure damage spells after that foundation.
3. `SRDINV28C` promotes spell attack damage without Ray-of-Frost-only rider
   assumptions.
4. `SRDINV28D` promotes simple spell rider timing and source-owned expiration.
5. `SRDINV28E` decides whether Starry Wisp gets executable object targeting now
   or remains unsupported with explicit evidence.
6. `SRDINV29A`-`SRDINV29F` split Burning Hands, Color Spray, Entangle, Grease,
   Ice Knife, and Chromatic Orb because those use different target/fill and
   continuation protocols. Chromatic Orb is explicitly research-first and should
   consult the deleted Core/prototype history before implementation.
7. `SRDINV30A`-`SRDINV30F` split scalar buffs, roll modifiers, protection/charm,
   Heroism turn-start effects, Faerie Fire, and Resistance because those effects
   have different lifecycles and acceptance criteria.
8. `SRDINV31A`-`SRDINV31F` split Divine Favor, Hunter's Mark, Divine Smite,
   Ensnaring Strike, Searing Smite, and True Strike by trigger/lifecycle.
9. `SRDINV32A`-`SRDINV32B` splits Produce Flame held illumination from its later
   hurled attack.
10. `SRDINV33` reviews the spell-runtime batch, refreshes inventory metrics,
    enforces the "one execution invariant per runnable task" rule, and appends
    the next concrete spell frontier.

SRDINV27 also fixed a stale Wizard Arcane Recovery evidence reference in
`character-sheet-owner-evidence.json`; the generated checker now sees
character-sheet runtime evidence for that row. The refreshed level-1 metrics
are 156 rows total: 144 `catalog-installed-owner-evidence-present` rows and 12
`non-runtime` rows.

## Acceptance Model

Each batch should keep the generated inventory measurable:

- stable row ids remain stable;
- rows do not disappear silently;
- every row has one final disposition;
- `needs-surface-widening` rows name the missing Surface construct;
- supported operational behavior has owner-specific evidence;
- catalog-only/dead-for-now rows are allowed when explicitly counted.
- recursive review never appends only one recursive continuation task. If
  level-1 is not complete, it must append a concrete batch set with at least
  three specific follow-up tasks, grouped by mechanics family, owner boundary,
  or Surface-widening blocker.

Run:

```sh
pnpm unit-profile-coverage:check
```

Regenerate after intentional inventory changes:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```

## SRDINV4 Closeout Notes

SRDINV4 classifies level-1 character-creation and progression inventory rows;
it does not model new runtime behavior. The local SRD source review used the
SRD 5.2.1 class files under `.references/srd-5.2.1/Classes/`, specifically the
Core Class Traits tables, the "As a Level 1 Character" and "As a Multiclass
Character" paragraphs, and each class's level-1 feature table row. Those sources
show that hit dice, primary ability, saving throws, skill/weapon/tool
proficiencies, armor training, starting equipment, and multiclass entry traits
are facts of the class container rather than standalone SRD records. The
feature table rows summarize level progression; narrower class trait, feature,
spell-access, mastery, and equipment rows own executable evidence.

`UBIQUITOUS_LANGUAGE.md` was checked for Class, Character Sheet, Hit Die,
Proficiency Bonus, Proficiency Level, Skill, Multiclassing, Weapon Mastery, and
the distinction between character-derived facts and stat-block-authored facts.
The inventory now records `class-container-owned-source-fact` for level-1
`core-trait`, `equipment-pressure`, and `multiclass-entry` rows, and
`non-runtime-table-summary` for `class-table-summary` rows.

`/simplify` convergence:

- Round 1: kept the classification at the existing SRD row-kind boundary
  instead of adding standalone evidence rows or duplicating class-container
  facts.
- Round 2: no important changes found; spell-access rows remain reserved for
  SRDINV5A, individual spell pressure remains reserved for SRDINV5B-SRDINV5D,
  and Surface widening/runtime work remains deferred to later SRDINV tasks.

## SRDINV5A Closeout Notes

SRDINV5A classifies level-1 class Spellcasting/access rows; it does not admit
individual cantrip or level-1 Spell Units. The local SRD source review used the
level-1 Spellcasting sections in the SRD 5.2.1 Bard, Cleric, Druid, Paladin,
Ranger, Sorcerer, and Wizard class files, plus the level-1 Warlock Pact Magic
section as a class-feature spell-access package. Those passages distinguish
class-owned Spell Access facts from individual Spell Definition rows: cantrip
choices where present, prepared spells, Spell Slot or Pact Slot projection,
spellcasting ability, focus permissions, and replacement timing are owned by the
class container or feature before any individual spell runtime behavior is
considered.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Pact Slot, Cantrip, and Spellcasting
Focus terminology. The inventory now records the six non-Wizard level-1
Spellcasting rows as `needs-surface-widening` because current Surface
`ClassRecord` spellcasting creation facts are Wizard-specific. Wizard
Spellcasting remains `catalog-installed-owner-evidence-present` from the
character-creation owner evidence manifest. Warlock Pact Magic remains a
class-feature Surface-widening row because the SRD names it as the class feature
that owns Warlock spell access and Pact Slot recovery.

`/simplify` convergence:

- Round 1: kept Spell Access rows separate from individual Spell Unit pressure
  and added named Surface blockers instead of generic missing authored-record
  wording.
- Round 2: localized shared non-Wizard spellcasting blocker wording so class
  container and spell-access classifications cannot drift for the same missing
  construct; no further important changes found.

## SRDINV5B Closeout Notes

SRDINV5B classifies missing SRD cantrip and level-1 Spell Unit rows; it does
not author Spell Definition records or promote spell runtime behavior. The
local SRD source review used the cantrip and level-1 spell-list tables in the
SRD 5.2.1 Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and Wizard
class files, plus the corresponding spell descriptions under
`.references/srd-5.2.1/Spells/Descriptions-*.md` for the 28 unique missing
Spell Definitions.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Cantrip, Spell Slot, Pact Slot, Magic Action, Stable,
and the D20 roll terms used by the classified spells. The inventory generator
now records one classification per missing Spell Definition Unit id so repeated
class-list rows cannot drift. Missing Spell Unit pressure is split into 6
authoring-ready detect rows, 27 named Surface-widening rows, and 39 explicit
catalog-only/dead-for-now rows. The remaining authoring-ready rows are
`detect_evil_and_good` and `detect_poison_and_disease`; both can use existing
Surface detection atoms, with promoted detection/occlusion runtime ownership
left for future exploration support.

`/simplify` convergence:

- Round 1: kept the classification table keyed by Spell Definition Unit id
  rather than duplicating decisions across class spell-list rows.
- Round 2: kept noncombat utility closures separate from named Surface blockers
  and added generator validation so future missing Spell Unit rows cannot
  silently fall back to generic author-or-close wording.

## SRDINV5C Closeout Notes

SRDINV5C classifies installed SRD cantrip and level-1 Spell Unit rows; it does
not author spell records or implement spell runtime behavior. The local SRD
source review used the cantrip and level-1 spell-list tables in the SRD 5.2.1
Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and Wizard class
files, plus the corresponding spell descriptions for the 12 unique installed
Spell Definitions: Acid Splash, Cure Wounds, Detect Magic, Fire Bolt, Healing
Word, Light, Mage Armor, Magic Missile, Ray of Frost, Shield, Sleep, and
Thunderwave.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Pact Slot, Cantrip, and Magic Action. The
inventory generator now derives installed Spell Unit owner evidence from the
durable Unit matrix artifacts: `supported-profile` plus
`deterministic-admission-projection` evidence marks 18 repeated class-list rows
as battle-runtime owner-evidence-present; unsupported Sleep rows remain
battle-runtime spell invocation/projection evidence-required; Fire Bolt and
Thunderwave rows keep named Surface/runtime projection blockers; Detect Magic
and Light rows are explicit catalog-only/dead-for-now closures. Installed Spell
Unit rows no longer fall back to `catalog-installed-needs-owner-evidence`.

`/simplify` convergence:

- Round 1: kept support facts derived from `unit-claims.jsonl` and
  `unit-evidence.jsonl` instead of adding a parallel installed-spell support
  table; the only explicit installed-spell decision table is the small
  catalog-only closure set for unsupported utility spells.
- Round 2: localized the installed Spell Unit classification in the inventory
  generator and added validation so authored, installed cantrip/level-1 Spell
  Unit rows cannot silently re-enter generic owner-evidence-required wording; no
  further important changes found.

## SRDINV5D Closeout Notes

SRDINV5D reviewed the generated catalog-only/dead-for-now cantrip and level-1
Spell Unit pressure rows; it does not admit spells, author spell records, or
implement runtime behavior. The local SRD source review used the cantrip and
level-1 spell-list tables in the SRD 5.2.1 Bard, Cleric, Druid, Paladin,
Ranger, Sorcerer, Warlock, and Wizard class files, plus the spell descriptions
under `.references/srd-5.2.1/Spells/Descriptions-*.md` for the authored
not-installed Spell Definitions and the previously classified missing or
installed catalog-only closures.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Cantrip, Spell Slot, Pact Slot, Magic Action,
Reaction, Concentration, Area of Effect, Illumination, Charmed, Frightened,
Blinded, Restrained, Prone, Poisoned, Temporary Hit Points, Speed, and D20 roll
terms. The generated inventory now keeps the 151-row SRDINV5D review
denominator, but splits it into 74 explicit `catalog-only/dead-for-now` rows
and 77 `catalog-authored-executable-follow-up` rows. Catalog-only rows carry
specific closure reasons for exploration, social, illumination, object,
illusion, item-inspection, companion, communication, and inventory effects
outside the current promoted owners. Authored executable rows no longer stay
dead-for-now; they are promoted into named follow-up batches:

- `spell-attack-and-save-damage-runtime`
- `spell-area-chain-and-typed-damage-runtime`
- `spell-buff-debuff-and-protection-runtime`
- `spell-attack-rider-and-smite-runtime`
- `spell-held-light-and-hurled-attack-runtime`
- `spell-reaction-runtime`

Reviewer round 2 split Produce Flame out of the attack-rider/smite batch after
checking `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: the spell creates
a 10-minute held flame that sheds Bright Light and Dim Light, then permits a
later Magic action ranged spell attack against a creature or object with Fire
damage and cantrip scaling.

The generator validates that every authored, not-installed cantrip or level-1
Spell Unit pressure row is classified by the SRDINV5D review table, and that a
Spell Definition cannot be both a catalog-only closure and an executable
follow-up.

`/simplify` convergence:

- Round 1: split executable authored Spell Definitions out of
  `catalog-only/dead-for-now` instead of preserving a misleading dead-for-now
  disposition; kept the repeated class-list rows derived from one Unit-id review
  table so class spell-list copies cannot drift.
- Round 2: added validation for the review table and kept the follow-up batches
  at mechanics-family granularity rather than per-class or per-row tasks; no
  further important changes found.

## SRDINV6 Closeout Notes

SRDINV6 reviewed the generated catalog-only/dead-for-now and
needs-Surface-widening rows left after SRDINV3 and SRDINV5A-SRDINV5D. It does
not author records, widen Surface, or implement runtime behavior. The local SRD
source review for changed rows used the SRD 5.2.1 Barbarian, Monk, Paladin, and
Wizard class files for Unarmored Defense, Lay On Hands, and Arcane Recovery.

`UBIQUITOUS_LANGUAGE.md` was checked for Armor Class, Unarmored Defense, Hit
Points, Pool, Character Sheet, Class, Class Feature, Spell Slot, and the
Character Sheet versus Stat Block ownership distinction. The generated SRDINV6
denominator remains 62 rows: 4 explicit nonspell catalog-only/dead-for-now
closures and 58 needs-Surface-widening rows. The Surface-widening rows all name
their missing construct, split across 8 class containers, 11 class features, 6
spell-access rows, and 33 Spell Unit pressure rows. The 58 widening rows should
feed SRDINV7/SRDINV8 as concrete Surface-gate input rather than being collapsed
into a generic redesign task.

The four nonspell catalog-only closures are now explicit:

- Barbarian Unarmored Defense and Monk Unarmored Defense stay catalog-only
  because they are character-sheet Armor Class formulas and no promoted
  character-sheet AC derivation runtime owns class-derived AC formulas yet.
- Paladin Lay On Hands stays catalog-only because it is a character-sheet
  healing pool and Bonus Action healing/Poisoned-condition removal feature
  outside current character-creation and battle-runtime owners.
- Wizard Arcane Recovery stays catalog-only because Short Rest Spell Slot
  recovery belongs to a future character-sheet/rest runtime.

The generator now validates that any future nonspell catalog-only/dead-for-now
row that is not an installed owner-evidence closure must have an explicit
SRDINV6 reason.

`/simplify` convergence:

- Round 1: kept the closure reasons in the generator rather than editing only
  generated Markdown/JSON, so regenerated inventory cannot lose them.
- Round 2: added validation for nonspell catalog-only closures and kept Surface
  widening rows as named blocker facts for SRDINV7/SRDINV8 instead of promoting
  broad runtime or Surface implementation in this review task; no further
  important changes found.

## SRDINV7 Closeout Notes

SRDINV7 reviewed SRDINV1A-SRDINV6 findings and confirmed that level-1 inventory
is not complete. The generated inventory still reports 156 level-1 rows, 25
level-1 `needs-surface-widening` rows, 58 all-row Surface-widening rows, and 77
authored executable spell follow-up rows. The next batch is not a recursive-only
placeholder: `SRDINV8` widens class-container proficiency and multiclass-entry
Surface facts, `SRDINV9` widens non-Wizard Spell Access facts and owns the
shared Warlock Pact Magic source shape, `SRDINV10` widens level-1 class-feature
Surface mechanics after consuming SRDINV9's Pact Magic shape, and `SRDINV11` is
the next recursive planning review after those concrete tasks.

The local SRD source review used representative SRD 5.2.1 class passages for
Bard, Cleric, Druid, Monk, Paladin, Ranger, Rogue, Sorcerer, and Warlock
blocker families, and `UBIQUITOUS_LANGUAGE.md` was checked for the class,
proficiency, spell-access, pool/spend, d20 roll, Reaction, Armor Class, and
Concentration terms used by the batch. Detailed notes are in
`plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md`.

`/simplify` convergence:

- Round 1: grouped the next work by Surface blocker family rather than by class
  row or a generic gate.
- Round 2: no important changes found; the batch references generated row
  groups and does not duplicate inventory state in a new tracking table.

## SRDINV11 Closeout Notes

SRDINV11 reviewed SRDINV8-SRDINV10 findings and confirmed that level-1
Surface-widening pressure is closed in the generated inventory. The refreshed
metrics are 367 total rows, 156 level-1 rows, 8 missing level-1 class
containers, 0 level-1 `needs-surface-widening` rows, 33 all-row
`needs-surface-widening` rows, 96 level-1 `missing-authored-record` rows, and
70 authored executable spell follow-up rows.

The appended batch is not a recursive-only placeholder: `SRDINV12` class
containers, `SRDINV13` class Spell Access, `SRDINV14` class features,
`SRDINV15` Weapon Mastery authoring, and `SRDINV16` recursive review.

Local SRD source review checked level-1 class trait, Spellcasting, Pact Magic,
class-feature, and Weapon Mastery passages under `.references/srd-5.2.1/Classes/`.
`UBIQUITOUS_LANGUAGE.md` was checked for Class, Character Sheet, Class Feature,
Spell Access, Spell Definition, Spell Slot, Pact Slot, Pool, Spend,
Proficiency Bonus, Proficiency Level, Weapon Mastery, Ability Check, Attack
Roll, Saving Throw, Reaction, and Concentration.

`/simplify` convergence:

- Round 1: chose expressible level-1 authoring before spell runtime or spell
  Surface blockers because the refreshed level-1 denominator has no active
  Surface-widening rows.
- Round 2: split the authoring work by owner boundary so class-owned creation
  facts, class Spell Access, class features, and Weapon Mastery cannot drift or
  accidentally admit unrelated runtime behavior.
- Round 3: no important changes found; later spell runtime and
  character-creation evidence closure remain visible for SRDINV16.

## SRDINV15 Closeout Notes

SRDINV15 authored Barbarian, Paladin, Ranger, and Rogue Weapon Mastery records
as SRD-provenance character-sheet choice/source facts. The records reference
class weapon proficiencies through `class_proficient_weapons` rather than
duplicating Simple/Martial category lists on each feature record. Fighter
Weapon Mastery remains the existing authored record and was updated to the
same proficiency-derived shape.

Local SRD source review checked the level-1 Weapon Mastery passages in
`.references/srd-5.2.1/Classes/Barbarian.md`,
`.references/srd-5.2.1/Classes/Paladin.md`,
`.references/srd-5.2.1/Classes/Ranger.md`,
`.references/srd-5.2.1/Classes/Rogue.md`, and the existing Fighter passage.
`UBIQUITOUS_LANGUAGE.md` was checked for Weapon Mastery, Class, Character
Sheet, Proficiency Level, and Long Rest.

`/simplify` convergence:

- Round 1: kept Weapon Mastery eligibility as a projection from each owning
  class record's weapon proficiencies, so the authored feature records do not
  duplicate category/property lists that already live on class containers.
- Round 2: no important changes found; the remaining coupling is localized to
  the `class_proficient_weapons` mechanics shape, its Surface schema, trace
  description, and character-creation discovery reader.

## SRDINV16 Closeout Notes

SRDINV16 reviewed SRDINV12-SRDINV15 findings and confirmed that level-1
authored-record absence is closed in the generated inventory. The refreshed
metrics are 367 total rows, 156 level-1 rows, 0 missing level-1 class
containers, 121 level-1 owner-evidence-required rows, 19 level-1
owner-evidence-present rows, 4 level-1 catalog-only/dead-for-now rows, and 12
level-1 non-runtime rows.

The appended batch is not a recursive-only placeholder: `SRDINV17` class
container and class-owned source fact evidence, `SRDINV18` class-feature
evidence, `SRDINV19` Spell Access evidence, `SRDINV20` Weapon Mastery evidence,
and `SRDINV21` recursive review.

Local SRD source review checked level-1 class trait, multiclass-entry,
Spellcasting, class-feature, and Weapon Mastery passages under
`.references/srd-5.2.1/Classes/`. `UBIQUITOUS_LANGUAGE.md` was checked for
Class, Character Sheet, Class Feature, Spell Access, Spell Definition, Spell
Slot, Pact Slot, Proficiency Bonus, Proficiency Level, Weapon Mastery,
Multiclassing, Ability Check, Attack Roll, Saving Throw, Armor Class, and the
Character Sheet versus Stat Block ownership distinction.

`/simplify` convergence:

- Round 1: chose character-creation owner-evidence closure before spell Unit
  Surface blockers or authored executable spell runtime because the refreshed
  level-1 denominator is dominated by owner-evidence-required rows.
- Round 2: split the evidence work by owner boundary so class-owned source
  facts, class features, Spell Access, and Weapon Mastery cannot drift or
  accidentally admit unrelated runtime behavior.
- Round 3: no important changes found; remaining shared-algebra and
  spell-invocation evidence rows stay visible for SRDINV21.
