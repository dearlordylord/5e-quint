import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import { admitBattleSpellMechanicsFrom } from "./spell-mechanics-admission.ts";
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
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import type { SpellAdmissionContext } from "./profile.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

const commonHeaderPaths = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function sourceWith(
  spellId: string,
  update: (mechanics: SpellMechanics) => SpellMechanics,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  const mechanics = update(source.mechanics);
  return {
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

function contextFor(
  castingSource: SpellAdmissionContext["castingSource"],
): SpellAdmissionContext {
  const session = spellBattle({
    spellSlots: [{ spellLevel: 5, count: 1 }],
  });
  const actor = session.state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected spell-admission actor in test battle.");
  }
  const context = spellAdmissionContextFor(actor, session.state);
  if (context === null) {
    throw new Error("Expected spell-admission context for test actor.");
  }
  return { ...context, castingSource };
}

type C2StaticAdmissionResult =
  | ReturnType<typeof damageReductionProfile.admitMechanics>
  | ReturnType<typeof heldLightProfile.admitMechanics>
  | ReturnType<typeof rollModifierProfile.admitMechanics>
  | ReturnType<typeof scalarBuffProfile.admitMechanics>
  | ReturnType<typeof seeInvisibleObserverSightProfile.admitMechanics>;
type C2StaticAdmissionIssue = Extract<
  C2StaticAdmissionResult,
  { readonly tag: "unsupported" }
>["issues"][number];
type C2ExpectedAdmissionIssue = SpellProcedureAdmissionIssue<
  C2StaticAdmissionIssue["procedure"],
  C2StaticAdmissionIssue["failedFact"],
  C2StaticAdmissionIssue["mechanicsPath"]
>;

function expectedIssue(
  procedure: C2StaticAdmissionIssue["procedure"],
  failedFact: C2StaticAdmissionIssue["failedFact"],
  mechanicsPath: C2StaticAdmissionIssue["mechanicsPath"],
): C2ExpectedAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${failedFact}.`,
  };
}

const damageReductionMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});
const rollModifierMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});
const scalarBuffMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics =>
  "castingTime" in mechanics
    ? {
        ...mechanics,
        range: { kind: "unlimited" },
        castingTime: { kind: "minutes", amount: 1, ritual: false },
      }
    : mechanics;
const seeInvisibleMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});
const heldLightMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});

function appendOngoingNoop(mechanics: SpellMechanics): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const firstOperation = mechanics.operations[0];
  if (firstOperation === undefined) {
    throw new Error("Expected an ongoing operation representative.");
  }
  return {
    ...mechanics,
    operations: [
      ...mechanics.operations,
      { ...firstOperation, effect: { kind: "none" } },
    ],
  };
}

function appendActivationPhase(mechanics: SpellMechanics): SpellMechanics {
  if (mechanics.family !== "activation") return mechanics;
  const firstPhase = mechanics.phases[0];
  if (firstPhase === undefined) {
    throw new Error("Expected an activation phase representative.");
  }
  return { ...mechanics, phases: [...mechanics.phases, firstPhase] };
}

describe("C2 support profile static admission", () => {
  test.each([
    ["damage reduction", "barkskin", damageReductionProfile],
    ["roll modifier", "longstrider", rollModifierProfile],
    ["scalar buff", "bless", scalarBuffProfile],
    ["see invisible", "shield_of_faith", seeInvisibleObserverSightProfile],
    ["held light", "fire_bolt", heldLightProfile],
  ] as const)(
    "does not represent unrelated %s mechanics",
    (_label, spellId, profile) => {
      expect(
        profile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spellRecord(spellId))),
        ),
      ).toEqual({ tag: "notRepresented" });
    },
  );

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier bless", "bless", rollModifierProfile],
    ["roll modifier guidance", "guidance", rollModifierProfile],
    ["roll modifier bane", "bane", rollModifierProfile],
    ["roll modifier enhance ability", "enhance_ability", rollModifierProfile],
    ["scalar buff longstrider", "longstrider", scalarBuffProfile],
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
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      damageReductionMultiIssueUpdate,
      [
        expectedIssue(
          "damageReduction",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "damageReduction",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      rollModifierMultiIssueUpdate,
      [
        expectedIssue("rollModifier", "duration", spellDurationValuePath()),
        expectedIssue(
          "rollModifier",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      scalarBuffMultiIssueUpdate,
      [
        expectedIssue(
          "scalarBuff",
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
        expectedIssue("scalarBuff", "range", spellMechanicsHeaderPath("range")),
      ],
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      seeInvisibleMultiIssueUpdate,
      [
        expectedIssue(
          "seeInvisibleObserverSight",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "seeInvisibleObserverSight",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      heldLightMultiIssueUpdate,
      [
        expectedIssue("heldLight", "range", spellMechanicsHeaderPath("range")),
        expectedIssue("heldLight", "duration", spellDurationValuePath()),
      ],
    ],
  ] as const)(
    "accumulates exact multi-issue failures for %s",
    (_label, spellId, profile, update, issues) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({ tag: "unsupported", issues });
    },
  );

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      appendOngoingNoop,
      "damageReduction",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      appendOngoingNoop,
      "rollModifier",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      appendActivationPhase,
      "scalarBuff",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      appendActivationPhase,
      "seeInvisibleObserverSight",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      appendOngoingNoop,
      "heldLight",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(3)),
    ],
  ] as const)(
    "reports an extra branch at its actual %s ordinal",
    (
      _label,
      spellId,
      profile,
      update,
      procedure,
      failedFact,
      mechanicsPath,
    ) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue(procedure, failedFact, mechanicsPath)],
      });
    },
  );

  test("matches held light operation roles independent of authored ordering", () => {
    const result = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [first, second, ...rest] = mechanics.operations;
        if (first === undefined || second === undefined) {
          throw new Error("Expected paired held-light operations.");
        }
        return {
          ...mechanics,
          operations: [second, first, ...rest],
        };
      }),
    );
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toMatchObject({ unowned: [] });
  });

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier", "bless", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)(
    "preserves %s admission under authored renaming",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...source,
        id: unitId(`synthetic_c2_${spellId}`),
        name: "Synthetic Renamed Spell",
      };
      const original = profile.admitMechanics(mechanicsSource(source));
      const renamedResult = profile.admitMechanics(mechanicsSource(renamed));
      expect(original).toMatchObject({ tag: "supported" });
      expect(renamedResult).toMatchObject({ tag: "supported" });
      if (original.tag !== "supported" || renamedResult.tag !== "supported")
        return;
      expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
      expect(renamedResult.admitted.evidence).toEqual(
        original.admitted.evidence,
      );
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

  test.each([
    ["resistance", "damageReduction"],
    ["bless", "rollModifier"],
    ["longstrider", "scalarBuff"],
    ["see_invisibility", "seeInvisibleObserverSight"],
    ["produce_flame", "heldLight"],
  ] as const)(
    "does not collide on the %s representative",
    (spellId, procedure) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = admitBattleSpellMechanicsFrom(mechanicsSource(source), [
        damageReductionProfile,
        rollModifierProfile,
        scalarBuffProfile,
        seeInvisibleObserverSightProfile,
        heldLightProfile,
      ]);
      expect(result.tag).toBe("admitted");
      if (result.tag !== "admitted") return;
      expect(
        result.procedures.map(
          ({ procedure: admittedProcedure }) => admittedProcedure,
        ),
      ).toEqual([procedure]);
    },
  );
});
