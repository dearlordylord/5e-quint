// Reaction modifier choice, roll, and resource helpers extracted from dispatcher.ts.
// Owns reaction roll/damage reduction offers and spending mechanics.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  AbilityModifier,
  DifficultyClass,
  damageAmount as toDamageAmount,
  difficultyClass,
  type DamageDieSize,
} from "@dnd/shared/types";

import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";

import type { DamageType } from "@dnd/surface/surface/types";

import { Match } from "effect";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";

import { CombatantId } from "../identity.ts";

import { combatantCanSee } from "./creature-state-leaves.ts";

import {
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
} from "./creature-state.ts";

import { combatantProficiencyBonus } from "./movement-speed.ts";
import { battleAttackHostParticipantId } from "./attack-damage-events.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
  type CharacterUnitProcedureSource,
  type UnitFeatureProcedureExecution,
} from "../character-execution.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";

import { signedModifier } from "./statblock-attacks.ts";

import type {
  BattleCreatureState,
  BattleFill,
  BattleHole,
  BattleInterruptCheckpointInput,
  BattleReactionModifierChoice,
  BattleInterruptProcedureChoice,
  BattleRolledDiceFill,
  BattleState,
} from "../battle-reducer.ts";
import {
  REACTION_MODIFIER_ROLL_HOLE_ID,
  REACTION_MODIFIER_ROLL_HOLE_INSTANCE,
  validateRolledDiceFillForDiceExpr,
} from "../battle-reducer.ts";

type ReactionRollOrDamageReductionExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "reactionRollOrDamageReduction" }
>;
type ReactionRollOrDamageReductionModifier =
  ReactionRollOrDamageReductionExecution["modifiers"][number];
