import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV70B light
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-CONTINUAL-FLAME continual_flame
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE sorcerer_metamagic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-object-light
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-cast-range-increase
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { DISTANT_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "./character-battle-resources.ts";
import {
  continualFlameUnitId,
  lightUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellDistantObjectLightTargetFill,
  spellObjectLightTargetFill,
  spellTouchedObjectTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import type {
  BattleRuntimeSession,
  BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleObjectId,
  battlePerceptionRollModeForSight,
  battleSightObscurement,
  canSpendAction,
  cantripSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";

function distantMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function actWithDistantSpellMetamagic(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        lightUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "objectLight" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error("Expected Distant Light spell act.");
  }
  return act;
}

function sorceryPointsRemaining(state: BattleState): unknown {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    return undefined;
  }
  const resourcePoolRef = actor.origin.metamagic?.sorceryPointResourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.resourcePoolRef === resourcePoolRef &&
      characterBattleResourceIsPointPool(candidate),
  );
  return resource?.pointsRemaining;
}

describe("SRDINV70B deterministic object-light Spell Unit admission", () => {
  test("light is admitted as a Magic action cantrip object emitter", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });
    const procedureRef = act.subject.procedureRef;
    const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("unit-profile-light-object");

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef,
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "objectTargetChoice",
            label: "Spell object target",
            requiresTableSpatialFact: true,
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: targetHole,
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      },
      snapshot: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light to resolve.");
    }
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [],
    );
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [],
    );
  });

  test("continual flame is admitted as a Magic action spell slot object emitter", () => {
    const spell = spellRecord(continualFlameUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: continualFlameUnitId,
      slotLevel: 2,
    });
    const procedureRef = act.subject.procedureRef;
    const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("unit-profile-continual-flame-object");

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef,
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "objectTargetChoice",
            label: "Spell object target",
            requiresTableSpatialFact: true,
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellTouchedObjectTargetFill({
          hole: targetHole,
          objectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
            expiresAt: { kind: "untilDispelled" },
          },
        ],
      },
      snapshot: {
        turn: {
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Continual Flame to resolve.");
    }
    const emitter = resolved.snapshot.lightEmitters[0];
    if (emitter === undefined) {
      throw new Error("Expected Continual Flame emitter.");
    }
    expect(
      battleLightEmitterProjection(emitter, {
        kind: "object",
        objectId,
        distanceFeet: movementFeet(20),
        opaqueCover: false,
      }),
    ).toEqual({ emitter, illumination: "brightLight" });
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        {
          kind: "object",
          objectId,
          distanceFeet: movementFeet(40),
          opaqueCover: false,
        },
      ]),
    ).toBe("dimLight");
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [],
    );
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [],
    );
  });

  test("light object emitter illumination is derived with opaque-cover suppression", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });
    const objectId = battleObjectId("unit-profile-light-covered-object");
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light to resolve.");
    }
    const emitter = resolved.snapshot.lightEmitters[0];
    if (emitter === undefined) {
      throw new Error("Expected Light emitter.");
    }

    const brightFact = {
      kind: "object" as const,
      objectId,
      distanceFeet: movementFeet(20),
      opaqueCover: false,
    };
    const dimFact = {
      ...brightFact,
      distanceFeet: movementFeet(40),
    };
    const darkFact = {
      ...brightFact,
      distanceFeet: movementFeet(50),
    };
    const coveredFact = {
      ...brightFact,
      opaqueCover: true,
    };
    const otherObjectFact = {
      ...brightFact,
      objectId: battleObjectId("unit-profile-light-other-object"),
    };

    expect(battleLightEmitterProjection(emitter, brightFact)).toEqual({
      emitter,
      illumination: "brightLight",
    });
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        brightFact,
      ]),
    ).toBe("brightLight");
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        dimFact,
      ]),
    ).toBe("dimLight");
    expect(battleLightEmitterProjection(emitter, darkFact)).toBeNull();
    expect(battleLightEmitterProjection(emitter, otherObjectFact)).toBeNull();
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        darkFact,
      ]),
    ).toBe("darkness");
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        coveredFact,
      ]),
    ).toBe("darkness");
  });

  test("dim illumination projects Lightly Obscured sight unless Darkvision adjusts it", () => {
    expect(battleSightObscurement("brightLight")).toBe("unobscured");
    expect(battleSightObscurement("dimLight")).toBe("lightlyObscured");
    expect(battleSightObscurement("darkness")).toBe("heavilyObscured");
    expect(battlePerceptionRollModeForSight("dimLight")).toBe("disadvantage");
    expect(
      battleSightObscurement("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBe("unobscured");
    expect(
      battlePerceptionRollModeForSight("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBeUndefined();
    expect(
      battleSightObscurement("darkness", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBe("lightlyObscured");
    expect(
      battleSightObscurement("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(65),
      }),
    ).toBe("lightlyObscured");
  });

  test("light rejects objects larger than Large", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "huge",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test.each([
    { kind: "someoneElse" as const, relation: "worn" as const },
    { kind: "someoneElse" as const, relation: "carried" as const },
  ])("light rejects an object $relation by someone else", (wornOrCarried) => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          spellId: lightUnitId,
          casterId: spellCasterId,
          wornOrCarried,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("light recast replaces the caster's prior object emitter", () => {
    const spell = spellRecord(lightUnitId);
    const baseSession = spellBattle({ cantrips: [spell] });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      baseSession,
      spellCasterId,
      cantripSpellInvocationRef(lightUnitId, "objectLight"),
    );
    const state = {
      ...baseSession.state,
      lightEmitters: [
        {
          kind: "spellLightEmitter" as const,
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          attachment: {
            kind: "object" as const,
            objectId: battleObjectId("unit-profile-light-stale"),
          },
          emission: {
            kind: "brightAndDim" as const,
            brightRadiusFeet: movementFeet(20),
            dimAdditionalFeet: movementFeet(20),
          },
          opaqueCoverInteraction: { kind: "blocksEmission" as const },
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(1),
          },
        },
      ],
    };
    const act = spellAct({ session: baseSession, spellId: lightUnitId });
    const objectId = battleObjectId("unit-profile-light-recast");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          wornOrCarried: { kind: "caster" },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light recast to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(1);
  });

  test("distant light admits a 30-foot object target without changing light radii", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: 2 }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(2),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [distantMetamagicOption()],
      },
    });
    const act = spellAct({ session, spellId: lightUnitId });
    const distantAct = actWithDistantSpellMetamagic(session);
    const targetHole = requireHole(
      distantAct.initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("unit-profile-distant-light-object");

    expect(distantAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "actionSpell",
          actorId: spellCasterId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            spellCasterId,
            cantripSpellInvocationRef(lightUnitId, "objectLight"),
          ),
          metamagic: [{ effectKind: DISTANT_METAMAGIC_EFFECT_KIND }],
        }),
        label: "Light — Distant Spell",
      }),
    );
    expect(act.subject).not.toHaveProperty("metamagic");

    const fill = spellDistantObjectLightTargetFill({
      hole: targetHole,
      objectId,
      spellId: lightUnitId,
      casterId: spellCasterId,
      rangeFeet: movementFeet(30),
      size: "large",
    });
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: distantAct.subject,
      fills: [fill],
    });
    if (distantAct.subject.tag !== "actionSpell") {
      throw new Error("Expected Distant Light spell subject.");
    }

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: distantAct.subject.procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
          },
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Distant Light to resolve.");
    }
    expect(sorceryPointsRemaining(resolved.state)).toEqual(resourceCount(1));
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("distant light rejects a non-range-bearing object-light target fact before spending", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: 2 }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(1),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [distantMetamagicOption()],
      },
    });
    const distantAct = actWithDistantSpellMetamagic(session);
    const targetHole = requireHole(
      distantAct.initialHoles,
      "objectTargetChoice",
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: distantAct.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: targetHole,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(sorceryPointsRemaining(session.state)).toEqual(resourceCount(1));
  });

  test("continual flame does not replace the caster's prior continual flame emitter", () => {
    const spell = spellRecord(continualFlameUnitId);
    const priorObjectId = battleObjectId("unit-profile-continual-flame-prior");
    const nextObjectId = battleObjectId("unit-profile-continual-flame-next");
    const baseSession = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      baseSession,
      spellCasterId,
      spellSlotInvocationRef(continualFlameUnitId, 2, "objectLight"),
    );
    const state: BattleState = {
      ...baseSession.state,
      lightEmitters: [
        {
          kind: "spellLightEmitter",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          attachment: { kind: "object", objectId: priorObjectId },
          emission: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(20),
            dimAdditionalFeet: movementFeet(20),
          },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: { kind: "untilDispelled" },
        },
      ],
    };
    const act = spellAct({
      session: baseSession,
      spellId: continualFlameUnitId,
      slotLevel: 2,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTouchedObjectTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId: nextObjectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: expect.arrayContaining([
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId: priorObjectId },
          }),
          expect.objectContaining({
            sourceProcedureRef: act.subject.procedureRef,
            attachment: { kind: "object", objectId: nextObjectId },
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Continual Flame recast to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(2);
  });

  test("light object emitter expires on its timed duration", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      spellCasterId,
      cantripSpellInvocationRef(lightUnitId, "objectLight"),
    );
    const twoRoundsRemaining: BattleState = {
      ...session.state,
      lightEmitters: [
        {
          kind: "spellLightEmitter",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          attachment: {
            kind: "object",
            objectId: battleObjectId("unit-profile-light-expiring"),
          },
          emission: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(20),
            dimAdditionalFeet: movementFeet(20),
          },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(2),
          },
        },
      ],
    };

    const sameRound = resolveBattleSubject({
      state: twoRoundsRemaining,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (sameRound.tag !== "resolved") {
      throw new Error("Expected Light caster end turn to resolve.");
    }
    const oneRoundRemaining = resolveBattleSubject({
      state: sameRound.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(oneRoundRemaining).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      },
    });
    if (oneRoundRemaining.tag !== "resolved") {
      throw new Error("Expected Light emitter duration to tick.");
    }
    const finalCasterTurn = resolveBattleSubject({
      state: oneRoundRemaining.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (finalCasterTurn.tag !== "resolved") {
      throw new Error("Expected final Light caster turn to resolve.");
    }
    const expired = resolveBattleSubject({
      state: finalCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(expired).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
      snapshot: { lightEmitters: [] },
    });
  });

  test("continual flame object emitter remains until dispelled", () => {
    const spell = spellRecord(continualFlameUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      spellCasterId,
      spellSlotInvocationRef(continualFlameUnitId, 2, "objectLight"),
    );
    const objectId = battleObjectId("unit-profile-continual-flame-persistent");
    const ongoingFlame: BattleState = {
      ...session.state,
      lightEmitters: [
        {
          kind: "spellLightEmitter",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          attachment: { kind: "object", objectId },
          emission: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(20),
            dimAdditionalFeet: movementFeet(20),
          },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: { kind: "untilDispelled" },
        },
      ],
    };

    const sameRound = resolveBattleSubject({
      state: ongoingFlame,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (sameRound.tag !== "resolved") {
      throw new Error("Expected Continual Flame caster end turn to resolve.");
    }
    const nextRound = resolveBattleSubject({
      state: sameRound.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(nextRound).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
            expiresAt: { kind: "untilDispelled" },
          }),
        ],
      },
    });
  });
});
