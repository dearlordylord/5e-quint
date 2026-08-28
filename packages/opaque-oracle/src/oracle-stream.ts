import { Effect, Either, Stream } from "effect";

import {
  type OracleBatchOperationInput,
  type OracleEvaluationDistribution,
} from "./oracle-batch-operation.ts";
import {
  encodeOracleBatchResponseJson,
  ORACLE_INVALID_JSON_ISSUES,
  oracleDecodeRejectedResponse,
  type OracleBatchResponse,
} from "./oracle-process-contract.ts";

export type OracleStreamEvaluator<Error, Requirements> = (
  input: OracleBatchOperationInput,
) => Effect.Effect<OracleBatchResponse, Error, Requirements>;

export type OracleStreamResponseWriter<Error, Requirements> = (
  encodedResponse: string,
) => Effect.Effect<void, Error, Requirements>;

export interface OracleStreamOptions<
  InputError,
  EvaluationError,
  WriteError,
  InputRequirements,
  EvaluationRequirements,
  WriteRequirements,
> {
  readonly input: Stream.Stream<Uint8Array, InputError, InputRequirements>;
  readonly distribution: OracleEvaluationDistribution;
  readonly evaluate: OracleStreamEvaluator<
    EvaluationError,
    EvaluationRequirements
  >;
  readonly write: OracleStreamResponseWriter<WriteError, WriteRequirements>;
}

/**
 * Consume a persistent LF-framed byte stream in order.
 *
 * The frame buffer exists only inside one invocation. A completed response is
 * encoded and written as one operation after evaluation has returned, so an
 * evaluator defect cannot expose a successful Trace prefix.
 */
export function runOracleStream<
  InputError,
  EvaluationError,
  WriteError,
  InputRequirements,
  EvaluationRequirements,
  WriteRequirements,
>(
  options: OracleStreamOptions<
    InputError,
    EvaluationError,
    WriteError,
    InputRequirements,
    EvaluationRequirements,
    WriteRequirements
  >,
): Effect.Effect<
  void,
  InputError | EvaluationError | WriteError,
  InputRequirements | EvaluationRequirements | WriteRequirements
> {
  return Effect.fn("OracleStream.run")(function* () {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let frameBytes: number[] = [];

    const processFrame = (
      bytes: readonly number[],
    ): Effect.Effect<
      void,
      EvaluationError | WriteError,
      EvaluationRequirements | WriteRequirements
    > => {
      const decoded = decodeUtf8Frame(decoder, bytes);
      const responseEffect = Either.isLeft(decoded)
        ? Effect.succeed(
            oracleDecodeRejectedResponse({
              distributionId: options.distribution.distributionId,
              issues: ORACLE_INVALID_JSON_ISSUES,
            }),
          )
        : options.evaluate({
            distribution: options.distribution,
            rawJson: decoded.right,
          });

      return responseEffect.pipe(
        Effect.map(
          (response) => `${encodeOracleBatchResponseJson(response)}\n`,
        ),
        Effect.flatMap(options.write),
      );
    };

    yield* options.input.pipe(
      Stream.runForEach((chunk) =>
        Effect.gen(function* () {
          for (const byte of chunk) {
            if (byte === 0x0a) {
              const completeFrame = frameBytes;
              frameBytes = [];
              yield* processFrame(completeFrame);
            } else {
              frameBytes.push(byte);
            }
          }
        }),
      ),
    );

    if (frameBytes.length > 0) {
      yield* processFrame(frameBytes);
    }
  })();
}

function decodeUtf8Frame(
  decoder: InstanceType<typeof TextDecoder>,
  bytes: readonly number[],
): Either.Either<string, void> {
  try {
    return Either.right(decoder.decode(Uint8Array.from(bytes)));
  } catch {
    return Either.left(undefined);
  }
}
