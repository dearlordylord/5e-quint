import { Match } from "effect";

import type { SrdStatBlockSourceOccurrence } from "../../../../scripts/srd521-stat-block-parity.ts";

import {
  CONDITIONS,
  type SrdStatBlockRecord,
  type StatBlockProcedureEntry,
} from "./types.ts";

/**
 * Identity-free test oracle for comparing parser-bounded local SRD spans with
 * authored Stat Blocks. Hit Dice are deliberately outside this projection;
 * the current Surface Stat Block boundary owns only the printed HP average.
 */

const ABILITY_NAMES = ["str", "dex", "con", "int", "wis", "cha"] as const;
type AbilityName = (typeof ABILITY_NAMES)[number];
const ATTACK_ABILITY_NAMES = ["str", "dex", "int", "wis", "cha"] as const;
type NonEmptyStrings = readonly [string, ...string[]];

type AbilityMatrixFact = {
  readonly ability: AbilityName;
  readonly score: number;
  readonly modifier: number;
  readonly saveModifier: number;
};

type AbilityMatrix = readonly [
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
];

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

type AttackAbilityEvidence =
  | { readonly kind: "resolved"; readonly ability: AbilityName }
  | {
      readonly kind: "unresolved";
      readonly candidates: readonly [AbilityName, ...AbilityName[]];
    };

type ResourceLimitProjection =
  | {
      readonly kind: "daily";
      readonly uses: number;
      readonly ownership: "shared" | "each";
    }
  | {
      readonly kind: "recharge";
      readonly minimumRoll: number;
      readonly ownership: "shared" | "each";
    }
  | {
      readonly kind: "recharge_after_rest";
      readonly rest: "short_or_long";
      readonly ownership: "shared" | "each";
    };

type DamageProjection = {
  readonly kind: "damage";
  readonly damageType: string;
  readonly static: number;
  readonly dice?: number;
  readonly dieSize?: number;
  readonly flat?: number;
  readonly spellcastingMod?: true;
  readonly abilityModifier?: AbilityName;
};

type ResistanceProjection =
  | { readonly kind: "fixed"; readonly damageTypes: readonly string[] }
  | { readonly kind: "choose_one_from"; readonly options: readonly string[] };

type AttackEffectProjection =
  | DamageProjection
  | (Omit<DamageProjection, "kind"> & {
      readonly kind: "conditional_bonus_damage";
      readonly when: "attack_roll_had_advantage";
    })
  | {
      readonly kind: "apply_condition_if_target_size_at_most";
      readonly condition: string;
      readonly maxCreatureSize: string;
    }
  | {
      readonly kind: "apply_condition";
      readonly condition: string;
      readonly expiresAt: "source_next_turn_end" | "target_next_turn_end";
    };

type SpellProjection = {
  readonly spellId: string;
  readonly count?: number;
  readonly castAtLevel?: number;
  readonly restriction?: string;
};

type ProcedureProjection =
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "textOnly";
      readonly description: string;
      readonly reason: string;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "attack_roll";
      readonly attackType: "melee" | "ranged";
      readonly attackBonus: number;
      readonly attackAbilityEvidence: AttackAbilityEvidence;
      readonly reachFeet?: number;
      readonly rangeFeet?: { readonly normal: number; readonly long: number };
      readonly ammunition?: string;
      readonly multiattackCount?: number;
      readonly onHit: readonly AttackEffectProjection[];
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "save";
      readonly ability: AbilityName;
      readonly dc: number;
      readonly area:
        | {
            readonly kind: "line";
            readonly lengthFeet: number;
            readonly widthFeet: number;
          }
        | { readonly kind: "cone"; readonly lengthFeet: number };
      readonly onFail: DamageProjection;
      readonly onSuccess: "half_damage";
      readonly multiattackCount?: number;
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
      readonly components:
        | { readonly kind: "spell_definition" }
        | {
            readonly kind: "fixed";
            readonly v: boolean;
            readonly s: boolean;
            readonly m: boolean | string;
          };
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
  readonly ac: {
    readonly kind: "literal";
    readonly value: number;
    readonly annotations: readonly string[];
  };
  readonly hp: { readonly kind: "literal"; readonly value: number };
  readonly speeds: readonly ScopedSpeedEntry[];
  readonly abilityScores: Readonly<Record<AbilityName, number>>;
  readonly initiative: { readonly modifier: number; readonly score: number };
  readonly savingThrowModifiers: readonly NamedModifier[];
  readonly saveProficiencies: readonly AbilityName[];
  readonly skillModifiers: readonly NamedModifier[];
  readonly vulnerabilities:
    | { readonly kind: "none" }
    | { readonly kind: "fixed"; readonly damageTypes: NonEmptyStrings }
    | {
        readonly kind: "qualified";
        readonly damageTypes: NonEmptyStrings;
        readonly qualifier: string;
      };
  readonly resistances: ResistanceProjection;
  readonly immunityDamageTypes: readonly string[];
  readonly immunityConditions: readonly string[];
  readonly immunityQualifiedConditions: readonly {
    readonly condition: string;
    readonly qualifier: string;
  }[];
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
  readonly swarm: { readonly constituentSize: string } | null;
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

type ScopedConcreteSpeed = {
  readonly kind: string;
  readonly feet: number;
  readonly hover: boolean;
  readonly availability?: {
    readonly kind: "forms_only";
    readonly forms: readonly string[];
  };
};

type ScopedSpeedEntry =
  | ScopedConcreteSpeed
  | {
      readonly kind: "gm_choice";
      readonly alternatives: readonly ScopedConcreteSpeed[];
    };

type RawStatBlockProjection = {
  readonly id: string;
  readonly name: string;
  readonly sourceSection: string;
  readonly generalFacts: ScopedGeneralFacts;
  readonly resources: readonly ResourceLimitProjection[];
  readonly entryNames: readonly string[];
  readonly traits: readonly {
    readonly name: string;
    readonly description: string;
    readonly effect: NonNullable<
      NonNullable<SrdStatBlockRecord["statBlock"]["traits"]>[number]["effect"]
    > | null;
  }[];
  readonly textOnlyProcedures: readonly {
    readonly section: ProcedureSection;
    readonly name: string;
    readonly description: string;
    readonly reason: string;
  }[];
  readonly procedures: readonly ProcedureProjection[];
};

const procedureResourceLimits = (
  procedures: readonly ProcedureProjection[],
): readonly ResourceLimitProjection[] =>
  procedures.flatMap((procedure) => [
    ...procedure.resourceLimits,
    ...(procedure.kind === "spellcasting"
      ? procedure.groups.flatMap((group) => group.resourceLimits)
      : []),
  ]);

const signedNumber = (value: string): number =>
  Number(value.replace("−", "-").replace("+", ""));

const normalizedProse = (value: string): string =>
  value.replaceAll("*", "").replace(/\s+/g, " ").trim();

const normalizedIdentifier = (value: string): string =>
  value.toLowerCase().replaceAll(" ", "_");

const normalizedProcedureName = (value: string): string =>
  value.replace(
    / \((?:Recharge \d(?:–\d)?|Recharge after a Short or Long Rest|\d+\/Day)(?:; (.+))?\)$/,
    (_, qualifier: string | undefined) =>
      qualifier === undefined ? "" : ` (${qualifier})`,
  );

