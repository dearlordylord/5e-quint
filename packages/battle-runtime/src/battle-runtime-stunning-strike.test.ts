// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.stunning-strike
import {
  characterLevel,
  classLevel,
  proficiencyBonusForCharacterLevel,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import type {
  BattleFill,
  BattleHole,
  BattleState,
} from "./battle-state-execution.ts";
import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { characterExecutionWithSpellInvocations } from "./character-execution-admission.ts";
import {
  battleStunningStrikeSupportForUnit,
  parseSupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  discoverBattleActCandidates,
  endTurn,
  fighterId,
  goblinId,
  hasCondition,
  monksFocusResource,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellRecord,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testLongswordAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  wizardSpellcasting,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

const STUNNING_STRIKE_MONK_CLASS_LEVEL = {
  className: "monk",
  level: classLevel(5),
} as const;
const STUNNING_STRIKE_SPELLCASTING_CLASS_LEVEL = {
  className: "wizard",
  level: classLevel(1),
} as const;

describe("battle runtime: Stunning Strike", () => {
  test("offers the parsed Unit Feature rider alongside available and unavailable spell bindings", () => {
    const availableSpellWindow = stunningStrikeHitWindow(
      stunningStrikeUnitFeatureBattle(),
    );
    const unavailableSpellWindow = stunningStrikeHitWindow(
      stateWithUnavailableSpellBindings(stunningStrikeUnitFeatureBattle()),
    );

    for (const window of [availableSpellWindow, unavailableSpellWindow]) {
      expect(window.decision).toMatchObject({
        kind: "unitFeatureDecision",
        label: "Stunning Strike",
        choices: ["attempt", "decline"],
      });
    }
  });

  test("failed save spends Focus and Stuns until the start of the Monk's next turn", () => {
    const window = stunningStrikeHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
        ],
      }),
      "savingThrowOutcome",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
          stunningStrikeSavingThrowFill(save, false),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    const actor = resolved.state.combatants.get(fighterId);

    if (target === undefined) {
      throw new Error("Expected Stunning Strike target.");
    }
    expect(hasCondition(target.conditions, "stunned")).toBe(true);
    expect(target?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureCondition",
          sourceProcedureRef: stunningStrikeProcedureRef(window.state),
          sourceCombatantId: fighterId,
          condition: "stunned",
          expiresAt: { kind: "startOfTurn", combatantId: fighterId },
        }),
      ]),
    );
    expect(
      actor?.origin.kind === "character" ? actor.origin.resources : [],
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourcePoolRef: stunningStrikeBinding(window.state).execution.spends
            .resourcePoolRef,
          usesRemaining: 1,
        }),
      ]),
    );
    expect(
      resolved.state.currentTurnResources.stunningStrikesUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        procedureRef: stunningStrikeProcedureRef(window.state),
      },
    ]);

    const goblinTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: fighterId }),
    ).state;
    const goblinTurnTarget = goblinTurn.combatants.get(goblinId);
    if (goblinTurnTarget === undefined) {
      throw new Error("Expected Stunning Strike target after Monk turn.");
    }
    expect(hasCondition(goblinTurnTarget.conditions, "stunned")).toBe(true);
    const monkTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    const monkTurnTarget = monkTurn.combatants.get(goblinId);
    if (monkTurnTarget === undefined) {
      throw new Error("Expected Stunning Strike target after target turn.");
    }
    expect(hasCondition(monkTurnTarget.conditions, "stunned")).toBe(false);
  });

  test("successful save halves Speed and gives the next attack roll against the target Advantage", () => {
    const window = stunningStrikeHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
        ],
      }),
      "savingThrowOutcome",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
          stunningStrikeSavingThrowFill(save, true),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);

    if (target === undefined) {
      throw new Error("Expected Stunning Strike target.");
    }
    expect(hasCondition(target.conditions, "stunned")).toBe(false);
    expect(effectiveWalkSpeed(resolved.state, target)).toBe(15);
    expect(requiredAttackRollMode(resolved.state, fighterId, goblinId)).toBe(
      "advantage",
    );
  });

  test("does not offer the rider after one Stunning Strike use in the same turn", () => {
    const state = stunningStrikeBattle();
    const usedState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        stunningStrikesUsedThisTurn: [
          {
            attackerId: fighterId,
            procedureRef: stunningStrikeProcedureRef(state),
          },
        ],
      },
    };
    const target = requireHole(
      resolveBattleSubject({
        state: usedState,
        subject: attackSubject(usedState),
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: usedState,
        subject: attackSubject(usedState),
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state: usedState,
      subject: attackSubject(usedState),
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
      ],
    });

    expect(result.tag).toBe("resolved");
  });

  test("does not offer the rider without an available Focus Point or on non-Monk weapon hits", () => {
    expect(
      resolveBattleSubjectAfterHit(
        stunningStrikeBattle({ focusUsesRemaining: 0 }),
      ).tag,
    ).toBe("resolved");
    const nonMonkWeaponResult = resolveBattleSubjectAfterHit(
      stunningStrikeBattle({ attack: testLongswordAttack() }),
    );

    expect(nonMonkWeaponResult.tag).toBe("needsHoles");
    if (nonMonkWeaponResult.tag === "needsHoles") {
      expect(nonMonkWeaponResult.holes[0]?.kind).not.toBe(
        "unitFeatureDecision",
      );
    }
  });
});

