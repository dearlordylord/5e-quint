import {
  BattleCombatantSide,
  BattleId as BattleIdSchema,
  characterId,
  combatantId,
  initiativeScore,
  type BattleId,
  type CharacterId,
  type CombatantId,
  type FindFamiliarCreatureTypeOverrideChoice,
  PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
  type PactOfTheChainFindFamiliarFormSelection,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import { Hp, type Hp as HpType } from "@dnd/shared/types";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import { Either, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type McpObjectInputSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const IntegerSchema = Schema.Number.pipe(Schema.int());
const PositiveIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(1),
);
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);
const BattleCombatantSideSchema = BattleCombatantSide;
const PactOfTheChainSpecialFormIdSchema = pactOfTheChainSpecialFormIdSchema();

function pactOfTheChainSpecialFormIdSchema() {
  const [first, ...rest] = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.map(
    (ref) => ref.formId,
  );
  return Schema.Literal(first, ...rest);
}
const FindFamiliarFormSelectionArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("normalNamedForm"),
    formId: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("challengeRatingZeroBeast"),
    statBlockId: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("pactOfTheChainSpecialForm"),
    formId: PactOfTheChainSpecialFormIdSchema,
  }),
);
const FindFamiliarCombatantSelectionArgsSchema = Schema.Struct({
  kind: Schema.Literal("findFamiliarForm"),
  form: FindFamiliarFormSelectionArgsSchema,
  creatureTypeOverrideChoiceId: Schema.NonEmptyTrimmedString,
  positionId: Schema.optionalWith(Schema.NonEmptyTrimmedString, {
    exact: true,
  }).annotations({
    description:
      "Optional caller/table position id for the unoccupied space where the familiar starts.",
  }),
});
const SourceLinkedAdmissionSourceArgsSchema = Schema.Struct({
  kind: Schema.Literal("sourceLinked"),
  sourceActorId: Schema.NonEmptyTrimmedString,
  selection: FindFamiliarCombatantSelectionArgsSchema,
});
const InitialCharacterSessionCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("characterSession").annotations({
    description: "Initial combatant source: finalized character session.",
  }),
  characterId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "characterId handle for an available finalized character from list_characters.",
  }),
  combatantId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
  }),
  initiative: IntegerSchema.annotations({
    description: "Caller-supplied Initiative score.",
  }),
  side: BattleCombatantSideSchema.annotations({
    description:
      "Caller-chosen encounter side id; matching side ids are allies and differing side ids are enemies.",
  }),
});
const InitialEncounterStatBlockCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("statBlock").annotations({
    description: "Initial combatant source: SRD Stat Block catalog record.",
  }),
  statBlockId: Schema.NonEmptyTrimmedString.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
  combatantId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
  }),
  initiative: IntegerSchema.annotations({
    description: "Caller-supplied Initiative score.",
  }),
  side: BattleCombatantSideSchema.annotations({
    description:
      "Caller-chosen encounter side id; matching side ids are allies and differing side ids are enemies.",
  }),
  admissionSource: Schema.Struct({
    kind: Schema.Literal("encounterParticipant"),
  }),
  currentHp: Schema.optionalWith(NonNegativeIntegerSchema, {
    exact: true,
  }).annotations({
    description: "Optional non-negative current HP override.",
  }),
  tempHp: Schema.optionalWith(NonNegativeIntegerSchema, {
    exact: true,
  }).annotations({
    description: "Optional non-negative Temporary Hit Points.",
  }),
});
const InitialSourceLinkedStatBlockCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("statBlock").annotations({
    description:
      "Initial combatant source: source-linked SRD Stat Block-backed combatant.",
  }),
  combatantId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
  }),
  initiative: IntegerSchema.annotations({
    description: "Caller-supplied Initiative score.",
  }),
  admissionSource: SourceLinkedAdmissionSourceArgsSchema,
  currentHp: Schema.optionalWith(PositiveIntegerSchema, {
    exact: true,
  }).annotations({
    description: "Optional positive current HP override.",
  }),
  tempHp: Schema.optionalWith(NonNegativeIntegerSchema, {
    exact: true,
  }).annotations({
    description: "Optional non-negative Temporary Hit Points.",
  }),
});
const InitialStatBlockCombatantArgsSchema = Schema.Union(
  InitialEncounterStatBlockCombatantArgsSchema,
  InitialSourceLinkedStatBlockCombatantArgsSchema,
);
const InitialBattleCombatantArgsSchema = Schema.Union(
  InitialCharacterSessionCombatantArgsSchema,
  InitialStatBlockCombatantArgsSchema,
);
const StartBattleToolArgsSchema = Schema.Struct({
  battleId: BattleIdSchema,
  initialCombatants: Schema.NonEmptyArray(InitialBattleCombatantArgsSchema),
});

type StartBattleToolArgs = Schema.Schema.Type<typeof StartBattleToolArgsSchema>;
type InitialStatBlockCombatantArgs = Schema.Schema.Type<
  typeof InitialStatBlockCombatantArgsSchema
>;
type InitialSourceLinkedStatBlockCombatantArgs = Schema.Schema.Type<
  typeof InitialSourceLinkedStatBlockCombatantArgsSchema
>;

export const startBattleInputSchema = describeStartBattleInputSchema(
  mcpObjectJsonSchema(StartBattleToolArgsSchema),
);

export type StartBattleToolInput = {
  readonly battleId: BattleId;
  readonly initialCombatants: readonly [
    InitialBattleCombatantToolInput,
    ...InitialBattleCombatantToolInput[],
  ];
};

