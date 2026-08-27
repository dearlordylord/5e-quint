import { Match } from "effect";

import type { SrdStatBlockSourceOccurrence } from "../../../../scripts/srd521-stat-block-parity.ts";

import type { SrdStatBlockRecord, StatBlockProcedureEntry } from "./types.ts";

/**
 * Identity-free test oracle for comparing parser-bounded local SRD spans with
 * authored Stat Blocks. Hit Dice are deliberately outside this projection;
 * the current Surface Stat Block boundary owns only the printed HP average.
 */

const ABILITY_NAMES = ["str", "dex", "con", "int", "wis", "cha"] as const;
type AbilityName = (typeof ABILITY_NAMES)[number];

const PROCEDURE_SECTIONS = [
  "Actions",
  "Bonus Actions",
  "Reactions",
  "Legendary Actions",
] as const;
type ProcedureSection = (typeof PROCEDURE_SECTIONS)[number];
const RAW_SECTIONS = ["Traits", ...PROCEDURE_SECTIONS] as const;
type RawSection = (typeof RAW_SECTIONS)[number];

type LanguageSetProjection =
  | { readonly kind: "named"; readonly languages: readonly string[] }
  | {
      readonly kind: "named_plus_other_languages";
      readonly languages: readonly string[];
      readonly additionalLanguages: number;
    }
  | { readonly kind: "all" };

type CommunicationProjection =
  | {
      readonly kind: "none";
      readonly telepathy?: TelepathyProjection;
    }
  | {
      readonly kind: "spoken_and_understood";
      readonly languages: LanguageSetProjection;
      readonly additionallyUnderstoodButCannotSpeak?: LanguageSetProjection;
      readonly speechRestriction?: {
        readonly kind: "cannot_speak_in_forms";
        readonly forms: readonly string[];
      };
      readonly telepathy?: TelepathyProjection;
    }
  | {
      readonly kind: "understood_but_cannot_speak";
      readonly languages: LanguageSetProjection;
      readonly telepathy?: TelepathyProjection;
    }
  | {
      readonly kind: "understands_commands_only";
      readonly telepathy?: TelepathyProjection;
    };

type TelepathyProjection = {
  readonly rangeFeet: number;
  readonly response?: "receiving_creature_cannot_respond";
  readonly requiresLanguageUnderstanding?: LanguageSetProjection;
};

type RawEntry = {
  readonly section: RawSection;
  readonly name: string;
  readonly description: string;
};

type NamedModifier = {
  readonly name: string;
  readonly modifier: number;
};

type ResourceLimitProjection =
  | {
      readonly kind: "daily";
      readonly uses: number;
      readonly ownership: "shared" | "each";
    }
  | { readonly kind: "recharge"; readonly minimumRoll: number };

type DamageProjection = {
  readonly damageType: string;
  readonly static: number;
  readonly dice?: number;
  readonly dieSize?: number;
  readonly flat?: number;
};

type SpellProjection = {
  readonly spellId: string;
  readonly castAtLevel?: number;
  readonly restriction?: string;
};

type ProcedureProjection =
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "textOnly";
      readonly description: string;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "attack_roll";
      readonly attackType: "melee" | "ranged";
      readonly attackBonus: number;
      readonly attackAbilityCandidates: readonly AbilityName[];
      readonly reachFeet?: number;
      readonly rangeFeet?: { readonly normal: number; readonly long: number };
      readonly onHit: readonly DamageProjection[];
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "save";
      readonly ability: AbilityName;
      readonly dc: number;
      readonly area: {
        readonly kind: "line";
        readonly lengthFeet: number;
        readonly widthFeet: number;
      };
      readonly onFail: DamageProjection;
      readonly onSuccess: "half_damage";
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "multiattack";
      readonly dispatches: readonly {
        readonly procedureName: string;
        readonly count: number;
      }[];
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "action_option";
      readonly options: readonly string[];
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "spellcasting";
      readonly ability: AbilityName;
      readonly spellSaveDc?: number;
      readonly spellAttackBonus?: number;
      readonly materialComponents: false;
      readonly groups: readonly {
        readonly kind: "at_will" | "limited";
        readonly spells: readonly SpellProjection[];
        readonly resourceLimits: readonly ResourceLimitProjection[];
      }[];
      readonly resourceLimits: readonly ResourceLimitProjection[];
    };

type ScopedGeneralFacts = {
  readonly challengeRating: number;
  readonly size:
    | string
    | {
        readonly kind: "alternatives";
        readonly options: readonly string[];
      };
  readonly creatureType: string;
  readonly creatureTypeTags: readonly string[];
  readonly alignment:
    | "unaligned"
    | { readonly order: string; readonly morality: string };
  readonly ac: { readonly kind: "literal"; readonly value: number };
  readonly hp: { readonly kind: "literal"; readonly value: number };
  readonly speeds: readonly {
    readonly kind: string;
    readonly feet: number;
    readonly hover: boolean;
  }[];
  readonly abilityScores: Readonly<Record<AbilityName, number>>;
  readonly initiative: { readonly modifier: number; readonly score: number };
  readonly savingThrowModifiers: readonly NamedModifier[];
  readonly skillModifiers: readonly NamedModifier[];
  readonly vulnerabilities: readonly string[];
  readonly resistances: readonly string[];
  readonly immunityDamageTypes: readonly string[];
  readonly immunityConditions: readonly string[];
  readonly senses: readonly {
    readonly kind: string;
    readonly rangeFeet: number;
    readonly qualifier?: string;
  }[];
  readonly passivePerception: number;
  readonly gear: readonly {
    readonly item: string;
    readonly quantity: number;
  }[];
  readonly communication: CommunicationProjection;
  readonly legendaryActionUses?:
    | {
        readonly kind: "fixed";
        readonly uses: number;
      }
    | {
        readonly kind: "lair_bonus";
        readonly usesOutsideLair: number;
        readonly additionalUsesInLair: number;
      };
};

