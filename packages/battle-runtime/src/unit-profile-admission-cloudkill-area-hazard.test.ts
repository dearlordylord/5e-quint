import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-03-CLOUDKILL-AREA-HAZARD cloudkill
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import cloudkillInput from "../../surface/content/cloudkill.json";
import type { BattleActiveEffect } from "./index.ts";

import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { requireResolved } from "./battle-runtime.test-support.ts";
import { allocateBattleEffectExecutionRefForCreature } from "./effect-execution-ref.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  cloudkillAreaFill,
  cloudkillAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  cloudkillAreaId,
  cloudkillUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleObscurementZones,
  breakBattleConcentration,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type { BattleTranslatingPersistentAreaSaveDamageTrigger } from "./battle-state-execution.ts";
import { resolveTranslatingPersistentAreaAreaSaveDamage } from "./battle-reducer/persistent-area-save-damage.ts";

function castCloudkill() {
  const spell = cloudkillSpellRecord();
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 5, count: 1 }],
    targetHp: 30,
    targetMaxHp: 30,
  });
  const act = spellAct({
    session: state,
    spellId: cloudkillUnitId,
    slotLevel: 5,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [cloudkillAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(
      `Expected Cloudkill cast to resolve: ${JSON.stringify(cast)}`,
    );
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Cloudkill caster End Turn to resolve.");
  }
  return {
    spell,
    session: state,
    act,
    cast: cast.state,
    targetTurn: targetTurn.state,
  };
}

function cloudkillSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(cloudkillInput);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function resolveCloudkillSave(input: {
  readonly session: ReturnType<typeof castCloudkill>["session"];
  readonly state: ReturnType<typeof castCloudkill>["cast"];
  readonly succeeded: boolean;
  readonly trigger: BattleTranslatingPersistentAreaSaveDamageTrigger;
}) {
  const saveAct = cloudkillAreaHazardSaveAct(
    battleRuntimeSessionForTest({ ...input.session, state: input.state }),
    spellTargetId,
    input.trigger,
  );
  const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const pendingDamage = resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
    ],
  });
  if (pendingDamage.tag === "invalid") {
    throw new Error(
      `Expected Cloudkill save to request damage: ${JSON.stringify(pendingDamage)}`,
    );
  }
  expect(pendingDamage).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  const damageHole = requireResultHole(pendingDamage, "rolledDice");
  return resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
      damageRollFillWithGroups(damageHole, [[6, 6, 6, 6, 6]]),
    ],
  });
}

function cloudkillSavedThisTurn(
  state: ReturnType<typeof castCloudkill>["cast"],
) {
  type CloudkillEffect = Extract<
    BattleActiveEffect,
    {
      readonly kind: "persistentAreaSaveDamage";
      readonly lifecycle: "sourceTurnTranslation";
    }
  >;
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate): candidate is CloudkillEffect =>
      candidate.kind === "persistentAreaSaveDamage" &&
      candidate.lifecycle === "sourceTurnTranslation",
  );
  if (
    effect?.kind !== "persistentAreaSaveDamage" ||
    effect.lifecycle !== "sourceTurnTranslation"
  ) {
    throw new Error("Expected active Cloudkill area hazard.");
  }
  return effect.savedThisTurn;
}

