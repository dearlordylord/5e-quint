import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Result, Schema } from "effect";
import { MarkedDamageRiderAbilityCheckBehaviorSchema } from "../../active-effect/codecs.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { zeroAbilityWeaponAttack } from "../../unit-profile-admission-creature-fixture.test-support.ts";
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
import {
  SpellHostedWeaponAttackInvocationSchema,
  spellHostedWeaponAttackProfile,
} from "./spell-hosted-weapon-attack.ts";
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

function mechanicsSourceWithBaseDefinitionFacts(
  base: ReturnType<typeof spellRecord>,
  mechanics: ReturnType<typeof spellRecord>["mechanics"],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(base);
  return {
    mechanics,
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
  { profile: markedDamageRiderProfile, spellId: "hex" },
  {
    profile: spatialMeleeSpellAttackProxyProfile,
    spellId: "spiritual_weapon",
  },
  { profile: spellAttackSequenceProfile, spellId: "scorching_ray" },
  { profile: spellAttackSequenceProfile, spellId: "eldritch_blast" },
  { profile: spellHostedWeaponAttackProfile, spellId: "true_strike" },
  {
    profile: weaponAttackDamageEnhancementProfile,
    spellId: "magic_weapon",
  },
] as const;

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

  test.each([
    ["hunters_mark", "hex", 3],
    ["hex", "hunters_mark", 2],
  ] as const)(
    "rejects the %s structural variant when mixed with %s correlated facts",
    (baseSpellId, crossedSpellId, crossedDurationTierCount) => {
      const base = spellRecord(baseSpellId);
      const crossed = spellRecord(crossedSpellId);
      if (
        base.mechanics.family !== "ongoing_effect" ||
        crossed.mechanics.family !== "ongoing_effect"
      ) {
        throw new Error("Expected marked-rider ongoing-effect mechanics.");
      }
      const result = markedDamageRiderProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          components: crossed.mechanics.components,
          duration: crossed.mechanics.duration,
          attachment: crossed.mechanics.attachment,
          operations: crossed.mechanics.operations,
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
        },
        {
          failedFact: "duration",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        },
        {
          failedFact: "durationValue",
          mechanicsPath: spellDurationValuePath(),
        },
        ...Array.from({ length: crossedDurationTierCount }, (_, index) => ({
          failedFact: "durationExtension",
          mechanicsPath: spellDurationExtensionPath(PositiveInteger(index + 1)),
        })),
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
        {
          failedFact: "damageEffect",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
        },
        {
          failedFact: "abilityScope",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
        },
      ]);
    },
  );

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

  test("retains Hex ownership and accumulates exact issues after attachment deletion", () => {
    const base = spellRecord("hex");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = {
      ...base.mechanics,
      range: { kind: "self" as const },
    };
    Reflect.deleteProperty(mechanics, "attachment");
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its selection is deleted", () => {
    const base = spellRecord("hunters_mark");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.attachment.kind !== "hole" ||
      base.mechanics.attachment.value.kind !== "mark"
    ) {
      throw new Error("Expected mark attachment mechanics.");
    }
    const markValue = { ...base.mechanics.attachment.value };
    Reflect.deleteProperty(markValue, "selection");
    const malformed = {
      ...base,
      mechanics: {
        ...base.mechanics,
        attachment: { ...base.mechanics.attachment, value: markValue },
      },
    };
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its selection is replaced", () => {
    const base = spellRecord("hex");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.attachment.kind !== "hole" ||
      base.mechanics.attachment.value.kind !== "mark"
    ) {
      throw new Error("Expected mark attachment mechanics.");
    }
    const mechanics = {
      ...base.mechanics,
      attachment: {
        ...base.mechanics.attachment,
        value: {
          ...base.mechanics.attachment.value,
          selection: {
            mode: "one" as const,
            targetKinds: ["object"] as const,
          },
        },
      },
    };
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its attachment is replaced", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains Eldritch Blast ownership and accumulates exact issues after attachment deletion", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const [hitEffect, ...remainingHitEffects] = phase.onHit;
    if (hitEffect.kind !== "damage") {
      throw new Error("Expected attack damage mechanics.");
    }
    const malformedPhase = {
      ...phase,
      onHit: [
        { ...hitEffect, damageType: "cold" as const },
        ...remainingHitEffects,
      ] as const,
    };
    Reflect.deleteProperty(malformedPhase, "attachment");
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [malformedPhase],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "targeting",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "damageType",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("retains attack-sequence ownership after its selection is deleted", () => {
    const base = spellRecord("scorching_ray");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (
      phase?.kind !== "attack_roll" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected attack target mechanics.");
    }
    const targetValue = { ...phase.attachment.value };
    Reflect.deleteProperty(targetValue, "selection");
    const malformedPhase = {
      ...phase,
      attachment: { ...phase.attachment, value: targetValue },
    };
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [malformedPhase],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "targeting",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("retains attack-sequence ownership after its selection is replaced", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (
      phase?.kind !== "attack_roll" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected attack target mechanics.");
    }
    const malformedPhase = {
      ...phase,
      attachment: {
        ...phase.attachment,
        value: {
          ...phase.attachment.value,
          selection: {
            mode: "one" as const,
            targetKinds: ["creature", "object"] as const,
          },
        },
      },
    };
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [malformedPhase],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "targeting",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("retains attack-sequence ownership after its attachment is replaced", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const malformedPhase = Object.defineProperty({ ...phase }, "attachment", {
      configurable: true,
      enumerable: true,
      value: { kind: "self" },
      writable: true,
    });
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [malformedPhase],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "targeting",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("reports deleted and replaced hosted-weapon attachments at the exact path", () => {
    const base = spellRecord("true_strike");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected direct mechanics.");
    }
    const deletedAttachment = { ...phase };
    Reflect.deleteProperty(deletedAttachment, "attachment");
    const replacedAttachment = Object.defineProperty(
      { ...phase },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self", unexpected: true },
        writable: true,
      },
    );
    for (const malformedPhase of [deletedAttachment, replacedAttachment]) {
      const result = spellHostedWeaponAttackProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          phases: [malformedPhase],
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    }
  });

  test("reports deleted and replaced weapon-enhancement attachments at the exact path", () => {
    const base = spellRecord("magic_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const deletedAttachment = { ...base.mechanics };
    Reflect.deleteProperty(deletedAttachment, "attachment");
    const replacedAttachment = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    for (const mechanics of [deletedAttachment, replacedAttachment]) {
      const result = weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
      ]);
    }
  });

  test("reports the full dependent issue set for deleted and replaced spatial-proxy attachments", () => {
    const base = spellRecord("spiritual_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const deletedAttachment = { ...base.mechanics };
    Reflect.deleteProperty(deletedAttachment, "attachment");
    const replacedAttachment = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    for (const mechanics of [deletedAttachment, replacedAttachment]) {
      const result = spatialMeleeSpellAttackProxyProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
        {
          failedFact: "initialPhase",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
        {
          failedFact: "initialAttack",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
        {
          failedFact: "repeatAttack",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
        },
      ]);
    }
  });

  test.each(["eldritch_blast", "scorching_ray"] as const)(
    "retains %s attack-sequence ownership after hit-damage deletion and replacement",
    (spellId) => {
      const base = spellRecord(spellId);
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const phase = base.mechanics.phases[0];
      if (phase?.kind !== "attack_roll") {
        throw new Error("Expected attack-roll mechanics.");
      }
      const deletedDamage = Object.defineProperty({ ...phase }, "onHit", {
        configurable: true,
        enumerable: true,
        value: [],
        writable: true,
      });
      const replacedDamage = Object.defineProperty({ ...phase }, "onHit", {
        configurable: true,
        enumerable: true,
        value: [{ kind: "none" }],
        writable: true,
      });
      for (const malformedPhase of [deletedDamage, replacedDamage]) {
        const result = spellAttackSequenceProfile.admitMechanics(
          mechanicsSourceWithBaseDefinitionFacts(base, {
            ...base.mechanics,
            phases: [malformedPhase],
          }),
        );
        expect(result.tag).toBe("unsupported");
        expect(issuesOf(result)).toEqual([
          {
            failedFact: "hitDamage",
            mechanicsPath: spellActivationEffectPath(
              PositiveInteger(1),
              PositiveInteger(1),
            ),
          },
          {
            failedFact: "damageType",
            mechanicsPath: spellActivationEffectPath(
              PositiveInteger(1),
              PositiveInteger(1),
            ),
          },
        ]);
      }
    },
  );

  test.each([
    { spellId: "eldritch_blast", extraEffect: "none" },
    { spellId: "eldritch_blast", extraEffect: "damage" },
    { spellId: "eldritch_blast", extraEffect: "condition" },
    { spellId: "scorching_ray", extraEffect: "none" },
    { spellId: "scorching_ray", extraEffect: "damage" },
    { spellId: "scorching_ray", extraEffect: "condition" },
  ] as const)(
    "rejects an extra $extraEffect effect for $spellId at the exact path",
    ({ spellId, extraEffect }) => {
      const base = spellRecord(spellId);
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const phase = base.mechanics.phases[0];
      const damageEffect =
        phase?.kind === "attack_roll" && phase.onHit[0]?.kind === "damage"
          ? phase.onHit[0]
          : undefined;
      if (phase?.kind !== "attack_roll" || damageEffect === undefined) {
        throw new Error("Expected attack-roll damage mechanics.");
      }
      const extra =
        extraEffect === "none"
          ? { kind: "none" as const }
          : extraEffect === "damage"
            ? { ...damageEffect }
            : { kind: "apply_condition" as const, condition: "prone" as const };
      const result = spellAttackSequenceProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          phases: [{ ...phase, onHit: [...phase.onHit, extra] }],
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "hitDamage",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        },
      ]);
    },
  );

  test.each(["eldritch_blast", "scorching_ray"] as const)(
    "accumulates every additional %s on-hit effect at its exact path",
    (spellId) => {
      const base = spellRecord(spellId);
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const phase = base.mechanics.phases[0];
      const damageEffect =
        phase?.kind === "attack_roll" && phase.onHit[0]?.kind === "damage"
          ? phase.onHit[0]
          : undefined;
      if (phase?.kind !== "attack_roll" || damageEffect === undefined) {
        throw new Error("Expected attack-roll damage mechanics.");
      }
      const result = spellAttackSequenceProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          phases: [
            {
              ...phase,
              onHit: [
                damageEffect,
                { kind: "none" },
                { ...damageEffect },
                { kind: "apply_condition", condition: "prone" },
              ],
            },
          ],
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual(
        [2, 3, 4].map((effectOrdinal) => ({
          failedFact: "hitDamage",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(effectOrdinal),
          ),
        })),
      );
    },
  );

  test.each([
    ["abilityOverride", "weaponAttackEffect"],
    ["missingDamageTypeChoice", "damageTypeChoice"],
    ["invalidDamageTypeChoice", "damageTypeChoice"],
    ["missingBonusDamage", "bonusDamage"],
    ["invalidBonusDamage", "bonusDamage"],
  ] as const)(
    "reports hosted-weapon $0 mutation as the exact $1 fact",
    (mutation, failedFact) => {
      const base = spellRecord("true_strike");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const phase = base.mechanics.phases[0];
      const weaponEffect =
        phase?.kind === "direct" &&
        phase.effects?.[0]?.kind === "make_weapon_attack"
          ? phase.effects[0]
          : undefined;
      if (phase?.kind !== "direct" || weaponEffect === undefined) {
        throw new Error("Expected hosted weapon-attack mechanics.");
      }
      const malformedEffect = { ...weaponEffect };
      if (mutation === "missingDamageTypeChoice") {
        Reflect.deleteProperty(malformedEffect, "damageTypeChoice");
      } else if (mutation === "missingBonusDamage") {
        Reflect.deleteProperty(malformedEffect, "bonusDamage");
      } else {
        const property =
          mutation === "abilityOverride"
            ? mutation
            : mutation === "invalidDamageTypeChoice"
              ? "damageTypeChoice"
              : "bonusDamage";
        Object.defineProperty(malformedEffect, property, {
          configurable: true,
          enumerable: true,
          value:
            mutation === "abilityOverride"
              ? "dex"
              : mutation === "invalidDamageTypeChoice"
                ? ["radiant", "radiant"]
                : { ...weaponEffect.bonusDamage, damageType: "force" },
          writable: true,
        });
      }
      const result = spellHostedWeaponAttackProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          phases: [{ ...phase, effects: [malformedEffect] }],
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact,
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ]);
    },
  );

  test("carries narrowed authored finding skills and hosted damage choices into projections", () => {
    const marked = spellRecord("hunters_mark");
    if (marked.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const findingEffect = marked.mechanics.operations.find(
      (operation) => operation.effect.kind === "modify_roll_advantage",
    )?.effect;
    const findingSkills =
      findingEffect?.kind === "modify_roll_advantage" &&
      findingEffect.skillFilter?.kind === "fixed"
        ? findingEffect.skillFilter.skills
        : undefined;
    const markedSource = spellAdmissionSource(marked);
    const markedResult = markedDamageRiderProfile.admitMechanics({
      mechanics: markedSource.mechanics,
      spellDefinitionRuleFacts: markedSource.spellDefinitionRuleFacts,
    });
    expect(markedResult.tag).toBe("supported");
    if (markedResult.tag !== "supported" || findingSkills === undefined) {
      return;
    }
    const markedInvocation = markedResult.admitted
      .admit(battleSpellExecutionSourceFromAdmission(markedSource), {
        actor: spellAdmissionActor(),
        castingSource: markedSource.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
        ],
      })
      .find(
        (invocation) =>
          invocation.action === "cast" &&
          invocation.abilityCheckBehavior.kind === "findingAdvantage",
      );
    expect(
      markedInvocation?.action === "cast" &&
        markedInvocation.abilityCheckBehavior.kind === "findingAdvantage"
        ? markedInvocation.abilityCheckBehavior.skills
        : undefined,
    ).toBe(findingSkills);

    const hosted = spellRecord("true_strike");
    if (hosted.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const hostedPhase = hosted.mechanics.phases[0];
    const hostedEffect =
      hostedPhase?.kind === "direct" &&
      hostedPhase.effects?.[0]?.kind === "make_weapon_attack"
        ? hostedPhase.effects[0]
        : undefined;
    if (
      hostedPhase?.kind !== "direct" ||
      hostedEffect?.damageTypeChoice === undefined
    ) {
      throw new Error("Expected hosted damage-type choices.");
    }
    const reversedEffect = Object.defineProperty(
      { ...hostedEffect },
      "damageTypeChoice",
      {
        configurable: true,
        enumerable: true,
        value: [...hostedEffect.damageTypeChoice].reverse(),
        writable: true,
      },
    );
    const hostedResult = spellHostedWeaponAttackProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(hosted, {
        ...hosted.mechanics,
        phases: [{ ...hostedPhase, effects: [reversedEffect] }],
      }),
    );
    expect(hostedResult.tag).toBe("supported");
    if (hostedResult.tag !== "supported") {
      return;
    }
    const hostedSource = spellAdmissionSource(hosted);
    const hostedActor = spellBattle({
      preparedSpells: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    }).state.combatants.get(spellCasterId);
    if (!isSpellAdmissionActor(hostedActor)) {
      throw new Error("Expected a weapon-bearing spellcasting fixture.");
    }
    const hostedInvocation = hostedResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(hostedSource),
      {
        actor: hostedActor,
        castingSource: hostedSource.castingSource,
        battle: undefined,
        spellCastOptions: [],
      },
    );
    expect(hostedInvocation.length).toBeGreaterThan(0);
    const firstHostedInvocation = hostedInvocation[0];
    if (firstHostedInvocation === undefined) return;
    expect(firstHostedInvocation.damageTypeChoices).toEqual([
      firstHostedInvocation.componentWeapon.attack.weapon.damage.damageType,
      "radiant",
    ]);
    expect(firstHostedInvocation.bonusDamage).toEqual({
      kind: "notApplicable",
    });

    const levelFiveActor = spellBattle({
      preparedSpells: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterClassLevels: [{ className: "wizard", level: 5 }],
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    }).state.combatants.get(spellCasterId);
    if (!isSpellAdmissionActor(levelFiveActor)) {
      throw new Error("Expected a level-five weapon-bearing spellcaster.");
    }
    const levelFiveInvocation = hostedResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(hostedSource),
      {
        actor: levelFiveActor,
        castingSource: hostedSource.castingSource,
        battle: undefined,
        spellCastOptions: [],
      },
    )[0];
    expect(levelFiveInvocation?.bonusDamage).toEqual({
      kind: "applicable",
      damage: {
        expr: { dice: 1, dieSize: 6 },
        damageType: "radiant",
      },
    });
  });

  test.each([
    [markedDamageRiderProfile, "hex", "operations"],
    [spatialMeleeSpellAttackProxyProfile, "spiritual_weapon", "operation"],
    [spellAttackSequenceProfile, "eldritch_blast", "phase"],
    [spellHostedWeaponAttackProfile, "true_strike", "phase"],
    [weaponAttackDamageEnhancementProfile, "magic_weapon", "operations"],
  ] as const)(
    "fails $1 closed on an extra owned-root field at the exact path",
    (profile, spellId, failedFact) => {
      const base = spellRecord(spellId);
      const mechanics = Object.defineProperty(
        { ...base.mechanics },
        "syntheticUnownedField",
        {
          configurable: true,
          enumerable: true,
          value: true,
          writable: true,
        },
      );
      const result = profile.admitMechanics(
        mechanicsSource({ ...base, mechanics }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact,
          mechanicsPath: spellMechanicsHeaderPath("family"),
        },
      ]);
    },
  );

  test("the marked-rider decoder makes noncanonical finding skills impossible", () => {
    const decode = Schema.decodeUnknownResult(
      MarkedDamageRiderAbilityCheckBehaviorSchema,
    );
    expect(
      Result.isSuccess(
        decode({
          kind: "findingAdvantage",
          ability: "wis",
          skills: ["perception", "survival"],
        }),
      ),
    ).toBe(true);
    for (const skills of [
      ["perception", "perception"],
      ["survival", "perception"],
      ["perception", "survival", "athletics"],
    ]) {
      expect(
        Result.isFailure(
          decode({ kind: "findingAdvantage", ability: "wis", skills }),
        ),
      ).toBe(true);
    }
  });

  test("the hosted-weapon decoder admits only explicit bonus-damage applicability states", () => {
    const decode = Schema.decodeUnknownResult(
      SpellHostedWeaponAttackInvocationSchema,
    );
    const baseExecution = {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "spellHostedWeaponAttack",
      spellRuleFacts: {
        castingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: 3,
        },
        level: 0,
        range: { kind: "self" },
        duration: { kind: "instantaneous" },
        components: {
          verbal: false,
          somatic: true,
          hasMaterial: true,
          hasPricedOrConsumedMaterial: false,
        },
        twinnedTargetCount: null,
      },
      actionCost: "magicAction",
      componentWeaponObjectId: "synthetic-hosted-weapon",
      spellcastingAbilityModifier: 3,
      attackBonus: 5,
      damageTypeChoices: ["radiant", "piercing"],
    };
    expect(
      Result.isSuccess(
        decode({
          ...baseExecution,
          bonusDamage: { kind: "notApplicable" },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isSuccess(
        decode({
          ...baseExecution,
          bonusDamage: {
            kind: "applicable",
            damage: {
              expr: { dice: 1, dieSize: 6 },
              damageType: "radiant",
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(decode({ ...baseExecution, bonusDamage: null })),
    ).toBe(true);
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
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(3)),
      },
    ]);
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
