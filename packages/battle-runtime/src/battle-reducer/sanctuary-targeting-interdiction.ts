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
  BattleSanctuaryInterdictionOutcome,
  BattleSanctuaryInterdictionOutcomeHole,
  BattleState,
  SanctuaryTargetingInterdictionSpellInvocation,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import { battleStateAfterDirectConditionTargetActionEarlyEndForActor } from "./direct-condition-lifecycle.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import { parseAttackRollRelationshipFacts } from "./roll-trigger-relationship-facts.ts";

type SanctuaryTargetingInterdictionCheckCommon =
  | { readonly tag: "notWarded" }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "saveSucceeded" }
  | { readonly tag: "lost" };

type AttackRollSanctuaryTargetingInterdictionCheck =
  | SanctuaryTargetingInterdictionCheckCommon
  | {
      readonly tag: "needsHoles";
      readonly hole: Extract<
        BattleSanctuaryInterdictionOutcomeHole,
        { readonly replacementTargetKind: "attackRoll" }
      >;
    }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleSanctuaryInterdictionOutcome,
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
  AttackRollSanctuaryTargetingInterdictionCheck,
  { readonly tag: "newTarget" }
>;

export function targetChoiceFillAfterSanctuaryAttackRollReplacement(input: {
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

type NonAttackSanctuaryTargetingInterdictionCheck =
  | SanctuaryTargetingInterdictionCheckCommon
  | {
      readonly tag: "needsHoles";
      readonly hole: Extract<
        BattleSanctuaryInterdictionOutcomeHole,
        { readonly replacementTargetKind: "nonAttack" }
      >;
    }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleSanctuaryInterdictionOutcome,
          { readonly saveSucceeded: true }
        >["outcome"],
        {
          readonly kind: "newTarget";
          readonly replacementTargetKind: "nonAttack";
        }
      >["spatialFacts"];
    };

type SanctuaryTargetingInterdictionInput = {
  readonly state: BattleState;
  readonly triggeringProcedureRef: BattleProcedureExecutionRef;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly fills: readonly BattleFill[];
};

export function sanctuaryTargetingInterdictionCheck(
  input: SanctuaryTargetingInterdictionInput & {
    readonly replacementTargetKind: "attackRoll";
  },
): AttackRollSanctuaryTargetingInterdictionCheck;
export function sanctuaryTargetingInterdictionCheck(
  input: SanctuaryTargetingInterdictionInput & {
    readonly replacementTargetKind: "nonAttack";
  },
): NonAttackSanctuaryTargetingInterdictionCheck;
export function sanctuaryTargetingInterdictionCheck(
  input: SanctuaryTargetingInterdictionInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
):
  | AttackRollSanctuaryTargetingInterdictionCheck
  | NonAttackSanctuaryTargetingInterdictionCheck {
  const warded = input.state.combatants.get(input.wardedCombatantId);
  const effect = warded?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "sanctuaryWard" }
    > => candidate.kind === "sanctuaryWard",
  );
  if (warded === undefined || effect === undefined) {
    return { tag: "notWarded" };
  }
  const hole = sanctuaryTargetingInterdictionOutcomeHole({
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
      { readonly kind: "sanctuaryInterdictionOutcome" }
    > =>
      fill.kind === "sanctuaryInterdictionOutcome" &&
      fill.holeId === hole.holeId,
  );
  if (matchingFills.length === 0) {
    return hole.replacementTargetKind === "attackRoll"
      ? { tag: "needsHoles", hole }
      : { tag: "needsHoles", hole };
  }
  if (matchingFills.length > 1) {
    return {
      tag: "invalid",
      message: "Sanctuary targeting interdiction was filled twice.",
    };
  }
  const value = matchingFills[0]!.value;
  if (value.saveSucceeded) {
    return { tag: "saveSucceeded" };
  }
  if (value.outcome.kind === "loseAttackOrSpell") {
    return { tag: "lost" };
  }
  if (value.outcome.targetId === input.wardedCombatantId) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must differ from the warded target.",
    };
  }
  if (!input.state.combatants.has(value.outcome.targetId)) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must be a combatant in this battle.",
    };
  }
  if (value.outcome.replacementTargetKind !== input.replacementTargetKind) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target facts must match the triggering procedure.",
    };
  }
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
  if (relationshipFacts === null) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement relationship facts must answer the attack-roll hole request.",
    };
  }
  return {
    tag: "newTarget",
    targetId: value.outcome.targetId,
    spatialFacts: value.outcome.spatialFacts,
    relationshipFacts,
  };
}

type SanctuaryTargetingInterdictionOutcomeHoleInput = {
  readonly state: BattleState;
  readonly triggeringProcedureRef: BattleProcedureExecutionRef;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "sanctuaryWard" }
  >;
};

function sanctuaryTargetingInterdictionOutcomeHole(
  input: SanctuaryTargetingInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll";
  },
): Extract<
  BattleSanctuaryInterdictionOutcomeHole,
  { readonly replacementTargetKind: "attackRoll" }
>;
function sanctuaryTargetingInterdictionOutcomeHole(
  input: SanctuaryTargetingInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "nonAttack";
  },
): Extract<
  BattleSanctuaryInterdictionOutcomeHole,
  { readonly replacementTargetKind: "nonAttack" }
>;
function sanctuaryTargetingInterdictionOutcomeHole(
  input: SanctuaryTargetingInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
): BattleSanctuaryInterdictionOutcomeHole;
function sanctuaryTargetingInterdictionOutcomeHole(
  input: SanctuaryTargetingInterdictionOutcomeHoleInput & {
    readonly replacementTargetKind: "attackRoll" | "nonAttack";
  },
): BattleSanctuaryInterdictionOutcomeHole {
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
    kind: "sanctuaryInterdictionOutcome" as const,
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: "Sanctuary Wisdom save and targeting outcome",
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
    (effect) => effect.kind !== "sanctuaryWard",
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

export function combatantWithSanctuaryWard(
  target: BattleCreatureState,
  invocation: BattleExecutableSpellInvocation<SanctuaryTargetingInterdictionSpellInvocation>,
): BattleCreatureState {
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "sanctuaryWard" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef,
  );
  return battleCreatureWithSpellActiveEffects(target, [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
    },
  ]);
}
