// Opportunity attack resolution extracted from turn-end-movement.ts.

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import type { BattleReactionTrigger } from "../battle-reaction-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import {
  attackDamageDispositionHole,
  attackDamageHole,
  damageDispositionFillValidation,
} from "./attack-damage-apply.ts";
import { attackFillSet } from "./attack-fill-set.ts";
import {
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  criticalThresholdForAttack,
  validateAttackDamageFill,
} from "./attack-resolution.ts";
import {
  attackRollHole,
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  attackDamageByTypeEntries,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  fixedAttackDamageAmount,
  fixedAttackDamageByTypeEntries,
  ongoingFeatureDamageModifier,
} from "./damage-helpers.ts";
import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
  maybeOpenReactionWindow,
  snapshotBattle,
} from "./dispatcher.ts";
import { needsHolesResult, revealHidden } from "./hole-helpers.ts";
import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  opportunityAttackOptionForReactor,
} from "./movement-speed.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  attackActionOptionName,
  attackPotentialDamageTypes,
  eligibleAttackDamageRiders,
  eligibleWeaponDamageDiceRollChoiceUnitIds,
  selectedAttackDamageRiders,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import type {
  BattleAttackDamageEvent,
  BattlePendingAttackDamageReduction,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-reducer.ts";

export function resolveOpportunityAttackCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >
  > & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
    readonly pendingAttackDamageReductions?:
      | readonly BattlePendingAttackDamageReduction[]
      | undefined;
  },
): BattleResolutionResult {
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const subject = input.subject;
  const target = input.state.combatants.get(subject.targetId);
  const attack = opportunityAttackOptionForReactor(
    input.state,
    subject.reactorId,
    subject.targetId,
    subject.attackName,
  );
  if (target === undefined || attack === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Opportunity Attack is no longer available.",
    );
  }
  if (attackActionOptionName(attack) !== subject.attackName) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Opportunity Attack requires the selected melee attack option.",
    );
  }
  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack target is fixed by the movement trigger.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    subject.reactorId,
    subject.targetId,
    attack,
    fillSet.targetSpatialFacts,
  );
  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack roll must be filled before damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(subject.reactorId),
        attack,
        requiredRollMode,
      ),
    ]);
  }
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll mode does not match the current attack-roll rule.",
    );
  }
  const attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, subject.reactorId),
      subject.reactorId,
      subject.targetId,
      null,
    ),
    subject.reactorId,
    subject.targetId,
  );
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(subject.reactorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const critical = attackRollIsCriticalHit(
    fillSet.attackRoll,
    criticalThreshold,
  );
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        subject.reactorId,
        subject.targetId,
        attack,
        fillSet.attackRoll,
        [],
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        subject.reactorId,
        attack,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        attack,
      )
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        subject.targetId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  if (hit && input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        attackRoll: fillSet.attackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        attackHitTriggerKind: attackHitTriggerKind(attack),
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsThroughAttackRoll(input.fills),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (!hit && (fillSet.damageRoll != null || fillSet.damageDispositionFilled)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      snapshot: snapshotBattle(attackRolledState),
    };
  }
  const fixedDamageAmount =
    spellMarkedDamageRiders.length > 0 || spellWeaponDamageRiders.length > 0
      ? null
      : fixedAttackDamageAmount(
          attackRolledState.combatants.get(subject.reactorId),
          target,
          attack,
        );
  if (fixedDamageAmount !== null) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack Fixed Unarmed Strike damage does not use a rolled damage fill.",
      );
    }
    const fixedDamageByTypeBeforeTargetAdjustments =
      fixedAttackDamageByTypeEntries(
        attackRolledState.combatants.get(subject.reactorId),
        attack,
      );
    if (fixedDamageByTypeBeforeTargetAdjustments === null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack fixed damage is no longer available.",
      );
    }
    const damageEvent = {
      kind: "aggregateDamage" as const,
      damageByTypeBeforeTargetAdjustments:
        fixedDamageByTypeBeforeTargetAdjustments,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: subject.reactorId,
      target: spellReduction.target,
      damageAmount: reducedFixedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      spellReducedState,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: subject.reactorId,
          targetId: subject.targetId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          concentrationSavingThrows: fillSet.concentrationSavingThrows,
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: [],
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      return attackDamageReactionWindow;
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedFixedDamageAmount,
    );
    const primaryConcentrationSavingThrow =
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            fillSet.concentrationSavingThrows,
            concentrationSave,
          );
    const concentrationSaveCheck =
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: spellReducedState,
        target: spellReduction.target,
        damageAmount: reducedFixedDamageAmount,
        fills: fillSet.concentrationSavingThrows,
      });
    if (concentrationSaveCheck.tag === "needsHoles") {
      return needsHolesResult(spellReducedState, input.subject, [
        ...concentrationSaveCheck.holes,
      ]);
    }
    if (concentrationSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
    const hideousLaughterSaveCheck =
      damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: spellReducedState,
        target: spellReduction.target,
        damageAmount: reducedFixedDamageAmount,
        fills: fillSet.hideousLaughterDamageRepeatSaves,
      });
    if (hideousLaughterSaveCheck.tag === "needsHoles") {
      return needsHolesResult(spellReducedState, input.subject, [
        ...hideousLaughterSaveCheck.holes,
      ]);
    }
    if (hideousLaughterSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      );
    }
    const nextState = applyAttackDamageAmount(
      spellReducedState,
      subject.reactorId,
      subject.targetId,
      reducedFixedDamageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      [],
      undefined,
      primaryConcentrationSavingThrow,
      fillSet.hideousLaughterDamageRepeatSaves,
      fillSet.concentrationSavingThrows,
    );
    const reactionWindow = maybeOpenReactionWindow(
      nextState,
      {
        trigger: "afterDamage",
        damageSourceId: subject.reactorId,
        damagedId: subject.targetId,
        damageAmount: reducedFixedDamageAmount,
        reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
          facts: fillSet.targetSpatialFacts,
          damagedId: subject.targetId,
          damageSourceId: subject.reactorId,
        }),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        fillSet.attackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(subject.reactorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
      ),
    ]);
  }
  const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
    eligibleDamageDiceChoiceUnitIds,
    fillSet.damageRoll.weaponDamageDiceRollChoice,
  );
  const damageValidation = validateAttackDamageFill(
    fillSet.damageRoll,
    attack,
    critical,
    fillSet.attackRoll,
    eligibleDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    ongoingFeatureDamageModifier(
      attackRolledState.combatants.get(subject.reactorId),
      attack,
    ),
    eligibleDamageDiceChoiceUnitIds,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const damageRollByType = attackDamageByTypeEntries(
    attackRolledState.combatants.get(subject.reactorId),
    attack,
    fillSet.damageRoll,
    critical,
    fillSet.attackRoll,
    selectedDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType,
  } satisfies BattleAttackDamageEvent;
  const reducedDamageEvent = attackDamageEventAfterPendingReductions(
    damageEvent,
    pendingAttackDamageReductions,
  );
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    damageAmountByTypeEntriesToMap(
      attackDamageEventEntries(reducedDamageEvent),
    ),
    fillSet.spellDamageReductionRoll,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
    reducedDamageEvent,
    damageAmountByTypeMapEntries(spellReduction.damageByType),
  );
  const spellReducedState = {
    ...attackRolledState,
    combatants: new Map(attackRolledState.combatants).set(
      target.combatantId,
      spellReduction.target,
    ),
  };
  const reducedDamageAmount = attackDamageEventAmountForTarget(
    spellReduction.target,
    reducedDamageEventAfterSpellReduction,
  );
  const damageDispositionHole = attackDamageDispositionHole({
    attack,
    attackerId: subject.reactorId,
    target: spellReduction.target,
    damageAmount: reducedDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillValidation({
    hole: damageDispositionHole,
    filled: fillSet.damageDispositionFilled,
    value: fillSet.damageDisposition,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (damageDispositionHole !== null) {
    if (!fillSet.damageDispositionFilled) {
      return needsHolesResult(attackRolledState, input.subject, [
        damageDispositionHole,
      ]);
    }
  }
  const attackDamageReactionWindow = maybeOpenReactionWindow(
    spellReducedState,
    {
      trigger: "attackDamage",
      continuation: {
        kind: "attackDamage",
        subject: input.subject,
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        damageEvent: reducedDamageEventAfterSpellReduction,
        fills: attackDamagePrefixFills(input.fills),
        concentrationSavingThrows: fillSet.concentrationSavingThrows,
        deathFailuresAtZeroHp: critical ? 2 : 1,
        damageDisposition: fillSet.damageDisposition,
        attackDamageRiders: selectedDamageRiders,
        ...(selectedDamageDiceChoice === null
          ? {}
          : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
      },
    },
    input.suppressedReactionTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return attackDamageReactionWindow;
  }
  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    reducedDamageAmount,
  );
  const primaryConcentrationSavingThrow =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: spellReducedState,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellReducedState, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  if (concentrationSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: spellReducedState,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
      fills: fillSet.hideousLaughterDamageRepeatSaves,
    });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellReducedState, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  if (hideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  const nextState = applyAttackDamageAmount(
    spellReducedState,
    subject.reactorId,
    subject.targetId,
    reducedDamageAmount,
    critical ? 2 : 1,
    fillSet.damageDisposition,
    selectedDamageRiders,
    selectedDamageDiceChoice ?? undefined,
    primaryConcentrationSavingThrow,
    fillSet.hideousLaughterDamageRepeatSaves,
    fillSet.concentrationSavingThrows,
  );
  const reactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.reactorId,
      damagedId: subject.targetId,
      damageAmount: reducedDamageAmount,
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: fillSet.targetSpatialFacts,
        damagedId: subject.targetId,
        damageSourceId: subject.reactorId,
      }),
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (reactionWindow !== null) {
    return reactionWindow;
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
