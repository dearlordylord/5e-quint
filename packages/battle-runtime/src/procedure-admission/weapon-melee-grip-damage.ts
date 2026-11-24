import { sameDomainValue } from "../domain-value-equality.ts";
// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// SRD 5.2.1 equipment.md "Versatile": its damage applies only to a melee
// attack made with two hands. Keep the admitted property beside the base weapon.
import { Result, Schema } from "effect";
import { WeaponPropertyDetailSchema } from "@dnd/surface/surface/schema";
import type { WeaponGrip } from "@dnd/shared/types";
import type { CharacterWeaponAttackExecutionWeapon } from "../character-weapon-execution-schema.ts";

type WeaponProperty =
  CharacterWeaponAttackExecutionWeapon["properties"][number];
export type AdmittedVersatileMeleeDamage = Extract<
  WeaponProperty,
  { readonly kind: "versatile" }
> & {
  readonly damage: Extract<
    Extract<WeaponProperty, { readonly kind: "versatile" }>["damage"],
    { readonly kind: "dice" }
  >;
};

function isVersatileMeleeDamage(
  property: WeaponProperty,
): property is AdmittedVersatileMeleeDamage {
  return property.kind === "versatile" && property.damage.kind === "dice";
}

export const AdmittedVersatileMeleeDamageSchema =
  WeaponPropertyDetailSchema.pipe(
    Schema.refine(isVersatileMeleeDamage, {
      expected: "a Versatile property with dice damage",
    }),
    Schema.toType,
  );

export function admitWeaponMeleeGripDamage(
  weapon: CharacterWeaponAttackExecutionWeapon,
  grip: WeaponGrip,
): Result.Result<
  AdmittedVersatileMeleeDamage | undefined,
  { readonly tag: "unsupportedVersatileDamage"; readonly message: string }
> {
  if (grip !== "two_handed" || weapon.usage !== "melee")
    return Result.succeed(undefined);
  const property = versatileProperty(weapon.properties);
  if (property === undefined) return Result.succeed(undefined);
  return isVersatileMeleeDamage(property)
    ? Result.succeed(property)
    : Result.fail({
        tag: "unsupportedVersatileDamage",
        message: "Versatile weapon two-handed damage must be dice damage.",
      });
}

export function meleeGripDamageBelongsToWeapon(input: {
  readonly weapon: Pick<CharacterWeaponAttackExecutionWeapon, "properties">;
  readonly meleeGripDamage?: AdmittedVersatileMeleeDamage;
}): boolean {
  return (
    input.meleeGripDamage === undefined ||
    sameDomainValue(
      versatileProperty(input.weapon.properties),
      input.meleeGripDamage,
    )
  );
}

function versatileProperty(properties: readonly WeaponProperty[]) {
  return properties.find((property) => property.kind === "versatile");
}
