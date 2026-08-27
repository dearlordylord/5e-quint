import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Match, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  discoverSrdStatBlocks,
  SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
} from "../../../../scripts/srd521-stat-block-parity.ts";

import {
  AuthoredExecutableProcedureSchema,
  CreatureTraitSchema,
  SrdStatBlockRecordSchema,
  StandaloneCreatureSenseSchema,
  StandaloneStatBlockSchema,
  StatBlockCommunicationSchema,
  StatBlockLanguageSetSchema,
  StatBlockLiteralValueSchema,
  StatBlockProcedureEntrySchema,
  StatBlockProcedureResourceRefsSchema,
  StatBlockProcedureResourceSchema,
  StatBlockTextOnlyReasonSchema,
} from "./schema.ts";
import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";
import { bindRawCorrespondence } from "./stat-block-raw-correspondence-binding.test-support.ts";

/*
 * This is an independent source oracle for the installed pilot records. The
 * values below are transcribed from the complete local SRD 5.2.1 stat-block
 * spans named in `source`; they intentionally do not import a content JSON or
 * Dhall peer. The general section vocabulary and procedure facts are bounded
 * by Monsters/Overview.md:205-265. Hit Dice is the one explicitly deferred
 * authored fact. XP and Proficiency Bonus are printed source facts derived
 * from Challenge Rating, but have no authored field in this schema. Each
 * `rawSpanSha256` is an integrity binding to the cited local text, not a
 * semantic parser or a second source of authored facts.
 */

type NonEmpty<T> = readonly [T, ...T[]];

type EncodedLiteralValue = Schema.Schema.Encoded<
  typeof StatBlockLiteralValueSchema
>;
type EncodedProcedure = Schema.Schema.Encoded<
  typeof AuthoredExecutableProcedureSchema
>;
type EncodedProcedureEffect = Extract<
  EncodedProcedure,
  { readonly kind: "attack_roll" }
>["onHit"][number];
type EncodedDamageEffect = Extract<
  EncodedProcedureEffect,
  { readonly kind: "damage" }
>;
type EncodedDamageAmount = EncodedDamageEffect["amount"];
type EncodedDamageExpression = Extract<
  EncodedDamageAmount,
  { readonly expr: unknown }
>["expr"];
type EncodedResourceRefs = Schema.Schema.Encoded<
  typeof StatBlockProcedureResourceRefsSchema
>;
type EncodedSomeResourceRefs = Extract<
  EncodedResourceRefs,
  { readonly kind: "some" }
>;
type EncodedStandaloneStatBlock = Schema.Schema.Encoded<
  typeof StandaloneStatBlockSchema
>;
type EncodedStandaloneSpeed = Schema.Schema.Type<
  typeof StandaloneStatBlockSchema
>["speeds"][number];
type EncodedStandaloneSense = Schema.Schema.Type<
  typeof StandaloneCreatureSenseSchema
>;
type EncodedCommunication = Schema.Schema.Encoded<
  typeof StatBlockCommunicationSchema
>;
type EncodedLanguageSet = Schema.Schema.Encoded<
  typeof StatBlockLanguageSetSchema
>;
type EncodedTrait = Schema.Schema.Encoded<typeof CreatureTraitSchema>;
type EncodedTextOnlyReason = Schema.Schema.Encoded<
  typeof StatBlockTextOnlyReasonSchema
>;

const decode = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  input: Schema.Schema.Encoded<S>,
): Schema.Schema.Type<S> => Schema.decodeUnknownSync(schema)(input);

const noResourceRefs: Extract<EncodedResourceRefs, { readonly kind: "none" }> =
  { kind: "none" };

/** The `some` branch is deliberately impossible to call without an ordinal. */
const resourceRefs = (
  firstOrdinal: EncodedSomeResourceRefs["ordinals"][number],
  ...remainingOrdinals: readonly EncodedSomeResourceRefs["ordinals"][number][]
): EncodedSomeResourceRefs => {
  const ordinals: EncodedSomeResourceRefs["ordinals"] = [
    firstOrdinal,
    ...remainingOrdinals,
  ];
  return { kind: "some", ordinals };
};

const literal = (value: number): EncodedLiteralValue => ({
  kind: "literal",
  value,
});

const dice = (
  diceCount: number,
  dieSize: number,
  flat?: number,
): EncodedDamageExpression => ({
  dice: diceCount,
  dieSize,
  ...(flat === undefined ? {} : { flat }),
});

const damage = (
  damageType: EncodedDamageEffect["damageType"],
  staticValue: number,
  expression?: EncodedDamageExpression,
): EncodedProcedureEffect => ({
  kind: "damage",
  damageType,
  amount:
    expression === undefined
      ? { kind: "fixed", static: staticValue }
      : { kind: "fixed", expr: expression, static: staticValue },
});

const advantageDamage = (
  damageType: Extract<
    EncodedProcedureEffect,
    { readonly kind: "conditional_bonus_damage" }
  >["damageType"],
): EncodedProcedureEffect => ({
  kind: "conditional_bonus_damage",
  when: { kind: "attack_roll_had_advantage" },
  damageType,
  amount: {
    kind: "fixed",
    expr: dice(1, 4),
    static: 2,
  },
});

