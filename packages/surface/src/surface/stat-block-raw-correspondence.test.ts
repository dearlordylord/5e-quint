import { describe, expect, test } from "vitest";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";

/*
 * This is an independent source oracle for the installed pilot records. The
 * values below are transcribed from the complete local SRD 5.2.1 stat-block
 * spans named in `source`; they intentionally do not import a content JSON or
 * Dhall peer. The general section vocabulary and procedure facts are bounded
 * by Monsters/Overview.md:205-265. Hit Dice is the one explicitly deferred
 * authored fact. XP and Proficiency Bonus are printed source facts derived
 * from Challenge Rating, but have no authored field in this schema.
 */

const noResourceRefs = { kind: "none" } as const;

type ResourceRefs = typeof noResourceRefs | ReturnType<typeof resourceRefs>;

const resourceRefs = (...ordinals: readonly number[]) => ({
  kind: "some" as const,
  ordinals,
});

const literal = (value: number) => ({ kind: "literal" as const, value });

const dice = (diceCount: number, dieSize: number, flat?: number) => ({
  dice: diceCount,
  dieSize,
  ...(flat === undefined ? {} : { flat }),
});

const damage = (
  damageType: string,
  staticValue: number,
  expression?: ReturnType<typeof dice>,
) => ({
  kind: "damage" as const,
  damageType,
  amount:
    expression === undefined
      ? { kind: "fixed" as const, static: staticValue }
      : { kind: "fixed" as const, expr: expression, static: staticValue },
});

const advantageDamage = (damageType: string) => ({
  kind: "conditional_bonus_damage" as const,
  when: { kind: "attack_roll_had_advantage" as const },
  damageType,
  amount: {
    kind: "fixed" as const,
    expr: dice(1, 4),
    static: 2,
  },
});

const sizeCondition = (condition: string, maxCreatureSize: string) => ({
  kind: "apply_condition_if_target_size_at_most" as const,
  condition,
  maxCreatureSize,
});

const executable = (
  procedureOrdinal: number,
  procedure: Record<string, unknown>,
  refs: ResourceRefs = noResourceRefs,
) => ({
  kind: "executable" as const,
  procedureOrdinal,
  procedure,
  resourceRefs: refs,
});

const attack = (input: {
  readonly procedureOrdinal: number;
  readonly name: string;
  readonly attackAbility: string;
  readonly attackBonus: number;
  readonly attackType: "melee" | "ranged";
  readonly onHit: readonly Record<string, unknown>[];
  readonly reachFeet?: number;
  readonly rangeFeet?: { readonly normal: number; readonly long: number };
  readonly ammunition?: string;
}) =>
  executable(input.procedureOrdinal, {
    kind: "attack_roll",
    attackAbility: input.attackAbility,
    attackBonus: literal(input.attackBonus),
    ...(input.reachFeet === undefined ? {} : { reachFeet: input.reachFeet }),
    ...(input.rangeFeet === undefined ? {} : { rangeFeet: input.rangeFeet }),
    onHit: input.onHit,
    attackType: input.attackType,
    ...(input.ammunition === undefined ? {} : { ammunition: input.ammunition }),
    name: input.name,
  });

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

const invisibility = (procedureOrdinal: number) =>
  executable(procedureOrdinal, {
    kind: "spellcasting",
    name: "Invisibility",
    ability: "cha",
    components: { v: false, s: false, m: false },
    groups: [
      {
        kind: "at_will",
        resourceRefs: noResourceRefs,
        spells: [{ spellId: "invisibility", restriction: "on itself" }],
      },
    ],
  });

const textOnly = (
  procedureOrdinal: number,
  name: string,
  description: string,
  reason: string,
  refs: ResourceRefs = noResourceRefs,
) => ({
  kind: "textOnly" as const,
  procedureOrdinal,
  name,
  description,
  reason,
  resourceRefs: refs,
});

const actionOption = (procedureOrdinal: number) =>
  executable(procedureOrdinal, {
    kind: "action_option",
    name: "Nimble Escape",
    options: ["disengage", "hide"],
  });

const trait = (
  name: string,
  description: string,
  effect?: Record<string, unknown>,
) => ({
  name,
  description,
  ...(effect === undefined ? {} : { effect }),
});

