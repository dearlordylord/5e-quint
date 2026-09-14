import type {
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { Match } from "effect";

export function weaponMatchesProficiency(
  weapon: Pick<WeaponRecord, "category" | "properties">,
  proficiency: WeaponProficiency,
): boolean {
  return Match.value(proficiency).pipe(
    Match.discriminatorsExhaustive("kind")({
      weapon_category: ({ category }) => weapon.category === category,
      weapon_category_with_properties: ({ category, anyOfProperties }) =>
        weapon.category === category &&
        (weapon.properties ?? []).some(({ kind }) =>
          anyOfProperties.includes(kind),
        ),
    }),
  );
}
