import { Brand } from "effect";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type { InitiativeStack } from "@dnd/shared-algebras/initiative-algebra";
import { Integer } from "@dnd/shared/types";
import type { CreatureId, Hp, SpellSlots } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { ArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type { DeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";

export type ZeroHpLifecyclePolicy = "diesAtZeroHp" | "usesDeathSavingThrows";

export type UnitResourceKey = string & Brand.Brand<"UnitResourceKey">;
const UnitResourceKey = Brand.nominal<UnitResourceKey>();
export function unitResourceKey(
  creatureId: CreatureId,
  unitId: UnitRecord["id"],
): UnitResourceKey {
  return UnitResourceKey(`${creatureId}:${unitId}`);
}

export type SpellcastingAbilityModifier = Integer &
  Brand.Brand<"SpellcastingAbilityModifier">;
const SpellcastingAbilityModifier = Brand.all(
  Integer,
  Brand.nominal<SpellcastingAbilityModifier>(),
);
export function spellcastingAbilityModifier(
  value: number,
): SpellcastingAbilityModifier {
  return SpellcastingAbilityModifier(Math.floor(value));
}

export type CreatureState = {
  // invariant: hp can't be more than maxHp. for temp hp, there is a field
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly conditions: ConditionState;
  // carried through the rounds, into the next turn
  readonly hasReaction: boolean;
  readonly units: ReadonlyArray<UnitRecord>;
  readonly armorClass: ArmorClassState;
  readonly zeroHpLifecyclePolicy: ZeroHpLifecyclePolicy;
  readonly deathSaves: DeathSaveRuntimeState;
  readonly spellcastingAbilityModifier: SpellcastingAbilityModifier;
  readonly spellSlots: SpellSlots;
  readonly slotExpendedThisTurn: boolean;
  // invariant: current spell slots can't be larger than max
  readonly spellSlotsMax: SpellSlots;
};

export type State = {
  // round and turn encoded into initiative
  readonly initiative: InitiativeStack<CreatureId>;
  readonly combatants: ReadonlyMap<CreatureId, CreatureState>;

  // action economy
  // Available Action resources. The turn itself grants one, and Units such as
  // Action Surge can add restricted action resources using Surface restrictions.
  readonly actionResources: ReadonlyArray<RuntimeActionResource>;
  readonly currentHasBonusAction: boolean;
  // Creature-owned Units with Surface once-per-turn activation limits used during this turn.
  readonly unitActivationsThisTurn: ReadonlySet<UnitResourceKey>;
  // Creature-owned Unit use-count resources spent after the latest matching
  // Surface restore event, e.g. Short Rest, Long Rest, or dawn.
  readonly expendedUnitUseCounts: ReadonlyMap<UnitResourceKey, number>;
};
