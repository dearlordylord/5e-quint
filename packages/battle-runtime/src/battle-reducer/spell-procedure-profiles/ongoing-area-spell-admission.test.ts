import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { persistentAreaSaveCompositeProfile } from "./persistent-area-save-composite.ts";
import { persistentAreaSaveConditionEscapeProfile } from "./persistent-area-save-condition-escape.ts";
import { persistentAreaSaveConditionProfile } from "./persistent-area-save-condition.ts";
import { persistentAreaSaveDamageProfile } from "./persistent-area-save-damage.ts";
import { sourceTurnTranslationPersistentAreaSaveDamageProfile } from "./source-turn-translation-persistent-area-save-damage.ts";
import type { SpellAdmissionContext } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function sourceWith(
  spellId: string,
  update: (
    mechanics: BattleSpellAdmissionSource["mechanics"],
  ) => BattleSpellAdmissionSource["mechanics"],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  const mechanics = update(source.mechanics);
  return {
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

function contextFor(level: number): SpellAdmissionContext {
  return {
    actor: undefined as never,
    castingSource: undefined as never,
    battle: undefined,
    spellCastOptions: [
      { spellLevel: level as never, payment: { tag: "slot" } },
    ],
  };
}

type StaticAdmissionResult =
  | ReturnType<typeof persistentAreaSaveCompositeProfile.admitMechanics>
  | ReturnType<typeof persistentAreaSaveConditionEscapeProfile.admitMechanics>
  | ReturnType<typeof persistentAreaSaveConditionProfile.admitMechanics>
  | ReturnType<typeof persistentAreaSaveDamageProfile.admitMechanics>;

function expectSupported(result: StaticAdmissionResult) {
  if (result.tag !== "supported") {
    if (result.tag === "unsupported") {
      throw new Error(
        "Expected static support: " +
          JSON.stringify(
            result.issues.map(({ failedFact, mechanicsPath }) => ({
              failedFact,
              mechanicsPath,
            })),
          ),
      );
    }
    throw new Error("Expected represented static support.");
  }
  expect(result.tag).toBe("supported");
  return result;
}

function expectedEvidence(
  operationCount: number,
  durationPaths: readonly ReturnType<typeof spellDurationValuePath>[],
  materialPaths: readonly ReturnType<typeof spellMaterialComponentPath>[] = [],
) {
  const operationOrdinals = Array.from({ length: operationCount }, (_, index) =>
    PositiveInteger(index + 1),
  );
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      ...durationPaths,
      spellOngoingAttachmentPath(),
      spellOngoingInitialPhasePath(),
      ...operationOrdinals.map(spellOngoingOperationPath),
      ...operationOrdinals.map(spellOngoingOperationEffectPath),
      ...materialPaths,
    ],
    unowned: [],
  };
}

