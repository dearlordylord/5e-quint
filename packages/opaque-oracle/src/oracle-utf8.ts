import { Either } from "effect";

/** Decode one complete transport frame as strict UTF-8. */
export function decodeOracleUtf8(
  bytes: Uint8Array,
): Either.Either<string, void> {
  try {
    return Either.right(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return Either.left(undefined);
  }
}
