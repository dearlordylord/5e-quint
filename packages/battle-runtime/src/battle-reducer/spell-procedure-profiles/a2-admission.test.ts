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
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { duplicateHitInterceptionProfile } from "./duplicate-hit-interception.ts";
import { spellDurationEvidencePaths } from "./spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./profile.ts";

function mechanicsSource(spellId: string) {
  return mechanicsSourceFromSpell(spellRecord(spellId));
}

function mechanicsSourceFromSpell(spell: ReturnType<typeof spellRecord>) {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

type InvalidDirectEffectFixture =
  | readonly []
  | readonly [{ readonly kind: "none" }];

function spellWithInvalidDirectEffects(
  base: ReturnType<typeof spellRecord>,
  effects: InvalidDirectEffectFixture,
): ReturnType<typeof spellRecord> {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  const [firstPhase, ...remainingPhases] = base.mechanics.phases;
  const withInvalidEffects = (phase: typeof firstPhase) =>
    phase.kind !== "direct"
      ? phase
      : Object.defineProperty({ ...phase }, "effects", {
          configurable: true,
          enumerable: true,
          // These fixtures intentionally bypass the Surface effect schema
          // so admission can report the owned path for malformed effects.
          value: effects,
          writable: true,
        });
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      phases: [
        withInvalidEffects(firstPhase),
        ...remainingPhases.map(withInvalidEffects),
      ],
    },
  };
}

const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

const targetSelectionConstraintMutations = [
  ["typeFilter", { typeFilter: ["beast"] as const }],
  [
    "creatureSizeFilter",
    {
      targetKinds: ["creature"] as const,
      creatureSizeFilter: { kind: "exact", creatureSize: "medium" } as const,
    },
  ],
  [
    "stateFilter",
    {
      targetKinds: ["creature"] as const,
      stateFilter: ["falling"] as const,
    },
  ],
  [
    "disposition",
    { targetKinds: ["creature"] as const, disposition: "willing" as const },
  ],
  [
    "visibility",
    {
      targetKinds: ["creature"] as const,
      visibility: "caster_can_see" as const,
    },
  ],
] as const;

const chainedTargetSelectionConstraintMutations = (
  ["primary", "leap"] as const
).flatMap((branch) =>
  targetSelectionConstraintMutations.map(
    ([name, mutation]) => [branch, name, mutation] as const,
  ),
);

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

function greaterInvisibilityCollisionSpell() {
  const base = spellRecord("invisibility");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_greater_invisibility_collision",
    name: "Synthetic Greater Invisibility Collision",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic_greater_invisibility_collision",
    },
    mechanics: {
      ...base.mechanics,
      level: 4,
      duration: {
        kind: "concentration",
        upTo: { amount: 1, unit: "minute" },
      },
      phases: base.mechanics.phases.map((phase) =>
        phase.kind !== "direct" ||
        phase.attachment.kind !== "hole" ||
        phase.attachment.value.kind !== "target"
          ? phase
          : {
              ...phase,
              attachment: {
                ...phase.attachment,
                value: {
                  ...phase.attachment.value,
                  selection: { mode: "one" },
                },
              },
            },
      ),
    },
  });
}

function greaterRestorationCollisionSpell() {
  const base = spellRecord("lesser_restoration");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_greater_restoration_collision",
    name: "Synthetic Greater Restoration Collision",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic_greater_restoration_collision",
    },
    mechanics: {
      ...base.mechanics,
      level: 5,
      phases: base.mechanics.phases.map((phase) =>
        phase.kind !== "direct"
          ? phase
          : {
              ...phase,
              effects: [
                {
                  kind: "remove_condition",
                  condition: {
                    kind: "choose",
                    from: ["charmed", "petrified"],
                  },
                },
              ],
            },
      ),
    },
  });
}

