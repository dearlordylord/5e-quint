import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import { statBlockId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { expect, it } from "vitest";
import { srdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import {
  startBattle,
  resolveBattleSubject,
  discoverBattleActs,
  combatantId,
  battleId,
  initiativeScore,
  battleTablePositionId,
} from "./index.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  statBlockCreatureInit,
  unitLibrary,
  endTurn,
} from "./battle-runtime.test-support.ts";
import {
  requireHole,
  requireResultHole,
  attackRollFill,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  spatialMeleeSpellAttackProxyPositionFill,
  spatialMeleeSpellAttackProxyTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";

it.each(["publishedBonus", "syntheticMagic"] as const)(
  "casts %s and repeats from its canonical live effect without another pool spend",
  (castingSection) => {
    const record = srdStatBlockCatalog
      .listStatBlocks()
      .find((entry) => entry.id === "stat_block_cultist_fanatic");
    if (record === undefined) throw new Error("Expected published caster.");
    const entry = record.statBlock.bonusActions?.[0];
    if (entry?.kind !== "executable" || entry.procedure.kind !== "spellcasting")
      throw new Error("Expected published spatial spellcasting.");
    const { bonusActions: _bonusActions, ...initialFacts } = record.statBlock;
    const source: StatBlockRecord =
      castingSection === "publishedBonus"
        ? record
        : {
            ...record,
            id: statBlockId("synthetic_spatial_magic_caster"),
            name: "Synthetic Spatial Magic Caster",
            provenance: {
              kind: "synthetic-test" as const,
              section: "effective initial action cost",
            },
            statBlock: {
              ...initialFacts,
              actions: [entry],
            },
          };
    const casterId = combatantId("published-spatial-caster");
    const targetId = combatantId("spatial-target");
    const started = startBattle({
      battleId: battleId("stat-block-spatial-repeat"),
      combatants: [
        {
          combatantId: casterId,
          statBlock: source,
          unitCatalog: unitLibrary,
          size: "medium",
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          conditions: [],
        },
        statBlockCreatureInit({ combatantId: targetId, initiative: 10 }),
      ],
    });
    if (Result.isFailure(started))
      throw new Error("Expected public Stat Block admission.");
    const admitted = started.success;
    const context = admitted.context;
    function discover(state: typeof admitted.state, repeat: boolean) {
      return discoverBattleActs(
        battleRuntimeSessionForTest({ state, context }),
      ).find(
        (act) =>
          act.subject.tag ===
            (repeat || castingSection === "publishedBonus"
              ? "bonusActionSpell"
              : "actionSpell") &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "spiritual_weapon" &&
          (battleActSpellPresentation(act)?.invocation.tag ===
            "spellEffect") ===
            repeat,
      );
    }
    function miss(state: typeof admitted.state, repeat: boolean) {
      const act = discover(state, repeat);
      if (act === undefined)
        throw new Error("Expected public spatial invocation.");
      const position = battleTablePositionId(
        repeat ? "moved-force" : "initial-force",
      );
      const forceFill = spatialMeleeSpellAttackProxyPositionFill({
        hole: requireHole(
          act.initialHoles,
          "spatialMeleeSpellAttackProxyPosition",
        ),
        positionId: position,
        ...(repeat ? { moveDistanceFeet: 20 } : {}),
      });
      const targetFill = spatialMeleeSpellAttackProxyTargetFill(
        requireHole(act.initialHoles, "targetChoice"),
        "spiritual_weapon",
        casterId,
        targetId,
        position,
      );
      const fills = [forceFill, targetFill];
      const attack = requireResultHole(
        resolveBattleSubject({ state, subject: act.subject, fills }),
        "attackRoll",
      );
      const resolved = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [...fills, attackRollFill(attack, { total: 3, naturalD20: 2 })],
      });
      if (resolved.tag !== "resolved")
        throw new Error("Expected spatial attack resolution.");
      return resolved.state;
    }
    if (castingSection === "syntheticMagic")
      expect(
        discoverBattleActs(
          battleRuntimeSessionForTest({ state: admitted.state, context }),
        ).some(
          (act) =>
            (act.subject.tag === "actionSpell" ||
              act.subject.tag === "bonusActionSpell") &&
            act.subject.mode.tag === "ready",
        ),
      ).toBe(false);
    const initialActor = admitted.state.combatants.get(casterId);
    if (initialActor?.origin.kind !== "statBlock")
      throw new Error("Expected initial Stat Block owner.");
    const initialPools = initialActor.origin.execution.resourcePools;
    const castState = miss(started.success.state, false);
    const caster = castState.combatants.get(casterId);
    if (caster?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block owner.");
    const effect = caster.activeEffects.find(
      (entry) => entry.kind === "spatialMeleeSpellAttackProxy",
    );
    expect(effect).toBeDefined();
    const poolsAfterInitial = caster.origin.execution.resourcePools;
    const changedPools = poolsAfterInitial.filter((pool) => {
      const initial = initialPools.find(
        (candidate) => candidate.resourcePoolRef === pool.resourcePoolRef,
      );
      return (
        pool.kind === "daily" &&
        initial?.kind === "daily" &&
        pool.usesRemaining !== initial.usesRemaining
      );
    });
    expect(changedPools).toHaveLength(1);
    expect(changedPools[0]).toMatchObject({
      kind: "daily",
      usesMax: 2,
      usesRemaining: 1,
    });
    expect(discover(castState, true)).toBeUndefined();
    const targetTurn = endTurn({ state: castState, actorId: casterId });
    if (targetTurn.tag !== "resolved")
      throw new Error("Expected caster turn end.");
    const casterTurn = endTurn({ state: targetTurn.state, actorId: targetId });
    if (casterTurn.tag !== "resolved")
      throw new Error("Expected target turn end.");
    const repeatState = miss(casterTurn.state, true);
    const repeatedCaster = repeatState.combatants.get(casterId);
    if (repeatedCaster?.origin.kind !== "statBlock")
      throw new Error("Expected retained Stat Block owner.");
    expect(repeatedCaster.origin.execution.resourcePools).toEqual(
      poolsAfterInitial,
    );
    expect(repeatState.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      repeatedCaster.activeEffects.find(
        (entry) => entry.kind === "spatialMeleeSpellAttackProxy",
      )?.sourceProcedureRef,
    ).toBe(effect?.sourceProcedureRef);
  },
);
