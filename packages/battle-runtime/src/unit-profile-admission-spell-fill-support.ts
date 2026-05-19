import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { movementFeet, type DamageType } from "@dnd/shared/types";
import type { Ability, Size } from "@dnd/surface/surface/types";
import { expect } from "vitest";
import type { SupportedDamageSpellInvocation } from "./battle-reducer.ts";
import {
  battleObjectId,
  battleTablePositionId,
  discoverBattleActs,
  spellId,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleObjectDamageDisposition,
  type BattleObjectIgnitionDisposition,
  type BattleSpellAreaChoice,
  type BattleSpellConditionChoiceHole,
  type BattleState,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
  type SupportedSpellInvocation,
} from "./index.ts";
import type {
  ActionSpellAct,
  BonusActionDashSpellAct,
  BonusActionSpellAct,
} from "./unit-profile-admission-catalog-support.ts";
import {
  greaseAreaId,
  resistanceUnitId,
  spellCasterId,
  thunderwaveObjectId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";

export function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct {
  const act = maybeSpellAct(input);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

export function maybeSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      (input.slotLevel === undefined ||
        (candidate.subject.invocation.tag === "spellSlot" &&
          Number(candidate.subject.invocation.slotLevel) === input.slotLevel)),
  );
}

export function bonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct {
  const act = maybeBonusSpellAct(input);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action spell act.`);
  }
  return act;
}

export function maybeBonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
  );
}

export function bonusSpellActForItem(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly componentWeaponItemId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      candidate.subject.componentWeaponItemId === input.componentWeaponItemId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(
      `Expected ${input.spellId} Bonus Action spell act for ${input.componentWeaponItemId}.`,
    );
  }
  return act;
}

export function bonusActionDashSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionDashSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionDashSpellAct =>
      candidate.subject.tag === "bonusActionDashSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action Dash spell act.`);
  }
  return act;
}

export function jumpMovementReplacementAct(
  state: BattleState,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >;
} {
  const act = maybeJumpMovementReplacementAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Jump movement replacement act.");
  }
  return act;
}

export function maybeJumpMovementReplacementAct(state: BattleState):
  | (AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "jumpMovementReplacement";
        }
      >;
    })
  | undefined {
  return discoverBattleActs(state).find(isJumpMovementReplacementAct);
}

function isJumpMovementReplacementAct(
  candidate: AvailableBattleAct,
): candidate is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >;
} {
  return (
    candidate.subject.tag === "runtimeCommand" &&
    candidate.subject.command === "jumpMovementReplacement"
  );
}

export function requireSpellDamageReductionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "rolledDice" }> & {
  readonly spellDamageReduction: unknown;
} {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "rolledDice" }> & {
      readonly spellDamageReduction: unknown;
    } => candidate.kind === "rolledDice" && "spellDamageReduction" in candidate,
  );
  if (hole === undefined) {
    throw new Error("Expected spell damage reduction roll hole.");
  }
  return hole;
}

export function withResistanceEffect(
  state: BattleState,
  targetId: CombatantId,
  damageType: DamageType,
  usedThisTurn: boolean,
): BattleState {
  const target = requireCombatant(state, targetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "spellDamageReduction" as const,
          sourceSpellId: resistanceUnitId,
          sourceCombatantId: spellCasterId,
          damageType,
          amount: { dice: 1 as const, dieSize: 4 as const },
          usedThisTurn,
          expiresAt: {
            kind: "concentration" as const,
            combatantId: spellCasterId,
          },
        },
      ],
    }),
  };
}

export function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export function knownWillingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = spellTargetFill(hole, spellId, casterId, targetId);
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export function wardingBondSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = knownWillingSpellTargetFill(
    hole,
    spellId,
    casterId,
    targetId,
  );
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "wardingBondPairedWornPlatinumRings",
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "wardingBondCreaturesDistance",
        casterId,
        targetId,
        spellId,
        distanceFeet: movementFeet(60),
      },
    ],
  };
}

export function teleportDestinationFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "teleportDestination" }>;
  readonly destinationId?: string;
  readonly distanceFeet?: number;
}): Extract<BattleFill, { readonly kind: "teleportDestination" }> {
  return {
    kind: "teleportDestination",
    holeId: input.hole.holeId,
    value: {
      kind: "unoccupiedVisibleDestination",
      actorId: input.hole.actorId,
      spellId: spellId(input.hole.spell.spell.id),
      destinationId: battleTablePositionId(
        input.destinationId ?? "misty-step-destination",
      ),
      distanceFeet: movementFeet(input.distanceFeet ?? 30),
    },
  };
}

export type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;

export function spellObjectTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
  readonly damageDisposition?: BattleObjectDamageDisposition;
  readonly ignitionDisposition?: BattleObjectIgnitionDisposition;
  readonly attackerCanSeeObject?: boolean;
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("produce-flame-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        armorClass: armorClass(13),
        damageDisposition: input.damageDisposition ?? { kind: "tableResolved" },
      },
      ...(input.ignitionDisposition === undefined
        ? []
        : [
            {
              kind: "spellObjectIgnition" as const,
              casterId: input.casterId,
              objectId,
              spellId: input.spellId,
              disposition: input.ignitionDisposition,
            },
          ]),
      ...(input.attackerCanSeeObject === undefined
        ? []
        : [
            {
              kind: "spellObjectTargetSight" as const,
              casterId: input.casterId,
              objectId,
              spellId: input.spellId,
              attackerCanSeeObject: input.attackerCanSeeObject,
            },
          ]),
    ],
  };
}

