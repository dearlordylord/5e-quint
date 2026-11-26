// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import {
  effectiveSpeed as sharedEffectiveSpeed,
  type CreatureSpeedFacts,
  type SpecialSpeedCandidate,
} from "@dnd/shared-algebras/speed-algebra";
import type { SpeedType } from "@dnd/shared/game-facts";
import type { BattleDruidWildShapeKnownFormRuntime } from "../druid-wild-shape-known-form-runtime.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BATTLE_SPECIAL_SPEED_KINDS,
  type BattleMovementSpeedKind,
  type BattleSpecialSpeedKind,
} from "../battle-subjects.ts";
import {
  PASSIVE_SPEED_KIND_GRANT_KINDS,
  type PassiveSpeedKindGrantKind,
} from "../unit-feature-execution-constants.ts";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import { activeDruidWildShapeForm } from "./druid-wild-shape.ts";
import { selfTransformationModeSpecialSpeedKind } from "./self-transformation-speed.ts";
import {
  speedChangesFromContributions,
  speedContributions,
  speedIsZeroFromContributions,
} from "./speed-collector.ts";

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
): MovementFeet {
  return effectiveMovementSpeed(state, combatant, "walk");
}

export function effectiveMovementSpeed(
  state: BattleState,
  combatant: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
): MovementFeet {
  return (
    sharedEffectiveSpeed(
      battleCreatureSpeedFacts(state, combatant),
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
  return literalWalkSpeed(combatant.origin.mechanics.speeds);
}

function druidWildShapeWalkSpeed(
  form: BattleDruidWildShapeKnownFormRuntime,
): number {
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
): CreatureSpeedFacts {
  const contributions = speedContributions(state, combatant);
  return {
    ordinarySpeedFeet: movementFeet(baseWalkSpeed(combatant)),
    speedChanges: speedChangesFromContributions(contributions),
    specialSpeeds: battleSpecialSpeedCandidates(combatant),
    terminalSpeedZero: speedIsZeroFromContributions(contributions),
  };
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
