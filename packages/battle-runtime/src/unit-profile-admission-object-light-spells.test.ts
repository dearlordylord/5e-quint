// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV70B light
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-object-light
import { describe, expect, test } from "vitest";
import {
  lightUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellObjectLightTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleObjectId,
  battlePerceptionRollModeForSight,
  battleSightObscurement,
  canSpendAction,
  cantripSpellInvocationRef,
  elapsedTimeTicks,
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

describe("SRDINV70B deterministic object-light Spell Unit admission", () => {
  test("light is admitted as a Magic action cantrip object emitter", () => {
    const spell = spellRecord(lightUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({ state, spellId: lightUnitId });
    const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("unit-profile-light-object");

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "actionSpell",
          actorId: spellCasterId,
          invocation: cantripSpellInvocationRef(lightUnitId, "objectLight"),
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "objectTargetChoice",
            label: "Light object target",
            requiresTableSpatialFact: true,
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
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
            sourceSpellId: lightUnitId,
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
            sourceSpellId: lightUnitId,
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

  test("light object emitter illumination is derived with opaque-cover suppression", () => {
    const spell = spellRecord(lightUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({ state, spellId: lightUnitId });
    const objectId = battleObjectId("unit-profile-light-covered-object");
    const resolved = resolveBattleSubject({
      state,
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
    const coveredFact = {
      ...brightFact,
      opaqueCover: true,
    };

    expect(battleLightEmitterProjection(emitter, brightFact)).toEqual({
      emitter,
      illumination: "brightLight",
    });
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        dimFact,
      ]),
    ).toBe("dimLight");
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
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({ state, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state,
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
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({ state, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state,
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
    const state = {
      ...spellBattle({ cantrips: [spell] }),
      lightEmitters: [
        {
          kind: "spellLightEmitter" as const,
          sourceSpellId: lightUnitId,
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
    const act = spellAct({ state, spellId: lightUnitId });
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
            sourceSpellId: lightUnitId,
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

  test("light object emitter expires on its timed duration", () => {
    const spell = spellRecord(lightUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const oneRoundRemaining: BattleState = {
      ...state,
      lightEmitters: [
        {
          kind: "spellLightEmitter",
          sourceSpellId: lightUnitId,
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
            durationTicks: elapsedTimeTicks(1),
          },
        },
      ],
    };

    const sameRound = resolveBattleSubject({
      state: oneRoundRemaining,
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
      state: { lightEmitters: [] },
      snapshot: { lightEmitters: [] },
    });
  });
});
