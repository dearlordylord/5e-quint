import { battleActSelections } from "./battle-act-selection.ts";
import type { PlaySessionId } from "../play-session.ts";
import {
  INITIAL_INITIATIVE_GUIDANCE_TOOLS,
  type ChatGptReactionSelectionSchema,
  type ChatGptBattleGuidance,
} from "./battle-guidance-schema.ts";
export type { ChatGptBattleGuidance } from "./battle-guidance-schema.ts";
import {
  battlePendingTransactionReplaySessionForSession,
  presentBattleActs,
  type BattleState,
  type BattleHole,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Match, Result, type Schema } from "effect";
import { errorContent } from "../tool-content.ts";
import type { ToolError } from "../schema-codec.ts";
import { battleActionCancellationGuidance } from "../battle-action-cancellation-guidance.ts";
import { battleInputGuidance } from "./battle-input-guidance.ts";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import { battleMechanicsEnvelopeForSession } from "../battle-tool-payloads.ts";
import { readyBattleInterruptCalls } from "./battle-interrupt-call-guidance.ts";
import { chatGptBattleSubjectExposure } from "./battle-operation-routing.ts";
import {
  CHATGPT_OPERATION_EXPOSURE,
  CHATGPT_ORDINARY_BATTLE_CONTINUATION,
  type ChatGptToolName,
} from "./operation-tool-plan.ts";

function operationRouting(
  route: Result.Result<
    { readonly tools: readonly ChatGptToolName[] },
    ToolError
  >,
) {
  return Result.isFailure(route)
    ? { kind: "unavailable" as const, issue: route.failure }
    : { kind: "available" as const, tools: route.success.tools };
}
function reactionChoiceRouting(
  state: BattleState,
  choice: Schema.Schema.Type<typeof ChatGptReactionSelectionSchema>,
) {
  return Match.value(choice).pipe(
    Match.when({ kind: "reactionModifier" }, ({ modifier }) =>
      operationRouting(
        Result.succeed(
          CHATGPT_OPERATION_EXPOSURE.reactionModifiers[modifier.kind],
        ),
      ),
    ),
    Match.when({ kind: "nestedProcedure" }, ({ subject }) =>
      operationRouting(chatGptBattleSubjectExposure(state, subject)),
    ),
    Match.exhaustive,
  );
}
function routingTools(
  routing: ReturnType<typeof operationRouting>,
): readonly ChatGptToolName[] {
  return Match.value(routing).pipe(
    Match.when({ kind: "available" }, (value) => value.tools),
    Match.when({ kind: "unavailable" }, () => []),
    Match.exhaustive,
  );
}

export function battleMovementInputGuidance(
  subject: BattleSubject,
  hole: BattleHole,
) {
  if (
    subject.tag !== "runtimeCommand" ||
    (subject.command !== "move" &&
      subject.command !== "releaseReadiedMovement") ||
    hole.kind !== "movement" ||
    hole.brutalStrikeForcefulBlow !== undefined ||
    hole.movementBudgetFeet < 5 ||
    !hole.speedKinds.some(
      (speed) => speed.kind === "walk" && speed.movementBudgetFeet >= 5,
    )
  )
    return [];
  return [
    {
      example: {
        kind: "movement",
        holeId: hole.holeId,
        value: {
          speedKind: "walk",
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        },
      },
      instructions: [
        "Submit example as fill to provide_battle_input for a 5-foot walk only when the table confirms its movement cost is 5 feet and no opportunity attacks are provoked.",
        "Report the table's provoked opportunity attacks; use [] only when the table confirms none are provoked. Adjust speedKind and movementCostFeet for the actual movement, including terrain.",
      ],
    },
  ] as const;
}

