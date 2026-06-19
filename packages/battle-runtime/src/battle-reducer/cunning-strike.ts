// Cunning Strike Rogue damage-exchange rider.
// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike

import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { difficultyClass, movementFeet, SIZES } from "@dnd/shared/types";
import type { Ability, Size } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type { BattleMovementSpeedKind } from "../battle-subjects.ts";
import type {
  AttackDamageRider,
  BattleCunningStrikeDamageContinuation,
  BattleCunningStrikeOption,
  BattleCunningStrikeOptionSelection,
  BattleCunningStrikeSelectedOption,
  BattleFill,
  BattleHole,
  BattleMovementHole,
  BattleState,
  BattleToolPossessionFactsHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import type {
  CunningStrikeEquipmentGatedConditionSaveEffect,
  CunningStrikeOption,
  CunningStrikeOptionEffect,
  CunningStrikePostDamageMovementEffect,
  CunningStrikeSizeGatedConditionSaveEffect,
} from "../unit-feature-support.ts";
import { CUNNING_STRIKE_SUPPORT_PROFILE } from "../unit-feature-support.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import {
  CUNNING_STRIKE_MOVEMENT_HOLE_ID,
  CUNNING_STRIKE_MOVEMENT_HOLE_INSTANCE,
  CUNNING_STRIKE_SAVE_HOLE_ID,
  CUNNING_STRIKE_SAVE_HOLE_INSTANCE,
  CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID,
  CUNNING_STRIKE_TOOL_POSSESSION_HOLE_INSTANCE,
} from "./domain-constants.ts";
import {
  combatantProficiencyBonus,
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { applyBattleMovement } from "./readied-release.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "./spell-condition-effects-helpers.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { parseBattleMovement } from "./turn-end-movement.ts";

const byCunningStrikeEffectKind = Match.discriminator("kind");

export type CunningStrikeContext = BattleCunningStrikeSelectedOption;

type CunningStrikeMovementBudget = {
  readonly movementBudgetFeet: ReturnType<typeof movementFeet>;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: ReturnType<typeof movementFeet>;
  }[];
};

type CunningStrikeAfterDamageFills = {
  readonly savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly movement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  readonly toolPossession:
    | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
    | undefined;
};

export type CunningStrikeAfterDamageResult =
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid"; readonly message: string };

export function eligibleCunningStrikeContexts(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly eligibleAttackDamageRiders: readonly AttackDamageRider[];
}): readonly CunningStrikeContext[] {
  const attacker = input.state.combatants.get(input.attackerId);
  const target = input.state.combatants.get(input.targetId);
  if (
    attacker?.origin.kind !== "character" ||
    target === undefined ||
    input.eligibleAttackDamageRiders.length === 0
  ) {
    return [];
  }
  const targetSize = combatantEffectiveSize(target);
  return attacker.origin.characterUnitRefs.flatMap((unitRef) =>
    unitRef.supportProfiles.flatMap((supportProfile) => {
      if (
        typeof supportProfile !== "object" ||
        supportProfile.kind !== CUNNING_STRIKE_SUPPORT_PROFILE
      ) {
        return [];
      }
      const sourceRider = input.eligibleAttackDamageRiders.find(
        (rider) =>
          rider.unitId === supportProfile.cunningStrike.trigger.sourceUnitId,
      );
      if (sourceRider === undefined) {
        return [];
      }
      return supportProfile.cunningStrike.options.flatMap((option) =>
        cunningStrikeOptionEligibleForTarget(option, targetSize)
          ? [
              {
                attackerId: input.attackerId,
                targetId: input.targetId,
                unitId: unitRef.unitId,
                label: supportProfile.unit.name,
                sourceDamageRiderUnitId: sourceRider.unitId,
                support: supportProfile,
                option,
              },
            ]
          : [],
      );
    }),
  );
}

