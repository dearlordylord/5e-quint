// KERNEL-COVERAGE: parity-witness CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import * as path from "node:path";

import {
  battleCreatureInitFromStatBlock as parseBattleCreatureInitFromStatBlock,
  battleActSpellPresentation,
  battleId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  characterSheetSpellSlots,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  type CharacterSheet,
} from "@dnd/character-sheet-runtime";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetBattleInit,
  settleCharacterSheetFromBattle,
} from "./index.ts";
import { battleProcedureExecutionRefForHole } from "./sdk-integration.test-support.ts";

function battleCreatureInitFromStatBlock(
  input: Parameters<typeof parseBattleCreatureInitFromStatBlock>[0],
) {
  return expectRight(parseBattleCreatureInitFromStatBlock(input));
}

type SheetDerivedOutcome =
  | "init"
  | "missing-wielded-weapon-rejected"
  | "missing-selected-spell-rejected"
  | "weapon-attack-capability-projected"
  | "resource-backed-spell-attack-capability-projected"
  | "early-spell-fill-rejected-without-spend"
  | "accepted-spell-invocation-spent-one-slot"
  | "stale-open-action-rejected-after-invocation"
  | "stale-spell-fill-rejected-without-second-spend"
  | "spell-slot-expenditure-settled"
  | "exhausted-slots-rejected-rediscovery";

const sheetDerivedOutcomeByVariant = {
  SheetDerivedBattleActsInit: "init",
  SheetDerivedMissingWieldedWeaponRejected: "missing-wielded-weapon-rejected",
  SheetDerivedMissingSelectedSpellRejected: "missing-selected-spell-rejected",
  SheetDerivedWeaponAttackCapabilityProjected:
    "weapon-attack-capability-projected",
  SheetDerivedResourceBackedSpellAttackCapabilityProjected:
    "resource-backed-spell-attack-capability-projected",
  SheetDerivedEarlySpellFillRejectedWithoutSpend:
    "early-spell-fill-rejected-without-spend",
  SheetDerivedAcceptedSpellInvocationSpentOneSlot:
    "accepted-spell-invocation-spent-one-slot",
  SheetDerivedStaleOpenActionRejectedAfterInvocation:
    "stale-open-action-rejected-after-invocation",
  SheetDerivedStaleSpellFillRejectedWithoutSecondSpend:
    "stale-spell-fill-rejected-without-second-spend",
  SheetDerivedSpellSlotExpenditureSettled: "spell-slot-expenditure-settled",
  SheetDerivedExhaustedSlotsRejectedRediscovery:
    "exhausted-slots-rejected-rediscovery",
} as const satisfies Readonly<Record<string, SheetDerivedOutcome>>;

type SheetDerivedFacts = {
  readonly wieldedWeaponFact: boolean;
  readonly preparedSpellAccessFact: boolean;
  readonly weaponAttackDiscovered: boolean;
  readonly spellAttackDiscovered: boolean;
  readonly manualSubjectProfileHandoff: boolean;
  readonly actionAvailable: boolean;
  readonly spellSlotActAvailable: boolean;
  readonly minimumLevelOrHigherSlotsRemaining: number;
  readonly acceptedInvocationCastLevel: number;
  readonly targetHp: number;
  readonly currentHpSettled: boolean;
  readonly spellSlotExpenditureSettled: boolean;
};

type SheetDerivedProjection = {
  readonly outcome: SheetDerivedOutcome;
  readonly accepted: boolean;
  readonly facts: SheetDerivedFacts;
  readonly replayIndex: number;
};

type SheetDerivedInitialBranch =
  | "happy-path"
  | "missing-wielded-weapon"
  | "missing-selected-spell";

type SheetDerivedSession = {
  readonly sheet: CharacterSheet;
  readonly battle: BattleRuntimeSession;
  readonly character: CharacterBattleCombatant;
};

type CharacterBattleCombatant = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

