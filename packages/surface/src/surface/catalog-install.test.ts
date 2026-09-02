import { readFileSync } from "node:fs";

import { Option } from "effect";
import { describe, expect, test } from "vitest";

import armorChainMailInput from "../../content/armor_chain_mail.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import { statBlockId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import { installSrdSurface, installSrdSurfaceText } from "./catalog-install.ts";
import type { SurfaceMechanicsAdmission } from "./mechanics-admission.ts";
import {
  statBlockMechanicsPath,
  unitMechanicsPath,
  type StatBlockMechanicsPath,
  type UnitMechanicsPath,
} from "./mechanics-graph-path.ts";

const publishedUnit = {
  ...armorChainMailInput,
  rulesExcerpt: "Synthetic test excerpt for one authored Unit.",
};
const publishedStatBlock = {
  ...goblinWarriorInput,
  rulesExcerpt: "Synthetic test excerpt for one authored Stat Block.",
};
const goblinWarriorId = statBlockId(goblinWarriorInput.id);
const unitAcFormulaPath = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);
const unitDonDoffPath = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
  { kind: "singleton", role: "effect" },
]);
const statBlockFirstProcedurePath = statBlockMechanicsPath([
  { kind: "occurrence", role: "action", ordinal: PositiveInteger(1) },
  { kind: "singleton", role: "procedure" },
]);
const statBlockSecondProcedurePath = statBlockMechanicsPath([
  { kind: "occurrence", role: "action", ordinal: PositiveInteger(2) },
  { kind: "singleton", role: "procedure" },
]);
const portableSurface = {
  kind: "srd-5.2.1-surface-catalog",
  units: [publishedUnit],
  statBlocks: [publishedStatBlock],
};

const noMechanicsIssues: SurfaceMechanicsAdmission<
  UnitMechanicsPath,
  StatBlockMechanicsPath