type RawStatBlockProjection = {
  readonly name: string;
  readonly sourceSection: string;
  readonly generalFacts: ScopedGeneralFacts;
  readonly entryNames: readonly string[];
  readonly traits: readonly {
    readonly name: string;
    readonly description: string;
  }[];
  readonly textOnlyProcedures: readonly {
    readonly section: ProcedureSection;
    readonly name: string;
    readonly description: string;
  }[];
  readonly procedures: readonly ProcedureProjection[];
};

const signedNumber = (value: string): number =>
  Number(value.replace("−", "-").replace("+", ""));

const normalizedProse = (value: string): string =>
  value.replaceAll("*", "").replace(/\s+/g, " ").trim();

const normalizedIdentifier = (value: string): string =>
  value.toLowerCase().replaceAll(" ", "_");

const normalizedProcedureName = (value: string): string =>
  value.replace(/ \((?:Recharge \d(?:–\d)?|\d+\/Day)\)$/, "");

const isRawSection = (value: string): value is RawSection =>
  RAW_SECTIONS.some((section) => section === value);

const proficiencyBonus = (challengeRating: number): number =>
  2 + Math.floor(Math.max(0, challengeRating - 1) / 4);

const rawAttackAbilityCandidates = (
  abilityScores: Readonly<Record<AbilityName, number>>,
  challengeRating: number,
  attackBonus: number,
): readonly AbilityName[] =>
  ABILITY_NAMES.filter(
    (ability) =>
      Math.floor((abilityScores[ability] - 10) / 2) +
        proficiencyBonus(challengeRating) ===
      attackBonus,
  );

const requireMatch = (
  value: string,
  pattern: RegExp,
  context: string,
): RegExpMatchArray => {
  const match = value.match(pattern);
  if (match === null) {
    throw new Error(`Unable to parse ${context}: ${value}`);
  }
  return match;
};

const requireLine = (
  lines: readonly string[],
  prefix: string,
  context: string,
): string => {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  if (line === undefined) {
    throw new Error(`Missing ${context} line beginning ${prefix}`);
  }
  return line;
};

const sortedStrings = (values: readonly string[]): readonly string[] =>
  [...values].sort((left, right) => left.localeCompare(right));

const sortedModifiers = (
  values: readonly NamedModifier[],
): readonly NamedModifier[] =>
  [...values].sort((left, right) => left.name.localeCompare(right.name));

const parseMetadata = (
  lines: readonly string[],
  context: string,
): Pick<
  ScopedGeneralFacts,
  "size" | "creatureType" | "creatureTypeTags" | "alignment"
> => {
  const metadataLine = lines.find(
    (line) => line.startsWith("*") && !line.startsWith("**"),
  );
  if (metadataLine === undefined) {
    throw new Error(`Missing ${context} creature metadata`);
  }
  const metadata = requireMatch(
    metadataLine,
    /^\*(.+?) (Aberration|Construct|Dragon|Elemental|Fey|Fiend|Humanoid|Monstrosity|Ooze|Plant)(?: \(([^)]+)\))?, (.+)\*$/,
    `${context} creature metadata`,
  );
  const sizeText = metadata[1] ?? "";
  const alignmentText = metadata[4] ?? "";
  const size = sizeText.includes(" or ")
    ? {
        kind: "alternatives" as const,
        options: sizeText.split(" or ").map((option) => option.toLowerCase()),
      }
    : sizeText.toLowerCase();
  const alignment =
    alignmentText === "Unaligned"
      ? ("unaligned" as const)
      : alignmentText === "Neutral"
        ? { order: "neutral", morality: "neutral" }
        : (() => {
            const parts = alignmentText.toLowerCase().split(" ");
            if (parts.length !== 2) {
              throw new Error(
                `Unable to parse ${context} alignment: ${alignmentText}`,
              );
            }
            return { order: parts[0] ?? "", morality: parts[1] ?? "" };
          })();

  return {
    size,
    creatureType: (metadata[2] ?? "").toLowerCase(),
    creatureTypeTags:
      metadata[3] === undefined ? [] : [metadata[3].toLowerCase()],
    alignment,
  };
};

const parseSpeeds = (
  lines: readonly string[],
  context: string,
): ScopedGeneralFacts["speeds"] =>
  requireLine(lines, "**Speed**", context)
    .replace("**Speed**", "")
    .trim()
    .split(", ")
    .map((part) => {
      const speed = requireMatch(
        part,
        /^(?:(Burrow|Climb|Fly|Swim) )?(\d+) ft\.(?: \((hover)\))?$/,
        `${context} Speed`,
      );
      return {
        kind: (speed[1] ?? "walk").toLowerCase(),
        feet: Number(speed[2]),
        hover: speed[3] === "hover",
      };
    });

const parseAbilityRow = (
  lines: readonly string[],
  label: "Score" | "Save",
  context: string,
): readonly number[] => {
  const values = requireLine(lines, `| **${label}**`, context)
    .split("|")
    .slice(2, 8)
    .map((value) => signedNumber(value.trim()));
  if (values.length !== ABILITY_NAMES.length) {
    throw new Error(`Expected six ${context} ${label} values`);
  }
  return values;
};

const abilityRecord = (
  values: readonly number[],
): Readonly<Record<AbilityName, number>> => ({
  str: values[0] ?? 0,
  dex: values[1] ?? 0,
  con: values[2] ?? 0,
  int: values[3] ?? 0,
  wis: values[4] ?? 0,
  cha: values[5] ?? 0,
});

