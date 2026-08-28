// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as AST from "effect/SchemaAST";
import { describe, expect, test } from "vitest";
import {
  battleFillKind,
  battleHoleAcceptsFill,
  battleHoleFamilyKind,
  battleSubjectKind,
  BattleInterruptSubjectSchema,
  type BattleFill,
  type BattleHole,
  type BattleSubject,
} from "./index.ts";

type BattleHoleFrontierRow = {
  readonly subject: string;
  readonly id: string;
  readonly holeKind?: string | null;
  readonly fillKind?: string | null;
  readonly subjectKind?: string | null;
  readonly tag?: string;
  readonly action?: string;
  readonly command?: string;
  readonly option?: string;
  readonly spellAction?: string;
};

type BattleSubjectKindCase = {
  readonly tag: string;
  readonly discriminator?: "action" | "command" | "option" | "spellAction";
  readonly discriminatorValue?: string;
  readonly subjectKind: string;
};

const battleHoleFrontierPath = new URL(
  "../../../plans/rules-kernel-coverage/battle-hole-frontier.jsonl",
  import.meta.url,
);
const repoRootPath = fileURLToPath(new URL("../../..", import.meta.url));
const require = createRequire(import.meta.url);
const { extractBattleSubjectKindCases } =
  require("../../../scripts/battle-subject-kind-folds.cjs") as {
    readonly extractBattleSubjectKindCases: (
      rootPath: string,
    ) => readonly BattleSubjectKindCase[];
  };

function battleHoleFamilyRows(): readonly BattleHoleFrontierRow[] {
  return readFileSync(battleHoleFrontierPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as BattleHoleFrontierRow)
    .filter((row) => row.subject === "battle-hole-family");
}

function battleFillKindRows(): readonly BattleHoleFrontierRow[] {
  return battleFrontierRows().filter(
    (row) => row.subject === "battle-fill-kind",
  );
}

function battleSubjectKindRows(): readonly BattleHoleFrontierRow[] {
  return battleFrontierRows().filter(
    (row) => row.subject === "battle-subject-kind",
  );
}

function battleFrontierRows(): readonly BattleHoleFrontierRow[] {
  return readFileSync(battleHoleFrontierPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as BattleHoleFrontierRow);
}

function battleSubjectKindCases(): readonly BattleSubjectKindCase[] {
  return [
    ...extractBattleSubjectKindCases(repoRootPath),
    ...battleInterruptSubjectKindCases(),
  ];
}

const interruptSubjectKindByCommand: Readonly<Record<string, string>> = {
  releaseReadiedSpell: "runtimeReadiedResponse",
  releaseReadiedMovement: "runtimeReadiedResponse",
  releaseReadiedAction: "runtimeReaction",
  releaseReadiedAttack: "runtimeReaction",
  castTriggeredReactionSpell: "runtimeReaction",
  castAttackHitBonusActionSpell: "runtimeReaction",
  opportunityAttack: "runtimeReaction",
  retaliationAttack: "runtimeCommandRetaliationAttack",
};

function battleInterruptSubjectKindCases(): readonly BattleSubjectKindCase[] {
  return interruptSubjectCommandValues(BattleInterruptSubjectSchema.ast).map(
    (command) => {
      const subjectKind = interruptSubjectKindByCommand[command];
      if (subjectKind === undefined) {
        throw new Error(`Missing subject-kind mapping for ${command}.`);
      }
      return {
        tag: "runtimeCommand",
        discriminator: "command",
        discriminatorValue: command,
        subjectKind,
      };
    },
  );
}

function interruptSubjectCommandValues(ast: AST.AST): readonly string[] {
  const members = AST.isUnion(ast) ? ast.types : [ast];
  const commandValues = members.flatMap((member) => {
    if (AST.isUnion(member)) {
      return interruptSubjectCommandValues(member);
    }
    const command = AST.getPropertySignatures(member).find(
      (property) => property.name === "command",
    );
    if (command === undefined) return [];
    if (
      command.type._tag !== "Literal" ||
      typeof command.type.literal !== "string"
    ) {
      throw new Error("Expected interrupt subject command literals.");
    }
    return [command.type.literal];
  });
  return [...new Set(commandValues)];
}