const sizeCondition = (
  condition: Extract<
    EncodedProcedureEffect,
    { readonly kind: "apply_condition_if_target_size_at_most" }
  >["condition"],
  maxCreatureSize: Extract<
    EncodedProcedureEffect,
    { readonly kind: "apply_condition_if_target_size_at_most" }
  >["maxCreatureSize"],
): EncodedProcedureEffect => ({
  kind: "apply_condition_if_target_size_at_most",
  condition,
  maxCreatureSize,
});

const executable = (
  procedureOrdinal: number,
  procedure: EncodedProcedure,
  refs: EncodedResourceRefs = noResourceRefs,
): Extract<
  Schema.Schema.Type<typeof StatBlockProcedureEntrySchema>,
  { readonly kind: "executable" }
> => {
  const entry = decode(StatBlockProcedureEntrySchema, {
    kind: "executable",
    procedureOrdinal,
    procedure,
    resourceRefs: refs,
  });
  if (entry.kind === "executable") return entry;
  throw new Error("The executable correspondence entry decoded as textOnly.");
};

type EncodedAttackProcedure = Extract<
  EncodedProcedure,
  { readonly kind: "attack_roll" }
>;
type EncodedAttackInput = {
  readonly procedureOrdinal: number;
  readonly attackBonus: number;
  readonly onHit: NonEmpty<EncodedProcedureEffect>;
} & (
  | Omit<
      Extract<EncodedAttackProcedure, { readonly attackType: "melee" }>,
      "kind" | "attackBonus" | "onHit"
    >
  | Omit<
      Extract<EncodedAttackProcedure, { readonly attackType: "ranged" }>,
      "kind" | "attackBonus" | "onHit"
    >
);

const attack = (
  input: EncodedAttackInput,
): Schema.Schema.Type<typeof StatBlockProcedureEntrySchema> => {
  const { procedureOrdinal, attackBonus, onHit, ...procedure } = input;
  return executable(procedureOrdinal, {
    kind: "attack_roll",
    ...procedure,
    attackBonus: literal(attackBonus),
    onHit,
  });
};

const multiattack = (
  procedureOrdinal: number,
  dispatchProcedureOrdinal: number,
  count: number,
) =>
  executable(procedureOrdinal, {
    kind: "multiattack",
    name: "Multiattack",
    dispatches: [
      {
        procedureOrdinal: dispatchProcedureOrdinal,
        count: literal(count),
      },
    ],
  });

const textOnly = (
  procedureOrdinal: number,
  name: string,
  description: string,
  reason: EncodedTextOnlyReason,
  refs: EncodedResourceRefs = noResourceRefs,
): Extract<
  Schema.Schema.Type<typeof StatBlockProcedureEntrySchema>,
  { readonly kind: "textOnly" }
> => {
  const entry = decode(StatBlockProcedureEntrySchema, {
    kind: "textOnly",
    procedureOrdinal,
    name,
    description,
    reason,
    resourceRefs: refs,
  });
  if (entry.kind === "textOnly") return entry;
  throw new Error("The textOnly correspondence entry decoded as executable.");
};

const actionOption = (procedureOrdinal: number) =>
  executable(procedureOrdinal, {
    kind: "action_option",
    name: "Nimble Escape",
    options: ["disengage", "hide"],
  });

const trait = (
  name: string,
  description: string,
  effect?: NonNullable<EncodedTrait["effect"]>,
): EncodedTrait => ({
  name,
  description,
  ...(effect === undefined ? {} : { effect }),
});

type EncodedDarkvision = Extract<
  EncodedStandaloneSense,
  { readonly kind: "darkvision" }
>;

const darkvision = (
  rangeFeet: number,
  qualifier?: EncodedDarkvision["qualifier"],
): EncodedDarkvision => ({
  kind: "darkvision",
  rangeFeet,
  ...(qualifier === undefined ? {} : { qualifier }),
});

const blindsight = (
  rangeFeet: number,
): Exclude<
  EncodedStandaloneSense,
  Extract<EncodedStandaloneSense, { readonly kind: "darkvision" }>
> & {
  readonly kind: "blindsight";
} => ({
  kind: "blindsight",
  rangeFeet,
});

const speed = (
  kind: EncodedStandaloneSpeed["kind"],
  feet: number,
): EncodedStandaloneSpeed =>
  Match.value(kind).pipe(
    Match.when("walk", () => ({ kind: "walk", feet: literal(feet) }) as const),
    Match.when("fly", () => ({ kind: "fly", feet: literal(feet) }) as const),
    Match.when("swim", () => ({ kind: "swim", feet: literal(feet) }) as const),
    Match.when(
      "climb",
      () => ({ kind: "climb", feet: literal(feet) }) as const,
    ),
    Match.when(
      "burrow",
      () => ({ kind: "burrow", feet: literal(feet) }) as const,
    ),
    Match.exhaustive,
  );

const namedLanguages = (
  firstLanguage: string,
  ...remainingLanguages: readonly string[]
): Extract<EncodedLanguageSet, { readonly kind: "named" }> => ({
  kind: "named",
  languages: [firstLanguage, ...remainingLanguages],
});

const spoken = (
  firstLanguage: string,
  ...remainingLanguages: readonly string[]
): Extract<
  EncodedCommunication,
  { readonly kind: "spoken_and_understood" }
> => ({
  kind: "spoken_and_understood",
  languages: namedLanguages(firstLanguage, ...remainingLanguages),
});

const understood = (
  firstLanguage: string,
  ...remainingLanguages: readonly string[]
): Extract<
  EncodedCommunication,
  { readonly kind: "understood_but_cannot_speak" }
