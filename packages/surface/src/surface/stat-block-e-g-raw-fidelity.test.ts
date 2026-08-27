import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { discoverSrdStatBlocks } from "../../../../scripts/srd521-stat-block-parity.ts";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";

const repoRoot = resolve(
  fileURLToPath(new URL("../../../..", import.meta.url)),
);
const sourcePath = ".references/srd-5.2.1/Monsters/Monsters-E-G.md";
const source = readFileSync(resolve(repoRoot, sourcePath), "utf8");
const sourceLines = source.split("\n");
const discovery = discoverSrdStatBlocks([{ sourcePath, contents: source }]);
const occurrences = discovery.occurrences.filter(
  (occurrence) => occurrence.anchor.sourcePath === sourcePath,
);
const records = srdStatBlockCollection.statBlocks.filter((record) =>
  record.provenance.section.startsWith("Monsters/Monsters-E-G.md:"),
);

const plainText = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type RawEntry = { readonly name: string; readonly description: string };

const rawSpan = (lineStart: number, lineEnd: number): string =>
  sourceLines.slice(lineStart - 1, lineEnd).join("\n");

const rawEntries = (span: string): readonly RawEntry[] => {
  const entries: RawEntry[] = [];
  const lines = span.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\*\*\*([^*]+?)\.\*\*\*\s*(.*)$/.exec(lines[index] ?? "");
    if (match === null) continue;
    const continuation: string[] = [match[2] ?? ""];
    while (
      index + 1 < lines.length &&
      !/^#{2,4}\s/.test(lines[index + 1] ?? "") &&
      !/^\*\*\*/.test(lines[index + 1] ?? "")
    ) {
      continuation.push(lines[index + 1] ?? "");
      index += 1;
    }
    entries.push({
      name: plainText(match[1] ?? ""),
      description: plainText(continuation.join(" ")),
    });
  }
  return entries;
};

const regexEscape = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const expectAttackSignature = (
  recordName: string,
  raw: RawEntry,
  procedure: Extract<
    NonNullable<(typeof records)[number]["statBlock"]["actions"]>[number],
    { readonly kind: "executable" }
  >["procedure"] & { readonly kind: "attack_roll" },
): void => {
  expect(raw.description, `${recordName} ${raw.name} attack bonus`).toMatch(
    new RegExp(`\\+${procedure.attackBonus.value}(?: to hit)?[,]`, "i"),
  );
  if (procedure.attackType === "melee") {
    expect(raw.description, `${recordName} ${raw.name} reach`).toContain(
      `reach ${procedure.reachFeet} ft.`,
    );
  } else {
    expect(raw.description, `${recordName} ${raw.name} range`).toContain(
      `range ${procedure.rangeFeet.normal}${
        procedure.rangeFeet.long === procedure.rangeFeet.normal
          ? ""
          : `/${procedure.rangeFeet.long}`
      } ft.`,
    );
  }
  for (const effect of procedure.onHit) {
    if (effect.kind !== "damage" && effect.kind !== "conditional_bonus_damage")
      continue;
    const expression = "expr" in effect.amount ? effect.amount.expr : undefined;
    const staticValue = effect.amount.static;
    expect(
      staticValue,
      `${recordName} ${raw.name} ${effect.damageType} static damage`,
    ).toBeDefined();
    if (staticValue === undefined) continue;
    const printed =
      expression === undefined
        ? `${staticValue}`
        : `${staticValue} (${expression.dice}d${expression.dieSize}${
            expression.flat === undefined
              ? ""
              : ` ${expression.flat < 0 ? "-" : "+"} ${Math.abs(expression.flat)}`
          })`;
    expect(
      raw.description,
      `${recordName} ${raw.name} ${effect.damageType}`,
    ).toMatch(new RegExp(`${regexEscape(printed)} ${effect.damageType}`, "i"));
  }
};

