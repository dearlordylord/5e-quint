// Held-light, rider, ready, and release spell resolution extracted from spells-resolve.ts.

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
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
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleDancingLightsPlacementValue,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type ReadiedSpellInvocation,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";
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
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiderEffect,
  activeMarkedDamageRiders,
} from "./damage-helpers.ts";
import { hideousLaughterDamageRepeatSaveFillCheck } from "./hideous-laughter-repeat-save.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applyDancingLightsSpellEffect,
  applyHeldLightSpellEffect,
  applyMarkedDamageRiderSpellEffect,
  applyObjectLightSpellEffect,
  repositionDancingLightsSpellEffect,
  dancingLightsFromEffect,
  applyWeaponAttackOverrideSpellEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellAbilityChoiceHole,
  spellAttackRollHole,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellObjectLightTargetFact,
  spellObjectTargetHole,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { markSpellSlotExpendedThisTurn } from "./spells-profiles.ts";
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

type SpellCastResourceSpendResult =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;
import { resolvePreparedSlotSpellRelease } from "./spells-resolve-prepared-slot.ts";
import { resolveSaveGateDamageSpellRelease } from "./spells-resolve-save-gates.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spellDancingLightsPlacementHole } from "./spells-targeting.ts";

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
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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

export function resolveDancingLightsCastSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  const placement = input.fillSet.dancingLightsPlacement?.value;
  if (placement === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDancingLightsPlacementHole(input.invocation, input.invocation.form, []),
    ]);
  }
  const placementError = dancingLightsCastPlacementError(
    input.invocation,
    placement,
  );
  if (placementError !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      placementError,
    );
  }
  if (placement.mode !== "cast") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights placement does not match the selected form.",
    );
  }
  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [],
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
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyDancingLightsSpellEffect(
    resourced.state,
    input.actorId,
    input.invocation,
    placement,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

export function resolveDancingLightsRepositionSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  const placement = input.fillSet.dancingLightsPlacement?.value;
  if (placement === undefined) {
    const activeEffect = input.input.state.combatants
      .get(input.actorId)
      ?.activeEffects.find(
        (
          candidate,
        ): candidate is Extract<
          BattleActiveEffect,
          { readonly kind: "dancingLights" }
        > =>
          candidate.kind === "dancingLights" &&
          candidate.sourceSpellId === input.invocation.spell.id &&
          candidate.sourceCombatantId === input.actorId,
      );
    if (activeEffect === undefined) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Dancing Lights movement requires active lights from this spell.",
      );
    }
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      [
        spellDancingLightsPlacementHole(
          input.invocation,
          activeEffect.form,
          dancingLightsFromEffect(activeEffect).map((light) => light.lightId),
        ),
      ],
    );
  }
  const placementError = dancingLightsRepositionPlacementError(
    input.input.state,
    input.actorId,
    input.invocation,
    placement,
  );
  if (placementError !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      placementError,
    );
  }
  if (placement.mode !== "reposition") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights movement requires reposition placement.",
    );
  }
  const effected = repositionDancingLightsSpellEffect(
    input.input.state,
    input.actorId,
    input.invocation,
    placement,
  );
  const spent = spendActivationResource(effected.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  const state = {
    ...effected,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

function dancingLightsCastPlacementError(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >,
  placement: BattleDancingLightsPlacementValue,
): string | null {
  if (placement.mode !== "cast" || placement.form !== invocation.form) {
    return "Dancing Lights placement does not match the selected form.";
  }
  if (placement.form === "combinedMediumForm") {
    return placement.light.distanceFromCasterFeet > invocation.rangeFeet
      ? "Dancing Lights placement must be within the spell range."
      : null;
  }
  return dancingLightsSeparatePlacementError(
    placement.lights,
    invocation.rangeFeet,
    invocation.spacingFeet,
  );
}

function dancingLightsRepositionPlacementError(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >,
  placement: BattleDancingLightsPlacementValue,
): string | null {
  if (placement.mode !== "reposition") {
    return "Dancing Lights movement requires reposition placement.";
  }
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "dancingLights" }
      > =>
        candidate.kind === "dancingLights" &&
        candidate.sourceSpellId === invocation.spell.id &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect === undefined) {
    return "Dancing Lights movement requires active lights from this spell.";
  }
  if (placement.form !== effect.form) {
    return "Dancing Lights movement form does not match the active lights.";
  }
  const placements =
    placement.form === "combinedMediumForm"
      ? [placement.light]
      : placement.lights;
  if (
    placements.some(
      (candidate) => candidate.moveDistanceFeet > invocation.maxMoveFeet,
    )
  ) {
    return "Dancing Lights can move a light up to 60 feet.";
  }
  const currentDancingLightIds = dancingLightsFromEffect(effect).map(
    (dancingLight) => dancingLight.lightId,
  );
  const placedLightIds = placements.map((candidate) => candidate.lightId);
  if (
    placedLightIds.length !== new Set(placedLightIds).size ||
    placedLightIds.length !== currentDancingLightIds.length ||
    placedLightIds.some((lightId) => !currentDancingLightIds.includes(lightId))
  ) {
    return "Dancing Lights movement must place each active light identity.";
  }
  const inRange =
    placement.form === "combinedMediumForm"
      ? placement.light.distanceFromCasterFeet <= invocation.rangeFeet
        ? [placement.light]
        : []
      : placement.lights.filter(
          (candidate) =>
            candidate.distanceFromCasterFeet <= invocation.rangeFeet,
        );
  if (placement.form === "separateLights") {
    if (inRange.length === 0) {
      return null;
    }
    return dancingLightsSeparatePlacementError(
      inRange,
      invocation.rangeFeet,
      invocation.spacingFeet,
    );
  }
  return null;
}

function dancingLightsFillSetHasUnrelatedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.beamFills.some(
      (beamFill) =>
        beamFill.target !== undefined ||
        beamFill.attackRoll !== undefined ||
        beamFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

function dancingLightsSeparatePlacementError(
  placements: readonly {
    readonly distanceFromCasterFeet: number;
    readonly nearestSiblingDistanceFeet?: number;
  }[],
  rangeFeet: number,
  spacingFeet: number,
): string | null {
  if (placements.length === 0 || placements.length > 4) {
    return "Dancing Lights separate form requires one to four lights.";
  }
  if (
    placements.some((candidate) => candidate.distanceFromCasterFeet > rangeFeet)
  ) {
    return "Dancing Lights placement must be within the spell range.";
  }
  if (
    placements.length > 1 &&
    placements.some(
      (candidate) =>
        candidate.nearestSiblingDistanceFeet === undefined ||
        candidate.nearestSiblingDistanceFeet > spacingFeet,
    )
  ) {
    return "Dancing Lights separate lights must stay within 20 feet of another light.";
  }
  return null;
}

export function resolveWeaponAttackOverrideSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponAttackOverride" }
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
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon attack override spells do not use target, roll, damage, or save fills.",
    );
  }
  if (
    input.input.subject.componentWeaponItemId !==
    input.invocation.attachedWeapon.itemId
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Weapon attack override spell no longer matches the selected held weapon.",
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

  const effected = applyWeaponAttackOverrideSpellEffect(
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

export function resolveObjectLightSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectLight" }
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
      "Object light spells use only an object target fill.",
    );
  }
  if (input.fillSet.objectTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectTargetHole(input.invocation),
    ]);
  }
  const objectTarget = input.fillSet.objectTarget;
  const lightFact = spellObjectLightTargetFact(
    objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectLightTarget" }
      > => fact.kind === "spellObjectLightTarget",
    ),
    input.actorId,
    objectTarget.objectId,
    input.invocation,
  );
  if (lightFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Light object target must be Large or smaller and not worn or carried by someone else.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [],
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

  const effected = applyObjectLightSpellEffect(
    input.input.state,
    input.actorId,
    objectTarget.objectId,
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
    if (
      activeMark === null ||
      !markedDamageRiderTransferIsAvailable(input.input.state, activeMark)
    ) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Marked damage rider spells can move only after the marked target drops to 0 Hit Points and any later-turn timing is satisfied.",
      );
    }
  }
  if (
    input.invocation.action === "cast" &&
    input.invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
  ) {
    if (input.fillSet.abilityChoice === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellAbilityChoiceHole(input.invocation),
      ]);
    }
  } else if (input.fillSet.abilityChoice !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "This marked damage rider spell does not choose an ability.",
    );
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
      input.fillSet.abilityChoice,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const turnResources = clearPendingAttackRollMissToHitReplacementSelection(
    spent.right,
    input.actorId,
  );
  const resourced =
    input.invocation.resource.tag === "classFeatureFreeCast"
      ? spendClassFeatureFreeCastResource(
          {
            ...concentrationBase,
            currentTurnResources: turnResources,
          },
          input.actorId,
          input.invocation.resource.resourceUnitId,
          input.input.state,
        )
      : spendMarkedDamageRiderSpellSlot(
          {
            ...concentrationBase,
            currentTurnResources: turnResources,
          },
          input.actorId,
          input.invocation.resource.slotLevel,
          input.input.state,
        );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyMarkedDamageRiderSpellEffect(
    resourced.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.abilityChoice,
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

function spendMarkedDamageRiderSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  slotLevel: Extract<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "markedDamageRider"; readonly action: "cast" }
    >["resource"],
    { readonly tag: "spellSlot" }
  >["slotLevel"],
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    state.currentTurnResources,
  );
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  return {
    tag: "resolved",
    state: expendSpellSlot(
      {
        ...state,
        currentTurnResources: slotTurnResources.right,
      },
      actorId,
      slotLevel,
    ),
  };
}

