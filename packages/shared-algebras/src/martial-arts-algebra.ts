import type { WeaponRecord } from "@dnd/surface/surface/types";

export function isMonkWeapon(weapon: WeaponRecord): boolean {
  return (
    weapon.usage === "melee" &&
    (weapon.category === "simple" ||
      (weapon.category === "martial" &&
        (weapon.properties ?? []).some(
          (property) => property.kind === "light",
        )))
  );
}
