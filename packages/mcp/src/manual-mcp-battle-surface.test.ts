import { describe, expect, test } from "vitest";
import { Brand, Either } from "effect";

import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  battleCreatureInitFromStatBlock,
  battleId,
  battleObjectId,
  admitCharacterWeaponAttackExecutionWeapon,
  characterId,
  combatantId,
  initiativeScore,
  startBattle,
  type BattleCreatureInit,
  type BattleRuntimeSession,
  type BattleUnitRef,
  type CharacterBattleClassLevelInits,
  type CharacterWeaponAttackActionOption,
} from "@dnd/battle-runtime";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import {
  abilityModifier as armorAbilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { createMcpCompositionRoot, handleToolCall } from "./server.ts";
import type { BattleToolResult } from "./battle-tools.ts";

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");
const allyId = combatantId("ally");

describe("manual MCP battle surface coverage", () => {
  test("rejects a weapon attack without its authored presentation source", () => {
    const root = createMcpCompositionRoot();
    const result = startBattle({
      battleId: battleId("battle-missing-weapon-presentation"),
      combatants: [
        character(root, {
          combatantId: fighterId,
          initiative: 20,
          omitWeaponPresentationSources: true,
        }),
        statBlock(root, { combatantId: goblinId, initiative: 10 }),
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.message).toBe(
      "Character fighter weapon weapon_longsword has missing authored presentation source.",
    );
  });

  test("uses Bardic Inspiration grant through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Bard",
        initiative: 20,
        classLevels: [{ className: "bard", level: 1 }],
        attack: null,
        resources: [
          {
            unit: root.unitLibrary.requireUnit("bard_bardic_inspiration"),
            capAbilityModifier: abilityModifier(3),
          },
        ],
        characterUnitRefs: [
          {
            unit: root.unitLibrary.requireUnit("bard_bardic_inspiration"),
            supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
          },
        ],
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
    ]);

    const act = requireUnitAct(root, "bard_bardic_inspiration");
    const target = requireHole(act.initialHoles, "targetChoice");
    const afterGrant = call(root, "fill_battle_hole", {
      subject: act.subject,
      fill: {
        kind: "targetChoice",
        holeId: target.holeId,
        value: "goblin",
        spatialFacts: [
          {
            kind: "bardicInspirationTargetWithinRange",
            bardId: "fighter",
            targetId: "goblin",
            sourceProcedureRef: act.subject.procedureRef,
            rangeFeet: 60,
          },
        ],
      },
    });

    expect(afterGrant.result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });
    expect(afterGrant.result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: "fighter",
          origin: expect.objectContaining({
            kind: "character",
            resources: expect.arrayContaining([
              expect.objectContaining({
                resourcePoolRef: resourcePoolRefForUnit(
                  root,
                  fighterId,
                  "bard_bardic_inspiration",
                ),
                usesRemaining: 2,
              }),
            ]),
          }),
        }),
      ]),
    );
    expect(
      root.sessionStore.battleSession?.state.combatants
        .get(goblinId)
        ?.activeEffects.some(
          (effect) => effect.kind === "bardicInspirationDie",
        ),
    ).toBe(true);
  });

  test("uses Innate Sorcery activation and projected spell attack Advantage through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Sorcerer",
        initiative: 20,
        classLevels: [{ className: "sorcerer", level: 1 }],
        attack: null,
        resources: [
          { unit: root.unitLibrary.requireUnit("sorcerer_innate_sorcery") },
        ],
        characterUnitRefs: [
          {
            unit: root.unitLibrary.requireUnit("sorcerer_innate_sorcery"),
            supportProfiles: [],
          },
        ],
        spellcasting: spellcasting(root, {
          sourceClassName: "sorcerer",
          abilityModifier: 3,
          cantrips: ["sorcerous_burst"],
        }),
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
    ]);

    const innate = requireUnitAct(root, "sorcerer_innate_sorcery");
    const afterInnate = call(root, "resolve_battle_act", {
      subject: innate.subject,
    });
    expect(afterInnate.result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });

    const burst = requireSpellAct(root, "sorcerous_burst");
    const damageType = requireHole(burst.initialHoles, "damageTypeChoice");
    const target = requireHole(burst.initialHoles, "targetChoice");
    call(root, "fill_battle_hole", {
      subject: burst.subject,
      fill: {
        kind: "damageTypeChoice",
        holeId: damageType.holeId,
        value: "fire",
      },
    });
    const afterTarget = call(root, "fill_battle_hole", {
      subject: burst.subject,
      fill: spellTargetFill(
        target.holeId,
        "fighter",
        "goblin",
        burst.subject.procedureRef,
      ),
    });

    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({ kind: "attackRoll", rollMode: "advantage" }),
      ],
    });
  });

  test("uses Monk Martial Arts bonus Unarmed Strike through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Monk",
        initiative: 20,
        classLevels: [{ className: "monk", level: 1 }],
        attack: weaponAttack(root, "weapon_dagger", "dex", 3),
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_dagger",
            unitId: "weapon_dagger",
            grip: "one_handed",
          },
        },
        characterUnitRefs: [
          {
            unit: root.unitLibrary.requireUnit("monk_martial_arts"),
            supportProfiles: [MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE],
          },
        ],
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
    ]);

    const act = requireMechanicalAct(
      root,
      "bonusAction",
      "martialArtsUnarmedStrike",
    );
    const afterTarget = call(root, "fill_battle_hole", {
      subject: act.subject,
      fill: attackTargetFill(
        "battle:attack:target",
        "fighter",
        "goblin",
        act.subject,
      ),
    });
    const attackRoll = requireHole(afterTarget.result.holes, "attackRoll");
    const afterRoll = call(root, "fill_battle_hole", {
      subject: act.subject,
      fill: attackRollFill(attackRoll.holeId, 18, 12, attackRoll.rollMode),
    });
    const damage = requireHole(afterRoll.result.holes, "rolledDice");
    const afterDamage = call(root, "fill_battle_hole", {
      subject: act.subject,
      fill: rolledDiceFill(damage.holeId, [[4]]),
    });

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({ combatantId: "fighter" }),
          expect.objectContaining({ combatantId: "goblin", hp: 3 }),
        ],
        turn: { bonusActionAvailable: false },
      },
    });
  });

  test("uses Weapon Mastery Sap and Topple holes through MCP battle tools", () => {
    const sapRoot = createMcpCompositionRoot();
    sapRoot.sessionStore.battleSession = startBattleRight(sapRoot, [
      character(sapRoot, {
        combatantId: fighterId,
        initiative: 20,
        characterUnitRefs: [
          {
            unit: sapRoot.unitLibrary.requireUnit("mastery_sap"),
            supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
          },
        ],
        weaponMasteries: [{ weaponUnitId: "weapon_longsword" }],
      }),
      statBlock(sapRoot, { combatantId: goblinId, initiative: 10 }),
    ]);
    resolveAttack(sapRoot, "Longsword", "goblin", 18, 12, [[5]]);
    call(sapRoot, "end_turn", { actorId: "fighter" });
    const goblinAttack = requireAct(sapRoot, "Attack", "Scimitar");
    const afterGoblinTarget = call(sapRoot, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: attackTargetFill(
        "battle:attack:target",
        "goblin",
        "fighter",
        goblinAttack.subject,
      ),
    });
    expect(afterGoblinTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          rollMode: "disadvantage",
        }),
      ],
    });

    const toppleRoot = createMcpCompositionRoot();
    toppleRoot.sessionStore.battleSession = startBattleRight(toppleRoot, [
      character(toppleRoot, {
        combatantId: fighterId,
        initiative: 20,
        attack: weaponAttack(toppleRoot, "weapon_quarterstaff", "str", 3),
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_quarterstaff",
            unitId: "weapon_quarterstaff",
            grip: "one_handed",
          },
        },
        characterUnitRefs: [
          {
            unit: toppleRoot.unitLibrary.requireUnit("mastery_topple"),
            supportProfiles: [WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE],
          },
        ],
        weaponMasteries: [{ weaponUnitId: "weapon_quarterstaff" }],
      }),
      statBlock(toppleRoot, { combatantId: goblinId, initiative: 10 }),
    ]);
    const afterToppleRoll = resolveAttackThroughRoll(
      toppleRoot,
      "Quarterstaff",
      "goblin",
      18,
      12,
    );
    expect(afterToppleRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
  });

  test("uses Weapon Mastery Cleave decision through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        initiative: 20,
        attack: weaponAttack(root, "weapon_greataxe", "str", 3),
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_greataxe",
            unitId: "weapon_greataxe",
            grip: "two_handed",
          },
        },
        characterUnitRefs: [
          {
            unit: root.unitLibrary.requireUnit("mastery_cleave"),
            supportProfiles: [WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE],
          },
        ],
        weaponMasteries: [{ weaponUnitId: "weapon_greataxe" }],
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
      statBlock(root, {
        combatantId: allyId,
        displayName: "Second Goblin",
        initiative: 9,
      }),
    ]);

    const afterDamage = resolveAttack(
      root,
      "Greataxe",
      "goblin",
      18,
      12,
      [[6]],
      {
        cleaveSecondTargetId: "ally",
      },
    );
    const cleaveDecision = requireHole(
      afterDamage.result.holes,
      "unitFeatureDecision",
    );
    const afterCleaveDecision = call(root, "fill_battle_hole", {
      subject: afterDamage.result.subject,
      fill: {
        kind: "unitFeatureDecision",
        holeId: cleaveDecision.holeId,
        value: "use",
      },
    });
    if (afterCleaveDecision.result.tag === "invalid") {
      throw new Error(JSON.stringify(afterCleaveDecision.result));
    }
    expect(afterCleaveDecision.result).toMatchObject({ tag: "needsHoles" });
    const secondTarget = requireHole(
      afterCleaveDecision.result.holes,
      "targetChoice",
    );
    const afterSecondTarget = call(root, "fill_battle_hole", {
      subject: afterDamage.result.subject,
      fill: attackTargetFill(
        secondTarget.holeId,
        "fighter",
        "ally",
        afterDamage.result.subject,
        undefined,
        { firstTargetId: "goblin" },
      ),
    });
    expect(afterSecondTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          label: "Cleave attack roll",
        }),
      ],
    });
  });

  test("uses Armor of Shadows Mage Armor through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Warlock",
        initiative: 20,
        attack: null,
        armorClass: {
          ...defaultArmorClassState(),
          abilityModifiers: {
            ...defaultArmorClassState().abilityModifiers,
            dex: armorAbilityModifier(2),
          },
        },
        spellcasting: spellcasting(root, {
          sourceClassName: "warlock",
          abilityModifier: 3,
          invocationSpellAccesses: [
            { tag: "armorOfShadowsMageArmor", spellId: "mage_armor" },
          ],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
    ]);

    const act = requireSpellAct(root, "mage_armor");
    expect(act.summary).toBe("Use Mage Armor.");
    const target = requireHole(act.initialHoles, "targetChoice");
    const afterTarget = call(root, "fill_battle_hole", {
      subject: act.subject,
      fill: spellTargetFill(
        target.holeId,
        "fighter",
        "fighter",
        act.subject.procedureRef,
      ),
    });

    expect(afterTarget.result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { spellSlotUsesThisTurn: [] } },
    });
    expect(afterTarget.result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: "fighter", armorClass: 15 }),
      ]),
    );
    const warlock =
      root.sessionStore.battleSession?.state.combatants.get(fighterId);
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") return;
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
  });

  test("uses Shield triggered reaction through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      statBlock(root, { combatantId: goblinId, initiative: 20 }),
      character(root, {
        combatantId: fighterId,
        displayName: "Shield Caster",
        initiative: 10,
        attack: null,
        spellcasting: spellcasting(root, {
          sourceClassName: "wizard",
          abilityModifier: 3,
          preparedSpells: ["shield"],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
    ]);

    const goblinAttack = requireAct(root, "Attack", "Scimitar");
    const afterTarget = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: attackTargetFill(
        "battle:attack:target",
        "goblin",
        "fighter",
        goblinAttack.subject,
      ),
    });
    const attackRoll = requireHole(afterTarget.result.holes, "attackRoll");
    const afterAttackRoll = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: attackRollFill(attackRoll.holeId, 14, 10, attackRoll.rollMode),
    });

    expect(afterAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "interruptDecision" })],
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    const reactionHole = requireHole(
      afterAttackRoll.result.holes,
      "interruptDecision",
    );
    const shieldChoice = requireTriggeredSpellChoice(
      afterAttackRoll,
      "fighter",
      "shield",
    );

    const afterShield = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: {
        kind: "interruptDecision",
        holeId: reactionHole.holeId,
        value: {
          kind: "resolve",
          responderId: "fighter",
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: shieldChoice.subject.procedureRef,
            fills: [],
          },
        },
      },
    });

    expect(afterShield.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({ combatantId: "goblin" }),
          expect.objectContaining({
            combatantId: "fighter",
            armorClass: 15,
            hp: 12,
            reactionAvailable: false,
            origin: expect.objectContaining({
              kind: "character",
              spellcasting: expect.objectContaining({
                spellSlots: [{ spellLevel: 1, count: 1, expended: 1 }],
              }),
            }),
          }),
        ],
      },
    });
  });

  test("uses Hellish Rebuke after-damage reaction through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      statBlock(root, { combatantId: goblinId, initiative: 20 }),
      character(root, {
        combatantId: fighterId,
        displayName: "Hellish Rebuke Caster",
        initiative: 10,
        attack: null,
        spellcasting: spellcasting(root, {
          sourceClassName: "warlock",
          abilityModifier: 3,
          preparedSpells: ["hellish_rebuke"],
          slots: [
            { spellLevel: 1, count: 1 },
            { spellLevel: 2, count: 1 },
          ],
        }),
      }),
    ]);

    const goblinAttack = requireAct(root, "Attack", "Scimitar");
    const hellishRebukeProcedureRef = spellProcedureRef(
      root,
      fighterId,
      "hellish_rebuke",
      2,
    );
    const afterTarget = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
        spatialFacts: [
          {
            kind: "attackTargetInMeleeReach",
            actorId: "goblin",
            targetId: "fighter",
            procedureRef: goblinAttack.subject.procedureRef,
          },
          {
            kind: "reactionSpellDamagerVisibleWithinRange",
            reactorId: "fighter",
            damageSourceId: "goblin",
            sourceProcedureRef: hellishRebukeProcedureRef,
            rangeFeet: 60,
          },
        ],
      },
    });
    const attackRoll = requireHole(afterTarget.result.holes, "attackRoll");
    const afterAttackRoll = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: attackRollFill(attackRoll.holeId, 18, 12, attackRoll.rollMode),
    });
    const attackDamage = requireHole(
      afterAttackRoll.result.holes,
      "rolledDice",
    );
    const afterDamage = call(root, "fill_battle_hole", {
      subject: goblinAttack.subject,
      fill: rolledDiceFill(attackDamage.holeId, [[1]]),
    });

    expect(afterDamage.result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "interruptDecision" })],
      snapshot: { pendingInterrupt: { trigger: "afterDamage" } },
    });
    const hellishChoice = requireTriggeredSpellChoice(
      afterDamage,
      "fighter",
      "hellish_rebuke",
      2,
    );
    const save = requireHole(hellishChoice.initialHoles, "savingThrowOutcome");
    const damage = requireHole(hellishChoice.initialHoles, "rolledDice");
    const reactionHole = requireHole(
      afterDamage.result.holes,
      "interruptDecision",
    );
    const afterHellishRebuke = call(root, "fill_battle_hole", {
      subject: afterDamage.result.subject ?? goblinAttack.subject,
      fill: {
        kind: "interruptDecision",
        holeId: reactionHole.holeId,
        value: {
          kind: "resolve",
          responderId: "fighter",
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: hellishChoice.subject.procedureRef,
            fills: [
              {
                kind: "savingThrowOutcome",
                holeId: save.holeId,
                value: { outcomes: [{ targetId: "goblin", succeeded: false }] },
              },
              rolledDiceFill(damage.holeId, [[1, 1, 1]]),
            ],
          },
        },
      },
    });
    if (afterHellishRebuke.result.tag === "invalid") {
      throw new Error(JSON.stringify(afterHellishRebuke.result));
    }

    expect(afterHellishRebuke.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({ combatantId: "goblin", hp: 7 }),
          expect.objectContaining({
            combatantId: "fighter",
            hp: 9,
            reactionAvailable: false,
          }),
        ],
      },
    });
  });

  test("uses Feather Fall falling-trigger reaction through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Feather Fall Caster",
        initiative: 20,
        attack: null,
        spellcasting: spellcasting(root, {
          sourceClassName: "wizard",
          abilityModifier: 3,
          preparedSpells: ["feather_fall"],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlock(root, {
        combatantId: allyId,
        displayName: "Falling Ally",
        initiative: 10,
      }),
    ]);

    const featherFallProcedureRef = spellProcedureRef(
      root,
      fighterId,
      "feather_fall",
    );
    const falling = call(root, "resolve_battle_act", {
      subject: {
        tag: "runtimeCommand",
        actorId: "fighter",
        command: "creatureFalls",
        fallingCreatureId: "ally",
      },
      reactionSpellTargetFacts: [
        {
          kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange",
          reactorId: "fighter",
          fallingCreatureId: "ally",
          sourceProcedureRef: featherFallProcedureRef,
          rangeFeet: 60,
        },
      ],
    });

    expect(falling.result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "interruptDecision" })],
      snapshot: { pendingInterrupt: { trigger: "creatureFalls" } },
    });
    const featherFallChoice = requireTriggeredSpellChoice(
      falling,
      "fighter",
      "feather_fall",
    );
    const targetList = requireHole(
      featherFallChoice.initialHoles,
      "spellTargetList",
    );
    const reactionHole = requireHole(falling.result.holes, "interruptDecision");
    const resolved = call(root, "fill_battle_hole", {
      subject: falling.result.subject,
      fill: {
        kind: "interruptDecision",
        holeId: reactionHole.holeId,
        value: {
          kind: "resolve",
          responderId: "fighter",
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: featherFallChoice.subject.procedureRef,
            fills: [
              {
                kind: "spellTargetList",
                holeId: targetList.holeId,
                value: { targetIds: ["ally"] },
                spatialFacts: [
                  {
                    kind: "featherFallTargetFallingWithinRange",
                    casterId: "fighter",
                    targetId: "ally",
                    sourceProcedureRef: featherFallProcedureRef,
                    rangeFeet: 60,
                  },
                ],
              },
            ],
          },
        },
      },
    });
    expect(resolved.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: "fighter",
            reactionAvailable: false,
          }),
          expect.objectContaining({ combatantId: "ally" }),
        ],
      },
    });
    expect(
      root.sessionStore.battleSession?.state.combatants
        .get(allyId)
        ?.activeEffects.some(
          (effect) => effect.kind === "featherFallMitigation",
        ),
    ).toBe(true);
  });

  test("retains Pact of the Chain and uses Pact of the Tome cantrips through MCP battle tools", () => {
    const chainRoot = createMcpCompositionRoot();
    chainRoot.sessionStore.battleSession = startBattleRight(chainRoot, [
      character(chainRoot, {
        combatantId: fighterId,
        displayName: "Pact of the Chain Warlock",
        initiative: 20,
        attack: null,
        spellcasting: spellcasting(chainRoot, {
          sourceClassName: "warlock",
          abilityModifier: 3,
          invocationSpellAccesses: [
            { tag: "pactOfTheChainFindFamiliar", spellId: "find_familiar" },
          ],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
    ]);
    const chainSession = chainRoot.sessionStore.battleSession;
    const chainWarlock = chainSession?.state.combatants.get(fighterId);
    const chainSpellcasting =
      chainSession?.context.characters.get(
        fighterId,
      )?.spellcastingPresentationSource;
    expect(chainWarlock?.origin.kind).toBe("character");
    if (chainWarlock?.origin.kind !== "character") return;
    expect(chainSpellcasting?.invocationSpellAccesses).toEqual([
      expect.objectContaining({
        tag: "pactOfTheChainFindFamiliar",
        spell: expect.objectContaining({ id: "find_familiar" }),
      }),
    ]);
    expect(
      call(chainRoot, "discover_battle_acts", {}).availableActs.some(
        (act: Json) => String(act.summary).includes("Find Familiar"),
      ),
    ).toBe(false);

    const tomeRoot = createMcpCompositionRoot();
    tomeRoot.sessionStore.battleSession = startBattleRight(tomeRoot, [
      character(tomeRoot, {
        combatantId: fighterId,
        displayName: "Pact of the Tome Warlock",
        initiative: 20,
        attack: null,
        spellcasting: spellcasting(tomeRoot, {
          sourceClassName: "warlock",
          abilityModifier: 3,
          bookOfShadowsSpellAccesses: [
            {
              tag: "bookOfShadows",
              bookPresence: { tag: "onPerson" },
              cantrips: ["fire_bolt", "chill_touch", "starry_wisp"],
              ritualSpells: ["detect_magic", "detect_poison_and_disease"],
              spellcastingFocus: "book_of_shadows",
            },
          ],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlock(tomeRoot, { combatantId: goblinId, initiative: 10 }),
    ]);

    const fireBolt = requireSpellAct(tomeRoot, "fire_bolt");
    const target = requireHole(fireBolt.initialHoles, "targetChoice");
    const afterTarget = call(tomeRoot, "fill_battle_hole", {
      subject: fireBolt.subject,
      fill: spellTargetFill(
        target.holeId,
        "fighter",
        "goblin",
        fireBolt.subject.procedureRef,
      ),
    });
    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
    });
  });

  test("uses Favored Enemy Hunter's Mark free cast through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Ranger",
        initiative: 20,
        classLevels: [{ className: "ranger", level: 1 }],
        resources: [
          {
            unit: root.unitLibrary.requireUnit("ranger_favored_enemy"),
            usesRemaining: resourceCount(2),
          },
        ],
        spellcasting: spellcasting(root, {
          sourceClassName: "ranger",
          abilityModifier: 3,
          featurePreparedSpells: [
            { sourceUnitId: "ranger_favored_enemy", spellId: "hunters_mark" },
          ],
          slots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlock(root, { combatantId: goblinId, initiative: 10 }),
    ]);

    const huntersMark = requireSpellAct(root, "hunters_mark");
    expect(huntersMark.subject.tag).toBe("bonusActionSpell");
    expect(huntersMark.presentation.invocation.tag).toBe(
      "classFeatureFreeCast",
    );
    const target = requireHole(huntersMark.initialHoles, "targetChoice");
    const afterTarget = call(root, "fill_battle_hole", {
      subject: huntersMark.subject,
      fill: spellTargetFill(
        target.holeId,
        "fighter",
        "goblin",
        huntersMark.subject.procedureRef,
      ),
    });

    expect(afterTarget.result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { spellSlotUsesThisTurn: [] } },
    });
    const ranger =
      root.sessionStore.battleSession?.state.combatants.get(fighterId);
    expect(ranger?.concentration).toEqual({
      sourceProcedureRef: huntersMark.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") return;
    const [favoredEnemyResource] = ranger.origin.resources;
    if (favoredEnemyResource === undefined) {
      throw new Error("Expected Favored Enemy execution resource.");
    }
    const favoredEnemyOwnership =
      root.sessionStore.battleSession?.context.characters
        .get(fighterId)
        ?.resourceOwnership.find(
          (candidate) =>
            candidate.resourcePoolRef === favoredEnemyResource.resourcePoolRef,
        );
    expect(favoredEnemyOwnership?.unit.id).toBe("ranger_favored_enemy");
    expect(favoredEnemyResource.usesRemaining).toBe(1);
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
  });

  test("discovers promoted action-time spell procedures through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    const cantrips = [
      "acid_splash",
      "chill_touch",
      "eldritch_blast",
      "fire_bolt",
      "guidance",
      "light",
      "poison_spray",
      "produce_flame",
      "ray_of_frost",
      "resistance",
      "sacred_flame",
      "sorcerous_burst",
      "starry_wisp",
    ] as const;
    const preparedSpells = [
      "animal_friendship",
      "bane",
      "bless",
      "burning_hands",
      "chromatic_orb",
      "color_spray",
      "command",
      "cure_wounds",
      "dissonant_whispers",
      "entangle",
      "expeditious_retreat",
      "faerie_fire",
      "grease",
      "healing_word",
      "hunters_mark",
      "ice_knife",
      "inflict_wounds",
      "jump",
      "mage_armor",
      "magic_missile",
      "mass_cure_wounds",
      "mass_healing_word",
      "protection_from_evil_and_good",
      "shield_of_faith",
      "sleep",
      "thunderwave",
    ] as const;
    root.sessionStore.battleSession = startBattleRight(root, [
      character(root, {
        combatantId: fighterId,
        displayName: "Prepared Caster",
        initiative: 20,
        attack: null,
        spellcasting: spellcasting(root, {
          sourceClassName: "wizard",
          abilityModifier: 3,
          cantrips,
          preparedSpells,
          slots: [
            { spellLevel: 1, count: 12 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 3 },
            { spellLevel: 5, count: 2 },
          ],
        }),
      }),
      statBlock(root, {
        combatantId: goblinId,
        initiative: 10,
        creatureType: "beast",
      }),
    ]);

    const discovered = call(root, "discover_battle_acts", {});
    const discoveredSpellIds = new Set(
      discovered.availableActs.flatMap((candidate: Json) => {
        const spellId =
          candidate.presentation?.kind === "spell"
            ? candidate.presentation.invocation?.spellId
            : undefined;
        return typeof spellId === "string" ? [spellId] : [];
      }),
    );

    for (const spellId of [...cantrips, ...preparedSpells]) {
      expect(discoveredSpellIds).toContain(spellId);
    }
  });
});

type Root = ReturnType<typeof createMcpCompositionRoot>;
type Json = Record<string, any>;

function requireTriggeredSpellChoice(
  response: Json,
  reactorId: string,
  spellId: string,
  slotLevel?: number,
): Json {
  const matchingChoices = response.presentedInterruptChoices.filter(
    (presented: Json) => {
      const choice = presented.choice;
      if (
        choice.kind !== "castTriggeredReactionSpell" ||
        choice.reactorId !== reactorId
      ) {
        return false;
      }
      const invocation = presented.presentation?.invocation;
      return (
        presented.presentation?.kind === "spell" &&
        invocation?.spellId === spellId &&
        (slotLevel === undefined ||
          (invocation.tag === "spellSlot" &&
            Number(invocation.slotLevel) === slotLevel))
      );
    },
  );
  const [presented] = matchingChoices;
  if (matchingChoices.length !== 1 || presented === undefined) {
    throw new Error(`Expected one ${spellId} triggered spell choice.`);
  }
  return presented.choice;
}

function call(root: Root, toolName: string, args: Json): Json {
  return JSON.parse(
    (handleToolCall(root, toolName as never, args as never) as BattleToolResult)
      .content[0]?.text ?? "null",
  );
}

function startBattleRight(
  _root: Root,
  combatants: readonly BattleCreatureInit[],
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId(`battle:${crypto.randomUUID()}`),
    combatants,
  });
  if (Either.isLeft(result)) throw new Error(result.left.message);
  return result.right;
}

