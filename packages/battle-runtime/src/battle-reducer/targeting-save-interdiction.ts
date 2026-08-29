// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleExecutableSpellInvocation,
  BattleActiveEffect,
  BattleAttackRollRelationshipFact,
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleTargetingSaveInterdictionOutcome,
  BattleTargetingSaveInterdictionOutcomeHole,
  BattleState,
  TargetingSaveInterdictionSpellInvocation,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import { battleStateAfterDirectConditionTargetActionEarlyEndForActor } from "./direct-condition-lifecycle.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import { parseAttackRollRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../effect-execution-ref.ts";

type TargetingSaveInterdictionCheckCommon =
  | { readonly tag: "notWarded" }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "saveSucceeded" }
  | { readonly tag: "lost" };

type AttackRollTargetingSaveInterdictionCheck =
  | TargetingSaveInterdictionCheckCommon
  | {
      readonly tag: "needsHoles";
      readonly hole: Extract<
        BattleTargetingSaveInterdictionOutcomeHole,
        { readonly replacementTargetKind: "attackRoll" }
      >;
    }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleTargetingSaveInterdictionOutcome,
          { readonly saveSucceeded: true }
        >["outcome"],
        { readonly kind: "newTarget" }
      >["spatialFacts"];
      readonly relationshipFacts:
        | readonly []
        | readonly [
            BattleAttackRollRelationshipFact,
            ...BattleAttackRollRelationshipFact[],
          ];
    };

type SanctuaryAttackRollReplacementTarget = Extract<
  AttackRollTargetingSaveInterdictionCheck,
  { readonly tag: "newTarget" }
>;

export function targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement(input: {
  readonly fill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly replacement: SanctuaryAttackRollReplacementTarget;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const replacementFill = {
    ...input.fill,
    value: input.replacement.targetId,
    spatialFacts: input.replacement.spatialFacts,
  };
  const [firstRelationshipFact, ...remainingRelationshipFacts] =
    input.replacement.relationshipFacts;
  return firstRelationshipFact === undefined
    ? replacementFill
    : {
        ...replacementFill,
        relationshipFacts: [
          firstRelationshipFact,
          ...remainingRelationshipFacts,
        ],
      };
}

type NonAttackTargetingSaveInterdictionCheck =
  | TargetingSaveInterdictionCheckCommon
  | {
      readonly tag: "needsHoles";
      readonly hole: Extract<
        BattleTargetingSaveInterdictionOutcomeHole,
        { readonly replacementTargetKind: "nonAttack" }
      >;
    }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleTargetingSaveInterdictionOutcome,
          { readonly saveSucceeded: true }
        >["outcome"],
        {
          readonly kind: "newTarget";
          readonly replacementTargetKind: "nonAttack";
        }
      >["spatialFacts"];
    };

type TargetingSaveInterdictionInput = {
  readonly state: BattleState;
  readonly triggeringProcedureRef: BattleProcedureExecutionRef;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly fills: readonly BattleFill[];
};

