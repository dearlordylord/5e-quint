// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION

import { damageAmount, Hp, type DamageType } from "@dnd/shared/types";
import { Match } from "effect";
import type { BattleObjectId } from "../identity.ts";
import type {
  BattleObjectDamageComponent,
  BattleObjectDamageDisposition,
  BattleObjectDamageOutcome,
} from "../battle-state-execution.ts";
import { damageAmountByTypeMapEntries } from "./damage-helpers.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

const OBJECT_DAMAGE_IMMUNITIES = [
  "poison",
  "psychic",
] as const satisfies ReadonlyArray<DamageType>;

export type BattleObjectDamageComponentInput = Readonly<{
  readonly damageType: DamageType;
  readonly amount: number;
}>;

export type BattleObjectDamageComponentsResult =
  | Readonly<{
      readonly tag: "components";
      readonly components: ReadonlyNonEmptyArray<BattleObjectDamageComponentInput>;
    }>
  | Readonly<{ readonly tag: "emptyDamageByType" }>;

export function objectDamageComponentsFromMap(
  damageByType: ReadonlyMap<DamageType, number>,
): BattleObjectDamageComponentsResult {
  const entries = damageAmountByTypeMapEntries(damageByType);
  const [first, ...remaining] = entries;
  return first === undefined
    ? { tag: "emptyDamageByType" }
    : { tag: "components", components: [first, ...remaining] };
}

export function objectDamageOutcomeFromComponents(input: {
  readonly objectId: BattleObjectId;
  readonly components: ReadonlyNonEmptyArray<BattleObjectDamageComponentInput>;
  readonly disposition: BattleObjectDamageDisposition;
}): BattleObjectDamageOutcome {
  const [firstInput, ...remainingInputs] = input.components;
  const components: ReadonlyNonEmptyArray<BattleObjectDamageComponent> = [
    {
      damageType: firstInput.damageType,
      rolledDamage: damageAmount(firstInput.amount),
    },
    ...remainingInputs.map(({ damageType, amount }) => ({
      damageType,
      rolledDamage: damageAmount(amount),
    })),
  ];
  const rolledDamage = input.components.reduce(
    (total, entry) => total + entry.amount,
    0,
  );
  const damageAfterObjectImmunities = input.components.reduce(
    (total, entry) =>
      objectDamageTypeIsImmune(entry.damageType) ? total : total + entry.amount,
    0,
  );
  return Match.value(input.disposition).pipe(
    Match.when({ kind: "tableResolved" }, () => ({
      kind: "tableResolved" as const,
      objectId: input.objectId,
      components,
      rolledDamage: damageAmount(rolledDamage),
    })),
    Match.when({ kind: "hitPoints" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        components,
        rolledDamage,
        damageAfterObjectImmunities,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: null,
      }),
    ),
    Match.when({ kind: "hitPointsWithDamageThreshold" }, (disposition) =>
      objectHitPointDamageOutcome({
        objectId: input.objectId,
        components,
        rolledDamage,
        damageAfterObjectImmunities,
        priorHitPoints: disposition.hitPoints,
        damageThreshold: disposition.damageThreshold,
      }),
    ),
    Match.exhaustive,
  );
}

function objectHitPointDamageOutcome(input: {
  readonly objectId: BattleObjectId;
  readonly components: BattleObjectDamageOutcome["components"];
  readonly rolledDamage: number;
  readonly damageAfterObjectImmunities: number;
  readonly priorHitPoints: Hp;
  readonly damageThreshold: import("@dnd/shared/types").DamageAmount | null;
}): Extract<BattleObjectDamageOutcome, { readonly kind: "hitPoints" }> {
  const thresholdBlocksDamage =
    input.damageThreshold !== null &&
    input.damageAfterObjectImmunities < Number(input.damageThreshold);
  const effectiveDamage = thresholdBlocksDamage
    ? 0
    : input.damageAfterObjectImmunities;
  const nextHitPoints = Hp(
    Math.max(0, Number(input.priorHitPoints) - effectiveDamage),
  );
  return {
    kind: "hitPoints",
    objectId: input.objectId,
    components: input.components,
    rolledDamage: damageAmount(input.rolledDamage),
    damageAfterImmunities: damageAmount(input.damageAfterObjectImmunities),
    damageThreshold: input.damageThreshold,
    effectiveDamage: damageAmount(effectiveDamage),
    priorHitPoints: input.priorHitPoints,
    nextHitPoints,
    destroyed: nextHitPoints === 0,
  };
}

function objectDamageTypeIsImmune(damageType: DamageType): boolean {
  return OBJECT_DAMAGE_IMMUNITIES.some(
    (immuneDamageType): boolean => immuneDamageType === damageType,
  );
}
