// Attack-burst save-damage spell resolution, currently Ice Knife.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleHoleId,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  iceKnifeDamageDispositionHoleKey,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { activeMarkedDamageRiders } from "./damage-helpers.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  applyPreparedSlotSpellDamage,
  applySpellDamage,
  spellAttackRollHole,
  spellBurstDamageAmountForTarget,
  spellBurstDamageHole,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellBurstDamageFill,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { spellAttackKindForRedirect } from "./spells-profiles.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";

import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export function resolveAttackBurstSaveDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.input.state.combatants.get(input.fillSet.targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [target.combatantId],
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

  const requiredRollMode = requiredAttackRollMode(
    input.input.state,
    input.actorId,
    target.combatantId,
  );
  if (input.fillSet.attackRoll === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAttackRollHole(
        input.input.state,
        input.actorId,
        input.invocation,
        requiredRollMode,
      ),
    ]);
  }
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }

  const ordinaryHit = attackRollHits(
    input.fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: input.fillSet.attackRoll,
    ordinaryHit,
  });
  if (
    input.fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
    missToHitReplacement === null
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
    );
  }
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(input.fillSet.attackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.input.state,
        input.actorId,
        target.combatantId,
        null,
      ),
      input.actorId,
      target.combatantId,
    ),
    input.actorId,
    missToHitReplacement,
    {
      subject: input.input.subject,
      targetId: target.combatantId,
      attackRoll: input.fillSet.attackRoll,
    },
  );
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.actorId),
        target.combatantId,
      )
    : [];

  if (hit && input.input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: input.fillSet.attackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        attackHitTriggerKind: "otherAttack",
        damageTypes: [
          ...new Set([
            input.invocation.damage.damageType,
            ...spellMarkedDamageRiders.map((rider) => rider.damage.damageType),
          ]),
        ],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }

  if (hit && input.fillSet.attackBurstDamageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellDamageHole(input.invocation, critical, spellMarkedDamageRiders),
    ]);
  }
  if (!hit && input.fillSet.attackBurstDamageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife attack damage can only be filled after a hit.",
    );
  }
  if (hit && input.fillSet.attackBurstDamageRoll !== undefined) {
    const attackDamageValidation = validateSpellDamageFill(
      input.fillSet.attackBurstDamageRoll,
      input.invocation,
      critical,
      spellMarkedDamageRiders,
    );
    if (attackDamageValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        attackDamageValidation,
      );
    }
  }

  const attackDamageAmount =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? spellDamageAmountForTarget(
          target,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          "full",
          spellMarkedDamageRiders,
          critical,
        )
      : 0;
  const attackDamageDispositionHole =
    attackDamageAmount > 0
      ? zeroHitPointReplacementDispositionHole({
          damageSourceId: input.actorId,
          target,
          damageAmount: attackDamageAmount,
          holeKey: iceKnifeDamageDispositionHoleKey(
            "attack",
            target.combatantId,
          ),
        })
      : null;
  const attackDamageDispositionHoles =
    attackDamageDispositionHole === null ? [] : [attackDamageDispositionHole];
  const attackDamageDispositionHoleIds = new Set<BattleHoleId>(
    attackDamageDispositionHoles.map((hole) => hole.holeId),
  );
  const attackDamageDispositionFills = input.fillSet.damageDispositions.filter(
    (fill) => attackDamageDispositionHoleIds.has(fill.holeId),
  );
  const attackDamageDispositionValidation = damageDispositionFillsValidation({
    holes: attackDamageDispositionHoles,
    fills: attackDamageDispositionFills,
  });
  if (attackDamageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackDamageDispositionValidation,
    );
  }
  const missingAttackDamageDispositionHoles =
    attackDamageDispositionHoles.filter(
      (hole) =>
        damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
        undefined,
    );
  if (missingAttackDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      attackRolledState,
      input.input.subject,
      missingAttackDamageDispositionHoles,
    );
  }

  const damagedByAttack =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          attackRolledState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          undefined,
          "full",
          damageDispositionForTarget(
            attackDamageDispositionHoles,
            input.fillSet.damageDispositions,
            target.combatantId,
          ),
          spellMarkedDamageRiders,
        )
      : attackRolledState;

  const savingThrowHole = spellSavingThrowOutcomeHole(
    damagedByAttack,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
    damagedByAttack,
    input.actorId,
    target.combatantId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      damagedByAttack,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  if (failedTargets.length > 0 && input.fillSet.damageRoll === undefined) {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      spellBurstDamageHole(input.invocation),
    ]);
  }
  if (failedTargets.length === 0 && input.fillSet.damageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife burst damage can only be filled when at least one target fails the Dexterity Saving Throw.",
    );
  }
  if (input.fillSet.damageRoll !== undefined) {
    const burstDamageValidation = validateSpellBurstDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
    );
    if (burstDamageValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        burstDamageValidation,
      );
    }
  }

  const burstDamageByTargetId = new Map(
    failedTargets.flatMap((targetId): readonly [CombatantId, number][] => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      return burstTarget === undefined || input.fillSet.damageRoll === undefined
        ? []
        : [
            [
              targetId,
              spellBurstDamageAmountForTarget(
                burstTarget,
                input.invocation,
                input.fillSet.damageRoll,
                "full",
              ),
            ],
          ];
    }),
  );
  const burstDamageDispositionHoles = Array.from(
    burstDamageByTargetId,
    ([targetId, damageAmount]) => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      return burstTarget === undefined
        ? null
        : zeroHitPointReplacementDispositionHole({
            damageSourceId: input.actorId,
            target: burstTarget,
            damageAmount,
            holeKey: iceKnifeDamageDispositionHoleKey("burst", targetId),
          });
    },
  ).flatMap((hole) => (hole === null ? [] : [hole]));
  const damageDispositionHoles = [
    ...attackDamageDispositionHoles,
    ...burstDamageDispositionHoles,
  ];
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
  const missingBurstDamageDispositionHoles = burstDamageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingBurstDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      damagedByAttack,
      input.input.subject,
      missingBurstDamageDispositionHoles,
    );
  }
  const concentrationDamageByTargetId = new Map<CombatantId, number>();
  if (attackDamageAmount > 0) {
    concentrationDamageByTargetId.set(target.combatantId, attackDamageAmount);
  }
  for (const [targetId, burstDamageAmount] of burstDamageByTargetId) {
    concentrationDamageByTargetId.set(
      targetId,
      (concentrationDamageByTargetId.get(targetId) ?? 0) + burstDamageAmount,
    );
  }
  const concentrationSaves = Array.from(
    concentrationDamageByTargetId,
    ([targetId, damageAmount]) => {
      const damagedTarget = damagedByAttack.combatants.get(targetId);
      return damagedTarget === undefined
        ? null
        : concentrationSavingThrowHole(damagedTarget, damageAmount);
    },
  ).flatMap((hole) => (hole === null ? [] : [hole]));
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      damagedByAttack,
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
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );

  const damagedByAttackWithConcentration =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          attackRolledState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          concentrationSaveByTargetId.get(target.combatantId),
          "full",
          damageDispositionForTarget(
            attackDamageDispositionHoles,
            input.fillSet.damageDispositions,
            target.combatantId,
          ),
          spellMarkedDamageRiders,
        )
      : attackRolledState;
  const damagedByBurst =
    input.fillSet.damageRoll === undefined
      ? damagedByAttackWithConcentration
      : failedTargets.reduce((state, targetId) => {
          const damageAmount = burstDamageByTargetId.get(targetId);
          return damageAmount === undefined
            ? state
            : applyPreparedSlotSpellDamage(
                state,
                targetId,
                damageAmount,
                concentrationSaveByTargetId.get(targetId),
                damageDispositionForTarget(
                  burstDamageDispositionHoles,
                  input.fillSet.damageDispositions,
                  targetId,
                ),
              );
        }, damagedByAttackWithConcentration);

  const spentResources = spendSpellCastResources({
    state: damagedByBurst,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }

  const afterDamageEvents: BattleAfterDamageEvent[] = [
    ...(attackDamageAmount > 0
      ? [
          {
            damageSourceId: input.actorId,
            damagedId: target.combatantId,
            damageAmount: toDamageAmount(attackDamageAmount),
          },
        ]
      : []),
    ...failedTargets.flatMap((targetId): readonly BattleAfterDamageEvent[] => {
      const damageAmount = burstDamageByTargetId.get(targetId);
      return damageAmount === undefined || damageAmount <= 0
        ? []
        : [
            {
              damageSourceId: input.actorId,
              damagedId: targetId,
              damageAmount: toDamageAmount(damageAmount),
            },
          ];
    }),
  ];
  const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
    state: spentResources.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
  if (afterDamageReactionWindow.tag === "needsHoles") {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: spentResources.state,
    snapshot: snapshotBattle(spentResources.state),
  };
}
