import {
  startBattleRight,
  requireElapsedHours,
  requireResolved,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  requireHole,
  fogCloudBattle,
  castFogCloud,
  fogCloudAreaFill,
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
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  supportedSpellActs,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Fog Cloud", () => {
  test("Fog Cloud admits caller-supplied fog area and slot-scaled radius", () => {
    const state = startBattleRight({
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

    const levelOneAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.tag === "spellSlot" &&
        candidate.subject.invocation.spellId === "fog_cloud" &&
        candidate.subject.invocation.slotLevel === 1 &&
        candidate.subject.invocation.procedure === "fogCloudObscurement",
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

    const wizard = state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(wizard).find(
      (invocation) =>
        invocation.procedure === "fogCloudObscurement" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(60) },
      durationTicks: requireElapsedHours(1),
      rangeFeet: movementFeet(120),
    });
  });

  test("Fog Cloud creates a Concentration-owned Heavily Obscured area", () => {
    const state = fogCloudBattle("battle-fog-cloud-cast");
    const subject = magicSubject("fog_cloud");
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [fogCloudAreaFill(area, battleAreaId("fog-1"))],
      }),
    );
    const caster = resolved.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "fogCloudObscurement",
        sourceSpellId: "fog_cloud",
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
      sourceSpellId: "fog_cloud",
    });
    expect(resolved.snapshot.obscurementZones).toEqual([
      {
        kind: "spellObscurementZone",
        sourceSpellId: "fog_cloud",
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
    expect(expendedLevelOneSlots(resolved, wizardId)).toBe(1);
  });

  test("Fog Cloud ends when Concentration breaks or strong wind disperses it", () => {
    const cast = castFogCloud("battle-fog-cloud-ends", battleAreaId("fog-1"));
    const broken = breakBattleConcentration(cast.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const command = discoverBattleActs(cast.state).find(
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
        state: cast.state,
        subject: command.subject,
        fills: [],
      }),
    );

    expect(dispersed.state.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(dispersed.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(dispersed.snapshot.obscurementZones).toEqual([]);
  });

  test("Fog Cloud source zone does not impose attack-roll Disadvantage without a sight witness", () => {
    const cast = castFogCloud("battle-fog-cloud-no-implicit-sight", battleAreaId("fog-1"));
    const goblinTurn = requireResolved(
      endTurn({ state: cast.state, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject("Scimitar");
    const target = attackInitialTargetHole(goblinTurn, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn,
      target,
      subject,
      wizardId,
    );

    expect(cast.snapshot.obscurementZones).toHaveLength(1);
    expect(roll).not.toHaveProperty("rollMode");
  });
});
