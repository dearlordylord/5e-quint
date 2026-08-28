import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { NonNegativeInteger, resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  battleSubjectPresentation,
  discoverBattleActs,
} from "./battle-act-composition.ts";
import {
  battleId,
  battleProcedureExecutionRefForTest,
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
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleState,
  StatBlockBattleCreatureState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { battleStatBlockProcedureExecutionRef } from "./identity.ts";
import { isStatBlockBattleCreatureState } from "./battle-reducer/battle-discovery.ts";
import { subtleSpellComponentProjectionFact } from "./battle-reducer/metamagic-support.ts";
import { slowActivePenaltiesEffects } from "./battle-reducer/slow-active-penalties-effects.ts";
import { slowSomaticSpellFailureOutcomeHole } from "./battle-reducer/slow-active-penalties-facts.ts";
import { resolveSlowSomaticSpellFailure } from "./battle-reducer/slow-active-penalties-runtime.ts";
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
            preparedSpells: [],
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
    const slowEffect = slowEffectForTest();
    const slowedActor = {
      ...actor,
      activeEffects: [...actor.activeEffects, slowEffect],
    } satisfies BattleCreatureState;
    const slowedState = stateWithActor(session.state, slowedActor);

    expect(slowActivePenaltiesEffects(undefined)).toEqual([]);
    expect(slowActivePenaltiesEffects(actor)).toEqual([]);
    expect(slowActivePenaltiesEffects(slowedActor)).toEqual([slowEffect]);
    expect(
      slowSomaticSpellFailureOutcomeHole({
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
            preparedSpells: [],
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
    const slowedState = stateWithActor(session.state, {
      ...requireCreature(session.state, fighterId),
      activeEffects: [slowEffectForTest()],
    });
    const hole = slowSomaticSpellFailureOutcomeHole({
      state: slowedState,
      actorId: fighterId,
      invocation,
    });
    if (hole === null)
      throw new Error("Expected the slowed Somatic spell hole.");
    const fill = {
      kind: "slowSomaticSpellFailureOutcome",
      holeId: hole.holeId,
      value: { spellFailed: false },
    } as const satisfies BattleFill;

    expect(
      resolveSlowSomaticSpellFailure({
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
  test("limits a slowed Multiattack to one chosen listed dispatch", () => {
    const state = statBlockMultiattackBattle();
    const actor = requireStatBlockActor(state);
    const binding = statBlockMultiattackBindings(actor.origin.execution)[0];
    if (binding?.procedure.kind !== "multiattack") {
      throw new Error("Expected an admitted Multiattack binding.");
    }

    expect(
      statBlockMultiattackDispatchResourceDemandForActor(actor, binding),
    ).toEqual({
      kind: "allListedDispatches",
      procedureRefs: binding.procedure.dispatchProcedureRefs,
    });
    const slowedActor = {
      ...actor,
      activeEffects: [...actor.activeEffects, slowEffectForTest()],
    } satisfies StatBlockBattleCreatureState;
    expect(
      statBlockMultiattackDispatchResourceDemandForActor(slowedActor, binding),
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
      characterSeed({ combatantId: fighterId, initiative: 20 }),
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

function stateWithActor(
  state: BattleState,
  actor: BattleCreatureState,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, actor),
  };
}

function slowEffectForTest(): Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
> {
  return {
    kind: "slowActivePenalties",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "extracted-slow-coverage",
    ),
    sourceCombatantId: fighterId,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}
