import { Option } from "effect";
import { describe, expect, test } from "vitest";

import armorChainMailInput from "../../content/armor_chain_mail.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import { statBlockId } from "@dnd/shared/game-facts";
import {
  installSrdSurface,
  installSrdSurfaceText,
  type SurfaceMechanicsAdmission,
} from "./catalog-install.ts";

const publishedUnit = {
  ...armorChainMailInput,
  rulesExcerpt: "Synthetic test excerpt for one authored Unit.",
};
const publishedStatBlock = {
  ...goblinWarriorInput,
  rulesExcerpt: "Synthetic test excerpt for one authored Stat Block.",
};
const goblinWarriorId = statBlockId(goblinWarriorInput.id);
const portableSurface = {
  kind: "srd-5.2.1-surface-catalog",
  units: [publishedUnit],
  statBlocks: [publishedStatBlock],
};

const noMechanicsIssues: SurfaceMechanicsAdmission = {
  admitUnit: () => ({ tag: "admitted" }),
  admitStatBlock: () => ({ tag: "admitted" }),
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
              mechanicsPath: "equipment.acFormula",
              message: "The equipment formula is not admitted by this profile.",
            },
            {
              reason: "ambiguous_mechanics",
              mechanicsPath: "provenance.section",
              message: "The source locator is ambiguous for this profile.",
            },
          ],
        }),
        admitStatBlock: () => ({
          tag: "rejected",
          issues: [
            {
              reason: "incomplete_graph",
              mechanicsPath: "statBlock.actions[0].procedure",
              message: "The action graph is incomplete for this profile.",
            },
            {
              reason: "no_admitted_procedure",
              mechanicsPath: "statBlock.actions[1].procedure",
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
          mechanicsPath: "equipment.acFormula",
          message: "The equipment formula is not admitted by this profile.",
        },
        {
          phase: "admission",
          root: { kind: "unit", id: armorChainMailInput.id },
          reason: "ambiguous_mechanics",
          mechanicsPath: "provenance.section",
          message: "The source locator is ambiguous for this profile.",
        },
        {
          phase: "admission",
          root: { kind: "statBlock", id: goblinWarriorInput.id },
          reason: "incomplete_graph",
          mechanicsPath: "statBlock.actions[0].procedure",
          message: "The action graph is incomplete for this profile.",
        },
        {
          phase: "admission",
          root: { kind: "statBlock", id: goblinWarriorInput.id },
          reason: "no_admitted_procedure",
          mechanicsPath: "statBlock.actions[1].procedure",
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
});
