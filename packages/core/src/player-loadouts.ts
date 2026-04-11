import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import type { BattleWeaponProfile } from "#/types.ts";

const FIGHTER_START_BATTLE_LONGSWORD: BattleWeaponProfile = {
  name: "Longsword",
  damageType: "slashing",
  isMelee: true,
  damageDie: 8,
  versatileDie: 10,
  properties: new Set(["versatile"]),
};

function cloneBattleWeaponProfile(
  profile: BattleWeaponProfile,
): BattleWeaponProfile {
  return {
    ...profile,
    properties: new Set(profile.properties),
    ...(profile.damageQualifiers != null
      ? { damageQualifiers: new Set(profile.damageQualifiers) }
      : {}),
  };
}

/**
 * Narrow core-owned PC loadout used by the first `start_battle` slice.
 *
 * There is no runtime character equipment owner yet, so MCP references this
 * named core loadout instead of accepting arbitrary public weapon payloads.
 *
 * SRD 5.2.1 Equipment:
 * - Longsword: 1d8 slashing, Versatile (1d10)
 */
export function fighterStartBattleLoadout(): Pick<
  InitCreatureConfig,
  "mainHandWeapon"
> {
  return {
    mainHandWeapon: cloneBattleWeaponProfile(FIGHTER_START_BATTLE_LONGSWORD),
  };
}
