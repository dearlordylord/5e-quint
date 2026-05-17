// Prepared-slot repeated-damage-allocation spell resolution extracted from spells-resolve.ts.

import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import { Either } from "effect";
import {
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleFill,
  type BattleHoleId,
  type BattleResolutionResult,
  type BattleSpellTargetAllocationSpatialFact,
  type BattleTargetSpatialFact,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import {
  hideousLaughterDamageRepeatSaveFillCheck,
  hideousLaughterDamageRepeatSaveFillsForTarget,
} from "./hideous-laughter-repeat-save.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import {
  battleStateAfterSanctuaryEarlyEndForActor,
  sanctuaryTargetingInterdictionCheck,
} from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  repeatedDamageAllocationSpellDamageAmount,
  spellDamageHole,
  spellTargetAllocationHole,
  validatePreparedSlotSpellDamageGroups,
  validateSpellDamageFill,
  validateSpellTargetAllocation,
} from "./spells-holes-fills.ts";
import { markSpellSlotExpendedThisTurn } from "./spells-profiles.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export function resolvePreparedSlotSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  return resolvePreparedSlotSpellAct({
    ...input,
    opensSpellCastReactionWindow: false,
    spendsCastResources: false,
    opensAfterDamageReactionWindow: false,
  });
}

export function resolvePreparedSlotSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
  readonly opensAfterDamageReactionWindow?: boolean;
}): BattleResolutionResult {
  const allocationHole = spellTargetAllocationHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Repeated-damage slot spells use spell target allocation fills, not a single-target fill.",
    );
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} does not use an attack roll.`,
    );
  }
  if (input.fillSet.targetAllocation === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      allocationHole,
    ]);
  }
  const targetAllocation = input.fillSet.targetAllocation;
  const allocationValidation = validateSpellTargetAllocation(
    input.input.state,
    input.actorId,
    input.invocation,
    targetAllocation.allocations,
    targetAllocation.spatialFacts,
  );
  if (allocationValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      allocationValidation,
    );
  }

  for (const allocation of targetAllocation.allocations) {
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: input.input.state,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: allocation.targetId,
      triggeringTargetEventId: allocationHole.holeId,
      fills: input.input.fills,
    });
    if (sanctuaryCheck.tag === "notWarded") {
      continue;
    }
    if (sanctuaryCheck.tag === "saveSucceeded") {
      continue;
    }
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
        sanctuaryCheck.hole,
      ]);
    }
    if (sanctuaryCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        sanctuaryCheck.message,
      );
    }
    if (sanctuaryCheck.tag === "lost") {
      return input.spendsCastResources === false
        ? {
            tag: "resolved",
            state: input.input.state,
            snapshot: snapshotBattle(input.input.state),
          }
        : spendSpellCastResources({
            state: input.input.state,
            actorId: input.actorId,
            invocation: input.invocation,
            errorState: input.input.state,
          });
    }

    const replacementFacts = spellAllocationSpatialFacts(
      sanctuaryCheck.spatialFacts,
    );
    if (replacementFacts === null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement Magic Missile target must include allocation-compatible spell target facts.",
      );
    }
    const replacementTarget = input.input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
    if (replacementTarget === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement Magic Missile target must be a combatant in this battle.",
      );
    }
    const originalAllocationFill = input.input.fills.find(
      (
        fill,
      ): fill is Extract<
        BattleFill,
        { readonly kind: "spellTargetAllocation" }
      > =>
        fill.kind === "spellTargetAllocation" &&
        fill.holeId === allocationHole.holeId,
    );
    if (originalAllocationFill === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement requires the original Magic Missile allocation fill.",
      );
    }
    const allocationCounts = new Map<CombatantId, number>();
    for (const currentAllocation of targetAllocation.allocations) {
      const targetId =
        currentAllocation.targetId === allocation.targetId
          ? replacementTarget.combatantId
          : currentAllocation.targetId;
      allocationCounts.set(
        targetId,
        (allocationCounts.get(targetId) ?? 0) + currentAllocation.count,
      );
    }
    const allocations = Array.from(allocationCounts, ([targetId, count]) => ({
      targetId,
      count,
    }));
    const spatialFacts = [
      ...originalAllocationFill.spatialFacts.filter(
        (fact) =>
          fact.kind !== "spellTarget" || fact.targetId !== allocation.targetId,
      ),
      ...replacementFacts,
    ];
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalAllocationFill
            ? {
                ...fill,
                value: { allocations },
                spatialFacts,
              }
            : fill,
      );
    const fillSet = spellFillSet(fills, input.invocation);
    if (fillSet.tag === "invalid") {
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    return resolvePreparedSlotSpellAct({
      ...input,
      input: { ...input.input, fills },
      fillSet,
    });
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      spellCastReactionFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: targetAllocation.allocations.map(
          (allocation) => allocation.targetId,
        ),
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource: { kind: "magicAction" },
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      }),
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation =
    validateSpellDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
      false,
    ) ??
    validatePreparedSlotSpellDamageGroups(
      input.fillSet.damageRoll,
      targetAllocation.allocations,
    );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return [];
      }
      const damageAmount = repeatedDamageAllocationSpellDamageAmount(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const hole = concentrationSavingThrowHole(target, damageAmount);
      return hole === null ? [] : [hole];
    },
  );
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHoles = targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return [];
      }
      const damageAmount = repeatedDamageAllocationSpellDamageAmount(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const hole = zeroHitPointReplacementDispositionHole({
        damageSourceId: input.actorId,
        target,
        damageAmount,
      });
      return hole === null ? [] : [hole];
    },
  );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }
  const hideousLaughterSaveChecks = targetAllocation.allocations.map(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      return hideousLaughterDamageRepeatSaveFillCheck({
        target,
        damageAmount: repeatedDamageAllocationSpellDamageAmount(
          target,
          input.invocation,
          input.fillSet.damageRoll!,
          allocationIndex,
          allocation.count,
        ),
        fills: hideousLaughterDamageRepeatSaveFillsForTarget(
          target,
          input.fillSet.hideousLaughterDamageRepeatSaves,
        ),
      });
    },
  );
  const invalidHideousLaughterSaveCheck = hideousLaughterSaveChecks.find(
    (check) => check.tag === "invalid",
  );
  if (invalidHideousLaughterSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidHideousLaughterSaveCheck.message,
    );
  }
  const missingHideousLaughterSaveHoles = hideousLaughterSaveChecks.flatMap(
    (check) => (check.tag === "needsHoles" ? [...check.holes] : []),
  );
  if (missingHideousLaughterSaveHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingHideousLaughterSaveHoles,
    ]);
  }

  const spellEffectState =
    input.spendsCastResources === false
      ? input.input.state
      : battleStateAfterSanctuaryEarlyEndForActor(
          input.input.state,
          input.actorId,
        );
  const damaged = targetAllocation.allocations.reduce(
    (state, allocation, allocationIndex) => {
      const target = state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return state;
      }
      const damageAmount = repeatedDamageAllocationSpellDamageAmount(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const concentrationSave = concentrationSavingThrowHole(
        target,
        damageAmount,
      );
      return applyPreparedSlotSpellDamage(
        state,
        allocation.targetId,
        damageAmount,
        {
          concentrationSavingThrow:
            concentrationSave === null
              ? undefined
              : concentrationSavingThrowFillFor(
                  input.fillSet.concentrationSavingThrows,
                  concentrationSave,
                ),
          damageDisposition: damageDispositionForTarget(
            damageDispositionHoles,
            input.fillSet.damageDispositions,
            allocation.targetId,
          ),
          hideousLaughterDamageRepeatSaves:
            hideousLaughterDamageRepeatSaveFillsForTarget(
              target,
              input.fillSet.hideousLaughterDamageRepeatSaves,
            ),
          damageSourceId: input.actorId,
        },
      );
    },
    spellEffectState,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: damaged,
      snapshot: snapshotBattle(damaged),
    };
  }

  const spent = spendAction(damaged.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spent.right,
    input.actorId,
  );
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    damaged,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const nextState = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  if (input.opensAfterDamageReactionWindow !== false) {
    const damageRoll = input.fillSet.damageRoll;
    const afterDamageEvents = targetAllocation.allocations.flatMap(
      (allocation, allocationIndex): readonly BattleAfterDamageEvent[] => {
        const target = input.input.state.combatants.get(allocation.targetId);
        if (target === undefined) {
          return [];
        }
        const damageAmount = repeatedDamageAllocationSpellDamageAmount(
          target,
          input.invocation,
          damageRoll,
          allocationIndex,
          allocation.count,
        );
        return [
          {
            damageSourceId: input.actorId,
            damagedId: allocation.targetId,
            damageAmount: toDamageAmount(damageAmount),
            reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
              facts: targetAllocation.spatialFacts,
              damagedId: allocation.targetId,
              damageSourceId: input.actorId,
            }),
          },
        ];
      },
    );
    const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
      state: nextState,
      subject: input.input.subject,
      events: afterDamageEvents,
      objectIgnitions: [],
      suppressedReactionTrigger: input.input.suppressedReactionTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spellAllocationSpatialFacts(
  facts: readonly BattleTargetSpatialFact[],
): readonly BattleSpellTargetAllocationSpatialFact[] | null {
  const allocationFacts = facts.filter(
    (fact): fact is BattleSpellTargetAllocationSpatialFact =>
      fact.kind === "spellTarget" ||
      fact.kind === "reactionSpellDamagerVisibleWithinRange",
  );
  return allocationFacts.length === facts.length ? allocationFacts : null;
}
