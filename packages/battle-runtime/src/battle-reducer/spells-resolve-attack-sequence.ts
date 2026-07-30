// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleConcentrationSavingThrowHole,
  type BattleFill,
  type BattleObjectDamageOutcome,
  type BattleResolutionResult,
  type BattleSpellDamageReductionRollHole,
  type BonusActionSpellBattleResolutionInput,
  type SpellDamageReductionRoll,
  type BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
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
  consumeSelfAttackRollEffects,
  objectTargetAttackNeedsSightFact,
  recordAttackRollOngoingFeatures,
  requiredSpellObjectTargetAttackRollMode,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import {
  sanctuaryTargetingInterdictionCheck,
  targetChoiceFillAfterSanctuaryAttackRollReplacement,
} from "./sanctuary-targeting-interdiction.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollHole,
  sourceDamageRollPenaltyRollForDamageRoll,
} from "./damage-helpers.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  hideousLaughterDamageRepeatSaveFillCheck,
  hideousLaughterDamageRepeatSaveFillsForTarget,
} from "./hideous-laughter-repeat-save.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollOutcomeIssue,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import { spellAttackKindForRedirect } from "./spells-profiles-attack-damage.ts";
import { spellAttackSequencePartName } from "./spells-execution-facts.ts";
import {
  applySpellDamage,
  spellAttackSequencePartAttackRollHole,
  spellAttackSequencePartAttackRollHoleId,
  spellAttackSequencePartDamageHole,
  spellDamageByTypeForTarget,
  spellDamageTypes,
  spellAttackSequencePartTargetHole,
  spellAttackSequencePartObjectTargetHole,
  spellObjectDamageByType,
  spellObjectDamageOutcomeFromDamageByType,
  spellObjectTargetFact,
  spellObjectTargetSightFact,
  spellTargetIsLegal,
  validateSpellAttackSequencePartDamageFill,
} from "./spells-holes-fills.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import type {
  SpellFillSet,
  SpellAttackSequencePartFillSet,
} from "./spells-resolve-fill-set.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import {
  spellCastingTimeResourceForSpellCast,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";
import {
  transmutedSpellDamageInvocation,
  type SpellMetamagicApplicationFact,
} from "./metamagic-support.ts";

type ResolvedSpellAttackSequencePart = {
  readonly tag: "resolved";
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
  readonly usedExtraFillHoleIds: readonly string[];
};

export function resolveSpellAttackSequenceAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.damageRoll !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell spell attack sequence must use indexed target, attack-roll, and damage fills.`,
    );
  }
  /* v8 ignore stop */

  const missingTargetIndex = input.fillSet.attackSequencePartFills.findIndex(
    (partFill) => partFill.target === undefined,
  );
  if (missingTargetIndex >= 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAttackSequencePartTargetHole(
        input.input.state,
        input.actorId,
        input.invocation,
        missingTargetIndex,
      ),
      spellAttackSequencePartObjectTargetHole(
        input.invocation,
        missingTargetIndex,
      ),
    ]);
  }

  const targetIds = input.fillSet.attackSequencePartFills.flatMap((partFill) =>
    partFill.target?.kind === "combatant" ? [partFill.target.targetId] : [],
  );
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [...new Set(targetIds)],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: spellCastingTimeResourceForSpellCast({
        invocation: input.invocation,
        actionCostOverride: input.actionCostOverride,
      }),
      ...spellCastMetamagicApplicationsInput(input.metamagicApplications ?? []),
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  let state = input.input.state;
  const objectDamages: BattleObjectDamageOutcome[] = [];
  const afterDamageEvents: BattleAfterDamageEvent[] = [];
  const usedExtraFillHoleIds = new Set<string>();
  for (const [
    partIndex,
    partFill,
  ] of input.fillSet.attackSequencePartFills.entries()) {
    const resolved = resolveSpellAttackSequencePart({
      ...input,
      state,
      invocation: transmutedSpellDamageInvocation(
        input.invocation,
        input.metamagicApplications,
      ),
      partFill,
      partIndex,
    });
    if (resolved.tag !== "resolved") {
      return resolved;
    }
    if (!isResolvedSpellAttackSequencePart(resolved)) {
      return resolved;
    }
    state = resolved.state;
    objectDamages.push(...resolved.objectDamages);
    afterDamageEvents.push(...resolved.afterDamageEvents);
    for (const holeId of resolved.usedExtraFillHoleIds) {
      usedExtraFillHoleIds.add(holeId);
    }
  }
  const unusedExtraFill = [
    ...input.fillSet.sourceDamageRollPenaltyRolls,
    ...input.fillSet.spellDamageReductionRolls,
    ...input.fillSet.concentrationSavingThrows,
    ...input.fillSet.damageDispositions,
  ].find((fill) => !usedExtraFillHoleIds.has(fill.holeId));
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unusedExtraFill !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack sequence damage lifecycle fill does not match an attack that currently needs it.",
    );
  }
  /* v8 ignore stop */

  const spent = spendSpellCastResources({
    state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (spent.tag !== "resolved") {
    return spent;
  }
  const afterDamageReactionWindow = openAfterDamageSequenceInterruptWindow({
    state: spent.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages,
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
  if (afterDamageReactionWindow.tag !== "resolved") {
    return afterDamageReactionWindow;
  }
  return {
    tag: "resolved",
    state: afterDamageReactionWindow.state,
    snapshot: snapshotBattle(afterDamageReactionWindow.state),
    ...(afterDamageReactionWindow.objectDamages === undefined
      ? {}
      : { objectDamages: afterDamageReactionWindow.objectDamages }),
  };
}

function resolveSpellAttackSequencePart(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly partFill: SpellAttackSequencePartFillSet;
  readonly partIndex: number;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): ResolvedSpellAttackSequencePart | BattleResolutionResult {
  const target = input.partFill.target;
  /* v8 ignore start -- Internal replay invariant: the outer resolver requests every missing sequence target before iterating its completed part fills. */
  if (target === undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell ${partName} target was not filled.`,
    );
  }
  /* v8 ignore stop */
  if (target.kind === "combatant") {
    return resolveSpellAttackSequenceCreaturePart({ ...input, target });
  }
  return resolveSpellAttackSequenceObjectPart({ ...input, target });
}

