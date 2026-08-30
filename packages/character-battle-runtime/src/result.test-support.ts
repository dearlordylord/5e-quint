import { Result } from "effect";

export function requireResultSuccess<A, E>(result: Result.Result<A, E>): A {
  if (Result.isSuccess(result)) return result.success;
  throw new Error(
    `Expected Result.succeed, got ${JSON.stringify(result.failure)}.`,
  );
}
