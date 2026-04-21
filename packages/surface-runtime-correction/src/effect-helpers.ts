import { Effect, Either, Option } from "effect";

export function optionToEither<A, E>(
  option: Option.Option<A>,
  onNone: () => E,
): Either.Either<A, E> {
  return Option.isSome(option)
    ? Either.right(option.value)
    : Either.left(onNone());
}

export function effectFromEither<A, E>(
  either: Either.Either<A, E>,
): Effect.Effect<A, E> {
  return Either.isLeft(either)
    ? Effect.fail(either.left)
    : Effect.succeed(either.right);
}