function statBlock(
  root: Root,
  input: {
    readonly combatantId: ReturnType<typeof combatantId>;
    readonly displayName?: string;
    readonly initiative: number;
    readonly creatureType?: "beast";
  },
): BattleCreatureInit {
  const statBlock = root.statBlockCatalog.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  const battleStatBlock =
    input.creatureType === undefined
      ? statBlock
      : {
          ...statBlock,
          statBlock: {
            ...statBlock.statBlock,
            creatureType: input.creatureType,
          },
        };
  const init = Either.getOrThrow(
    battleCreatureInitFromStatBlock({
      combatantId: input.combatantId,
      statBlock: battleStatBlock,
      initiative: initiativeScore(input.initiative),
      currentHp: Hp(10),
      tempHp: Hp(0),
    }),
  );
  return { ...init, displayName: input.displayName ?? init.displayName };
}

function character(
  root: Root,
  input: {
    readonly combatantId: ReturnType<typeof combatantId>;
    readonly displayName?: string;
    readonly initiative: number;
    readonly classLevels?: CharacterBattleClassLevelInits;
    readonly characterUnitRefs?: readonly BattleUnitRef[];
    readonly weaponMasteries?: any;
    readonly selectedLoadout?: any;
    readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
    readonly attack?: CharacterWeaponAttackActionOption | null;
    readonly resources?: any;
    readonly spellcasting?: any;
    readonly invocationFeatures?: any;
    readonly omitWeaponPresentationSources?: boolean;
  },
): BattleCreatureInit {
  const attack =
    input.attack === undefined
      ? weaponAttack(root, "weapon_longsword", "str", 3)
      : input.attack;
  const selectedLoadout =
    input.selectedLoadout ??
    (attack === null
      ? {}
      : {
          weapon: {
            itemId: `main:${attack.weapon.weaponUnitId}`,
            unitId: attack.weapon.weaponUnitId,
            grip: "one_handed",
          },
        });
  const reconciledAttack =
    attack === null
      ? attack
      : reconcileMcpCharacterWeaponAttack(
          attack,
          selectedLoadout.weapon,
          input.weaponMasteries,
        );
  const ac = {
    ...(input.armorClass ?? defaultArmorClassState()),
    rightHandUse:
      selectedLoadout.weapon === undefined
        ? ("free" as const)
        : ("mainWeapon" as const),
    leftHandUse:
      selectedLoadout.shield === undefined
        ? ("free" as const)
        : ("shield" as const),
  };
  const characterUnitRefs = [...(input.characterUnitRefs ?? [])];
  if (input.omitWeaponPresentationSources !== true) {
    for (const weaponUnitId of [attack?.weapon.weaponUnitId].filter(
      (id) => id !== undefined,
    )) {
      if (characterUnitRefs.some((ref) => ref.unit.id === weaponUnitId)) {
        continue;
      }
      const unit = root.unitLibrary.requireUnit(weaponUnitId);
      if (unit.kind !== "weapon") {
        throw new Error(`Expected weapon Unit: ${weaponUnitId}`);
      }
      characterUnitRefs.push({ unit, supportProfiles: [] });
    }
  }
  return {
    combatantId: input.combatantId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs,
      invocationFeatures: input.invocationFeatures ?? [],
      classLevels: input.classLevels ?? [
        {
          className: input.spellcasting?.sourceClassName ?? "fighter",
          level: 1,
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: {
        abilityScores: {
          str: 16,
          dex: 14,
          con: 14,
          int: 10,
          wis: 12,
          cha: 10,
        },
        savingThrowProficiencies: ["str", "con"],
        skillProficiencies: [],
        skillExpertise: [],
      },
      armorClass: ac,
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout,
      weaponMasteries: input.weaponMasteries ?? [],
      attack: reconciledAttack,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: {
            kind: "mechanicalReplacement",
            dice: 1,
            dieSize: 6,
            damageType: "bludgeoning",
          },
        },
        attackAbility: "dex",
        attackAbilityModifier: abilityModifier(3),
        attackBonus: attackBonus(5),
        damageAbilityModifier: abilityModifier(3),
      },
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function weaponAttack(
  root: Root,
  weaponId: string,
  ability: "str" | "dex" | "cha",
  mod: number,
): CharacterWeaponAttackActionOption {
  const weapon = root.unitLibrary.requireUnit(weaponId);
  if (weapon.kind !== "weapon")
    throw new Error(`Expected weapon Unit: ${weaponId}`);
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability,
    abilityModifier: abilityModifier(mod),
    attackBonus: attackBonus(mod + 2),
    damageAbilityModifier: abilityModifier(mod),
  };
}

function reconcileMcpCharacterWeaponAttack(
  attack: CharacterWeaponAttackActionOption,
  loadoutWeapon:
    | {
        readonly itemId: string;
        readonly unitId: string & Brand.Brand<"UnitId">;
        readonly grip: "one_handed" | "two_handed";
      }
    | undefined,
  weaponMasteries:
    | readonly { readonly weaponUnitId: string & Brand.Brand<"UnitId"> }[]
    | undefined,
): CharacterWeaponAttackActionOption {
  const loadoutObjectId =
    loadoutWeapon === undefined
      ? attack.weaponObjectId
      : battleObjectId(loadoutWeapon.itemId);
  const hasWeaponMastery =
    weaponMasteries === undefined
      ? attack.hasWeaponMastery
      : weaponMasteries.some(
          (mastery) => mastery.weaponUnitId === attack.weapon.weaponUnitId,
        );
  return {
    ...attack,
    weaponObjectId: loadoutObjectId,
    hasWeaponMastery,
  };
}

function spellcasting(
  root: Root,
  input: {
    readonly sourceClassName: "sorcerer" | "ranger" | "warlock" | "wizard";
    readonly abilityModifier: number;
    readonly cantrips?: readonly string[];
    readonly preparedSpells?: readonly string[];
    readonly featurePreparedSpells?: readonly {
      readonly sourceUnitId: string;
      readonly spellId: string;
    }[];
    readonly spellbookRitualSpellAccesses?: readonly {
      readonly tag: "spellbookRitual";
      readonly spellId: string;
      readonly featureUnitId: string;
    }[];
    readonly bookOfShadowsSpellAccesses?: readonly {
      readonly tag: "bookOfShadows";
      readonly bookPresence: { readonly tag: "onPerson" | "notOnPerson" };
      readonly cantrips: readonly [string, string, string];
      readonly ritualSpells: readonly [string, string];
      readonly spellcastingFocus: "book_of_shadows";
    }[];
    readonly invocationSpellAccesses?: readonly {
      readonly tag: "armorOfShadowsMageArmor" | "pactOfTheChainFindFamiliar";
      readonly spellId: string;
    }[];
    readonly slots?: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  },
) {
  return {
    sourceClassName: input.sourceClassName,
    spellcastingAbilityModifier: input.abilityModifier,
    proficiencyBonus: 2,
    canCastSpells: true,
    cantrips: (input.cantrips ?? []).map((id) =>
      root.unitLibrary.requireUnit(id),
    ),
    preparedSpells: (input.preparedSpells ?? []).map((id) =>
      root.unitLibrary.requireUnit(id),
    ),
    featurePreparedSpells: (input.featurePreparedSpells ?? []).map((entry) => ({
      sourceUnitId: entry.sourceUnitId,
      spell: root.unitLibrary.requireUnit(entry.spellId),
    })),
    spellbookRitualSpellAccesses: (
      input.spellbookRitualSpellAccesses ?? []
    ).map((entry) => ({
      tag: entry.tag,
      spell: root.unitLibrary.requireUnit(entry.spellId),
      featureUnitId: entry.featureUnitId,
    })),
    bookOfShadowsSpellAccesses: (input.bookOfShadowsSpellAccesses ?? []).map(
      (entry) => ({
        tag: entry.tag,
        bookPresence: entry.bookPresence,
        cantrips: entry.cantrips.map((id) => root.unitLibrary.requireUnit(id)),
        ritualSpells: entry.ritualSpells.map((id) =>
          root.unitLibrary.requireUnit(id),
        ),
        spellcastingFocus: entry.spellcastingFocus,
      }),
    ),
    invocationSpellAccesses: (input.invocationSpellAccesses ?? []).map(
      (entry) => ({
        tag: entry.tag,
        spell: root.unitLibrary.requireUnit(entry.spellId),
      }),
    ),
    spellSlots: input.slots ?? [],
  };
}

function requireAct(root: Root, label: string, attackName?: string): Json {
  const discovered = call(root, "discover_battle_acts", {});
  const matchingActs = discovered.availableActs.filter(
    (candidate: Json) =>
      candidate.label === label &&
      (attackName === undefined ||
        (candidate.subject?.statBlockDamageNotation === undefined &&
          candidate.summary === `Take the Attack action with ${attackName}.`)),
  );
  const [act] = matchingActs;
  if (matchingActs.length !== 1 || act === undefined) {
    throw new Error(`Expected one MCP battle act: ${label}`);
  }
  return act;
}

function requireSpellAct(root: Root, spellId: string): Json {
  const discovered = call(root, "discover_battle_acts", {});
  const act = discovered.availableActs.find(
    (candidate: Json) =>
      candidate.presentation?.kind === "spell" &&
      candidate.presentation.invocation?.spellId === spellId,
  );
  if (act === undefined) throw new Error(`Expected MCP spell act: ${spellId}`);
  return act;
}

function requireUnitAct(root: Root, unitId: string): Json {
  const discovered = call(root, "discover_battle_acts", {});
  const act = discovered.availableActs.find(
    (candidate: Json) =>
      candidate.presentation?.kind === "unit" &&
      candidate.presentation.unitId === unitId,
  );
  if (act === undefined) throw new Error(`Expected MCP unit act: ${unitId}`);
  return act;
}

function requireMechanicalAct(root: Root, tag: string, action: string): Json {
  const discovered = call(root, "discover_battle_acts", {});
  const act = discovered.availableActs.find(
    (candidate: Json) =>
      candidate.subject?.tag === tag && candidate.subject.action === action,
  );
  if (act === undefined) throw new Error(`Expected MCP ${tag}.${action} act.`);
  return act;
}

function spellProcedureRef(
  root: Root,
  actorId: ReturnType<typeof combatantId>,
  spellId: string,
  slotLevel?: number,
): string {
  const actor = root.sessionStore.battleSession?.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character spell owner: ${actorId}`);
  }
  const presentation = call(
    root,
    "discover_battle_acts",
    {},
  ).admittedSpellPresentations.find(
    (candidate: Json) =>
      candidate.invocation?.spellId === spellId &&
      (slotLevel === undefined ||
        (candidate.invocation.tag === "spellSlot" &&
          Number(candidate.invocation.slotLevel) === slotLevel)),
  );
  if (presentation?.procedureRef === undefined) {
    throw new Error(`Expected admitted spell procedure: ${spellId}`);
  }
  return presentation.procedureRef;
}

function resourcePoolRefForUnit(
  root: Root,
  actorId: ReturnType<typeof combatantId>,
  unitId: string,
): string {
  const session = root.sessionStore.battleSession;
  if (session === null) {
    throw new Error("Expected active battle session.");
  }
  const actor = session.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character resource owner: ${actorId}`);
  }
  const matchingOwnership = session.context.characters
    .get(actorId)
    ?.resourceOwnership.filter((candidate) => candidate.unit.id === unitId);
  const [ownership] = matchingOwnership ?? [];
  if (matchingOwnership?.length !== 1 || ownership === undefined) {
    throw new Error(`Expected one admitted unit resource owner: ${unitId}`);
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  if (resource === undefined) {
    throw new Error(`Expected mechanical resource owned by unit: ${unitId}`);
  }
  return resource.resourcePoolRef;
}

