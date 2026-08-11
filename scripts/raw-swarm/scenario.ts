import { Either, Schema } from "effect";

const NonEmptyText = Schema.NonEmptyTrimmedString;
const DieResult = Schema.Number.pipe(Schema.int(), Schema.positive());

const ExpectationSchema = Schema.Struct({
  afterAct: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.positive()),
    {
      exact: true,
    },
  ),
  path: NonEmptyText,
  equals: Schema.Unknown,
  citation: Schema.optionalWith(NonEmptyText, { exact: true }),
  note: Schema.optionalWith(NonEmptyText, { exact: true }),
});

const MeleeAttackHitScriptActSchema = Schema.Struct({
  kind: Schema.Literal("meleeAttackHit"),
  actor: NonEmptyText,
  actSelector: Schema.Struct({
    labelContains: NonEmptyText,
    subjectKind: NonEmptyText,
  }),
  resolution: Schema.Struct({
    attackRoll: Schema.Number.pipe(Schema.int()),
    attackNaturalD20: Schema.Number.pipe(Schema.int(), Schema.between(1, 20)),
    targetChoice: NonEmptyText,
    damage: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("retainsPositiveHitPoints"),
        rolledDice: Schema.Array(
          Schema.Array(DieResult).pipe(Schema.minItems(1)),
        ).pipe(Schema.minItems(1)),
      }),
      Schema.Struct({
        kind: Schema.Literal("reducesToZeroHitPoints"),
        rolledDice: Schema.Array(
          Schema.Array(DieResult).pipe(Schema.minItems(1)),
        ).pipe(Schema.minItems(1)),
        disposition: Schema.Literal("ordinaryDamage", "knockOut"),
      }),
    ),
  }),
  then: Schema.Literal("endTurn", "continue"),
});

const PassScriptActSchema = Schema.Struct({
  kind: Schema.Literal("isolationPass"),
  actor: NonEmptyText,
  reason: NonEmptyText,
  then: Schema.Literal("endTurn", "continue"),
});

const ScriptActSchema = Schema.Union(
  MeleeAttackHitScriptActSchema,
  PassScriptActSchema,
);

const ScenarioSchema = Schema.Struct({
  id: NonEmptyText,
  kind: Schema.Literal("scripted-probe"),
  rawCitations: Schema.Array(NonEmptyText),
  setup: Schema.Struct({
    battleId: NonEmptyText,
    participants: Schema.Array(
      Schema.Struct({
        combatantId: NonEmptyText,
        statBlockId: NonEmptyText,
        initiative: Schema.Number.pipe(Schema.int()),
      }),
    ).pipe(Schema.minItems(1)),
  }),
  script: Schema.Array(ScriptActSchema),
  expectations: Schema.Array(ExpectationSchema),
});

export type Scenario = typeof ScenarioSchema.Type;
export type ScriptAct = typeof ScriptActSchema.Type;
export type Expectation = typeof ExpectationSchema.Type;

export function parseScenario(input: unknown): Either.Either<Scenario, string> {
  return Schema.decodeUnknownEither(ScenarioSchema, {
    onExcessProperty: "error",
  })(input).pipe(Either.mapLeft((issue) => issue.message));
}
