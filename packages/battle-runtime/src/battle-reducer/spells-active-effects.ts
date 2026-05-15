// Spell active-effect application extracted from spells-holes-fills.ts.

import { Match } from "effect";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { type Round as RoundType } from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  Skill,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import {
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "./damage-apply.ts";
import { scalarBuffTemporaryHitPointsAmount } from "./spell-effects.ts";
import {
  conditionsAfterApplyingSpellConditionEffects,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  type MarkedDamageRiderTransferState,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleCommandOption,
  type BattleCreatureState,
  type BattleFill,
  type BattleLightEmitter,
  type BattleLightEmitterAttachment,
  type BattleObjectOutline,
  type BattleSpellAreaChoice,
  type BattleState,
  type SpellActiveEffectPostDamageRider,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellLightEmissionPostDamageRider,
  type SpellPostDamageRider,
  type SpellPostDamageRiderExpiration,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleObjectId } from "../identity.ts";
import { HIDEOUS_LAUGHTER_DURATION_TICKS } from "./domain-constants.ts";

export const FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND = 60;

export type SaveGatedAttackRollAdvantageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

export function saveGatedAttackRollAdvantageInvocationIsFaerieFire(
  invocation: SaveGatedAttackRollAdvantageInvocation,
): boolean {
  return (
    invocation.spell.name === "Faerie Fire" &&
    invocation.spell.provenance.kind === "srd-5.2.1" &&
    invocation.spell.provenance.section ===
      "Spells/Descriptions-E-L#Faerie Fire" &&
    invocation.effect.kind === "faerieFireOutline" &&
    invocation.effect.sourceSpellId === invocation.spell.id
  );
}

export function activeFeatherFallDescentRateCapFeetPerRound(
  combatant: BattleCreatureState,
): typeof FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND | null {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "featherFallMitigation",
  )
    ? FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND
    : null;
}

export function featherFallLandingCleanupForCombatant(
  combatant: BattleCreatureState,
):
  | { readonly tag: "mitigated"; readonly combatant: BattleCreatureState }
  | { readonly tag: "unmitigated"; readonly combatant: BattleCreatureState } {
  const activeEffects = combatant.activeEffects.filter(
    (effect) => effect.kind !== "featherFallMitigation",
  );
  if (activeEffects.length === combatant.activeEffects.length) {
    return { tag: "unmitigated", combatant };
  }
  return {
    tag: "mitigated",
    combatant: battleCreatureWithSpellActiveEffects(combatant, activeEffects),
  };
}

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
  const activeEffects = invocation.postDamageRiders
    .filter(isSpellActiveEffectPostDamageRider)
    .reduce((effects, rider): readonly BattleActiveEffect[] => {
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
    }, target.activeEffects);

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function battleLightEmitters(
  state: BattleState,
): readonly BattleLightEmitter[] {
  const heldLightEmitters = [...state.combatants.values()].flatMap(
    (combatant): readonly BattleLightEmitter[] =>
      combatant.activeEffects.flatMap(
        (effect): readonly BattleLightEmitter[] =>
          effect.kind === "heldLight"
            ? [
                {
                  kind: "spellLightEmitter",
                  sourceSpellId: effect.sourceSpellId,
                  sourceCombatantId: effect.sourceCombatantId,
                  attachment: {
                    kind: "combatant",
                    combatantId: combatant.combatantId,
                  },
                  emission: {
                    kind: "brightAndDim",
                    brightRadiusFeet: effect.brightRadiusFeet,
                    dimAdditionalFeet: effect.dimAdditionalFeet,
                  },
                  expiresAt: effect.expiresAt,
                },
              ]
            : [],
      ),
  );
  return [...state.lightEmitters, ...heldLightEmitters];
}

