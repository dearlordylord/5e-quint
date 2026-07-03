# L5 Ultra-Golden MCP Vertical Decision

Task: `L5UG-MCP-01-LEVEL5-VERTICAL-DECISION`

Date: 2026-07-03

## Decision

Use one primary scenario:
`create-level-five-wizard-fireball-and-battle-handoff`.

The scenario creates an Elf Soldier Wizard 5, selects the SRD Evoker subclass
only because it is the existing SRD Wizard subclass path exposed by the current
creation catalog, puts `fireball` in the Wizard spellbook and prepared Spell
Access, verifies the durable Character Sheet Spell Slot projection, starts a
battle from that finalized character, and discovers or resolves Fireball through
the returned battle act holes.

This is the smallest honest level-5 MCP vertical because the initial MCP
creation manifest already exposes Wizard 5, the existing level-3 and level-4
MCP Wizard scenarios provide the closest reusable shape, and `fireball` is an
installed, supported, level-3 SRD spell with existing deterministic admission
and selected-identity evidence. The scenario proves the new level-5 full-caster
surface without adding a second class path or relying on unsupported level-5
feature behavior.

## RAW And Vocabulary Check

Local RAW anchors read:

- `.references/srd-5.2.1/Classes/Wizard.md:34-39`: Wizard level 5 has
  Proficiency Bonus +3, Memorize Spell, 4 cantrips, 9 prepared spells, four
  level-1 Spell Slots, three level-2 Spell Slots, and two level-3 Spell Slots.
- `.references/srd-5.2.1/Classes/Wizard.md:64-70`: the Wizard spellbook
  contains level 1+ Wizard spells, adds two Wizard spells whenever the character
  gains a Wizard level after 1, and each added spell must be of a level for
  which the Wizard has Spell Slots.
- `.references/srd-5.2.1/Classes/Wizard.md:108-110`: Wizard level 3 chooses a
  subclass; the existing SRD catalog path exposes Evoker.
- `.references/srd-5.2.1/Classes/Wizard.md:116-118`: Memorize Spell is the
  level-5 Wizard feature, but this vertical does not exercise the Short Rest
  prepared-spell replacement.
