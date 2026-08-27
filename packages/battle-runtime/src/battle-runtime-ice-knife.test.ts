import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ray-of-enfeeblement-damage-penalty
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
import type {
  BattleFill,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import { spellSavingThrowAbility } from "./battle-reducer/spells-damage-fills.ts";
import { characterSpellProcedureExecution } from "./character-execution-queries.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  damageRollFillWithGroups,
  findAct,
  magicSubject,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  rolledDiceGroups,
  secondSkeletonId,
  secondWizardId,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: Ice Knife", () => {
  test("Ray of Enfeeblement source penalty is requested before Ice Knife attack-burst save damage", () => {
    const primaryTargetId = combatantId("ice-knife-ray-primary");
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife-ray-penalty"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Primary Target",
          initiative: 10,
          currentHp: 30,
          maxHp: 30,
        }),
      ],
    });
    const baseState = session.state;
    const wizard = baseState.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(wizardId, {
        ...wizard,
        activeEffects: [
          ...wizard.activeEffects,
          {
            kind: "sourceDamageRollPenalty" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("ray_of_enfeeblement"),
            ),
            sourceCombatantId: primaryTargetId,
            amount: { dice: 1 as const, dieSize: 8 as const },
            expiresAt: {
              kind: "concentration" as const,
              combatantId: primaryTargetId,
            },
          },
        ],
      }),
    };
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state }),
        wizardId,
        spellSlotInvocationRef("ice_knife", 2, "attackBurstSaveDamage"),
      ),
      mode: { tag: "cast" },
    };
    if (wizard.origin.kind !== "character") {
      throw new Error("Expected Wizard character execution.");
    }
    const selectedInvocation = characterSpellProcedureExecution(
      wizard.origin.execution,
      subject.procedureRef,
    );
    if (selectedInvocation?.procedure !== "attackBurstSaveDamage") {
      throw new Error("Expected selected Ice Knife attack-burst invocation.");
    }
    expect(spellSavingThrowAbility(selectedInvocation)).toBe("dex");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 20 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const penalty = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          damageRollFillWithGroups(attackDamage, [[5, 5]]),
        ],
      }),
      "rolledDice",
    );
    expect(penalty).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      attackDamage.holeId,
    );
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("ray_of_enfeeblement"),
      ),
      sourceCombatantId: primaryTargetId,
      affectedCombatantId: wizardId,
      damageRollHoleId: holeId(
        "battle:test:ice-knife-attack-stale-source-penalty",
      ),
      amount: { dice: 1, dieSize: 8 },
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          damageRollFillWithGroups(attackDamage, [[5, 5]]),
          damageRollFillWithGroups(penalty, [[3]]),
        ],
      }),
      "savingThrowOutcome",
    );
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          damageRollFillWithGroups(attackDamage, [[5, 5]]),
          damageRollFillWithGroups(penalty, [[3]]),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: false }],
            },
          } satisfies Extract<
            BattleFill,
            { readonly kind: "savingThrowOutcome" }
          >,
        ],
      }),
      "rolledDice",
    );
    const burstPenalty = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          damageRollFillWithGroups(attackDamage, [[5, 5]]),
          damageRollFillWithGroups(penalty, [[3]]),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: false }],
            },
          } satisfies Extract<
            BattleFill,
            { readonly kind: "savingThrowOutcome" }
          >,
          damageRollFillWithGroups(burstDamage, [[4, 4, 4]]),
        ],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          damageRollFillWithGroups(attackDamage, [[5, 5]]),
          damageRollFillWithGroups(penalty, [[3]]),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: false }],
            },
          } satisfies Extract<
            BattleFill,
            { readonly kind: "savingThrowOutcome" }
          >,
          damageRollFillWithGroups(burstDamage, [[4, 4, 4]]),
          damageRollFillWithGroups(burstPenalty, [[2]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("Ice Knife resolves critical attack damage and mandatory primary-target burst", () => {
    const primaryTargetId = combatantId("ice-knife-primary");
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Primary Target",
          initiative: 10,
          currentHp: 30,
          maxHp: 30,
        }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          statBlockName: "Nearby Skeleton",
          initiative: 8,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_skeleton"),
          ),
        }),
      ],
    });
    const baseState = session.state;
    const primaryTarget = baseState.combatants.get(primaryTargetId);
    if (primaryTarget === undefined) {
      throw new Error("Expected primary target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(primaryTargetId, {
        ...primaryTarget,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state }),
        wizardId,
        spellSlotInvocationRef("ice_knife", 2, "attackBurstSaveDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 20 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Spell damage (2d10-piercing)",
    });
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[5, 5]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Spell primary-target-origin Emanation Saving Throw outcomes",
      ability: "dex",
    });
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId, secondSkeletonId],
        },
        outcomes: [
          { targetId: primaryTargetId, succeeded: false },
          { targetId: secondSkeletonId, succeeded: true },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    expect(burstDamage).toMatchObject({
      label: "Spell burst damage (3d6-cold)",
    });

    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[2, 2, 2]]);
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: primaryTargetId,
      dc: 10,
      damageAmount: 16,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: primaryTargetId, hp: 14, concentrating: false },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Ice Knife attack damage requests zero-HP replacement disposition before the burst save", () => {
    const primaryTargetId = combatantId("ice-knife-attack-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife-attack-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          currentHp: 3,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unit: unitLibrary.requireUnit("orc_relentless_endurance"),
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife attack damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          procedureRef: requireCharacterUnitProcedureRefForTest(
            battleRuntimeSessionForTest({ ...session, state }),
            primaryTargetId,
            "orc_relentless_endurance",
          ),
        },
      ]),
    });

    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            procedureRef: requireCharacterUnitProcedureRefForTest(
              battleRuntimeSessionForTest({ ...session, state }),
              primaryTargetId,
              "orc_relentless_endurance",
            ),
          }),
        ],
      }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            procedureRef: requireCharacterUnitProcedureRefForTest(
              battleRuntimeSessionForTest({ ...session, state }),
              primaryTargetId,
              "orc_relentless_endurance",
            ),
          }),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: true }],
            },
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife burst damage requests a separate zero-HP replacement disposition for the primary target", () => {
    const primaryTargetId = combatantId("ice-knife-burst-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife-burst-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          currentHp: 5,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unit: unitLibrary.requireUnit("orc_relentless_endurance"),
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId],
        },
        outcomes: [{ targetId: primaryTargetId, succeeded: false }],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[1, 1]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife burst damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          procedureRef: requireCharacterUnitProcedureRefForTest(
            battleRuntimeSessionForTest({ ...session, state }),
            primaryTargetId,
            "orc_relentless_endurance",
          ),
        },
      ]),
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            procedureRef: requireCharacterUnitProcedureRefForTest(
              battleRuntimeSessionForTest({ ...session, state }),
              primaryTargetId,
              "orc_relentless_endurance",
            ),
          }),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife miss still requires a primary-target-anchored burst save", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const invalidAttackDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "rolledDice",
          holeId: savingThrows.holeId,
          value: rolledDiceGroups([[1]]),
        },
      ],
    });
    expect(invalidAttackDamage).toMatchObject({
      tag: "invalid",
      message: "Ice Knife damage must use an Ice Knife damage hole.",
    });
    const missingPrimary = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: skeletonId,
              affectedTargetIds: [],
            },
            outcomes: [],
          },
        },
      ],
    });
    expect(missingPrimary).toMatchObject({
      tag: "invalid",
      message: "Ice Knife burst area must include the primary target.",
    });

    const wrongOrigin = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [skeletonId],
            },
            outcomes: [{ targetId: skeletonId, succeeded: false }],
          },
        },
      ],
    });
    expect(wrongOrigin).toMatchObject({
      tag: "invalid",
      message: "Ice Knife burst area must originate from the primary target.",
    });
  });

  test("Ice Knife burst damage requests Concentration follow-up for damaged burst targets", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ice-knife-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Concentrating Target",
          initiative: 8,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const concentrating = session.state.combatants.get(secondWizardId);
    if (concentrating === undefined) {
      throw new Error("Expected concentrating target.");
    }
    const state = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(secondWizardId, {
        ...concentrating,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: skeletonId,
          affectedTargetIds: [skeletonId, secondWizardId],
        },
        outcomes: [
          { targetId: skeletonId, succeeded: true },
          { targetId: secondWizardId, succeeded: false },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, saveFill],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        saveFill,
        damageRollFillWithGroups(burstDamage, [[3, 3]]),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: secondWizardId,
      dc: 10,
      damageAmount: 6,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          saveFill,
          damageRollFillWithGroups(burstDamage, [[3, 3]]),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );
    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondWizardId, hp: 14, concentrating: false },
        ],
      },
    });
  });
});
