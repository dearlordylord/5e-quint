import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  movementFeet,
  type DamageType,
} from "@dnd/shared/types";
import type { Ability, Size } from "@dnd/surface/surface/types";
import { expect } from "vitest";
import {
  sleetStormAreaHazardSavingThrowOutcomeHole,
  type BattleActiveEffect,
  type BattleSleetStormAreaHazardTrigger,
  type SupportedDamageSpellInvocation,
} from "./battle-reducer.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  discoverBattleActs,
  spellId,
  type AvailableBattleAct,
  type BattleAreaId,
  type BattleAntimagicFieldTransitWitness,
  type BattleFill,
  type BattleHole,
  type BattleLineDirectionId,
  type BattleObjectDamageDisposition,
  type BattleObjectIgnitionDisposition,
  type BattleSpellAreaChoice,
  type BattleSpellAreaOriginAnchor,
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
  flamingSphereAreaId,
  greaseAreaId,
  gustOfWindAreaId,
  gustOfWindEastDirectionId,
  gustOfWindNorthDirectionId,
  moonbeamAreaId,
  sleetStormAreaId,
  sleetStormUnitId,
  spikeGrowthAreaId,
  resistanceUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveObjectId,
  webAreaId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";

type SleetStormAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleetStormAreaHazard" }
>;
const tableSelectedPointAreaOriginAnchor = {
  kind: "tableSelectedPoint",
} as const satisfies BattleSpellAreaOriginAnchor;

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
  readonly slotLevel?: number;
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
  readonly slotLevel?: number;
}): BonusActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      (input.slotLevel === undefined ||
        (candidate.subject.invocation.tag === "spellSlot" &&
          Number(candidate.subject.invocation.slotLevel) === input.slotLevel)),
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

export function magicWeaponTargetItemFill(
  hole: Extract<BattleHole, { readonly kind: "magicWeaponTargetItem" }>,
  target: {
    readonly holderCombatantId: CombatantId;
    readonly itemId: string;
  },
): Extract<BattleFill, { readonly kind: "magicWeaponTargetItem" }> {
  return {
    kind: "magicWeaponTargetItem",
    holeId: hole.holeId,
    value: {
      kind: "nonmagicalWeaponItem",
      holderCombatantId: target.holderCombatantId,
      itemId: target.itemId,
    },
  };
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

export function spiritualWeaponTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
  forcePositionId = battleTablePositionId("spiritual-weapon-force"),
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spiritualWeaponTargetWithinForceReach",
        casterId,
        targetId,
        spellId,
        forcePositionId,
        reachFeet: movementFeet(5),
      },
    ],
  };
}

export function spiritualWeaponForcePositionFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spiritualWeaponForcePosition" }
  >;
  readonly positionId?: string;
  readonly distanceFromCasterFeet?: number;
  readonly moveDistanceFeet?: number;
}): Extract<BattleFill, { readonly kind: "spiritualWeaponForcePosition" }> {
  const positionId = battleTablePositionId(
    input.positionId ?? "spiritual-weapon-force",
  );
  return {
    kind: "spiritualWeaponForcePosition",
    holeId: input.hole.holeId,
    value:
      input.hole.mode === "cast"
        ? {
            mode: "cast",
            positionId,
            distanceFromCasterFeet: movementFeet(
              input.distanceFromCasterFeet ?? 60,
            ),
          }
        : {
            mode: "reposition",
            positionId,
            moveDistanceFeet: movementFeet(input.moveDistanceFeet ?? 20),
          },
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
  const base = knownWillingSpellTargetFill(hole, spellId, casterId, targetId);
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
  readonly antimagicFieldTransit?: readonly BattleAntimagicFieldTransitWitness[];
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
      antimagicFieldTransit: input.antimagicFieldTransit ?? [],
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

export function spellManufacturedMetalObjectTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("heat-metal-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellManufacturedMetalObjectTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        casterCanSeeObject: true,
      },
    ],
  };
}