const parseNamedModifiers = (
  lines: readonly string[],
  label: "Skills",
): readonly NamedModifier[] => {
  const line = lines.find((candidate) => candidate.startsWith(`**${label}**`));
  if (line === undefined) {
    return [];
  }
  return sortedModifiers(
    line
      .replace(`**${label}**`, "")
      .trim()
      .split(", ")
      .map((part) => {
        const modifier = requireMatch(part, /^(.+?) ([+−-]?\d+)$/, label);
        return {
          name: normalizedIdentifier(modifier[1] ?? ""),
          modifier: signedNumber(modifier[2] ?? ""),
        };
      }),
  );
};

const parseDamageTypes = (
  lines: readonly string[],
  label: "Vulnerabilities" | "Resistances",
): readonly string[] => {
  const line = lines.find((candidate) => candidate.startsWith(`**${label}**`));
  return line === undefined
    ? []
    : sortedStrings(
        line
          .replace(`**${label}**`, "")
          .trim()
          .split(", ")
          .map((value) => value.toLowerCase()),
      );
};

const parseImmunities = (
  lines: readonly string[],
): Pick<ScopedGeneralFacts, "immunityDamageTypes" | "immunityConditions"> => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Immunities**"),
  );
  if (line === undefined) {
    return { immunityDamageTypes: [], immunityConditions: [] };
  }
  const [damageTypes = "", conditions = ""] = line
    .replace("**Immunities**", "")
    .trim()
    .split("; ");
  const parseList = (value: string): readonly string[] =>
    value === ""
      ? []
      : sortedStrings(value.split(", ").map((item) => item.toLowerCase()));
  return {
    immunityDamageTypes: parseList(damageTypes),
    immunityConditions: parseList(conditions),
  };
};

const parseSenses = (
  lines: readonly string[],
  context: string,
): Pick<ScopedGeneralFacts, "senses" | "passivePerception"> => {
  const line = requireLine(lines, "**Senses**", context)
    .replace("**Senses**", "")
    .trim();
  const passive = requireMatch(
    line,
    /Passive Perception (\d+)/,
    `${context} Passive Perception`,
  );
  const sensesText = line.replace(/;? ?Passive Perception \d+/, "");
  const senses =
    sensesText === ""
      ? []
      : sensesText.split(", ").map((part) => {
          const sense = requireMatch(
            part,
            /^(Blindsight|Darkvision|Tremorsense|Truesight) (\d+) ft\.(?: \((.+)\))?$/,
            `${context} Senses`,
          );
          const qualifier =
            sense[3] === undefined
              ? undefined
              : sense[3] === "unimpeded by magical Darkness"
                ? "unimpeded_by_magical_darkness"
                : sense[3];
          return {
            kind: (sense[1] ?? "").toLowerCase(),
            rangeFeet: Number(sense[2]),
            ...(qualifier === undefined ? {} : { qualifier }),
          };
        });
  return {
    senses: [...senses].sort((left, right) =>
      left.kind.localeCompare(right.kind),
    ),
    passivePerception: Number(passive[1]),
  };
};

const parseGear = (lines: readonly string[]): ScopedGeneralFacts["gear"] => {
  const line = lines.find((candidate) => candidate.startsWith("**Gear**"));
  if (line === undefined) {
    return [];
  }
  return line
    .replace("**Gear**", "")
    .trim()
    .split(", ")
    .map((part) => {
      const gear = requireMatch(part, /^(.*?)(?: \((\d+)\))?$/, "Gear");
      return { item: gear[1] ?? "", quantity: Number(gear[2] ?? 1) };
    })
    .sort((left, right) => left.item.localeCompare(right.item));
};

const parseLanguageSet = (value: string): LanguageSetProjection => {
  const additional = value.match(/^(.+) plus one other language$/);
  return additional === null
    ? { kind: "named", languages: value.split(", ") }
    : {
        kind: "named_plus_other_languages",
        languages: [additional[1] ?? ""],
        additionalLanguages: 1,
      };
};

const parseCommunication = (
  lines: readonly string[],
  context: string,
): CommunicationProjection => {
  const text = requireLine(lines, "**Languages**", context)
    .replace("**Languages**", "")
    .trim();
  if (text === "None") {
    return { kind: "none" };
  }
  const [spoken = "", qualifier] = text.split("; ");
  if (qualifier?.startsWith("telepathy ") === true) {
    const telepathy = requireMatch(
      qualifier,
      /^telepathy (\d+) ft\.$/,
      `${context} telepathy`,
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      telepathy: { rangeFeet: Number(telepathy[1]) },
    };
  }
  if (qualifier?.startsWith("understands ") === true) {
    const understood = requireMatch(
      qualifier,
      /^understands (.+) but can't speak them$/,
      `${context} understood languages`,
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      additionallyUnderstoodButCannotSpeak: {
        kind: "named",
        languages: (understood[1] ?? "").split(" and "),
      },
    };
  }
  if (qualifier !== undefined) {
    throw new Error(`Unsupported ${context} Languages shape: ${text}`);
  }
  return { kind: "spoken_and_understood", languages: parseLanguageSet(spoken) };
};

