import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BlurredActiveEffectTemplateSchema,
  SpellMarkedDamageRiderTemplateSchema,
  SpellWeaponDamageRiderTemplateSchema,
  ThaumaturgyBoomingVoiceTemplateSchema,
  WardingBondActiveEffectTemplateSchema,
} from "./codecs.ts";
import { SpellWeaponAttackOverrideTemplateSchema } from "../procedure-execution/weapon-attack-override.ts";
import {
  ConditionImmunityTemplateSchema,
  TurnStartTemporaryHitPointsTemplateSchema,
} from "../battle-reducer/spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";

const duration = { kind: "duration", durationTicks: 10 } as const;
const concentration = {
  kind: "concentration",
  combatantId: "template-source",
} as const;

const templateSchemas = [
  {
    name: "weapon damage rider",
    schema: SpellWeaponDamageRiderTemplateSchema,
    encoded: {
      kind: "spellWeaponDamageRider",
      sourceCombatantId: "template-source",
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
      expiresAt: { kind: "untilDispelled" },
    },
  },
  {
    name: "marked damage rider",
    schema: SpellMarkedDamageRiderTemplateSchema,
    encoded: {
      kind: "spellMarkedDamageRider",
      sourceCombatantId: "template-source",
      targetCombatantId: "template-target",
      transfer: {
        kind: "awaitingTargetDrop",
        retargetTiming: "sameTurn",
      },
      abilityCheckBehavior: { kind: "none" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "necrotic" },
      expiresAt: concentration,
    },
  },
  {
    name: "thaumaturgy voice",
    schema: ThaumaturgyBoomingVoiceTemplateSchema,
    encoded: {
      kind: "thaumaturgyBoomingVoice",
      sourceCombatantId: "template-source",
      expiresAt: duration,
    },
  },
  {
    name: "blurred",
    schema: BlurredActiveEffectTemplateSchema,
    encoded: {
      kind: "blurred",
      sourceCombatantId: "template-source",
      expiresAt: concentration,
    },
  },
  {
    name: "warding bond",
    schema: WardingBondActiveEffectTemplateSchema,
    encoded: {
      kind: "wardingBond",
      sourceCombatantId: "template-source",
      expiresAt: duration,
    },
  },
  {
    name: "condition immunity",
    schema: ConditionImmunityTemplateSchema,
    encoded: {
      kind: "conditionImmunity",
      sourceCombatantId: "template-source",
      condition: "frightened",
      expiresAt: duration,
    },
  },
  {
    name: "turn-start temporary hit points",
    schema: TurnStartTemporaryHitPointsTemplateSchema,
    encoded: {
      kind: "turnStartTemporaryHitPoints",
      sourceCombatantId: "template-source",
      amount: 3,
      expiresAt: duration,
    },
  },
  {
    name: "weapon attack override",
    schema: SpellWeaponAttackOverrideTemplateSchema,
    encoded: {
      kind: "spellWeaponAttackOverride",
      sourceCombatantId: "template-source",
      weaponItemId: "template-weapon",
      spellcastingAbilityModifier: 3,
      attackBonus: 5,
      damage: { expr: { dice: 1, dieSize: 8 } },
      damageTypeChoices: ["radiant", "necrotic"],
      expiresAt: duration,
    },
  },
] as const;

describe("durable effect occurrence template codecs", () => {
  test.each(templateSchemas)(
    "$name accepts a template and rejects an injected durable reference",
    ({ schema, encoded }) => {
      expect(
        Result.isSuccess(Schema.decodeUnknownResult(schema)(encoded)),
      ).toBe(true);
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(schema)({
            ...encoded,
            effectRef: "forged-template-effect-reference",
          }),
        ),
      ).toBe(true);
    },
  );
});
