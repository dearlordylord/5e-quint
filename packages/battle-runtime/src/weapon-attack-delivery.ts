// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.THROWN_WEAPON_ATTACK
import { Schema } from "effect";
import { WeaponRangeSchema } from "@dnd/surface/surface/schema";
import type { CharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-schema.ts";
import { sameDomainValue } from "./domain-value-equality.ts";

export const AdmittedThrownWeaponDeliverySchema = Schema.Struct({
  kind: Schema.Literal("thrown"),
  range: WeaponRangeSchema,
});
export type AdmittedThrownWeaponDelivery =
  typeof AdmittedThrownWeaponDeliverySchema.Type;

export function explicitThrownWeaponDelivery(
  weapon: Pick<CharacterWeaponAttackExecutionWeapon, "usage" | "properties">,
): AdmittedThrownWeaponDelivery | undefined {
  if (weapon.usage !== "melee") return undefined;
  const property = weapon.properties.find(
    (property) => property.kind === "thrown",
  );
  return property === undefined
    ? undefined
    : { kind: "thrown", range: property.range };
}

export function weaponDeliveryBelongsToWeapon(input: {
  readonly weapon: Pick<
    CharacterWeaponAttackExecutionWeapon,
    "usage" | "properties"
  >;
  readonly weaponDelivery?: AdmittedThrownWeaponDelivery;
}): boolean {
  return (
    input.weaponDelivery === undefined ||
    sameDomainValue(
      explicitThrownWeaponDelivery(input.weapon),
      input.weaponDelivery,
    )
  );
}