export function applySpellLightEmitterEffects(
  state: BattleState,
  actorId: CombatantId,
  attachment: BattleLightEmitterAttachment,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLightHurl" | "spellAttackDamage" }
  >,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  const lightRiders = invocation.postDamageRiders.filter(
    isSpellLightEmissionPostDamageRider,
  );
  if (lightRiders.length === 0) {
    return state;
  }
  const nextEmitters = lightRiders.reduce(
    (emitters, rider): readonly BattleLightEmitter[] => [
      ...emitters.filter(
        (emitter) =>
          !(
            emitter.sourceSpellId === invocation.spell.id &&
            emitter.sourceCombatantId === actorId &&
            lightEmitterMatchesAttachment(emitter, attachment)
          ),
      ),
      lightEmitterFromPostDamageRider(
        state,
        actorId,
        attachment,
        invocation,
        rider,
      ),
    ],
    state.lightEmitters,
  );
  return { ...state, lightEmitters: nextEmitters };
}

export function expireBattleLightEmitters(
  emitters: readonly BattleLightEmitter[],
  shouldExpire: (emitter: BattleLightEmitter) => boolean,
): readonly BattleLightEmitter[] {
  return emitters.filter((emitter) => !shouldExpire(emitter));
}

export function tickDurationBattleLightEmitters(
  emitters: readonly BattleLightEmitter[],
): readonly BattleLightEmitter[] {
  return emitters.flatMap((emitter): readonly BattleLightEmitter[] => {
    if (emitter.kind === "objectInvisibleRevealLightEmitter") {
      return [emitter];
    }
    if (emitter.expiresAt.kind !== "duration") {
      return [emitter];
    }
    const remainingTicks = Number(emitter.expiresAt.durationTicks) - 1;
    return remainingTicks <= 0
      ? []
      : [
          {
            ...emitter,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(remainingTicks),
            },
          },
        ];
  });
}

function sameLightEmitterAttachment(
  left: BattleLightEmitterAttachment,
  right: BattleLightEmitterAttachment,
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "combatant" },
      (leftCombatant) =>
        right.kind === "combatant" &&
        leftCombatant.combatantId === right.combatantId,
    ),
    Match.when(
      { kind: "object" },
      (leftObject) =>
        right.kind === "object" && leftObject.objectId === right.objectId,
    ),
    Match.exhaustive,
  );
}

function lightEmitterMatchesAttachment(
  emitter: BattleLightEmitter,
  attachment: BattleLightEmitterAttachment,
): boolean {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) =>
      sameLightEmitterAttachment(spellEmitter.attachment, attachment),
    ),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectRevealEmitter) =>
        attachment.kind === "object" &&
        objectRevealEmitter.objectId === attachment.objectId,
    ),
    Match.exhaustive,
  );
}

function lightEmitterFromPostDamageRider(
  state: BattleState,
  actorId: CombatantId,
  attachment: BattleLightEmitterAttachment,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
  rider: SpellLightEmissionPostDamageRider,
): BattleLightEmitter {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    state,
    actorId,
    actorId,
    rider.expiresAt,
  );
  const base = {
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
  };
  return attachment.kind === "object" &&
    rider.emission.kind === "dim" &&
    Number(rider.emission.radiusFeet) === 10 &&
    expiresAt.kind === "endOfTurn" &&
    invocation.postDamageRiders.some(
      (postDamageRider) => postDamageRider.kind === "invisibleBenefitDenied",
    )
    ? {
        kind: "objectInvisibleRevealLightEmitter",
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        objectId: attachment.objectId,
        emission: rider.emission,
        expiresAt,
      }
    : {
        ...base,
        kind: "spellLightEmitter",
        attachment,
        emission: rider.emission,
        expiresAt,
      };
}

function isSpellActiveEffectPostDamageRider(
  rider: SpellPostDamageRider,
): rider is SpellActiveEffectPostDamageRider {
  return rider.kind !== "lightEmission";
}

