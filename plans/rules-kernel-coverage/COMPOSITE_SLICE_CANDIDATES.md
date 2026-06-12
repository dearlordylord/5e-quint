# Composite Slice Candidates

Prepared for `QNTGR-B12-COMPOSITE-SLICE-CANDIDATES`.

This is a planning artifact only. It does not change reducer behavior, QNT
semantics, or coverage status.

Closeout note 2026-06-12: this candidate list is drained. `QCP-CS1` through
`QCP-CS7` landed as focused MBT witnesses, and `QCP-CS8` carries a recorded
deterministic-replay policy decision. Do not treat this file as a runnable
queue; use current checker-owned artifacts for future planning.

## Current Gate Status

The rules-kernel coverage gate is closed for the checked closeout denominator:

- `REPORT.md` shows 120 obligations, 114 covered obligations, 0 open
  transitional obligations, and 6 boundary or unsupported obligations.
- `profile-obligations.jsonl` has 154 rows and no open `followUpTaskIds` or
  `reason` rows.
- `generator-readiness.jsonl` has 95 rows, all
  `generation-subset-clean`, with no `blockedBy` entries.

The former composite-slice work is therefore not a B/C gate blocker and is no
longer a runnable batch. Future witness-shape deepening should start from
current `obligations.jsonl`, `generator-readiness.jsonl`, and `REPORT.md`
rather than these historical candidate descriptions.

## Selection Rule

Prioritize rows that satisfy all of these:

- The obligation is already `covered` and generator-ready, so the task is not
  discovering new reducer semantics.
- The profile join is already explicit in `profile-obligations.jsonl`.
- The current parity witness is a runtime test or a deterministic replay rather
  than a focused slice MBT.
- The semantic core is already identified in `generator-readiness.jsonl`.
- The task can stay bounded without adding production reducer wiring or
  duplicate runtime state.

Rows that are deterministic projection, character-sheet state, or handoff
coverage are lower priority for this specific composite-slice queue unless a
future lane changes the witness policy.

## Candidate Tasks

### QCP-CS1 - Enlarge/Reduce Creature Size Lifecycle Focused MBT

Input:

- Obligation: `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`
- Profile: `spell.invocation-creature-size-change`
- Semantic core:
  `packages/battle-runtime/battle-runtime-creature-size-change.qnt`,
  `packages/battle-runtime/battle-runtime-concentration.qnt`, and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`
- Current witness:
  `packages/battle-runtime/src/unit-profile-admission-enlarge-reduce.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce`,
  `.references/srd-5.2.1/Playing-the-Game.md#Creature Size`,
  `UBIQUITOUS_LANGUAGE.md#Movement`,
  `UBIQUITOUS_LANGUAGE.md#Advantage and Disadvantage`, and
  `UBIQUITOUS_LANGUAGE.md#Damage`

Output:

- Add a focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-creature-size-change-lifecycle.mbt.qnt`
  and
  `packages/battle-runtime/src/creature-size-change-lifecycle.mbt.test.ts`.
- Cover failed and successful unwilling-target saves, Enlarge and Reduce size
  projection, Strength D20 Test roll modes, attack-hit damage adjustment,
  Concentration cleanup, and duration cleanup.
- Add `test:mbt:creature-size-change-lifecycle` to
  `packages/battle-runtime/package.json`.
- Update `obligations.jsonl` to include the focused MBT witness; refresh
  checker-generated artifacts.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS2 - Levitate Creature Lifecycle Focused MBT

Input:

- Obligation: `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE`
- Profile: `spell.invocation-levitated-creature`
- Semantic core:
  `packages/battle-runtime/battle-runtime-levitate-creature.qnt` and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`
- Current witness:
  `packages/battle-runtime/src/unit-profile-admission-levitate.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate`,
  `.references/srd-5.2.1/Rules-Glossary.md#Climbing`,
  `.references/srd-5.2.1/Rules-Glossary.md#Concentration`,
  `.references/srd-5.2.1/Playing-the-Game.md#Movement and Position`,
  `UBIQUITOUS_LANGUAGE.md#Movement`, and
  `UBIQUITOUS_LANGUAGE.md#Spellcasting`

Output:

- Add a focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-levitated-creature-lifecycle.mbt.qnt`
  and
  `packages/battle-runtime/src/levitated-creature-lifecycle.mbt.test.ts`.
- Cover save-gated suspension, caller-selected altitude, caster Magic Action
  control, witnessed target movement, range-gated control, duration cleanup,
  and Concentration cleanup.
- Keep fixed-object or surface reach, map geometry, and target visibility as
  table-owned facts; do not model route choice.
- Add `test:mbt:levitated-creature-lifecycle` and update the obligation
  witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS3 - Roll Modifier Active Effects Focused MBT

Input:

- Obligation: `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`
- Profiles:
  `spell.invocation-roll-modifier` and
  `spell.invocation-self-ability-check-advantage`
- Semantic core:
  `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt` and
  `packages/battle-runtime/battle-runtime-thaumaturgy.qnt`
- Current witnesses:
  `packages/battle-runtime/src/unit-profile-admission-roll-modifier-and-resistance-spells.test.ts`
  and `packages/battle-runtime/src/thaumaturgy-booming-voice.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Bane`,
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Bless`,
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enhance Ability`,
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Guidance`,
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Pass without Trace`,
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Thaumaturgy`,
  `.references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage`,
  `.references/srd-5.2.1/Playing-the-Game.md#Ability Checks`,
  `UBIQUITOUS_LANGUAGE.md#D20 Rolls`,
  `UBIQUITOUS_LANGUAGE.md#Advantage and Disadvantage`, and
  `UBIQUITOUS_LANGUAGE.md#Spellcasting`

Output:

- Add a focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
  and
  `packages/battle-runtime/src/roll-modifier-active-effects.mbt.test.ts`.
- Cover attack-roll, Saving Throw, Ability Check, and skill-choice roll-mode
  projection, including choice holes that store the selected ability or skill.
- Include Thaumaturgy only if it remains under the same semantic core and the
  MBT stays bounded; otherwise split Thaumaturgy into a separate low-priority
  task.
- Add `test:mbt:roll-modifier-active-effects` and update the obligation
  witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS4 - After-Hit Damage Riders Focused MBT

Input:

- Obligation: `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`
- Profiles:
  `spell.invocation-after-hit-damage`,
  `spell.invocation-after-hit-restraint-turn-start-damage`,
  `spell.invocation-after-hit-timed-damage-save`, and
  `spell.invocation-after-hit-damage-illumination`
- Semantic core:
  `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`,
  `packages/battle-runtime/battle-runtime-spell-invocation.qnt`, and
  `packages/battle-runtime/battle-runtime-concentration.qnt`
- Current witnesses:
  `packages/battle-runtime/src/unit-profile-admission-true-strike-and-divine-smite.test.ts`,
  `packages/battle-runtime/src/unit-profile-admission-ensnaring-and-searing-smite.test.ts`,
  and `packages/battle-runtime/src/unit-profile-admission-shining-smite.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Smite`,
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Ensnaring Strike`,
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Searing Smite`,
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shining Smite`,
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#One Spell with a Spell Slot per Turn`,
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Reaction and Bonus Action Triggers`,
  `.references/srd-5.2.1/Rules-Glossary.md#Concentration`,
  `.references/srd-5.2.1/Rules-Glossary.md#Restrained [Condition]`,
  `.references/srd-5.2.1/Rules-Glossary.md#Bright Light`,
  `UBIQUITOUS_LANGUAGE.md#Riders`,
  `UBIQUITOUS_LANGUAGE.md#Spellcasting`,
  `UBIQUITOUS_LANGUAGE.md#Conditions`,
  `UBIQUITOUS_LANGUAGE.md#Vision and Light`, and
  `UBIQUITOUS_LANGUAGE.md#Damage`

Output:

- Add a focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt`
  and
  `packages/battle-runtime/src/after-hit-damage-riders.mbt.test.ts`.
- Keep the first slice bounded to activation, Spell Slot or free-cast spend,
  immediate hit payloads, Concentration ownership, and cleanup. If timed
  start-turn damage or escape checks push the pure slice over the local size
  budget, split them into a second task.
- Add `test:mbt:after-hit-damage-riders` and update the obligation witness
  list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS5 - Weapon-Hosted Attack And Riders Focused MBT

Input:

- Obligation: `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`
- Profiles:
  `spell.invocation-weapon-damage-rider`,
  `spell.invocation-spell-hosted-weapon-attack`,
  `spell.invocation-weapon-attack-override`, and
  `spell.invocation-magic-weapon-enhancement`
- Semantic core:
  `packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`,
  `packages/battle-runtime/battle-runtime-weapon-attacks.qnt`,
  `packages/battle-runtime/battle-runtime-light.qnt`, and
  `packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- Current witnesses:
  `packages/battle-runtime/src/unit-profile-admission-true-strike-and-divine-smite.test.ts`
  and
  `packages/battle-runtime/src/unit-profile-admission-weapon-override-and-rider-spells.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Favor`,
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Magic Weapon`,
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh`,
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#True Strike`,
  `.references/srd-5.2.1/Rules-Glossary.md#Weapon Attack`,
  `UBIQUITOUS_LANGUAGE.md#Riders`,
  `UBIQUITOUS_LANGUAGE.md#Spellcasting`,
  `UBIQUITOUS_LANGUAGE.md#Combat`, and
  `UBIQUITOUS_LANGUAGE.md#Damage`

