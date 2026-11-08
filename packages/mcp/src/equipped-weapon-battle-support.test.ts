import assert from "node:assert/strict";
import { expect, test } from "vitest";
import { Option, Result, Schema } from "effect";
import { CharacterSessionDetailOutputSchema } from "./character-tool-output.ts";
import { characterFinalizationInput } from "./character-finalization-input.ts";
import { rebuildCharacterSheetForOperation } from "./character-session-sheet-rebuild.ts";
import {
  characterBuildCatalogEquipmentItem,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
} from "@dnd/character-creation-runtime";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "@dnd/character-creation-runtime/test-support";
import { unitId } from "@dnd/shared/game-facts";
import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";
import type { WeaponRecord } from "@dnd/surface/surface/types";
import { handleToolCall } from "./server.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { CHATGPT_EXECUTION_TOOLS } from "./chatgpt/tool-surface.ts";
import { jsonContentPayload } from "./tool-content.ts";

function fixture(includeSyntheticFlatWeapon = false) {
  const services = createMcpApplicationServices();
  const catalog = services.unitLibrary;
  const spearRecord = catalog.requireUnit("weapon_spear");
  assert(spearRecord.kind === "weapon");
  const flatWeapon = {
    ...spearRecord,
    id: unitId("weapon_synthetic_flat"),
    name: "Synthetic Flat Weapon",
    provenance: { kind: "synthetic-test", section: "synthetic-test" },
    damage: { kind: "flat", amount: 1, damageType: "piercing" },
    properties: [],
  } satisfies WeaponRecord;
  const root = createMcpPlaySessionRoot(
    includeSyntheticFlatWeapon
      ? {
          ...services,
          unitLibrary: {
            getUnit: (id) =>
              id === flatWeapon.id
                ? Option.some(flatWeapon)
                : catalog.getUnit(id),
            listUnits: () => [...catalog.listUnits(), flatWeapon],
            requireUnit: (id) =>
              id === flatWeapon.id ? flatWeapon : catalog.requireUnit(id),
          },
        }
      : services,
  );
  const draft = completeSupportedProgressionDraft({
    draftId: "draft:weapon-battle-disclosure",
    unitLibrary: root.unitLibrary,
    progression: testProgression(root.unitLibrary, unitId("class_rogue"), 3),
  });
  root.sessionStore.drafts.set(draft.draftId, draft);
  const finalized = handleToolCall(root, "finalize_character", {
    draftId: draft.draftId,
  });
  expect(finalized).not.toHaveProperty("isError", true);
  const characterId = characterIdFromDraftId(draft.draftId);
  const sheet = root.sessionStore.characters.get(characterId);
  assert(sheet?.tag === "available");
  const item = <const Slot extends "main" | "off">(
    weaponId: string,
    slot: Slot,
  ) => {
    const parsed = characterEquipmentItemUnitId(weaponId);
    assert(Result.isSuccess(parsed));
    return characterEquipmentItemId({ slot, unitId: parsed.success });
  };
  const dagger = item("weapon_dagger", "main");
  const spear = item("weapon_spear", "main");
  const quarterstaff = item("weapon_quarterstaff", "main");
  const offDagger = item("weapon_dagger", "off");
  const offFlatWeapon = item("weapon_synthetic_flat", "off");
  const mainFlatWeapon = item("weapon_synthetic_flat", "main");
  const owned = [
    dagger,
    spear,
    quarterstaff,
    offDagger,
    ...(includeSyntheticFlatWeapon ? [offFlatWeapon, mainFlatWeapon] : []),
  ].map((itemId) => characterBuildCatalogEquipmentItem({ itemId }));
  const withOwnedWeapons = rebuildCharacterSheetForOperation(root, {
    sheet,
    build: {
      ...sheet.build,
      equipment: { ...sheet.build.equipment, owned, loadout: {} },
    },
  });
  assert(Result.isSuccess(withOwnedWeapons));
  root.sessionStore.characters.set(withOwnedWeapons.success);
  const equip = (loadout: unknown) =>
    CHATGPT_EXECUTION_TOOLS.set_equipment_loadout.handle(root, {
      characterId,
      operation: { kind: "setEquipmentLoadout", loadout },
    });
  return {
    root,
    characterId,
    draft,
    dagger,
    spear,
    quarterstaff,
    offDagger,
    offFlatWeapon,
    mainFlatWeapon,
    equip,
  };
}

