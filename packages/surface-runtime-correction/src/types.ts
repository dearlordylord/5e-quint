import { Brand } from "effect";

import type {
  ClassFeatureRecord,
  SpellRecord,
} from "@dnd/prototype-content-surface/surface/types";

import type { BattleSourceRef } from "#/battle-source-ref.ts";

export const AUTHORED_UNIT_IDS = [
  "cure_wounds",
  "fireball",
  "fighter_action_surge_l2",
] as const;
export type AuthoredUnitId = (typeof AUTHORED_UNIT_IDS)[number];

export type SurfaceUnit = SpellRecord | ClassFeatureRecord;

export type CreatureId = string;
type RuntimeUnitAccessId = string & Brand.Brand<"RuntimeUnitAccessId">;
const RuntimeUnitAccessId = Brand.nominal<RuntimeUnitAccessId>();
export const runtimeUnitAccessId: (s: string) => RuntimeUnitAccessId =
  RuntimeUnitAccessId;
export type { RuntimeUnitAccessId };

type CreatureBase = {
  readonly id: CreatureId;
  readonly name: string;
  readonly level: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly armorClass: number;
  readonly spellSaveDc: number | null;
  readonly spellcastingModifier: number | null;
  readonly authoredUnitIds: ReadonlyArray<AuthoredUnitId>;
};

export type CharacterSheetCreature = CreatureBase & {
  readonly sourceKind: "characterSheet";
  readonly className: "fighter" | "cleric" | "wizard";
};

export type StatBlockCreature = CreatureBase & {
  readonly sourceKind: "statBlock";
  readonly statBlockName: "ogre";
};

export type CreatureRosterEntry = CharacterSheetCreature | StatBlockCreature;

export type RuntimeUnitAccess = {
  readonly accessId: RuntimeUnitAccessId;
  readonly battleSourceRef: BattleSourceRef;
  readonly unit: SurfaceUnit;
};

export type CreatureRosterState = {
  readonly creatures: ReadonlyArray<CreatureRosterEntry>;
};

export type RosterAction =
  | {
      readonly tag: "levelUpCharacter";
      readonly creatureId: CreatureId;
      readonly newLevel: number;
    }
  | {
      readonly tag: "grantUnitToCharacter";
      readonly creatureId: CreatureId;
      readonly unitId: AuthoredUnitId;
    };
