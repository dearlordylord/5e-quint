import {
  BattleId as BattleIdSchema,
  battleAmmunitionStock,
  battleTablePositionId,
  characterId,
  combatantId,
  initiativeScore,
  type BattleId,
  type BattleAmmunitionStock,
  type BattleTablePositionId,
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
import { Result, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const IntegerSchema = Schema.Number.pipe(Schema.check(Schema.isInt()));
const NonNegativeIntegerSchema = IntegerSchema.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
);
const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);
const AmmunitionStockArgsSchema = Schema.Struct({
  ammunition: AmmunitionKindSchema,
  remaining: NonNegativeIntegerSchema,
});
const CharacterSessionCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("characterSession").pipe(
    Schema.annotate({
      description: "Battle combatant source: finalized character session.",
    }),
  ),
  characterId: NonEmptyTrimmedStringSchema.pipe(
    Schema.annotate({
      description:
        "characterId handle for an available finalized character from list_characters.",
    }),
  ),
  combatantId: NonEmptyTrimmedStringSchema.pipe(
    Schema.annotate({
      description:
        "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
    }),
  ),
  initiative: IntegerSchema.pipe(
    Schema.annotate({
      description: "Caller-supplied Initiative score.",
    }),
  ),
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).pipe(
    Schema.annotate({
      description:
        "Explicit carried ammunition stock. Use an empty array when the character carries none.",
    }),
  ),
});
const StatBlockCombatantArgsSchema = Schema.Struct({
  kind: Schema.Literal("statBlock").pipe(
    Schema.annotate({
      description: "Battle combatant source: SRD Stat Block catalog record.",
    }),
  ),
  statBlockId: StatBlockId.pipe(
    Schema.annotate({
      description: "SRD Stat Block id from list_stat_blocks.",
    }),
  ),
  combatantId: NonEmptyTrimmedStringSchema.pipe(
    Schema.annotate({
      description:
        "Caller-chosen battle actor id used in turn order, targets, and battle subjects.",
    }),
  ),
  initiative: IntegerSchema.pipe(
    Schema.annotate({
      description: "Caller-supplied Initiative score.",
    }),
  ),
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).pipe(
    Schema.annotate({
      description:
        "Explicit carried ammunition stock. Include every ammunition kind required by an admitted ranged attack.",
    }),
  ),
  admissionSource: Schema.Struct({
    kind: Schema.Literal("encounterParticipant"),
  }),
  currentHp: Schema.optionalKey(NonNegativeIntegerSchema).pipe(
    Schema.annotate({
      description: "Optional non-negative current HP override.",
    }),
  ),
  tempHp: Schema.optionalKey(NonNegativeIntegerSchema).pipe(
    Schema.annotate({
      description: "Optional non-negative Temporary Hit Points.",
    }),
  ),
});
export const BattleCombatantArgsSchema = Schema.Union([
  CharacterSessionCombatantArgsSchema,
  StatBlockCombatantArgsSchema,
]);
const CompanionAdmissionArgsSchema = Schema.Struct({
  ownerCharacterId: NonEmptyTrimmedStringSchema.pipe(
    Schema.annotate({
      description:
        "Finalized characterId whose durable retained companion should enter this battle.",
    }),
  ),
  ammunitionStocks: Schema.Array(AmmunitionStockArgsSchema).pipe(
    Schema.annotate({
      description:
        "Explicit retained companion ammunition stock. Use an empty array when it carries none.",
    }),
  ),
  companionCombatantId: Schema.optionalKey(NonEmptyTrimmedStringSchema).pipe(
    Schema.annotate({
      description:
        "Caller-chosen battle actor id. Required only when the retained companion is present outside battle.",
    }),
  ),
  initiative: Schema.optionalKey(IntegerSchema).pipe(
    Schema.annotate({
      description:
        "Caller-supplied Initiative score. Required when the retained companion is present outside battle.",
    }),
  ),
  positionId: Schema.optionalKey(NonEmptyTrimmedStringSchema).pipe(
    Schema.annotate({
      description:
        "Optional caller/table position id for the unoccupied space where the retained companion starts.",
    }),
  ),
});
const InitiativeStartModeSchema = Schema.Literals(["direct", "initialSetup"]);
const StartBattleToolArgsSchema = Schema.Struct({
  battleId: BattleIdSchema.pipe(
    Schema.annotate({
      description: "Caller-chosen durable battle id.",
    }),
  ),
  initiativeMode: InitiativeStartModeSchema.pipe(
    Schema.annotate({
      description:
        "Use direct for an already supplied Initiative score or initialSetup to retain the SDK-owned setup for supported swaps and finalization. This field is required.",
    }),
  ),
  initialCombatants: Schema.NonEmptyArray(BattleCombatantArgsSchema).pipe(
    Schema.annotate({
      description:
        "Non-empty initial combatant roster. Each combatant comes from a finalized character session or an ordinary SRD Stat Block.",
    }),
  ),
  companionAdmissions: Schema.Array(CompanionAdmissionArgsSchema).pipe(
    Schema.annotate({
      description:
        "Explicit retained-companion admissions. Use an empty array when no retained companion enters the battle.",
    }),
  ),
}).pipe(
  Schema.annotate({
    description:
      "Start a battle session from an initial combatant roster. Provide caller-supplied Initiative for every combatant.",
  }),
);

type StartBattleToolArgs = typeof StartBattleToolArgsSchema.Type;
export type BattleCombatantArgs = typeof BattleCombatantArgsSchema.Type;

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
  readonly positionId?: BattleTablePositionId;
};

export function decodeStartBattleArgs(
  args: unknown,
): ToolInputResult<StartBattleToolInput> {
  const record = decodeToolArgs(
    StartBattleToolArgsSchema,
    args,
    "start_battle",
  );
  if (Result.isFailure(record)) return Result.fail(record.failure);

  return Result.succeed({
    battleId: record.success.battleId,
    initiativeMode: record.success.initiativeMode,
    initialCombatants: decodeBattleCombatants(record.success.initialCombatants),
    companionAdmissions: record.success.companionAdmissions.map(
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
          : { positionId: battleTablePositionId(admission.positionId) }),
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
