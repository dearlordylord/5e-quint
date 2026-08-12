import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "../battle-act-composition.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  deathSavingThrowFill,
  endTurn,
  fighterId,
  findAct,
  holeId,
  magicSubject,
  requireHole as requireBattleHole,
  requireResolved,
  resolveBattleSubject,
  skeletonCreatureInit,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import type { BattleResolutionInput } from "../battle-state-execution.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "../unit-profile-admission-spell-fill.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
} from "../unit-profile-admission-creature-fixture.test-support.ts";
import {
  cureWoundsUnitId,
  heroismUnitId,
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import {
  concentrationRouteForDiscoveredAct,
  concentrationRouteForResolution,
  deathSavingThrowRouteForResolution,
  hitPointRestorationRouteForDiscoveredAct,
  hitPointRestorationRouteForResolution,
  zeroHitPointStabilizationRouteForDiscoveredAct,
  zeroHitPointStabilizationRouteForResolution,
} from "./combatant-lifecycle-routes.ts";

function admitted(input: BattleResolutionInput) {
  const result = admitBattleResolutionInput(input);
  if (result.tag !== "admitted") {
    throw new Error("Expected a reachable admitted route input.");
  }
  return result.input;
}

describe("combatant lifecycle route boundary", () => {
  test("routes Spare the Dying through the zero-Hit-Point stabilization owner", () => {
    const downedAllyId = combatantId("stabilization-route-ally");
    const session = startBattleSessionRight({
      battleId: battleId("stabilization-route"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "cleric", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("spare_the_dying")],
            }),
            sourceClassName: "cleric",
          },
        }),
        characterSeed({
          combatantId: downedAllyId,
          displayName: "Downed Ally",
          initiative: 10,
          currentHp: 0,
        }),
      ],
    });
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "spare_the_dying",
    );
    if (act === undefined) {
      throw new Error("Expected Spare the Dying act.");
    }
    expect(
      zeroHitPointStabilizationRouteForDiscoveredAct(session.state, act),
    ).toEqual([
      expect.objectContaining({
        subject: "zeroHitPointStabilization",
        owner: "battleActionEconomy",
      }),
    ]);
    const target = requireHole(act.initialHoles, "targetChoice");
    const fill = targetFill(target, downedAllyId);
    const result = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [fill],
    });
    expect(result.tag).toBe("resolved");
    expect(
      zeroHitPointStabilizationRouteForResolution(
        { state: session.state, subject: act.subject, fills: [fill] },
        result,
      ),
    ).toEqual(
      expect.objectContaining({
        subject: "zeroHitPointStabilization",
        fill: "targetChoice",
        owner: "battleHitPointAndZeroHpLifecycle",
      }),
    );
  });

  test("routes death-saving-throw discovery and completion at End Turn", () => {
    const downedAllyId = combatantId("death-save-route-target");
    const state = startBattleRight({
      battleId: battleId("death-save-route"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
        }),
        characterSeed({
          combatantId: downedAllyId,
          displayName: "Downed Ally",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: fighterId,
      command: "endTurn" as const,
    };
    const needsRoll = endTurn({ state, actorId: fighterId });
    expect(
      deathSavingThrowRouteForResolution(
        { state, subject, fills: [] },
        needsRoll,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "deathSavingThrow",
        owner: "battleHitPointAndZeroHpLifecycle",
      }),
    ]);
    const hole = requireBattleHole(needsRoll, "deathSavingThrow");
    const fill = deathSavingThrowFill(hole, 10);
    const resolved = endTurn({ state, actorId: fighterId, fills: [fill] });
    expect(resolved.tag).toBe("resolved");
    expect(
      deathSavingThrowRouteForResolution(
        { state, subject, fills: [fill] },
        resolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "deathSavingThrow",
        fill: "deathSavingThrow",
        owner: "battleHitPointAndZeroHpLifecycle",
      }),
    ]);

    const mismatchedFill = {
      ...fill,
      holeId: holeId("mismatched-death-save-route-hole"),
    };
    const rejected = endTurn({
      state,
      actorId: fighterId,
      fills: [mismatchedFill],
    });
    expect(rejected).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      deathSavingThrowRouteForResolution(
        { state, subject, fills: [mismatchedFill] },
        rejected,
      ),
    ).toBeUndefined();
  });

  test("routes direct healing, Blur, and Heroism Concentration lifecycle owners", () => {
    const healingSession = spellBattle({
      preparedSpells: [spellRecord(cureWoundsUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetHp: 1,
      targetMaxHp: 10,
    });
    const healingAct = spellAct({
      session: healingSession,
      spellId: cureWoundsUnitId,
    });
    expect(
      hitPointRestorationRouteForDiscoveredAct(
        healingSession.state,
        healingAct,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "hitPointRestoration",
        owner: "battleSpellSlotAndActionEconomy",
      }),
    ]);
    const healingTargetHole = requireHole(
      healingAct.initialHoles,
      "targetChoice",
    );
    const healingTargetFill = spellTargetFill(
      healingTargetHole,
      cureWoundsUnitId,
      spellCasterId,
      spellTargetId,
    );
    const needsHealingRoll = resolveBattleSubject({
      state: healingSession.state,
      subject: healingAct.subject,
      fills: [healingTargetFill],
    });
    expect(
      hitPointRestorationRouteForResolution(
        {
          state: healingSession.state,
          subject: healingAct.subject,
          fills: [healingTargetFill],
        },
        needsHealingRoll,
      ),
    ).toEqual(
      expect.objectContaining({
        subject: "hitPointRestoration",
        fill: "targetChoice",
        owner: "battleHoleFrontier",
      }),
    );
    const healingRollHole = requireResultHole(needsHealingRoll, "rolledDice");
    const healingRoll = damageRollFillWithGroups(healingRollHole, [[4, 4]]);
    const healed = resolveBattleSubject({
      state: healingSession.state,
      subject: healingAct.subject,
      fills: [healingTargetFill, healingRoll],
    });
    expect(
      hitPointRestorationRouteForResolution(
        {
          state: healingSession.state,
          subject: healingAct.subject,
          fills: [healingTargetFill, healingRoll],
        },
        healed,
      ),
    ).toEqual(
      expect.objectContaining({
        subject: "hitPointRestoration",
        fill: "rolledDice",
        owner: "battleHitPointAndZeroHpLifecycle",
      }),
    );

    const blurSession = startBattleSessionRight({
      battleId: battleId("blur-concentration-route"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("blur")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const blurAct = findAct(blurSession, magicSubject("blur"));
    expect(
      concentrationRouteForDiscoveredAct(blurSession.state, blurAct),
    ).toEqual([
      expect.objectContaining({
        subject: "concentrationTeardown",
        owner: "battleSpellSlotAndActionEconomy",
      }),
    ]);
    const blurCast = resolveBattleSubject({
      state: blurSession.state,
      subject: blurAct.subject,
      fills: [],
    });
    expect(
      concentrationRouteForResolution(
        admitted({
          state: blurSession.state,
          subject: blurAct.subject,
          fills: [],
        }),
        blurCast,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleConcentration" }),
      ]),
    );

    const heroismSession = spellBattle({
      preparedSpells: [spellRecord(heroismUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const heroismAct = spellAct({
      session: heroismSession,
      spellId: heroismUnitId,
    });
    const heroismTargetHole = requireHole(
      heroismAct.initialHoles,
      "targetChoice",
    );
    const heroismTarget = spellTargetFill(
      heroismTargetHole,
      heroismUnitId,
      spellCasterId,
      spellCasterId,
    );
    const heroismCast = requireResolved(
      resolveBattleSubject({
        state: heroismSession.state,
        subject: heroismAct.subject,
        fills: [heroismTarget],
      }),
    );
    const endConcentrationSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellCasterId,
      command: "endConcentration" as const,
    };
    const endConcentration = resolveBattleSubject({
      state: heroismCast.state,
      subject: endConcentrationSubject,
      fills: [],
    });
    expect(
      concentrationRouteForResolution(
        admitted({
          state: heroismCast.state,
          subject: endConcentrationSubject,
          fills: [],
        }),
        endConcentration,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "conditionImmunityTemporaryHitPointEffect",
          owner: "battleConcentration",
        }),
        expect.objectContaining({
          subject: "conditionImmunityTemporaryHitPointEffect",
          owner: "battleActiveEffect",
        }),
      ]),
    );
  });
});