describe("L19E deterministic Cloudkill area-hazard admission", () => {
  test("cloudkill is admitted as a ten-minute point-origin Sphere hazard", () => {
    const { session, act } = castCloudkill();

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "spellAreaChoice" })],
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        cloudkillUnitId,
        5,
        "persistentAreaSaveDamage",
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spell area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation(session, [area])).toEqual(
      expect.objectContaining({
        procedure: "persistentAreaSaveDamage",
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "con",
        targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
        durationTicks: elapsedTimeTicks(100),
        rangeFeet: movementFeet(120),
        damage: {
          expr: { dice: 5, dieSize: 8 },
          damageType: "poison",
        },
      }),
    );
  });

  test("cast projects a Heavily Obscured hazard and rejects replay after slot spend", () => {
    const { act, cast, session } = castCloudkill();

    expect(requireCombatant(cast, spellCasterId)).toMatchObject({
      concentration: {
        sourceProcedureRef: act.subject.procedureRef,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "persistentAreaSaveDamage",
          sourceProcedureRef: act.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          areaId: cloudkillAreaId,
          lifecycle: "sourceTurnTranslation",
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(100),
          },
        }),
      ],
    });
    expect(battleObscurementZones(cast)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: cloudkillAreaId,
          radiusFeet: movementFeet(20),
        },
      }),
    ]);
    expect(
      resolveBattleSubject({
        state: {
          ...cast,
          currentTurnResources: session.state.currentTurnResources,
        },
        subject: act.subject,
        fills: [
          cloudkillAreaFill(requireHole(act.initialHoles, "spellAreaChoice")),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Action-time spell act no longer has its required runtime spell resource.",
    });
  });

  test("appearance save applies full or half Poison damage through the active hazard", () => {
    const { cast, session } = castCloudkill();
    const failed = requireResolved(
      resolveCloudkillSave({
        session,
        state: cast,
        succeeded: false,
        trigger: "appearsInArea",
      }),
    );
    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(0) }),
        ]),
      },
    });
    expect(cloudkillSavedThisTurn(failed.state)).toEqual([spellTargetId]);

    const { cast: secondCast, session: secondSession } = castCloudkill();
    const succeeded = resolveCloudkillSave({
      session: secondSession,
      state: secondCast,
      succeeded: true,
      trigger: "appearsInArea",
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(15) }),
        ]),
      },
    });
  });

  test("appearance and later qualified saves share one per-turn hazard ledger", () => {
    const { cast, session } = castCloudkill();
    const appearanceSession = battleRuntimeSessionForTest({
      ...session,
      state: cast,
    });
    const appearanceAct = cloudkillAreaHazardSaveAct(
      appearanceSession,
      spellTargetId,
      "appearsInArea",
    );
    expect(cloudkillSavedThisTurn(cast)).toEqual([]);

    const saveHole = requireHole(
      appearanceAct.initialHoles,
      "savingThrowOutcome",
    );
    const pendingDamage = resolveBattleSubject({
      state: cast,
      subject: appearanceAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
      ],
    });
    if (pendingDamage.tag === "invalid") {
      throw new Error(
        `Expected Cloudkill appearance save to request damage: ${JSON.stringify(pendingDamage)}`,
      );
    }
    expect(cloudkillSavedThisTurn(pendingDamage.state)).toEqual([]);

    const appeared = requireResolved(
      resolveCloudkillSave({
        session,
        state: cast,
        succeeded: true,
        trigger: "appearsInArea",
      }),
    );
    expect(cloudkillSavedThisTurn(appeared.state)).toEqual([spellTargetId]);

    const entryAct = cloudkillAreaHazardSaveAct(
      battleRuntimeSessionForTest({ ...session, state: appeared.state }),
      spellTargetId,
      "entersArea",
    );
    const duplicate = resolveTranslatingPersistentAreaAreaSaveDamage({
      state: appeared.state,
      subject: entryAct.subject,
      fills: [],
    });
    expect(duplicate).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "translating persistent area save was already resolved for this target this turn.",
    });
    expect(cloudkillSavedThisTurn(appeared.state)).toEqual([spellTargetId]);

    const targetTurn = requireResolved(
      endTurn({ state: appeared.state, actorId: spellCasterId }),
    );
    expect(cloudkillSavedThisTurn(targetTurn.state)).toEqual([]);

    const entrySaved = requireResolved(
      resolveCloudkillSave({
        session,
        state: targetTurn.state,
        succeeded: true,
        trigger: "entersArea",
      }),
    );
    expect(cloudkillSavedThisTurn(entrySaved.state)).toEqual([spellTargetId]);
  });

  test("rejects a freshly fabricated appearance after the cast occurrence", () => {
    const { cast, session } = castCloudkill();
    const appeared = requireResolved(
      resolveCloudkillSave({
        session,
        state: cast,
        succeeded: true,
        trigger: "appearsInArea",
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: appeared.state, actorId: spellCasterId }),
    );
    const fabricatedAppearance = cloudkillAreaHazardSaveAct(
      battleRuntimeSessionForTest({ ...session, state: targetTurn.state }),
      spellTargetId,
      "appearsInArea",
    );

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: fabricatedAppearance.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "translating persistent area appearance save is outside its cast occurrence.",
    });
    expect(cloudkillSavedThisTurn(targetTurn.state)).toEqual([]);
  });

  test("a discovered save becomes stale when Cloudkill Concentration ends", () => {
    const { targetTurn, session } = castCloudkill();
    const saveAct = cloudkillAreaHazardSaveAct(
      battleRuntimeSessionForTest({ ...session, state: targetTurn }),
      spellTargetId,
      "endsTurnInArea",
    );

    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(targetTurn, spellCasterId),
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Persistent-area save damage is no longer available.",
    });
  });

  test("a discovered save becomes stale when its target leaves the battle state", () => {
    const { targetTurn, session } = castCloudkill();
    const saveAct = cloudkillAreaHazardSaveAct(
      battleRuntimeSessionForTest({ ...session, state: targetTurn }),
      spellTargetId,
      "endsTurnInArea",
    );
    const combatants = new Map(targetTurn.combatants);
    combatants.delete(spellTargetId);
    const stateWithoutTarget = { ...targetTurn, combatants };

    expect(
      resolveTranslatingPersistentAreaAreaSaveDamage({
        state: stateWithoutTarget,
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "translating persistent area save target is no longer available.",
    });
    expect(cloudkillSavedThisTurn(stateWithoutTarget)).toEqual([]);
  });

  test("binds a discovered save to the exact Cloudkill occurrence across same-area replacement", () => {
    const { targetTurn, session } = castCloudkill();
    const saveAct = cloudkillAreaHazardSaveAct(
      battleRuntimeSessionForTest({ ...session, state: targetTurn }),
      spellTargetId,
      "endsTurnInArea",
    );
    const caster = requireCombatant(targetTurn, spellCasterId);
    const effect = caster.activeEffects.find(
      (candidate) => candidate.kind === "persistentAreaSaveDamage",
    );
    if (
      effect?.kind !== "persistentAreaSaveDamage" ||
      effect.lifecycle !== "sourceTurnTranslation"
    ) {
      throw new Error("Expected active Cloudkill.");
    }
    const allocation = allocateBattleEffectExecutionRefForCreature({
      owner: caster,
    });
    const replacement = {
      ...effect,
      effectRef: allocation.effectRef,
    };
    const replacedState = {
      ...targetTurn,
      combatants: new Map(targetTurn.combatants).set(spellCasterId, {
        ...allocation.owner,
        activeEffects: allocation.owner.activeEffects.map((candidate) =>
          candidate === effect ? replacement : candidate,
        ),
      }),
    };

    expect(
      resolveBattleSubject({
        state: replacedState,
        subject: saveAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("marks the exact relocated Cloudkill owner once even when owner differs from source", () => {
    const { targetTurn } = castCloudkill();
    const caster = requireCombatant(targetTurn, spellCasterId);
    const target = requireCombatant(targetTurn, spellTargetId);
    const effect = caster.activeEffects.find(
      (candidate) => candidate.kind === "persistentAreaSaveDamage",
    );
    if (effect?.kind !== "persistentAreaSaveDamage") {
      throw new Error("Expected active Cloudkill.");
    }
    const allocation = allocateBattleEffectExecutionRefForCreature({
      owner: target,
    });
    const relocatedEffect = {
      ...effect,
      effectRef: allocation.effectRef,
    };
    const relocatedState = {
      ...targetTurn,
      combatants: new Map(targetTurn.combatants).set(spellTargetId, {
        ...allocation.owner,
        activeEffects: [...allocation.owner.activeEffects, relocatedEffect],
      }),
    };
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "persistentAreaSaveDamageSave" as const,
      areaMembershipTrigger: {
        kind: "turnEndInArea" as const,
        areaId: relocatedEffect.areaId,
        effectRef: relocatedEffect.effectRef,
      },
    };
    const saveFrontier = resolveBattleSubject({
      state: relocatedState,
      subject,
      fills: [],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      true,
    );
    const damageFrontier = resolveBattleSubject({
      state: relocatedState,
      subject,
      fills: [saveFill],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[6, 6, 6, 6, 6]],
    );
    const resolved = resolveBattleSubject({
      state: relocatedState,
      subject,
      fills: [saveFill, damageFill],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects.find(
        (candidate) =>
          candidate.kind === "persistentAreaSaveDamage" &&
          candidate.effectRef === relocatedEffect.effectRef,
      ),
    ).toMatchObject({ savedThisTurn: [spellTargetId] });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects.find(
        (candidate) =>
          candidate.kind === "persistentAreaSaveDamage" &&
          candidate.effectRef === effect.effectRef,
      ),
    ).toMatchObject({ savedThisTurn: [] });
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});
