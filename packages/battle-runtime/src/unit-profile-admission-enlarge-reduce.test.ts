import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  battleActSpellPresentation,
  battleActSpellSlotPresentation,
} from "./battle-act-composition.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME enlarge_reduce
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE sorcerer_metamagic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  characterLevel,
  movementFeet,
  proficiencyBonus,
  proficiencyBonusForCharacterLevel,
  resourceCount,
} from "@dnd/shared/types";
import type { Size } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import { INITIAL_TURN_RESOURCES } from "./battle-reducer/battle-runtime-protocol.ts";
import { concentrationSavingThrowHole } from "./battle-reducer/damage-apply.ts";
import { combatantEffectiveSize } from "./battle-reducer/druid-wild-shape.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import {
  EXTENDED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
} from "./battle-reducer/metamagic.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicOptionFact,
} from "./character-battle-resources.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleFill,
  type BattleInterruptProcedureChoice,
} from "./index.ts";
import {
  enlargeReduceUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
  type ActionSpellAct,
  type BonusActionSpellAct,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  interruptDecisionFill,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { decodeSpellRecordForTest } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
  type BattleRuntimeSession,
  type BattleState,
  type SpellMarkedDamageRider,
} from "./unit-profile-admission.test-support.ts";

function creatureSizeAct(
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): {
  readonly session: ReturnType<typeof spellBattle>;
  readonly act: ActionSpellAct;
} {
  const spell = spellRecord(enlargeReduceUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  return { session, act: creatureSizeActInSession(session, procedure) };
}

function creatureSizeActInSession(
  session: ReturnType<typeof spellBattle>,
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        enlargeReduceUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure === procedure,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${procedure} spell act.`);
  }
  return act;
}

function extendedCreatureSizeAct(
  procedure: "creatureSizeIncrease" | "creatureSizeDecrease",
): {
  readonly session: ReturnType<typeof spellBattle>;
  readonly act: ActionSpellAct;
} {
  const spell = spellRecord(enlargeReduceUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "sorcerer", level: 2 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(2),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [extendedMetamagicOption()],
    },
  });
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        enlargeReduceUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        procedure &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected Extended ${procedure} spell act.`);
  }
  return { session, act };
}

function quickenedCreatureSizeAct(input?: {
  readonly targetCanCounterspell?: true;
  readonly castSlotLevel?: 2 | 4;
  readonly procedure?: "creatureSizeIncrease" | "creatureSizeDecrease";
}): {
  readonly session: ReturnType<typeof spellBattle>;
  readonly act: BonusActionSpellAct;
} {
  const spell = spellRecord(enlargeReduceUnitId);
  const castSlotLevel = input?.castSlotLevel ?? 2;
  const casterLevel = castSlotLevel === 4 ? 7 : 3;
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: castSlotLevel, count: 1 }],
    casterClassLevels: [{ className: "sorcerer", level: casterLevel }],
    casterProficiencyBonus: proficiencyBonusForCharacterLevel(
      characterLevel(casterLevel),
    ),
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(2),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [quickenedMetamagicOption()],
    },
    ...(input?.targetCanCounterspell === true
      ? {
          targetSpellcasting: {
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "wizard",
              abilityModifier: abilityModifier(3),
            },
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [spellRecord("counterspell")],
            featurePreparedSpells: [],
            spellAccesses: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          },
        }
      : {}),
  });
  const act = discoverBattleActs(session).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        enlargeReduceUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        (input?.procedure ?? "creatureSizeIncrease") &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(
      `Expected Quickened ${input?.procedure ?? "creatureSizeIncrease"} spell act.`,
    );
  }
  return { session, act };
}

