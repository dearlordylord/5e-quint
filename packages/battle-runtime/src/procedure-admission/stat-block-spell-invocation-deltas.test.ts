import { Schema } from "effect";
import {
  StatBlockRecordSchema,
  StatBlockSpellInvocationDeltasSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockRecord,
  StatBlockSpellInvocationDeltas,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { admitStatBlockSpellInvocationDeltas } from "./stat-block-spell-invocation-deltas.ts";

const decode = <A>(schema: Schema.Schema<A>, input: unknown): A =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(input);

const allDeltas = decode(StatBlockSpellInvocationDeltasSchema, [
  {
    kind: "transformation_form_creature_type_limit",
    creatureTypes: ["beast", "humanoid"],
  },
  {
    kind: "temporary_hit_points",
    spellGrant: "none",
    maintenanceRequirement: "not_required",
  },
  { kind: "concentration_requirement", requirement: "not_required" },
  {
    kind: "effect_termination",
    triggers: [{ kind: "same_invoker_recasts_spell" }],
  },
  {
    kind: "created_substance_substitution",
    replaces: "water",
    substitute: "wine",
  },
  {
    kind: "duration_override",
    duration: { unit: "hour", amount: 24 },
  },
  { kind: "target_limit", target: "self" },
  {
    kind: "movement_trace_suppression",
    subject: "invoker",
    whileCondition: "invisible",
    trace: "none",
  },
  {
    kind: "appearance_options",
    sizes: ["large", "medium"],
    bodyPlan: "biped",
  },
  {
    kind: "armor_class_already_includes_effect",
    projection: "already_included",
  },
  { kind: "application_timing", timing: "before_combat" },
]);

const equivalentSyntheticDeltas = [
  { kind: "target_limit", target: "self" },
  {
    kind: "duration_override",
    duration: { unit: "hour", amount: 24 },
  },
] as const;

function syntheticAuthoredRecord(input: {
  readonly id: string;
  readonly name: string;
  readonly section: string;
  readonly authoredExpression: string;
}): StatBlockRecord {
  return decode(StatBlockRecordSchema, {
    id: input.id,
    kind: "statBlock",
    name: input.name,
    provenance: { kind: "synthetic-test", section: input.section },
    challengeRating: 1,
    statBlock: {
      size: "medium",
      creatureType: "construct",
      alignment: "unaligned",
      ac: { value: { kind: "literal", value: 12 } },
      hp: { kind: "literal", value: 10 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
      initiative: { modifier: 0, score: 10 },
      senses: [{ kind: "darkvision", rangeFeet: 60 }],
      passivePerception: 10,
      communication: { kind: "none" },
      actions: [
        {
          kind: "executable",
          procedureOrdinal: 1,
          procedure: {
            kind: "spellcasting",
            name: "Synthetic Invocation",
            ability: "int",
            groups: [
              {
                kind: "at_will",
                resourceRefs: { kind: "none" },
                spells: [
                  {
                    spellId: "unit_spell_synthetic_equivalent",
                    restriction: {
                      authoredExpression: input.authoredExpression,
                      deltas: equivalentSyntheticDeltas,
                    },
                  },
                ],
              },
            ],
          },
          resourceRefs: { kind: "none" },
        },
      ],
    },
  });
}

function restrictedDeltas(
  record: StatBlockRecord,
): StatBlockSpellInvocationDeltas {
  const entry = record.statBlock.actions?.[0];
  if (entry?.kind !== "executable" || entry.procedure.kind !== "spellcasting") {
    throw new Error("Synthetic record did not parse as spellcasting.");
  }
  const restriction = entry.procedure.groups[0].spells[0].restriction;
  if (restriction === undefined) {
    throw new Error("Synthetic record did not parse its restriction.");
  }
  return restriction.deltas;
}

describe("Stat Block spell invocation delta admission", () => {
  test("returns one precise missing semantic owner for every admitted delta", () => {
    expect(
      admitStatBlockSpellInvocationDeltas(allDeltas).missingOwners.map(
        ({ kind }) => kind,
      ),
    ).toEqual([
      "missingTransformationFormCreatureTypeLimitOwner",
      "missingTemporaryHitPointsOwner",
      "missingConcentrationRequirementOwner",
      "missingEffectTerminationOwner",
      "missingCreatedSubstanceSubstitutionOwner",
      "missingDurationOverrideOwner",
      "missingTargetLimitOwner",
      "missingMovementTraceSuppressionOwner",
      "missingAppearanceOptionsOwner",
      "missingArmorClassAlreadyIncludesEffectOwner",
      "missingApplicationTimingOwner",
    ]);
  });

  test("admits equivalent parsed records independently of authored identity and expression", () => {
    const amberRecord = syntheticAuthoredRecord({
      id: "stat_block_synthetic_amber_invoker",
      name: "Synthetic Amber Invoker",
      section: "Synthetic/Amber.md:1-2",
      authoredExpression: "amber-only synthetic expression",
    });
    const cobaltRecord = syntheticAuthoredRecord({
      id: "stat_block_synthetic_cobalt_invoker",
      name: "Synthetic Cobalt Invoker",
      section: "Synthetic/Cobalt.md:8-9",
      authoredExpression: "cobalt-only synthetic expression",
    });

    const amberAdmission = admitStatBlockSpellInvocationDeltas(
      restrictedDeltas(amberRecord),
    );
    const cobaltAdmission = admitStatBlockSpellInvocationDeltas(
      restrictedDeltas(cobaltRecord),
    );

    expect(amberAdmission).toEqual(cobaltAdmission);
    const serializedAdmission = JSON.stringify(amberAdmission);
    for (const forbidden of [
      "amber",
      "cobalt",
      "authoredExpression",
      "spellId",
      "provenance",
    ]) {
      expect(serializedAdmission).not.toContain(forbidden);
    }
  });
});