function requireHole(holes: readonly Json[], kind: string): Json {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) throw new Error(`Expected MCP hole: ${kind}`);
  return hole;
}

function attackTargetFill(
  holeId: string,
  actorId: string,
  targetId: string,
  attack: Json,
  cleaveSecondTargetId?: string,
  cleaveTargetFact?: { readonly firstTargetId: string },
) {
  const selection = {
    procedureRef: attack.procedureRef,
    ...(attack.attackAbility === undefined
      ? {}
      : { attackAbility: attack.attackAbility }),
    ...(attack.attackDamageType === undefined
      ? {}
      : { attackDamageType: attack.attackDamageType }),
  };
  return {
    kind: "targetChoice",
    holeId,
    value: targetId,
    spatialFacts: [
      { kind: "attackTargetInMeleeReach", actorId, targetId, ...selection },
      ...(cleaveSecondTargetId === undefined
        ? []
        : [
            {
              kind: "cleaveSecondTargetWithin5FeetOfFirstTarget",
              attackerId: actorId,
              firstTargetId: targetId,
              secondTargetId: cleaveSecondTargetId,
            },
          ]),
      ...(cleaveTargetFact === undefined
        ? []
        : [
            {
              kind: "cleaveSecondTargetWithin5FeetOfFirstTarget",
              attackerId: actorId,
              firstTargetId: cleaveTargetFact.firstTargetId,
              secondTargetId: targetId,
            },
          ]),
    ],
  };
}