type ReactionReductionDiceFacts = {
  readonly dice: number;
  readonly dieSize: DamageDieSize;
  readonly flatModifier: number;
};
export function spendReactionModifierResource(
  state: BattleState,
  reactorId: CombatantId,
  source: CharacterUnitProcedureSource,
  choice: BattleReactionModifierChoice,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return state;
  if (
    choice.kind === "attackDamageReduction" &&
    choice.zeroDamageRedirect !== undefined
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((resource) =>
          (choice.reduction.kind === "rolled" &&
          "spends" in choice.reduction
            ? resource.resourcePoolRef ===
              choice.reduction.spends.resourcePoolRef
            : source.kind === "resourcePool" &&
              resource.resourcePoolRef === source.resourcePoolRef) &&
          resourceHasUsesRemaining(resource)
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  };
}

export function reactionModifierProcedureSource(
  state: BattleState,
  reactorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly source: CharacterUnitProcedureSource;
      readonly execution: ReactionRollOrDamageReductionExecution;
    }
  | undefined {
  const reactor = state.combatants.get(reactorId);
  if (!isCharacterBattleCreatureState(reactor)) return undefined;
  const procedure = characterUnitProcedure(
    reactor.origin.execution,
    procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "reactionRollOrDamageReduction"
    ? { source: procedure.source, execution: procedure.execution }
    : undefined;
}

export function rolledDiceFillTotal(
  fill: BattleRolledDiceFill,
  expr: { readonly dice: number; readonly dieSize: DamageDieSize },
): number | null {
  const validation = validateRolledDiceFillForDiceExpr(fill, expr);
  if (validation !== null) {
    return null;
  }
  return rolledDiceTotal(fill.value);
}

export function reactionModifierReductionRoll(
  choice: BattleReactionModifierChoice,
  fills: readonly BattleFill[],
):
  | { readonly tag: "ok"; readonly value: number }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  if (
    choice.reduction.kind === "halfDamage" ||
    choice.reduction.kind === "flat"
  ) {
    const unexpectedRollFill = fills.find((fill) => fill.kind === "rolledDice");
    return unexpectedRollFill === undefined
      ? {
          tag: "ok",
          value:
            choice.reduction.kind === "flat"
              ? Number(choice.reduction.amount)
              : 0,
        }
      : {
          tag: "invalid",
          message: "This Reaction modifier does not accept a roll fill.",
        };
  }
  const fill = fills.find(
    (candidate): candidate is BattleRolledDiceFill =>
      isBattleRolledDiceFill(candidate) &&
      candidate.holeId === REACTION_MODIFIER_ROLL_HOLE_ID,
  );
  if (fill === undefined) {
    return {
      tag: "invalid",
      message: "This Reaction modifier requires one reduction roll fill.",
    };
  }
  if (
    fills.some(
      (candidate) =>
        isBattleRolledDiceFill(candidate) &&
        candidate.holeId === REACTION_MODIFIER_ROLL_HOLE_ID &&
        candidate !== fill,
    )
  ) {
    return {
      tag: "invalid",
      message: "Reaction modifier reduction roll was filled twice.",
    };
  }
  const expectedDieResults =
    "dice" in choice.reduction ? choice.reduction.dice : 1;
  const value = rolledDiceFillTotal(fill, {
    dice: expectedDieResults,
    dieSize: choice.reduction.dieSize,
  });
  if (value === null) {
    return {
      tag: "invalid",
      message:
        "Reaction modifier roll must provide one valid reduction die result.",
    };
  }
  if ("dice" in choice.reduction) {
    return reactionReductionResourceDieRollTotal({
      reduction: choice.reduction,
      rollTotal: value,
    });
  }
  return {
    tag: "ok",
    value: reactionModifierReductionTotal(choice.reduction, value),
  };
}

export function reactionModifierReductionTotal(
  reduction: Extract<
    BattleReactionModifierChoice["reduction"],
    { readonly kind: "rolled" }
  >,
  rollTotal: number,
): number {
  return rollTotal + reduction.flatModifier;
}

export function reactionReductionResourceDieRollTotal(input: {
  readonly reduction: ReactionReductionDiceFacts;
  readonly rollTotal: number;
}):
  | { readonly tag: "ok"; readonly value: number }
  | { readonly tag: "invalid"; readonly message: string } {
  const minimumRollTotal = input.reduction.dice;
  const maximumRollTotal = input.reduction.dice * input.reduction.dieSize;
  if (
    input.rollTotal < minimumRollTotal ||
    input.rollTotal > maximumRollTotal ||
    !Number.isInteger(input.rollTotal)
  ) {
    return {
      tag: "invalid",
      message: `reduction roll must be a ${reactionReductionResourceDieLabel(input.reduction)} result.`,
    };
  }
  return {
    tag: "ok",
    value: input.rollTotal + input.reduction.flatModifier,
  };
}

export function reactionReductionResourceDieLabel(
  reduction: ReactionReductionDiceFacts,
): string {
  return `${reduction.dice}d${reduction.dieSize}${signedModifier(reduction.flatModifier)}`;
}

export function isBattleRolledDiceFill(
  fill: BattleFill,
): fill is BattleRolledDiceFill {
  return fill.kind === "rolledDice";
}

export function reactionRollOrDamageReductionChoices(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): readonly BattleInterruptProcedureChoice[] {
  if (
    frame.trigger !== "attackHit" &&
    frame.trigger !== "attackDamage" &&
    frame.trigger !== "creatureFalls"
  ) {
    return [];
  }
  return [...state.combatants].flatMap(([reactorId, reactor]) => {
    if (
      !isCharacterBattleCreatureState(reactor) ||
      !combatantCanTakeReactions(reactor)
    ) {
      return [];
    }
    return reactor.origin.execution.procedureBindings.flatMap((binding) => {
      const procedure = binding.procedure;
      if (
        procedure.kind !== "unitFeature" ||
        procedure.execution.kind !== "reactionRollOrDamageReduction"
      ) {
        return [];
      }
      const execution = procedure.execution;
      return execution.modifiers.flatMap((modifier) =>
        reactionRollOrDamageReductionChoiceForProfile(
          state,
          frame,
          reactorId,
          binding.procedureRef,
          procedure.source,
          execution,
          modifier,
        ),
      );
    });
  });
}

export function reactionRollOrDamageReductionChoiceForProfile(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
  reactorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  source: CharacterUnitProcedureSource,
  execution: ReactionRollOrDamageReductionExecution,
  modifier: ReactionRollOrDamageReductionModifier,
): readonly BattleInterruptProcedureChoice[] {
  if (!reactionModifierResourceAvailable(state, reactorId, source, modifier)) {
    return [];
  }
  if (
    frame.trigger === "attackHit" &&
    ((modifier.kind === "attackRollReduction" &&
      combatantCanSee(state, reactorId, frame.attackerId)) ||
      (modifier.kind === "attackDamageReduction" &&
        reactorId === frame.targetId &&
        (modifier.requiresVisibleAttacker !== true ||
          combatantCanSee(state, reactorId, frame.attackerId)) &&
        (modifier.damageIncludes === undefined ||
          modifier.damageIncludes.some((damageType) =>
            frame.damageTypes.includes(damageType),
          ))))
  ) {
    if (modifier.kind === "attackDamageReduction") {
      const reactor = state.combatants.get(reactorId);
      if (!isCharacterBattleCreatureState(reactor)) {
        return [];
      }
      const zeroDamageRedirect =
        "zeroDamageRedirect" in modifier
          ? modifier.zeroDamageRedirect
          : undefined;
      return [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId,
          choice: {
            kind: "attackDamageReduction",
            procedureRef,
            reduction:
              modifier.reduction.kind === "halfDamage"
                ? { kind: "halfDamage" }
                : {
                    kind: "rolled",
                    flatModifier:
                      Number(
                        characterAbilityModifier(reactor, "dex"),
                      ) + Number(execution.classLevel),
                    dieSize: modifier.reduction.dieSize,
                  },
            ...(zeroDamageRedirect === undefined
              ? {}
              : {
                  zeroDamageRedirect: {
                    spends: zeroDamageRedirect.spends,
                    saveAbility: zeroDamageRedirect.save.ability,
                    saveDc: abilityProficiencyDifficultyClass(
                      reactor,
                      zeroDamageRedirect.save.dc,
                    ),
                    damageDice: zeroDamageRedirect.damage.dice,
                    damageAbilityModifier: characterAbilityModifier(
                      reactor,
                      zeroDamageRedirect.damage.ability,
                    ),
                    attackKind: frame.attackKind,
                    targetGate: zeroDamageRedirect.targetGate,
                    originalDamageType: attackDamageReductionOriginalDamageType(
                      frame.damageTypes,
                      zeroDamageRedirect.damage.damageType,
                    ),
                  },
                }),
          },
          initialHoles:
            modifier.reduction.kind === "halfDamage"
              ? []
              : [reactionModifierRollHole("attackDamageReduction")],
        },
      ];
    }
    return [
      {
        kind: "reactionRollOrDamageReduction",
        reactorId,
        choice: {
          kind: "attackRollReduction",
          procedureRef,
          reduction: {
            kind: "rolled",
            dice: modifier.reduction.dice,
            flatModifier: modifier.reduction.flatModifier,
            dieSize: modifier.reduction.dieSize,
            spends: modifier.reduction.spends,
          },
        },
        initialHoles: [
          reactionModifierRollHole("attackRollReduction"),
        ],
      },
    ];
  }
  if (frame.trigger !== "attackDamage") {
    if (frame.trigger === "creatureFalls") {
      return reactionRollOrDamageReductionFallChoiceForProfile(
        frame,
        reactorId,
        source,
        execution,
        procedureRef,
        modifier,
      );
    }
    return [];
  }
  if (
    modifier.kind === "attackDamageRollReduction" &&
    frame.continuation.damageInput.kind === "rolledDamage" &&
    combatantCanSee(
      state,
      reactorId,
      battleAttackHostParticipantId(frame.continuation.participant),
    )
  ) {
    return [
      {
        kind: "reactionRollOrDamageReduction",
        reactorId,
        choice: {
          kind: "damageRollReduction",
          procedureRef,
          reduction: {
            kind: "rolled",
            dice: modifier.reduction.dice,
            flatModifier: modifier.reduction.flatModifier,
            dieSize: modifier.reduction.dieSize,
            spends: modifier.reduction.spends,
          },
        },
        initialHoles: [
          reactionModifierRollHole("damageRollReduction"),
        ],
      },
    ];
  }
  return [];
}