export function cunningStrikeDamageRollOptions(
  contexts: readonly CunningStrikeContext[],
): readonly BattleCunningStrikeOption[] {
  return contexts.map((context) => ({
    unitId: context.unitId,
    optionId: context.option.selectionId,
    label: `${context.label}: ${cunningStrikeOptionLabel(context.option.effect)}`,
    sourceDamageRiderUnitId: context.sourceDamageRiderUnitId,
    dieCost: {
      dice: context.option.cost.dice,
      dieSize: context.option.cost.dieSize,
    },
  }));
}

export function selectedCunningStrikeContext(
  contexts: readonly CunningStrikeContext[],
  selection: BattleCunningStrikeOptionSelection | undefined,
): CunningStrikeContext | null {
  if (selection === undefined) {
    return null;
  }
  return (
    contexts.find(
      (context) =>
        context.unitId === selection.unitId &&
        context.option.selectionId === selection.optionId,
    ) ?? null
  );
}

export function cunningStrikeDamageContinuation(
  selected: CunningStrikeContext | null,
): BattleCunningStrikeDamageContinuation | undefined {
  return selected === null ? undefined : { selected, fills: [] };
}

export function validateCunningStrikeDamageRollSelection(input: {
  readonly fill: {
    readonly cunningStrikeOption?: BattleCunningStrikeOptionSelection;
  };
  readonly selectedAttackDamageRiders: readonly AttackDamageRider[];
  readonly contexts: readonly CunningStrikeContext[];
}): string | null {
  const selection = input.fill.cunningStrikeOption;
  if (selection === undefined) {
    return null;
  }
  const context = selectedCunningStrikeContext(input.contexts, selection);
  if (context === null) {
    return "Selected Cunning Strike option is not eligible for this attack.";
  }
  const sourceRider = input.selectedAttackDamageRiders.find(
    (rider) => rider.unitId === context.sourceDamageRiderUnitId,
  );
  if (sourceRider === undefined) {
    return "Cunning Strike requires selecting the triggering Sneak Attack damage rider.";
  }
  return attackDamageRiderWithCunningStrikeCost(sourceRider, context) === null
    ? "Cunning Strike requires enough selected Sneak Attack dice to pay the option cost."
    : null;
}

export function attackDamageRidersAfterCunningStrikeCost(
  selectedAttackDamageRiders: readonly AttackDamageRider[],
  context: CunningStrikeContext | null,
): readonly AttackDamageRider[] {
  if (context === null) {
    return selectedAttackDamageRiders;
  }
  return selectedAttackDamageRiders.map((rider) =>
    rider.unitId === context.sourceDamageRiderUnitId
      ? (attackDamageRiderWithCunningStrikeCost(rider, context) ?? rider)
      : rider,
  );
}

export function resolveCunningStrikeAfterAttackDamage(input: {
  readonly state: BattleState;
  readonly selected: CunningStrikeContext | null;
  readonly savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly movement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  readonly toolPossession:
    | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
    | undefined;
}): CunningStrikeAfterDamageResult {
  if (input.selected === null) {
    return input.savingThrow === undefined &&
      input.movement === undefined &&
      input.toolPossession === undefined
      ? { tag: "ok", state: input.state }
      : {
          tag: "invalid",
          message:
            "Cunning Strike after-damage fills require a selected Cunning Strike option.",
        };
  }
  const selected = input.selected;
  return Match.value(selected.option.effect).pipe(
    byCunningStrikeEffectKind("equipmentGatedConditionSave", (effect) =>
      resolveCunningStrikeEquipmentGatedConditionSave(
        input.state,
        selected,
        effect,
        {
          savingThrow: input.savingThrow,
          toolPossession: input.toolPossession,
          movement: input.movement,
        },
      ),
    ),
    byCunningStrikeEffectKind("sizeGatedConditionSave", (effect) =>
      resolveCunningStrikeSizeGatedConditionSave(
        input.state,
        selected,
        effect,
        {
          savingThrow: input.savingThrow,
          toolPossession: input.toolPossession,
          movement: input.movement,
        },
      ),
    ),
    byCunningStrikeEffectKind("postDamageMovement", (effect) =>
      resolveCunningStrikePostDamageMovement(input.state, selected, effect, {
        savingThrow: input.savingThrow,
        toolPossession: input.toolPossession,
        movement: input.movement,
      }),
    ),
    Match.exhaustive,
  );
}

