import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationEffectPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { zeroAbilityWeaponAttackWithSyntheticMastery } from "../../unit-profile-admission-creature-fixture.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spatial-melee-spell-attack-proxy.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { weaponAttackDamageEnhancementProfile } from "./weapon-attack-enhancement.ts";

import {
  mechanicsSource,
  mechanicsSourceWithBaseDefinitionFacts,
  renamedSpell,
  spellAdmissionActor,
  isSpellAdmissionActor,
  ONGOING_PROCEDURE_PROFILES,
  issuesOf,
  mechanicsSourceFromSource,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Ongoing spell procedure projection boundaries", () => {
  test.each(ONGOING_PROCEDURE_PROFILES)(
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

  test.each(ONGOING_PROCEDURE_PROFILES)(
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

  test("does not claim canonical or renamed Barkskin mechanics", () => {
    const canonical = spellRecord("barkskin");
    const renamed = renamedSpell(canonical, "barkskin");
    expect(
      weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSource(canonical),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSource(renamed),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

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
      attack: zeroAbilityWeaponAttackWithSyntheticMastery("weapon_dagger"),
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
      attack: zeroAbilityWeaponAttackWithSyntheticMastery("weapon_dagger"),
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
});
