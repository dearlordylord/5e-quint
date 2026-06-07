import {
  BattleCombatantSide,
  BattleId as BattleIdSchema,
  characterId,
  combatantId,
  initiativeScore,
  type BattleId,
  type CharacterId,
  type CombatantId,
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
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);
const BattleCombatantSideSchema = BattleCombatantSide;
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
const InitialStatBlockCombatantArgsSchema =
  InitialEncounterStatBlockCombatantArgsSchema;
const InitialBattleCombatantArgsSchema = Schema.Union(
  InitialCharacterSessionCombatantArgsSchema,
  InitialStatBlockCombatantArgsSchema,
);
const CompanionAdmissionArgsSchema = Schema.Struct({
  ownerCharacterId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "Finalized characterId whose durable retained companion should enter this battle.",
  }),
  companionCombatantId: Schema.optionalWith(Schema.NonEmptyTrimmedString, {
    exact: true,
  }).annotations({
    description:
      "Caller-chosen battle actor id. Required only when the retained companion is present outside battle.",
  }),
  initiative: Schema.optionalWith(IntegerSchema, {
    exact: true,
  }).annotations({
    description:
      "Caller-supplied Initiative score. Required when the retained companion is present outside battle.",
  }),
  positionId: Schema.optionalWith(Schema.NonEmptyTrimmedString, {
    exact: true,
  }).annotations({
    description:
      "Optional caller/table position id for the unoccupied space where the retained companion starts.",
  }),
});
const StartBattleToolArgsSchema = Schema.Struct({
  battleId: BattleIdSchema,
  initialCombatants: Schema.NonEmptyArray(InitialBattleCombatantArgsSchema),
  companionAdmissions: Schema.optionalWith(
    Schema.Array(CompanionAdmissionArgsSchema),
    { exact: true },
  ),
});

type StartBattleToolArgs = Schema.Schema.Type<typeof StartBattleToolArgsSchema>;

export const startBattleInputSchema = describeStartBattleInputSchema(
  mcpObjectJsonSchema(StartBattleToolArgsSchema),
);

export type StartBattleToolInput = {
  readonly battleId: BattleId;
  readonly initialCombatants: readonly [
    InitialBattleCombatantToolInput,
    ...InitialBattleCombatantToolInput[],
  ];
  readonly companionAdmissions: readonly CompanionAdmissionToolInput[];
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
  InitialEncounterStatBlockCombatantToolInput;

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

export type CompanionAdmissionToolInput = {
  readonly ownerCharacterId: CharacterId;
  readonly companionCombatantId?: CombatantId;
  readonly initiative?: InitiativeScore;
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
    companionAdmissions: (record.right.companionAdmissions ?? []).map(
      (admission) => ({
        ownerCharacterId: characterId(admission.ownerCharacterId),
        ...(admission.companionCombatantId === undefined
          ? {}
          : {
              companionCombatantId: combatantId(
                admission.companionCombatantId,
              ),
            }),
        ...(admission.initiative === undefined
          ? {}
          : { initiative: initiativeScore(admission.initiative) }),
        ...(admission.positionId === undefined
          ? {}
          : { positionId: admission.positionId }),
      }),
    ),
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
          "Non-empty initial combatant roster. Each combatant comes from a finalized character session or an ordinary SRD Stat Block.",
      },
    },
  };
}

function objectProperty(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
