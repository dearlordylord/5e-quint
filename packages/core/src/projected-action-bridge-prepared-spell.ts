import { Match } from "effect";

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
