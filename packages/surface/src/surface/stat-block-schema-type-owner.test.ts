import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import skeletonInput from "../../content/stat_block_skeleton.json";
import {
  ChallengeRatingSchema,
  PublishedSrdStatBlockRecordSchema,
  decodeStatBlockRecordSync,
} from "./schema.ts";
import {
  AuthoredStatBlockReactionTriggerSchema,
  AuthoredStatBlockReactionTriggerNonRecursiveSchema,
  CreatureTraitEffectSchema,
  StandaloneStatBlockValueSchema,
  StatBlockGmSpeedChoiceSchema,
  StatBlockProcedureDcSourceSchema,
  StatBlockProcedureResourceLimitSchema,
} from "./schema-spell.ts";
import {
  AUTHORED_STAT_BLOCK_REACTION_TRIGGER_KINDS,
  SRD_CHALLENGE_RATINGS,
  STAT_BLOCK_REACTION_TRIGGER_ANY_OF,
  STAT_BLOCK_REACTION_TRIGGER_CREATURE_CASTS_SPELL,
  STAT_BLOCK_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL,
  STAT_BLOCK_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS,
  STAT_BLOCK_REACTION_TRIGGER_SPELL_SAVE_OUTCOME,
  STAT_BLOCK_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE,
  STAT_BLOCK_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL,
  STAT_BLOCK_REACTION_WEAPON_FILTER_SPECIFIC_ITEM,
  type AuthoredStatBlockReactionTriggerEncoded,
  type AuthoredStatBlockReactionTriggerKind,
  type StatBlockGmSpeedChoiceAlternativesEncoded,
} from "./stat-block-types.ts";

const walkSpeed = {
  kind: "walk",
  feet: { kind: "literal", value: 30 },
} as const;
const flySpeed = {
  kind: "fly",
  feet: { kind: "literal", value: 60 },
  hover: true,
} as const;

const validGmSpeedChoiceAlternatives = [
  walkSpeed,
  flySpeed,
] as const satisfies StatBlockGmSpeedChoiceAlternativesEncoded;

// @ts-expect-error A GM Speed choice requires at least two alternatives.
const invalidGmSpeedChoiceAlternatives: StatBlockGmSpeedChoiceAlternativesEncoded =
  [walkSpeed];

test("round-trips positive authored Stat Block values and Life Bond ranges", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1_000_000 }), (value) => {
      const encodedLiteral: Schema.Codec.Encoded<
        typeof StandaloneStatBlockValueSchema
      > = { kind: "literal", value };
      const decodedLiteral = Schema.decodeUnknownSync(
        StandaloneStatBlockValueSchema,
      )(encodedLiteral);
      expect(
        Schema.encodeSync(StandaloneStatBlockValueSchema)(decodedLiteral),
      ).toEqual(encodedLiteral);

      const encodedTrait: Schema.Codec.Encoded<
        typeof CreatureTraitEffectSchema
      > = {
        kind: "caster_heal_link",
        rangeFeet: value,
      };
      const decodedTrait = Schema.decodeUnknownSync(CreatureTraitEffectSchema)(
        encodedTrait,
      );
      expect(
        Schema.encodeSync(CreatureTraitEffectSchema)(decodedTrait),
      ).toEqual(encodedTrait);
    }),
  );
});

test.each([0, -1, 1.5])(
  "rejects invalid authored Stat Block numeric value %s",
  (value) => {
    expect(
      Schema.decodeUnknownResult(StandaloneStatBlockValueSchema)({
        kind: "literal",
        value,
      })._tag,
    ).toBe("Failure");
    expect(
      Schema.decodeUnknownResult(CreatureTraitEffectSchema)({
        kind: "caster_heal_link",
        rangeFeet: value,
      })._tag,
    ).toBe("Failure");
  },
);

const encodedReactionTriggers = {
  [STAT_BLOCK_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL,
    weaponFilter: { kind: "weapon_property", property: "reach" },
  },
  [STAT_BLOCK_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE,
    requiresVisibleCreature: true,
    rangeFeet: 30,
  },
  [STAT_BLOCK_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS,
    rangeFeet: 60,
  },
  [STAT_BLOCK_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL,
    spellId: "synthetic_reaction_spell",
  },
  [STAT_BLOCK_REACTION_TRIGGER_CREATURE_CASTS_SPELL]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_CREATURE_CASTS_SPELL,
    components: ["V", "S"],
    spellLevelAtMost: 5,
  },
  [STAT_BLOCK_REACTION_TRIGGER_SPELL_SAVE_OUTCOME]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_SPELL_SAVE_OUTCOME,
    outcome: "failure",
    spellSchool: "abjuration",
    spellTargetsOnlySelf: true,
  },
  [STAT_BLOCK_REACTION_TRIGGER_ANY_OF]: {
    kind: STAT_BLOCK_REACTION_TRIGGER_ANY_OF,
    triggers: [
      {
        kind: STAT_BLOCK_REACTION_TRIGGER_ANY_OF,
        triggers: [
          {
            kind: STAT_BLOCK_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE,
          },
        ],
      },
    ],
  },
} as const satisfies Record<
  AuthoredStatBlockReactionTriggerKind,
  AuthoredStatBlockReactionTriggerEncoded
