// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL dispel_evil_and_good
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.creature-type-protection-and-charm

import { describe, expect, test } from "vitest";
import {
  dispelEvilAndGoodUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  combatantId,
  conditionApplicationPreventedByCreatureTypeProtection,
  endTurn,
  resolveBattlePossessionAttempt,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";

describe("L19E-02 Dispel Evil and Good creature-type protection subset", () => {
  test("casts as a self spell and imposes attack Disadvantage for SRD scoped creature types", () => {
    const spell = spellRecord(dispelEvilAndGoodUnitId);
    const undeadId = combatantId("unit-profile-dispel-evil-undead");
    const aberrationId = combatantId("unit-profile-dispel-evil-aberration");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      statBlockTargets: [
        {
          combatantId: undeadId,
          statBlock: statBlockWithCreatureType("undead"),
          initiative: 19,
        },
        {
          combatantId: aberrationId,
          statBlock: statBlockWithCreatureType("aberration"),
          initiative: 18,
        },
      ],
    });
    const act = spellAct({
      session: state,
      spellId: dispelEvilAndGoodUnitId,
      slotLevel: 5,
    });
    expect(act.initialHoles).toEqual([]);

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Evil and Good to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "creatureTypeProtection",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        attackRollMode: "disadvantage",
        protectedAgainstCreatureTypes: [
          "celestial",
          "elemental",
          "fey",
          "fiend",
          "undead",
        ],
        preventedConditions: [],
        preventsPossession: false,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );

    const undeadTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(undeadTurn).toMatchObject({ tag: "resolved" });
    if (undeadTurn.tag !== "resolved") {
      throw new Error("Expected to advance to undead attacker turn.");
    }
    const undeadAttack = statBlockAttackAct(
      { state: undeadTurn.state, context: state.context },
      undeadId,
      "Scimitar",
    );
    const undeadTarget = requireResultHole(
      resolveBattleSubject({
        state: undeadTurn.state,
        subject: undeadAttack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const undeadRoll = requireResultHole(
      resolveBattleSubject({
        state: undeadTurn.state,
        subject: undeadAttack.subject,
        fills: [
          attackTargetFill(undeadTarget, undeadId, spellCasterId, "Scimitar"),
        ],
      }),
      "attackRoll",
    );
    expect(undeadRoll.rollMode).toBe("disadvantage");

    const aberrationTurn = endTurn({
      state: undeadTurn.state,
      actorId: undeadId,
    });
    expect(aberrationTurn).toMatchObject({ tag: "resolved" });
    if (aberrationTurn.tag !== "resolved") {
      throw new Error("Expected to advance to aberration attacker turn.");
    }
    const aberrationAttack = statBlockAttackAct(
      { state: aberrationTurn.state, context: state.context },
      aberrationId,
      "Scimitar",
    );
    const aberrationTarget = requireResultHole(
      resolveBattleSubject({
        state: aberrationTurn.state,
        subject: aberrationAttack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const aberrationRoll = requireResultHole(
      resolveBattleSubject({
        state: aberrationTurn.state,
        subject: aberrationAttack.subject,
        fills: [
          attackTargetFill(
            aberrationTarget,
            aberrationId,
            spellCasterId,
            "Scimitar",
          ),
        ],
      }),
      "attackRoll",
    );
    expect(aberrationRoll.rollMode).toBeUndefined();
  });

  test("does not treat the ongoing protection facet as passive Charmed or possession prevention", () => {
    const spell = spellRecord(dispelEvilAndGoodUnitId);
    const feySourceId = combatantId("unit-profile-dispel-evil-fey-source");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      statBlockTargets: [
        {
          combatantId: feySourceId,
          statBlock: statBlockWithCreatureType("fey"),
          initiative: 19,
        },
      ],
    });
    const act = spellAct({
      session: state,
      spellId: dispelEvilAndGoodUnitId,
      slotLevel: 5,
    });
    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Evil and Good to resolve.");
    }

    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(
      conditionApplicationPreventedByCreatureTypeProtection(
        resolved.state,
        feySourceId,
        caster,
        "charmed",
      ),
    ).toBe(false);
    expect(
      resolveBattlePossessionAttempt({
        state: resolved.state,
        sourceCombatantId: feySourceId,
        targetId: spellCasterId,
      }),
    ).toEqual({
      tag: "unprevented",
      sourceCombatantId: feySourceId,
      targetId: spellCasterId,
    });
  });
});