function isSpellLightEmissionPostDamageRider(
  rider: SpellPostDamageRider,
): rider is SpellLightEmissionPostDamageRider {
  return rider.kind === "lightEmission";
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
  const activeEffectRiders = invocation.failedSavePostDamageRiders.filter(
    (
      rider,
    ): rider is Extract<
      SpellFailedSavePostDamageRider,
      { readonly kind: "nextAttackRollByTarget" }
    > => rider.kind === "nextAttackRollByTarget",
  );
  if (activeEffectRiders.length === 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const activeEffects = activeEffectRiders.reduce(
      (effects, rider): readonly BattleActiveEffect[] => [
        ...effects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              "sourceSpellId" in effect &&
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
    {
      readonly procedure: "afterHitSaveGatedCondition" | "saveGatedCondition";
    }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    if (
      conditionApplicationPreventedByCreatureTypeProtection(
        state,
        actorId,
        target,
        invocation.effect.condition,
      )
    ) {
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
        turnStartDamage: invocation.effect.turnStartDamage,
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

export function applySleepPendingRepeatSaveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
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
        effect.kind === "sleepPendingRepeatSave" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "sleepPendingRepeatSave" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          "incapacitated",
        ),
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        repeatAt: endOfNextTurnExpiration(state, targetId),
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
        },
      },
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
  }
  const effected: BattleState = { ...state, combatants };
  return targetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    effected,
  );
}

export function applyHideousLaughterEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "hideousLaughter" }
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
        effect.kind === "hideousLaughter" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "hideousLaughter" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        conditionHadNonSpellProneSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "prone"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: HIDEOUS_LAUGHTER_DURATION_TICKS,
        },
      },
    ];
    const affectedTarget = battleCreatureWithSpellActiveEffects(
      target,
      activeEffects,
    );
    combatants.set(targetId, affectedTarget);
  }
  const effected: BattleState = { ...state, combatants };
  const incapacitatedTargetIds = targetIds.filter((targetId) => {
    const target = combatants.get(targetId);
    return target !== undefined && hasCondition(target.conditions, "incapacitated");
  });
  return incapacitatedTargetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    effected,
  );
}

export function applyGreaseGroundHazardCastEffects(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "greaseGroundArea" }
  >;
  readonly failedTargetIds: readonly CombatantId[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "greaseGroundHazard" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster !== undefined) {
    const replacing = caster.activeEffects.filter(
      (effect) =>
        effect.kind === "greaseGroundHazard" &&
        effect.sourceSpellId === input.invocation.spell.id &&
        effect.sourceCombatantId === input.actorId &&
        effect.areaId === input.area.areaId,
    );
    const activeEffects = [
      ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "greaseGroundHazard" as const,
        sourceSpellId: input.invocation.spell.id,
        sourceCombatantId: input.actorId,
        areaId: input.area.areaId,
        save: {
          ability: input.invocation.ability,
          dc: input.invocation.dc,
        },
        expiresAt: {
          kind: "duration" as const,
          durationTicks: input.invocation.durationTicks,
        },
      },
    ];
    combatants.set(input.actorId, { ...caster, activeEffects });
  }
  return {
    ...input.state,
    combatants: applyGreaseProneToCombatants(combatants, input.failedTargetIds),
  };
}

export function applyFogCloudObscurementCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: string;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "fogCloudObscurement" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "fogCloudObscurement" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyGreaseProneToTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return {
    ...state,
    combatants: applyGreaseProneToCombatants(new Map(state.combatants), [
      targetId,
    ]),
  };
}

export function applyCommandPendingEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
  option: BattleCommandOption,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    combatants.set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "commandPending" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "commandPending",
          option,
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          expiresAt: endOfNextTurnExpiration(state, targetId),
        },
      ],
    });
  }
  return { ...state, combatants };
}

export function applyCommandGrovelProneToTarget(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "commandPending" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
          activeEffects: target.activeEffects.filter(
            (candidate) => candidate !== effect,
          ),
        },
        applyCondition(target.conditions, "prone"),
      ),
    ),
  };
}

function applyGreaseProneToCombatants(
  combatants: Map<CombatantId, BattleCreatureState>,
  targetIds: readonly CombatantId[],
): Map<CombatantId, BattleCreatureState> {
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    combatants.set(
      targetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "prone"),
      ),
    );
  }
  return combatants;
}

export function applyAfterHitTimedDamageAndSaveSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "afterHitTimedDamageAndSave" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "spellTurnStartDamageAndSave" &&
      effect.sourceSpellId === invocation.spell.id &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
  );
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyFailedSaveAttackRollAdvantageEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  area: BattleSpellAreaChoice | undefined,
  invocation: SaveGatedAttackRollAdvantageInvocation,
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
            effect.kind === "faerieFireOutline" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    combatants.set(targetId, { ...target, activeEffects });
  }
  return {
    ...state,
    combatants,
    objectOutlines: [
      ...state.objectOutlines.filter(
        (outline) =>
          !(
            outline.sourceSpellId === invocation.spell.id &&
            outline.sourceCombatantId === actorId
          ),
      ),
      ...faerieFireObjectOutlines(actorId, area, invocation),
    ],
  };
}

