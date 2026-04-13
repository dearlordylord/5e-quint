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

const BattleGrappleRuntimeOverrideSchema = Schema.Struct({
  runtime: Schema.Literal("battleGrapple"),
  values: Schema.Struct({
    targetSaveFailed: Schema.Boolean,
  }),
});

function battleAttackShapeError(
  token: Extract<
    BattleResolvedActionToken,
    {
      readonly type:
        | "BATTLE_ATTACK"
        | "BATTLE_OFF_HAND_ATTACK"
        | "BATTLE_LEGENDARY_ATTACK";
    }
  >,
) {
  return {
    code: "INVALID_RUNTIME_INPUT" as const,
    message: `${token.type} requires runtime: { runtime: "battleAttack", values: ... } with explicit attack, AC, visibility, adjacency, and reaction-candidate facts.`,
  };
}

function missingRuntimeInputsError(
  token: Extract<
    BattleResolvedActionToken,
    | {
        readonly type:
          | "BATTLE_ATTACK"
          | "BATTLE_OFF_HAND_ATTACK"
          | "BATTLE_LEGENDARY_ATTACK";
      }
    | { readonly type: "BATTLE_GRAPPLE" }
  >,
  runtimeName: "battleAttack" | "battleGrapple",
) {
  return {
    code: "INVALID_RUNTIME_INPUT" as const,
    message: `${token.type} requires explicit runtime ${runtimeName} inputs on execute_action.`,
  };
}

export function decodeBattleAttackRuntimeInputs(
  args: unknown,
  context: BattleContext,
  token: Extract<
    BattleResolvedActionToken,
    {
      readonly type:
        | "BATTLE_ATTACK"
        | "BATTLE_OFF_HAND_ATTACK"
        | "BATTLE_LEGENDARY_ATTACK";
    }
  >,
):
  | BattleResolutionRuntimeInputs
  | { readonly code: "INVALID_RUNTIME_INPUT"; readonly message: string } {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return missingRuntimeInputsError(token, "battleAttack");
  }

  const runtime = Reflect.get(args, "runtime");
  if (runtime === undefined) {
    return missingRuntimeInputsError(token, "battleAttack");
  }

  const decoded = Schema.decodeUnknownEither(BattleAttackRuntimeOverrideSchema)(
    runtime,
  );
  if (decoded._tag === "Left") {
    return battleAttackShapeError(token);
  }
  const values = Reflect.get(runtime as object, "values");
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return battleAttackShapeError(token);
  }
  const allowedKeys = new Set([
    "attackRoll",
    "targetAc",
    "weaponDamage",
    "attackerWithin5ft",
    "attackerWithin60ft",
    "hostileWithin5ft",
    "targetCanSeeAttacker",
    "attackerCanSeeTarget",
    "frightSourceInLOS",
    "hasAllyAdjacentToTarget",
    "hitReactionCandidates",
  ]);
  for (const key of Object.keys(values)) {
    if (!allowedKeys.has(key)) {
      return battleAttackShapeError(token);
    }
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

export function decodeBattleGrappleRuntimeInputs(
  args: unknown,
  token: Extract<
    BattleResolvedActionToken,
    { readonly type: "BATTLE_GRAPPLE" }
  >,
):
  | BattleResolutionRuntimeInputs
  | { readonly code: "INVALID_RUNTIME_INPUT"; readonly message: string } {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return missingRuntimeInputsError(token, "battleGrapple");
  }

  const runtime = Reflect.get(args, "runtime");
  if (runtime === undefined) {
    return missingRuntimeInputsError(token, "battleGrapple");
  }

  const decoded = Schema.decodeUnknownEither(
    BattleGrappleRuntimeOverrideSchema,
  )(runtime);
  if (decoded._tag === "Left") {
    return {
      code: "INVALID_RUNTIME_INPUT",
      message: `${token.type} requires runtime: { runtime: "battleGrapple", values: { targetSaveFailed } }.`,
    };
  }

  return decoded.right;
}
