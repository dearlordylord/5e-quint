import { Match } from "effect";
import {
  movementDeltaFeet,
  movementFeet,
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
import type { BattleDruidWildShapeKnownForm } from "../druid-wild-shape-known-form-execution.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BATTLE_SPECIAL_SPEED_KINDS,
  type BattleMovementSpeedKind,
  type BattleSpecialSpeedKind,
} from "../battle-subjects.ts";
import {
  PASSIVE_SPEED_KIND_GRANT_KINDS,
  type PassiveSpeedBonusCondition,
  type PassiveSpeedKindGrantKind,
} from "../unit-feature-execution-constants.ts";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import {
  combatantWearingArmor,
  combatantWearingArmorCategory,
  combatantWieldingShield,
} from "./creature-state-leaves.ts";
import { activeDruidWildShapeForm } from "./druid-wild-shape.ts";
import { selfTransformationModeSpecialSpeedKind } from "./self-transformation-speed.ts";
import { SLOW_ACTIVE_PENALTIES_SPEED_RATIO } from "./domain-constants.ts";

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

export function effectiveWalkSpeed(
  state: BattleState,
  combatant: BattleCreatureState,
  isGrappled = false,
): MovementFeet {
  return effectiveMovementSpeed(state, combatant, "walk", isGrappled);
}

export function effectiveMovementSpeed(
  state: BattleState,
  combatant: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
  isGrappled = false,
): MovementFeet {
  const speedFeet =
    sharedEffectiveSpeed(
      battleCreatureSpeedFacts(state, combatant, isGrappled),
      speedKind,
    ) ?? movementFeet(0);
  return combatant.activeEffects.some((effect) => effect.kind === "speedHalved")
    ? halveMovementSpeed(speedFeet)
    : speedFeet;
}

function halveMovementSpeed(speedFeet: MovementFeet): MovementFeet {
  return movementFeet(Math.floor(Number(speedFeet) / 2));
}

export function baseWalkSpeed(combatant: BattleCreatureState): number {
  const wildShapeForm = activeDruidWildShapeForm(combatant);
  if (wildShapeForm !== null) {
    return druidWildShapeWalkSpeed(wildShapeForm);
  }
  if (combatant.origin.kind === "character") {
    return Number(combatant.origin.speed.walkFeet);
  }
  return literalWalkSpeed(combatant.origin.mechanics.speeds);
}

function druidWildShapeWalkSpeed(form: BattleDruidWildShapeKnownForm): number {
  return form.statBlock.speeds[0].feet.value;
}

function literalWalkSpeed(
  speeds: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "statBlock" }
  >["mechanics"]["speeds"],
): number {
  const walkSpeed = speeds.find(
    (speed) => speed.kind === "walk" && speed.feet.kind === "literal",
  );
  return walkSpeed?.feet.kind === "literal" ? walkSpeed.feet.value : 0;
}

export function battleCreatureSpeedFacts(
  state: BattleState,
  combatant: BattleCreatureState,
  isGrappled = false,
): CreatureSpeedFacts {
  return {
    ordinarySpeedFeet: movementFeet(baseWalkSpeed(combatant)),
    speedChanges: battleSpeedChanges(state, combatant),
    specialSpeeds: battleSpecialSpeedCandidates(combatant),
    terminalSpeedZero: battleTerminalSpeedZero(combatant, isGrappled),
  };
}

export function battleSpeedChanges(
  state: BattleState,
  combatant: BattleCreatureState,
): readonly SpeedChange[] {
  const passiveFeatureDelta = passiveSpeedBonusDelta(state, combatant);
  const activeEffectDelta = combatant.activeEffects
    .filter(
      (effect) =>
        effect.kind === "speedDelta" || effect.kind === "unitFeatureSpeedDelta",
    )
    .reduce((total, effect) => total + effect.deltaFeet, 0);
  const brutalStrikeHamstringDelta = combatant.activeEffects
    .filter((effect) => effect.kind === "brutalStrikeHamstring")
    .reduce((total, effect) => total + effect.effect.deltaFeet, 0);
  return [
    {
      kind: "delta",
      deltaFeet: movementDeltaFeet(
        passiveFeatureDelta + activeEffectDelta + brutalStrikeHamstringDelta,
      ),
    },
    ...combatant.activeEffects
      .filter((effect) => effect.kind === "speedRatio")
      .map((effect) => ({
        kind: "ratio" as const,
        numerator: effect.numerator,
        denominator: effect.denominator,
      })),
    ...battleSlowSpeedChanges(combatant),
  ];
}

