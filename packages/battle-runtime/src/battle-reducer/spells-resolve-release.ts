// Held-light, rider, ready, and release spell resolution extracted from spells-resolve.ts.

import { spendAction, spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { Either } from "effect";
import {
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleResolutionResult,
  type BonusActionSpellBattleResolutionInput,
  type ReadiedSpellInvocation,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiderEffect,
  activeMarkedDamageRiders,
} from "./damage-helpers.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applyHeldLightSpellEffect,
  applyMarkedDamageRiderSpellEffect,
  applySpellActiveEffects,
  applySpellDamage,
  spellAttackRollHole,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import {
  markSpellSlotExpendedThisTurn,
} from "./spells-profiles.ts";
import {
  clearPendingAttackRollMissToHitReplacementSelection,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "./spells-resolve-resources.ts";
import { resolveChainedSpellAttackDamageAct } from "./spells-resolve-chained.ts";
import { resolvePreparedSlotSpellRelease } from "./spells-resolve-prepared-slot.ts";
import { resolveSaveGateDamageSpellRelease } from "./spells-resolve-save-gates.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

export function resolveHeldLightSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLight" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Held light spells do not use target, roll, damage, or save fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.actorId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyHeldLightSpellEffect(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveWeaponDamageRiderSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponDamageRider" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon damage rider spells do not use target, roll, damage, or save fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.actorId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Bonus Action spell actor is not in this battle.",
    );
  }
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponDamageRider" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    input.invocation.activeEffect,
  ];
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects,
    }),
  };
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveMarkedDamageRiderSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked damage rider spells use one target fill.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (input.invocation.action === "transfer") {
    const activeMark = activeMarkedDamageRiderEffect(
      input.input.state.combatants.get(input.actorId),
      input.invocation.spell.id,
    );
    if (activeMark === null || !activeMark.transferAvailable) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Hunter's Mark can move only after the marked target drops to 0 Hit Points.",
      );
    }
  }
  if (input.invocation.action === "cast") {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "spellCast",
        casterId: input.actorId,
        spellId: input.invocation.spell.id,
        targetIds: [input.fillSet.targetId],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  if (input.invocation.action === "transfer") {
    const nextState = applyMarkedDamageRiderSpellEffect(
      {
        ...input.input.state,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.right,
            input.actorId,
          ),
      },
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const slotted = expendSpellSlot(
    {
      ...concentrationBase,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        slotTurnResources.right,
        input.actorId,
      ),
    },
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const effected = applyMarkedDamageRiderSpellEffect(
    slotted,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
  );
  const nextState = startSpellEffectConcentration(
    effected,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveReadySpellAct(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell does not accept release-time fills.",
    );
  }
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  if (input.subject.mode.tag !== "ready") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready Spell requires a selected Reaction trigger.",
    );
  }

  const afterPriorConcentration = breakBattleConcentration(
    input.state,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        invocation,
        trigger: input.subject.mode.trigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.resource.tag === "spellSlot"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.resource.slotLevel,
        )
      : withConcentration;
  const nextTurnResources =
    invocation.resource.tag === "spellSlot"
      ? markSpellSlotExpendedThisTurn(spent.right)
      : Either.right(spent.right);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input,
      actorId: input.subject.actorId,
      invocation,
      opensSpellCastReactionWindow: false,
      spendsCastResources: false,
    });
  }
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  if (invocation.procedure === "spellAttackDamage") {
    const requiredRollMode = requiredAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(
          input.state,
          input.subject.actorId,
          invocation,
          requiredRollMode,
        ),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const ordinaryHit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: input.state,
      subject: input.subject,
      attackerId: input.subject.actorId,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
      ordinaryHit,
    });
    if (
      fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
      missToHitReplacement === null
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    const releaseAttackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          input.state,
          input.subject.actorId,
          target.combatantId,
          null,
        ),
        input.subject.actorId,
        target.combatantId,
      ),
      input.subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
      },
    );
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          releaseAttackRolledState.combatants.get(input.subject.actorId),
          target.combatantId,
        )
      : [];
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(releaseAttackRolledState, input.subject, [
        spellDamageHole(invocation, critical, spellMarkedDamageRiders),
      ]);
    }
    if (
      !hit &&
      (fillSet.damageRoll != null || fillSet.damageDispositions.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return {
        tag: "resolved",
        state: releaseAttackRolledState,
        snapshot: snapshotBattle(releaseAttackRolledState),
      };
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const critical =
    invocation.procedure === "spellAttackDamage" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellDamageAmount = spellDamageAmountForTarget(
    target,
    invocation,
    fillSet.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(input.state, input.subject, [concentrationSave]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.actorId,
    target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      damageDispositionHole,
    ]);
  }
  const releaseResolutionState =
    invocation.procedure === "spellAttackDamage" && fillSet.attackRoll != null
      ? recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              input.state,
              input.subject.actorId,
              target.combatantId,
              null,
            ),
            input.subject.actorId,
            target.combatantId,
          ),
          input.subject.actorId,
          selectedAttackRollMissToHitReplacement({
            state: input.state,
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
            ordinaryHit: attackRollHits(
              fillSet.attackRoll,
              currentArmorClass(activeEffectArmorClass(target)),
            ),
          }),
          {
            subject: input.subject,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
          },
        )
      : input.state;
  const damaged = applySpellDamage(
    releaseResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
    "full",
    damageDispositionForTarget(
      damageDispositionHole === null ? [] : [damageDispositionHole],
      fillSet.damageDispositions,
      target.combatantId,
    ),
    spellMarkedDamageRiders,
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  const resolvedState = {
    ...effected,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      effected.currentTurnResources,
      input.subject.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}
