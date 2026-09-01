import type { Result } from "effect";

export type ResultFailureRefinement = <Success, Failure>(
  outcome: Result.Result<Success, Failure>,
) => outcome is Result.Failure<Success, Failure>;