const darkvision = (rangeFeet: number, qualifier?: string) => ({
  kind: "darkvision",
  rangeFeet,
  ...(qualifier === undefined ? {} : { qualifier }),
});

const blindsight = (rangeFeet: number) => ({
  kind: "blindsight",
  rangeFeet,
});

const speed = (kind: string, feet: number) => ({
  kind,
  feet: literal(feet),
});

const namedLanguages = (...languages: readonly string[]) => ({
  kind: "named" as const,
  languages,
});

const spoken = (...languages: readonly string[]) => ({
  kind: "spoken_and_understood" as const,
  languages: namedLanguages(...languages),
});

const understood = (...languages: readonly string[]) => ({
  kind: "understood_but_cannot_speak" as const,
  languages: namedLanguages(...languages),
});

const dailyResource = (ordinal: number, uses: number) => ({
  ordinal,
  ownership: "shared" as const,
  limit: { kind: "daily" as const, uses },
});

const standaloneStatBlock = (input: {
  readonly size: string;
  readonly creatureType: string;
  readonly creatureTypeTags?: readonly string[];
  readonly alignment:
    | string
    | { readonly order: string; readonly morality: string };
  readonly ac: number;
  readonly hp: number;
  readonly speeds: readonly Record<string, unknown>[];
  readonly abilityScores: Record<string, number>;
  readonly initiative: { readonly modifier: number; readonly score: number };
  readonly savingThrowModifiers?: readonly Record<string, unknown>[];
  readonly skillModifiers?: readonly Record<string, unknown>[];
  readonly vulnerabilities?: Record<string, unknown>;
  readonly resistances?: Record<string, unknown>;
  readonly immunities?: Record<string, unknown>;
  readonly senses?: readonly Record<string, unknown>[];
  readonly passivePerception: number;
  readonly gear?: readonly Record<string, unknown>[];
  readonly communication: Record<string, unknown>;
  readonly resources?: readonly Record<string, unknown>[];
  readonly actions: readonly Record<string, unknown>[];
  readonly bonusActions?: readonly Record<string, unknown>[];
  readonly reactions?: readonly Record<string, unknown>[];
  readonly traits?: readonly Record<string, unknown>[];
}) => {
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
  return {
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
  };
};

const sourceRecord = (input: {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly challengeRating: number;
  readonly statBlock: Record<string, unknown>;
}) => ({
  id: input.id,
  kind: "statBlock" as const,
  name: input.name,
  challengeRating: input.challengeRating,
  statBlock: input.statBlock,
  provenance: { kind: "srd-5.2.1" as const, section: input.source },
});

const sourceCorrespondence = [
  sourceRecord({
    id: "stat_block_bat",
    name: "Bat",
    source: "Animals.md:164-185",
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
        invisibility(2),
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
          "Hit: 5 (1d4 + 3) Slashing damage, and the target has the Poisoned condition until the start of the quasit's next turn.",
          "unsupported_action_shape",
        ),
        invisibility(2),
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
          "Hit: 1 Piercing damage, and the target has the Charmed condition until the start of the sprite's next turn.",
          "unsupported_action_shape",
        ),
        textOnly(
          3,
          "Heart Sight",
          "Charisma Saving Throw: DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). Failure: The sprite knows the target's emotions and alignment.",
          "unsupported_action_shape",
        ),
        invisibility(4),
      ],
    }),
  }),
  sourceRecord({
    id: "stat_block_riding_horse",
    name: "Riding Horse",
    source: "Animals.md:2089-2108",
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
  test("matches every installed record against the independent all-facts matrix", () => {
    const expectedById = new Map(
      sourceCorrespondence.map((record) => [record.id, record]),
    );
    const actualIds = srdStatBlockCollection.statBlocks.map(
      (record) => record.id,
    );

    expect(sourceCorrespondence).toHaveLength(21);
    expect(srdStatBlockCollection.statBlocks).toHaveLength(21);
    expect(new Set(actualIds).size).toBe(21);
    expect([...actualIds].sort()).toEqual([...expectedById.keys()].sort());

    for (const record of srdStatBlockCollection.statBlocks) {
      const expected = expectedById.get(record.id);
      expect(
        expected,
        `Missing RAW expectation for ${record.id}`,
      ).toBeDefined();
      expect(record).toEqual(expected);
    }
  });
});