const driverSchema = {
  init: {},
  doProjectWeaponAttackCapability: {},
  doRejectMissingWieldedWeaponCapability: {},
  doRejectMissingSelectedSpellAttackCapability: {},
  doProjectResourceBackedSpellAttackCapability: {},
  doRejectEarlySpellFillWithoutSpend: {},
  doAcceptSpellInvocationAndSpendOneSlot: {},
  doRejectStaleOpenActionAfterInvocation: {},
  doRejectStaleSpellFillWithoutSecondSpend: {},
  doSettleSpellSlotExpenditure: {},
  doRejectExhaustedSlotRediscovery: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Sheet-derived battle acts catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const characterCombatantId = combatantId("combatant:sheet-derived-caster");
const targetCombatantId = combatantId("combatant:sheet-derived-target");
const sheetDerivedBattleActsSpec = path.resolve(
  import.meta.dirname,
  "../character-session-sheet-derived-battle-acts.mbt.qnt",
);
const happyPathSeed = "1";
const missingSelectedSpellSeed = "3";
const missingWieldedWeaponSeed = "6";

const sheetDerivedStateCheck = stateCheck(
  normalizeSheetDerivedQuintState,
  compareSheetDerivedState,
);

describe("Character Session sheet-derived battle acts deterministic QNT replay", () => {
  it("replays sheet-derived weapon and spell battle acts through settlement", async () => {
    await run({
      spec: sheetDerivedBattleActsSpec,
      init: "init",
      step: "step",
      driver: createSheetDerivedBattleActsDriver({
        initialBranch: "happy-path",
      }),
      backend: "typescript",
      seed: happyPathSeed,
      nTraces: 1,
      maxSteps: 8,
      stateCheck: sheetDerivedStateCheck,
    });
  }, 120_000);

  it("replays missing wielded weapon rejection through the semantic branch", async () => {
    await run({
      spec: sheetDerivedBattleActsSpec,
      init: "init",
      step: "step",
      driver: createSheetDerivedBattleActsDriver({
        initialBranch: "missing-wielded-weapon",
      }),
      backend: "typescript",
      seed: missingWieldedWeaponSeed,
      nTraces: 1,
      maxSteps: 1,
      stateCheck: sheetDerivedStateCheck,
    });
  }, 120_000);

  it("replays missing selected spell rejection through the semantic branch", async () => {
    await run({
      spec: sheetDerivedBattleActsSpec,
      init: "init",
      step: "step",
      driver: createSheetDerivedBattleActsDriver({
        initialBranch: "missing-selected-spell",
      }),
      backend: "typescript",
      seed: missingSelectedSpellSeed,
      nTraces: 1,
      maxSteps: 1,
      stateCheck: sheetDerivedStateCheck,
    });
  }, 120_000);
});

function createSheetDerivedBattleActsDriver(input: {
  readonly initialBranch: SheetDerivedInitialBranch;
}) {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();
    let session: SheetDerivedSession | undefined;
    let spellSubject:
      | Extract<BattleSubject, { readonly tag: "actionSpell" }>
      | undefined;
    let acceptedSpellFills: readonly BattleFill[] = [];
    let acceptedState: BattleState | undefined;
    let settledSheet: CharacterSheet | undefined;

    function reset(): void {
      projection = initialProjection();
      session = undefined;
      spellSubject = undefined;
      acceptedSpellFills = [];
      acceptedState = undefined;
      settledSheet = undefined;
    }

    return {
      init: reset,
      doProjectWeaponAttackCapability: () => {
        expectInitialBranch(input.initialBranch, "happy-path");
        session = startSheetDerivedSession(sheetDerivedBuild());
        const missingWeapon = startSheetDerivedSession(
          sheetDerivedBuild({ wieldedWeapon: false }),
        );
        const missingSpell = startSheetDerivedSession(
          sheetDerivedBuild({ preparedSpell: false }),
        );
        expect(findWeaponAttackAct(missingWeapon.battle)).toBeUndefined();
        expect(findRayOfSicknessAct(missingSpell.battle)).toBeUndefined();
        const weaponAct = requireWeaponAttackAct(session.battle);
        expect(weaponAct.subject).toMatchObject({
          tag: "action",
          actorId: characterCombatantId,
          action: "attack",
          procedureRef: expect.any(String),
        });
        projection = {
          outcome: "weapon-attack-capability-projected",
          accepted: true,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
          },
          replayIndex: 1,
        };
      },
      doRejectMissingWieldedWeaponCapability: () => {
        expectInitialBranch(input.initialBranch, "missing-wielded-weapon");
        const missingWeapon = startSheetDerivedSession(
          sheetDerivedBuild({ wieldedWeapon: false }),
        );
        expect(findWeaponAttackAct(missingWeapon.battle)).toBeUndefined();
        projection = {
          outcome: "missing-wielded-weapon-rejected",
          accepted: false,
          facts: {
            ...initialFacts(),
            wieldedWeaponFact: false,
            weaponAttackDiscovered: false,
          },
          replayIndex: 8,
        };
      },
      doRejectMissingSelectedSpellAttackCapability: () => {
        expectInitialBranch(input.initialBranch, "missing-selected-spell");
        const missingSpell = startSheetDerivedSession(
          sheetDerivedBuild({ preparedSpell: false }),
        );
        expect(findRayOfSicknessAct(missingSpell.battle)).toBeUndefined();
        projection = {
          outcome: "missing-selected-spell-rejected",
          accepted: false,
          facts: {
            ...initialFacts(),
            preparedSpellAccessFact: false,
            spellAttackDiscovered: false,
          },
          replayIndex: 9,
        };
      },
      doProjectResourceBackedSpellAttackCapability: () => {
        const currentSession = requireSession(session);
        const act = requireRayOfSicknessAct(currentSession.battle);
        spellSubject = act.subject;
        expect(levelOneSlotsRemaining(currentSession.character)).toBe(2);
        projection = {
          outcome: "resource-backed-spell-attack-capability-projected",
          accepted: true,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
          },
          replayIndex: 2,
        };
      },
      doRejectEarlySpellFillWithoutSpend: () => {
        const currentSession = requireSession(session);
        const subject = requireSpellSubject(spellSubject);
        const targetHole = requireHole(
          resolveBattleSubject({
            state: currentSession.battle.state,
            subject,
            fills: [],
          }),
          "targetChoice",
        );
        const earlyFill = attackRollFill(
          { kind: "attackRoll", holeId: targetHole.holeId },
          { total: 20, naturalD20: 15 },
        );
        const result = resolveBattleSubject({
          state: currentSession.battle.state,
          subject,
          fills: [earlyFill],
        });
        expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
        expect(levelOneSlotsRemaining(currentSession.character)).toBe(2);
        projection = {
          outcome: "early-spell-fill-rejected-without-spend",
          accepted: false,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
            minimumLevelOrHigherSlotsRemaining: 2,
          },
          replayIndex: 3,
        };
      },
      doAcceptSpellInvocationAndSpendOneSlot: () => {
        const currentSession = requireSession(session);
        const subject = requireSpellSubject(spellSubject);
        const targetHole = requireHole(
          resolveBattleSubject({
            state: currentSession.battle.state,
            subject,
            fills: [],
          }),
          "targetChoice",
        );
        const targetChoice = targetFill(targetHole, targetCombatantId, [
          {
            kind: "spellTarget",
            casterId: characterCombatantId,
            targetId: targetCombatantId,
            sourceProcedureRef: battleProcedureExecutionRefForHole(targetHole),
          },
        ]);
        const attackHole = requireHole(
          resolveBattleSubject({
            state: currentSession.battle.state,
            subject,
            fills: [targetChoice],
          }),
          "attackRoll",
        );
        const attack = attackRollFill(attackHole, {
          total: 20,
          naturalD20: 15,
        });
        const damageHole = requireHole(
          resolveBattleSubject({
            state: currentSession.battle.state,
            subject,
            fills: [targetChoice, attack],
          }),
          "rolledDice",
        );
        const damage = damageRollFill(damageHole, [2, 2]);
        acceptedSpellFills = [targetChoice, attack, damage];
        const result = resolveBattleSubject({
          state: currentSession.battle.state,
          subject,
          fills: acceptedSpellFills,
        });
        expect(result).toMatchObject({
          tag: "resolved",
          snapshot: {
            combatants: [{ combatantId: characterCombatantId }, { hp: 9 }],
            turn: { actionResources: [] },
          },
        });
        const resolved = requireResolved(result);
        acceptedState = resolved;
        const acceptedCharacter = requireCharacterCombatant(resolved);
        expect(levelOneSlotsRemaining(acceptedCharacter)).toBe(1);
        projection = {
          outcome: "accepted-spell-invocation-spent-one-slot",
          accepted: true,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
            minimumLevelOrHigherSlotsRemaining: 1,
            acceptedInvocationCastLevel: 1,
            targetHp: 9,
            actionAvailable: false,
            spellSlotActAvailable: false,
          },
          replayIndex: 4,
        };
      },
      doRejectStaleOpenActionAfterInvocation: () => {
        const subject = requireSpellSubject(spellSubject);
        const state = requireAcceptedState(acceptedState);
        const result = resolveBattleSubject({
          state,
          subject,
          fills: [],
        });
        expect(result).toMatchObject({ tag: "invalid" });
        expect(levelOneSlotsRemaining(requireCharacterCombatant(state))).toBe(
          1,
        );
        projection = {
          outcome: "stale-open-action-rejected-after-invocation",
          accepted: false,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
            minimumLevelOrHigherSlotsRemaining: 1,
            acceptedInvocationCastLevel: 1,
            targetHp: 9,
            actionAvailable: false,
            spellSlotActAvailable: false,
          },
          replayIndex: 5,
        };
      },
      doRejectStaleSpellFillWithoutSecondSpend: () => {
        const subject = requireSpellSubject(spellSubject);
        const state = requireAcceptedState(acceptedState);
        const result = resolveBattleSubject({
          state,
          subject,
          fills: acceptedSpellFills,
        });
        expect(result).toMatchObject({ tag: "invalid" });
        expect(levelOneSlotsRemaining(requireCharacterCombatant(state))).toBe(
          1,
        );
        projection = {
          outcome: "stale-spell-fill-rejected-without-second-spend",
          accepted: false,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
            minimumLevelOrHigherSlotsRemaining: 1,
            acceptedInvocationCastLevel: 1,
            targetHp: 9,
            actionAvailable: false,
            spellSlotActAvailable: false,
          },
          replayIndex: 6,
        };
      },
      doSettleSpellSlotExpenditure: () => {
        const currentSession = requireSession(session);
        const state = requireAcceptedState(acceptedState);
        const character = requireCharacterCombatant(state);
        const settled = expectRight(
          settleCharacterSheetFromBattle({
            state,
            context: currentSession.battle.context,
            sheet: currentSession.sheet,
            unitLibrary,
            combatant: character,
          }),
        );
        settledSheet = settled;
        expect(characterSheetSpellSlots(settled)).toEqual([
          { spellLevel: 1, count: 2, expended: 1 },
        ]);
        projection = {
          outcome: "spell-slot-expenditure-settled",
          accepted: true,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: true,
            minimumLevelOrHigherSlotsRemaining: 1,
            acceptedInvocationCastLevel: 1,
            targetHp: 9,
            actionAvailable: false,
            spellSlotActAvailable: false,
            currentHpSettled: true,
            spellSlotExpenditureSettled: true,
          },
          replayIndex: 7,
        };
      },
      doRejectExhaustedSlotRediscovery: () => {
        const exhausted = startSheetDerivedSession(sheetDerivedBuild(), {
          levelOneSlotsExpended: 2,
        });
        expect(findRayOfSicknessAct(exhausted.battle)).toBeUndefined();
        expect(settledSheet).not.toBeUndefined();
        projection = {
          outcome: "exhausted-slots-rejected-rediscovery",
          accepted: false,
          facts: {
            ...initialFacts(),
            weaponAttackDiscovered: true,
            spellAttackDiscovered: false,
            minimumLevelOrHigherSlotsRemaining: 0,
            acceptedInvocationCastLevel: 1,
            targetHp: 9,
            actionAvailable: false,
            spellSlotActAvailable: false,
            currentHpSettled: true,
            spellSlotExpenditureSettled: true,
          },
          replayIndex: 8,
        };
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function expectInitialBranch(
  actual: SheetDerivedInitialBranch,
  expected: SheetDerivedInitialBranch,
): void {
  expect(actual).toBe(expected);
}

function initialFacts(): SheetDerivedFacts {
  return {
    wieldedWeaponFact: true,
    preparedSpellAccessFact: true,
    weaponAttackDiscovered: false,
    spellAttackDiscovered: false,
    manualSubjectProfileHandoff: false,
    actionAvailable: true,
    spellSlotActAvailable: true,
    minimumLevelOrHigherSlotsRemaining: 2,
    acceptedInvocationCastLevel: 0,
    targetHp: 13,
    currentHpSettled: false,
    spellSlotExpenditureSettled: false,
  };
}

function initialProjection(): SheetDerivedProjection {
  return {
    outcome: "init",
    accepted: false,
    facts: initialFacts(),
    replayIndex: 0,
  };
}

function startSheetDerivedSession(
  build: CharacterBuild,
  input?: { readonly levelOneSlotsExpended?: number },
): SheetDerivedSession {
  const levelOneSlotsExpended = input?.levelOneSlotsExpended ?? 0;
  const sheet = expectRight(
    createFreshCharacterSheetCore({
      characterId: characterSheetId("character:sheet-derived-caster"),
      build,
      currentHp: Hp(7),
      tempHp: Hp(0),
      conditions: [],
      hitPointMaximumReduction: Hp(0),
      spellSlotExpenditures:
        build.spellcasting === undefined
          ? []
          : [
              {
                spellLevel: spellSlotLevel(1),
                expended: resourceCount(levelOneSlotsExpended),
              },
            ],
      unitLibrary,
    }),
  );
  const characterInit = expectRight(
    characterSheetBattleInit({
      sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: characterCombatantId,
      displayName: "Sheet Derived Caster",
      initiative: initiativeScore(20),
    }),
  );
  const targetInit = battleCreatureInitFromRidingHorse();
  const battle = expectRight(
    startBattle({
      battleId: battleId("battle:sheet-derived-acts"),
      combatants: [characterInit, targetInit],
    }),
  );
  const character = requireCharacterCombatant(battle.state);
  const target = battle.state.combatants.get(targetCombatantId);
  if (target === undefined) {
    throw new Error("Expected target combatant in sheet-derived battle.");
  }
  return { sheet, battle, character };
}

function battleCreatureInitFromRidingHorse() {
  return battleCreatureInitFromStatBlock({
    combatantId: targetCombatantId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
    initiative: initiativeScore(10),
  });
}

function sheetDerivedBuild(input?: {
  readonly wieldedWeapon?: boolean;
  readonly preparedSpell?: boolean;
}): CharacterBuild {
  const daggerUnitId = expectRight(
    characterEquipmentItemUnitId(authoredUnitId("weapon_dagger")),
  );
  const daggerItemId = characterEquipmentItemId({
    slot: "main",
    unitId: daggerUnitId,
  });
  const wieldedWeapon = input?.wieldedWeapon ?? true;
  const preparedSpell = input?.preparedSpell ?? true;
  const build: CharacterBuild = {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_wizard")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: wieldedWeapon
        ? [{ itemId: daggerItemId, unitId: daggerUnitId }]
        : [],
      loadout: wieldedWeapon
        ? { weapon: { itemId: daggerItemId, grip: "one_handed" } }
        : {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_wizard"),
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: preparedSpell
            ? [authoredUnitId("ray_of_sickness")]
            : [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
  return build;
}

function findWeaponAttackAct(
  session: BattleRuntimeSession,
): AvailableBattleAct | undefined {
  return discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === characterCombatantId &&
      act.summary === "Take the Attack action with Dagger.",
  );
}

function requireWeaponAttackAct(
  session: BattleRuntimeSession,
): AvailableBattleAct {
  const act = findWeaponAttackAct(session);
  if (act === undefined) {
    throw new Error("Expected sheet-derived wielded weapon attack act.");
  }
  return act;
}

function findRayOfSicknessAct(session: BattleRuntimeSession):
  | (AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    })
  | undefined {
  return discoverBattleActs(session).find(
    (
      act,
    ): act is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    } =>
      act.subject.tag === "actionSpell" &&
      act.subject.actorId === characterCombatantId &&
      JSON.stringify(battleActSpellPresentation(act)?.invocation) ===
        JSON.stringify(
          spellSlotInvocationRef("ray_of_sickness", 1, "spellAttackDamage"),
        ) &&
      act.subject.mode.tag === "cast",
  );
}

function requireRayOfSicknessAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
} {
  const act = findRayOfSicknessAct(session);
  if (act === undefined) {
    throw new Error("Expected sheet-derived Ray of Sickness spell act.");
  }
  return act;
}

