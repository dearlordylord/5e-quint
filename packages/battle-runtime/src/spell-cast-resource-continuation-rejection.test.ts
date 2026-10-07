import { describe, expect, it } from "vitest";
import {
  longCastingBattle,
  longCastingActorId,
} from "./long-casting-lifecycle.test-support.ts";
import { supportedSpellActs } from "./battle-reducer/supported-spell-acts.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "./battle-reducer/spells-resolve-resources.ts";

function admittedLongCast() {
  const session = longCastingBattle();
  const actor = session.state.combatants.get(longCastingActorId);
  if (actor === undefined) throw new Error("Expected admitted caster.");
  const invocation = supportedSpellActs(session.state, actor).find(
    (candidate) => candidate.procedure === "scalarBuff",
  );
  if (invocation === undefined) throw new Error("Expected admitted long cast.");
  return { state: session.state, invocation };
}

describe("spell resource continuation rejection", () => {
  it("cannot pay or apply a long spell before casting progress is complete", () => {
    const { state, invocation } = admittedLongCast();
    const rejected = spendSpellCastResources({
      state,
      actorId: longCastingActorId,
      invocation,
      errorState: state,
    });
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The Stat Block spell has not completed its required casting time.",
    });
    expect(rejected.snapshot).toEqual(snapshotBattle(state));
  });
  it("does not recreate a removed caster while installing concentration", () => {
    const { state, invocation } = admittedLongCast();
    const combatants = new Map(state.combatants);
    combatants.delete(longCastingActorId);
    const removed = { ...state, combatants };
    expect(
      startSpellEffectConcentration(removed, longCastingActorId, invocation),
    ).toBe(removed);
  });
});
