import {
  battleInterruptDecisionFillSchema,
  interruptChoiceResponderId,
  type BattleInterruptSubject,
  type BattleState,
} from "@dnd/battle-runtime";
import { Match, Result, Schema } from "effect";
import type { battleMechanicsEnvelopeForSession } from "../battle-tool-payloads.ts";
import { chatGptInterruptDecisionExposure } from "./battle-operation-routing.ts";
import {
  CHATGPT_TOOL_NAMES,
  isChatGptInterruptResolutionToolName,
} from "./protocol-operation.ts";
const fillSchema = battleInterruptDecisionFillSchema();
const [declineSchema, resolutionSchema] = fillSchema.fields.value.members;
type ChoiceSchema = (typeof resolutionSchema.fields.choice.members)[number];
function isNestedChoiceSchema(member: ChoiceSchema): member is Exclude<
  ChoiceSchema,
  {
    readonly fields: {
      readonly kind: { readonly literal: "reactionRollOrDamageReduction" };
    };
  }
> {
  return member.fields.kind.literal !== "reactionRollOrDamageReduction";
}
const nestedChoiceSchema = resolutionSchema.fields.choice.mapMembers(
  (members) =>
    members
      .filter(isNestedChoiceSchema)
      .map((member) =>
        member.mapFields((fields) => ({ ...fields, fills: Schema.Tuple([]) })),
      ),
);
const readyResolutionSchema = resolutionSchema.mapFields((fields) => ({
  ...fields,
  choice: nestedChoiceSchema,
}));
export const ReadyBattleInterruptCallSchema = Schema.Union([
  Schema.Struct({
    tool: Schema.Literal("decline_reaction"),
    arguments: Schema.Struct({
      fill: fillSchema.mapFields((fields) => ({
        ...fields,
        value: declineSchema,
      })),
    }),
  }),
  Schema.Struct({
    tool: Schema.Literals(
      CHATGPT_TOOL_NAMES.filter(isChatGptInterruptResolutionToolName),
    ),
    arguments: Schema.Struct({
      fill: fillSchema.mapFields((fields) => ({
        ...fields,
        value: readyResolutionSchema,
      })),
    }),
  }),
]);
type ReadyBattleInterruptCall = typeof ReadyBattleInterruptCallSchema.Type;

function readyNestedSelection(
  subject: BattleInterruptSubject,
): typeof nestedChoiceSchema.Type {
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      releaseReadiedSpell: ({ command, procedureRef }) => ({
        kind: command,
        procedureRef,
        fills: [] as const,
      }),
      releaseReadiedMovement: ({ command }) => ({
        kind: command,
        fills: [] as const,
      }),
      releaseReadiedAction: ({ command }) => ({
        kind: command,
        fills: [] as const,
      }),
      releaseReadiedAttack: ({ command, procedureRef, targetId }) => ({
        kind: command,
        procedureRef,
        targetId,
        fills: [] as const,
      }),
      castTriggeredReactionSpell: ({ command, procedureRef }) => ({
        kind: command,
        procedureRef,
        fills: [] as const,
      }),
      castAttackHitBonusActionSpell: ({ command, procedureRef }) => ({
        kind: command,
        procedureRef,
        fills: [] as const,
      }),
      opportunityAttack: ({
        command,
        tag: _tag,
        actorId: _actorId,
        reactorId: _reactorId,
        targetId: _targetId,
        distanceFeet: _distanceFeet,
        ...selection
      }) => ({ kind: command, selection, fills: [] as const }),
      retaliationAttack: ({
        command,
        tag: _tag,
        actorId: _actorId,
        reactorId: _reactorId,
        targetId: _targetId,
        ...selection
      }) => ({ kind: command, selection, fills: [] as const }),
    }),
  );
}

type InterruptFrontier = Extract<
  ReturnType<typeof battleMechanicsEnvelopeForSession>["frontier"],
  { readonly kind: "interruptDecision" }
>;

export function readyBattleInterruptCalls(
  state: BattleState,
  frontier: InterruptFrontier,
): readonly ReadyBattleInterruptCall[] {
  const calls: ReadyBattleInterruptCall[] =
    frontier.decisionHole.eligibleResponders.map((responderId) => ({
      tool: "decline_reaction",
      arguments: {
        fill: {
          kind: "interruptDecision",
          holeId: frontier.decisionHole.holeId,
          value: { kind: "decline", responderId },
        },
      },
    }));
  for (const choice of frontier.choices) {
    if (choice.kind !== "nestedProcedure") continue;
    const decision = {
      kind: "resolve",
      responderId: interruptChoiceResponderId(choice),
      choice: readyNestedSelection(choice.subject),
    } as const;
    const route = chatGptInterruptDecisionExposure(
      state,
      choice.subject,
      decision,
    );
    if (Result.isFailure(route)) continue;
    for (const tool of route.success.tools) {
      calls.push({
        tool,
        arguments: {
          fill: {
            kind: "interruptDecision",
            holeId: frontier.decisionHole.holeId,
            value: decision,
          },
        },
      });
    }
  }
  return calls;
}
