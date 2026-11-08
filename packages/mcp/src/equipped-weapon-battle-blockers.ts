import {
  CHARACTER_WEAPON_ATTACK_SLOTS,
  characterBuildEquippedWeaponBattleBlockers,
} from "@dnd/character-battle-runtime";
import { UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";
import { isReadonlyArrayNonEmpty } from "effect/Array";

const OWNED_ALTERNATIVE_INSTRUCTIONS =
  "These owned alternatives pass weapon-definition admission only. Use set_equipment_loadout on the ChatGPT tool surface, or apply_character_session_operation with operation.kind setEquipmentLoadout on the regular tool surface, to validate a replacement loadout. Other character Battle-entry requirements still apply.";
const CATALOG_ALTERNATIVE_INSTRUCTIONS =
  "No owned alternative in this slot passes weapon-definition admission. Inspect catalog equipment before planning an encounter; ownership and loadout requirements still apply. The equipped item remains available for noncombat use.";

export const EquippedWeaponBattleBlockersSchema = Schema.Array(
  Schema.Struct({
    slot: Schema.Literals(CHARACTER_WEAPON_ATTACK_SLOTS),
    itemId: Schema.String,
    weaponUnitId: UnitId,
    messages: Schema.NonEmptyArray(Schema.String),
    nextStep: Schema.Union([
      Schema.Struct({
        tag: Schema.Literal("reviewWeaponDefinitionAdmittedOwnedAlternatives"),
        itemIds: Schema.NonEmptyArray(Schema.String),
        instructions: Schema.Literal(OWNED_ALTERNATIVE_INSTRUCTIONS),
      }),
      Schema.Struct({
        tag: Schema.Literal("inspectCatalogForAdmittedWeapon"),
        instructions: Schema.Literal(CATALOG_ALTERNATIVE_INSTRUCTIONS),
      }),
    ]),
  }),
);

export function equippedWeaponBattleBlockersOutput(
  input: Parameters<typeof characterBuildEquippedWeaponBattleBlockers>[0],
): typeof EquippedWeaponBattleBlockersSchema.Type {
  return characterBuildEquippedWeaponBattleBlockers(input).map(
    ({ weaponDefinitionAdmittedOwnedAlternatives, ...blocker }) => ({
      ...blocker,
      nextStep: isReadonlyArrayNonEmpty(
        weaponDefinitionAdmittedOwnedAlternatives,
      )
        ? {
            tag: "reviewWeaponDefinitionAdmittedOwnedAlternatives" as const,
            itemIds: weaponDefinitionAdmittedOwnedAlternatives,
            instructions: OWNED_ALTERNATIVE_INSTRUCTIONS,
          }
        : {
            tag: "inspectCatalogForAdmittedWeapon" as const,
            instructions: CATALOG_ALTERNATIVE_INSTRUCTIONS,
          },
    }),
  );
}
