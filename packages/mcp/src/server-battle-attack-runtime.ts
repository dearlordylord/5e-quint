import { Schema } from "effect";

import type { BattleContext } from "@dnd/core/battle-machine-types.ts";
import type {
  BattleResolutionRuntimeInputs,
  BattleResolvedActionToken,
} from "@dnd/core/available-actions.ts";

const BattleAttackRuntimeOverrideSchema = Schema.Struct({
  runtime: Schema.Literal("battleAttack"),
  values: Schema.Struct({
    attackRoll: Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
    targetAc: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
    weaponDamage: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
    attackerWithin5ft: Schema.Boolean,
    attackerWithin60ft: Schema.optional(Schema.Boolean),
    hostileWithin5ft: Schema.Boolean,
    targetCanSeeAttacker: Schema.Boolean,
    attackerCanSeeTarget: Schema.Boolean,
    frightSourceInLOS: Schema.Boolean,
    hasAllyAdjacentToTarget: Schema.Boolean,
    hitReactionCandidates: Schema.Array(Schema.String),
  }),
});

export function decodeBattleAttackRuntimeInputs(
  args: unknown,
  context: BattleContext,
  token: Extract<
    BattleResolvedActionToken,
    { readonly type: "BATTLE_ATTACK" | "BATTLE_OFF_HAND_ATTACK" }
  >,
):
  | BattleResolutionRuntimeInputs
  | { readonly code: "INVALID_RUNTIME_INPUT"; readonly message: string } {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: `${token.type} requires explicit runtime battleAttack inputs on execute_action.`,
    };
  }

  const runtime = Reflect.get(args, "runtime");
  if (runtime === undefined) {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: `${token.type} requires explicit runtime battleAttack inputs on execute_action.`,
    };
  }

  const decoded = Schema.decodeUnknownEither(BattleAttackRuntimeOverrideSchema)(
    runtime,
  );
  if (decoded._tag === "Left") {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: `${token.type} requires runtime: { runtime: "battleAttack", values: ... } with explicit attack, AC, visibility, adjacency, and reaction-candidate facts.`,
    };
  }

  const candidateIds = new Set([...context.creatures.keys()].map(String));
  candidateIds.delete(token.actorId);
  const unknownCandidate = decoded.right.values.hitReactionCandidates.find(
    (id) => !candidateIds.has(id),
  );
  if (unknownCandidate != null) {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: `Battle hit reaction candidate ${unknownCandidate} is not a valid other creature in this battle.`,
    };
  }

  return decoded.right;
}
