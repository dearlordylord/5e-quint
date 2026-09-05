import { describe, expect, test } from "vitest";

import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "../battle-runtime.test-support.ts";
import { combatantId } from "../unit-profile-admission.test-support.ts";
import {
  creatureTypeProtectionGrantsAttackDisadvantage,
  creatureTypeProtectionGrantsExistingEffectSaveAdvantage,
  creatureTypeProtectionMatchesSourceCreatureType,
  creatureTypeProtectionPreventsNewApplication,
  type CreatureTypeProtectionActiveEffect,
} from "./creature-type-protection.ts";

const scopedPolicy = {
  kind: "creatureTypeProtection",
  sourceProcedureRef: battleProcedureExecutionRefForTest(
    "synthetic-scoped-creature-protection",
  ),
  effectRef: battleEffectExecutionRefForTest(
    "synthetic-scoped-creature-protection-effect",
  ),
  sourceCombatantId: combatantId("synthetic-protection-source"),
  creatureTypes: ["fiend"],
  protections: [
    { kind: "attack_rolls_against_target", mode: "disadvantage" },
    {
      kind: "relevant_effect_protection",
      conditions: ["charmed"],
      possession: "included",
      outcomes: [{ kind: "new_applications", result: "prevented" }],
    },
    {
      kind: "relevant_effect_protection",
      conditions: ["frightened"],
      possession: "included",
      outcomes: [
        {
          kind: "new_saves_against_existing_effects",
          mode: "advantage",
        },
      ],
    },
  ],
  expiresAt: { kind: "untilDispelled" },
} as const satisfies CreatureTypeProtectionActiveEffect;

const attackOnlyWard = {
  ...scopedPolicy,
  sourceProcedureRef: battleProcedureExecutionRefForTest(
    "synthetic-attack-only-creature-ward",
  ),
  effectRef: battleEffectExecutionRefForTest(
    "synthetic-attack-only-creature-ward-effect",
  ),
  protections: [{ kind: "attack_rolls_against_target", mode: "disadvantage" }],
} as const satisfies CreatureTypeProtectionActiveEffect;

describe("creature-type protection active-effect policy queries", () => {
  test("requires the source creature type to be eligible for every capability", () => {
    expect(
      creatureTypeProtectionMatchesSourceCreatureType(scopedPolicy, "fiend"),
    ).toBe(true);
    expect(
      creatureTypeProtectionMatchesSourceCreatureType(scopedPolicy, "humanoid"),
    ).toBe(false);
    expect(
      creatureTypeProtectionGrantsAttackDisadvantage(scopedPolicy, "humanoid"),
    ).toBe(false);
    expect(
      creatureTypeProtectionPreventsNewApplication(scopedPolicy, "humanoid", {
        kind: "condition",
        condition: "charmed",
      }),
    ).toBe(false);
  });

  test("matches each condition against the capability carrying the requested outcome", () => {
    expect(
      creatureTypeProtectionPreventsNewApplication(scopedPolicy, "fiend", {
        kind: "condition",
        condition: "charmed",
      }),
    ).toBe(true);
    expect(
      creatureTypeProtectionGrantsExistingEffectSaveAdvantage(
        scopedPolicy,
        "fiend",
        { kind: "condition", condition: "charmed" },
      ),
    ).toBe(false);
    expect(
      creatureTypeProtectionPreventsNewApplication(scopedPolicy, "fiend", {
        kind: "condition",
        condition: "frightened",
      }),
    ).toBe(false);
    expect(
      creatureTypeProtectionGrantsExistingEffectSaveAdvantage(
        scopedPolicy,
        "fiend",
        { kind: "condition", condition: "frightened" },
      ),
    ).toBe(true);
  });

  test("matches possession independently and searches every capability", () => {
    expect(
      creatureTypeProtectionPreventsNewApplication(scopedPolicy, "fiend", {
        kind: "possession",
      }),
    ).toBe(true);
    expect(
      creatureTypeProtectionGrantsExistingEffectSaveAdvantage(
        scopedPolicy,
        "fiend",
        { kind: "possession" },
      ),
    ).toBe(true);
  });

  test("keeps an attack-only ward out of relevant-effect policy", () => {
    expect(
      creatureTypeProtectionGrantsAttackDisadvantage(attackOnlyWard, "fiend"),
    ).toBe(true);
    expect(
      creatureTypeProtectionPreventsNewApplication(attackOnlyWard, "fiend", {
        kind: "condition",
        condition: "charmed",
      }),
    ).toBe(false);
    expect(
      creatureTypeProtectionGrantsExistingEffectSaveAdvantage(
        attackOnlyWard,
        "fiend",
        { kind: "possession" },
      ),
    ).toBe(false);
  });
});
