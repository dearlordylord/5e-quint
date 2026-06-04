// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE sorcerer_metamagic doResolveQuickenedSaveGatedDamage
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   selected Metamagic options spend Sorcery Points from the shared pool.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points and changes an action casting time
//   to a Bonus Action for that casting.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Burning Hands:
//   Burning Hands is an action-cast Dexterity Saving Throw damage spell.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Invocation,
//   Saving Throw, Sorcery Points as a Pool, and Spend.
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { resourceCount } from "@dnd/shared/types";

import {
  QUICKENED_METAMAGIC_EFFECT_KIND,
} from "./battle-reducer/metamagic.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  resolveBattleSubject,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  damageRollFillWithGroups,
  findHole,
  partySide,
  requireResolved,
  skeletonId,
  spellRecord,
  startBattleRight,
  statBlockCreatureInit,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type SorcererMetamagicProjection = {
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly sorceryPointsRemaining: number;
  readonly targetHp: number;
  readonly lastResult: "init" | "quickenedSaveGatedDamage";
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Metamagic selected identity MBT",
  taskId: "L3META-01-SORCERER-METAMAGIC-QUICKENED-SAVE-DAMAGE",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    magicActionAvailable: "bool",
    bonusActionAvailable: "bool",
    sorceryPointsRemaining: "int",
    targetHp: "int",
    lastResult: "str",
  },
  initialProjection: {
    magicActionAvailable: true,
    bonusActionAvailable: true,
    sorceryPointsRemaining: 4,
    targetHp: 10,
    lastResult: "init",
  },
  units: [
    {
      unitId: "sorcerer_metamagic",
      procedures: [
        {
          actionName: "doResolveQuickenedSaveGatedDamage",
          projectionAfter: {
            magicActionAvailable: true,
            bonusActionAvailable: false,
            sorceryPointsRemaining: 2,
            targetHp: 1,
            lastResult: "quickenedSaveGatedDamage",
          },
          discover: () =>
            projectBattleState(
              resolveQuickenedBurningHands(sorcererMetamagicBattle()),
              "quickenedSaveGatedDamage",
            ),
        },
      ],
    },
  ],
});

function resolveQuickenedBurningHands(state: BattleState): BattleState {
  const act = quickenedBurningHandsAct(state);
  const savingThrowFill = burningHandsSaveFill(act.initialHoles);
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [savingThrowFill],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowFill,
        damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
      ],
    }),
  ).state;
}

function projectBattleState(
  state: BattleState,
  lastResult: SorcererMetamagicProjection["lastResult"],
): SorcererMetamagicProjection {
  return {
    magicActionAvailable: canSpendAction(state.currentTurnResources, "magic"),
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    sorceryPointsRemaining: Number(sorceryPointsRemaining(state)),
    targetHp: state.combatants.get(skeletonId)?.hp ?? 0,
    lastResult,
  };
}

function sorcererMetamagicBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-selected-identity"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [quickenedMetamagicOption()],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
    ],
  });
}

function quickenedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: QUICKENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

type QuickenedBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "bonusActionSpell" }
  >;
};

function quickenedBurningHandsAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === "burning_hands" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Burning Hands act.");
  }
  return act;
}

function burningHandsSaveFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const savingThrow = findHole(holes, "savingThrowOutcome");
  return {
    kind: "savingThrowOutcome",
    holeId: savingThrow.holeId,
    value: {
      area: {
        originAnchorId: wizardId,
        affectedTargetIds: [skeletonId],
      },
      outcomes: [{ targetId: skeletonId, succeeded: false }],
    },
  };
}

function sorceryPointsRemaining(state: BattleState) {
  const actor = state.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer combatant.");
  }
  const resource = actor.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (resource === undefined) {
    throw new Error("Expected Sorcery Point resource.");
  }
  return resource.pointsRemaining;
}
