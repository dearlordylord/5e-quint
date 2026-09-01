import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
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
import { fallingCreatureMitigationReactionProfile } from "./falling-creature-mitigation-reaction.ts";
import { makeStableProfile } from "./make-stable.ts";
import { perceptionGatedAttackRollDefenseProfile } from "./perception-gated-attack-roll-defense.ts";
import { spellCastInterruptionReactionProfile } from "./spell-cast-interruption-reaction.ts";
import { triggeredArmorDefenseProfile } from "./triggered-armor-defense.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";

const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function mechanicsSource(spellId: string): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function mechanicsSourceFromSpell(
  spell: ReturnType<typeof spellRecord>,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
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

function renamedSpell(base: ReturnType<typeof spellRecord>, suffix: string) {
  return decodeSpellRecordForTest({
    ...base,
    id: `synthetic_a3_${suffix}`,
    name: `Synthetic A3 ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_a3_${suffix}`,
    },
  });
}

function spellWithInvalidDirectEffects(
  base: ReturnType<typeof spellRecord>,
  effects: readonly [] | readonly [{ readonly kind: "none" }],
): ReturnType<typeof spellRecord> {
  if (
    base.mechanics.family !== "activation" &&
    base.mechanics.family !== "triggered_reaction"
  ) {
    throw new Error("Expected phased spell mechanics.");
  }
  const [firstPhase, ...remainingPhases] = base.mechanics.phases;
  const withInvalidEffects = (phase: typeof firstPhase) =>
    phase.kind !== "direct"
      ? phase
      : Object.defineProperty({ ...phase }, "effects", {
          configurable: true,
          enumerable: true,
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

function issuesOf(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}) {
  return result.tag === "unsupported"
    ? result.issues?.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("SR-04G-A3 static spell procedure admission", () => {
  test.each([
    [
      "makeStable",
      makeStableProfile,
      "spare_the_dying",
      [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "fallingCreatureMitigationReaction",
      fallingCreatureMitigationReactionProfile,
      "feather_fall",
      [
        ...headers,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "perceptionGatedAttackRollDefense",
      perceptionGatedAttackRollDefenseProfile,
      "blur",
      [
        ...headers,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "spellCastInterruptionReaction",
      spellCastInterruptionReactionProfile,
      "counterspell",
      [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "triggeredArmorDefense",
      triggeredArmorDefenseProfile,
      "shield",
      [
        ...headers,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
      ],
    ],
  ] as const)(
    "supports %s with complete owned evidence",
    (_name, profile, id, expected) => {
      const result = profile.admitMechanics(mechanicsSource(id));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
    },
  );

  test("keeps recognition, facts, and evidence invariant under authored renaming", () => {
    const cases = [
      ["makeStable", makeStableProfile, "spare_the_dying"],
      [
        "fallingCreatureMitigationReaction",
        fallingCreatureMitigationReactionProfile,
        "feather_fall",
      ],
      [
        "perceptionGatedAttackRollDefense",
        perceptionGatedAttackRollDefenseProfile,
        "blur",
      ],
      [
        "spellCastInterruptionReaction",
        spellCastInterruptionReactionProfile,
        "counterspell",
      ],
      ["triggeredArmorDefense", triggeredArmorDefenseProfile, "shield"],
    ] as const;
    for (const [name, profile, id] of cases) {
      const original = spellRecord(id);
      const originalResult = profile.admitMechanics(
        mechanicsSourceFromSpell(original),
      );
      const renamedResult = profile.admitMechanics(
        mechanicsSourceFromSpell(renamedSpell(original, name)),
      );
      expect(renamedResult.tag).toBe(originalResult.tag);
      if (
        originalResult.tag !== "supported" ||
        renamedResult.tag !== "supported"
      ) {
        continue;
      }
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    }
  });

  test("binds each supported closure to a mechanics-free execution source", () => {
    const cases = [
      [makeStableProfile, "spare_the_dying"],
      [fallingCreatureMitigationReactionProfile, "feather_fall"],
      [perceptionGatedAttackRollDefenseProfile, "blur"],
      [spellCastInterruptionReactionProfile, "counterspell"],
      [triggeredArmorDefenseProfile, "shield"],
    ] as const;
    const actor = spellAdmissionActor();
    for (const [profile, id] of cases) {
      const authored = spellAdmissionSource(spellRecord(id));
      const result = profile.admitMechanics({
        mechanics: authored.mechanics,
        spellDefinitionRuleFacts: authored.spellDefinitionRuleFacts,
      });
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(authored),
        {
          actor,
          castingSource: authored.castingSource,
          battle: undefined,
          spellCastOptions: [
            { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
          ],
        },
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    }
  });

  test("projects only source-backed runtime facts", () => {
    const feather = fallingCreatureMitigationReactionProfile.admitMechanics(
      mechanicsSource("feather_fall"),
    );
    expect(feather.tag).toBe("supported");
    if (feather.tag === "supported") {
      expect(feather.admitted.facts.durationTicks).toBe(10);
      expect(feather.admitted.facts.maxTargets).toBe(5);
    }

    const counterspell = spellCastInterruptionReactionProfile.admitMechanics(
      mechanicsSource("counterspell"),
    );
    expect(counterspell.tag).toBe("supported");
    if (counterspell.tag === "supported") {
      expect(counterspell.admitted.facts.triggerComponents).toEqual([
        "V",
        "S",
        "M",
      ]);
      expect(counterspell.admitted.facts.ability).toBe("con");
      expect(counterspell.admitted.facts.dc).toEqual({
        kind: "caster_spell_save_dc",
      });
    }

    const shield = triggeredArmorDefenseProfile.admitMechanics(
      mechanicsSource("shield"),
    );
    expect(shield.tag).toBe("supported");
    if (shield.tag === "supported") {
      expect(shield.admitted.facts.armorClassBonus).toBe(5);
      expect(shield.admitted.facts.negatesRepeatedDamageAllocation).toBe(true);
    }
  });

  test("does not claim sibling or Fire Bolt shapes", () => {
    expect(
      makeStableProfile.admitMechanics(mechanicsSource("fire_bolt")),
    ).toEqual({ tag: "notRepresented" });
    expect(
      fallingCreatureMitigationReactionProfile.admitMechanics(
        mechanicsSource("counterspell"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      perceptionGatedAttackRollDefenseProfile.admitMechanics(
        mechanicsSource("invisibility"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      perceptionGatedAttackRollDefenseProfile.admitMechanics(
        mechanicsSource("haste"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      perceptionGatedAttackRollDefenseProfile.admitMechanics(
        mechanicsSource("protection_from_evil_and_good"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      spellCastInterruptionReactionProfile.admitMechanics(
        mechanicsSource("feather_fall"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      triggeredArmorDefenseProfile.admitMechanics(
        mechanicsSource("feather_fall"),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates independent Counterspell root, trigger, attachment, and save facts", () => {
    const base = spellRecord("counterspell");
    if (
      base.mechanics.family !== "triggered_reaction" ||
      base.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Counterspell triggered save mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Counterspell target attachment hole.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a3_counterspell_multiple_issues",
      name: "Synthetic A3 Counterspell Multiple Issues",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a3_counterspell_multiple_issues",
      },
      mechanics: {
        ...base.mechanics,
        level: 2,
        range: { kind: "self" },
        castingTime: {
          kind: "reaction",
          trigger: {
            kind: "creature_casts_spell",
            components: ["V", "S", "M"],
            spellLevelAtMost: 3,
          },
        },
        phases: [
          {
            ...phase,
            attachment: {
              ...phase.attachment,
              value: {
                ...phase.attachment.value,
                selection: { mode: "one", targetKinds: ["object"] },
              },
            },
            ability: "str",
            dc: { kind: "fixed", dc: 12 },
            onFail: { kind: "reflect_triggering_spell" },
          },
        ],
      },
    });
    const result = spellCastInterruptionReactionProfile.admitMechanics(
      mechanicsSourceFromSpell(malformed),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "trigger",
        mechanicsPath: spellMechanicsHeaderPath("castingTime"),
      },
      {
        failedFact: "saveGate",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "effects",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("keeps Shield trigger roles and effect roles order-independent", () => {
    const base = spellRecord("shield");
    if (
      base.mechanics.family !== "triggered_reaction" ||
      base.mechanics.castingTime.kind !== "reaction" ||
      base.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Shield triggered direct mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a3_shield_reordered",
      name: "Synthetic A3 Shield Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a3_shield_reordered",
      },
      mechanics: {
        ...base.mechanics,
        castingTime: {
          ...base.mechanics.castingTime,
          trigger: {
            kind: "any_of",
            triggers: [
              {
                kind: "targeted_by_named_spell",
                spellId: "magic_missile",
              },
              { kind: "hit_by_attack_roll" },
            ],
          },
        },
        phases: [
          {
            ...phase,
            effects: [...(phase.effects ?? [])].reverse(),
          },
        ],
      },
    });
    const original = triggeredArmorDefenseProfile.admitMechanics(
      mechanicsSource("shield"),
    );
    const result = triggeredArmorDefenseProfile.admitMechanics(
      mechanicsSourceFromSpell(reordered),
    );
    expect(result.tag).toBe("supported");
    if (original.tag === "supported" && result.tag === "supported") {
      expect(result.admitted.facts).toEqual(original.admitted.facts);
      expect(result.admitted.evidence).toEqual(original.admitted.evidence);
    }
  });

  test.each([
    ["makeStable", makeStableProfile, "spare_the_dying"],
    [
      "fallingCreatureMitigationReaction",
      fallingCreatureMitigationReactionProfile,
      "feather_fall",
    ],
    [
      "perceptionGatedAttackRollDefense",
      perceptionGatedAttackRollDefenseProfile,
      "blur",
    ],
    ["triggeredArmorDefense", triggeredArmorDefenseProfile, "shield"],
  ] as const)(
    "uses actual semantic phase ordinals for %s",
    (_name, profile, id) => {
      const base = spellRecord(id);
      if (
        (base.mechanics.family !== "activation" &&
          base.mechanics.family !== "triggered_reaction") ||
        base.mechanics.phases[0]?.kind !== "direct"
      ) {
        throw new Error("Expected a direct phased spell mechanics fixture.");
      }
      const phase = base.mechanics.phases[0];
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_a3_${id}_late_phase`,
        name: `Synthetic A3 ${id} Late Phase`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a3_${id}_late_phase`,
        },
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...phase,
              ...(id === "spare_the_dying"
                ? { attachment: { kind: "self" } }
                : {}),
              effects: [{ kind: "none" }],
            },
            phase,
          ],
        },
      });
      const result = profile.admitMechanics(
        mechanicsSourceFromSpell(malformed),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "phaseCount",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
        },
        {
          failedFact: "phaseOrder",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
        },
      ]);
    },
  );

  test("uses the actual semantic Counterspell save-gate ordinal", () => {
    const base = spellRecord("counterspell");
    if (
      base.mechanics.family !== "triggered_reaction" ||
      base.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected a Counterspell save-gate fixture.");
    }
    const phase = base.mechanics.phases[0];
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a3_counterspell_late_save_gate",
      name: "Synthetic A3 Counterspell Late Save Gate",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a3_counterspell_late_save_gate",
      },
      mechanics: {
        ...base.mechanics,
        phases: [{ ...phase, onFail: { kind: "none" } }, phase],
      },
    });
    const result = spellCastInterruptionReactionProfile.admitMechanics(
      mechanicsSourceFromSpell(malformed),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "phaseCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
      {
        failedFact: "phaseOrder",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
      },
    ]);
  });

  test.each([
    ["makeStable", makeStableProfile, "spare_the_dying"],
    [
      "fallingCreatureMitigationReaction",
      fallingCreatureMitigationReactionProfile,
      "feather_fall",
    ],
    [
      "perceptionGatedAttackRollDefense",
      perceptionGatedAttackRollDefenseProfile,
      "blur",
    ],
  ] as const)("keeps %s effect ownership fail-closed", (_name, profile, id) => {
    const base = spellRecord(id);
    const result = profile.admitMechanics(
      mechanicsSourceFromSpell(spellWithInvalidDirectEffects(base, [])),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "effects",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        }),
      ]),
    );
  });

  test("rejects optional Blur duration endings and optional effect scope", () => {
    const base = spellRecord("blur");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Blur activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_a3_blur_optional_fields",
      name: "Synthetic A3 Blur Optional Fields",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_a3_blur_optional_fields",
      },
      mechanics: {
        ...base.mechanics,
        duration: {
          kind: "concentration",
          upTo: { amount: 1, unit: "minute" },
          earlyEnd: [{ kind: "target_makes_attack_roll" }],
        },
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                effects: [
                  {
                    kind: "modify_roll_advantage",
                    mode: "disadvantage",
                    on: ["attack_roll"],
                    affects: "self_roll",
                  },
                ],
              },
        ),
      },
    });
    const result = perceptionGatedAttackRollDefenseProfile.admitMechanics(
      mechanicsSourceFromSpell(malformed),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "effect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });
});
