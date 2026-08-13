// KERNEL-COVERAGE: parity-witness BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
import { resourceCount } from "@dnd/shared/types";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  spendAmmunitionForAcceptedAttack,
  spendAmmunitionForAcceptedAttackPendingContinuation,
} from "./battle-ammunition.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { BattleSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { snapshotBattle } from "./battle-execution-composition.ts";
import {
  attackRollFill,
  attackTargetFill,
  characterSeed,
  damageRollFill,
  readyTriggerDescriptionForTest,
  requireHole,
  skeletonId,
  skeletonCreatureInit,
  startBattleSessionRight,
  wizardId,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import {
  battleId,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
} from "./index.ts";

describe("ammunition lifecycle", () => {
  it("requires positive matching stock and spends an accepted attack exactly once across continuation", () => {
    const initial = wizardVsSkeletonBattle().state;
    const shortbow = attackActionOptionsForActor(initial, skeletonId).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow",
    );
    expect(shortbow).toBeDefined();
    if (
      shortbow?.kind !== "statBlockAttack" ||
      shortbow.damageNotation !== "rolled"
    ) {
      return;
    }

    const subject = {
      tag: "action" as const,
      actorId: skeletonId,
      action: "attack" as const,
      procedureRef: shortbow.procedureRef,
    };
    const pending = spendAmmunitionForAcceptedAttackPendingContinuation({
      state: initial,
      actorId: skeletonId,
      attack: shortbow,
      subject,
    });
    expect(pending.combatants.get(skeletonId)?.ammunitionStocks).toEqual([
      { ammunition: "arrow", remaining: resourceCount(19) },
    ]);
    expect(
      spendAmmunitionForAcceptedAttackPendingContinuation({
        state: pending,
        actorId: skeletonId,
        attack: shortbow,
        subject,
      }).combatants.get(skeletonId)?.ammunitionStocks,
    ).toEqual([{ ammunition: "arrow", remaining: resourceCount(19) }]);

    const completed = spendAmmunitionForAcceptedAttack({
      state: pending,
      actorId: skeletonId,
      attack: shortbow,
    });
    expect(completed.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    const completedActor = completed.combatants.get(skeletonId);
    expect(completedActor).toBeDefined();
    if (completedActor === undefined) return;
    const emptyActor = {
      ...completedActor,
      ammunitionStocks: [
        { ammunition: "arrow" as const, remaining: resourceCount(0) },
      ],
    };
    const empty = {
      ...completed,
      combatants: new Map(completed.combatants).set(skeletonId, emptyActor),
    };
    expect(
      attackActionOptionsForActor(empty, skeletonId).some(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.attack.ammunition === "arrow",
      ),
    ).toBe(false);

    const snapshot = Schema.decodeUnknownSync(BattleSnapshotSchema)(
      snapshotBattle(pending),
    );
    expect(
      snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      )?.ammunitionStocks,
    ).toEqual([{ ammunition: "arrow", remaining: resourceCount(19) }]);
  });

  it("spends on public miss and on public hit before damage continuation without double-spending", () => {
    const secondSkeletonId = combatantId("second-skeleton");
    const session = startBattleSessionRight({
      battleId: battleId("battle-ammunition-public-resolution"),
      combatants: [
        skeletonCreatureInit({ initiative: 20 }),
        {
          ...skeletonCreatureInit({ initiative: 15 }),
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
        },
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const shortbow = attackActionOptionsForActor(
      session.state,
      skeletonId,
    ).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow",
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const attackAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === skeletonId &&
        candidate.presentation.kind === "attack" &&
        candidate.presentation.procedureRef === shortbow.procedureRef,
    );
    expect(attackAct).toBeDefined();
    if (
      attackAct === undefined ||
      attackAct.subject.tag !== "action" ||
      attackAct.subject.action !== "attack"
    ) {
      return;
    }
    const targetRequest = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [],
    });
    const targetHole = requireHole(targetRequest, "targetChoice");
    const target = attackTargetFill(targetHole, skeletonId, wizardId);
    const rollRequest = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [target],
    });
    const attackRoll = requireHole(rollRequest, "attackRoll");

    const missed = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [target, attackRollFill(attackRoll, { total: 1, naturalD20: 1 })],
    });
    expect(missed.tag).toBe("resolved");
    if (missed.tag !== "resolved") return;
    expect(
      missed.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    expect(
      missed.state.combatants.get(secondSkeletonId)?.ammunitionStocks[0]
        ?.remaining,
    ).toBe(resourceCount(20));

    const hit = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [
        target,
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    });
    const damageHole = requireHole(hit, "rolledDice");
    expect(hit.tag).toBe("needsHoles");
    if (hit.tag !== "needsHoles") return;
    expect(
      hit.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    const completedHit = resolveBattleSubject({
      state: hit.state,
      subject: attackAct.subject,
      fills: [
        target,
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damageHole, 4),
      ],
    });
    expect(completedHit.tag).toBe("resolved");
    if (completedHit.tag !== "resolved") return;
    expect(
      completedHit.state.combatants.get(skeletonId)?.ammunitionStocks[0]
        ?.remaining,
    ).toBe(resourceCount(19));
  });

  it("spends readied reaction-attack ammunition exactly once across a damage continuation", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ammunition-reaction"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Target",
          initiative: 20,
          attack: null,
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const shortbow = attackActionOptionsForActor(
      session.state,
      skeletonId,
    ).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow" &&
        attack.damageNotation === "rolled",
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const state = {
      ...session.state,
      readiedResponses: new Map(session.state.readiedResponses).set(
        skeletonId,
        {
          trigger: readyTriggerDescriptionForTest("the synthetic target moves"),
          response: {
            kind: "attack" as const,
            selection: { procedureRef: shortbow.procedureRef },
          },
          expiresAt: { kind: "startOfTurn" as const, combatantId: skeletonId },
        },
      ),
    };
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: wizardId,
      command: "releaseReadiedAttack" as const,
      reactorId: skeletonId,
      targetId: wizardId,
      procedureRef: shortbow.procedureRef,
    };
    const rollRequest = resolveBattleSubject({
      state,
      subject,
      fills: [],
    });
    const roll = requireHole(rollRequest, "attackRoll");
    const hit = resolveBattleSubject({
      state,
      subject,
      fills: [attackRollFill(roll, { total: 20, naturalD20: 15 })],
    });
    const damage = requireHole(hit, "rolledDice");
    expect(hit.tag).toBe("needsHoles");
    if (hit.tag !== "needsHoles") return;
    expect(
      hit.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    const resolved = resolveBattleSubject({
      state: hit.state,
      subject,
      fills: [
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(
      resolved.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
  });
});
