import { Result } from "effect";

/** Decode one complete transport frame as strict UTF-8. */
export function decodeOracleUtf8(
  bytes: Uint8Array,
): Result.Result<string, void> {
  try {
    return Result.succeed(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return Result.fail(undefined);
  }
}
