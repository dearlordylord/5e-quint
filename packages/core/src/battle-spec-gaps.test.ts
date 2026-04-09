/**
 * Tests for the three Known Spec Gaps in PLAN.md:
 * 1. Death saves at turn start for unconscious creatures
 * 2. Reaction windows skipped for unconscious creatures
 * 3. Instant death from massive damage at 0 HP
 */
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { battleMachine } from "#/battle-machine.ts";
import type { BattleEvent } from "#/battle-machine-types.ts";
import type { CreatureId as CreatureIdT } from "#/types.ts";
import { armorClass, CreatureId } from "#/types.ts";

function send(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  ...events: Array<BattleEvent>
) {
  for (const e of events) actor.send(e);
}

const DEFAULT_ATTACK_CONTEXT = {
  knockOut: false,
  isMelee: true,
  isFinesse: false,
  attackerWithin5ft: true,
  hostileWithin5ft: false,
  targetCanSeeAttacker: true,
  attackerCanSeeTarget: true,
  frightSourceInLOS: false,
  hasAllyAdjacentToTarget: false,
  saDmg: 0,
  hitReactionCandidates: new Set<CreatureIdT>(),
} as const;

function ctx(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  return actor.getSnapshot().context;
}

function creature(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  id: string,
) {
  return ctx(actor).creatures.get(CreatureId(id))!;
}

/** Standard 2-creature init: A (PC, 20hp) vs B (PC, 20hp), A goes first. */
function initTwoPC(): ReturnType<typeof createActor<typeof battleMachine>> {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC" },
      { id: CreatureId("B"), maxHp: 20, kind: "PC" },
    ],
  });
  return actor;
}

const ZERO_SOT: Pick<
  BattleEvent & { type: "BATTLE_START_TURN" },
  | "sotDmg"
  | "sotDt"
  | "sotHeal"
  | "sotSaveResult"
  | "sotConSave"
  | "rechargeD6"
  | "deathSaveRoll"
> = {
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "bludgeoning",
  sotHeal: 0,
  sotSaveResult: false,
  sotConSave: true,
  deathSaveRoll: 0,
};

const ZERO_EOT: Pick<
  BattleEvent & { type: "BATTLE_END_TURN" },
  "eotSaveSucceeded" | "eotDmg" | "eotDt" | "eotConSave"
> = {
  eotSaveSucceeded: false,
  eotDmg: 0,
  eotDt: "bludgeoning",
  eotConSave: true,
};

function startTurn(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  overrides?: Partial<BattleEvent & { type: "BATTLE_START_TURN" }>,
) {
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT, ...overrides });
}

function endTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, { type: "BATTLE_END_TURN", ...ZERO_EOT });
}

/** Pass through all pending reaction windows (pass on every reactor). */
function passReactions(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  for (let i = 0; i < 20; i++) {
    const aw = ctx(actor).awaitCtx;
    if (!aw) return;
    const pi = aw.interrupt;
    if (pi.tag === "PIAttackHit") {
      send(actor, {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: null,
        decision: { tag: "RPass" },
      });
    } else if (pi.tag === "PIAttackDamage") {
      send(actor, {
        type: "BATTLE_RESOLVE_DMG_REACTION",
        reactorId: null,
        decision: { tag: "RPass" },
      });
    } else if (pi.tag === "PIAfterDamage") {
      send(actor, { type: "BATTLE_AFTER_DAMAGE_DECLINE", reactorId: null });
    } else if (pi.tag === "PISaveFailed") {
      send(actor, {
        type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
        reactorId: null,
        decision: { tag: "RPass" },
      });
    }
  }
}

/** Attack creature B from A, passing all reactions. A must have started turn. */
function attackB(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  dmg: number,
  crit = false,
) {
  send(actor, {
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg,
    dt: "bludgeoning",
    crit,
    tAc: armorClass(10),
    ...DEFAULT_ATTACK_CONTEXT,
  });
  passReactions(actor);
}

/** Knock creature B to 0 HP via attack from A. A must have started turn. */
function knockOutB(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  attackB(actor, 25);
}

describe("Spec Gap 3: Instant death from massive damage at 0 HP", () => {
  it("kills outright when overflow >= maxHp (dropping to 0)", () => {
    const actor = initTwoPC();
    startTurn(actor);
    // B has 20hp, 20 maxHp. 40 damage = 20 overflow >= 20 maxHp => instant death
    attackB(actor, 40);
    expect(creature(actor, "B").dead).toBe(true);
    expect(creature(actor, "B").unconscious).toBe(false);
  });

  it("does NOT kill when overflow < maxHp (dropping to 0)", () => {
    const actor = initTwoPC();
    startTurn(actor);
    // B has 20hp, 20 maxHp. 30 damage = 10 overflow < 20 maxHp => unconscious, not dead
    attackB(actor, 30);
    expect(creature(actor, "B").dead).toBe(false);
    expect(creature(actor, "B").unconscious).toBe(true);
  });

  it("kills when damage at 0 HP >= maxHp", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    expect(creature(actor, "B").hp).toBe(0);
    expect(creature(actor, "B").unconscious).toBe(true);
    // Now hit B with 20+ damage at 0 HP => instant death
    attackB(actor, 20);
    expect(creature(actor, "B").dead).toBe(true);
  });

  it("adds death save failures when damage at 0 HP < maxHp", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    // Hit B with 5 damage at 0 HP < 20 maxHp.
    // Auto-crit (unconscious + within 5ft) => 2 death save failures per RAW.
    attackB(actor, 5);
    expect(creature(actor, "B").dead).toBe(false);
    expect(creature(actor, "B").deathSaves.failures).toBe(2);
  });
});