function resolveSpellAttackSequenceCreaturePart(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly partFill: SpellAttackSequencePartFillSet;
  readonly partIndex: number;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly target: Extract<
    NonNullable<SpellAttackSequencePartFillSet["target"]>,
    { readonly kind: "combatant" }
  >;
}): ResolvedSpellAttackSequencePart | BattleResolutionResult {
  const target = input.state.combatants.get(input.target.targetId);
  /* v8 ignore start -- Malformed resolution input: a decoded creature target must still match the roster and range facts encoded by its emitted sequence target hole. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.state,
      input.actorId,
      input.target.targetId,
      input.invocation,
      input.target.spatialFacts,
    )
  ) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell ${partName} target must be a combatant within the selected spell's supported range.`,
    );
  }
  /* v8 ignore stop */
  const requiredRollMode = requiredSpellAttackRollMode(
    input.state,
    input.actorId,
    target.combatantId,
    input.invocation,
    input.target.spatialFacts,
  );
  const originalTargetHole = spellAttackSequencePartTargetHole(
    input.state,
    input.actorId,
    input.invocation,
    input.partIndex,
  );
  const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
    state: input.state,
    triggeringProcedureRef: input.invocation.sourceProcedureRef,
    triggeringCombatantId: input.actorId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: originalTargetHole.holeId,
    replacementTargetKind: "attackRoll",
    fills: input.input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.input.subject, [
      sanctuaryCheck.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sanctuaryCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      sanctuaryCheck.message,
    );
  }
  /* v8 ignore stop */
  if (sanctuaryCheck.tag === "lost") {
    return spendSpellCastResources({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      ...(input.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: input.actionCostOverride }),
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    });
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
    /* v8 ignore start -- Malformed resolution input: Sanctuary replacement facts must identify a roster combatant legal for this exact sequence spell. */
    if (
      replacementTarget === undefined ||
      !spellTargetIsLegal(
        input.state,
        input.actorId,
        replacementTarget.combatantId,
        input.invocation,
        sanctuaryCheck.spatialFacts,
      )
    ) {
      const partName = spellAttackSequencePartName();
      return invalidResult(
        input.input.state,
        "invalidFill",
        `Sanctuary replacement Spell ${partName} target must be legal for the selected spell.`,
      );
    }
    /* v8 ignore stop */
    const originalTargetFill = input.input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" &&
        fill.holeId === originalTargetHole.holeId,
    );
    /* v8 ignore start -- Malformed resolution input: a Sanctuary outcome is accepted only for the sequence target fill that emitted its event id. */
    if (originalTargetFill === undefined) {
      const partName = spellAttackSequencePartName();
      return invalidResult(
        input.input.state,
        "invalidFill",
        `Sanctuary replacement requires the original Spell ${partName} target fill.`,
      );
    }
    /* v8 ignore stop */
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalTargetFill
            ? targetChoiceFillAfterSanctuaryAttackRollReplacement({
                fill,
                replacement: sanctuaryCheck,
              })
            : fill,
      );
    const fillSet = spellFillSet(
      fills,
      input.invocation,
      input.invocation.sourceProcedureRef,
      input.actorId,
      input.input.state,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop */
    return resolveSpellAttackSequenceAct({
      ...input,
      input: { ...input.input, fills },
      fillSet,
    });
  }
  if (input.partFill.attackRoll === undefined) {
    return needsHolesResult(input.state, input.input.subject, [
      spellAttackSequencePartAttackRollHole(
        input.invocation,
        input.partIndex,
        requiredRollMode,
      ),
    ]);
  }
  const attackRollError = validateSpellAttackSequencePartAttackRoll(
    input.partFill.attackRoll,
    requiredRollMode,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackRollError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  /* v8 ignore stop */
  const actorBeforeSpellAttack = input.state.combatants.get(input.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: actorBeforeSpellAttack,
      originalNaturalD20: Number(input.partFill.attackRoll.naturalD20),
      rollMode: input.partFill.attackRoll.rollMode,
      rolledD20s: input.partFill.attackRoll.rolledD20s,
      decision: input.partFill.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.state, input.input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        spellAttackSequencePartAttackRollHole(
          input.invocation,
          input.partIndex,
          requiredRollMode,
        ),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: actorBeforeSpellAttack,
    total: input.partFill.attackRoll.total,
    originalNaturalD20: Number(input.partFill.attackRoll.naturalD20),
    rollMode: input.partFill.attackRoll.rollMode,
    rolledD20s: input.partFill.attackRoll.rolledD20s,
    decision: input.partFill.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.partFill.attackRoll,
  );
  const ordinaryHit = attackRollHits(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: effectiveAttackRoll,
    ordinaryHit,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.partFill.attackRoll.missToHitReplacementProcedureRef !== undefined &&
    missToHitReplacement === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
    );
  }
  /* v8 ignore stop */
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.state,
        input.actorId,
        target.combatantId,
        null,
        input.target.relationshipFacts,
      ),
      input.actorId,
      target.combatantId,
    ),
    input.actorId,
    missToHitReplacement,
    {
      subject: input.input.subject,
      targetId: target.combatantId,
      attackRoll: effectiveAttackRoll,
    },
  );
  /* v8 ignore start -- Malformed resolution input: Mirror Image emits a duplicate roll only after this sequence attack has hit. */
  if (!hit && input.partFill.mirrorImageDuplicateRoll !== undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell ${partName} Mirror Image duplicate roll is only valid after an attack-roll hit.`,
    );
  }
  /* v8 ignore stop */
  if (hit) {
    const mirrorImageAttacker = attackRolledState.combatants.get(input.actorId);
    /* v8 ignore start -- Internal replay invariant: recording an attack roll and consuming Help preserve the already-resolved spell attacker in the combatant map. */
    if (mirrorImageAttacker === undefined) {
      return invalidResult(
        input.input.state,
        "missingCombatant",
        "Spell attack sequence actor is no longer in this battle.",
      );
    }
    /* v8 ignore stop */
    const mirrorImageCheck = mirrorImageHitInterceptionCheck({
      state: attackRolledState,
      attacker: mirrorImageAttacker,
      target: attackRolledState.combatants.get(target.combatantId) ?? target,
      targetSpatialFacts: input.target.spatialFacts,
      triggeringAttackRollHoleId: spellAttackSequencePartAttackRollHoleId(
        input.invocation,
        input.partIndex,
      ),
      fill: input.partFill.mirrorImageDuplicateRoll,
    });
    if (mirrorImageCheck.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.input.subject, [
        mirrorImageCheck.hole,
      ]);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (mirrorImageCheck.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        mirrorImageCheck.message,
      );
    }
    /* v8 ignore stop */
    if (mirrorImageCheck.tag === "hitDuplicate") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (input.partFill.damageRoll !== undefined) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Spell attack sequence damage is not valid when Mirror Image redirects the hit to a duplicate.",
        );
      }
      /* v8 ignore stop */
      return {
        tag: "resolved",
        state: mirrorImageCheck.state,
        objectDamages: [],
        afterDamageEvents: [],
        usedExtraFillHoleIds: [],
      };
    }
  }
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.actorId),
        target.combatantId,
      )
    : [];
  if (hit && input.input.handledInterruptTrigger !== "attackHit") {
    const reactionWindow = maybeOpenInterruptWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        attackHitTriggerKind: "otherAttack",
        damageTypes: [
          ...new Set([
            ...spellDamageTypes(input.invocation),
            ...spellMarkedDamageRiders.map((rider) => rider.damage.damageType),
          ]),
        ],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: critical,
      fills: input.partFill,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;
  /* v8 ignore start -- Malformed resolution input: a missed sequence attack emits no damage-roll hole. */
  if (!hit && input.partFill.damageRoll !== undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell ${partName} damage can only be filled after a hit.`,
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    return {
      tag: "resolved",
      state: postRemarkableAthleteMovementState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.partFill.damageRoll === undefined) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [
        spellAttackSequencePartDamageHole(
          input.invocation,
          input.partIndex,
          critical,
          spellMarkedDamageRiders,
        ),
      ],
    );
  }
  const damageValidation = validateSpellAttackSequencePartDamageFill(
    input.partFill.damageRoll,
    input.invocation,
    input.partIndex,
    critical,
    spellMarkedDamageRiders,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    input.invocation,
    input.partFill.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const spellReductionRollHoleForPart = (reduction: SpellDamageReductionRoll) =>
    spellAttackSequencePartDamageReductionRollHole(
      input.invocation,
      input.partIndex,
      reduction,
    );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    postRemarkableAthleteMovementState.combatants.get(input.actorId),
    spellDamageByType,
    input.partFill.damageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      postRemarkableAthleteMovementState.combatants.get(input.actorId),
      spellDamageByType,
      input.partFill.damageRoll.holeId,
    ),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...sourcePenalty.holes],
    );
  }
  const spellReductionCandidate = applyAvailableSpellDamageReduction(
    target,
    sourcePenalty.damageByType,
    undefined,
    spellReductionRollHoleForPart,
  );
  const spellReductionRoll =
    spellReductionCandidate.tag === "needsHoles"
      ? input.fillSet.spellDamageReductionRolls.find(
          (roll) => roll.holeId === spellReductionCandidate.holes[0]?.holeId,
        )
      : undefined;
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    sourcePenalty.damageByType,
    spellReductionRoll,
    spellReductionRollHoleForPart,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellReduction.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  /* v8 ignore stop */
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...spellReduction.holes],
    );
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    postRemarkableAthleteMovementState,
    spellReduction.target,
    spellReduction.damageByType,
  );
  const concentrationSaveBase = concentrationSavingThrowHole(
    spellReduction.target,
    spellDamageAmount,
  );
  const concentrationSave =
    concentrationSaveBase === null
      ? null
      : spellAttackSequencePartConcentrationSavingThrowHole(
          input.invocation,
          input.partIndex,
          concentrationSaveBase,
        );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          input.fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null && concentrationFill === undefined) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [concentrationSave],
    );
  }
  if (concentrationFill !== undefined) {
    const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollOutcomeIssue({
      actor: spellReduction.target,
      rollMode: concentrationSave?.rollMode,
      rolledD20s: concentrationFill.value.rolledD20s,
      originalNaturalD20:
        concentrationFill.value.naturalD20 === undefined
          ? undefined
          : Number(concentrationFill.value.naturalD20),
      decision: concentrationFill.value.d20TestNaturalOneReroll,
      withoutRoll: concentrationFill.value.withoutRoll,
      succeeded: concentrationFill.value.succeeded,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollIssue !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      );
    }
    /* v8 ignore stop */
  }
  const damageEventKey = String(
    spellAttackSequencePartDamageDispositionHoleKey(
      input.invocation,
      input.partIndex,
      spellReduction.target.combatantId,
    ).holeId,
  );
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
    holeKey: spellAttackSequencePartDamageDispositionHoleKey(
      input.invocation,
      input.partIndex,
      spellReduction.target.combatantId,
    ),
  });
  const damageDispositionFills = input.fillSet.damageDispositions;
  const relevantDamageDispositionFills =
    damageDispositionHole === null
      ? []
      : damageDispositionFills.filter(
          (fill) => fill.holeId === damageDispositionHole.holeId,
        );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: relevantDamageDispositionFills,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      relevantDamageDispositionFills,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [damageDispositionHole],
    );
  }
  const relevantHideousLaughterDamageRepeatSaves =
    hideousLaughterDamageRepeatSaveFillsForTarget(
      spellReduction.target,
      input.fillSet.hideousLaughterDamageRepeatSaves,
      damageEventKey,
    );
  const hideousLaughterSaveCheck = hideousLaughterDamageRepeatSaveFillCheck({
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
    fills: relevantHideousLaughterDamageRepeatSaves,
    damageEventKey,
  });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...hideousLaughterSaveCheck.holes],
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    postRemarkableAthleteMovementState.combatants.get(input.actorId),
    spellDamageByType,
    input.partFill.damageRoll.holeId,
  );
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHole === null ? [] : [damageDispositionHole],
    relevantDamageDispositionFills,
    target.combatantId,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: postRemarkableAthleteMovementState,
    damageEventHoleId: input.partFill.damageRoll.holeId,
    damageSourceId: input.actorId,
    targets:
      spellDamageAmount <= 0
        ? []
        : [
            {
              targetId: target.combatantId,
              damageAmount: toDamageAmount(spellDamageAmount),
              damageDisposition,
            },
          ],
    spatialFacts: input.target.spatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const damaged = applySpellDamage(
    postRemarkableAthleteMovementState,
    target.combatantId,
    input.invocation,
    input.partFill.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        input.fillSet.concentrationSavingThrows,
      damageDisposition,
      spellMarkedDamageRiders,
      spellDamageReductionRoll: spellReductionRoll,
      spellDamageReductionRollHoleForReduction: spellReductionRollHoleForPart,
      sourceDamageRollPenaltyRoll,
      hideousLaughterDamageRepeatSaves:
        relevantHideousLaughterDamageRepeatSaves,
      hideousLaughterDamageRepeatSaveEventKey: damageEventKey,
      damageSourceId: input.actorId,
      spatialFacts: input.target.spatialFacts,
      ...(relationshipCheck.decisions === undefined
        ? {}
        : { relationshipDecisions: relationshipCheck.decisions }),
    },
  );
  const usedExtraFillHoleIds = [
    ...(sourceDamageRollPenaltyRoll === undefined
      ? []
      : [sourceDamageRollPenaltyRoll.holeId]),
    ...(spellReductionRoll === undefined ? [] : [spellReductionRoll.holeId]),
    ...(concentrationFill === undefined ? [] : [concentrationFill.holeId]),
    ...relevantDamageDispositionFills.map((fill) => fill.holeId),
    ...relevantHideousLaughterDamageRepeatSaves.map((fill) => fill.holeId),
  ];
  return {
    tag: "resolved",
    state: damaged,
    objectDamages: [],
    afterDamageEvents:
      spellDamageAmount <= 0
        ? []
        : [
            {
              damageSourceId: input.actorId,
              damagedId: target.combatantId,
              damageAmount: toDamageAmount(spellDamageAmount),
              reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
                facts: input.target.spatialFacts,
                damagedId: target.combatantId,
                damageSourceId: input.actorId,
              }),
            },
          ],
    usedExtraFillHoleIds,
  };
}

