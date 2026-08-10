import { describe, expect, test } from "vitest";
import { Round } from "@dnd/shared/types";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  battleAfterFailedSleepInitialSave,
  battleAfterGoblinFailedSleepRepeatSave,
  battleProcedureExecutionRefForTest,
  battleId,
  characterSeed,
  damageRollFill,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  goblinTurnBattle,
  magicSubject,
  requireHole as requireBattleHole,
  resolveBattleSubject,
  requireResolved,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  wizardId,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import {
  rollModifierConcentrationBreakRouteForResolution,
  rollModifierRouteForDiscoveredAct,
  rollModifierRouteForResolution,
  scalarBuffRouteForDiscoveredAct,
  scalarBuffRouteForResolution,
  sleepRepeatSaveRouteForResolution,
  spellBaseArmorClassEffectTurnBoundaryRouteForResolution,
  spellDamageReductionRouteForDiscoveredAct,
  spellDamageReductionRouteForResolution,
  repeatSaveConditionEffectRouteForResolution,
  turnBoundaryEffectLifecycleRouteForResolution,
} from "./effect-lifecycle-routes.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  damageTypeChoiceFill,
  spellAct,
  spellTargetListFill,
  spellTargetFill,
} from "../unit-profile-admission-spell-fill.test-support.ts";
import { requireHole } from "../unit-profile-admission-creature-fixture.test-support.ts";
import {
  blessUnitId,
  baneUnitId,
  longstriderUnitId,
  resistanceUnitId,
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";

describe("effect lifecycle route boundary", () => {
  test("does not claim an ordinary weapon attack without a roll modifier effect", () => {
    const state = fighterVsGoblinBattle();

    expect(
      rollModifierRouteForDiscoveredAct(state, {
        subject: fighterAttackSubject(state),
        initialHoles: [],
      }),
    ).toBeUndefined();
  });

  test("routes roll-modifier casts and their Concentration teardown", () => {
    const blessSession = spellBattle({
      preparedSpells: [spellRecord(blessUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const blessAct = spellAct({
      session: blessSession,
      spellId: blessUnitId,
      slotLevel: 1,
    });
    const blessHole = requireHole(blessAct.initialHoles, "spellTargetList");
    const blessFill = spellTargetListFill(
      blessHole,
      spellCasterId,
      blessUnitId,
      [spellCasterId],
    );
    const blessResolved = resolveBattleSubject({
      state: blessSession.state,
      subject: blessAct.subject,
      fills: [blessFill],
    });
    expect(blessResolved.tag).toBe("resolved");
    expect(
      rollModifierRouteForDiscoveredAct(blessSession.state, blessAct),
    ).toMatchObject({ subject: "rollModifierEffect" });
    expect(
      rollModifierRouteForResolution(
        {
          state: blessSession.state,
          subject: blessAct.subject,
          fills: [blessFill],
        },
        blessResolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "rollModifierEffect",
        kind: "resolveBattleSubjectWithoutFill",
        owner: "battleActiveEffect",
      }),
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleConcentration",
      }),
    ]);

    if (blessResolved.tag !== "resolved") return;
    const endConcentrationSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellCasterId,
      command: "endConcentration" as const,
    };
    const endConcentration = resolveBattleSubject({
      state: blessResolved.state,
      subject: endConcentrationSubject,
      fills: [],
    });
    expect(
      rollModifierConcentrationBreakRouteForResolution(
        {
          state: blessResolved.state,
          subject: endConcentrationSubject,
          fills: [],
        },
        endConcentration,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleConcentration",
      }),
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleActiveEffect",
      }),
    ]);
  });

  test("routes save-gated roll modifiers, scalar buffs, and damage reduction", () => {
    const baneSession = spellBattle({
      preparedSpells: [spellRecord(baneUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const baneAct = spellAct({
      session: baneSession,
      spellId: baneUnitId,
      slotLevel: 1,
    });
    const baneTargetHole = requireHole(baneAct.initialHoles, "spellTargetList");
    const baneTargetFill = spellTargetListFill(
      baneTargetHole,
      spellCasterId,
      baneUnitId,
      [spellTargetId],
    );
    const baneNeedsSave = resolveBattleSubject({
      state: baneSession.state,
      subject: baneAct.subject,
      fills: [baneTargetFill],
    });
    expect(
      rollModifierRouteForResolution(
        {
          state: baneSession.state,
          subject: baneAct.subject,
          fills: [baneTargetFill],
        },
        baneNeedsSave,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "rollModifierEffect",
        holes: ["savingThrowOutcome"],
      }),
    ]);

    const scalarSession = spellBattle({
      preparedSpells: [spellRecord(longstriderUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const scalarAct = spellAct({
      session: scalarSession,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const scalarHole = requireHole(scalarAct.initialHoles, "targetChoice");
    const scalarFill = spellTargetFill(
      scalarHole,
      longstriderUnitId,
      spellCasterId,
      spellTargetId,
    );
    const scalarResolved = resolveBattleSubject({
      state: scalarSession.state,
      subject: scalarAct.subject,
      fills: [scalarFill],
    });
    expect(
      scalarBuffRouteForDiscoveredAct(scalarSession.state, scalarAct),
    ).toMatchObject({ subject: "scalarBuffEffect" });
    expect(
      scalarBuffRouteForResolution(
        {
          state: scalarSession.state,
          subject: scalarAct.subject,
          fills: [scalarFill],
        },
        scalarResolved,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleMovementResource" }),
      ]),
    );

    const resistanceSession = spellBattle({
      cantrips: [spellRecord(resistanceUnitId)],
      preparedSpells: [],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const resistanceAct = spellAct({
      session: resistanceSession,
      spellId: resistanceUnitId,
    });
    const resistanceTargetHole = requireHole(
      resistanceAct.initialHoles,
      "targetChoice",
    );
    const resistanceDamageHole = requireHole(
      resistanceAct.initialHoles,
      "damageTypeChoice",
    );
    const resistanceTargetFill = spellTargetFill(
      resistanceTargetHole,
      resistanceUnitId,
      spellCasterId,
      spellCasterId,
    );
    const resistanceNeedsType = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [resistanceTargetFill],
    });
    expect(
      spellDamageReductionRouteForDiscoveredAct(
        resistanceSession.state,
        resistanceAct,
      ),
    ).toMatchObject({ subject: "spellDamageReduction" });
    expect(
      spellDamageReductionRouteForResolution(
        {
          state: resistanceSession.state,
          subject: resistanceAct.subject,
          fills: [resistanceTargetFill],
        },
        resistanceNeedsType,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "spellDamageReduction",
        fill: "targetChoice",
        owner: "battleTargetSelection",
      }),
    ]);
    const resistanceTypeFill = damageTypeChoiceFill(
      resistanceDamageHole,
      "fire",
    );
    const resistanceResolved = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [resistanceTargetFill, resistanceTypeFill],
    });
    expect(
      spellDamageReductionRouteForResolution(
        {
          state: resistanceSession.state,
          subject: resistanceAct.subject,
          fills: [resistanceTargetFill, resistanceTypeFill],
        },
        resistanceResolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "spellDamageReduction",
        fill: "damageTypeChoice",
        owner: "battleActiveEffect",
      }),
      expect.objectContaining({
        subject: "spellDamageReduction",
        owner: "battleConcentration",
      }),
    ]);
  });

  test("routes Sleep repeat saves and Concentration teardown at the turn boundary", () => {
    const initialSleep = battleAfterFailedSleepInitialSave({
      battle: "effect-route-sleep-repeat-save",
      helperInitiative: 15,
    });
    const sleeping = requireResolved(
      endTurn({ state: initialSleep, actorId: fighterId }),
    ).state;
    const endTurnSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const needsSave = endTurn({ state: sleeping, actorId: goblinId });
    expect(
      sleepRepeatSaveRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [] },
        needsSave,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "repeatSaveConditionEffect",
        holes: ["savingThrowOutcome"],
      }),
    ]);
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [] },
        needsSave,
      ),
    ).toBeUndefined();

    const saveHole = requireBattleHole(needsSave, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);
    const repeated = endTurn({
      state: sleeping,
      actorId: goblinId,
      fills: [saveFill],
    });
    expect(repeated.tag).toBe("resolved");
    expect(
      sleepRepeatSaveRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [saveFill] },
        repeated,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleConditionLifecycle" }),
      ]),
    );
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [saveFill] },
        repeated,
      ),
    ).toBeUndefined();

    const endConcentrationSubject = {
      tag: "runtimeCommand" as const,
      actorId: wizardId,
      command: "endConcentration" as const,
    };
    const afterGoblinSleep = battleAfterGoblinFailedSleepRepeatSave({
      battle: "effect-route-sleep-concentration-break",
      helperInitiative: 5,
    });
    const wizardTurnWithSleep = requireResolved(
      endTurn({ state: afterGoblinSleep, actorId: fighterId }),
    ).state;
    const concentrationBreak = resolveBattleSubject({
      state: wizardTurnWithSleep,
      subject: endConcentrationSubject,
      fills: [],
    });
    expect(
      sleepRepeatSaveRouteForResolution(
        {
          state: wizardTurnWithSleep,
          subject: endConcentrationSubject,
          fills: [],
        },
        concentrationBreak,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleConcentration" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
      ]),
    );
  });

  test("routes turn-end damage and base armor expiration from resolved boundaries", () => {
    const base = goblinTurnBattle();
    const goblin = base.combatants.get(goblinId);
    if (goblin === undefined) throw new Error("Expected Goblin combatant.");
    const turnEndDamage: Extract<
      BattleActiveEffect,
      { readonly kind: "spellTurnEndDamage" }
    > = {
      kind: "spellTurnEndDamage",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "effect-route-turn-end-damage",
      ),
      sourceCombatantId: fighterId,
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
      expiresAt: {
        kind: "endOfTurn",
        combatantId: goblinId,
        round: Round(1),
      },
    };
    const withDamage = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        activeEffects: [...goblin.activeEffects, turnEndDamage],
      }),
    } satisfies BattleState;
    const endTurnSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const needsDamage = endTurn({ state: withDamage, actorId: goblinId });
    expect(
      turnBoundaryEffectLifecycleRouteForResolution(
        { state: withDamage, subject: endTurnSubject, fills: [] },
        needsDamage,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "turnBoundaryEffectLifecycle",
        holes: ["rolledDice"],
      }),
    ]);
    const damageHole = requireBattleHole(needsDamage, "rolledDice");
    const damageFill = damageRollFill(damageHole, 2);
    const resolved = endTurn({
      state: withDamage,
      actorId: goblinId,
      fills: [damageFill],
    });
    expect(
      turnBoundaryEffectLifecycleRouteForResolution(
        { state: withDamage, subject: endTurnSubject, fills: [damageFill] },
        resolved,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleHitPoint" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleTurnBoundary" }),
      ]),
    );

    const armorSession = startBattleSessionRight({
      battleId: battleId("effect-route-mage-armor-expiration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const armorAct = findAct(armorSession, magicSubject("mage_armor"));
    const armorTarget = requireHole(armorAct.initialHoles, "targetChoice");
    const armorCast = requireResolved(
      resolveBattleSubject({
        state: armorSession.state,
        subject: armorAct.subject,
        fills: [spellTargetFill(armorTarget, "mage_armor", wizardId, wizardId)],
      }),
    );
    const wizard = armorCast.state.combatants.get(wizardId);
    if (wizard === undefined) throw new Error("Expected armored Wizard.");
    const armorEffect = wizard.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellBaseArmorClass" }
      > & {
        readonly expiresAt: { readonly kind: "duration" };
      } =>
        effect.kind === "spellBaseArmorClass" &&
        effect.expiresAt.kind === "duration" &&
        effect.earlyEnds[0]?.kind === "targetDonsArmor",
    );
    if (armorEffect === undefined) {
      throw new Error("Expected duration Mage Armor effect.");
    }
    // The guard above proves the duration/target-dons-armor branch; keep
    // that correlated union while shortening only its duration for expiry.
    const shortenedArmorEffect = {
      ...armorEffect,
      expiresAt: {
        ...armorEffect.expiresAt,
        durationTicks: elapsedTimeTicks(1),
      },
    } as typeof armorEffect;
    const shortened = wizard.activeEffects.map((effect) =>
      effect === armorEffect ? shortenedArmorEffect : effect,
    );
    const nearlyExpired = {
      ...armorCast.state,
      combatants: new Map(armorCast.state.combatants).set(wizardId, {
        ...wizard,
        activeEffects: shortened,
      }),
    };
    const afterWizardTurn = requireResolved(
      endTurn({ state: nearlyExpired, actorId: wizardId }),
    ).state;
    const expired = endTurn({ state: afterWizardTurn, actorId: skeletonId });
    expect(
      spellBaseArmorClassEffectTurnBoundaryRouteForResolution(
        {
          state: afterWizardTurn,
          subject: {
            tag: "runtimeCommand",
            actorId: skeletonId,
            command: "endTurn",
          },
          fills: [],
        },
        expired,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleTurnBoundary" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleArmorClass" }),
      ]),
    );
  });
});