export function spellObjectContactTargetsFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectContactTargets" }>;
  readonly targetIds: readonly CombatantId[];
  readonly holdingOrWearing?: ReadonlyMap<CombatantId, "holding" | "wearing">;
}): Extract<BattleFill, { readonly kind: "objectContactTargets" }> {
  return {
    kind: "objectContactTargets",
    holeId: input.hole.holeId,
    value: { targetIds: input.targetIds },
    spatialFacts: [
      ...(input.hole.objectContact.requiresObjectWithinRange
        ? [
            {
              kind: "spellObjectWithinSpellRange" as const,
              sourceCombatantId: input.hole.objectContact.sourceCombatantId,
              sourceSpellId: input.hole.objectContact.sourceSpellId,
              objectId: input.hole.objectContact.objectId,
              rangeFeet: input.hole.objectContact.rangeFeet,
            },
          ]
        : []),
      ...input.targetIds.map((targetId) => ({
        kind: "spellObjectPhysicalContact" as const,
        sourceCombatantId: input.hole.objectContact.sourceCombatantId,
        sourceSpellId: input.hole.objectContact.sourceSpellId,
        objectId: input.hole.objectContact.objectId,
        targetId,
      })),
      ...input.targetIds.flatMap((targetId) => {
        const relation = input.holdingOrWearing?.get(targetId);
        return relation === undefined
          ? []
          : [
              {
                kind: "spellObjectHoldingOrWearing" as const,
                sourceCombatantId: input.hole.objectContact.sourceCombatantId,
                sourceSpellId: input.hole.objectContact.sourceSpellId,
                objectId: input.hole.objectContact.objectId,
                targetId,
                relation,
              },
            ];
      }),
    ],
  };
}

export function objectDropResolutionFill(
  hole: Extract<BattleHole, { readonly kind: "objectDropResolution" }>,
  outcomes: Extract<
    BattleFill,
    { readonly kind: "objectDropResolution" }
  >["value"]["outcomes"],
): Extract<BattleFill, { readonly kind: "objectDropResolution" }> {
  return {
    kind: "objectDropResolution",
    holeId: hole.holeId,
    value: { outcomes },
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

export function spellDistantObjectLightTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly rangeFeet: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellDistantObjectLightTarget" }
  >["rangeFeet"];
  readonly size?: Size;
  readonly wornOrCarried?: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellDistantObjectLightTarget" }
  >["wornOrCarried"];
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("distant-light-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellDistantObjectLightTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet,
        size: input.size ?? "medium",
        wornOrCarried: input.wornOrCarried ?? { kind: "nobody" },
      },
    ],
  };
}

export function spellTouchedObjectTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("touched-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellTouchedObjectTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
      },
    ],
  };
}

export function spellDistantTouchedObjectTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly spellId: string;
  readonly casterId: CombatantId;
  readonly rangeFeet: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellDistantTouchedObjectTarget" }
  >["rangeFeet"];
}): ObjectTargetChoiceFill {
  const objectId = input.objectId ?? battleObjectId("distant-touched-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellDistantTouchedObjectTarget",
        casterId: input.casterId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet,
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
          areaId: battleAreaId(`test:${spellId}:point-origin-sphere`),
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
    readonly naturalD20?: number;
    readonly withoutRoll?: true;
    readonly d20TestNaturalOneReroll?: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    >["value"]["outcomes"][number]["d20TestNaturalOneReroll"];
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const projectedOutcomes = outcomes.map(d20TestSavingThrowOutcomeValue);
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
            outcomes: projectedOutcomes,
          }
        : { outcomes: projectedOutcomes },
  };
}

function d20TestSavingThrowOutcomeValue(outcome: {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
  readonly naturalD20?: number;
  readonly withoutRoll?: true;
  readonly d20TestNaturalOneReroll?: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"][number]["d20TestNaturalOneReroll"];
}): Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>["value"]["outcomes"][number] {
  if (outcome.withoutRoll === true) {
    return {
      targetId: outcome.targetId,
      succeeded: outcome.succeeded,
      withoutRoll: true,
    };
  }
  return {
    targetId: outcome.targetId,
    succeeded: outcome.succeeded,
    ...(outcome.naturalD20 === undefined
      ? {}
      : { naturalD20: DieRollResult(outcome.naturalD20) }),
    ...(outcome.d20TestNaturalOneReroll === undefined
      ? {}
      : { d20TestNaturalOneReroll: outcome.d20TestNaturalOneReroll }),
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

export function gustOfWindLineSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  options: {
    readonly areaId?: BattleAreaId;
    readonly directionId?: BattleLineDirectionId;
    readonly creaturePushes?: Extract<
      BattleSpellAreaChoice,
      { readonly kind: "gustOfWindLineArea" }
    >["creaturePushes"];
  } = {},
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const failedTargetIds = outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "gustOfWindLineArea",
        areaId: options.areaId ?? gustOfWindAreaId,
        directionId: options.directionId ?? gustOfWindNorthDirectionId,
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        creaturePushes:
          options.creaturePushes ??
          failedTargetIds.map((targetId) => ({
            targetId,
            disposition: {
              kind: "pushed" as const,
              distanceFeet: movementFeet(15),
              destinationId: battleTablePositionId(
                `pushed:gust-of-wind:${targetId}`,
              ),
              provokesOpportunityAttacks: false as const,
            },
          })),
      },
      outcomes,
    },
  };
}

export function gustOfWindLineDirectionChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "gustOfWindLineDirectionChoice" }>,
  directionId: BattleLineDirectionId = gustOfWindEastDirectionId,
): Extract<BattleFill, { readonly kind: "gustOfWindLineDirectionChoice" }> {
  return {
    kind: "gustOfWindLineDirectionChoice",
    holeId: hole.holeId,
    value: { directionId },
  };
}

export function flamingSphereAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId = flamingSphereAreaId,
  originAnchor: BattleSpellAreaOriginAnchor = tableSelectedPointAreaOriginAnchor,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "flamingSphereArea", areaId, originAnchor },
  };
}

export function spikeGrowthAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId = spikeGrowthAreaId,
  originAnchor: BattleSpellAreaOriginAnchor = tableSelectedPointAreaOriginAnchor,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "spikeGrowthArea", areaId, originAnchor },
  };
}

export function moonbeamAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId = moonbeamAreaId,
  originAnchor: BattleSpellAreaOriginAnchor = tableSelectedPointAreaOriginAnchor,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "moonbeamCylinderArea", areaId, originAnchor },
  };
}

export function sleetStormAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId = sleetStormAreaId,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "sleetStormCylinderArea", areaId },
  };
}

export function webAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId = webAreaId,
  originAnchor: BattleSpellAreaOriginAnchor = tableSelectedPointAreaOriginAnchor,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "webCubeArea", areaId, originAnchor },
  };
}

export function flamingSphereRamMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movableZoneRamMovement" }>,
  moveFeet = 30,
): Extract<BattleFill, { readonly kind: "movableZoneRamMovement" }> {
  return {
    kind: "movableZoneRamMovement",
    holeId: hole.holeId,
    value: { moveFeet: movementFeet(moveFeet) },
  };
}

export function flamingSphereRepositionMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movableZoneRepositionMovement" }>,
  moveFeet = 30,
): Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }> {
  return {
    kind: "movableZoneRepositionMovement",
    holeId: hole.holeId,
    value: { moveFeet: movementFeet(moveFeet) },
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

export function webRestraintSaveAct(
  state: BattleState,
  actorId: CombatantId,
  trigger: "entersArea" | "startsTurnInArea",
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "webRestraintSave";
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
          readonly command: "webRestraintSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "webRestraintSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.trigger === trigger &&
      candidate.subject.areaId === webAreaId,
  );
  if (act === undefined) {
    throw new Error(`Expected Web ${trigger} save act.`);
  }
  return act;
}

export function sleetStormAreaHazardSaveAct(
  state: BattleState,
  actorId: CombatantId,
  trigger: BattleSleetStormAreaHazardTrigger,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "sleetStormAreaHazardSave";
    }
  >;
} {
  const effect = activeSleetStormAreaHazardEffect(state);
  if (effect === undefined) {
    throw new Error("Expected active Sleet Storm area hazard.");
  }
  const subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "sleetStormAreaHazardSave";
    }
  > = {
    tag: "runtimeCommand",
    actorId,
    command: "sleetStormAreaHazardSave",
    areaMembershipTrigger: {
      kind:
        trigger === "entersArea" ? "firstEntryOnTurn" : "turnStartInArea",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
    },
  };
  return {
    subject,
    label:
      trigger === "entersArea"
        ? "Enter Sleet Storm"
        : "Start Turn in Sleet Storm",
    summary:
      trigger === "entersArea"
        ? "Resolve the caller-supplied first-entry Sleet Storm Dexterity Saving Throw."
        : "Resolve the caller-supplied start-turn Sleet Storm Dexterity Saving Throw.",
    initialHoles: [
      sleetStormAreaHazardSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        trigger,
      ),
    ],
  };
}