const parseRawGeneralFacts = (
  name: string,
  lines: readonly string[],
): ScopedGeneralFacts => {
  const ac = requireMatch(
    requireLine(lines, "**AC**", name),
    /\*\*AC\*\* (\d+)/,
    `${name} AC`,
  );
  const hp = requireMatch(
    requireLine(lines, "**HP**", name),
    /\*\*HP\*\* (\d+)/,
    `${name} HP`,
  );
  const initiative = requireMatch(
    requireLine(lines, "**Initiative**", name),
    /\*\*Initiative\*\* ([+−-]?\d+) \((\d+)\)/,
    `${name} Initiative`,
  );
  const challengeRating = requireMatch(
    requireLine(lines, "**CR**", name),
    /\*\*CR\*\* (\d+)(?:\/(\d+))?/,
    `${name} CR`,
  );
  const scoreValues = parseAbilityRow(lines, "Score", name);
  const saveValues = parseAbilityRow(lines, "Save", name);

  return {
    challengeRating:
      Number(challengeRating[1]) / Number(challengeRating[2] ?? 1),
    ...parseMetadata(lines, name),
    ac: { kind: "literal", value: Number(ac[1]) },
    hp: { kind: "literal", value: Number(hp[1]) },
    speeds: parseSpeeds(lines, name),
    abilityScores: abilityRecord(scoreValues),
    initiative: {
      modifier: signedNumber(initiative[1] ?? ""),
      score: Number(initiative[2]),
    },
    savingThrowModifiers: sortedModifiers(
      ABILITY_NAMES.map((ability, index) => ({
        name: ability,
        modifier: saveValues[index] ?? 0,
      })),
    ),
    skillModifiers: parseNamedModifiers(lines, "Skills"),
    vulnerabilities: parseDamageTypes(lines, "Vulnerabilities"),
    resistances: parseDamageTypes(lines, "Resistances"),
    ...parseImmunities(lines),
    ...parseSenses(lines, name),
    gear: parseGear(lines),
    communication: parseCommunication(lines, name),
  };
};

const parseRawEntries = (lines: readonly string[]): readonly RawEntry[] => {
  const entries: RawEntry[] = [];
  let section: RawSection | undefined;
  let current:
    | { readonly section: RawSection; readonly name: string; parts: string[] }
    | undefined;
  const flush = (): void => {
    if (current !== undefined) {
      entries.push({
        section: current.section,
        name: current.name,
        description: normalizedProse(current.parts.join(" ")),
      });
      current = undefined;
    }
  };

  for (const line of lines) {
    const heading = line.match(
      /^#{3,4} (Traits|Actions|Bonus Actions|Reactions|Legendary Actions)$/,
    );
    if (heading !== null) {
      flush();
      const candidateSection = heading[1] ?? "";
      if (!isRawSection(candidateSection)) {
        throw new Error(`Unsupported RAW section ${candidateSection}`);
      }
      section = candidateSection;
      continue;
    }
    const entry = line.match(/^\*\*(.+?)\.\*\*\s*(.*)$/);
    if (entry !== null && section !== undefined) {
      flush();
      current = {
        section,
        name: entry[1] ?? "",
        parts: [entry[2] ?? ""],
      };
      continue;
    }
    if (current !== undefined && !line.startsWith("*Legendary Action Uses:")) {
      current.parts.push(line);
    }
  }
  flush();
  return entries;
};

const parsedAbility = (value: string, context: string): AbilityName => {
  const normalized = value.slice(0, 3).toLowerCase();
  const ability = ABILITY_NAMES.find((candidate) => candidate === normalized);
  if (ability === undefined) {
    throw new Error(`Unsupported ${context} ability ${value}`);
  }
  return ability;
};

const parseDamage = (
  value: string,
  context: string,
): DamageProjection | undefined => {
  const match = value.match(
    /^(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage$/,
  );
  if (match === null) return undefined;
  const dice = match[2] === undefined ? {} : { dice: Number(match[2]) };
  const dieSize = match[3] === undefined ? {} : { dieSize: Number(match[3]) };
  const flat =
    match[5] === undefined
      ? {}
      : {
          flat:
            Number(match[5]) * (match[4] === "−" || match[4] === "-" ? -1 : 1),
        };
  const damageType = match[6];
  if (damageType === undefined) {
    throw new Error(`Unable to parse ${context} damage type: ${value}`);
  }
  return {
    damageType: damageType.toLowerCase(),
    static: Number(match[1]),
    ...dice,
    ...dieSize,
    ...flat,
  };
};

const parseRawResourceLimits = (
  name: string,
): readonly ResourceLimitProjection[] => {
  const recharge = name.match(/\(Recharge (\d)(?:–\d)?\)$/);
  if (recharge !== null) {
    return [
      {
        kind: "recharge",
        minimumRoll: Number(recharge[1]),
      },
    ];
  }
  const daily = name.match(/\((\d+)\/Day\)$/);
  return daily === null
    ? []
    : [
        {
          kind: "daily",
          uses: Number(daily[1]),
          ownership: "shared",
        },
      ];
};

const parseSimpleAttack = (
  entry: RawEntry,
  generalFacts: ScopedGeneralFacts,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const match = entry.description.match(
    /^(Melee|Ranged) Attack Roll: ([+−-]\d+), (?:(?:reach (\d+) ft\.)|(?:range (\d+)\/(\d+) ft\.)) Hit: (.+)\.$/,
  );
  if (match === null) return undefined;
  const damageParts = (match[6] ?? "").split(" plus ");
  const damages = damageParts.map((part) =>
    parseDamage(part, `${entry.name} Hit`),
  );
  if (damages.some((damage) => damage === undefined)) return undefined;
  const onHit = damages.filter(
    (damage): damage is DamageProjection => damage !== undefined,
  );
  const attackType = match[1]?.toLowerCase();
  if (attackType !== "melee" && attackType !== "ranged") {
    throw new Error(`Unsupported ${entry.name} attack type ${match[1] ?? ""}`);
  }
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "attack_roll",
    attackType,
    attackBonus: signedNumber(match[2] ?? ""),
    attackAbilityCandidates: rawAttackAbilityCandidates(
      generalFacts.abilityScores,
      generalFacts.challengeRating,
      signedNumber(match[2] ?? ""),
    ),
    ...(match[3] === undefined
      ? {
          rangeFeet: {
            normal: Number(match[4]),
            long: Number(match[5]),
          },
        }
      : { reachFeet: Number(match[3]) }),
    onHit,
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseSimpleSave = (entry: RawEntry): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const match = entry.description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in a (\d+)-foot-long, (\d+)-foot-wide Line\. Failure: (.+)\. Success: Half damage\.$/,
  );
  if (match === null) return undefined;
  const onFail = parseDamage(match[5] ?? "", `${entry.name} Failure`);
  if (onFail === undefined) return undefined;
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "save",
    ability: parsedAbility(match[1] ?? "", entry.name),
    dc: Number(match[2]),
    area: {
      kind: "line",
      lengthFeet: Number(match[3]),
      widthFeet: Number(match[4]),
    },
    onFail,
    onSuccess: "half_damage",
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const NUMBER_WORDS = [
  ["one", 1],
  ["two", 2],
  ["three", 3],
] as const;

const parseSimpleMultiattack = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  if (entry.description.includes(",")) return undefined;
  const match = entry.description.match(
    /^The .+ makes (one|two|three) (.+) attacks\.$/,
  );
  if (match === null || match[2]?.includes(" or ") === true) return undefined;
  const count = NUMBER_WORDS.find(([word]) => word === match[1])?.[1];
  if (count === undefined || match[2] === undefined) {
    throw new Error(`Unable to parse ${entry.name} dispatch`);
  }
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "multiattack",
    dispatches: [{ procedureName: match[2], count }],
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const splitOutsideParentheses = (value: string): readonly string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
};

