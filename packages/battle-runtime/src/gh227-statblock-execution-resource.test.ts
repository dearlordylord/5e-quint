import { statBlockId } from "@dnd/shared/game-facts";
import { abilityScoreToMod } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  battleId,
  battleRuntimeContextForStateForTest,
  battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest,
  characterSeed,
  damageRollFill,
  discoverBattleActs,
  distantFighterId,
  endTurn,
  fighterId,
  goblinId,
  monsterAttackSubject,
  monsterResourceStatBlock,
  monsterResourceStatBlockWithSharedResource,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";

function discoverStatBlockActs(state: BattleState) {
  return discoverBattleActs(
    battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    }),
  );
}

function discoveredAttackSubject(
  state: BattleState,
  summaryPart: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverStatBlockActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === goblinId &&
      candidate.summary.includes(summaryPart),
  );
  if (act?.subject.tag !== "action" || act.subject.action !== "attack") {
    throw new Error(`Expected a Stat Block ${summaryPart} attack.`);
  }
  return act.subject;
}

function resolveStatBlockAttack(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
  targetId: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >["actorId"],
): BattleState {
  const targetHole = attackInitialTargetHole(state, subject);
  const target = attackTargetFill(targetHole, subject.actorId, targetId);
  const rollHole = attackRollHoleAfterTarget(
    state,
    targetHole,
    subject,
    targetId,
  );
  const attackRoll = attackRollFill(rollHole, {
    total: 20,
    naturalD20: 12,
  });
  const beforeDamage = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (
    battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
      subject,
      "static",
    )
  ) {
    return requireResolved(beforeDamage).state;
  }
  const damageHole = requireHole(beforeDamage, "rolledDice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [target, attackRoll, damageRollFill(damageHole, 3)],
    }),
  ).state;
}

function statBlockTurn(state: BattleState): BattleState {
  return requireResolved(endTurn({ state, actorId: fighterId })).state;
}

