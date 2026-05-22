// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-MYCELIUM-STEP mycelium_step
// UNIT-IDENTITY-MBT-REPLAY: L1D2-MYCELIUM-STEP mycelium_step doDiscoverMyceliumStepDash doDashAsBonusAction
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  battleUnitSupportProfilesForUnit,
  type BattleUnitSupportProfile,
  type ClassicNonSrdMechanicsUnit,
} from "./unit-feature-support.ts";

const myceliumStepSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverMyceliumStepDash: {},
  doDashAsBonusAction: {},
  step: {},
} as const;
type MyceliumStepSelectedIdentityDriverAction = Exclude<
  keyof typeof myceliumStepSelectedIdentityDriverSchema,
  "init" | "step"
>;
type MyceliumStepSelectedIdentityLastResult = "init" | "discovered" | "dashed";
type MyceliumStepSelectedIdentityProjection = {
  readonly bonusActionAvailable: boolean;
  readonly dashBonusFeet: number;
  readonly lastResult: MyceliumStepSelectedIdentityLastResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MyceliumStepSelectedIdentityDriverAction[];
  readonly expected: MyceliumStepSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-MYCELIUM-STEP";
  readonly unitId: typeof myceliumStepUnitId;
  readonly actions: readonly MyceliumStepSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
type MyceliumStepDashAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
};
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;