const parseSpell = (value: string): SpellProjection => {
  const annotation = value.match(/^(.+?) \((.+)\)$/);
  const name = annotation?.[1] ?? value;
  const detail = annotation?.[2];
  const level = detail?.match(/^level (\d+) version$/);
  return {
    spellId: normalizedIdentifier(name),
    ...(level === null || level === undefined
      ? detail === undefined
        ? {}
        : { restriction: detail }
      : { castAtLevel: Number(level[1]) }),
  };
};

const parseSpellcasting = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  if (
    entry.section === "Traits" ||
    normalizedProcedureName(entry.name) !== "Spellcasting"
  ) {
    return undefined;
  }
  const header = requireMatch(
    entry.description,
    /^The .+ casts one of the following spells, requiring no Material components and using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability \(spell save DC (\d+)(?:, ([+−-]\d+) to hit with spell attacks)?\): /,
    `${entry.name} header`,
  );
  const atWill = requireMatch(
    entry.description,
    /At Will: (.+?) (?=\d+\/Day Each:)/,
    `${entry.name} At Will`,
  );
  const limited = requireMatch(
    entry.description,
    /(\d+)\/Day Each: (.+)$/,
    `${entry.name} limited spells`,
  );
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability: parsedAbility(header[1] ?? "", entry.name),
    spellSaveDc: Number(header[2]),
    ...(header[3] === undefined
      ? {}
      : { spellAttackBonus: signedNumber(header[3]) }),
    materialComponents: false,
    groups: [
      {
        kind: "at_will",
        spells: splitOutsideParentheses(atWill[1] ?? "").map(parseSpell),
        resourceLimits: [],
      },
      {
        kind: "limited",
        spells: splitOutsideParentheses(limited[2] ?? "").map(parseSpell),
        resourceLimits: [
          {
            kind: "daily",
            uses: Number(limited[1]),
            ownership: "each",
          },
        ],
      },
    ],
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseActionOption = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const match = entry.description.match(
    /^The .+ takes the (Dash), (Disengage), or (Hide) action\.$/,
  );
  return match === null
    ? undefined
    : {
        section: entry.section,
        name: normalizedProcedureName(entry.name),
        kind: "action_option",
        options: sortedStrings(match.slice(1).map(normalizedIdentifier)),
        resourceLimits: parseRawResourceLimits(entry.name),
      };
};

const parseRawProcedure = (
  entry: RawEntry,
  generalFacts: ScopedGeneralFacts,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  return (
    parseSpellcasting(entry) ??
    parseSimpleAttack(entry, generalFacts) ??
    parseSimpleSave(entry) ??
    parseSimpleMultiattack(entry) ??
    parseActionOption(entry) ?? {
      section: entry.section,
      name: normalizedProcedureName(entry.name),
      kind: "textOnly",
      description: entry.description,
      resourceLimits: parseRawResourceLimits(entry.name),
    }
  );
};

const parseLegendaryActionUses = (
  lines: readonly string[],
): ScopedGeneralFacts["legendaryActionUses"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("*Legendary Action Uses:"),
  );
  if (line === undefined) return undefined;
  const uses = requireMatch(
    line,
    /^\*Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?\./,
    "Legendary Action Uses",
  );
  return uses[2] === undefined
    ? { kind: "fixed", uses: Number(uses[1]) }
    : {
        kind: "lair_bonus",
        usesOutsideLair: Number(uses[1]),
        additionalUsesInLair: Number(uses[2]) - Number(uses[1]),
      };
};

const procedureName = (entry: StatBlockProcedureEntry): string =>
  Match.value(entry).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => textOnly.name),
    Match.when(
      { kind: "executable" },
      (executable) => executable.procedure.name,
    ),
    Match.exhaustive,
  );

const authoredProcedures = (
  record: SrdStatBlockRecord,
): readonly {
  readonly section: ProcedureSection;
  readonly entry: StatBlockProcedureEntry;
}[] => [
  ...(record.statBlock.actions ?? []).map((entry) => ({
    section: "Actions" as const,
    entry,
  })),
  ...(record.statBlock.bonusActions ?? []).map((entry) => ({
    section: "Bonus Actions" as const,
    entry,
  })),
  ...(record.statBlock.reactions ?? []).map((entry) => ({
    section: "Reactions" as const,
    entry,
  })),
  ...(record.statBlock.legendaryActions?.entries ?? []).map((entry) => ({
    section: "Legendary Actions" as const,
    entry,
  })),
];

