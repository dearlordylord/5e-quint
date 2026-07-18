import type {
  BattleExecutableSpellInvocation,
  BattleSavingThrowRelationshipFact,
  BattleFill,
  BattleAttackRollRelationshipFact,
  BattleSpellTargetListRelationshipFact,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

type TargetChoiceFill = Extract<BattleFill, { readonly kind: "targetChoice" }>;
export type BattleAttackTargetChoiceFill = Omit<
  TargetChoiceFill,
  "relationshipFacts"
> & {
  readonly relationshipFacts?: readonly [BattleAttackRollRelationshipFact];
};

function targetChoiceFillHasAttackRollRelationshipFacts(
  fill: TargetChoiceFill,
): fill is BattleAttackTargetChoiceFill {
  return (
    fill.relationshipFacts === undefined ||
    (fill.relationshipFacts.length === 1 &&
      fill.relationshipFacts[0]?.kind === "attackRollTargetIsEnemy")
  );
}

export function parseAttackTargetChoiceFill(
  fill: TargetChoiceFill,
  attackerId: CombatantId,
  relationshipDecisionRequired: boolean,
):
  | { readonly tag: "ok"; readonly fill: BattleAttackTargetChoiceFill }
  | { readonly tag: "invalid"; readonly message: string } {
  if (
    !targetChoiceFillHasAttackRollRelationshipFacts(fill) ||
    relationshipDecisionRequired !== (fill.relationshipFacts !== undefined) ||
    (fill.relationshipFacts !== undefined &&
      (fill.relationshipFacts[0].attackerId !== attackerId ||
        fill.relationshipFacts[0].targetId !== fill.value))
  ) {
    return {
      tag: "invalid",
      message:
        "Attack target relationship facts must answer the attack target hole request.",
    };
  }
  return { tag: "ok", fill };
}

export function parseAttackRollRelationshipFacts(
  facts: readonly BattleAttackRollRelationshipFact[],
  attackerId: CombatantId,
  targetId: CombatantId,
  relationshipDecisionRequired: boolean,
):
  | readonly []
  | readonly [
      BattleAttackRollRelationshipFact,
      ...BattleAttackRollRelationshipFact[],
    ]
  | null {
  if (facts.length === 0) return relationshipDecisionRequired ? null : [];
  if (!relationshipDecisionRequired) return null;
  const [fact, ...rest] = facts;
  return fact !== undefined &&
    rest.length === 0 &&
    fact.attackerId === attackerId &&
    fact.targetId === targetId
    ? [fact]
    : null;
}

export function parseSpellTargetListRelationshipFacts(
  facts: readonly BattleSpellTargetListRelationshipFact[],
  casterId: CombatantId,
  spellId: SupportedSpellInvocation["spell"]["id"],
  targetIds: readonly CombatantId[],
): readonly BattleSpellTargetListRelationshipFact[] | null {
  return relationshipFactsAnswerEachTargetExactlyOnce(
    facts,
    targetIds,
    (fact, targetId) =>
      fact.casterId === casterId &&
      fact.sourceProcedureRef === spellId &&
      fact.targetId === targetId,
  )
    ? facts
    : null;
}

export function parseSavingThrowRelationshipFacts(
  facts: readonly BattleSavingThrowRelationshipFact[],
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  relationshipDecisionRequired: boolean,
): readonly BattleSavingThrowRelationshipFact[] | null {
  if (facts.length === 0) {
    return relationshipDecisionRequired && targetIds.length > 0 ? null : [];
  }
  if (!relationshipDecisionRequired) return null;
  return relationshipFactsAnswerEachTargetExactlyOnce(
    facts,
    targetIds,
    (fact, targetId) => fact.actorId === actorId && fact.targetId === targetId,
  )
    ? facts
    : null;
}

function relationshipFactsAnswerEachTargetExactlyOnce<Fact>(
  facts: readonly Fact[],
  targetIds: readonly CombatantId[],
  factAnswersTarget: (fact: Fact, targetId: CombatantId) => boolean,
): boolean {
  return (
    facts.length === targetIds.length &&
    new Set(targetIds).size === targetIds.length &&
    targetIds.every(
      (targetId) =>
        facts.filter((fact) => factAnswersTarget(fact, targetId)).length === 1,
    )
  );
}

export function attackRollTargetIsEnemy(
  facts: readonly BattleAttackRollRelationshipFact[],
  attackerId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.attackerId === attackerId &&
      fact.targetId === targetId &&
      fact.targetIsEnemy,
  );
}

export function savingThrowTargetsEnemy(
  facts: readonly BattleSavingThrowRelationshipFact[],
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
): boolean {
  return facts.some(
    (fact) =>
      fact.actorId === actorId &&
      targetIds.includes(fact.targetId) &&
      fact.targetIsEnemy,
  );
}

export function spellTargetIsHostileToCaster(
  facts: readonly BattleSpellTargetListRelationshipFact[],
  casterId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): boolean {
  return facts.some(
    (fact) =>
      fact.casterId === casterId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === invocation.sourceProcedureRef &&
      fact.targetIsHostileToCaster,
  );
}