const statBlockIdFromRawName = (name: string): string =>
  `stat_block_${name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;

const isRawSection = (value: string): value is RawSection =>
  RAW_SECTIONS.some((section) => section === value);

const proficiencyBonus = (challengeRating: number): number =>
  2 + Math.floor(Math.max(0, challengeRating - 1) / 4);

const rawAttackAbilityCandidates = (
  abilityScores: Readonly<Record<AbilityName, number>>,
  challengeRating: number,
  attackBonus: number,
): readonly AbilityName[] =>
  ATTACK_ABILITY_NAMES.filter(
    (ability) =>
      Math.floor((abilityScores[ability] - 10) / 2) +
        proficiencyBonus(challengeRating) ===
      attackBonus,
  );

const attackAbilityEvidence = (
  candidates: readonly AbilityName[],
): AttackAbilityEvidence | undefined => {
  const [first, ...rest] = candidates;
  if (first === undefined) return undefined;
  return rest.length === 0
    ? { kind: "resolved", ability: first }
    : { kind: "unresolved", candidates: [first, ...rest] };
};

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

const sortedStrings = <Value extends string>(
  values: readonly Value[],
): readonly Value[] =>
  [...values].sort((left, right) => left.localeCompare(right));

const sortedNonEmptyStrings = (
  values: readonly string[],
  context: string,
): NonEmptyStrings => {
  const sorted = sortedStrings(values);
  const [first, ...rest] = sorted;
  if (first === undefined || first.length === 0) {
    throw new Error(`Expected at least one nonempty ${context}`);
  }
  if (rest.some((value) => value.length === 0)) {
    throw new Error(`Expected nonempty ${context}`);
  }
  return [first, ...rest];
};

const sortedModifiers = (
  values: readonly NamedModifier[],
): readonly NamedModifier[] =>
  [...values].sort((left, right) => left.name.localeCompare(right.name));

const parseMetadata = (
  lines: readonly string[],
  context: string,
): Pick<
  ScopedGeneralFacts,
  "size" | "creatureType" | "creatureTypeTags" | "alignment" | "swarm"
> => {
  const metadataLine = lines.find(
    (line) => line.startsWith("*") && !line.startsWith("**"),
  );
  if (metadataLine === undefined) {
    throw new Error(`Missing ${context} creature metadata`);
  }
  const metadata = requireMatch(
    metadataLine,
    /^\*(.+?) ([A-Za-z]+)(?: \(([^)]+)\))?, (.+)\*$/,
    `${context} creature metadata`,
  );
  const sizeText = metadata[1] ?? "";
  const alignmentText = metadata[4] ?? "";
  const swarmMetadata = sizeText.match(/^([A-Za-z]+) Swarm of ([A-Za-z]+)$/);
  const creatureSizeText = swarmMetadata?.[1] ?? sizeText;
  const size = creatureSizeText.includes(" or ")
    ? {
        kind: "alternatives" as const,
        options: creatureSizeText
          .split(" or ")
          .map((option) => option.toLowerCase()),
      }
    : creatureSizeText.toLowerCase();
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
    swarm:
      swarmMetadata?.[2] === undefined
        ? null
        : { constituentSize: swarmMetadata[2].toLowerCase() },
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
      const gmChoice = part.match(
        /^((?:Burrow|Climb|Fly|Swim|Walk)(?: or (?:Burrow|Climb|Fly|Swim|Walk))+)(?: )(\d+) ft\. \(GM's choice\)$/,
      );
      if (gmChoice !== null) {
        const feet = Number(gmChoice[2]);
        const alternatives = (gmChoice[1] ?? "").split(" or ").map((kind) => ({
          kind: kind.toLowerCase(),
          feet,
          hover: false,
        }));
        return { kind: "gm_choice" as const, alternatives };
      }
      const speed = requireMatch(
        part,
        /^(?:(Burrow|Climb|Fly|Swim) )?(\d+) ft\.(?: \((hover|[A-Za-z]+(?: or [A-Za-z]+)* form only)\))?$/,
        `${context} Speed`,
      );
      const qualifier = speed[3];
      return {
        kind: (speed[1] ?? "walk").toLowerCase(),
        feet: Number(speed[2]),
        hover: qualifier === "hover",
        ...(qualifier === undefined || qualifier === "hover"
          ? {}
          : {
              availability: {
                kind: "forms_only" as const,
                forms: qualifier
                  .replace(/ form only$/, "")
                  .split(" or ")
                  .map((form) => form.toLowerCase()),
              },
            }),
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
): Readonly<Record<AbilityName, number>> => {
  const [str, dex, con, int, wis, cha, extra] = values;
  if (
    str === undefined ||
    dex === undefined ||
    con === undefined ||
    int === undefined ||
    wis === undefined ||
    cha === undefined ||
    extra !== undefined ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Expected exactly six finite ability values");
  }
  return { str, dex, con, int, wis, cha };
};

const isAbilityName = (value: string): value is AbilityName =>
  ABILITY_NAMES.some((ability) => ability === value);

const parseAbilityMatrixNumber = (
  value: string,
  pattern: RegExp,
  context: string,
): number => {
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${context}: ${value}`);
  }
  return signedNumber(value);
};

const parseAbilityMatrixGroup = (
  cells: readonly [string, string, string, string],
  context: string,
): AbilityMatrixFact => {
  const [rawAbility, rawScore, rawModifier, rawSaveModifier] = cells;
  const ability = rawAbility.replaceAll("*", "").toLowerCase();
  if (!isAbilityName(ability)) {
    throw new Error(`Unrecognized ${context} ability label: ${rawAbility}`);
  }
  return {
    ability,
    score: parseAbilityMatrixNumber(rawScore, /^\d+$/, `${context} score`),
    modifier: parseAbilityMatrixNumber(
      rawModifier,
      /^[+−-]?\d+$/,
      `${context} modifier`,
    ),
    saveModifier: parseAbilityMatrixNumber(
      rawSaveModifier,
      /^[+−-]?\d+$/,
      `${context} save modifier`,
    ),
  };
};

const parseAbilityMatrix = (
  lines: readonly string[],
  context: string,
): AbilityMatrix | undefined => {
  const rows = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => {
      const [firstCell, secondCell] = cells;
      return (
        (firstCell === "STR" || firstCell === "INT") &&
        secondCell !== undefined &&
        /^\d+$/.test(secondCell)
      );
    });
  if (rows.length === 0) return undefined;
  if (rows.length !== 2) {
    throw new Error(`Expected exactly two ${context} ability matrix rows`);
  }

  const facts = rows.flatMap((cells, rowIndex) => {
    const expandedCells = cells.flatMap((cell) => {
      const combinedAbilityScore = cell.match(
        /^(STR|DEX|CON|INT|WIS|CHA) (\d+)$/,
      );
      return combinedAbilityScore === null
        ? [cell]
        : [combinedAbilityScore[1] ?? "", combinedAbilityScore[2] ?? ""];
    });
    if (
      expandedCells.length !== 12 ||
      expandedCells.some((cell) => cell.length === 0)
    ) {
      throw new Error(
        `Expected ${context} ability matrix row ${rowIndex + 1} to contain exactly twelve nonempty cells`,
      );
    }
    const [
      ability1,
      score1,
      modifier1,
      saveModifier1,
      ability2,
      score2,
      modifier2,
      saveModifier2,
      ability3,
      score3,
      modifier3,
      saveModifier3,
    ] = expandedCells;
    if (
      ability1 === undefined ||
      score1 === undefined ||
      modifier1 === undefined ||
      saveModifier1 === undefined ||
      ability2 === undefined ||
      score2 === undefined ||
      modifier2 === undefined ||
      saveModifier2 === undefined ||
      ability3 === undefined ||
      score3 === undefined ||
      modifier3 === undefined ||
      saveModifier3 === undefined
    ) {
      throw new Error(`Incomplete ${context} ability matrix row`);
    }
    return [
      parseAbilityMatrixGroup(
        [ability1, score1, modifier1, saveModifier1],
        context,
      ),
      parseAbilityMatrixGroup(
        [ability2, score2, modifier2, saveModifier2],
        context,
      ),
      parseAbilityMatrixGroup(
        [ability3, score3, modifier3, saveModifier3],
        context,
      ),
    ];
  });
  const [str, dex, con, int, wis, cha, extra] = facts;
  if (
    str === undefined ||
    dex === undefined ||
    con === undefined ||
    int === undefined ||
    wis === undefined ||
    cha === undefined ||
    extra !== undefined ||
    facts.some((fact, index) => fact.ability !== ABILITY_NAMES[index])
  ) {
    throw new Error(
      `Expected ${context} ability matrix labels in STR, DEX, CON, INT, WIS, CHA order`,
    );
  }
  return [str, dex, con, int, wis, cha];
};