function attackDamageRiderWithCunningStrikeCost(
  rider: AttackDamageRider,
  context: CunningStrikeContext,
): AttackDamageRider | null {
  if (
    rider.damage.dieSize !== context.option.cost.dieSize ||
    rider.damage.dice <= context.option.cost.dice
  ) {
    return null;
  }
  return {
    ...rider,
    damage: {
      ...rider.damage,
      dice: rider.damage.dice - context.option.cost.dice,
    },
  };
}

function cunningStrikeOptionEligibleForTarget(
  option: CunningStrikeOption,
  targetSize: Size,
): boolean {
  return option.effect.kind !== "sizeGatedConditionSave"
    ? true
    : SIZES.indexOf(targetSize) <= SIZES.indexOf(option.effect.target.maxSize);
}

function resolveCunningStrikeEquipmentGatedConditionSave(
  state: BattleState,
  context: CunningStrikeContext,
  effect: CunningStrikeEquipmentGatedConditionSaveEffect,
  fills: CunningStrikeAfterDamageFills,
): CunningStrikeAfterDamageResult {
  if (fills.movement !== undefined) {
    return {
      tag: "invalid",
      message:
        "Cunning Strike equipment-gated condition effect does not accept movement fills.",
    };
  }
  if (fills.toolPossession === undefined) {
    return {
      tag: "needsHoles",
      holes: [
        cunningStrikeToolPossessionHole(
          context.attackerId,
          effect.requires.equipment.toolId,
        ),
      ],
    };
  }
  if (
    fills.toolPossession.holeId !== CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID ||
    !fills.toolPossession.value.toolIdsOnPerson.includes(
      effect.requires.equipment.toolId,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Cunning Strike equipment-gated condition effect requires the configured tool on the Rogue's person.",
    };
  }
  if (fills.savingThrow === undefined) {
    return {
      tag: "needsHoles",
      holes: [
        cunningStrikeSavingThrowHole(state, context, {
          ability: effect.save.ability,
          condition: effect.onFail.condition,
        }),
      ],
    };
  }
  const validation = validateCunningStrikeSavingThrow(
    fills.savingThrow,
    context.targetId,
  );
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  const savingThrowState = extendSavingThrowOngoingFeatures(
    state,
    context.attackerId,
    [context.targetId],
  );
  return {
    tag: "ok",
    state:
      fills.savingThrow.value.outcomes[0]?.succeeded === true
        ? savingThrowState
        : applyCunningStrikeConditionEndTurnSaveFailure(
            savingThrowState,
            context,
            effect,
          ),
  };
}

function resolveCunningStrikeSizeGatedConditionSave(
  state: BattleState,
  context: CunningStrikeContext,
  effect: CunningStrikeSizeGatedConditionSaveEffect,
  fills: CunningStrikeAfterDamageFills,
): CunningStrikeAfterDamageResult {
  if (fills.movement !== undefined || fills.toolPossession !== undefined) {
    return {
      tag: "invalid",
      message:
        "Cunning Strike size-gated condition effect only accepts the requested Saving Throw.",
    };
  }
  if (fills.savingThrow === undefined) {
    return {
      tag: "needsHoles",
      holes: [
        cunningStrikeSavingThrowHole(state, context, {
          ability: effect.save.ability,
        }),
      ],
    };
  }
  const validation = validateCunningStrikeSavingThrow(
    fills.savingThrow,
    context.targetId,
  );
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  const savingThrowState = extendSavingThrowOngoingFeatures(
    state,
    context.attackerId,
    [context.targetId],
  );
  return {
    tag: "ok",
    state:
      fills.savingThrow.value.outcomes[0]?.succeeded === true
        ? savingThrowState
        : applyCunningStrikeImmediateConditionFailure(
            savingThrowState,
            context,
            effect,
          ),
  };
}

