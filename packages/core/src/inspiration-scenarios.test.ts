import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { creatureMachine } from "#/machine.ts";
import type { DamageType } from "#/types.ts";
import { d20Roll, damageAmount } from "#/types.ts";

const DEFAULT_MAX_HP = 20;

function create(maxHp = DEFAULT_MAX_HP) {
  const actor = createActor(creatureMachine, { input: { maxHp } });
  actor.start();
  return actor;
}

function snapshot(actor: ReturnType<typeof create>) {
  return actor.getSnapshot();
}

function ctx(actor: ReturnType<typeof create>) {
  return snapshot(actor).context;
}

function takeDamage(
  actor: ReturnType<typeof create>,
  amount: number,
  opts: {
    damageType?: DamageType;
    resistances?: ReadonlySet<DamageType>;
    vulnerabilities?: ReadonlySet<DamageType>;
    immunities?: ReadonlySet<DamageType>;
    isCritical?: boolean;
  } = {},
) {
  actor.send({
    type: "TAKE_DAMAGE",
    amount: damageAmount(amount),
    damageType: opts.damageType ?? "bludgeoning",
    resistances: opts.resistances ?? new Set(),
    vulnerabilities: opts.vulnerabilities ?? new Set(),
    immunities: opts.immunities ?? new Set(),
    isCritical: opts.isCritical ?? false,
  });
}

function grapple(actor: ReturnType<typeof create>, targetSaveFailed: boolean) {
  actor.send({
    type: "GRAPPLE",
    attackerSize: "medium",
    targetSize: "medium",
    targetSaveFailed,
    attackerHasFreeHand: true,
  });
}

function createDying() {
  const actor = create();
  takeDamage(actor, DEFAULT_MAX_HP);
  return actor;
}

describe("inspiration-sourced creature regressions", () => {
  describe("death saving throw track", () => {
    it("natural_20: three failures kill the creature", () => {
      const actor = createDying();

      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(9) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(9) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(9) });

      expect(snapshot(actor).matches({ damageTrack: "dead" })).toBe(true);
      expect(ctx(actor).deathSaves).toEqual({ successes: 0, failures: 3 });
    });

    it("natural_20: three successes stabilize and clear the track", () => {
      const actor = createDying();

      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(10) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(15) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(12) });

      expect(
        snapshot(actor).matches({ damageTrack: { dying: "stable" } }),
      ).toBe(true);
      expect(ctx(actor).hp).toBe(0);
      expect(ctx(actor).deathSaves).toEqual({ successes: 0, failures: 0 });
    });

    it("natural_20: a natural 20 restores 1 HP and consciousness", () => {
      const actor = createDying();

      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(5) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(15) });
      actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(20) });

      expect(snapshot(actor).matches({ damageTrack: "alive" })).toBe(true);
      expect(ctx(actor).hp).toBe(1);
      expect(ctx(actor).unconscious).toBe(false);
      expect(ctx(actor).deathSaves).toEqual({ successes: 0, failures: 0 });
    });

    it("natural_20: damage breaks stability and restarts the failure track", () => {
      const actor = createDying();

      actor.send({ type: "STABILIZE" });
      takeDamage(actor, 1);

      expect(
        snapshot(actor).matches({ damageTrack: { dying: "unstable" } }),
      ).toBe(true);
      expect(ctx(actor).deathSaves).toEqual({ successes: 0, failures: 1 });
    });
  });

  describe("damage modifiers", () => {
    it("natural_20: resistance halves damage before HP is reduced", () => {
      const actor = create();

      takeDamage(actor, 7, {
        damageType: "fire",
        resistances: new Set<DamageType>(["fire"]),
      });

      expect(ctx(actor).hp).toBe(17);
    });

    it("natural_20: vulnerability doubles damage", () => {
      const actor = create();

      takeDamage(actor, 5, {
        damageType: "fire",
        vulnerabilities: new Set<DamageType>(["fire"]),
      });

      expect(ctx(actor).hp).toBe(10);
    });

    it("natural_20: resistance then vulnerability are applied in RAW order", () => {
      const actor = create();

      takeDamage(actor, 7, {
        damageType: "fire",
        resistances: new Set<DamageType>(["fire"]),
        vulnerabilities: new Set<DamageType>(["fire"]),
      });

      expect(ctx(actor).hp).toBe(14);
    });
  });

  describe("grapple lifecycle", () => {
    it("natural_20: grapple applies the grappled condition on a failed save", () => {
      const actor = create();

      grapple(actor, true);

      expect(ctx(actor).grappled).toBe(true);
    });

    it("natural_20: an incapacitated target is grappled even on a successful save", () => {
      const actor = create();

      actor.send({ type: "APPLY_CONDITION", condition: "paralyzed" });
      grapple(actor, false);

      expect(ctx(actor).grappled).toBe(true);
    });

    it("natural_20: escaping a grapple clears the condition on success", () => {
      const actor = create();

      grapple(actor, true);
      actor.send({ type: "ESCAPE_GRAPPLE", escapeSucceeded: true });

      expect(ctx(actor).grappled).toBe(false);
    });

    it("natural_20: the grapple can be released with no action cost", () => {
      const actor = create();

      grapple(actor, true);
      actor.send({ type: "RELEASE_GRAPPLE" });

      expect(ctx(actor).grappled).toBe(false);
    });
  });
});