export function spellObjectLightTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly size?: Size;
  readonly wornOrCarried?: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectLightTarget" }
  >["wornOrCarried"];
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("light-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectLightTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        size: input.size ?? "medium",
        wornOrCarried: input.wornOrCarried ?? { kind: "nobody" },
      },
    ],
  };
}

export function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  if (hole.spell.targeting.kind === "pointOriginSphereTargetList") {
    return {
      kind: "spellTargetList",
      holeId: hole.holeId,
      value: { targetIds },
      spatialFacts: [
        {
          kind: "spellTargetsInPointOriginSphere",
          casterId,
          spellId,
          areaId: `test:${spellId}:point-origin-sphere`,
          radiusFeet: hole.spell.targeting.area.radiusFeet,
          targetIds,
        },
      ],
    };
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId,
    })),
  };
}

export function knownWillingSpellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.flatMap((targetId) => [
      {
        kind: "spellTarget" as const,
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "spellTargetKnownWilling" as const,
        casterId,
        targetId,
        spellId,
      },
    ]),
  };
}

export function jumpSpellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return knownWillingSpellTargetListFill(hole, casterId, spellId, targetIds);
}

export function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole &&
      hole.spell.procedure !== "rollModifier" &&
      hole.spell.targeting.kind !== "singleCombatant" &&
      hole.spell.targeting.kind !== "targetList"
        ? {
            area: {
              originAnchorId: spellCasterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

export function spellConditionChoiceFill(
  hole: BattleSpellConditionChoiceHole,
  value: BattleSpellConditionChoiceHole["choices"][number],
): Extract<BattleFill, { readonly kind: "conditionChoice" }> {
  return {
    kind: "conditionChoice",
    holeId: hole.holeId,
    value,
  };
}

export function faerieFireObjectOutlineFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  affectedObjectIds: readonly ReturnType<typeof battleObjectId>[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "faerieFireArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [],
        affectedObjectIds,
      },
      outcomes: [],
    },
  };
}

export function thunderwaveSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: thunderwaveArea(
        outcomes.map((outcome) => outcome.targetId),
        outcomes.flatMap((outcome) =>
          outcome.succeeded ? [] : [outcome.targetId],
        ),
      ),
      outcomes,
    },
  };
}

export function thunderwaveArea(
  affectedTargetIds: readonly CombatantId[],
  failedTargetIds: readonly CombatantId[],
): Extract<BattleSpellAreaChoice, { readonly kind: "thunderwaveArea" }> {
  return {
    kind: "thunderwaveArea",
    originAnchorId: spellCasterId,
    affectedTargetIds,
    creaturePushes: failedTargetIds.map((targetId) => ({
      targetId,
      disposition: {
        kind: "pushed" as const,
        distanceFeet: movementFeet(10),
        destinationId: battleTablePositionId(`pushed:${targetId}`),
        provokesOpportunityAttacks: false as const,
      },
    })),
    unsecuredObjectPushes: [
      {
        objectId: thunderwaveObjectId,
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(10),
          destinationId: battleTablePositionId("pushed:thunderwave-object"),
          provokesOpportunityAttacks: false,
        },
      },
    ],
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

export function greaseSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "greaseGroundArea",
        areaId: greaseAreaId,
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

export function singleTargetSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes: [{ targetId, succeeded }] },
  };
}

export function commandApproachMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly movedWithinFiveFeetOfCaster: boolean;
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: [],
      commandApproach: {
        kind: "commandApproachShortestDirectRouteTowardCaster",
        movedWithinFiveFeetOfCaster: value.movedWithinFiveFeetOfCaster,
      },
    },
  };
}

export function commandFleeMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      commandFlee: {
        kind: "commandFleeFastestAvailableRouteAwayFromCaster",
      },
    },
  };
}

export function greaseGroundHazardSaveAct(
  state: BattleState,
  actorId: CombatantId,
  trigger: "entersArea" | "endsTurnInArea",
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "greaseGroundHazardSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "greaseGroundHazardSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.trigger === trigger &&
      candidate.subject.areaId === greaseAreaId,
  );
  if (act === undefined) {
    throw new Error(`Expected Grease ${trigger} save act.`);
  }
  return act;
}

export function greaseGroundHazardEndTurnAct(
  state: BattleState,
  actorId: CombatantId,
): ReturnType<typeof greaseGroundHazardSaveAct> {
  return greaseGroundHazardSaveAct(state, actorId, "endsTurnInArea");
}

export function skillChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "skillChoice" }>,
  value: Extract<BattleFill, { readonly kind: "skillChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "skillChoice" }> {
  return { kind: "skillChoice", holeId: hole.holeId, value };
}

export function abilityChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "abilityChoice" }>,
  value: Ability,
): Extract<BattleFill, { readonly kind: "abilityChoice" }> {
  return { kind: "abilityChoice", holeId: hole.holeId, value };
}

export function isSelectedSorcerousBurstDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedDamageSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
> {
  return (
    invocation.procedure === "spellAttackDamage" &&
    invocation.damage.kind === "selectedSorcerousBurstDamage"
  );
}

export function spellActInvocation(
  act: ActionSpellAct,
): SupportedSpellInvocation {
  const hole = act.initialHoles[0];
  return spellHoleInvocation(hole === undefined ? [] : [hole]);
}

export function spellHoleInvocation(
  holes: readonly BattleHole[],
): SupportedSpellInvocation {
  const hole = holes[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}
