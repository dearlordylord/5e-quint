import { characterId } from "@dnd/battle-runtime";
import {
  discoverCreationHoles,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
} from "@dnd/character-sheet-runtime";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  battleStateWithCombatant,
  createFighterLifecycleDraft,
  createFighterLifecycleSheet,
  fighterLifecycleCharacterCombatantId,
  fighterLifecycleSettledHp,
  fighterLifecycleSheetMaximumHp,
  fighterLifecycleUnitLibrary,
  finalizeFighterLifecycleDraft,
  requireLifecycleCharacterCombatant,
  requireRight,
  resolveFighterLifecycleSkeletonShortswordAttack,
  startFighterLifecycleBattle,
  type LifecycleCharacterBattleCombatant,
} from "./fighter-character-lifecycle-test-support.ts";
import { settleCharacterSheetFromBattle } from "./index.ts";

describe("Fighter character lifecycle composition", () => {
  it("creates, projects, resolves battle, and settles through source-owned boundaries", () => {
    const draft = createFighterLifecycleDraft();
    expect(
      discoverCreationHoles({
        draft,
        unitLibrary: fighterLifecycleUnitLibrary,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      finalizeCharacterDraft({
        draft,
        unitLibrary: fighterLifecycleUnitLibrary,
      }).tag,
    ).toBe("incomplete");

    const build = finalizeFighterLifecycleDraft(draft);
    const sheet = createFighterLifecycleSheet(build);
    expect(characterSheetCurrentHp(sheet)).toBe(fighterLifecycleSheetMaximumHp);
    expect(
      requireRight(
        characterSheetHitPointMaximum({
          sheet,
          unitLibrary: fighterLifecycleUnitLibrary,
        }),
      ),
    ).toBe(fighterLifecycleSheetMaximumHp);

    const battle = startFighterLifecycleBattle(sheet);
    const resolvedBattle = resolveFighterLifecycleSkeletonShortswordAttack(
      battle.state,
    );
    const combatant = requireLifecycleCharacterCombatant(
      resolvedBattle.combatants.get(fighterLifecycleCharacterCombatantId),
    );
    expect(Number(combatant.hp)).toBe(fighterLifecycleSettledHp);

    const settled = requireRight(
      settleCharacterSheetFromBattle({
        sheet,
        state: resolvedBattle,
        combatant,
        unitLibrary: fighterLifecycleUnitLibrary,
      }),
    );
    expect(characterSheetCurrentHp(settled)).toBe(fighterLifecycleSettledHp);
    expect(settled.build).toEqual(build);
  });

  it("rejects open draft finalization and mismatched character settlement", () => {
    const draft = createFighterLifecycleDraft();
    const openDraftFinalization = finalizeCharacterDraft({
      draft,
      unitLibrary: fighterLifecycleUnitLibrary,
    });
    expect(openDraftFinalization.tag).toBe("incomplete");

    const build = finalizeFighterLifecycleDraft(draft);
    const sheet = createFighterLifecycleSheet(build);
    const battle = startFighterLifecycleBattle(sheet);
    const wrongCharacterCombatant: LifecycleCharacterBattleCombatant = {
      ...battle.combatant,
      origin: {
        ...battle.combatant.origin,
        characterId: characterId("character:fighter-lifecycle-mismatch"),
      },
    };
    const settlement = settleCharacterSheetFromBattle({
      sheet,
      state: battleStateWithCombatant(battle.state, wrongCharacterCombatant),
      combatant: wrongCharacterCombatant,
      unitLibrary: fighterLifecycleUnitLibrary,
    });

    expect(Either.isLeft(settlement)).toBe(true);
    if (Either.isLeft(settlement)) {
      expect(settlement.left.message).toBe(
        "Battle handoff character identity does not match Character Sheet.",
      );
    }
  });
});