> => ({
  kind: "understood_but_cannot_speak",
  languages: namedLanguages(firstLanguage, ...remainingLanguages),
});

const dailyResource = (
  ordinal: number,
  uses: number,
): Schema.Schema.Type<typeof StatBlockProcedureResourceSchema> =>
  decode(StatBlockProcedureResourceSchema, {
    ordinal,
    ownership: "shared",
    limit: { kind: "daily", uses },
  });

type StandaloneStatBlockInput = Omit<
  EncodedStandaloneStatBlock,
  "ac" | "hp"
> & {
  readonly ac: number;
  readonly hp: number;
};

const standaloneStatBlock = (
  input: StandaloneStatBlockInput,
): Schema.Schema.Type<typeof StandaloneStatBlockSchema> => {
  const {
    ac,
    hp,
    creatureTypeTags,
    savingThrowModifiers,
    skillModifiers,
    vulnerabilities,
    resistances,
    immunities,
    senses,
    gear,
    resources,
    bonusActions,
    reactions,
    traits,
    ...required
  } = input;
  return decode(StandaloneStatBlockSchema, {
    ...required,
    ...(creatureTypeTags === undefined ? {} : { creatureTypeTags }),
    ac: { value: literal(ac) },
    hp: literal(hp),
    ...(savingThrowModifiers === undefined ? {} : { savingThrowModifiers }),
    ...(skillModifiers === undefined ? {} : { skillModifiers }),
    ...(vulnerabilities === undefined ? {} : { vulnerabilities }),
    ...(resistances === undefined ? {} : { resistances }),
    ...(immunities === undefined ? {} : { immunities }),
    ...(senses === undefined ? {} : { senses }),
    ...(gear === undefined ? {} : { gear }),
    ...(resources === undefined ? {} : { resources }),
    ...(bonusActions === undefined ? {} : { bonusActions }),
    ...(reactions === undefined ? {} : { reactions }),
    ...(traits === undefined ? {} : { traits }),
  });
};

type SourceRecordInput = Omit<
  Schema.Schema.Encoded<typeof SrdStatBlockRecordSchema>,
  "kind" | "provenance" | "statBlock"
> & {
  readonly source: string;
  readonly rawSpanSha256: string;
  readonly statBlock: EncodedStandaloneStatBlock;
};

type SourceCorrespondenceExpectation = {
  readonly record: Schema.Schema.Type<typeof SrdStatBlockRecordSchema>;
  readonly rawSpanSha256: string;
};

const sourceRecord = (
  input: SourceRecordInput,
): SourceCorrespondenceExpectation => ({
  record: decode(SrdStatBlockRecordSchema, {
    id: input.id,
    kind: "statBlock",
    name: input.name,
    challengeRating: input.challengeRating,
    statBlock: input.statBlock,
    provenance: { kind: "srd-5.2.1", section: input.source },
  }),
  rawSpanSha256: input.rawSpanSha256,
});

