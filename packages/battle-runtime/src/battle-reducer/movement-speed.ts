// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form unit-feature.martial-arts-attack-projection
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// Movement-budget and speed helpers extracted from battle-reducer.ts.
// Cluster S (movement_speed). Mechanical extraction — no behavior change.
// Reads creature-state-leaves.ts to avoid cycling back into G.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE

import { Match } from "effect";
import {
  difficultyClass,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  type DifficultyClass,
  type MovementDeltaFeet,
  type MovementFeet,
} from "@dnd/shared/types";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  effectiveSpeed as sharedEffectiveSpeed,
  type CreatureSpeedFacts,
  type SpecialSpeedCandidate,
  type SpeedChange,
} from "@dnd/shared-algebras/speed-algebra";
import type { SpeedType } from "@dnd/shared/game-facts";
import type { Size, StatBlockRecord } from "@dnd/surface/surface/types";
import type { BattleDruidWildShapeKnownForm } from "../battle-init.ts";
import type { CombatantId } from "../identity.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  type BattleMovementSpeedKind,
} from "../battle-subjects.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import {
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANT_KINDS,
  type PassiveSpeedBonusCondition,
  type PassiveSpeedKindGrantKind,
} from "../unit-feature-support.ts";
import {
  zeroHpLifecycleIsTerminal,
  BATTLE_SPECIAL_SPEED_KINDS,
  type BattleAttackHitTriggerKind,
  type BattleAttackKindForRedirect,
  type BattleAttackRangeBand,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleHand,
  type BattleMovementHole,
  type BattleOpportunityAttackThreat,
  type BattlePassiveSpeedProfile,
  type BattleResolvedMovement,
  type BattleSpecialSpeedKind,
  type BattleState,
  type BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import {
  attackActionOptionName,
  attackTargetConstraint,
} from "./statblock-attacks.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { selfTransformationModeSpecialSpeedKind } from "./spells-active-effects.ts";
import {
  combatantCanSee,
  combatantWearingArmor,
  combatantHandUses,
  combatantWieldingShield,
  combatantWearingArmorCategory,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import {
  activeDruidWildShapeForm,
  combatantEffectiveSize,
} from "./druid-wild-shape.ts";

type BattleSpecialSpeedCandidate =
  | {
      readonly kind: "fixed";
      readonly speedType: BattleSpecialSpeedKind;
      readonly speedFeet: MovementFeet;
    }
  | {
      readonly kind: "equalToSpeed";
      readonly speedType: BattleSpecialSpeedKind;
    };

export function battleMovementBudget(
  combatant: BattleCreatureState | undefined,
  grapples: readonly BattleGrappleLink[] = [],
  movementBonusFeet: MovementFeet = movementFeet(0),
  speedKind: BattleMovementSpeedKind = "walk",
): {
  readonly speedFeet: MovementFeet;
  readonly spentFeet: MovementFeet;
  readonly remainingFeet: MovementFeet;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly speedFeet: MovementFeet;
    readonly remainingFeet: MovementFeet;
  }[];
} {
  if (combatant === undefined) {
    return {
      speedFeet: movementFeet(0),
      spentFeet: movementFeet(0),
      remainingFeet: movementFeet(0),
      speedKinds: [],
    };
  }
  const isGrappled = grapples.some(
    (grapple) => grapple.targetId === combatant.combatantId,
  );
  const speedFeet = effectiveMovementSpeed(combatant, speedKind, isGrappled);
  const movementBudgetFeet = Number(speedFeet) + Number(movementBonusFeet);
  const remainingFeet = movementFeet(
    Math.max(0, movementBudgetFeet - Number(combatant.movementSpentFeet)),
  );
  const speedKinds = representedMovementSpeedKinds(combatant).map((kind) => {
    const kindSpeedFeet = effectiveMovementSpeed(combatant, kind, isGrappled);
    return {
      kind,
      speedFeet: kindSpeedFeet,
      remainingFeet: movementFeet(
        Math.max(
          0,
          Number(kindSpeedFeet) +
            Number(movementBonusFeet) -
            Number(combatant.movementSpentFeet),
        ),
      ),
    };
  });
  return {
    speedFeet,
    spentFeet: combatant.movementSpentFeet,
    remainingFeet,
    speedKinds,
  };
}

export function battleMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): ReturnType<typeof battleMovementBudget> {
  const bonus =
    actorId === currentActorId(state)
      ? state.currentTurnResources.dashMovementBonusFeet
      : movementFeet(0);
  return battleMovementBudget(
    state.combatants.get(actorId),
    state.grapples,
    bonus,
    speedKind,
  );
}

