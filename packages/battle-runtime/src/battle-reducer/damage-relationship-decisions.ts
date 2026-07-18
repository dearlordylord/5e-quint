import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { DamageAmount } from "@dnd/shared/types";

import type {
  BattleDamageRelationshipDecisionFill,
  BattleDamageRelationshipDecisionHole,
  BattleDamageRelationshipDecisions,
  BattleDamageRelationshipQuestionFacts,
  BattleAttackDamageDisposition,
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  enemyZeroHitPointTemporaryHitPointsProcedureRef,
  enemyZeroHitPointTemporaryHitPointsTriggerApplies,
  enemyZeroHitPointTransitionOccurs,
} from "./enemy-zero-hit-point-temporary-hit-points.ts";
import { damageRelationshipQuestionId } from "./damage-relationship-question-id.ts";
import { applyHpDamage } from "./damage-apply.ts";

export type DamageRelationshipDecisionParseResult =
  | {
      readonly tag: "ok";
      readonly decisionsByRelationshipHole: DamageRelationshipDecisionsByHole;
    }
  | { readonly tag: "invalid"; readonly message: string };

export type DamageRelationshipDecisionFillCheck =
  | {
      readonly tag: "ok";
      readonly decisions: BattleDamageRelationshipDecisions | undefined;
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly [BattleDamageRelationshipDecisionHole];
    }
  | { readonly tag: "invalid"; readonly message: string };

type DamageRelationshipApplication = {
  readonly targetId: CombatantId;
  readonly damageAmount: DamageAmount;
  readonly damageDisposition?: BattleAttackDamageDisposition | undefined;
};

export class DamageRelationshipDecisionsByHole {
  readonly #fills: ReadonlyMap<
    BattleHoleId,
    BattleDamageRelationshipDecisionFill
  >;

  private constructor(
    fills: ReadonlyMap<BattleHoleId, BattleDamageRelationshipDecisionFill>,
  ) {
    this.#fills = fills;
  }

  static parse(input: {
    readonly fills: readonly BattleFill[];
    readonly damageEventHoleIds: ReadonlySet<BattleHoleId>;
    readonly owner: "an Attack" | "a Spell" | "a chained Spell";
  }): DamageRelationshipDecisionParseResult {
    const fills = new Map<BattleHoleId, BattleDamageRelationshipDecisionFill>();
    for (const fill of input.fills) {
      if (fill.kind !== "damageRelationshipDecisions") {
        continue;
      }
      if (
        ![...input.damageEventHoleIds].some(
          (damageEventHoleId) =>
            relationshipHoleId(damageEventHoleId) === fill.holeId,
        ) ||
        fills.has(fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: `Damage relationship decisions must uniquely match ${input.owner} relationship hole.`,
        };
      }
      fills.set(fill.holeId, fill);
    }
    return {
      tag: "ok",
      decisionsByRelationshipHole: new DamageRelationshipDecisionsByHole(fills),
    };
  }

  check(
    damageEventHoleId: BattleHoleId,
    hole: BattleDamageRelationshipDecisionHole | null,
  ): DamageRelationshipDecisionFillCheck {
    if (hole === null) {
      return !this.#fills.has(relationshipHoleId(damageEventHoleId))
        ? { tag: "ok", decisions: undefined }
        : {
            tag: "invalid",
            message:
              "Damage relationship decisions require an emitted relationship hole.",
          };
    }
    const fill = this.#fills.get(hole.holeId);
    if (fill === undefined) {
      return { tag: "needsHoles", holes: [hole] };
    }
    const decisions = resolveDecisionAnswers(fill.answers, hole.questions);
    if (decisions === null) {
      return {
        tag: "invalid",
        message:
          "Damage relationship decisions must answer every emitted question exactly once.",
      };
    }
    return { tag: "ok", decisions };
  }

  unexpectedFillForAbsentEvent(damageEventHoleId: BattleHoleId): string | null {
    return this.#fills.has(relationshipHoleId(damageEventHoleId))
      ? "Damage relationship decisions require an emitted relationship hole."
      : null;
  }
}

export function damageRelationshipDecisionHole(input: {
  readonly state: BattleState;
  readonly damageEventHoleId: BattleHoleId;
  readonly damageSourceId: CombatantId;
  readonly targets: readonly DamageRelationshipApplication[];
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
}): BattleDamageRelationshipDecisionHole | null {
  const projectedTargets = new Map<CombatantId, BattleCreatureState>();
  const zeroHitPointTransitionTargets = new Set<CombatantId>();
  for (const application of input.targets) {
    const priorTarget =
      projectedTargets.get(application.targetId) ??
      input.state.combatants.get(application.targetId);
    if (priorTarget === undefined) {
      continue;
    }
    const damagedTarget = applyHpDamage(priorTarget, application.damageAmount, {
      deathFailuresAtZeroHp: 1,
      ...(application.damageDisposition === undefined
        ? {}
        : { damageDisposition: application.damageDisposition }),
    });
    if (
      enemyZeroHitPointTransitionOccurs({
        priorHitPoints: Number(priorTarget.hp),
        nextHitPoints: Number(damagedTarget.hp),
      })
    ) {
      zeroHitPointTransitionTargets.add(application.targetId);
    }
    projectedTargets.set(application.targetId, damagedTarget);
  }
  const targetIds = [...new Set(input.targets.map(({ targetId }) => targetId))];
  const questions = targetIds.flatMap((targetId) =>
    damageRelationshipQuestions({
      ...input,
      targetId,
      targetTransitionsToZero: zeroHitPointTransitionTargets.has(targetId),
    }),
  );
  const questionsWithIds = questions.map((question) => ({
    ...question,
    questionId:
      question.kind === "targetDamagedByCasterOrAlly"
        ? damageRelationshipQuestionId([
            question.kind,
            input.damageSourceId,
            question.targetId,
            question.effectSourceId,
          ])
        : damageRelationshipQuestionId([
            question.kind,
            question.beneficiaryId,
            question.targetId,
            question.unitId,
          ]),
  }));
  const first = questionsWithIds[0];
  if (first === undefined) {
    return null;
  }
  const key = relationshipHoleKey(input.damageEventHoleId);
  return {
    kind: "damageRelationshipDecisions",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Damage event relationships",
    damageEventHoleId: input.damageEventHoleId,
    damageSourceId: input.damageSourceId,
    questions: [first, ...questionsWithIds.slice(1)],
  };
}