describe("ongoing area spell static admission", () => {
  test.each([
    ["sleet storm", "sleet_storm", persistentAreaSaveCompositeProfile],
    ["web", "web", persistentAreaSaveConditionEscapeProfile],
    ["grease", "grease", persistentAreaSaveConditionProfile],
    [
      "cloudkill",
      "cloudkill",
      sourceTurnTranslationPersistentAreaSaveDamageProfile,
    ],
  ] as const)(
    "supports the %s representative with canonical evidence",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = expectSupported(
        profile.admitMechanics(mechanicsSource(source)),
      );

      const durationPaths =
        spellId === "cloudkill"
          ? [
              spellDurationValuePath(),
              spellDurationEndingPath(PositiveInteger(1)),
            ]
          : [spellDurationValuePath()];
      expect(result.admitted.evidence).toEqual(
        expectedEvidence(
          spellId === "web" ? 7 : spellId === "grease" ? 3 : 5,
          durationPaths,
        ),
      );
    },
  );

  test("binds a mechanics-free Cloudkill closure to the projected facts", () => {
    const admitted = expectSupported(
      sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("cloudkill"))),
      ),
    );
    const source = spellAdmissionSource(spellRecord("cloudkill"));
    const [invocation] = admitted.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(5),
    );

    expect(invocation).toMatchObject({
      lifecycle: { kind: "sourceTurnTranslation", distanceFeet: 10 },
      targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
      durationTicks: 100,
      rangeFeet: 120,
      damage: { damageType: "poison" },
    });
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test.each([
    ["composite", "sleet_storm", persistentAreaSaveCompositeProfile],
    ["condition escape", "web", persistentAreaSaveConditionEscapeProfile],
    ["condition", "grease", persistentAreaSaveConditionProfile],
    [
      "translation",
      "cloudkill",
      sourceTurnTranslationPersistentAreaSaveDamageProfile,
    ],
  ] as const)(
    "is invariant under %s authored renaming",
    (_label, spellId, profile) => {
      const original = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...original,
        id: unitId(`synthetic_renamed_${spellId}`),
        name: "Synthetic Ongoing Area",
      };
      const originalResult = expectSupported(
        profile.admitMechanics(mechanicsSource(original)),
      );
      const renamedResult = expectSupported(
        profile.admitMechanics(mechanicsSource(renamed)),
      );
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    },
  );

  test.each([
    ["composite", "sleet_storm", persistentAreaSaveCompositeProfile],
    ["condition escape", "web", persistentAreaSaveConditionEscapeProfile],
    ["condition", "grease", persistentAreaSaveConditionProfile],
    [
      "translation",
      "cloudkill",
      sourceTurnTranslationPersistentAreaSaveDamageProfile,
    ],
  ] as const)(
    "accumulates represented %s header failures",
    (_label, spellId, profile) => {
      const result = profile.admitMechanics(
        sourceWith(spellId, (mechanics) => ({ ...mechanics, level: 9 })),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(result.issues[0]).toMatchObject({
        failedFact: "level",
        mechanicsPath: spellMechanicsHeaderPath("level"),
      });
    },
  );

  test("distinguishes sibling representations at the aggregate boundary", () => {
    const cloudkill = persistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord("cloudkill"))),
    );
    const insectPlague = persistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord("insect_plague"))),
    );
    const sleetStorm = persistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord("sleet_storm"))),
    );

    expect(cloudkill.tag).toBe("supported");
    expect(insectPlague.tag).toBe("supported");
    expect(sleetStorm).toEqual({ tag: "notRepresented" });
  });

  test("does not represent activation mechanics or a sibling lifecycle", () => {
    expect(
      persistentAreaSaveCompositeProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("fire_bolt"))),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("insect_plague"))),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      persistentAreaSaveConditionProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("web"))),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("consumes priced and consumed material branches in the definition projection", () => {
    const priced = persistentAreaSaveConditionProfile.admitMechanics(
      sourceWith("grease", (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.components.m === false
        ) {
          throw new Error("Expected generic Grease material components.");
        }
        return {
          ...mechanics,
          components: { ...mechanics.components, materialCostGp: 25 },
        };
      }),
    );
    const consumed = persistentAreaSaveConditionProfile.admitMechanics(
      sourceWith("grease", (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.components.m === false
        ) {
          throw new Error("Expected generic Grease material components.");
        }
        return {
          ...mechanics,
          components: { ...mechanics.components, materialConsumed: true },
        };
      }),
    );
    const pricedAdmission = expectSupported(priced);
    const consumedAdmission = expectSupported(consumed);
    expect(pricedAdmission.admitted.evidence).toEqual(
      expectedEvidence(
        3,
        [spellDurationValuePath()],
        [spellMaterialComponentPath("cost")],
      ),
    );
    expect(consumedAdmission.admitted.evidence).toEqual(
      expectedEvidence(
        3,
        [spellDurationValuePath()],
        [spellMaterialComponentPath("consumption")],
      ),
    );
  });

  test("rejects unsupported duration extension and ending children at canonical paths", () => {
    const extension = persistentAreaSaveConditionProfile.admitMechanics(
      sourceWith("grease", (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.duration.kind !== "timed"
        ) {
          throw new Error("Expected timed Grease mechanics.");
        }
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            value: {
              ...mechanics.duration.value,
              upcastTiers: [{ atSlot: 2, amount: 2 }],
            },
          },
        };
      }),
    );
    const ending = persistentAreaSaveConditionProfile.admitMechanics(
      sourceWith("grease", (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.duration.kind !== "timed"
        ) {
          throw new Error("Expected timed Grease mechanics.");
        }
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            earlyEnd: [{ kind: "target_takes_damage" }],
          },
        };
      }),
    );
    for (const [result, path] of [
      [extension, spellDurationExtensionPath(PositiveInteger(1))],
      [ending, spellDurationEndingPath(PositiveInteger(1))],
    ] as const) {
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") continue;
      expect(result.issues).toEqual([
        expect.objectContaining({
          failedFact: "duration",
          mechanicsPath: path,
        }),
      ]);
    }
  });

  test("validates Cloudkill duration value and ending branches independently", () => {
    const baseMismatch = sourceWith("cloudkill", (mechanics) => {
      if (
        mechanics.family !== "ongoing_effect" ||
        mechanics.duration.kind !== "concentration"
      ) {
        throw new Error("Expected concentration Cloudkill mechanics.");
      }
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          upTo: { ...mechanics.duration.upTo, amount: 9 },
        },
      };
    });
    const endingMismatch = sourceWith("cloudkill", (mechanics) => {
      if (
        mechanics.family !== "ongoing_effect" ||
        mechanics.duration.kind !== "concentration"
      ) {
        throw new Error("Expected concentration Cloudkill mechanics.");
      }
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          earlyEnd: [{ kind: "target_takes_damage" }],
        },
      };
    });
    const extraEnding = sourceWith("cloudkill", (mechanics) => {
      if (
        mechanics.family !== "ongoing_effect" ||
        mechanics.duration.kind !== "concentration"
      ) {
        throw new Error("Expected concentration Cloudkill mechanics.");
      }
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          earlyEnd: [
            ...(mechanics.duration.earlyEnd ?? []),
            { kind: "target_takes_damage" },
          ],
        },
      };
    });

    const baseResult =
      sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(
        baseMismatch,
      );
    const endingResult =
      sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(
        endingMismatch,
      );
    const extraResult =
      sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(
        extraEnding,
      );
    expect(baseResult.tag).toBe("unsupported");
    if (baseResult.tag === "unsupported") {
      expect(
        baseResult.issues.map(({ mechanicsPath }) => mechanicsPath),
      ).toEqual([spellDurationValuePath()]);
    }
    expect(endingResult.tag).toBe("unsupported");
    if (endingResult.tag === "unsupported") {
      expect(
        endingResult.issues.map(({ mechanicsPath }) => mechanicsPath),
      ).toEqual([spellDurationEndingPath(PositiveInteger(1))]);
    }
    expect(extraResult.tag).toBe("unsupported");
    if (extraResult.tag === "unsupported") {
      expect(
        extraResult.issues.map(({ mechanicsPath }) => mechanicsPath),
      ).toEqual([spellDurationEndingPath(PositiveInteger(2))]);
    }
  });

  test("reports reordered duplicate operations at their actual ordinals", () => {
    const result = persistentAreaSaveConditionProfile.admitMechanics(
      sourceWith("grease", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [passive, enter, endTurn] = mechanics.operations;
        if (
          passive === undefined ||
          enter === undefined ||
          endTurn === undefined
        ) {
          throw new Error("Expected Grease operations.");
        }
        return {
          ...mechanics,
          operations: [passive, enter, enter, endTurn] as const,
        };
      }),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.some(
        ({ failedFact, mechanicsPath }) =>
          failedFact === "operationCount" &&
          mechanicsPath.nodes.some(
            (node) =>
              node.kind === "occurrence" &&
              node.ordinal === 3 &&
              node.role === "procedure",
          ),
      ),
    ).toBe(true);
    expect(
      result.issues.some(({ failedFact }) => failedFact === "endTurnOperation"),
    ).toBe(false);
  });

  test("reports every participating branch for an outlier save-limit group", () => {
    const result = persistentAreaSaveCompositeProfile.admitMechanics(
      sourceWith("sleet_storm", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [
          heavilyObscured,
          douseFlames,
          difficultTerrain,
          enter,
          startTurn,
        ] = mechanics.operations;
        if (
          heavilyObscured === undefined ||
          douseFlames === undefined ||
          difficultTerrain === undefined ||
          enter === undefined ||
          startTurn === undefined
        ) {
          throw new Error("Expected Sleet Storm operations.");
        }
        const operations = [
          heavilyObscured,
          douseFlames,
          difficultTerrain,
          {
            ...enter,
            usageLimit: {
              kind: "once_per_turn" as const,
              limitGroup: "synthetic_outlier",
            },
          },
          startTurn,
        ] as const;
        return { ...mechanics, operations };
      }),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    const limitIssues = result.issues.filter(
      ({ failedFact }) => failedFact === "oncePerTurnLimitGroup",
    );
    expect(limitIssues).toHaveLength(2);
    expect(limitIssues.map(({ mechanicsPath }) => mechanicsPath)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodes: expect.arrayContaining([
            { kind: "occurrence", ordinal: 4, role: "procedure" },
          ]),
        }),
        expect.objectContaining({
          nodes: expect.arrayContaining([
            { kind: "occurrence", ordinal: 5, role: "procedure" },
          ]),
        }),
      ]),
    );
  });

  test("keeps duration projection owned by the canonical mechanics fact", () => {
    const result = persistentAreaSaveConditionEscapeProfile.admitMechanics(
      sourceWith("web", (mechanics) =>
        mechanics.family === "ongoing_effect"
          ? {
              ...mechanics,
              duration: { kind: "timed", value: { unit: "round", amount: 1 } },
            }
          : mechanics,
      ),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual(
      expect.arrayContaining([
        { failedFact: "duration", mechanicsPath: spellDurationValuePath() },
      ]),
    );
    expect(
      result.issues.some(({ failedFact }) => failedFact === "durationTicks"),
    ).toBe(false);
  });
});
