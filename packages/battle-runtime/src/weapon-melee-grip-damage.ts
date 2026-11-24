import { sameDomainValue } from "./domain-value-equality.ts";
// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// SRD 5.2.1 equipment.md "Versatile": its damage applies only to a melee
// attack made with two hands. Keep the admitted property beside the base weapon.
import { Result, Schema } from "effect";
import {
  DiceWeaponDamageSchema,
  VersatileWeaponPropertyDetailSchema,
} from "@dnd/surface/surface/schema";
import type { WeaponGrip } from "@dnd/shared/types";
import type { CharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-schema.ts";

type WeaponProperty =
  CharacterWeaponAttackExecutionWeapon["properties"][number];

export const AdmittedVersatileMeleeDamageSchema = Schema.Struct({
  ...VersatileWeaponPropertyDetailSchema.fields,
  damage: DiceWeaponDamageSchema,
});

export type AdmittedVersatileMeleeDamage =
  typeof AdmittedVersatileMeleeDamageSchema.Type;

function isVersatileMeleeDamage(
  property: WeaponProperty,
): property is AdmittedVersatileMeleeDamage {
  return property.kind === "versatile" && property.damage.kind === "dice";
}

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