const sourceCorrespondence: readonly SourceCorrespondenceExpectation[] = [
  sourceRecord({
    id: "stat_block_bat",
    name: "Bat",
    source: "Animals.md:164-185",
    rawSpanSha256:
      "defb04cbbc415a30faa363f9b875d44655475fd9b89195848a438828775cfae2",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 1,
      speeds: [speed("walk", 5), speed("fly", 30)],
      abilityScores: { str: 2, dex: 15, con: 8, int: 2, wis: 12, cha: 4 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -3 },
      ],
      senses: [blindsight(60)],
      passivePerception: 11,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_cat",
    name: "Cat",
    source: "Animals.md:319-344",
    rawSpanSha256:
      "07603956e98e94c4f4686b11a923a090d9ed1db5a5ac8437399b593e05b768fb",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 2,
      speeds: [speed("walk", 40), speed("climb", 40)],
      abilityScores: { str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7 },
      initiative: { modifier: 2, score: 12 },
      skillModifiers: [
        { skill: "perception", modifier: 3 },
        { skill: "stealth", modifier: 4 },
      ],
      senses: [darkvision(60)],
      passivePerception: 13,
      communication: { kind: "none" },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 4 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -2 },
      ],
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Scratch",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("slashing", 1)],
        }),
      ],
      traits: [
        trait(
          "Jumper",
          "The cat's jump distance is determined using its Dexterity rather than its Strength.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_frog",
    name: "Frog",
    source: "Animals.md:612-638",
    rawSpanSha256:
      "43edacb8ef705e64d60a62d9739631423f901b4ab7da8b8588f93347c467edf0",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 11,
      hp: 1,
      speeds: [speed("walk", 20), speed("swim", 20)],
      abilityScores: { str: 1, dex: 13, con: 8, int: 1, wis: 8, cha: 3 },
      initiative: { modifier: 1, score: 11 },
      savingThrowModifiers: [
        { ability: "str", modifier: -5 },
        { ability: "dex", modifier: 1 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -5 },
        { ability: "wis", modifier: -1 },
        { ability: "cha", modifier: -4 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 1 },
        { skill: "stealth", modifier: 3 },
      ],
      senses: [darkvision(30)],
      passivePerception: 11,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 3,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
      traits: [
        trait("Amphibious", "The frog can breathe air and water."),
        trait(
          "Standing Leap",
          "The frog's Long Jump is up to 10 feet and its High Jump is up to 5 feet with or without a running start.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_hawk",
    name: "Hawk",
    source: "Animals.md:1454-1475",
    rawSpanSha256:
      "729125ac5d094dade73f79cceb8c66d3de2d933dbb0c0290f18786bac8e4a030",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 13,
      hp: 1,
      speeds: [speed("walk", 10), speed("fly", 60)],
      abilityScores: { str: 5, dex: 16, con: 8, int: 2, wis: 14, cha: 6 },
      initiative: { modifier: 3, score: 13 },
      savingThrowModifiers: [
        { ability: "str", modifier: -3 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 2 },
        { ability: "cha", modifier: -2 },
      ],
      skillModifiers: [{ skill: "perception", modifier: 6 }],
      passivePerception: 16,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Talons",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("slashing", 1)],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_lizard",
    name: "Lizard",
    source: "Animals.md:1650-1676",
    rawSpanSha256:
      "e718d52398e8c6e45f4017175012854176d2a693c9eb0b379918e2612668ed87",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 10,
      hp: 2,
      speeds: [speed("walk", 20), speed("climb", 20)],
      abilityScores: { str: 2, dex: 11, con: 10, int: 1, wis: 8, cha: 3 },
      initiative: { modifier: 0, score: 10 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 0 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -5 },
        { ability: "wis", modifier: -1 },
        { ability: "cha", modifier: -4 },
      ],
      senses: [darkvision(30)],
      passivePerception: 9,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 2,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
      traits: [
        trait(
          "Spider Climb",
          "The lizard can climb difficult surfaces, including along ceilings, without needing to make an ability check.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_octopus",
    name: "Octopus",
    source: "Animals.md:1757-1788",
    rawSpanSha256:
      "a42bfd3a264eac2141e1bda9aae95ebdbb1825bea8c00f796458e9ddf45e0f05",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "small",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 3,
      speeds: [speed("walk", 5), speed("swim", 30)],
      abilityScores: { str: 4, dex: 15, con: 11, int: 3, wis: 10, cha: 4 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -3 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: -3 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 2 },
        { skill: "stealth", modifier: 6 },
      ],
      senses: [darkvision(30)],
      passivePerception: 12,
      communication: { kind: "none" },
      resources: [dailyResource(1, 1)],
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Tentacles",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("bludgeoning", 1)],
        }),
      ],
      reactions: [
        textOnly(
          1,
          "Ink Cloud",
          "Trigger: A creature ends its turn within 5 feet of the octopus while underwater. Response: The octopus releases ink that fills a 5-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink.",
          "unsupported_procedure_family",
          resourceRefs(1),
        ),
      ],
      traits: [
        trait(
          "Compression",
          "The octopus can move through a space as narrow as 1 inch without expending extra movement to do so.",
        ),
        trait("Water Breathing", "The octopus can breathe only underwater."),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_owl",
    name: "Owl",
    source: "Animals.md:1791-1818",
    rawSpanSha256:
      "e56c258210c346d32e8818185c82e47c22f963e6df1abf32b9f78e473b208ad0",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 11,
      hp: 1,
      speeds: [speed("walk", 5), speed("fly", 60)],
      abilityScores: { str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7 },
      initiative: { modifier: 1, score: 11 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 1 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -2 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 5 },
        { skill: "stealth", modifier: 5 },
      ],
      senses: [darkvision(120)],
      passivePerception: 15,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Talons",
          attackAbility: "dex",
          attackBonus: 3,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("slashing", 1)],
        }),
      ],
      traits: [
        trait(
          "Flyby",
          "The owl doesn't provoke an Opportunity Attack when it flies out of an enemy's reach.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_rat",
    name: "Rat",
    source: "Animals.md:1980-2005",
    rawSpanSha256:
      "2756f354f144644f7a2fe503ea35abc9403adb2079fe3493cb1aa724e4b6a6b9",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 10,
      hp: 1,
      speeds: [speed("walk", 20), speed("climb", 20)],
      abilityScores: { str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4 },
      initiative: { modifier: 0, score: 10 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 0 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: -3 },
      ],
      skillModifiers: [{ skill: "perception", modifier: 2 }],
      senses: [darkvision(30)],
      passivePerception: 12,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 2,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
      traits: [
        trait(
          "Agile",
          "The rat doesn't provoke an Opportunity Attack when it moves out of an enemy's reach.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_raven",
    name: "Raven",
    source: "Animals.md:2008-2035",
    rawSpanSha256:
      "84dfd8d386304960c5e4799fd0299b9cc92247adb27469cf4f6ffde4a9892d18",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 2,
      speeds: [speed("walk", 10), speed("fly", 50)],
      abilityScores: { str: 2, dex: 14, con: 10, int: 5, wis: 13, cha: 6 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -3 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -2 },
      ],
      skillModifiers: [{ skill: "perception", modifier: 3 }],
      passivePerception: 13,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Beak",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
      traits: [
        trait(
          "Mimicry",
          "The raven can mimic simple sounds it has heard, such as a whisper or chitter. A hearer can discern the sounds are imitations with a successful DC 10 Wisdom (Insight) check.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_spider",
    name: "Spider",
    source: "Animals.md:2197-2223",
    rawSpanSha256:
      "42224977c15d6ed2fe53ab28cc287a7daa391095b12be1b9e5c5ba93dfb9f7ed",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 1,
      speeds: [speed("walk", 20), speed("climb", 20)],
      abilityScores: { str: 2, dex: 14, con: 8, int: 1, wis: 10, cha: 2 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -5 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: -4 },
      ],
      skillModifiers: [{ skill: "stealth", modifier: 4 }],
      senses: [darkvision(30)],
      passivePerception: 10,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1), damage("poison", 2, dice(1, 4))],
        }),
      ],
      traits: [
        trait(
          "Spider Climb",
          "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check.",
        ),
        trait(
          "Web Walker",
          "The spider ignores movement restrictions caused by webs, and the spider knows the location of any other creature in contact with the same web.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_weasel",
    name: "Weasel",
    source: "Animals.md:2563-2583",
    rawSpanSha256:
      "e0a05b7f98653149470fa07c95386a05a3b6528625c3e5add56efd310c834144",
    challengeRating: 0,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 13,
      hp: 1,
      speeds: [speed("walk", 30), speed("climb", 30)],
      abilityScores: { str: 3, dex: 16, con: 8, int: 2, wis: 12, cha: 3 },
      initiative: { modifier: 3, score: 13 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: -1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -4 },
      ],
      skillModifiers: [
        { skill: "acrobatics", modifier: 5 },
        { skill: "perception", modifier: 3 },
        { skill: "stealth", modifier: 5 },
      ],
      senses: [darkvision(60)],
      passivePerception: 13,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 1)],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_venomous_snake",
    name: "Venomous Snake",
    source: "Animals.md:2489-2510",
    rawSpanSha256:
      "18232e057b67cdd0e453a4812dbda872f9a810cb19714fad20160f5296e6d1a3",
    challengeRating: 0.125,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 5,
      speeds: [speed("walk", 30), speed("swim", 30)],
      abilityScores: { str: 2, dex: 15, con: 11, int: 1, wis: 10, cha: 3 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -5 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: -4 },
      ],
      senses: [blindsight(10)],
      passivePerception: 10,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [
            damage("piercing", 4, dice(1, 4, 2)),
            damage("poison", 3, dice(1, 6)),
          ],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_imp",
    name: "Imp",
    source: "Monsters/Monsters-H-L.md:386-415",
    rawSpanSha256:
      "63d98014dc7bdd76ffdf9b16fd18677a166fcd47e52fecf5f84338c2729da71c",
    challengeRating: 1,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "fiend",
      creatureTypeTags: ["devil"],
      alignment: { order: "lawful", morality: "evil" },
      ac: 13,
      hp: 21,
      speeds: [speed("walk", 20), speed("fly", 40)],
      abilityScores: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
      initiative: { modifier: 3, score: 13 },
      savingThrowModifiers: [
        { ability: "str", modifier: -2 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: 1 },
        { ability: "int", modifier: 0 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: 2 },
      ],
      skillModifiers: [
        { skill: "deception", modifier: 4 },
        { skill: "insight", modifier: 3 },
        { skill: "stealth", modifier: 5 },
      ],
      resistances: { kind: "fixed", damageTypes: ["cold"] },
      immunities: {
        damageTypes: ["fire", "poison"],
        conditions: ["poisoned"],
      },
      senses: [darkvision(120, "unimpeded_by_magical_darkness")],
      passivePerception: 11,
      communication: spoken("Common", "Infernal"),
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Sting",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [
            damage("piercing", 6, dice(1, 6, 3)),
            damage("poison", 7, dice(2, 6)),
          ],
        }),
        textOnly(
          2,
          "Invisibility",
          "The imp casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
          "unsupported_procedure_family",
        ),
        textOnly(
          3,
          "Shape-Shift",
          "The imp shape-shifts to resemble a rat (Speed 20 ft.), a raven (20 ft., Fly 60 ft.), or a spider (20 ft., Climb 20 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed.",
          "unsupported_procedure_family",
        ),
      ],
      traits: [
        trait(
          "Magic Resistance",
          "The imp has Advantage on saving throws against spells and other magical effects.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_pseudodragon",
    name: "Pseudodragon",
    source: "Monsters/Monsters-P-S.md:292-319",
    rawSpanSha256:
      "fa45a6bda52866b5cd33f91f9e411a07632d1d7204f63cf0b762cedb6c389b1f",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "dragon",
      alignment: { order: "neutral", morality: "good" },
      ac: 14,
      hp: 10,
      speeds: [speed("walk", 15), speed("fly", 60)],
      abilityScores: { str: 6, dex: 15, con: 13, int: 10, wis: 12, cha: 10 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: -2 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: 1 },
        { ability: "int", modifier: 0 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: 0 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 5 },
        { skill: "stealth", modifier: 4 },
      ],
      senses: [blindsight(10), darkvision(60)],
      passivePerception: 15,
      communication: understood("Common", "Draconic"),
      actions: [
        multiattack(1, 2, 2),
        attack({
          procedureOrdinal: 2,
          name: "Bite",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 4, dice(1, 4, 2))],
        }),
        textOnly(
          3,
          "Sting",
          "Constitution Saving Throw: DC 12, one creature the pseudodragon can see within 5 feet. Failure: 5 (2d4) Poison damage, and the target has the Poisoned condition for 1 hour. Failure by 5 or More: While Poisoned, the target also has the Unconscious condition, which ends early if the target takes damage or a creature within 5 feet of it takes an action to wake it.",
          "unsupported_action_shape",
        ),
      ],
      traits: [
        trait(
          "Magic Resistance",
          "The pseudodragon has Advantage on saving throws against spells and other magical effects.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_quasit",
    name: "Quasit",
    source: "Monsters/Monsters-P-S.md:359-390",
    rawSpanSha256:
      "e53deb1bf50b2555d681ede33da74c9cd27c38fb7aa1c02e980b1c70f25191cd",
    challengeRating: 1,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "fiend",
      creatureTypeTags: ["demon"],
      alignment: { order: "chaotic", morality: "evil" },
      ac: 13,
      hp: 25,
      speeds: [speed("walk", 40)],
      abilityScores: { str: 5, dex: 17, con: 10, int: 7, wis: 10, cha: 10 },
      initiative: { modifier: 3, score: 13 },
      savingThrowModifiers: [
        { ability: "str", modifier: -3 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: -2 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: 0 },
      ],
      skillModifiers: [{ skill: "stealth", modifier: 5 }],
      resistances: {
        kind: "fixed",
        damageTypes: ["cold", "fire", "lightning"],
      },
      immunities: {
        damageTypes: ["poison"],
        conditions: ["poisoned"],
      },
      senses: [darkvision(120)],
      passivePerception: 10,
      communication: spoken("Abyssal", "Common"),
      resources: [dailyResource(1, 1)],
      actions: [
        textOnly(
          1,
          "Rend",
          "Melee Attack Roll: +5, reach 5 ft. Hit: 5 (1d4 + 3) Slashing damage, and the target has the Poisoned condition until the start of the quasit's next turn.",
          "unsupported_action_shape",
        ),
        textOnly(
          2,
          "Invisibility",
          "The quasit casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
          "unsupported_procedure_family",
        ),
        textOnly(
          3,
          "Scare",
          "Wisdom Saving Throw: DC 10, one creature within 20 feet. Failure: The target has the Frightened condition. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success. After 1 minute, it succeeds automatically.",
          "unsupported_action_shape",
          resourceRefs(1),
        ),
        textOnly(
          4,
          "Shape-Shift",
          "The quasit shape-shifts to resemble a bat (Speed 10 ft., Fly 40 ft.), a centipede (40 ft., Climb 40 ft.), or a toad (40 ft., Swim 40 ft.), or it returns to its true form. Its game statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed.",
          "unsupported_procedure_family",
        ),
      ],
      traits: [
        trait(
          "Magic Resistance",
          "The quasit has Advantage on saving throws against spells and other magical effects.",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_sprite",
    name: "Sprite",
    source: "Monsters/Monsters-P-S.md:1484-1512",
    rawSpanSha256:
      "dcc42b743c451462b50214f6e2168a58f19390191eecd3056cd62d60493d00d6",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "fey",
      alignment: { order: "neutral", morality: "good" },
      ac: 15,
      hp: 10,
      speeds: [speed("walk", 10), speed("fly", 40)],
      abilityScores: { str: 3, dex: 18, con: 10, int: 14, wis: 13, cha: 11 },
      initiative: { modifier: 4, score: 14 },
      savingThrowModifiers: [
        { ability: "str", modifier: -4 },
        { ability: "dex", modifier: 4 },
        { ability: "con", modifier: 0 },
        { ability: "int", modifier: 2 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: 0 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 3 },
        { skill: "stealth", modifier: 8 },
      ],
      passivePerception: 13,
      communication: spoken("Common", "Elvish", "Sylvan"),
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Needle Sword",
          attackAbility: "dex",
          attackBonus: 6,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 6, dice(1, 4, 4))],
        }),
        textOnly(
          2,
          "Enchanting Bow",
          "Ranged Attack Roll: +6, range 40/160 ft. Hit: 1 Piercing damage, and the target has the Charmed condition until the start of the sprite's next turn.",
          "unsupported_action_shape",
        ),
        textOnly(
          3,
          "Heart Sight",
          "Charisma Saving Throw: DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). Failure: The sprite knows the target's emotions and alignment.",
          "unsupported_action_shape",
        ),
        textOnly(
          4,
          "Invisibility",
          "The sprite casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
          "unsupported_procedure_family",
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_riding_horse",
    name: "Riding Horse",
    source: "Animals.md:2089-2108",
    rawSpanSha256:
      "7fa2e0ae5c68c747e3a4d8a103bcac5322004372cabce475999d97dc9053256c",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "large",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 11,
      hp: 13,
      speeds: [speed("walk", 60)],
      abilityScores: { str: 16, dex: 13, con: 12, int: 2, wis: 11, cha: 7 },
      initiative: { modifier: 1, score: 11 },
      savingThrowModifiers: [
        { ability: "str", modifier: 3 },
        { ability: "dex", modifier: 1 },
        { ability: "con", modifier: 1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 0 },
        { ability: "cha", modifier: -2 },
      ],
      passivePerception: 10,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Hooves",
          attackAbility: "str",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("bludgeoning", 7, dice(1, 8, 3))],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_wolf",
    name: "Wolf",
    source: "Animals.md:2587-2611",
    rawSpanSha256:
      "92b20c99b4236b5b0830199bed3f085c0df89eb3efd595ab4c42476bd4790501",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "medium",
      creatureType: "beast",
      alignment: "unaligned",
      ac: 12,
      hp: 11,
      speeds: [speed("walk", 40)],
      abilityScores: { str: 14, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [
        { ability: "str", modifier: 2 },
        { ability: "dex", modifier: 2 },
        { ability: "con", modifier: 1 },
        { ability: "int", modifier: -4 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: -2 },
      ],
      skillModifiers: [
        { skill: "perception", modifier: 5 },
        { skill: "stealth", modifier: 4 },
      ],
      senses: [darkvision(60)],
      passivePerception: 15,
      communication: { kind: "none" },
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Bite",
          attackAbility: "str",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [
            damage("piercing", 5, dice(1, 6, 2)),
            sizeCondition("prone", "medium"),
          ],
        }),
      ],
      traits: [
        trait(
          "Pack Tactics",
          "The wolf has Advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
          {
            kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
          },
        ),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_goblin_warrior",
    name: "Goblin Warrior",
    source: "Monsters/Monsters-E-G.md:721-748",
    rawSpanSha256:
      "4ed5cffa73cf3c2edbd548fa7227c554a6033d0e8dcc702b8f82a1cd4addb4d2",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "small",
      creatureType: "fey",
      creatureTypeTags: ["goblinoid"],
      alignment: { order: "chaotic", morality: "neutral" },
      ac: 15,
      hp: 10,
      speeds: [speed("walk", 30)],
      abilityScores: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
      initiative: { modifier: 2, score: 12 },
      savingThrowModifiers: [{ ability: "dex", modifier: 2 }],
      skillModifiers: [{ skill: "stealth", modifier: 6 }],
      senses: [darkvision(60)],
      passivePerception: 9,
      communication: spoken("Common", "Goblin"),
      gear: [
        { item: "Leather Armor" },
        { item: "Scimitar" },
        { item: "Shield" },
        { item: "Shortbow" },
      ],
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Scimitar",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "melee",
          reachFeet: 5,
          onHit: [
            damage("slashing", 5, dice(1, 6, 2)),
            advantageDamage("slashing"),
          ],
        }),
        attack({
          procedureOrdinal: 2,
          name: "Shortbow",
          attackAbility: "dex",
          attackBonus: 4,
          attackType: "ranged",
          rangeFeet: { normal: 80, long: 320 },
          ammunition: "arrow",
          onHit: [
            damage("piercing", 5, dice(1, 6, 2)),
            advantageDamage("piercing"),
          ],
        }),
      ],
      bonusActions: [actionOption(1)],
    }),
  }),
  sourceRecord({
    id: "stat_block_skeleton",
    name: "Skeleton",
    source: "Monsters/Monsters-P-S.md:1152-1175",
    rawSpanSha256:
      "244bab47d6f295b53ddcceae5764da8e41b4070fbb8bcd5e2f150ee2dbf58b82",
    challengeRating: 0.25,
    statBlock: standaloneStatBlock({
      size: "medium",
      creatureType: "undead",
      alignment: { order: "lawful", morality: "evil" },
      ac: 14,
      hp: 13,
      speeds: [speed("walk", 30)],
      abilityScores: { str: 10, dex: 16, con: 15, int: 6, wis: 8, cha: 5 },
      initiative: { modifier: 3, score: 13 },
      savingThrowModifiers: [
        { ability: "str", modifier: 0 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: 2 },
        { ability: "int", modifier: -2 },
        { ability: "wis", modifier: -1 },
        { ability: "cha", modifier: -3 },
      ],
      immunities: {
        damageTypes: ["poison"],
        conditions: ["exhaustion", "poisoned"],
      },
      vulnerabilities: { kind: "fixed", damageTypes: ["bludgeoning"] },
      senses: [darkvision(60)],
      passivePerception: 9,
      communication: {
        kind: "understood_but_cannot_speak",
        languages: {
          kind: "named_plus_other_languages",
          languages: ["Common"],
          additionalLanguages: 1,
        },
      },
      gear: [{ item: "Shortbow" }, { item: "Shortsword" }],
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Shortsword",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [damage("piercing", 6, dice(1, 6, 3))],
        }),
        attack({
          procedureOrdinal: 2,
          name: "Shortbow",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "ranged",
          rangeFeet: { normal: 80, long: 320 },
          ammunition: "arrow",
          onHit: [damage("piercing", 6, dice(1, 6, 3))],
        }),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_sphinx_of_wonder",
    name: "Sphinx of Wonder",
    source: "Monsters/Monsters-P-S.md:1316-1344",
    rawSpanSha256:
      "2cab70057b217442b9292dcfe03fb5640414891ad7a66e502bc25807c7097875",
    challengeRating: 1,
    statBlock: standaloneStatBlock({
      size: "tiny",
      creatureType: "celestial",
      alignment: { order: "lawful", morality: "good" },
      ac: 13,
      hp: 39,
      speeds: [speed("walk", 20), speed("fly", 40)],
      abilityScores: { str: 6, dex: 17, con: 13, int: 15, wis: 12, cha: 11 },
      initiative: { modifier: 3, score: 13 },
      skillModifiers: [
        { skill: "arcana", modifier: 4 },
        { skill: "religion", modifier: 4 },
        { skill: "stealth", modifier: 5 },
      ],
      savingThrowModifiers: [
        { ability: "str", modifier: -2 },
        { ability: "dex", modifier: 3 },
        { ability: "con", modifier: 1 },
        { ability: "int", modifier: 2 },
        { ability: "wis", modifier: 1 },
        { ability: "cha", modifier: 0 },
      ],
      resistances: {
        kind: "fixed",
        damageTypes: ["necrotic", "psychic", "radiant"],
      },
      senses: [darkvision(60)],
      passivePerception: 11,
      communication: spoken("Celestial", "Common"),
      resources: [dailyResource(1, 2)],
      actions: [
        attack({
          procedureOrdinal: 1,
          name: "Rend",
          attackAbility: "dex",
          attackBonus: 5,
          attackType: "melee",
          reachFeet: 5,
          onHit: [
            damage("slashing", 5, dice(1, 4, 3)),
            damage("radiant", 7, dice(2, 6)),
          ],
        }),
      ],
      reactions: [
        textOnly(
          1,
          "Burst of Ingenuity",
          "Trigger: The sphinx or another creature within 30 feet makes an ability check or a saving throw. Response: The sphinx adds 2 to the roll.",
          "unsupported_procedure_family",
          resourceRefs(1),
        ),
      ],
      traits: [
        trait(
          "Magic Resistance",
          "The sphinx has Advantage on saving throws against spells and other magical effects.",
        ),
      ],
    }),
  }),
] as const;