export function chatGptBattleGuidance(
  root: McpPlaySessionRoot,
  playSessionId: PlaySessionId,
): ChatGptBattleGuidance {
  const battle = root.sessionStore.battleState;
  if (battle.tag === "none") return { kind: "noBattle" } as const;
  if (battle.tag === "initialInitiativeSetup")
    return {
      kind: "initialInitiativeSetup",
      tools: INITIAL_INITIATIVE_GUIDANCE_TOOLS,
    } as const;
  const envelope = battleMechanicsEnvelopeForSession(root, battle.session);
  const selections = battleActSelections(root, playSessionId);
  return Match.value(envelope.frontier).pipe(
    Match.when({ kind: "acts" }, (frontier) => ({
      kind: "acts" as const,
      acts: presentBattleActs(battle.session, frontier.acts).map((act) => {
        const selection = selections.find(
          (candidate) =>
            JSON.stringify(candidate.subject) === JSON.stringify(act.subject),
        );
        if (selection === undefined)
          throw new Error(
            "Presented Act must retain its canonical frontier selection.",
          );
        const route = chatGptBattleSubjectExposure(
          battle.session.state,
          act.subject,
        );
        if (Result.isFailure(route))
          return {
            kind: "unavailable" as const,
            label: act.label,
            summary: act.summary,
            subject: act.subject,
            issue: route.failure,
          };
        if (
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "creatureFalls"
        )
          return {
            kind: "tableFactsRequired" as const,
            label: act.label,
            summary: act.summary,
            arguments: { actKey: selection.actKey },
            routing: { kind: "available" as const, tools: route.success.tools },
            requiredArguments: ["reactionSpellTargetFacts"] as const,
          };
        const [firstTool, ...otherTools] = route.success.tools;
        return {
          kind: "ready" as const,
          label: act.label,
          summary: act.summary,
          readyCalls: [
            { tool: firstTool, arguments: { actKey: selection.actKey } },
            ...otherTools.map((tool) => ({
              tool,
              arguments: { actKey: selection.actKey },
            })),
          ] as const,
        };
      }),
    })),
    Match.when({ kind: "holes" }, (frontier) => {
      const transaction = root.sessionStore.getPendingBattleTransaction();
      const replay =
        transaction === null
          ? null
          : battlePendingTransactionReplaySessionForSession(
              transaction,
              battle.session,
            );
      const route =
        replay?.tag === "valid"
          ? Result.succeed(CHATGPT_ORDINARY_BATTLE_CONTINUATION)
          : Result.fail(
              errorContent(
                "The pending Battle transaction cannot identify its initiating operation.",
                { code: "BATTLE_TRANSACTION_DEFECT", issue: replay },
              ),
            );
      return {
        kind: "ordinaryContinuation" as const,
        inputs: frontier.holes.flatMap(battleInputGuidance),
        movementInputs: frontier.holes.flatMap((hole) =>
          battleMovementInputGuidance(frontier.replaySubject, hole),
        ),
        cancellation: battleActionCancellationGuidance(root, battle.session),
        subject: frontier.replaySubject,
        routing: operationRouting(route),
      };
    }),
    Match.when({ kind: "interruptDecision" }, (frontier) => ({
      kind: "reactionDecision" as const,
      declineTool: "decline_reaction" as const,
      readyCalls: readyBattleInterruptCalls(battle.session.state, frontier),
      choices: frontier.choices.map(
        ({ initialHoles: _initialHoles, ...selection }) => ({
          selection,
          routing: reactionChoiceRouting(battle.session.state, selection),
        }),
      ),
    })),
    Match.exhaustive,
  );
}

export function chatGptBattleGuidanceTools(
  guidance: ChatGptBattleGuidance,
): readonly ChatGptToolName[] {
  return Match.value(guidance).pipe(
    Match.when({ kind: "noBattle" }, () => []),
    Match.when({ kind: "initialInitiativeSetup" }, (value) => value.tools),
    Match.when({ kind: "acts" }, (value) =>
      value.acts.flatMap((act) =>
        Match.value(act).pipe(
          Match.when({ kind: "ready" }, (value) =>
            value.readyCalls.map((call) => call.tool),
          ),
          Match.when({ kind: "tableFactsRequired" }, (value) =>
            routingTools(value.routing),
          ),
          Match.when({ kind: "unavailable" }, () => []),
          Match.exhaustive,
        ),
      ),
    ),
    Match.when({ kind: "ordinaryContinuation" }, (value) => [
      ...routingTools(value.routing),
      ...(value.cancellation.kind === "available"
        ? [value.cancellation.tool]
        : []),
    ]),
    Match.when({ kind: "reactionDecision" }, (value) => [
      value.declineTool,
      ...value.choices.flatMap((choice) => routingTools(choice.routing)),
    ]),
    Match.exhaustive,
  );
}
