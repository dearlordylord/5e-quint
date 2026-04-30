import { Effect, Match, Random, Schema } from "effect";

import { battleMainHandDamageDie } from "@dnd/core/battle-machine-creature.ts";
import type {
  BattleContext,
  CreatureId,
} from "@dnd/core/battle-machine-types.ts";
import type {
  BattleResolutionRequest,
  BattleResolutionRuntimeInputs,
  ResolutionRequest,
  ResolutionRuntimeInputs,
} from "@dnd/core/available-actions.ts";
import { bardicInspirationDie } from "@dnd/core/features/class-bard.ts";
import { classHitDie } from "@dnd/core/features/class-tables.ts";
import { pMartialArtsDie } from "@dnd/core/features/class-monk.ts";
import type { DndContext } from "@dnd/core/machine-types.ts";

const LEGACY_PREPARED_SPELL_RUNTIME_EXPECTED_FIELDS = [
  "targetIds: array<string>",
  'saveOutcomes: array<{ targetId: string, outcome: "fail" | "success" }>',
  "amounts: array<{ targetId: string, total: integer, rolledTotal?: integer }>",
].join(", ");

const LegacyPreparedSpellRuntimeOverrideSchema = Schema.Struct({
  runtime: Schema.Literal("projectedPreparedSpell"),
  values: Schema.Struct({
    targetIds: Schema.Array(Schema.String),
    saveOutcomes: Schema.Array(
      Schema.Struct({
        targetId: Schema.String,
        outcome: Schema.Literal("fail", "success"),
      }),
    ),
    amounts: Schema.Array(
      Schema.Struct({
        targetId: Schema.String,
        total: Schema.Number.pipe(Schema.int()),
        rolledTotal: Schema.optional(Schema.Number.pipe(Schema.int())),
      }),
    ),
  }),
});

type LegacyPreparedSpellRuntimeOverride = Schema.Schema.Type<
  typeof LegacyPreparedSpellRuntimeOverrideSchema
>;

function hasExactKeys(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function hasUniqueValues(values: ReadonlyArray<string>): boolean {
  return new Set(values).size === values.length;
}

function isLegacyPreparedSpellTargetResult(
  result: {
    readonly targetId: string;
    readonly saveOutcome: "failure" | "success";
  } | null,
): result is {
  readonly targetId: string;
  readonly saveOutcome: "failure" | "success";
} {
  return result !== null;
}

function decodeLegacyPreparedSpellRuntimeOverride(
  decoded: LegacyPreparedSpellRuntimeOverride,
): Extract<
  ResolutionRuntimeInputs,
  { readonly runtime: "projectedPreparedSpell" }
> | null {
  const { amounts, saveOutcomes, targetIds } = decoded.values;
  if (
    !hasUniqueValues(targetIds) ||
    !hasUniqueValues(saveOutcomes.map((outcome) => outcome.targetId)) ||
    !hasUniqueValues(amounts.map((amount) => amount.targetId))
  ) {
    return null;
  }

  const targetIdSet = new Set(targetIds);
  if (saveOutcomes.some((outcome) => !targetIdSet.has(outcome.targetId))) {
    return null;
  }

  const saveByTarget = new Map(
    saveOutcomes.map((outcome) => [outcome.targetId, outcome.outcome]),
  );
  const targetResults = targetIds.map((targetId) => {
    const outcome = saveByTarget.get(targetId);
    return outcome == null
      ? null
      : {
          targetId,
          saveOutcome:
            outcome === "fail" ? ("failure" as const) : ("success" as const),
        };
  });
  if (!targetResults.every(isLegacyPreparedSpellTargetResult)) {
    return null;
  }

  const failedTargets = targetResults
    .filter((result) => result.saveOutcome === "failure")
    .map((result) => result.targetId);
  const failedTargetSet = new Set(failedTargets);
  if (amounts.some((amount) => !failedTargetSet.has(amount.targetId))) {
    return null;
  }
  if (failedTargets.length !== amounts.length) {
    return null;
  }

  const firstAmount = amounts[0];
  if (firstAmount === undefined) {
    return {
      runtime: "projectedPreparedSpell",
      values: {
        tag: "chooseAreaEffect",
        targetResults,
        total: 0,
      },
    };
  }
  if (
    amounts.some(
      (amount) =>
        amount.total !== firstAmount.total ||
        amount.rolledTotal !== firstAmount.rolledTotal,
    )
  ) {
    return null;
  }

  return {
    runtime: "projectedPreparedSpell",
    values: {
      tag: "chooseAreaEffect",
      targetResults,
      total: firstAmount.total,
      ...(firstAmount.rolledTotal == null
        ? {}
        : { rolledTotal: firstAmount.rolledTotal }),
    },
  };
}

function projectedPreparedSpellRuntimeShapeError(
  tokenType: "CAST_PREPARED_SPELL",
) {
  return {
    code: "INVALID_RUNTIME_INPUT" as const,
    message: `${tokenType} requires explicit runtime projectedPreparedSpell inputs on execute_action. Expected shape: { runtime: "projectedPreparedSpell", values: { ${LEGACY_PREPARED_SPELL_RUNTIME_EXPECTED_FIELDS} } }.`,
  };
}

export function decodeProjectedPreparedSpellRuntimeInputs(
  args: unknown,
  tokenType: "CAST_PREPARED_SPELL",
):
  | Extract<
      ResolutionRuntimeInputs,
      { readonly runtime: "projectedPreparedSpell" }
    >
  | { readonly code: "INVALID_RUNTIME_INPUT"; readonly message: string } {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return projectedPreparedSpellRuntimeShapeError(tokenType);
  }

  const runtime = Reflect.get(args, "runtime");
  const decoded = Schema.decodeUnknownEither(
    LegacyPreparedSpellRuntimeOverrideSchema,
  )(runtime);
  if (decoded._tag === "Left") {
    return projectedPreparedSpellRuntimeShapeError(tokenType);
  }
  if (
    !hasExactKeys(runtime, new Set(["runtime", "values"])) ||
    !hasExactKeys(
      Reflect.get(runtime as object, "values"),
      new Set(["targetIds", "saveOutcomes", "amounts"]),
    )
  ) {
    return projectedPreparedSpellRuntimeShapeError(tokenType);
  }

  return (
    decodeLegacyPreparedSpellRuntimeOverride(decoded.right) ??
    projectedPreparedSpellRuntimeShapeError(tokenType)
  );
}

