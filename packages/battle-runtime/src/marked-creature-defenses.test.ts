// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.marked-creature-defenses
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// RAW: .references/srd-5.2.1/classes.md:6813-6816.
import { describe, expect, test } from "vitest";
import {
  markedSession,
  characterTargetId,
  markedDefenseEffectLifetime,
} from "./marked-creature-defenses.test-support.ts";
import { conditionApplicationPreventedByConditionImmunity } from "./battle-reducer/spell-condition-effects-helpers.ts";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { discloseMarkedCreatureDefenses } from "./marked-creature-defenses.ts";
import {
  fighterId,
  goblinId,
  skeletonId,
  tickDurationEffects,
  elapsedTimeTicks,
} from "./battle-runtime.test-support.ts";

describe("marked creature defense disclosure", () => {
  test("current target resistance follows its canonical effect and expiry while its own mark remains", () => {
    const { defended, expired } = markedDefenseEffectLifetime();
    const target = defended.state.combatants.get(skeletonId);
    if (target === undefined) throw new Error("Expected marked prey.");
    expect(
      discloseMarkedCreatureDefenses({
        session: defended,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toMatchObject({ kind: "disclosed", defenses: { resistances: ["fire"] } });
    expect(
      damageAmountAfterTargetAdjustments(defended.state, target, 10, "fire"),
    ).toBe(5);
    expect(
      discloseMarkedCreatureDefenses({
        session: defended,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toMatchObject({
      kind: "disclosed",
      defenses: {
        immunities: { conditions: ["exhaustion", "poisoned", "charmed"] },
      },
    });
    expect(
      conditionApplicationPreventedByConditionImmunity(target, "charmed"),
    ).toBe(true);
    const afterExpiry = expired.state.combatants.get(skeletonId);
    if (afterExpiry === undefined)
      throw new Error("Expected retained marked prey.");
    expect(
      discloseMarkedCreatureDefenses({
        session: expired,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toMatchObject({ kind: "disclosed", defenses: { resistances: [] } });
    expect(
      damageAmountAfterTargetAdjustments(
        expired.state,
        afterExpiry,
        10,
        "fire",
      ),
    ).toBe(10);
    expect(
      discloseMarkedCreatureDefenses({
        session: expired,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toMatchObject({
      kind: "disclosed",
      defenses: { immunities: { conditions: ["exhaustion", "poisoned"] } },
    });
    expect(
      conditionApplicationPreventedByConditionImmunity(afterExpiry, "charmed"),
    ).toBe(false);
  });
  test("distinguishes a marked creature with no defenses from unavailable character defenses", () => {
    expect(
      discloseMarkedCreatureDefenses({
        session: markedSession(true, goblinId),
        actorId: fighterId,
        targetId: goblinId,
      }),
    ).toEqual({
      kind: "disclosed",
      defenses: {
        immunities: { damageTypes: [], conditions: [] },
        resistances: [],
        vulnerabilities: [],
      },
    });
    expect(
      discloseMarkedCreatureDefenses({
        session: markedSession(true, characterTargetId),
        actorId: fighterId,
        targetId: characterTargetId,
      }),
    ).toEqual({ kind: "unavailable", reason: "creatureDefensesUnavailable" });
    expect(
      discloseMarkedCreatureDefenses({
        session: markedSession(true, skeletonId, true),
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toEqual({
      kind: "disclosed",
      defenses: {
        immunities: { damageTypes: [], conditions: [] },
        resistances: ["slashing"],
        vulnerabilities: [],
      },
    });
  });
  test("derives defenses only for the caster's currently marked prey", () => {
    const session = markedSession();
    const target = session.state.combatants.get(skeletonId);
    if (target?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block prey.");
    expect(
      discloseMarkedCreatureDefenses({
        session,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toEqual({
      kind: "disclosed",
      defenses: {
        immunities: target.origin.mechanics.immunities,
        resistances: target.origin.mechanics.resistances,
        vulnerabilities: target.origin.mechanics.vulnerabilities,
      },
    });
    expect(
      discloseMarkedCreatureDefenses({
        session,
        actorId: fighterId,
        targetId: goblinId,
      }),
    ).toEqual({ kind: "ineligible", reason: "targetNotMarked" });
    expect(
      discloseMarkedCreatureDefenses({
        session: markedSession(false),
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toEqual({ kind: "ineligible", reason: "featureMissing" });
    const expired = battleRuntimeSessionForTest({
      state: {
        ...session.state,
        combatants: tickDurationEffects(
          new Map(
            [...session.state.combatants].map(([id, actor]) => [
              id,
              {
                ...actor,
                activeEffects: actor.activeEffects.map((effect) =>
                  effect.kind === "spellMarkedDamageRider" &&
                  effect.expiresAt.kind === "concentration"
                    ? {
                        ...effect,
                        expiresAt: {
                          ...effect.expiresAt,
                          durationTicks: elapsedTimeTicks(1),
                        },
                      }
                    : effect,
                ),
              },
            ]),
          ),
        ).value,
      },
      context: session.context,
    });
    expect(
      discloseMarkedCreatureDefenses({
        session: expired,
        actorId: fighterId,
        targetId: skeletonId,
      }),
    ).toEqual({ kind: "ineligible", reason: "targetNotMarked" });
  });
});
