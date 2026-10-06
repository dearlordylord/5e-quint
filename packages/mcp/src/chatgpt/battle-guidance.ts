import {
  INITIAL_INITIATIVE_GUIDANCE_TOOLS,
  type ChatGptReactionSelectionSchema,
  type ChatGptBattleGuidance,
} from "./battle-guidance-schema.ts";
export type { ChatGptBattleGuidance } from "./battle-guidance-schema.ts";
import {
  battlePendingTransactionReplaySessionForSession,
  type BattleState,
} from "@dnd/battle-runtime";
import { Match, Result, type Schema } from "effect";
import { errorContent } from "../tool-content.ts";
import type { ToolError } from "../schema-codec.ts";
import type { McpPlaySessionRoot } from "../composition-root.ts";
import { battleMechanicsEnvelopeForSession } from "../battle-tool-payloads.ts";
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

export function chatGptBattleGuidance(
  root: McpPlaySessionRoot,
): ChatGptBattleGuidance {
  const battle = root.sessionStore.battleState;
  if (battle.tag === "none") return { kind: "noBattle" } as const;
  if (battle.tag === "initialInitiativeSetup")
    return {
      kind: "initialInitiativeSetup",
      tools: INITIAL_INITIATIVE_GUIDANCE_TOOLS,
    } as const;
  const envelope = battleMechanicsEnvelopeForSession(root, battle.session);
  return Match.value(envelope.frontier).pipe(
    Match.when({ kind: "acts" }, (frontier) => ({
      kind: "acts" as const,
      acts: frontier.acts.map((act) => {
        const route = chatGptBattleSubjectExposure(
          battle.session.state,
          act.subject,
        );
        return {
          subject: act.subject,
          routing: operationRouting(route),
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
        subject: frontier.replaySubject,
        routing: operationRouting(route),
      };
    }),
    Match.when({ kind: "interruptDecision" }, (frontier) => ({
      kind: "reactionDecision" as const,
      declineTool: "decline_reaction" as const,
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
      value.acts.flatMap((act) => routingTools(act.routing)),
    ),
    Match.when({ kind: "ordinaryContinuation" }, (value) =>
      routingTools(value.routing),
    ),
    Match.when({ kind: "reactionDecision" }, (value) => [
      value.declineTool,
      ...value.choices.flatMap((choice) => routingTools(choice.routing)),
    ]),
    Match.exhaustive,
  );
}