function faerieFireObjectOutlines(
  actorId: CombatantId,
  area: BattleSpellAreaChoice | undefined,
  invocation: SaveGatedAttackRollAdvantageInvocation,
): readonly BattleObjectOutline[] {
  if (
    area?.kind !== "faerieFireArea" ||
    !saveGatedAttackRollAdvantageInvocationIsFaerieFire(invocation)
  ) {
    return [];
  }
  return area.affectedObjectIds.map((objectId) => ({
    kind: "faerieFireObjectOutline",
    objectId,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    expiresAt: { kind: "concentration", combatantId: actorId },
  }));
}

export function activeEffectKindForSpellPostDamageRider(
  rider: SpellActiveEffectPostDamageRider,
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
    Match.when(
      { kind: "hitPointRegainPrevented" },
      () => "hitPointRegainPrevented" as const,
    ),
    Match.when(
      { kind: "invisibleBenefitDenied" },
      () => "invisibleBenefitDenied" as const,
    ),
    Match.exhaustive,
  );
}

export function spellPostDamageRiderReplacesActiveEffect(
  rider: SpellActiveEffectPostDamageRider,
  effect: BattleActiveEffect,
  spellId: SpellRecord["id"],
  actorId: CombatantId,
): boolean {
  if (
    effect.kind !== activeEffectKindForSpellPostDamageRider(rider) ||
    !("sourceSpellId" in effect) ||
    effect.sourceSpellId !== spellId
  ) {
    return false;
  }
  return rider.kind === "speedDelta" || effect.sourceCombatantId === actorId;
}

export function spellPostDamageRiderExpiration(
  rider: SpellActiveEffectPostDamageRider,
): SpellPostDamageRiderExpiration | undefined {
  return "expiresAt" in rider ? rider.expiresAt : undefined;
}

export function spellPostDamageRiderActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly target: BattleCreatureState;
  readonly spellId: SpellRecord["id"];
  readonly rider: SpellActiveEffectPostDamageRider;
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
      turnStartDamage: null,
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
    Match.when({ kind: "hitPointRegainPrevented" }, () => ({
      kind: "hitPointRegainPrevented" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "invisibleBenefitDenied" }, () => ({
      kind: "invisibleBenefitDenied" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
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
    | Extract<
        SpellFailedSavePostDamageRider,
        { readonly kind: "nextAttackRollByTarget" }
      >["expiresAt"]
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

export function applyWeaponAttackOverrideSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponAttackOverride" }
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
              effect.kind === "spellWeaponAttackOverride" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        invocation.activeEffect,
      ],
    }),
  };
}

export function applyObjectLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectLight" }
  >,
): BattleState {
  return {
    ...state,
    lightEmitters: [
      ...state.lightEmitters.filter(
        (emitter) =>
          !(
            emitter.sourceSpellId === invocation.spell.id &&
            emitter.sourceCombatantId === actorId
          ),
      ),
      {
        kind: "spellLightEmitter",
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        attachment: { kind: "object", objectId },
        emission: invocation.light,
        expiresAt: invocation.expiresAt,
      },
    ],
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
  selectedAbility?: Ability,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const transfer: MarkedDamageRiderTransferState = {
    kind: "awaitingTargetDrop",
    retargetTiming:
      invocation.action === "transfer"
        ? invocation.activeEffect.transfer.retargetTiming
        : invocation.retargetTiming,
  };
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
      transfer,
      abilityCheckDisadvantage:
        invocation.action === "transfer"
          ? invocation.activeEffect.abilityCheckDisadvantage
          : selectedAbility === undefined
            ? null
            : { ability: selectedAbility },
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
            effect.kind === "creatureTypeProtection" &&
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

export function applyJumpMovementReplacementSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "jumpMovementReplacement" }
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
            effect.kind === "jumpMovementReplacement" &&
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
