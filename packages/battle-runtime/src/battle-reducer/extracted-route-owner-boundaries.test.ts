import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "../battle-act-composition.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  findAct,
  findHole,
  innateSorceryResource,
  magicSubject,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  wizardId,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import { spellTargetListFillForTest } from "../spell-target-list.test-support.ts";
import { weaponAttackRouteForResolution } from "./attack-routes.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  concentrationRouteForDiscoveredAct,
  hitPointRestorationRouteForDiscoveredAct,
  zeroHitPointStabilizationRouteForDiscoveredAct,
} from "./combatant-lifecycle-routes.ts";
import {
  commandRouteForDiscoveredAct,
  commandRouteForResolution,
} from "./command-routes.ts";
import {
  companionRouteForDiscoveredAct,
  spawnedCompanionLifecycleCompanionLifecycleRouteEvents,
} from "./companion-routes.ts";
import {
  conditionImmunityTemporaryHitPointRouteForDiscoveredAct,
  conditionImmunityTemporaryHitPointRouteForResolution,
} from "./condition-immunity-temporary-hit-point-routes.ts";
import { sleepRepeatSaveRouteForDiscoveredAct } from "./effect-lifecycle-routes.ts";
import { unitFeatureBonusActionRouteForDiscoveredAct } from "./feature-action-routes.ts";
import { markedDamageRiderRouteForDiscoveredAct } from "./marked-damage-routes.ts";
import { protectionCharmRouteForDiscoveredAct } from "./protection-charm-routes.ts";
import { spatialEffectCompositionRouteForDiscoveredAct } from "./spatial-effect-routes.ts";
import { spellBaseArmorClassEffectRouteForDiscoveredAct } from "./spell-defense-routes.ts";