const myceliumStepUnitId = "mycelium_step";
const classicMechanicsProvenance = "classic-2024-mechanics-source-lane";
const myceliumStepSyntheticLabel = "Mycelium Step";
const actorId = combatantId("mycelium-step-selected-identity-actor");
const partySide = battleCombatantSide("party");
const selectedUnitRuntimeBoundaryIds = new Set<string>();
const myceliumStepUnit = mechanicsOnlyClassicUnit(myceliumStepInput);
const myceliumStepSupportProfile =
  requireMyceliumStepAlternateActionCostProfile(myceliumStepUnit);

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-MYCELIUM-STEP",
    unitId: "mycelium_step",
    actions: ["doDiscoverMyceliumStepDash", "doDashAsBonusAction"],
    sequences: [
      {
        name: "discovers-synthetic-unit-as-bonus-action-dash-source",
        actions: ["doDiscoverMyceliumStepDash"],
        expected: expectedProjection({
          lastResult: "discovered",
        }),
      },
      {
        name: "spends-bonus-action-for-dash-through-synthetic-unit",
        actions: ["doDashAsBonusAction"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          dashBonusFeet: 30,
          lastResult: "dashed",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Mycelium Step feature selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<MyceliumStepSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createMyceliumStepSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          resetSelectedUnitRuntimeBoundaryIds();
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Mycelium Step selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
          expect(
            selectedUnitRuntimeBoundaryIds.has(replay.unitId),
            `${replay.unitId}:${sequence.name}:${actionName} must bind its Unit id`,
          ).toBe(true);
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Mycelium Step selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Mycelium Step selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMyceliumStepSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: myceliumStepSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createMyceliumStepSelectedIdentityDriver() {
  return defineDriver(myceliumStepSelectedIdentityDriverSchema, () => {
    let projection = projectInitialBattle();

    function reset(): void {
      projection = projectInitialBattle();
    }

    return {
      init: reset,
      doDiscoverMyceliumStepDash: () => {
        const state = myceliumStepBattle();
        const act = myceliumStepDashAct(state);
        const selectedSourceUnitId = myceliumStepSourceUnitId(
          act.subject.sourceUnitId,
        );
        recordSelectedUnitRuntimeBoundaryId(selectedSourceUnitId);
        projection = projectBattleState(state, "discovered");
      },
      doDashAsBonusAction: () => {
        const state = myceliumStepBattle();
        const act = myceliumStepDashAct(state);
        const selectedSourceUnitId = myceliumStepSourceUnitId(
          act.subject.sourceUnitId,
        );
        recordSelectedUnitRuntimeBoundaryId(selectedSourceUnitId);
        projection = projectBattleState(
          requireResolved(
            resolveBattleSubject({ state, subject: act.subject, fills: [] }),
          ).state,
          "dashed",
        );
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function expectedProjection(
  overrides: Partial<MyceliumStepSelectedIdentityProjection> = {},
): MyceliumStepSelectedIdentityProjection {
  return {
    bonusActionAvailable: true,
    dashBonusFeet: 0,
    lastResult: "init",
    ...overrides,
  };
}

function projectInitialBattle(): MyceliumStepSelectedIdentityProjection {
  return projectBattleState(myceliumStepBattle(), "init");
}

function projectBattleState(
  state: BattleState,
  lastResult: MyceliumStepSelectedIdentityLastResult,
): MyceliumStepSelectedIdentityProjection {
  return {
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    dashBonusFeet: Number(state.currentTurnResources.dashMovementBonusFeet),
    lastResult,
  };
}

function myceliumStepBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("mycelium-step-selected-identity"),
    combatants: [
      characterCombatant({
        combatantId: actorId,
        displayName: "Mycelium Step Actor",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [
          {
            unitId: myceliumStepUnitId,
            supportProfiles: [myceliumStepSupportProfile],
          },
        ],
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterCombatant(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide;
  readonly characterUnitRefs: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs,
      classLevels: [{ className: "fighter", level: 1 }],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
    },
  };
}

function myceliumStepDashAct(state: BattleState): MyceliumStepDashAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is MyceliumStepDashAct =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.action === "dash" &&
      candidate.subject.sourceUnitId === myceliumStepUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Mycelium Step Bonus Action Dash act.");
  }
  return act;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function mechanicsOnlyClassicUnit(
  input: typeof myceliumStepInput,
): ClassicNonSrdMechanicsUnit {
  const [action] = input.mechanics.from.actions;
  if (
    input.id !== myceliumStepUnitId ||
    input.syntheticLabel !== myceliumStepSyntheticLabel ||
    input.provenance.kind !== classicMechanicsProvenance ||
    input.mechanics.family !== "alternate_action_cost" ||
    input.mechanics.from.kind !== "standard_action" ||
    input.mechanics.from.actions.length !== 1 ||
    action !== "dash" ||
    input.mechanics.to.kind !== "bonus_action"
  ) {
    throw new Error("Classic mycelium_step fixture shape drifted.");
  }

  return {
    id: input.id,
    syntheticLabel: input.syntheticLabel,
    provenance: { kind: input.provenance.kind },
    kind: "class_feature",
    mechanics: {
      family: input.mechanics.family,
      from: { kind: input.mechanics.from.kind, actions: [action] },
      to: { kind: input.mechanics.to.kind },
    },
  };
}

function requireMyceliumStepAlternateActionCostProfile(
  unit: ClassicNonSrdMechanicsUnit,
): Extract<BattleUnitSupportProfile, { readonly kind: "alternateActionCost" }> {
  const profiles = battleUnitSupportProfilesForUnit({ unit });
  if (Either.isLeft(profiles)) {
    throw new Error(profiles.left.message);
  }
  const profile = profiles.right[0];
  if (
    profiles.right.length !== 1 ||
    !isAlternateActionCostSupportProfile(profile) ||
    profile.from.kind !== "standardAction" ||
    profile.from.actions.length !== 1 ||
    profile.from.actions[0] !== "dash" ||
    profile.to.kind !== "bonusAction"
  ) {
    throw new Error("Expected Mycelium Step alternate action cost profile.");
  }
  return profile;
}

function isAlternateActionCostSupportProfile(
  profile: BattleUnitSupportProfile | undefined,
): profile is Extract<
  BattleUnitSupportProfile,
  { readonly kind: "alternateActionCost" }
> {
  return (
    typeof profile === "object" &&
    profile !== null &&
    profile.kind === "alternateActionCost"
  );
}

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

function normalizeMyceliumStepSelectedIdentityQuintState(
  raw: unknown,
): MyceliumStepSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    dashBonusFeet: numberFromQuintInt(
      state["qDashBonusFeet"],
      "qDashBonusFeet",
    ),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function myceliumStepSourceUnitId(raw: string): typeof myceliumStepUnitId {
  if (raw === myceliumStepUnitId) {
    return raw;
  }
  throw new Error(`Unexpected source Unit id ${String(raw)}.`);
}

function mbtLastResult(raw: unknown): MyceliumStepSelectedIdentityLastResult {
  if (raw === "init" || raw === "discovered" || raw === "dashed") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const myceliumStepSelectedIdentityStateCheck = stateCheck(
  normalizeMyceliumStepSelectedIdentityQuintState,
  (
    spec: MyceliumStepSelectedIdentityProjection,
    impl: MyceliumStepSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