const parseAbilityScores = (
  lines: readonly string[],
  context: string,
): Readonly<Record<AbilityName, number>> => {
  if (lines.some((line) => line.startsWith("| **Score**"))) {
    return abilityRecord(parseAbilityRow(lines, "Score", context));
  }
  const abilityMatrix = parseAbilityMatrix(lines, context);
  if (abilityMatrix !== undefined) {
    return abilityRecord(abilityMatrix.map(({ score }) => score));
  }
  const scoreCells = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .find(
      (cells) =>
        cells.length === ABILITY_NAMES.length &&
        cells.every((cell) =>
          /^\d+ \([+−-]?\d+\)(?: Save [ +−-]?\d+)?$/.test(cell),
        ),
    );
  if (scoreCells === undefined) {
    throw new Error(`Expected six ${context} ability scores`);
  }
  return abilityRecord(
    scoreCells.map((cell) => Number(requireMatch(cell, /^(\d+)/, context)[1])),
  );
};

const parseSavingThrowModifiers = (
  lines: readonly string[],
  context: string,
): readonly NamedModifier[] => {
  if (lines.some((line) => line.startsWith("| **Save**"))) {
    const saveValues = abilityRecord(parseAbilityRow(lines, "Save", context));
    return sortedModifiers(
      ABILITY_NAMES.map((ability) => ({
        name: ability,
        modifier: saveValues[ability],
      })),
    );
  }
  const abilityMatrix = parseAbilityMatrix(lines, context);
  if (abilityMatrix !== undefined) {
    return sortedModifiers(
      abilityMatrix.map(({ ability, saveModifier }) => ({
        name: ability,
        modifier: saveModifier,
      })),
    );
  }
  const combinedCells = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .find(
      (cells) =>
        cells.length === ABILITY_NAMES.length &&
        cells.every((cell) => /^\d+ \([+−-]?\d+\) Save [ +−-]?\d+$/.test(cell)),
    );
  if (combinedCells !== undefined) {
    const saveValues = abilityRecord(
      combinedCells.map((cell) => {
        const match = requireMatch(
          cell,
          / Save ([+−-]?\d+)$/,
          `${context} Save`,
        );
        const value = match[1];
        if (value === undefined) {
          throw new Error(`Missing ${context} Save modifier`);
        }
        return signedNumber(value);
      }),
    );
    return sortedModifiers(
      ABILITY_NAMES.map((ability) => ({
        name: ability,
        modifier: saveValues[ability],
      })),
    );
  }
  const line = lines.find((candidate) => candidate.startsWith("**Saves**"));
  if (line === undefined) return [];
  return sortedModifiers(
    line
      .replace("**Saves**", "")
      .trim()
      .split(", ")
      .map((part) => {
        const modifier = requireMatch(
          part,
          /^(STR|DEX|CON|INT|WIS|CHA) ([+−-]?\d+)(?: \([^)]*\))?$/,
          `${context} Saves`,
        );
        return {
          name: (modifier[1] ?? "").toLowerCase(),
          modifier: signedNumber(modifier[2] ?? ""),
        };
      }),
  );
};

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

const parseVulnerabilities = (
  lines: readonly string[],
): ScopedGeneralFacts["vulnerabilities"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Vulnerabilities**"),
  );
  if (line === undefined) return { kind: "none" };
  const value = line.replace("**Vulnerabilities**", "").trim();
  const qualified = value.match(/^([A-Z][a-z]+) damage (from .+)$/);
  return qualified === null
    ? {
        kind: "fixed",
        damageTypes: sortedNonEmptyStrings(
          value.split(", ").map((item) => item.toLowerCase()),
          "vulnerability damage type",
        ),
      }
    : {
        kind: "qualified",
        damageTypes: sortedNonEmptyStrings(
          [(qualified[1] ?? "").toLowerCase()],
          "qualified vulnerability damage type",
        ),
        qualifier: qualified[2] ?? "",
      };
};

const parseResistances = (lines: readonly string[]): ResistanceProjection => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Resistances**"),
  );
  if (line === undefined) return { kind: "fixed", damageTypes: [] };
  const value = line.replace("**Resistances**", "").trim();
  const chosen = value.match(/^Damage type chosen for .+$/);
  const chosenOptions =
    chosen === null
      ? []
      : (requireMatch(
          normalizedProse(lines.join(" ")),
          /one of the following damage types [^:]*: ([A-Za-z, ]+)\./,
          "chosen resistance options",
        )[1]
          ?.split(", ")
          .map((damageType) => damageType.replace(/^or /, "").toLowerCase()) ??
        []);
  return chosen === null
    ? {
        kind: "fixed",
        damageTypes: sortedStrings(
          value.split(", ").map((damageType) => damageType.toLowerCase()),
        ),
      }
    : {
        kind: "choose_one_from",
        options: sortedStrings(chosenOptions),
      };
};

const parseImmunities = (
  lines: readonly string[],
): Pick<
  ScopedGeneralFacts,
  "immunityDamageTypes" | "immunityConditions" | "immunityQualifiedConditions"
> => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Immunities**"),
  );
  if (line === undefined) {
    return {
      immunityDamageTypes: [],
      immunityConditions: [],
      immunityQualifiedConditions: [],
    };
  }
  const [firstGroup = "", explicitConditions] = line
    .replace("**Immunities**", "")
    .trim()
    .split("; ");
  const parseList = (value: string): readonly string[] =>
    value === ""
      ? []
      : sortedStrings(value.split(", ").map((item) => item.toLowerCase()));
  const parseConditions = (value: string) => {
    const conditions: string[] = [];
    const qualifiedConditions: {
      readonly condition: string;
      readonly qualifier: string;
    }[] = [];
    for (const item of value === "" ? [] : value.split(", ")) {
      const qualified = item.match(/^([A-Za-z]+) \((.+)\)$/);
      if (qualified === null) {
        conditions.push(item.toLowerCase());
      } else {
        qualifiedConditions.push({
          condition: (qualified[1] ?? "").toLowerCase(),
          qualifier: qualified[2] ?? "",
        });
      }
    }
    return {
      conditions: sortedStrings(conditions),
      qualifiedConditions: [...qualifiedConditions].sort((left, right) =>
        left.condition.localeCompare(right.condition),
      ),
    };
  };
  const conditionNames = new Set<string>(CONDITIONS);
  const firstConditionValues = parseConditions(firstGroup);
  const firstValues = parseList(firstGroup);
  const firstGroupIsConditions =
    explicitConditions === undefined &&
    [
      ...firstConditionValues.conditions,
      ...firstConditionValues.qualifiedConditions.map(
        ({ condition }) => condition,
      ),
    ].every((value) => conditionNames.has(value));
  const explicitConditionValues = parseConditions(explicitConditions ?? "");
  return firstGroupIsConditions
    ? {
        immunityDamageTypes: [],
        immunityConditions: firstConditionValues.conditions,
        immunityQualifiedConditions: firstConditionValues.qualifiedConditions,
      }
    : {
        immunityDamageTypes: firstValues,
        immunityConditions: explicitConditionValues.conditions,
        immunityQualifiedConditions:
          explicitConditionValues.qualifiedConditions,
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

const projectedGearItem = (item: string, quantity: number): string =>
  quantity > 1 && item.endsWith("s") ? item.slice(0, -1) : item;

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
      const quantity = Number(gear[2] ?? 1);
      const item = gear[1] ?? "";
      return {
        item: projectedGearItem(item, quantity),
        quantity,
      };
    })
    .sort((left, right) => left.item.localeCompare(right.item));
};

const NUMBER_WORDS = [
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
] as const;