describe("Spec Gap 2: Reaction windows for unconscious creatures", () => {
  function initThreePC() {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 40, kind: "PC", fighterLevel: 5 },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          bardLevel: 3,
          bardicInspirationCharges: 3,
        },
        {
          id: CreatureId("C"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          preparedSpells: new Set(["shield"]),
        },
      ],
    });
    return actor;
  }

  it("conscious creature IS eligible for reaction", () => {
    const actor = initThreePC();
    startTurn(actor);
    // A attacks C. B is alive and conscious and is a valid Cutting Words reactor.
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("C"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "bludgeoning",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("B")]),
    });
    const aw = ctx(actor).awaitCtx;
    expect(aw).not.toBeNull();
    if (aw) {
      expect(aw.eligible.has(CreatureId("B"))).toBe(true);
    }
  });

  it("unconscious creature excluded from reaction eligibility", () => {
    const actor = initThreePC();
    startTurn(actor);
    // A knocks B unconscious (25 dmg > 20 hp), passing all reaction windows
    attackB(actor, 25);
    expect(creature(actor, "B").unconscious).toBe(true);

    // A attacks C with extra attack. C can still react with Shield, but B cannot
    // because unconscious creatures are excluded from the eligibility set.
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("C"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "bludgeoning",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("B")]),
    });
    const aw = ctx(actor).awaitCtx;
    // Attack hit => reaction window opens via C's Shield. B must NOT be eligible.
    expect(aw).not.toBeNull();
    if (aw) {
      expect(aw.eligible.has(CreatureId("B"))).toBe(false);
      // C (the target) is still eligible because Shield is legal here.
      expect(aw.eligible.has(CreatureId("C"))).toBe(true);
    }
  });
});

describe("Spec Gap 1: Death saves at turn start", () => {
  it("processes death save on nat 20 — creature regains 1 HP and consciousness", () => {
    const actor = initTwoPC();
    // A's turn: knock B unconscious
    startTurn(actor);
    knockOutB(actor);
    expect(creature(actor, "B").hp).toBe(0);
    expect(creature(actor, "B").unconscious).toBe(true);

    // End A's turn
    endTurn(actor);

    // B's turn starts with death save roll = 20 => regain 1 HP, remove unconscious
    startTurn(actor, { deathSaveRoll: 20 });
    expect(creature(actor, "B").hp).toBe(1);
    expect(creature(actor, "B").unconscious).toBe(false);
    expect(creature(actor, "B").deathSaves).toEqual({
      successes: 0,
      failures: 0,
    });
  });

  it("processes death save failure on low roll", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    endTurn(actor);

    // B's turn: death save roll = 5 => 1 failure
    startTurn(actor, { deathSaveRoll: 5 });
    expect(creature(actor, "B").deathSaves.failures).toBe(1);
    expect(creature(actor, "B").dead).toBe(false);
  });

  it("processes death save — nat 1 causes 2 failures", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    endTurn(actor);

    startTurn(actor, { deathSaveRoll: 1 });
    expect(creature(actor, "B").deathSaves.failures).toBe(2);
  });

  it("processes death save — 3 successes stabilize", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    endTurn(actor);

    // B rolls 15 (success)
    startTurn(actor, { deathSaveRoll: 15 });
    expect(creature(actor, "B").deathSaves.successes).toBe(1);
    endTurn(actor);

    // A's turn (pass through)
    startTurn(actor);
    endTurn(actor);

    // B rolls 12 (success)
    startTurn(actor, { deathSaveRoll: 12 });
    expect(creature(actor, "B").deathSaves.successes).toBe(2);
    endTurn(actor);

    startTurn(actor);
    endTurn(actor);

    // B rolls 10 (success) => 3 successes => stable
    startTurn(actor, { deathSaveRoll: 10 });
    expect(creature(actor, "B").stable).toBe(true);
    expect(creature(actor, "B").deathSaves).toEqual({
      successes: 0,
      failures: 0,
    });
  });

  it("skips death save if HP > 0", () => {
    const actor = initTwoPC();
    startTurn(actor);
    endTurn(actor);

    // B is alive (hp=20), death save roll provided but should be ignored
    startTurn(actor, { deathSaveRoll: 1 });
    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "B").deathSaves.failures).toBe(0);
  });

  it("skips death save if stable", () => {
    const actor = initTwoPC();
    startTurn(actor);
    knockOutB(actor);
    endTurn(actor);

    // Stabilize B via heal of 0 — actually let's just check the stabilize path.
    // B gets 3 successes across 3 turns to become stable
    startTurn(actor, { deathSaveRoll: 15 });
    endTurn(actor);
    startTurn(actor);
    endTurn(actor);
    startTurn(actor, { deathSaveRoll: 15 });
    endTurn(actor);
    startTurn(actor);
    endTurn(actor);
    startTurn(actor, { deathSaveRoll: 15 });
    expect(creature(actor, "B").stable).toBe(true);
    endTurn(actor);

    startTurn(actor);
    endTurn(actor);

    // B is stable at 0 HP — death save roll should be ignored
    const failsBefore = creature(actor, "B").deathSaves.failures;
    startTurn(actor, { deathSaveRoll: 1 });
    expect(creature(actor, "B").deathSaves.failures).toBe(failsBefore);
    expect(creature(actor, "B").stable).toBe(true);
  });
});