describe("SR-04G-A2 static spell procedure admission", () => {
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
      id: "synthetic_a2_chained_attack",
      name: "Synthetic Renamed Chain",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_chained_attack",
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
      id: `synthetic_a2_direct_condition_header_${testCase.failedFact}`,
      name: `Synthetic Direct Condition Header ${testCase.failedFact}`,
      provenance: {
        kind: "synthetic-test",
        section: `synthetic_a2_direct_condition_header_${testCase.failedFact}`,
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

  test("accumulates independent direct-removal facts at exact paths", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        level: 1,
        range: { kind: "self" },
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  ...(phase.attachment.kind === "hole" &&
                  phase.attachment.value.kind === "target"
                    ? {
                        value: {
                          ...phase.attachment.value,
                          selection: {
                            mode: "one",
                            targetKinds: ["object"] as const,
                          },
                        },
                      }
                    : {}),
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test.each(targetSelectionConstraintMutations)(
    "rejects unrepresented direct-removal selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("lesser_restoration");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_direct_removal_selection_${_name}`,
        name: `Synthetic Direct Removal Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_direct_removal_selection_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "target"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      selection: {
                        ...phase.attachment.value.selection,
                        ...selectionMutation,
                      },
                    },
                  },
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directConditionRemovalProfile.admitMechanics({
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
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test.each([
    ["removed", []],
    ["replaced", [{ kind: "none" }]],
  ] as const)(
    "keeps direct-removal ownership stable when the owned effect is %s",
    (_name, effects) => {
      const base = spellRecord("lesser_restoration");
      const malformed = spellWithInvalidDirectEffects(base, effects);
      const source = spellAdmissionSource(malformed);
      const result = directConditionRemovalProfile.admitMechanics({
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
      ).toEqual(
        _name === "removed"
          ? [
              {
                failedFact: "effects",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
              {
                failedFact: "condition",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ]
          : [
              {
                failedFact: "condition",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ],
      );
    },
  );

  test("keeps direct-removal ownership stable when only school changes", () => {
    const base = spellRecord("lesser_restoration");
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_removal_school",
      name: "Synthetic Direct Removal School",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_removal_school",
      },
      mechanics: { ...base.mechanics, school: "evocation" },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      {
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
      },
    ]);
  });

  test("keeps direct-removal ownership stable when only attachment changes", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_removal_attachment",
      name: "Synthetic Direct Removal Attachment",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_removal_attachment",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : { ...phase, attachment: { kind: "self" } },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("rejects direct-removal target range origin at the attachment path", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_removal_range_origin",
      name: "Synthetic Direct Removal Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_removal_range_origin",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    ...phase.attachment.value,
                    rangeOrigin: "caster",
                  },
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("reports direct-condition extra duration branches instead of silently consuming them", () => {
    const base = spellRecord("invisibility");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected concentration activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          upTo: { amount: 1, unit: "minute" },
          earlyEnd: [
            ...(base.mechanics.duration.earlyEnd ?? []),
            { kind: "target_makes_attack_roll" },
          ],
        },
      },
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
    ).toEqual([
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(4)),
      },
    ]);
  });

  test.each([
    ["repeatsAllowed", { repeatsAllowed: true }],
    ["typeFilter", { typeFilter: ["beast"] as const }],
    [
      "castingRequirement",
      {
        castingRequirement: {
          kind: "remain_within_spell_range_for_entire_casting",
        } as const,
      },
    ],
  ] as const)(
    "rejects unrepresented direct-condition selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("invisibility");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_direct_condition_selection_${_name}`,
        name: `Synthetic Direct Condition Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_direct_condition_selection_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "target"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      selection: {
                        ...phase.attachment.value.selection,
                        ...selectionMutation,
                      },
                    },
                  },
                },
          ),
        },
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
      ).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test("rejects direct-condition target range origin at the attachment path", () => {
    const base = spellRecord("invisibility");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_condition_range_origin",
      name: "Synthetic Direct Condition Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_condition_range_origin",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    ...phase.attachment.value,
                    rangeOrigin: "spell_sensor",
                  },
                },
              },
        ),
      },
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
    ).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("keeps direct-condition ownership stable when attachment and condition are both malformed", () => {
    const base = spellRecord("invisibility");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_condition_combined",
      name: "Synthetic Direct Condition Combined",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_condition_combined",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    kind: "target",
                    selection: { mode: "one" },
                  },
                },
                effects: (phase.effects ?? []).map((effect) =>
                  effect.kind === "apply_condition"
                    ? { ...effect, condition: "blinded" }
                    : effect,
                ),
              },
        ),
      },
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
    ).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "condition",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("reports direct-removal extras around the actual owned effect", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_removal_reordered",
      name: "Synthetic Direct Removal Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_removal_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                effects: [
                  {
                    kind: "remove_condition",
                    condition: { kind: "choose", from: ["blinded"] },
                  },
                  ...(phase.effects ?? []),
                ],
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      {
        failedFact: "effects",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("reports direct healing extras around the actual owned effect", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_healing_reordered",
      name: "Synthetic Direct Healing Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_healing_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                effects: [
                  {
                    kind: "heal_hp",
                    amount: { kind: "fixed", expr: { dice: 1, dieSize: 4 } },
                    target: "target_creature",
                  },
                  ...(phase.effects ?? []),
                ],
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      {
        failedFact: "effects",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test.each(targetSelectionConstraintMutations)(
    "rejects unrepresented direct-healing selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_direct_healing_selection_${_name}`,
        name: `Synthetic Direct Healing Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_direct_healing_selection_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "target"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      selection: {
                        ...phase.attachment.value.selection,
                        ...selectionMutation,
                      },
                    },
                  },
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test("rejects direct-healing target range origin at the attachment path", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_healing_range_origin",
      name: "Synthetic Direct Healing Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_healing_range_origin",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    ...phase.attachment.value,
                    rangeOrigin: "caster",
                  },
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test.each([
    [
      "occupant disposition filter",
      { occupantDispositionFilter: "friendly_to_source" },
    ],
    [
      "occupant perception filter",
      { occupantPerceptionFilter: "can_see_area_effect" },
    ],
    [
      "excluded areas",
      {
        excludedAreas: {
          chooser: "caster",
          count: "one_or_more",
          size: "any",
        },
      },
    ],
    ["range origin", { rangeOrigin: "caster" }],
    [
      "area target selection constraint",
      {
        selection: {
          mode: "choose_up_to",
          count: 6,
          typeFilter: ["beast"] as const,
        },
      },
    ],
  ] as const)(
    "rejects direct-healing area attachment field %s at attachment path",
    (_name, attachmentMutation) => {
      const base = spellRecord("mass_cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_direct_healing_area_${_name}`,
        name: `Synthetic Direct Healing Area ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_direct_healing_area_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "area"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      ...attachmentMutation,
                    },
                  },
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test.each([
    ["axis", "axis"],
    ["base flat", "baseFlat"],
    ["base ability modifier", "baseAbilityModifier"],
    ["per-level flat", "perLevelFlat"],
    ["per-level die size", "perLevelDieSize"],
  ] as const)(
    "rejects direct-healing amount fields execution cannot project: %s",
    (_name, mutation) => {
      const base = spellRecord("cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_direct_healing_amount_${mutation}`,
        name: `Synthetic Direct Healing Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_direct_healing_amount_${mutation}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct"
              ? phase
              : {
                  ...phase,
                  effects: (phase.effects ?? []).map((effect) =>
                    effect.kind !== "heal_hp" ||
                    effect.amount.kind !== "linear_per_level"
                      ? effect
                      : {
                          ...effect,
                          amount:
                            mutation === "axis"
                              ? { ...effect.amount, axis: "character" }
                              : mutation === "baseFlat"
                                ? {
                                    ...effect.amount,
                                    base: { ...effect.amount.base, flat: 1 },
                                  }
                                : mutation === "baseAbilityModifier"
                                  ? {
                                      ...effect.amount,
                                      base: {
                                        ...effect.amount.base,
                                        abilityModifier: "int",
                                      },
                                    }
                                  : mutation === "perLevelFlat"
                                    ? {
                                        ...effect.amount,
                                        perLevel: {
                                          ...effect.amount.perLevel,
                                          flat: 1,
                                        },
                                      }
                                    : {
                                        ...effect.amount,
                                        perLevel: {
                                          ...effect.amount.perLevel,
                                          dieSize: 6,
                                        },
                                      },
                        },
                  ),
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
        {
          failedFact: "healing",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ]);
    },
  );

  test.each([
    ["removed", []],
    ["replaced", [{ kind: "none" }]],
  ] as const)(
    "keeps direct-healing ownership stable when the owned effect is %s",
    (_name, effects) => {
      const base = spellRecord("cure_wounds");
      const malformed = spellWithInvalidDirectEffects(base, effects);
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
      ).toEqual(
        _name === "removed"
          ? [
              {
                failedFact: "effects",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
              {
                failedFact: "healing",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ]
          : [
              {
                failedFact: "healing",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ],
      );
    },
  );

  test("keeps direct-healing ownership stable when only school changes", () => {
    const base = spellRecord("cure_wounds");
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_healing_school",
      name: "Synthetic Direct Healing School",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_healing_school",
      },
      mechanics: { ...base.mechanics, school: "evocation" },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      {
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
      },
    ]);
  });

  test("keeps direct-healing ownership stable when only attachment changes", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_healing_attachment",
      name: "Synthetic Direct Healing Attachment",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_healing_attachment",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : { ...phase, attachment: { kind: "self" } },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("reports a missing direct-condition duration kind without inventing an ending path", () => {
    const base = spellRecord("invisibility");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected concentration activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_direct_condition_missing_ending",
      name: "Synthetic Direct Condition Missing Ending",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_direct_condition_missing_ending",
      },
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: base.mechanics.duration.earlyEnd?.slice(0, 2),
        },
      },
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
    ).toEqual([
      {
        failedFact: "durationEnding",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    ]);
  });

  test("reports chained leap mutations at their actual repeat ordinals", () => {
    const base = spellRecord("chromatic_orb");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "attack_roll" ||
      base.mechanics.phases[0].continue?.kind !== "repeat"
    ) {
      throw new Error("Expected chained attack mechanics.");
    }
    const attack = base.mechanics.phases[0];
    const continuation = attack.continue;
    if (continuation?.kind !== "repeat") {
      throw new Error("Expected chained repeat continuation.");
    }
    const canonicalLeap = continuation.next[0];
    if (canonicalLeap?.kind !== "attack_roll") {
      throw new Error("Expected chained leap attack.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_chained_reordered",
      name: "Synthetic Chained Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_chained_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...attack,
            continue: {
              ...continuation,
              next: [
                { kind: "direct", attachment: { kind: "self" } },
                {
                  ...canonicalLeap,
                  attachment: { kind: "self" },
                },
                { kind: "direct", attachment: { kind: "self" } },
              ],
            },
          },
        ],
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = chainedSpellAttackDamageProfile.admitMechanics({
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
      {
        failedFact: "leapPhase",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
      {
        failedFact: "leapPhase",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(3),
        ),
      },
      {
        failedFact: "leapAttachment",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(2),
        ),
      },
    ]);
  });

  test("reports chained attack range at its canonical failed path", () => {
    const base = spellRecord("chromatic_orb");
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: { ...base.mechanics, range: { kind: "touch" } },
    });
    const source = spellAdmissionSource(malformed);
    const result = chainedSpellAttackDamageProfile.admitMechanics({
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
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
    ]);
  });

  test("correlates chained hit and leap damage into one canonical amount", () => {
    const base = spellRecord("chromatic_orb");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "attack_roll" ||
      base.mechanics.phases[0].continue?.kind !== "repeat"
    ) {
      throw new Error("Expected chained attack mechanics.");
    }
    const attack = base.mechanics.phases[0];
    const continuation = attack.continue;
    if (continuation?.kind !== "repeat") {
      throw new Error("Expected chained repeat continuation.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_chained_amount_mismatch",
      name: "Synthetic Chained Amount Mismatch",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_chained_amount_mismatch",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...attack,
            continue: {
              ...continuation,
              next: continuation.next.map((phase) =>
                phase.kind !== "attack_roll"
                  ? phase
                  : {
                      ...phase,
                      onHit: phase.onHit.map((effect) =>
                        effect.kind !== "damage" ||
                        effect.amount.kind !== "linear_per_level"
                          ? effect
                          : {
                              ...effect,
                              amount: {
                                ...effect.amount,
                                base: {
                                  ...effect.amount.base,
                                  dice: effect.amount.base.dice + 1,
                                },
                              },
                            },
                      ),
                    },
              ),
            },
          },
        ],
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = chainedSpellAttackDamageProfile.admitMechanics({
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
      {
        failedFact: "leapDamageAmount",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test.each([
    ["base spellcasting modifier", "baseSpellcastingMod"],
    ["per-level flat delta", "perLevelFlat"],
  ] as const)(
    "rejects chained amount %s mismatches at the leap path",
    (_name, mutation) => {
      const base = spellRecord("chromatic_orb");
      if (
        base.mechanics.family !== "activation" ||
        base.mechanics.phases[0]?.kind !== "attack_roll" ||
        base.mechanics.phases[0].continue?.kind !== "repeat"
      ) {
        throw new Error("Expected chained attack mechanics.");
      }
      const attack = base.mechanics.phases[0];
      const continuation = attack.continue;
      if (continuation?.kind !== "repeat") {
        throw new Error("Expected chained repeat continuation.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_chained_amount_${mutation}`,
        name: `Synthetic Chained Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_chained_amount_${mutation}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...attack,
              continue: {
                ...continuation,
                next: continuation.next.map((phase) =>
                  phase.kind !== "attack_roll"
                    ? phase
                    : {
                        ...phase,
                        onHit: phase.onHit.map((effect) =>
                          effect.kind !== "damage" ||
                          effect.amount.kind !== "linear_per_level"
                            ? effect
                            : {
                                ...effect,
                                amount:
                                  mutation === "baseSpellcastingMod"
                                    ? {
                                        ...effect.amount,
                                        base: {
                                          ...effect.amount.base,
                                          spellcastingMod: true,
                                        },
                                      }
                                    : {
                                        ...effect.amount,
                                        perLevel: {
                                          ...effect.amount.perLevel,
                                          flat:
                                            (effect.amount.perLevel.flat ?? 0) +
                                            1,
                                        },
                                      },
                              },
                        ),
                      },
                ),
              },
            },
          ],
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = chainedSpellAttackDamageProfile.admitMechanics({
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
        {
          failedFact: "leapDamageAmount",
          mechanicsPath: spellActivationRepeatPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ]);
    },
  );

  test.each([
    ["equal base spellcasting modifier", "baseSpellcastingMod"],
    ["equal base ability modifier", "baseAbilityModifier"],
    ["equal per-level flat delta", "perLevelFlat"],
    ["equal per-level die-size delta", "perLevelDieSize"],
  ] as const)(
    "rejects equal chained amount %s fields that execution cannot project",
    (_name, mutation) => {
      const base = spellRecord("chromatic_orb");
      if (
        base.mechanics.family !== "activation" ||
        base.mechanics.phases[0]?.kind !== "attack_roll" ||
        base.mechanics.phases[0].continue?.kind !== "repeat"
      ) {
        throw new Error("Expected chained attack mechanics.");
      }
      const attack = base.mechanics.phases[0];
      const continuation = attack.continue;
      if (continuation?.kind !== "repeat") {
        throw new Error("Expected chained repeat continuation.");
      }
      const mutateOnHit = (onHit: typeof attack.onHit) =>
        onHit.map((effect) =>
          effect.kind !== "damage" || effect.amount.kind !== "linear_per_level"
            ? effect
            : {
                ...effect,
                amount:
                  mutation === "baseSpellcastingMod"
                    ? {
                        ...effect.amount,
                        base: {
                          ...effect.amount.base,
                          spellcastingMod: true,
                        },
                      }
                    : mutation === "baseAbilityModifier"
                      ? {
                          ...effect.amount,
                          base: {
                            ...effect.amount.base,
                            abilityModifier: "int",
                          },
                        }
                      : mutation === "perLevelFlat"
                        ? {
                            ...effect.amount,
                            perLevel: {
                              ...effect.amount.perLevel,
                              flat: 1,
                            },
                          }
                        : {
                            ...effect.amount,
                            perLevel: {
                              ...effect.amount.perLevel,
                              dieSize: 6,
                            },
                          },
              },
        );
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_chained_equal_amount_${mutation}`,
        name: `Synthetic Chained Equal Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_chained_equal_amount_${mutation}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...attack,
              onHit: mutateOnHit(attack.onHit),
              continue: {
                ...continuation,
                next: continuation.next.map((phase) =>
                  phase.kind !== "attack_roll"
                    ? phase
                    : { ...phase, onHit: mutateOnHit(phase.onHit) },
                ),
              },
            },
          ],
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = chainedSpellAttackDamageProfile.admitMechanics({
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
        {
          failedFact: "damageAmount",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
        {
          failedFact: "leapDamageAmount",
          mechanicsPath: spellActivationRepeatPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ]);
    },
  );

  test("reports chained continuation extras at their actual nested ordinals", () => {
    const base = spellRecord("chromatic_orb");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "attack_roll" ||
      base.mechanics.phases[0].continue?.kind !== "repeat"
    ) {
      throw new Error("Expected chained attack mechanics.");
    }
    const attack = base.mechanics.phases[0];
    const continuation = attack.continue;
    if (continuation?.kind !== "repeat") {
      throw new Error("Expected chained repeat continuation.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a2_chained_extra",
      name: "Synthetic Chained Extra",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a2_chained_extra",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...attack,
            continue: {
              ...continuation,
              next: [
                { kind: "direct", attachment: { kind: "self" } },
                ...continuation.next,
              ],
            },
          },
        ],
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = chainedSpellAttackDamageProfile.admitMechanics({
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
      {
        failedFact: "leapPhase",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test.each(chainedTargetSelectionConstraintMutations)(
    "rejects unrepresented chained %s selection constraint %s at its attachment path",
    (branch, _name, selectionMutation) => {
      const base = spellRecord("chromatic_orb");
      if (
        base.mechanics.family !== "activation" ||
        base.mechanics.phases[0]?.kind !== "attack_roll" ||
        base.mechanics.phases[0].continue?.kind !== "repeat"
      ) {
        throw new Error("Expected chained attack mechanics.");
      }
      const attack = base.mechanics.phases[0];
      const continuation = attack.continue;
      if (continuation?.kind !== "repeat") {
        throw new Error("Expected chained repeat continuation.");
      }
      const withSelectionMutation = (attachment: typeof attack.attachment) =>
        attachment.kind !== "hole" || attachment.value.kind !== "target"
          ? attachment
          : {
              ...attachment,
              value: {
                ...attachment.value,
                selection: {
                  ...attachment.value.selection,
                  ...selectionMutation,
                },
              },
            };
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_chained_selection_${branch}_${_name}`,
        name: `Synthetic Chained Selection ${branch} ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_chained_selection_${branch}_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...attack,
              attachment:
                branch === "primary"
                  ? withSelectionMutation(attack.attachment)
                  : attack.attachment,
              continue: {
                ...continuation,
                next: continuation.next.map((phase) =>
                  branch === "leap" && phase.kind === "attack_roll"
                    ? {
                        ...phase,
                        attachment: withSelectionMutation(phase.attachment),
                      }
                    : phase,
                ),
              },
            },
          ],
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = chainedSpellAttackDamageProfile.admitMechanics({
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
        {
          failedFact: branch === "primary" ? "attachment" : "leapAttachment",
          mechanicsPath:
            branch === "primary"
              ? spellActivationAttachmentPath(PositiveInteger(1))
              : spellActivationRepeatPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
        },
      ]);
    },
  );

  test.each(["primary", "leap"] as const)(
    "rejects chained %s target range origin at its attachment path",
    (branch) => {
      const base = spellRecord("chromatic_orb");
      if (
        base.mechanics.family !== "activation" ||
        base.mechanics.phases[0]?.kind !== "attack_roll" ||
        base.mechanics.phases[0].continue?.kind !== "repeat"
      ) {
        throw new Error("Expected chained attack mechanics.");
      }
      const attack = base.mechanics.phases[0];
      const continuation = attack.continue;
      if (continuation?.kind !== "repeat") {
        throw new Error("Expected chained repeat continuation.");
      }
      const withRangeOrigin = (attachment: typeof attack.attachment) =>
        attachment.kind !== "hole" || attachment.value.kind !== "target"
          ? attachment
          : {
              ...attachment,
              value: {
                ...attachment.value,
                rangeOrigin: "caster",
              },
            };
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a2_chained_range_origin_${branch}`,
        name: `Synthetic Chained Range Origin ${branch}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a2_chained_range_origin_${branch}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...attack,
              attachment:
                branch === "primary"
                  ? withRangeOrigin(attack.attachment)
                  : attack.attachment,
              continue: {
                ...continuation,
                next: continuation.next.map((phase) =>
                  branch === "leap" && phase.kind === "attack_roll"
                    ? {
                        ...phase,
                        attachment: withRangeOrigin(phase.attachment),
                      }
                    : phase,
                ),
              },
            },
          ],
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = chainedSpellAttackDamageProfile.admitMechanics({
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
        {
          failedFact: branch === "primary" ? "attachment" : "leapAttachment",
          mechanicsPath:
            branch === "primary"
              ? spellActivationAttachmentPath(PositiveInteger(1))
              : spellActivationRepeatPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
        },
      ]);
    },
  );

  test("reports direct healing range at its canonical failed path", () => {
    const base = spellRecord("cure_wounds");
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: { ...base.mechanics, range: { kind: "self" } },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
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