describe("SRD Stat Block source correspondence", () => {
  test("binds every expectation to its cited local SRD span", () => {
    for (const expectation of sourceCorrespondence) {
      const { record, rawSpanSha256 } = expectation;
      const source = record.provenance.section;
      expect(
        bindRawCorrespondence({
          source,
          expectedName: record.name,
          expectedSha256: rawSpanSha256,
        }),
        `Invalid local RAW binding for ${record.id} (${source})`,
      ).toMatchObject({
        tag: "bound",
        source,
        sha256: rawSpanSha256,
      });
    }
  });

  test("rejects synthetic span and digest drift", () => {
    const source = "Animals.md:1-2";
    const syntheticSpan = "## Synthetic Fixture\n\nBody.\n";
    const readFile = () => syntheticSpan;
    const expectedSha256 =
      "02f510e3c65a71089ac2a2f456600fba9ac7a172761e0b171418cc3015140b3d";

    expect(
      bindRawCorrespondence({
        source,
        expectedName: "Synthetic Fixture",
        expectedSha256,
        readFile,
      }),
    ).toMatchObject({ tag: "bound", source, sha256: expectedSha256 });

    expect(
      bindRawCorrespondence({
        source: "Animals.md:1-1",
        expectedName: "Synthetic Fixture",
        expectedSha256,
        readFile,
      }),
    ).toMatchObject({ tag: "invalid", reason: "digest-mismatch" });

    expect(
      bindRawCorrespondence({
        source: "Monsters/Monsters-A-B.md:1-2",
        expectedName: "Synthetic Fixture",
        expectedSha256,
        readFile,
      }),
    ).toMatchObject({ tag: "invalid", reason: "digest-mismatch" });

    expect(
      bindRawCorrespondence({
        source: "Animals.md:1-3",
        expectedName: "Synthetic Fixture",
        expectedSha256:
          "816b2803df931cf808c7c6973b3a85516a4f3d870e086cff87302f75deebff88",
        readFile: () => "## Synthetic Fixture\n\nChanged.\n",
      }),
    ).toMatchObject({ tag: "invalid", reason: "digest-mismatch" });

    expect(
      bindRawCorrespondence({
        source,
        expectedName: "Synthetic Fixture",
        expectedSha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
        readFile,
      }),
    ).toMatchObject({ tag: "invalid", reason: "digest-mismatch" });
  });

  test("matches installed pilot records against the independent all-facts matrix", () => {
    const expectedById = new Map(
      sourceCorrespondence.map(({ record }) => [record.id, record]),
    );
    const installedCorrespondenceRecords =
      srdStatBlockCollection.statBlocks.filter((record) =>
        expectedById.has(record.id),
      );
    const actualIds = installedCorrespondenceRecords.map((record) => record.id);

    expect(sourceCorrespondence).toHaveLength(expectedById.size);
    expect(installedCorrespondenceRecords).toHaveLength(
      sourceCorrespondence.length,
    );
    expect(new Set(actualIds).size).toBe(sourceCorrespondence.length);
    expect([...actualIds].sort()).toEqual([...expectedById.keys()].sort());

    for (const record of installedCorrespondenceRecords) {
      const expected = expectedById.get(record.id);
      expect(
        expected,
        `Missing RAW expectation for ${record.id}`,
      ).toBeDefined();
      expect(record).toEqual(expected);
    }
  });

  test("installs every canonical Animals identity present in the RAW denominator", () => {
    const animalsSourcePath = SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH;
    const animalsDiscovery = discoverSrdStatBlocks([
      {
        sourcePath: animalsSourcePath,
        contents: readFileSync(
          join(
            dirname(fileURLToPath(import.meta.url)),
            "../../../../",
            animalsSourcePath,
          ),
          "utf8",
        ),
      },
    ]);
    const animalsSourceIdentities = new Set(
      animalsDiscovery.identities.map((identity) =>
        normalizeStatBlockIdentity(identity.name),
      ),
    );
    const installedAnimalsIdentities = new Set(
      srdStatBlockCollection.statBlocks
        .filter((record) => record.provenance.section.startsWith("Animals.md:"))
        .map((record) => normalizeStatBlockIdentity(record.name)),
    );

    expect(animalsDiscovery.issues).toEqual([]);
    expect([...installedAnimalsIdentities].sort()).toEqual(
      [...animalsSourceIdentities].sort(),
    );
  });
});