function levelOneSlotsRemaining(combatant: CharacterBattleCombatant): number {
  const spellcasting = requireCharacterSpellcasting(combatant);
  const slot = spellcasting.spellSlots.find(
    (candidate) => candidate.spellLevel === 1,
  );
  if (slot === undefined) return 0;
  return slot.count - slot.expended;
}

function requireCharacterSpellcasting(
  combatant: CharacterBattleCombatant,
): NonNullable<CharacterBattleCombatant["origin"]["spellcasting"]> {
  const spellcasting = combatant.origin.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Expected character spellcasting state.");
  }
  return spellcasting;
}

function requireCharacterCombatant(
  state: BattleState,
): CharacterBattleCombatant {
  const combatant = state.combatants.get(characterCombatantId);
  if (!isCharacterBattleCombatant(combatant)) {
    throw new Error("Expected character combatant.");
  }
  return combatant;
}

function isCharacterBattleCombatant(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCombatant {
  return combatant?.origin.kind === "character";
}

function requireSession(
  session: SheetDerivedSession | undefined,
): SheetDerivedSession {
  if (session === undefined) {
    throw new Error("Expected sheet-derived session.");
  }
  return session;
}

function requireSpellSubject(
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> | undefined,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  if (subject === undefined) {
    throw new Error("Expected discovered spell subject.");
  }
  return subject;
}

function requireAcceptedState(state: BattleState | undefined): BattleState {
  if (state === undefined) {
    throw new Error("Expected accepted spell invocation state.");
  }
  return state;
}

function requireResolved(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }
  return result.state;
}