export function damageRelationshipDecisionFillCheck(input: {
  readonly state: BattleState;
  readonly damageEventHoleId: BattleHoleId;
  readonly damageSourceId: CombatantId;
  readonly targets: readonly DamageRelationshipApplication[];
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
  readonly decisionsByRelationshipHole: DamageRelationshipDecisionsByHole;
}): DamageRelationshipDecisionFillCheck {
  return input.decisionsByRelationshipHole.check(
    input.damageEventHoleId,
    damageRelationshipDecisionHole(input),
  );
}

function relationshipHoleId(damageEventHoleId: BattleHoleId): BattleHoleId {
  return holeId(relationshipHoleKey(damageEventHoleId));
}

function relationshipHoleKey(damageEventHoleId: BattleHoleId): string {
  return `${String(damageEventHoleId)}:relationships`;
}

function damageRelationshipQuestions(input: {
  readonly state: BattleState;
  readonly damageSourceId: CombatantId;
  readonly targetId: CombatantId;
  readonly targetTransitionsToZero: boolean;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
}): readonly BattleDamageRelationshipQuestionFacts[] {
  const questions: BattleDamageRelationshipQuestionFacts[] = [];
  const target = input.state.combatants.get(input.targetId);
  for (const effect of target?.activeEffects ?? []) {
    if (
      effect.kind === "spellCondition" &&
      effect.escape?.kind === "targetDamagedByCasterOrAlly" &&
      effect.sourceCombatantId !== input.damageSourceId &&
      !questions.some(
        (question) =>
          question.kind === "targetDamagedByCasterOrAlly" &&
          question.effectSourceId === effect.sourceCombatantId,
      )
    ) {
      questions.push({
        kind: "targetDamagedByCasterOrAlly",
        targetId: input.targetId,
        effectSourceId: effect.sourceCombatantId,
      });
    }
  }
  for (const beneficiary of input.targetTransitionsToZero
    ? input.state.combatants.values()
    : []) {
    if (beneficiary.origin.kind !== "character") {
      continue;
    }
    for (const profile of beneficiary.origin.enemyZeroHitPointTemporaryHitPointsProfiles.values()) {
      const procedureRef = enemyZeroHitPointTemporaryHitPointsProcedureRef(
        beneficiary.origin.execution,
        profile.unit.id,
      );
      if (procedureRef === undefined) continue;
      const triggerApplies = enemyZeroHitPointTemporaryHitPointsTriggerApplies({
        procedureRef,
        beneficiaryId: beneficiary.combatantId,
        damageSourceId: input.damageSourceId,
        targetId: input.targetId,
        selfTrigger: profile.temporaryHitPoints.trigger.bySelf,
        otherWithinFeet: profile.temporaryHitPoints.trigger.byOtherWithinFeet,
        spatialFacts: input.spatialFacts,
      });
      if (triggerApplies) {
        questions.push({
          kind: "enemyZeroHitPointTemporaryHitPoints",
          beneficiaryId: beneficiary.combatantId,
          targetId: input.targetId,
          unitId: profile.unit.id,
        });
      }
    }
  }
  return questions;
}

function resolveDecisionAnswers(
  answers: BattleDamageRelationshipDecisionFill["answers"],
  questions: BattleDamageRelationshipDecisionHole["questions"],
): BattleDamageRelationshipDecisions | null {
  if (
    answers.length !== questions.length ||
    questions.some(
      (question) =>
        answers.filter((answer) => answer.questionId === question.questionId)
          .length !== 1,
    )
  ) {
    return null;
  }
  const decisions = questions.map((question) => {
    const answer = answers.find(
      (candidate) => candidate.questionId === question.questionId,
    );
    if (question.kind === "targetDamagedByCasterOrAlly") {
      return {
        kind: question.kind,
        targetId: question.targetId,
        effectSourceId: question.effectSourceId,
        sourceIsAlly: answer?.answer === true,
      };
    }
    return {
      kind: question.kind,
      beneficiaryId: question.beneficiaryId,
      targetId: question.targetId,
      unitId: question.unitId,
      targetIsEnemy: answer?.answer === true,
    };
  });
  const first = decisions[0];
  return first === undefined ? null : [first, ...decisions.slice(1)];
}
