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
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleConcentrationSavingThrowHole,
  type BattleFill,
  type BattleObjectDamageOutcome,
  type BattleResolutionResult,
  type BattleSpellDamageReductionRollHole,
  type SpellDamageReductionRoll,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
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
import { activeEffectArmorClass } from "./creature-state.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { sanctuaryTargetingInterdictionCheck } from "./sanctuary-targeting-interdiction.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollHole,
} from "./damage-helpers.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import {
  hideousLaughterDamageRepeatSaveFillCheck,
  hideousLaughterDamageRepeatSaveFillsForTarget,
} from "./hideous-laughter-repeat-save.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import { spellAttackKindForRedirect } from "./spells-profiles.ts";
import { spellAttackSequencePartName } from "./spells-profile-shared.ts";
import {
  applySpellDamage,
  spellAttackSequencePartAttackRollHole,
  spellAttackSequencePartAttackRollHoleId,
  spellAttackSequencePartDamageHole,
  spellDamageByTypeForTarget,
  spellDamageTypes,
  spellAttackSequencePartTargetHole,
  spellAttackSequencePartObjectTargetHole,
  spellObjectDamageOutcome,
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
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

type ResolvedSpellAttackSequencePart = {
  readonly tag: "resolved";
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
  readonly usedExtraFillHoleIds: readonly string[];
};

export function resolveSpellAttackSequenceAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.damageRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} spell attack sequence must use indexed target, attack-roll, and damage fills.`,
    );
  }

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
  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [...new Set(targetIds)],
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

  let state = input.input.state;
  const objectDamages: BattleObjectDamageOutcome[] = [];
  const afterDamageEvents: BattleAfterDamageEvent[] = [];
  const usedExtraFillHoleIds = new Set<string>();
  for (const [
    partIndex,
    partFill,
  ] of input.fillSet.attackSequencePartFills.entries()) {
    const resolved = resolveSpellAttackSequencePart({
      state,
      input: input.input,
      actorId: input.actorId,
      invocation: input.invocation,
      fillSet: input.fillSet,
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
    ...input.fillSet.spellDamageReductionRolls,
    ...input.fillSet.concentrationSavingThrows,
    ...input.fillSet.damageDispositions,
  ].find((fill) => !usedExtraFillHoleIds.has(fill.holeId));
  if (unusedExtraFill !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack sequence damage lifecycle fill does not match an attack that currently needs it.",
    );
  }

  const spent = spendSpellCastResources({
    state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spent.tag !== "resolved") {
    return spent;
  }
  const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
    state: spent.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages,
    objectIgnitions: [],
    droppedObjects: [],
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
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
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly partFill: SpellAttackSequencePartFillSet;
  readonly partIndex: number;
}): ResolvedSpellAttackSequencePart | BattleResolutionResult {
  const target = input.partFill.target;
  if (target === undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} ${partName} target was not filled.`,
    );
  }
  if (target.kind === "combatant") {
    return resolveSpellAttackSequenceCreaturePart({ ...input, target });
  }
  return resolveSpellAttackSequenceObjectPart({ ...input, target });
}

