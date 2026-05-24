# C19 Recursive Next Batch

Task: `C19-RECURSIVE-NEXT-BATCH`

Scope: mine the next Lane C focused MBT batch from covered battle obligations
that do not currently declare `focused-mbt` parity evidence. This task does not
implement a slice or change runtime support claims.

## Evidence Basis

Generated `plans/rules-kernel-coverage/REPORT.md` reports 93 total obligations,
87 covered obligations, no open transitional obligations, and 6 boundary or
unsupported obligations. The source rows in `obligations.jsonl` contain 20
covered battle obligations whose `parityWitnesses` do not include
`focused-mbt`.

The package test inventory also matters: two rows already have package-local
focused MBT scripts even though their generated obligation rows still point at
runtime-test evidence:

| Obligation | Existing focused MBT inventory | Planning action |
| --- | --- | --- |
| `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE` | `test:mbt:flaming-sphere-hazard-ram`, `battle-runtime-flaming-sphere-hazard-ram.mbt.qnt`, `src/flaming-sphere-hazard-ram.mbt.test.ts` | Report-row alignment, not duplicate slice work. |
| `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` | `test:mbt:moonbeam-movable-zone`, `battle-runtime-moonbeam-movable-zone.mbt.qnt`, `src/moonbeam-movable-zone.mbt.test.ts` | Report-row alignment, not duplicate slice work. |

## Appended Slice Tasks

| Task | Obligation | Current evidence | Source anchors |
| --- | --- | --- | --- |
| C20 | `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE` | `runtime-test`: `src/find-familiar-lifecycle.test.ts` | Find Familiar, Pact of the Chain, `UBIQUITOUS_LANGUAGE.md#Action Lifecycle` |
| C21 | `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE` | `runtime-test`: `src/battle-runtime-druid-wild-shape.test.ts` | Wild Shape, Shape-Shifting, Temporary Hit Points, Creatures and Stat Blocks |
| C22 | `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING` | `runtime-test`: `src/unit-profile-admission-dispel-magic.test.ts` | Dispel Magic, Spellcasting |
| C23 | `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR` | `runtime-test`: `src/battle-runtime-metamagic-resource.test.ts` | Metamagic, Quickened Spell, Action Lifecycle |
| C24 | `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE` | `runtime-test`: `src/unit-profile-admission-darkness.test.ts` | Darkness |
| C25 | `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE` | `runtime-test`: `src/unit-profile-admission-flame-blade.test.ts` | Flame Blade |
| C26 | `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE` | `runtime-test`: `src/unit-profile-admission-misty-step.test.ts` | Misty Step |
| C27 | `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE` | `runtime-test`: `src/unit-profile-admission-blur.test.ts` | Blur |
| C28 | `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | `runtime-test`: `src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts`; broad MBT helper exists inside `battle-runtime.mbt.test.ts` | Aid, Barkskin, False Life, Longstrider, Shield of Faith, Spider Climb |
| C29 | `BATTLE.SPELL.SELF_TRANSFORMATION_MODE` | `runtime-test`: `src/unit-profile-admission-alter-self.test.ts` | Alter Self |
| C30 | `BATTLE.SPELL.REACTION_CASTING_TIME` | `runtime-test`: `src/counterspell-reaction-spell.test.ts`, `src/hellish-rebuke-reaction-spell.test.ts` | Reaction and Bonus Action Triggers, Counterspell, Hellish Rebuke |
| C31 | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | `runtime-test`: `src/chromatic-orb-chained-spell.test.ts` | Chromatic Orb, Spell Attack |

## Deferred Candidates

These remain valid future candidates after C20-C31, but were not needed to meet
C19's required batch size:

| Obligation | Reason deferred |
| --- | --- |
| `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` | Existing deterministic replay is a closed six-case fixture; lower interleaving pressure than active-effect and reaction slices. |
| `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` | Existing deterministic replay covers fixed Search, Guidance, and Enhance Ability cases; useful later if Lane C wants random hole sequencing. |
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | Existing deterministic replay covers RAW-fixed Command option outcomes; useful later after active-effect slices. |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | Existing selected-identity MBT covers representative roll-modifier buffs; can be split into a dedicated profile-slice task later. |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | Existing selected-identity MBT covers several rider flows; high value but broader than the first follow-on batch. |
| `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` | Existing runtime and selected identity coverage spans several profiles; good follow-on once chained/held-object slices land. |

## Reviewer Loop

Round 1:

- RAW/source: C19 did not model new rules. Candidate source anchors were read
  from `obligations.jsonl`; local SRD headings and `UBIQUITOUS_LANGUAGE.md`
  sections exist for the selected task families.
- Domain language: task names use rule/profile domains, not migration terms.
  Table-owned geometry, route, destination, and companion AI remain outside the
  slice acceptances.
- Architecture/connascence: each task couples one obligation, one focused MBT
  witness, one package script, and the matching rules-kernel row update. This
  keeps script/report/test changes local.
- Code review: planning-only changes; no runtime behavior, public API, or
  generated support claim changed.

Round 2:

- Rechecked against existing package scripts to avoid duplicating Flaming Sphere
  and Moonbeam focused witnesses.
- Rechecked the plan index, DAG rows, and task details after appending C20-C31.
  No remaining reasonable findings.

## Verification Note

No MBT run was appropriate for C19 because it only appends future runnable
tasks. Verification is limited to rules-kernel coverage consistency and diff
formatting.

Commands run:

- `pnpm rules-kernel-coverage:check -- --write`: passed,
  `Rules kernel coverage OK: 93 obligations.`
- `pnpm rules-kernel-coverage:check`: passed,
  `Rules kernel coverage OK: 93 obligations.`
- `git diff --check`: passed.