function reactionRollOrDamageReductionFallChoiceForProfile(
  frame: Extract<
    BattleInterruptCheckpointInput,
    { readonly trigger: "creatureFalls" }
  >,
  reactorId: CombatantId,
  _source: CharacterUnitProcedureSource,
  execution: ReactionRollOrDamageReductionExecution,
  procedureRef: BattleProcedureExecutionRef,
  modifier: ReactionRollOrDamageReductionModifier,
): readonly BattleInterruptProcedureChoice[] {
  if (
    modifier.kind !== "fallDamageReduction" ||
    reactorId !== frame.fallingCreatureId
  ) {
    return [];
  }
  return [
    {
      kind: "reactionRollOrDamageReduction",
      reactorId,
      choice: {
        kind: "fallDamageReduction",
        procedureRef,
        reduction: {
          kind: "flat",
          amount: toDamageAmount(
            Number(execution.classLevel) * modifier.reduction.multiplier,
          ),
        },
      },
      initialHoles: [],
    },
  ];
}

export function reactionModifierRollHole(
  _modifierKind: BattleReactionModifierChoice["kind"],
): BattleHole {
  return {
    kind: "rolledDice",
    holeId: REACTION_MODIFIER_ROLL_HOLE_ID,
    holeInstanceKey: REACTION_MODIFIER_ROLL_HOLE_INSTANCE,
    label: "Reaction modifier reduction roll",
  };
}

