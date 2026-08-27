import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  characterWeaponPresentationSource,
  emptyBattleRuntimeContext,
  type BattleStatBlockAuthoredProcedurePresentation,
} from "./battle-runtime-context.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
import { battleSubjectPresentation } from "./battle-act-composition.ts";
import {
  battleId,
  authoredProcedureOrdinal,
  characterSeed,
  combatantId,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  monsterMultiattackStatBlock,
  startBattleSessionRight,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { attackExecutionDamageType } from "./battle-action-options.ts";
import {
  attackActionOptionPresentationName,
  battleCreaturePresentationDisplayName,
  statBlockProjectionIssuesForActor,
  statBlockProcedurePresentations,
  statBlockProcedurePresentationsForActor,
} from "./stat-block-presentation.ts";

function presentationSession() {
  return startBattleSessionRight({
    battleId: battleId("stat-block-presentation-boundaries"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

describe("battle presentation joins", () => {
  test("projects authored Stat Block communication into presentation context", () => {
    const source = statBlockRecord();
    const projected = Either.getOrThrow(projectAuthoredStatBlock(source));

    expect(projected.presentation).toMatchObject({
      displayName: source.name,
      communication: source.statBlock.communication,
      traits: [],
    });
  });

  test("retains typed traits and accumulates trait and action projection issues", () => {
    const source = statBlockRecord();
    const textOnlyTrait = {
      name: "Synthetic Prose Trait",
      description:
        "The creature has Advantage on attack rolls when an ally is nearby.",
    };
    const unsupportedTrait = {
      name: "Synthetic Healing Trait",
      description: "The creature shares a restorative effect.",
      effect: {
        kind: "caster_heal_link" as const,
        rangeFeet: 30,
      },
    };
    const supportedTrait = {
      name: "Synthetic Coordinated Trait",
      description: "The creature coordinates with an ally.",
      effect: {
        kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target" as const,
      },
    };
    const textOnlyAction = {
      kind: "textOnly" as const,
      procedureOrdinal: authoredProcedureOrdinal(3),
      name: "Synthetic Unresolved Action",
      description: "The creature uses a table-adjudicated action.",
      reason: "required_table_adjudication" as const,
      resourceRefs: { kind: "none" as const },
    };
    const record: StatBlockRecord = {
      ...source,
      name: "Synthetic Trait Projection",
      provenance: {
        kind: "synthetic-test" as const,
        section: "synthetic-trait-projection",
      },
      statBlock: {
        ...source.statBlock,
        traits: [textOnlyTrait, unsupportedTrait, supportedTrait],
        actions: [...(source.statBlock.actions ?? []), textOnlyAction],
      },
    };
    const projected = Either.getOrThrow(projectAuthoredStatBlock(record));

    expect(projected.presentation.traits).toEqual([
      textOnlyTrait,
      unsupportedTrait,
      supportedTrait,
    ]);

    const session = startBattleSessionRight({
      battleId: battleId("stat-block-trait-projection-boundary"),
      combatants: [
        statBlockCreatureInit({ statBlock: record, initiative: 10 }),
      ],
    });
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        session.context,
        goblinId,
      ),
    ).toEqual([
      {
        tag: "statBlockProjectionIssue",
        source: { kind: "trait", nonExecutableReason: "textOnlyTrait" },
      },
      {
        tag: "statBlockProjectionIssue",
        source: {
          kind: "trait",
          nonExecutableReason: "unsupportedTraitEffect",
        },
      },
      {
        tag: "statBlockProjectionIssue",
        source: {
          kind: "action",
          section: "actions",
          shape: "special",
          nonExecutableReason: "required_table_adjudication",
        },
      },
    ]);
  });

  test("returns null when durable combatants have no matching presentation owner", () => {
    const session = presentationSession();

    expect(
      battleCreaturePresentationDisplayName(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
      ),
    ).toBeNull();
    expect(
      battleCreaturePresentationDisplayName(
        session.state,
        session.context,
        fighterId,
      ),
    ).toBe("Fighter");
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
      ),
    ).toBeNull();
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        session.context,
        fighterId,
      ),
    ).toBeNull();
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        emptyBattleRuntimeContext(),
        fighterId,
      ),
    ).toBeNull();
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
      ),
    ).toBeNull();
    expect(
      battleCreaturePresentationDisplayName(
        session.state,
        session.context,
        combatantId("missing-combatant"),
      ),
    ).toBeNull();
  });

  test("reports missing presentation when executable procedures are present", () => {
    const session = presentationSession();
    const actor = session.state.combatants.get(goblinId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Goblin Stat Block actor.");
    }

    const result = statBlockProcedurePresentations({
      execution: actor.origin.execution,
    });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(
        result.left.every((issue) => issue.reason === "missingPresentation"),
      ).toBe(true);
    }
  });

  test("maps unmatched presentation shapes to projection issues", () => {
    const session = presentationSession();
    const source = session.context.statBlocks.get(goblinId);
    if (source === undefined) {
      throw new Error("Expected Goblin presentation source.");
    }
    const template = source.orderedProcedures[0];
    if (template === undefined) {
      throw new Error("Expected Goblin presentation procedure.");
    }
    const unmatchedProjectionCases = [
      { kind: "multiattack", shape: "multiattack" },
      { kind: "bonusActionOption", shape: "actionOption" },
      { kind: "save", shape: "save" },
      { kind: "support", shape: "support" },
      { kind: "spellcasting", shape: "special" },
    ] as const;
    const unmatchedPresentationCases = unmatchedProjectionCases.map(
      ({ kind, shape }, index) => ({
        shape,
        presentation: {
          section: template.section,
          procedureOrdinal: authoredProcedureOrdinal(
            template.procedureOrdinal + 100 + index,
          ),
          name: `Synthetic ${kind} presentation`,
          kind,
          resourceRefs: template.resourceRefs,
        } satisfies BattleStatBlockAuthoredProcedurePresentation,
      }),
    );
    const contextWithUnmatchedPresentations = battleRuntimeContextForTest(
      session.context.characters,
      new Map([
        [
          goblinId,
          {
            ...source,
            orderedProcedures: [
              ...source.orderedProcedures,
              ...unmatchedPresentationCases.map(
                ({ presentation }) => presentation,
              ),
            ],
          },
        ],
      ]),
    );

    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        contextWithUnmatchedPresentations,
        goblinId,
      ),
    ).toEqual(
      unmatchedPresentationCases.map(({ shape, presentation }) => ({
        tag: "statBlockProjectionIssue",
        source: {
          kind: "action",
          section: presentation.section,
          shape,
          nonExecutableReason: "unsupportedActionShape",
        },
      })),
    );
  });

  test("reports a typed issue when a procedure presentation misses its binding", () => {
    const session = presentationSession();
    const subject = goblinAttackSubject(session.state, "Scimitar");
    const actor = session.state.combatants.get(goblinId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Goblin Stat Block actor.");
    }
    const attack = statBlockAttackActionOptions(actor.origin.execution).find(
      (candidate) => candidate.procedureRef === subject.procedureRef,
    );
    if (attack === undefined) {
      throw new Error("Expected Goblin attack execution.");
    }
    expect(attackExecutionDamageType(attack)).toBeUndefined();
    expect(
      attackActionOptionPresentationName(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockAdmissionMissing",
      }),
    );

    const source = session.context.statBlocks.get(goblinId);
    if (source === undefined) {
      throw new Error("Expected Goblin presentation source.");
    }
    const firstProcedure = source.orderedProcedures[0];
    if (firstProcedure === undefined) {
      throw new Error("Expected Goblin procedure presentation.");
    }
    const contextWithMissingProcedure = battleRuntimeContextForTest(
      session.context.characters,
      new Map([
        [
          goblinId,
          {
            ...source,
            orderedProcedures: source.orderedProcedures.map((procedure) =>
              procedure === firstProcedure
                ? {
                    ...procedure,
                    procedureOrdinal: authoredProcedureOrdinal(
                      procedure.procedureOrdinal + 100,
                    ),
                  }
                : procedure,
            ),
          },
        ],
      ]),
    );
    const firstExecutionProcedure =
      actor.origin.execution.procedureBindings.find(
        (binding) =>
          binding.procedure.kind !== "unarmedStrike" &&
          binding.procedure.section === firstProcedure.section &&
          binding.procedure.procedureOrdinal ===
            firstProcedure.procedureOrdinal,
      );
    if (firstExecutionProcedure?.procedure.kind !== "attack") {
      throw new Error("Expected the first Goblin procedure to be an attack.");
    }
    const missingJoinIssues = [
      {
        tag: "statBlockProcedurePresentationJoinIssue" as const,
        reason: "missingPresentation" as const,
        section: firstExecutionProcedure.procedure.section,
        procedureOrdinal: firstExecutionProcedure.procedure.procedureOrdinal,
        executionKind: "attack" as const,
      },
    ];
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        contextWithMissingProcedure,
        goblinId,
      ),
    ).toEqual(Either.left(missingJoinIssues));
    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithMissingProcedure,
        goblinId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockProcedurePresentationJoin",
        issues: missingJoinIssues,
      }),
    );
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        contextWithMissingProcedure,
        goblinId,
      ),
    ).toEqual([
      {
        tag: "statBlockProjectionIssue",
        source: {
          kind: "action",
          section: firstProcedure.section,
          shape: "attack",
          nonExecutableReason: "unsupportedActionShape",
        },
      },
    ]);

    const contextWithMismatchedProcedure = battleRuntimeContextForTest(
      session.context.characters,
      new Map([
        [
          goblinId,
          {
            ...source,
            orderedProcedures: source.orderedProcedures.map((procedure) =>
              procedure === firstProcedure
                ? {
                    section: procedure.section,
                    procedureOrdinal: procedure.procedureOrdinal,
                    name: "Synthetic text-only presentation",
                    description: "Synthetic text-only presentation.",
                    kind: "textOnly" as const,
                    reason: "required_table_adjudication" as const,
                    resourceRefs: procedure.resourceRefs,
                  }
                : procedure,
            ),
          },
        ],
      ]),
    );
    const mismatchedJoinIssues = [
      {
        tag: "statBlockProcedurePresentationJoinIssue" as const,
        reason: "presentationKindMismatch" as const,
        section: firstExecutionProcedure.procedure.section,
        procedureOrdinal: firstExecutionProcedure.procedure.procedureOrdinal,
        executionKind: "attack" as const,
        presentationKind: "textOnly" as const,
      },
    ];
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        contextWithMismatchedProcedure,
        goblinId,
      ),
    ).toEqual(Either.left(mismatchedJoinIssues));
    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithMismatchedProcedure,
        goblinId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockProcedurePresentationJoin",
        issues: mismatchedJoinIssues,
      }),
    );
  });

  test("surfaces a typed join issue for a non-attack Stat Block subject", () => {
    const session = startBattleSessionRight({
      battleId: battleId("stat-block-presentation-multiattack-join"),
      combatants: [
        statBlockCreatureInit({
          statBlock: monsterMultiattackStatBlock(),
          initiative: 10,
        }),
      ],
    });
    const actor = session.state.combatants.get(goblinId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Multiattack Stat Block actor.");
    }
    const multiattackBinding = actor.origin.execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "multiattack",
    );
    if (multiattackBinding?.procedure.kind !== "multiattack") {
      throw new Error("Expected admitted Multiattack procedure.");
    }
    const source = session.context.statBlocks.get(goblinId);
    if (source === undefined) {
      throw new Error("Expected Multiattack presentation source.");
    }
    const multiattackPresentation = source.orderedProcedures.find(
      (procedure) => procedure.kind === "multiattack",
    );
    if (multiattackPresentation === undefined) {
      throw new Error("Expected Multiattack presentation.");
    }
    const contextWithMismatchedMultiattack = battleRuntimeContextForTest(
      session.context.characters,
      new Map([
        [
          goblinId,
          {
            ...source,
            orderedProcedures: source.orderedProcedures.map((procedure) =>
              procedure === multiattackPresentation
                ? {
                    section: procedure.section,
                    procedureOrdinal: procedure.procedureOrdinal,
                    name: "Synthetic text-only Multiattack",
                    description: "Synthetic text-only Multiattack.",
                    kind: "textOnly" as const,
                    reason: "required_table_adjudication" as const,
                    resourceRefs: procedure.resourceRefs,
                  }
                : procedure,
            ),
          },
        ],
      ]),
    );
    const mismatchedSession = battleRuntimeSessionForTest({
      state: session.state,
      context: contextWithMismatchedMultiattack,
    });
    expect(
      battleSubjectPresentation(mismatchedSession, {
        tag: "action",
        actorId: goblinId,
        action: "multiattack",
        procedureRef: multiattackBinding.procedureRef,
      }),
    ).toEqual({
      kind: "presentationIssue",
      issue: {
        tag: "attackPresentationJoinIssue",
        reason: "statBlockProcedurePresentationJoin",
        issues: [
          {
            tag: "statBlockProcedurePresentationJoinIssue",
            reason: "presentationKindMismatch",
            section: "actions",
            procedureOrdinal: multiattackBinding.procedure.procedureOrdinal,
            executionKind: "multiattack",
            presentationKind: "textOnly",
          },
        ],
      },
    });
  });

  test("reports a missing authored weapon source separately from character context", () => {
    const session = presentationSession();
    const actor = session.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character" || actor.origin.attack === null) {
      throw new Error("Expected Fighter weapon attack.");
    }
    const attack = actor.origin.attack;
    const source = session.context.characters.get(fighterId);
    if (source === undefined) {
      throw new Error("Expected Fighter presentation source.");
    }
    const contextWithoutWeapon = battleRuntimeContextForTest(
      new Map([[fighterId, { ...source, unitPresentationSources: [] }]]),
      session.context.statBlocks,
    );

    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithoutWeapon,
        fighterId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "weaponPresentationMissing",
      }),
    );
    const weaponSource = source.unitPresentationSources.find(
      ({ unit }) => unit.id === attack.weapon.weaponUnitId,
    );
    if (weaponSource === undefined) {
      throw new Error("Expected Fighter weapon presentation source.");
    }
    expect(
      characterWeaponPresentationSource(
        {
          ...source,
          unitPresentationSources: [weaponSource, weaponSource],
        },
        attack.weapon.weaponUnitId,
      ),
    ).toEqual(
      Either.left({
        tag: "characterWeaponPresentationSourceIssue",
        reason: "ambiguous",
        weaponUnitId: attack.weapon.weaponUnitId,
      }),
    );
    expect(fighterAttackSubject(session.state)).toBeDefined();
  });
});
