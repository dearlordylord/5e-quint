import { describe, expect, expectTypeOf, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationExtensionPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { duplicateHitInterceptionProfile } from "./duplicate-hit-interception.ts";
import { spellDurationEvidencePaths } from "./spell-mechanics-admission.ts";

import {
  mechanicsSource,
  mechanicsSourceFromSpell,
  headers,
  spellAdmissionActor,
  greaterInvisibilityCollisionSpell,
  renamedSpell,
  greaterRestorationCollisionSpell,
} from "./activation-spell-procedure-admission.test-support.js";

describe("Spell procedure closure and evidence admission", () => {
  test.each([
    [
      "chainedSpellAttackDamage",
      chainedSpellAttackDamageProfile,
      "chromatic_orb",
      [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
        spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(1)),
        spellMaterialComponentPath("cost"),
      ],
    ],
    [
      "directConditionRemoval",
      directConditionRemovalProfile,
      "lesser_restoration",
      [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "directCondition",
      directConditionProfile,
      "invisibility",
      [
        ...headers,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(2)),
        spellDurationEndingPath(PositiveInteger(3)),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "directHitPointRestoration",
      directHitPointRestorationProfile,
      "cure_wounds",
      [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "duplicateHitInterception",
      duplicateHitInterceptionProfile,
      "mirror_image",
      [...headers, spellDurationValuePath()],
    ],
  ] as const)(
    "supports %s with exact owned evidence",
    (_name, profile, spellId, expected) => {
      const result = profile.admitMechanics(mechanicsSource(spellId));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
      expect(result.admitted.facts).not.toHaveProperty("rangeFeet");
      expect(result.admitted.facts).not.toHaveProperty("durationTicks");
      if (_name === "chainedSpellAttackDamage") {
        expect(result.admitted.facts).not.toHaveProperty("leapDamageAmount");
      }
    },
  );

  test("keeps recognition, facts, and evidence invariant under authored renaming", () => {
    const original = spellRecord("chromatic_orb");
    const renamed = decodeSpellRecordForTest({
      ...original,
      id: "synthetic_activation_chained_attack",
      name: "Synthetic Renamed Chain",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_chained_attack",
      },
    });
    const originalResult = chainedSpellAttackDamageProfile.admitMechanics(
      mechanicsSource("chromatic_orb"),
    );
    const renamedSource = spellAdmissionSource(renamed);
    const renamedResult = chainedSpellAttackDamageProfile.admitMechanics({
      mechanics: renamedSource.mechanics,
      spellDefinitionRuleFacts: renamedSource.spellDefinitionRuleFacts,
    });
    expect(renamedResult.tag).toBe(originalResult.tag);
    if (
      originalResult.tag !== "supported" ||
      renamedResult.tag !== "supported"
    ) {
      return;
    }
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("binds each supported closure to mechanics-free execution", () => {
    const cases = [
      {
        profile: chainedSpellAttackDamageProfile,
        spell: spellRecord("chromatic_orb"),
      },
      {
        profile: directConditionRemovalProfile,
        spell: spellRecord("lesser_restoration"),
      },
      { profile: directConditionProfile, spell: spellRecord("invisibility") },
      {
        profile: directHitPointRestorationProfile,
        spell: spellRecord("cure_wounds"),
      },
      {
        profile: duplicateHitInterceptionProfile,
        spell: spellRecord("mirror_image"),
      },
    ] as const;
    const actor = spellAdmissionActor();
    for (const { profile, spell } of cases) {
      const source = spellAdmissionSource(spell);
      const result = profile.admitMechanics({
        mechanics: source.mechanics,
        spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
      });
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        {
          actor,
          castingSource: source.castingSource,
          battle: undefined,
          spellCastOptions: [
            { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
            { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
          ],
        },
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    }
  });

  test("retains literal duration facts and derives their total closure ticks", () => {
    const directSource = spellAdmissionSource(spellRecord("invisibility"));
    const directResult = directConditionProfile.admitMechanics({
      mechanics: directSource.mechanics,
      spellDefinitionRuleFacts: directSource.spellDefinitionRuleFacts,
    });
    expect(directResult.tag).toBe("supported");
    if (directResult.tag !== "supported") return;
    expectTypeOf(
      directResult.admitted.facts.duration.upTo.unit,
    ).toEqualTypeOf<"hour">();
    expectTypeOf(
      directResult.admitted.facts.duration.upTo.amount,
    ).toEqualTypeOf<PositiveInteger & 1>();
    expect(directResult.admitted.facts.duration.upTo).toEqual({
      amount: 1,
      unit: "hour",
    });
    const directInvocations = directResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(directSource),
      {
        actor: spellAdmissionActor(),
        castingSource: directSource.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(directInvocations).toHaveLength(1);
    expect(directInvocations[0]).toMatchObject({
      activeEffect: {
        expiresAt: {
          durationTicks: 600,
        },
      },
    });

    const duplicateSource = spellAdmissionSource(spellRecord("mirror_image"));
    const duplicateResult = duplicateHitInterceptionProfile.admitMechanics({
      mechanics: duplicateSource.mechanics,
      spellDefinitionRuleFacts: duplicateSource.spellDefinitionRuleFacts,
    });
    expect(duplicateResult.tag).toBe("supported");
    if (duplicateResult.tag !== "supported") return;
    expectTypeOf(
      duplicateResult.admitted.facts.duration.value.unit,
    ).toEqualTypeOf<"minute">();
    expectTypeOf(
      duplicateResult.admitted.facts.duration.value.amount,
    ).toEqualTypeOf<PositiveInteger & 1>();
    expect(duplicateResult.admitted.facts.duration.value).toEqual({
      amount: 1,
      unit: "minute",
    });
    const duplicateInvocations = duplicateResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(duplicateSource),
      {
        actor: spellAdmissionActor(),
        castingSource: duplicateSource.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(duplicateInvocations).toHaveLength(1);
    expect(duplicateInvocations[0]).toMatchObject({
      activeEffect: {
        expiresAt: {
          durationTicks: 10,
        },
      },
    });
  });

  test("does not claim sibling procedure shapes", () => {
    expect(
      directConditionProfile.admitMechanics(mechanicsSource("cure_wounds")),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directConditionProfile.admitMechanics(
        mechanicsSourceFromSpell(greaterInvisibilityCollisionSpell()),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directConditionProfile.admitMechanics(mechanicsSource("spider_climb")),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directConditionProfile.admitMechanics(
        mechanicsSourceFromSpell(
          renamedSpell("spider_climb", "synthetic_activation_climb_grant"),
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directConditionRemovalProfile.admitMechanics(
        mechanicsSource("invisibility"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directConditionRemovalProfile.admitMechanics(
        mechanicsSourceFromSpell(greaterRestorationCollisionSpell()),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      directHitPointRestorationProfile.admitMechanics(
        mechanicsSource("magic_missile"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      chainedSpellAttackDamageProfile.admitMechanics(
        mechanicsSource("fire_bolt"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      duplicateHitInterceptionProfile.admitMechanics(
        mechanicsSource("chromatic_orb"),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each([
    {
      failedFact: "level",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) => ({ ...mechanics, level: 3 }) as const,
      expected: [
        {
          failedFact: "level",
          mechanicsPath: spellMechanicsHeaderPath("level"),
        },
      ],
    },
    {
      failedFact: "school",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) => ({ ...mechanics, school: "transmutation" }) as const,
      expected: [
        {
          failedFact: "school",
          mechanicsPath: spellMechanicsHeaderPath("school"),
        },
      ],
    },
    {
      failedFact: "components",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) =>
        ({ ...mechanics, components: { v: true, s: true, m: false } }) as const,
      expected: [
        {
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
        },
      ],
    },
    {
      failedFact: "castingTime",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) => ({ ...mechanics, castingTime: { kind: "bonus_action" } }) as const,
      expected: [
        {
          failedFact: "castingTime",
          mechanicsPath: spellMechanicsHeaderPath("castingTime"),
        },
      ],
    },
    {
      failedFact: "range",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) => ({ ...mechanics, range: { kind: "self" } }) as const,
      expected: [
        {
          failedFact: "range",
          mechanicsPath: spellMechanicsHeaderPath("range"),
        },
      ],
    },
    {
      failedFact: "duration",
      mechanics: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) =>
        ({
          ...mechanics,
          duration: {
            kind: "timed",
            value: { amount: 1, unit: "minute" },
          },
        }) as const,
      expected: [
        {
          failedFact: "duration",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        },
        {
          failedFact: "duration",
          mechanicsPath: spellDurationValuePath(),
        },
      ],
    },
  ] as const)("keeps owned header mutation %s represented", (testCase) => {
    const base = spellRecord("invisibility");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: `synthetic_activation_direct_condition_header_${testCase.failedFact}`,
      name: `Synthetic Direct Condition Header ${testCase.failedFact}`,
      provenance: {
        kind: "synthetic-test",
        section: `synthetic_activation_direct_condition_header_${testCase.failedFact}`,
      },
      mechanics: testCase.mechanics(base.mechanics),
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual(testCase.expected);
  });

  test("uses top-level coordinates for slot-tiered duration evidence", () => {
    const duration: SpellMechanics["duration"] = {
      kind: "slot_tiered",
      base: {
        kind: "concentration",
        upTo: { amount: 1, unit: "hour" },
        earlyEnd: [{ kind: "target_makes_attack_roll" }],
      },
      tiers: [
        {
          atSlot: 2,
          duration: {
            kind: "timed",
            value: { amount: 1, unit: "minute" },
            earlyEnd: [{ kind: "target_deals_damage" }],
          },
        },
        {
          atSlot: 3,
          duration: {
            kind: "permanent",
            endsOn: ["dispel"],
          },
        },
      ],
    };
    expect(spellDurationEvidencePaths(duration)).toEqual([
      spellDurationValuePath(),
      spellDurationExtensionPath(PositiveInteger(1)),
      spellDurationExtensionPath(PositiveInteger(2)),
    ]);
  });

  test("reports duplicate interception duration value at its canonical path", () => {
    const base = spellRecord("mirror_image");
    if (base.mechanics.duration.kind !== "timed") {
      throw new Error("Expected timed duplicate-interception mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          value: { amount: 2, unit: "minute" },
        },
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = duplicateHitInterceptionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
    ]);
  });
});
