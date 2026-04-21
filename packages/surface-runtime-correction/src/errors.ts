import { Data } from "effect";

export class SchemaDecodeError extends Data.TaggedError("SchemaDecodeError")<{
  readonly message: string;
}> {}

export class MissingRuntimeUnitError extends Data.TaggedError("MissingRuntimeUnitError")<{
  readonly unitId: string;
}> {}

export class MissingCombatantError extends Data.TaggedError("MissingCombatantError")<{
  readonly combatantId: string;
}> {}

export class InvalidRosterActionError extends Data.TaggedError("InvalidRosterActionError")<{
  readonly message: string;
}> {}

export class InvalidBattleInitError extends Data.TaggedError("InvalidBattleInitError")<{
  readonly message: string;
}> {}

export class InvalidBattlePromptAnswerError extends Data.TaggedError("InvalidBattlePromptAnswerError")<{
  readonly message: string;
}> {}

export class InvalidBattleActionError extends Data.TaggedError("InvalidBattleActionError")<{
  readonly message: string;
}> {}
