import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  mechanicsSource,
  commonHeaderPaths,
  contextFor,
} from "./support-spell-procedure-admission.test-support.js";

describe("Support profile projection evidence", () => {
  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier bless", "bless", rollModifierProfile],
    ["roll modifier guidance", "guidance", rollModifierProfile],
    ["roll modifier bane", "bane", rollModifierProfile],
    ["roll modifier enhance ability", "enhance_ability", rollModifierProfile],
    ["scalar buff longstrider", "longstrider", scalarBuffProfile],
    ["scalar buff fly", "fly", scalarBuffProfile],
    ["scalar buff false life", "false_life", scalarBuffProfile],
    ["scalar buff shield of faith", "shield_of_faith", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)("supports %s", (_label, spellId, profile) => {
    const source = spellAdmissionSource(spellRecord(spellId));
    const result = profile.admitMechanics(mechanicsSource(source));
    if (result.tag !== "supported") {
      throw new Error(
        `Expected ${spellId} support, got ${result.tag}: ${JSON.stringify(
          result.tag === "unsupported"
            ? result.issues.map(({ failedFact, mechanicsPath }) => ({
                failedFact,
                mechanicsPath,
              }))
            : null,
        )}`,
      );
    }
    expect(result.admitted.evidence.unowned).toEqual([]);
  });

  test.each([
    ["bless", { kind: "none" }],
    ["guidance", { kind: "choice" }],
    ["pass_without_trace", { kind: "fixed", skill: "stealth" }],
  ] as const)(
    "carries the %s skill filter as one discriminated invocation fact",
    (spellId, expectedSkillFilter) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = rollModifierProfile.admitMechanics(
        mechanicsSource(source),
      );
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      const [invocation] = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        contextFor(source.castingSource),
      );
      expect(invocation).toBeDefined();
      if (
        invocation === undefined ||
        invocation.effect.kind !== "d20RollModifier"
      ) {
        return;
      }
      expect(invocation.effect.skillFilter).toMatchObject(expectedSkillFilter);
      expect(invocation).not.toHaveProperty("skillChoices");
      if (invocation.effect.skillFilter.kind === "choice") {
        expect(invocation.effect.skillFilter.options.length).toBeGreaterThan(0);
      }
    },
  );

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "roll modifier ongoing",
      "bless",
      rollModifierProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "roll modifier activation",
      "bane",
      rollModifierProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff timed",
      "longstrider",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff flight",
      "fly",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff instantaneous",
      "false_life",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
    ],
  ] as const)(
    "consumes exact evidence for %s",
    (_label, spellId, profile, consumed) => {
      const result = profile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord(spellId))),
      );
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({ consumed, unowned: [] });
    },
  );

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier", "bless", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)(
    "binds a mechanics-free closure for %s",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = profile.admitMechanics(mechanicsSource(source));
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        contextFor(source.castingSource),
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    },
  );
});