function resolveCunningStrikePostDamageMovement(
  state: BattleState,
  context: CunningStrikeContext,
  effect: CunningStrikePostDamageMovementEffect,
  fills: CunningStrikeAfterDamageFills,
): CunningStrikeAfterDamageResult {
  if (fills.savingThrow !== undefined || fills.toolPossession !== undefined) {
    return {
      tag: "invalid",
      message:
        "Cunning Strike post-damage movement only accepts movement fills.",
    };
  }
  const movementBudget = cunningStrikeWithdrawMovementBudget(
    state,
    context.attackerId,
  );
  if (fills.movement === undefined) {
    return {
      tag: "needsHoles",
      holes: [cunningStrikeMovementHole(context.attackerId, movementBudget)],
    };
  }
  const speedKindBudget = movementBudget.speedKinds.find(
    (candidate) => candidate.kind === fills.movement?.value.speedKind,
  );
  if (speedKindBudget === undefined) {
    return {
      tag: "invalid",
      message:
        "Cunning Strike movement speed kind is not represented by this combatant.",
    };
  }
  if (
    effect.movement.opportunityAttacks === "doesNotProvoke" &&
    fills.movement.value.provokedOpportunityAttacks.length > 0
  ) {
    return {
      tag: "invalid",
      message: "Cunning Strike movement does not provoke Opportunity Attacks.",
    };
  }
  const movement = parseBattleMovement(
    state,
    context.attackerId,
    fills.movement,
    {
      movementBudgetFeet: speedKindBudget.movementBudgetFeet,
      spendsTurnMovement: false,
    },
  );
  if (movement.tag === "invalid") {
    return { tag: "invalid", message: movement.message };
  }
  return { tag: "ok", state: applyBattleMovement(state, movement.movement) };
}

function cunningStrikeSavingThrowHole(
  state: BattleState,
  context: CunningStrikeContext,
  save: {
    readonly ability: Ability;
    readonly condition?: "poisoned";
  },
): BattleUnitFeatureSavingThrowOutcomeHole {
  return {
    kind: "savingThrowOutcome",
    holeId: CUNNING_STRIKE_SAVE_HOLE_ID,
    holeInstanceKey: CUNNING_STRIKE_SAVE_HOLE_INSTANCE,
    label: `Cunning Strike ${save.ability.toUpperCase()} Saving Throw`,
    unitFeature: {
      unitId: context.unitId,
      label: context.label,
    },
    ability: save.ability,
    dc: requireCunningStrikeSaveDc(state, context),
    targetIds: [context.targetId],
    targetRollModes: savingThrowRollModeProjections(
      state,
      save.ability,
      save.condition === undefined ? undefined : { condition: save.condition },
    ).filter((projection) => projection.targetId === context.targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === context.targetId,
    ),
  };
}

function cunningStrikeToolPossessionHole(
  actorId: CombatantId,
  toolId: "poisoners_kit",
): BattleToolPossessionFactsHole {
  return {
    kind: "toolPossessionFacts",
    holeId: CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID,
    holeInstanceKey: CUNNING_STRIKE_TOOL_POSSESSION_HOLE_INSTANCE,
    label: "Cunning Strike Poisoner's Kit on person",
    actorId,
    toolIds: [toolId],
  };
}

function cunningStrikeMovementHole(
  actorId: CombatantId,
  movementBudget: CunningStrikeMovementBudget,
): BattleMovementHole {
  return {
    kind: "movement",
    holeId: CUNNING_STRIKE_MOVEMENT_HOLE_ID,
    holeInstanceKey: CUNNING_STRIKE_MOVEMENT_HOLE_INSTANCE,
    label: "Cunning Strike Withdraw movement",
    actorId,
    movementBudgetFeet: movementBudget.movementBudgetFeet,
    speedKinds: movementBudget.speedKinds,
  };
}

