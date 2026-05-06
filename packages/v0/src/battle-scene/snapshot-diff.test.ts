import { describe, expect, it } from "vitest";

import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts";

import { diffSnapshots } from "./snapshot-diff.ts";
import { snapshotAt } from "./test-helpers.ts";

describe("diffSnapshots", () => {
  it("detects no changes between identical snapshots", () => {
    const snap = snapshotAt(2);
    const delta = diffSnapshots(snap, snap);
    expect(delta.damageTaken).toEqual({});
    expect(delta.healingReceived).toEqual({});
    expect(delta.becameUnconscious).toEqual([]);
    expect(delta.reactionsSpent).toEqual([]);
    expect(delta.slotsExpended).toEqual([]);
    expect(delta.phaseChanged).toBe(false);
    expect(delta.newAoeZones).toEqual([]);
  });

  it("detects phase change from activeTurn to interrupt (CS chain)", () => {
    const preCast = snapshotAt(2); // activeTurn
    const postCast = snapshotAt(3); // interrupt
    const delta = diffSnapshots(preCast, postCast);
    expect(delta.phaseChanged).toBe(true);
  });

  it("detects reactions spent during CS chain", () => {
    // Event 3 = E counterspells A's Fireball
    const before = snapshotAt(3);
    const after = snapshotAt(4); // after E counterspells
    const delta = diffSnapshots(before, after);
    expect(delta.reactionsSpent).toContain("E");
    expect(delta.slotsExpended).toContain("E");
  });

  it("detects damage after AoE save-failed reaction resolves", () => {
    // D's damage (50→22) lands on the first AoE target resolution (event 8→9).
    const before = snapshotAt(8);
    const after = snapshotAt(9);
    const delta = diffSnapshots(before, after);
    expect(delta.damageTaken["D"]).toBe(28);
    expect(delta.becameUnconscious).toHaveLength(0);
  });

  it("detects damage and KOs across full scenario", () => {
    const before = snapshotAt(2); // all healthy
    const after = snapshotAt(FIREBALL_BATTLE.length);
    const delta = diffSnapshots(before, after);
    expect(Object.keys(delta.damageTaken).length).toBeGreaterThan(0);
    expect(delta.becameUnconscious).toContain("D");
    expect(delta.becameUnconscious).toContain("F");
    expect(delta.becameUnconscious).not.toContain("A");
  });

  it("detects new AoE zones", () => {
    // Event 8 = CS chain resolves, AoE resolution starts at event 9
    const before = snapshotAt(2); // no AoE
    const after = snapshotAt(8, "2"); // AoE resolving
    const delta = diffSnapshots(before, after);
    expect(delta.newAoeZones).toHaveLength(1);
    expect(delta.newAoeZones[0].spellName).toBe("Fireball");
  });
});
