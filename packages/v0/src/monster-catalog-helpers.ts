import {
  type CanonicalSourceCitation,
  type StatBlockProvenance,
  type SenseType,
  SENSE_TYPES,
  type Skill,
  SKILLS,
} from "#/monster-types.ts";

export const CANONICAL_SRD_MONSTER_PROVENANCE = {
  sourceName: "srd-5.2.1",
  sourceKind: "canonicalRulesText",
  license: "CC-BY-4.0",
} as const satisfies Pick<
  CanonicalSourceCitation,
  "sourceName" | "sourceKind" | "license"
>;

export function monsterSkillBonuses(
  overrides: Partial<Record<Skill, number>>,
): Record<Skill, number> {
  const base = Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as Record<
    Skill,
    number
  >;
  return { ...base, ...overrides };
}

export function monsterSenses(
  overrides: Partial<Record<SenseType, number>>,
): Record<SenseType, number> {
  const base = Object.fromEntries(
    SENSE_TYPES.map((sense) => [sense, 0]),
  ) as Record<SenseType, number>;
  return { ...base, ...overrides };
}

export function monsterSpeeds(
  overrides: Partial<
    Record<"walk" | "fly" | "swim" | "climb" | "burrow", number>
  >,
): Record<"walk" | "fly" | "swim" | "climb" | "burrow", number> {
  return {
    walk: 0,
    fly: 0,
    swim: 0,
    climb: 0,
    burrow: 0,
    ...overrides,
  };
}

export function srdRulesProvenance(
  document: string,
  section: string,
): StatBlockProvenance {
  return {
    provenance: {
      ...CANONICAL_SRD_MONSTER_PROVENANCE,
      citation: {
        document,
        section,
      },
    },
  };
}