function stunningStrikeHitWindow(state = stunningStrikeBattle()): {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hitFills: readonly BattleFill[];
  readonly decision: BattleHole;
} {
  const subject = attackSubject(state);
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  const hitFills = [
    targetFill(target, goblinId),
    attackRollFill(roll, { total: 20, naturalD20: 15 }),
  ];
  const decision = requireHole(
    resolveBattleSubject({ state, subject, fills: hitFills }),
    "unitFeatureDecision",
  );
  return { state, subject, hitFills, decision };
}

function resolveBattleSubjectAfterHit(state: BattleState) {
  const subject = attackSubject(state);
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
    ],
  });
}

function stunningStrikeBattle(
  input: {
    readonly focusUsesRemaining?: number;
    readonly attack?: ReturnType<typeof testLongswordAttack> | null;
  } = {},
): BattleState {
  return stunningStrikeBattleWithAdmission({
    ...input,
    admission: {
      kind: "supportProfile",
      characterUnitRef: stunningStrikeUnitRef(),
    },
  });
}

function stunningStrikeUnitFeatureBattle(): BattleState {
  return stunningStrikeBattleWithAdmission({
    admission: {
      kind: "unitFeature",
      unitFeature: stunningStrikeUnitFeature(),
    },
    spellcasting: {
      classLevel: STUNNING_STRIKE_SPELLCASTING_CLASS_LEVEL,
      facts: {
        ...wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("magic_missile")],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        }),
        proficiencyBonus: proficiencyBonusForCharacterLevel(
          characterLevel(
            Number(STUNNING_STRIKE_MONK_CLASS_LEVEL.level) +
              Number(STUNNING_STRIKE_SPELLCASTING_CLASS_LEVEL.level),
          ),
        ),
      },
    },
  });
}

function stunningStrikeBattleWithAdmission(input: {
  readonly focusUsesRemaining?: number;
  readonly attack?: ReturnType<typeof testLongswordAttack> | null;
  readonly admission:
    | {
        readonly kind: "supportProfile";
        readonly characterUnitRef: ReturnType<typeof stunningStrikeUnitRef>;
      }
    | {
        readonly kind: "unitFeature";
        readonly unitFeature: ReturnType<typeof stunningStrikeUnitFeature>;
      };
  readonly spellcasting?: {
    readonly classLevel: typeof STUNNING_STRIKE_SPELLCASTING_CLASS_LEVEL;
    readonly facts: ReturnType<typeof wizardSpellcasting>;
  };
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-stunning-strike"),
    combatants: [
      characterSeed({
        displayName: "Stunning Strike Monk",
        initiative: 20,
        attack: input.attack ?? null,
        classLevels: [
          STUNNING_STRIKE_MONK_CLASS_LEVEL,
          ...(input.spellcasting === undefined
            ? []
            : [input.spellcasting.classLevel]),
        ],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({
          str: 16,
          dex: 16,
          int: 16,
          wis: 16,
        }),
        resources: [
          monksFocusResource({ usesRemaining: input.focusUsesRemaining ?? 2 }),
        ],
        ...(input.admission.kind === "supportProfile"
          ? { characterUnitRefs: [input.admission.characterUnitRef] }
          : { unitFeatures: [input.admission.unitFeature] }),
        ...(input.spellcasting === undefined
          ? {}
          : { spellcasting: input.spellcasting.facts }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function stunningStrikeUnitFeature() {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("monk_stunning_strike"),
    [STUNNING_STRIKE_MONK_CLASS_LEVEL],
  );
  if (profile?.kind !== "stunningStrike") {
    throw new Error("Expected parsed Stunning Strike Unit Feature.");
  }
  return profile;
}

function stateWithUnavailableSpellBindings(state: BattleState): BattleState {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Stunning Strike Monk character.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...actor,
      origin: {
        ...actor.origin,
        execution: characterExecutionWithSpellInvocations(
          actor.origin.execution,
          [],
        ),
      },
    }),
  };
}

function stunningStrikeUnitRef() {
  const unit = unitLibrary.requireUnit("monk_stunning_strike");
  const support = battleStunningStrikeSupportForUnit(unit);
  if (support === null) {
    throw new Error("Expected Stunning Strike support profile.");
  }
  return { unit, supportProfiles: [support] };
}

function attackSubject(state: BattleState): BattleSubject {
  const act = resolveAttackAct(state);
  return act.subject;
}

function resolveAttackAct(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack",
  );
  if (act === undefined) {
    throw new Error("Expected attack action.");
  }
  return act;
}

function stunningStrikeProcedureRef(state: BattleState) {
  return stunningStrikeBinding(state).procedureRef;
}

function stunningStrikeBinding(state: BattleState) {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Stunning Strike Monk character.");
  }
  const binding = actor.origin.execution.procedureBindings.find((candidate) => {
    const procedure = candidate.procedure;
    return (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "stunningStrike"
    );
  });
  const procedure = binding?.procedure;
  if (
    binding === undefined ||
    procedure === undefined ||
    (procedure.kind !== "unitFeature" &&
      procedure.kind !== "unitSupportProfile") ||
    typeof procedure.execution !== "object" ||
    procedure.execution.kind !== "stunningStrike"
  ) {
    throw new Error("Expected mechanical Stunning Strike procedure binding.");
  }
  return {
    procedureRef: binding.procedureRef,
    execution: procedure.execution.stunningStrike,
  };
}

function stunningStrikeSavingThrowFill(
  hole: BattleHole,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return savingThrowOutcomeFill(hole, [{ targetId: goblinId, succeeded }]);
}
