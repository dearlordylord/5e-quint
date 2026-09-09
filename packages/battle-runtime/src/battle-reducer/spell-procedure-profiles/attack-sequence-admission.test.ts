import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";

import {
  mechanicsSourceWithBaseDefinitionFacts,
  issuesOf,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Spell attack-sequence procedure admission", () => {
  test("retains Eldritch Blast ownership after attachment deletion", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const malformedPhase = { ...phase };
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
    ]);
  });

  test("retains Eldritch Blast ownership after damage-type mutation", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const hitEffect =
      phase?.kind === "attack_roll" ? phase.onHit[0] : undefined;
    if (phase?.kind !== "attack_roll" || hitEffect?.kind !== "damage") {
      throw new Error("Expected attack damage mechanics.");
    }
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onHit: [{ ...hitEffect, damageType: "cold" }],
          },
        ],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "damageType",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("retains Eldritch Blast ownership after attack-kind mutation", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        phases: [{ ...phase, attackKind: "melee_spell_attack" }],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "attackKind",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("does not assemble attack-sequence witnesses across sibling phases", () => {
    const base = spellRecord("eldritch_blast");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const withoutHitEffects = { ...phase };
    Reflect.set(withoutHitEffects, "onHit", []);
    const result = spellAttackSequenceProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        range: { kind: "point", feet: 90 },
        phases: [withoutHitEffects, { ...phase, attachment: { kind: "self" } }],
      }),
    );
    expect(result).toEqual({ tag: "notRepresented" });
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
});
