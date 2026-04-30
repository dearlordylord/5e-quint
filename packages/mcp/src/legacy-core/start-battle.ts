import { Schema } from "effect";

import { type CharacterSheet } from "@dnd/core/character-domain.ts";
import { characterSheetBattleProjection } from "@dnd/core/character-sheet-derived.ts";
import {
  makeSpellLibrary,
  SRD_SPELLS,
} from "@dnd/core/features/spell-registry.ts";
import { MONSTER_STAT_BLOCK_IDS } from "@dnd/core/monster-catalog.ts";
import { fighterStartBattleLoadout } from "@dnd/core/player-loadouts.ts";
import type { BattleWeaponProfile } from "@dnd/core/types.ts";

import type { CreatureActionHost } from "./host-factories.ts";
import { errorContent } from "./server-shared.ts";

const strictParseOptions = { onExcessProperty: "error" } as const;
const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

const InitiativeRollSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 20),
);

const ParticipantTimingSchemaFields = {
  initiativeRoll: Schema.optional(InitiativeRollSchema),
  initiativeRollB: Schema.optional(InitiativeRollSchema),
  surprised: Schema.optional(Schema.Boolean),
};

const BasicRawParticipantSchemaFields = {
  id: Schema.String,
  source: Schema.Literal("basicRaw"),
  maxHp: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  baseWalkSpeed: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  ),
  ...ParticipantTimingSchemaFields,
};