export function movementHoleHasRemainingBudget(
  hole: BattleMovementHole,
): boolean {
  return hole.speedKinds.some(
    (speedKind) => Number(speedKind.movementBudgetFeet) > 0,
  );
}

export function effectiveWalkSpeed(
  combatant: BattleCreatureState,
  isGrappled = false,
): MovementFeet {
  return effectiveMovementSpeed(combatant, "walk", isGrappled);
}

export function effectiveMovementSpeed(
  combatant: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
  isGrappled = false,
): MovementFeet {
  return (
    sharedEffectiveSpeed(
      battleCreatureSpeedFacts(combatant, isGrappled),
      speedKind,
    ) ?? movementFeet(0)
  );
}

export function baseWalkSpeed(combatant: BattleCreatureState): number {
  const wildShapeForm = activeDruidWildShapeForm(combatant);
  if (wildShapeForm !== null) {
    return druidWildShapeWalkSpeed(wildShapeForm);
  }
  if (combatant.origin.kind === "character") {
    return Number(combatant.origin.speed.walkFeet);
  }
  return literalWalkSpeed(combatant.origin.statBlock);
}

function druidWildShapeWalkSpeed(form: BattleDruidWildShapeKnownForm): number {
  return form.statBlock.speeds[0].feet.value;
}

function literalWalkSpeed(statBlock: StatBlockRecord): number {
  const walkSpeed = statBlock.statBlock.speeds.find(
    (speed) => speed.kind === "walk" && speed.feet.kind === "literal",
  );
  return walkSpeed?.feet.kind === "literal" ? walkSpeed.feet.value : 0;
}

export function battleCreatureSpeedFacts(
  combatant: BattleCreatureState,
  isGrappled = false,
): CreatureSpeedFacts {
  return {
    ordinarySpeedFeet: movementFeet(baseWalkSpeed(combatant)),
    speedChanges: battleSpeedChanges(combatant),
    specialSpeeds: battleSpecialSpeedCandidates(combatant),
    terminalSpeedZero: battleTerminalSpeedZero(combatant, isGrappled),
  };
}

export function battleSpeedChanges(
  combatant: BattleCreatureState,
): readonly SpeedChange[] {
  const passiveFeatureDelta = passiveSpeedBonusDelta(combatant);
  const activeEffectDelta = combatant.activeEffects
    .filter((effect) => effect.kind === "speedDelta")
    .reduce((total, effect) => total + effect.deltaFeet, 0);
  return [
    { deltaFeet: movementDeltaFeet(passiveFeatureDelta + activeEffectDelta) },
  ];
}

export function battleSpecialSpeedCandidates(
  combatant: BattleCreatureState,
): readonly SpecialSpeedCandidate[] {
  const candidates: BattleSpecialSpeedCandidate[] = [];
  if (combatant.origin.kind === "character") {
    for (const speedType of passiveSpeedKindGrantKinds(combatant)) {
      candidates.push({ kind: "equalToSpeed", speedType });
    }
  }
  for (const speedType of activeSpecialSpeedGrantKinds(combatant)) {
    candidates.push(speedType);
  }
  const statBlockSpeedSource =
    activeDruidWildShapeForm(combatant) ??
    (combatant.origin.kind === "statBlock" ? combatant.origin.statBlock : null);
  if (statBlockSpeedSource !== null) {
    for (const speed of statBlockSpeedSource.statBlock.speeds) {
      if (isBattleLiteralSpecialSpeed(speed)) {
        candidates.push({
          kind: "fixed",
          speedType: speed.kind,
          speedFeet: movementFeet(speed.feet.value),
        });
      }
    }
  }
  return candidates;
}

export function battleTerminalSpeedZero(
  combatant: BattleCreatureState,
  isGrappled: boolean,
): boolean {
  return (
    isGrappled ||
    hasCondition(combatant.conditions, "paralyzed") ||
    hasCondition(combatant.conditions, "petrified") ||
    hasCondition(combatant.conditions, "restrained") ||
    hasCondition(combatant.conditions, "stunned") ||
    hasCondition(combatant.conditions, "unconscious")
  );
}

