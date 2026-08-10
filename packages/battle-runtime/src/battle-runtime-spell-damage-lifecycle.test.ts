import { describe, expect, test } from "vitest";

import type {
  AvailableBattleAct,
  BattleActiveEffect,
  BattleFill,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import {
  battleActiveEffectExecutionRefForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  damageRollFillWithGroups,
  elapsedTimeTicks,
  endTurn,
  expendedLevelOneSlots,
  findAct,
  Hp,
  requireHole,
  requireCharacterSpellProcedureRefForTest,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardId,
  wizardSpellcasting,
  wizardVsSkeletonBattle,
  attackDamageDispositionFill,
  fighterId,
  unitLibrary,
} from "./battle-runtime.test-support.ts";

const magicMissileInvocation = spellSlotInvocationRef(
  "magic_missile",
  1,
  "repeatedDamageAllocation",
);

function readiedSpellProcedureRef(state: BattleState) {
  const readied = state.readiedSpells.get(wizardId);
  if (readied === undefined) {
    throw new Error("Expected the Wizard to hold a readied spell.");
  }
  return readied.procedureRef;
}

type MagicMissileAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

function magicMissileAct(session: BattleRuntimeSession): MagicMissileAct {
  const act = findAct(session, {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: magicMissileInvocation,
    mode: { tag: "cast" },
  });
  if (act.subject.tag !== "actionSpell") {
    throw new Error("Expected an action spell act.");
  }
  return { ...act, subject: act.subject };
}

function magicMissileFills(
  state: BattleState,
  subject: BattleSubject,
  targetId = skeletonId,
): readonly [BattleFill, BattleFill] {
  const allocationHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "spellTargetAllocation",
  );
  const allocationFill = spellTargetAllocationFill(allocationHole, [
    { targetId, count: 3 },
  ]);
  const damageHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [allocationFill] }),
    "rolledDice",
  );
  return [allocationFill, damageRollFillWithGroups(damageHole, [[3, 3, 3]])];
}

