import { endTurn } from "./index.ts";
import { battleId } from "./unit-profile-admission.test-support.ts";
import {
  cantripSpellInvocationRef,
  characterSeed,
  requireCharacterSpellProcedureRefForTest,
  resolveReadySpellForTest,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";
import { DieRollResult } from "@dnd/shared/types";
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
} from "@dnd/shared/game-facts";
import {
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleState,
  type BattleHeroicInspirationRerollDecision,
} from "./battle-state-execution.ts";
import {
  attackRollFill,
  damageRollFill,
  battleFrontierInterruptDecisionForState,
  fighterAttackSubject,
  fighterId,
  interruptDecisionFill,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  targetFill,
  wizardId,
} from "./battle-runtime.test-support.ts";

function inspiredReadyState(): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId("heroic-inspiration-nested-ready-proof"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 30,
        attack: null,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({
        initiative: 20,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const readied = resolveReadySpellForTest({
    state: session.state,
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    trigger: "attackHit",
  });
  if (readied.tag !== "resolved")
    throw new Error("Expected legal Ready action.");
  const next = endTurn({ state: readied.state, actorId: wizardId });
  if (next.tag !== "resolved") throw new Error("Expected legal End Turn.");
  return next.state;
}
function reroll(
  total: number,
  natural: number,
): BattleHeroicInspirationRerollDecision {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      total,
      d20TestRoll: { tag: "single", naturalD20: DieRollResult(natural) },
    },
  };
}

describe("accepted parent Inspiration survives a readied Spell Attack", () => {
  test.each([false, true])("nested actor spends=%s", (nestedSpends) => {
    const state = inspiredReadyState();
    const subject = fighterAttackSubject(state, "Longsword");
    const target = targetFill(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      ),
      wizardId,
    );
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    const awaiting = resolveBattleSubject({
      state,
      subject,
      fills: [
        target,
        attackRollFill(roll, {
          total: 7,
          naturalD20: 2,
          d20TestRerolls: [reroll(24, 19)],
        }),
      ],
    });
    if (awaiting.tag !== "needsHoles")
      throw new Error(JSON.stringify(awaiting));
    const decision = battleFrontierInterruptDecisionForState(awaiting.state);
    const choice = decision?.choices.find(
      (value) =>
        value.kind === "nestedProcedure" &&
        value.subject.command === "releaseReadiedSpell",
    );
    if (
      decision == null ||
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    )
      throw new Error("Expected advertised readied spell release.");
    const opened = resolveBattleInterrupt({
      state: awaiting.state,
      fill: interruptDecisionFill(decision.decisionHole, {
        kind: "resolve",
        responderId: wizardId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    if (opened.tag !== "needsHoles") throw new Error(JSON.stringify(opened));
    const nestedTarget = targetFill(
      requireHole(opened, "targetChoice"),
      fighterId,
    );
    const nestedRoll = requireHole(
      resolveBattleSubject({
        state: opened.state,
        subject: choice.subject,
        fills: [nestedTarget],
      }),
      "attackRoll",
    );
    const askedNested = resolveBattleSubject({
      state: opened.state,
      subject: choice.subject,
      fills: [
        nestedTarget,
        attackRollFill(nestedRoll, { total: 7, naturalD20: 2 }),
      ],
    });
    expect(requireHole(askedNested, "attackRoll")).toHaveProperty(
      "heroicInspirationRerolls",
    );
    const decisionValue: BattleHeroicInspirationRerollDecision = nestedSpends
      ? reroll(8, 3)
      : { kind: "decline", effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND };
    const resumed = resolveBattleSubject({
      state: opened.state,
      subject: choice.subject,
      fills: [
        nestedTarget,
        attackRollFill(nestedRoll, {
          total: 7,
          naturalD20: 2,
          d20TestRerolls: [decisionValue],
        }),
      ],
    });
    expect(resumed, JSON.stringify(resumed)).toMatchObject({
      tag: "needsHoles",
    });
    if (resumed.tag !== "needsHoles")
      throw new Error("Expected resumed parent damage.");
    const damage = requireHole(resumed, "rolledDice");
    const completed = resolveBattleSubject({
      state: resumed.state,
      subject,
      fills: [damageRollFill(damage, 1)],
    });
    expect(completed, JSON.stringify(completed)).toMatchObject({
      tag: "resolved",
    });
    if (completed.tag !== "resolved")
      throw new Error("Expected completed parent attack.");
    expect(completed.state.interruptStack).toEqual([]);
    expect(completed.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    const fighter = completed.state.combatants.get(fighterId);
    const wizard = completed.state.combatants.get(wizardId);
    if (
      fighter?.origin.kind !== "character" ||
      wizard?.origin.kind !== "character"
    )
      throw new Error("Expected character fixture.");
    expect(fighter.origin.heroicInspiration).toEqual(NO_HEROIC_INSPIRATION);
    expect(wizard.origin.heroicInspiration).toEqual(
      nestedSpends ? NO_HEROIC_INSPIRATION : HEROIC_INSPIRATION_AVAILABLE,
    );
  });
});