describe("L12G deterministic Enlarge/Reduce creature admission", () => {
  test("rejects synthetic near-misses at the creature size-change admission boundary", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    if (spell.mechanics.family !== "activation") {
      throw new Error("Expected creature size-change activation mechanics.");
    }
    const phase = spell.mechanics.phases[0];
    if (
      phase?.kind !== "save_gate" ||
      phase.onFail.kind !== "choose_effect_mode" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target" ||
      !("objectFilter" in phase.attachment.value.selection)
    ) {
      throw new Error("Expected creature size-change save-gate mechanics.");
    }
    const firstMode = phase.onFail.options[0];
    if (firstMode === undefined) {
      throw new Error("Expected a creature size-change effect mode.");
    }
    const syntheticSpells = [
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_size_change_extra_phase",
        name: "Synthetic Size Change Extra Phase",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-size-change-extra-phase",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [phase, phase],
        },
      }),
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_size_change_target_contract",
        name: "Synthetic Size Change Target Contract",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-size-change-target-contract",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [
            {
              ...phase,
              attachment: {
                ...phase.attachment,
                value: {
                  ...phase.attachment.value,
                  selection: {
                    ...phase.attachment.value.selection,
                    objectFilter: {
                      ...phase.attachment.value.selection.objectFilter,
                      targetRelation: "loose",
                    },
                  },
                },
              },
            },
          ],
        },
      }),
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_size_change_incomplete_mode",
        name: "Synthetic Size Change Incomplete Mode",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-size-change-incomplete-mode",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [
            {
              ...phase,
              onFail: {
                ...phase.onFail,
                options: [
                  {
                    ...firstMode,
                    effects: firstMode.effects.map((effect) =>
                      effect.kind === "modify_damage_numeric"
                        ? {
                            ...effect,
                            delta: {
                              ...effect.delta,
                              dieSize: 6,
                            },
                          }
                        : effect,
                    ),
                  },
                ],
              },
            },
          ],
        },
      }),
    ];

    for (const unsupported of syntheticSpells) {
      const session = spellBattle({
        preparedSpells: [unsupported],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });
      expect(
        discoverBattleActs(session).some((candidate) => {
          const invocation = battleActSpellPresentation(candidate)?.invocation;
          return (
            invocation?.procedure === "creatureSizeIncrease" ||
            invocation?.procedure === "creatureSizeDecrease"
          );
        }),
      ).toBe(false);
    }
  });

  test("Quickened Enlarge spends the Bonus Action, Spell Slot, and shared Sorcery Points without spending the Magic Action", () => {
    const { session, act } = quickenedCreatureSizeAct();
    const target = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Quickened Enlarge cast to resolve.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({ kind: "committed", combatantId: spellCasterId });
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(spellCasterId);
    expect(sorceryPointsRemaining(resolved.state)).toBe(0);
    expect(
      combatantEffectiveSize(requireCombatant(resolved.state, spellTargetId)),
    ).toBe("large");
  });

  test("Quickened Reduce uses the Bonus Action spell route and applies the willing target's size decrease", () => {
    const { session, act } = quickenedCreatureSizeAct({
      procedure: "creatureSizeDecrease",
    });
    const target = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Quickened Reduce cast to resolve.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      combatantEffectiveSize(requireCombatant(resolved.state, spellTargetId)),
    ).toBe("small");
  });

  test("countered Quickened Enlarge spends its Bonus Action and Sorcery Points and records the same-turn governor without expending its Spell Slot", () => {
    const { session, act } = quickenedCreatureSizeAct({
      targetCanCounterspell: true,
    });
    const castingSession = withExistingCreatureSizeConcentration(session);
    const target = requireHole(act.initialHoles, "targetChoice");
    const awaitingCounterspell = resolveBattleSubject({
      state: castingSession.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        spellCastReactionFactsFill([
          counterspellTriggerFact(castingSession, spellTargetId, spellCasterId),
        ]),
      ],
    });
    expect(awaitingCounterspell).toMatchObject({ tag: "needsHoles" });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Quickened Enlarge Counterspell window.");
    }
    expect(
      requireCombatant(awaitingCounterspell.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      sizeChangeEffects(awaitingCounterspell.state, spellCasterId),
    ).toEqual([]);
    const choice = requireCounterspellChoice(
      awaitingCounterspell,
      battleRuntimeSessionWithState(castingSession, awaitingCounterspell.state),
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const countered = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellTargetId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellCasterId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });

    expect(countered).toMatchObject({ tag: "resolved" });
    if (countered.tag !== "resolved") {
      throw new Error("Expected Counterspell to end Quickened Enlarge.");
    }
    expect(countered.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(countered.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      countered.state.currentTurnResources.spellSlotUsesThisTurn,
    ).not.toContainEqual({ kind: "committed", combatantId: spellCasterId });
    expect(
      countered.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({ kind: "committed", combatantId: spellTargetId });
    expect(
      countered.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toContain(spellCasterId);
    expect(sorceryPointsRemaining(countered.state)).toBe(0);
    expect(
      combatantEffectiveSize(requireCombatant(countered.state, spellTargetId)),
    ).toBe("medium");
  });

  test("declining Counterspell replays Quickened Enlarge and commits its resources once", () => {
    const { session, act } = quickenedCreatureSizeAct({
      targetCanCounterspell: true,
    });
    const target = requireHole(act.initialHoles, "targetChoice");
    const awaitingCounterspell = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        spellCastReactionFactsFill([
          counterspellTriggerFact(session, spellTargetId, spellCasterId),
        ]),
      ],
    });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Quickened Enlarge Counterspell window.");
    }
    const resolved = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        { kind: "decline", responderId: spellTargetId },
      ),
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected declined Counterspell replay to resolve.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({ kind: "committed", combatantId: spellCasterId });
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toEqual([spellCasterId]);
    expect(sorceryPointsRemaining(resolved.state)).toBe(0);
    expect(
      combatantEffectiveSize(requireCombatant(resolved.state, spellTargetId)),
    ).toBe("large");
  });

  test("a failed lower-level Counterspell replays Quickened Enlarge with its rewrite and Metamagic commitment", () => {
    const { session, act } = quickenedCreatureSizeAct({
      targetCanCounterspell: true,
      castSlotLevel: 4,
    });
    const target = requireHole(act.initialHoles, "targetChoice");
    const awaitingCounterspell = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        spellCastReactionFactsFill([
          counterspellTriggerFact(session, spellTargetId, spellCasterId),
        ]),
      ],
    });
    if (awaitingCounterspell.tag !== "needsHoles") {
      throw new Error("Expected Quickened Enlarge Counterspell window.");
    }
    const choice = requireCounterspellChoice(
      awaitingCounterspell,
      battleRuntimeSessionWithState(session, awaitingCounterspell.state),
    );
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellTargetId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellCasterId, succeeded: true },
              ]),
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected failed Counterspell replay to resolve.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      true,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({ kind: "committed", combatantId: spellCasterId });
    expect(
      resolved.state.currentTurnResources
        .quickenedLevelOnePlusSpellCastsThisTurn,
    ).toEqual([spellCasterId]);
    expect(sorceryPointsRemaining(resolved.state)).toBe(0);
    expect(
      combatantEffectiveSize(requireCombatant(resolved.state, spellTargetId)),
    ).toBe("large");
  });

  test("admits only creature size increase and decrease spell-slot acts from the creature-or-object Surface target", () => {
    const { session } = creatureSizeAct("creatureSizeIncrease");
    const procedures = discoverBattleActs(session).flatMap((act) => {
      const presentation = battleActSpellSlotPresentation(act);
      return act.subject.tag === "actionSpell" &&
        presentation?.invocation.spellId === enlargeReduceUnitId
        ? [presentation.invocation.procedure]
        : [];
    });

    expect(procedures).toEqual([
      "creatureSizeIncrease",
      "creatureSizeDecrease",
    ]);
    expect(
      procedures.map((procedure) =>
        spellSlotInvocationRef(enlargeReduceUnitId, 2, procedure),
      ),
    ).toEqual([
      {
        tag: "spellSlot",
        spellId: enlargeReduceUnitId,
        slotLevel: 2,
        procedure: "creatureSizeIncrease",
        source: { tag: "classSpellcasting" },
      },
      {
        tag: "spellSlot",
        spellId: enlargeReduceUnitId,
        slotLevel: 2,
        procedure: "creatureSizeDecrease",
        source: { tag: "classSpellcasting" },
      },
    ]);
  });

  test("willing size increase applies size and Strength roll-mode projections", () => {
    const { session, act } = creatureSizeAct("creatureSizeIncrease");
    const state = session.state;
    const target = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enlarge creature cast to resolve.");
    }
    const targetState = requireCombatant(resolved.state, spellTargetId);
    expect(targetState.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "increase",
      }),
    );
    expect(combatantEffectiveSize(targetState)).toBe("large");
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "str"),
    ).toBe("advantage");
    expect(
      savingThrowRollModeProjections(resolved.state, "str"),
    ).toContainEqual({ targetId: spellTargetId, rollMode: "advantage" });
  });

  test("unwilling size decrease is gated by Constitution save and records reduce floor", () => {
    const { session, act } = creatureSizeAct("creatureSizeDecrease");
    const state = session.state;
    const target = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");

    const succeeded = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(succeeded).toMatchObject({ tag: "resolved" });
    if (succeeded.tag !== "resolved") {
      throw new Error("Expected successful Reduce save to resolve.");
    }
    expect(
      requireCombatant(succeeded.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(succeeded.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Reduce creature cast to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
      }),
    );
  });

  test("rejects saving-throw outcomes that contradict the selected willingness facts", () => {
    const { session, act } = creatureSizeAct("creatureSizeIncrease");
    const state = session.state;
    const target = requireHole(act.initialHoles, "targetChoice");
    const unwillingTarget = spellTargetFill(
      target,
      enlargeReduceUnitId,
      spellCasterId,
      spellTargetId,
    );
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [unwillingTarget],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");

    const willingWithSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(willingWithSave).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Willing creature size-change targets do not make a Saving Throw.",
    });

    const wrongUnwillingSaveTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        unwillingTarget,
        savingThrowOutcomeFill(save, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    expect(wrongUnwillingSaveTarget).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("opposite-mode recast replaces the prior creature size-change effect", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const state = session.state;
    const enlargeAct = creatureSizeActInSession(
      session,
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }
    const enlargedCaster = requireCombatant(enlarged.state, spellCasterId);
    const enlargedEffect = sizeChangeEffects(enlarged.state, spellCasterId)[0];
    expect(enlargedEffect).toHaveProperty("effectRef");

    const recastReady = {
      ...enlarged.state,
      currentTurnResources: INITIAL_TURN_RESOURCES,
    };
    const reduceAct = creatureSizeActInSession(
      battleRuntimeSessionForTest({
        state: recastReady,
        context: session.context,
      }),
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce recast to resolve.");
    }
    const reducedCaster = requireCombatant(reduced.state, spellCasterId);
    const reducedEffect = sizeChangeEffects(reduced.state, spellCasterId)[0];
    expect(reducedEffect).toHaveProperty("effectRef");
    const enlargedEffectRef =
      enlargedEffect !== undefined && "effectRef" in enlargedEffect
        ? enlargedEffect.effectRef
        : undefined;
    const reducedEffectRef =
      reducedEffect !== undefined && "effectRef" in reducedEffect
        ? reducedEffect.effectRef
        : undefined;
    expect(reducedEffectRef).not.toBe(enlargedEffectRef);
    expect(Number(reducedCaster.nextEffectOrdinal)).toBe(
      Number(enlargedCaster.nextEffectOrdinal) + 1,
    );
    expect(sizeChangeEffects(reduced.state, spellCasterId)).toEqual([
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
      }),
    ]);
    expect(
      combatantEffectiveSize(requireCombatant(reduced.state, spellCasterId)),
    ).toBe("small");
    expect(
      savingThrowRollModeProjections(reduced.state, "str").filter(
        (projection) => projection.targetId === spellCasterId,
      ),
    ).toEqual([{ targetId: spellCasterId, rollMode: "disadvantage" }]);
  });

  test("creature size projection stays within the SRD Size category bounds", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const reduceReady = withCombatantSize(state, spellTargetId, "tiny");
    const reduceAct = creatureSizeActInSession(
      battleRuntimeSessionForTest({
        state: reduceReady,
        context: session.context,
      }),
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: reduceReady,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Tiny Reduce cast to resolve.");
    }
    expect(
      combatantEffectiveSize(requireCombatant(reduced.state, spellTargetId)),
    ).toBe("tiny");

    const enlargeReady = withCombatantSize(state, spellTargetId, "gargantuan");
    const enlargeAct = creatureSizeActInSession(
      battleRuntimeSessionForTest({
        state: enlargeReady,
        context: session.context,
      }),
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state: enlargeReady,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Gargantuan Enlarge cast to resolve.");
    }
    expect(
      combatantEffectiveSize(requireCombatant(enlarged.state, spellTargetId)),
    ).toBe("gargantuan");
  });

  test("successful unwilling save still ends prior Concentration spell", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const state = session.state;
    const enlargeAct = creatureSizeActInSession(
      session,
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }

    const recastReady = {
      ...enlarged.state,
      currentTurnResources: INITIAL_TURN_RESOURCES,
    };
    const reduceAct = creatureSizeActInSession(
      battleRuntimeSessionForTest({
        state: recastReady,
        context: session.context,
      }),
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        spellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    const save = requireResultHole(needsSave, "savingThrowOutcome");
    const saved = resolveBattleSubject({
      state: recastReady,
      subject: reduceAct.subject,
      fills: [
        spellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(saved).toMatchObject({ tag: "resolved" });
    if (saved.tag !== "resolved") {
      throw new Error("Expected successful Reduce save to resolve.");
    }
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(sizeChangeEffects(saved.state, spellCasterId)).toEqual([]);
    expect(sizeChangeEffects(saved.state, spellTargetId)).toEqual([]);
  });

  test("size change adjusts affected weapon and Unarmed Strike hit damage", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state = session.state;

    const enlargeAct = creatureSizeActInSession(
      session,
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected Enlarge self cast to resolve.");
    }

    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...enlarged.state,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[4], [3]],
      ),
    ).toBe(5);
    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...enlarged.state,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Unarmed Strike",
        [[3]],
      ),
    ).toBe(8);

    const reduceAct = creatureSizeActInSession(session, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...reduced.state,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[1], [4]],
      ),
    ).toBe(11);
    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...reduced.state,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Unarmed Strike",
        [[4]],
      ),
    ).toBe(11);
  });

  test("Reduce damage floor applies before target resistance", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state = session.state;
    const reduceAct = creatureSizeActInSession(session, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    const withRider = withSyntheticHitRider(reduced.state, false);
    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...withRider,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[1], [3], [4]],
      ),
    ).toBe(11);

    const resisted = withSyntheticHitRider(reduced.state, true);
    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...resisted,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[1], [3], [4]],
      ),
    ).toBe(12);
  });

  test("Reduce raises a negative-modifier weapon hit to its one-damage floor", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const baseAttack = zeroAbilityWeaponAttack("weapon_longsword");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: {
        ...baseAttack,
        abilityModifier: abilityModifier(-5),
        damageAbilityModifier: abilityModifier(-5),
      },
    });
    const reduceAct = creatureSizeActInSession(session, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: session.state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...reduced.state,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[1], [4]],
        { total: 15, naturalD20: 18 },
      ),
    ).toBe(11);
  });

  test("Reduce subtracts from total attack-hit damage including marked riders", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state = session.state;
    const reduceAct = creatureSizeActInSession(session, "creatureSizeDecrease");
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected Reduce self cast to resolve.");
    }

    const withMarkedRider = withSyntheticMarkedDamageRider(reduced.state);
    expect(
      resolveAttackHitHp(
        battleRuntimeSessionForTest({
          state: {
            ...withMarkedRider,
            currentTurnResources: INITIAL_TURN_RESOURCES,
          },
          context: session.context,
        }),
        "Longsword",
        [[1], [4], [6]],
      ),
    ).toBe(9);
  });

  test("replacing another caster's size-change effect clears stale concentration", () => {
    const spell = spellRecord(enlargeReduceUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetPreparedSpells: [spell],
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spell],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const state = session.state;
    const enlargeAct = creatureSizeActInSession(
      session,
      "creatureSizeIncrease",
    );
    const enlargeTarget = requireHole(enlargeAct.initialHoles, "targetChoice");
    const enlarged = resolveBattleSubject({
      state,
      subject: enlargeAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          enlargeTarget,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(enlarged).toMatchObject({ tag: "resolved" });
    if (enlarged.tag !== "resolved") {
      throw new Error("Expected caster Enlarge to resolve.");
    }
    expect(
      requireCombatant(enlarged.state, spellCasterId).concentration,
    ).not.toBeNull();

    const targetTurn = resolveBattleSubject({
      state: enlarged.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }

    const reduceAct = creatureSizeActInSession(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      "creatureSizeDecrease",
    );
    const reduceTarget = requireHole(reduceAct.initialHoles, "targetChoice");
    const reduced = resolveBattleSubject({
      state: targetTurn.state,
      subject: reduceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          reduceTarget,
          enlargeReduceUnitId,
          spellTargetId,
          spellTargetId,
        ),
      ],
    });
    expect(reduced).toMatchObject({ tag: "resolved" });
    if (reduced.tag !== "resolved") {
      throw new Error("Expected target Reduce to resolve.");
    }

    expect(
      requireCombatant(reduced.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(reduced.state, spellTargetId).concentration,
    ).not.toBeNull();
    expect(sizeChangeEffects(reduced.state, spellTargetId)).toEqual([
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "decrease",
        sourceCombatantId: spellTargetId,
      }),
    ]);
  });

  test("size change cleans up on Concentration break and duration expiry", () => {
    const { session, act } = creatureSizeAct("creatureSizeIncrease");
    const state = session.state;
    const target = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enlarge creature cast to resolve.");
    }

    const broken = breakBattleConcentration(resolved.state, spellCasterId);
    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(broken, spellTargetId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );

    const targetState = requireCombatant(resolved.state, spellTargetId);
    const nearlyExpired: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(spellTargetId, {
        ...targetState,
        activeEffects: targetState.activeEffects.map((effect) =>
          effect.kind === "spellCreatureSizeChange" &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpired);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(expired, spellTargetId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatureSizeChange" }),
      ]),
    );
  });

  test("Extended Spell doubles creature size-change duration and projects Concentration save Advantage", () => {
    const { session, act } = extendedCreatureSizeAct("creatureSizeIncrease");
    const state = session.state;
    const target = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          enlargeReduceUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Extended Enlarge self cast to resolve.");
    }
    expect(sorceryPointsRemaining(resolved.state)).toBe(1);
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toMatchObject({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
      maintenanceSavingThrowRollMode: "advantage",
    });
    expect(sizeChangeEffects(resolved.state, spellCasterId)).toEqual([
      expect.objectContaining({
        kind: "spellCreatureSizeChange",
        direction: "increase",
        expiresAt: expect.objectContaining({
          kind: "concentration",
          durationTicks: elapsedTimeTicks(20),
        }),
      }),
    ]);
    expect(concentrationSavingThrowHole(caster, 4)?.rollMode).toBe("advantage");

    const nearlyExpired = withSizeChangeDurationTicks(
      resolved.state,
      spellCasterId,
      1,
    );
    const expired = advanceToNextCasterTurn(nearlyExpired);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(sizeChangeEffects(expired, spellCasterId)).toEqual([]);
  });
});