>;

const malformedNestedReactionTrigger = {
  kind: STAT_BLOCK_REACTION_TRIGGER_ANY_OF,
  triggers: [],
} as const;

// @ts-expect-error An any-of trigger requires at least one nested trigger.
const invalidNestedReactionTrigger: AuthoredStatBlockReactionTriggerEncoded =
  malformedNestedReactionTrigger;

const malformedSaveOutcomeReactionTrigger = {
  kind: STAT_BLOCK_REACTION_TRIGGER_SPELL_SAVE_OUTCOME,
  spellSchool: "abjuration",
} as const;

// @ts-expect-error A spell-save trigger requires its outcome.
const invalidSaveOutcomeReactionTrigger: AuthoredStatBlockReactionTriggerEncoded =
  malformedSaveOutcomeReactionTrigger;

describe("canonical Stat Block type owner", () => {
  test("rejects non-positive authored procedure quantities", () => {
    expect(() =>
      Schema.decodeUnknownSync(StatBlockProcedureResourceLimitSchema)({
        kind: "daily",
        uses: 0,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(StatBlockProcedureDcSourceSchema)({
        kind: "fixed",
        dc: -1,
      }),
    ).toThrow();
    expect(
      Schema.decodeUnknownSync(StatBlockProcedureDcSourceSchema)({
        kind: "fixed",
        dc: 15,
      }),
    ).toEqual({ kind: "fixed", dc: 15 });
  });

  test("enforces GM Speed choice cardinality independently at type and runtime boundaries", () => {
    const decoded = Schema.decodeUnknownSync(StatBlockGmSpeedChoiceSchema)({
      kind: "gm_choice",
      alternatives: validGmSpeedChoiceAlternatives,
    });

    expect(decoded.alternatives).toHaveLength(2);
    expect(() =>
      Schema.decodeUnknownSync(StatBlockGmSpeedChoiceSchema)({
        kind: "gm_choice",
        alternatives: invalidGmSpeedChoiceAlternatives,
      }),
    ).toThrow();
  });

  test("parses every canonical recursive reaction-trigger variant", () => {
    expect(Object.keys(encodedReactionTriggers)).toEqual(
      AUTHORED_STAT_BLOCK_REACTION_TRIGGER_KINDS,
    );

    for (const trigger of Object.values(encodedReactionTriggers)) {
      const decoded = Schema.decodeUnknownSync(
        AuthoredStatBlockReactionTriggerSchema,
      )(trigger);
      expect(
        Schema.encodeSync(AuthoredStatBlockReactionTriggerSchema)(decoded),
      ).toEqual(trigger);
    }
  });

  test("rejects malformed recursive reaction triggers", () => {
    expect(() =>
      Schema.decodeUnknownSync(AuthoredStatBlockReactionTriggerSchema)(
        invalidNestedReactionTrigger,
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(AuthoredStatBlockReactionTriggerSchema)(
        invalidSaveOutcomeReactionTrigger,
      ),
    ).toThrow();
  });

  test("decodes specific-item reaction references through the UnitId boundary", () => {
    const encoded = {
      kind: STAT_BLOCK_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL,
      weaponFilter: {
        kind: STAT_BLOCK_REACTION_WEAPON_FILTER_SPECIFIC_ITEM,
        itemId: "synthetic_reaction_weapon",
      },
    } as const;
    const decoded = Schema.decodeUnknownSync(
      AuthoredStatBlockReactionTriggerNonRecursiveSchema,
    )(encoded);

    expect(
      Schema.encodeSync(AuthoredStatBlockReactionTriggerNonRecursiveSchema)(
        decoded,
      ),
    ).toEqual(encoded);
    expect(() =>
      Schema.decodeUnknownSync(
        AuthoredStatBlockReactionTriggerNonRecursiveSchema,
      )({
        ...encoded,
        weaponFilter: { ...encoded.weaponFilter, itemId: " " },
      }),
    ).toThrow();
  });

  test("builds Challenge Rating decoding from the canonical values", () => {
    for (const challengeRating of SRD_CHALLENGE_RATINGS) {
      expect(
        Schema.decodeUnknownSync(ChallengeRatingSchema)(challengeRating),
      ).toBe(challengeRating);
    }
    expect(() => Schema.decodeUnknownSync(ChallengeRatingSchema)(31)).toThrow();
  });

  test("parses the canonical record and its published SRD specialization", () => {
    const record = decodeStatBlockRecordSync(skeletonInput);
    const publicationInput = {
      ...skeletonInput,
      rulesExcerpt: "Synthetic publication-boundary evidence.",
    };
    const published = Schema.decodeUnknownSync(
      PublishedSrdStatBlockRecordSchema,
    )(publicationInput);

    expect(record.id).toBe("stat_block_skeleton");
    expect(published).toMatchObject(record);
    expect(
      Schema.encodeSync(PublishedSrdStatBlockRecordSchema)(published),
    ).toEqual(publicationInput);
  });
});