export function buildRuntimeInputs(
  request: ResolutionRequest,
  context: DndContext,
): Effect.Effect<ResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, () =>
      Effect.succeed({ runtime: "none" as const }),
    ),
    Match.when({ runtime: "startTurn" }, () =>
      Effect.succeed({
        runtime: "startTurn" as const,
        values: {},
      }),
    ),
    Match.when({ runtime: "actionSurge" }, () =>
      Effect.succeed({
        runtime: "actionSurge" as const,
        values: {},
      }),
    ),
    Match.when({ runtime: "projectedPreparedSpell" }, () =>
      Effect.die(
        "projectedPreparedSpell runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    // These actions already have an owned pending trigger window in core state.
    // The current machine/event contract still reduces the underlying reroll/save
    // math to a final success boolean, so MCP can only supply that boolean here.
    // For now the demo runtime samples it randomly; richer battle/session-level
    // roll ownership should replace this once the machine owns more than the
    // final success/failure outcome.
    Match.when({ runtime: "tacticalMind" }, () =>
      Effect.map(Random.nextBoolean, (boostedCheckSucceeds) => ({
        runtime: "tacticalMind" as const,
        values: { boostedCheckSucceeds },
      })),
    ),
    Match.when({ runtime: "wholenessOfBody" }, () => {
      const monk = context.classStates.monk;
      const dieSize = pMartialArtsDie(monk?.level ?? 0);
      const wisMod = monk?.wholenessMax ?? 0;
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (dieRoll) => ({
        runtime: "wholenessOfBody" as const,
        values: { healRoll: Math.max(1, dieRoll + wisMod) },
      }));
    }),
    Match.when({ runtime: "uncannyMetabolism" }, () => {
      const monk = context.classStates.monk;
      const dieSize = pMartialArtsDie(monk?.level ?? 0);
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (healRoll) => ({
        runtime: "uncannyMetabolism" as const,
        values: { healRoll },
      }));
    }),
    Match.when({ runtime: "secondWind" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "secondWind" as const,
        values: { d10Roll },
      })),
    ),
    Match.when({ runtime: "tireless" }, () =>
      Effect.map(Random.nextIntBetween(1, 9), (d8Roll) => ({
        runtime: "tireless" as const,
        values: { d8Roll },
      })),
    ),
    Match.when({ runtime: "peerlessSkill" }, () =>
      Effect.map(Random.nextBoolean, (success) => ({
        runtime: "peerlessSkill" as const,
        values: { success },
      })),
    ),
    Match.when({ runtime: "relentlessRage" }, () =>
      Effect.map(Random.nextBoolean, (conSaveSucceeded) => ({
        runtime: "relentlessRage" as const,
        values: { conSaveSucceeded },
      })),
    ),
    Match.when({ runtime: "shortRest" }, (resolved) =>
      Effect.forEach(resolved.token.spendHitDice, (className) =>
        Effect.map(
          Random.nextIntBetween(1, classHitDie(className) + 1),
          (roll) => ({ className, roll }),
        ),
      ).pipe(
        Effect.map((hdRolls) => ({
          runtime: "shortRest" as const,
          values: { hdRolls },
        })),
      ),
    ),
    Match.exhaustive,
  );
}