test("equipping an owned unsupported weapon discloses its canonical Battle blocker before starting Battle", () => {
  const { root, characterId, dagger, spear, quarterstaff, equip } = fixture();
  const equipped = equip({ weapon: { itemId: dagger, grip: "one_handed" } });
  expect(equipped, JSON.stringify(equipped)).not.toHaveProperty(
    "isError",
    true,
  );
  const payload = jsonContentPayload(equipped);
  expect(payload).toMatchObject({
    detail: {
      sheetProjection: {
        equippedWeaponBattleBlockers: [
          {
            slot: "main",
            itemId: dagger,
            weaponUnitId: "weapon_dagger",
            nextStep: {
              tag: "reviewWeaponDefinitionAdmittedOwnedAlternatives",
              itemIds: [spear, quarterstaff],
            },
            messages: expect.arrayContaining([
              expect.stringContaining(
                "referenced Weapon Mastery procedure is unsupported by Battle",
              ),
            ]),
          },
        ],
      },
    },
  });
  const retained = root.sessionStore.characters.get(characterId);
  assert(retained?.tag === "available");
  expect(retained.build.equipment.loadout.weapon?.itemId).toBe(dagger);
  const before = retained.build;
  const inspected = handleToolCall(root, "inspect_character_session", {
    characterId,
  });
  expect(jsonContentPayload(inspected)).toEqual(payload);
  const inspectedSheet = root.sessionStore.characters.get(characterId);
  assert(inspectedSheet?.tag === "available");
  expect(inspectedSheet.build).toEqual(before);
  const battleStart = handleToolCall(root, "start_battle", {
    battleId: "battle:weapon-disclosure",
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId,
        combatantId: "rogue",
        ammunitionStocks: [],
        initiative: 20,
      },
    ],
  });
  expect(battleStart).toHaveProperty("isError", true);
  const detail = Schema.decodeUnknownSync(CharacterSessionDetailOutputSchema)(
    payload,
  );
  assert(detail.detail.tag === "available");
  const [blocker] = detail.detail.sheetProjection.equippedWeaponBattleBlockers;
  assert(blocker !== undefined);
  const instructions = blocker.nextStep.instructions;
  expect(instructions).toContain("set_equipment_loadout");
  expect(instructions).toContain("apply_character_session_operation");
  expect(instructions).toContain("operation.kind setEquipmentLoadout");
  expect(JSON.stringify(jsonContentPayload(battleStart))).toContain(
    blocker.messages[0],
  );
  for (const itemId of [spear, quarterstaff]) {
    const replacement = equip({ weapon: { itemId, grip: "one_handed" } });
    expect(replacement).not.toHaveProperty("isError", true);
    expect(jsonContentPayload(replacement)).toMatchObject({
      detail: { sheetProjection: { equippedWeaponBattleBlockers: [] } },
    });
  }
  const successfulStart = handleToolCall(root, "start_battle", {
    battleId: "battle:admitted-weapon",
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId,
        combatantId: "rogue",
        ammunitionStocks: [],
        initiative: 20,
      },
    ],
  });
  expect(successfulStart, JSON.stringify(successfulStart)).not.toHaveProperty(
    "isError",
    true,
  );
});

test("off-hand blockers have no invented alternatives and clearing a slot removes its blocker", () => {
  const { root, characterId, offDagger, equip } = fixture();
  const equipped = equip({ offHandWeapon: { itemId: offDagger } });
  expect(equipped, JSON.stringify(equipped)).not.toHaveProperty(
    "isError",
    true,
  );
  expect(jsonContentPayload(equipped)).toMatchObject({
    detail: {
      sheetProjection: {
        equippedWeaponBattleBlockers: [
          {
            slot: "offHand",
            itemId: offDagger,
            nextStep: { tag: "inspectCatalogForAdmittedWeapon" },
          },
        ],
      },
    },
  });
  const cleared = equip({ offHandWeapon: null });
  expect(cleared).not.toHaveProperty("isError", true);
  expect(jsonContentPayload(cleared)).toMatchObject({
    detail: { sheetProjection: { equippedWeaponBattleBlockers: [] } },
  });
  const clearedSheet = root.sessionStore.characters.get(characterId);
  assert(clearedSheet?.tag === "available");
  expect(clearedSheet.build.equipment.loadout.offHandWeapon).toBeUndefined();
});

test("creation finalization guidance discloses an already-selected weapon before sheet initialization", () => {
  const { root, characterId, draft, dagger, equip } = fixture();
  const equipped = Schema.decodeUnknownSync(CharacterSessionDetailOutputSchema)(
    jsonContentPayload(
      equip({ weapon: { itemId: dagger, grip: "one_handed" } }),
    ),
  );
  assert(equipped.detail.tag === "available");
  const sheet = root.sessionStore.characters.get(characterId);
  assert(sheet?.tag === "available");
  const guidance = characterFinalizationInput({
    root,
    draftId: draft.draftId,
    finalization: { tag: "ready", build: sheet.build },
  });
  assert(Result.isSuccess(guidance));
  assert(guidance.success !== null);
  expect(guidance.success.equippedWeaponBattleBlockers).toEqual(
    equipped.detail.sheetProjection.equippedWeaponBattleBlockers,
  );
  expect(guidance.success.equippedWeaponBattleBlockers).toHaveLength(1);
  expect(guidance.success.instructions.join(" ")).toContain(
    "before planning an encounter",
  );
});

test("synthetic off-hand flat-damage weapons disclose the same slot-specific rejection as Battle entry while main-hand behavior is preserved", () => {
  const { root, characterId, offFlatWeapon, mainFlatWeapon, equip } =
    fixture(true);
  const equipped = equip({ offHandWeapon: { itemId: offFlatWeapon } });
  expect(equipped, JSON.stringify(equipped)).not.toHaveProperty(
    "isError",
    true,
  );
  const detail = Schema.decodeUnknownSync(CharacterSessionDetailOutputSchema)(
    jsonContentPayload(equipped),
  );
  assert(detail.detail.tag === "available");
  const blockers = detail.detail.sheetProjection.equippedWeaponBattleBlockers;
  expect(blockers).toMatchObject([
    {
      slot: "offHand",
      itemId: offFlatWeapon,
      messages: ["Off-hand weapon loadout must reference a Weapon Unit."],
    },
  ]);
  const battleStart = handleToolCall(root, "start_battle", {
    battleId: "battle:off-hand-flat-weapon",
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId,
        combatantId: "rogue",
        ammunitionStocks: [],
        initiative: 20,
      },
    ],
  });
  expect(battleStart).toHaveProperty("isError", true);
  expect(JSON.stringify(jsonContentPayload(battleStart))).toContain(
    blockers[0]?.messages[0],
  );
  const main = equip({
    weapon: { itemId: mainFlatWeapon, grip: "one_handed" },
    offHandWeapon: null,
  });
  expect(main).not.toHaveProperty("isError", true);
  expect(jsonContentPayload(main)).toMatchObject({
    detail: { sheetProjection: { equippedWeaponBattleBlockers: [] } },
  });
});
