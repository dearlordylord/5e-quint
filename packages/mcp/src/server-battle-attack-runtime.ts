import { Schema } from "effect";

import type { BattleContext } from "@dnd/core/battle-machine-types.ts";
import type {
  BattleResolutionRuntimeInputs,
  BattleResolvedActionToken,
} from "@dnd/core/available-actions.ts";

export const BATTLE_ATTACK_RUNTIME_SCHEMA = {
  runtime: "battleAttack" as const,
  valueFields: {
    attackRoll: {
      type: "integer",
      min: 1,
      max: 20,
      source: "session-facing d20 roll",
      description: "Natural d20 attack roll before modifiers.",
    },
    targetAc: {
      type: "integer",
      min: 0,
      source: "session-owned geometry/target facts",
      description: "Final Armor Class of the defender at the moment of hit.",
    },
    weaponDamage: {
      type: "integer",
      min: 0,
      source: "session-facing weapon damage roll",
      description: "Pre-resistance weapon damage total from session dice.",
    },
    attackerWithin5ft: {
      type: "boolean",
      source: "session-owned geometry",
      description: "True if the attacker is within 5 feet of the target.",
    },
    attackerWithin60ft: {
      type: "boolean",
      optional: true,
      source: "session-owned geometry",
      description: "True if the attacker is within 60 feet of the target.",
    },
    hostileWithin5ft: {
      type: "boolean",
      source: "session-owned geometry",
      description: "True if any hostile is within 5 feet of the attacker.",
    },
    targetCanSeeAttacker: {
      type: "boolean",
      source: "session-owned visibility",
      description: "True if the target can see the attacker.",
    },
    attackerCanSeeTarget: {
      type: "boolean",
      source: "session-owned visibility",
      description: "True if the attacker can see the target.",
    },
    frightSourceInLOS: {
      type: "boolean",
      source: "session-owned visibility",
      description:
        "True if the attacker sees a creature that caused them frightened.",
    },
    hasAllyAdjacentToTarget: {
      type: "boolean",
      source: "session-owned geometry",
      description:
        "True if an ally of the attacker is within 5 feet of the target.",
    },
    hitReactionCandidates: {
      type: "array<string>",
      source: "session-owned reaction window",
      description:
        "Other creature IDs eligible to use a hit reaction against this attack.",
    },
  },
} as const;

export const BATTLE_GRAPPLE_RUNTIME_SCHEMA = {
  runtime: "battleGrapple" as const,
  valueFields: {
    targetSaveFailed: {
      type: "boolean",
      source: "session-facing saving throw",
      description:
        "True if the grapple-save target failed their STR/DEX save vs. the attacker's athletics DC.",
    },
  },
} as const;

export const RUNTIME_SCHEMAS_BY_TAG = {
  battleAttack: BATTLE_ATTACK_RUNTIME_SCHEMA,
  battleGrapple: BATTLE_GRAPPLE_RUNTIME_SCHEMA,
} as const;

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

function formatExpectedFields(
  schema: typeof BATTLE_ATTACK_RUNTIME_SCHEMA | typeof BATTLE_GRAPPLE_RUNTIME_SCHEMA,
): string {
  return Object.entries(schema.valueFields)
    .map(([name, spec]) => {
      const type = (spec as { type: string }).type;
      const optional =
        "optional" in spec && spec.optional === true ? "?" : "";
      return `${name}${optional}: ${type}`;
    })
    .join(", ");
}

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
    message: `${token.type} requires runtime: { runtime: "battleAttack", values: { ${formatExpectedFields(BATTLE_ATTACK_RUNTIME_SCHEMA)} } }. Call preview_action first to retrieve the full runtimeSchema descriptor.`,
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
  const schema = RUNTIME_SCHEMAS_BY_TAG[runtimeName];
  return {
    code: "INVALID_RUNTIME_INPUT" as const,
    message: `${token.type} requires explicit runtime ${runtimeName} inputs on execute_action. Expected shape: { runtime: "${runtimeName}", values: { ${formatExpectedFields(schema)} } }.`,
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
