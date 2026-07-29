import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import alarmInput from "../../content/alarm.json";
import counterspellInput from "../../content/counterspell.json";
import magicMouthInput from "../../content/magic_mouth.json";
import mirrorImageInput from "../../content/mirror_image.json";
import plantGrowthInput from "../../content/plant_growth.json";
import {
  AnchoredEventSchema,
  AnchoredFilterSchema,
  AnchoredSignalSchema,
  AnchoredTriggerMechanicsSchema,
  AnchorTargetSchema,
  CreatureSpeedSchema,
  ModalActivationMechanicsSchema,
  PassiveHitInterceptMechanicsSchema,
  SixAbilityScoresSchema,
  StatBlockValueSchema,
  TriggeredReactionMechanicsSchema,
} from "./schema-spell.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown): A =>
  Schema.decodeUnknownSync(schema)(input);

describe("Surface spell schema readers", () => {
  test("reads the remaining spell-mechanics families directly", () => {
    expect(
      decode(ModalActivationMechanicsSchema, plantGrowthInput.mechanics),
    ).toMatchObject({ family: "modal_activation" });
    expect(
      decode(TriggeredReactionMechanicsSchema, counterspellInput.mechanics),
    ).toMatchObject({ family: "triggered_reaction" });
    expect(
      decode(PassiveHitInterceptMechanicsSchema, mirrorImageInput.mechanics),
    ).toMatchObject({ family: "passive_hit_intercept" });
    expect(
      decode(AnchoredTriggerMechanicsSchema, alarmInput.mechanics),
    ).toMatchObject({ family: "anchored_trigger" });
  });

  test("reads every anchored target, event, filter, and signal shape", () => {
    const targets = [
      {
        kind: "location",
        description: "door_or_window",
      },
      magicMouthInput.mechanics.anchor,
      alarmInput.mechanics.anchor,
    ] as const;
    for (const target of targets) {
      expect(decode(AnchorTargetSchema, target)).toEqual(target);
    }

    for (const event of [
      ...alarmInput.mechanics.events,
      ...magicMouthInput.mechanics.events,
    ]) {
      expect(decode(AnchoredEventSchema, event)).toEqual(event);
    }
    expect(
      decode(AnchoredFilterSchema, alarmInput.mechanics.filters[0]),
    ).toEqual(alarmInput.mechanics.filters[0]);
    for (const signal of [
      ...alarmInput.mechanics.signals,
      ...magicMouthInput.mechanics.signals,
    ]) {
      expect(decode(AnchoredSignalSchema, signal)).toEqual(signal);
    }
  });

  test("reads stat-block projections used by spawned creatures", () => {
    expect(
      decode(StatBlockValueSchema, { kind: "literal", value: 12 }),
    ).toEqual({ kind: "literal", value: 12 });
    expect(
      decode(StatBlockValueSchema, {
        kind: "linear_per_level",
        axis: "slot",
        base: 10,
        perLevel: 5,
        startingAtLevel: 2,
      }),
    ).toMatchObject({ kind: "linear_per_level" });
    expect(
      decode(StatBlockValueSchema, {
        kind: "caster_derived",
        source: "spell_save_dc",
      }),
    ).toEqual({ kind: "caster_derived", source: "spell_save_dc" });
    expect(
      decode(SixAbilityScoresSchema, {
        str: 10,
        dex: 12,
        con: 14,
        int: 8,
        wis: 11,
        cha: 6,
      }),
    ).toEqual({
      str: 10,
      dex: 12,
      con: 14,
      int: 8,
      wis: 11,
      cha: 6,
    });
    expect(
      decode(CreatureSpeedSchema, {
        kind: "fly",
        feet: { kind: "literal", value: 30 },
        requiresSlotLevel: 3,
      }),
    ).toMatchObject({ kind: "fly", requiresSlotLevel: 3 });
  });
});
