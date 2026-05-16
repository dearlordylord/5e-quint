# SRDINV89D Recursive Level-1 Battle Feature Review

Task 333 reviewed the post-SRDINV89A-SRDINV89C level-1 battle frontier. The
lane is not ready for final product closure through the generated metric:
`plans/unit-profile-coverage/srd-unit-inventory.json` still reports default
level-1 battle readiness at 309/367 (84.2%). The distinct generated Unit metric,
supported executable Unit coverage, is 85/117 (72.6%). These are intentionally
different measurements and neither should be substituted for the other.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after SRDINV89A-SRDINV89C:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 309/367 (84.2%).
- Accepted rows: 243.
- Accepted no-battle-effect rows: 66.
- Battle-runtime-required rows: 25.
- Partial-battle-runtime rows: 33.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 139
  `catalog-installed-owner-evidence-present`, 72 `catalog-only/dead-for-now`.

The generated Unit matrix separately reports:

- Supported executable Unit coverage: 85/117 (72.6%).
- QNT profile modeling coverage: 62/62 (100%).
- QNT proof coverage: 61/62 (98.4%).
- Runtime mapping coverage: 62/62 (100%).
- Runtime parity coverage: 62/62 (100%).
- Deterministic admission/projection coverage: 78/85 (91.8%).

## SRDINV89A-SRDINV89C Review

| Task | Result |
|---|---|
| SRDINV89A | Chill Touch now has deterministic admission/projection evidence for the creature-or-object spell attack boundary, Necrotic object damage, object hit/miss replay holes, and preservation of the existing hit-point-regain prevention rider. |
| SRDINV89B | Protection from Evil and Good already has battle-runtime evidence for scoped attacker Disadvantage, possession-attempt prevention, scoped Charmed/Frightened prevention, and the already-applied repeat-save Advantage boundary. |
| SRDINV89C | Light, Faerie Fire, Produce Flame, Dancing Lights, and object-reveal emitter facts now feed source-owned illumination projection. Light object emitters support opaque-cover suppression; Dim Light projects Lightly Obscured Perception Disadvantage and Darkvision-adjusted sight consequences. |

## Remaining Checker Gap

The remaining generated readiness gap is now less about missing individual spell
reducers and more about the readiness classifier's closure vocabulary.

The 25 `battle-runtime-required` rows collapse to:

| Unit family | Rows | Current claim | Review finding |
|---|---:|---|---|
| Weapon Mastery and Fighting Style grant containers | 6 | `unsupported-profile` with character-creation owner evidence | These are selection/grant containers. The selected Fighting Style feat or selected mastery property Unit owns executable battle pressure. Counting the container itself as battle-runtime-required duplicates the selected Unit boundary. |
| Warlock Eldritch Invocations container | 1 | `unsupported-profile` with character-creation owner evidence | The class feature is a selected-option container. Individual invocation option Units, such as Pact of the Chain/Book of Shadows work, own executable pressure. |
| Detect Evil and Good / Detect Magic / Detect Poison and Disease | 14 | `unsupported-profile`, catalog-only closure | The SRD text is sensing, occlusion, aura, Hallow, poison/disease, and school-identification state. This is exploration/detection state, not promoted battle-runtime execution. |
| Minor Illusion | 4 | `unsupported-profile`, catalog-only closure | Sound/image creation, Study adjudication, faint rendering, and physical-interaction reveal are illusion/exploration state outside promoted battle-runtime execution. |

The 33 `partial-battle-runtime` rows collapse to 13 Unit claims:

| Unit | Rows | Remaining owner |
|---|---:|---|
| `bard_bardic_inspiration` | 1 | Later-level die-size scaling, already tracked by SRDINV78. |
| `monk_martial_arts` | 1 | Later-level Martial Arts die scaling, already tracked by SRDINV78. |
| `ranger_favored_enemy` / `hunters_mark` | 2 | Later free-cast scaling is SRDINV78; finding Advantage is ability-check roll-mode work under SRDINV66. |
| `faerie_fire` / `light` | 6 | Color presentation, automatic line-of-sight drawing, and automatic map geometry/pathfinding are outside the emitter projection boundary after SRDINV89C. |
| `feather_fall` / `jump` / `thunderwave` | 11 | Fall distance, elevation, landing, pathfinding, push geometry, broad object simulation, and sound propagation are spatial/table work under SRDINV55. |
| `fog_cloud` / `grease` | 6 | Automatic area membership, line of sight, map illumination, pathfinding, wind derivation, and grid geometry are spatial/table work under SRDINV66. |
| `find_familiar` | 1 | Unsupported familiar form attacks and generic command AI are outside the promoted companion lifecycle subset; SRDINV86 owns the review boundary. |
| `charm_person` | 5 | Friendly disposition, social interaction effects, and target knowledge when the spell ends are social/knowledge state under SRDINV41. |

This review does not claim that unsupported/profile-subset rows are supported
from catalog admission. It finds that the generated readiness classifier needs
an executable representation of owner-accepted closure so these rows are not
simultaneously "outside promoted battle runtime" in the Unit claims and
"battle-runtime-required" in the product readiness metric.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 707-720 for Chill
  Touch's creature-or-object target and noncombatant wording.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1407-1450 for
  Detect Evil and Good, Detect Magic, and Detect Poison and Disease sensing,
  occlusion, Hallow, aura, school, poison, disease, and identification clauses.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 219-231 and
  1577-1589 for Faerie Fire and Light emitter, outline, Dim Light, Advantage,
  color, and opaque-cover clauses.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 337-361 for Minor
  Illusion's sound/image, Study, faint rendering, and physical-interaction
  clauses.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 907-921 for
  Protection from Evil and Good's willing touched target, scoped creature
  types, possession prevention, condition prevention, and new-saving-throw
  Advantage clauses.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 177-179, 357-359, 412-414,
  656-658, 794-796, and 1020-1022 for Bright Light, Darkvision, Dim Light,
  Lightly Obscured, Possession, and Target vocabulary.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Invocation,
Spell Effect, Magic Action, Bonus Action, Concentration, Dim Light,
Obscurement, Darkvision, Study action, Weapon Mastery, Mastery Property,
Fighting Style, and choice/container vocabulary.

## Appended Batch

SRDINV89D selects a checker/readiness modeling batch rather than another spell
reducer slice:

- `SRDINV90A`: model owner-accepted level-1 battle readiness closure in the
  Unit matrix/inventory boundary. The task must make the readiness classifier
  consume existing Unit claims and deferred-mechanic owners instead of
  hard-coding contradictory battle-runtime-required outcomes for rows already
  closed as non-battle, later-level, table/spatial, social/knowledge, or
  outside-runtime. It must not count catalog admission alone as support.
- `SRDINV90B`: recursive review after SRDINV90A recomputes the product
  readiness metric. If readiness is still below 100%, select the next concrete
  executable owner from the rows that remain truly battle-runtime-required.

## /simplify Convergence

- Round 1: rejected final closure because the generated product readiness
  metric remains 309/367 (84.2%) with 58 rows outside the accepted numerator.
- Round 2: rejected another reducer-first spell batch. After SRDINV89A-SRDINV89C,
  the remaining named gaps mostly have explicit non-battle, later-level,
  spatial/table, social/knowledge, companion-AI, or outside-runtime owners.
  The next executable work is to encode those closure semantics in the
  readiness boundary so the metric cannot contradict the Unit claims.
