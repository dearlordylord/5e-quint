// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME darkness
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-magical-darkness-point-origin
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { describe, expect, test } from "vitest";

import {
  battleMagicalDarknessNonmagicalLightIllumination,
  battleMagicalDarknessSightObscurement,
  type BattleAreaId,
  type BattleFill,
  type BattleHole,
  type BattleMagicalDarknessZone,
  type BattleObscurementZone,
  type BattleSpellAreaOriginAnchor,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleObscurementZones,
  breakBattleConcentration,
  characterSeed,
  discoverBattleActs,
  magicSubject,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  spellSlotInvocationRef,
  startBattleRight,
  statBlockCreatureInit,
  supportedSpellActs,
  tickDurationEffects,
  wizardId,
  wizardSpellcasting,
  type BattleState,
} from "./battle-runtime-test-support.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { darknessUnitId } from "./unit-profile-admission-catalog-support.ts";

const darknessDurationTicks = elapsedTimeTicks(100);

describe("battle runtime: Darkness", () => {
  test("Darkness admits only level-2-or-higher point-origin Sphere casts", () => {
    const state = darknessBattle("battle-darkness-admission", [
      { spellLevel: 1, count: 1 },
      { spellLevel: 2, count: 1 },
      { spellLevel: 3, count: 1 },
    ]);
    const levelOneAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.tag === "spellSlot" &&
        candidate.subject.invocation.spellId === darknessUnitId &&
        candidate.subject.invocation.slotLevel === 1,
    );
    expect(levelOneAct).toBeUndefined();

    const levelTwoAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.tag === "spellSlot" &&
        candidate.subject.invocation.spellId === darknessUnitId &&
        candidate.subject.invocation.slotLevel === 2 &&
        candidate.subject.invocation.procedure === "magicalDarknessPointOrigin",
    );
    if (levelTwoAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected level-2 Darkness action spell act.");
    }
    expect(levelTwoAct.subject.invocation).toEqual(
      spellSlotInvocationRef(darknessUnitId, 2, "magicalDarknessPointOrigin"),
    );
    expect(levelTwoAct?.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
      }),
    ]);

    const wizard = state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(wizard).find(
      (invocation) =>
        invocation.procedure === "magicalDarknessPointOrigin" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
      durationTicks: darknessDurationTicks,
      rangeFeet: movementFeet(60),
    });
  });

  test("Darkness creates a caster-owned magical Darkness zone", () => {
    const resolved = castDarkness(
      "battle-darkness-cast",
      battleAreaId("darkness-1"),
    );
    const caster = resolved.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "magicalDarknessPointOrigin",
        sourceSpellId: darknessUnitId,
        sourceCombatantId: wizardId,
        areaId: "darkness-1",
        radiusFeet: movementFeet(15),
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: darknessDurationTicks,
        },
      }),
    ]);
    expect(caster?.concentration).toMatchObject({
      sourceSpellId: darknessUnitId,
    });
    expect(resolved.state.currentTurnResources).toMatchObject({
      spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
    });
    expect(
      caster?.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots.find(
            (slot) => slot.spellLevel === 2,
          )?.expended
        : undefined,
    ).toBe(1);
    expect(resolved.snapshot.obscurementZones).toEqual([
      {
        kind: "spellMagicalDarknessZone",
        sourceSpellId: darknessUnitId,
        sourceCombatantId: wizardId,
        area: {
          kind: "pointOriginSphere",
          areaId: "darkness-1",
          radiusFeet: movementFeet(15),
        },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: darknessDurationTicks,
        },
      },
    ]);
  });

  test("Darkness projection blocks ordinary sight, Darkvision, and nonmagical light by witness fact", () => {
    const resolved = castDarkness(
      "battle-darkness-projection",
      battleAreaId("darkness-1"),
    );
    const zone = requireMagicalDarknessZone(resolved.snapshot.obscurementZones);
    const matchingSightFact = {
      kind: "sightThroughArea" as const,
      areaId: zone.area.areaId,
    };
    const matchingNonmagicalLightFact = {
      kind: "nonmagicalLightInArea" as const,
      areaId: zone.area.areaId,
    };
    const otherSightFact = {
      kind: "sightThroughArea" as const,
      areaId: battleAreaId("outside-darkness"),
    };
    const otherNonmagicalLightFact = {
      kind: "nonmagicalLightInArea" as const,
      areaId: battleAreaId("outside-darkness"),
    };

    expect(battleMagicalDarknessSightObscurement(zone, matchingSightFact)).toBe(
      "heavilyObscured",
    );
    expect(
      battleMagicalDarknessSightObscurement(zone, matchingSightFact, {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(30),
      }),
    ).toBe("heavilyObscured");
    expect(
      battleMagicalDarknessNonmagicalLightIllumination(
        zone,
        matchingNonmagicalLightFact,
      ),
    ).toBe("darkness");
    expect(
      battleMagicalDarknessSightObscurement(zone, otherSightFact),
    ).toBeNull();
    expect(
      battleMagicalDarknessNonmagicalLightIllumination(
        zone,
        otherNonmagicalLightFact,
      ),
    ).toBeNull();
  });

  test("Darkness cleanup follows Concentration and duration expiration", () => {
    const cast = castDarkness(
      "battle-darkness-cleanup",
      battleAreaId("darkness-1"),
    );
    const broken = breakBattleConcentration(cast.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const expiring = darknessWithDurationTicks(cast.state, elapsedTimeTicks(1));
    const expired = {
      ...expiring,
      combatants: tickDurationEffects(expiring.combatants).value,
    };
    expect(expired.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(expired.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(expired)).toEqual([]);
  });

  test("Darkness dispels overlapping level-2-or-lower tracked spell-created light", () => {
    const overlappingLevelTwoEffectId = battleSpellEffectOccurrenceId(
      "darkness-overlap-level-two-light",
    );
    const overlappingLevelThreeEffectId = battleSpellEffectOccurrenceId(
      "darkness-overlap-level-three-light",
    );
    const untrackedLevelTwo = trackedObjectSpellLightEmitter({
      sourceEffectId: battleSpellEffectOccurrenceId(
        "darkness-untracked-level-two-light",
      ),
      sourceSpellLevel: 2,
      objectId: "darkness-untracked-level-two-object",
    });
    const state = {
      ...darknessBattle("battle-darkness-light-overlap"),
      lightEmitters: [
        trackedObjectSpellLightEmitter({
          sourceEffectId: overlappingLevelTwoEffectId,
          sourceSpellLevel: 2,
          objectId: "darkness-overlap-level-two-object",
        }),
        trackedObjectSpellLightEmitter({
          sourceEffectId: overlappingLevelThreeEffectId,
          sourceSpellLevel: 3,
          objectId: "darkness-overlap-level-three-object",
        }),
        untrackedLevelTwo,
      ],
    };
    const subject = magicSubject(darknessUnitId);
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          magicalDarknessAreaFill(area, battleAreaId("darkness-overlap-area"), [
            {
              kind: "spellCreatedLightOverlapsArea",
              sourceEffectId: overlappingLevelTwoEffectId,
            },
          ]),
        ],
      }),
    );

    expect(resolved.state.lightEmitters).toEqual([
      expect.objectContaining({ sourceEffectId: overlappingLevelThreeEffectId }),
      untrackedLevelTwo,
    ]);
  });
});

