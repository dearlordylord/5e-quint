import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-MYCELIUM-STEP mycelium_step
// UNIT-IDENTITY-REPLAY: L1D2-MYCELIUM-STEP mycelium_step doDiscoverMyceliumStepDash doDashAsBonusAction
import { Either } from "effect";
import { expect } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleUnitSupportProfilesForUnit,
  type BattleUnitSupportProfile,
  type ClassicNonSrdMechanicsUnit,
} from "./unit-feature-support.ts";

type MyceliumStepLastResult = "init" | "discovered" | "dashed";
type MyceliumStepProjection = {
  readonly bonusActionAvailable: boolean;
  readonly dashBonusFeet: number;
  readonly lastResult: MyceliumStepLastResult;
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
const myceliumStepUnit = mechanicsOnlyClassicUnit(myceliumStepInput);
const myceliumStepSupportProfile =
  requireMyceliumStepAlternateActionCostProfile(myceliumStepUnit);

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Mycelium Step feature selected identity replay",
  taskId: "L1D2-MYCELIUM-STEP",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: { Init: "init", Discovered: "discovered", Dashed: "dashed" },
  },
  projectionSchema: {
    bonusActionAvailable: "bool",
    dashBonusFeet: "int",
    lastResult: "variant",
  },
  initialProjection: projectBattleState(myceliumStepBattle().state, "init"),
  units: [
    {
      unitId: myceliumStepUnitId,
      procedures: [
        {
          actionName: "doDiscoverMyceliumStepDash",
          discover: () => {
            const session = myceliumStepBattle();
            const state = session.state;
            const act = myceliumStepDashAct(session);
            assertMyceliumStepSourceUnitId(
              battleActUnitPresentation(act)?.unitId,
            );
            return projectBattleState(state, "discovered");
          },
        },
        {
          actionName: "doDashAsBonusAction",
          discover: () => {
            const session = myceliumStepBattle();
            const state = session.state;
            const act = myceliumStepDashAct(session);
            assertMyceliumStepSourceUnitId(
              battleActUnitPresentation(act)?.unitId,
            );
            return projectBattleState(
              requireResolved(
                resolveBattleSubject({
                  state,
                  subject: act.subject,
                  fills: [],
                }),
              ).state,
              "dashed",
            );
          },
        },
      ],
    },
  ],
});

function projectBattleState(
  state: BattleState,
  lastResult: MyceliumStepLastResult,
): MyceliumStepProjection {
  return {
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    dashBonusFeet: Number(state.currentTurnResources.dashMovementBonusFeet),
    lastResult,
  };
}

function myceliumStepBattle(): BattleRuntimeSession {
  return startBattleRight({
    battleId: battleId("mycelium-step-selected-identity"),
    combatants: [
      characterCombatant({
        combatantId: actorId,
        displayName: "Mycelium Step Actor",
        initiative: 20,
        characterUnitRefs: [
          {
            unit: myceliumStepUnit,
            supportProfiles: [myceliumStepSupportProfile],
          },
        ],
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleRuntimeSession {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function characterCombatant(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly characterUnitRefs: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs,
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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

function myceliumStepDashAct(
  session: BattleRuntimeSession,
): MyceliumStepDashAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is MyceliumStepDashAct =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.action === "dash" &&
      battleActUnitPresentation(candidate)?.unitId === myceliumStepUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Mycelium Step Bonus Action Dash act.");
  }
  return act;
}

function assertMyceliumStepSourceUnitId(raw: string | undefined): void {
  expect(raw, "Mycelium Step act must bind its Unit id").toBe(
    myceliumStepUnitId,
  );
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
    id: parseSharedUnitId(input.id),
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