function resolveAttackHitHp(
  session: BattleRuntimeSession,
  attackName: "Longsword" | "Unarmed Strike",
  damageRolls: readonly (readonly number[])[],
  attackRollValue?: { readonly total: number; readonly naturalD20: number },
): number {
  const state = session.state;
  const subject = weaponAttackSubject(session, attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(
    roll,
    attackRollValue ?? {
      total: 15,
      naturalD20: 15 - Number(roll.attackBonus),
    },
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      rollFill,
      damageRollFillWithGroups(damage, damageRolls),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Longsword hit to resolve.");
  }
  return requireCombatant(resolved.state, spellTargetId).hp;
}

function withSyntheticHitRider(
  state: BattleState,
  targetResistsDamage: boolean,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const target = requireCombatant(state, spellTargetId);
  const duration = {
    kind: "duration" as const,
    durationTicks: elapsedTimeTicks(600),
  };
  return {
    ...state,
    combatants: new Map(state.combatants)
      .set(spellCasterId, {
        ...caster,
        activeEffects: [
          ...caster.activeEffects,
          {
            kind: "spellWeaponDamageRider" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("synthetic_reduce_floor_rider"),
            ),
            sourceCombatantId: spellCasterId,
            damage: {
              expr: { dice: 1, dieSize: 4 },
              damageType: "radiant" as const,
            },
            expiresAt: duration,
          },
        ],
      })
      .set(spellTargetId, {
        ...target,
        activeEffects: targetResistsDamage
          ? [
              ...target.activeEffects,
              {
                kind: "damageResistance" as const,
                sourceProcedureRef: battleProcedureExecutionRefForTest(
                  String("synthetic_reduce_floor_resistance"),
                ),
                sourceCombatantId: spellTargetId,
                damageType: "slashing" as const,
                expiresAt: duration,
              },
              {
                kind: "damageResistance" as const,
                sourceProcedureRef: battleProcedureExecutionRefForTest(
                  String("synthetic_reduce_floor_resistance"),
                ),
                sourceCombatantId: spellTargetId,
                damageType: "radiant" as const,
                expiresAt: duration,
              },
            ]
          : target.activeEffects,
      }),
  };
}

