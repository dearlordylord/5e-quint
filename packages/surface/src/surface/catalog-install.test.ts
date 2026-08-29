import { Option } from "effect";
import { describe, expect, test } from "vitest";

import armorChainMailInput from "../../content/armor_chain_mail.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import { statBlockId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  installSrdSurface,
  installSrdSurfaceText,
  type SurfaceMechanicsAdmission,
} from "./catalog-install.ts";
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
  admitUnit: () => ({ tag: "admitted", execution: "unit-execution" }),
  admitStatBlock: () => ({
    tag: "admitted",
    execution: "stat-block-execution",
  }),
};

describe("atomic Surface catalog installation", () => {
  test("installs distinct Unit and Stat Block catalogs after both admissions", () => {
    const seen: string[] = [];
    const result = installSrdSurface({
      raw: portableSurface,
      mechanicsAdmission: {
        admitUnit: ({ unit }) => {
          seen.push(`unit:${unit.id}`);
          expect(Object.hasOwn(unit, "rulesExcerpt")).toBe(false);
          return { tag: "admitted", execution: "unit-execution" };
        },
        admitStatBlock: ({ statBlock }) => {
          seen.push(`statBlock:${statBlock.id}`);
          expect(Object.hasOwn(statBlock, "rulesExcerpt")).toBe(false);
          return {
            tag: "admitted",
            execution: "stat-block-execution",
          };
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
      Option.isSome(result.catalog.unitLibrary.getUnit(armorChainMailInput.id)),
    ).toBe(true);
    expect(
      Option.isSome(
        result.catalog.statBlockCatalog.getStatBlock(goblinWarriorId),
      ),
    ).toBe(true);
    expect(Object.keys(result)).toEqual(["tag", "catalog"]);
    expect(Object.keys(result.catalog)).toEqual([
      "unitLibrary",
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

  test("retains admitted execution and authored mechanics once in installed entries", () => {
    const unitExecution = { procedure: "synthetic-unit-procedure" } as const;
    const statBlockExecution = {
      procedure: "synthetic-stat-block-procedure",
    } as const;
    let unitAdmissionCalls = 0;
    let statBlockAdmissionCalls = 0;
    let admittedUnit: unknown;
    let admittedStatBlock: unknown;
    const result = installSrdSurface({
      raw: portableSurface,
      mechanicsAdmission: {
        admitUnit: ({ unit }) => {
          unitAdmissionCalls += 1;
          admittedUnit = unit;
          return { tag: "admitted", execution: unitExecution };
        },
        admitStatBlock: ({ statBlock }) => {
          statBlockAdmissionCalls += 1;
          admittedStatBlock = statBlock;
          return { tag: "admitted", execution: statBlockExecution };
        },
      },
    });
    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") return;

    const unitBinding = result.catalog.unitLibrary.getInstalledUnit(
      armorChainMailInput.id,
    );
    const statBlockBinding =
      result.catalog.statBlockCatalog.getInstalledStatBlock(goblinWarriorId);
    expect(Option.isSome(unitBinding)).toBe(true);
    expect(Option.isSome(statBlockBinding)).toBe(true);
    if (Option.isNone(unitBinding) || Option.isNone(statBlockBinding)) return;

    expect(unitBinding.value.kind).toBe("unit");
    expect(statBlockBinding.value.kind).toBe("statBlock");
    expect(unitBinding.value.authored).toBe(admittedUnit);
    expect(statBlockBinding.value.authored).toBe(admittedStatBlock);
    expect(unitBinding.value.execution).toBe(unitExecution);
    expect(statBlockBinding.value.execution).toBe(statBlockExecution);

    result.catalog.unitLibrary.getInstalledUnit(armorChainMailInput.id);
    result.catalog.statBlockCatalog.getInstalledStatBlock(goblinWarriorId);
    expect(unitAdmissionCalls).toBe(1);
    expect(statBlockAdmissionCalls).toBe(1);
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
          return { tag: "admitted", execution: "unit-execution" };
        },
        admitStatBlock: () => {
          admissionCalled = true;
          return {
            tag: "admitted",
            execution: "stat-block-execution",
          };
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
});
