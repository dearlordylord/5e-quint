import { Data } from "effect";

export class ToySchemaDecodeError extends Data.TaggedError("ToySchemaDecodeError")<{
  readonly message: string;
}> {}

export class MissingRuntimeUnitError extends Data.TaggedError("MissingRuntimeUnitError")<{
  readonly unitId: string;
}> {}

export class MissingCombatantError extends Data.TaggedError("MissingCombatantError")<{
  readonly combatantId: string;
}> {}

export class MissingOwnedUnitError extends Data.TaggedError("MissingOwnedUnitError")<{
  readonly combatantId: string;
  readonly unitId: string;
}> {}

export class InvalidToyChoiceError extends Data.TaggedError("InvalidToyChoiceError")<{
  readonly message: string;
}> {}
