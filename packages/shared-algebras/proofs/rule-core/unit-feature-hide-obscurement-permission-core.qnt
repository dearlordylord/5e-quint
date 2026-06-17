// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hide-action-obscurement-permission
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureHideObscurementPermissionCore {
  import creatureSizeOrder.* from "./creature-size-order"

  // RAW anchors:
  // - Character-Origins.md: Halfling, Naturally Stealthy.
  // - Rules-Glossary.md: Hide [Action].
  // - Playing-the-Game.md: Hiding.
  // - UBIQUITOUS_LANGUAGE.md: Hide action, Obscurement, Creature, and Size.

  type HideObscurementPermission =
    | NoHideObscurementPermission
    | ObscuredOnlyByLargerCreatureHidePermission

  type HideObscurementPermissionFacts = {
    hiderSize: RuleSize,
    obscuringCreatureSize: RuleSize,
    obscuredOnlyByCreature: bool,
    outOfEnemyLineOfSight: bool,
    permission: HideObscurementPermission,
  }

  pure def hideActionObscurementPermissionAdmitted(
    facts: HideObscurementPermissionFacts,
  ): bool = all {
    facts.permission == ObscuredOnlyByLargerCreatureHidePermission,
    facts.obscuredOnlyByCreature,
    facts.outOfEnemyLineOfSight,
    creatureSizeIsLargerThanSelf(facts.hiderSize, facts.obscuringCreatureSize),
  }
}