function activeSleetStormAreaHazardEffect(
  state: BattleState,
): SleetStormAreaHazardEffect | undefined {
  return [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect): effect is SleetStormAreaHazardEffect =>
        effect.kind === "sleetStormAreaHazard" &&
        effect.sourceCombatantId === spellCasterId &&
        effect.sourceSpellId === sleetStormUnitId &&
        effect.areaId === sleetStormAreaId,
    );
}

export function webRestrainedNoLongerInAreaAct(
  state: BattleState,
  actorId: CombatantId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "webRestrainedNoLongerInArea";
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
          readonly command: "webRestrainedNoLongerInArea";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "webRestrainedNoLongerInArea" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === webAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Web no-longer-in-area cleanup act.");
  }
  return act;
}

export function webAreaRemovedAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "webAreaRemoved";
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
          readonly command: "webAreaRemoved";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "webAreaRemoved" &&
      candidate.subject.areaId === webAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Web area removal act.");
  }
  return act;
}

export function gustOfWindLineEndTurnSaveAct(
  state: BattleState,
  actorId: CombatantId = spellTargetId,
  areaId: BattleAreaId = gustOfWindAreaId,
  directionId: BattleLineDirectionId = gustOfWindNorthDirectionId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "gustOfWindLineSave";
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
          readonly command: "gustOfWindLineSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "gustOfWindLineSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === areaId &&
      candidate.subject.directionId === directionId,
  );
  if (act === undefined) {
    throw new Error("Expected Gust of Wind Line end-turn save act.");
  }
  return act;
}

export function gustOfWindLineDirectionChangeAct(
  state: BattleState,
  actorId: CombatantId = spellCasterId,
  areaId: BattleAreaId = gustOfWindAreaId,
  directionId: BattleLineDirectionId = gustOfWindNorthDirectionId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "gustOfWindLineDirectionChange";
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
          readonly command: "gustOfWindLineDirectionChange";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "gustOfWindLineDirectionChange" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === areaId &&
      candidate.subject.directionId === directionId,
  );
  if (act === undefined) {
    throw new Error("Expected Gust of Wind Line direction-change act.");
  }
  return act;
}

export function flamingSphereEndTurnAct(
  state: BattleState,
  actorId: CombatantId = spellTargetId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneSave";
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
          readonly command: "movableZoneSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneSave" &&
      candidate.subject.trigger === "endsTurnWithinFiveFeetOfSphere" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === flamingSphereAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Flaming Sphere end-turn save act.");
  }
  return act;
}

export function flamingSphereRepositionAct(
  state: BattleState,
  actorId: CombatantId = spellCasterId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneReposition";
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
          readonly command: "movableZoneReposition";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneReposition" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === flamingSphereAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Flaming Sphere reposition act.");
  }
  return act;
}

export function flamingSphereRamAct(
  state: BattleState,
  actorId: CombatantId = spellCasterId,
  targetId: CombatantId = spellTargetId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneRam";
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
          readonly command: "movableZoneRam";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneRam" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.targetId === targetId &&
      candidate.subject.areaId === flamingSphereAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Flaming Sphere ram act.");
  }
  return act;
}

export function moonbeamRepositionMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movableZoneRepositionMovement" }>,
  moveFeet = 60,
): Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }> {
  return {
    kind: "movableZoneRepositionMovement",
    holeId: hole.holeId,
    value: { moveFeet: movementFeet(moveFeet) },
  };
}

export function moonbeamEndTurnSaveAct(
  state: BattleState,
  actorId: CombatantId = spellTargetId,
  areaId: BattleAreaId = moonbeamAreaId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneSave";
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
          readonly command: "movableZoneSave";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.trigger === "endsTurnInArea" &&
      candidate.subject.areaId === areaId,
  );
  if (act === undefined) {
    throw new Error("Expected Moonbeam end-turn save act.");
  }
  return act;
}

export function moonbeamRepositionAct(
  state: BattleState,
  actorId: CombatantId = spellCasterId,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "movableZoneReposition";
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
          readonly command: "movableZoneReposition";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneReposition" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.areaId === moonbeamAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Moonbeam reposition act.");
  }
  return act;
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

export function targetAbilityChoicesFill(
  hole: Extract<BattleHole, { readonly kind: "targetAbilityChoices" }>,
  choices: readonly {
    readonly targetId: CombatantId;
    readonly ability: Ability;
  }[],
): Extract<BattleFill, { readonly kind: "targetAbilityChoices" }> {
  return {
    kind: "targetAbilityChoices",
    holeId: hole.holeId,
    value: { choices },
  };
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
