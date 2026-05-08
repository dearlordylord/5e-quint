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
- `SRDINV7`: recursive review and append the next concrete multi-task batch,
  or explicitly close level-1 with final metrics.
- `SRDINV8`: Surface Widening Gate for the classified SRD level-1 frontier.
- `SRDINV9`: author expressible SRD level-1 Surface records.
- `SRDINV10`: plan runtime and MBT support for authored executable rows.

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

## Post-Inventory Frontier Loop

After SRDINV classification is complete, the lane advances the frontier in this
order:

1. `SRDINV8` checks whether Surface can express the selected important SRD
   level-1 rows. If not, it appends atomic Surface-widening tasks and then
   appends another copy of the same gate after them. If Surface is sufficient,
   it marks the gate done and unblocks authoring.
2. `SRDINV9` authors SRD-provenance Surface records for rows the gate declared
   expressible. If authoring exposes more Surface gaps, it sends those rows
   back through the gate instead of adding workaround data.
3. `SRDINV10` appends behavior-support tasks for authored executable rows:
   QNT/MBT procedure parity first when the behavior shape needs it, runtime
   implementation against that model, deterministic admission/projection
   evidence for concrete Unit ids, and selected identity MBT only for
   representative or high-risk Units.

The loop may recurse, but recursion must append concrete atomic work before it
re-adds the gate. A recursive-only continuation is not an acceptable closeout.

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