function requireHole(
  result: BattleResolutionResult,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles battle result, got ${result.tag}.`);
  }
  const hole = result.holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function targetFill(
  hole: BattleHole,
  targetId: typeof targetCombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(spatialFacts === undefined ? {} : { spatialFacts }),
  };
}

function attackRollFill(
  hole: Pick<BattleHole, "kind" | "holeId">,
  value: { readonly total: number; readonly naturalD20: number },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFill(
  hole: Pick<BattleHole, "kind" | "holeId">,
  results: readonly [number, ...number[]],
): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  const [firstResult, ...restResults] = results;
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [
          DieRollResult(firstResult),
          ...restResults.map((result) => DieRollResult(result)),
        ],
      },
    ],
  };
}

function expectRight<A, E>(value: Either.Either<A, E>): A {
  if (Either.isLeft(value)) {
    throw new Error(`Expected Right, got ${JSON.stringify(value.left)}.`);
  }
  return value.right;
}

function normalizeSheetDerivedQuintState(raw: unknown): SheetDerivedProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  const outcomeTag = quintVariantTag(state.outcome);
  if (!isSheetDerivedOutcomeTag(outcomeTag)) {
    throw new Error(`Unexpected Quint sheet-derived outcome ${outcomeTag}.`);
  }
  const outcome = sheetDerivedOutcomeByVariant[outcomeTag];
  return {
    outcome,
    accepted: booleanField(state.accepted, "qState.accepted"),
    facts: normalizeFacts(state.facts),
    replayIndex: numberFromQuintInt(state.replayIndex, "qState.replayIndex"),
  };
}

function isSheetDerivedOutcomeTag(
  tag: string,
): tag is keyof typeof sheetDerivedOutcomeByVariant {
  return Object.hasOwn(sheetDerivedOutcomeByVariant, tag);
}

function normalizeFacts(raw: unknown): SheetDerivedFacts {
  const facts = recordField({ facts: raw }, "facts") as Record<
    keyof SheetDerivedFacts,
    unknown
  >;
  return {
    wieldedWeaponFact: booleanField(
      facts.wieldedWeaponFact,
      "facts.wieldedWeaponFact",
    ),
    preparedSpellAccessFact: booleanField(
      facts.preparedSpellAccessFact,
      "facts.preparedSpellAccessFact",
    ),
    weaponAttackDiscovered: booleanField(
      facts.weaponAttackDiscovered,
      "facts.weaponAttackDiscovered",
    ),
    spellAttackDiscovered: booleanField(
      facts.spellAttackDiscovered,
      "facts.spellAttackDiscovered",
    ),
    manualSubjectProfileHandoff: booleanField(
      facts.manualSubjectProfileHandoff,
      "facts.manualSubjectProfileHandoff",
    ),
    actionAvailable: booleanField(
      facts.actionAvailable,
      "facts.actionAvailable",
    ),
    spellSlotActAvailable: booleanField(
      facts.spellSlotActAvailable,
      "facts.spellSlotActAvailable",
    ),
    minimumLevelOrHigherSlotsRemaining: numberFromQuintInt(
      facts.minimumLevelOrHigherSlotsRemaining,
      "facts.minimumLevelOrHigherSlotsRemaining",
    ),
    acceptedInvocationCastLevel: numberFromQuintInt(
      facts.acceptedInvocationCastLevel,
      "facts.acceptedInvocationCastLevel",
    ),
    targetHp: numberFromQuintInt(facts.targetHp, "facts.targetHp"),
    currentHpSettled: booleanField(
      facts.currentHpSettled,
      "facts.currentHpSettled",
    ),
    spellSlotExpenditureSettled: booleanField(
      facts.spellSlotExpenditureSettled,
      "facts.spellSlotExpenditureSettled",
    ),
  };
}

function compareSheetDerivedState(
  spec: SheetDerivedProjection,
  impl: SheetDerivedProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function quintVariantTag(value: unknown): string {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object" && "tag" in value) {
    return String((value as { readonly tag: unknown }).tag);
  }
  throw new Error(`Expected Quint variant tag, got ${JSON.stringify(value)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint sheet-derived state object.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}