function isResolvedSpellAttackSequencePart(
  result:
    | Extract<BattleResolutionResult, { readonly tag: "resolved" }>
    | ResolvedSpellAttackSequencePart,
): result is ResolvedSpellAttackSequencePart {
  return "afterDamageEvents" in result && "usedExtraFillHoleIds" in result;
}

function resolveSpellAttackSequenceObjectPart(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly partFill: SpellAttackSequencePartFillSet;
  readonly partIndex: number;
  readonly target: Extract<
    NonNullable<SpellAttackSequencePartFillSet["target"]>,
    { readonly kind: "object" }
  >;
}):
  | {
      readonly tag: "resolved";
      readonly state: ActionSpellBattleResolutionInput["state"];
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
      readonly usedExtraFillHoleIds: readonly string[];
    }
  | Exclude<BattleResolutionResult, { readonly tag: "resolved" }> {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.partFill.mirrorImageDuplicateRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image duplicate roll is only valid for a hit against a combatant.",
    );
  }
  /* v8 ignore stop */
  const objectFact = spellObjectTargetFact(
    input.target.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.target.spatialFacts)[number],
        { readonly kind: "spellObjectTarget" }
      > => fact.kind === "spellObjectTarget",
    ),
    input.actorId,
    input.target.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: an object sequence target must carry the range, Armor Class, and damage-disposition fact requested by its emitted hole. */
  if (objectFact === null) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell object ${partName} must include a matching table-supplied range and object Armor Class fact.`,
    );
  }
  /* v8 ignore stop */
  const sightFact = spellObjectTargetSightFact(
    input.target.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.target.spatialFacts)[number],
        { readonly kind: "spellObjectTargetSight" }
      > => fact.kind === "spellObjectTargetSight",
    ),
    input.actorId,
    input.target.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: visible-object attacks require the sight fact requested alongside the selected object target. */
  if (
    sightFact === null &&
    objectTargetAttackNeedsSightFact(input.state, input.target.objectId)
  ) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell object ${partName} must include a matching table-supplied object sight fact.`,
    );
  }
  /* v8 ignore stop */
  const requiredRollMode = requiredSpellObjectTargetAttackRollMode(
    input.state,
    input.actorId,
    input.invocation,
    input.target.objectId,
    sightFact?.attackerCanSeeObject,
  );
  if (input.partFill.attackRoll === undefined) {
    return needsHolesResult(input.state, input.input.subject, [
      spellAttackSequencePartAttackRollHole(
        input.invocation,
        input.partIndex,
        requiredRollMode,
      ),
    ]);
  }
  const attackRollError = validateSpellAttackSequencePartAttackRoll(
    input.partFill.attackRoll,
    requiredRollMode,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackRollError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  /* v8 ignore stop */
  const actorBeforeSpellAttack = input.state.combatants.get(input.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: actorBeforeSpellAttack,
      originalNaturalD20: Number(input.partFill.attackRoll.naturalD20),
      rollMode: input.partFill.attackRoll.rollMode,
      rolledD20s: input.partFill.attackRoll.rolledD20s,
      decision: input.partFill.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.state, input.input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        spellAttackSequencePartAttackRollHole(
          input.invocation,
          input.partIndex,
          requiredRollMode,
        ),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: actorBeforeSpellAttack,
    total: input.partFill.attackRoll.total,
    originalNaturalD20: Number(input.partFill.attackRoll.naturalD20),
    rollMode: input.partFill.attackRoll.rollMode,
    rolledD20s: input.partFill.attackRoll.rolledD20s,
    decision: input.partFill.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.partFill.attackRoll.activatedOngoingFeatureProcedureRef !==
      undefined ||
    input.partFill.attackRoll.missToHitReplacementProcedureRef !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }
  /* v8 ignore stop */
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.partFill.attackRoll,
  );
  const hit = attackRollHits(effectiveAttackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const attackRolledState = consumeSelfAttackRollEffects(
    {
      ...input.state,
      currentTurnResources: {
        ...input.state.currentTurnResources,
        attackRollMadeThisTurn: true,
      },
    },
    input.actorId,
  );
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: hit && critical,
      fills: input.partFill,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hit && input.partFill.damageRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack sequence damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    return {
      tag: "resolved",
      state: postRemarkableAthleteMovementState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.partFill.damageRoll === undefined) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [
        spellAttackSequencePartDamageHole(
          input.invocation,
          input.partIndex,
          critical,
        ),
      ],
    );
  }
  const damageValidation = validateSpellAttackSequencePartDamageFill(
    input.partFill.damageRoll,
    input.invocation,
    input.partIndex,
    critical,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const objectDamageByType = spellObjectDamageByType(
    input.invocation,
    input.partFill.damageRoll,
  );
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    postRemarkableAthleteMovementState.combatants.get(input.actorId),
    objectDamageByType,
    input.partFill.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    postRemarkableAthleteMovementState.combatants.get(input.actorId),
    objectDamageByType,
    input.partFill.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...sourcePenalty.holes],
    );
  }
  return {
    tag: "resolved",
    state: postRemarkableAthleteMovementState,
    objectDamages: [
      spellObjectDamageOutcomeFromDamageByType({
        objectId: input.target.objectId,
        damageType: input.invocation.damage.damageType,
        damageByType: sourcePenalty.damageByType,
        disposition: objectFact.damageDisposition,
      }),
    ],
    afterDamageEvents: [],
    usedExtraFillHoleIds:
      sourceDamageRollPenaltyRoll === undefined
        ? []
        : [sourceDamageRollPenaltyRoll.holeId],
  };
}

