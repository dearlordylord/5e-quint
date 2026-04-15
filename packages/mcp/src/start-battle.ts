import { Schema } from "effect";

import { type CharacterSheet } from "@dnd/core/character-domain.ts";
import { characterSheetBattleProjection } from "@dnd/core/character-sheet-derived.ts";
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
  monsterId: Schema.String,
  fighterInitiativeRoll: Schema.optional(InitiativeRollSchema),
  fighterInitiativeRollB: Schema.optional(InitiativeRollSchema),
  fighterSurprised: Schema.optional(Schema.Boolean),
  monsterStatBlockId: Schema.optional(
    Schema.Literal(...MONSTER_STAT_BLOCK_IDS),
  ),
  monsterInitiativeRoll: Schema.optional(InitiativeRollSchema),
  monsterInitiativeRollB: Schema.optional(InitiativeRollSchema),
  monsterSurprised: Schema.optional(Schema.Boolean),
  useDemoHost: Schema.optional(Schema.Boolean),
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

function monsterInitEntry(input: StartBattleInput) {
  return {
    id: input.monsterId,
    kind: "Monster" as const,
    statBlockId: input.monsterStatBlockId ?? "goblinMinion",
    ...(defined(input.monsterInitiativeRoll)
      ? { initiativeRoll: input.monsterInitiativeRoll }
      : {}),
    ...(defined(input.monsterInitiativeRollB)
      ? { initiativeRollB: input.monsterInitiativeRollB }
      : {}),
    ...(defined(input.monsterSurprised)
      ? { surprised: input.monsterSurprised }
      : {}),
  };
}

function fighterInitiativeFields(input: StartBattleInput) {
  return {
    ...(defined(input.fighterInitiativeRoll)
      ? { initiativeRoll: input.fighterInitiativeRoll }
      : {}),
    ...(defined(input.fighterInitiativeRollB)
      ? { initiativeRollB: input.fighterInitiativeRollB }
      : {}),
    ...(defined(input.fighterSurprised)
      ? { surprised: input.fighterSurprised }
      : {}),
  };
}

type LoadoutFields = {
  readonly mainHandWeapon?: BattleWeaponProfile;
  readonly offHandWeapon?: BattleWeaponProfile;
  readonly hasShieldEquipped?: boolean;
  readonly isWearingArmor?: boolean;
  readonly mainHandUsesTwoHands?: boolean;
};

function loadoutEntryFields(loadout: LoadoutFields) {
  return {
    ...(loadout.mainHandWeapon != null
      ? { mainHandWeapon: encodeBattleWeaponProfile(loadout.mainHandWeapon) }
      : {}),
    ...(loadout.offHandWeapon != null
      ? { offHandWeapon: encodeBattleWeaponProfile(loadout.offHandWeapon) }
      : {}),
    ...(defined(loadout.hasShieldEquipped)
      ? { hasShieldEquipped: loadout.hasShieldEquipped }
      : {}),
    ...(defined(loadout.isWearingArmor)
      ? { isWearingArmor: loadout.isWearingArmor }
      : {}),
    ...(defined(loadout.mainHandUsesTwoHands)
      ? { mainHandUsesTwoHands: loadout.mainHandUsesTwoHands }
      : {}),
  };
}

function nonZeroLevelFields(
  projection: Pick<
    ReturnType<typeof characterSheetBattleProjection>,
    "barbarianLevel" | "bardLevel" | "rogueLevel" | "monkLevel"
  >,
) {
  return {
    ...((projection.barbarianLevel ?? 0) > 0
      ? { barbarianLevel: projection.barbarianLevel }
      : {}),
    ...((projection.bardLevel ?? 0) > 0
      ? { bardLevel: projection.bardLevel }
      : {}),
    ...((projection.rogueLevel ?? 0) > 0
      ? { rogueLevel: projection.rogueLevel }
      : {}),
    ...((projection.monkLevel ?? 0) > 0
      ? { monkLevel: projection.monkLevel }
      : {}),
  };
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

  if (input.fighterId === input.monsterId) {
    return errorContent(
      "Battle creature IDs must be unique.",
      "START_BATTLE_DUPLICATE_CREATURE_ID",
    );
  }

  return {
    scope: "battle" as const,
    type: "BATTLE_INIT" as const,
    // BATTLE_INIT seeds the initial roster of an already-authored battle.
    // These creatures are promoted into battle participation here; they are
    // not "created by battle".
    creatures: [
      {
        id: input.fighterId,
        maxHp: context.maxHp,
        kind: "PC" as const,
        fighterLevel,
        baseWalkSpeed: context.baseWalkSpeed,
        ...loadoutEntryFields(fighterLoadout),
        ...fighterInitiativeFields(input),
      },
      monsterInitEntry(input),
    ],
  };
}

export function buildStartBattleCommandFromSheet(
  sheet: CharacterSheet,
  input: StartBattleInput,
) {
  if (input.fighterId === input.monsterId) {
    return errorContent(
      "Battle creature IDs must be unique.",
      "START_BATTLE_DUPLICATE_CREATURE_ID",
    );
  }

  const projection = characterSheetBattleProjection(sheet);
  if ((projection.fighterLevel ?? 0) <= 0) {
    return errorContent(
      "start_battle requires the stored character sheet to include Fighter levels.",
      "START_BATTLE_REQUIRES_FIGHTER_SHEET",
    );
  }

  return {
    scope: "battle" as const,
    type: "BATTLE_INIT" as const,
    creatures: [
      {
        id: input.fighterId,
        kind: "PC" as const,
        maxHp: projection.maxHp as number,
        baseWalkSpeed: projection.baseWalkSpeed,
        caster: projection.caster,
        strMod: projection.strMod,
        dexMod: projection.dexMod,
        fighterLevel: projection.fighterLevel,
        ...nonZeroLevelFields(projection),
        ...(projection.critRange != null
          ? { critRange: projection.critRange }
          : {}),
        ...((projection.sneakAttackDice ?? 0) > 0
          ? { sneakAttackDice: projection.sneakAttackDice }
          : {}),
        ...loadoutEntryFields(projection),
        ...fighterInitiativeFields(input),
      },
      monsterInitEntry(input),
    ],
  };
}
