import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import { NonNegativeInteger, resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  battleSubjectPresentation,
  discoverBattleActs,
} from "./battle-act-composition.ts";
import {
  battleId,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  characterSeed,
  fighterId,
  goblinId,
  monsterMultiattackStatBlock,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type {
  BattleCreatureState,
  BattleFill,
  BattleState,
  StatBlockBattleCreatureState,
} from "./battle-state-execution.ts";
import type { BattleActiveEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { battleStatBlockProcedureExecutionRef } from "./identity.ts";
import {
  actionResourceCollectionOwnershipActivityAndUniquenessAreValid,
  hasStatBlockMultiattackContinuationResource,
  statBlockMultiattackActionResourceMatchesProcedure,
  statBlockMultiattackContinuationActionResourcesAreValid,
} from "./battle-reducer/action-resource-kinds.ts";
import { isStatBlockBattleCreatureState } from "./battle-reducer/battle-discovery.ts";
import { subtleSpellComponentProjectionFact } from "./battle-reducer/metamagic-support.ts";
import {
  saveGatedTurnConstraintBundleEffects,
  turnConstraintSomaticSpellFailureOutcomeHole,
} from "./battle-reducer/save-gated-turn-constraint-facts.ts";
import { resolveSaveGatedTurnConstraintSomaticSpellFailure } from "./battle-reducer/save-gated-turn-constraint-runtime.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import {
  attackActionOptionIsOrdinaryAttackAction,
  spendStatBlockAttackResources,
  statBlockAttackActionOptions,
  statBlockAttackProcedureSection,
  statBlockMultiattackDispatchResourceDemandForActor,
  updateStatBlockActorResources,
} from "./battle-reducer/statblock.ts";
import type { SpellMetamagicApplicationFact } from "./battle-reducer/metamagic-support.ts";
import { statBlockMultiattackBindings } from "./stat-block-execution-state.ts";

describe("extracted battle composition and Slow coverage", () => {
  test("presents Empowered and Seeking spell selections through the authored spell join", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-composition-metamagic-presentation"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const spell = discoverBattleActs(session).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (spell === undefined || spell.subject.tag !== "actionSpell") {
      throw new Error("Expected a discovered action spell.");
    }

    const selections = [
      { effectKind: "damage_dice_reroll" },
      { effectKind: "missed_spell_attack_reroll" },
    ] as const;
    for (const selection of selections) {
      const subject = {
        ...spell.subject,
        metamagic: [selection],
      } as const satisfies BattleSubject;
      expect(battleSubjectPresentation(session, subject)).toEqual(
        spell.presentation,
      );
    }
  });

  test("selects only Slow effects and suppresses the Somatic chance for Subtle Spell", () => {
    const session = startBattleSessionRight({
      battleId: battleId("slow-effect-selection"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [spellRecord("slow")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const spell = discoverBattleActs(session).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (
      spell?.subject.tag !== "actionSpell" ||
      spell.presentation.kind !== "spell"
    ) {
      throw new Error("Expected a discovered spell invocation.");
    }
    const actionSpellSubject = spell.subject;
    const actor = requireCreature(session.state, fighterId);
    const invocation = supportedSpellActs(session.state, actor).find(
      (candidate) =>
        candidate.sourceProcedureRef === actionSpellSubject.procedureRef,
    );
    if (invocation === undefined) {
      throw new Error("Expected an executable spell invocation.");
    }
    const slowedState = battleStateWithAllocatedEffectForTest({
      state: session.state,
      ownerId: fighterId,
      effect: saveGatedTurnConstraintBundleEffectForTest(session.state),
    });
    const slowedActor = requireCreature(slowedState, fighterId);
    const slowEffect = slowedActor.activeEffects.find(
      (effect) => effect.kind === "saveGatedTurnConstraintBundle",
    );
    if (slowEffect === undefined) {
      throw new Error("Expected the allocated turn-constraint effect.");
    }

    expect(
      saveGatedTurnConstraintBundleEffects(session.state, undefined),
    ).toEqual([]);
    expect(saveGatedTurnConstraintBundleEffects(session.state, actor)).toEqual(
      [],
    );
    expect(
      saveGatedTurnConstraintBundleEffects(slowedState, slowedActor),
    ).toEqual([expect.objectContaining(slowEffect)]);
    expect(
      turnConstraintSomaticSpellFailureOutcomeHole({
        state: slowedState,
        actorId: fighterId,
        invocation,
        metamagicApplications: [subtleSpellApplicationForTest(invocation)],
      }),
    ).toBeNull();
  });

  test("rejects a Slow chance fill when the actor has no Slow effect", () => {
    const session = startBattleSessionRight({
      battleId: battleId("slow-stray-fill"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [spellRecord("slow")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const spell = discoverBattleActs(session).find(
      (act) => act.subject.tag === "actionSpell",
    );
    if (
      spell === undefined ||
      spell.subject.tag !== "actionSpell" ||
      spell.presentation.kind !== "spell"
    ) {
      throw new Error("Expected a discovered spell invocation.");
    }
    const actionSpellSubject = spell.subject;
    const actor = requireCreature(session.state, fighterId);
    const invocation = supportedSpellActs(session.state, actor).find(
      (candidate) =>
        candidate.sourceProcedureRef === actionSpellSubject.procedureRef,
    );
    if (invocation === undefined) {
      throw new Error("Expected an executable spell invocation.");
    }
    const slowedState = battleStateWithAllocatedEffectForTest({
      state: session.state,
      ownerId: fighterId,
      effect: saveGatedTurnConstraintBundleEffectForTest(session.state),
    });
    const hole = turnConstraintSomaticSpellFailureOutcomeHole({
      state: slowedState,
      actorId: fighterId,
      invocation,
    });
    if (hole === null)
      throw new Error("Expected the slowed Somatic spell hole.");
    const fill = {
      kind: "turnConstraintSomaticSpellFailureOutcome",
      holeId: hole.holeId,
      value: { spellFailed: false },
    } as const satisfies BattleFill;

    expect(
      resolveSaveGatedTurnConstraintSomaticSpellFailure({
        state: session.state,
        castingState: session.state,
        subject: spell.subject,
        actorId: fighterId,
        invocation,
        fills: [fill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });
});

describe("Stat Block extracted composition coverage", () => {
  test("validates every Multiattack continuation resource shape and owner", () => {
    const state = statBlockMultiattackBattle();
    const actor = requireStatBlockActor(state);
    const binding = statBlockMultiattackBindings(actor.origin.execution)[0];
    if (binding?.procedure.kind !== "multiattack") {
      throw new Error("Expected an admitted Multiattack binding.");
    }
    const [firstAttackProcedureRef, ...remainingAttackProcedureRefs] =
      binding.procedure.dispatchProcedureRefs;
    if (firstAttackProcedureRef === undefined) {
      throw new Error("Expected a listed Multiattack dispatch.");
    }
    const listedResources = binding.procedure.dispatchProcedureRefs.map(
      (attackProcedureRef) =>
        ({
          kind: "action",
          source: "statBlockMultiattack",
          sourceOwnerId: goblinId,
          sourceProcedureRef: binding.procedureRef,
          dispatch: { kind: "listedOccurrence", attackProcedureRef },
        }) satisfies RuntimeActionResource,
    );
    const firstListedResource = listedResources[0];
    if (firstListedResource === undefined) {
      throw new Error("Expected a listed Multiattack resource.");
    }
    const choiceResource = {
      kind: "action",
      source: "statBlockMultiattack",
      sourceOwnerId: goblinId,
      sourceProcedureRef: binding.procedureRef,
      dispatch: {
        kind: "oneListedChoice",
        attackProcedureRefs: [
          firstAttackProcedureRef,
          ...remainingAttackProcedureRefs,
        ],
      },
    } as const satisfies RuntimeActionResource;
    const effectRef = battleEffectExecutionRefForTest(
      "multiattack-resource-coverage",
    );
    const otherResources = {
      turn: { kind: "action", source: "turn" },
      unit: {
        kind: "action",
        source: "unit",
        sourceOwnerId: goblinId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "multiattack-unit-resource",
        ),
        restriction: { kind: "none" },
      },
      spellEffect: {
        kind: "action",
        source: "spellEffect",
        sourceEffectRef: effectRef,
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
      },
      classFeatureExtraAttack: {
        kind: "action",
        source: "classFeatureExtraAttack",
        sourceOwnerId: goblinId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "multiattack-extra-attack-resource",
        ),
        restriction: { kind: "none" },
      },
      monkFocusFlurryOfBlows: {
        kind: "action",
        source: "monkFocusFlurryOfBlows",
        sourceOwnerId: goblinId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "multiattack-flurry-resource",
        ),
      },
    } as const satisfies Record<string, RuntimeActionResource>;

    expect(
      statBlockMultiattackContinuationActionResourcesAreValid(
        [],
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(true);
    expect(
      hasStatBlockMultiattackContinuationResource(
        listedResources,
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackActionResourceMatchesProcedure(
        firstListedResource,
        goblinId,
        actor.origin.execution,
        firstAttackProcedureRef,
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackActionResourceMatchesProcedure(
        choiceResource,
        goblinId,
        actor.origin.execution,
        firstAttackProcedureRef,
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackContinuationActionResourcesAreValid(
        listedResources,
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackContinuationActionResourcesAreValid(
        [choiceResource],
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackContinuationActionResourcesAreValid(
        [choiceResource, choiceResource],
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(false);
    expect(
      statBlockMultiattackContinuationActionResourcesAreValid(
        [firstListedResource, choiceResource],
        goblinId,
        actor.origin.execution,
      ),
    ).toBe(false);
    for (const resource of Object.values(otherResources)) {
      expect(
        statBlockMultiattackContinuationActionResourcesAreValid(
          [...listedResources, resource],
          goblinId,
          actor.origin.execution,
        ),
      ).toBe(resource.source === "spellEffect");
    }

    expect(
      actionResourceCollectionOwnershipActivityAndUniquenessAreValid(
        Object.values(otherResources),
        goblinId,
        [effectRef],
      ),
    ).toBe(true);
    expect(
      actionResourceCollectionOwnershipActivityAndUniquenessAreValid(
        [
          {
            ...otherResources.unit,
            sourceOwnerId: fighterId,
          },
        ],
        goblinId,
        [effectRef],
      ),
    ).toBe(false);
    expect(
      actionResourceCollectionOwnershipActivityAndUniquenessAreValid(
        [otherResources.spellEffect],
        goblinId,
        [],
      ),
    ).toBe(false);
  });

  test("limits a slowed Multiattack to one chosen listed dispatch", () => {
    const state = statBlockMultiattackBattle();
    const actor = requireStatBlockActor(state);
    const binding = statBlockMultiattackBindings(actor.origin.execution)[0];
    if (binding?.procedure.kind !== "multiattack") {
      throw new Error("Expected an admitted Multiattack binding.");
    }

    expect(
      statBlockMultiattackDispatchResourceDemandForActor(state, actor, binding),
    ).toEqual({
      kind: "allListedDispatches",
      procedureRefs: binding.procedure.dispatchProcedureRefs,
    });
    const slowedState = battleStateWithAllocatedEffectForTest({
      state,
      ownerId: goblinId,
      effect: saveGatedTurnConstraintBundleEffectForTest(state),
    });
    const slowedActor = slowedState.combatants.get(goblinId);
    if (!isStatBlockBattleCreatureState(slowedActor)) {
      throw new Error("Expected the slowed Stat Block actor.");
    }
    expect(
      statBlockMultiattackDispatchResourceDemandForActor(
        slowedState,
        slowedActor,
        binding,
      ),
    ).toEqual({
      kind: "oneListedDispatch",
      procedureRefs: binding.procedure.dispatchProcedureRefs,
    });
  });

  test("distinguishes ordinary attacks, absent actors, and non-attack bindings", () => {
    const state = statBlockMultiattackBattle();
    const actor = requireStatBlockActor(state);
    const attack = statBlockAttackActionOptions(actor.origin.execution)[0];
    const multiattack = actor.origin.execution.procedureBindings.find(
      (candidate) => candidate.procedure.kind === "multiattack",
    );
    if (attack === undefined || multiattack === undefined) {
      throw new Error("Expected Stat Block attack and Multiattack bindings.");
    }

    expect(
      statBlockAttackProcedureSection(state, goblinId, attack.procedureRef),
    ).toBe("actions");
    expect(
      attackActionOptionIsOrdinaryAttackAction(state, goblinId, attack),
    ).toBe(true);
    expect(
      statBlockAttackProcedureSection(
        state,
        fighterId,
        battleStatBlockProcedureExecutionRef(
          actor.origin.execution.scopeRef,
          NonNegativeInteger(99),
        ),
      ),
    ).toBeNull();
    expect(
      statBlockAttackProcedureSection(
        state,
        goblinId,
        multiattack.procedureRef,
      ),
    ).toBeNull();
  });

  test("leaves resources unchanged for stale or non-Stat-Block actors", () => {
    const state = statBlockMultiattackBattle();
    const actor = requireStatBlockActor(state);
    const attack = statBlockAttackActionOptions(actor.origin.execution)[0];
    if (attack === undefined) throw new Error("Expected a Stat Block attack.");

    expect(
      spendStatBlockAttackResources({
        state,
        actorId: fighterId,
        attack,
      }),
    ).toBe(state);
    const withoutActor = {
      ...state,
      combatants: new Map(state.combatants),
    };
    withoutActor.combatants.delete(goblinId);
    expect(
      updateStatBlockActorResources(withoutActor, actor, attack.procedureRef),
    ).toBe(withoutActor);
  });
});

function statBlockMultiattackBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("stat-block-extracted-composition"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        initiative: 20,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("slow")],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }),
      }),
      statBlockCreatureInit({
        combatantId: goblinId,
        initiative: 10,
        statBlock: monsterMultiattackStatBlock(),
      }),
    ],
  });
}

function requireCreature(
  state: BattleState,
  combatantId: typeof fighterId,
): BattleCreatureState {
  const actor = state.combatants.get(combatantId);
  if (actor === undefined) throw new Error("Expected battle creature.");
  return actor;
}

function requireStatBlockActor(
  state: BattleState,
): StatBlockBattleCreatureState {
  const actor = state.combatants.get(goblinId);
  if (!isStatBlockBattleCreatureState(actor)) {
    throw new Error("Expected Stat Block battle creature.");
  }
  return actor;
}

function subtleSpellApplicationForTest(
  invocation: ReturnType<typeof supportedSpellActs>[number],
): SpellMetamagicApplicationFact {
  const componentProjection = subtleSpellComponentProjectionFact(invocation);
  if (componentProjection === null) {
    throw new Error(
      "Expected a spell with a Subtle Spell component projection.",
    );
  }
  return {
    effectKind: "component_suppression",
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
    componentProjection,
  };
}

function saveGatedTurnConstraintBundleEffectForTest(
  state: BattleState,
): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "saveGatedTurnConstraintBundle" }
> {
  const source = requireCreature(state, fighterId);
  const invocation = supportedSpellActs(state, source).find(
    (candidate) => candidate.procedure === "saveGatedTurnConstraintBundle",
  );
  if (invocation?.procedure !== "saveGatedTurnConstraintBundle") {
    throw new Error("Expected a save-gated turn-constraint invocation.");
  }
  return {
    kind: "saveGatedTurnConstraintBundle",
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: fighterId,
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: invocation.durationTicks,
    },
  };
}
