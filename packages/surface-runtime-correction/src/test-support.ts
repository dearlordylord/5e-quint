import { Effect, Layer } from "effect";

import { SurfaceUnitLibraryLive } from "#/authored-library.ts";
import { projectRosterToBattle } from "#/battle.ts";
import { RuntimeUnitLibraryLive } from "#/hydration.ts";
import type { BattleState, CreatureRosterState } from "#/index.ts";

export const SurfaceRuntimeCorrectionTestLayer = RuntimeUnitLibraryLive.pipe(
  Layer.provide(SurfaceUnitLibraryLive),
);

export const initialRoster: CreatureRosterState = {
  creatures: [
    {
      id: "fighter",
      name: "Brakka",
      sourceKind: "characterSheet",
      className: "fighter",
      level: 1,
      currentHp: 20,
      maxHp: 20,
      armorClass: 16,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
    {
      id: "cleric",
      name: "Mira",
      sourceKind: "characterSheet",
      className: "cleric",
      level: 3,
      currentHp: 18,
      maxHp: 18,
      armorClass: 15,
      spellSaveDc: 14,
      spellcastingModifier: 3,
      authoredUnitIds: ["cure_wounds"],
    },
    {
      id: "ogre",
      name: "Ogre",
      sourceKind: "statBlock",
      statBlockName: "ogre",
      level: 2,
      currentHp: 59,
      maxHp: 59,
      armorClass: 11,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
  ],
};

export const promptRoster: CreatureRosterState = {
  creatures: [
    {
      id: "fighter",
      name: "Brakka",
      sourceKind: "characterSheet",
      className: "fighter",
      level: 2,
      currentHp: 20,
      maxHp: 20,
      armorClass: 16,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: ["fighter_action_surge_l2"],
    },
    {
      id: "cleric",
      name: "Mira",
      sourceKind: "characterSheet",
      className: "cleric",
      level: 3,
      currentHp: 9,
      maxHp: 18,
      armorClass: 15,
      spellSaveDc: 14,
      spellcastingModifier: 3,
      authoredUnitIds: ["cure_wounds"],
    },
    {
      id: "wizard",
      name: "Nyra",
      sourceKind: "characterSheet",
      className: "wizard",
      level: 5,
      currentHp: 22,
      maxHp: 22,
      armorClass: 12,
      spellSaveDc: 15,
      spellcastingModifier: 4,
      authoredUnitIds: ["fireball"],
    },
    {
      id: "ogre",
      name: "Ogre",
      sourceKind: "statBlock",
      statBlockName: "ogre",
      level: 2,
      currentHp: 59,
      maxHp: 59,
      armorClass: 11,
      spellSaveDc: null,
      spellcastingModifier: null,
      authoredUnitIds: [],
    },
  ],
};

export function projectPromptBattle(): BattleState {
  return Effect.runSync(
    projectRosterToBattle(promptRoster, {
      initiativeCounts: [
        { actorId: "wizard", count: 18 },
        { actorId: "fighter", count: 16 },
        { actorId: "cleric", count: 12 },
        { actorId: "ogre", count: 9 },
      ],
      tieResolutions: [],
    }).pipe(Effect.provide(SurfaceRuntimeCorrectionTestLayer)),
  );
}
