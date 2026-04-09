/**
 * Snapshot Delta — pure function computing what changed between two SceneSnapshots.
 * Used by the Director to determine which visual cues to trigger.
 */
import type { Condition } from "#/types.ts";

import type { AoEZoneSnapshot, SceneSnapshot } from "./scene-snapshot.ts";

export interface SnapshotDelta {
  damageTaken: Record<string, number>;
  healingReceived: Record<string, number>;
  becameUnconscious: ReadonlyArray<string>;
  conditionsGained: Record<string, ReadonlyArray<Condition>>;
  conditionsLost: Record<string, ReadonlyArray<Condition>>;
  reactionsSpent: ReadonlyArray<string>;
  slotsExpended: ReadonlyArray<string>;
  phaseChanged: boolean;
  newAoeZones: ReadonlyArray<AoEZoneSnapshot>;
}

export function diffSnapshots(
  prev: SceneSnapshot,
  curr: SceneSnapshot,
): SnapshotDelta {
  const damageTaken: Record<string, number> = {};
  const healingReceived: Record<string, number> = {};
  const becameUnconscious: Array<string> = [];
  const conditionsGained: Record<string, Array<Condition>> = {};
  const conditionsLost: Record<string, Array<Condition>> = {};
  const reactionsSpent: Array<string> = [];
  const slotsExpended: Array<string> = [];

  const prevById = new Map(prev.creatures.map((c) => [c.id, c]));

  for (const curr_c of curr.creatures) {
    const prev_c = prevById.get(curr_c.id);
    if (!prev_c) continue;

    // HP changes (using currentHp, accounting for tempHp)
    const prevTotal = prev_c.currentHp + prev_c.tempHp;
    const currTotal = curr_c.currentHp + curr_c.tempHp;
    if (currTotal < prevTotal) {
      damageTaken[curr_c.id] = prevTotal - currTotal;
    } else if (currTotal > prevTotal) {
      healingReceived[curr_c.id] = currTotal - prevTotal;
    }

    // Unconscious transitions
    if (!prev_c.unconscious && curr_c.unconscious) {
      becameUnconscious.push(curr_c.id);
    }

    // Condition changes
    const prevConds = new Set(prev_c.conditions);
    const currConds = new Set(curr_c.conditions);
    const gained: Array<Condition> = [];
    const lost: Array<Condition> = [];
    for (const c of currConds) {
      if (!prevConds.has(c)) gained.push(c);
    }
    for (const c of prevConds) {
      if (!currConds.has(c)) lost.push(c);
    }
    if (gained.length > 0) conditionsGained[curr_c.id] = gained;
    if (lost.length > 0) conditionsLost[curr_c.id] = lost;

    // Reaction spent
    if (prev_c.reactionAvailable && !curr_c.reactionAvailable) {
      reactionsSpent.push(curr_c.id);
    }

    // Slots expended
    const prevSlots = prev_c.slotsByLevel.reduce((s, l) => s + l.current, 0);
    const currSlots = curr_c.slotsByLevel.reduce((s, l) => s + l.current, 0);
    if (currSlots < prevSlots) {
      slotsExpended.push(curr_c.id);
    }
  }

  // New AoE zones
  const prevZoneIds = new Set(prev.aoeZones.map((z) => z.zoneId));
  const newAoeZones = curr.aoeZones.filter((z) => !prevZoneIds.has(z.zoneId));

  return {
    damageTaken,
    healingReceived,
    becameUnconscious,
    conditionsGained,
    conditionsLost,
    reactionsSpent,
    slotsExpended,
    phaseChanged: prev.phase.type !== curr.phase.type,
    newAoeZones,
  };
}