export function representedMovementSpeedKinds(
  combatant: BattleCreatureState,
): readonly BattleMovementSpeedKind[] {
  const kinds = new Set<BattleMovementSpeedKind>(["walk"]);
  for (const kind of passiveSpeedKindGrantKinds(combatant)) {
    kinds.add(kind);
  }
  for (const candidate of activeSpecialSpeedGrantKinds(combatant)) {
    kinds.add(candidate.speedType);
  }
  const statBlockSpeedSource =
    activeDruidWildShapeForm(combatant) ??
    (combatant.origin.kind === "statBlock" ? combatant.origin.statBlock : null);
  if (statBlockSpeedSource !== null) {
    for (const speed of statBlockSpeedSource.statBlock.speeds) {
      if (isBattleLiteralSpecialSpeed(speed)) {
        kinds.add(speed.kind);
      }
    }
  }
  return BATTLE_MOVEMENT_SPEED_KINDS.filter((kind) => kinds.has(kind));
}

function activeSpecialSpeedGrantKinds(
  combatant: BattleCreatureState,
): readonly BattleSpecialSpeedCandidate[] {
  const candidates: BattleSpecialSpeedCandidate[] = [];
  const selfTransformationKinds = new Set<BattleSpecialSpeedKind>();
  for (const effect of combatant.activeEffects) {
    if (effect.kind === "specialSpeedGrant") {
      candidates.push(
        effect.speed.kind === "equalToSpeed"
          ? { kind: "equalToSpeed", speedType: effect.speedKind }
          : {
              kind: "fixed",
              speedType: effect.speedKind,
              speedFeet: effect.speed.speedFeet,
            },
      );
    }
    const selfTransformationSpeedKind =
      selfTransformationModeSpecialSpeedKind(effect);
    if (selfTransformationSpeedKind !== null) {
      selfTransformationKinds.add(selfTransformationSpeedKind);
    }
  }
  return [
    ...candidates,
    ...BATTLE_SPECIAL_SPEED_KINDS.filter((kind) =>
      selfTransformationKinds.has(kind),
    ).map((kind) => ({ kind: "equalToSpeed" as const, speedType: kind })),
  ];
}

export function isBattleLiteralSpecialSpeed(speed: {
  readonly kind: SpeedType;
  readonly feet: { readonly kind: string };
}): speed is {
  readonly kind: BattleSpecialSpeedKind;
  readonly feet: { readonly kind: "literal"; readonly value: number };
} {
  return (
    speed.feet.kind === "literal" &&
    isBattleSpecialSpeedKind(speed.kind)
  );
}

function isBattleSpecialSpeedKind(kind: SpeedType): kind is BattleSpecialSpeedKind {
  return BATTLE_SPECIAL_SPEED_KINDS.some((candidate) => candidate === kind);
}

export function passiveSpeedKindGrantKinds(
  combatant: BattleCreatureState,
): readonly PassiveSpeedKindGrantKind[] {
  if (combatant.origin.kind !== "character") {
    return [];
  }
  const kinds = new Set<PassiveSpeedKindGrantKind>();
  for (const unitRef of combatant.origin.characterUnitRefs) {
    for (const profile of unitRef.supportProfiles) {
      if (
        typeof profile === "object" &&
        profile.kind === PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE
      ) {
        for (const grant of profile.grants) {
          kinds.add(grant.speedKind);
        }
      }
    }
  }
  return PASSIVE_SPEED_KIND_GRANT_KINDS.filter((kind) => kinds.has(kind));
}

export function passiveSpeedBonusDelta(combatant: BattleCreatureState): number {
  if (combatant.origin.kind !== "character") {
    return 0;
  }
  return combatant.origin.characterUnitRefs
    .flatMap((unitRef) =>
      unitRef.supportProfiles.flatMap((profile) =>
        typeof profile === "object" &&
        (profile.kind === PASSIVE_SPEED_BONUS_SUPPORT_PROFILE ||
          profile.kind === PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE)
          ? speedBonusDeltaForProfile(combatant, profile)
          : [],
      ),
    )
    .reduce((total, delta) => total + delta, 0);
}

export function speedBonusDeltaForProfile(
  combatant: BattleCreatureState,
  profile: BattlePassiveSpeedProfile,
): readonly number[] {
  const condition = profileSpeedBonusCondition(profile);
  return passiveSpeedBonusConditionApplies(combatant, condition)
    ? [Number(profileSpeedBonusDeltaFeet(profile))]
    : [];
}

export function profileSpeedBonusCondition(
  profile: BattlePassiveSpeedProfile,
): PassiveSpeedBonusCondition {
  return profile.kind === PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE
    ? profile.speed.condition
    : profile.condition;
}

