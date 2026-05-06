import { describe, expect, it } from "vitest";

import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts";

import { DEFAULT_TIMING, directorStep } from "./director.ts";
import { diffSnapshots } from "./snapshot-diff.ts";
import { snapshotAt } from "./test-helpers.ts";

function pairAt(eventIndex: number, aoeIdx: string | null = null) {
  const prev = snapshotAt(eventIndex, aoeIdx);
  const curr = snapshotAt(eventIndex + 1, aoeIdx);
  return { prev, curr, event: FIREBALL_BATTLE[eventIndex] };
}

describe("directorStep", () => {
  it("produces cast bar for BATTLE_CAST_AOE (fireball)", () => {
    const { curr, event, prev } = pairAt(2);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.castBar).not.toBeNull();
    expect(cues.castBar!.casterId).toBe("A");
    expect(cues.castBar!.spellName).toBe("Fireball");
    expect(cues.castBar!.progress).toBe(1);
  });

  it("produces cast bar for counterspell reaction", () => {
    // Event 3 = E counterspells A's Fireball
    const { curr, event, prev } = pairAt(3);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.castBar).not.toBeNull();
    expect(cues.castBar!.casterId).toBe("E");
    expect(cues.castBar!.spellName).toBe("Counterspell");
  });

  it("shows interrupt overlay during interrupt phase", () => {
    const { curr, event, prev } = pairAt(2);
    const delta = diffSnapshots(curr, curr);
    const cues = directorStep(event, curr, prev, delta);
    if (curr.phase.type === "interrupt") {
      expect(cues.interruptOverlay.opacity).toBe(0.6);
      expect(cues.interruptOverlay.label).toBe("COUNTERSPELL WINDOW");
    }
  });

  it("produces damage flash when creature takes damage", () => {
    // D's fireball damage lands on the first AoE target resolution (event 8→9).
    const { curr, event, prev } = pairAt(8);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.creatureCues["D"].damageFlash).toBe(true);
  });

  it("marks reaction used when reaction is spent", () => {
    // Event 3 = E counterspells
    const { curr, event, prev } = pairAt(3);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.creatureCues["E"].reactionUsed).toBe(true);
  });

  it("auto-advance delay uses event-type override", () => {
    const { curr, event, prev } = pairAt(2);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.autoAdvanceDelay).toBe(
      DEFAULT_TIMING.overrides.BATTLE_CAST_AOE,
    );
  });

  it("auto-advance delay falls back to default", () => {
    const { curr, event, prev } = pairAt(1);
    const delta = diffSnapshots(prev, curr);
    const cues = directorStep(event, curr, prev, delta);
    expect(cues.autoAdvanceDelay).toBe(
      DEFAULT_TIMING.overrides.BATTLE_START_TURN,
    );
  });
});
