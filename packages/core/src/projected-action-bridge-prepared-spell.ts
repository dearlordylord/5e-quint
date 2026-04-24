import { Match, Schema } from "effect";

import type { ProjectedExecutableAction } from "#/projected-executable.ts";
import {
  interpretProjectedAction,
  ProjectedInterpreterError,
  type ProjectedAmountResolution,
  type ProjectedInterpreterActor,
  type ProjectedTargetResolution,
} from "#/projected-mechanic-interpreter.ts";
import type { SpellName } from "#/types.ts";

export type ProjectedPreparedSpellPromptAnswer = {
  readonly tag: "chooseAreaEffect";
  readonly targetResults: ReadonlyArray<{
    readonly targetId: string;
    readonly saveOutcome: "success" | "failure";
  }>;
  readonly total: number;
  readonly rolledTotal?: number;
};

export type ProjectedPreparedSpellRuntimeInputs = {
  readonly runtime: "projectedPreparedSpell";
  readonly values: ProjectedPreparedSpellPromptAnswer;
};

const ProjectedPreparedSpellRuntimeOverrideSchema = Schema.Struct({
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

type ProjectedPreparedSpellRuntimeOverride = Schema.Schema.Type<
  typeof ProjectedPreparedSpellRuntimeOverrideSchema
>;

export function formatProjectedPreparedSpellExpectedFields(): string {
  return [
    "targetIds: array<string>",
    'saveOutcomes: array<{ targetId: string, outcome: "fail" | "success" }>',
    "amounts: array<{ targetId: string, total: integer, rolledTotal?: integer }>",
  ].join(", ");
}

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

function sameOptionalNumber(a: number | undefined, b: number | undefined) {
  return a === b;
}

function isProjectedTargetResult(
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

function decodeRuntimeOverrideAnswer(
  decoded: ProjectedPreparedSpellRuntimeOverride,
): ProjectedPreparedSpellPromptAnswer | null {
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
  if (!targetResults.every(isProjectedTargetResult)) {
    return null;
  }

  const failedTargets = targetResults
    .filter((result) => result?.saveOutcome === "failure")
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
      tag: "chooseAreaEffect",
      targetResults,
      total: 0,
    };
  }
  if (
    amounts.some(
      (amount) =>
        amount.total !== firstAmount.total ||
        !sameOptionalNumber(amount.rolledTotal, firstAmount.rolledTotal),
    )
  ) {
    return null;
  }

  return {
    tag: "chooseAreaEffect",
    targetResults,
    total: firstAmount.total,
    ...(firstAmount.rolledTotal == null
      ? {}
      : { rolledTotal: firstAmount.rolledTotal }),
  };
}

export function decodeProjectedPreparedSpellRuntimeInputs(
  args: unknown,
): ProjectedPreparedSpellRuntimeInputs | null {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return null;
  }

  const runtime = Reflect.get(args, "runtime");
  const decoded = Schema.decodeUnknownEither(
    ProjectedPreparedSpellRuntimeOverrideSchema,
  )(runtime);
  if (decoded._tag === "Left") {
    return null;
  }
  if (
    !hasExactKeys(runtime, new Set(["runtime", "values"])) ||
    !hasExactKeys(
      Reflect.get(runtime as object, "values"),
      new Set(["targetIds", "saveOutcomes", "amounts"]),
    )
  ) {
    return null;
  }

  const answer = decodeRuntimeOverrideAnswer(decoded.right);
  return answer === null
    ? null
    : { runtime: "projectedPreparedSpell", values: answer };
}

export type ProjectedPreparedSpellPrompt = {
  readonly tag: "chooseAreaEffect";
  readonly spellName: SpellName;
  readonly targeting: {
    readonly tag: "pointWithinRangeSphere";
    readonly rangeFeet: number;
    readonly radiusFeet: number;
  };
  readonly save: {
    readonly ability: Extract<
      ProjectedExecutableAction,
      { readonly tag: "PEASaveGateDamage" }
    >["ability"];
    readonly dc: number;
  };
  readonly effect: {
    readonly tag: "damage";
    readonly damageType: Extract<
      ProjectedExecutableAction,
      { readonly tag: "PEASaveGateDamage" }
    >["damageType"];
    readonly onSuccess: "none";
  };
};

export function promptForProjectedPreparedSpell(
  spellName: SpellName,
  action: ProjectedExecutableAction,
  actor: ProjectedInterpreterActor,
): ProjectedPreparedSpellPrompt | null {
  return Match.value(action).pipe(
    Match.when({ tag: "PEASaveGateDamage" }, (saveAction) => {
      if (
        saveAction.attachment.tag !== "PEAAreaSpherePointWithinRange" ||
        actor.spellSaveDc == null
      ) {
        return null;
      }
      return {
        tag: "chooseAreaEffect",
        spellName,
        targeting: {
          tag: "pointWithinRangeSphere",
          rangeFeet: saveAction.attachment.value.rangeFeet,
          radiusFeet: saveAction.attachment.value.radiusFeet,
        },
        save: {
          ability: saveAction.ability,
          dc: actor.spellSaveDc,
        },
        effect: {
          tag: "damage",
          damageType: saveAction.damageType,
          onSuccess: "none",
        },
      } satisfies ProjectedPreparedSpellPrompt;
    }),
    Match.orElse(() => null),
  );
}

export function interpretProjectedPreparedSpellAnswer(params: {
  readonly action: ProjectedExecutableAction;
  readonly actor: ProjectedInterpreterActor;
  readonly prompt: ProjectedPreparedSpellPrompt;
  readonly answer: ProjectedPreparedSpellPromptAnswer;
}): void {
  const { action, actor, prompt, answer } = params;
  if (prompt.tag !== answer.tag) {
    throw new ProjectedInterpreterError(
      {
        unitId: prompt.spellName,
        unitKind: "PUKSpell",
        unitName: prompt.spellName,
      },
      `prompt ${prompt.tag} does not accept ${answer.tag} answers`,
    );
  }

  const expectedPrompt = promptForProjectedPreparedSpell(
    prompt.spellName,
    action,
    actor,
  );
  if (expectedPrompt == null) {
    throw new Error(
      `${prompt.spellName}: projected prompt is unavailable in this context.`,
    );
  }
  if (
    expectedPrompt.targeting.rangeFeet !== prompt.targeting.rangeFeet ||
    expectedPrompt.targeting.radiusFeet !== prompt.targeting.radiusFeet ||
    expectedPrompt.save.ability !== prompt.save.ability ||
    expectedPrompt.save.dc !== prompt.save.dc ||
    expectedPrompt.effect.damageType !== prompt.effect.damageType
  ) {
    throw new Error(
      `${prompt.spellName}: prompt no longer matches the current projected spell state.`,
    );
  }

  interpretProjectedAction(action, actor, {
    resolveAttachment: () =>
      answer.targetResults.map((result) => result.targetId),
    resolveSaveGate: () =>
      answer.targetResults.map(
        (result) =>
          ({
            targetId: result.targetId,
            outcome: result.saveOutcome === "failure" ? "fail" : "success",
          }) satisfies ProjectedTargetResolution<"fail" | "success">,
      ),
    resolveAmount: ({ targetIds }) =>
      targetIds.map(
        (targetId) =>
          ({
            targetId,
            total: answer.total,
            ...(answer.rolledTotal == null
              ? {}
              : { rolledTotal: answer.rolledTotal }),
          }) satisfies ProjectedAmountResolution,
      ),
  });
}
