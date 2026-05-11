// Spell active-effect application extracted from spells-holes-fills.ts.

import { Match } from "effect";
import { type Round as RoundType } from "@dnd/shared/types";
import type { DamageType, Skill, SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { applyTemporaryHitPoints } from "./damage-apply.ts";
import { scalarBuffTemporaryHitPointsAmount } from "./spell-effects.ts";
import {
  conditionsAfterApplyingSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleCreatureState,
  type BattleFill,
  type BattleState,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellPostDamageRider,
  type SpellPostDamageRiderExpiration,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";

export function applySpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  if (invocation.postDamageRiders.length === 0) {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const activeEffects = invocation.postDamageRiders.reduce(
    (effects, rider): readonly BattleActiveEffect[] => {
      const replacedEffects = effects.filter((effect) =>
        spellPostDamageRiderReplacesActiveEffect(
          rider,
          effect,
          invocation.spell.id,
          actorId,
        ),
      );
      return [
        ...effects.filter((effect) => !replacedEffects.includes(effect)),
        spellPostDamageRiderActiveEffect({
          state,
          actorId,
          target,
          spellId: invocation.spell.id,
          rider,
        }),
      ];
    },
    target.activeEffects,
  );

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function battleCreatureWithSpellActiveEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterApplyingSpellConditionEffects(
          combatant.conditions,
          activeEffects,
        ),
      }
    : { ...combatant, activeEffects };
}

export function applyFailedSaveSpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
): BattleState {
  if (invocation.failedSavePostDamageRiders.length === 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const activeEffects = invocation.failedSavePostDamageRiders.reduce(
      (effects, rider): readonly BattleActiveEffect[] => [
        ...effects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "nextAttackRollBySelf",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          mode: rider.mode,
          expiresAt: activeEffectExpirationForPostDamageRider(
            state,
            actorId,
            target.combatantId,
            rider.expiresAt,
          ),
        },
      ],
      target.activeEffects,
    );
    combatants.set(targetId, { ...target, activeEffects });
  }
  return { ...state, combatants };
}

export function applyFailedSaveSpellConditionEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId &&
        effect.condition === invocation.effect.condition,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "spellCondition" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        condition: invocation.effect.condition,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          invocation.effect.condition,
        ),
        escape: invocation.effect.escape,
        expiresAt: activeEffectExpirationForPostDamageRider(
          state,
          actorId,
          target.combatantId,
          invocation.effect.expiresAt,
        ),
      },
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
  }
  return { ...state, combatants };
}

export function applyFailedSaveAttackRollAdvantageEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const nextEffect = {
      ...invocation.effect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "visibleAttackRollAgainstSelf" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    combatants.set(targetId, { ...target, activeEffects });
  }
  return { ...state, combatants };
}

export function activeEffectKindForSpellPostDamageRider(
  rider: SpellPostDamageRider,
): BattleActiveEffect["kind"] {
  return Match.value(rider).pipe(
    Match.when({ kind: "speedDelta" }, () => "speedDelta" as const),
    Match.when({ kind: "condition" }, () => "spellCondition" as const),
    Match.when(
      { kind: "opportunityAttackDenied" },
      () => "opportunityAttackDenied" as const,
    ),
    Match.when(
      { kind: "nextAttackRollAgainstTarget" },
      () => "nextAttackRollAgainstSelf" as const,
    ),
    Match.exhaustive,
  );
}

export function spellPostDamageRiderReplacesActiveEffect(
  rider: SpellPostDamageRider,
  effect: BattleActiveEffect,
  spellId: SpellRecord["id"],
  actorId: CombatantId,
): boolean {
  if (
    effect.kind !== activeEffectKindForSpellPostDamageRider(rider) ||
    effect.sourceSpellId !== spellId
  ) {
    return false;
  }
  return rider.kind === "speedDelta" || effect.sourceCombatantId === actorId;
}

export function spellPostDamageRiderExpiration(
  rider: SpellPostDamageRider,
): SpellPostDamageRiderExpiration | undefined {
  return "expiresAt" in rider ? rider.expiresAt : undefined;
}