describe("battle runtime: spell damage lifecycle replay", () => {
  test("prepared slot damage requests concentration, zero-HP, and relationship holes in order", () => {
    const charmSourceId = combatantId("spell-damage-charm-source");
    const baseSession = startBattleSessionRight({
      battleId: battleId("battle-spell-damage-lifecycle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Orc Target",
          initiative: 10,
          attack: null,
          currentHp: 1,
          maxHp: 12,
          resources: [
            { unit: unitLibrary.requireUnit("orc_relentless_endurance") },
          ],
        }),
        characterSeed({
          combatantId: charmSourceId,
          displayName: "Charm Source",
          initiative: 5,
          attack: null,
        }),
      ],
    });
    const target = baseSession.state.combatants.get(fighterId);
    if (target === undefined) {
      throw new Error("Expected the Orc target.");
    }
    const relationshipEffect = {
      kind: "spellCondition" as const,
      effectRef: battleActiveEffectExecutionRefForTest(
        "spell-damage-relationship-condition",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "spell-damage-relationship-source",
      ),
      sourceCombatantId: charmSourceId,
      condition: "charmed" as const,
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" as const },
      turnStartDamage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const concentrationSourceProcedureRef = battleProcedureExecutionRefForTest(
      "spell-damage-concentration-source",
    );
    const concentrationEffect = {
      kind: "nextAttackRollBySelf",
      sourceProcedureRef: concentrationSourceProcedureRef,
      sourceCombatantId: fighterId,
      mode: "advantage",
      expiresAt: { kind: "concentration", combatantId: fighterId },
    } satisfies BattleActiveEffect;
    const affectedTarget = battleCreatureWithSpellActiveEffects(target, [
      relationshipEffect,
      concentrationEffect,
    ]);
    const state: BattleState = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(fighterId, {
        ...affectedTarget,
        concentration: {
          sourceProcedureRef: concentrationSourceProcedureRef,
          effectKind: "spellEffect",
        },
      }),
    };
    const subject = magicMissileAct(
      battleRuntimeSessionForTest({ state, context: baseSession.context }),
    ).subject;
    const [allocationFill, damageFill] = magicMissileFills(
      state,
      subject,
      fighterId,
    );

    const lifecycle = resolveBattleSubject({
      state,
      subject,
      fills: [allocationFill, damageFill],
    });
    const concentrationHole = requireHole(
      lifecycle,
      "concentrationSavingThrow",
    );
    const withConcentration = [
      allocationFill,
      damageFill,
      concentrationSavingThrowFill(concentrationHole, false),
    ];
    const dispositionNeedsHoles = resolveBattleSubject({
      state,
      subject,
      fills: withConcentration,
    });
    const dispositionHole = requireHole(
      dispositionNeedsHoles,
      "attackDamageDisposition",
    );
    const replacement = dispositionHole.choices.find(
      (choice) => choice.kind === "zeroHitPointReplacement",
    );
    if (replacement === undefined) {
      throw new Error("Expected Relentless Endurance replacement choice.");
    }
    const withLifecycleFills = [
      ...withConcentration,
      attackDamageDispositionFill(dispositionHole, replacement),
    ];
    const relationshipNeedsHoles = resolveBattleSubject({
      state,
      subject,
      fills: withLifecycleFills,
    });
    const relationshipHole = requireHole(
      relationshipNeedsHoles,
      "damageRelationshipDecisions",
    );
    const [firstQuestion, ...remainingQuestions] = relationshipHole.questions;
    if (firstQuestion === undefined) {
      throw new Error("Expected at least one damage relationship question.");
    }
    const relationshipFill: BattleFill = {
      kind: "damageRelationshipDecisions",
      holeId: relationshipHole.holeId,
      answers: [
        { questionId: firstQuestion.questionId, answer: true },
        ...remainingQuestions.map((question) => ({
          questionId: question.questionId,
          answer: true,
        })),
      ],
    };
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [...withLifecycleFills, relationshipFill],
      }),
    );

    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(1));
    expect(resolved.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(resolved.state.combatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Sanctuary can consume a prepared slot cast when the warded target is lost", () => {
    const baseSession = wizardVsSkeletonBattle();
    const warded = baseSession.state.combatants.get(skeletonId);
    if (warded === undefined) {
      throw new Error("Expected the warded target.");
    }
    const sanctuary: BattleActiveEffect = {
      kind: "sanctuaryWard",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "spell-damage-sanctuary-source",
      ),
      sourceCombatantId: wizardId,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
    };
    const state: BattleState = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(skeletonId, {
        ...warded,
        activeEffects: [sanctuary],
      }),
    };
    const session = battleRuntimeSessionForTest({
      state,
      context: baseSession.context,
    });
    const subject = magicMissileAct(session).subject;
    const allocationHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocationHole, [
      { targetId: skeletonId, count: 3 },
    ]);
    const needsSanctuary = resolveBattleSubject({
      state,
      subject,
      fills: [allocationFill],
    });
    const sanctuaryHole = requireHole(
      needsSanctuary,
      "sanctuaryInterdictionOutcome",
    );
    const lostFill: BattleFill = {
      kind: "sanctuaryInterdictionOutcome",
      holeId: sanctuaryHole.holeId,
      value: {
        saveSucceeded: false,
        outcome: { kind: "loseAttackOrSpell" },
      },
    };
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [allocationFill, lostFill],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(13);
    expect(expendedLevelOneSlots(resolved, wizardId)).toBe(1);
  });

  test("a lost Sanctuary ward ends a readied prepared slot spell without repeat damage", () => {
    const baseSession = wizardVsSkeletonBattle();
    const warded = baseSession.state.combatants.get(skeletonId);
    if (warded === undefined) {
      throw new Error("Expected the warded target.");
    }
    const sanctuary: BattleActiveEffect = {
      kind: "sanctuaryWard",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "spell-damage-readied-sanctuary-source",
      ),
      sourceCombatantId: wizardId,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(2) },
    };
    const state: BattleState = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(skeletonId, {
        ...warded,
        activeEffects: [sanctuary],
      }),
    };
    const session = battleRuntimeSessionForTest({
      state,
      context: baseSession.context,
    });
    const ready = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            magicMissileInvocation,
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    const nextTurn = requireResolved(
      endTurn({ state: ready.state, actorId: wizardId }),
    );
    const releaseSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: skeletonId,
      command: "releaseReadiedSpell",
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(nextTurn.state),
    };
    const allocationHole = requireHole(
      resolveBattleSubject({
        state: nextTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocationHole, [
      { targetId: skeletonId, count: 3 },
    ]);
    const sanctuaryHole = requireHole(
      resolveBattleSubject({
        state: nextTurn.state,
        subject: releaseSubject,
        fills: [allocationFill],
      }),
      "sanctuaryInterdictionOutcome",
    );
    const released = requireResolved(
      resolveBattleSubject({
        state: nextTurn.state,
        subject: releaseSubject,
        fills: [
          allocationFill,
          {
            kind: "sanctuaryInterdictionOutcome",
            holeId: sanctuaryHole.holeId,
            value: {
              saveSucceeded: false,
              outcome: { kind: "loseAttackOrSpell" },
            },
          },
        ],
      }),
    );

    expect(released.state.combatants.get(skeletonId)?.hp).toBe(13);
    expect(expendedLevelOneSlots(released, wizardId)).toBe(1);
    expect(released.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(released.state.readiedSpells.has(wizardId)).toBe(false);
  });

  test("action-time prepared damage reports stale action and Spell Slot resources after discovery", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-spell-resource-race"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ combatantId: skeletonId, initiative: 10 }),
      ],
    });
    const subject = magicMissileAct(session).subject;
    const fills = magicMissileFills(session.state, subject);
    const noAction = resolveBattleSubject({
      state: {
        ...session.state,
        currentTurnResources: {
          ...session.state.currentTurnResources,
          actionResources: [],
        },
      },
      subject,
      fills,
    });
    expect(noAction).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic action is no longer available for the current actor.",
    });

    const noSlot = resolveBattleSubject({
      state: {
        ...session.state,
        currentTurnResources: {
          ...session.state.currentTurnResources,
          spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
        },
      },
      subject,
      fills,
    });
    expect(noSlot).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });
  });
});
