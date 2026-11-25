import { sameDomainValue } from "./domain-value-equality.ts";
// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// SRD 5.2.1 equipment.md "Versatile": its damage applies only to a melee
// attack made with two hands. Keep the admitted property beside the base
// weapon; the attack reads the main weapon's grip when it deals damage, since
// the grip can change during a battle (ASSUMPTIONS.md A65).
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

/**
 * The Versatile damage a main weapon deals when held with two hands for a
 * melee attack, or undefined when it has none. The grip can change during a
 * battle, so a dice Versatile damage is admitted whatever the starting grip.
 * Battle executes only dice Versatile damage: a weapon whose Versatile damage
 * isn't dice may start one-handed and then keeps that grip (see
 * {@link versatileMeleeDamageIsUnsupported}). An off-hand weapon is held in
 * one hand, so only the main weapon is admitted.
 */
export function admitVersatileMeleeDamage(
  weapon: CharacterWeaponAttackExecutionWeapon,
  startingGrip: WeaponGrip,
): Result.Result<
  AdmittedVersatileMeleeDamage | undefined,
  { readonly tag: "unsupportedVersatileDamage"; readonly message: string }
> {
  if (weapon.usage !== "melee") return Result.succeed(undefined);
  const property = versatileProperty(weapon.properties);
  if (property === undefined) return Result.succeed(undefined);
  if (isVersatileMeleeDamage(property)) return Result.succeed(property);
  return startingGrip === "two_handed"
    ? Result.fail({
        tag: "unsupportedVersatileDamage",
        message: "Versatile weapon two-handed damage must be dice damage.",
      })
    : Result.succeed(undefined);
}

/**
 * Whether a melee weapon has Versatile damage Battle can't execute, so it
 * can't be held with two hands.
 */
export function versatileMeleeDamageIsUnsupported(
  weapon: Pick<CharacterWeaponAttackExecutionWeapon, "usage" | "properties">,
): boolean {
  if (weapon.usage !== "melee") return false;
  const property = versatileProperty(weapon.properties);
  return property !== undefined && !isVersatileMeleeDamage(property);
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
