import { Brand, Either, Match } from "effect";

export const ELAPSED_TIME_TICKS_PER_MINUTE = 10;
export const ELAPSED_TIME_TICKS_PER_HOUR = ELAPSED_TIME_TICKS_PER_MINUTE * 60;
export const ELAPSED_TIME_HOURS_PER_DAY = 24;
export const ELAPSED_TIME_TICKS_PER_DAY =
  ELAPSED_TIME_TICKS_PER_HOUR * ELAPSED_TIME_HOURS_PER_DAY;

export const ELAPSED_TIME_UNITS = ["tick", "minute", "hour", "day"] as const;
export type ElapsedTimeUnit = (typeof ELAPSED_TIME_UNITS)[number];

export type ElapsedTimeTicks = number & Brand.Brand<"ElapsedTimeTicks">;
const ElapsedTimeTicks = Brand.nominal<ElapsedTimeTicks>();

export type InitiativeDurationRounds = number &
  Brand.Brand<"InitiativeDurationRounds">;
const InitiativeDurationRounds = Brand.nominal<InitiativeDurationRounds>();

export type ElapsedTimeDuration = {
  readonly ticks: ElapsedTimeTicks;
};

export type ElapsedTimeParseError =
  | { readonly kind: "unsupportedUnit"; readonly unit: string }
  | { readonly kind: "fractionalAmount"; readonly amount: number }
  | { readonly kind: "negativeAmount"; readonly amount: number };

export type SurfaceElapsedDurationValue = {
  readonly unit: string;
  readonly amount: number;
};

const ELAPSED_TIME_UNIT_SET: ReadonlySet<string> = new Set(ELAPSED_TIME_UNITS);

export function isElapsedTimeUnit(unit: string): unit is ElapsedTimeUnit {
  return ELAPSED_TIME_UNIT_SET.has(unit);
}

export function parseElapsedTimeTicks(
  value: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!Number.isInteger(value)) {
    return Either.left({ kind: "fractionalAmount", amount: value });
  }
  if (value < 0) {
    return Either.left({ kind: "negativeAmount", amount: value });
  }
  return Either.right(ElapsedTimeTicks(value));
}

export function elapsedTimeTicks(value: number): ElapsedTimeTicks {
  const parsed = parseElapsedTimeTicks(value);
  if (Either.isLeft(parsed)) {
    throw new Error(describeElapsedTimeParseError(parsed.left));
  }
  return parsed.right;
}

export function initiativeDurationRounds(
  value: number,
): InitiativeDurationRounds {
  const parsed = parseElapsedTimeTicks(value);
  if (Either.isLeft(parsed)) {
    throw new Error(describeElapsedTimeParseError(parsed.left));
  }
  return InitiativeDurationRounds(value);
}

export function decrementInitiativeDurationRounds(
  value: InitiativeDurationRounds,
): InitiativeDurationRounds {
  return initiativeDurationRounds(Math.max(0, Number(value) - 1));
}

export function initiativeRoundsFromElapsedTimeTicks(
  ticks: ElapsedTimeTicks,
): InitiativeDurationRounds {
  return initiativeDurationRounds(Number(ticks));
}

export function elapsedTimeTicksFromUnit(
  unit: ElapsedTimeUnit,
  amount: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!Number.isInteger(amount)) {
    return Either.left({ kind: "fractionalAmount", amount });
  }
  if (amount < 0) {
    return Either.left({ kind: "negativeAmount", amount });
  }

  return Either.right(
    elapsedTimeTicks(
      Match.value(unit).pipe(
        Match.when("tick", () => amount),
        Match.when("minute", () => amount * ELAPSED_TIME_TICKS_PER_MINUTE),
        Match.when("hour", () => amount * ELAPSED_TIME_TICKS_PER_HOUR),
        Match.when("day", () => amount * ELAPSED_TIME_TICKS_PER_DAY),
        Match.exhaustive,
      ),
    ),
  );
}

export function elapsedTimeTicksFromSurfaceDuration(
  duration: SurfaceElapsedDurationValue,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!isElapsedTimeUnit(duration.unit)) {
    return Either.left({ kind: "unsupportedUnit", unit: duration.unit });
  }
  return elapsedTimeTicksFromUnit(duration.unit, duration.amount);
}

export function elapsedTimeTicksFromMinutes(
  minutes: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  return elapsedTimeTicksFromUnit("minute", minutes);
}

export function elapsedTimeTicksFromHours(
  hours: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  return elapsedTimeTicksFromUnit("hour", hours);
}

export function formatElapsedTimeDuration(ticks: ElapsedTimeTicks): string {
  const value = Number(ticks);
  if (value % ELAPSED_TIME_TICKS_PER_DAY === 0) {
    return formatElapsedTimeUnit(value / ELAPSED_TIME_TICKS_PER_DAY, "day");
  }
  if (value % ELAPSED_TIME_TICKS_PER_HOUR === 0) {
    return formatElapsedTimeUnit(value / ELAPSED_TIME_TICKS_PER_HOUR, "hour");
  }
  if (value % ELAPSED_TIME_TICKS_PER_MINUTE === 0) {
    return formatElapsedTimeUnit(
      value / ELAPSED_TIME_TICKS_PER_MINUTE,
      "minute",
    );
  }
  return formatElapsedTimeUnit(value, "tick");
}

export function describeElapsedTimeParseError(
  error: ElapsedTimeParseError,
): string {
  return Match.value(error).pipe(
    Match.when(
      { kind: "unsupportedUnit" },
      ({ unit }) => `Unsupported elapsed-time unit: ${unit}`,
    ),
    Match.when(
      { kind: "fractionalAmount" },
      ({ amount }) => `Elapsed-time amount must be an integer: ${amount}`,
    ),
    Match.when(
      { kind: "negativeAmount" },
      ({ amount }) => `Elapsed-time amount must be non-negative: ${amount}`,
    ),
    Match.exhaustive,
  );
}

function formatElapsedTimeUnit(amount: number, unit: ElapsedTimeUnit): string {
  return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
}