const rawRecordLines = (
  sourceLines: readonly string[],
  occurrence: SrdStatBlockSourceOccurrence,
): readonly string[] =>
  sourceLines.slice(occurrence.anchor.lineStart - 1, occurrence.anchor.lineEnd);

export const projectRawStatBlocks = (
  source: string,
  occurrences: readonly SrdStatBlockSourceOccurrence[],
  records: readonly SrdStatBlockRecord[],
): readonly RawStatBlockProjection[] => {
  const sourceLines = source.split(/\r?\n/);
  const recordsByName = new Map(records.map((record) => [record.name, record]));

  return occurrences
    .map((occurrence) => {
      const record = recordsByName.get(occurrence.name);
      if (record === undefined) {
        throw new Error(`Missing authored RAW record ${occurrence.name}`);
      }
      const lines = rawRecordLines(sourceLines, occurrence);
      const entries = parseRawEntries(lines);
      const generalFacts = parseRawGeneralFacts(occurrence.name, lines);
      const procedures = entries.flatMap((entry) => {
        const procedure = parseRawProcedure(entry, generalFacts);
        return procedure === undefined ? [] : [procedure];
      });
      const rawTextOnly = procedures.flatMap((procedure) =>
        procedure.kind === "textOnly"
          ? [
              {
                section: procedure.section,
                name: procedure.name,
                description: procedure.description,
              },
            ]
          : [],
      );
      const legendaryActionUses = parseLegendaryActionUses(lines);

      return {
        name: occurrence.name,
        sourceSection: occurrence.anchor.section.replace(
          ".references/srd-5.2.1/",
          "",
        ),
        generalFacts: {
          ...generalFacts,
          ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
        },
        entryNames: entries.map((entry) =>
          entry.section === "Traits"
            ? `${entry.section}/${entry.name}`
            : `${entry.section}/${normalizedProcedureName(entry.name)}`,
        ),
        traits: entries
          .filter((entry) => entry.section === "Traits")
          .map(({ name, description }) => ({ name, description })),
        textOnlyProcedures: rawTextOnly,
        procedures,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
};

const projectLanguageSet = (
  languages: Extract<
    SrdStatBlockRecord["statBlock"]["communication"],
    { readonly kind: "spoken_and_understood" | "understood_but_cannot_speak" }
  >["languages"],
): LanguageSetProjection =>
  Match.value(languages).pipe(
    Match.when({ kind: "named" }, ({ languages: names }) => ({
      kind: "named" as const,
      languages: [...names],
    })),
    Match.when({ kind: "named_plus_other_languages" }, (namedPlus) => ({
      kind: "named_plus_other_languages" as const,
      languages: [...namedPlus.languages],
      additionalLanguages: namedPlus.additionalLanguages,
    })),
    Match.when({ kind: "all" }, () => ({ kind: "all" as const })),
    Match.exhaustive,
  );

const projectTelepathy = (
  telepathy: NonNullable<
    SrdStatBlockRecord["statBlock"]["communication"]["telepathy"]
  >,
): TelepathyProjection => ({
  rangeFeet: telepathy.rangeFeet,
  ...(telepathy.response === undefined ? {} : { response: telepathy.response }),
  ...(telepathy.requiresLanguageUnderstanding === undefined
    ? {}
    : {
        requiresLanguageUnderstanding: projectLanguageSet(
          {
            kind: "spoken_and_understood",
            languages: telepathy.requiresLanguageUnderstanding,
          }.languages,
        ),
      }),
});

const projectCommunication = (
  communication: SrdStatBlockRecord["statBlock"]["communication"],
): CommunicationProjection => {
  const telepathy =
    communication.telepathy === undefined
      ? {}
      : { telepathy: projectTelepathy(communication.telepathy) };
  return Match.value(communication).pipe(
    Match.when({ kind: "none" }, () => ({
      kind: "none" as const,
      ...telepathy,
    })),
    Match.when({ kind: "spoken_and_understood" }, (spoken) => ({
      kind: "spoken_and_understood" as const,
      languages: projectLanguageSet(spoken.languages),
      ...(spoken.additionallyUnderstoodButCannotSpeak === undefined
        ? {}
        : {
            additionallyUnderstoodButCannotSpeak: projectLanguageSet(
              spoken.additionallyUnderstoodButCannotSpeak,
            ),
          }),
      ...(spoken.speechRestriction === undefined
        ? {}
        : {
            speechRestriction: {
              kind: "cannot_speak_in_forms" as const,
              forms: [...spoken.speechRestriction.forms],
            },
          }),
      ...telepathy,
    })),
    Match.when({ kind: "understood_but_cannot_speak" }, (understood) => ({
      kind: "understood_but_cannot_speak" as const,
      languages: projectLanguageSet(understood.languages),
      ...telepathy,
    })),
    Match.when({ kind: "understands_commands_only" }, () => ({
      kind: "understands_commands_only" as const,
      ...telepathy,
    })),
    Match.exhaustive,
  );
};

type ProcedureResourceRefs = StatBlockProcedureEntry["resourceRefs"];
type ExecutableProcedure = Extract<
  StatBlockProcedureEntry,
  { readonly kind: "executable" }
>["procedure"];
type AttackDamage = Extract<
  Extract<
    ExecutableProcedure,
    { readonly kind: "attack_roll" }
  >["onHit"][number],
  { readonly kind: "damage" }
>;

const projectDamage = (damage: AttackDamage): DamageProjection => {
  if (damage.amount.kind !== "fixed") {
    throw new Error(`Unsupported authored ${damage.damageType} damage amount`);
  }
  const expression = "expr" in damage.amount ? damage.amount.expr : undefined;
  const staticDamage = damage.amount.static;
  if (staticDamage === undefined) {
    throw new Error(`Missing authored ${damage.damageType} static damage`);
  }
  return {
    damageType: damage.damageType,
    static: staticDamage,
    ...(expression === undefined
      ? {}
      : {
          dice: expression.dice,
          dieSize: expression.dieSize,
          ...(expression.flat === undefined ? {} : { flat: expression.flat }),
        }),
  };
};

const projectResourceLimits = (
  record: SrdStatBlockRecord,
  refs: ProcedureResourceRefs,
): readonly ResourceLimitProjection[] => {
  if (refs.kind === "none") return [];
  const resources = new Map(
    (record.statBlock.resources ?? []).map((resource) => [
      resource.ordinal,
      resource,
    ]),
  );
  return refs.ordinals.map((ordinal): ResourceLimitProjection => {
    const resource = resources.get(ordinal);
    if (resource === undefined) {
      throw new Error(`Missing ${record.name} resource ordinal ${ordinal}`);
    }
    return Match.value(resource.limit).pipe(
      Match.when({ kind: "daily" }, (daily) => ({
        kind: "daily" as const,
        uses: daily.uses,
        ownership: resource.ownership,
      })),
      Match.when({ kind: "recharge" }, (recharge) => {
        return {
          kind: "recharge" as const,
          minimumRoll: recharge.minimumRoll,
        };
      }),
      Match.when({ kind: "recharge_after_rest" }, () => {
        throw new Error(`${record.name} has an unsupported rest resource`);
      }),
      Match.exhaustive,
    );
  });
};

const literalValue = (value: {
  readonly kind: "literal";
  readonly value: number;
}): number => value.value;

const projectExecutableProcedure = (
  record: SrdStatBlockRecord,
  section: ProcedureSection,
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  namesByOrdinal: ReadonlyMap<number, string>,
): ProcedureProjection => {
  const resourceLimits = projectResourceLimits(record, entry.resourceRefs);
  return Match.value(entry.procedure).pipe(
    Match.when({ kind: "attack_roll" }, (attack) => ({
      section,
      name: normalizedProcedureName(attack.name),
      kind: "attack_roll" as const,
      attackType: attack.attackType,
      attackBonus: literalValue(attack.attackBonus),
      attackAbilityCandidates: (() => {
        const candidates = rawAttackAbilityCandidates(
          record.statBlock.abilityScores,
          record.challengeRating,
          literalValue(attack.attackBonus),
        );
        if (!candidates.includes(attack.attackAbility)) {
          throw new Error(
            `${record.name}/${attack.name} uses ${attack.attackAbility}, outside RAW-derived candidates ${candidates.join(", ")}`,
          );
        }
        return candidates;
      })(),
      ...(attack.attackType === "melee"
        ? { reachFeet: attack.reachFeet }
        : { rangeFeet: attack.rangeFeet }),
      onHit: attack.onHit.map((effect) => {
        if (effect.kind !== "damage") {
          throw new Error(
            `${record.name}/${attack.name} has a non-damage executable effect`,
          );
        }
        return projectDamage(effect);
      }),
      resourceLimits,
    })),
    Match.when({ kind: "save" }, (save) => {
      if (
        save.onFail.kind !== "damage" ||
        save.onSuccess.kind !== "half_damage"
      ) {
        throw new Error(
          `${record.name}/${save.name} is not a simple damage save`,
        );
      }
      if (!("area" in save) || save.area.kind !== "line") {
        throw new Error(`${record.name}/${save.name} is not a Line save`);
      }
      return {
        section,
        name: normalizedProcedureName(save.name),
        kind: "save" as const,
        ability: save.ability,
        dc: save.dc.dc,
        area: {
          kind: "line" as const,
          lengthFeet: save.area.lengthFeet,
          widthFeet: save.area.widthFeet,
        },
        onFail: projectDamage(save.onFail),
        onSuccess: "half_damage" as const,
        resourceLimits,
      };
    }),
    Match.when({ kind: "multiattack" }, (multiattack) => ({
      section,
      name: normalizedProcedureName(multiattack.name),
      kind: "multiattack" as const,
      dispatches: multiattack.dispatches.map((dispatch) => {
        const procedureName = namesByOrdinal.get(dispatch.procedureOrdinal);
        if (procedureName === undefined) {
          throw new Error(
            `${record.name}/${multiattack.name} has an unresolved dispatch`,
          );
        }
        return {
          procedureName: normalizedProcedureName(procedureName),
          count: literalValue(dispatch.count),
        };
      }),
      resourceLimits,
    })),
    Match.when({ kind: "action_option" }, (option) => ({
      section,
      name: normalizedProcedureName(option.name),
      kind: "action_option" as const,
      options: sortedStrings(option.options),
      resourceLimits,
    })),
    Match.when({ kind: "spellcasting" }, (spellcasting) => ({
      section,
      name: normalizedProcedureName(spellcasting.name),
      kind: "spellcasting" as const,
      ability: spellcasting.ability,
      ...(spellcasting.spellSaveDc === undefined
        ? {}
        : { spellSaveDc: spellcasting.spellSaveDc.dc }),
      ...(spellcasting.spellAttackBonus === undefined
        ? {}
        : { spellAttackBonus: literalValue(spellcasting.spellAttackBonus) }),
      materialComponents:
        spellcasting.components?.m === false
          ? (false as const)
          : (() => {
              throw new Error(
                `${record.name}/${spellcasting.name} has Material components`,
              );
            })(),
      groups: spellcasting.groups.map((group) => ({
        kind: group.kind,
        spells: group.spells.map((spell) => ({
          spellId: spell.spellId,
          ...(spell.castAtLevel === undefined
            ? {}
            : { castAtLevel: spell.castAtLevel }),
          ...(spell.restriction === undefined
            ? {}
            : { restriction: spell.restriction }),
        })),
        resourceLimits: projectResourceLimits(record, group.resourceRefs),
      })),
      resourceLimits: [],
    })),
    Match.when({ kind: "support" }, (support) => {
      throw new Error(
        `${record.name}/${support.name} is an unexpected support procedure`,
      );
    }),
    Match.exhaustive,
  );
};

const projectAuthoredProcedures = (
  record: SrdStatBlockRecord,
): readonly ProcedureProjection[] => {
  const entries = authoredProcedures(record);
  const namesBySectionAndOrdinal = new Map<
    ProcedureSection,
    Map<number, string>
  >();
  for (const { section, entry } of entries) {
    const namesByOrdinal = namesBySectionAndOrdinal.get(section) ?? new Map();
    namesByOrdinal.set(entry.procedureOrdinal, procedureName(entry));
    namesBySectionAndOrdinal.set(section, namesByOrdinal);
  }
  return entries.map(({ section, entry }): ProcedureProjection => {
    const resourceLimits = projectResourceLimits(record, entry.resourceRefs);
    if (entry.kind === "textOnly") {
      return {
        section,
        name: normalizedProcedureName(entry.name),
        kind: "textOnly",
        description: entry.description,
        resourceLimits,
      };
    }
    return projectExecutableProcedure(
      record,
      section,
      entry,
      namesBySectionAndOrdinal.get(section) ?? new Map(),
    );
  });
};

const projectLegendaryActionUses = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["legendaryActionUses"] => {
  const uses = record.statBlock.legendaryActions?.uses;
  if (uses === undefined) return undefined;
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, (fixed) => ({
      kind: "fixed" as const,
      uses: fixed.uses,
    })),
    Match.when({ kind: "lair_bonus" }, (lairBonus) => ({
      kind: "lair_bonus" as const,
      usesOutsideLair: lairBonus.usesOutsideLair,
      additionalUsesInLair: lairBonus.additionalUsesInLair,
    })),
    Match.exhaustive,
  );
};

export const projectAuthoredStatBlocks = (
  records: readonly SrdStatBlockRecord[],
): readonly RawStatBlockProjection[] =>
  records
    .map((record) => {
      const procedures = authoredProcedures(record);
      const projectedProcedures = projectAuthoredProcedures(record);
      const legendaryActionUses = projectLegendaryActionUses(record);
      const resistances = record.statBlock.resistances;
      if (resistances?.kind === "choose_one_from") {
        throw new Error(`${record.name} has unsupported chosen resistances`);
      }
      return {
        name: record.name,
        sourceSection: record.provenance.section,
        generalFacts: {
          challengeRating: record.challengeRating,
          size: record.statBlock.size,
          creatureType: record.statBlock.creatureType,
          creatureTypeTags: sortedStrings(
            record.statBlock.creatureTypeTags ?? [],
          ),
          alignment: record.statBlock.alignment,
          ac: record.statBlock.ac.value,
          hp: record.statBlock.hp,
          speeds: record.statBlock.speeds.map((speed) => ({
            kind: speed.kind,
            feet: speed.feet.value,
            hover: speed.kind === "fly" && speed.hover === true,
          })),
          abilityScores: record.statBlock.abilityScores,
          initiative: record.statBlock.initiative,
          savingThrowModifiers: sortedModifiers(
            (record.statBlock.savingThrowModifiers ?? []).map(
              ({ ability, modifier }) => ({
                name: ability,
                modifier,
              }),
            ),
          ),
          skillModifiers: sortedModifiers(
            (record.statBlock.skillModifiers ?? []).map(
              ({ skill, modifier }) => ({
                name: skill,
                modifier,
              }),
            ),
          ),
          vulnerabilities: sortedStrings(
            record.statBlock.vulnerabilities?.damageTypes ?? [],
          ),
          resistances: sortedStrings(resistances?.damageTypes ?? []),
          immunityDamageTypes: sortedStrings(
            record.statBlock.immunities?.damageTypes ?? [],
          ),
          immunityConditions: sortedStrings(
            record.statBlock.immunities?.conditions ?? [],
          ),
          senses: [...(record.statBlock.senses ?? [])]
            .map((sense) => ({
              kind: sense.kind,
              rangeFeet: sense.rangeFeet,
              ...(!("qualifier" in sense) || sense.qualifier === undefined
                ? {}
                : { qualifier: sense.qualifier }),
            }))
            .sort((left, right) => left.kind.localeCompare(right.kind)),
          passivePerception: record.statBlock.passivePerception,
          gear: [...(record.statBlock.gear ?? [])]
            .map((gear) => ({ item: gear.item, quantity: gear.quantity ?? 1 }))
            .sort((left, right) => left.item.localeCompare(right.item)),
          communication: projectCommunication(record.statBlock.communication),
          ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
        },
        entryNames: [
          ...(record.statBlock.traits ?? []).map(
            (trait) => `Traits/${trait.name}`,
          ),
          ...procedures.map(
            ({ section, entry }) =>
              `${section}/${normalizedProcedureName(procedureName(entry))}`,
          ),
        ],
        traits: [...(record.statBlock.traits ?? [])],
        textOnlyProcedures: procedures.flatMap(({ section, entry }) =>
          entry.kind === "textOnly"
            ? [
                {
                  section,
                  name: normalizedProcedureName(entry.name),
                  description: entry.description,
                },
              ]
            : [],
        ),
        procedures: projectedProcedures,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
