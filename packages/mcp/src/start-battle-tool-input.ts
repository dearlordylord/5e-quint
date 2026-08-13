import {
  BattleId as BattleIdSchema,
  battleAmmunitionStock,
  characterId,
  combatantId,
  initiativeScore,
  type BattleId,
  type BattleAmmunitionStock,
  type CharacterId,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import { Hp, type Hp as HpType } from "@dnd/shared/types";
import {
  AmmunitionKindSchema,
  StatBlockId,
  type StatBlockId as StatBlockIdType,
} from "@dnd/shared/game-facts";
import { Either, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const IntegerSchema = Schema.Number.pipe(Schema.int());
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.greaterThanOrEqualTo(0),
);
const AmmunitionStockArgsSchema = Schema.Struct({
  ammunition: AmmunitionKindSchema,
  remaining: NonNegativeIntegerSchema,
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
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).annotations({
    description:
      "Explicit carried ammunition stock. Use an empty array when the character carries none.",
  }),
});
const InitialEncounterStatBlockCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("statBlock").annotations({
    description: "Initial combatant source: SRD Stat Block catalog record.",
  }),
  statBlockId: StatBlockId.annotations({
    description: "SRD Stat Block id from list_stat_blocks.",
  }),
  combatantId: Schema.NonEmptyTrimmedString.annotations({
    description:
      "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
  }),
  initiative: IntegerSchema.annotations({
    description: "Caller-supplied Initiative score.",
  }),
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).annotations({
    description:
      "Explicit carried ammunition stock. Include every ammunition kind required by an admitted ranged attack.",
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
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).annotations({
    description:
      "Explicit retained companion ammunition stock. Use an empty array when it carries none.",
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
  battleId: BattleIdSchema.annotations({
    description: "Caller-chosen durable battle id.",
  }),
  initialCombatants: Schema.NonEmptyArray(
    InitialBattleCombatantArgsSchema,
  ).annotations({
    description:
      "Non-empty initial combatant roster. Each combatant comes from a finalized character session or an ordinary SRD Stat Block.",
  }),
  companionAdmissions: Schema.optionalWith(
    Schema.Array(CompanionAdmissionArgsSchema),
    { exact: true },
  ),
}).annotations({
  description:
    "Start a battle session from an initial combatant roster. Provide caller-supplied Initiative for every combatant.",
});

type StartBattleToolArgs = Schema.Schema.Type<typeof StartBattleToolArgsSchema>;

export const startBattleInputSchema = mcpObjectJsonSchema(
  StartBattleToolArgsSchema,
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
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
};

export type InitialStatBlockCombatantToolInput =
  InitialEncounterStatBlockCombatantToolInput;

export type InitialEncounterStatBlockCombatantToolInput = {
  readonly kind: "statBlock";
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly admissionSource: { readonly kind: "encounterParticipant" };
  readonly statBlockId: StatBlockIdType;
  readonly currentHp?: HpType;
  readonly tempHp?: HpType;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
};

export type CompanionAdmissionToolInput = {
  readonly ownerCharacterId: CharacterId;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
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
        ammunitionStocks: admission.ammunitionStocks.map(
          ({ ammunition, remaining }) =>
            battleAmmunitionStock(ammunition, remaining),
        ),
        ...(admission.companionCombatantId === undefined
          ? {}
          : {
              companionCombatantId: combatantId(admission.companionCombatantId),
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
  const decodeCombatant = (
    combatant: StartBattleToolArgs["initialCombatants"][number],
  ): InitialBattleCombatantToolInput => {
    if (combatant.kind === "characterSession") {
      return {
        kind: "characterSession",
        characterId: characterId(combatant.characterId),
        combatantId: combatantId(combatant.combatantId),
        initiative: initiativeScore(combatant.initiative),
        ammunitionStocks: combatant.ammunitionStocks.map(
          ({ ammunition, remaining }) =>
            battleAmmunitionStock(ammunition, remaining),
        ),
      };
    }
    const statBlockCombatant = combatant;
    return {
      kind: "statBlock",
      statBlockId: statBlockCombatant.statBlockId,
      combatantId: combatantId(statBlockCombatant.combatantId),
      initiative: initiativeScore(statBlockCombatant.initiative),
      ammunitionStocks: statBlockCombatant.ammunitionStocks.map(
        ({ ammunition, remaining }) =>
          battleAmmunitionStock(ammunition, remaining),
      ),
      admissionSource: { kind: "encounterParticipant" },
      ...(statBlockCombatant.currentHp === undefined
        ? {}
        : { currentHp: Hp(statBlockCombatant.currentHp) }),
      ...(statBlockCombatant.tempHp === undefined
        ? {}
        : { tempHp: Hp(statBlockCombatant.tempHp) }),
    };
  };
  const [first, ...rest] = value;
  return [decodeCombatant(first), ...rest.map(decodeCombatant)];
}
