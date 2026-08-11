// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.READIED_RESPONSE_PROCEDURE

module spellReadiedTargetDomain {
  // RAW anchors:
  // - Rules-Glossary.md: Ready [Action] and Spell Attack.
  // - Spells/Descriptions-E-L.md: Fire Bolt.
  // - UBIQUITOUS_LANGUAGE.md: Readied Spell Response and Spell Invocation.

  // A creature-or-object spell chooses its release domain once.  Keeping the
  // alternatives in one union prevents a release from carrying both target
  // records as if they were independent choices.
  type ReadiedSpellTargetDomain =
    | ReadiedSpellCreatureTarget
    | ReadiedSpellObjectTarget

  type ReadiedSpellTargetSelection =
    | NoReadiedSpellTargetSelection
    | ReadiedSpellTargetSelected({ domain: ReadiedSpellTargetDomain })
    | ConflictingReadiedSpellTargetSelection

  pure def readiedSpellTargetSelection(
    creatureTargetSelected: bool,
    objectTargetSelected: bool,
  ): ReadiedSpellTargetSelection =
    if (creatureTargetSelected and objectTargetSelected) {
      ConflictingReadiedSpellTargetSelection
    } else if (creatureTargetSelected) {
      ReadiedSpellTargetSelected({ domain: ReadiedSpellCreatureTarget })
    } else if (objectTargetSelected) {
      ReadiedSpellTargetSelected({ domain: ReadiedSpellObjectTarget })
    } else {
      NoReadiedSpellTargetSelection
    }

  pure def readiedSpellTargetSelectionLabel(
    selection: ReadiedSpellTargetSelection,
  ): str = match selection {
    | NoReadiedSpellTargetSelection => "none"
    | ReadiedSpellTargetSelected(data) => match data.domain {
        | ReadiedSpellCreatureTarget => "creature"
        | ReadiedSpellObjectTarget => "object"
      }
    | ConflictingReadiedSpellTargetSelection => "invalid"
  }
}
