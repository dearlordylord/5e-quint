# SRDINV90B Recursive Level-1 Battle Readiness Closure Review

Task 335 reviewed the completed SRDINV90A owner-accepted closure model against
the generated SRD inventory, Unit matrix metrics, and promoted battle-runtime
acceptance surface. The level-1 battle readiness lane can close: every generated
inventory row is now either accepted as battle-ready through owner evidence or
accepted through explicit no-battle-effect closure.

This is not a claim that every installed executable Unit has a supported battle
profile. The generated Unit metric, supported executable Unit coverage, remains
85/117 (72.6%). That metric answers a narrower Unit-profile support question;
the product readiness metric also counts character-creation ownership,
non-runtime table summaries, selected-option containers, later-level-only
residuals, table/spatial derivations, social/knowledge state, companion-AI
exclusions, and exploration/presentation closures when those facts are explicit
at the matrix/inventory boundary.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after SRDINV90A:

- Total generated rows: 367.
- Level-1 rows: 156.
- Spell-list pressure rows for cantrips and level-1 spells: 211.
- Missing level-1 class containers: 0.
- Default level-1 battle readiness: 367/367 (100%).
- Accepted rows: 276.
- Accepted no-battle-effect rows: 91.
- Remaining battle-runtime-required rows: 0.
- Remaining partial-battle-runtime rows: 0.
- Level-1 rows by disposition: 144
  `catalog-installed-owner-evidence-present`, 12 `non-runtime`.
- Spell Unit pressure by disposition: 139
  `catalog-installed-owner-evidence-present`, 72 `catalog-only/dead-for-now`.

The generated Unit matrix separately reports:

- Supported executable Unit coverage: 85/117 (72.6%).
- Installed Unit profile classification coverage: 144/144 (100%).
- QNT profile modeling coverage: 62/62 (100%).
- QNT proof coverage: 61/62 (98.4%).
- Runtime mapping coverage: 62/62 (100%).
- Runtime parity coverage: 62/62 (100%).
- Deterministic admission/projection coverage: 78/85 (91.8%).
- Selected identity MBT coverage: 10/85 (11.8%).

## SRDINV90A Review

SRDINV90A added checker-readable `battleReadinessClosure` facts to Unit claims
and deferred profile-subset mechanics, then made the readiness classifier
consume those facts. The closure states are explicit at the product metric
boundary, so catalog admission alone still does not count as support.

The rows that were previously reported as `battle-runtime-required` now close
only through one of these owner-accepted boundaries:

| Family | Closure |
|---|---|
| Fighting Style and Weapon Mastery class features | Selection/grant containers; selected Fighting Style feat or selected Mastery Property Units own executable battle pressure. |
| Warlock Eldritch Invocations | Selection/grant container; selected invocation option Units own executable pressure. |
| Detect Evil and Good, Detect Magic, Detect Poison and Disease | Exploration/detection sensing, occlusion, aura, school, poison, disease, and Hallow discovery state outside promoted battle runtime. |
| Minor Illusion | Illusion/exploration sound, image, Study, faint-rendering, recast, and physical-interaction state outside promoted battle runtime. |

The rows that were previously reported as `partial-battle-runtime` now close
only when their remaining mechanics name an explicit non-level-1,
non-battle-runtime, table/spatial, social/knowledge, companion-AI, or
presentation owner. Their supported battle subsets continue to rely on the
existing promoted runtime/profile evidence.

## Source Review

No new rule slice was selected for implementation. The closure review checked
the local SRD 5.2.1 passages that justify the accepted non-battle and
selected-owner boundaries:

- `.references/srd-5.2.1/Classes/Fighter.md` lines 56-74 for Fighting Style as
  a selected Fighting Style feat and Weapon Mastery as selected weapon mastery
  choices.
- `.references/srd-5.2.1/Equipment.md` lines 82-119 for Mastery Properties as
  the executable weapon-pressure layer unlocked by a feature.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1407-1448 for
  Detect Evil and Good, Detect Magic, and Detect Poison and Disease sensing,
  occlusion, aura, Hallow, poison, disease, and school-identification clauses.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 337-352 for Minor
  Illusion's sound/image creation, Study adjudication, faint rendering, and
  physical-interaction reveal clauses.
- The SRD passages recorded by SRDINV89D and SRDINV90A remain the source check
  for the already-supported profile subsets and their deferred owner closures.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Invocation,
Spell Effect, Magic Action, Study action, Concentration, Weapon Mastery,
Mastery Property, Fighting Style, Ability Check, and choice/container
vocabulary.

## Decision

Do not append another executable battle-runtime batch from this lane. The
accepted product readiness metric is 367/367 (100%), and a direct artifact
check found zero rows still classified as `battle-runtime-required` or
`partial-battle-runtime`.

Future work should not reopen this lane merely because supported executable
Unit coverage is 72.6%. That metric remains valuable for profile-expansion
planning, but it is intentionally not the level-1 battle readiness closure
metric.

## Verification

- `pnpm unit-profile-coverage:check` passed with 144 Units and 71 profiles.
- Artifact inspection confirmed `srd-unit-inventory.json` reports 367/367
  accepted readiness and no rows outside `accepted` or
  `accepted-no-battle-effect`.
- Artifact inspection confirmed the Unit matrix still reports supported
  executable Unit coverage separately as 85/117 (72.6%).
- Active-plan consistency was updated across the Ralph index, DAG table, and
  Task 335 details.

## reviewer loop Convergence

- Round 1: rejected closing based on active-plan exhaustion or supported-profile
  coverage. Closure is justified only by the generated product metric reaching
  367/367 and by every previously residual row having an explicit owner closure.
- Round 2: found no remaining concrete executable owner to append. The only
  lower percentages left in the matrix are different metrics, chiefly supported
  executable Unit coverage and selected identity MBT coverage, and they should
  remain separate planning signals rather than blockers for this lane.
