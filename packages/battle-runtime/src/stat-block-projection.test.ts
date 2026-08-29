import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import { statBlockId } from "@dnd/shared/game-facts";
import { StatBlockProcedureOrdinalSchema } from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StandaloneStatBlock,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  battleAmmunitionStock,
  battleCreatureInitFromStatBlock,
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
  discoverBattleActsWithStatBlockProjectionIssues,
  initiativeScore,
  projectAuthoredStatBlock,
  startBattle,
} from "./index.ts";
import {
  admittedStatBlockSource,
  nonSpellExecutableProcedureEntry,
  isNonSpellExecutableProcedureEntryOfKind,
  statBlockCatalog,
  monsterMultiattackStatBlock,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution-state.ts";
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import { statBlockAttackDamageSelectionUsesOnlyComponentNotation } from "./stat-block-attack-damage-selection.ts";
import {
  statBlockTraitsAreSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-support.ts";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);

function initializedStatBlock(source: StatBlockRecord) {
  const initialized = battleCreatureInitFromStatBlock({
    combatantId: combatantId("stat-block-projection-actor"),
    statBlock: source,
    initiative: initiativeScore(10),
    ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (Either.isLeft(initialized)) {
    throw new Error(`Expected Stat Block initialization: ${initialized.left}`);
  }
  return initialized.right;
}

function startedStatBlock(source: StatBlockRecord) {
  const started = startBattle({
    battleId: battleId("stat-block-projection"),
    combatants: [initializedStatBlock(source)],
  });
  if (Either.isLeft(started)) {
    throw new Error(`Expected Stat Block battle start: ${started.left}`);
  }
  return started.right;
}

function mechanicalActs(session: ReturnType<typeof startedStatBlock>) {
  return discoverBattleActsWithStatBlockProjectionIssues(session).acts.map(
    ({ subject, initialHoles }) => ({ subject, initialHoles }),
  );
}

function mechanicalProjection(session: ReturnType<typeof startedStatBlock>) {
  const actor = session.state.combatants.get(
    combatantId("stat-block-projection-actor"),
  );
  if (actor === undefined || actor.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block projection actor.");
  }
  return {
    maxHp: actor.maxHp,
    armorClass: actor.armorClass,
    size: actor.size,
    mechanics: actor.origin.mechanics,
    execution: actor.origin.execution,
  };
}

describe("generic Stat Block projection", () => {
  test("admits authored mechanics and presentation as one operation", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: combatantId("authored-stat-block"),
      statBlock: source,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: [],
    });

    expect(Either.isRight(initialized)).toBe(true);
    if (Either.isLeft(initialized)) return;
    expect(initialized.right.creatureInit.kind).toBe("statBlock");
    if (initialized.right.creatureInit.kind !== "statBlock") return;
    expect(initialized.right.creatureInit.source.procedures).not.toHaveLength(
      0,
    );
    if (initialized.right.creatureInit.kind !== "statBlock") return;
    expect(initialized.right.creatureInit.presentation.displayName).toBe(
      source.name,
    );
  });

  test("keeps authored projection failure distinct from battle init failure", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: combatantId("nonliteral-authored-stat-block"),
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          size: { kind: "alternatives", options: ["small", "medium"] },
        },
      },
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: [],
    });

    expect(initialized).toMatchObject({
      _tag: "Left",
      left: {
        tag: "statBlockProjectionFailure",
        failure: { reason: "nonLiteralSize" },
      },
    });
  });

  test("retains mandatory authored presentation at initialization", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: combatantId("stat-block-with-presentation"),
      statBlock: source,
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      conditions: [],
    });
    expect(Either.isRight(initialized)).toBe(true);
    if (Either.isLeft(initialized)) return;
    if (initialized.right.creatureInit.kind !== "statBlock") return;
    expect(initialized.right.creatureInit.presentation.displayName).toBe(
      source.name,
    );
  });

  test("keeps text-only traits separate from typed trait support", () => {
    const untyped = [
      {
        name: "Coordinated Strike",
        description:
          "The form has Advantage on attack rolls against a creature if an ally is next to the creature.",
      },
    ] satisfies NonNullable<StandaloneStatBlock["traits"]>;
    const typed = [
      {
        ...untyped[0],
        effect: {
          kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target" as const,
        },
      },
    ] satisfies NonNullable<StandaloneStatBlock["traits"]>;
    const unsupported = [
      {
        ...untyped[0],
        effect: {
          kind: "caster_shared_resistance" as const,
          chosenFrom: "resistances_list" as const,
        },
      },
    ] satisfies NonNullable<StandaloneStatBlock["traits"]>;

    expect(statBlockTraitsAreSupported(untyped)).toBe(true);
    expect(statBlockTraitsAreSupported(typed)).toBe(true);
    expect(statBlockTraitsAreSupported(unsupported)).toBe(false);
    expect(supportedStatBlockTraitAttackRollModes(untyped)).toBeUndefined();
    expect(supportedStatBlockTraitAttackRollModes(typed)).toEqual([
      {
        mode: "advantage",
        predicate: "nonIncapacitatedAllyWithin5FeetOfTarget",
      },
    ]);
    expect(supportedStatBlockTraitAttackRollModes(unsupported)).toBeUndefined();
  });

  test("admits a static-only authored damage amount as a static attack option", () => {
    const cat = assertStatBlockForTest(
      statBlockCatalog,
      statBlockId("stat_block_cat"),
    );
    const projected = projectAuthoredStatBlock(cat);
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;

    const [admission] = statBlockExecutionAdmissionCohort(
      battleId("static-only-authored-damage"),
      combatantId("static-only-authored-damage"),
      [admittedStatBlockSource(cat)],
      battleExecutionScopeOrdinal(0),
    ).admissions;
    const scratchBinding = admission.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.procedureOrdinal === 1,
    );
    expect(scratchBinding).toBeDefined();
    if (scratchBinding === undefined) return;
    const scratch = statBlockAttackActionOptions(admission.execution).find(
      (option) =>
        option.procedureRef === scratchBinding.procedureRef &&
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          attackExecutionSelectionForOption(option).statBlockDamageSelection,
          "static",
        ),
    );

    expect(scratch).toMatchObject({
      kind: "statBlockAttack",
      attack: {
        onHit: {
          damage: {
            baseComponents: [
              {
                kind: "fixed",
                amount: 1,
              },
            ],
          },
        },
      },
    });
  });

  test("rejects an authored Multiattack targeting a text-only action", () => {
    const source = statBlockRecord();
    const attack = source.statBlock.actions?.[0];
    if (
      attack === undefined ||
      !isNonSpellExecutableProcedureEntryOfKind(attack, "attack_roll")
    ) {
      throw new Error("Expected an authored action attack.");
    }
    const withUnsupportedDispatch: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic-multiattack-unsupported-target"),
      name: "Synthetic Multiattacker",
      statBlock: {
        ...source.statBlock,
        actions: [
          attack,
          {
            kind: "textOnly",
            procedureOrdinal: authoredOrdinal(2),
            name: "Unresolved Action",
            description: "The creature uses an unresolved action.",
            reason: "required_table_adjudication",
            resourceRefs: { kind: "none" },
          },
          {
            kind: "executable",
            procedureOrdinal: authoredOrdinal(3),
            procedure: {
              kind: "multiattack",
              name: "Synthetic Routine",
              dispatches: [
                {
                  procedureOrdinal: authoredOrdinal(2),
                  count: { kind: "literal", value: 1 },
                },
              ],
            },
            resourceRefs: { kind: "none" },
          },
        ],
      },
    };

    const projected = projectAuthoredStatBlock(withUnsupportedDispatch);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [{ section: "actions", procedureOrdinal: authoredOrdinal(3) }],
    });
  });

  test("rejects an authored Multiattack targeting an unsupported executable attack", () => {
    const source = statBlockRecord();
    const attack = source.statBlock.actions?.[0];
    if (
      attack === undefined ||
      !isNonSpellExecutableProcedureEntryOfKind(attack, "attack_roll")
    ) {
      throw new Error("Expected an authored action attack.");
    }
    const unsupportedAttack = {
      ...attack,
      procedure: {
        ...attack.procedure,
        multiattackCount: { kind: "literal" as const, value: 2 },
      },
    };
    const multiattack = nonSpellExecutableProcedureEntry(3, {
      kind: "multiattack",
      name: "Synthetic Routine",
      dispatches: [
        {
          procedureOrdinal: attack.procedureOrdinal,
          count: { kind: "literal", value: 1 },
        },
      ],
    });
    const projected = projectAuthoredStatBlock({
      ...source,
      id: statBlockId("synthetic-multiattack-unsupported-attack"),
      statBlock: {
        ...source.statBlock,
        actions: [unsupportedAttack, multiattack],
      },
    });
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        { section: "actions", procedureOrdinal: attack.procedureOrdinal },
        {
          section: "actions",
          procedureOrdinal: multiattack.procedureOrdinal,
        },
      ],
    });
  });

  test("rejects an authored Multiattack with a non-positive dispatch count", () => {
    const projected = projectAuthoredStatBlock(
      monsterMultiattackStatBlock({ scimitarCount: 0 }),
    );

    expect(projected).toEqual(
      Either.left({
        tag: "battleStatBlockProjectionFailure",
        reason: "unsupportedProcedureBinding",
        issues: [
          {
            section: "actions",
            procedureOrdinal: authoredOrdinal(3),
          },
        ],
      }),
    );
  });

  test("renamed equivalent mechanics project to the same creature facts and Acts", () => {
    const source = statBlockRecord();
    const renamed = {
      ...source,
      id: statBlockId("synthetic-stat-block-projection"),
      name: "Synthetic Projection Shape",
      statBlock: {
        ...source.statBlock,
        displayName: "Synthetic Projection Shape",
      },
    };

    const originalSession = startedStatBlock(source);
    const renamedSession = startedStatBlock(renamed);

    expect(mechanicalProjection(originalSession)).toEqual(
      mechanicalProjection(renamedSession),
    );
    expect(mechanicalActs(originalSession)).toEqual(
      mechanicalActs(renamedSession),
    );
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(originalSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(renamedSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
  });

  test("rejects every unsupported executable section binding", () => {
    const source = statBlockRecord();
    const actionAttack = source.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    if (actionAttack === undefined) {
      throw new Error("Expected a fixture action attack.");
    }
    const reusedAcrossSections: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic-reused-action-attack"),
      statBlock: {
        ...source.statBlock,
        bonusActions: [
          actionAttack,
          {
            kind: "executable",
            procedureOrdinal: authoredOrdinal(2),
            procedure: {
              kind: "action_option",
              name: "Synthetic Unsupported Bonus Action",
              options: ["dash"],
            },
            resourceRefs: { kind: "none" },
          },
        ],
      },
    };

    const projected = projectAuthoredStatBlock(reusedAcrossSections);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left.reason).toBe("unsupportedProcedureBinding");
    if (projected.left.reason !== "unsupportedProcedureBinding") return;
    expect(projected.left.issues).toEqual([
      {
        section: "bonusActions",
        procedureOrdinal: actionAttack.procedureOrdinal,
      },
      {
        section: "bonusActions",
        procedureOrdinal: authoredOrdinal(2),
      },
    ]);
  });

  test("keeps text-only procedures in presentation without runtime admission failure", () => {
    const source = statBlockRecord();
    const textOnly: Extract<
      StatBlockProcedureEntry,
      { readonly kind: "textOnly" }
    > = {
      kind: "textOnly",
      procedureOrdinal: authoredOrdinal(99),
      name: "Synthetic Unresolved Action",
      description: "The creature uses an unresolved action.",
      reason: "required_table_adjudication",
      resourceRefs: { kind: "none" },
    };
    const projected = projectAuthoredStatBlock({
      ...source,
      statBlock: {
        ...source.statBlock,
        actions: [...(source.statBlock.actions ?? []), textOnly],
      },
    });
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;
    expect(projected.right.runtime.procedures).not.toContainEqual(
      expect.objectContaining({ procedureOrdinal: textOnly.procedureOrdinal }),
    );
    expect(projected.right.presentation.orderedProcedures).toContainEqual({
      section: "actions",
      procedureOrdinal: textOnly.procedureOrdinal,
      name: textOnly.name,
      description: textOnly.description,
      kind: "textOnly",
      reason: textOnly.reason,
      resourceRefs: [],
    });
  });

  test("projects supported attack, Multiattack, and Bonus Action paths", () => {
    const source = monsterMultiattackStatBlock();
    const supportedBonusAction: Extract<
      StatBlockProcedureEntry,
      { readonly kind: "executable" }
    > = {
      kind: "executable",
      procedureOrdinal: authoredOrdinal(4),
      procedure: {
        kind: "action_option",
        name: "Synthetic Disengage",
        options: ["disengage"],
      },
      resourceRefs: { kind: "none" },
    };
    const projected = projectAuthoredStatBlock({
      ...source,
      statBlock: {
        ...source.statBlock,
        bonusActions: [supportedBonusAction],
      },
    });
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;
    expect(projected.right.runtime.procedures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "attack" }),
        expect.objectContaining({ kind: "multiattack" }),
        expect.objectContaining({
          kind: "bonusActionOption",
          procedureOrdinal: supportedBonusAction.procedureOrdinal,
          standardActions: ["disengage"],
        }),
      ]),
    );
  });
});