describe("GH227 Stat Block execution coverage", () => {
  /*
   * RAW traceability (local corpus):
   * - `.references/srd-5.2.1/Monsters/Overview.md:188-200` says a monster's
   *   Proficiency Bonus is determined by CR and gives the 0–4 through 29–30
   *   bands.
   * - `.references/srd-5.2.1/Rules-Glossary.md:1066-1072` defines Unarmed
   *   Strike damage and its attack bonus as Strength modifier + PB.
   * - `.references/srd-5.2.1/Playing-the-Game.md:584-588` defines the public
   *   choose-target, determine-modifiers, and resolve-attack sequence.
   * - `.references/srd-5.2.1/Monsters/Overview.md:251-265` defines Legendary
   *   Actions and Recharge limited usage.
   */
  test("admits every challenge-rating proficiency boundary and resolves Unarmed Strike", () => {
    const proficiencyBands = [
      { challengeRating: 0, proficiencyBonus: 2 },
      { challengeRating: 4, proficiencyBonus: 2 },
      { challengeRating: 5, proficiencyBonus: 3 },
      { challengeRating: 8, proficiencyBonus: 3 },
      { challengeRating: 9, proficiencyBonus: 4 },
      { challengeRating: 12, proficiencyBonus: 4 },
      { challengeRating: 13, proficiencyBonus: 5 },
      { challengeRating: 16, proficiencyBonus: 5 },
      { challengeRating: 17, proficiencyBonus: 6 },
      { challengeRating: 20, proficiencyBonus: 6 },
      { challengeRating: 21, proficiencyBonus: 7 },
      { challengeRating: 24, proficiencyBonus: 7 },
      { challengeRating: 25, proficiencyBonus: 8 },
      { challengeRating: 28, proficiencyBonus: 8 },
      { challengeRating: 29, proficiencyBonus: 9 },
      { challengeRating: 30, proficiencyBonus: 9 },
    ] as const;
    const base = statBlockRecord();
    const strengthScore = 14;
    const strengthModifier = abilityScoreToMod(strengthScore);

    for (const [index, band] of proficiencyBands.entries()) {
      const displayName = `Synthetic Challenge Band ${band.challengeRating}`;
      const statBlock: StatBlockRecord = {
        ...base,
        id: statBlockId(`synthetic_challenge_band_${index}`),
        name: displayName,
        provenance: {
          kind: "synthetic-test",
          section: `gh227-stat-block-cr-boundary-${band.challengeRating}`,
        },
        challengeRating: band.challengeRating,
        statBlock: {
          ...base.statBlock,
          abilityScores: {
            ...base.statBlock.abilityScores,
            str: strengthScore,
          },
        },
      };
      const state = statBlockTurn(
        startBattleRight({
          battleId: battleId(`battle-gh227-cr-band-${index}`),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({ initiative: 10, statBlock }),
          ],
        }),
      );
      const subject = discoveredAttackSubject(state, "Unarmed Strike");
      const targetHole = attackInitialTargetHole(state, subject);
      const target = attackTargetFill(targetHole, goblinId, fighterId);
      const rollHole = attackRollHoleAfterTarget(
        state,
        targetHole,
        subject,
        fighterId,
      );
      if (rollHole.kind !== "attackRoll") {
        throw new Error("Expected the Unarmed Strike attack-roll hole.");
      }

      expect(rollHole.attackBonus).toBe(
        strengthModifier + band.proficiencyBonus,
      );
      const resolved = resolveStatBlockAttack(state, subject, fighterId);
      expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            target,
            attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          ],
        }).tag,
      ).toBe("resolved");
    }
  });

  test("resolves a recharge attack and rejects its stale replay", () => {
    const state = statBlockTurn(
      startBattleRight({
        battleId: battleId("battle-gh227-resource-attack"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({
            initiative: 10,
            statBlock: monsterResourceStatBlock(),
          }),
        ],
      }),
    );
    const subject = monsterAttackSubject(state, "Cinder Breath");
    const spent = resolveStatBlockAttack(state, subject, fighterId);
    const goblin = spent.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected the admitted Stat Block combatant.");
    }
    const cinderBinding = goblin.origin.execution.procedureBindings.find(
      (binding) => binding.procedureRef === subject.procedureRef,
    );
    if (cinderBinding === undefined) {
      throw new Error("Expected Cinder Breath procedure ownership.");
    }
    const cinderPoolRef = cinderBinding.resourcePoolRefs[0];
    if (cinderPoolRef === undefined) {
      throw new Error("Expected Cinder Breath recharge resource ownership.");
    }
    expect(
      goblin.origin.execution.resourcePools.find(
        (pool) => pool.resourcePoolRef === cinderPoolRef,
      ),
    ).toMatchObject({ kind: "recharge", available: false });
    expect(
      resolveBattleSubject({ state: spent, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("reuses a shared resource pool across procedure bindings", () => {
    const admission = statBlockCreatureInit({
      initiative: 10,
      statBlock: monsterResourceStatBlockWithSharedResource(),
    });
    const battle = startBattleRight({
      battleId: battleId("battle-gh227-shared-resource-pool"),
      combatants: [characterSeed({ initiative: 20 }), admission],
    });
    const goblin = battle.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected the admitted shared-resource Stat Block.");
    }
    const attackBindings = goblin.origin.execution.procedureBindings.filter(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.section === "actions",
    );
    const cinderBinding = attackBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.procedureOrdinal === 1,
    );
    const dreadBinding = attackBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.procedureOrdinal === 2,
    );
    if (cinderBinding === undefined || dreadBinding === undefined) {
      throw new Error("Expected both shared-resource attack bindings.");
    }
    expect(cinderBinding.resourcePoolRefs).toEqual(
      dreadBinding.resourcePoolRefs,
    );
    const sharedPoolRef = cinderBinding.resourcePoolRefs[0];
    if (sharedPoolRef === undefined) {
      throw new Error("Expected the shared resource pool reference.");
    }
    expect(
      goblin.origin.execution.resourcePools.filter(
        (pool) => pool.resourcePoolRef === sharedPoolRef,
      ),
    ).toHaveLength(1);
  });

  test("resolves a Legendary Action attack in the post-turn window", () => {
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-gh227-legendary-attack"),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: distantFighterId,
              displayName: "Distant Fighter",
              initiative: 15,
            }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = monsterAttackSubject(
      state,
      "Tail Swipe",
      "legendaryActions",
    );
    const spent = resolveStatBlockAttack(state, subject, fighterId);
    const goblin = spent.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected the admitted Legendary Action combatant.");
    }
    expect(
      goblin.origin.execution.resourcePools.find(
        (pool) => pool.kind === "legendaryActions",
      ),
    ).toMatchObject({ usesRemaining: 1 });
    expect(
      resolveBattleSubject({ state: spent, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});
