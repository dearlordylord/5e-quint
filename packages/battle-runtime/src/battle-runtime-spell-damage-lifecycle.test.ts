import { describe, expect, test } from "vitest";
import { resourceCount } from "@dnd/shared/types";

import type {
  AvailableBattleAct,
  BattleFill,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleId,
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
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
  spellRecord,
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
const sanctuaryCasterId = combatantId("spell-damage-sanctuary-caster");

function wizardVsWardedSkeletonBattle(): BattleRuntimeSession {
  const baseSession = wizardVsSkeletonBattle({
    extraCombatants: [
      characterSeed({
        combatantId: sanctuaryCasterId,
        displayName: "Sanctuary caster",
        initiative: 5,
        attack: null,
        classLevels: [{ className: "cleric", level: 1 }],
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("sanctuary")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: 3,
          },
        },
      }),
    ],
  });
  const sanctuaryProcedureRef = requireCharacterSpellProcedureRefForTest(
    baseSession,
    sanctuaryCasterId,
    spellSlotInvocationRef("sanctuary", 1, "sanctuaryTargetingInterdiction"),
  );
  const allocated = battleStateWithAllocatedEffectForTest({
    state: baseSession.state,
    ownerId: skeletonId,
    effect: {
      kind: "sanctuaryWard",
      sourceProcedureRef: sanctuaryProcedureRef,
      sourceCombatantId: sanctuaryCasterId,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(600),
      },
    },
  });
  const sanctuaryCaster = allocated.combatants.get(sanctuaryCasterId);
  if (
    sanctuaryCaster?.origin.kind !== "character" ||
    sanctuaryCaster.origin.spellcasting === undefined
  ) {
    throw new Error("Expected the admitted Sanctuary caster.");
  }
  const state: BattleState = {
    ...allocated,
    combatants: new Map(allocated.combatants).set(sanctuaryCasterId, {
      ...sanctuaryCaster,
      origin: {
        ...sanctuaryCaster.origin,
        spellcasting: {
          ...sanctuaryCaster.origin.spellcasting,
          spellSlots: sanctuaryCaster.origin.spellcasting.spellSlots.map(
            (slot) =>
              slot.spellLevel === 1
                ? { ...slot, expended: resourceCount(1) }
                : slot,
          ),
        },
      },
    }),
  };
  return battleRuntimeSessionForTest({ ...baseSession, state });
}

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
    const charmPerson = spellRecord("charm_person");
    const rayOfEnfeeblement = spellRecord("ray_of_enfeeblement");
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
          classLevels: [{ className: "wizard", level: 3 }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [rayOfEnfeeblement],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          resources: [
            { unit: unitLibrary.requireUnit("orc_relentless_endurance") },
          ],
        }),
        characterSeed({
          combatantId: charmSourceId,
          displayName: "Charm Source",
          initiative: 5,
          attack: null,
          classLevels: [{ className: "wizard", level: 1 }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [charmPerson],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const relationshipSourceProcedureRef =
      requireCharacterSpellProcedureRefForTest(
        baseSession,
        charmSourceId,
        spellSlotInvocationRef("charm_person", 1, "saveGatedCondition"),
      );
    const concentrationSourceProcedureRef =
      requireCharacterSpellProcedureRefForTest(
        baseSession,
        fighterId,
        spellSlotInvocationRef(
          "ray_of_enfeeblement",
          2,
          "abilityD20TestRollModeSaveGate",
        ),
      );
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: baseSession.state,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: fighterId,
          effect: {
            kind: "spellCondition",
            sourceProcedureRef: relationshipSourceProcedureRef,
            sourceCombatantId: charmSourceId,
            condition: "charmed",
            conditionHadNonSpellSource: false,
            escape: { kind: "targetDamagedByCasterOrAlly" },
            turnStartDamage: null,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        },
        {
          kind: "activeEffect",
          ownerId: charmSourceId,
          effect: {
            kind: "sourceDamageRollPenalty",
            sourceProcedureRef: concentrationSourceProcedureRef,
            sourceCombatantId: fighterId,
            amount: { dice: 1, dieSize: 8 },
            expiresAt: {
              kind: "concentration",
              combatantId: fighterId,
              durationTicks: elapsedTimeTicks(10),
            },
          },
        },
      ],
    });
    const relationshipOccurrence = allocated.occurrences[0];
    const concentrationOccurrence = allocated.occurrences[1];
    if (
      relationshipOccurrence?.kind !== "activeEffect" ||
      concentrationOccurrence?.kind !== "activeEffect"
    ) {
      throw new Error(
        "Expected allocated relationship and concentration effects.",
      );
    }
    const affectedTarget = allocated.state.combatants.get(fighterId);
    if (
      affectedTarget?.origin.kind !== "character" ||
      affectedTarget.origin.spellcasting === undefined
    ) {
      throw new Error("Expected the allocated Orc spellcaster target.");
    }
    const state: BattleState = {
      ...allocated.state,
      combatants: new Map(allocated.state.combatants).set(fighterId, {
        ...affectedTarget,
        origin: {
          ...affectedTarget.origin,
          spellcasting: {
            ...affectedTarget.origin.spellcasting,
            spellSlots: affectedTarget.origin.spellcasting.spellSlots.map(
              (slot) =>
                slot.spellLevel === 2
                  ? { ...slot, expended: resourceCount(1) }
                  : slot,
            ),
          },
        },
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
    expect(
      resolved.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) =>
            effect.effectRef === relationshipOccurrence.effect.effectRef,
        ),
    ).toBe(false);
    expect(
      resolved.state.combatants
        .get(charmSourceId)
        ?.activeEffects.some(
          (effect) =>
            effect.effectRef === concentrationOccurrence.effect.effectRef,
        ),
    ).toBe(false);
  });

  test("Sanctuary can consume a prepared slot cast when the warded target is lost", () => {
    const baseSession = wizardVsWardedSkeletonBattle();
    const warded = baseSession.state.combatants.get(skeletonId);
    if (warded === undefined) {
      throw new Error("Expected the warded target.");
    }
    const state = baseSession.state;
    const sanctuary = warded.activeEffects.find(
      (effect) => effect.kind === "sanctuaryWard",
    );
    if (sanctuary === undefined) {
      throw new Error("Expected the allocated Sanctuary ward.");
    }
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
    expect(
      resolved.state.combatants
        .get(skeletonId)
        ?.activeEffects.some(
          (effect) => effect.effectRef === sanctuary.effectRef,
        ),
    ).toBe(true);
  });

  test("a lost Sanctuary ward ends a readied prepared slot spell without repeat damage", () => {
    const baseSession = wizardVsWardedSkeletonBattle();
    const warded = baseSession.state.combatants.get(skeletonId);
    if (warded === undefined) {
      throw new Error("Expected the warded target.");
    }
    const state = baseSession.state;
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
    const sanctuary = warded.activeEffects.find(
      (effect) => effect.kind === "sanctuaryWard",
    );
    if (sanctuary === undefined) {
      throw new Error("Expected the allocated Sanctuary ward.");
    }
    expect(
      released.state.combatants
        .get(skeletonId)
        ?.activeEffects.some(
          (effect) => effect.effectRef === sanctuary.effectRef,
        ),
    ).toBe(true);
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
