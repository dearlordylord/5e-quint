import type { StatBlockRecord } from "@dnd/surface/surface/types";

type StatBlockProcedureEntry =
  | NonNullable<StatBlockRecord["statBlock"]["actions"]>[number]
  | NonNullable<StatBlockRecord["statBlock"]["bonusActions"]>[number]
  | NonNullable<StatBlockRecord["statBlock"]["reactions"]>[number]
  | NonNullable<
      NonNullable<StatBlockRecord["statBlock"]["legendaryActions"]>["entries"]
    >[number];
type StatBlockExecutableProcedureEntry = Extract<
  StatBlockProcedureEntry,
  { readonly kind: "executable" }
>;
type StatBlockAttack = Extract<
  StatBlockExecutableProcedureEntry["procedure"],
  { readonly kind: "attack_roll" }
>;

export function statBlockSummary(record: StatBlockRecord) {
  const statBlock = record.statBlock;
  const orderedProcedures = authoredProcedureEntries(statBlock);
  return {
    statBlockId: record.id,
    name: record.name,
    creatureType: statBlock.creatureType,
    armorClass: literalNumber(statBlock.ac.value),
    hitPoints: literalNumber(statBlock.hp),
    initiativeModifier: statBlock.initiative.modifier,
    attacks: orderedProcedures.flatMap(({ entry }) =>
      isAttackProcedure(entry) ? [attackSummary(entry.procedure)] : [],
    ),
    orderedProcedures: orderedProcedures.map(({ section, entry }) =>
      procedureSummary(section, entry),
    ),
    damageVulnerabilities: damageModifierTypes(statBlock.vulnerabilities),
    damageResistances: damageModifierTypes(statBlock.resistances),
    damageResistanceChoices: damageResistanceChoices(statBlock.resistances),
    damageImmunities: damageModifierTypes(statBlock.immunities),
    conditionImmunities: conditionModifierTypes(statBlock.immunities),
    provenanceKind: record.provenance.kind,
    provenanceSection: record.provenance.section,
  };
}

function authoredProcedureEntries(
  statBlock: StatBlockRecord["statBlock"],
): ReadonlyArray<{
  readonly section: "action" | "bonus_action" | "reaction" | "legendary_action";
  readonly entry: StatBlockProcedureEntry;
}> {
  return [
    ...(statBlock.actions ?? []).map((entry) => ({
      section: "action" as const,
      entry,
    })),
    ...(statBlock.bonusActions ?? []).map((entry) => ({
      section: "bonus_action" as const,
      entry,
    })),
    ...(statBlock.reactions ?? []).map((entry) => ({
      section: "reaction" as const,
      entry,
    })),
    ...(statBlock.legendaryActions?.entries ?? []).map((entry) => ({
      section: "legendary_action" as const,
      entry,
    })),
  ];
}

function isAttackProcedure(
  entry: StatBlockProcedureEntry,
): entry is StatBlockExecutableProcedureEntry & {
  readonly procedure: StatBlockAttack;
} {
  return entry.kind === "executable" && entry.procedure.kind === "attack_roll";
}

function procedureSummary(
  section: "action" | "bonus_action" | "reaction" | "legendary_action",
  entry: StatBlockProcedureEntry,
) {
  if (entry.kind === "textOnly") {
    return {
      section,
      procedureOrdinal: entry.procedureOrdinal,
      kind: "textOnly" as const,
      name: entry.name,
      description: entry.description,
      reason: entry.reason,
      resourceRefs: entry.resourceRefs,
    };
  }
  const procedure = entry.procedure;
  return {
    section,
    procedureOrdinal: entry.procedureOrdinal,
    kind: "executable" as const,
    procedureKind: procedure.kind,
    name: procedure.name,
    resourceRefs: entry.resourceRefs,
    ...(procedure.kind === "spellcasting"
      ? {
          spellcastingGroups: procedure.groups.map((group) => ({
            kind: group.kind,
            resourceRefs: group.resourceRefs,
            spells: group.spells,
          })),
        }
      : {}),
  };
}

function attackSummary(attack: StatBlockAttack) {
  return {
    attackName: attack.name,
    attackType: attack.attackType,
    attackBonus: literalNumber(attack.attackBonus),
    ...(typeof attack.reachFeet === "number"
      ? { reachFeet: attack.reachFeet }
      : {}),
    ...(attack.rangeFeet === undefined
      ? {}
      : { normalRangeFeet: attack.rangeFeet.normal }),
    ...(attack.rangeFeet === undefined
      ? {}
      : { longRangeFeet: attack.rangeFeet.long }),
    onHit: attack.onHit.map((effect) => JSON.stringify(effect)),
  };
}

function literalNumber(
  value:
    | StatBlockRecord["statBlock"]["ac"]["value"]
    | StatBlockRecord["statBlock"]["hp"]
    | StatBlockAttack["attackBonus"],
): number {
  return value.value;
}

function damageModifierTypes(
  value:
    | StatBlockRecord["statBlock"]["vulnerabilities"]
    | StatBlockRecord["statBlock"]["resistances"]
    | Pick<
        NonNullable<StatBlockRecord["statBlock"]["immunities"]>,
        "damageTypes"
      >
    | undefined,
): string[] {
  if (value === undefined) {
    return [];
  }
  if ("kind" in value && value.kind === "choose_one_from") {
    return [];
  }
  return value.damageTypes === undefined ? [] : [...value.damageTypes];
}

function damageResistanceChoices(
  value: StatBlockRecord["statBlock"]["resistances"] | undefined,
): string[] {
  return value?.kind === "choose_one_from" ? [...value.options] : [];
}

function conditionModifierTypes(
  value: StatBlockRecord["statBlock"]["immunities"],
): string[] {
  return value?.conditions === undefined ? [] : [...value.conditions];
}
