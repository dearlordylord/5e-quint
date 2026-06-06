import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { resourceCount } from "@dnd/shared/types";

import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
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
  fighterId,
  findHole,
  partySide,
  requireResolved,
  secondSkeletonId,
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
  readonly targetActiveEffectCount: number;
  readonly lastResult:
    | "init"
    | "carefulSaveGatedDamage"
    | "carefulSaveGatedNoEffect"
    | "heightenedSaveGatedDamage"
    | "quickenedSaveGatedDamage"
    | "quickenedSpellAttack"
    | "quickenedSpellAttackSequence"
    | "transmutedSaveGatedDamage"
    | "transmutedSpellAttack"
    | "twinnedTargetCount"
    | "heightenedHideousLaughter";
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

export function resolveQuickenedEldritchBlast(state: BattleState): BattleState {
  const act = quickenedEldritchBlastAct(state);
  const targetHoles = targetChoiceHoles(act.initialHoles);
  const firstTarget = eldritchBlastTargetFill(targetHoles[0]!);
  const secondTarget = eldritchBlastTargetFill(targetHoles[1]!);
  const fills: BattleFill[] = [firstTarget, secondTarget];

  const firstAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
  const firstDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
  fills.push(damageRollFillWithGroups(firstDamage, [[4]]));
  const secondAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(secondAttack, { total: 1, naturalD20: 1 }));

  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    }),
  ).state;
}

export function resolveCarefulBurningHands(state: BattleState): BattleState {
  const act = carefulBurningHandsAct(state);
  const protectedTargets = protectedTargetsFill(act.initialHoles);
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [protectedTargets],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Burning Hands to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        protectedTargets,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [skeletonId],
            },
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveCarefulCommand(state: BattleState): BattleState {
  const act = carefulCommandAct(state);
  const target = targetListFill(act.initialHoles, "Command targets", "command");
  const protectedTargets = targetListFill(
    act.initialHoles,
    "Command Careful Spell protected targets",
    "command",
  );
  const option = commandOptionFill(act.initialHoles);
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, protectedTargets, option],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Command to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        protectedTargets,
        option,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveHeightenedBurningHands(state: BattleState): BattleState {
  const act = heightenedBurningHandsAct(state);
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Burning Hands to request a save hole.",
    );
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const savingThrowFill: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  > = {
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
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget, savingThrowFill],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Burning Hands to request a damage hole.",
    );
  }
  const damage = findHole(awaitingDamage.holes, "rolledDice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        savingThrowFill,
        damageRollFillWithGroups(damage, [[4, 3, 2]]),
      ],
    }),
  ).state;
}

export function resolveHeightenedHideousLaughter(
  state: BattleState,
): BattleState {
  const act = heightenedHideousLaughterAct(state);
  const target = targetListFill(
    act.initialHoles,
    "Hideous Laughter targets",
    "hideous_laughter",
  );
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Hideous Laughter to request a save hole.",
    );
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        heightenedTarget,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: false }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveTransmutedBurningHandsToPoison(
  state: BattleState,
): BattleState {
  const act = transmutedBurningHandsToPoisonAct(state);
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
  assertTransmutedDamageHole(damageHole);
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

export function resolveTransmutedRayOfFrostToPoison(
  state: BattleState,
): BattleState {
  const act = transmutedRayOfFrostToPoisonAct(state);
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
  assertTransmutedDamageHole(damageHole);
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

export function resolveTwinnedBless(state: BattleState): BattleState {
  const act = twinnedBlessAct(state);
  const targetHole = findHole(act.initialHoles, "spellTargetList");
  if (targetHole.kind !== "spellTargetList") {
    throw new Error("Expected Twinned Bless to request a target-list hole.");
  }
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetListFill(act.initialHoles, "Bless targets", "bless", [
          wizardId,
          fighterId,
          skeletonId,
          secondSkeletonId,
        ]),
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
    targetActiveEffectCount:
      state.combatants.get(skeletonId)?.activeEffects.length ?? 0,
    lastResult,
  };
}

export function sorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([quickenedMetamagicOption()]);
}

