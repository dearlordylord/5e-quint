import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL dispel_evil_and_good
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.creature-type-protection-and-charm

import { describe, expect, test } from "vitest";
import {
  battleProcedureExecutionRefForTest,
  elapsedTimeTicks,
} from "./battle-runtime.test-support.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";
import { protectionRelevantEffectSavingThrowOutcomeHole } from "./battle-reducer/spell-condition-effects-helpers.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { creatureTypeProtectionProfile } from "./battle-reducer/spell-procedure-profiles/creature-type-protection.ts";
import {
  dispelEvilAndGoodUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  combatantId,
  conditionApplicationPreventedByCreatureTypeProtection,
  difficultyClass,
  endTurn,
  resolveBattlePossessionAttempt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

function wardMechanicsSource(
  spell: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: spell.spellDefinitionRuleFacts,
  };
}

describe("creature-type ward static admission", () => {
  test("retains special-function mechanics as unowned evidence", () => {
    const source = spellAdmissionSource(spellRecord(dispelEvilAndGoodUnitId));
    const result = creatureTypeProtectionProfile.admitMechanics(
      wardMechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      kind: "selfOngoingWard",
      policy: {
        protections: [
          { kind: "attack_rolls_against_target", mode: "disadvantage" },
        ],
      },
    });
    expect(result.admitted.evidence.unowned).toHaveLength(9);
  });

  test("accumulates independent unsupported range and duration facts", () => {
    const record = spellRecord(dispelEvilAndGoodUnitId);
    if (record.mechanics.family !== "ongoing_effect")
      throw new Error("Expected ongoing ward mechanics.");
    const source = spellAdmissionSource(
      decodeSpellRecordForTest({
        ...record,
        id: "synthetic_malformed_creature_ward",
        name: "Synthetic Malformed Creature Ward",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic_malformed_creature_ward",
        },
        mechanics: {
          ...record.mechanics,
          range: { kind: "touch" },
          duration: {
            kind: "timed",
            value: { unit: "minute", amount: 1 },
          },
        },
      }),
    );
    const result = creatureTypeProtectionProfile.admitMechanics(
      wardMechanicsSource(source),
    );

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues.map(({ failedFact }) => failedFact)).toEqual([
      "range",
      "duration",
    ]);
  });
});

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
        creatureTypes: ["celestial", "elemental", "fey", "fiend", "undead"],
        protections: [
          { kind: "attack_rolls_against_target", mode: "disadvantage" },
        ],
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
      battleRuntimeSessionForTest({
        state: undeadTurn.state,
        context: state.context,
      }),
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
        fills: [attackTargetFill(undeadTarget, undeadId, spellCasterId)],
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
      battleRuntimeSessionForTest({
        state: aberrationTurn.state,
        context: state.context,
      }),
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
          attackTargetFill(aberrationTarget, aberrationId, spellCasterId),
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

    const possessionAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: caster,
      effect: {
        kind: "possession",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-existing-possession",
        ),
        sourceCombatantId: feySourceId,
        save: {
          ability: "cha",
          dc: { kind: "fixed", dc: difficultyClass(14) },
        },
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(1),
        },
      },
    });
    const casterWithPossession = {
      ...possessionAllocation.owner,
      activeEffects: [
        ...possessionAllocation.owner.activeEffects,
        possessionAllocation.effect,
      ],
    };
    const stateWithPossession = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellCasterId,
        casterWithPossession,
      ),
    };
    expect(
      protectionRelevantEffectSavingThrowOutcomeHole(
        stateWithPossession,
        spellCasterId,
        possessionAllocation.effect,
      ).targetRollModes,
    ).toEqual([]);
  });
});