export function characterAbilityModifier(
  combatant: BattleCreatureState & {
    readonly origin: Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >;
  },
  ability: "dex" | "wis",
): AbilityModifier {
  return combatant.armorClass.abilityModifiers[ability];
}

export function abilityProficiencyDifficultyClass(
  combatant: BattleCreatureState & {
    readonly origin: Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >;
  },
  dc: {
    readonly base: 8;
    readonly ability: "wis";
  },
): DifficultyClass {
  return difficultyClass(
    dc.base +
      Number(characterAbilityModifier(combatant, dc.ability)) +
      combatantProficiencyBonus(combatant),
  );
}

export function attackDamageReductionOriginalDamageType(
  damageTypes: readonly DamageType[],
  damageTypeProjection: "sameTypeDealtByAttack",
): DamageType {
  return Match.value(damageTypeProjection).pipe(
    Match.when(
      "sameTypeDealtByAttack",
      () =>
        damageTypes.find(
          (damageType) =>
            damageType === "bludgeoning" ||
            damageType === "piercing" ||
            damageType === "slashing",
        ) ?? "bludgeoning",
    ),
    Match.exhaustive,
  );
}

export function reactionModifierResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  source: CharacterUnitProcedureSource,
  modifier: ReactionRollOrDamageReductionModifier,
): boolean {
  if (
    modifier.kind === "attackDamageReduction" &&
    "zeroDamageRedirect" in modifier &&
    modifier.zeroDamageRedirect !== undefined
  ) {
    return true;
  }
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") return false;
  const resourceSpend = reactionModifierResourceSpend(modifier);
  if (resourceSpend !== null) {
    const resource = reactor.origin.resources.find(
      (candidate) =>
        candidate.resourcePoolRef === resourceSpend.resourcePoolRef,
    );
    return resource !== undefined && resourceHasUsesRemaining(resource);
  }
  const resource =
    source.kind === "resourcePool"
      ? reactor.origin.resources.find(
          (candidate) =>
            candidate.resourcePoolRef === source.resourcePoolRef,
        )
      : undefined;
  return resource === undefined || resourceHasUsesRemaining(resource);
}

export function reactionModifierResourceSpend(
  modifier: ReactionRollOrDamageReductionModifier,
): Extract<
  ReactionRollOrDamageReductionModifier["reduction"],
  { readonly spends: unknown }
>["spends"] | null {
  return "spends" in modifier.reduction ? modifier.reduction.spends : null;
}
