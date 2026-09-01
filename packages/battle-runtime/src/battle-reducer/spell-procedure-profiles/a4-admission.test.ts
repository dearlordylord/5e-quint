import { describe, expect, test } from "vitest";
import { spellSlotLevel } from "@dnd/shared/types";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellAdmissionActor } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spatial-melee-spell-attack-proxy.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { weaponAttackDamageEnhancementProfile } from "./weapon-attack-enhancement.ts";

function mechanicsSource(
  spell: ReturnType<typeof spellRecord>,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function renamedSpell(
  spell: ReturnType<typeof spellRecord>,
  suffix: string,
): ReturnType<typeof spellRecord> {
  return decodeSpellRecordForTest({
    ...spell,
    id: `synthetic_a4_${suffix}`,
    name: `Synthetic A4 ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_a4_${suffix}`,
    },
  });
}

function spellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

const A4_PROFILES = [
  { profile: markedDamageRiderProfile, spellId: "hunters_mark" },
  {
    profile: spatialMeleeSpellAttackProxyProfile,
    spellId: "spiritual_weapon",
  },
  { profile: spellAttackSequenceProfile, spellId: "scorching_ray" },
  { profile: spellHostedWeaponAttackProfile, spellId: "true_strike" },
  {
    profile: weaponAttackDamageEnhancementProfile,
    spellId: "magic_weapon",
  },
] as const;

describe("SR-04G-A4 static spell procedure admission", () => {
  test.each(A4_PROFILES)(
    "supports $spellId with a complete, mechanics-free projection",
    ({ profile, spellId }) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = profile.admitMechanics(mechanicsSourceFromSource(source));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence.unowned).toEqual([]);
      expect(result.admitted.evidence.consumed.length).toBeGreaterThan(0);

      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        {
          actor: spellAdmissionActor(),
          castingSource: source.castingSource,
          battle: undefined,
          spellCastOptions: [
            { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
          ],
        },
      );
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    },
  );

  test.each(A4_PROFILES)(
    "keeps $spellId recognition, facts, and evidence invariant under renaming",
    ({ profile, spellId }) => {
      const original = spellRecord(spellId);
      const originalSource = spellAdmissionSource(original);
      const renamed = renamedSpell(original, spellId);
      const renamedSource = spellAdmissionSource(renamed);
      const originalResult = profile.admitMechanics(
        mechanicsSourceFromSource(originalSource),
      );
      const renamedResult = profile.admitMechanics(
        mechanicsSourceFromSource(renamedSource),
      );
      expect(renamedResult.tag).toBe(originalResult.tag);
      if (
        originalResult.tag !== "supported" ||
        renamedResult.tag !== "supported"
      ) {
        return;
      }
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    },
  );

  test("recognizes Hunter's Mark roles after operation reordering", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a4_hunters_mark_reordered",
      name: "Synthetic A4 Hunter's Mark Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a4_hunters_mark_reordered",
      },
      mechanics: {
        ...base.mechanics,
        operations: [...base.mechanics.operations].reverse(),
      },
    });
    const originalResult = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(base),
    );
    const reorderedResult = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(reordered),
    );
    expect(originalResult.tag).toBe("supported");
    expect(reorderedResult.tag).toBe("supported");
    if (
      originalResult.tag !== "supported" ||
      reorderedResult.tag !== "supported"
    ) {
      return;
    }
    expect(reorderedResult.admitted.facts).toEqual(
      originalResult.admitted.facts,
    );
  });

  test("recognizes Spiritual Weapon repeat roles after composite-effect reordering", () => {
    const base = spellRecord("spiritual_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a4_spiritual_weapon_reordered",
      name: "Synthetic A4 Spiritual Weapon Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a4_spiritual_weapon_reordered",
      },
      mechanics: {
        ...base.mechanics,
        operations: base.mechanics.operations.map((operation) =>
          operation.effect.kind !== "composite_ongoing"
            ? operation
            : {
                ...operation,
                effect: {
                  ...operation.effect,
                  effects: [...operation.effect.effects].reverse(),
                },
              },
        ),
      },
    });
    const result = spatialMeleeSpellAttackProxyProfile.admitMechanics(
      mechanicsSource(reordered),
    );
    expect(result.tag).toBe("supported");
  });

  test("fails closed when Hunter's Mark adds an unowned operation", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const extraOperation = base.mechanics.operations[0];
    if (extraOperation === undefined) {
      throw new Error("Expected a Hunter's Mark operation.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a4_hunters_mark_extra_operation",
      name: "Synthetic A4 Hunter's Mark Extra Operation",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a4_hunters_mark_extra_operation",
      },
      mechanics: {
        ...base.mechanics,
        operations: [...base.mechanics.operations, extraOperation],
      },
    });
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(malformed),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ failedFact: "operationCount" }),
      ]),
    );
  });
});

function mechanicsSourceFromSource(
  source: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}
