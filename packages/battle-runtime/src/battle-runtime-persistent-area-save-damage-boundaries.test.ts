import { describe, expect, test } from "vitest";

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import {
  battleAreaId,
  cantripSpellInvocationRef,
  concentrationSavingThrowFill,
  damageRollFillWithGroups,
  endTurn,
  findHole,
  fogCloudAreaFill,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  cloudkillAreaFill,
  cloudkillAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  cloudkillAreaId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

const cloudkillBoundaryAreaId = cloudkillAreaId;
const fogCloudBoundaryAreaId = battleAreaId(
  "persistent-area-boundary-fog-cloud",
);

function castCloudkill(input: {
  readonly targetSpellcasting?: Parameters<typeof wizardSpellcasting>[0];
  readonly targetPreparedSpells?: readonly ReturnType<typeof spellRecord>[];
}) {
  const session = spellBattle({
    preparedSpells: [spellRecord("cloudkill")],
    spellSlots: [{ spellLevel: 5, count: 1 }],
    targetHp: 50,
    targetMaxHp: 50,
    ...(input.targetSpellcasting === undefined
      ? {}
      : { targetSpellcasting: wizardSpellcasting(input.targetSpellcasting) }),
    ...(input.targetPreparedSpells === undefined
      ? {}
      : { targetPreparedSpells: input.targetPreparedSpells }),
  });
  const act = spellAct({
    session,
    spellId: "cloudkill",
    slotLevel: 5,
  });
  const area = findHole(act.initialHoles, "spellAreaChoice");
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [cloudkillAreaFill(area, cloudkillBoundaryAreaId)],
    }),
  );
  return {
    act,
    cast,
    session: battleRuntimeSessionForTest({ ...session, state: cast.state }),
  };
}

function malformedAreaSaveFill(
  hole: Extract<
    ReturnType<typeof cloudkillAreaHazardSaveAct>["initialHoles"][number],
    { readonly kind: "savingThrowOutcome" }
  >,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
    },
  };
}

function malformedTargetSaveFill(
  hole: Extract<
    ReturnType<typeof cloudkillAreaHazardSaveAct>["initialHoles"][number],
    { readonly kind: "savingThrowOutcome" }
  >,
  outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

describe("persistent area save/damage public boundaries", () => {
  test("rejects parser-accepted area facts on a single-target Cloudkill save", () => {
    const { cast, session } = castCloudkill({});
    const saveAct = cloudkillAreaHazardSaveAct(
      session,
      spellTargetId,
      "appearsInArea",
    );
    const saveHole = findHole(saveAct.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: saveAct.subject,
        fills: [malformedAreaSaveFill(saveHole)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cloudkill Saving Throw outcome must not include area facts.",
    });
  });

  test.each([
    {
      name: "no outcomes",
      outcomes: [],
    },
    {
      name: "multiple outcomes",
      outcomes: [
        { targetId: spellTargetId, succeeded: false },
        { targetId: spellTargetId, succeeded: false },
      ],
    },
  ])(
    "rejects $name in a parser-accepted single-target Cloudkill save",
    ({ outcomes }) => {
      const { cast, session } = castCloudkill({});
      const saveAct = cloudkillAreaHazardSaveAct(
        session,
        spellTargetId,
        "appearsInArea",
      );
      const saveHole = findHole(saveAct.initialHoles, "savingThrowOutcome");

      expect(
        resolveBattleSubject({
          state: cast.state,
          subject: saveAct.subject,
          fills: [malformedTargetSaveFill(saveHole, outcomes)],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Cloudkill Saving Throw outcome must match the triggering target.",
      });
    },
  );

  test("opens the failed-save reaction window before Cloudkill damage", () => {
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const { cast, session } = castCloudkill({
      targetSpellcasting: {
        cantrips: [rayOfFrost],
        preparedSpells: [],
      },
    });
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const targetSession = battleRuntimeSessionForTest({
      ...session,
      state: targetTurn.state,
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      targetSession,
      spellTargetId,
      cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
    );
    const ready = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: {
          tag: "actionSpell",
          actorId: spellTargetId,
          procedureRef,
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        fills: [],
      }),
    );
    const readySession = battleRuntimeSessionForTest({
      ...targetSession,
      state: ready.state,
    });
    const saveAct = cloudkillAreaHazardSaveAct(
      readySession,
      spellTargetId,
      "endsTurnInArea",
    );
    const saveHole = findHole(saveAct.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: ready.state,
        subject: saveAct.subject,
        fills: [
          singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, false),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
  });

  test("exposes and consumes the Concentration frontier after Cloudkill damage", () => {
    const { cast, session } = castCloudkill({
      targetPreparedSpells: [spellRecord("fog_cloud")],
    });
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const targetSession = battleRuntimeSessionForTest({
      ...session,
      state: targetTurn.state,
    });
    const fogAct = spellAct({
      session: targetSession,
      spellId: "fog_cloud",
      slotLevel: 1,
    });
    const fogArea = findHole(fogAct.initialHoles, "spellAreaChoice");
    const fogCast = requireResolved(
      resolveBattleSubject({
        state: targetSession.state,
        subject: fogAct.subject,
        fills: [fogCloudAreaFill(fogArea, fogCloudBoundaryAreaId)],
      }),
    );
    const concentratedSession = battleRuntimeSessionForTest({
      ...targetSession,
      state: fogCast.state,
    });
    const saveAct = cloudkillAreaHazardSaveAct(
      concentratedSession,
      spellTargetId,
      "endsTurnInArea",
    );
    const saveHole = findHole(saveAct.initialHoles, "savingThrowOutcome");
    const saveFill = singleTargetSavingThrowOutcomeFill(
      saveHole,
      spellTargetId,
      false,
    );
    const damageRequest = resolveBattleSubject({
      state: fogCast.state,
      subject: saveAct.subject,
      fills: [saveFill],
    });
    const damageHole = requireHole(damageRequest, "rolledDice");
    const damageFill = damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]);
    const concentrationRequest = resolveBattleSubject({
      state: fogCast.state,
      subject: saveAct.subject,
      fills: [saveFill, damageFill],
    });
    const concentrationHole = requireHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );

    expect(concentrationRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "concentrationSavingThrow",
          combatantId: spellTargetId,
          dc: 10,
          damageAmount: 5,
        }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: fogCast.state,
        subject: saveAct.subject,
        fills: [
          saveFill,
          damageFill,
          concentrationSavingThrowFill(concentrationHole, true),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });
});