function markedDamageRiderTransferIsAvailable(
  state: BattleState,
  activeMark: SpellMarkedDamageRider,
): boolean {
  if (activeMark.transfer.kind === "available") {
    return true;
  }
  if (activeMark.transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    currentActorId(state) !== activeMark.transfer.droppedOnTurn.actorId ||
    state.initiative.round !== activeMark.transfer.droppedOnTurn.round
  );
}

function spendClassFeatureFreeCastResource(
  state: BattleState,
  actorId: CombatantId,
  resourceUnitId: string,
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return invalidResult(
      errorState,
      "staleSubject",
      "Class feature free spell cast is no longer available for the current actor.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.unit.id === resourceUnitId &&
      resourceHasUsesRemaining(candidate),
  );
  if (resource === undefined) {
    return invalidResult(
      errorState,
      "staleSubject",
      "Class feature free spell cast is no longer available for the current actor.",
    );
  }
  return {
    tag: "resolved",
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...actor,
        origin: {
          ...actor.origin,
          resources: actor.origin.resources.map((candidate) =>
            candidate.unit.id === resourceUnitId
              ? spendCharacterResourceUse(candidate)
              : candidate,
          ),
        },
      }),
    },
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
    const requiredRollMode = requiredSpellAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
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
  const hideousLaughterSaveCheck = hideousLaughterDamageRepeatSaveFillCheck({
    target,
    damageAmount: spellDamageAmount,
    fills: fillSet.hideousLaughterDamageRepeatSaves,
  });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
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
    {
      concentrationSavingThrow: concentrationFill,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      damageSourceId: input.subject.actorId,
    },
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  const lit =
    invocation.procedure === "spellAttackDamage"
      ? applySpellLightEmitterEffects(
          effected,
          input.subject.actorId,
          { kind: "combatant", combatantId: target.combatantId },
          invocation,
        )
      : effected;
  const resolvedState = {
    ...lit,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      lit.currentTurnResources,
      input.subject.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}
