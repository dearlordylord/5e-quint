import { Effect, Result, Stream } from "effect";

import type { OracleApplication } from "./oracle-distribution.ts";
import { decodeOracleUtf8 } from "./oracle-utf8.ts";
import {
  encodeOracleBatchResponseJson,
  ORACLE_INVALID_JSON_ISSUES,
  oracleDecodeRejectedResponse,
} from "./oracle-process-contract.ts";

export type OracleStreamResponseWriter<Error, Requirements> = (
  encodedResponse: string,
) => Effect.Effect<void, Error, Requirements>;

export interface OracleStreamOptions<
  InputError,
  WriteError,
  InputRequirements,
  WriteRequirements,
> {
  readonly input: Stream.Stream<Uint8Array, InputError, InputRequirements>;
  readonly application: OracleApplication;
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
  WriteError,
  InputRequirements,
  WriteRequirements,
>(
  options: OracleStreamOptions<
    InputError,
    WriteError,
    InputRequirements,
    WriteRequirements
  >,
): Effect.Effect<
  void,
  InputError | WriteError,
  InputRequirements | WriteRequirements
> {
  return Effect.fn("OracleStream.run")(function* () {
    let frameBytes: number[] = [];

    const processFrame = (
      bytes: readonly number[],
    ): Effect.Effect<void, WriteError, WriteRequirements> => {
      const decoded = decodeOracleUtf8(Uint8Array.from(bytes));
      const responseEffect = Result.isFailure(decoded)
        ? Effect.succeed(
            oracleDecodeRejectedResponse({
              distributionId: options.application.identity.distributionId,
              issues: ORACLE_INVALID_JSON_ISSUES,
            }),
          )
        : options.application.evaluateJson(decoded.success);

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
