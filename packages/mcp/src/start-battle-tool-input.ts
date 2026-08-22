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
const CharacterSessionCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("characterSession").annotations({
    description: "Battle combatant source: finalized character session.",
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
const StatBlockCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("statBlock").annotations({
    description: "Battle combatant source: SRD Stat Block catalog record.",
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
export const BattleCombatantArgsSchema = Schema.Union(
  CharacterSessionCombatantArgsSchema,
  StatBlockCombatantArgsSchema,
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
const InitiativeStartModeSchema = Schema.Literal("direct", "initialSetup");
const StartBattleToolArgsSchema = Schema.Struct({
  battleId: BattleIdSchema.annotations({
    description: "Caller-chosen durable battle id.",
  }),
  initiativeMode: Schema.optionalWith(InitiativeStartModeSchema, {
    exact: true,
  }).annotations({
    description:
      "Use direct for an already supplied Initiative score or initialSetup to retain the SDK-owned setup for supported swaps and finalization.",
  }),
  initialCombatants: Schema.NonEmptyArray(
    BattleCombatantArgsSchema,
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
export type BattleCombatantArgs = Schema.Schema.Type<
  typeof BattleCombatantArgsSchema
>;

export const startBattleInputSchema = mcpObjectJsonSchema(
  StartBattleToolArgsSchema,
);

export type StartBattleToolInput = {
  readonly battleId: BattleId;
  readonly initiativeMode: "direct" | "initialSetup";
  readonly initialCombatants: readonly [
    BattleCombatantToolInput,
    ...BattleCombatantToolInput[],
  ];
  readonly companionAdmissions: readonly CompanionAdmissionToolInput[];
};

export type BattleCombatantToolInput =
  | CharacterSessionCombatantToolInput
  | StatBlockCombatantToolInput;

export type CharacterSessionCombatantToolInput = {
  readonly kind: "characterSession";
  readonly characterId: CharacterId;
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
};

export type StatBlockCombatantToolInput = {
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
    initiativeMode: record.right.initiativeMode ?? "direct",
    initialCombatants: decodeBattleCombatants(record.right.initialCombatants),
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

function decodeBattleCombatants(
  value: StartBattleToolArgs["initialCombatants"],
): StartBattleToolInput["initialCombatants"] {
  const decodeCombatant = (combatant: BattleCombatantArgs) =>
    decodeBattleCombatant(combatant);
  const [first, ...rest] = value;
  return [decodeCombatant(first), ...rest.map(decodeCombatant)];
}

export function decodeBattleCombatant(
  combatant: BattleCombatantArgs,
): BattleCombatantToolInput {
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
  return {
    kind: "statBlock",
    statBlockId: combatant.statBlockId,
    combatantId: combatantId(combatant.combatantId),
    initiative: initiativeScore(combatant.initiative),
    ammunitionStocks: combatant.ammunitionStocks.map(
      ({ ammunition, remaining }) =>
        battleAmmunitionStock(ammunition, remaining),
    ),
    admissionSource: { kind: "encounterParticipant" },
    ...(combatant.currentHp === undefined
      ? {}
      : { currentHp: Hp(combatant.currentHp) }),
    ...(combatant.tempHp === undefined ? {} : { tempHp: Hp(combatant.tempHp) }),
  };
}
