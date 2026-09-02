import type { CharacterBuild } from "@dnd/character-creation-runtime/consumer-protocol";

import type {
  NonSpellcastingCharacterBuild,
  SpellcastingCharacterBuild,
} from "./sheet-types.ts";

export function characterBuildHasBookOfShadows(build: CharacterBuild): boolean {
  return (
    build.spellcasting?.sources.some(
      (source) => source.bookOfShadows !== undefined,
    ) ?? false
  );
}

export function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

export function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}
