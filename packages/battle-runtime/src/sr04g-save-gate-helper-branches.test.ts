import { describe, expect, test } from "vitest";
import { spellSlotLevel } from "@dnd/shared/types";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import { combatantId } from "./identity.ts";
import {
  abilityD20TestRollModeSaveGateInvocationsFromFacts,
  abilityD20TestRollModeSaveGateMechanicsFacts,
  areaSaveGatedAttackRollAdvantageSpell,
  creatureParalysisSaveGateConditionSpell,
  creatureTypeRestrictedCharmSaveGateConditionSpell,
  hitPointBudgetBlindedSaveGateConditionSpell,
  humanoidCharmSaveGateConditionSpell,
  humanoidParalysisSaveGateConditionSpell,
  persistentAreaRestrainedSaveGateConditionSpell,
  saveGatedAttackRollAdvantageInvocationsFromFacts,
  saveGatedAttackRollAdvantageMechanicsFacts,
  saveGatedConditionImmunityInvocationsFromFacts,
  saveGatedConditionImmunityMechanicsFacts,
  saveGatedConditionInvocationsFromFacts,
  saveGatedConditionMechanicsFacts,
  sensoryConditionChoiceSaveGateSpell,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

const sourceCombatantId = combatantId("sr04g-save-gate-caster");

function admitted(spellId: string): BattleSpellAdmissionSource {
  return spellAdmissionSource(spellRecord(spellId));
}

function slot(level: number) {
  return spellSlotLevel(level);
}

describe("SR-04 save-gate helper branch contracts", () => {
  test("materializes each contextual invocation from parsed supported facts", () => {
    const conditionSource = admitted("hold_person");
    const conditionProjection =
      saveGatedConditionMechanicsFacts(conditionSource);
    expect(conditionProjection.tag).toBe("supported");
    if (conditionProjection.tag !== "supported") return;
    const conditionFacts = {
      ...conditionSource.spellDefinitionRuleFacts,
      ...conditionProjection.facts,
    };
    const conditionInvocations = saveGatedConditionInvocationsFromFacts({
      spell: battleSpellExecutionSourceFromAdmission(conditionSource),
      facts: conditionFacts,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot(2) },
      slotLevel: slot(2),
    });
    expect(conditionInvocations).toHaveLength(1);
    expect(conditionInvocations[0]).toMatchObject({
      procedure: "saveGatedCondition",
      targeting: { kind: "targetList" },
      effect: { condition: "paralyzed" },
    });
    expect(
      saveGatedConditionInvocationsFromFacts({
        spell: battleSpellExecutionSourceFromAdmission(conditionSource),
        facts: conditionFacts,
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot(1) },
        slotLevel: slot(1),
      }),
    ).toEqual([]);

    const immunitySource = admitted("calm_emotions");
    const immunityProjection =
      saveGatedConditionImmunityMechanicsFacts(immunitySource);
    expect(immunityProjection.tag).toBe("supported");
    if (immunityProjection.tag !== "supported") return;
    const immunityFacts = {
      ...immunitySource.spellDefinitionRuleFacts,
      ...immunityProjection.facts,
    };
    const immunityInvocations = saveGatedConditionImmunityInvocationsFromFacts({
      spell: battleSpellExecutionSourceFromAdmission(immunitySource),
      facts: immunityFacts,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot(2) },
      slotLevel: slot(2),
      sourceCombatantId,
    });
    expect(immunityInvocations).toHaveLength(1);
    expect(immunityInvocations[0]).toMatchObject({
      procedure: "saveGatedConditionImmunity",
      activeEffects: expect.arrayContaining([
        expect.objectContaining({ kind: "conditionImmunity" }),
      ]),
    });
    expect(
      saveGatedConditionImmunityInvocationsFromFacts({
        spell: battleSpellExecutionSourceFromAdmission(immunitySource),
        facts: immunityFacts,
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot(1) },
        slotLevel: slot(1),
        sourceCombatantId,
      }),
    ).toEqual([]);

    const d20Source = admitted("ray_of_enfeeblement");
    const d20Projection =
      abilityD20TestRollModeSaveGateMechanicsFacts(d20Source);
    expect(d20Projection.tag).toBe("supported");
    if (d20Projection.tag !== "supported") return;
    const d20Facts = {
      ...d20Source.spellDefinitionRuleFacts,
      ...d20Projection.facts,
    };
    const d20Invocations = abilityD20TestRollModeSaveGateInvocationsFromFacts({
      spell: battleSpellExecutionSourceFromAdmission(d20Source),
      facts: d20Facts,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot(2) },
      slotLevel: slot(2),
      sourceCombatantId,
    });
    expect(d20Invocations).toHaveLength(1);
    expect(d20Invocations[0]).toMatchObject({
      procedure: "abilityD20TestRollModeSaveGate",
      failedSaveDamagePenaltyEffect: {
        amount: { dice: 1, dieSize: 8 },
      },
    });

    const attackSource = admitted("faerie_fire");
    const attackProjection =
      saveGatedAttackRollAdvantageMechanicsFacts(attackSource);
    expect(attackProjection.tag).toBe("supported");
    if (attackProjection.tag !== "supported") return;
    const attackInvocations = saveGatedAttackRollAdvantageInvocationsFromFacts({
      spell: battleSpellExecutionSourceFromAdmission(attackSource),
      facts: {
        ...attackSource.spellDefinitionRuleFacts,
        ...attackProjection.facts,
      },
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot(1) },
      slotLevel: slot(1),
      sourceCombatantId,
    });
    expect(attackInvocations).toHaveLength(1);
    expect(attackInvocations[0]).toMatchObject({
      procedure: "saveGatedAttackRollAdvantage",
      effect: {
        kind: "saveGatedTargetProjection",
        sourceCombatantId,
      },
    });
  });

  test("actor-bound area projection retains the source and concentration owner", () => {
    const projection = areaSaveGatedAttackRollAdvantageSpell(
      sourceCombatantId,
      admitted("faerie_fire"),
    );
    expect(projection).not.toBeNull();
    expect(projection).toMatchObject({
      phase: { kind: "save_gate" },
      targeting: { kind: "pointOriginCube" },
      effect: {
        kind: "saveGatedTargetProjection",
        sourceCombatantId,
        expiresAt: { kind: "concentration", combatantId: sourceCombatantId },
      },
    });
    expect(
      areaSaveGatedAttackRollAdvantageSpell(
        sourceCombatantId,
        admitted("fire_bolt"),
      ),
    ).toBeNull();
  });

  test("public condition adapters preserve their distinct supported shapes", () => {
    expect(
      creatureTypeRestrictedCharmSaveGateConditionSpell({
        mechanics: spellRecord("animal_friendship").mechanics,
      }),
    ).toMatchObject({ targetCreatureTypes: ["beast"] });
    expect(
      humanoidCharmSaveGateConditionSpell({
        mechanics: spellRecord("charm_person").mechanics,
      }),
    ).toMatchObject({
      targetCreatureTypes: ["humanoid"],
      saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
    });
    expect(
      sensoryConditionChoiceSaveGateSpell({
        mechanics: spellRecord("blindness_deafness").mechanics,
      }),
    ).toMatchObject({ effect: { kind: "choice" } });
    expect(
      humanoidParalysisSaveGateConditionSpell({
        mechanics: spellRecord("hold_person").mechanics,
      }),
    ).toMatchObject({ effect: { condition: "paralyzed" } });
    expect(
      creatureParalysisSaveGateConditionSpell({
        mechanics: spellRecord("hold_monster").mechanics,
      }),
    ).toMatchObject({ targetCreatureTypes: null });
    expect(
      hitPointBudgetBlindedSaveGateConditionSpell({
        mechanics: spellRecord("color_spray").mechanics,
      }),
    ).toMatchObject({ targeting: { kind: "selfOriginCone" } });
    expect(
      persistentAreaRestrainedSaveGateConditionSpell({
        mechanics: spellRecord("entangle").mechanics,
      }),
    ).toMatchObject({ targeting: { kind: "pointOriginCubeExcludingCaster" } });
  });
});