> = {
  admitUnit: () => ({ tag: "admitted" }),
  admitStatBlock: () => ({ tag: "admitted" }),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

describe("atomic Surface catalog installation", () => {
  test("installs distinct Unit and Stat Block catalogs after both admissions", () => {
    const seen: string[] = [];
    const result = installSrdSurface({
      raw: portableSurface,
      mechanicsAdmission: {
        admitUnit: ({ unit }) => {
          seen.push(`unit:${unit.id}`);
          expect(Object.hasOwn(unit, "rulesExcerpt")).toBe(false);
          return { tag: "admitted" };
        },
        admitStatBlock: ({ statBlock }) => {
          seen.push(`statBlock:${statBlock.id}`);
          expect(Object.hasOwn(statBlock, "rulesExcerpt")).toBe(false);
          return { tag: "admitted" };
        },
      },
    });

    expect(result.tag).toBe("accepted");
    expect(seen).toEqual([
      `unit:${armorChainMailInput.id}`,
      `statBlock:${goblinWarriorInput.id}`,
    ]);
    if (result.tag !== "accepted") return;

    expect(
      Option.isSome(result.catalog.unitCatalog.getUnit(armorChainMailInput.id)),
    ).toBe(true);
    expect(
      Option.isSome(
        result.catalog.statBlockCatalog.getStatBlock(goblinWarriorId),
      ),
    ).toBe(true);
    expect(Object.keys(result)).toEqual(["tag", "catalog"]);
    expect(Object.keys(result.catalog)).toEqual([
      "unitCatalog",
      "statBlockCatalog",
    ]);
  });

  test("uses the same atomic boundary for JSON text", () => {
    const result = installSrdSurfaceText({
      text: JSON.stringify(portableSurface),
      mechanicsAdmission: noMechanicsIssues,
    });

    expect(result.tag).toBe("accepted");
  });

  test("accumulates independent mechanics issues with family roots and paths", () => {
    const result = installSrdSurface({
      raw: portableSurface,
      mechanicsAdmission: {
        admitUnit: () => ({
          tag: "rejected",
          issues: [
            {
              reason: "unsupported_mechanics",
              mechanicsPath: unitAcFormulaPath,
              message: "The equipment formula is not admitted by this profile.",
            },
            {
              reason: "ambiguous_mechanics",
              mechanicsPath: unitDonDoffPath,
              message: "The equipment effect is ambiguous for this profile.",
            },
          ],
        }),
        admitStatBlock: () => ({
          tag: "rejected",
          issues: [
            {
              reason: "incomplete_graph",
              mechanicsPath: statBlockFirstProcedurePath,
              message: "The action graph is incomplete for this profile.",
            },
            {
              reason: "no_admitted_procedure",
              mechanicsPath: statBlockSecondProcedurePath,
              message: "No executable procedure profile matched this action.",
            },
          ],
        }),
      },
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          phase: "admission",
          root: { kind: "unit", id: armorChainMailInput.id },
          reason: "unsupported_mechanics",
          mechanicsPath: unitAcFormulaPath,
          message: "The equipment formula is not admitted by this profile.",
        },
        {
          phase: "admission",
          root: { kind: "unit", id: armorChainMailInput.id },
          reason: "ambiguous_mechanics",
          mechanicsPath: unitDonDoffPath,
          message: "The equipment effect is ambiguous for this profile.",
        },
        {
          phase: "admission",
          root: { kind: "statBlock", id: goblinWarriorInput.id },
          reason: "incomplete_graph",
          mechanicsPath: statBlockFirstProcedurePath,
          message: "The action graph is incomplete for this profile.",
        },
        {
          phase: "admission",
          root: { kind: "statBlock", id: goblinWarriorInput.id },
          reason: "no_admitted_procedure",
          mechanicsPath: statBlockSecondProcedurePath,
          message: "No executable procedure profile matched this action.",
        },
      ],
    });
    expect(result).not.toHaveProperty("catalog");
    expect(result).not.toHaveProperty("receipt");
    expect(result).not.toHaveProperty("diagnostics");
    expect(result).not.toHaveProperty("status");
  });

  test("accumulates portable content issues and does not admit partial members", () => {
    let admissionCalled = false;
    const malformedUnit = { ...publishedUnit, unexpected: true };
    const result = installSrdSurface({
      raw: {
        ...portableSurface,
        units: [publishedUnit, publishedUnit, malformedUnit],
      },
      mechanicsAdmission: {
        admitUnit: () => {
          admissionCalled = true;
          return { tag: "admitted" };
        },
        admitStatBlock: () => {
          admissionCalled = true;
          return { tag: "admitted" };
        },
      },
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toHaveLength(2);
    expect(
      result.issues.map((entry) =>
        entry.phase === "decode" ? entry.issue.kind : entry.phase,
      ),
    ).toEqual(["portable-surface", "portable-surface"]);
    expect(
      result.issues
        .filter(
          (entry): entry is Extract<typeof entry, { phase: "decode" }> =>
            entry.phase === "decode",
        )
        .map((entry) =>
          entry.issue.kind === "portable-surface" ? entry.issue.issue.code : "",
        ),
    ).toEqual(["schema", "duplicate-authored-identity"]);
    expect(admissionCalled).toBe(false);
    expect(result).not.toHaveProperty("catalog");
  });

  test("projects duplicate spellcasting-class ownership from a complete published catalog", () => {
    const published: unknown = JSON.parse(
      readFileSync(
        new URL("../../publication/srd-surface.json", import.meta.url),
        "utf8",
      ),
    );
    if (!isRecord(published) || !Array.isArray(published.units)) {
      throw new Error("Published Surface fixture lost its Unit collection");
    }
    const bard = published.units.find(
      (unit) => isRecord(unit) && unit.id === "class_bard",
    );
    if (!isRecord(bard)) {
      throw new Error("Published Surface fixture lost the Bard class record");
    }
    const duplicateBard = {
      ...bard,
      id: "synthetic_duplicate_bard_class",
    };

    const result = installSrdSurface({
      raw: {
        ...published,
        units: [...published.units, duplicateBard],
      },
      mechanicsAdmission: noMechanicsIssues,
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          phase: "decode",
          issue: {
            kind: "unit-catalog",
            issue: {
              code: "duplicateSpellcastingClassName",
              className: "bard",
              unitIds: ["class_bard", "synthetic_duplicate_bard_class"],
            },
          },
        },
      ],
    });
  });
});
