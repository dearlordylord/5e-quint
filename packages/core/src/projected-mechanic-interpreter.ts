import { Match } from "effect";

import type { ProjectedExecutableAction, ProjectedSource } from "#/projected-executable.ts";
import {
  nextTargetsForOutcome,
  requireTargets,
  resolveAmount,
  resolveSaveDc,
  validateAmountResolutions,
  validateAttachmentResolution,
  validateOutcomeTargets,
} from "#/projected-mechanic-interpreter-helpers.ts";
import type {
  ProjectedExecutionRuntime,
  ProjectedInterpretation,
  ProjectedInterpreterActor,
  ProjectedInterpreterTransition,
} from "#/projected-mechanic-interpreter-types.ts";

export type {
  ProjectedAmountRequest,
  ProjectedAmountResolution,
  ProjectedAttachmentRequest,
  ProjectedExecutionRuntime,
  ProjectedInterpretation,
  ProjectedInterpreterActor,
  ProjectedInterpreterTransition,
  ProjectedResolvedAmount,
  ProjectedSaveGateRequest,
  ProjectedTargetResolution,
} from "#/projected-mechanic-interpreter-types.ts";

export class ProjectedInterpreterError extends Error {
  constructor(
    readonly source: ProjectedSource,
    message: string,
  ) {
    super(`${source.unitId}: ${message}`);
    this.name = "ProjectedInterpreterError";
  }
}

function fail(source: ProjectedSource, message: string): never {
  throw new ProjectedInterpreterError(source, message);
}

export function interpretProjectedAction(
  action: ProjectedExecutableAction,
  actor: ProjectedInterpreterActor,
  runtime: ProjectedExecutionRuntime,
): ProjectedInterpretation {
  const transitions: ProjectedInterpreterTransition[] = [];

  if (action.activationCost !== "PACFree") {
    transitions.push({
      tag: "PITSpendActivation",
      value: { cost: action.activationCost },
    });
  }
  if (action.resourceGate.tag === "PRGUseCount") {
    transitions.push({
      tag: "PITSpendResourceUse",
      value: { gate: action.resourceGate },
    });
  }
  if (action.usageLimit !== "PULNone") {
    transitions.push({
      tag: "PITMarkUsageLimit",
      value: { usageLimit: action.usageLimit },
    });
  }

  const targetIds = validateAttachmentResolution(
    action.source,
    actor,
    action.attachment,
    runtime.resolveAttachment({
      source: action.source,
      actor,
      attachment: action.attachment,
    }),
    fail,
  );

  return Match.value(action).pipe(
    Match.when({ tag: "PEASaveGateDamage" }, (saveAction) => {
      const resolvedDc = resolveSaveDc(action.source, actor, saveAction.dc, fail);
      const outcomes = validateOutcomeTargets(
        action.source,
        targetIds,
        runtime.resolveSaveGate({
          source: action.source,
          actor,
          attachment: saveAction.attachment,
          ability: saveAction.ability,
          dc: resolvedDc,
          dcSource: saveAction.dc,
          targetIds,
        }),
        fail,
      );
      transitions.push({
        tag: "PITSaveGate",
        value: {
          attachment: saveAction.attachment,
          ability: saveAction.ability,
          dc: resolvedDc,
          dcSource: saveAction.dc,
          targetIds,
          outcomes,
        },
      });
      const failedTargets = nextTargetsForOutcome(outcomes, "fail");
      if (failedTargets.length > 0) {
        const amount = resolveAmount(actor, saveAction.amount);
        const resolutions = validateAmountResolutions(
          action.source,
          failedTargets,
          runtime.resolveAmount({
            source: action.source,
            actor,
            amount,
            targetIds: failedTargets,
          }),
          fail,
        );
        for (const resolution of resolutions) {
          transitions.push({
            tag: "PITDamage",
            value: {
              damageType: saveAction.damageType,
              targetId: resolution.targetId,
              amount,
              total: resolution.total,
              ...(resolution.rolledTotal == null
                ? {}
                : { rolledTotal: resolution.rolledTotal }),
            },
          });
        }
      }
      return { source: action.source, actor, transitions };
    }),
    Match.when({ tag: "PEADirectHealHp" }, (healAction) => {
      transitions.push({
        tag: "PITDirect",
        value: { attachment: healAction.attachment, targetIds },
      });
      const requiredTargets = requireTargets(action.source, targetIds, fail);
      const amount = resolveAmount(actor, healAction.amount);
      const resolutions = validateAmountResolutions(
        action.source,
        requiredTargets,
        runtime.resolveAmount({
          source: action.source,
          actor,
          amount,
          targetIds: requiredTargets,
        }),
        fail,
      );
      for (const resolution of resolutions) {
        transitions.push({
          tag: "PITHealHp",
          value: {
            targetId: resolution.targetId,
            amount,
            total: resolution.total,
            ...(resolution.rolledTotal == null
              ? {}
              : { rolledTotal: resolution.rolledTotal }),
          },
        });
      }
      return { source: action.source, actor, transitions };
    }),
    Match.when({ tag: "PEADirectGrantExtraAction" }, (grantAction) => {
      transitions.push({
        tag: "PITDirect",
        value: { attachment: grantAction.attachment, targetIds },
      });
      for (const targetId of requireTargets(action.source, targetIds, fail)) {
        transitions.push({
          tag: "PITGrantExtraAction",
          value: {
            targetId,
            restriction: grantAction.restriction,
            pendingUntilActionSpend: true,
          },
        });
      }
      return { source: action.source, actor, transitions };
    }),
    Match.exhaustive,
  );
}