function passiveSpeedBonusConditionApplies(
  combatant: BattleCreatureState,
  condition: PassiveSpeedBonusCondition,
): boolean {
  return Match.value(condition).pipe(
    Match.when(
      { kind: "notWearingArmor" },
      ({ categories }) =>
        !categories.some((category) =>
          combatantWearingArmorCategory(combatant, category),
        ),
    ),
    Match.when(
      { kind: "unarmoredUnshielded" },
      () =>
        !combatantWearingArmor(combatant) &&
        !combatantWieldingShield(combatant),
    ),
    Match.exhaustive,
  );
}

export function profileSpeedBonusDeltaFeet(
  profile: BattlePassiveSpeedProfile,
): MovementDeltaFeet {
  return profile.kind === PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE
    ? profile.speed.deltaFeet
    : profile.deltaFeet;
}

export function combatantCanMoveInState(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return battleMovementBudgetForActor(state, combatantId).speedKinds.some(
    (speedKind) =>
      combatantCanMoveWithBudget(state, combatantId, speedKind.remainingFeet),
  );
}

export function combatantCanMoveWithBudget(
  state: BattleState,
  combatantId: CombatantId,
  movementBudgetFeet: MovementFeet,
): boolean {
  const combatant = state.combatants.get(combatantId);
  return (
    combatant !== undefined &&
    !zeroHpLifecycleIsTerminal(combatant) &&
    Number(movementBudgetFeet) > 0
  );
}

export function opportunityAttackThreatsForMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly BattleOpportunityAttackThreat[] {
  if (
    movement.moverId === currentActorId(state) &&
    state.currentTurnResources.disengaged
  ) {
    return [];
  }
  return movement.provokedOpportunityAttacks.filter(
    (threat) =>
      opportunityAttackOptionForReactor(
        state,
        threat.reactorId,
        movement.moverId,
        threat.attackName,
      ) !== undefined &&
      combatantCanSee(state, threat.reactorId, movement.moverId),
  );
}

export function opportunityAttackOptionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
): SupportedAttackActionOption | undefined {
  if (isPresentFindFamiliarCombatant(state, reactorId)) {
    return undefined;
  }
  if (
    state.combatants
      .get(reactorId)
      ?.activeEffects.some(
        (effect) => effect.kind === "opportunityAttackDenied",
      )
  ) {
    return undefined;
  }
  return attackActionOptionsForActor(state, reactorId).find((attack) => {
    const constraint = attackTargetConstraint(attack);
    return (
      attackActionOptionName(attack) === attackName &&
      constraint.kind === "meleeReach" &&
      state.combatants.has(targetId)
    );
  });
}

export function attackTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  const attackName = attackActionOptionName(attack);
  const constraint = attackTargetConstraint(attack);
  return (
    actorId !== targetId &&
    state.combatants.has(targetId) &&
    (constraint.kind === "meleeReach"
      ? facts.some(
          (fact) =>
            fact.kind === "attackTargetInMeleeReach" &&
            fact.actorId === actorId &&
            fact.targetId === targetId &&
            fact.attackName === attackName,
        )
      : attackTargetRangeBand(facts, actorId, targetId, attack) !== null)
  );
}

export function attackKindForDeflectRedirect(
  attack: SupportedAttackActionOption,
): BattleAttackKindForRedirect {
  return attackTargetConstraint(attack).kind === "meleeReach"
    ? "melee"
    : "ranged";
}

export function attackHitTriggerKind(
  attack: SupportedAttackActionOption,
): BattleAttackHitTriggerKind {
  if (attack.kind === "weapon") {
    return attackTargetConstraint(attack).kind === "meleeReach"
      ? "meleeWeapon"
      : "rangedWeapon";
  }
  return attack.kind === "unarmedStrike" &&
    attackTargetConstraint(attack).kind === "meleeReach"
    ? "unarmedStrike"
    : "otherAttack";
}

export function attackTargetRangeBand(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleAttackRangeBand | null {
  if (attackTargetConstraint(attack).kind !== "rangedRange") {
    return null;
  }
  const attackName = attackActionOptionName(attack);
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetInRangedRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.attackName === attackName
    ) {
      return fact.rangeBand;
    }
  }
  return null;
}

