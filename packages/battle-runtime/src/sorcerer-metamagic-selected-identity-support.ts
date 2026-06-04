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
  attackRollFill,
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
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

export type SorcererMetamagicProjection = {
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly sorceryPointsRemaining: number;
  readonly targetHp: number;
  readonly lastResult:
    | "init"
    | "quickenedSaveGatedDamage"
    | "quickenedSpellAttack";
};

export function resolveQuickenedBurningHands(state: BattleState): BattleState {
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

export function resolveQuickenedRayOfFrost(state: BattleState): BattleState {
  const act = quickenedRayOfFrostAct(state);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, skeletonId);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const attackRollHole = findHole(
    awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackRollHole, {
    total: 15,
    naturalD20: 10,
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, attackRoll],
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
        target,
        attackRoll,
        damageRollFillWithGroups(damageHole, [[4, 3]]),
      ],
    }),
  ).state;
}

export function projectBattleState(
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

export function sorcererMetamagicBattle(): BattleState {
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
            cantrips: [spellRecord("ray_of_frost")],
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
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Burning Hands act.");
  }
  return act;
}

function quickenedRayOfFrostAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Ray of Frost act.");
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