Output:

- Add a focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
  and
  `packages/battle-runtime/src/weapon-hosted-attack-and-riders.mbt.test.ts`.
- Cover spellcasting-ability attack and damage replacement, weapon damage-type
  choice, held-weapon override, weapon-hit rider application, and timed cleanup.
- Add `test:mbt:weapon-hosted-attack-and-riders` and update the obligation
  witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS6 - Command Option And Next-Turn Focused MBT

Input:

- Obligation: `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- Profiles:
  `spell.invocation-command-halt-grovel`,
  `spell.invocation-command-drop-held-object`,
  `spell.invocation-command-approach-route`, and
  `spell.invocation-command-flee-route`
- Semantic core:
  `packages/battle-runtime/battle-runtime-command-choice.qnt` and
  `packages/battle-runtime/battle-runtime-ground-command.qnt`
- Current deterministic replay:
  `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts`
  with `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- RAW anchor:
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Command`

Output:

- Add a dedicated focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt`
  and `packages/battle-runtime/src/command-option-next-turn.mbt.test.ts`.
- Cover failed-save pending effect recording, Grovel, Drop, Halt, Approach,
  Flee, accepted/rejected movement fills, end-turn cleanup, and
  Opportunity Attack continuation where the reducer owns the continuation.
- Keep route choice and object inventory as table-owned facts.
- Add `test:mbt:command-option-next-turn` and update the obligation witness
  list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS7 - Ability Check Choice And Search Holes Focused MBT

Input:

- Obligation: `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`
- Semantic core:
  `packages/battle-runtime/battle-runtime-ability-check-search.qnt` and
  `packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`
- Current deterministic replay:
  `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts`
  with `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- RAW and language anchors:
  `.references/srd-5.2.1/Playing-the-Game.md#Ability Checks`,
  `.references/srd-5.2.1/Playing-the-Game.md#Actions`,
  `.references/srd-5.2.1/Rules-Glossary.md#Hide [Action]`,
  `.references/srd-5.2.1/Rules-Glossary.md#Search [Action]`,
  `UBIQUITOUS_LANGUAGE.md#D20 Rolls`, and
  `UBIQUITOUS_LANGUAGE.md#Action Lifecycle`

Output:

- Add a dedicated focused MBT pair, for example
  `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`
  and
  `packages/battle-runtime/src/ability-check-choice-search.mbt.test.ts`.
- Cover Search success/failure against admitted hidden targets, Ability Check
  fill legality, spell-selected skill or ability choices, and stored roll-mode
  projection.
- Add `test:mbt:ability-check-choice-search` and update the obligation witness
  list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### QCP-CS8 - Shove Outcome Focused MBT Policy Upgrade

Input:

- Obligation: `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/shove-outcome.qnt`
- Current deterministic replay:
  `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts` with
  `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- RAW and language anchors:
  `.references/srd-5.2.1/Rules-Glossary.md#Unarmed Strike`,
  `UBIQUITOUS_LANGUAGE.md#Combat`, and `UBIQUITOUS_LANGUAGE.md#Turn Structure`

Output:

- Decision 2026-06-12: keep the deterministic replay; no focused MBT is added.
  `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY` is a direct reducer-entrypoint
  boundary with a closed outcome table, not a state-space search obligation.
  The existing replay covers save success, failed-save Prone, accepted 5-foot
  push, blocked 5-foot push, no-legal-destination 5-foot push, invalid push
  distance rejection, non-Opportunity-Attack push projection, and Attack
  resource spending for accepted versus rejected table facts. The replay uses
  the executable semantic core and the battle-runtime reducer entrypoint, so a
  randomized focused MBT would resample the same closed table rather than add a
  new witness dimension.
- If this boundary grows beyond the closed Shove outcome table, reassess and
  add `test:mbt:shove-outcome` with an updated obligation witness list.

Acceptance:

- Focused MBT green if added; otherwise documented no-op.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

## Non-Candidates For This Queue

The following covered rows currently lack focused MBT but are not good next
composite-slice candidates:

- Character Sheet and Character Battle deterministic projection rows:
  `SHEET.*`, `CREATION.*`, and `CHARACTER.BATTLE.*` rows are better handled by
  their existing deterministic replay and Rust dry-run planning queues.
- `SHARED.HIT_POINTS.POSITIVE_DAMAGE` and
  `SHEET.HP_REST_HIT_DICE.TRANSITIONS` already have deterministic replay and
  are the current Rust dry-run source rows.
- Boundary-only and unsupported rows are intentionally outside reducer-semantic
  composite MBT.

## Closeout

This file has no next Ralph batch recommendation. The former recommendations
were consumed by the portable parity witness lane. Reopen future
composite-slice work only by carving a fresh lane from current checker-owned
inputs.