export function grappleLinkForTarget(
  state: BattleState,
  grapplerId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | { readonly tag: "invalid"; readonly message: string } {
  const grappler = state.combatants.get(grapplerId);
  const target = state.combatants.get(targetId);
  if (
    grappler === undefined ||
    target === undefined ||
    grapplerId === targetId
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be another combatant in this battle.",
    };
  }
  if (grappledBy(state, targetId) !== undefined) {
    return { tag: "invalid", message: "Grapple target is already Grappled." };
  }
  if (activeDruidWildShapeForm(grappler) !== null) {
    return {
      tag: "invalid",
      message:
        "Grapple while using a Beast form requires unsupported form anatomy and free-hand projection.",
    };
  }
  const hand = firstFreeHand(grappler, state.grapples);
  if (hand === undefined) {
    return { tag: "invalid", message: "Grapple requires a free hand." };
  }
  const grapplerSize = combatantEffectiveSize(grappler);
  const targetSize = combatantEffectiveSize(target);
  if (!targetIsNoMoreThanOneSizeLarger(grapplerSize, targetSize)) {
    return {
      tag: "invalid",
      message: "Grapple target cannot be more than one size larger.",
    };
  }
  if (
    !facts.some(
      (fact) =>
        fact.kind === "grappleTargetWithinReach" &&
        fact.grapplerId === grapplerId &&
        fact.targetId === targetId,
    )
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be within reach by table-supplied fact.",
    };
  }
  return {
    tag: "ok",
    link: {
      grapplerId,
      targetId,
      escapeDc: unarmedStrikeSaveDc(grappler),
      reachFeet: movementFeet(5),
      hand,
      targetExemptFromDragCost: grappleDragCostExempt(grapplerSize, targetSize),
    },
  };
}

export function shoveForTarget(
  state: BattleState,
  shoverId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
):
  | { readonly tag: "ok"; readonly dc: DifficultyClass }
  | { readonly tag: "invalid"; readonly message: string } {
  const shover = state.combatants.get(shoverId);
  const target = state.combatants.get(targetId);
  if (shover === undefined || target === undefined || shoverId === targetId) {
    return {
      tag: "invalid",
      message: "Shove target must be another combatant in this battle.",
    };
  }
  if (
    !targetIsNoMoreThanOneSizeLarger(
      combatantEffectiveSize(shover),
      combatantEffectiveSize(target),
    )
  ) {
    return {
      tag: "invalid",
      message: "Shove target cannot be more than one size larger.",
    };
  }
  if (
    !facts.some(
      (fact) =>
        fact.kind === "shoveTargetWithinReach" &&
        fact.shoverId === shoverId &&
        fact.targetId === targetId,
    )
  ) {
    return {
      tag: "invalid",
      message: "Shove target must be within reach by table-supplied fact.",
    };
  }
  return { tag: "ok", dc: unarmedStrikeSaveDc(shover) };
}

export function firstFreeHand(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): BattleHand | undefined {
  const hands = combatantHandUses(combatant, grapples);
  if (hands.left === "free") return "left";
  if (hands.right === "free") return "right";
  return undefined;
}

export function grappleEscapeDc(
  grappler: BattleCreatureState,
): DifficultyClass {
  return unarmedStrikeSaveDc(grappler);
}

export function unarmedStrikeSaveDc(
  combatant: BattleCreatureState,
): DifficultyClass {
  return difficultyClass(
    8 +
      unarmedStrikeSaveDcAbilityModifier(combatant) +
      combatantProficiencyBonus(combatant),
  );
}

export function unarmedStrikeSaveDcAbilityModifier(
  combatant: BattleCreatureState,
): number {
  const wildShapeForm = activeDruidWildShapeForm(combatant);
  if (wildShapeForm !== null) {
    return Math.floor((wildShapeForm.statBlock.abilityScores.str - 10) / 2);
  }
  if (combatant.origin.kind === "statBlock") {
    return Math.floor(
      (combatant.origin.statBlock.statBlock.abilityScores.str - 10) / 2,
    );
  }
  return Number(combatant.origin.unarmedStrike.attackAbilityModifier);
}

export function combatantProficiencyBonus(
  combatant: BattleCreatureState,
): number {
  if (combatant.origin.kind === "statBlock") return 2;
  const level = combatant.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  return Number(proficiencyBonus(Math.floor((level - 1) / 4) + 2));
}

const SIZE_RANKS: Readonly<Record<Size, number>> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
  gargantuan: 5,
};

export function targetIsNoMoreThanOneSizeLarger(
  grappler: Size,
  target: Size,
): boolean {
  return SIZE_RANKS[target] - SIZE_RANKS[grappler] <= 1;
}

export function grappleDragCostExempt(grappler: Size, target: Size): boolean {
  return target === "tiny" || SIZE_RANKS[grappler] - SIZE_RANKS[target] >= 2;
}