- `.references/srd-5.2.1/Classes/Wizard.md:233-244`: Fireball is on the level
  3 Wizard spell list.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:418-431`: Fireball is a
  level 3 Evocation spell for Sorcerer and Wizard, has Action casting time,
  150-foot range, V/S/M components, instantaneous duration, a 20-foot-radius
  Sphere, Dexterity Saving Throws for 8d6 Fire damage or half damage, unattended
  flammable-object ignition, and higher-slot damage scaling.
- `UBIQUITOUS_LANGUAGE.md:32`, `UBIQUITOUS_LANGUAGE.md:230`, and
  `UBIQUITOUS_LANGUAGE.md:245-248`: use Magic Action, Spell Slot, Spell
  Definition, Spell Access, Spell Invocation, and Spell Effect with their
  project meanings.

## Owner Boundaries

The vertical depends on already-supported owners:

- `class_wizard` owns the Wizard spellcasting creation facts, including level
  1-5 spellbook choices, prepared Spell Access, and Spell Slot table facts.
- Character Creation owns returned progression, subclass, cantrip, spellbook,
  prepared-spell, equipment, and loadout holes; the scenario must fill only
  hole ids and option ids returned by MCP.
- Character Sheet owns durable Spell Slot projection from finalized Wizard
  Spell Access and class table facts. Expected pre-battle `spellSlots`:
  `[{ spellLevel: 1, count: 4, expended: 0 }, { spellLevel: 2, count: 3,
  expended: 0 }, { spellLevel: 3, count: 2, expended: 0 }]`.
- Character-battle handoff owns projection of the finalized character's Spell
  Slots into the battle combatant origin, with the same 4/3/2 counts before any
  spell is cast.
- `fireball` owns the selected level-3 Spell Definition runtime behavior through
  `spell.invocation-damage-save-or-attack`, with deterministic admission
  evidence in `packages/battle-runtime/src/unit-profile-admission-damage-spells.test.ts`
  and selected-identity evidence in
  `packages/battle-runtime/src/fireball-selected-identity.mbt.test.ts`.

The vertical must not depend on these future-owner boundaries:

- `wizard_memorize_spell`: do not require Short Rest prepared-spell replacement,
  a Memorize Spell action, or any new prepared-spell state.
- `wizard_evocation_savant` new Spell Slot level grant: do not require the
  level-5 one-spell Evocation addition. The scenario may keep the existing
  level-3 acquisition-time Evocation Savant choices if current creation holes
  require them, but it must not assert that the later grant fires.
- Any unsupported or table-only level-3 spell identities such as `blink`,
  `magic_circle`, `phantom_steed`, `tiny_hut`, or other future-owner spells.

## Scenario Shape

Task 6 should add the creation and sheet part:

1. Read `describe_mcp_workflow` and `list_catalog_units`, following the existing
   level-4 Wizard scenario pattern.
2. Create a draft and select the returned Wizard 5 progression option
   `12:class_wizard|12:class_wizard|12:class_wizard|12:class_wizard|12:class_wizard:level_5:fixed_hp_gain`
   from the initial progression hole.
3. Select returned holes for Elf, Soldier, ability scores, languages, alignment,
   Wizard subclass, Wizard cantrips, Wizard spellbook, Wizard prepared spells,
   equipment, loadout, and any current Wizard feature holes.
4. Include `fireball` in both the spellbook and prepared-spell selections.
   Prefer one additional supported level-3 Wizard spell such as
   `lightning_bolt` or `counterspell` for the second level-5 spellbook
   addition, but do not make that second spell the scenario behavior under
   test.
5. Finalize only after `discover_creation_holes` returns no holes.
6. Assert the finalized build and `list_characters` durable Character Sheet
   expose Wizard 5, Fireball Spell Access through the spellbook/prepared-spell
   projection, and Spell Slots 4/3/2 with zero expenditure.

Task 7 should extend the same finalized character through battle:

1. Start battle from the Task 6 Character Sheet `characterId` and an SRD Stat
   Block. The test may supply stable `battleId` and `combatantId` request
   values, then must follow the battle id, combatant ids, subjects, and holes
   returned by later MCP responses.
2. Assert the returned battle snapshot projects the Wizard combatant with the
   same level-1, level-2, and level-3 Spell Slot counts.
3. Call `discover_battle_acts` and find the Fireball act from the returned act
   label or subject payload. Do not branch runtime behavior on the spell id in
   production code.
4. If exercising Fireball, fill the returned `savingThrowOutcome` hole with a
   caller-supplied `fireballArea` including the affected target ids and explicit
   `objectIgnitionFacts` (empty if the table says no unattended flammable
   objects are in the Sphere). Then fill the returned `rolledDice` hole.
5. Assert the result spends one level-3 Spell Slot. Expected post-Fireball
   battle slot projection:
   `[{ spellLevel: 1, count: 4, expended: 0 }, { spellLevel: 2, count: 3,
   expended: 0 }, { spellLevel: 3, count: 2, expended: 1 }]`.

## Alternatives Rejected

- Sorcerer 5 with Fireball: rejected for this queue because the current MCP
  initial creation manifest exposes Wizard 5 but not Sorcerer 5. Choosing
  Sorcerer would add scenario plumbing before proving the existing level-5 MCP
  surface.
- Wizard 5 with Memorize Spell: rejected because Memorize Spell is explicitly
  a future Character Sheet prepared-spell replacement owner. It would turn a
  vertical evidence task into a new rule-owner task.
- Wizard 5 requiring the Evocation Savant level-5 new-slot grant: rejected
  because that later grant is parked as
  `L12G-FOLLOWUP-WIZARD-EVOCATION-SAVANT-NEW-SLOT-LEVEL` and must not block
  this MCP evidence lane.
- Fighter 5 Extra Attack: rejected because it is a clean level-5 battle path
  but cannot prove level-3 spell access or the full-caster Spell Slot handoff.
- Paladin or Ranger 5: rejected because their level-5 Spell Slot progression
  reaches level 2, not level 3, and their level-5 companion/free-cast boundaries
  have future-owner considerations.
- Level-3 unsupported or table-heavy spells such as Blink, Magic Circle, and
  Phantom Steed: rejected because they depend on future planar, spatial,
  companion, object, or table owners and would not satisfy the "already
  supported level-5 behavior" constraint.

## Verification Notes

- RAW traceability: checked the Wizard table, Wizard spellbook progression,
  Wizard subclass, Wizard Memorize Spell, Wizard level-3 spell list, and
  Fireball spell description anchors listed above.
- Ubiquitous-language check: the document uses Character Sheet, Spell Slot,
  Spell Access, Spell Definition, Spell Invocation, Spell Effect, Magic Action,
  and Saving Throw in the project sense.
- Architecture and connascence check: the scenario threads existing MCP-returned
  holes, Character Sheet slot owners, character-battle handoff, and Fireball
  invocation owners. It does not introduce duplicate Spell Slot, prepared-spell,
  spellbook, Evocation Savant, or object/spatial state.
- No runtime, QNT, MBT, generated report, or scenario registry file changed in
  this task. `git diff --check` is the appropriate task verification.

## Reviewer Loop Convergence

- Round 1 RAW/ubiquitous-language pass: the selected Wizard 5 and Fireball
  anchors trace to local SRD 5.2.1 text and project vocabulary. The review
  rejected requiring Memorize Spell or the Evocation Savant later grant because
  those are future-owner boundaries.
- Round 1 architecture/connascence pass: the only strong couplings are the
  level-5 Spell Slot counts, the Fireball Unit id, and the Fireball battle
  hole sequence. They are localized in this artifact and point to existing
  owners rather than duplicating state.
- Round 2 code-review pass: fixed wording that implied `start_battle` returns
  setup ids before the request. No remaining reasonable findings.

## Plan Impact

- Task 6 should use this artifact as its acceptance target and can unblock when
  Task 5 is accepted.
- Task 7 should use this artifact as its battle-handoff and Fireball acceptance
  target and remains blocked on Task 6 completion.
- No new prerequisite task is required for the chosen vertical.
