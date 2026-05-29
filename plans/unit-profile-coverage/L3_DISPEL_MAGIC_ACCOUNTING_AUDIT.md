# Level 3 Dispel Magic Accounting Audit

Task 26 audited Dispel Magic after the Level 3 spell-list pressure seed. No
runtime behavior changed.

## RAW And Vocabulary Check

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1543` through `:1555`
  defines Dispel Magic as a level 3 Abjuration spell with an Action casting
  time, 120-foot range, Verbal and Somatic components, and Instantaneous
  duration. It targets one creature, object, or magical effect within range,
  ends ongoing spells on the target at or below the cast Spell Slot level, and
  requires a spellcasting ability check against DC 10 plus the spell's level
  for higher-level ongoing spells.
- `.references/srd-5.2.1/Classes/Bard.md:219`,
  `.references/srd-5.2.1/Classes/Cleric.md:210`,
  `.references/srd-5.2.1/Classes/Druid.md:256`,
  `.references/srd-5.2.1/Classes/Paladin.md:212`,
  `.references/srd-5.2.1/Classes/Ranger.md:204`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:304`,
  `.references/srd-5.2.1/Classes/Warlock.md:381`, and
  `.references/srd-5.2.1/Classes/Wizard.md:242` list Dispel Magic in the
  corresponding level 3 spell lists.
- `UBIQUITOUS_LANGUAGE.md` was checked for Magic Action, Spell Definition,
  Spell Access, Spell Invocation, Spell Effect, Spell Slot, Cast Level, Using a
  Higher-Level Spell Slot, Ability Check, and table-supplied witness language.

## Level 3 Inventory Rows

The generated Level 3 spell-list pressure rows for Dispel Magic are already
accepted with owner evidence:

- Bard spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:388`
- Cleric spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:409`
- Druid spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:425`
- Paladin spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:437`
- Ranger spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:443`
- Sorcerer spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:457`
- Warlock spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:475`
- Wizard spell list Dispel Magic:
  `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md:490`

All eight rows point at the installed SRD Surface record
`packages/surface/content/dispel_magic.json` and the supported subset profile
`spell.invocation-ongoing-spell-ending`.

## Accounting Result

No missing profile, evidence, or rules-kernel accounting was found.

- Surface: `packages/surface/content/dispel_magic.json` carries the SRD
  provenance, level 3 spell definition, Magic Action casting shape, 120-foot
  range, shared creature/object/magical-effect target hole, ongoing-spell
  ending effect, spellcasting ability check gate, and higher-slot automatic
  branch.
- Unit claim: `plans/unit-profile-coverage/unit-claims.jsonl` classifies
  `dispel_magic` as `profile-subset-supported` for
  `spell.invocation-ongoing-spell-ending`, with broader not-yet-tracked ongoing
  Spell Effects split to `L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL`
  and geometry or magical-effect identity derivation closed to the table
  witness boundary.
- Deterministic admission/projection evidence:
  `plans/unit-profile-coverage/unit-evidence.jsonl` records
  `L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING` evidence at
  `packages/battle-runtime/src/unit-profile-admission-dispel-magic.test.ts`.
- Profile ownership:
  `plans/unit-profile-coverage/profiles.jsonl` identifies the promoted Quint
  and runtime owners, keeps target/range facts table-supplied, and limits
  executable support to tracked spell-light emitters plus tracked
  `spellObjectContactDamage` active-effect occurrences.
- Proof and runtime parity evidence:
  `plans/unit-profile-coverage/task-claims.jsonl` records qnt-proof and
  completed runtime parity claims for tracked spell-light emitter ending and
  tracked object-contact active-effect occurrence ending, including
  higher-level ability-check gates, higher-slot automatic ending,
  same-object multi-owner cleanup, and magical-effect targeting by stable
  occurrence identity.
- Rules-kernel join:
  `plans/rules-kernel-coverage/profile-obligations.jsonl` maps
  `spell.invocation-ongoing-spell-ending` to
  `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`.
- Rules-kernel obligation evidence:
  `plans/rules-kernel-coverage/obligations.jsonl` marks the Dispel Magic
  ongoing spell ending obligation covered, cites local RAW and ubiquitous
  language evidence, and names `packages/battle-runtime/battle-runtime.qnt`,
  `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/ongoing-spell-end.ts`,
  and `packages/battle-runtime/src/unit-profile-admission-dispel-magic.test.ts`
  as owners or witness.
- Generated reports:
  `plans/unit-profile-coverage/UNIT_REPORT.md` includes `dispel_magic` as a
  covered supported Unit with the existing precise deferred mechanics, and
  `plans/rules-kernel-coverage/REPORT.md` includes the joined covered
  Dispel Magic obligation.

## Decision

Task 26 lands as an existing supported subset with the broader ongoing Spell
Effect work already split to
`L12G-FOLLOWUP-BROADER-ONGOING-SPELL-EFFECT-DISPEL`. The current accounting is
sufficient for the Level 3 Dispel Magic rows, so no new runtime code, generated
matrix edits, or additional follow-up task split is required.

This audit did not introduce companion control, autonomous behavior, authored
identity dispatch, duplicate state, or reducer behavior changes.

## Reviewer-Loop Convergence

- Round 1: checked RAW and ubiquitous language against the existing Surface,
  profile, evidence, and rules-kernel claims. The supported subset matches the
  SRD ongoing-spell ending gate for currently tracked ongoing Spell Effect
  carriers and leaves untracked effects as an explicit follow-up.
- Round 2: checked architecture and connascence. The strong coupling between
  Surface shape, supported profile id, task claims, runtime owner markers, and
  rules-kernel obligations is explicit in checker-readable JSONL and generated
  reports; the runtime has one ongoing spell ending owner rather than a
  parallel remover registry.
- Round 3: code-review pass found no reasonable Task 26 findings. Because the
  task changed only accounting documentation and plan status, focused coverage
  checks are sufficient and MBT is not required.

## Verification For Implementation

- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