export function carefulSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([carefulMetamagicOption()]);
}

export function heightenedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([heightenedMetamagicOption()]);
}

export function transmutedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([transmutedMetamagicOption()]);
}

export function twinnedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([twinnedMetamagicOption()]);
}

function sorcererMetamagicBattleWithOptions(
  knownOptions: readonly CharacterBattleMetamagicOptionFact[],
): BattleState {
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
          knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [
              spellRecord("ray_of_frost"),
              spellRecord("eldritch_blast"),
            ],
            preparedSpells: [
              spellRecord("bless"),
              spellRecord("burning_hands"),
              spellRecord("command"),
              spellRecord("hideous_laughter"),
            ],
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 9,
        side: partySide,
        currentHp: 12,
        maxHp: 20,
      }),
      statBlockCreatureInit({
        combatantId: secondSkeletonId,
        displayName: "Second Skeleton",
        initiative: 8,
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

function carefulMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: CAREFUL_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function heightenedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function transmutedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function twinnedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: TWINNED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
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

function quickenedEldritchBlastAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackSequence" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Eldritch Blast act.");
  }
  return act;
}

function targetChoiceHoles(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
}

function nextSpellHole(
  state: BattleState,
  subject: QuickenedBonusActionSpellAct["subject"],
  fills: readonly BattleFill[],
  kind: BattleHole["kind"],
): BattleHole {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    const detail = "message" in result ? `: ${result.message}` : "";
    throw new Error(`Expected ${kind} spell hole, got ${result.tag}${detail}.`);
  }
  return findHole(result.holes, kind);
}

function eldritchBlastTargetFill(hole: BattleHole): BattleFill {
  return targetFill(hole, skeletonId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: skeletonId,
      spellId: "eldritch_blast",
    },
  ]);
}

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

function carefulBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Burning Hands act.");
  }
  return act;
}

function carefulCommandAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "command" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Command act.");
  }
  return act;
}

function heightenedBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Burning Hands act.");
  }
  return act;
}

function heightenedHideousLaughterAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "hideousLaughter" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Hideous Laughter act.");
  }
  return act;
}

function transmutedBurningHandsToPoisonAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND &&
          selection.targetDamageType === "poison",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Transmuted Burning Hands to Poison act.");
  }
  return act;
}

function transmutedRayOfFrostToPoisonAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND &&
          selection.targetDamageType === "poison",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Transmuted Ray of Frost to Poison act.");
  }
  return act;
}

function twinnedBlessAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "rollModifier" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Twinned Bless act.");
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

function assertTransmutedDamageHole(damageHole: BattleHole): void {
  if (
    damageHole.kind !== "rolledDice" ||
    !("spell" in damageHole) ||
    !("damage" in damageHole.spell) ||
    !("damageType" in damageHole.spell.damage) ||
    damageHole.spell.damage.damageType !== "poison"
  ) {
    throw new Error("Expected Transmuted Spell damage hole to use Poison.");
  }
}

function protectedTargetsFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return targetListFill(
    holes,
    "Burning Hands Careful Spell protected targets",
    "burning_hands",
  );
}

function targetListFill(
  holes: readonly BattleHole[],
  label: string,
  spellId: "bless" | "burning_hands" | "command" | "hideous_laughter",
  targetIds: readonly (typeof wizardId)[] = [skeletonId],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  const hole = holes.find(
    (candidate) =>
      candidate.kind === "spellTargetList" && candidate.label === label,
  );
  if (hole === undefined || hole.kind !== "spellTargetList") {
    throw new Error(`Expected ${label} target-list hole.`);
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId: wizardId,
      targetId,
      spellId,
    })),
  };
}

function commandOptionFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "commandOptionChoice" }> {
  const hole = findHole(holes, "commandOptionChoice");
  return {
    kind: "commandOptionChoice",
    holeId: hole.holeId,
    value: "halt",
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
