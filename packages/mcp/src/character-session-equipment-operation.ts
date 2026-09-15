import {
  characterEquipmentItemId,
  parseCharacterEquipmentItemId,
  type CharacterEquipmentItemId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetEquipmentLoadoutIssueMessage,
  setCharacterSheetEquipmentLoadout,
  type CharacterSheetEquipmentLoadoutIssue,
  type CharacterSheetEquipmentLoadoutPatch,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import { Match, Result } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import type { CharacterToolResult } from "./character-tools.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

type EquipmentLoadoutPatchInput = {
  readonly armor?: string | null;
  readonly shield?: string | null;
  readonly weapon?: {
    readonly itemId: string;
    readonly grip: "one_handed";
  } | null;
  readonly offHandWeapon?: { readonly itemId: string } | null;
};

type EquipmentLoadoutOperationIssue =
  | {
      readonly tag: "equipmentItemReferenceInvalid";
      readonly slot: "armor" | "shield" | "main" | "off";
      readonly itemId: string;
    }
  | {
      readonly tag: "equipmentItemReferenceSlotMismatch";
      readonly slot: "armor" | "shield" | "main" | "off";
      readonly itemId: string;
    };

type CommitAvailableCharacterSheetOperation = (
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly sheet: AvailableCharacterSession;
    readonly build: CharacterBuild;
  },
) => CharacterToolResult;

export function applySetEquipmentLoadoutOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "setEquipmentLoadout" }
    >;
  },
  commit: CommitAvailableCharacterSheetOperation,
): CharacterToolResult {
  const patch = parseEquipmentLoadoutPatch(input.operation.loadout);
  if (Result.isFailure(patch)) {
    return characterSessionEquipmentOperationInvalid(
      input.characterId,
      patch.failure,
    );
  }
  const loadout = setCharacterSheetEquipmentLoadout({
    build: input.session.build,
    patch: patch.success,
    unitLibrary: root.unitLibrary,
  });
  if (Result.isFailure(loadout)) {
    return characterSessionEquipmentOperationInvalid(
      input.characterId,
      loadout.failure,
    );
  }
  return commit(root, {
    characterId: input.characterId,
    sheet: input.session,
    build: {
      ...input.session.build,
      equipment: {
        ...input.session.build.equipment,
        loadout: loadout.success,
      },
    },
  });
}

function parseEquipmentLoadoutPatch(
  input: EquipmentLoadoutPatchInput,
): Result.Result<
  CharacterSheetEquipmentLoadoutPatch,
  readonly [EquipmentLoadoutOperationIssue, ...EquipmentLoadoutOperationIssue[]]
> {
  const issues: EquipmentLoadoutOperationIssue[] = [];
  const armor = parseEquipmentLoadoutItemId(input.armor, "armor", issues);
  const shield = parseEquipmentLoadoutItemId(input.shield, "shield", issues);
  const weaponItemId = parseEquipmentLoadoutItemId(
    input.weapon?.itemId,
    "main",
    issues,
  );
  const offHandWeaponItemId = parseEquipmentLoadoutItemId(
    input.offHandWeapon?.itemId,
    "off",
    issues,
  );
  if (issues.length > 0) {
    return Result.fail([issues[0], ...issues.slice(1)]);
  }

  const patch: CharacterSheetEquipmentLoadoutPatch = {
    ...(Object.prototype.hasOwnProperty.call(input, "armor")
      ? input.armor === null
        ? { armor: null }
        : armor === undefined
          ? {}
          : { armor }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "shield")
      ? input.shield === null
        ? { shield: null }
        : shield === undefined
          ? {}
          : { shield }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "weapon")
      ? input.weapon === null
        ? { weapon: null }
        : weaponItemId === undefined
          ? {}
          : { weapon: { itemId: weaponItemId, grip: "one_handed" } }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "offHandWeapon")
      ? input.offHandWeapon === null
        ? { offHandWeapon: null }
        : offHandWeaponItemId === undefined
          ? {}
          : { offHandWeapon: { itemId: offHandWeaponItemId } }
      : {}),
  };
  return Result.succeed(patch);
}

function parseEquipmentLoadoutItemId<
  const Slot extends "armor" | "shield" | "main" | "off",
>(
  itemId: string | null | undefined,
  slot: Slot,
  issues: EquipmentLoadoutOperationIssue[],
): CharacterEquipmentItemId<Slot> | undefined {
  if (itemId === undefined || itemId === null) return undefined;
  const parsed = parseCharacterEquipmentItemId(itemId);
  if (Result.isFailure(parsed)) {
    issues.push({ tag: "equipmentItemReferenceInvalid", slot, itemId });
    return undefined;
  }
  const acceptedSourceSlot =
    slot === "main" || slot === "off"
      ? parsed.success.slot === "main" || parsed.success.slot === "off"
      : parsed.success.slot === slot;
  if (!acceptedSourceSlot) {
    issues.push({ tag: "equipmentItemReferenceSlotMismatch", slot, itemId });
    return undefined;
  }
  return characterEquipmentItemId({
    slot,
    unitId: parsed.success.unitId,
  });
}

function characterSessionEquipmentOperationInvalid(
  characterId: CharacterSheetId,
  failure:
    | readonly [
        EquipmentLoadoutOperationIssue,
        ...EquipmentLoadoutOperationIssue[],
      ]
    | readonly [
        CharacterSheetEquipmentLoadoutIssue,
        ...CharacterSheetEquipmentLoadoutIssue[],
      ],
) {
  const issues = failure.map((issue) =>
    "message" in issue
      ? {
          ...issue,
          message: characterSheetEquipmentLoadoutIssueMessage(issue),
        }
      : issue,
  );
  const message = issues.map(equipmentLoadoutIssueMessage).join(" ");
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId,
    message,
    issues,
  });
}

function equipmentLoadoutIssueMessage(
  issue: EquipmentLoadoutOperationIssue | CharacterSheetEquipmentLoadoutIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "equipmentItemReferenceInvalid" },
      (matched) => `Equipment item reference ${matched.itemId} is invalid.`,
    ),
    Match.when(
      { tag: "equipmentItemReferenceSlotMismatch" },
      (matched) =>
        `Equipment item reference ${matched.itemId} cannot fill the ${matched.slot} slot.`,
    ),
    Match.when({ tag: "emptyEquipmentLoadoutPatch" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "equipmentItemUnknown" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "equipmentItemNotOwned" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "equipmentItemWrongKind" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "armorTrainingRequired" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "shieldTrainingRequired" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "weaponCannotBeHeldOneHanded" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "shieldAndOffHandWeaponConflict" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "equipmentQuantityInsufficient" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.when({ tag: "armorTrainingUnavailable" }, (matched) =>
      characterSheetEquipmentLoadoutIssueMessage(matched),
    ),
    Match.exhaustive,
  );
}
