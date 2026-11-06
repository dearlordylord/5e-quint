import {
  spellBattleSupport,
  type SpellBattleSupport,
} from "@dnd/battle-runtime/consumer-protocol";
import type { CharacterBuild } from "@dnd/character-creation-runtime/consumer-protocol";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog-core";
import { Option } from "effect";

export type CharacterBuildClassSpellBattleSupport = {
  readonly spellId: UnitRecord["id"];
  readonly admission:
    | SpellBattleSupport
    | { readonly tag: "spellRecordUnavailable" };
};

export function characterBuildClassSpellBattleSupport(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): readonly CharacterBuildClassSpellBattleSupport[] {
  const spellIds = new Set(
    input.build.spellcasting?.sources.flatMap((source) => [
      ...source.cantrips,
      ...source.preparedSpells,
    ]) ?? [],
  );
  return [...spellIds].map((spellId) => {
    const record = input.unitLibrary.getUnit(spellId);
    return {
      spellId,
      admission:
        Option.isSome(record) && record.value.kind === "spell"
          ? spellBattleSupport(record.value.mechanics)
          : { tag: "spellRecordUnavailable" as const },
    };
  });
}