describe("extracted route owner boundaries", () => {
  test("unrelated weapon attacks are declined by every spell and companion owner", () => {
    const state = fighterVsGoblinBattle();
    const act = {
      subject: fighterAttackSubject(state),
      initialHoles: [],
    } as const;

    expect(companionRouteForDiscoveredAct(act)).toBeUndefined();
    expect(
      conditionImmunityTemporaryHitPointRouteForDiscoveredAct(state, act),
    ).toBeUndefined();
    expect(
      unitFeatureBonusActionRouteForDiscoveredAct(state, act),
    ).toBeUndefined();
    expect(markedDamageRiderRouteForDiscoveredAct(state, act)).toBeUndefined();
    expect(protectionCharmRouteForDiscoveredAct(state, act)).toBeUndefined();
    expect(
      spatialEffectCompositionRouteForDiscoveredAct(state, act),
    ).toBeUndefined();
  });

  test("projects representative supported spell owners through their direct boundaries", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-route-owner-boundaries"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              "mage_armor",
              "heroism",
              "protection_from_evil_and_good",
              "fog_cloud",
              "sleep",
            ].map(spellRecord),
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const routedAct = (spellId: string) =>
      findAct(session, magicSubject(spellId));

    expect(
      spellBaseArmorClassEffectRouteForDiscoveredAct(
        session.state,
        routedAct("mage_armor"),
      ),
    ).toMatchObject({ subject: "spellBaseArmorClassEffect" });
    const heroismAct = routedAct("heroism");
    expect(
      conditionImmunityTemporaryHitPointRouteForDiscoveredAct(
        session.state,
        heroismAct,
      ),
    ).toMatchObject({ subject: "conditionImmunityTemporaryHitPointEffect" });
    const heroismNeedsTarget = resolveBattleSubject({
      state: session.state,
      subject: heroismAct.subject,
      fills: [],
    });
    expect(
      conditionImmunityTemporaryHitPointRouteForResolution(
        { state: session.state, subject: heroismAct.subject, fills: [] },
        heroismNeedsTarget,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "conditionImmunityTemporaryHitPointEffect",
        holes: ["targetChoice"],
        owner: "battleTargetSelection",
      }),
    ]);
    expect(
      protectionCharmRouteForDiscoveredAct(
        session.state,
        routedAct("protection_from_evil_and_good"),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: "protectionCharmActiveEffect" }),
      ]),
    );
    expect(
      spatialEffectCompositionRouteForDiscoveredAct(
        session.state,
        routedAct("fog_cloud"),
      ),
    ).toMatchObject({ subject: "spatialEffect" });
    expect(
      sleepRepeatSaveRouteForDiscoveredAct(session.state, routedAct("sleep")),
    ).toMatchObject({ subject: "repeatSaveConditionEffect" });
  });

  test("projects companion owner outputs", () => {
    expect(
      spawnedCompanionLifecycleCompanionLifecycleRouteEvents(),
    ).toHaveLength(2);
  });

  test("projects marked damage, feature, Command, and attack route events", () => {
    const markedSession = startBattleSessionRight({
      battleId: battleId("battle-marked-route-owner"),
      combatants: [
        characterSeed({
          displayName: "Warlock",
          initiative: 20,
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [],
              preparedSpells: [spellRecord("hex")],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "warlock",
              abilityModifier: 3,
            },
          },
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const markedAct = discoverBattleActs(markedSession).find((act) =>
      markedDamageRiderRouteForDiscoveredAct(markedSession.state, act),
    );
    if (markedAct === undefined) throw new Error("Expected marked spell act.");
    expect(
      markedDamageRiderRouteForDiscoveredAct(markedSession.state, markedAct),
    ).toMatchObject({ subject: "markedDamageRiderEffect" });

    const featureSession = startBattleSessionRight({
      battleId: battleId("battle-feature-route-owner"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const featureAct = discoverBattleActs(featureSession).find((act) =>
      unitFeatureBonusActionRouteForDiscoveredAct(featureSession.state, act),
    );
    if (featureAct === undefined) throw new Error("Expected feature act.");
    expect(
      unitFeatureBonusActionRouteForDiscoveredAct(
        featureSession.state,
        featureAct,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "unitFeatureBonusAction",
        owner: "battleFeatureResource",
      }),
    ]);

    const state = fighterVsGoblinBattle();
    const attackSubject = fighterAttackSubject(state);
    const stale = {
      tag: "invalid",
      reason: "staleSubject",
      message: "route projection fixture",
      snapshot: snapshotBattle(state),
    } as const;
    expect(
      weaponAttackRouteForResolution(
        { state, subject: attackSubject, fills: [] },
        stale,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "weaponAttack",
        owner: "battleHoleFrontier",
      }),
    ]);
  });

  test("projects Command target selection through the Command owner", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-command-route-owner"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("command")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const act = findAct(session, magicSubject("compelledNextTurnBehavior"));
    expect(commandRouteForDiscoveredAct(session.state, act)).toEqual([
      expect.objectContaining({
        subject: "commandEffect",
        owner: "battleSpellSlotAndActionEconomy",
      }),
    ]);
    const targetHole = findHole(act.initialHoles, "spellTargetList");
    const fills = [
      spellTargetListFillForTest(targetHole, wizardId, skeletonId),
    ];
    const result = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills,
    });

    expect(
      commandRouteForResolution(
        { state: session.state, subject: act.subject, fills },
        result,
      ),
    ).toEqual(
      expect.objectContaining({
        subject: "commandEffect",
        fill: "spellTargetList",
        holes: ["compelledBehaviorOptionChoice"],
        owner: "battleHoleFrontier",
      }),
    );
  });

  test("projects hit-point restoration discovery through its owner", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-restoration-route-owner"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("cure_wounds")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const act = findAct(session, magicSubject("cure_wounds"));

    expect(
      hitPointRestorationRouteForDiscoveredAct(session.state, act),
    ).toEqual([
      expect.objectContaining({
        subject: "hitPointRestoration",
        owner: "battleSpellSlotAndActionEconomy",
      }),
    ]);
  });

  test("projects Concentration and zero-Hit-Point discovery through lifecycle owners", () => {
    const concentrationSession = startBattleSessionRight({
      battleId: battleId("battle-concentration-discovery-route-owner"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("blur")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const downedAllyId = combatantId("route-owner-downed-ally");
    const stabilizationSession = startBattleSessionRight({
      battleId: battleId("battle-stabilization-discovery-route-owner"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "cleric", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("spare_the_dying")],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "cleric",
              abilityModifier: 3,
            },
          },
        }),
        characterSeed({
          combatantId: downedAllyId,
          displayName: "Downed Ally",
          initiative: 10,
          currentHp: 0,
        }),
      ],
    });
    const concentrationAct = findAct(
      concentrationSession,
      magicSubject("blur"),
    );
    const stabilizationAct = discoverBattleActs(stabilizationSession).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId ===
          "spare_the_dying",
    );
    if (stabilizationAct === undefined) {
      throw new Error("Expected a Spare the Dying act.");
    }

    expect(
      concentrationRouteForDiscoveredAct(
        concentrationSession.state,
        concentrationAct,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "concentrationTeardown",
        owner: "battleSpellSlotAndActionEconomy",
      }),
    ]);
    expect(
      zeroHitPointStabilizationRouteForDiscoveredAct(
        stabilizationSession.state,
        stabilizationAct,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "zeroHitPointStabilization",
        owner: "battleActionEconomy",
      }),
    ]);
  });
});