export const StartBattleInputSchema = Schema.Struct({
  participants: Schema.NonEmptyArray(
    Schema.Union(
      Schema.Struct({
        id: Schema.String,
        source: Schema.Literal("activeHost"),
        ...ParticipantTimingSchemaFields,
      }),
      Schema.Struct({
        id: Schema.String,
        source: Schema.Literal("storedSheet"),
        ...ParticipantTimingSchemaFields,
      }),
      Schema.Struct({
        id: Schema.String,
        source: Schema.Literal("monsterStatBlock"),
        statBlockId: Schema.Literal(...MONSTER_STAT_BLOCK_IDS),
        ...ParticipantTimingSchemaFields,
      }),
      Schema.Struct({
        ...BasicRawParticipantSchemaFields,
        kind: Schema.Literal("PC"),
        fighterLevel: Schema.optional(
          Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
        ),
      }),
      Schema.Struct({
        ...BasicRawParticipantSchemaFields,
        kind: Schema.Literal("Monster"),
      }),
    ),
  ),
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

type StartBattleParticipant = StartBattleInput["participants"][number];
type InitiativeParticipant = Pick<
  StartBattleParticipant,
  "initiativeRoll" | "initiativeRollB" | "surprised"
>;
type StoredSheet = CharacterSheet | null;
type StoredCharacterState = "empty" | "draft" | "sheet";

function initiativeFields(input: InitiativeParticipant) {
  return {
    ...(defined(input.initiativeRoll)
      ? { initiativeRoll: input.initiativeRoll }
      : {}),
    ...(defined(input.initiativeRollB)
      ? { initiativeRollB: input.initiativeRollB }
      : {}),
    ...(defined(input.surprised) ? { surprised: input.surprised } : {}),
  };
}

function monsterStatBlockEntry(
  input: Extract<
    StartBattleParticipant,
    { readonly source: "monsterStatBlock" }
  >,
) {
  return {
    id: input.id,
    kind: "Monster" as const,
    statBlockId: input.statBlockId,
    ...initiativeFields(input),
  };
}

function rawEntry(
  input: Extract<StartBattleParticipant, { readonly source: "basicRaw" }>,
) {
  return {
    id: input.id,
    maxHp: input.maxHp,
    kind: input.kind,
    ...(defined(input.baseWalkSpeed)
      ? { baseWalkSpeed: input.baseWalkSpeed }
      : {}),
    ...(input.kind === "PC" && defined(input.fighterLevel)
      ? { fighterLevel: input.fighterLevel }
      : {}),
    ...initiativeFields(input),
  };
}

function duplicateParticipantId(
  participants: StartBattleInput["participants"],
) {
  const seen = new Set<string>();
  return participants.find((participant) => {
    if (seen.has(participant.id)) return true;
    seen.add(participant.id);
    return false;
  })?.id;
}

function duplicatedSingletonParticipantSource(
  participants: StartBattleInput["participants"],
) {
  const singletonSources = participants
    .filter(
      (
        participant,
      ): participant is Extract<
        StartBattleParticipant,
        { readonly source: "activeHost" | "storedSheet" }
      > =>
        participant.source === "activeHost" ||
        participant.source === "storedSheet",
    )
    .map((participant) => participant.source);
  return singletonSources.find(
    (source, index) => singletonSources.indexOf(source) !== index,
  );
}

function activeHostEntry(
  host: CreatureActionHost,
  input: Extract<StartBattleParticipant, { readonly source: "activeHost" }>,
) {
  const context = host.actor.getSnapshot().context;
  const fighterLevel = context.classStates.fighter?.level ?? 0;
  const fighterLoadout = fighterStartBattleLoadout();

  if (fighterLevel <= 0) {
    return errorContent(
      "start_battle requires activeHost participants to use a Fighter creature host.",
      "START_BATTLE_REQUIRES_FIGHTER_HOST",
    );
  }

  return {
    id: input.id,
    maxHp: context.maxHp,
    kind: "PC" as const,
    fighterLevel,
    baseWalkSpeed: context.baseWalkSpeed,
    ...loadoutEntryFields(fighterLoadout),
    ...initiativeFields(input),
  };
}

function storedSheetEntry(
  sheet: CharacterSheet,
  input: Extract<StartBattleParticipant, { readonly source: "storedSheet" }>,
) {
  const projection = characterSheetBattleProjection(sheet, SPELL_LIBRARY);
  if ((projection.fighterLevel ?? 0) <= 0) {
    return errorContent(
      "start_battle requires storedSheet participants to use a stored character sheet with Fighter levels.",
      "START_BATTLE_REQUIRES_FIGHTER_SHEET",
    );
  }

  return {
    id: input.id,
    kind: "PC" as const,
    maxHp: projection.maxHp,
    baseArmorClass: projection.baseArmorClass,
    baseWalkSpeed: projection.baseWalkSpeed,
    caster: projection.caster,
    strMod: projection.strMod,
    dexMod: projection.dexMod,
    fighterLevel: projection.fighterLevel,
    spellAccesses: projection.spellAccesses,
    spellSlots: {
      max: projection.slotsMax,
      current: projection.slotsCurrent,
    },
    ...((projection.pactSlotsMax ?? 0) > 0
      ? {
          pactSlots: {
            max: projection.pactSlotsMax,
            current: projection.pactSlotsCurrent,
            slotLevel: projection.pactSlotLevel,
          },
        }
      : {}),
    ...nonZeroLevelFields(projection),
    ...(projection.critRange != null
      ? { critRange: projection.critRange }
      : {}),
    ...((projection.sneakAttackDice ?? 0) > 0
      ? { sneakAttackDice: projection.sneakAttackDice }
      : {}),
    ...loadoutEntryFields(projection),
    ...initiativeFields(input),
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
  storedSheet: StoredSheet,
  storedCharacterState: StoredCharacterState,
  input: StartBattleInput,
) {
  const duplicateId = duplicateParticipantId(input.participants);
  if (duplicateId != null) {
    return errorContent(
      "Battle creature IDs must be unique.",
      "START_BATTLE_DUPLICATE_CREATURE_ID",
    );
  }

  const duplicateSingletonSource = duplicatedSingletonParticipantSource(
    input.participants,
  );
  if (duplicateSingletonSource != null) {
    return errorContent(
      "start_battle accepts at most one participant from each singleton authored source.",
      {
        code: "START_BATTLE_DUPLICATE_SINGLETON_SOURCE",
        source: duplicateSingletonSource,
      },
    );
  }

  const creatures = [];
  for (const participant of input.participants) {
    if (participant.source === "activeHost") {
      const entry = activeHostEntry(host, participant);
      if ("isError" in entry) return entry;
      creatures.push(entry);
    } else if (participant.source === "storedSheet") {
      if (storedSheet === null) {
        return errorContent(
          "start_battle requires a finalized stored character sheet for storedSheet participants. Finalize a draft first, or use source:activeHost for the demo Fighter.",
          {
            code: "START_BATTLE_MISSING_SHEET",
            storedCharacterState,
          },
        );
      }
      const entry = storedSheetEntry(storedSheet, participant);
      if ("isError" in entry) return entry;
      creatures.push(entry);
    } else if (participant.source === "monsterStatBlock") {
      creatures.push(monsterStatBlockEntry(participant));
    } else if (participant.source === "basicRaw") {
      creatures.push(rawEntry(participant));
    } else {
      const exhaustive: never = participant;
      return exhaustive;
    }
  }

  return {
    scope: "battle" as const,
    type: "BATTLE_INIT" as const,
    creatures,
  };
}
