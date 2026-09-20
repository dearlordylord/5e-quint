import { Result, Schema } from "effect";

const NonEmptyTextSchema = Schema.Trimmed.check(Schema.isNonEmpty());

const PublicMcpOperatorDataHandlingSchema = Schema.Struct({
  hostingRecipients: Schema.Array(NonEmptyTextSchema).pipe(
    Schema.check(Schema.isMinLength(1)),
  ),
  stderrRetention: NonEmptyTextSchema,
  ingressAccessLogRetention: NonEmptyTextSchema,
  budget: Schema.Union([
    Schema.Struct({
      tag: Schema.Literal("enabled"),
      alertRecipient: NonEmptyTextSchema,
    }),
    Schema.Struct({ tag: Schema.Literal("disabled") }),
  ]),
});

export type PublicMcpOperatorDataHandling =
  typeof PublicMcpOperatorDataHandlingSchema.Type;

export const DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING = {
  hostingRecipients: ["hosting and ingress operators"],
  stderrRetention: "set by the hosting operator",
  ingressAccessLogRetention: "set by the hosting and ingress operators",
  budget: { tag: "disabled" },
} as const satisfies PublicMcpOperatorDataHandling;

export function decodePublicMcpOperatorDataHandling(input: {
  readonly hostingRecipients: string | undefined;
  readonly stderrRetention: string | undefined;
  readonly ingressAccessLogRetention: string | undefined;
  readonly budgetMonitoring: string | undefined;
  readonly alertRecipient: string | undefined;
}): Result.Result<PublicMcpOperatorDataHandling, string> {
  const decoded = Schema.decodeUnknownResult(
    PublicMcpOperatorDataHandlingSchema,
    { onExcessProperty: "error" },
  )({
    hostingRecipients: input.hostingRecipients
      ?.split(",")
      .map((recipient) => recipient.trim())
      .filter((recipient) => recipient !== ""),
    stderrRetention: input.stderrRetention,
    ingressAccessLogRetention: input.ingressAccessLogRetention,
    budget:
      input.budgetMonitoring === "enabled"
        ? { tag: "enabled", alertRecipient: input.alertRecipient }
        : input.budgetMonitoring === "disabled"
          ? { tag: "disabled" }
          : input.budgetMonitoring,
  });
  return Result.isSuccess(decoded)
    ? Result.succeed(decoded.success)
    : Result.fail(decoded.failure.message);
}