function resolveSpellAttackSequenceCreaturePart(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly partFill: SpellAttackSequencePartFillSet;
  readonly partIndex: number;
  readonly target: Extract<
    NonNullable<SpellAttackSequencePartFillSet["target"]>,
    { readonly kind: "combatant" }
  >;
}): ResolvedSpellAttackSequencePart | BattleResolutionResult {
  const target = input.state.combatants.get(input.target.targetId);
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
      `${input.invocation.spell.name} ${partName} target must be a combatant within the selected spell's supported range.`,
    );
  }
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
    triggeringCombatantId: input.actorId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: originalTargetHole.holeId,
    fills: input.input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.input.subject, [
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
    return spendSpellCastResources({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
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
        `Sanctuary replacement ${input.invocation.spell.name} ${partName} target must be legal for the selected spell.`,
      );
    }
    const originalTargetFill = input.input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" &&
        fill.holeId === originalTargetHole.holeId,
    );
    if (originalTargetFill === undefined) {
      const partName = spellAttackSequencePartName();
      return invalidResult(
        input.input.state,
        "invalidFill",
        `Sanctuary replacement requires the original ${input.invocation.spell.name} ${partName} target fill.`,
      );
    }
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalTargetFill
            ? {
                ...fill,
                value: replacementTarget.combatantId,
                spatialFacts: sanctuaryCheck.spatialFacts,
              }
            : fill,
      );
    const fillSet = spellFillSet(fills, input.invocation);
    if (fillSet.tag === "invalid") {
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    return resolveSpellAttackSequenceAct({
      input: { ...input.input, fills },
      actorId: input.actorId,
      invocation: input.invocation,
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
  if (attackRollError !== null) {
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  const ordinaryHit = attackRollHits(
    input.partFill.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: input.partFill.attackRoll,
    ordinaryHit,
  });
  if (
    input.partFill.attackRoll.missToHitReplacementUnitId !== undefined &&
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
  const critical = attackRollIsCriticalHit(input.partFill.attackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.state,
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
      attackRoll: input.partFill.attackRoll,
    },
  );
  if (!hit && input.partFill.mirrorImageDuplicateRoll !== undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} ${partName} Mirror Image duplicate roll is only valid after an attack-roll hit.`,
    );
  }
  if (hit) {
    const mirrorImageAttacker = attackRolledState.combatants.get(input.actorId);
    if (mirrorImageAttacker === undefined) {
      return invalidResult(
        input.input.state,
        "missingCombatant",
        "Spell attack sequence actor is no longer in this battle.",
      );
    }
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
    if (mirrorImageCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        mirrorImageCheck.message,
      );
    }
    if (mirrorImageCheck.tag === "hitDuplicate") {
      if (input.partFill.damageRoll !== undefined) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Spell attack sequence damage is not valid when Mirror Image redirects the hit to a duplicate.",
        );
      }
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
  if (hit && input.input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: input.partFill.attackRoll,
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
      input.input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (!hit && input.partFill.damageRoll !== undefined) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} ${partName} damage can only be filled after a hit.`,
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.partFill.damageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellAttackSequencePartDamageHole(
        input.invocation,
        input.partIndex,
        critical,
        spellMarkedDamageRiders,
      ),
    ]);
  }
  const damageValidation = validateSpellAttackSequencePartDamageFill(
    input.partFill.damageRoll,
    input.invocation,
    input.partIndex,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
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
  const spellReductionCandidate = applyAvailableSpellDamageReduction(
    target,
    spellDamageByType,
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
    spellDamageByType,
    spellReductionRoll,
    spellReductionRollHoleForPart,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
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
    return needsHolesResult(attackRolledState, input.input.subject, [
      concentrationSave,
    ]);
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
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      relevantDamageDispositionFills,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      damageDispositionHole,
    ]);
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
    return needsHolesResult(attackRolledState, input.input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  if (hideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  const damaged = applySpellDamage(
    attackRolledState,
    target.combatantId,
    input.invocation,
    input.partFill.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        input.fillSet.concentrationSavingThrows,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        relevantDamageDispositionFills,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      spellDamageReductionRoll: spellReductionRoll,
      spellDamageReductionRollHoleForReduction: spellReductionRollHoleForPart,
      hideousLaughterDamageRepeatSaves:
        relevantHideousLaughterDamageRepeatSaves,
      hideousLaughterDamageRepeatSaveEventKey: damageEventKey,
      damageSourceId: input.actorId,
    },
  );
  const usedExtraFillHoleIds = [
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
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
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
  if (input.partFill.mirrorImageDuplicateRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image duplicate roll is only valid for a hit against a combatant.",
    );
  }
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
  if (objectFact === null) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} object ${partName} must include a matching table-supplied range and object Armor Class fact.`,
    );
  }
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
  if (
    sightFact === null &&
    objectTargetAttackNeedsSightFact(input.state, input.target.objectId)
  ) {
    const partName = spellAttackSequencePartName();
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} object ${partName} must include a matching table-supplied object sight fact.`,
    );
  }
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
  if (attackRollError !== null) {
    return invalidResult(input.input.state, "invalidFill", attackRollError);
  }
  if (
    input.partFill.attackRoll.activatedOngoingFeatureUnitId !== undefined ||
    input.partFill.attackRoll.missToHitReplacementUnitId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }
  const hit = attackRollHits(input.partFill.attackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(input.partFill.attackRoll);
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
  if (!hit && input.partFill.damageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack sequence damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      objectDamages: [],
      afterDamageEvents: [],
      usedExtraFillHoleIds: [],
    };
  }
  if (input.partFill.damageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellAttackSequencePartDamageHole(
        input.invocation,
        input.partIndex,
        critical,
      ),
    ]);
  }
  const damageValidation = validateSpellAttackSequencePartDamageFill(
    input.partFill.damageRoll,
    input.invocation,
    input.partIndex,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  return {
    tag: "resolved",
    state: attackRolledState,
    objectDamages: [
      spellObjectDamageOutcome({
        objectId: input.target.objectId,
        invocation: input.invocation,
        damageRoll: input.partFill.damageRoll,
        critical,
        disposition: objectFact.damageDisposition,
      }),
    ],
    afterDamageEvents: [],
    usedExtraFillHoleIds: [],
  };
}

function validateSpellAttackSequencePartAttackRoll(
  attackRoll: NonNullable<SpellAttackSequencePartFillSet["attackRoll"]>,
  requiredRollMode: Parameters<typeof attackRollModeMatches>[1],
): string | null {
  if (!attackRollResultIsValid(attackRoll)) {
    return "Spell attack roll result is outside the d20 attack-roll protocol.";
  }
  if (!attackRollModeMatches(attackRoll, requiredRollMode)) {
    return "Spell attack roll mode does not match the current attack-roll rule.";
  }
  return null;
}

function spellAttackSequencePartDamageReductionRollHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  reduction: SpellDamageReductionRoll,
): BattleSpellDamageReductionRollHole {
  const base = spellDamageReductionRollHole(reduction);
  const protocolId = [
    "battle:spell:attack-sequence-part-damage-reduction-roll",
    invocation.spell.id,
    partIndex,
    reduction.sourceSpellId,
    reduction.sourceCombatantId,
    reduction.targetId,
    reduction.damageType,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} damage reduction`,
  };
}

function spellAttackSequencePartConcentrationSavingThrowHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  base: BattleConcentrationSavingThrowHole,
): BattleConcentrationSavingThrowHole {
  const protocolId = [
    "battle:spell:attack-sequence-part-concentration-save",
    invocation.spell.id,
    partIndex,
    base.combatantId,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    ...base,
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} Concentration Constitution Saving Throw`,
  };
}

function spellAttackSequencePartDamageDispositionHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
  targetId: CombatantId,
) {
  const protocolId = [
    "battle:spell:attack-sequence-part-damage-disposition",
    invocation.spell.id,
    partIndex,
    targetId,
  ].join(":");
  const partName = spellAttackSequencePartName();
  return {
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} damage disposition`,
  };
}
