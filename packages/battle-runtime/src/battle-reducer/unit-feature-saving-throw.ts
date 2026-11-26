import type {
  BattleFill,
  BattleState,
  BattleUnitFeatureSavingThrowOutcomeHole,
} from "../battle-state-execution.ts";
import { savingThrowTargetModifiers } from "./saving-throw-modifier-collector.ts";
import type { CombatantId } from "../identity.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";

type UnitFeatureSavingThrowProjection = Pick<
  BattleUnitFeatureSavingThrowOutcomeHole,
  | "relationshipFactRequest"
  | "ability"
  | "dc"
  | "targetIds"
  | "targetRollModes"
  | "targetFlatBonuses"
  | "targetAutomaticFailures"
>;

export function unitFeatureSingleTargetSavingThrowProjection(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly ability: BattleUnitFeatureSavingThrowOutcomeHole["ability"];
  readonly dc: BattleUnitFeatureSavingThrowOutcomeHole["dc"];
}): UnitFeatureSavingThrowProjection {
  return {
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: input.actorId,
          },
        }
      : {}),
    ability: input.ability,
    dc: input.dc,
    targetIds: [input.targetId],
    ...savingThrowTargetModifiers(input.state, { ability: input.ability }, [
      input.targetId,
    ]),
  };
}

export function stateWithUnitFeatureSavingThrowRelationships(input: {
  readonly relationshipRequestState: BattleState;
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly savingThrow: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >;
}): BattleState | null {
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    input.savingThrow.relationshipFacts ?? [],
    input.actorId,
    [input.targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.relationshipRequestState,
      input.actorId,
      "enemySavingThrow",
    ),
  );
  return relationshipFacts === null
    ? null
    : extendSavingThrowOngoingFeatures(
        input.state,
        input.actorId,
        [input.targetId],
        relationshipFacts,
      );
}