function validateCunningStrikeSavingThrow(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
): string | null {
  if (fill.holeId !== CUNNING_STRIKE_SAVE_HOLE_ID) {
    return "Cunning Strike Saving Throw uses the wrong hole.";
  }
  if ("area" in fill.value) {
    return "Cunning Strike Saving Throw outcome must not include area facts.";
  }
  return fill.value.outcomes.length === 1 &&
    fill.value.outcomes[0]?.targetId === targetId
    ? null
    : "Cunning Strike Saving Throw must target the attacked creature.";
}

function applyCunningStrikeConditionEndTurnSaveFailure(
  state: BattleState,
  context: CunningStrikeContext,
  effect: CunningStrikeEquipmentGatedConditionSaveEffect,
): BattleState {
  const target = state.combatants.get(context.targetId);
  if (target === undefined) return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(context.targetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, effect.onFail.condition),
      ),
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "unitFeatureConditionEndTurnSave" &&
              candidate.sourceUnitId === context.unitId &&
              candidate.sourceCombatantId === context.attackerId &&
              candidate.condition === effect.onFail.condition
            ),
        ),
        {
          kind: "unitFeatureConditionEndTurnSave",
          sourceUnitId: context.unitId,
          sourceCombatantId: context.attackerId,
          condition: effect.onFail.condition,
          conditionHadNonSpellSource:
            conditionHadNonSpellSourceBeforeSpellEffect(
              target,
              effect.onFail.condition,
            ),
          save: {
            ability: effect.save.ability,
            dc: requireCunningStrikeSaveDc(state, context),
          },
          expiresAt: {
            kind: "duration",
            durationTicks: effect.onFail.durationTicks,
          },
        },
      ],
    }),
  };
}

function applyCunningStrikeImmediateConditionFailure(
  state: BattleState,
  context: CunningStrikeContext,
  effect: CunningStrikeSizeGatedConditionSaveEffect,
): BattleState {
  const target = state.combatants.get(context.targetId);
  if (target === undefined) return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      context.targetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, effect.onFail.condition),
      ),
    ),
  };
}

function cunningStrikeOptionLabel(effect: CunningStrikeOptionEffect): string {
  return Match.value(effect).pipe(
    byCunningStrikeEffectKind(
      "equipmentGatedConditionSave",
      () => "equipment-gated condition save",
    ),
    byCunningStrikeEffectKind(
      "sizeGatedConditionSave",
      () => "size-gated condition save",
    ),
    byCunningStrikeEffectKind(
      "postDamageMovement",
      () => "post-damage movement",
    ),
    Match.exhaustive,
  );
}

function requireCunningStrikeSaveDc(
  state: BattleState,
  context: CunningStrikeContext,
): BattleUnitFeatureSavingThrowOutcomeHole["dc"] {
  const actor = state.combatants.get(context.attackerId);
  if (actor === undefined) {
    throw new Error("Cunning Strike save DC requires an actor.");
  }
  if (actor.origin.kind !== "character") {
    throw new Error("Cunning Strike save DC requires a character actor.");
  }
  const abilityModifier = scoreModifier(
    actor.origin.d20Statistics.abilityScores[
      context.support.cunningStrike.effectSaveDc.ability
    ],
  );
  return {
    kind: "fixed" as const,
    dc: difficultyClass(
      context.support.cunningStrike.effectSaveDc.base +
        abilityModifier +
        combatantProficiencyBonus(actor),
    ),
  };
}

function cunningStrikeWithdrawMovementBudget(
  state: BattleState,
  attackerId: CombatantId,
): CunningStrikeMovementBudget {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return { movementBudgetFeet: movementFeet(0), speedKinds: [] };
  }
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === attackerId,
  );
  const speedKinds = representedMovementSpeedKinds(attacker).map((kind) => ({
    kind,
    movementBudgetFeet: movementFeet(
      Math.floor(
        Number(effectiveMovementSpeed(attacker, kind, isGrappled)) / 2,
      ),
    ),
  }));
  return {
    movementBudgetFeet: movementFeet(
      Math.max(
        0,
        ...speedKinds.map((speedKind) => Number(speedKind.movementBudgetFeet)),
      ),
    ),
    speedKinds,
  };
}
