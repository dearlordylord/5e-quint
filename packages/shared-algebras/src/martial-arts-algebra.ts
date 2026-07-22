import type {
  WeaponCategory,
  WeaponPropertyDetail,
  WeaponUsage,
} from "@dnd/surface/surface/types";

export function isMonkWeapon(weapon: {
  readonly usage: WeaponUsage;
  readonly category: WeaponCategory;
  readonly properties?: readonly WeaponPropertyDetail[];
}): boolean {
  return (
    weapon.usage === "melee" &&
    (weapon.category === "simple" ||
      (weapon.category === "martial" &&
        (weapon.properties ?? []).some(
          (property) => property.kind === "light",
        )))
  );
}
