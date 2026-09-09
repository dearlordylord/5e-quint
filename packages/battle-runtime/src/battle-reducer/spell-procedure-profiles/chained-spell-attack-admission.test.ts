import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";

import { chainedTargetSelectionConstraintMutations } from "./activation-spell-procedure-admission.test-support.js";

describe("Chained spell-attack procedure admission", () => {
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
      id: "synthetic_activation_chained_reordered",
      name: "Synthetic Chained Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_chained_reordered",
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
      id: "synthetic_activation_chained_amount_mismatch",
      name: "Synthetic Chained Amount Mismatch",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_chained_amount_mismatch",
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
        id: `synthetic_activation_chained_amount_${mutation}`,
        name: `Synthetic Chained Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_chained_amount_${mutation}`,
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
        id: `synthetic_activation_chained_equal_amount_${mutation}`,
        name: `Synthetic Chained Equal Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_chained_equal_amount_${mutation}`,
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
      id: "synthetic_activation_chained_extra",
      name: "Synthetic Chained Extra",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_chained_extra",
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
        id: `synthetic_activation_chained_selection_${branch}_${_name}`,
        name: `Synthetic Chained Selection ${branch} ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_chained_selection_${branch}_${_name}`,
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
        id: `synthetic_activation_chained_range_origin_${branch}`,
        name: `Synthetic Chained Range Origin ${branch}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_chained_range_origin_${branch}`,
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
});
