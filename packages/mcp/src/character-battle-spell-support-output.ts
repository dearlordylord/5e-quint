import type { CharacterBattleSpellSupportSchema } from "./character-battle-spell-support-schema.ts";
import { characterBuildClassSpellBattleSupport } from "@dnd/character-battle-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog-core";
import { Match } from "effect";

export function characterBattleSpellSupportOutput(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): typeof CharacterBattleSpellSupportSchema.Type {
  return characterBuildClassSpellBattleSupport(input).map(
    ({ spellId, admission }) =>
      Match.value(admission).pipe(
        Match.when({ tag: "admitted" }, (value) => ({
          spellId,
          ...value,
          nextStep: "discoverBattleActs" as const,
        })),
        Match.when({ tag: "notBattleOwned" }, (value) => ({
          spellId,
          ...value,
          nextStep: "planWithoutBattleCasting" as const,
        })),
        Match.when({ tag: "rejected" }, (value) => ({
          spellId,
          ...value,
          nextStep: "resolveBattleEntryBlocker" as const,
        })),
        Match.when({ tag: "spellRecordUnavailable" }, (value) => ({
          spellId,
          ...value,
          nextStep: "resolveSpellRecordAvailability" as const,
        })),
        Match.exhaustive,
      ),
  );
}