export function buildBattleRuntimeInputs(
  request: BattleResolutionRequest,
  context: BattleContext,
): Effect.Effect<BattleResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "battleAttack" }, () =>
      Effect.die(
        "battleAttack runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "battleGrapple" }, () =>
      Effect.die(
        "battleGrapple runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "battleMove" }, () =>
      Effect.die(
        "battleMove runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "battleSaveSpell" }, () =>
      Effect.die(
        "battleSaveSpell runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "none" }, () =>
      Effect.succeed({ runtime: "none" as const }),
    ),
    Match.when({ runtime: "counterspell" }, () =>
      Effect.map(Random.nextBoolean, (saveSucceeded) => ({
        runtime: "counterspell" as const,
        values: { saveSucceeded },
      })),
    ),
    Match.when({ runtime: "cuttingWords" }, () => {
      const bardLevel =
        context.creatures.get(request.token.actorId as CreatureId)?.bardLevel ??
        0;
      const dieSize = bardicInspirationDie(bardLevel);
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (reduction) => ({
        runtime: "cuttingWords" as const,
        values: { reduction },
      }));
    }),
    Match.when({ runtime: "deflectAttacks" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "deflectAttacks" as const,
        values: { d10Roll },
      })),
    ),
    Match.when({ runtime: "readyAttack" }, () => {
      const actor = context.creatures.get(request.token.actorId as CreatureId);
      const damageDie =
        actor == null ? 8 : (battleMainHandDamageDie(actor, true) ?? 8);
      return Effect.all({
        atkRoll: Random.nextIntBetween(1, 21),
        dmg: Random.nextIntBetween(1, damageDie + 1),
        tgtAc: Random.nextIntBetween(10, 19),
        crit: Random.nextBoolean,
        knockOut: Effect.succeed(false),
      }).pipe(
        Effect.map((values) => ({
          runtime: "readyAttack" as const,
          values,
        })),
      );
    }),
    Match.when({ runtime: "readySpellRelease" }, () =>
      Effect.map(Random.nextIntBetween(1, 21), (saveRoll) => ({
        runtime: "readySpellRelease" as const,
        values: { saveRoll },
      })),
    ),
    Match.when({ runtime: "monsterSaveEffect" }, () =>
      Effect.all({
        saveRoll: Random.nextIntBetween(1, 21),
        actorCanSeeTarget: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "monsterSaveEffect" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "monsterTraversalMovement" }, () =>
      Effect.die(
        "monsterTraversalMovement runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "hellishRebuke" }, () =>
      Effect.all({
        damage: Random.nextIntBetween(1, 21),
        saveSucceeded: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "hellishRebuke" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "retaliation" }, () =>
      Effect.all({
        attackRoll: Random.nextIntBetween(1, 21),
        damage: Random.nextIntBetween(1, 9),
        targetAc: Random.nextIntBetween(10, 19),
        critical: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "retaliation" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "fireShield" }, () =>
      Effect.map(Random.nextIntBetween(2, 17), (damage) => ({
        runtime: "fireShield" as const,
        values: { damage },
      })),
    ),
    Match.exhaustive,
  );
}
