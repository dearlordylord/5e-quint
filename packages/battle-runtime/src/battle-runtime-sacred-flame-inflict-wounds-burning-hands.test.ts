import {
  startBattleRight,
  requireResolved,
  requireHole,
  targetFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  skeletonId,
  wizardId,
  secondSkeletonId,
  statBlockCatalog,
  battleId,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import type { BattleSubject } from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Sacred Flame, Inflict Wounds, and Burning Hands", () => {
  test("Sacred Flame uses a creature target before Dexterity Saving Throw damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sacred-flame"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("sacred_flame")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("sacred_flame");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Sacred Flame Saving Throw outcome",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Sacred Flame damage (1d8-radiant)",
    });
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 7),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });

    const success = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
        ]),
      ],
    });
    expect(success).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
  });

  test("Inflict Wounds spends a slot and applies half damage on a successful Constitution save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-inflict-wounds"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("inflict_wounds")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "inflict_wounds",
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Inflict Wounds damage (3d10-necrotic)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
          damageRollFillWithGroups(damage, [[5, 5, 5]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands uses self-origin Cone outcomes, Fire damage, slot scaling, and slot spend", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef("burning_hands", 2, "saveGatedDamage"),
      mode: { tag: "cast" },
    };
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Burning Hands self-origin Cone Saving Throw outcomes",
      ability: "dex",
      spell: {
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        damage: { expr: { dice: 4, dieSize: 6 }, damageType: "fire" },
        successDamage: "half",
        rangeFeet: 0,
      },
    });
    const saveFill = savingThrowOutcomeFill(savingThrows, [
      { targetId: skeletonId, succeeded: false },
      { targetId: secondSkeletonId, succeeded: true },
    ]);
    if (!("area" in saveFill.value)) {
      throw new Error("Expected area Saving Throw fill.");
    }
    expect(saveFill.value.area).toEqual({
      originAnchorId: wizardId,
      affectedTargetIds: [skeletonId, secondSkeletonId],
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Burning Hands damage (4d6-fire)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill, damageRollFillWithGroups(damage, [[3, 3, 3, 3]])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 1 },
          { combatantId: secondSkeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands rejects self-origin Cone outcomes anchored to another combatant", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-invalid-origin"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: skeletonId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Self-origin Cone save-gate spell area must originate from the caster.",
    });
  });

  test("Burning Hands can resolve with an empty table-supplied Cone membership", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-empty-cone"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [savingThrowOutcomeFill(savingThrows, [])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
  });
});