export type InitialBattleCombatantToolInput =
  | InitialCharacterSessionCombatantToolInput
  | InitialStatBlockCombatantToolInput;

export type InitialCharacterSessionCombatantToolInput = {
  readonly kind: "characterSession";
  readonly characterId: CharacterId;
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
};

export type InitialStatBlockCombatantToolInput =
  | InitialEncounterStatBlockCombatantToolInput
  | InitialSourceLinkedStatBlockCombatantToolInput;

export type InitialEncounterStatBlockCombatantToolInput = {
  readonly kind: "statBlock";
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly admissionSource: { readonly kind: "encounterParticipant" };
  readonly statBlockId: StatBlockId;
  readonly side: BattleCombatantSide;
  readonly currentHp?: HpType;
  readonly tempHp?: HpType;
};

export type InitialSourceLinkedStatBlockCombatantToolInput = {
  readonly kind: "statBlock";
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly admissionSource: SourceLinkedCombatantAdmissionSourceToolInput;
  readonly currentHp?: HpType;
  readonly tempHp?: HpType;
};

export type SourceLinkedCombatantAdmissionSourceToolInput = {
  readonly kind: "sourceLinked";
  readonly sourceActorId: CombatantId;
  readonly selection: FindFamiliarCombatantSelectionToolInput;
};

export type FindFamiliarCombatantSelectionToolInput = {
  readonly kind: "findFamiliarForm";
  readonly form: PactOfTheChainFindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly positionId?: string;
};

export function decodeStartBattleArgs(
  args: unknown,
): ToolInputResult<StartBattleToolInput> {
  const record = decodeToolArgs(
    StartBattleToolArgsSchema,
    args,
    "start_battle",
  );
  if (Either.isLeft(record)) return Either.left(record.left);

  return Either.right({
    battleId: record.right.battleId,
    initialCombatants: decodeInitialCombatants(record.right.initialCombatants),
  });
}

function decodeInitialCombatants(
  value: StartBattleToolArgs["initialCombatants"],
): StartBattleToolInput["initialCombatants"] {
  const decoded = value.map((combatant): InitialBattleCombatantToolInput => {
    if (combatant.kind === "characterSession") {
      return {
        kind: "characterSession",
        characterId: characterId(combatant.characterId),
        combatantId: combatantId(combatant.combatantId),
        initiative: initiativeScore(combatant.initiative),
        side: combatant.side,
      };
    }
    const statBlockCombatant = combatant;
    if (isSourceLinkedStatBlockCombatantArgs(statBlockCombatant)) {
      return {
        kind: "statBlock",
        combatantId: combatantId(statBlockCombatant.combatantId),
        initiative: initiativeScore(statBlockCombatant.initiative),
        admissionSource: {
          kind: "sourceLinked",
          sourceActorId: combatantId(
            statBlockCombatant.admissionSource.sourceActorId,
          ),
          selection: {
            kind: "findFamiliarForm",
            form: statBlockCombatant.admissionSource.selection.form,
            creatureTypeOverrideChoiceId:
              statBlockCombatant.admissionSource.selection
                .creatureTypeOverrideChoiceId,
            ...(statBlockCombatant.admissionSource.selection.positionId ===
            undefined
              ? {}
              : {
                  positionId:
                    statBlockCombatant.admissionSource.selection.positionId,
                }),
          },
        },
        ...(statBlockCombatant.currentHp === undefined
          ? {}
          : { currentHp: Hp(statBlockCombatant.currentHp) }),
        ...(statBlockCombatant.tempHp === undefined
          ? {}
          : { tempHp: Hp(statBlockCombatant.tempHp) }),
      };
    }
    return {
      kind: "statBlock",
      statBlockId: statBlockCombatant.statBlockId,
      combatantId: combatantId(statBlockCombatant.combatantId),
      initiative: initiativeScore(statBlockCombatant.initiative),
      side: statBlockCombatant.side,
      admissionSource: { kind: "encounterParticipant" },
      ...(statBlockCombatant.currentHp === undefined
        ? {}
        : { currentHp: Hp(statBlockCombatant.currentHp) }),
      ...(statBlockCombatant.tempHp === undefined
        ? {}
        : { tempHp: Hp(statBlockCombatant.tempHp) }),
    };
  });
  const [first, ...rest] = decoded;
  if (first === undefined) {
    throw new Error("Start battle combatant codec returned an empty array.");
  }
  return [first, ...rest];
}

function isSourceLinkedStatBlockCombatantArgs(
  combatant: InitialStatBlockCombatantArgs,
): combatant is InitialSourceLinkedStatBlockCombatantArgs {
  return combatant.admissionSource.kind === "sourceLinked";
}

function describeStartBattleInputSchema(
  schema: McpObjectInputSchema,
): McpObjectInputSchema {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  return {
    ...schema,
    description:
      "Start a battle session from an initial combatant roster. Provide caller-supplied Initiative for every combatant.",
    properties: {
      ...properties,
      battleId: {
        ...objectProperty(properties.battleId),
        description: "Caller-chosen durable battle id.",
      },
      initialCombatants: {
        ...objectProperty(properties.initialCombatants),
        description:
          "Non-empty initial combatant roster. Each combatant comes from a finalized character session, an ordinary SRD Stat Block, or a supported source-linked Stat Block combatant.",
      },
    },
  };
}

function objectProperty(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
