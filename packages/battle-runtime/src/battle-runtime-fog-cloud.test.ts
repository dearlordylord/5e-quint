import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import {
  startBattleSessionRight,
  requireElapsedHours,
  requireResolved,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  fogCloudAreaFill,
  fogCloudBattle,
  characterSeed,
  statBlockCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  wizardId,
  battleAreaId,
  battleId,
  battleObscurementZones,
  breakBattleConcentration,
  castFogCloud,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  supportedSpellActs,
  requireHole,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Fog Cloud", () => {
  test("Fog Cloud admits caller-supplied fog area and slot-scaled radius", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-fog-cloud-admission"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("fog_cloud")],
            spellSlots: [
              { spellLevel: 1, count: 1 },
              { spellLevel: 3, count: 1 },
            ],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const levelOneAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "fog_cloud" &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 1 &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "fogCloudObscurement",
    );
    if (levelOneAct === undefined) {
      throw new Error("Expected level-1 Fog Cloud action spell act.");
    }
    expect(levelOneAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    ]);

    const wizard = session.state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(session.state, wizard).find(
      (invocation) =>
        invocation.procedure === "fogCloudObscurement" &&
        invocation.resource.tag === "spellSlot" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(60) },
      durationTicks: requireElapsedHours(1),
      rangeFeet: movementFeet(120),
    });
  });

  test("Fog Cloud creates a Concentration-owned Heavily Obscured area", () => {
    const initial = fogCloudBattle("battle-fog-cloud-initial");
    expect(initial.combatants.get(wizardId)?.activeEffects).toEqual([]);

    const cast = castFogCloud("battle-fog-cloud-cast", battleAreaId("fog-1"));
    const caster = cast.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "fogCloudObscurement",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        areaId: "fog-1",
        radiusFeet: movementFeet(20),
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      }),
    ]);
    expect(caster?.concentration).toMatchObject({
      sourceProcedureRef: expect.any(String),
    });
    expect(cast.snapshot.obscurementZones).toEqual([
      {
        kind: "spellObscurementZone",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: "fog-1",
          radiusFeet: movementFeet(20),
        },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      },
    ]);
    expect(expendedLevelOneSlots(cast, wizardId)).toBe(1);
  });

  test("Fog Cloud ends when Concentration breaks or strong wind disperses it", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-ends",
      battleAreaId("fog-1"),
    );
    const broken = breakBattleConcentration(cast.session.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const command = discoverBattleActs(cast.session).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "disperseFogCloud" &&
        candidate.subject.areaId === "fog-1",
    );
    if (command === undefined) {
      throw new Error("Expected Fog Cloud strong-wind dispersal command.");
    }
    const dispersed = requireResolved(
      resolveBattleSubject({
        state: cast.session.state,
        subject: command.subject,
        fills: [],
      }),
    );

    expect(dispersed.state.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(dispersed.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(dispersed.snapshot.obscurementZones).toEqual([]);
    expect(
      resolveBattleSubject({
        state: dispersed.state,
        subject: command.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Fog Cloud area is no longer active.",
    });
  });

  test("damage to zero Hit Points tears down Fog Cloud Concentration ownership", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-damage-teardown",
      battleAreaId("fog-1"),
    );
    const priorCaster = cast.session.state.combatants.get(wizardId);
    if (priorCaster?.concentration === null || priorCaster === undefined) {
      throw new Error("Expected the Fog Cloud caster to be concentrating.");
    }
    const damaged = applyBattleHitPointDamage({
      state: cast.session.state,
      target: priorCaster,
      damageAmount: Number(priorCaster.hp),
      deathFailuresAtZeroHp: 1,
    });

    expect(damaged.combatants.get(wizardId)).toMatchObject({
      hp: 0,
      concentration: null,
      activeEffects: [],
    });
    expect(battleObscurementZones(damaged)).toEqual([]);
  });

  test("Fog Cloud source zone does not impose attack-roll Disadvantage without a sight witness", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-no-implicit-sight",
      battleAreaId("fog-1"),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: cast.session.state, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = attackInitialTargetHole(goblinTurn, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn,
      target,
      subject,
      wizardId,
    );

    expect(cast.result.snapshot.obscurementZones).toHaveLength(1);
    expect(roll).not.toHaveProperty("rollMode");
  });
});

function castFogCloudSession(
  battleIdValue: string,
  areaId: ReturnType<typeof battleAreaId>,
) {
  const session = startBattleSessionRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("fog_cloud")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = magicSubject("fog_cloud");
  const area = requireHole(
    resolveBattleSubject({ session, subject, fills: [] }),
    "spellAreaChoice",
  );
  const result = requireResolved(
    resolveBattleSubject({
      session,
      subject,
      fills: [fogCloudAreaFill(area, areaId)],
    }),
  );
  return {
    result,
    session: battleRuntimeSessionForTest({ ...session, state: result.state }),
  };
}