const parseLanguageSet = (value: string): LanguageSetProjection => {
  if (value === "All") return { kind: "all" };
  const additional = value.match(
    /^(.+) plus (one|two|three|four|five) other languages?$/,
  );
  const languages = (additional?.[1] ?? value)
    .split(/, (?![^()]*\))| and /)
    .map((language) => language.replace(/^and /, ""));
  if (additional === null) return { kind: "named", languages };
  const additionalLanguageCount = NUMBER_WORDS.find(
    ([word]) => word === additional[2],
  )?.[1];
  if (additionalLanguageCount === undefined) {
    throw new Error(`Unsupported additional language count ${additional[2]}`);
  }
  return {
    kind: "named_plus_other_languages",
    languages,
    additionalLanguages: additionalLanguageCount,
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
  const telepathyText = text.match(/; telepathy (\d+) ft\.$/);
  const withoutTelepathy = text.replace(/; telepathy \d+ ft\.$/, "");
  const telepathy =
    telepathyText?.[1] === undefined
      ? {}
      : { telepathy: { rangeFeet: Number(telepathyText[1]) } };
  const understoodOnly = withoutTelepathy.match(
    /^Understands (.+) but can't speak$/,
  );
  if (understoodOnly !== null) {
    return {
      kind: "understood_but_cannot_speak",
      languages: parseLanguageSet(understoodOnly[1] ?? ""),
      ...telepathy,
    };
  }
  const [spoken = "", qualifier] = withoutTelepathy.split("; ");
  if (telepathyText !== null && qualifier === undefined) {
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      ...telepathy,
    };
  }
  if (qualifier?.startsWith("telepathy ") === true) {
    const telepathy = requireMatch(
      qualifier,
      /^telepathy (\d+) ft\.(?: \((doesn't allow the receiving creature to respond telepathically|works only with creatures that understand (.+))\))?$/,
      `${context} telepathy`,
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      telepathy: {
        rangeFeet: Number(telepathy[1]),
        ...(telepathy[3] === undefined
          ? {}
          : {
              requiresLanguageUnderstanding: parseLanguageSet(telepathy[3]),
            }),
        ...(telepathy[2]?.startsWith("doesn't allow") === true
          ? { response: "receiving_creature_cannot_respond" as const }
          : {}),
      },
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
    /\*\*AC\*\* (\d+)(?: \(([^)]+)\))?/,
    `${name} AC`,
  );
  const hp = requireMatch(
    requireLine(lines, "**HP**", name),
    /\*\*HP\*\* (\d+)/,
    `${name} HP`,
  );
  const initiativeLine = lines.find((line) => line.includes("**Initiative**"));
  if (initiativeLine === undefined) {
    throw new Error(`Missing ${name} Initiative`);
  }
  const initiative = requireMatch(
    initiativeLine,
    /\*\*Initiative\*\* ([+−-]?\d+) \((\d+)\)/,
    `${name} Initiative`,
  );
  const challengeRating = requireMatch(
    requireLine(lines, "**CR**", name),
    /\*\*CR\*\* (\d+)(?:\/(\d+))?/,
    `${name} CR`,
  );

  return {
    challengeRating:
      Number(challengeRating[1]) / Number(challengeRating[2] ?? 1),
    ...parseMetadata(lines, name),
    ac: {
      kind: "literal",
      value: Number(ac[1]),
      annotations: ac[2] === undefined ? [] : [ac[2]],
    },
    hp: { kind: "literal", value: Number(hp[1]) },
    speeds: parseSpeeds(lines, name),
    abilityScores: parseAbilityScores(lines, name),
    initiative: {
      modifier: signedNumber(initiative[1] ?? ""),
      score: Number(initiative[2]),
    },
    savingThrowModifiers: parseSavingThrowModifiers(lines, name),
    saveProficiencies: [],
    skillModifiers: parseNamedModifiers(lines, "Skills"),
    vulnerabilities: parseVulnerabilities(lines),
    resistances: parseResistances(lines),
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
    const entry = line.match(/^\*{2,3}(.+?)\.\*{2,3}\s*(.*)$/);
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
    kind: "damage",
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
  if (/\(Recharge after a Short or Long Rest\)$/.test(name)) {
    return [
      {
        kind: "recharge_after_rest",
        rest: "short_or_long",
        ownership: "shared",
      },
    ];
  }
  const recharge = name.match(/\(Recharge (\d)(?:–\d)?\)$/);
  if (recharge !== null) {
    return [
      {
        kind: "recharge",
        minimumRoll: Number(recharge[1]),
        ownership: "shared",
      },
    ];
  }
  const daily = name.match(/\((\d+)\/Day(?:; .+)?\)$/);
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

const parseAmmunitionByWeapon = (
  equipmentSource: string,
): ReadonlyMap<string, string> =>
  new Map(
    equipmentSource.split(/\r?\n/).flatMap((line) => {
      const weapon = line.match(
        /^\| ([^|]+?)\s+\|[^|]*\|[^|]*Ammunition \(Range [^;]+; ([^)]+)\)/,
      );
      return weapon?.[1] === undefined || weapon[2] === undefined
        ? []
        : [[weapon[1].trim(), weapon[2].toLowerCase()] as const];
    }),
  );

const parseSimpleAttack = (
  entry: RawEntry,
  generalFacts: Pick<
    ScopedGeneralFacts,
    "abilityScores" | "challengeRating" | "gear"
  >,
  ammunitionByWeapon: ReadonlyMap<string, string>,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const match = entry.description.match(
    /^(Melee|Ranged) Attack Roll: ([+−-]\d+)(?: to hit)?, (?:(?:reach (\d+) (?:ft|feet)\.)|(?:range (\d+)(?:\/(\d+))? (?:ft|feet)\.)) Hit: (.+)\.$/,
  );
  if (match === null) return undefined;
  const hit = match[6] ?? "";
  const damageTexts = Array.from(
    hit.matchAll(
      /(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage/g,
    ),
    (damage) => damage[0],
  );
  const damages = damageTexts.map((damage) =>
    parseDamage(damage, `${entry.name} Hit`),
  );
  if (damages.some((damage) => damage === undefined)) return undefined;
  const parsedDamages = damages.filter(
    (damage): damage is DamageProjection => damage !== undefined,
  );
  if (parsedDamages.length === 0) return undefined;
  const advantageConditional =
    /if (?:the attack roll|the [A-Za-z ]+) had Advantage(?: on the attack roll)?$/i.test(
      hit,
    );
  const totalDamageAlternative = advantageConditional && hit.includes(", or ");
  const [baseDamage, totalDamage] = parsedDamages;
  const alternativeBonus =
    totalDamageAlternative &&
    parsedDamages.length === 2 &&
    baseDamage !== undefined &&
    totalDamage !== undefined &&
    baseDamage.damageType === totalDamage.damageType &&
    baseDamage.dieSize !== undefined &&
    baseDamage.dieSize === totalDamage.dieSize &&
    baseDamage.dice !== undefined &&
    totalDamage.dice !== undefined &&
    totalDamage.dice > baseDamage.dice &&
    totalDamage.static > baseDamage.static
      ? {
          kind: "conditional_bonus_damage" as const,
          damageType: totalDamage.damageType,
          static: totalDamage.static - baseDamage.static,
          dice: totalDamage.dice - baseDamage.dice,
          dieSize: totalDamage.dieSize,
          ...((totalDamage.flat ?? 0) - (baseDamage.flat ?? 0) === 0
            ? {}
            : { flat: (totalDamage.flat ?? 0) - (baseDamage.flat ?? 0) }),
          when: "attack_roll_had_advantage" as const,
        }
      : undefined;
  let onHit: AttackEffectProjection[];
  if (totalDamageAlternative) {
    if (baseDamage === undefined || alternativeBonus === undefined) {
      return undefined;
    }
    onHit = [baseDamage, alternativeBonus];
  } else {
    onHit = parsedDamages.map((damage, index) =>
      advantageConditional && index === parsedDamages.length - 1
        ? {
            ...damage,
            kind: "conditional_bonus_damage",
            when: "attack_roll_had_advantage",
          }
        : damage,
    );
  }
  const sizeCondition = hit.match(
    /If the target is a (Tiny|Small|Medium|Large|Huge|Gargantuan) or smaller creature, it has the ([A-Za-z]+) condition/,
  );
  if (sizeCondition?.[1] !== undefined && sizeCondition[2] !== undefined) {
    onHit.push({
      kind: "apply_condition_if_target_size_at_most",
      maxCreatureSize: sizeCondition[1].toLowerCase(),
      condition: sizeCondition[2].toLowerCase(),
    });
  }
  const targetTurnCondition = hit.match(
    /(?:and )?the target has the ([A-Za-z]+) condition until the end of its next turn$/,
  );
  if (targetTurnCondition?.[1] !== undefined) {
    onHit.push({
      kind: "apply_condition",
      condition: targetTurnCondition[1].toLowerCase(),
      expiresAt: "target_next_turn_end",
    });
  }
  const sourceTurnCondition = hit.match(
    /, and the target has the ([A-Za-z]+) condition until the end of the [A-Za-z]+(?: [A-Za-z]+)*'s next turn$/,
  );
  if (sourceTurnCondition?.[1] !== undefined) {
    onHit.push({
      kind: "apply_condition",
      condition: sourceTurnCondition[1].toLowerCase(),
      expiresAt: "source_next_turn_end",
    });
  }
  const residual = hit
    .replace(
      /(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage/g,
      "",
    )
    .replace(
      /If the target is a (?:Tiny|Small|Medium|Large|Huge|Gargantuan) or smaller creature, it has the [A-Za-z]+ condition/,
      "",
    )
    .replace(
      /(?:and )?the target has the [A-Za-z]+ condition until the end of its next turn/,
      "",
    )
    .replace(
      /, and the target has the [A-Za-z]+ condition until the end of the [A-Za-z]+(?: [A-Za-z]+)*'s next turn/,
      "",
    )
    .replace(
      /if (?:the attack roll|the [A-Za-z ]+) had Advantage(?: on the attack roll)?/i,
      "",
    )
    .replace(/\bor\b/gi, "")
    .replace(/\bplus\b/gi, "")
    .replace(/[\s,.]/g, "");
  if (residual !== "") return undefined;
  const attackType = match[1]?.toLowerCase();
  if (attackType !== "melee" && attackType !== "ranged") {
    throw new Error(`Unsupported ${entry.name} attack type ${match[1] ?? ""}`);
  }
  const attackAbility = attackAbilityEvidence(
    rawAttackAbilityCandidates(
      generalFacts.abilityScores,
      generalFacts.challengeRating,
      signedNumber(match[2] ?? ""),
    ),
  );
  if (attackAbility === undefined) return undefined;
  const procedureName = normalizedProcedureName(entry.name);
  const ammunition = generalFacts.gear.some(
    ({ item }) => item === procedureName,
  )
    ? ammunitionByWeapon.get(procedureName)
    : undefined;
  return {
    section: entry.section,
    name: procedureName,
    kind: "attack_roll",
    attackType,
    attackBonus: signedNumber(match[2] ?? ""),
    attackAbilityEvidence: attackAbility,
    ...(match[3] === undefined
      ? {
          rangeFeet: {
            normal: Number(match[4]),
            long: Number(match[5] ?? match[4]),
          },
          ...(ammunition === undefined ? {} : { ammunition }),
        }
      : { reachFeet: Number(match[3]) }),
    onHit,
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseSimpleSave = (entry: RawEntry): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const line = entry.description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in an? (\d+)-foot-long, (\d+)-foot-wide Line\. Failure: (.+)\. Success: Half damage\.$/,
  );
  const cone = entry.description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in a (\d+)-foot Cone\. Failure: (.+)\. Success: Half damage\.$/,
  );
  const match = line ?? cone;
  if (match === null) return undefined;
  const onFail = parseDamage(
    match[line === null ? 4 : 5] ?? "",
    `${entry.name} Failure`,
  );
  if (onFail === undefined) return undefined;
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "save",
    ability: parsedAbility(match[1] ?? "", entry.name),
    dc: Number(match[2]),
    area:
      line === null
        ? { kind: "cone", lengthFeet: Number(match[3]) }
        : {
            kind: "line",
            lengthFeet: Number(match[3]),
            widthFeet: Number(match[4]),
          },
    onFail,
    onSuccess: "half_damage",
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseSimpleMultiattack = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  if (entry.description.includes(",")) return undefined;
  const pair = entry.description.match(
    /^The .+ makes (one|two|three) (.+?) attacks? and (one|two|three) (.+?) attacks\.$/,
  );
  if (pair !== null) {
    const firstCount = NUMBER_WORDS.find(([word]) => word === pair[1])?.[1];
    const secondCount = NUMBER_WORDS.find(([word]) => word === pair[3])?.[1];
    if (
      firstCount === undefined ||
      secondCount === undefined ||
      pair[2] === undefined ||
      pair[4] === undefined
    ) {
      throw new Error(`Unable to parse ${entry.name} dispatches`);
    }
    return {
      section: entry.section,
      name: normalizedProcedureName(entry.name),
      kind: "multiattack",
      dispatches: [
        { procedureName: pair[2], count: firstCount },
        { procedureName: pair[4], count: secondCount },
      ],
      resourceLimits: parseRawResourceLimits(entry.name),
    };
  }
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
    const isAlternative = value.slice(index, index + 4) === " or ";
    if ((character === "," || isAlternative) && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + (isAlternative ? 4 : 1);
      if (isAlternative) index += 3;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter((part) => part.length > 0);
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
  const header = entry.description.match(
    /^The .+ casts one of the following spells, (?:(requiring no (?:(Somatic or )?Material|spell) components) and )?using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as (?:the )?spellcasting ability(?: \(spell save DC (\d+)(?:, ([+−-]\d+) to hit with spell attacks)?\))?: /,
  );
  if (header === null) return undefined;
  const groups = Array.from(
    entry.description.matchAll(
      /(?:- )?(?:At Will|(\d+)\/Day( Each)?): (.+?)(?= (?:- )?(?:At Will|\d+\/Day(?: Each)?):|$)/g,
    ),
    (
      group,
    ): Extract<
      ProcedureProjection,
      { readonly kind: "spellcasting" }
    >["groups"][number] => {
      const uses = group[1];
      const spells = splitOutsideParentheses(group[3] ?? "").map(parseSpell);
      return uses === undefined
        ? { kind: "at_will", spells, resourceLimits: [] }
        : {
            kind: "limited",
            spells,
            resourceLimits: [
              {
                kind: "daily",
                uses: Number(uses),
                ownership: group[2] === undefined ? "shared" : "each",
              },
            ],
          };
    },
  );
  if (groups.length === 0) {
    throw new Error(`Missing ${entry.name} spell groups`);
  }
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability: parsedAbility(header[3] ?? "", entry.name),
    ...(header[4] === undefined ? {} : { spellSaveDc: Number(header[4]) }),
    ...(header[5] === undefined
      ? {}
      : { spellAttackBonus: signedNumber(header[5]) }),
    components:
      header[1] === undefined
        ? { kind: "spell_definition" }
        : header[1].includes("spell components")
          ? { kind: "fixed", v: false, s: false, m: false }
          : {
              kind: "fixed",
              v: true,
              s: header[2] === undefined,
              m: false,
            },
    groups,
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseDirectSpellcasting = (
  entry: RawEntry,
  inheritedAbility: AbilityName | undefined,
  inheritedSpellAttackBonus: number | undefined,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const explicitAbility = entry.description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?, requiring no (spell|Material|Somatic or Material) components and using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability(?: \(spell save DC (\d+)\))?\.(?: (The spell .+)\.)?$/,
  );
  const sameAbility = entry.description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?,( requiring no spell components and)? using the same spellcasting ability as Spellcasting\.(?: (The spell .+)\.)?$/,
  );
  if (explicitAbility === null && sameAbility === null) return undefined;
  const inherited = sameAbility === null ? undefined : inheritedAbility;
  if (sameAbility !== null && inherited === undefined) return undefined;
  const match = explicitAbility ?? sameAbility;
  if (match === null) return undefined;
  if (explicitAbility !== null && match[2] !== undefined) return undefined;
  if ((match[1] ?? "").includes(" in response")) {
    return undefined;
  }
  const explicit = explicitAbility !== null;
  const sourceRestriction = explicit ? match[6] : match[4];
  if (match[2] !== undefined && sourceRestriction !== undefined) {
    return undefined;
  }
  const spells = splitOutsideParentheses(match[1] ?? "").map((value) =>
    parseSpell(value.replace(/^or /, "")),
  );
  if (
    spells.length === 0 ||
    spells.some((spell) => spell.castAtLevel !== undefined) ||
    (spells.length > 1 &&
      (match[2] !== undefined || sourceRestriction !== undefined))
  ) {
    return undefined;
  }
  const projectedSpells = spells.map((spell) =>
    sourceRestriction !== undefined
      ? { ...spell, restriction: sourceRestriction }
      : match[2] === undefined
        ? spell
        : { ...spell, restriction: match[2].trim() },
  );
  const ability = explicit
    ? parsedAbility(match[4] ?? "", entry.name)
    : inherited;
  if (ability === undefined) return undefined;
  const limits = parseRawResourceLimits(entry.name);
  const group: Extract<
    ProcedureProjection,
    { readonly kind: "spellcasting" }
  >["groups"][number] = {
    kind: limits.length === 0 ? "at_will" : "limited",
    spells: projectedSpells,
    resourceLimits: limits,
  };
  return {
    section: entry.section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability,
    ...(sameAbility === null || inheritedSpellAttackBonus === undefined
      ? {}
      : { spellAttackBonus: inheritedSpellAttackBonus }),
    ...(explicit && match[5] !== undefined
      ? { spellSaveDc: Number(match[5]) }
      : {}),
    components:
      explicitAbility !== null
        ? match[3] === "spell"
          ? { kind: "fixed", v: false, s: false, m: false }
          : {
              kind: "fixed",
              v: true,
              s: match[3] !== "Somatic or Material",
              m: false,
            }
        : sameAbility?.[3] !== undefined
          ? { kind: "fixed", v: false, s: false, m: false }
          : { kind: "spell_definition" },
    groups: [group],
    resourceLimits: [],
  };
};

const parseActionOption = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  const match = entry.description.match(
    /^The .+ takes the (Dash), (Disengage), or (Hide) action\.$/,
  );
  const pair = entry.description.match(
    /^The .+ takes the (Disengage) or (Hide) action\.$/,
  );
  const options = match?.slice(1) ?? pair?.slice(1);
  return options === undefined
    ? undefined
    : {
        section: entry.section,
        name: normalizedProcedureName(entry.name),
        kind: "action_option",
        options: sortedStrings(options.map(normalizedIdentifier)),
        resourceLimits: parseRawResourceLimits(entry.name),
      };
};

const rawTextOnlyReason = (
  entry: RawEntry,
): "unsupported_action_shape" | "unsupported_procedure_family" =>
  /^The .+ casts .+ on itself, requiring no spell components and using (?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability\.$/.test(
    entry.description,
  ) ||
  (!entry.description.includes("in response") &&
    /^The .+ casts .+(?: or .+)+, using the same spellcasting ability as Spellcasting\.$/.test(
      entry.description,
    )) ||
  /^The .+ casts .+ twice, requiring no .+ components and using .+ as the spellcasting ability/.test(
    entry.description,
  ) ||
  (parseRawResourceLimits(entry.name).length === 0 &&
    /^The .+ casts .+ \(level \d+ version\), requiring no spell components and using .+ as the spellcasting ability/.test(
      entry.description,
    )) ||
  /^The .+ casts .+ using .+ as the spellcasting ability .+ duration is/.test(
    entry.description,
  ) ||
  (entry.section === "Bonus Actions" &&
    /^The .+ casts .+, requiring no spell components and using .+ as the spellcasting ability/.test(
      entry.description,
    ) &&
    !entry.description.includes("can't take this action again")) ||
  /^The .+ shape-shifts .+ Its game statistics are the same in each form, except (?:for )?(?:its|its Fly) Speed/.test(
    entry.description,
  ) ||
  (/^Trigger:/.test(entry.description) &&
    (/\. On a miss, .+ makes one .+ attack/.test(entry.description) ||
      /Response: The .+ uses [A-Za-z' -]+\.$/.test(entry.description) ||
      /Response: The wearer gains a .+ bonus to AC/.test(entry.description) ||
      /Response: The .+ adds \d+ to the roll\.$/.test(entry.description) ||
      /Response: The .+ reduces the damage .+ Saving Throw:/.test(
        entry.description,
      )))
    ? "unsupported_procedure_family"
    : "unsupported_action_shape";

const parseRawProcedure = (
  entry: RawEntry,
  generalFacts: Pick<
    ScopedGeneralFacts,
    "abilityScores" | "challengeRating" | "gear"
  >,
  ammunitionByWeapon: ReadonlyMap<string, string>,
  spellcastingAbility: AbilityName | undefined,
  spellAttackBonus: number | undefined,
): ProcedureProjection | undefined => {
  if (entry.section === "Traits") return undefined;
  return (
    parseSpellcasting(entry) ??
    parseDirectSpellcasting(entry, spellcastingAbility, spellAttackBonus) ??
    parseSimpleAttack(entry, generalFacts, ammunitionByWeapon) ??
    parseSimpleSave(entry) ??
    parseSimpleMultiattack(entry) ??
    parseActionOption(entry) ?? {
      section: entry.section,
      name: normalizedProcedureName(entry.name),
      kind: "textOnly",
      description: entry.description,
      reason: rawTextOnlyReason(entry),
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

const uniqueSpellcastingFacts = (
  entries: readonly RawEntry[],
):
  | {
      readonly ability: AbilityName;
      readonly spellAttackBonus: number | undefined;
    }
  | undefined => {
  const spellcasting = entries.flatMap((entry) => {
    const procedure = parseSpellcasting(entry);
    return procedure?.kind === "spellcasting" ? [procedure] : [];
  });
  if (spellcasting.length > 1) {
    throw new Error("A RAW Stat Block has multiple Spellcasting abilities");
  }
  const [procedure] = spellcasting;
  return procedure === undefined
    ? undefined
    : {
        ability: procedure.ability,
        spellAttackBonus: procedure.spellAttackBonus,
      };
};

export const projectRawStatBlocks = (
  source: string,
  occurrences: readonly SrdStatBlockSourceOccurrence[],
  records: readonly SrdStatBlockRecord[],
  equipmentSource: string,
): readonly RawStatBlockProjection[] => {
  const sourceLines = source.split(/\r?\n/);
  const recordsByName = new Map(records.map((record) => [record.name, record]));
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);

  return occurrences
    .map((occurrence) => {
      const record = recordsByName.get(occurrence.name);
      if (record === undefined) {
        throw new Error(`Missing authored RAW record ${occurrence.name}`);
      }
      const lines = rawRecordLines(sourceLines, occurrence);
      const entries = parseRawEntries(lines);
      const generalFacts = parseRawGeneralFacts(occurrence.name, lines);
      const spellcasting = uniqueSpellcastingFacts(entries);
      const parsedProcedures = entries.flatMap((entry) => {
        const procedure = parseRawProcedure(
          entry,
          generalFacts,
          ammunitionByWeapon,
          spellcasting?.ability,
          spellcasting?.spellAttackBonus,
        );
        return procedure === undefined ? [] : [procedure];
      });
      const structurallyPresentNames = new Set(
        entries
          .filter((entry) => entry.section !== "Traits")
          .map((entry) => normalizedProcedureName(entry.name)),
      );
      const procedures = parsedProcedures.map(
        (procedure): ProcedureProjection => {
          if (
            procedure.kind !== "multiattack" ||
            procedure.dispatches.every((dispatch) =>
              structurallyPresentNames.has(dispatch.procedureName),
            )
          ) {
            return procedure;
          }
          const entry = entries.find(
            (candidate) =>
              candidate.section === procedure.section &&
              normalizedProcedureName(candidate.name) === procedure.name,
          );
          if (entry === undefined) {
            throw new Error(
              `Missing ${occurrence.name}/${procedure.name} RAW entry`,
            );
          }
          return {
            section: procedure.section,
            name: procedure.name,
            kind: "textOnly",
            description: entry.description,
            reason: "unsupported_action_shape",
            resourceLimits: parseRawResourceLimits(entry.name),
          };
        },
      );
      const admissionDisposition = authoredProcedures(record).flatMap(
        ({ section, entry }) =>
          entry.kind === "textOnly"
            ? [
                {
                  section,
                  name: normalizedProcedureName(entry.name),
                  description: normalizedProse(entry.description),
                  reason: entry.reason,
                },
              ]
            : [],
      );
      const legendaryActionUses = parseLegendaryActionUses(lines);
      const resources = procedureResourceLimits(procedures);

      return {
        id: statBlockIdFromRawName(occurrence.name),
        name: occurrence.name,
        sourceSection: occurrence.anchor.section.replace(
          ".references/srd-5.2.1/",
          "",
        ),
        generalFacts: {
          ...generalFacts,
          ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
        },
        resources,
        entryNames: entries.map((entry) =>
          entry.section === "Traits"
            ? `${entry.section}/${entry.name}`
            : `${entry.section}/${normalizedProcedureName(entry.name)}`,
        ),
        traits: entries
          .filter((entry) => entry.section === "Traits")
          .map(({ name, description }) => ({
            name,
            description,
            effect: null,
          })),
        textOnlyProcedures: admissionDisposition,
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
type AttackEffect = Extract<
  Extract<
    ExecutableProcedure,
    { readonly kind: "attack_roll" }
  >["onHit"][number],
  { readonly kind: string }
>;
type AttackDamage = Extract<AttackEffect, { readonly kind: "damage" }>;
type AttackConditionalDamage = Extract<
  AttackEffect,
  { readonly kind: "conditional_bonus_damage" }
>;

const projectDamageFields = (
  damage: AttackDamage | AttackConditionalDamage,
): Omit<DamageProjection, "kind"> => {
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
          ...(expression.spellcastingMod === undefined
            ? {}
            : { spellcastingMod: expression.spellcastingMod }),
          ...(expression.abilityModifier === undefined
            ? {}
            : { abilityModifier: expression.abilityModifier }),
        }),
  };
};

const projectDamage = (damage: AttackDamage): DamageProjection => ({
  kind: "damage",
  ...projectDamageFields(damage),
});

const projectAttackEffect = (effect: AttackEffect): AttackEffectProjection => {
  if (effect.kind === "damage") return projectDamage(effect);
  if (effect.kind === "conditional_bonus_damage") {
    if (effect.when.kind !== "attack_roll_had_advantage") {
      throw new Error("Unsupported conditional attack damage trigger");
    }
    return {
      kind: "conditional_bonus_damage",
      ...projectDamageFields(effect),
      when: "attack_roll_had_advantage",
    };
  }
  if (effect.kind === "apply_condition_if_target_size_at_most") {
    return {
      kind: "apply_condition_if_target_size_at_most",
      condition: effect.condition,
      maxCreatureSize: effect.maxCreatureSize,
    };
  }
  if (effect.kind === "apply_condition" && "expiresAt" in effect) {
    return {
      kind: "apply_condition",
      condition: effect.condition,
      expiresAt: Match.value(effect.expiresAt).pipe(
        Match.when(
          { kind: "source_next_turn_end" },
          () => "source_next_turn_end" as const,
        ),
        Match.when(
          { kind: "target_next_turn_end" },
          () => "target_next_turn_end" as const,
        ),
        Match.exhaustive,
      ),
    };
  }
  throw new Error("Unsupported authored attack effect");
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
    return projectResource(resource);
  });
};

const projectResource = (
  resource: NonNullable<SrdStatBlockRecord["statBlock"]["resources"]>[number],
): ResourceLimitProjection =>
  Match.value(resource.limit).pipe(
    Match.when({ kind: "daily" }, (daily) => ({
      kind: "daily" as const,
      uses: daily.uses,
      ownership: resource.ownership,
    })),
    Match.when({ kind: "recharge" }, (recharge) => ({
      kind: "recharge" as const,
      minimumRoll: recharge.minimumRoll,
      ownership: resource.ownership,
    })),
    Match.when({ kind: "recharge_after_rest" }, (afterRest) => ({
      kind: "recharge_after_rest" as const,
      rest: afterRest.rest,
      ownership: resource.ownership,
    })),
    Match.exhaustive,
  );

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
      attackAbilityEvidence: (() => {
        const candidates = rawAttackAbilityCandidates(
          record.statBlock.abilityScores,
          record.challengeRating,
          literalValue(attack.attackBonus),
        );
        const evidence = attackAbilityEvidence(candidates);
        if (evidence === undefined) {
          throw new Error(
            `${record.name}/${attack.name} has no RAW-derived attack ability candidate`,
          );
        }
        if (!candidates.includes(attack.attackAbility)) {
          throw new Error(
            `${record.name}/${attack.name} uses ${attack.attackAbility} outside RAW-derived attack ability candidates ${candidates.join(", ")}`,
          );
        }
        return evidence;
      })(),
      ...(attack.attackType === "melee"
        ? { reachFeet: attack.reachFeet }
        : {
            rangeFeet: attack.rangeFeet,
            ...(attack.ammunition === undefined
              ? {}
              : { ammunition: attack.ammunition }),
          }),
      onHit: attack.onHit.map(projectAttackEffect),
      ...(attack.multiattackCount === undefined
        ? {}
        : { multiattackCount: literalValue(attack.multiattackCount) }),
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
      if (
        !("area" in save) ||
        (save.area.kind !== "line" && save.area.kind !== "cone")
      ) {
        throw new Error(`${record.name}/${save.name} has an unsupported area`);
      }
      return {
        section,
        name: normalizedProcedureName(save.name),
        kind: "save" as const,
        ability: save.ability,
        dc: save.dc.dc,
        area:
          save.area.kind === "line"
            ? {
                kind: "line" as const,
                lengthFeet: save.area.lengthFeet,
                widthFeet: save.area.widthFeet,
              }
            : {
                kind: "cone" as const,
                lengthFeet: save.area.lengthFeet,
              },
        onFail: projectDamage(save.onFail),
        onSuccess: "half_damage" as const,
        ...(save.multiattackCount === undefined
          ? {}
          : { multiattackCount: literalValue(save.multiattackCount) }),
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
      components:
        spellcasting.components === undefined
          ? { kind: "spell_definition" as const }
          : { kind: "fixed" as const, ...spellcasting.components },
      groups: spellcasting.groups.map((group) => ({
        kind: group.kind,
        spells: group.spells.map((spell) => ({
          spellId: spell.spellId,
          ...(spell.count === undefined ? {} : { count: spell.count }),
          ...(spell.castAtLevel === undefined
            ? {}
            : { castAtLevel: spell.castAtLevel }),
          ...(spell.restriction === undefined
            ? {}
            : { restriction: spell.restriction }),
        })),
        resourceLimits: projectResourceLimits(record, group.resourceRefs),
      })),
      resourceLimits,
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
  ammunitionByWeapon: ReadonlyMap<string, string>,
): readonly ProcedureProjection[] => {
  const entries = authoredProcedures(record);
  const inheritedSpellcastingFacts = entries.flatMap(({ section, entry }) => {
    if (
      entry.kind === "executable" &&
      entry.procedure.kind === "spellcasting" &&
      normalizedProcedureName(entry.procedure.name) === "Spellcasting"
    ) {
      return [
        {
          ability: entry.procedure.ability,
          spellAttackBonus:
            entry.procedure.spellAttackBonus?.kind === "literal"
              ? entry.procedure.spellAttackBonus.value
              : undefined,
        },
      ];
    }
    if (
      entry.kind === "textOnly" &&
      normalizedProcedureName(entry.name) === "Spellcasting"
    ) {
      const parsed = parseSpellcasting({
        section,
        name: entry.name,
        description: normalizedProse(entry.description),
      });
      return parsed?.kind === "spellcasting"
        ? [
            {
              ability: parsed.ability,
              spellAttackBonus: parsed.spellAttackBonus,
            },
          ]
        : [];
    }
    return [];
  });
  if (inheritedSpellcastingFacts.length > 1) {
    throw new Error(`${record.name} has multiple Spellcasting abilities`);
  }
  const inheritedSpellcasting = inheritedSpellcastingFacts[0];
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
      const structuralProcedure = parseRawProcedure(
        {
          section,
          name: entry.name,
          description: normalizedProse(entry.description),
        },
        {
          abilityScores: record.statBlock.abilityScores,
          challengeRating: record.challengeRating,
          gear: (record.statBlock.gear ?? []).map((gear) => ({
            item: gear.item,
            quantity: gear.quantity ?? 1,
          })),
        },
        ammunitionByWeapon,
        inheritedSpellcasting?.ability,
        inheritedSpellcasting?.spellAttackBonus,
      );
      if (
        structuralProcedure !== undefined &&
        structuralProcedure.kind !== "textOnly"
      ) {
        if (
          structuralProcedure.kind === "spellcasting" &&
          structuralProcedure.groups.length === 1 &&
          structuralProcedure.groups[0]?.resourceLimits.length === 0 &&
          resourceLimits.length > 0
        ) {
          return {
            ...structuralProcedure,
            groups: [
              {
                ...structuralProcedure.groups[0],
                kind: "limited",
                resourceLimits,
              },
            ],
          };
        }
        return structuralProcedure;
      }
      return {
        section,
        name: normalizedProcedureName(entry.name),
        kind: "textOnly",
        description: normalizedProse(entry.description),
        reason: entry.reason,
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

type AuthoredSpeedEntry = SrdStatBlockRecord["statBlock"]["speeds"][number];
type AuthoredConcreteSpeed = Exclude<
  AuthoredSpeedEntry,
  { readonly kind: "gm_choice" }
>;

const projectAuthoredConcreteSpeed = (
  speed: AuthoredConcreteSpeed,
): ScopedConcreteSpeed => ({
  kind: speed.kind,
  feet: speed.feet.value,
  hover: speed.kind === "fly" && speed.hover === true,
  ...(!("availability" in speed) ? {} : { availability: speed.availability }),
});

const projectAuthoredSpeed = (speed: AuthoredSpeedEntry): ScopedSpeedEntry =>
  Match.value(speed).pipe(
    Match.when({ kind: "gm_choice" }, ({ alternatives }) => ({
      kind: "gm_choice" as const,
      alternatives: alternatives.map(projectAuthoredConcreteSpeed),
    })),
    Match.when({ kind: "walk" }, projectAuthoredConcreteSpeed),
    Match.when({ kind: "burrow" }, projectAuthoredConcreteSpeed),
    Match.when({ kind: "climb" }, projectAuthoredConcreteSpeed),
    Match.when({ kind: "fly" }, projectAuthoredConcreteSpeed),
    Match.when({ kind: "swim" }, projectAuthoredConcreteSpeed),
    Match.exhaustive,
  );

export const projectAuthoredStatBlocks = (
  records: readonly SrdStatBlockRecord[],
  equipmentSource: string,
): readonly RawStatBlockProjection[] => {
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  return records
    .map((record) => {
      const procedures = authoredProcedures(record);
      const projectedProcedures = projectAuthoredProcedures(
        record,
        ammunitionByWeapon,
      );
      const referencedResourceOrdinals = new Set(
        procedures.flatMap(({ entry }) => [
          ...(entry.resourceRefs.kind === "some"
            ? entry.resourceRefs.ordinals
            : []),
          ...(entry.kind === "executable" &&
          entry.procedure.kind === "spellcasting"
            ? entry.procedure.groups.flatMap((group) =>
                group.resourceRefs.kind === "some"
                  ? group.resourceRefs.ordinals
                  : [],
              )
            : []),
        ]),
      );
      const legendaryActionUses = projectLegendaryActionUses(record);
      const resistances = record.statBlock.resistances;
      return {
        id: record.id,
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
          ac: {
            ...record.statBlock.ac.value,
            annotations: record.statBlock.ac.annotations ?? [],
          },
          hp: record.statBlock.hp,
          speeds: record.statBlock.speeds.map(projectAuthoredSpeed),
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
          saveProficiencies: sortedStrings(
            record.statBlock.saveProficiencies ?? [],
          ),
          skillModifiers: sortedModifiers(
            (record.statBlock.skillModifiers ?? []).map(
              ({ skill, modifier }) => ({
                name: skill,
                modifier,
              }),
            ),
          ),
          vulnerabilities:
            record.statBlock.vulnerabilities === undefined
              ? { kind: "none" as const }
              : record.statBlock.vulnerabilities.kind === "qualified"
                ? {
                    kind: "qualified" as const,
                    damageTypes: sortedNonEmptyStrings(
                      record.statBlock.vulnerabilities.damageTypes,
                      `${record.name} qualified vulnerability damage type`,
                    ),
                    qualifier: record.statBlock.vulnerabilities.qualifier,
                  }
                : {
                    kind: "fixed" as const,
                    damageTypes: sortedNonEmptyStrings(
                      record.statBlock.vulnerabilities.damageTypes,
                      `${record.name} vulnerability damage type`,
                    ),
                  },
          resistances:
            resistances === undefined
              ? { kind: "fixed" as const, damageTypes: [] }
              : Match.value(resistances).pipe(
                  Match.when({ kind: "fixed" }, (fixed) => ({
                    kind: "fixed" as const,
                    damageTypes: sortedStrings(fixed.damageTypes),
                  })),
                  Match.when({ kind: "choose_one_from" }, (chosen) => ({
                    kind: "choose_one_from" as const,
                    options: sortedStrings(chosen.options),
                  })),
                  Match.exhaustive,
                ),
          immunityDamageTypes: sortedStrings(
            record.statBlock.immunities !== undefined &&
              "damageTypes" in record.statBlock.immunities
              ? record.statBlock.immunities.damageTypes
              : [],
          ),
          immunityConditions: sortedStrings(
            record.statBlock.immunities !== undefined &&
              "conditions" in record.statBlock.immunities
              ? record.statBlock.immunities.conditions
              : [],
          ),
          immunityQualifiedConditions: [
            ...(record.statBlock.immunities !== undefined &&
            "qualifiedConditions" in record.statBlock.immunities
              ? record.statBlock.immunities.qualifiedConditions
              : []),
          ].sort((left, right) =>
            left.condition.localeCompare(right.condition),
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
          swarm: record.statBlock.swarm ?? null,
          ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
        },
        resources: [
          ...procedureResourceLimits(projectedProcedures),
          ...(record.statBlock.resources ?? [])
            .filter(
              (resource) => !referencedResourceOrdinals.has(resource.ordinal),
            )
            .map((resource) => projectResource(resource)),
        ],
        entryNames: [
          ...(record.statBlock.traits ?? []).map(
            (trait) => `Traits/${trait.name}`,
          ),
          ...procedures.map(
            ({ section, entry }) =>
              `${section}/${normalizedProcedureName(procedureName(entry))}`,
          ),
        ],
        traits: (record.statBlock.traits ?? []).map((trait) => ({
          name: trait.name,
          description: normalizedProse(trait.description),
          effect: trait.effect ?? null,
        })),
        textOnlyProcedures: procedures.flatMap(({ section, entry }) =>
          entry.kind === "textOnly"
            ? [
                {
                  section,
                  name: normalizedProcedureName(entry.name),
                  description: normalizedProse(entry.description),
                  reason: entry.reason,
                },
              ]
            : [],
        ),
        procedures: projectedProcedures,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
};
