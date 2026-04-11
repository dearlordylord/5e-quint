import { Schema } from "effect";

import { MONSTER_STAT_BLOCK_IDS } from "@dnd/core/monster-catalog.ts";
import { fighterStartBattleLoadout } from "@dnd/core/player-loadouts.ts";
import type { BattleWeaponProfile } from "@dnd/core/types.ts";

import type { CreatureActionHost } from "./host-factories.ts";
import { errorContent } from "./server-shared.ts";

const strictParseOptions = { onExcessProperty: "error" } as const;

const InitiativeRollSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 20),
);

export const StartBattleInputSchema = Schema.Struct({
  fighterId: Schema.String,
  goblinId: Schema.String,
  fighterInitiativeRoll: Schema.optional(InitiativeRollSchema),
  fighterInitiativeRollB: Schema.optional(InitiativeRollSchema),
  fighterSurprised: Schema.optional(Schema.Boolean),
  goblinStatBlockId: Schema.optional(Schema.Literal(...MONSTER_STAT_BLOCK_IDS)),
  goblinInitiativeRoll: Schema.optional(InitiativeRollSchema),
  goblinInitiativeRollB: Schema.optional(InitiativeRollSchema),
  goblinSurprised: Schema.optional(Schema.Boolean),
});

export type StartBattleInput = Schema.Schema.Type<
  typeof StartBattleInputSchema
>;

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function encodeBattleWeaponProfile(profile: BattleWeaponProfile) {
  return {
    ...profile,
    properties: [...profile.properties],
    ...(profile.damageQualifiers != null
      ? { damageQualifiers: [...profile.damageQualifiers] }
      : {}),
  };
}

export function decodeStartBattleInput(args: unknown) {
  const decoded = Schema.decodeUnknownEither(
    StartBattleInputSchema,
    strictParseOptions,
  )(args);
  if (decoded._tag === "Left") {
    return errorContent("Invalid start_battle input", String(decoded.left));
  }
  return decoded.right;
}

export function buildStartBattleCommand(
  host: CreatureActionHost,
  input: StartBattleInput,
) {
  const context = host.actor.getSnapshot().context;
  const fighterLevel = context.classStates.fighter?.level ?? 0;
  const fighterLoadout = fighterStartBattleLoadout();

  if (fighterLevel <= 0) {
    return errorContent(
      "start_battle requires the active creature host to be a Fighter.",
      "START_BATTLE_REQUIRES_FIGHTER_HOST",
    );
  }

  if (input.fighterId === input.goblinId) {
    return errorContent(
      "Battle creature IDs must be unique.",
      "START_BATTLE_DUPLICATE_CREATURE_ID",
    );
  }

  return {
    scope: "battle" as const,
    type: "BATTLE_INIT" as const,
    creatures: [
      {
        id: input.fighterId,
        maxHp: context.maxHp,
        kind: "PC" as const,
        fighterLevel,
        baseWalkSpeed: context.baseWalkSpeed,
        ...(fighterLoadout.mainHandWeapon != null
          ? {
              mainHandWeapon: encodeBattleWeaponProfile(
                fighterLoadout.mainHandWeapon,
              ),
            }
          : {}),
        ...(defined(input.fighterInitiativeRoll)
          ? { initiativeRoll: input.fighterInitiativeRoll }
          : {}),
        ...(defined(input.fighterInitiativeRollB)
          ? { initiativeRollB: input.fighterInitiativeRollB }
          : {}),
        ...(defined(input.fighterSurprised)
          ? { surprised: input.fighterSurprised }
          : {}),
      },
      {
        id: input.goblinId,
        kind: "Monster" as const,
        statBlockId: input.goblinStatBlockId ?? "goblinMinion",
        ...(defined(input.goblinInitiativeRoll)
          ? { initiativeRoll: input.goblinInitiativeRoll }
          : {}),
        ...(defined(input.goblinInitiativeRollB)
          ? { initiativeRollB: input.goblinInitiativeRollB }
          : {}),
        ...(defined(input.goblinSurprised)
          ? { surprised: input.goblinSurprised }
          : {}),
      },
    ],
  };
}
