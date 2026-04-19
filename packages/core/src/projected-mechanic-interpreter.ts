import { Match } from "effect";

import { byTag } from "#/battle-machine-helpers.ts";
import type {
  ProjectedContinuation,
  ProjectedDamageNode,
  ProjectedExecutableAction,
  ProjectedHealHpNode,
  ProjectedNodeId,
  ProjectedSource,
} from "#/projected-executable.ts";
import {
  indexNodes,
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
  ProjectedAttackRollRequest,
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
  const nodes = indexNodes(action, fail);
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

  const visitContinuation = (
    continuation: ProjectedContinuation,
    targetIds: ReadonlyArray<string>,
    path: ReadonlySet<ProjectedNodeId>,
  ): void => {
    if (targetIds.length === 0) {
      return;
    }
    Match.value(continuation).pipe(
      byTag("PCDone", () => undefined),
      byTag("PCNode", ({ value }) => visitNode(value, targetIds, path)),
      Match.exhaustive,
    );
  };

  const resolveAmountTransitions = (
    params: {
      readonly nodeId: ProjectedNodeId;
      readonly targetIds: ReadonlyArray<string>;
      readonly amount:
        | ProjectedHealHpNode["amount"]
        | ProjectedDamageNode["amount"];
    },
    buildTransition: (
      resolution: ReturnType<typeof validateAmountResolutions>[number],
      amount: ReturnType<typeof resolveAmount>,
    ) => ProjectedInterpreterTransition,
  ): void => {
    const amount = resolveAmount(actor, params.amount);
    const resolutions = validateAmountResolutions(
      action.source,
      params.nodeId,
      params.targetIds,
      runtime.resolveAmount({
        source: action.source,
        actor,
        nodeId: params.nodeId,
        amount,
        targetIds: params.targetIds,
      }),
      fail,
    );
    for (const resolution of resolutions) {
      transitions.push(buildTransition(resolution, amount));
    }
  };

  const visitNode = (
    nodeId: ProjectedNodeId,
    currentTargets?: ReadonlyArray<string>,
    path: ReadonlySet<ProjectedNodeId> = new Set(),
  ): void => {
    if (path.has(nodeId)) {
      fail(action.source, `cycle detected at node ${nodeId}`);
    }
    const node = nodes.get(nodeId);
    if (node == null) {
      fail(action.source, `missing node ${nodeId}`);
    }
    const nextPath = new Set(path);
    nextPath.add(nodeId);

    Match.value(node).pipe(
      byTag("PENDirect", ({ value }) => {
        const targetIds = validateAttachmentResolution(
          action.source,
          actor,
          nodeId,
          value.attachment,
          runtime.resolveAttachment({
            source: action.source,
            actor,
            nodeId,
            attachment: value.attachment,
          }),
          fail,
        );
        transitions.push({
          tag: "PITDirect",
          value: {
            nodeId,
            attachment: value.attachment,
            targetIds,
          },
        });
        visitContinuation(value.next, targetIds, nextPath);
      }),
      byTag("PENSaveGate", ({ value }) => {
        const targetIds = validateAttachmentResolution(
          action.source,
          actor,
          nodeId,
          value.attachment,
          runtime.resolveAttachment({
            source: action.source,
            actor,
            nodeId,
            attachment: value.attachment,
          }),
          fail,
        );
        const resolvedDc = resolveSaveDc(action.source, actor, value.dc, fail);
        const outcomes = validateOutcomeTargets(
          action.source,
          nodeId,
          targetIds,
          runtime.resolveSaveGate({
            source: action.source,
            actor,
            nodeId,
            attachment: value.attachment,
            ability: value.ability,
            dc: resolvedDc,
            dcSource: value.dc,
            targetIds,
          }),
          fail,
        );
        transitions.push({
          tag: "PITSaveGate",
          value: {
            nodeId,
            attachment: value.attachment,
            ability: value.ability,
            dc: resolvedDc,
            dcSource: value.dc,
            targetIds,
            outcomes,
          },
        });
        visitContinuation(
          value.onFail,
          nextTargetsForOutcome(outcomes, "fail"),
          nextPath,
        );
        visitContinuation(
          value.onSuccess,
          nextTargetsForOutcome(outcomes, "success"),
          nextPath,
        );
      }),
      byTag("PENAttackRoll", ({ value }) => {
        const targetIds = validateAttachmentResolution(
          action.source,
          actor,
          nodeId,
          value.attachment,
          runtime.resolveAttachment({
            source: action.source,
            actor,
            nodeId,
            attachment: value.attachment,
          }),
          fail,
        );
        const outcomes = validateOutcomeTargets(
          action.source,
          nodeId,
          targetIds,
          runtime.resolveAttackRoll({
            source: action.source,
            actor,
            nodeId,
            attachment: value.attachment,
            attackKind: value.attackKind,
            targetIds,
          }),
          fail,
        );
        transitions.push({
          tag: "PITAttackRoll",
          value: {
            nodeId,
            attachment: value.attachment,
            attackKind: value.attackKind,
            targetIds,
            outcomes,
          },
        });
        visitContinuation(
          value.onHit,
          nextTargetsForOutcome(outcomes, "hit"),
          nextPath,
        );
        visitContinuation(
          value.onMiss,
          nextTargetsForOutcome(outcomes, "miss"),
          nextPath,
        );
      }),
      byTag("PENDamage", ({ value }) => {
        const targetIds = requireTargets(
          action.source,
          nodeId,
          currentTargets,
          fail,
        );
        resolveAmountTransitions(
          { nodeId, targetIds, amount: value.amount },
          (resolution, amount) => ({
            tag: "PITDamage",
            value: {
              nodeId,
              damageType: value.damageType,
              targetId: resolution.targetId,
              amount,
              total: resolution.total,
              ...(resolution.rolledTotal == null
                ? {}
                : { rolledTotal: resolution.rolledTotal }),
            },
          }),
        );
        visitContinuation(value.next, targetIds, nextPath);
      }),
      byTag("PENHealHp", ({ value }) => {
        const targetIds = requireTargets(
          action.source,
          nodeId,
          currentTargets,
          fail,
        );
        resolveAmountTransitions(
          { nodeId, targetIds, amount: value.amount },
          (resolution, amount) => ({
            tag: "PITHealHp",
            value: {
              nodeId,
              targetId: resolution.targetId,
              amount,
              total: resolution.total,
              ...(resolution.rolledTotal == null
                ? {}
                : { rolledTotal: resolution.rolledTotal }),
            },
          }),
        );
        visitContinuation(value.next, targetIds, nextPath);
      }),
      byTag("PENGrantExtraAction", ({ value }) => {
        const targetIds = requireTargets(
          action.source,
          nodeId,
          currentTargets,
          fail,
        );
        for (const targetId of targetIds) {
          transitions.push({
            tag: "PITGrantExtraAction",
            value: {
              nodeId,
              targetId,
              restriction: value.restriction,
              pendingUntilActionSpend: true,
            },
          });
        }
        visitContinuation(value.next, targetIds, nextPath);
      }),
      Match.exhaustive,
    );
  };

  visitNode(action.entryNode);

  return {
    source: action.source,
    actor,
    transitions,
  };
}