export function targetingSaveInterdictionCheck(
  input: TargetingSaveInterdictionInput & {
    readonly replacementTargetKind: "attackRoll";
  },
): AttackRollTargetingSaveInterdictionCheck;
export function targetingSaveInterdictionCheck(
  input: TargetingSaveInterdictionInput & {
    readonly replacementTargetKind: "nonAttack";
  },
): NonAttackTargetingSaveInterdictionCheck;
export function targetingSaveInterdictionCheck(
  input: TargetingSaveInterdictionInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
):
  | AttackRollTargetingSaveInterdictionCheck
  | NonAttackTargetingSaveInterdictionCheck {
  const warded = input.state.combatants.get(input.wardedCombatantId);
  const effect = warded?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "targetingSaveInterdiction" }
    > => candidate.kind === "targetingSaveInterdiction",
  );
  if (warded === undefined || effect === undefined) {
    return { tag: "notWarded" };
  }
  const hole = targetingSaveInterdictionOutcomeHole({
    state: input.state,
    triggeringProcedureRef: input.triggeringProcedureRef,
    triggeringCombatantId: input.triggeringCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    replacementTargetKind: input.replacementTargetKind,
    effect,
  });
  const matchingFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "targetingSaveInterdictionOutcome" }
    > =>
      fill.kind === "targetingSaveInterdictionOutcome" &&
      fill.holeId === hole.holeId,
  );
  if (matchingFills.length === 0) {
    return hole.replacementTargetKind === "attackRoll"
      ? { tag: "needsHoles", hole }
      : { tag: "needsHoles", hole };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingFills.length > 1) {
    return {
      tag: "invalid",
      message: "Targeting-save interdiction was filled twice.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const value = matchingFills[0]!.value;
  if (value.saveSucceeded) {
    return { tag: "saveSucceeded" };
  }
  if (value.outcome.kind === "loseAttackOrSpell") {
    return { tag: "lost" };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (value.outcome.targetId === input.wardedCombatantId) {
    return {
      tag: "invalid",
      message:
        "Interdiction replacement target must differ from the warded target.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.state.combatants.has(value.outcome.targetId)) {
    return {
      tag: "invalid",
      message:
        "Interdiction replacement target must be a combatant in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (value.outcome.replacementTargetKind !== input.replacementTargetKind) {
    return {
      tag: "invalid",
      message:
        "Interdiction replacement target facts must match the triggering procedure.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (value.outcome.replacementTargetKind === "nonAttack") {
    return {
      tag: "newTarget",
      targetId: value.outcome.targetId,
      spatialFacts: value.outcome.spatialFacts,
    };
  }
  const relationshipFacts = parseAttackRollRelationshipFacts(
    value.outcome.relationshipFacts ?? [],
    input.triggeringCombatantId,
    value.outcome.targetId,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.triggeringCombatantId,
      "attackRollAgainstEnemy",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    return {
      tag: "invalid",
      message:
        "Interdiction replacement relationship facts must answer the attack-roll hole request.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "newTarget",
    targetId: value.outcome.targetId,
    spatialFacts: value.outcome.spatialFacts,
    relationshipFacts,
  };
}

type TargetingSaveInterdictionOutcomeHoleInput = {
  readonly state: BattleState;
  readonly triggeringProcedureRef: BattleProcedureExecutionRef;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "targetingSaveInterdiction" }
  >;
};

function targetingSaveInterdictionOutcomeHole(
  input: TargetingSaveInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll";
  },
): Extract<
  BattleTargetingSaveInterdictionOutcomeHole,
  { readonly replacementTargetKind: "attackRoll" }
>;
function targetingSaveInterdictionOutcomeHole(
  input: TargetingSaveInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "nonAttack";
  },
): Extract<
  BattleTargetingSaveInterdictionOutcomeHole,
  { readonly replacementTargetKind: "nonAttack" }
>;
function targetingSaveInterdictionOutcomeHole(
  input: TargetingSaveInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
): BattleTargetingSaveInterdictionOutcomeHole;
function targetingSaveInterdictionOutcomeHole(
  input: TargetingSaveInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
): BattleTargetingSaveInterdictionOutcomeHole {
  const holeKey = [
    "battle",
    "sanctuary-interdiction",
    input.effect.sourceProcedureRef,
    input.effect.sourceCombatantId,
    input.wardedCombatantId,
    input.triggeringCombatantId,
    input.triggeringTargetEventId,
    input.replacementTargetKind,
  ].join(":");
  const base = {
    kind: "targetingSaveInterdictionOutcome" as const,
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: "Targeting-interdiction Wisdom save and outcome",
    sourceProcedureRef: input.effect.sourceProcedureRef,
    triggeringProcedureRef: input.triggeringProcedureRef,
    sourceCombatantId: input.effect.sourceCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringCombatantId: input.triggeringCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    ability: input.effect.save.ability,
    dc: input.effect.save.dc,
    choices: [...input.state.combatants.keys()].filter(
      (id) => id !== input.wardedCombatantId,
    ),
  };
  return input.replacementTargetKind === "attackRoll"
    ? {
        ...base,
        replacementTargetKind: "attackRoll",
        ...(ongoingFeatureEnemyRelationshipDecisionRequired(
          input.state,
          input.triggeringCombatantId,
          "attackRollAgainstEnemy",
        )
          ? {
              relationshipFactRequest: {
                kind: "attackRollTargetIsEnemy" as const,
                attackerId: input.triggeringCombatantId,
              },
            }
          : {}),
      }
    : { ...base, replacementTargetKind: "nonAttack" };
}

export function battleStateAfterTargetActionEarlyEndForActor(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const sanctuaryActiveEffects = actor.activeEffects.filter(
    (effect) => effect.kind !== "targetingSaveInterdiction",
  );
  const sanctuaryEnded =
    sanctuaryActiveEffects.length === actor.activeEffects.length
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            actorId,
            battleCreatureWithSpellActiveEffects(actor, sanctuaryActiveEffects),
          ),
        };
  return battleStateAfterDirectConditionTargetActionEarlyEndForActor(
    sanctuaryEnded,
    actorId,
  );
}

export function combatantWithTargetingSaveInterdiction(
  target: BattleCreatureState,
  invocation: BattleExecutableSpellInvocation<TargetingSaveInterdictionSpellInvocation>,
): BattleCreatureState {
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "targetingSaveInterdiction" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef,
  );
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  });
  return battleCreatureWithSpellActiveEffects(allocation.owner, [
    ...allocation.owner.activeEffects.filter(
      (effect) => !replacing.includes(effect),
    ),
    allocation.effect,
  ]);
}
