// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-teleport
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING
//
// SRD 5.2.1 Antimagic Field blocks teleportation into or out of its aura.
// The battle runtime owns this for represented teleport procedures by consuming
// caller-supplied origin/destination aura-membership witnesses on the table
// destination fact. Plane and automatic map-location derivation remain table
// responsibilities.

import type {
  BattleAntimagicFieldTransitWitness,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeAntimagicFieldAuraMemberships,
  antimagicFieldAuraMembershipIncludesCombatant,
} from "./antimagic-field-action-interdiction.ts";

export const ANTIMAGIC_FIELD_TRANSIT_BLOCKING_MESSAGE =
  "Teleportation into or out of an Antimagic Field aura is blocked.";

export function antimagicFieldTransitInvalidReason(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly witnesses: readonly BattleAntimagicFieldTransitWitness[];
}): string | null {
  const activeAuras = activeAntimagicFieldAuraMemberships(input.state);
  for (const witness of input.witnesses) {
    const matchingAuras = activeAuras.filter(
      (aura) =>
        aura.areaId === witness.areaId &&
        aura.sourceCombatantId === witness.sourceCombatantId,
    );
    if (matchingAuras.length !== 1) {
      return "Antimagic Field transit witness must reference one active aura.";
    }
  }

  for (const aura of activeAuras) {
    const matchingWitnesses = input.witnesses.filter(
      (witness) =>
        witness.areaId === aura.areaId &&
        witness.sourceCombatantId === aura.sourceCombatantId,
    );
    if (matchingWitnesses.length !== 1) {
      return "Teleport destination table fact must include one Antimagic Field transit witness for each active aura.";
    }

    const witness = matchingWitnesses[0];
    const originInsideAura = antimagicFieldAuraMembershipIncludesCombatant(
      aura,
      input.actorId,
    );
    if (witness.originInsideAura !== originInsideAura) {
      return "Antimagic Field transit origin witness must match the active aura membership.";
    }
    if (witness.originInsideAura !== witness.destinationInsideAura) {
      return ANTIMAGIC_FIELD_TRANSIT_BLOCKING_MESSAGE;
    }
  }

  return null;
}
