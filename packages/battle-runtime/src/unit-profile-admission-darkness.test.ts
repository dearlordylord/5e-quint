import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME darkness
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-magical-darkness-point-origin
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Round } from "@dnd/shared/types";
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
  findAct,
  magicSubject,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  supportedSpellActs,
  tickDurationEffects,
  wizardId,
  wizardSpellcasting,
  type BattleState,
  type BattleRuntimeSession,
} from "./battle-runtime.test-support.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { darknessUnitId } from "./unit-profile-admission-catalog.test-support.ts";

const darknessDurationTicks = elapsedTimeTicks(100);

describe("battle runtime: Darkness", () => {
  test("Darkness admits only level-2-or-higher point-origin Sphere casts", () => {
    const session = darknessBattle("battle-darkness-admission", [
      { spellLevel: 1, count: 1 },
      { spellLevel: 2, count: 1 },
      { spellLevel: 3, count: 1 },
    ]);
    const levelOneAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          darknessUnitId &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 1,
    );
    expect(levelOneAct).toBeUndefined();

    const levelTwoAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          darknessUnitId &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 2 &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "magicalDarknessPointOrigin",
    );
    if (levelTwoAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected level-2 Darkness action spell act.");
    }
    expect(battleActSpellPresentation(levelTwoAct)?.invocation).toEqual(
      spellSlotInvocationRef(darknessUnitId, 2, "magicalDarknessPointOrigin"),
    );
    expect(levelTwoAct?.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
      }),
    ]);

    const wizard = session.state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(session.state, wizard).find(
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
        sourceProcedureRef: expect.any(String),
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
      sourceProcedureRef: expect.any(String),
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
        sourceProcedureRef: expect.any(String),
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
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
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
    const baseSession = darknessBattle("battle-darkness-light-overlap");
    const state = {
      ...baseSession.state,
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
    const subject = findAct(
      battleRuntimeSessionForTest({ ...baseSession, state }),
      magicSubject(darknessUnitId),
    ).subject;
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
      expect.objectContaining({
        sourceEffectId: overlappingLevelThreeEffectId,
      }),
      untrackedLevelTwo,
    ]);
  });

  test("Darkness rejects unknown and over-level spell-light overlaps", () => {
    const unknownOverlapSession = darknessBattle(
      "battle-darkness-unknown-overlap",
    );
    const unknownSubject = findAct(
      unknownOverlapSession,
      magicSubject(darknessUnitId),
    ).subject;
    const unknownArea = requireHole(
      resolveBattleSubject({
        state: unknownOverlapSession.state,
        subject: unknownSubject,
        fills: [],
      }),
      "spellAreaChoice",
    );
    expect(
      resolveBattleSubject({
        state: unknownOverlapSession.state,
        subject: unknownSubject,
        fills: [
          magicalDarknessAreaFill(
            unknownArea,
            battleAreaId("darkness-unknown-overlap-area"),
            [
              {
                kind: "spellCreatedLightOverlapsArea",
                sourceEffectId: battleSpellEffectOccurrenceId(
                  "darkness-missing-light",
                ),
              },
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Darkness spell-light overlap must reference a tracked ongoing spell light.",
    });

    const overLevelSession = darknessBattle("battle-darkness-over-level");
    const overLevelEffectId = battleSpellEffectOccurrenceId(
      "darkness-over-level-light",
    );
    const overLevelState: BattleState = {
      ...overLevelSession.state,
      lightEmitters: [
        trackedObjectSpellLightEmitter({
          sourceEffectId: overLevelEffectId,
          sourceSpellLevel: 3,
          objectId: "darkness-over-level-object",
        }),
      ],
    };
    const overLevelSubject = findAct(
      battleRuntimeSessionForTest({
        ...overLevelSession,
        state: overLevelState,
      }),
      magicSubject(darknessUnitId),
    ).subject;
    const overLevelArea = requireHole(
      resolveBattleSubject({
        state: overLevelState,
        subject: overLevelSubject,
        fills: [],
      }),
      "spellAreaChoice",
    );
    expect(
      resolveBattleSubject({
        state: overLevelState,
        subject: overLevelSubject,
        fills: [
          magicalDarknessAreaFill(
            overLevelArea,
            battleAreaId("darkness-over-level-area"),
            [
              {
                kind: "spellCreatedLightOverlapsArea",
                sourceEffectId: overLevelEffectId,
              },
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Darkness can only dispel overlapping spell-created light at or below its supported spell level limit.",
    });
  });

  test("Darkness ignores non-tracked light emitters and rejects stale slot resources", () => {
    const session = darknessBattle("battle-darkness-untracked-light");
    const nonTrackedEmitter = {
      kind: "objectInvisibleRevealLightEmitter" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "darkness-untracked-emitter",
      ),
      sourceCombatantId: wizardId,
      objectId: battleObjectId("darkness-untracked-object"),
      emission: { kind: "dim" as const, radiusFeet: movementFeet(5) },
      expiresAt: {
        kind: "endOfTurn" as const,
        combatantId: wizardId,
        round: Round(1),
      },
    };
    const state: BattleState = {
      ...session.state,
      lightEmitters: [nonTrackedEmitter],
    };
    const subject = findAct(
      battleRuntimeSessionForTest({ ...session, state }),
      magicSubject(darknessUnitId),
    ).subject;
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );
    const areaFill = magicalDarknessAreaFill(
      area,
      battleAreaId("darkness-untracked-area"),
    );
    const cast = requireResolved(
      resolveBattleSubject({ state, subject, fills: [areaFill] }),
    );
    expect(cast.state.lightEmitters).toContainEqual(nonTrackedEmitter);

    const resetResourcesState: BattleState = {
      ...cast.state,
      currentTurnResources: session.state.currentTurnResources,
    };
    expect(
      resolveBattleSubject({
        state: resetResourcesState,
        subject,
        fills: [areaFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});

function darknessBattle(
  battleIdValue: string,
  spellSlots: readonly {
    readonly spellLevel: 1 | 2 | 3;
    readonly count: number;
  }[] = [{ spellLevel: 2, count: 1 }],
): BattleRuntimeSession {
  return startBattleSessionRight({
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
  const session = darknessBattle(battleIdValue);
  const subject = findAct(session, magicSubject(darknessUnitId)).subject;
  const area = requireHole(
    resolveBattleSubject({ state: session.state, subject, fills: [] }),
    "spellAreaChoice",
  );
  return requireResolved(
    resolveBattleSubject({
      state: session.state,
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
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String("synthetic_spell_light"),
    ),
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