function spellTargetFill(
  holeId: string,
  casterId: string,
  targetId: string,
  sourceProcedureRef: string,
) {
  return {
    kind: "targetChoice",
    holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function attackRollFill(
  holeId: string,
  total: number,
  naturalD20: number,
  rollMode?: string,
) {
  return {
    kind: "attackRoll",
    holeId,
    value: {
      total,
      naturalD20,
      ...(rollMode === undefined ? {} : { rollMode }),
    },
  };
}

function rolledDiceFill(
  holeId: string,
  groups: readonly (readonly number[])[],
) {
  return {
    kind: "rolledDice",
    holeId,
    value: groups.map((results) => ({ results })),
  };
}

function resolveAttackThroughRoll(
  root: Root,
  attackName: string,
  targetId: string,
  total: number,
  naturalD20: number,
  options: { readonly cleaveSecondTargetId?: string } = {},
): Json {
  const act = requireAct(root, "Attack", attackName);
  const afterTarget = call(root, "fill_battle_hole", {
    subject: act.subject,
    fill: attackTargetFill(
      "battle:attack:target",
      "fighter",
      targetId,
      act.subject,
      options.cleaveSecondTargetId,
    ),
  });
  const attackRoll = requireHole(afterTarget.result.holes, "attackRoll");
  return call(root, "fill_battle_hole", {
    subject: act.subject,
    fill: attackRollFill(
      attackRoll.holeId,
      total,
      naturalD20,
      attackRoll.rollMode,
    ),
  });
}

function resolveAttack(
  root: Root,
  attackName: string,
  targetId: string,
  total: number,
  naturalD20: number,
  damageGroups: readonly (readonly number[])[],
  options: { readonly cleaveSecondTargetId?: string } = {},
): Json {
  const afterRoll = resolveAttackThroughRoll(
    root,
    attackName,
    targetId,
    total,
    naturalD20,
    options,
  );
  const damage = requireHole(afterRoll.result.holes, "rolledDice");
  return call(root, "fill_battle_hole", {
    subject:
      afterRoll.result.subject ??
      requireAct(root, "Attack", attackName).subject,
    fill: rolledDiceFill(damage.holeId, damageGroups),
  });
}