function darknessBattle(
  battleIdValue: string,
  spellSlots: readonly {
    readonly spellLevel: 1 | 2 | 3;
    readonly count: number;
  }[] = [{ spellLevel: 2, count: 1 }],
): BattleState {
  return startBattleRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(darknessUnitId)],
          spellSlots,
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function castDarkness(
  battleIdValue: string,
  areaId: BattleAreaId,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const state = darknessBattle(battleIdValue);
  const subject = magicSubject(darknessUnitId);
  const area = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "spellAreaChoice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [magicalDarknessAreaFill(area, areaId)],
    }),
  );
}

function magicalDarknessAreaFill(
  hole: BattleHole,
  areaId: BattleAreaId,
  spellCreatedLightOverlaps: Extract<
    Extract<BattleFill, { readonly kind: "spellAreaChoice" }>["value"],
    { readonly kind: "magicalDarknessArea" }
  >["spellCreatedLightOverlaps"] = [],
  originAnchor: BattleSpellAreaOriginAnchor = { kind: "tableSelectedPoint" },
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  if (hole.kind !== "spellAreaChoice") {
    throw new Error("Expected spellAreaChoice hole.");
  }
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: {
      kind: "magicalDarknessArea",
      areaId,
      originAnchor,
      spellCreatedLightOverlaps,
    },
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
}): BattleTrackedOngoingSpellLightEmitter {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(`Invalid spell effect level ${input.sourceSpellLevel}.`);
  }
  return {
    kind: "spellLightEmitter",
    sourceSpellId: "synthetic_spell_light",
    sourceCombatantId: wizardId,
    sourceEffectId: input.sourceEffectId,
    sourceSpellLevel,
    attachment: {
      kind: "object",
      objectId: battleObjectId(input.objectId),
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function requireMagicalDarknessZone(
  zones: readonly BattleObscurementZone[],
): BattleMagicalDarknessZone {
  const zone = zones.find(
    (candidate): candidate is BattleMagicalDarknessZone =>
      candidate.kind === "spellMagicalDarknessZone",
  );
  if (zone === undefined) {
    throw new Error("Expected magical Darkness zone.");
  }
  return zone;
}

function darknessWithDurationTicks(
  state: BattleState,
  durationTicks: typeof darknessDurationTicks,
): BattleState {
  const caster = state.combatants.get(wizardId);
  if (caster === undefined) {
    throw new Error("Expected Wizard.");
  }
  const combatants = new Map(state.combatants);
  combatants.set(wizardId, {
    ...caster,
    activeEffects: caster.activeEffects.map((effect) =>
      effect.kind === "magicalDarknessPointOrigin"
        ? {
            ...effect,
            expiresAt: { ...effect.expiresAt, durationTicks },
          }
        : effect,
    ),
  });
  return { ...state, combatants };
}