function subjectForKindCase(subjectKindCase: BattleSubjectKindCase) {
  const discriminatorFields =
    subjectKindCase.discriminator === undefined
      ? {}
      : {
          [subjectKindCase.discriminator]: subjectKindCase.discriminatorValue,
        };
  // The mapping under test reads only protocol discriminator fields; full
  // branded ids and payloads are irrelevant for this schema-derived contract.
  return {
    tag: subjectKindCase.tag,
    ...discriminatorFields,
  } as BattleSubject;
}

describe("battle hole family kind vocabulary", () => {
  test("BattleHole mapping matches the frontier registry", () => {
    for (const row of battleHoleFamilyRows()) {
      expect(row.holeKind, `${row.id} must have a hole kind`).toEqual(
        expect.any(String),
      );
      // The mapping under test reads only `kind`; full hole payloads are
      // irrelevant for this registry contract.
      const hole = { kind: row.holeKind } as BattleHole;
      expect(battleHoleFamilyKind(hole), row.id).toBe(row.holeKind);
    }
  });

  test("BattleFill mapping matches the frontier registry", () => {
    for (const row of battleFillKindRows()) {
      expect(row.fillKind, `${row.id} must have a fill kind`).toEqual(
        expect.any(String),
      );
      // The mapping under test reads only `kind`; full fill payloads are
      // irrelevant for this registry contract.
      const fill = { kind: row.fillKind } as BattleFill;
      expect(battleFillKind(fill), row.id).toBe(row.fillKind);
    }
  });

  test("accepts the canonical Ability Check fill for a Spellcasting Ability Check hole", () => {
    // The compatibility relation reads only protocol kinds; full payloads are
    // irrelevant for this boundary contract.
    const spellcastingAbilityCheckHole = {
      kind: "spellcastingAbilityCheck",
    } as BattleHole;
    const abilityCheckFill = { kind: "abilityCheck" } as BattleFill;
    const unrelatedFill = { kind: "rolledDice" } as BattleFill;

    expect(
      battleHoleAcceptsFill(spellcastingAbilityCheckHole, abilityCheckFill),
    ).toBe(true);
    expect(
      battleHoleAcceptsFill(spellcastingAbilityCheckHole, unrelatedFill),
    ).toBe(false);
  });

  test("BattleSubject mapping matches the frontier registry", () => {
    const rowsBySubjectKind = new Map<string, BattleHoleFrontierRow>();
    for (const row of battleSubjectKindRows()) {
      if (typeof row.subjectKind !== "string") {
        throw new Error(`${row.id} must have a subject kind`);
      }
      rowsBySubjectKind.set(row.subjectKind, row);
    }
    const exercisedSubjectKinds = new Set<string>();
    for (const subjectKindCase of battleSubjectKindCases()) {
      expect(
        rowsBySubjectKind.has(subjectKindCase.subjectKind),
        `${subjectKindCase.tag}.${subjectKindCase.discriminator ?? "tag"}:${subjectKindCase.discriminatorValue ?? subjectKindCase.tag} must have a subject-kind row`,
      ).toBe(true);
      expect(
        battleSubjectKind(subjectForKindCase(subjectKindCase)),
        `${subjectKindCase.tag}.${subjectKindCase.discriminator ?? "tag"}:${subjectKindCase.discriminatorValue ?? subjectKindCase.tag}`,
      ).toBe(subjectKindCase.subjectKind);
      exercisedSubjectKinds.add(subjectKindCase.subjectKind);
    }
    for (const row of battleSubjectKindRows()) {
      if (typeof row.subjectKind !== "string") {
        throw new Error(`${row.id} must have a subject kind`);
      }
      expect(
        exercisedSubjectKinds.has(row.subjectKind),
        `${row.id} must be exercised by at least one schema-derived subject case`,
      ).toBe(true);
    }
  });
});
