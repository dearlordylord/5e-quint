// Prepared-slot repeated-damage-allocation spell resolution extracted from spells-resolve.ts.

import {
spendAction
} from "@dnd/shared-algebras/action-economy-algebra";
import {
damageAmount as toDamageAmount
} from "@dnd/shared/types";
import { Either } from "effect";
import {
maybeOpenReactionWindow,
openAfterDamageSequenceReactionWindow,
snapshotBattle,
type ActionSpellBattleResolutionInput,
type BattleAfterDamageEvent,
type BattleHoleId,
type BattleResolutionResult,
type SupportedSpellInvocation
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
damageDispositionFillFor,
damageDispositionFillsValidation,
damageDispositionForTarget,
zeroHitPointReplacementDispositionHole
} from "./attack-damage-apply.ts";
import {
concentrationSavingThrowHole
} from "./damage-apply.ts";
import {
needsHolesResult
} from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
expendSpellSlot
} from "./spell-effects.ts";
import {
applyPreparedSlotSpellDamage,
repeatedDamageAllocationSpellDamageAmount,
spellDamageHole,
spellTargetAllocationHole,
validatePreparedSlotSpellDamageGroups,
validateSpellDamageFill,
validateSpellTargetAllocation
} from "./spells-holes-fills.ts";
import {
markSpellSlotExpendedThisTurn
} from "./spells-profiles.ts";




import { type SpellFillSet } from "./spells-resolve-fill-set.ts";

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
  const allocationValidation = validateSpellTargetAllocation(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetAllocation.allocations,
    input.fillSet.targetAllocation.spatialFacts,
  );
  if (allocationValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      allocationValidation,
    );
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "spellCast",
        casterId: input.actorId,
        spellId: input.invocation.spell.id,
        targetIds: input.fillSet.targetAllocation.allocations.map(
          (allocation) => allocation.targetId,
        ),
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
      input.fillSet.targetAllocation.allocations,
    );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = input.fillSet.targetAllocation.allocations.flatMap(
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
  const damageDispositionHoles =
    input.fillSet.targetAllocation.allocations.flatMap(
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

  const damaged = input.fillSet.targetAllocation.allocations.reduce(
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
        concentrationSave === null
          ? undefined
          : concentrationSavingThrowFillFor(
              input.fillSet.concentrationSavingThrows,
              concentrationSave,
            ),
        damageDispositionForTarget(
          damageDispositionHoles,
          input.fillSet.damageDispositions,
          allocation.targetId,
        ),
      );
    },
    input.input.state,
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
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
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
    const afterDamageEvents =
      input.fillSet.targetAllocation.allocations.flatMap(
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
            },
          ];
        },
      );
    const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
      state: nextState,
      subject: input.input.subject,
      events: afterDamageEvents,
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