function withSyntheticMarkedDamageRider(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const markedRider = {
    kind: "spellMarkedDamageRider",
    effectRef: battleEffectExecutionRefForTest("reduce-floor-mark"),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spellId("synthetic_reduce_floor_mark")),
    ),
    sourceCombatantId: spellCasterId,
    targetCombatantId: spellTargetId,
    transfer: {
      kind: "awaitingTargetDrop",
      retargetTiming: "sameTurn",
    },
    abilityCheckBehavior: { kind: "none" },
    damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
    },
  } satisfies SpellMarkedDamageRider;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [...caster.activeEffects, markedRider],
    }),
  };
}

function sizeChangeEffects(
  state: BattleState,
  combatantId: typeof spellCasterId | typeof spellTargetId,
) {
  return requireCombatant(state, combatantId).activeEffects.filter(
    (effect) => effect.kind === "spellCreatureSizeChange",
  );
}

function withCombatantSize(
  state: BattleState,
  combatantId: typeof spellCasterId | typeof spellTargetId,
  size: Size,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      size,
    }),
  };
}

function withSizeChangeDurationTicks(
  state: BattleState,
  combatantId: typeof spellCasterId | typeof spellTargetId,
  durationTicks: number,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      activeEffects: combatant.activeEffects.map((effect) =>
        effect.kind === "spellCreatureSizeChange" &&
        effect.expiresAt.kind === "concentration"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(durationTicks),
              },
            }
          : effect,
      ),
    }),
  };
}

function extendedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function quickenedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: QUICKENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function withExistingCreatureSizeConcentration(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const act = creatureSizeActInSession(session, "creatureSizeIncrease");
  const target = requireHole(act.initialHoles, "targetChoice");
  const priorCast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        target,
        enlargeReduceUnitId,
        spellCasterId,
        spellCasterId,
      ),
    ],
  });
  if (priorCast.tag !== "resolved") {
    throw new Error("Expected prior Enlarge concentration fixture to resolve.");
  }
  const caster = requireCombatant(session.state, spellCasterId);
  const priorCaster = requireCombatant(priorCast.state, spellCasterId);
  return battleRuntimeSessionWithState(session, {
    ...session.state,
    combatants: new Map(session.state.combatants).set(spellCasterId, {
      ...caster,
      concentration: priorCaster.concentration,
      activeEffects: priorCaster.activeEffects,
    }),
  });
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(
  session: BattleRuntimeSession,
  reactorId: typeof spellTargetId,
  casterId: typeof spellCasterId,
): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId,
    casterId,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      reactorId,
      spellSlotInvocationRef("counterspell", 3, "counterspell"),
    ),
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

function requireCounterspellChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  session: BattleRuntimeSession,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > => {
      if (
        candidate.kind !== "castTriggeredReactionSpell" ||
        candidate.reactorId !== spellTargetId
      ) {
        return false;
      }
      const invocation = characterSpellInvocationRefForProcedureRefForTest(
        session,
        candidate.reactorId,
        candidate.subject.procedureRef,
      );
      return (
        invocation.tag === "spellSlot" &&
        invocation.spellId === "counterspell" &&
        invocation.procedure === "counterspell" &&
        Number(invocation.slotLevel) === 3
      );
    },
  );
  if (choice === undefined) {
    throw new Error("Expected Counterspell Reaction choice.");
  }
  return choice;
}

function sorceryPointsRemaining(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") return 0;
  const resourcePoolRef = caster.origin.metamagic?.sorceryPointResourcePoolRef;
  const resource = caster.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !characterBattleResourceIsPointPool(resource)) {
    return 0;
  }
  return Number(resource.pointsRemaining);
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const casterEnd = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endTurn",
    },
    fills: [],
  });
  if (casterEnd.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const targetEnd = resolveBattleSubject({
    state: casterEnd.state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "endTurn",
    },
    fills: [],
  });
  if (targetEnd.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return targetEnd.state;
}