function battleSlowSpeedChanges(
  combatant: BattleCreatureState,
): readonly SpeedChange[] {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "saveGatedTurnConstraintBundle",
  )
    ? [
        {
          kind: "ratio",
          numerator: SLOW_ACTIVE_PENALTIES_SPEED_RATIO.numerator,
          denominator: SLOW_ACTIVE_PENALTIES_SPEED_RATIO.denominator,
        },
      ]
    : [];
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
  const activeForm = activeDruidWildShapeForm(combatant);
  const statBlockSpeeds =
    activeForm?.statBlock.speeds ??
    (combatant.origin.kind === "statBlock"
      ? combatant.origin.mechanics.speeds
      : null);
  if (statBlockSpeeds !== null) {
    for (const speed of statBlockSpeeds) {
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
    combatant.activeEffects.some((effect) => effect.kind === "selfSpeedZero") ||
    combatant.activeEffects.some(
      (effect) => effect.kind === "spellSpeedZero",
    ) ||
    combatant.activeEffects.some(
      (effect) => effect.kind === "saveGatedAreaControlControl",
    ) ||
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
  const activeForm = activeDruidWildShapeForm(combatant);
  const statBlockSpeeds =
    activeForm?.statBlock.speeds ??
    (combatant.origin.kind === "statBlock"
      ? combatant.origin.mechanics.speeds
      : null);
  if (statBlockSpeeds !== null) {
    for (const speed of statBlockSpeeds) {
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
  return speed.feet.kind === "literal" && isBattleSpecialSpeedKind(speed.kind);
}

function isBattleSpecialSpeedKind(
  kind: SpeedType,
): kind is BattleSpecialSpeedKind {
  return BATTLE_SPECIAL_SPEED_KINDS.some((candidate) => candidate === kind);
}

export function passiveSpeedKindGrantKinds(
  combatant: BattleCreatureState,
): readonly PassiveSpeedKindGrantKind[] {
  if (combatant.origin.kind !== "character") {
    return [];
  }
  const kinds = new Set<PassiveSpeedKindGrantKind>();
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "passiveSpeedKindGrants"
    ) {
      const facts =
        procedure.kind === "unitFeature"
          ? procedure.execution.speedKindGrants
          : procedure.execution;
      for (const grant of facts.grants) kinds.add(grant.speedKind);
    }
  }
  return PASSIVE_SPEED_KIND_GRANT_KINDS.filter((kind) => kinds.has(kind));
}

export function passiveSpeedBonusDelta(
  state: BattleState,
  combatant: BattleCreatureState,
): number {
  if (combatant.origin.kind !== "character") {
    return 0;
  }
  let total = 0;
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind !== "unitFeature" &&
        procedure.kind !== "unitSupportProfile") ||
      typeof procedure.execution !== "object"
    ) {
      continue;
    }
    const speed =
      procedure.execution.kind === "passiveSpeedBonus"
        ? procedure.kind === "unitFeature"
          ? procedure.execution.speed
          : procedure.execution
        : procedure.execution.kind === "passiveSpeedKindGrants"
          ? procedure.kind === "unitFeature"
            ? procedure.execution.speedKindGrants.speed
            : procedure.execution.speed
          : undefined;
    if (
      speed !== undefined &&
      passiveSpeedBonusConditionApplies(state, combatant, speed.condition)
    ) {
      total += Number(speed.deltaFeet);
    }
  }
  return total;
}

function passiveSpeedBonusConditionApplies(
  state: BattleState,
  combatant: BattleCreatureState,
  condition: PassiveSpeedBonusCondition,
): boolean {
  return Match.value(condition).pipe(
    Match.when(
      { kind: "notWearingArmor" },
      ({ categories }) =>
        !categories.some((category) =>
          combatantWearingArmorCategory(state, combatant, category),
        ),
    ),
    Match.when(
      { kind: "unarmoredUnshielded" },
      () =>
        !combatantWearingArmor(state, combatant) &&
        !combatantWieldingShield(state, combatant),
    ),
    Match.exhaustive,
  );
}