describe("Monsters E-G local RAW fidelity", () => {
  test("binds every authored record to its exact canonical parser anchor", () => {
    expect(discovery.issues).toEqual([]);
    expect(occurrences).toHaveLength(40);
    expect(records).toHaveLength(40);

    const canonicalSections = new Map(
      occurrences.map((occurrence) => [
        occurrence.name,
        occurrence.anchor.section.replace(".references/srd-5.2.1/", ""),
      ]),
    );
    for (const record of records) {
      expect(record.provenance).toEqual({
        kind: "srd-5.2.1",
        section: canonicalSections.get(record.name),
      });
    }
  });

  test("retains independent RAW combat signatures, traits, and text-only prose", () => {
    const occurrenceByName = new Map(
      occurrences.map((occurrence) => [occurrence.name, occurrence]),
    );
    for (const record of records) {
      const occurrence = occurrenceByName.get(record.name);
      expect(occurrence, `${record.name} canonical occurrence`).toBeDefined();
      if (occurrence === undefined) continue;
      const span = rawSpan(
        occurrence.anchor.lineStart,
        occurrence.anchor.lineEnd,
      );
      const entries = rawEntries(span);
      const entriesByName = new Map(
        entries.map((entry) => [entry.name, entry]),
      );

      expect(span, `${record.name} Armor Class`).toMatch(
        new RegExp(`\\*\\*AC\\*\\* ${record.statBlock.ac.value.value} `),
      );
      expect(span, `${record.name} Hit Points`).toMatch(
        new RegExp(`\\*\\*HP\\*\\* ${record.statBlock.hp.value} `),
      );
      expect(span, `${record.name} Initiative`).toContain(
        `**Initiative** ${record.statBlock.initiative.modifier >= 0 ? "+" : "−"}${Math.abs(record.statBlock.initiative.modifier)} (${record.statBlock.initiative.score})`,
      );
      expect(span, `${record.name} Passive Perception`).toMatch(
        new RegExp(
          `(?:\\*\\*)?Passive Perception(?:\\*\\*)? ${record.statBlock.passivePerception}`,
        ),
      );

      for (const trait of record.statBlock.traits ?? []) {
        const raw = entriesByName.get(trait.name);
        expect(raw, `${record.name} trait ${trait.name}`).toBeDefined();
        expect(raw?.description).toBe(plainText(trait.description));
      }

      for (const section of [
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ] as const) {
        const sectionEntries =
          section === "legendaryActions"
            ? record.statBlock.legendaryActions?.entries
            : record.statBlock[section];
        for (const entry of sectionEntries ?? []) {
          const name =
            entry.kind === "executable" ? entry.procedure.name : entry.name;
          const raw = entriesByName.get(name);
          expect(raw, `${record.name} ${section} ${name}`).toBeDefined();
          if (raw === undefined) continue;
          if (entry.kind === "textOnly") {
            expect(plainText(entry.description)).toBe(raw.description);
          } else if (entry.procedure.kind === "attack_roll") {
            expectAttackSignature(record.name, raw, entry.procedure);
          } else if (entry.procedure.kind === "save") {
            const abilityName = {
              str: "Strength",
              dex: "Dexterity",
              con: "Constitution",
              int: "Intelligence",
              wis: "Wisdom",
              cha: "Charisma",
            }[entry.procedure.ability];
            expect(raw.description).toMatch(
              new RegExp(
                `${abilityName} Saving Throw: DC ${entry.procedure.dc.dc}`,
                "i",
              ),
            );
          } else if (entry.procedure.kind === "spellcasting") {
            if (entry.procedure.spellSaveDc !== undefined) {
              expect(raw.description).toContain(
                `spell save DC ${entry.procedure.spellSaveDc.dc}`,
              );
            }
            if (entry.procedure.spellAttackBonus !== undefined) {
              expect(raw.description).toContain(
                `+${entry.procedure.spellAttackBonus.value} to hit`,
              );
            }
            for (const group of entry.procedure.groups) {
              for (const spell of group.spells) {
                const spellName = spell.spellId.replaceAll("_", " ");
                expect(raw.description.toLowerCase()).toContain(spellName);
                if (spell.restriction !== undefined) {
                  expect(raw.description).toContain(spell.restriction);
                }
              }
            }
          } else if (entry.procedure.kind === "action_option") {
            for (const option of entry.procedure.options) {
              expect(raw.description.toLowerCase()).toContain(option);
            }
          }
        }
      }
    }
  });

  test("retains the Goblin rider and each gold/green dragon lair capacity", () => {
    const byName = new Map(records.map((record) => [record.name, record]));
    const goblin = byName.get("Goblin Warrior");
    expect(goblin?.statBlock.actions?.map((entry) => entry.kind)).toEqual([
      "executable",
      "executable",
    ]);
    expect(goblin?.statBlock.bonusActions?.[0]).toMatchObject({
      kind: "executable",
      procedure: { kind: "action_option", options: ["disengage", "hide"] },
    });

    for (const name of [
      "Adult Gold Dragon",
      "Ancient Gold Dragon",
      "Adult Green Dragon",
      "Ancient Green Dragon",
    ]) {
      expect(byName.get(name)?.statBlock.legendaryActions?.uses).toEqual({
        kind: "lair_bonus",
        usesOutsideLair: 3,
        additionalUsesInLair: 1,
      });
    }
  });
});