export function spellPostDamageRiderActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly target: BattleCreatureState;
  readonly spellId: SpellRecord["id"];
  readonly rider: SpellPostDamageRider;
}): BattleActiveEffect {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    input.state,
    input.actorId,
    input.target.combatantId,
    spellPostDamageRiderExpiration(input.rider),
  );
  return Match.value(input.rider).pipe(
    Match.when({ kind: "speedDelta" }, (rider) => ({
      kind: "speedDelta" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      deltaFeet: rider.deltaFeet,
      expiresAt,
    })),
    Match.when({ kind: "condition" }, (rider) => ({
      kind: "spellCondition" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      condition: rider.condition,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        input.target,
        rider.condition,
      ),
      escape: null,
      expiresAt,
    })),
    Match.when({ kind: "opportunityAttackDenied" }, () => ({
      kind: "opportunityAttackDenied" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "nextAttackRollAgainstTarget" }, (rider) => ({
      kind: "nextAttackRollAgainstSelf" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      mode: rider.mode,
      expiresAt,
    })),
    Match.exhaustive,
  );
}

export function activeEffectExpirationForPostDamageRider(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  expiresAt:
    | SpellPostDamageRiderExpiration
    | SpellFailedSavePostDamageRider["expiresAt"]
    | SpellFailedSaveConditionEffect["expiresAt"]
    | undefined,
): BattleActiveEffectExpiration {
  if (typeof expiresAt === "object" && expiresAt.kind === "duration") {
    return expiresAt;
  }
  if (expiresAt === undefined) {
    return { kind: "startOfTurn", combatantId: casterId };
  }
  if (expiresAt === "startOfTargetNextTurn") {
    return { kind: "startOfTurn", combatantId: targetId };
  }
  if (expiresAt === "endOfCasterNextTurn") {
    return endOfNextTurnExpiration(state, casterId);
  }
  if (expiresAt === "concentration") {
    return { kind: "concentration", combatantId: casterId };
  }
  return endOfNextTurnExpiration(state, targetId);
}

export function endOfNextTurnExpiration(
  state: BattleState,
  combatantId: CombatantId,
): Extract<BattleActiveEffectExpiration, { readonly kind: "endOfTurn" }> {
  const stillToAct = state.initiative.stillToAct.some(
    (entry) => entry.creature === combatantId,
  );
  const round =
    currentActorId(state) === combatantId || !stillToAct
      ? ((state.initiative.round + 1) as RoundType)
      : state.initiative.round;
  return {
    kind: "endOfTurn",
    combatantId,
    round,
  };
}


export function applyPersistentSpellActiveEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "persistentArmorEffect" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || target.armorClass.base.kind === "armor") {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

export function applyHeldLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLight" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
    }),
  };
}

export function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    {
      kind: "spellMarkedDamageRider" as const,
      sourceSpellId: invocation.spell.id,
      sourceCombatantId: actorId,
      targetCombatantId: targetId,
      transferAvailable: false,
      damage: invocation.damage,
      expiresAt: existingExpiresAt,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects,
    }),
  };
}

export function applyScalarBuffSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
  temporaryHitPointsRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined,
): BattleState {
  const scalarEffect = invocation.effect;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextTarget =
      scalarEffect.kind === "temporaryHitPoints"
        ? temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            )
        : battleCreatureWithSpellActiveEffects(target, [
            ...target.activeEffects.filter(
              (effect) =>
                !(
                  effect.kind === scalarEffect.activeEffect.kind &&
                  effect.sourceSpellId === invocation.spell.id
                ),
            ),
            {
              ...scalarEffect.activeEffect,
              sourceCombatantId: actorId,
            },
          ]);
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
  }, state);
}

export function applyRollModifierSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >,
  skill: Skill | null,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.effect,
      sourceCombatantId: actorId,
      skill,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === invocation.spell.id
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyCreatureTypeProtectionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "attackerTypeScopedAttackRollAgainstSelf" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        nextEffect,
      ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyDamageReductionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "damageReduction" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellDamageReduction" &&
          effect.sourceSpellId === invocation.spell.id
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = invocation.activeEffects.map((effect) => ({
      ...effect,
      sourceCombatantId: actorId,
    }));
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceSpellId === invocation.spell.id
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

export function applyShieldReactionSpellActiveEffect(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      activeEffects: [
        ...reactor.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "spellArmorClassBonus" &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        {
          kind: "spellArmorClassBonus",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: reactorId,
          bonus: invocation.armorClassBonus,
          negatedSpellIds: invocation.negatedSpellIds,
          expiresAt: {
            kind: "startOfTurn",
            combatantId: reactorId,
          },
        },
      ],
    }),
  };
}
