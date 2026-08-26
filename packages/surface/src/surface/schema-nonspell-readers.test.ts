import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import barbarianRageInput from "../../content/barbarian_rage.json";
import bardicInspirationInput from "../../content/bard_bardic_inspiration.json";
import fighterActionSurgeInput from "../../content/fighter_action_surge.json";
import fighterInput from "../../content/class_fighter.json";
import clericInput from "../../content/class_cleric.json";
import warlockInput from "../../content/class_warlock.json";
import wizardInput from "../../content/class_wizard.json";
import wizardArcaneRecoveryInput from "../../content/wizard_arcane_recovery.json";
import {
  BarbarianClassFeatureRecordSchema,
  BardClassFeatureRecordSchema,
  ClassContainerOnlyRecordSchema,
  ClassRecordSchema,
  FighterClassFeatureRecordSchema,
  ListPreparedSpellcastingClassRecordSchema,
  NonSpellcastingClassRecordSchema,
  NonWizardClassRecordSchema,
  PactMagicClassRecordSchema,
  SpellcastingClassRecordSchema,
  WizardClassFeatureRecordSchema,
  WizardClassRecordSchema,
} from "./schema-nonspell.ts";

const decode = <A>(schema: Schema.ConstraintDecoder<A>, input: unknown): A =>
  Schema.decodeUnknownSync(schema)(input);

describe("Surface non-spell schema readers", () => {
  test("reads each class-record ownership slice directly", () => {
    expect(decode(WizardClassRecordSchema, wizardInput)).toMatchObject({
      className: "wizard",
    });
    expect(
      decode(ListPreparedSpellcastingClassRecordSchema, clericInput),
    ).toMatchObject({ className: "cleric" });
    expect(decode(PactMagicClassRecordSchema, warlockInput)).toMatchObject({
      className: "warlock",
    });
    expect(
      decode(NonSpellcastingClassRecordSchema, fighterInput),
    ).toMatchObject({ className: "fighter" });
    expect(decode(ClassContainerOnlyRecordSchema, fighterInput)).toMatchObject({
      className: "fighter",
    });
  });

  test("reads the composed class-record unions directly", () => {
    expect(decode(SpellcastingClassRecordSchema, wizardInput)).toMatchObject({
      className: "wizard",
    });
    expect(decode(NonWizardClassRecordSchema, warlockInput)).toMatchObject({
      className: "warlock",
    });
    expect(decode(ClassRecordSchema, fighterInput)).toMatchObject({
      className: "fighter",
    });
  });

  test("reads class-specific feature records directly", () => {
    expect(
      decode(BardClassFeatureRecordSchema, bardicInspirationInput),
    ).toMatchObject({ className: "bard" });
    expect(
      decode(WizardClassFeatureRecordSchema, wizardArcaneRecoveryInput),
    ).toMatchObject({ className: "wizard" });
    expect(
      decode(BarbarianClassFeatureRecordSchema, barbarianRageInput),
    ).toMatchObject({ className: "barbarian" });
    expect(
      decode(FighterClassFeatureRecordSchema, fighterActionSurgeInput),
    ).toMatchObject({ className: "fighter" });
  });
});
