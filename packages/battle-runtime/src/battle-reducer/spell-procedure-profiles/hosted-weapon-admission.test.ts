import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Result, Schema } from "effect";
import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  SpellHostedWeaponAttackInvocationSchema,
  spellHostedWeaponAttackProfile,
} from "./spell-hosted-weapon-attack.ts";

import {
  mechanicsSourceWithBaseDefinitionFacts,
  issuesOf,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Hosted-weapon spell procedure admission", () => {
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
});
