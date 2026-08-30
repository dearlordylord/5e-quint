import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  startBattleSessionRight,
  requireResolved,
  requireHole,
  requireCharacterSpellProcedureRefForTest,
  abilityCheckFill,
  savingThrowOutcomeFill,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  skeletonId,
  wizardId,
  secondWizardId,
  secondSkeletonId,
  statBlockCatalog,
  battleId,
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  findAct,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./battle-runtime.test-support.ts";
import { spellActiveEffectExecutionRef } from "./effect-execution-ref.ts";
import type { SpellActiveEffect } from "./effect-execution-ref.ts";
import { describe, expect, test } from "vitest";
import type {
  BattleSubject,
  BattleHole,
} from "./battle-runtime.test-support.ts";

function holeProcedureRef(hole: BattleHole) {
  if (!("sourceProcedureRef" in hole)) {
    throw new Error("Expected an execution-bound spell hole.");
  }
  return hole.sourceProcedureRef;
}

describe("battle runtime: Color Spray and Entangle", () => {
  test("Color Spray applies spell-owned Blinded to failed self-origin Cone saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-color-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          statBlockName: "Second Skeleton",
          initiative: 8,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_skeleton"),
          ),
        }),
      ],
    });
    const subject = findAct(session, magicSubject("color_spray")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Spell self-origin Cone Saving Throw outcomes",
      ability: "con",
      outcomeTargeting: "area",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          {
            combatantId: skeletonId,
            hp: 13,
            conditions: expect.arrayContaining(["blinded"]),
          },
          {
            combatantId: secondSkeletonId,
            hp: 13,
            conditions: expect.not.arrayContaining(["blinded"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceProcedureRef: holeProcedureRef(savingThrows),
        sourceCombatantId: wizardId,
        condition: "blinded",
        expiresAt: { kind: "endOfTurn", combatantId: wizardId, round: 2 },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Color Spray expiration does not erase unrelated Blinded sources", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-color-spray-source-preservation"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          conditions: ["blinded"],
        }),
      ],
    });
    const subject = findAct(session, magicSubject("color_spray")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const sprayed = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: sprayed.state, actorId: wizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const expired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    );

    expect(expired.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ blinded: true }),
      activeEffects: [],
    });
  });

  test("Entangle applies concentration-owned Restrained to failed point-origin Cube saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-entangle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          statBlockName: "Second Skeleton",
          initiative: 8,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_skeleton"),
          ),
        }),
      ],
    });
    const subject = findAct(session, magicSubject("entangle")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Spell point-origin Cube Saving Throw outcomes",
      ability: "str",
      outcomeTargeting: "area",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, concentrating: true },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["restrained"]),
          },
          {
            combatantId: secondSkeletonId,
            conditions: expect.not.arrayContaining(["restrained"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceProcedureRef: holeProcedureRef(savingThrows),
        sourceCombatantId: wizardId,
        condition: "restrained",
        expiresAt: { kind: "concentration", combatantId: wizardId },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);

    const casterIncluded = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [wizardId, skeletonId],
            },
            outcomes: [
              { targetId: wizardId, succeeded: false },
              { targetId: skeletonId, succeeded: false },
            ],
          },
        },
      ],
    });
    expect(casterIncluded).toMatchObject({
      tag: "invalid",
      message:
        "Restraining ground-area affected targets must exclude the caster.",
    });
  });

  test("Entangle Restrained ends on Concentration break or Strength Athletics escape", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-entangle-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const entangleSubject = findAct(session, magicSubject("entangle")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: entangleSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const entangled = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: entangleSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(entangled, wizardId);
    expect(broken.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });

    const skeletonTurn = requireResolved(
      endTurn({ state: entangled, actorId: wizardId }),
    ).state;
    const escapeAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: skeletonTurn,
        context: session.context,
      }),
    ).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    expect(escapeAct).toMatchObject({
      label: "Escape Entangle",
      initialHoles: [
        expect.objectContaining({
          kind: "abilityCheck",
          ability: "str",
          skill: "athletics",
          dc: 13,
        }),
      ],
    });
    expect(escapeAct?.routeEvents).toBeUndefined();
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Entangle escape action.");
    }
    const failed = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 12)],
      }),
    );
    expect(failed.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });

    const escaped = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 13)],
      }),
    );
    expect(escaped.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });
    expect(escaped.state.combatants.get(wizardId)?.concentration).toEqual(
      skeletonTurn.combatants.get(wizardId)?.concentration,
    );
  });

  test("Entangle escape actions identify the restraining caster", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-entangle-two-casters"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Druid",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const secondDruidEntangle: BattleSubject = {
      tag: "actionSpell",
      actorId: secondWizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        secondWizardId,
        spellSlotInvocationRef("entangle", 1, "saveGatedCondition"),
      ),
      mode: { tag: "cast" },
    };
    const firstEntangleSubject = findAct(
      session,
      magicSubject("entangle"),
    ).subject;
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstEntangleSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: firstEntangleSubject,
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const secondDruidTurn = requireResolved(
      endTurn({ state: firstEntangled, actorId: wizardId }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const twiceEntangled = requireResolved(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const skeletonTurn = requireResolved(
      endTurn({ state: twiceEntangled, actorId: secondWizardId }),
    ).state;
    const escapeActs = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: skeletonTurn,
        context: session.context,
      }),
    ).filter(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );

    const skeletonEffects =
      skeletonTurn.combatants.get(skeletonId)?.activeEffects;
    const wizardRestraint = skeletonEffects?.find(
      (effect): effect is SpellActiveEffect =>
        "sourceProcedureRef" in effect && effect.sourceCombatantId === wizardId,
    );
    const secondWizardRestraint = skeletonEffects?.find(
      (effect): effect is SpellActiveEffect =>
        "sourceProcedureRef" in effect &&
        effect.sourceCombatantId === secondWizardId,
    );
    if (wizardRestraint === undefined || secondWizardRestraint === undefined) {
      throw new Error("Expected both Entangle restraint effects.");
    }
    const wizardEffectRef = spellActiveEffectExecutionRef(wizardRestraint);
    const secondWizardEffectRef = spellActiveEffectExecutionRef(
      secondWizardRestraint,
    );
    expect(escapeActs.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectRef: wizardEffectRef }),
        expect.objectContaining({ effectRef: secondWizardEffectRef }),
      ]),
    );
    const secondDruidEscape = escapeActs.find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.effectRef === secondWizardEffectRef,
    );
    if (
      secondDruidEscape?.subject.tag !== "action" ||
      secondDruidEscape.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected second Druid Entangle escape action.");
    }
    expect(secondDruidEscape.routeEvents).toBeUndefined();

    const escapedSecondDruidRestraint = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: secondDruidEscape.subject,
        fills: [abilityCheckFill(secondDruidEscape.initialHoles[0]!, 13)],
      }),
    ).state;

    expect(
      escapedSecondDruidRestraint.combatants
        .get(skeletonId)
        ?.activeEffects.map((effect) =>
          effect.kind === "spellCondition" ? effect.sourceCombatantId : null,
        ),
    ).toEqual([wizardId]);
    expect(
      escapedSecondDruidRestraint.combatants.get(skeletonId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
  });

  test("Entangle recast preserves the newly applied same-spell restraint", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-entangle-recast"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const entangleSubject = findAct(session, magicSubject("entangle")).subject;
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: entangleSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: entangleSubject,
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const nextDruidTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: firstEntangled, actorId: wizardId }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: entangleSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const recast = requireResolved(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: entangleSubject,
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(recast.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
    expect(
      recast.state.combatants
        .get(skeletonId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellCondition" &&
            effect.sourceCombatantId === wizardId,
        ),
    ).toHaveLength(1);
    expect(expendedLevelOneSlots(recast, wizardId)).toBe(2);
  });
});
