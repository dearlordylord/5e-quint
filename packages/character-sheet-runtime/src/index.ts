import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { Hp, ResourceCount, SpellSlotLevel } from "@dnd/shared/types";
import { Brand } from "effect";

export type CharacterSheetId = string & Brand.Brand<"CharacterSheetId">;
const CharacterSheetId = Brand.nominal<CharacterSheetId>();

export function characterSheetId(value: string): CharacterSheetId {
  return CharacterSheetId(value);
}

export type CharacterSheet = {
  readonly characterId: CharacterSheetId;
  readonly build: CharacterBuild;
  readonly hitPoints: CharacterSheetHitPoints;
  readonly spellSlotExpenditures?: readonly CharacterSpellSlotExpenditure[];
};

export type CharacterSheetHitPoints =
  | { readonly tag: "positive"; readonly currentHp: Hp }
  | { readonly tag: "knockedOut" }
  | {
      readonly tag: "zero";
      readonly lifecycle: CharacterSheetZeroHpLifecycle;
    };

export type CharacterSheetPendingDeathSaves = {
  readonly successes: 0 | 1 | 2;
  readonly failures: 0 | 1 | 2;
};

export type CharacterSheetDeadDeathSaves = {
  readonly successes: 0 | 1 | 2;
  readonly failures: 3;
};

export type CharacterSheetZeroHpLifecycle =
  | {
      readonly tag: "unstable";
      readonly deathSaves: CharacterSheetPendingDeathSaves;
    }
  | {
      readonly tag: "stable";
      readonly recovery: { readonly kind: "regains1HpAfter1d4Hours" };
    }
  | {
      readonly tag: "dead";
      readonly deathSaves: CharacterSheetDeadDeathSaves;
    };

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};