function validateSpellAttackSequencePartAttackRoll(
  attackRoll: NonNullable<SpellAttackSequencePartFillSet["attackRoll"]>,
  requiredRollMode: Parameters<typeof attackRollModeMatches>[1],
): string | null {
  /* v8 ignore start -- Malformed resolution input: decoded sequence attack rolls must satisfy the d20 result protocol attached to the emitted attack-roll hole. */
  if (!attackRollResultIsValid(attackRoll)) {
    return "Spell attack roll result is outside the d20 attack-roll protocol.";
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(attackRoll);
  /* v8 ignore start -- Malformed resolution input: sequence spells do not emit the spell-attack reroll options rejected by this validator. */
  if (spellAttackRerollIssue !== null) {
    return spellAttackRerollIssue;
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: the roll mode must match the Advantage and Disadvantage facts used to emit this sequence attack-roll hole. */
  if (!attackRollModeMatches(attackRoll, requiredRollMode)) {
    return "Spell attack roll mode does not match the current attack-roll rule.";
  }
  /* v8 ignore stop */
  return null;
}

function spellAttackSequencePartDamageReductionRollHole(
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  reduction: SpellDamageReductionRoll,
): BattleSpellDamageReductionRollHole {
  const base = spellDamageReductionRollHole(reduction);
  const protocolId = [
    "battle:spell:attack-sequence-part-damage-reduction-roll",
    invocation.sourceProcedureRef,
    partIndex,
    reduction.sourceProcedureRef,
    reduction.sourceCombatantId,
    reduction.targetId,
    reduction.damageType,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Spell ${partName} ${partIndex + 1} damage reduction`,
  };
}

function spellAttackSequencePartConcentrationSavingThrowHole(
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  base: BattleConcentrationSavingThrowHole,
): BattleConcentrationSavingThrowHole {
  const protocolId = [
    "battle:spell:attack-sequence-part-concentration-save",
    invocation.sourceProcedureRef,
    partIndex,
    base.combatantId,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Spell ${partName} ${partIndex + 1} Concentration Constitution Saving Throw`,
  };
}

function spellAttackSequencePartDamageDispositionHoleKey(
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  targetId: CombatantId,
) {
  const protocolId = [
    "battle:spell:attack-sequence-part-damage-disposition",
    invocation.sourceProcedureRef,
    partIndex,
    targetId,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Spell ${partName} ${partIndex + 1} damage disposition`,
  };
}
